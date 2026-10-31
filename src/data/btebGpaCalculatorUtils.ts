import {
  CalculatorRegulation,
  SemesterNumber,
  SubjectCatalogRecord,
  SubjectMarkInputEntry
} from '../types';

/**
 * Official BTEB 4.00 Uniform Grading Scale (Diploma in Engineering - Probidhan 2010, 2016, 2022)
 * Minimum passing threshold: 40% (Grade D, Grade Point 2.00). Below 40% is Grade F (0.00).
 */
export interface BtebGradeTier {
  minPercent: number;
  maxPercent: number;
  rangeLabel: string;
  letterGrade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'D' | 'F';
  gradePoint: number;
}

export const OFFICIAL_BTEB_GRADE_SCALE: BtebGradeTier[] = [
  { minPercent: 80, maxPercent: 100, rangeLabel: '80% – 100%', letterGrade: 'A+', gradePoint: 4.00 },
  { minPercent: 75, maxPercent: 79.9999, rangeLabel: '75% – <80%', letterGrade: 'A', gradePoint: 3.75 },
  { minPercent: 70, maxPercent: 74.9999, rangeLabel: '70% – <75%', letterGrade: 'A-', gradePoint: 3.50 },
  { minPercent: 65, maxPercent: 69.9999, rangeLabel: '65% – <70%', letterGrade: 'B+', gradePoint: 3.25 },
  { minPercent: 60, maxPercent: 64.9999, rangeLabel: '60% – <65%', letterGrade: 'B', gradePoint: 3.00 },
  { minPercent: 55, maxPercent: 59.9999, rangeLabel: '55% – <60%', letterGrade: 'B-', gradePoint: 2.75 },
  { minPercent: 50, maxPercent: 54.9999, rangeLabel: '50% – <55%', letterGrade: 'C+', gradePoint: 2.50 },
  { minPercent: 45, maxPercent: 49.9999, rangeLabel: '45% – <50%', letterGrade: 'C', gradePoint: 2.25 },
  { minPercent: 40, maxPercent: 44.9999, rangeLabel: '40% – <45%', letterGrade: 'D', gradePoint: 2.00 },
  { minPercent: 0, maxPercent: 39.9999, rangeLabel: 'Below 40% (<40%)', letterGrade: 'F', gradePoint: 0.00 }
];

/**
 * Provisional Reference Semester Weightages (%) across Semesters 1..8 for BTEB Regulations 2010, 2016, and 2022.
 * Note: Treated explicitly as provisional reference data until verified against an authoritative board circular.
 */
export interface RegulationSemesterWeightageTable {
  regulation: CalculatorRegulation;
  verificationStatus: 'provisional_reference';
  sourceNote: string;
  weightsPercent: Record<SemesterNumber, number>;
  weights: Record<SemesterNumber, number>;
}

export const PROVISIONAL_BTEB_SEMESTER_WEIGHTAGES: Record<
  CalculatorRegulation,
  RegulationSemesterWeightageTable
> = {
  '2010': {
    regulation: '2010',
    verificationStatus: 'provisional_reference',
    sourceNote:
      'Provisional reference semester weightages for BTEB Regulation 2010 (1st: 5%, 2nd: 5%, 3rd: 5%, 4th: 10%, 5th: 15%, 6th: 20%, 7th: 25%, 8th: 15%).',
    weightsPercent: { 1: 5, 2: 5, 3: 5, 4: 10, 5: 15, 6: 20, 7: 25, 8: 15 },
    weights: { 1: 5, 2: 5, 3: 5, 4: 10, 5: 15, 6: 20, 7: 25, 8: 15 }
  },
  '2016': {
    regulation: '2016',
    verificationStatus: 'provisional_reference',
    sourceNote:
      'Provisional reference semester weightages for BTEB Regulation 2016 (1st: 5%, 2nd: 5%, 3rd: 5%, 4th: 10%, 5th: 15%, 6th: 20%, 7th: 25%, 8th: 15%).',
    weightsPercent: { 1: 5, 2: 5, 3: 5, 4: 10, 5: 15, 6: 20, 7: 25, 8: 15 },
    weights: { 1: 5, 2: 5, 3: 5, 4: 10, 5: 15, 6: 20, 7: 25, 8: 15 }
  },
  '2022': {
    regulation: '2022',
    verificationStatus: 'provisional_reference',
    sourceNote:
      'Provisional reference semester weightages for BTEB Regulation 2022 (1st: 5%, 2nd: 5%, 3rd: 10%, 4th: 10%, 5th: 20%, 6th: 20%, 7th: 20%, 8th: 10%).',
    weightsPercent: { 1: 5, 2: 5, 3: 10, 4: 10, 5: 20, 6: 20, 7: 20, 8: 10 },
    weights: { 1: 5, 2: 5, 3: 10, 4: 10, 5: 20, 6: 20, 7: 20, 8: 10 }
  }
};

