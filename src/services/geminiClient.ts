/**
 * Gemini document-scan client (server-side only) — item 4.
 *
 * Talks to the Google Gemini API over plain REST:
 *   POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 * with the API key in the `x-goog-api-key` header (see
 * https://ai.google.dev/gemini-api/docs/models and the generateContent reference).
 *
 * Model (verified against the official models page, 2026-11-24):
 *   - Default `gemini-3.8-flash` — listed as Stable ("previous-generation Flash").
 *   - `gemini-2.5-flash` is DEPRECATED and no longer available to new users
 *     (from 2026-12-01 it auto-routes to `gemini-3.5-flash-lite`), so it must
 *     NOT be used. Override the model with env GEMINI_MODEL if Google
 *     renames/retires it again — never hard-code a new guess in call sites.
 *   - No key is ever logged, and the key is never sent anywhere except the
 *     generativelanguage.googleapis.com header.
 *
 * Every call demands strict JSON (`responseMimeType: application/json` plus a
 * responseSchema) and the result is validated server-side by the validators
 * in this file: a missing field, a wrong type, or an out-of-range value is
 * reported by field name instead of silently becoming wrong data.
 *
 * When GEMINI_API_KEY is not set, callers must NOT call Gemini at all: the
 * non-AI fallbacks (PDF text layer, embedded image text, pasted text,
 * deterministic parsers) run first, and only a document that truly needs
 * vision OCR fails — with GEMINI_NOT_CONFIGURED_MESSAGE (HTTP 503).
 */

export const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/** Verified Stable on the official models page (2026-11-24). */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

export function getGeminiModel(): string {
  const override = (process.env.GEMINI_MODEL || '').trim();
  return override || DEFAULT_GEMINI_MODEL;
}

export function getGeminiApiKey(): string {
  return (process.env.GEMINI_API_KEY || '').trim();
}

export function isGeminiConfigured(): boolean {
  return getGeminiApiKey().length > 0;
}

/**
 * The exact message returned whenever a scan needs vision OCR but no key is
 * configured. Keep the first sentence verbatim — clients and tests match on it.
 */
export const GEMINI_NOT_CONFIGURED_MESSAGE =
  'Scan needs GEMINI_API_KEY — add it in Render env (Render Dashboard → diplomamate service → Environment → add GEMINI_API_KEY, copied from Google AI Studio → Get API key). ' +
  'Text-based PDFs, images with embedded text, and pasted text still work without it; only scanned image documents need the key.';

export const GEMINI_TIMEOUT_MS = 60_000;

export type GeminiErrorCode = 'AI_SERVICE_UNAVAILABLE' | 'AI_INVALID_RESPONSE';

export type GeminiJsonResult<T> =
  | { ok: true; data: T; rawText: string }
  | {
      ok: false;
      error: string;
      errorCode: GeminiErrorCode;
      /** Suggested HTTP status for the failure (401/404/429/502/503). */
      status: number;
      retryable: boolean;
    };

export interface GeminiJsonOptions {
  prompt: string;
  /** Base64 file bytes + MIME type for vision OCR (image / scanned PDF). */
  inlineData?: { data: string; mimeType: string };
  /** Extra inline images (e.g. video keyframes), max 4. */
  additionalInlineData?: Array<{ data: string; mimeType: string }>;
  /** JSON Schema (REST responseSchema shape) the model must conform to. */
  responseSchema?: Record<string, unknown>;
  timeoutMs?: number;
}

function stripJsonFences(text: string): string {
  let t = String(text || '').trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
  }
  return t.trim();
}

