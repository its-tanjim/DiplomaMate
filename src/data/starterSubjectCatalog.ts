import {
  SubjectCatalogRecord,
  SemesterNumber,
  CatalogRegulation,
  CatalogVerificationStatus
} from '../types';
import { TECHNOLOGIES_DIRECTORY } from './directoryData';
import { SEMESTER_CURRICULUM } from './mockData';
import { UPLOADED_DEPARTMENT_DATASETS } from './uploadedDepartmentDatasets';

/**
 * Parses a subject string like "Computer Architecture & Microprocessor (66661)"
 * into { code: "66661", name: "Computer Architecture & Microprocessor" }
 */
export function parseSubjectLabel(raw: string): { code: string; name: string } | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(.*?)\s*\((\d{4,6})\)\s*$/);
  if (match) {
    return {
      name: match[1].trim(),
      code: match[2].trim(),
    };
  }
  const leadingMatch = trimmed.match(/^(\d{4,6})\s*[-:]\s*(.+)$/);
  if (leadingMatch) {
    return {
      code: leadingMatch[1].trim(),
      name: leadingMatch[2].trim(),
    };
  }
  return null;
}

/**
 * Strictly matches a department name, technology key, shortCode, or BTEB department code
 * against the 19 canonical BTEB technologies without falling back to CST on unknown inputs.
 */
const DEPT_CODE_TO_TECH_ID: Record<string, string> = {
  '61': 'tech_architecture',
  '62': 'tech_automobile',
  '63': 'tech_chemical',
  '64': 'tech_civil',
  '66': 'tech_cst',
  '85': 'tech_cst',
  '67': 'tech_electrical',
  '68': 'tech_electronics',
  '69': 'tech_food',
  '70': 'tech_mechanical',
  '71': 'tech_power',
  '72': 'tech_rac',
  '73': 'tech_telecom',
  '94': 'tech_telecom',
  '84': 'tech_dtnt',
  '86': 'tech_electromedical',
  '87': 'tech_mechatronics',
  '88': 'tech_construction',
  '90': 'tech_environmental',
  '92': 'tech_instrumentation'
};

export function matchCanonicalTechnology(rawTech?: string, rawDeptCode?: string) {
  if (rawDeptCode) {
    const mappedId = DEPT_CODE_TO_TECH_ID[String(rawDeptCode).trim()];
    if (mappedId) {
      const found = TECHNOLOGIES_DIRECTORY.find((t) => t.id === mappedId);
      if (found) return found;
    }
  }
  if (!rawTech) return null;
  const q = rawTech.trim().toLowerCase();
  if (!q) return null;

  return (
    TECHNOLOGIES_DIRECTORY.find(
      (t) =>
        t.id.toLowerCase() === q ||
        t.name.toLowerCase() === q ||
        t.shortCode.toLowerCase() === q ||
        t.aliases.some((a) => a.toLowerCase() === q)
    ) ||
    TECHNOLOGIES_DIRECTORY.find(
      (t) => t.name.toLowerCase().includes(q) || q.includes(t.shortCode.toLowerCase())
    ) ||
    null
  );
}

/**
 * Parses a semester value such as 1, "1", "1st Semester", "Semester 8", etc. into 1..8
 */
export function parseSemesterNumber(rawSem: unknown): SemesterNumber | null {
  if (typeof rawSem === 'number' && Number.isInteger(rawSem) && rawSem >= 1 && rawSem <= 8) {
    return rawSem as SemesterNumber;
  }
  const str = String(rawSem ?? '').trim();
  if (!str) return null;
  const direct = Number(str);
  if (Number.isInteger(direct) && direct >= 1 && direct <= 8) {
    return direct as SemesterNumber;
  }
  const match = str.match(/(\d+)/);
  if (match) {
    const num = Number(match[1]);
    if (Number.isInteger(num) && num >= 1 && num <= 8) {
      return num as SemesterNumber;
    }
  }
  return null;
}

/**
 * Builds a deterministic, human-readable record ID that preserves distinct records
 * even when two 8th-semester subjects share the same subject code (e.g. Industrial Attachment & Project Presentation).
 */
export function buildCatalogRecordId(rec: {
  technology_key: string;
  regulation: CatalogRegulation;
  semester: SemesterNumber;
  subject_code: string;
  subject_name: string;
}): string {
  const slug = rec.subject_name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
  return `cat_${rec.technology_key}_${rec.regulation}_s${rec.semester}_${rec.subject_code}_${slug}`;
}