/**
 * Evaluates a percentage (0..100) against the official BTEB 4.00 grading scale.
 */
export function evaluateBtebPercentage(percentage: number): {
  percentage: number;
  letterGrade: string;
  gradePoint: number;
  isPassed: boolean;
} {
  const clamped = Math.max(0, Math.min(100, Number(percentage)));
  for (const tier of OFFICIAL_BTEB_GRADE_SCALE) {
    if (clamped >= tier.minPercent) {
      return {
        percentage: Number(clamped.toFixed(2)),
        letterGrade: tier.letterGrade,
        gradePoint: tier.gradePoint,
        isPassed: tier.gradePoint >= 2.0
      };
    }
  }
  return {
    percentage: Number(clamped.toFixed(2)),
    letterGrade: 'F',
    gradePoint: 0.0,
    isPassed: false
  };
}

/**
 * Evaluates obtained marks out of full marks using the BTEB grading scale.
 */
export function evaluateBtebMarks(
  obtainedMarks: number,
  fullMarks: number
): {
  valid: boolean;
  error?: string;
  percentage: number | null;
  letterGrade: string | null;
  gradePoint: number | null;
  isPassed: boolean;
} {
  if (!Number.isFinite(fullMarks) || fullMarks <= 0) {
    return {
      valid: false,
      error: 'Full marks must be a positive number.',
      percentage: null,
      letterGrade: null,
      gradePoint: null,
      isPassed: false
    };
  }
  if (!Number.isFinite(obtainedMarks) || obtainedMarks < 0) {
    return {
      valid: false,
      error: 'Obtained marks cannot be negative.',
      percentage: null,
      letterGrade: null,
      gradePoint: null,
      isPassed: false
    };
  }
  if (obtainedMarks > fullMarks) {
    return {
      valid: false,
      error: `Obtained marks (${obtainedMarks}) cannot exceed subject full marks (${fullMarks}).`,
      percentage: null,
      letterGrade: null,
      gradePoint: null,
      isPassed: false
    };
  }

  const pct = (obtainedMarks / fullMarks) * 100;
  const graded = evaluateBtebPercentage(pct);
  return {
    valid: true,
    percentage: graded.percentage,
    letterGrade: graded.letterGrade,
    gradePoint: graded.gradePoint,
    isPassed: graded.isPassed
  };
}

/**
 * Updates an individual SubjectMarkInputEntry when user enters obtainedMarks, effectiveFullMarks, or effectiveCredits.
 */