function mapGeminiHttpError(status: number, bodyText: string, model: string): { error: string; status: number; retryable: boolean } {
  const body = String(bodyText || '').slice(0, 500);
  const lower = body.toLowerCase();
  if (status === 400 && (lower.includes('api_key_invalid') || lower.includes('api key not valid') || lower.includes('api-key'))) {
    return {
      status: 503,
      retryable: false,
      error:
        'Gemini rejected the API key (API_KEY_INVALID). Check GEMINI_API_KEY on Render — copy a fresh key from Google AI Studio (aistudio.google.com) and save it as an env var. No scan data was fabricated.'
    };
  }
  if (status === 401 || status === 403) {
    return {
      status: 503,
      retryable: false,
      error:
        'Gemini rejected the request (unauthorized — HTTP ' + status + '). The GEMINI_API_KEY on Render is missing, invalid, or not enabled for the Gemini API. Check the key in Google AI Studio. No scan data was fabricated.'
    };
  }
  if (status === 404) {
    return {
      status: 503,
      retryable: false,
      error:
        `Gemini model "${model}" was not found (HTTP 404). Google may have retired it — set env GEMINI_MODEL to a current model from https://ai.google.dev/gemini-api/docs/models and redeploy. No scan data was fabricated.`
    };
  }
  if (status === 429) {
    return {
      status: 503,
      retryable: true,
      error:
        'Gemini rate limit reached (HTTP 429 — free-tier quota). Please wait a few minutes and retry the scan. No scan data was fabricated.'
    };
  }
  if (status >= 500) {
    return {
      status: 503,
      retryable: true,
      error: `Gemini service is temporarily unavailable (HTTP ${status}). Please retry the scan in a minute. No scan data was fabricated.`
    };
  }
  return {
    status: 503,
    retryable: false,
    error: `Gemini request failed (HTTP ${status}${body ? ': ' + body : ''}). Please retry or enter the fields manually. No scan data was fabricated.`
  };
}

/**
 * Call Gemini generateContent and parse the reply as strict JSON.
 * Never throws for API/parse problems — returns a typed failure instead, so
 * callers can turn it into a clean 502/503 without crashing the server.
 * Never logs or returns the API key.
 */
