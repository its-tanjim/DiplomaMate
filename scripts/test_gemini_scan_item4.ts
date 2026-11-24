/**
 * Item 4 — Gemini document scan / data extraction tests.
 *
 * Run:  npx tsx scripts/test_gemini_scan_item4.ts
 *
 * Covers, without any real Gemini key:
 *  (a) scan endpoint path with NO key set -> clean 503-style
 *      AI_SERVICE_UNAVAILABLE error naming GEMINI_API_KEY, no crash.
 *  (b) same path with a random invalid key -> the Gemini API error is
 *      handled gracefully (401/400/network), still no crash, no fake data.
 *      The "key" is random hex generated at runtime — it is not a real key
 *      and no key value of any kind is stored in this file or the repo.
 *  (c) existing non-AI fallbacks still work with no key: pasted routine
 *      text (deterministic parser) and images with embedded text.
 * Plus: server-side validation of Gemini JSON for routine / roster /
 * BTEB result gazette — every failure names the missing/invalid field.
 *
 * No real key is written to any file; the random invalid key lives only in
 * this process's environment for test (b) and is deleted afterwards.
 */
import { randomBytes } from 'crypto';
import { scanDocumentWithIntelligence } from '../src/services/serverDocumentIntelligence';
import {
  formatValidationErrors,
  serializeBtebEntriesToText,
  validateGeneralJson,
  validateResultJson,
  validateRosterJson,
  validateRoutineJson
} from '../src/services/geminiClient';

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) {
    passed++;
    console.log(`  PASS ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// Minimal 1x1 PNG; with `ocrText` an embedded tEXt chunk is added (the
// existing non-AI embedded-text fallback), without it there is no text at
// all, so the image can only be read by Gemini vision OCR.
function createPng(ocrText?: string): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const makeChunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    return Buffer.concat([len, Buffer.from(type, 'ascii'), data, Buffer.alloc(4)]);
  };
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(1, 0);
  ihdrData.writeUInt32BE(1, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  const chunks: Buffer[] = [signature, makeChunk('IHDR', ihdrData)];
  if (ocrText) {
    chunks.push(
      makeChunk('tEXt', Buffer.concat([Buffer.from('OCRText\0', 'utf8'), Buffer.from(ocrText, 'utf8')]))
    );
  }
  chunks.push(makeChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

const ROUTINE_TEXT = [
  'Dhaka Polytechnic Institute',
  'Computer Science & Technology (CST) - 6th Semester - Morning Shift - Section A1',
  'Sunday 09:00 AM - 09:45 AM 66661 Principle of Software Engineering Engr. Tareq Room 302',
  'Monday 10:30 AM - 11:15 AM 66662 Microprocessor & Interfacing Engr. Salma Lab 204',
  'Tuesday 11:15 AM - 12:00 PM 66664 Database Management System Engr. Mahbub Room 305'
].join('\n');

async function main() {
  // Make sure no key leaks in from the environment for the no-key tests.
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODEL;

  console.log('== 1. Routine JSON validation ==');
  const goodRoutine = validateRoutineJson({
    isReadable: true,
    rawExtractedText: ROUTINE_TEXT,
    semester: 6,
    shift: 'Morning',
    section: 'A1',
    periods: [
      { day: 'Sunday', periodNumber: 1, startTime: '09:00', endTime: '09:45', subjectCode: '66661', subjectName: 'Principle of Software Engineering', teacherName: 'Engr. Tareq', room: '302', type: 'Theory', confidence: 'high', uncertainFields: [] }
    ]
  });
  check('valid routine JSON passes', goodRoutine.ok === true);
  const badRoutine = validateRoutineJson({
    isReadable: true,
    periods: [
      { day: 'Funday', periodNumber: 99, startTime: '25:99', endTime: '', subjectCode: '', subjectName: '' },
      { day: 'Monday', periodNumber: 2, startTime: '10:30', endTime: '11:15', subjectCode: '66662', subjectName: 'Microprocessor', confidence: 'maybe' }
    ]
  });
  check(
    'invalid routine JSON names the bad fields',
    badRoutine.ok === false &&
      (badRoutine as any).errors.some((e: string) => e.includes('periods[0].day')) &&
      (badRoutine as any).errors.some((e: string) => e.includes('periods[0].periodNumber')) &&
      (badRoutine as any).errors.some((e: string) => e.includes('periods[0].startTime')) &&
      (badRoutine as any).errors.some((e: string) => e.includes('periods[0].subjectName')) &&
      (badRoutine as any).errors.some((e: string) => e.includes('periods[1].confidence')),
    badRoutine.ok ? 'unexpectedly valid' : formatValidationErrors('routine', (badRoutine as any).errors)
  );
  check(
    'empty periods array is rejected',
    validateRoutineJson({ isReadable: true, periods: [] }).ok === false
  );

  console.log('== 2. Roster JSON validation ==');
  const goodRoster = validateRosterJson({
    isReadable: true,
    students: [
      { classRoll: '01', name: 'Nusrat Jahan', boardRoll: '542880', regNumber: '1502012345', confidence: 'high' },
      { classRoll: '02', name: 'Tanvir Ahmed', boardRoll: '542891', regNumber: '', confidence: 'medium', uncertainFields: ['regNumber'] }
    ]
  });
  check('valid roster JSON passes', goodRoster.ok === true);
  const badRoster = validateRosterJson({
    isReadable: true,
    students: [
      { classRoll: '01', name: 'AB', boardRoll: '12AB', confidence: 'high' },
      { classRoll: '02', name: 'Tanvir Ahmed', boardRoll: '542880', confidence: 'high' },
      { classRoll: '03', name: 'Rahim Ullah', boardRoll: '542880', confidence: 'high' }
    ]
  });
  check(
    'invalid roster JSON names the bad fields',
    badRoster.ok === false &&
      (badRoster as any).errors.some((e: string) => e.includes('students[0].name')) &&
      (badRoster as any).errors.some((e: string) => e.includes('students[0].boardRoll')) &&
      (badRoster as any).errors.some((e: string) => e.includes('students[2].boardRoll') && e.includes('duplicate')),
    badRoster.ok ? 'unexpectedly valid' : (badRoster as any).errors.join('; ')
  );

  console.log('== 3. BTEB result gazette JSON validation ==');
  const goodResult = validateResultJson({
    isReadable: true,
    institutes: ['50118 - Dhaka Polytechnic Institute'],
    entries: [
      { roll: '542880', status: 'PASSED', gpa: 3.85 },
      { roll: '542881', status: 'REFERRED', referredSubjects: [{ code: '66662', parts: 'T' }, { code: '66664', parts: 'T,P' }] }
    ]
  });
  check('valid result JSON passes', goodResult.ok === true);
  if (goodResult.ok) {
    const text = serializeBtebEntriesToText(goodResult.data.entries, goodResult.data.institutes);
    check(
      'validated entries serialize to canonical BTEB text',
      text.includes('542880 (3.85)') && text.includes('542881 { 66662(T), 66664(T,P) }') && text.includes('50118 - Dhaka Polytechnic Institute'),
      text.replace(/\n/g, ' | ')
    );
  }
  const badResult = validateResultJson({
    isReadable: true,
    entries: [
      { roll: '54288', status: 'PASSED', gpa: 4.5 },
      { roll: '542881', status: 'REFERRED', referredSubjects: [] },
      { roll: '542882', status: 'UNKNOWN' }
    ]
  });
  check(
    'invalid result JSON names the bad fields',
    badResult.ok === false &&
      (badResult as any).errors.some((e: string) => e.includes('entries[0].roll')) &&
      (badResult as any).errors.some((e: string) => e.includes('entries[0].gpa')) &&
      (badResult as any).errors.some((e: string) => e.includes('entries[1].referredSubjects')) &&
      (badResult as any).errors.some((e: string) => e.includes('entries[2].status')),
    badResult.ok ? 'unexpectedly valid' : (badResult as any).errors.join('; ')
  );
  check(
    'general JSON validation rejects a non-boolean isReadable',
    validateGeneralJson({ isReadable: 'yes', rawExtractedText: 'x' }).ok === false
  );

  console.log('== 4a. Scanned image, NO key -> clean 503-style error, no crash ==');
  const noTextPng = `data:image/png;base64,${createPng().toString('base64')}`;
  const resNoKey = await scanDocumentWithIntelligence({
    feature: 'routine',
    fileDataUrl: noTextPng,
    fileName: 'routine-photo.png',
    mimeType: 'image/png'
  });
  check('no-key scan fails (success=false)', resNoKey.success === false);
  check('no-key errorCode is AI_SERVICE_UNAVAILABLE', resNoKey.errorCode === 'AI_SERVICE_UNAVAILABLE', String(resNoKey.errorCode));
  check(
    'no-key error names GEMINI_API_KEY + Render env',
    typeof resNoKey.error === 'string' && resNoKey.error.includes('Scan needs GEMINI_API_KEY — add it in Render env'),
    resNoKey.error || ''
  );
  check('no-key scan fabricates no periods', (resNoKey.routineData?.periods?.length ?? 0) === 0);

  console.log('== 4b. Scanned image, random invalid key -> Gemini API error handled gracefully ==');
  process.env.GEMINI_API_KEY = `invalid-${randomBytes(12).toString('hex')}`;
  let resDummy: any = null;
  let threw = false;
  try {
    resDummy = await scanDocumentWithIntelligence({
      feature: 'routine',
      fileDataUrl: noTextPng,
      fileName: 'routine-photo.png',
      mimeType: 'image/png'
    });
  } catch (e) {
    threw = true;
    console.log('  thrown:', (e as Error)?.message);
  }
  check('invalid-key scan does not throw/crash', threw === false);
  check('invalid-key scan fails gracefully (success=false)', resDummy?.success === false);
  check(
    'invalid-key error is a Gemini/API error, not a crash',
    typeof resDummy?.error === 'string' &&
      resDummy.error.length > 0 &&
      (resDummy.error.includes('Gemini') || resDummy.error.includes('API')),
    resDummy?.error || ''
  );
  check('invalid-key scan fabricates no periods', (resDummy?.routineData?.periods?.length ?? 0) === 0);
  delete process.env.GEMINI_API_KEY;

  console.log('== 4c. Non-AI fallbacks still work with NO key ==');
  const resText = await scanDocumentWithIntelligence({
    feature: 'routine',
    rawText: ROUTINE_TEXT,
    defaults: { college: 'Dhaka Polytechnic Institute', semester: 6, shift: 'Morning', section: 'A1' }
  });
  check(
    'pasted routine text extracts via deterministic parser',
    resText.success === true && (resText.routineData?.periods?.length ?? 0) >= 2,
    `periods=${resText.routineData?.periods?.length ?? 0}`
  );
  const embeddedPng = `data:image/png;base64,${createPng(ROUTINE_TEXT).toString('base64')}`;
  const resEmbedded = await scanDocumentWithIntelligence({
    feature: 'routine',
    fileDataUrl: embeddedPng,
    fileName: 'routine.png',
    mimeType: 'image/png',
    defaults: { semester: 6, shift: 'Morning', section: 'A1' }
  });
  check(
    'image with embedded text extracts without Gemini',
    resEmbedded.success === true && (resEmbedded.routineData?.periods?.length ?? 0) >= 3,
    `method=${resEmbedded.extractionMethod} periods=${resEmbedded.routineData?.periods?.length ?? 0}`
  );

  console.log(`\n${passed} passed, ${failed} failed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test script crashed:', err);
  process.exit(1);
});
