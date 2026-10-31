import zlib from 'zlib';
import {
  validateAndDecodeUploadedFile,
  extractPdfContentInBatches,
  scanDocumentWithIntelligence
} from '../src/services/serverDocumentIntelligence';
import { detectAndroidOrWebUriSource } from '../src/services/documentIntelligenceService';

const BASE_URL = 'http://localhost:3000';

/**
 * Helper: Build a valid PNG binary buffer with an embedded `tEXt` chunk containing OCR text.
 */
function createPngWithEmbeddedText(ocrText: string): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const makeChunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4);
    return Buffer.concat([len, typeBuf, data, crc]);
  };

  // Minimal 1x1 RGB IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(1, 0);
  ihdrData.writeUInt32BE(1, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  const ihdr = makeChunk('IHDR', ihdrData);

  // tEXt chunk: keyword "OCRText\0" + UTF-8 text
  const textPayload = Buffer.concat([
    Buffer.from('OCRText\0', 'utf8'),
    Buffer.from(ocrText, 'utf8')
  ]);
  const textChunk = makeChunk('tEXt', textPayload);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, textChunk, iend]);
}

/**
 * Helper: Build a valid JPEG binary buffer with a `COM` (0xFF 0xFE) comment segment containing OCR text.
 */
function createJpegWithCommentText(ocrText: string): Buffer {
  const soi = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00
  ]);
  const textBuf = Buffer.from(ocrText, 'utf8');
  const comHeader = Buffer.alloc(4);
  comHeader[0] = 0xff;
  comHeader[1] = 0xfe;
  comHeader.writeUInt16BE(textBuf.length + 2, 2);
  const eoi = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([soi, comHeader, textBuf, eoi]);
}

/**
 * Helper: Build a multi-page or single-page PDF buffer with FlateDecode or raw Tj streams.
 */
function createPdfBuffer(pagesText: string[], useFlate = true, scannedImageOnly = false): Buffer {
  const parts: string[] = ['%PDF-1.7\n'];
  let objId = 1;

  for (let i = 0; i < pagesText.length; i++) {
    parts.push(`${objId++} 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n`);
    if (scannedImageOnly) {
      parts.push(
        `${objId++} 0 obj\n<< /Type /XObject /Subtype /Image /Width 1200 /Height 1600 >>\nstream\nBINARY_SCAN_DATA\nendstream\nendobj\n`
      );
    } else {
      const lines = pagesText[i]
        .split('\n')
        .map(line => {
          const hasNonAscii = /[^\x20-\x7E]/.test(line);
          if (hasNonAscii) {
            const utf16be = Buffer.alloc(2 + line.length * 2);
            utf16be[0] = 0xfe;
            utf16be[1] = 0xff;
            for (let c = 0; c < line.length; c++) {
              utf16be.writeUInt16BE(line.charCodeAt(c), 2 + c * 2);
            }
            return `<${utf16be.toString('hex').toUpperCase()}> Tj`;
          }
          const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
          return `(${escaped}) Tj`;
        })
        .join('\nT*\n');

      const contentStream = `BT\n/F1 11 Tf\n${lines}\nET`;
      if (useFlate) {
        const compressed = zlib.deflateSync(Buffer.from(contentStream, 'latin1'));
        const header = `${objId++} 0 obj\n<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`;
        const footer = `\nendstream\nendobj\n`;
        parts.push(header + compressed.toString('latin1') + footer);
      } else {
        parts.push(
          `${objId++} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`
        );
      }
    }
  }

  parts.push('%%EOF\n');
  return Buffer.from(parts.join(''), 'latin1');
}

