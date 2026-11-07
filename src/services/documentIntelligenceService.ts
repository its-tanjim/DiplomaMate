import { apiFetch } from './apiClient';
import type {
  DocumentScanFeature,
  DocumentScanResult,
  Shift,
  Section
} from '../types';

export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
export const ALLOWED_PDF_EXTENSIONS = ['.pdf'];
export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov'];

export const MAX_CLIENT_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_CLIENT_PDF_BYTES = 25 * 1024 * 1024;   // 25 MB
export const MAX_CLIENT_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB

export interface PreparedUploadFile {
  valid: boolean;
  fileName: string;
  fileSizeFormatted: string;
  fileSizeBytes: number;
  mimeType: string;
  fileCategory: 'IMAGE' | 'PDF' | 'VIDEO';
  dataUrl: string;
  videoFramesDataUrls?: string[];
  videoDurationSeconds?: number;
  sourceUriType: 'web_file' | 'android_content_uri' | 'android_file_uri' | 'camera_capture';
  error?: string;
  errorCode?: DocumentScanResult['errorCode'];
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Validates and normalizes an Android content:// URI, file:// path, or browser File object
 */
export function detectAndroidOrWebUriSource(fileOrPath: File | { name: string; uri?: string }): 'web_file' | 'android_content_uri' | 'android_file_uri' | 'camera_capture' {
  const anyFile = fileOrPath as any;
  const uri = String(anyFile?.uri || anyFile?.webkitRelativePath || '');
  if (uri.startsWith('content://')) return 'android_content_uri';
  if (uri.startsWith('file://')) return 'android_file_uri';
  if (/^image_\d+|camera|capture/i.test(fileOrPath.name)) return 'camera_capture';
  return 'web_file';
}

/**
 * Extracts representative keyframes at intervals from a video File using HTML5 <video> + <canvas>
 */
export async function extractRepresentativeVideoKeyframes(
  file: File,
  maxFrames = 4
): Promise<{ frames: string[]; durationSeconds: number }> {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return { frames: [], durationSeconds: 0 };
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    const cleanup = () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        // ignore
      }
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      resolve({ frames: [], durationSeconds: 0 });
    }, 8000);

    video.onloadedmetadata = async () => {
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 4;
      const sampleRatios = [0.15, 0.4, 0.65, 0.85].slice(0, maxFrames);
      const frames: string[] = [];

      const canvas = document.createElement('canvas');
      const targetWidth = Math.min(960, video.videoWidth || 640);
      const targetHeight = Math.min(540, video.videoHeight || 360);
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      for (const ratio of sampleRatios) {
        const targetTime = Math.min(Math.max(0.1, duration * ratio), Math.max(0.1, duration - 0.1));
        const frameData = await new Promise<string | null>((frameResolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            try {
              if (ctx) {
                ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
                frameResolve(canvas.toDataURL('image/jpeg', 0.82));
              } else {
                frameResolve(null);
              }
            } catch {
              frameResolve(null);
            }
          };
          video.addEventListener('seeked', onSeeked);
          try {
            video.currentTime = targetTime;
          } catch {
            video.removeEventListener('seeked', onSeeked);
            frameResolve(null);
          }
        });
        if (frameData) frames.push(frameData);
      }

      clearTimeout(timeoutId);
      cleanup();
      resolve({ frames, durationSeconds: Math.round(duration) });
    };

    video.onerror = () => {
      clearTimeout(timeoutId);
      cleanup();
      resolve({ frames: [], durationSeconds: 0 });
    };
  });
}

/**
 * Normalizes image orientation and compresses overly large camera photos on client while keeping text crisp
 */
async function preprocessImageIfNeeded(file: File, rawDataUrl: string): Promise<string> {
  // Keep images under 1.8 MB untouched so lossless PNGs and embedded metadata are preserved verbatim
  if (file.size <= 1.8 * 1024 * 1024 || typeof document === 'undefined') {
    return rawDataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxDim = 2000;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      } catch {
        resolve(rawDataUrl);
      }
    };
    img.onerror = () => resolve(rawDataUrl);
    img.src = rawDataUrl;
  });
}

/**
 * Reads, validates, and preprocesses a selected File (Image, PDF, or Video) for upload and scanning
 */