export function updateSubjectMarkEntry(
  entry: SubjectMarkInputEntry,
  updates: Partial<SubjectMarkInputEntry>
): SubjectMarkInputEntry {
  const next: SubjectMarkInputEntry = {
    ...entry,
    ...updates
  };

  next.isFullMarksProvisional =
    updates.isFullMarksProvisional !== undefined
      ? updates.isFullMarksProvisional
      : next.catalogFullMarks === null && next.effectiveFullMarks !== null;

  next.isCreditsProvisional =
    updates.isCreditsProvisional !== undefined
      ? updates.isCreditsProvisional
      : next.catalogCredits === null && next.effectiveCredits !== null;

  next.marksSource =
    next.catalogFullMarks !== null
      ? 'catalog_verified'
      : next.effectiveFullMarks !== null
      ? 'user_provisional'
      : 'missing';

  next.creditsSource =
    next.catalogCredits !== null
      ? 'catalog_verified'
      : next.effectiveCredits !== null
      ? 'user_provisional'
      : 'missing';

  if (next.obtainedMarks === null || next.obtainedMarks === undefined) {
    next.percentage = null;
    next.letterGrade = null;
    next.gradePoint = null;
    next.weightedPoints = null;
    next.error = null;
    return next;
  }

  if (!next.effectiveFullMarks || next.effectiveFullMarks <= 0) {
    next.percentage = null;
    next.letterGrade = null;
    next.gradePoint = null;
    next.weightedPoints = null;
    next.error = 'Please set Full Marks first to calculate percentage & grade.';
    return next;
  }

  const evalRes = evaluateBtebMarks(Number(next.obtainedMarks), Number(next.effectiveFullMarks));
  if (!evalRes.valid) {
    next.percentage = null;
    next.letterGrade = null;
    next.gradePoint = null;
    next.weightedPoints = null;
    next.error = evalRes.error || 'Invalid marks';
    return next;
  }

  next.percentage = evalRes.percentage;
  next.letterGrade = evalRes.letterGrade;
  next.gradePoint = evalRes.gradePoint;
  next.weightedPoints =
    next.effectiveCredits && evalRes.gradePoint !== null
      ? Number((next.effectiveCredits * evalRes.gradePoint).toFixed(4))
      : null;
  next.error = null;
  return next;
}

/**
 * Builds initial SubjectMarkInputEntry rows from Central Subject Catalog records,
 * merging any saved user entries if present.
 * Never invents missing credits or full marks silently — tracks exact source ('catalog_verified' | 'missing').
 */
export function initializeSubjectMarkEntriesFromCatalog(
  catalogRecords: SubjectCatalogRecord[],
  savedEntries?: SubjectMarkInputEntry[]
): SubjectMarkInputEntry[] {
  const savedMap = new Map<string, SubjectMarkInputEntry>();
  if (Array.isArray(savedEntries)) {
    for (const s of savedEntries) {
      if (s && s.subjectCode) {
        savedMap.set(s.subjectCode.trim().toLowerCase(), s);
      }
    }
  }

  return catalogRecords.map((rec) => {
    const hasCatalogCredits =
      typeof rec.credits === 'number' && Number.isFinite(rec.credits) && rec.credits > 0;
    const numericCatalogMarks =
      rec.marks !== null && rec.marks !== undefined && String(rec.marks).trim() !== ''
        ? Number(rec.marks)
        : NaN;
    const hasCatalogMarks = Number.isFinite(numericCatalogMarks) && numericCatalogMarks > 0;

    const saved = savedMap.get(rec.subject_code.trim().toLowerCase());

    const baseEntry: SubjectMarkInputEntry = {
      subjectId: rec.id,
      subjectCode: rec.subject_code,
      subjectName: rec.subject_name,
      catalogCredits: hasCatalogCredits ? Number(rec.credits) : null,
      catalogFullMarks: hasCatalogMarks ? numericCatalogMarks : null,
      effectiveCredits: hasCatalogCredits
        ? Number(rec.credits)
        : saved?.effectiveCredits ?? null,
      effectiveFullMarks: hasCatalogMarks
        ? numericCatalogMarks
        : saved?.effectiveFullMarks ?? null,
      creditsSource: hasCatalogCredits
        ? 'catalog_verified'
        : saved?.effectiveCredits
        ? 'user_provisional'
        : 'missing',
      marksSource: hasCatalogMarks
        ? 'catalog_verified'
        : saved?.effectiveFullMarks
        ? 'user_provisional'
        : 'missing',
      isCreditsProvisional: !hasCatalogCredits && Boolean(saved?.effectiveCredits),
      isFullMarksProvisional: !hasCatalogMarks && Boolean(saved?.effectiveFullMarks),
      verificationStatus: rec.verification_status,
      obtainedMarks: saved?.obtainedMarks ?? null,
      percentage: null,
      letterGrade: null,
      gradePoint: null,
      weightedPoints: null,
      error: null
    };

    if (baseEntry.obtainedMarks !== null) {
      return updateSubjectMarkEntry(baseEntry, { obtainedMarks: baseEntry.obtainedMarks });
    }
    return baseEntry;
  });
}

