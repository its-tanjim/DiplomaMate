import { createWorker, OEM } from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import tesseractWorkerUrl from 'tesseract.js/dist/worker.min.js?url';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { RoutinePeriod, Section, Shift, WeekDay } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const WEEKDAYS: Array<{ day: WeekDay; pattern: RegExp }> = [
  { day: 'Saturday', pattern: /\b(?:saturday|sat)\b|শনিবার|শনি/i },
  { day: 'Sunday', pattern: /\b(?:sunday|sun)\b|রবিবার|রবি/i },
  { day: 'Monday', pattern: /\b(?:monday|mon)\b|সোমবার|সোম/i },
  { day: 'Tuesday', pattern: /\b(?:tuesday|tue|tues)\b|মঙ্গলবার|মঙ্গল/i },
  { day: 'Wednesday', pattern: /\b(?:wednesday|wed)\b|বুধবার|বুধ/i },
  { day: 'Thursday', pattern: /\b(?:thursday|thu|thur|thurs)\b|বৃহস্পতিবার|বৃহস্পতি/i }
];

export interface RoutineOcrResult {
  periods: RoutinePeriod[];
  rawExtractedText: string;
  diagnostics: string[];
  routineMetadata?: {
    college?: string | null;
    department?: string | null;
    semester?: number | null;
    shift?: Shift | null;
    section?: Section | null;
  };
  warnings: string[];
  confidence: 'high' | 'medium' | 'low';
}

interface RoutineOcrOptions {
  fileName: string;
  dataUrl: string;
  shift: Shift;
  section: Section;
  onProgress?: (stage: string, progress: number) => void;
}

function normalizeDigits(value: string): string {
  return value
    .replace(/[০-৯]/g, digit => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)))
    .replace(/য়/g, 'য়');
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  if (!base64) {
    throw new Error('The selected routine file is not a valid data URL.');
  }
  const binary = atob(base64);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function prepareImageForOcr(dataUrl: string): Promise<HTMLCanvasElement> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const image = await createImageBitmap(blob);
  const longestSide = Math.max(image.width, image.height);
  const scale = Math.min(3, 2200 / longestSide);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    image.close();
    throw new Error('Could not create an image canvas for local OCR.');
  }

  context.fillStyle = '#fff';
  context.fillRect(0, 0, width, height);
  context.filter = 'grayscale(1) contrast(1.4)';
  context.drawImage(image, 0, 0, width, height);
  context.filter = 'none';
  image.close();
  return canvas;
}

function getPdfPageText(items: Array<{ str: string; transform: number[]; width: number }>): string {
  const positionedItems = items
    .filter(item => item.str.trim())
    .map(item => ({ ...item, x: item.transform[4], y: item.transform[5] }))
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Array<{ y: number; items: typeof positionedItems }> = [];

  for (const item of positionedItems) {
    let line = lines.find(candidate => Math.abs(candidate.y - item.y) < 3);
    if (!line) {
      line = { y: item.y, items: [] };
      lines.push(line);
    }
    line.items.push(item);
  }

  return lines
    .sort((a, b) => b.y - a.y)
    .map(line =>
      line.items
        .sort((a, b) => a.x - b.x)
        .map(item => item.str.trim())
        .filter(Boolean)
        .join('  ')
    )
    .filter(Boolean)
    .join('\n');
}

function findTimeRange(line: string): { startTime: string; endTime: string } | null {
  const time = String.raw`\d{1,2}\s*[:.]\s*\d{2}\s*(?:AM|PM)?`;
  const range = line.match(new RegExp(`(${time})\\s*(?:-|–|—|to|থেকে)\\s*(${time})`, 'i'));
  const values = range
    ? [range[1], range[2]]
    : line.match(new RegExp(time, 'gi'))?.slice(0, 2);

  if (!values || values.length < 2) return null;
  const normalizeTime = (value: string) =>
    value.replace(/\s*([:.])\s*/g, '$1').replace(/\s+/g, ' ').trim();
  return { startTime: normalizeTime(values[0]), endTime: normalizeTime(values[1]) };
}