export async function callGeminiJson<T>(options: GeminiJsonOptions): Promise<GeminiJsonResult<T>> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      ok: false,
      error: GEMINI_NOT_CONFIGURED_MESSAGE,
      errorCode: 'AI_SERVICE_UNAVAILABLE',
      status: 503,
      retryable: false
    };
  }
  const model = getGeminiModel();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? GEMINI_TIMEOUT_MS);
  try {
    const parts: Array<Record<string, unknown>> = [];
    if (options.inlineData) {
      parts.push({ inlineData: { data: options.inlineData.data, mimeType: options.inlineData.mimeType } });
    }
    for (const extra of (options.additionalInlineData || []).slice(0, 4)) {
      parts.push({ inlineData: { data: extra.data, mimeType: extra.mimeType } });
    }
    parts.push({ text: options.prompt });

    const res = await fetch(
      `${GEMINI_API_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            ...(options.responseSchema ? { responseSchema: options.responseSchema } : {}),
            temperature: 0,
            maxOutputTokens: 8192
          }
        }),
        signal: controller.signal
      }
    );

    const bodyText = await res.text();
    if (!res.ok) {
      const mapped = mapGeminiHttpError(res.status, bodyText, model);
      return { ok: false, error: mapped.error, errorCode: 'AI_SERVICE_UNAVAILABLE', status: mapped.status, retryable: mapped.retryable };
    }

    let body: any = null;
    try {
      body = JSON.parse(bodyText);
    } catch {
      return {
        ok: false,
        error: 'Gemini returned a response that is not valid JSON. Please retry the scan or enter the fields manually.',
        errorCode: 'AI_INVALID_RESPONSE',
        status: 502,
        retryable: true
      };
    }
    const textPart = body?.candidates?.[0]?.content?.parts?.find((p: any) => typeof p?.text === 'string')?.text;
    const rawText = stripJsonFences(typeof textPart === 'string' ? textPart : '');
    if (!rawText) {
      const finishReason = body?.candidates?.[0]?.finishReason || 'unknown';
      return {
        ok: false,
        error: `Gemini returned an empty result (finishReason: ${finishReason}). The document may be unreadable — please upload a clearer scan or enter the fields manually.`,
        errorCode: 'AI_INVALID_RESPONSE',
        status: 502,
        retryable: true
      };
    }
    try {
      const data = JSON.parse(rawText) as T;
      return { ok: true, data, rawText };
    } catch {
      return {
        ok: false,
        error: 'Gemini returned text that is not valid JSON. Please retry the scan or enter the fields manually.',
        errorCode: 'AI_INVALID_RESPONSE',
        status: 502,
        retryable: true
      };
    }
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    return {
      ok: false,
      error: isTimeout
        ? 'Gemini scan timed out after 60 seconds. Please retry with a smaller/clearer file or enter the fields manually.'
        : `Could not reach the Gemini API (${err?.message || 'network error'}). Check the server network and retry the scan.`,
      errorCode: 'AI_SERVICE_UNAVAILABLE',
      status: 503,
      retryable: true
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// Shared validation helpers
// ============================================================================

const BANGLA_DIGIT_MAP: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

export function normalizeGeminiDigits(input: unknown): string {
  return String(input ?? '').replace(/[০-৯]/g, d => BANGLA_DIGIT_MAP[d] ?? d).trim();
}

const WEEKDAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const CONFIDENCES = ['high', 'medium', 'low', 'uncertain'];

function isRecord(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isValidTime(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const t = v.trim();
  if (t === 'TBA') return true;
  const m = t.match(/^(\d{1,2}):(\d{2})(\s?[AP]M)?$/i);
  if (!m) return false;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (m[3]) return h >= 1 && h <= 12 && min >= 0 && min <= 59;
  return h >= 0 && h <= 23 && min >= 0 && min <= 59;
}

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: string[] };

/** One human-readable error line that names the exact missing/invalid field. */
export function formatValidationErrors(feature: string, errors: string[]): string {
  return (
    `Gemini returned invalid ${feature} data: ${errors.join('; ')}. ` +
    'Nothing was saved from this scan — please retry with a clearer document or enter the fields manually.'
  );
}

// ============================================================================
// ROUTINE — per-feature prompt, schema, validator
// ============================================================================

export const ROUTINE_JSON_SCHEMA: Record<string, unknown> = {
  type: 'OBJECT',
  properties: {
    isReadable: { type: 'BOOLEAN' },
    unreadableReason: { type: 'STRING' },
    rawExtractedText: { type: 'STRING' },
    college: { type: 'STRING' },
    department: { type: 'STRING' },
    semester: { type: 'INTEGER' },
    shift: { type: 'STRING' },
    section: { type: 'STRING' },
    periods: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          day: { type: 'STRING' },
          periodNumber: { type: 'INTEGER' },
          startTime: { type: 'STRING' },
          endTime: { type: 'STRING' },
          subjectCode: { type: 'STRING' },
          subjectName: { type: 'STRING' },
          teacherName: { type: 'STRING' },
          room: { type: 'STRING' },
          type: { type: 'STRING' },
          confidence: { type: 'STRING' },
          uncertainFields: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: ['day', 'periodNumber', 'startTime', 'endTime']
      }
    },
    uncertainFields: { type: 'ARRAY', items: { type: 'STRING' } }
  },
  required: ['isReadable', 'periods']
};

export function routineScanPrompt(): string {
  return `You are an academic document intelligence engine for Bangladesh Technical Education Board (BTEB) Polytechnic Institutes.
Analyze this uploaded class routine document (image or PDF). Support both English and Bangla text, including Bangla digits (convert them to 0-9).
Return ONLY strict JSON matching the requested schema — no markdown, no commentary, no extra fields.
CRITICAL RULES:
- Never invent or hallucinate class times, subjects, subject codes, teachers, or rooms. If a value is not visible, use "" for it and list the field name in that period's uncertainFields.
- If the image is blank, blurry, or not a class routine, set isReadable=false, unreadableReason to why, and periods=[].
- day must be one of Saturday, Sunday, Monday, Tuesday, Wednesday, Thursday (Friday is the weekly holiday — no classes).
- periodNumber is the period's number in the day (1-12). startTime/endTime use 24-hour "HH:MM" (e.g. "09:00"), or "TBA" only when the time is genuinely not printed.
- subjectCode is the 5-digit BTEB code when printed (e.g. "66661"); otherwise "".
- type is "Theory" or "Practical / Lab".
- confidence per period is "high" (clearly readable), "medium" (partly unclear), or "low" (guessed from context — prefer leaving the field blank instead).
- uncertainFields lists every period field you are unsure about (e.g. ["room", "teacherName"]). Also copy all of them into the top-level uncertainFields array.`;
}

export interface ValidatedRoutinePeriod {
  day: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subjectCode: string;
  subjectName: string;
  teacherName: string;
  room: string;
  type: string;
  confidence: string;
  uncertainFields: string[];
}

export interface ValidatedRoutine {
  isReadable: boolean;
  unreadableReason: string;
  rawExtractedText: string;
  college: string;
  department: string;
  semester: number | null;
  shift: string;
  section: string;
  periods: ValidatedRoutinePeriod[];
  uncertainFields: string[];
}

export function validateRoutineJson(parsed: unknown): ValidationResult<ValidatedRoutine> {
  const errors: string[] = [];
  if (!isRecord(parsed)) return { ok: false, errors: ['response is not a JSON object'] };
  if (typeof parsed.isReadable !== 'boolean') errors.push('isReadable is missing or is not a boolean');
  if (!Array.isArray(parsed.periods)) {
    errors.push('periods is missing or is not an array');
    return { ok: false, errors };
  }
  if (parsed.periods.length === 0) errors.push('periods is empty — no class periods were extracted');
  const periods: ValidatedRoutinePeriod[] = [];
  parsed.periods.forEach((p: any, i: number) => {
    const at = `periods[${i}]`;
    if (!isRecord(p)) {
      errors.push(`${at} is not an object`);
      return;
    }
    if (typeof p.day !== 'string' || !WEEKDAYS.includes(p.day.trim())) {
      errors.push(`${at}.day ${JSON.stringify(p.day)} is missing or is not a valid weekday (Saturday–Thursday)`);
    }
    if (!Number.isInteger(p.periodNumber) || p.periodNumber < 1 || p.periodNumber > 12) {
      errors.push(`${at}.periodNumber ${JSON.stringify(p.periodNumber)} is missing or out of range 1–12`);
    }
    if (!isValidTime(p.startTime)) errors.push(`${at}.startTime ${JSON.stringify(p.startTime)} is missing or is not a valid "HH:MM" time`);
    if (!isValidTime(p.endTime)) errors.push(`${at}.endTime ${JSON.stringify(p.endTime)} is missing or is not a valid "HH:MM" time`);
    if (p.subjectCode !== undefined && p.subjectCode !== '' && (typeof p.subjectCode !== 'string' || !/^[A-Za-z0-9-]{4,10}$/.test(p.subjectCode.trim()))) {
      errors.push(`${at}.subjectCode ${JSON.stringify(p.subjectCode)} is not a valid BTEB subject code`);
    }
    const hasName = typeof p.subjectName === 'string' && p.subjectName.trim().length > 0;
    const hasCode = typeof p.subjectCode === 'string' && p.subjectCode.trim().length > 0;
    if (!hasName && !hasCode) errors.push(`${at}.subjectName is missing and no subjectCode was given to identify the subject`);
    if (p.type !== undefined && p.type !== '' && p.type !== 'Theory' && p.type !== 'Practical / Lab') {
      errors.push(`${at}.type ${JSON.stringify(p.type)} must be "Theory" or "Practical / Lab"`);
    }
    if (p.confidence !== undefined && p.confidence !== '' && !CONFIDENCES.includes(String(p.confidence))) {
      errors.push(`${at}.confidence ${JSON.stringify(p.confidence)} must be "high", "medium", "low" or "uncertain"`);
    }
    if (p.uncertainFields !== undefined && (!Array.isArray(p.uncertainFields) || p.uncertainFields.some((f: any) => typeof f !== 'string'))) {
      errors.push(`${at}.uncertainFields must be an array of field-name strings`);
    }
    periods.push({
      day: typeof p.day === 'string' ? p.day.trim() : '',
      periodNumber: Number(p.periodNumber) || 0,
      startTime: typeof p.startTime === 'string' ? p.startTime.trim() : '',
      endTime: typeof p.endTime === 'string' ? p.endTime.trim() : '',
      subjectCode: typeof p.subjectCode === 'string' ? p.subjectCode.trim() : '',
      subjectName: typeof p.subjectName === 'string' ? p.subjectName.trim() : '',
      teacherName: typeof p.teacherName === 'string' ? p.teacherName.trim() : '',
      room: typeof p.room === 'string' ? p.room.trim() : '',
      type: p.type === 'Practical / Lab' ? 'Practical / Lab' : 'Theory',
      confidence: CONFIDENCES.includes(String(p.confidence)) ? String(p.confidence) : 'low',
      uncertainFields: Array.isArray(p.uncertainFields) ? p.uncertainFields.filter((f: any) => typeof f === 'string') : []
    });
  });
  if (errors.length > 0) return { ok: false, errors };
  const semester = Number(parsed.semester);
  const shift = typeof parsed.shift === 'string' ? parsed.shift.trim() : '';
  const section = typeof parsed.section === 'string' ? parsed.section.trim() : '';
  return {
    ok: true,
    data: {
      isReadable: parsed.isReadable !== false,
      unreadableReason: typeof parsed.unreadableReason === 'string' ? parsed.unreadableReason : '',
      rawExtractedText: typeof parsed.rawExtractedText === 'string' ? parsed.rawExtractedText : '',
      college: typeof parsed.college === 'string' ? parsed.college.trim() : '',
      department: typeof parsed.department === 'string' ? parsed.department.trim() : '',
      semester: Number.isInteger(semester) && semester >= 1 && semester <= 8 ? semester : null,
      shift: shift === 'Day' || shift === 'Morning' ? shift : '',
      section: ['A1', 'A2', 'B1', 'B2'].includes(section) ? section : '',
      periods,
      uncertainFields: Array.isArray(parsed.uncertainFields)
        ? parsed.uncertainFields.filter((f: any) => typeof f === 'string')
        : []
    }
  };
}

// ============================================================================
// ROSTER — per-feature prompt, schema, validator
// ============================================================================

export const ROSTER_JSON_SCHEMA: Record<string, unknown> = {
  type: 'OBJECT',
  properties: {
    isReadable: { type: 'BOOLEAN' },
    unreadableReason: { type: 'STRING' },
    students: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          classRoll: { type: 'STRING' },
          name: { type: 'STRING' },
          boardRoll: { type: 'STRING' },
          regNumber: { type: 'STRING' },
          confidence: { type: 'STRING' },
          uncertainFields: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: ['name', 'boardRoll']
      }
    },
    uncertainFields: { type: 'ARRAY', items: { type: 'STRING' } }
  },
  required: ['isReadable', 'students']
};

export function rosterScanPrompt(): string {
  return `Extract the student roster from this polytechnic class sheet image or PDF.
Return ONLY strict JSON matching the requested schema — no markdown, no commentary, no extra fields.
CRITICAL RULES:
- Do NOT invent students. If the image is blank or unreadable, set isReadable=false, unreadableReason to why, and students=[].
- For each visible student row extract: classRoll (class roll, e.g. "01"), name (student full name exactly as printed), boardRoll (5 to 8 digit BTEB board roll number — digits only, convert Bangla digits to 0-9), regNumber (registration number if visible, otherwise "").
- confidence per student is "high" (name and roll clearly readable), "medium" (one field partly unclear), or "uncertain" (name or roll is a guess — list the doubtful field in uncertainFields instead of guessing silently).
- Never copy a roll number from one row to another, and never reuse the same boardRoll for two students.
- Rows that are headers, totals, signatures, or seals are not students — skip them.`;
}

export interface ValidatedRosterStudent {
  classRoll: string;
  name: string;
  boardRoll: string;
  regNumber: string;
  confidence: string;
  uncertainFields: string[];
}

export interface ValidatedRoster {
  isReadable: boolean;
  unreadableReason: string;
  students: ValidatedRosterStudent[];
  uncertainFields: string[];
}

export function validateRosterJson(parsed: unknown): ValidationResult<ValidatedRoster> {
  const errors: string[] = [];
  if (!isRecord(parsed)) return { ok: false, errors: ['response is not a JSON object'] };
  if (typeof parsed.isReadable !== 'boolean') errors.push('isReadable is missing or is not a boolean');
  if (!Array.isArray(parsed.students)) {
    errors.push('students is missing or is not an array');
    return { ok: false, errors };
  }
  if (parsed.students.length === 0) errors.push('students is empty — no student rows were extracted');
  const students: ValidatedRosterStudent[] = [];
  const seenRolls = new Set<string>();
  parsed.students.forEach((s: any, i: number) => {
    const at = `students[${i}]`;
    if (!isRecord(s)) {
      errors.push(`${at} is not an object`);
      return;
    }
    const name = typeof s.name === 'string' ? s.name.trim() : '';
    if (name.length < 3) errors.push(`${at}.name ${JSON.stringify(s.name)} is missing or too short to be a student name`);
    const boardRoll = normalizeGeminiDigits(s.boardRoll);
    if (!/^\d{5,8}$/.test(boardRoll)) {
      errors.push(`${at}.boardRoll ${JSON.stringify(s.boardRoll)} is missing or is not 5–8 digits`);
    } else if (seenRolls.has(boardRoll)) {
      errors.push(`${at}.boardRoll "${boardRoll}" is a duplicate of an earlier row`);
    } else {
      seenRolls.add(boardRoll);
    }
    const classRoll = normalizeGeminiDigits(s.classRoll);
    if (classRoll !== '' && !/^\d{1,3}$/.test(classRoll)) {
      errors.push(`${at}.classRoll ${JSON.stringify(s.classRoll)} is not a 1–3 digit class roll`);
    }
    const regNumber = normalizeGeminiDigits(s.regNumber);
    if (regNumber !== '' && !/^\d{8,12}$/.test(regNumber)) {
      errors.push(`${at}.regNumber ${JSON.stringify(s.regNumber)} is not 8–12 digits`);
    }
    const confidence = typeof s.confidence === 'string' && CONFIDENCES.includes(s.confidence.trim())
      ? s.confidence.trim()
      : 'uncertain';
    const uncertainFields = Array.isArray(s.uncertainFields)
      ? s.uncertainFields.filter((f: any) => typeof f === 'string')
      : [];
    students.push({ classRoll, name, boardRoll, regNumber, confidence, uncertainFields });
  });
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      isReadable: parsed.isReadable !== false,
      unreadableReason: typeof parsed.unreadableReason === 'string' ? parsed.unreadableReason : '',
      students,
      uncertainFields: Array.isArray(parsed.uncertainFields)
        ? parsed.uncertainFields.filter((f: any) => typeof f === 'string')
        : []
    }
  };
}

// ============================================================================
// BTEB RESULT GAZETTE — per-feature prompt, schema, validator
// ============================================================================

export const RESULT_JSON_SCHEMA: Record<string, unknown> = {
  type: 'OBJECT',
  properties: {
    isReadable: { type: 'BOOLEAN' },
    unreadableReason: { type: 'STRING' },
    institutes: { type: 'ARRAY', items: { type: 'STRING' } },
    entries: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          roll: { type: 'STRING' },
          status: { type: 'STRING' },
          gpa: { type: 'NUMBER' },
          referredSubjects: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                code: { type: 'STRING' },
                parts: { type: 'STRING' }
              },
              required: ['code']
            }
          }
        },
        required: ['roll', 'status']
      }
    }
  },
  required: ['isReadable', 'entries']
};

export function resultGazettePrompt(): string {
  return `Extract all Bangladesh Technical Education Board (BTEB) examination result entries verbatim from this document (result gazette / PDF).
Return ONLY strict JSON matching the requested schema — no markdown, no commentary, no extra fields.
CRITICAL RULES:
- Do not invent or alter any roll numbers, GPAs, or subject codes. Copy every digit exactly; convert Bangla digits to 0-9.
- institutes: institute header lines exactly as printed, e.g. "50118 - Dhaka Polytechnic Institute".
- entries: one object per student result row.
  - roll: the 6-digit board roll, digits only (e.g. "542880").
  - status: "PASSED" when a GPA is printed like "542880 (3.85)", "REFERRED" when referred subjects are printed like "542881 { 66662(T), 66664(T,P) }", "WITHHELD" when the result is withheld.
  - gpa: the GPA number for PASSED rows only (0.00–4.00, e.g. 3.85). Omit it for REFERRED/WITHHELD rows.
  - referredSubjects: for REFERRED rows only — each { code: the 5-digit subject code, parts: "T" (theory), "P" (practical), or "T,P" }.
- If the document is blank or unreadable, set isReadable=false, unreadableReason to why, and entries=[].`;
}

export interface ValidatedResultEntry {
  roll: string;
  status: 'PASSED' | 'REFERRED' | 'WITHHELD';
  gpa: number | null;
  referredSubjects: Array<{ code: string; parts: string }>;
}

export interface ValidatedResultGazette {
  isReadable: boolean;
  unreadableReason: string;
  institutes: string[];
  entries: ValidatedResultEntry[];
}

export function validateResultJson(parsed: unknown): ValidationResult<ValidatedResultGazette> {
  const errors: string[] = [];
  if (!isRecord(parsed)) return { ok: false, errors: ['response is not a JSON object'] };
  if (typeof parsed.isReadable !== 'boolean') errors.push('isReadable is missing or is not a boolean');
  if (!Array.isArray(parsed.entries)) {
    errors.push('entries is missing or is not an array');
    return { ok: false, errors };
  }
  if (parsed.entries.length === 0) errors.push('entries is empty — no BTEB result rows were extracted');
  const entries: ValidatedResultEntry[] = [];
  const seenRolls = new Set<string>();
  parsed.entries.forEach((e: any, i: number) => {
    const at = `entries[${i}]`;
    if (!isRecord(e)) {
      errors.push(`${at} is not an object`);
      return;
    }
    const roll = normalizeGeminiDigits(e.roll);
    if (!/^\d{6}$/.test(roll)) {
      errors.push(`${at}.roll ${JSON.stringify(e.roll)} is missing or is not a 6-digit BTEB roll`);
    } else if (seenRolls.has(roll)) {
      errors.push(`${at}.roll "${roll}" is a duplicate of an earlier row`);
    } else {
      seenRolls.add(roll);
    }
    const status = typeof e.status === 'string' ? e.status.trim().toUpperCase() : '';
    if (status !== 'PASSED' && status !== 'REFERRED' && status !== 'WITHHELD') {
      errors.push(`${at}.status ${JSON.stringify(e.status)} must be "PASSED", "REFERRED" or "WITHHELD"`);
      return;
    }
    let gpa: number | null = null;
    if (status === 'PASSED') {
      const g = typeof e.gpa === 'string' ? Number(normalizeGeminiDigits(e.gpa)) : Number(e.gpa);
      if (!Number.isFinite(g) || g < 0 || g > 4) {
        errors.push(`${at}.gpa ${JSON.stringify(e.gpa)} is missing or out of range 0.00–4.00 for a PASSED row`);
      } else {
        gpa = Math.round(g * 100) / 100;
      }
    }
    const referredSubjects: Array<{ code: string; parts: string }> = [];
    if (status === 'REFERRED') {
      if (!Array.isArray(e.referredSubjects) || e.referredSubjects.length === 0) {
        errors.push(`${at}.referredSubjects is missing or empty for a REFERRED row`);
      } else {
        e.referredSubjects.forEach((s: any, j: number) => {
          const code = normalizeGeminiDigits(s?.code);
          if (!/^\d{5}$/.test(code)) {
            errors.push(`${at}.referredSubjects[${j}].code ${JSON.stringify(s?.code)} is not a 5-digit subject code`);
            return;
          }
          const parts = typeof s?.parts === 'string' ? s.parts.trim().toUpperCase().replace(/\s+/g, '') : '';
          if (parts !== '' && parts !== 'T' && parts !== 'P' && parts !== 'T,P' && parts !== 'P,T') {
            errors.push(`${at}.referredSubjects[${j}].parts ${JSON.stringify(s?.parts)} must be "T", "P" or "T,P"`);
            return;
          }
          referredSubjects.push({ code, parts: parts === 'P,T' ? 'T,P' : parts || 'T' });
        });
      }
    }
    entries.push({ roll, status: status as ValidatedResultEntry['status'], gpa, referredSubjects });
  });
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      isReadable: parsed.isReadable !== false,
      unreadableReason: typeof parsed.unreadableReason === 'string' ? parsed.unreadableReason : '',
      institutes: Array.isArray(parsed.institutes)
        ? parsed.institutes.filter((x: any) => typeof x === 'string' && x.trim()).map((x: string) => x.trim())
        : [],
      entries
    }
  };
}

/**
 * Serialize validated gazette entries back to the canonical BTEB text format
 * (`542880 (3.85)` / `542881 { 66662(T), 66664(T,P) }`) so the existing
 * deterministic parser (`parseOfficialBtebContent`) stays the single source
 * of truth for conflicts, duplicates, and institute mapping.
 */
export function serializeBtebEntriesToText(entries: ValidatedResultEntry[], institutes: string[]): string {
  const lines: string[] = [];
  for (const inst of institutes) lines.push(inst);
  for (const e of entries) {
    if (e.status === 'PASSED' && e.gpa !== null) {
      lines.push(`${e.roll} (${e.gpa.toFixed(2)})`);
    } else if (e.status === 'REFERRED' && e.referredSubjects.length > 0) {
      const subs = e.referredSubjects.map(s => `${s.code}(${s.parts})`).join(', ');
      lines.push(`${e.roll} { ${subs} }`);
    } else {
      lines.push(`${e.roll} (${e.status})`);
    }
  }
  return lines.join('\n');
}

// ============================================================================
// GENERAL features (assignment / note / notice / job / captain_form / video)
// ============================================================================

export const GENERAL_JSON_SCHEMA: Record<string, unknown> = {
  type: 'OBJECT',
  properties: {
    isReadable: { type: 'BOOLEAN' },
    unreadableReason: { type: 'STRING' },
    rawExtractedText: { type: 'STRING' },
    title: { type: 'STRING' },
    subjectCode: { type: 'STRING' },
    subjectName: { type: 'STRING' },
    semester: { type: 'INTEGER' },
    chapter: { type: 'STRING' },
    dueDate: { type: 'STRING' },
    marks: { type: 'STRING' },
    teacherName: { type: 'STRING' },
    submissionMethod: { type: 'STRING' },
    instructions: { type: 'STRING' },
    questions: { type: 'ARRAY', items: { type: 'STRING' } },
    headings: { type: 'ARRAY', items: { type: 'STRING' } },
    tables: { type: 'ARRAY', items: { type: 'STRING' } },
    company: { type: 'STRING' },
    location: { type: 'STRING' },
    salary: { type: 'STRING' },
    studentName: { type: 'STRING' },
    boardRoll: { type: 'STRING' },
    regNumber: { type: 'STRING' },
    hasSignatureOrSeal: { type: 'BOOLEAN' },
    confidence: { type: 'STRING' },
    uncertainFields: { type: 'ARRAY', items: { type: 'STRING' } }
  },
  required: ['isReadable', 'rawExtractedText']
};

export function generalScanPrompt(feature: string): string {
  return `Extract all visible text verbatim (preserving both Bangla বাংলা and English text, numbers, BTEB 5-digit subject codes, dates, headings, and tables) from this document.
Return ONLY strict JSON matching the requested schema — no markdown, no commentary, no extra fields.
If the image is completely unreadable, blank, or corrupted, set isReadable=false, unreadableReason to why, and rawExtractedText="".
Also extract structured fields for feature "${feature}". Never invent information that is not visible: leave a field "" and list it in uncertainFields when it is not clearly readable.
confidence is "high" (all text clearly readable), "medium" (some words unclear), or "low" (much of the document is a guess — prefer "" over guessing).`;
}

export interface ValidatedGeneral {
  isReadable: boolean;
  unreadableReason: string;
  rawExtractedText: string;
  [key: string]: unknown;
}

export function validateGeneralJson(parsed: unknown): ValidationResult<ValidatedGeneral> {
  const errors: string[] = [];
  if (!isRecord(parsed)) return { ok: false, errors: ['response is not a JSON object'] };
  if (typeof parsed.isReadable !== 'boolean') errors.push('isReadable is missing or is not a boolean');
  if (typeof parsed.rawExtractedText !== 'string') errors.push('rawExtractedText is missing or is not a string');
  if (parsed.confidence !== undefined && parsed.confidence !== '' && !CONFIDENCES.includes(String(parsed.confidence))) {
    errors.push(`confidence ${JSON.stringify(parsed.confidence)} must be "high", "medium", "low" or "uncertain"`);
  }
  if (parsed.uncertainFields !== undefined && (!Array.isArray(parsed.uncertainFields) || parsed.uncertainFields.some((f: any) => typeof f !== 'string'))) {
    errors.push('uncertainFields must be an array of field-name strings');
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: { ...(parsed as Record<string, unknown>), isReadable: parsed.isReadable !== false } as ValidatedGeneral };
}