export interface SemesterGpaCalculationSummary {
  entries: SubjectMarkInputEntry[];
  totalSubjectsCount: number;
  totalCatalogSubjects: number;
  completedSubjectsCount: number;
  evaluatedSubjectCount: number;
  missingMarksSubjectsCount: number;
  missingCreditsSubjectsCount: number;
  missingFullMarksSubjectsCount: number;
  provisionalInputsCount: number;
  failedSubjects: { code: string; name: string; obtainedMarks: number | null; fullMarks: number | null }[];
  hasFailedSubject: boolean;
  totalCredits: number;
  totalCreditsCounted: number;
  totalWeightedPoints: number;
  semesterGpa: number | null;
  semesterLetterGrade: string | null;
  conditionalGpaEstimate: number | null;
  status: 'INCOMPLETE' | 'PASSED' | 'REFERRED_FAIL' | 'NO_SUBJECTS';
  isEstimate: boolean;
  limitations: string[];
}

function getLetterGradeFromGpa(gpa: number | null, hasFailed: boolean): string | null {
  if (gpa === null) return null;
  if (hasFailed || gpa < 2.0) return 'F';
  if (gpa >= 4.0) return 'A+';
  if (gpa >= 3.75) return 'A';
  if (gpa >= 3.5) return 'A-';
  if (gpa >= 3.25) return 'B+';
  if (gpa >= 3.0) return 'B';
  if (gpa >= 2.75) return 'B-';
  if (gpa >= 2.5) return 'C+';
  if (gpa >= 2.25) return 'C';
  return 'D';
}

/**
 * Computes subject-wise grades, grade points, and credit-weighted Semester GPA:
 * Formula: sum(Credit_i * GP_i) / sum(Credit_i)
 */