function extractRoutineMetadata(text: string): RoutineOcrResult['routineMetadata'] {
  const metadata: NonNullable<RoutineOcrResult['routineMetadata']> = {};
  const lines = text.split(/\r?\n/).slice(0, 20);

  for (const line of lines) {
    const semester = line.match(/(?:semester|sem|পর্ব|সেমিস্টার)\s*[:#-]?\s*([1-8])/i);
    const shift = line.match(/(?:shift|শিফট)\s*[:#-]?\s*(morning|day|প্রভাতী|দিবা)/i);
    const section = line.match(/(?:section|sec|শাখা|গ্রুপ)\s*[:#-]?\s*(A1|A2|B1|B2)\b/i);
    const college = line.match(/(?:college|institute|polytechnic)\s*[:#-]\s*(.+)/i);
    const department = line.match(/(?:department|technology|বিভাগ|টেকনোলজি)\s*[:#-]\s*(.+)/i);

    if (semester) metadata.semester = Number(semester[1]);
    if (shift) {
      metadata.shift = /morning|প্রভাতী/i.test(shift[1]) ? 'Morning' : 'Day';
    }
    if (section) metadata.section = section[1].toUpperCase() as Section;
    if (college) metadata.college = college[1].trim();
    if (department) metadata.department = department[1].trim();
  }

  return Object.keys(metadata).length ? metadata : undefined;
}

export function parseRoutineText(
  rawText: string,
  shift: Shift,
  section: Section
): RoutineOcrResult {
  const text = normalizeDigits(rawText);
  const lines = text
    .replace(/\r/g, '\n')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const periods: RoutinePeriod[] = [];
  const seen = new Set<string>();
  const warnings: string[] = [];
  let currentDay: WeekDay | null = null;
  const diagnostics: string[] = [];

  for (const line of lines) {
    const matchedDays = WEEKDAYS.filter(({ pattern }) => pattern.test(line));
    if (matchedDays.length === 1) {
      currentDay = matchedDays[0].day;
    } else if (matchedDays.length > 1) {
      diagnostics.push(`Multiple weekdays appeared on one OCR line: "${line.slice(0, 180)}"`);
      currentDay = null;
      continue;
    }

    const timeRange = findTimeRange(line);
    const codeMatch =
      line.match(/(?:subject\s*code|course\s*code|code|বিষ(?:য়|য়)\s*কোড|কোড)\s*[:#-]?\s*([A-Z0-9-]+)/i) ||
      line.match(/(?:^|\D)(\d{5})(?=\D|$)/);
    const roomMatch = line.match(
      /(?:\broom\b|\brm\.?|\blab\b|কক্ষ(?:\s*নং)?|রুম)\s*(?:(?:no\.?|number|নং)\s*)?[:#-]?\s*([A-Z0-9][A-Z0-9-]{0,15})/i
    );
    const teacherMatch =
      line.match(/(?:\bteacher\b|\binstructor\b|\bfaculty\b|শিক্ষক|প্রভাষক)\s*[:#-]?\s*(.+?)(?=\s+(?:room|rm\.?|lab|subject|code|period|theory|practical|কক্ষ|রুম|বিষ(?:য়|য়)|কোড)\s*[:#-]?\s*|[|;,]|$)/i) ||
      line.match(/\b((?:Engr\.?|Prof\.?|Dr\.?|Md\.?)\s+[A-Za-z. ]{2,35})/i);
    const subjectLabelMatch = line.match(
      /(?:subject(?:\s*name)?|course|বিষ(?:য়|য়)|কোর্স)\s*[:#-]\s*(.+?)(?=\s+(?:subject\s*code|course\s*code|code|teacher|instructor|faculty|room|rm\.?|lab|period|theory|practical|বিষ(?:য়|য়)\s*কোড|কোড|শিক্ষক|কক্ষ|রুম)\s*[:#-]?\s*|[|;,]|$)/i
    );
    const rowStartMatch = line.match(
      /(?:^|[\s|])(?:period(?:\s*no\.?)?|p|পির[িী](?:য়|য়|য়|য)?ড)\s*[#:\-।]?\s*0*([1-9]\d?)(?=$|[\s|:.)।])/i
    );
    const numericStartMatch = line.match(/^\s*0*([1-9]\d?)\s*(?:[.)|]\s*|\s{2,}|\t+)/);
    const periodNumber = Number(rowStartMatch?.[1] || numericStartMatch?.[1] || 0);

    const practical = /\b(?:practical|lab|sessional)\b|ব্যবহারিক/i.test(line);
    const theory = /\btheory\b|তাত্ত্বিক/i.test(line);
    const isPeriodRow =
      !!rowStartMatch ||
      !!numericStartMatch ||
      !!timeRange ||
      !!codeMatch ||
      !!subjectLabelMatch ||
      !!line.match(/(?:\bteacher\b|\binstructor\b|\broom\b|\brm\.?|\blab\b|শিক্ষক|কক্ষ|রুম)\s*[:#-]/i);

    if (!currentDay || !isPeriodRow || matchedDays.length > 1) continue;

    let subjectName = subjectLabelMatch?.[1] || '';
    if (!subjectName) {
      subjectName = line;
      for (const { pattern } of WEEKDAYS) subjectName = subjectName.replace(pattern, ' ');
      subjectName = subjectName
        .replace(/(?:\bperiod(?:\s*no\.?)?|\bp|পিরিয়ড)\s*[#:\-]?\s*[1-9]\d?/i, ' ')
        .replace(/^\s*[1-9]\d?\s*(?:[.)|]\s+|\t+)/, ' ')
        .replace(new RegExp(String.raw`\d{1,2}\s*[:.]\s*\d{2}\s*(?:AM|PM)?`, 'gi'), ' ')
        .replace(/(?:subject\s*code|course\s*code|code|বিষ(?:য়|য়)\s*কোড|কোড)\s*[:#-]?\s*[A-Z0-9-]+/i, ' ')
        .replace(/(?:teacher|instructor|faculty|শিক্ষক|প্রভাষক)\s*[:#-]?\s*.+?(?=\s+(?:room|rm\.?|lab)\s*[:#-]?\s*|$)/i, ' ')
        .replace(/\b\d{5}\b/g, ' ')
        .replace(/\b(?:room|rm\.?|lab)\s*(?:(?:no\.?|number)\s*)?[:#-]?\s*[A-Z0-9-]+/i, ' ')
        .replace(/(?:কক্ষ(?:\s*নং)?|রুম)\s*[:#-]?\s*[A-Z0-9-]+/i, ' ')
        .replace(roomMatch?.[0] || /$^/, ' ')
        .replace(teacherMatch?.[0] || /$^/, ' ')
        .replace(/(?:teacher|instructor|faculty|শিক্ষক|প্রভাষক)\s*[:#-]?/i, ' ')
        .replace(/\b(?:subject|subject name|course)\s*[:#-]?/i, ' ')
        .replace(/(?:বিষ(?:য়|য়)|কোর্স)\s*[:#-]?/i, ' ')
        .replace(/[|,;:\-–—()[\]{}]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } else {
      subjectName = subjectName
        .replace(new RegExp(String.raw`\d{1,2}\s*[:.]\s*\d{2}\s*(?:AM|PM)?`, 'gi'), ' ')
        .replace(/\b\d{5}\b/g, ' ')
        .replace(roomMatch?.[0] || /$^/, ' ')
        .replace(teacherMatch?.[0] || /$^/, ' ')
        .replace(/[|,;()[\]{}]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    const subjectCode = codeMatch ? codeMatch[1].replace(/[^A-Z0-9-]/gi, '') : '';
    const teacherName = teacherMatch
      ? teacherMatch[1].split(/\s+(?:room|rm\.?|lab)(?:\s|:)/i)[0].trim()
      : '';
    const room = roomMatch ? roomMatch[1].trim() : '';
    const uncertainFields: string[] = [];

    if (!periodNumber) uncertainFields.push('periodNumber');
    if (!timeRange) uncertainFields.push('time');
    if (!subjectCode) uncertainFields.push('subjectCode');
    if (!subjectName || subjectName.length < 2) uncertainFields.push('subjectName');
    if (!teacherName) uncertainFields.push('teacherName');
    if (!room) uncertainFields.push('room');
    if (!practical && !theory) uncertainFields.push('type');

    const key = [
      currentDay,
      periodNumber,
      timeRange?.startTime || '',
      subjectCode,
      subjectName
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);

    periods.push({
      id: `ocr_rt_${Date.now()}_${periods.length}`,
      day: currentDay,
      periodNumber,
      startTime: timeRange?.startTime || '',
      endTime: timeRange?.endTime || '',
      subjectCode,
      subjectName,
      teacherName,
      room,
      type: practical ? 'Practical / Lab' : 'Theory',
      shift,
      section,
      confidence: uncertainFields.length === 0 ? 'high' : uncertainFields.length <= 2 ? 'medium' : 'low',
      uncertainFields
    });
  }

  if (periods.length === 0) {
    warnings.push('No class rows with a recognizable weekday were found. Add the periods manually or upload a clearer routine.');
  } else if (periods.some(period => (period.uncertainFields?.length || 0) > 0)) {
    warnings.push('Some fields were not clearly present in the document. Review and complete the highlighted fields before publishing.');
  }

  const confidence =
    periods.length === 0
      ? 'low'
      : periods.some(period => period.confidence === 'low')
        ? 'low'
        : periods.some(period => period.confidence === 'medium')
          ? 'medium'
          : 'high';

  return {
    periods,
    rawExtractedText: rawText,
    diagnostics,
    routineMetadata: extractRoutineMetadata(text),
    warnings,
    confidence
  };
}

async function extractPdfTextAndOcr(
  dataUrl: string,
  worker: Awaited<ReturnType<typeof createWorker>>,
  onProgress: NonNullable<RoutineOcrOptions['onProgress']>
): Promise<{ text: string; diagnostics: string[] }> {
  const loadingTask = pdfjsLib.getDocument({ data: dataUrlToBytes(dataUrl) });
  const pageTexts: string[] = [];
  const diagnostics: string[] = [];

  try {
    const pdf = await loadingTask.promise;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      onProgress(`Reading PDF page ${pageNumber} of ${pdf.numPages}...`, ((pageNumber - 1) / pdf.numPages) * 100);
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const textItems = content.items.filter(
        (item): item is typeof item & { str: string; transform: number[]; width: number } =>
          'str' in item && typeof item.str === 'string' && 'transform' in item && 'width' in item
      );
      const extractedText = getPdfPageText(textItems);

      if (extractedText.replace(/\s/g, '').length >= 80) {
        pageTexts.push(extractedText);
        diagnostics.push(`PDF page ${pageNumber}: extracted ${extractedText.length} embedded text characters.`);
        onProgress(`Read text from PDF page ${pageNumber} of ${pdf.numPages}.`, (pageNumber / pdf.numPages) * 100);
        continue;
      }

      onProgress(`Rendering scanned PDF page ${pageNumber} of ${pdf.numPages}...`, ((pageNumber - 1) / pdf.numPages) * 100);
      const baseViewport = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.max(2.5, 2200 / baseViewport.width) });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error(`Could not create a canvas to process PDF page ${pageNumber}.`);
      }

      await page.render({ canvas, canvasContext: context, viewport }).promise;
      const enhancedCanvas = document.createElement('canvas');
      enhancedCanvas.width = canvas.width;
      enhancedCanvas.height = canvas.height;
      const enhancedContext = enhancedCanvas.getContext('2d');
      if (!enhancedContext) {
        throw new Error(`Could not enhance rendered PDF page ${pageNumber} for OCR.`);
      }
      enhancedContext.fillStyle = '#fff';
      enhancedContext.fillRect(0, 0, enhancedCanvas.width, enhancedCanvas.height);
      enhancedContext.filter = 'grayscale(1) contrast(1.4)';
      enhancedContext.drawImage(canvas, 0, 0);
      const result = await worker.recognize(enhancedCanvas, {}, {}, `pdf-page-${pageNumber}`);
      pageTexts.push(result.data.text);
      diagnostics.push(`PDF page ${pageNumber}: scanned with OCR; received ${result.data.text.length} text characters.`);
      canvas.width = 0;
      canvas.height = 0;
      enhancedCanvas.width = 0;
      enhancedCanvas.height = 0;
      onProgress(`Scanned PDF page ${pageNumber} of ${pdf.numPages}.`, (pageNumber / pdf.numPages) * 100);
    }
  } finally {
    await loadingTask.destroy();
  }

  return { text: pageTexts.join('\n'), diagnostics };
}

export async function scanRoutineLocally(options: RoutineOcrOptions): Promise<RoutineOcrResult> {
  const onProgress = options.onProgress || (() => {});
  const isPdf = options.fileName.toLowerCase().endsWith('.pdf') ||
    options.dataUrl.startsWith('data:application/pdf');
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  const diagnostics: string[] = [];
  let currentStage = 'Tesseract worker initialization';

  try {
    onProgress('Loading Bengali and English OCR models...', 0);
    diagnostics.push(`Worker asset: ${tesseractWorkerUrl}`);
    diagnostics.push(`PDF worker asset: ${pdfWorkerUrl}`);
    diagnostics.push('Language configuration: eng+ben (LSTM-only, gzip-compressed traineddata).');
    diagnostics.push('English traineddata: https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz');
    diagnostics.push('Bengali traineddata: https://cdn.jsdelivr.net/npm/@tesseract.js-data/ben/4.0.0_best_int/ben.traineddata.gz');
    diagnostics.push('Tesseract core source: https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0');
    // Tesseract builds a separate traineddata URL per language package when langPath is omitted.
    worker = await createWorker('eng+ben', OEM.LSTM_ONLY, {
      workerPath: tesseractWorkerUrl,
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0',
      gzip: true,
      cacheMethod: 'write',
      logger: message => {
        if (message.status === 'loading language traineddata') {
          onProgress(`Loading Bengali and English OCR models (${Math.round(message.progress * 100)}%)...`, message.progress * 10);
        } else if (message.status === 'recognizing text' && !isPdf) {
          onProgress('Recognizing text in routine image...', 10 + message.progress * 85);
          diagnostics.push(`Tesseract recognition progress: ${Math.round(message.progress * 100)}%.`);
        }
      }
    });
    diagnostics.push('Tesseract worker initialized; combined English and Bengali language data loaded.');

    onProgress(isPdf ? 'Reading PDF pages...' : 'Recognizing text in routine image...', 10);
    let rawText: string;
    if (isPdf) {
      currentStage = 'PDF page text extraction and OCR';
      const pdfResult = await extractPdfTextAndOcr(options.dataUrl, worker, onProgress);
      rawText = pdfResult.text;
      diagnostics.push(...pdfResult.diagnostics);
    } else {
      currentStage = 'Image preprocessing';
      const canvas = await prepareImageForOcr(options.dataUrl);
      currentStage = 'Tesseract image recognition';
      const result = await worker.recognize(canvas);
      rawText = result.data.text;
      diagnostics.push(`Tesseract returned ${rawText.length} raw text characters at ${Math.round(result.data.confidence)}% confidence.`);
      canvas.width = 0;
      canvas.height = 0;
    }

    if (!rawText.trim()) {
      diagnostics.push('OCR completed with an empty text result. Verify source quality, language files, and browser network access.');
    }
    onProgress('Identifying weekdays, periods, subjects, teachers, rooms, and times...', 98);

    const result = parseRoutineText(rawText, options.shift, options.section);
    result.diagnostics.unshift(...diagnostics);
    onProgress('Routine scan complete.', 100);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${currentStage} failed: ${message}\n${diagnostics.join('\n')}`);
  } finally {
    if (worker) await worker.terminate();
  }
}