/**
 * Builds the composite idempotency key for a catalog record:
 * (technology_key, regulation, semester, subject_code, subject_name)
 * This guarantees:
 * 1. Both 8th-semester entries sharing a subject code ("Industrial Attachment" and "Project Presentation") are preserved.
 * 2. Re-importing the same dataset file is 100% idempotent and never creates duplicate records.
 */
export function buildCatalogCompositeKey(rec: {
  technology_key: string;
  regulation: CatalogRegulation;
  semester: SemesterNumber;
  subject_code: string;
  subject_name: string;
}): string {
  return `${rec.technology_key}|${rec.regulation}|${rec.semester}|${rec.subject_code.trim().toLowerCase()}|${rec.subject_name.trim().toLowerCase()}`;
}

/**
 * Builds the 535 verified Regulation 2022 subject records from the 10 uploaded department JSON datasets.
 */
export function buildUploaded2022DepartmentRecords(): SubjectCatalogRecord[] {
  const records: SubjectCatalogRecord[] = [];
  const now = '2026-10-24T00:00:00.000Z';

  for (const dept of UPLOADED_DEPARTMENT_DATASETS) {
    const matchedTech = matchCanonicalTechnology(dept.department_name, dept.department_code);
    if (!matchedTech) continue;

    const regulation: CatalogRegulation = dept.regulation === '2016' ? '2016' : '2022';

    for (const semObj of dept.semesters || []) {
      const semNum = parseSemesterNumber(semObj.semester);
      if (!semNum) continue;

      for (const subj of semObj.subjects || []) {
        const subject_code = String(subj.code || '').trim();
        const subject_name = String(subj.name || '').trim();
        if (!subject_code || !subject_name) continue;

        const credits =
          subj.credit !== undefined && subj.credit !== null && Number.isFinite(Number(subj.credit))
            ? Number(subj.credit)
            : null;
        const marks =
          subj.marks !== undefined && subj.marks !== null && Number.isFinite(Number(subj.marks))
            ? Number(subj.marks)
            : null;
        const theory_per_week =
          subj.theory_per_week !== undefined &&
          subj.theory_per_week !== null &&
          Number.isFinite(Number(subj.theory_per_week))
            ? Number(subj.theory_per_week)
            : null;
        const practical_per_week =
          subj.practical_per_week !== undefined &&
          subj.practical_per_week !== null &&
          Number.isFinite(Number(subj.practical_per_week))
            ? Number(subj.practical_per_week)
            : null;

        const baseRec = {
          technology_key: matchedTech.id,
          technology: matchedTech.name,
          department_code: dept.department_code || null,
          regulation,
          semester: semNum,
          subject_code,
          subject_name,
          subject_type: null,
          marks,
          credits,
          theory_per_week,
          practical_per_week,
          source_url: 'https://bteb.gov.bd',
          source_file: dept.source_file,
          verification_status: 'verified' as CatalogVerificationStatus,
          notes: `Published from ${dept.department_name} (${regulation} Regulation) dataset [${dept.source_file}].`,
          is_active: true,
          created_at: now,
          updated_at: now,
          updated_by: 'uploaded_department_dataset'
        };

        records.push({
          id: buildCatalogRecordId(baseRec),
          ...baseRec
        });
      }
    }
  }

  return records;
}

/**
 * Generates the complete Central Subject Catalog dataset:
 * 1. All 535 verified Regulation 2022 records from the 10 uploaded department JSON files
 *    (Architecture, Automobile, Chemical, Civil, Computer Science & Technology, Construction,
 *     Electrical, Electromedical, Electronics, Environmental — Semesters 1 to 8).
 *    Note: The remaining 9 technologies have 0 records in Regulation 2022 so they accurately display
 *    "Book list is not available for this selection yet." without inventing or borrowing subjects.
 * 2. Regulation 2016 starter records (marked 'verified' or 'provisional' for Semesters 1–6 of major technologies)
 *    to preserve 2016 Regulation curriculum support and provisional/verified governance workflows.
 */