async function runTests() {
  console.log('================================================================');
  console.log('DIPLOMAMATE DOCUMENT INTELLIGENCE TEST SUITE (14 SCENARIOS)');
  console.log('================================================================\n');

  let passed = 0;
  const assert = (condition: boolean, label: string, detail?: string) => {
    if (!condition) {
      console.error(`❌ FAILED: ${label}${detail ? ` — ${detail}` : ''}`);
      process.exit(1);
    }
    passed++;
    console.log(`✅ PASSED [${passed}/14]: ${label}${detail ? ` (${detail})` : ''}`);
  };

  // ---------------------------------------------------------------------------
  // 1. Routine image upload and extraction
  // ---------------------------------------------------------------------------
  const routineImageText = [
    'Dhaka Polytechnic Institute',
    'Computer Science & Technology (CST) - 6th Semester - Morning Shift - Section A1',
    'Sunday 09:00 AM - 09:45 AM 66661 Principle of Software Engineering Engr. Tareq Room 302',
    'Monday 10:30 AM - 11:15 AM 66662 Microprocessor & Interfacing Engr. Salma Lab 204',
    'Tuesday 11:15 AM - 12:00 PM 66664 Database Management System Engr. Mahbub Room 305'
  ].join('\n');
  const routinePngBuf = createPngWithEmbeddedText(routineImageText);
  const routinePngDataUrl = `data:image/png;base64,${routinePngBuf.toString('base64')}`;

  const res1 = await fetch(`${BASE_URL}/api/routine/ocr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: 'cst_routine_sem6.png',
      mimeType: 'image/png',
      fileDataUrl: routinePngDataUrl,
      department: 'Computer Science & Technology (CST)',
      semester: 6,
      shift: 'Morning',
      section: 'A1'
    })
  });
  const data1 = await res1.json();
  assert(
    res1.ok && data1.success && Array.isArray(data1.periods) && data1.periods.length >= 3,
    '1. Routine image upload and extraction',
    `Extracted ${data1.periods?.length} routine periods`
  );

  // ---------------------------------------------------------------------------
  // 2. Routine PDF (text-based) upload and extraction
  // ---------------------------------------------------------------------------
  const routinePdfBuf = createPdfBuffer([
    [
      'Dhaka Polytechnic Institute',
      '6th Semester Routine - Morning Shift - Section A1',
      'Wednesday 09:00 AM - 09:45 AM 66663 Microcontroller Application Lab 401',
      'Thursday 09:45 AM - 10:30 AM 65852 Industrial Management Room 205'
    ].join('\n')
  ]);
  const routinePdfDataUrl = `data:application/pdf;base64,${routinePdfBuf.toString('base64')}`;
  const res2 = await fetch(`${BASE_URL}/api/documents/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      feature: 'routine',
      fileName: 'official_routine.pdf',
      mimeType: 'application/pdf',
      fileDataUrl: routinePdfDataUrl
    })
  });
  const data2 = await res2.json();
  assert(
    res2.ok && data2.success && (data2.routineData?.periods?.length ?? 0) >= 2,
    '2. Routine PDF (text-based) upload and extraction',
    `Extracted ${data2.routineData?.periods?.length} periods from FlateDecode PDF`
  );

  // ---------------------------------------------------------------------------
  // 3. Routine PDF (scanned) upload and extraction
  // ---------------------------------------------------------------------------
  const scannedRoutinePdfBuf = createPdfBuffer([''], true, true);
  const scannedRoutineDataUrl = `data:application/pdf;base64,${scannedRoutinePdfBuf.toString('base64')}`;
  const res3 = await scanDocumentWithIntelligence({
    feature: 'routine',
    fileName: 'scanned_routine_camscanner.pdf',
    mimeType: 'application/pdf',
    fileDataUrl: scannedRoutineDataUrl
  });
  assert(
    res3.isScannedPdf === true && (res3.routineData?.periods?.length ?? 0) === 0,
    '3. Routine PDF (scanned) upload and extraction (detects image-only PDF & never fabricates periods)'
  );

  // ---------------------------------------------------------------------------
  // 4. Assignment image upload and extraction
  // ---------------------------------------------------------------------------
  const assignmentJpegBuf = createJpegWithCommentText(
    [
      'Assignment 03: Normalization & SQL Triggers',
      'Subject Code: 66664 - Database Management System',
      '6th Semester | Marks: 20 | Due Date: 2026-11-25',
      'Instructor: Engr. Mahbubur Rahman',
      'Submission Method: Upload PDF on DiplomaMate Portal',
      '1. Explain 1NF, 2NF, and 3NF with practical relational schema examples.',
      '2. Write an SQL BEFORE INSERT trigger to validate student board roll length.'
    ].join('\n')
  );
  const res4 = await fetch(`${BASE_URL}/api/documents/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      feature: 'assignment',
      fileName: 'dbms_assignment_3.jpg',
      mimeType: 'image/jpeg',
      fileDataUrl: `data:image/jpeg;base64,${assignmentJpegBuf.toString('base64')}`
    })
  });
  const data4 = await res4.json();
  assert(
    res4.ok &&
      data4.success &&
      data4.assignmentData?.subjectCode === '66664' &&
      (data4.assignmentData?.questions?.length ?? 0) >= 2 &&
      Boolean(data4.assignmentData?.marks),
    '4. Assignment image upload and extraction',
    `Title="${data4.assignmentData?.title}", Questions=${data4.assignmentData?.questions?.length}`
  );

  // ---------------------------------------------------------------------------
  // 5. Multi-page assignment PDF upload and extraction
  // ---------------------------------------------------------------------------
  const multiPageAsgPdf = createPdfBuffer([
    'Assignment Sheet: Microprocessor Lab Questions\nSubject Code: 66662\nDue Date: 2026-12-01\nMarks: 25\n1. Draw the internal architecture of 8086 microprocessor.',
    '2. Explain memory segmentation and physical address calculation in 8086.\n3. Write an assembly program to find the largest number in an array.'
  ]);
  const res5 = await fetch(`${BASE_URL}/api/documents/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      feature: 'assignment',
      fileName: 'multipage_assignment.pdf',
      mimeType: 'application/pdf',
      fileDataUrl: `data:application/pdf;base64,${multiPageAsgPdf.toString('base64')}`
    })
  });
  const data5 = await res5.json();
  assert(
    res5.ok &&
      data5.success &&
      data5.pageCount === 2 &&
      (data5.assignmentData?.questions?.length ?? 0) >= 3 &&
      data5.assignmentData?.pageNumbers?.length === 2,
    '5. Multi-page assignment PDF upload and extraction',
    `Pages=${data5.pageCount}, Questions=${data5.assignmentData?.questions?.length}`
  );

  // ---------------------------------------------------------------------------
  // 6. Notes PDF with selectable text (plus searchable text preservation)
  // ---------------------------------------------------------------------------
  const notesPdfBuf = createPdfBuffer([
    [
      'Chapter 4: 8086 Microprocessor Pin Configuration & Interrupts',
      'Subject Code: 66662 Microprocessor & Interfacing',
      '1. Minimum Mode vs Maximum Mode Operation',
      'Pin   | Signal | Direction',
      'AD0   | Address/Data | Bidirectional',
      'INTR  | Interrupt Request | Input'
    ].join('\n')
  ]);
  const res6 = await fetch(`${BASE_URL}/api/documents/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      feature: 'note',
      fileName: 'ch4_8086_notes.pdf',
      mimeType: 'application/pdf',
      fileDataUrl: `data:application/pdf;base64,${notesPdfBuf.toString('base64')}`
    })
  });
  const data6 = await res6.json();
  assert(
    res6.ok &&
      data6.success &&
      Boolean(data6.noteData?.extractedText?.includes('Interrupt')) &&
      (data6.noteData?.tables?.length ?? 0) >= 1,
    '6. Notes PDF with selectable text (headings, tables & searchable text extracted)'
  );

  // ---------------------------------------------------------------------------
  // 7. Scanned notes PDF requiring OCR
  // ---------------------------------------------------------------------------
  const scannedNotesPdf = createPdfBuffer(['', ''], true, true);
  const pdfBatchResult = extractPdfContentInBatches(scannedNotesPdf);
  assert(
    pdfBatchResult.isScannedPdf === true && pdfBatchResult.pageCount === 2,
    '7. Scanned notes PDF requiring OCR (detected 2 scanned pages without selectable text)'
  );

  // ---------------------------------------------------------------------------
  // 8. Corrupted or unsupported file upload
  // ---------------------------------------------------------------------------
  const corruptedPdfDataUrl = `data:application/pdf;base64,${Buffer.from('NOT_A_REAL_PDF_HEADER_12345').toString('base64')}`;
  const res8 = await fetch(`${BASE_URL}/api/documents/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      feature: 'routine',
      fileName: 'corrupted_file.pdf',
      mimeType: 'application/pdf',
      fileDataUrl: corruptedPdfDataUrl
    })
  });
  const data8 = await res8.json();
  assert(
    res8.status >= 400 &&
      data8.success === false &&
      /corrupted|invalid|unsupported/i.test(data8.error || data8.warnings?.[0] || ''),
    '8. Corrupted or unsupported file upload rejected with clear error'
  );

  // ---------------------------------------------------------------------------
  // 9. Oversized file upload
  // ---------------------------------------------------------------------------
  const oversizedBuffer = Buffer.alloc(16 * 1024 * 1024, 0x41); // 16MB image > 15MB limit
  oversizedBuffer[0] = 0xff;
  oversizedBuffer[1] = 0xd8;
  oversizedBuffer[2] = 0xff;
  const oversizedValidation = validateAndDecodeUploadedFile({
    fileName: 'huge_camera_photo.jpg',
    mimeType: 'image/jpeg',
    fileDataUrl: `data:image/jpeg;base64,${oversizedBuffer.toString('base64')}`
  });
  assert(
    oversizedValidation.valid === false &&
      oversizedValidation.errorCode === 'FILE_TOO_LARGE' &&
      /exceeds the maximum/i.test(oversizedValidation.errorMessage || ''),
    '9. Oversized file upload rejected cleanly before processing'
  );

  // ---------------------------------------------------------------------------
  // 10. File with unclear or missing text
  // ---------------------------------------------------------------------------
  const blankPngBuf = createPngWithEmbeddedText('   ');
  const res10 = await scanDocumentWithIntelligence({
    feature: 'routine',
    fileName: 'blurry_blank_photo.png',
    mimeType: 'image/png',
    fileDataUrl: `data:image/png;base64,${blankPngBuf.toString('base64')}`
  });
  assert(
    res10.confidence === 'low' && (res10.routineData?.periods.length ?? 0) === 0,
    '10. File with unclear or missing text returns low confidence & zero fabricated fields'
  );

  // ---------------------------------------------------------------------------
  // 11. Bangla text extraction
  // ---------------------------------------------------------------------------
  const banglaPngBuf = createPngWithEmbeddedText(
    [
      'ঢাকা পলিটেকনিক ইনস্টিটিউট',
      'কম্পিউটার সায়েন্স অ্যান্ড টেকনোলজি - ৬ষ্ঠ পর্ব - ১ম শিফট',
      'রবিবার 09:00 AM - 09:45 AM ৬৬৬৬১ সফটওয়্যার ইঞ্জিনিয়ারিং কক্ষ ৩০২',
      'সোমবার 10:30 AM - 11:15 AM ৬৬৬৬৪ ডেটাবেজ ম্যানেজমেন্ট সিস্টেম কক্ষ ৩০৫'
    ].join('\n')
  );
  const res11 = await scanDocumentWithIntelligence({
    feature: 'routine',
    fileName: 'bangla_routine.png',
    mimeType: 'image/png',
    fileDataUrl: `data:image/png;base64,${banglaPngBuf.toString('base64')}`
  });
  assert(
    res11.success &&
      res11.routineData?.semester === 6 &&
      res11.routineData?.shift === 'Morning' &&
      (res11.routineData?.periods.length ?? 0) >= 2 &&
      res11.routineData?.periods[0]?.subjectCode === '66661',
    '11. Bangla text & Bangla digit extraction (৬ষ্ঠ পর্ব, ৬৬৬৬১ -> 66661, রবিবার/সোমবার)'
  );

  // ---------------------------------------------------------------------------
  // 12. English text extraction (Job Circular & Captain Verification Form)
  // ---------------------------------------------------------------------------
  const jobPngBuf = createPngWithEmbeddedText(
    [
      'Position: Sub-Assistant Engineer (Electrical & Automation)',
      'Company: Walton Hi-Tech Industries PLC',
      'Location: Gazipur, Bangladesh',
      'Salary: BDT 25,000 - 30,000 / month',
      'Deadline: 2026-12-15',
      'Qualification: 4-Year Diploma in Engineering in Electrical Technology',
      'Apply at: https://waltonbd.com/careers/apply'
    ].join('\n')
  );
  const res12 = await scanDocumentWithIntelligence({
    feature: 'job',
    fileName: 'walton_job_circular.png',
    mimeType: 'image/png',
    fileDataUrl: `data:image/png;base64,${jobPngBuf.toString('base64')}`
  });
  assert(
    res12.success &&
      Boolean(res12.jobData?.title?.includes('Sub-Assistant Engineer')) &&
      Boolean(res12.jobData?.company?.includes('Walton')) &&
      res12.jobData?.applyUrl === 'https://waltonbd.com/careers/apply',
    '12. English text extraction (Job Circular structured fields)'
  );

  // ---------------------------------------------------------------------------
  // 13. API failure or timeout handling
  // ---------------------------------------------------------------------------
  const res13 = await fetch(`${BASE_URL}/api/documents/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      feature: 'assignment',
      fileName: 'test_failure.png',
      mimeType: 'image/png',
      fileDataUrl: routinePngDataUrl,
      simulateApiFailure: true
    })
  });
  const data13 = await res13.json();
  assert(
    res13.status === 503 &&
      data13.success === false &&
      /temporarily unavailable|retry/i.test(data13.error || ''),
    '13. API failure or timeout handling returns 503 with actionable retry message'
  );

  // ---------------------------------------------------------------------------
  // 14. Android file picker / content URI & video keyframe handling
  // ---------------------------------------------------------------------------
  const androidContentUriType = detectAndroidOrWebUriSource({
    name: 'image_1042.jpg',
    uri: 'content://com.android.providers.media.documents/document/image%3A1042'
  });
  const androidFileUriType = detectAndroidOrWebUriSource({
    name: 'routine_2026.pdf',
    uri: 'file:///storage/emulated/0/Download/routine_2026.pdf'
  });
  const keyframePng = createPngWithEmbeddedText('Chapter 5: Interrupt Controller 8259A Block Diagram');
  const res14 = await fetch(`${BASE_URL}/api/documents/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      feature: 'note',
      fileName: 'lecture_8259a.mp4',
      mimeType: 'video/mp4',
      videoDurationSeconds: 45,
      videoFramesDataUrls: [`data:image/png;base64,${keyframePng.toString('base64')}`]
    })
  });
  const data14 = await res14.json();
  assert(
    androidContentUriType === 'android_content_uri' &&
      androidFileUriType === 'android_file_uri' &&
      res14.ok &&
      data14.fileCategory === 'VIDEO' &&
      Boolean(data14.videoData?.capabilityNotice),
    '14. Android content:// and file:// URI handling + Video keyframe extraction'
  );

  console.log('\n================================================================');
  console.log('ALL 14 DOCUMENT INTELLIGENCE TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