export function calculateSemesterGpaSummary(
  rawEntries: SubjectMarkInputEntry[]
): SemesterGpaCalculationSummary {
  if (!Array.isArray(rawEntries) || rawEntries.length === 0) {
    return {
      entries: [],
      totalSubjectsCount: 0,
      totalCatalogSubjects: 0,
      completedSubjectsCount: 0,
      evaluatedSubjectCount: 0,
      missingMarksSubjectsCount: 0,
      missingCreditsSubjectsCount: 0,
      missingFullMarksSubjectsCount: 0,
      provisionalInputsCount: 0,
      failedSubjects: [],
      hasFailedSubject: false,
      totalCredits: 0,
      totalCreditsCounted: 0,
      totalWeightedPoints: 0,
      semesterGpa: null,
      semesterLetterGrade: null,
      conditionalGpaEstimate: null,
      status: 'NO_SUBJECTS',
      isEstimate: true,
      limitations: ['No catalog subjects are loaded for this selection.']
    };
  }

  let completedSubjectsCount = 0;
  let missingMarksSubjectsCount = 0;
  let missingCreditsSubjectsCount = 0;
  let missingFullMarksSubjectsCount = 0;
  let provisionalInputsCount = 0;
  let totalCredits = 0;
  let totalWeightedPoints = 0;
  let enteredCreditsSum = 0;
  let enteredWeightedPointsSum = 0;

  const failedSubjects: {
    code: string;
    name: string;
    obtainedMarks: number | null;
    fullMarks: number | null;
  }[] = [];

  const computedEntries: SubjectMarkInputEntry[] = rawEntries.map((item) => {
    const effCredits =
      typeof item.effectiveCredits === 'number' &&
      Number.isFinite(item.effectiveCredits) &&
      item.effectiveCredits > 0
        ? item.effectiveCredits
        : null;

    const effFullMarks =
      typeof item.effectiveFullMarks === 'number' &&
      Number.isFinite(item.effectiveFullMarks) &&
      item.effectiveFullMarks > 0
        ? item.effectiveFullMarks
        : null;

    if (effCredits === null) {
      missingCreditsSubjectsCount++;
    } else {
      totalCredits += effCredits;
    }

    if (effFullMarks === null) {
      missingFullMarksSubjectsCount++;
    }

    if (
      item.creditsSource === 'user_provisional' ||
      item.marksSource === 'user_provisional' ||
      item.isFullMarksProvisional ||
      item.isCreditsProvisional
    ) {
      provisionalInputsCount++;
    }

    const hasObtained =
      item.obtainedMarks !== null &&
      item.obtainedMarks !== undefined &&
      Number.isFinite(Number(item.obtainedMarks));

    if (!hasObtained || effFullMarks === null) {
      missingMarksSubjectsCount++;
      return {
        ...item,
        effectiveCredits: effCredits,
        effectiveFullMarks: effFullMarks,
        percentage: null,
        letterGrade: null,
        gradePoint: null,
        weightedPoints: null
      };
    }

    const evalRes = evaluateBtebMarks(Number(item.obtainedMarks), effFullMarks);
    if (!evalRes.valid || evalRes.gradePoint === null) {
      missingMarksSubjectsCount++;
      return {
        ...item,
        effectiveCredits: effCredits,
        effectiveFullMarks: effFullMarks,
        percentage: null,
        letterGrade: null,
        gradePoint: null,
        weightedPoints: null,
        error: evalRes.error || null
      };
    }

    completedSubjectsCount++;
    if (!evalRes.isPassed) {
      failedSubjects.push({
        code: item.subjectCode,
        name: item.subjectName,
        obtainedMarks: Number(item.obtainedMarks),
        fullMarks: effFullMarks
      });
    }

    const weightedPts =
      effCredits !== null ? Number((effCredits * evalRes.gradePoint).toFixed(4)) : null;

    if (effCredits !== null && weightedPts !== null) {
      totalWeightedPoints += weightedPts;
      enteredCreditsSum += effCredits;
      enteredWeightedPointsSum += weightedPts;
    }

    return {
      ...item,
      effectiveCredits: effCredits,
      effectiveFullMarks: effFullMarks,
      percentage: evalRes.percentage,
      letterGrade: evalRes.letterGrade,
      gradePoint: evalRes.gradePoint,
      weightedPoints: weightedPts,
      error: null
    };
  });

  const limitations: string[] = [];

  if (missingFullMarksSubjectsCount > 0) {
    limitations.push(
      `${missingFullMarksSubjectsCount} subject(s) in this catalog dataset do not have verified full marks. Enter provisional full marks (or use BTEB standard 50 marks/credit) to estimate grades.`
    );
  }
  if (missingCreditsSubjectsCount > 0) {
    limitations.push(
      `${missingCreditsSubjectsCount} subject(s) in this catalog dataset do not have verified credit hours. Credit-weighted GPA requires credit values for all subjects.`
    );
  }
  if (provisionalInputsCount > 0) {
    limitations.push(
      `${provisionalInputsCount} subject(s) use provisional full marks or credits not explicitly stored in the raw catalog JSON. Results are labeled as an Estimate.`
    );
  }
  if (missingMarksSubjectsCount > 0 && completedSubjectsCount > 0) {
    limitations.push(
      `Marks have been entered for ${completedSubjectsCount} of ${rawEntries.length} subjects (${missingMarksSubjectsCount} remaining). Showing partial estimate for entered subjects.`
    );
  }

  const allComplete =
    completedSubjectsCount === rawEntries.length &&
    missingCreditsSubjectsCount === 0 &&
    missingFullMarksSubjectsCount === 0 &&
    totalCredits > 0;

  const conditionalGpaEstimate =
    enteredCreditsSum > 0
      ? Number((enteredWeightedPointsSum / enteredCreditsSum).toFixed(2))
      : null;

  const hasFailedSubject = failedSubjects.length > 0;
  let semesterGpa: number | null = null;
  let status: 'INCOMPLETE' | 'PASSED' | 'REFERRED_FAIL' = 'INCOMPLETE';

  if (completedSubjectsCount > 0 && enteredCreditsSum > 0) {
    if (hasFailedSubject) {
      status = 'REFERRED_FAIL';
      semesterGpa = 0.0;
      limitations.push(
        `Referred (F) in ${failedSubjects.length} subject(s): ${failedSubjects
          .map((f) => `${f.name} (${f.code})`)
          .join(', ')}. Under BTEB rules, failing any subject (<40%) results in 0.00 (Referred) until cleared.`
      );
    } else {
      status = allComplete ? 'PASSED' : 'INCOMPLETE';
      semesterGpa = Number((enteredWeightedPointsSum / enteredCreditsSum).toFixed(2));
    }
  }

  const isEstimate =
    !allComplete || provisionalInputsCount > 0 || hasFailedSubject;

  const semesterLetterGrade = getLetterGradeFromGpa(semesterGpa, hasFailedSubject);

  return {
    entries: computedEntries,
    totalSubjectsCount: rawEntries.length,
    totalCatalogSubjects: rawEntries.length,
    completedSubjectsCount,
    evaluatedSubjectCount: completedSubjectsCount,
    missingMarksSubjectsCount,
    missingCreditsSubjectsCount,
    missingFullMarksSubjectsCount,
    provisionalInputsCount,
    failedSubjects,
    hasFailedSubject,
    totalCredits: Number(totalCredits.toFixed(2)),
    totalCreditsCounted: Number(enteredCreditsSum.toFixed(2)),
    totalWeightedPoints: Number(totalWeightedPoints.toFixed(2)),
    semesterGpa,
    semesterLetterGrade,
    conditionalGpaEstimate,
    status,
    isEstimate,
    limitations
  };
}