export function buildStarterSubjectCatalog(): SubjectCatalogRecord[] {
  const records: SubjectCatalogRecord[] = [...buildUploaded2022DepartmentRecords()];
  const now = '2025-02-15T00:00:00.000Z';

  // Map of verified detailed subjects from SEMESTER_CURRICULUM (CST 2016)
  const detailedCstMap = new Map<
    string,
    {
      credits: number;
      totalMarks: number;
      type: string;
    }
  >();

  Object.entries(SEMESTER_CURRICULUM).forEach(([, subjects]) => {
    subjects.forEach((subj) => {
      detailedCstMap.set(subj.code, {
        credits: subj.credits,
        totalMarks: subj.totalMarks,
        type: subj.type,
      });
    });
  });

  // Seed Regulation 2016 entries for CST (Semesters 1..8) and major technologies (Semesters 1..6)
  TECHNOLOGIES_DIRECTORY.forEach((tech) => {
    if (!tech.semestersCurriculum) return;

    ([1, 2, 3, 4, 5, 6, 7, 8] as SemesterNumber[]).forEach((sem) => {
      const isMajorTech = [
        'tech_cst',
        'tech_civil',
        'tech_electrical',
        'tech_mechanical',
        'tech_electronics',
        'tech_architecture',
        'tech_automobile',
        'tech_power'
      ].includes(tech.id);
      if (!isMajorTech && sem >= 7) {
        return;
      }

      const list = tech.semestersCurriculum?.[sem] || [];
      list.forEach((rawStr) => {
        const parsed = parseSubjectLabel(rawStr);
        if (!parsed) return;
        const detail = tech.id === 'tech_cst' ? detailedCstMap.get(parsed.code) : undefined;
        const isCommonMathPhysicsEnglish = [
          '65911',
          '65912',
          '65913',
          '65711',
          '65712',
          '65921',
          '65922',
          '65722',
          '65931',
          '65851',
          '65852',
          '64054'
        ].includes(parsed.code);

        const status2016: CatalogVerificationStatus =
          (tech.id === 'tech_cst' && sem === 6 && detail) || isCommonMathPhysicsEnglish
            ? 'verified'
            : 'provisional';

        const rec2016 = {
          technology_key: tech.id,
          technology: tech.name,
          department_code: null,
          regulation: '2016' as CatalogRegulation,
          semester: sem,
          subject_code: parsed.code,
          subject_name: parsed.name,
          subject_type: detail ? detail.type : isCommonMathPhysicsEnglish ? 'Support' : 'Core',
          marks: detail ? detail.totalMarks : isCommonMathPhysicsEnglish ? 150 : null,
          credits: detail ? detail.credits : isCommonMathPhysicsEnglish ? 3 : null,
          theory_per_week: null,
          practical_per_week: null,
          source_url: 'https://bteb.gov.bd',
          source_file: 'starter-2016-catalog.json',
          verification_status: status2016,
          notes:
            status2016 === 'verified'
              ? 'Verified BTEB 2016 regulation subject code.'
              : 'Provisional 2016 starter dataset entry — requires administrator review.',
          is_active: true,
          created_at: now,
          updated_at: now,
          updated_by: 'starter_seed'
        };

        records.push({
          id: buildCatalogRecordId(rec2016),
          ...rec2016
        });
      });
    });
  });

  return records;
}

/**
 * Parses a raw JSON string, detecting and reporting recoverable syntax anomalies
 * (such as the missing comma after `"regulation": "2022"` in `Automobile_technology_9ce72436`)
 * without hiding the syntax warning.
 */
export function parseJsonPayloadWithSyntaxCheck(rawJsonText: string): {
  ok: boolean;
  payload?: unknown;
  syntaxWarnings: string[];
  error?: string;
} {
  const syntaxWarnings: string[] = [];
  try {
    const parsed = JSON.parse(rawJsonText);
    return { ok: true, payload: parsed, syntaxWarnings };
  } catch (err: any) {
    const originalMsg = err?.message || 'Unable to parse JSON payload.';
    // Check if the error is a missing comma between top-level string property and "semesters": [
    const repaired = rawJsonText.replace(
      /("regulation"\s*:\s*"[^"]+")(\s*\r?\n\s*"semesters"\s*:)/g,
      '$1,$2'
    );
    if (repaired !== rawJsonText) {
      try {
        const parsedRepaired = JSON.parse(repaired);
        syntaxWarnings.push(
          `Malformed JSON syntax detected: ${originalMsg} (missing comma after "regulation" property before "semesters" array). Flagged for review.`
        );
        return { ok: true, payload: parsedRepaired, syntaxWarnings };
      } catch {
        // fall through to error
      }
    }
    return {
      ok: false,
      syntaxWarnings,
      error: `Invalid JSON syntax: ${originalMsg}`
    };
  }
}

