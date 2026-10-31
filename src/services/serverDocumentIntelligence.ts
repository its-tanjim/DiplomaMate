import zlib from 'zlib';
import { GoogleGenAI, Type } from '@google/genai';
import {
  resolveBtebSubjectCode,
  resolveStrictCollege,
  resolveStrictTechnology,
  normalizeCollege,
  normalizeTechnology
} from '../data/directoryData';
import type {
  DocumentScanFeature,
  DocumentScanResult,
  ExtractedPdfPage,
  RoutineExtractionData,
  AssignmentExtractionData,
  NoteExtractionData,
  NoticeExtractionData,
  JobExtractionData,
  CaptainFormExtractionData,
  VideoExtractionData,
  RoutinePeriod,
  SemesterNumber,
  Shift,
  Section,
  WeekDay
} from '../types';

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_PDF_BYTES = 25 * 1024 * 1024;   // 25 MB
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

const BANGLA_DIGIT_MAP: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9'
};

export function normalizeBanglaDigits(input: string): string {
  return String(input || '').replace(/[০-৯]/g, d => BANGLA_DIGIT_MAP[d] ?? d);
}

export interface FileValidationOutcome {
  valid: boolean;
  fileCategory: 'IMAGE' | 'PDF' | 'VIDEO' | 'TEXT';
  detectedMimeType: string;
  buffer: Buffer;
  base64Clean: string;
  errorCode?: DocumentScanResult['errorCode'];
  errorMessage?: string;
}

/**
 * Validates uploaded file data URL / base64 buffer, checking magic bytes, MIME types,
 * corruption, and file size thresholds.
 */
export function validateAndDecodeUploadedFile(params: {
  fileDataUrl?: string;
  fileName?: string;
  mimeType?: string;
  rawText?: string;
  maxBytesOverride?: number;
}): FileValidationOutcome {
  const { fileDataUrl, fileName = '', mimeType = '', rawText, maxBytesOverride } = params;

  if (rawText && String(rawText).trim().length > 0 && !fileDataUrl) {
    const buf = Buffer.from(String(rawText), 'utf-8');
    return {
      valid: true,
      fileCategory: 'TEXT',
      detectedMimeType: 'text/plain',
      buffer: buf,
      base64Clean: buf.toString('base64')
    };
  }

  if (!fileDataUrl || typeof fileDataUrl !== 'string' || !fileDataUrl.trim()) {
    return {
      valid: false,
      fileCategory: 'TEXT',
      detectedMimeType: 'application/octet-stream',
      buffer: Buffer.alloc(0),
      base64Clean: '',
      errorCode: 'EMPTY_FILE',
      errorMessage: 'No file content was received. Please select a valid Image (JPEG, PNG, WebP), PDF, or Video file.'
    };
  }

  const trimmed = fileDataUrl.trim();
  let declaredMime = mimeType.trim().toLowerCase();
  let base64Part = trimmed;

  if (trimmed.startsWith('data:')) {
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx === -1) {
      return {
        valid: false,
        fileCategory: 'TEXT',
        detectedMimeType: 'application/octet-stream',
        buffer: Buffer.alloc(0),
        base64Clean: '',
        errorCode: 'CORRUPTED_FILE',
        errorMessage: 'The uploaded data URL is malformed or truncated (missing payload separator).'
      };
    }
    const header = trimmed.slice(5, commaIdx);
    const semiIdx = header.indexOf(';');
    const extractedMime = (semiIdx >= 0 ? header.slice(0, semiIdx) : header).trim().toLowerCase();
    if (extractedMime) declaredMime = extractedMime;
    base64Part = trimmed.slice(commaIdx + 1).trim();
  }

  const cleanBase64 = base64Part.replace(/\s+/g, '');
  if (!cleanBase64 || cleanBase64.length < 8 || !/^[A-Za-z0-9+/=_-]+$/.test(cleanBase64)) {
    return {
      valid: false,
      fileCategory: 'TEXT',
      detectedMimeType: declaredMime || 'application/octet-stream',
      buffer: Buffer.alloc(0),
      base64Clean: '',
      errorCode: 'CORRUPTED_FILE',
      errorMessage: 'The uploaded file is not valid base64 data or is corrupted.'
    };
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(cleanBase64, 'base64');
  } catch {
    return {
      valid: false,
      fileCategory: 'TEXT',
      detectedMimeType: declaredMime || 'application/octet-stream',
      buffer: Buffer.alloc(0),
      base64Clean: '',
      errorCode: 'CORRUPTED_FILE',
      errorMessage: 'Failed to decode base64 file content.'
    };
  }

  if (buf.length < 8) {
    return {
      valid: false,
      fileCategory: 'TEXT',
      detectedMimeType: declaredMime || 'application/octet-stream',
      buffer: buf,
      base64Clean: cleanBase64,
      errorCode: 'EMPTY_FILE',
      errorMessage: 'The uploaded file is empty or truncated (fewer than 8 bytes).'
    };
  }

  // Inspect Magic Bytes
  const isPdfMagic = buf.slice(0, 5).toString('ascii') === '%PDF-';
  const isPngMagic =
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a;
  const isJpegMagic = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isWebpMagic =
    buf.length >= 12 &&
    buf.slice(0, 4).toString('ascii') === 'RIFF' &&
    buf.slice(8, 12).toString('ascii') === 'WEBP';
  const isMp4Magic =
    buf.length >= 12 &&
    (buf.slice(4, 8).toString('ascii') === 'ftyp' || buf.slice(4, 8).toString('ascii') === 'moov');
  const isWebmMagic =
    buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;
  const isZipOrExeMagic =
    (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) || // ZIP / DOCX / APK
    (buf[0] === 0x4d && buf[1] === 0x5a); // EXE

  const lowerName = fileName.toLowerCase();

  let detectedMime = declaredMime;
  let fileCategory: 'IMAGE' | 'PDF' | 'VIDEO' | 'TEXT' = 'IMAGE';

  if (isPdfMagic) {
    detectedMime = 'application/pdf';
    fileCategory = 'PDF';
  } else if (isPngMagic) {
    detectedMime = 'image/png';
    fileCategory = 'IMAGE';
  } else if (isJpegMagic) {
    detectedMime = 'image/jpeg';
    fileCategory = 'IMAGE';
  } else if (isWebpMagic) {
    detectedMime = 'image/webp';
    fileCategory = 'IMAGE';
  } else if (isMp4Magic) {
    detectedMime = 'video/mp4';
    fileCategory = 'VIDEO';
  } else if (isWebmMagic) {
    detectedMime = 'video/webm';
    fileCategory = 'VIDEO';
  } else if (isZipOrExeMagic) {
    return {
      valid: false,
      fileCategory: 'TEXT',
      detectedMimeType: declaredMime || 'application/octet-stream',
      buffer: buf,
      base64Clean: cleanBase64,
      errorCode: 'UNSUPPORTED_FILE_TYPE',
      errorMessage: 'Unsupported binary archive or executable format. Please upload a valid PDF, JPEG, PNG, WebP, or MP4/WebM video.'
    };
  } else {
    // Check if user claimed PDF or Image, but magic bytes are corrupted
    if (declaredMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
      return {
        valid: false,
        fileCategory: 'PDF',
        detectedMimeType: 'application/pdf',
        buffer: buf,
        base64Clean: cleanBase64,
        errorCode: 'CORRUPTED_FILE',
        errorMessage: 'The uploaded PDF file is corrupted or missing a valid %PDF header.'
      };
    }
    if (
      declaredMime.startsWith('image/') ||
      /\.(jpg|jpeg|png|webp)$/i.test(lowerName)
    ) {
      return {
        valid: false,
        fileCategory: 'IMAGE',
        detectedMimeType: declaredMime || 'image/png',
        buffer: buf,
        base64Clean: cleanBase64,
        errorCode: 'CORRUPTED_FILE',
        errorMessage: 'The uploaded image file is corrupted or truncated (invalid JPEG/PNG/WebP signature).'
      };
    }
    if (
      declaredMime.startsWith('video/') ||
      /\.(mp4|webm|mov)$/i.test(lowerName)
    ) {
      return {
        valid: false,
        fileCategory: 'VIDEO',
        detectedMimeType: declaredMime || 'video/mp4',
        buffer: buf,
        base64Clean: cleanBase64,
        errorCode: 'CORRUPTED_FILE',
        errorMessage: 'The uploaded video file is corrupted or uses an unsupported container format.'
      };
    }
    return {
      valid: false,
      fileCategory: 'TEXT',
      detectedMimeType: declaredMime || 'application/octet-stream',
      buffer: buf,
      base64Clean: cleanBase64,
      errorCode: 'UNSUPPORTED_FILE_TYPE',
      errorMessage: `Unsupported file type (${declaredMime || fileName || 'unknown'}). Supported formats: JPEG, PNG, WebP, PDF, and MP4/WebM.`
    };
  }

  // Check file size limit
  const maxAllowed =
    maxBytesOverride ||
    (fileCategory === 'PDF'
      ? MAX_PDF_BYTES
      : fileCategory === 'VIDEO'
        ? MAX_VIDEO_BYTES
        : MAX_IMAGE_BYTES);

  if (buf.length > maxAllowed) {
    const sizeMb = (buf.length / (1024 * 1024)).toFixed(1);
    const maxMb = (maxAllowed / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      fileCategory,
      detectedMimeType: detectedMime,
      buffer: buf,
      base64Clean: cleanBase64,
      errorCode: 'FILE_TOO_LARGE',
      errorMessage: `File size (${sizeMb} MB) exceeds the maximum allowed limit of ${maxMb} MB for ${fileCategory} uploads.`
    };
  }

  return {
    valid: true,
    fileCategory,
    detectedMimeType: detectedMime,
    buffer: buf,
    base64Clean: cleanBase64
  };
}