export interface CgpaCalculationSummary {
  regulation: CalculatorRegulation;
  weightageVerificationStatus: 'provisional_reference';
  weightageNote: string;
  weightsPercent: Record<SemesterNumber, number>;
  completedSemesters: SemesterNumber[];
  completedSemestersCount: number;
  missingSemesters: SemesterNumber[];
  referredSemesters: SemesterNumber[];
  completedWeightPercent: number;
  totalWeightCovered: number;
  full8SemesterWeightedCgpa: number | null;
  estimatedCumulativeCgpa: number | null;
  weightedCgpa: number | null;
  unweightedArithmeticMean: number | null;
  arithmeticMeanGpa: number | null;
  semesterBreakdown: {
    semester: SemesterNumber;
    weightPercent: number;
    gpa: number | null;
    weightedContribution: number | null;
  }[];
  isEstimate: boolean;
  limitations: string[];
}

/**
 * Calculates BTEB Cumulative Grade Point Average (CGPA) across Semesters 1..8
 * using the regulation-specific semester weightages (2010, 2016, 2022) rather than a simple arithmetic average.
 */
export function calculateWeightedBtebCgpa(
  semesterGpasOrParams:
    | Partial<Record<SemesterNumber, number | null | { gpa: number | null; isEstimate?: boolean }>>
    | {
        regulation: CalculatorRegulation;
        semesterGpas: Partial<Record<SemesterNumber, number | null | { gpa: number | null; isEstimate?: boolean }>>;
      },
  regulationArg: CalculatorRegulation = '2022'
): CgpaCalculationSummary {
  let regulation: CalculatorRegulation = regulationArg;
  let rawMap: Partial<Record<SemesterNumber, number | null | { gpa: number | null; isEstimate?: boolean }>> = {};

  if (
    semesterGpasOrParams &&
    typeof semesterGpasOrParams === 'object' &&
    'semesterGpas' in semesterGpasOrParams
  ) {
    regulation = semesterGpasOrParams.regulation || '2022';
    rawMap = semesterGpasOrParams.semesterGpas || {};
  } else {
    rawMap = (semesterGpasOrParams as any) || {};
  }

  const regKey: CalculatorRegulation = ['2010', '2016', '2022'].includes(regulation)
    ? regulation
    : '2022';
  const weightTable = PROVISIONAL_BTEB_SEMESTER_WEIGHTAGES[regKey];
  const weights = weightTable.weightsPercent;

  const completedSemesters: SemesterNumber[] = [];
  const missingSemesters: SemesterNumber[] = [];
  const referredSemesters: SemesterNumber[] = [];
  let completedWeightPercent = 0;
  let weightedSum = 0;
  let arithmeticSum = 0;

  const semesterBreakdown = ([1, 2, 3, 4, 5, 6, 7, 8] as SemesterNumber[]).map((sem) => {
    const w = weights[sem];
    const entry = rawMap[sem];
    const rawVal =
      entry !== null && typeof entry === 'object' && 'gpa' in entry
        ? entry.gpa
        : (entry as number | null | undefined);

    const hasGpa =
      rawVal !== null &&
      rawVal !== undefined &&
      String(rawVal).trim() !== '' &&
      Number.isFinite(Number(rawVal)) &&
      Number(rawVal) >= 0 &&
      Number(rawVal) <= 4.0;

    if (!hasGpa) {
      missingSemesters.push(sem);
      return {
        semester: sem,
        weightPercent: w,
        gpa: null,
        weightedContribution: null
      };
    }

    const gpaNum = Number(Number(rawVal).toFixed(2));
    completedSemesters.push(sem);
    if (gpaNum < 2.0) {
      referredSemesters.push(sem);
    }
    completedWeightPercent += w;
    const contribution = (gpaNum * w) / 100;
    weightedSum += contribution;
    arithmeticSum += gpaNum;

    return {
      semester: sem,
      weightPercent: w,
      gpa: gpaNum,
      weightedContribution: Number(contribution.toFixed(4))
    };
  });

  const limitations: string[] = [
    `${weightTable.sourceNote} Treated as provisional reference weightages — calculated CGPA is labeled as an Estimate.`
  ];

  if (missingSemesters.length > 0 && completedSemesters.length > 0) {
    limitations.push(
      `Only ${completedSemesters.length} of 8 semesters (${completedWeightPercent}% of 100% total weightage) have GPA entries. Missing Semesters: ${missingSemesters.join(
        ', '
      )}. Official final Diploma CGPA requires all 8 semesters.`
    );
  } else if (completedSemesters.length === 0) {
    limitations.push('Enter or save at least one semester GPA to calculate cumulative standing.');
  }

  if (referredSemesters.length > 0) {
    limitations.push(
      `Semester(s) ${referredSemesters.join(
        ', '
      )} have a GPA below the 2.00 passing threshold (0.00 / Referred). All 8 semesters must be passed (>= 2.00) for a final passing Diploma CGPA.`
    );
  }

  const all8Passed =
    completedSemesters.length === 8 &&
    referredSemesters.length === 0 &&
    completedWeightPercent === 100;

  const full8SemesterWeightedCgpa = all8Passed ? Number(weightedSum.toFixed(2)) : null;

  const estimatedCumulativeCgpa =
    completedWeightPercent > 0 && referredSemesters.length === 0
      ? Number(((weightedSum * 100) / completedWeightPercent).toFixed(2))
      : referredSemesters.length > 0
      ? 0.0
      : null;

  const unweightedArithmeticMean =
    completedSemesters.length > 0
      ? Number((arithmeticSum / completedSemesters.length).toFixed(2))
      : null;

  const weightedCgpa =
    full8SemesterWeightedCgpa !== null ? full8SemesterWeightedCgpa : estimatedCumulativeCgpa;

  return {
    regulation: regKey,
    weightageVerificationStatus: 'provisional_reference',
    weightageNote: weightTable.sourceNote,
    weightsPercent: weights,
    completedSemesters,
    completedSemestersCount: completedSemesters.length,
    missingSemesters,
    referredSemesters,
    completedWeightPercent,
    totalWeightCovered: completedWeightPercent,
    full8SemesterWeightedCgpa,
    estimatedCumulativeCgpa,
    weightedCgpa,
    unweightedArithmeticMean,
    arithmeticMeanGpa: unweightedArithmeticMean,
    semesterBreakdown,
    isEstimate: true, // Always labeled as an estimate because semester weightages are provisional reference data or <8 semesters
    limitations
  };
}