/**
 * Extracts flat candidate catalog record objects from any supported JSON structure:
 * 1. Hierarchical single department object: `{ department_name, department_code, regulation, semesters: [ { semester, subjects: [...] } ] }`
 * 2. Array of hierarchical department objects: `[ { department_name, semesters: [...] }, ... ]`
 * 3. Object wrapping `departments`, `records`, or `subjects`
 * 4. Flat array of `SubjectCatalogRecord` objects
 */
export function extractRawCatalogItemsFromPayload(rawPayload: unknown): {
  validStructure: boolean;
  items: Record<string, unknown>[];
  structureError?: string;
} {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return {
      validStructure: false,
      items: [],
      structureError: 'Payload must be a JSON object or array of subject catalog records.'
    };
  }

  const expandDepartmentObject = (deptObj: Record<string, unknown>): Record<string, unknown>[] => {
    const expanded: Record<string, unknown>[] = [];
    const deptName = deptObj.department_name || deptObj.technology || deptObj.technology_key;
    const deptCode = deptObj.department_code;
    const regulation = deptObj.regulation;
    const sourceFile = deptObj.source_file;
    const verificationStatus = deptObj.verification_status || 'verified';
    const semesters = deptObj.semesters;

    if (!Array.isArray(semesters)) return expanded;

    for (const semEntry of semesters) {
      if (!semEntry || typeof semEntry !== 'object') continue;
      const semObj = semEntry as Record<string, unknown>;
      const semLabel = semObj.semester;
      const subjects = semObj.subjects;
      if (!Array.isArray(subjects)) continue;

      for (const subjEntry of subjects) {
        if (!subjEntry || typeof subjEntry !== 'object') {
          expanded.push({ __malformed: true, raw: subjEntry });
          continue;
        }
        const s = subjEntry as Record<string, unknown>;
        expanded.push({
          technology: deptName,
          department_code: deptCode ?? null,
          regulation,
          semester: semLabel,
          subject_code: s.subject_code ?? s.code,
          subject_name: s.subject_name ?? s.name,
          subject_type: s.subject_type ?? null,
          credits: s.credits ?? s.credit ?? null,
          marks: s.marks ?? null,
          theory_per_week: s.theory_per_week ?? null,
          practical_per_week: s.practical_per_week ?? null,
          source_url: s.source_url ?? deptObj.source_url ?? 'https://bteb.gov.bd',
          source_file: s.source_file ?? sourceFile ?? null,
          verification_status: s.verification_status ?? verificationStatus,
          notes:
            s.notes ??
            (deptName
              ? `Imported from ${String(deptName)} (${String(regulation || '2022')} Regulation) dataset.`
              : null),
          is_active: s.is_active ?? true
        });
      }
    }
    return expanded;
  };

  // Case 1: Array (either array of department objects OR flat array of subject records)
  if (Array.isArray(rawPayload)) {
    const items: Record<string, unknown>[] = [];
    for (const elem of rawPayload) {
      if (elem && typeof elem === 'object' && Array.isArray((elem as any).semesters)) {
        items.push(...expandDepartmentObject(elem as Record<string, unknown>));
      } else {
        items.push(elem as Record<string, unknown>);
      }
    }
    return { validStructure: true, items };
  }

  const obj = rawPayload as Record<string, unknown>;

  // Case 2: Single hierarchical department object with `semesters` array
  if (Array.isArray(obj.semesters)) {
    return {
      validStructure: true,
      items: expandDepartmentObject(obj)
    };
  }

  // Case 3: Wrapper object with `departments`, `records`, or `subjects`
  if (Array.isArray(obj.departments)) {
    const items: Record<string, unknown>[] = [];
    for (const d of obj.departments) {
      if (d && typeof d === 'object' && Array.isArray((d as any).semesters)) {
        items.push(...expandDepartmentObject(d as Record<string, unknown>));
      }
    }
    return { validStructure: true, items };
  }

  if (Array.isArray(obj.records)) {
    return extractRawCatalogItemsFromPayload(obj.records);
  }

  if (Array.isArray(obj.subjects)) {
    return extractRawCatalogItemsFromPayload(obj.subjects);
  }

  return {
    validStructure: false,
    items: [],
    structureError:
      'Payload must be a department book-list JSON (with "department_name" and "semesters") or a JSON array of subject catalog records.'
  };
}

/**
 * Validates and normalizes an incoming raw catalog record.
 */