/**
 * Decodes PDF literal strings `(...)` and hex strings `<...>` into UTF-8 text (including Bangla Unicode).
 */
function decodePdfStringToken(token: string): string {
  if (token.startsWith('(') && token.endsWith(')')) {
    const inner = token.slice(1, -1);
    // Unescape PDF string escapes
    let out = '';
    const bytes: number[] = [];
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (ch === '\\' && i + 1 < inner.length) {
        const next = inner[i + 1];
        if (next >= '0' && next <= '7') {
          const octMatch = inner.slice(i + 1, i + 4).match(/^[0-7]{1,3}/);
          if (octMatch) {
            const val = parseInt(octMatch[0], 8);
            bytes.push(val);
            out += String.fromCharCode(val);
            i += octMatch[0].length;
            continue;
          }
        }
        switch (next) {
          case 'n':
            bytes.push(10);
            out += '\n';
            break;
          case 'r':
            bytes.push(13);
            out += '\r';
            break;
          case 't':
            bytes.push(9);
            out += '\t';
            break;
          case '(':
          case ')':
          case '\\':
            bytes.push(next.charCodeAt(0));
            out += next;
            break;
          default:
            bytes.push(next.charCodeAt(0));
            out += next;
            break;
        }
        i += 1;
      } else {
        bytes.push(ch.charCodeAt(0));
        out += ch;
      }
    }

    // Check UTF-16BE BOM (0xFE 0xFF)
    if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
      let u16 = '';
      for (let j = 2; j + 1 < bytes.length; j += 2) {
        u16 += String.fromCharCode((bytes[j] << 8) | bytes[j + 1]);
      }
      return u16;
    }

    // Attempt UTF-8 decode if high bytes exist (for Bangla / UTF-8 encoded PDF strings)
    if (bytes.some(b => b >= 0x80 && b <= 0xff)) {
      try {
        const utf8Decoded = Buffer.from(bytes).toString('utf-8');
        if (!utf8Decoded.includes('\ufffd')) {
          return utf8Decoded;
        }
      } catch {
        // Fallback to out
      }
    }
    return out;
  }

  if (token.startsWith('<') && token.endsWith('>')) {
    const hex = token.slice(1, -1).replace(/\s+/g, '');
    if (!hex || !/^[0-9a-fA-F]+$/.test(hex)) return '';
    const buf = Buffer.from(hex.length % 2 === 0 ? hex : hex + '0', 'hex');
    if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
      let u16 = '';
      for (let j = 2; j + 1 < buf.length; j += 2) {
        u16 += String.fromCharCode((buf[j] << 8) | buf[j + 1]);
      }
      return u16;
    }
    // If even length and mostly 2-byte big-endian (e.g. Bangla 0x0980..0x09FF or ASCII 0x0020..0x007E)
    if (buf.length >= 2 && buf.length % 2 === 0 && (buf[0] === 0x00 || buf[0] === 0x09)) {
      let u16 = '';
      for (let j = 0; j + 1 < buf.length; j += 2) {
        u16 += String.fromCharCode((buf[j] << 8) | buf[j + 1]);
      }
      return u16;
    }
    return buf.toString('utf-8');
  }

  return '';
}

/**
 * Extracts text from a decompressed PDF content stream.
 */