export async function prepareFileForDocumentIntelligence(
  file: File,
  options?: {
    allowVideo?: boolean;
    onProgress?: (stage: string) => void;
  }
): Promise<PreparedUploadFile> {
  const onProgress = options?.onProgress || (() => {});
  onProgress('Validating file format and size...');

  const fileName = file.name || 'uploaded_document';
  const lowerName = fileName.toLowerCase();
  const mime = (file.type || '').toLowerCase();
  const sourceUriType = detectAndroidOrWebUriSource(file);

  const isPdf = mime === 'application/pdf' || lowerName.endsWith('.pdf');
  const isImage =
    mime.startsWith('image/') ||
    ALLOWED_IMAGE_EXTENSIONS.some(ext => lowerName.endsWith(ext));
  const isVideo =
    mime.startsWith('video/') ||
    ALLOWED_VIDEO_EXTENSIONS.some(ext => lowerName.endsWith(ext));

  if (!isPdf && !isImage && !(options?.allowVideo && isVideo)) {
    return {
      valid: false,
      fileName,
      fileSizeFormatted: formatFileSize(file.size),
      fileSizeBytes: file.size,
      mimeType: mime || 'application/octet-stream',
      fileCategory: 'IMAGE',
      dataUrl: '',
      sourceUriType,
      errorCode: 'UNSUPPORTED_FILE_TYPE',
      error: options?.allowVideo
        ? `Unsupported file format (${fileName}). Please select a JPEG, PNG, WebP image, a PDF document, or an MP4/WebM video.`
        : `Unsupported file format (${fileName}). Please select a JPEG, PNG, WebP image, or a PDF document.`
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      fileName,
      fileSizeFormatted: '0 B',
      fileSizeBytes: 0,
      mimeType: mime,
      fileCategory: isPdf ? 'PDF' : isVideo ? 'VIDEO' : 'IMAGE',
      dataUrl: '',
      sourceUriType,
      errorCode: 'EMPTY_FILE',
      error: 'The selected file is empty (0 bytes). Please choose a valid document.'
    };
  }

  const fileCategory: 'IMAGE' | 'PDF' | 'VIDEO' = isPdf ? 'PDF' : isVideo ? 'VIDEO' : 'IMAGE';
  const maxBytes =
    fileCategory === 'PDF'
      ? MAX_CLIENT_PDF_BYTES
      : fileCategory === 'VIDEO'
        ? MAX_CLIENT_VIDEO_BYTES
        : MAX_CLIENT_IMAGE_BYTES;

  if (file.size > maxBytes) {
    return {
      valid: false,
      fileName,
      fileSizeFormatted: formatFileSize(file.size),
      fileSizeBytes: file.size,
      mimeType: mime,
      fileCategory,
      dataUrl: '',
      sourceUriType,
      errorCode: 'FILE_TOO_LARGE',
      error: `${fileName} (${formatFileSize(file.size)}) exceeds the maximum size limit of ${formatFileSize(maxBytes)} for ${fileCategory} files.`
    };
  }

  onProgress('Reading file into memory...');
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read selected file from device storage.'));
    reader.readAsDataURL(file);
  }).catch(() => '');

  if (!rawDataUrl) {
    return {
      valid: false,
      fileName,
      fileSizeFormatted: formatFileSize(file.size),
      fileSizeBytes: file.size,
      mimeType: mime,
      fileCategory,
      dataUrl: '',
      sourceUriType,
      errorCode: 'CORRUPTED_FILE',
      error: 'Could not read the selected file. Please check Android storage permissions or select another file.'
    };
  }

  let finalDataUrl = rawDataUrl;
  let videoFramesDataUrls: string[] | undefined;
  let videoDurationSeconds: number | undefined;

  if (fileCategory === 'IMAGE') {
    onProgress('Optimizing image orientation & readability...');
    finalDataUrl = await preprocessImageIfNeeded(file, rawDataUrl);
  } else if (fileCategory === 'VIDEO') {
    onProgress('Sampling representative keyframes from video...');
    const frameResult = await extractRepresentativeVideoKeyframes(file, 4);
    videoFramesDataUrls = frameResult.frames;
    videoDurationSeconds = frameResult.durationSeconds;
  }

  return {
    valid: true,
    fileName,
    fileSizeFormatted: formatFileSize(file.size),
    fileSizeBytes: file.size,
    mimeType:
      mime ||
      (fileCategory === 'PDF'
        ? 'application/pdf'
        : fileCategory === 'VIDEO'
          ? 'video/mp4'
          : 'image/png'),
    fileCategory,
    dataUrl: finalDataUrl,
    videoFramesDataUrls,
    videoDurationSeconds,
    sourceUriType
  };
}

/**
 * Calls the shared backend `/api/documents/scan` endpoint and returns structured extraction results
 */
export async function scanDocumentOnServer(params: {
  feature: DocumentScanFeature;
  fileDataUrl?: string;
  fileName?: string;
  mimeType?: string;
  rawText?: string;
  videoFramesDataUrls?: string[];
  videoDurationSeconds?: number;
  pageStart?: number;
  pageEnd?: number;
  defaults?: {
    college?: string;
    department?: string;
    semester?: number;
    shift?: Shift;
    section?: Section;
  };
  authToken?: string | null;
  onProgress?: (stage: string) => void;
}): Promise<DocumentScanResult> {
  const onProgress = params.onProgress || (() => {});
  onProgress(
    params.mimeType === 'application/pdf'
      ? 'Extracting PDF text & running OCR on pages...'
      : params.videoFramesDataUrls?.length
        ? 'Analyzing sampled video keyframes...'
        : 'Scanning document & extracting structured fields...'
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (params.authToken) {
      headers['Authorization'] = `Bearer ${params.authToken}`;
    }

    const res = await apiFetch('/api/documents/scan', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        feature: params.feature,
        fileDataUrl: params.fileDataUrl,
        fileName: params.fileName,
        mimeType: params.mimeType,
        rawText: params.rawText,
        videoFramesDataUrls: params.videoFramesDataUrls,
        videoDurationSeconds: params.videoDurationSeconds,
        pageStart: params.pageStart,
        pageEnd: params.pageEnd,
        defaults: params.defaults
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const data = (await res.json()) as DocumentScanResult;
    return data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    const isTimeout = err?.name === 'AbortError';
    return {
      success: false,
      feature: params.feature,
      fileCategory: params.mimeType === 'application/pdf' ? 'PDF' : 'IMAGE',
      detectedMimeType: params.mimeType || 'application/octet-stream',
      extractionMethod: 'failed',
      isReadable: false,
      confidence: 'low',
      rawExtractedText: '',
      warnings: [],
      uncertainFields: [],
      errorCode: 'AI_SERVICE_UNAVAILABLE',
      error: isTimeout
        ? 'Document scanning timed out. You can click Retry Scan or enter the details manually while keeping your file attached.'
        : 'Network error while communicating with the document scanning server. Please retry or fill in the fields manually.'
    };
  }
}