export function validateAndNormalizeCatalogRecord(
  raw: Record<string, unknown>,
  index: number
): { valid: true; record: Omit<SubjectCatalogRecord, 'id'> } | { valid: false; reason: string } {
  if (!raw || typeof raw !== 'object' || (raw as any).__malformed) {
    return { valid: false, reason: `Row ${index + 1}: Record must be a valid JSON object.` };
  }

  const rawTech = String(raw.technology_key || raw.technology || raw.department_name || '').trim();
  const rawDeptCode = raw.department_code ? String(raw.department_code).trim() : undefined;
  if (!rawTech && !rawDeptCode) {
    return { valid: false, reason: `Row ${index + 1}: Missing technology/department_name.` };
  }

  const matchedTech = matchCanonicalTechnology(rawTech, rawDeptCode);
  if (!matchedTech) {
    return {
      valid: false,
      reason: `Row ${index + 1}: Unrecognized technology/department "${rawTech || rawDeptCode}".`
    };
  }

  const rawReg = String(raw.regulation || '').trim();
  if (rawReg !== '2016' && rawReg !== '2022') {
    return {
      valid: false,
      reason: `Row ${index + 1}: Invalid regulation "${rawReg}". Must be "2016" or "2022".`
    };
  }
  const regulation: CatalogRegulation = rawReg;

  const semester = parseSemesterNumber(raw.semester);
  if (!semester) {
    return {
      valid: false,
      reason: `Row ${index + 1}: Invalid semester "${raw.semester}". Must correspond to semester 1 to 8.`
    };
  }

  const subject_code = String(raw.subject_code || raw.code || '').trim();
  if (!subject_code) {
    return { valid: false, reason: `Row ${index + 1}: Missing subject_code / code.` };
  }

  const subject_name = String(raw.subject_name || raw.name || '').trim();
  if (!subject_name) {
    return { valid: false, reason: `Row ${index + 1}: Missing subject_name / name.` };
  }

  const rawStatus = String(raw.verification_status || 'verified').trim().toLowerCase();
  const verification_status: CatalogVerificationStatus =
    rawStatus === 'verified'
      ? 'verified'
      : rawStatus === 'unverified'
      ? 'unverified'
      : 'provisional';

  const subject_type =
    raw.subject_type !== undefined &&
    raw.subject_type !== null &&
    String(raw.subject_type).trim() !== ''
      ? String(raw.subject_type).trim()
      : null;

  let marks: number | string | null = null;
  if (raw.marks !== undefined && raw.marks !== null && String(raw.marks).trim() !== '') {
    const numMarks = Number(raw.marks);
    marks = Number.isFinite(numMarks) ? numMarks : String(raw.marks).trim();
  }

  const rawCreditVal = raw.credits !== undefined && raw.credits !== null ? raw.credits : raw.credit;
  let credits: number | null = null;
  if (rawCreditVal !== undefined && rawCreditVal !== null && String(rawCreditVal).trim() !== '') {
    const numCredits = Number(rawCreditVal);
    if (Number.isFinite(numCredits)) credits = numCredits;
  }

  let theory_per_week: number | null = null;
  if (
    raw.theory_per_week !== undefined &&
    raw.theory_per_week !== null &&
    String(raw.theory_per_week).trim() !== ''
  ) {
    const numT = Number(raw.theory_per_week);
    if (Number.isFinite(numT)) theory_per_week = numT;
  }

  let practical_per_week: number | null = null;
  if (
    raw.practical_per_week !== undefined &&
    raw.practical_per_week !== null &&
    String(raw.practical_per_week).trim() !== ''
  ) {
    const numP = Number(raw.practical_per_week);
    if (Number.isFinite(numP)) practical_per_week = numP;
  }

  const department_code = rawDeptCode || null;
  const source_url = raw.source_url ? String(raw.source_url).trim() : null;
  const source_file = raw.source_file ? String(raw.source_file).trim() : null;
  const notes = raw.notes ? String(raw.notes).trim() : null;
  const is_active = raw.is_active === undefined ? true : Boolean(raw.is_active);

  return {
    valid: true,
    record: {
      technology_key: matchedTech.id,
      technology: matchedTech.name,
      department_code,
      regulation,
      semester,
      subject_code,
      subject_name,
      subject_type,
      marks,
      credits,
      theory_per_week,
      practical_per_week,
      source_url,
      source_file,
      verification_status,
      notes,
      is_active,
    },
  };
}