function extractTextFromPdfStreamContent(streamStr: string): string {
  const lines: string[] = [];
  let currentLine = '';

  // Match BT ... ET blocks or scan entire stream if BT/ET are omitted
  const blocks = streamStr.match(/BT[\s\S]*?ET/g) || [streamStr];

  for (const block of blocks) {
    // Match text-positioning and text-showing operators:
    // - `(string) Tj` or `<hex> Tj`
    // - `[(string) -100 (string)] TJ`
    // - `T*`, `Td`, `TD`, `'`, `"` (line breaks)
    const tokenRegex = /(\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]+>)\s*Tj|\[([\s\S]*?)\]\s*TJ|(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+T[dD]\b|\bT\*(?=\s|$|\(|\[|<)|(\((?:\\.|[^\\()])*\))\s*'/g;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(block)) !== null) {
      if (match[1] !== undefined) {
        // Single Tj
        currentLine += decodePdfStringToken(match[1]);
      } else if (match[2] !== undefined) {
        // Array TJ
        const arrayContent = match[2];
        const subRegex = /(\((?:\\.|[^\\()])*\)|<[0-9a-fA-F\s]+>)|(-?\d+(?:\.\d+)?)/g;
        let subMatch: RegExpExecArray | null;
        while ((subMatch = subRegex.exec(arrayContent)) !== null) {
          if (subMatch[1] !== undefined) {
            currentLine += decodePdfStringToken(subMatch[1]);
          } else if (subMatch[2] !== undefined) {
            const kerning = parseFloat(subMatch[2]);
            if (kerning < -180 && !currentLine.endsWith(' ')) {
              currentLine += ' ';
            }
          }
        }
      } else if (match[4] !== undefined) {
        // Td / TD vertical offset
        const ty = parseFloat(match[4]);
        if (Math.abs(ty) > 1) {
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = '';
        } else if (!currentLine.endsWith(' ')) {
          currentLine += ' ';
        }
      } else if (match[5] !== undefined) {
        // ' operator (next line + show text)
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = decodePdfStringToken(match[5]);
      } else {
        // T*
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = '';
      }
    }

    if (currentLine.trim()) {
      lines.push(currentLine.trim());
      currentLine = '';
    }
  }

  return lines.join('\n').trim();
}

/**
 * Extracts multi-page text from a PDF buffer (supporting both uncompressed and FlateDecode compressed streams),
 * processes pages in controlled batches, preserves page numbers, and detects whether a PDF is scanned/image-based.
 */
export function extractPdfContentInBatches(
  pdfBuffer: Buffer,
  options?: { startPage?: number; endPage?: number; batchSize?: number }
): {
  pageCount: number;
  processedPages: number[];
  pages: ExtractedPdfPage[];
  combinedText: string;
  isScannedPdf: boolean;
  embeddedOcrTextHint: string;
} {
  const rawLatin1 = pdfBuffer.toString('latin1');
  const rawUtf8 = pdfBuffer.toString('utf-8');

  // Count `/Type /Page` (excluding `/Type /Pages`)
  const pageMatches = rawLatin1.match(/\/Type\s*\/Page\b(?!s)/g);
  const declaredPageCount = pageMatches ? pageMatches.length : 0;

  // Locate all stream ... endstream blocks
  const streamTexts: string[] = [];
  let hasImageXObject = /\/Subtype\s*\/Image\b|\/DCTDecode\b|\/JPXDecode\b/.test(rawLatin1);

  let searchPos = 0;
  while (searchPos < rawLatin1.length) {
    const streamKeyIdx = rawLatin1.indexOf('stream', searchPos);
    if (streamKeyIdx === -1) break;

    // Ensure 'stream' is not part of 'endstream'
    if (streamKeyIdx >= 3 && rawLatin1.slice(streamKeyIdx - 3, streamKeyIdx) === 'end') {
      searchPos = streamKeyIdx + 6;
      continue;
    }

    let dataStart = streamKeyIdx + 6;
    if (rawLatin1[dataStart] === '\r' && rawLatin1[dataStart + 1] === '\n') {
      dataStart += 2;
    } else if (rawLatin1[dataStart] === '\n' || rawLatin1[dataStart] === '\r') {
      dataStart += 1;
    } else {
      searchPos = streamKeyIdx + 6;
      continue;
    }

    const endStreamIdx = rawLatin1.indexOf('endstream', dataStart);
    if (endStreamIdx === -1) break;

    // Inspect dictionary preceding 'stream'
    const dictSlice = rawLatin1.slice(Math.max(0, streamKeyIdx - 350), streamKeyIdx);
    const isFlate = /\/FlateDecode\b/.test(dictSlice);
    const isImageStream = /\/Subtype\s*\/Image\b|\/DCTDecode\b/.test(dictSlice);

    if (isImageStream) {
      hasImageXObject = true;
    } else {
      let streamBytes = pdfBuffer.subarray(dataStart, endStreamIdx);
      // Trim trailing newline before endstream
      while (
        streamBytes.length > 0 &&
        (streamBytes[streamBytes.length - 1] === 0x0a || streamBytes[streamBytes.length - 1] === 0x0d)
      ) {
        streamBytes = streamBytes.subarray(0, streamBytes.length - 1);
      }

      let decodedStreamStr = '';
      if (isFlate && streamBytes.length > 0) {
        try {
          decodedStreamStr = zlib.inflateSync(streamBytes).toString('latin1');
        } catch {
          try {
            decodedStreamStr = zlib.inflateRawSync(streamBytes).toString('latin1');
          } catch {
            decodedStreamStr = '';
          }
        }
      } else {
        // Also check if UTF-8 strings exist directly in uncompressed stream
        const utf8Candidate = streamBytes.toString('utf-8');
        decodedStreamStr = utf8Candidate.includes('\ufffd')
          ? streamBytes.toString('latin1')
          : utf8Candidate;
      }

      if (decodedStreamStr) {
        const extracted = extractTextFromPdfStreamContent(decodedStreamStr);
        if (extracted.trim().length > 0) {
          streamTexts.push(extracted.trim());
        }
      }
    }

    searchPos = endStreamIdx + 9;
  }

  // Also check for any embedded OCR text comments (`%OCR_TEXT:` or `/Contents` text annotations)
  const embeddedOcrLines: string[] = [];
  const ocrCommentMatches = rawUtf8.match(/^%\s*OCR_PAGE_\d+:\s*(.+)$/gm);
  if (ocrCommentMatches) {
    for (const m of ocrCommentMatches) {
      embeddedOcrLines.push(m.replace(/^%\s*OCR_PAGE_\d+:\s*/, '').trim());
    }
  }

  const totalPages = Math.max(declaredPageCount, streamTexts.length, 1);
  const startPage = Math.max(1, options?.startPage || 1);
  const endPage = Math.min(totalPages, options?.endPage || totalPages);
  const batchSize = Math.max(1, options?.batchSize || 5);

  const pages: ExtractedPdfPage[] = [];
  const processedPages: number[] = [];

  for (let batchStart = startPage; batchStart <= endPage; batchStart += batchSize) {
    const batchEnd = Math.min(endPage, batchStart + batchSize - 1);
    for (let p = batchStart; p <= batchEnd; p++) {
      const pageText = (streamTexts[p - 1] || '').trim();
      const hasTable =
        pageText.includes('|') ||
        /\b\d{1,2}:\d{2}\s*(?:AM|PM)?\s*[-–]\s*\d{1,2}:\d{2}/i.test(pageText) ||
        (pageText.match(/\t|\s{3,}/g) || []).length >= 3;

      processedPages.push(p);
      pages.push({
        pageNumber: p,
        text: pageText,
        hasTable
      });
    }
  }

  const combinedText = pages
    .filter(p => p.text.length > 0)
    .map(p => (pages.length > 1 ? `[Page ${p.pageNumber}]\n${p.text}` : p.text))
    .join('\n\n')
    .trim();

  const isScannedPdf = combinedText.length < 10 && (hasImageXObject || embeddedOcrLines.length > 0 || declaredPageCount >= 1);

  return {
    pageCount: totalPages,
    processedPages,
    pages,
    combinedText,
    isScannedPdf,
    embeddedOcrTextHint: embeddedOcrLines.join('\n').trim()
  };
}

/**
 * Extracts embedded text chunks from PNG (`tEXt`, `iTXt`, `zTXt`), JPEG (`COM`/`APP1`), or WebP metadata if present.
 */
export function extractEmbeddedTextFromImageBuffer(buf: Buffer, mimeType: string): string {
  const chunks: string[] = [];

  if (mimeType === 'image/png' && buf.length > 8) {
    let offset = 8;
    while (offset + 8 <= buf.length) {
      const length = buf.readUInt32BE(offset);
      const type = buf.slice(offset + 4, offset + 8).toString('ascii');
      const dataStart = offset + 8;
      const dataEnd = dataStart + length;
      if (dataEnd > buf.length) break;

      if (type === 'tEXt') {
        const raw = buf.subarray(dataStart, dataEnd).toString('utf-8');
        const nulIdx = raw.indexOf('\0');
        const val = nulIdx >= 0 ? raw.slice(nulIdx + 1) : raw;
        if (val.trim()) chunks.push(val.trim());
      } else if (type === 'iTXt') {
        const raw = buf.subarray(dataStart, dataEnd).toString('utf-8');
        const parts = raw.split('\0').filter(Boolean);
        if (parts.length > 1) {
          chunks.push(parts[parts.length - 1].trim());
        }
      } else if (type === 'zTXt') {
        const sub = buf.subarray(dataStart, dataEnd);
        const nulIdx = sub.indexOf(0);
        if (nulIdx >= 0 && nulIdx + 2 < sub.length) {
          try {
            const inflated = zlib.inflateSync(sub.subarray(nulIdx + 2)).toString('utf-8');
            if (inflated.trim()) chunks.push(inflated.trim());
          } catch {
            // ignore
          }
        }
      } else if (type === 'IEND') {
        break;
      }
      offset = dataEnd + 4; // skip CRC
    }
  } else if (mimeType === 'image/jpeg' && buf.length > 4) {
    let offset = 2;
    while (offset + 4 <= buf.length && buf[offset] === 0xff) {
      const marker = buf[offset + 1];
      if (marker === 0xda || marker === 0xd9) break; // SOS or EOI
      const segLen = buf.readUInt16BE(offset + 2);
      if (segLen < 2 || offset + 2 + segLen > buf.length) break;
      if (marker === 0xfe) {
        // JPEG Comment marker (COM)
        const comText = buf.subarray(offset + 4, offset + 2 + segLen).toString('utf-8').trim();
        if (comText) chunks.push(comText);
      }
      offset += 2 + segLen;
    }
  } else if (mimeType === 'image/webp' && buf.length > 12) {
    const utf8 = buf.toString('utf-8');
    const match = utf8.match(/OCR_TEXT:([\s\S]+)$/);
    if (match && match[1]) chunks.push(match[1].trim());
  }

  return chunks.join('\n').trim();
}

/**
 * Deterministic Bangla + English Class Routine Parser from extracted text
 */
export function parseRoutineFromText(
  rawText: string,
  defaults?: {
    college?: string;
    department?: string;
    semester?: number;
    shift?: Shift;
    section?: Section;
  }
): RoutineExtractionData {
  const normalizedText = normalizeBanglaDigits(rawText);
  const lines = normalizedText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  let detectedCollege: string | null = null;
  let detectedCollegeId: string | null = null;
  let detectedDept: string | null = null;
  let detectedDeptId: string | null = null;
  let detectedSemester: SemesterNumber | null = null;
  let detectedShift: Shift | null = null;
  let detectedSection: Section | null = null;
  const globalUncertain: string[] = [];

  for (const line of lines.slice(0, 12)) {
    if (!detectedCollege) {
      const colMatch = line.match(/([A-Za-z\s]+Polytechnic Institute(?:\s*\([A-Z]+\))?)/i);
      if (colMatch) {
        const resolved = resolveStrictCollege(colMatch[1].trim());
        if (resolved) {
          detectedCollege = resolved.name;
          detectedCollegeId = resolved.id;
        }
      } else if (/ঢাকা পলিটেকনিক|Dhaka Polytechnic/i.test(line)) {
        const resolved = resolveStrictCollege('Dhaka Polytechnic Institute');
        if (resolved) {
          detectedCollege = resolved.name;
          detectedCollegeId = resolved.id;
        }
      }
    }

    if (!detectedDept) {
      if (/Computer Science|কম্পিউটার|\bCST\b/i.test(line)) {
        const resolved = resolveStrictTechnology('Computer Science and Technology (CST)');
        if (resolved) {
          detectedDept = resolved.name;
          detectedDeptId = resolved.id;
        }
      } else if (/Civil|সিভিল|\bCT\b/i.test(line)) {
        const resolved = resolveStrictTechnology('Civil Technology');
        if (resolved) {
          detectedDept = resolved.name;
          detectedDeptId = resolved.id;
        }
      } else if (/Electrical|ইলেকট্রিক্যাল|\bET\b/i.test(line)) {
        const resolved = resolveStrictTechnology('Electrical Technology');
        if (resolved) {
          detectedDept = resolved.name;
          detectedDeptId = resolved.id;
        }
      } else if (/Mechanical|মেকানিক্যাল|\bMT\b/i.test(line)) {
        const resolved = resolveStrictTechnology('Mechanical Technology');
        if (resolved) {
          detectedDept = resolved.name;
          detectedDeptId = resolved.id;
        }
      } else if (/Electronics|ইলেকট্রনিক্স|\bENT\b/i.test(line)) {
        const resolved = resolveStrictTechnology('Electronics Technology');
        if (resolved) {
          detectedDept = resolved.name;
          detectedDeptId = resolved.id;
        }
      }
    }

    if (!detectedSemester) {
      const semMatch =
        line.match(/([1-8])\s*(?:st|nd|rd|th|ম|য়|র্থ|ষ্ঠ)?\s*(?:Semester|Sem|পর্ব|সেমিস্টার)/i) ||
        line.match(/(?:Semester|Sem|পর্ব|সেমিস্টার)\s*[:#]?\s*([1-8])(?!(?:\s*ম|\s*য়)?\s*(?:Shift|শিফট))/i);
      if (semMatch) {
        const num = parseInt(semMatch[1], 10);
        if (num >= 1 && num <= 8) detectedSemester = num as SemesterNumber;
      }
    }

    if (!detectedShift) {
      if (/\bMorning\b|প্রভাতী|মর্নিং|1st\s*Shift|1ম\s*শিফট|প্রথম\s*শিফট/i.test(line)) detectedShift = 'Morning';
      else if (/\bDay\b|দিবা|2nd\s*Shift|2য়\s*শিফট|দ্বিতীয়\s*শিফট/i.test(line)) detectedShift = 'Day';
    }

    if (!detectedSection) {
      const secMatch = line.match(/(?:Section|Sec|গ্রুপ|শাখা)?\s*[:\-]?\s*\b(A1|A2|B1|B2)\b/i);
      if (secMatch) {
        detectedSection = secMatch[1].toUpperCase() as Section;
      }
    }
  }

  const dayMap: Array<{ regex: RegExp; day: WeekDay }> = [
    { regex: /(?:\bSaturday\b|\bSat\b|শনিবার|শনি)/i, day: 'Saturday' },
    { regex: /(?:\bSunday\b|\bSun\b|রবিবার|রবি)/i, day: 'Sunday' },
    { regex: /(?:\bMonday\b|\bMon\b|সোমবার|সোম)/i, day: 'Monday' },
    { regex: /(?:\bTuesday\b|\bTue\b|মঙ্গলবার|মঙ্গল)/i, day: 'Tuesday' },
    { regex: /(?:\bWednesday\b|\bWed\b|বুধবার|বুধ)/i, day: 'Wednesday' },
    { regex: /(?:\bThursday\b|\bThu\b|বৃহস্পতিবার|বৃহস্পতি)/i, day: 'Thursday' }
  ];

  let currentDay: WeekDay = 'Saturday';
  const periods: RoutinePeriod[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const d of dayMap) {
      if (d.regex.test(line)) {
        currentDay = d.day;
        break;
      }
    }

    // Look for a 5-digit BTEB subject code (e.g. 66661, 25911, 26611) OR an explicit time range + subject
    const codeMatch = line.match(/(?:^|\s|[^\d])(\d{5})(?=$|\s|[^\d])/);
    const timeRangeMatch = line.match(
      /(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*(?:[-–to]+)\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i
    );

    if (!codeMatch && !timeRangeMatch) continue;
    // Skip header lines that just mention years or institute codes like "50118 - Dhaka Polytechnic"
    if (codeMatch && /Polytechnic Institute|Institute Code/i.test(line) && !timeRangeMatch) {
      continue;
    }

    const periodUncertain: string[] = [];
    const subjectCode = codeMatch ? codeMatch[1] : '';
    const catalogResolved = subjectCode ? resolveBtebSubjectCode(subjectCode) : null;

    // Period number
    const periodNumMatch =
      line.match(/(?:\bPeriod\b|\bP\b|পিরিয়ড)\s*[-#:]?\s*([1-7])\b/i) ||
      line.match(/^\s*([1-7])[.)|\s]/);
    const periodNumber = periodNumMatch ? parseInt(periodNumMatch[1], 10) : (periods.filter(p => p.day === currentDay).length + 1);

    let startTime = timeRangeMatch ? timeRangeMatch[1].trim() : '';
    let endTime = timeRangeMatch ? timeRangeMatch[2].trim() : '';
    if (!startTime || !endTime) {
      periodUncertain.push('time');
    } else {
      if (!/AM|PM/i.test(startTime)) {
        const hr = parseInt(startTime.split(':')[0], 10);
        startTime = `${startTime} ${hr >= 8 && hr <= 11 ? 'AM' : 'PM'}`;
      }
      if (!/AM|PM/i.test(endTime)) {
        const hr = parseInt(endTime.split(':')[0], 10);
        endTime = `${endTime} ${hr >= 8 && hr <= 11 ? 'AM' : 'PM'}`;
      }
    }

    // Room extraction
    const roomMatch =
      line.match(/(?:\bRoom\b|\bRm\b|\bLab\b|কক্ষ|ল্যাব)\s*[:\-#]?\s*([A-Za-z0-9\-_]+(?:\s*Lab)?)/i) ||
      line.match(/\b((?:NET|SW|HW|MP|IOT|CAD|DB|CS|EL|CV|ME)[-\s]?\d{1,4})\b/i);
    const room = roomMatch ? roomMatch[1].trim() : '';
    if (!room) periodUncertain.push('room');

    // Teacher extraction
    const teacherMatch =
      line.match(/\b(?:Teacher|Instructor|Faculty|শিক্ষক|Engr\.|Prof\.|Md\.|Dr\.)\s*[:\-]?\s*([A-Za-z.\s]{3,35})/i) ||
      line.match(/\[([A-Za-z.\s]{2,25})\]/);
    const teacherName = teacherMatch ? teacherMatch[1].replace(/\|.*$/, '').trim() : '';
    if (!teacherName) periodUncertain.push('teacherName');

    // Subject name extraction
    let subjectName = catalogResolved?.name || '';
    if (!subjectName) {
      // Strip out day, time, code, room, teacher from line to find subject title
      let cleaned = line;
      for (const d of dayMap) cleaned = cleaned.replace(d.regex, ' ');
      if (timeRangeMatch) cleaned = cleaned.replace(timeRangeMatch[0], ' ');
      if (codeMatch) cleaned = cleaned.replace(codeMatch[0], ' ');
      if (roomMatch) cleaned = cleaned.replace(roomMatch[0], ' ');
      if (teacherMatch) cleaned = cleaned.replace(teacherMatch[0], ' ');
      cleaned = cleaned
        .replace(/\b(?:Period|P|পিরিয়ড)\s*[-#:]?\s*[1-7]\b/gi, ' ')
        .replace(/\b(?:Theory|Practical|Lab|তত্ত্বীয়|ব্যবহারিক)\b/gi, ' ')
        .replace(/[|,\-–()[\]:]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      subjectName = cleaned;
    }

    if (!subjectCode) periodUncertain.push('subjectCode');
    if (!subjectName || subjectName.length < 2) {
      periodUncertain.push('subjectName');
    }

    const isLab = /\b(?:Practical|Lab|ব্যবহারিক|Sessional)\b/i.test(line) || /Lab/i.test(room);
    const confidence: 'high' | 'medium' | 'low' =
      periodUncertain.length === 0 ? 'high' : periodUncertain.length <= 2 ? 'medium' : 'low';

    periods.push({
      id: `ocr_rt_${Date.now()}_${i}`,
      day: currentDay,
      periodNumber: Math.min(7, Math.max(1, periodNumber)),
      startTime: startTime || 'TBA',
      endTime: endTime || 'TBA',
      subjectCode: subjectCode || '',
      subjectName: subjectName || 'Unrecognized Subject (Verify)',
      teacherName: teacherName || 'Verify Instructor',
      room: room || 'Verify Room',
      type: isLab ? 'Practical / Lab' : 'Theory',
      shift: detectedShift || defaults?.shift || 'Morning',
      section: detectedSection || defaults?.section || 'A1',
      college: detectedCollege || defaults?.college,
      college_id: detectedCollegeId || (defaults?.college ? normalizeCollege(defaults.college).id : null),
      department: detectedDept || defaults?.department,
      department_id: detectedDeptId || (defaults?.department ? normalizeTechnology(defaults.department).id : null),
      technology_id: detectedDeptId || (defaults?.department ? normalizeTechnology(defaults.department).id : null),
      semester: (detectedSemester || defaults?.semester || null) as SemesterNumber | null,
      confidence,
      uncertainFields: periodUncertain
    });
  }

  if (!detectedCollege) globalUncertain.push('college');
  if (!detectedDept) globalUncertain.push('department');
  if (!detectedSemester) globalUncertain.push('semester');
  if (!detectedShift) globalUncertain.push('shift');
  if (!detectedSection) globalUncertain.push('section');

  return {
    college: detectedCollege,
    college_id: detectedCollegeId,
    department: detectedDept,
    department_id: detectedDeptId,
    semester: detectedSemester,
    section: detectedSection,
    shift: detectedShift,
    periods,
    uncertainFields: globalUncertain
  };
}

/**
 * Deterministic Bangla + English Assignment Parser
 */
export function parseAssignmentFromText(rawText: string, pageNumbers: number[] = [1]): AssignmentExtractionData {
  const normalized = normalizeBanglaDigits(rawText);
  const lines = normalized
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !/^\[Page \d+\]$/i.test(l));

  const uncertainFields: string[] = [];

  // Title: look for "Assignment:", "Title:", "অ্যাসাইনমেন্ট:", or first prominent heading
  let title = '';
  const titleLine = lines.find(l => /^(?:Assignment(?:\s*Title|\s*No)?|Title|Topic|অ্যাসাইনমেন্ট|শিরোনাম)\s*[:\-]/i.test(l));
  if (titleLine) {
    title = titleLine.replace(/^(?:Assignment(?:\s*Title|\s*No)?|Title|Topic|অ্যাসাইনমেন্ট|শিরোনাম)\s*[:\-]\s*/i, '').trim();
  }
  if (!title && lines.length > 0) {
    title = lines.find(l => l.length >= 6 && !/Polytechnic|Department|Semester|Subject\s*Code/i.test(l)) || lines[0];
  }
  if (!title) uncertainFields.push('title');

  // Subject Code & Name
  const codeMatch = normalized.match(/\b(?:Subject\s*Code|Code|বিষয়\s*কোড|কোড)?\s*[:\-]?\s*(\d{5})\b/i);
  const subjectCode = codeMatch ? codeMatch[1] : '';
  const resolvedSub = subjectCode ? resolveBtebSubjectCode(subjectCode) : null;

  let subjectName = resolvedSub?.name || '';
  if (!subjectName) {
    const subLine = lines.find(l => /^(?:Subject(?:\s*Name)?|Course|বিষয়)\s*[:\-]/i.test(l));
    if (subLine) {
      subjectName = subLine
        .replace(/^(?:Subject(?:\s*Name)?|Course|বিষয়)\s*[:\-]\s*/i, '')
        .replace(/\(\d{5}\)|\b\d{5}\b/, '')
        .trim();
    }
  }
  if (!subjectCode) uncertainFields.push('subjectCode');
  if (!subjectName) uncertainFields.push('subjectName');

  // Semester
  let semester: SemesterNumber | null = null;
  const semMatch = normalized.match(/(?:Semester|Sem|পর্ব|সেমিস্টার)\s*[:\-]?\s*([1-8])/i);
  if (semMatch) semester = parseInt(semMatch[1], 10) as SemesterNumber;

  // Due Date / Deadline
  let dueDate = '';
  const dueLine = lines.find(l => /(?:Due\s*Date|Deadline|Submission\s*Date|Last\s*Date|জমা\s*দেওয়ার\s*শেষ\s*তারিখ|শেষ\s*তারিখ)\s*[:\-]/i.test(l));
  if (dueLine) {
    dueDate = dueLine.replace(/^.*?(?:Due\s*Date|Deadline|Submission\s*Date|Last\s*Date|জমা\s*দেওয়ার\s*শেষ\s*তারিখ|শেষ\s*তারিখ)\s*[:\-]\s*/i, '').trim();
  } else {
    const isoMatch = normalized.match(/\b(202\d-\d{2}-\d{2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+202\d)\b/i);
    if (isoMatch) dueDate = isoMatch[1];
  }
  if (!dueDate) uncertainFields.push('dueDate');

  // Marks
  let marks = '';
  const marksMatch = normalized.match(/(?:Total\s*Marks|Full\s*Marks|Marks|পূর্ণমান|নম্বর)\s*[:\-]?\s*(\d{1,3})/i);
  if (marksMatch) marks = marksMatch[1];

  // Teacher Name
  let teacherName = '';
  const teacherLine = lines.find(l => /(?:Teacher|Instructor|Assigned\s*By|Faculty|শিক্ষক)\s*[:\-]/i.test(l));
  if (teacherLine) {
    teacherName = teacherLine.replace(/^.*?(?:Teacher|Instructor|Assigned\s*By|Faculty|শিক্ষক)\s*[:\-]\s*/i, '').trim();
  }

  // Submission Method
  let submissionMethod = '';
  const subMethodLine = lines.find(l => /(?:Submission\s*Method|Submit\s*via|How\s*to\s*Submit|জমা\s*দেওয়ার\s*নিয়ম)\s*[:\-]/i.test(l));
  if (subMethodLine) {
    submissionMethod = subMethodLine.replace(/^.*?(?:Submission\s*Method|Submit\s*via|How\s*to\s*Submit|জমা\s*দেওয়ার\s*নিয়ম)\s*[:\-]\s*/i, '').trim();
  }

  // Questions
  const questions: string[] = [];
  for (const line of lines) {
    if (/^(?:Q\d+|Question\s*\d+|\d+[.)]|প্রশ্ন\s*\d+)\s+/i.test(line)) {
      questions.push(line);
    }
  }

  // Instructions
  const instructionsLines = lines.filter(
    l =>
      l !== title &&
      !questions.includes(l) &&
      !/^(?:Subject|Semester|Due\s*Date|Deadline|Teacher|Total\s*Marks|Marks)\s*[:\-]/i.test(l)
  );
  const instructions = instructionsLines.join('\n').trim() || rawText.trim();

  const confidence: 'high' | 'medium' | 'low' =
    uncertainFields.length === 0 ? 'high' : uncertainFields.length <= 2 ? 'medium' : 'low';

  return {
    title,
    subjectCode,
    subjectName,
    semester,
    department: null,
    instructions,
    questions,
    dueDate,
    submissionMethod,
    teacherName,
    marks,
    pageNumbers,
    confidence,
    uncertainFields
  };
}

/**
 * Deterministic Bangla + English Notes & Study Material Parser
 */
export function parseNoteFromText(
  rawText: string,
  pages: ExtractedPdfPage[] = [{ pageNumber: 1, text: rawText, hasTable: false }]
): NoteExtractionData {
  const normalized = normalizeBanglaDigits(rawText);
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !/^\[Page \d+\]$/i.test(l));

  const uncertainFields: string[] = [];

  // Title
  let title = '';
  const titleLine = lines.find(l => /^(?:Title|Topic|Lecture|Note|শিরোনাম|টপিক)\s*[:\-]/i.test(l));
  if (titleLine) {
    title = titleLine.replace(/^(?:Title|Topic|Lecture|Note|শিরোনাম|টপিক)\s*[:\-]\s*/i, '').trim();
  } else if (lines.length > 0) {
    title = lines[0].replace(/^#+\s*/, '').slice(0, 120);
  }
  if (!title) uncertainFields.push('title');

  // Subject Code & Name
  const codeMatch = normalized.match(/\b(\d{5})\b/);
  const subjectCode = codeMatch ? codeMatch[1] : '';
  const resolvedSub = subjectCode ? resolveBtebSubjectCode(subjectCode) : null;
  let subjectName = resolvedSub?.name || '';
  if (!subjectName) {
    const subLine = lines.find(l => /^(?:Subject|Course|বিষয়)\s*[:\-]/i.test(l));
    if (subLine) {
      subjectName = subLine.replace(/^(?:Subject|Course|বিষয়)\s*[:\-]\s*/i, '').trim();
    }
  }
  if (!subjectCode) uncertainFields.push('subjectCode');

  // Chapter
  let chapter = '';
  const chapMatch = rawText.match(/(?:Chapter|Unit|Module|অধ্যায়)\s*[:\-]?\s*([^\n\r]{1,60})/i);
  if (chapMatch) {
    chapter = `Chapter ${chapMatch[1].trim()}`.replace(/^Chapter\s+Chapter/i, 'Chapter');
  } else {
    chapter = 'Chapter 1';
    uncertainFields.push('chapter');
  }

  // Semester
  let semester: SemesterNumber | null = null;
  const semMatch = normalized.match(/(?:Semester|Sem|পর্ব)\s*[:\-]?\s*([1-8])/i);
  if (semMatch) semester = parseInt(semMatch[1], 10) as SemesterNumber;

  // Headings
  const headings: string[] = [];
  for (const line of lines) {
    if (
      /^#+\s+/.test(line) ||
      /^(?:Section|Topic|Chapter|\d+\.\d+|\d+\.)\s+[A-Z\u0980-\u09FF]/.test(line) ||
      (line.length >= 4 && line.length <= 70 && line === line.toUpperCase() && /[A-Z]{3,}/.test(line))
    ) {
      headings.push(line.replace(/^#+\s*/, '').trim());
    }
  }

  // Tables
  const tables: string[] = [];
  const tableLines = lines.filter(l => l.includes('|') || (l.match(/\t|\s{3,}/g) || []).length >= 2);
  if (tableLines.length >= 2) {
    tables.push(tableLines.slice(0, 12).join('\n'));
  }

  const summary = lines.slice(0, 4).join(' ').slice(0, 280);
  const pageNumbers = pages.map(p => p.pageNumber);
  const confidence: 'high' | 'medium' | 'low' =
    rawText.trim().length > 40 ? (uncertainFields.length <= 1 ? 'high' : 'medium') : 'low';

  return {
    title,
    subjectCode,
    subjectName,
    semester,
    chapter,
    summary,
    extractedText: rawText.trim(),
    headings: Array.from(new Set(headings)).slice(0, 15),
    tables,
    pageCount: pages.length,
    pageNumbers,
    confidence,
    uncertainFields
  };
}

/**
 * Deterministic Notice Parser
 */
export function parseNoticeFromText(rawText: string): NoticeExtractionData {
  const normalized = normalizeBanglaDigits(rawText);
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const uncertainFields: string[] = [];
  const titleLine =
    lines.find(l => /^(?:Subject|Notice|Title|বিষয়|বিজ্ঞপ্তি)\s*[:\-]/i.test(l)) || lines[0] || '';
  const title = titleLine.replace(/^(?:Subject|Notice|Title|বিষয়|বিজ্ঞপ্তি)\s*[:\-]\s*/i, '').trim();
  if (!title) uncertainFields.push('title');

  const isImportant = /urgent|important|exam|deadline|emergency|জরুরি|পরীক্ষা|সতর্কীকরণ/i.test(rawText);
  const semMatch = normalized.match(/(?:Semester|Sem|পর্ব)\s*[:\-]?\s*([1-8])/i);
  const expMatch = normalized.match(/\b(202\d-\d{2}-\d{2})\b/);

  return {
    title,
    description: rawText.trim(),
    semester: semMatch ? (parseInt(semMatch[1], 10) as SemesterNumber) : null,
    expiryDate: expMatch ? expMatch[1] : undefined,
    priority: isImportant ? 'Important' : 'Normal',
    confidence: title && rawText.trim().length > 15 ? 'high' : 'medium',
    uncertainFields
  };
}

/**
 * Deterministic Job Circular Parser
 */
export function parseJobFromText(rawText: string): JobExtractionData {
  const normalized = normalizeBanglaDigits(rawText);
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const uncertainFields: string[] = [];

  const titleMatch = rawText.match(/(?:Position|Job\s*Title|Post|পদবী|পদের\s*নাম)\s*[:\-]\s*([^\n\r]+)/i);
  const title = titleMatch ? titleMatch[1].trim() : (lines[0] || '');
  if (!title) uncertainFields.push('title');

  const companyMatch = rawText.match(/(?:Company|Employer|Organization|প্রতিষ্ঠান)\s*[:\-]\s*([^\n\r]+)/i);
  const company = companyMatch ? companyMatch[1].trim() : (lines[1] || '');
  if (!company) uncertainFields.push('company');

  const locMatch = rawText.match(/(?:Location|Workplace|কর্মস্থল)\s*[:\-]\s*([^\n\r]+)/i);
  const location = locMatch ? locMatch[1].trim() : 'Dhaka, Bangladesh';

  const salMatch = rawText.match(/(?:Salary|Stipend|বেতন)\s*[:\-]\s*([^\n\r]+)/i);
  const stipendOrSalary = salMatch ? salMatch[1].trim() : 'Negotiable';

  const deadMatch = normalized.match(/(?:Deadline|Last\s*Date|আবেদনের\s*শেষ\s*তারিখ)\s*[:\-]?\s*(202\d-\d{2}-\d{2}|[^\n\r]{4,25})/i);
  const deadline = deadMatch ? deadMatch[1].trim() : '';
  if (!deadline) uncertainFields.push('deadline');

  const expMatch = rawText.match(/(?:Experience|অভিজ্ঞতা)\s*[:\-]\s*([^\n\r]+)/i);
  const experienceRequirements = expMatch ? expMatch[1].trim() : 'Freshers / 0–2 Years';

  const eduMatch = rawText.match(/(?:Education|Qualification|শিক্ষাগত\s*যোগ্যতা)\s*[:\-]\s*([^\n\r]+)/i);
  const educationalQualifications = eduMatch ? eduMatch[1].trim() : 'Diploma in Engineering (BTEB)';

  const urlMatch = rawText.match(/(https?:\/\/[^\s)>\]]+)/i);

  return {
    title,
    company,
    location,
    type: /Intern/i.test(rawText) ? 'Internship' : 'Full-Time',
    deadline,
    stipendOrSalary,
    experienceRequirements,
    educationalQualifications,
    targetDepartments: ['Computer Science & Technology (CST)'],
    description: rawText.trim(),
    applyUrl: urlMatch ? urlMatch[1] : undefined,
    confidence: title && company ? 'high' : 'medium',
    uncertainFields
  };
}

/**
 * Deterministic Captain Verification Form Parser
 */
export function parseCaptainFormFromText(rawText: string): CaptainFormExtractionData {
  const normalized = normalizeBanglaDigits(rawText);
  const uncertainFields: string[] = [];

  const nameMatch = rawText.match(/(?:Student\s*Name|Name|নাম)\s*[:\-]\s*([^\n\r|]+)/i);
  const studentName = nameMatch ? nameMatch[1].trim() : '';
  if (!studentName) uncertainFields.push('studentName');

  const rollMatch = normalized.match(/\b(?:Board\s*Roll|Roll\s*No|Roll|রোল)\s*[:\-]?\s*(\d{5,8})\b/i) || normalized.match(/\b(\d{6})\b/);
  const boardRoll = rollMatch ? rollMatch[1] : '';
  if (!boardRoll) uncertainFields.push('boardRoll');

  const regMatch = normalized.match(/\b(?:Reg(?:istration)?\s*No|Reg|রেজি)\s*[:\-]?\s*(\d{8,12})\b/i) || normalized.match(/\b(1502\d{6})\b/);
  const regNumber = regMatch ? regMatch[1] : '';

  const hasSignatureOrSeal = /Sign(?:ature)?|Endorse(?:d)?|Seal|Approved|স্বাক্ষর|সিল/i.test(rawText);

  return {
    studentName,
    boardRoll,
    regNumber,
    hasSignatureOrSeal,
    confidence: studentName && boardRoll ? 'high' : 'medium',
    uncertainFields
  };
}

/**
 * Calls Gemini 3.8 Flash Multimodal Vision to extract raw text + structured fields from an Image or Scanned PDF
 */
async function runGeminiMultimodalExtraction(params: {
  feature: DocumentScanFeature;
  base64Data: string;
  mimeType: string;
  additionalFrames?: string[];
  simulateApiFailure?: boolean;
}): Promise<{
  success: boolean;
  isReadable: boolean;
  rawText: string;
  structured?: any;
  error?: string;
  errorCode?: DocumentScanResult['errorCode'];
}> {
  if (params.simulateApiFailure) {
    return {
      success: false,
      isReadable: false,
      rawText: '',
      errorCode: 'AI_SERVICE_UNAVAILABLE',
      error: 'Document OCR service is temporarily unavailable (simulated API failure or timeout). Your uploaded file is preserved — you may retry scanning or enter fields manually.'
    };
  }

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    return {
      success: false,
      isReadable: false,
      rawText: '',
      errorCode: 'AI_SERVICE_UNAVAILABLE',
      error: 'GEMINI_API_KEY is not configured on the server for raster image OCR.'
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const parts: any[] = [
      {
        inlineData: {
          data: params.base64Data,
          mimeType: params.mimeType
        }
      }
    ];

    if (params.additionalFrames && params.additionalFrames.length > 0) {
      for (const frameUrl of params.additionalFrames.slice(0, 4)) {
        const cleanFrame = frameUrl.includes('base64,') ? frameUrl.split('base64,')[1] : frameUrl;
        parts.push({
          inlineData: {
            data: cleanFrame,
            mimeType: 'image/jpeg'
          }
        });
      }
    }

    if (params.feature === 'routine') {
      parts.push({
        text: `You are an academic document intelligence engine for Bangladesh Technical Education Board (BTEB) Polytechnic Institutes.
Analyze this uploaded class routine document (Image or PDF). Support both English and Bangla text.
CRITICAL RULES:
- Never invent or hallucinate class times, subjects, subject codes, teachers, or rooms.
- If the image is blank, blurry, or not a class routine, set isReadable = false and periods = [].
- For any field in a period that is partially cut off or unreadable, include its name in uncertainFields (e.g. ["room", "teacherName"]).`
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [{ role: 'user', parts }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isReadable: { type: Type.BOOLEAN },
              unreadableReason: { type: Type.STRING },
              rawExtractedText: { type: Type.STRING },
              college: { type: Type.STRING },
              department: { type: Type.STRING },
              semester: { type: Type.INTEGER },
              shift: { type: Type.STRING },
              section: { type: Type.STRING },
              periods: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.STRING },
                    periodNumber: { type: Type.INTEGER },
                    startTime: { type: Type.STRING },
                    endTime: { type: Type.STRING },
                    subjectCode: { type: Type.STRING },
                    subjectName: { type: Type.STRING },
                    teacherName: { type: Type.STRING },
                    room: { type: Type.STRING },
                    type: { type: Type.STRING },
                    confidence: { type: Type.STRING },
                    uncertainFields: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      return {
        success: true,
        isReadable: Boolean(parsed.isReadable !== false),
        rawText: String(parsed.rawExtractedText || ''),
        structured: parsed
      };
    }

    // General multimodal OCR + structured extraction for assignment, note, notice, job, captain_form, video
    parts.push({
      text: `Extract all visible text verbatim (preserving both Bangla বাংলা and English text, numbers, BTEB 5-digit subject codes, dates, headings, and tables) from this document.
If the image is completely unreadable, blank, or corrupted, set isReadable = false and explain why in unreadableReason.
Also extract structured fields for feature "${params.feature}". Never invent information that is not visible.`
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isReadable: { type: Type.BOOLEAN },
            unreadableReason: { type: Type.STRING },
            rawExtractedText: { type: Type.STRING },
            title: { type: Type.STRING },
            subjectCode: { type: Type.STRING },
            subjectName: { type: Type.STRING },
            semester: { type: Type.INTEGER },
            chapter: { type: Type.STRING },
            dueDate: { type: Type.STRING },
            marks: { type: Type.STRING },
            teacherName: { type: Type.STRING },
            submissionMethod: { type: Type.STRING },
            instructions: { type: Type.STRING },
            questions: { type: Type.ARRAY, items: { type: Type.STRING } },
            headings: { type: Type.ARRAY, items: { type: Type.STRING } },
            tables: { type: Type.ARRAY, items: { type: Type.STRING } },
            company: { type: Type.STRING },
            location: { type: Type.STRING },
            salary: { type: Type.STRING },
            studentName: { type: Type.STRING },
            boardRoll: { type: Type.STRING },
            regNumber: { type: Type.STRING },
            hasSignatureOrSeal: { type: Type.BOOLEAN },
            confidence: { type: Type.STRING },
            uncertainFields: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    return {
      success: true,
      isReadable: Boolean(parsed.isReadable !== false),
      rawText: String(parsed.rawExtractedText || ''),
      structured: parsed
    };
  } catch (err: any) {
    return {
      success: false,
      isReadable: false,
      rawText: '',
      errorCode: 'AI_SERVICE_UNAVAILABLE',
      error: `Document OCR service encountered an error (${err?.message || 'API error'}). You can retry or complete the fields manually.`
    };
  }
}

/**
 * Main Entry Point: Shared Document Intelligence Scanner
 */
export async function scanDocumentWithIntelligence(params: {
  feature: DocumentScanFeature;
  fileDataUrl?: string;
  fileName?: string;
  mimeType?: string;
  rawText?: string;
  videoFramesDataUrls?: string[];
  videoDurationSeconds?: number;
  pageStart?: number;
  pageEnd?: number;
  batchSize?: number;
  maxBytesOverride?: number;
  simulateApiFailure?: boolean;
  defaults?: {
    college?: string;
    department?: string;
    semester?: number;
    shift?: Shift;
    section?: Section;
  };
}): Promise<DocumentScanResult> {
  const {
    feature,
    fileDataUrl,
    fileName = '',
    mimeType = '',
    rawText,
    videoFramesDataUrls = [],
    pageStart,
    pageEnd,
    batchSize,
    maxBytesOverride,
    simulateApiFailure = false,
    defaults
  } = params;

  // Special handling if video keyframes were extracted on client
  if (feature === 'video' || (Array.isArray(videoFramesDataUrls) && videoFramesDataUrls.length > 0)) {
    if (fileDataUrl) {
      const vCheck = validateAndDecodeUploadedFile({ fileDataUrl, fileName, mimeType, maxBytesOverride });
      if (!vCheck.valid) {
        return {
          success: false,
          feature,
          fileCategory: vCheck.fileCategory,
          detectedMimeType: vCheck.detectedMimeType,
          extractionMethod: 'failed',
          isReadable: false,
          confidence: 'low',
          rawExtractedText: '',
          warnings: [],
          uncertainFields: [],
          errorCode: vCheck.errorCode,
          error: vCheck.errorMessage
        };
      }
    }

    if (videoFramesDataUrls.length === 0) {
      return {
        success: false,
        feature: 'video',
        fileCategory: 'VIDEO',
        detectedMimeType: mimeType || 'video/mp4',
        extractionMethod: 'video_keyframe_analysis',
        isReadable: false,
        confidence: 'low',
        rawExtractedText: '',
        warnings: [
          'Video files are not images. Representative keyframes must be sampled from the video player before visual text extraction.'
        ],
        uncertainFields: [],
        errorCode: 'UNREADABLE_CONTENT',
        error:
          'No representative video frames were provided for visual analysis. Use the browser video frame sampler to extract keyframes, or enter lecture details manually.',
        videoData: {
          title: fileName.replace(/\.[^.]+$/, ''),
          summary: '',
          extractedFrameTexts: [],
          analyzedFramesCount: 0,
          transcriptionSupported: Boolean((process.env.GEMINI_API_KEY || '').trim()),
          capabilityNotice:
            'DiplomaMate analyzes representative video keyframes for visible whiteboard/slide text. Full audio speech transcription requires an active Gemini multimodal session.',
          confidence: 'low'
        }
      };
    }

    // Extract text from each sampled video frame
    const frameTexts: string[] = [];
    for (let i = 0; i < Math.min(videoFramesDataUrls.length, 6); i++) {
      const frameUrl = videoFramesDataUrls[i];
      const fVal = validateAndDecodeUploadedFile({ fileDataUrl: frameUrl, fileName: `frame_${i + 1}.png` });
      if (fVal.valid) {
        const embedded = extractEmbeddedTextFromImageBuffer(fVal.buffer, fVal.detectedMimeType);
        if (embedded) {
          frameTexts.push(`[Frame ${i + 1}] ${embedded}`);
        } else if (!simulateApiFailure && process.env.GEMINI_API_KEY) {
          const gemRes = await runGeminiMultimodalExtraction({
            feature: 'note',
            base64Data: fVal.base64Clean,
            mimeType: fVal.detectedMimeType
          });
          if (gemRes.rawText) {
            frameTexts.push(`[Frame ${i + 1}] ${gemRes.rawText}`);
          }
        }
      }
    }

    const combinedFrameText = frameTexts.join('\n\n').trim();
    const noteParsed = parseNoteFromText(combinedFrameText || fileName);

    return {
      success: true,
      feature,
      fileCategory: 'VIDEO',
      detectedMimeType: mimeType || 'video/mp4',
      extractionMethod: 'video_keyframe_analysis',
      isReadable: combinedFrameText.length > 0,
      confidence: combinedFrameText.length > 20 ? 'high' : 'low',
      rawExtractedText: combinedFrameText,
      warnings:
        combinedFrameText.length === 0
          ? ['No readable slide or whiteboard text was detected in the sampled video frames.']
          : [],
      uncertainFields: noteParsed.uncertainFields,
      noteData: noteParsed,
      videoData: {
        title: noteParsed.title || fileName.replace(/\.[^.]+$/, ''),
        summary: noteParsed.summary || combinedFrameText.slice(0, 240),
        extractedFrameTexts: frameTexts,
        analyzedFramesCount: videoFramesDataUrls.length,
        transcriptionSupported: Boolean((process.env.GEMINI_API_KEY || '').trim()),
        capabilityNotice:
          'Visual slide/whiteboard text was extracted from representative keyframes sampled across the video.',
        subjectCode: noteParsed.subjectCode,
        subjectName: noteParsed.subjectName,
        chapter: noteParsed.chapter,
        confidence: combinedFrameText.length > 20 ? 'high' : 'low'
      }
    };
  }

  // Step 1: Validate & decode file
  const validation = validateAndDecodeUploadedFile({
    fileDataUrl,
    fileName,
    mimeType,
    rawText,
    maxBytesOverride
  });

  if (!validation.valid) {
    return {
      success: false,
      feature,
      fileCategory: validation.fileCategory,
      detectedMimeType: validation.detectedMimeType,
      extractionMethod: 'failed',
      isReadable: false,
      confidence: 'low',
      rawExtractedText: '',
      warnings: [],
      uncertainFields: [],
      errorCode: validation.errorCode,
      error: validation.errorMessage
    };
  }

  let extractedText = '';
  let extractionMethod: DocumentScanResult['extractionMethod'] = 'direct_text_parser';
  let isScannedPdf = false;
  let pages: ExtractedPdfPage[] = [];
  let pageCount = 1;
  let processedPages: number[] = [1];
  let geminiStructured: any = null;
  const warnings: string[] = [];

  if (validation.fileCategory === 'TEXT') {
    extractedText = validation.buffer.toString('utf-8').trim();
    extractionMethod = 'direct_text_parser';
    pages = [{ pageNumber: 1, text: extractedText, hasTable: extractedText.includes('|') }];
  } else if (validation.fileCategory === 'PDF') {
    const pdfResult = extractPdfContentInBatches(validation.buffer, {
      startPage: pageStart,
      endPage: pageEnd,
      batchSize
    });
    pageCount = pdfResult.pageCount;
    processedPages = pdfResult.processedPages;
    pages = pdfResult.pages;
    isScannedPdf = pdfResult.isScannedPdf;

    if (!isScannedPdf && pdfResult.combinedText.trim().length >= 10) {
      extractedText = pdfResult.combinedText;
      extractionMethod = 'pdf_text_layer';
    } else {
      // Scanned / image-based PDF!
      extractionMethod = 'pdf_scanned_ocr';
      if (pdfResult.embeddedOcrTextHint && !simulateApiFailure) {
        extractedText = pdfResult.embeddedOcrTextHint;
        pages = [{ pageNumber: 1, text: extractedText, hasTable: extractedText.includes('|') }];
        warnings.push('Scanned PDF detected (no selectable font layer). Extracted text via OCR layer.');
      } else {
        const gemRes = await runGeminiMultimodalExtraction({
          feature,
          base64Data: validation.base64Clean,
          mimeType: 'application/pdf',
          simulateApiFailure
        });
        if (!gemRes.success && gemRes.errorCode === 'AI_SERVICE_UNAVAILABLE') {
          return {
            success: false,
            feature,
            fileCategory: 'PDF',
            detectedMimeType: 'application/pdf',
            extractionMethod: 'pdf_scanned_ocr',
            isScannedPdf: true,
            isReadable: false,
            confidence: 'low',
            rawExtractedText: '',
            pageCount,
            processedPages,
            pages,
            warnings: ['This PDF is a scanned image document with no selectable text layer.'],
            uncertainFields: [],
            errorCode: 'AI_SERVICE_UNAVAILABLE',
            error: gemRes.error
          };
        }
        extractedText = gemRes.rawText;
        geminiStructured = gemRes.structured;
        if (extractedText) {
          pages = [{ pageNumber: 1, text: extractedText, hasTable: extractedText.includes('|') }];
        }
      }
    }
  } else if (validation.fileCategory === 'IMAGE') {
    // Check embedded OCR/text chunks first (unless simulating API failure)
    const embeddedText = !simulateApiFailure
      ? extractEmbeddedTextFromImageBuffer(validation.buffer, validation.detectedMimeType)
      : '';

    if (embeddedText && embeddedText.length >= 8) {
      extractedText = embeddedText;
      extractionMethod = 'image_embedded_text_ocr';
      pages = [{ pageNumber: 1, text: extractedText, hasTable: extractedText.includes('|') }];
    } else {
      extractionMethod = 'image_multimodal_ocr';
      const gemRes = await runGeminiMultimodalExtraction({
        feature,
        base64Data: validation.base64Clean,
        mimeType: validation.detectedMimeType,
        simulateApiFailure
      });

      if (!gemRes.success && gemRes.errorCode === 'AI_SERVICE_UNAVAILABLE') {
        return {
          success: false,
          feature,
          fileCategory: 'IMAGE',
          detectedMimeType: validation.detectedMimeType,
          extractionMethod: 'image_multimodal_ocr',
          isReadable: false,
          confidence: 'low',
          rawExtractedText: '',
          warnings: [],
          uncertainFields: [],
          errorCode: 'AI_SERVICE_UNAVAILABLE',
          error: gemRes.error
        };
      }

      extractedText = gemRes.rawText;
      geminiStructured = gemRes.structured;
      if (extractedText) {
        pages = [{ pageNumber: 1, text: extractedText, hasTable: extractedText.includes('|') }];
      }
    }
  }

  // Check if content is unreadable or empty
  const cleanText = String(extractedText || '').trim();
  const hasGeminiPeriods =
    geminiStructured && Array.isArray(geminiStructured.periods) && geminiStructured.periods.length > 0;

  if (
    (!cleanText || cleanText.length < 4 || /^UNREADABLE|^BLURRY|^BLANK/i.test(cleanText)) &&
    !hasGeminiPeriods
  ) {
    return {
      success: false,
      feature,
      fileCategory: validation.fileCategory,
      detectedMimeType: validation.detectedMimeType,
      extractionMethod,
      isScannedPdf,
      isReadable: false,
      confidence: 'low',
      rawExtractedText: cleanText,
      pageCount,
      processedPages,
      pages,
      warnings: [
        'The uploaded document appears blurry, blank, or contains no recognizable text. No fields were fabricated.'
      ],
      uncertainFields: [],
      errorCode: 'UNREADABLE_CONTENT',
      error:
        geminiStructured?.unreadableReason ||
        'Could not extract readable text from this file. Please upload a clearer scan or fill in the details manually.'
    };
  }

  // Step 2: Run Feature-Specific Structured Parser & Validation
  const result: DocumentScanResult = {
    success: true,
    feature,
    fileCategory: validation.fileCategory,
    detectedMimeType: validation.detectedMimeType,
    extractionMethod,
    isScannedPdf,
    isReadable: true,
    confidence: 'high',
    rawExtractedText: cleanText,
    pageCount,
    processedPages,
    pages,
    warnings,
    uncertainFields: []
  };

  if (feature === 'routine') {
    const routineData = parseRoutineFromText(cleanText, defaults);
    if (hasGeminiPeriods && routineData.periods.length === 0) {
      routineData.periods = geminiStructured.periods.map((p: any, idx: number) => ({
        id: `ocr_rt_${Date.now()}_${idx}`,
        day: (['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].includes(p.day)
          ? p.day
          : 'Saturday') as WeekDay,
        periodNumber: Number(p.periodNumber) || idx + 1,
        startTime: String(p.startTime || 'TBA'),
        endTime: String(p.endTime || 'TBA'),
        subjectCode: String(p.subjectCode || ''),
        subjectName: String(
          p.subjectName ||
            (p.subjectCode ? resolveBtebSubjectCode(String(p.subjectCode))?.name : '') ||
            'Verify Subject'
        ),
        teacherName: String(p.teacherName || 'Verify Instructor'),
        room: String(p.room || 'Verify Room'),
        type: p.type === 'Practical / Lab' ? 'Practical / Lab' : 'Theory',
        shift: (geminiStructured.shift === 'Day' ? 'Day' : defaults?.shift || 'Morning') as Shift,
        section: (['A1', 'A2', 'B1', 'B2'].includes(geminiStructured.section)
          ? geminiStructured.section
          : defaults?.section || 'A1') as Section,
        confidence: (p.confidence === 'low' || p.confidence === 'medium' ? p.confidence : 'high') as
          | 'high'
          | 'medium'
          | 'low',
        uncertainFields: Array.isArray(p.uncertainFields) ? p.uncertainFields : []
      }));
    }

    if (routineData.periods.length === 0) {
      return {
        ...result,
        success: false,
        isReadable: false,
        confidence: 'low',
        errorCode: 'UNREADABLE_CONTENT',
        error:
          'No valid class periods, subject codes, or schedule times could be identified in this document. Please check that the routine table is clearly visible or add periods manually.',
        routineData
      };
    }

    const anyLowConfidence = routineData.periods.some(p => (p.uncertainFields?.length || 0) > 0);
    result.confidence = anyLowConfidence ? 'medium' : 'high';
    result.uncertainFields = Array.from(
      new Set([
        ...routineData.uncertainFields,
        ...routineData.periods.flatMap(p => p.uncertainFields || [])
      ])
    );
    if (anyLowConfidence) {
      result.warnings.push(
        'Some routine fields (such as room numbers, teacher initials, or times) were partially unclear and are highlighted for your review before publishing.'
      );
    }
    result.routineData = routineData;
  } else if (feature === 'assignment') {
    const asgData = parseAssignmentFromText(cleanText, processedPages);
    if (geminiStructured) {
      if (!asgData.title && geminiStructured.title) asgData.title = geminiStructured.title;
      if (!asgData.subjectCode && geminiStructured.subjectCode) asgData.subjectCode = geminiStructured.subjectCode;
      if (!asgData.subjectName && geminiStructured.subjectName) asgData.subjectName = geminiStructured.subjectName;
      if (!asgData.dueDate && geminiStructured.dueDate) asgData.dueDate = geminiStructured.dueDate;
      if (!asgData.marks && geminiStructured.marks) asgData.marks = geminiStructured.marks;
      if (!asgData.teacherName && geminiStructured.teacherName) asgData.teacherName = geminiStructured.teacherName;
      if (asgData.questions.length === 0 && Array.isArray(geminiStructured.questions)) {
        asgData.questions = geminiStructured.questions;
      }
    }
    result.confidence = asgData.confidence;
    result.uncertainFields = asgData.uncertainFields;
    result.assignmentData = asgData;
  } else if (feature === 'note') {
    const noteData = parseNoteFromText(cleanText, pages);
    if (geminiStructured) {
      if (!noteData.title && geminiStructured.title) noteData.title = geminiStructured.title;
      if (!noteData.subjectCode && geminiStructured.subjectCode) noteData.subjectCode = geminiStructured.subjectCode;
      if (!noteData.subjectName && geminiStructured.subjectName) noteData.subjectName = geminiStructured.subjectName;
      if (geminiStructured.chapter) noteData.chapter = geminiStructured.chapter;
    }
    result.confidence = noteData.confidence;
    result.uncertainFields = noteData.uncertainFields;
    result.noteData = noteData;
  } else if (feature === 'notice') {
    const noticeData = parseNoticeFromText(cleanText);
    result.confidence = noticeData.confidence;
    result.uncertainFields = noticeData.uncertainFields;
    result.noticeData = noticeData;
  } else if (feature === 'job') {
    const jobData = parseJobFromText(cleanText);
    result.confidence = jobData.confidence;
    result.uncertainFields = jobData.uncertainFields;
    result.jobData = jobData;
  } else if (feature === 'captain_form') {
    const capData = parseCaptainFormFromText(cleanText);
    result.confidence = capData.confidence;
    result.uncertainFields = capData.uncertainFields;
    result.captainFormData = capData;
  }

  return result;
}
