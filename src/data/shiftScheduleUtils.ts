import {
  Shift,
  ShiftScheduleConfig,
  PeriodSlotConfig,
  PeriodBreakConfig,
  SemesterNumber,
  Section
} from '../types';

export const SHIFT_DEFAULT_START_TIME: Record<Shift, string> = {
  Morning: '08:00 AM',
  Day: '01:30 PM'
};

export const DEFAULT_PERIOD_DURATION_MINUTES = 45;
export const DEFAULT_NUMBER_OF_PERIODS = 7;

/**
 * Parses a 12-hour time string (e.g. "08:00 AM", "01:30 PM") or 24-hour string ("13:30")
 * into minutes since midnight (0..1439).
 */
export function parseTime12hToMinutes(timeStr: string, fallbackShift: Shift = 'Morning'): number {
  const defaultStr = SHIFT_DEFAULT_START_TIME[fallbackShift];
  const raw = (timeStr || defaultStr).trim();

  // Match 12-hour format: HH:MM AM/PM
  const match12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const minute = Math.min(59, Math.max(0, parseInt(match12[2], 10)));
    const meridiem = match12[3].toUpperCase();
    if (hour === 12) {
      hour = meridiem === 'AM' ? 0 : 12;
    } else if (meridiem === 'PM') {
      hour += 12;
    }
    return hour * 60 + minute;
  }

  // Match 24-hour format: HH:MM
  const match24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hour = Math.min(23, Math.max(0, parseInt(match24[1], 10)));
    const minute = Math.min(59, Math.max(0, parseInt(match24[2], 10)));
    return hour * 60 + minute;
  }

  return fallbackShift === 'Day' ? 13 * 60 + 30 : 8 * 60;
}

/**
 * Formats minutes since midnight into canonical "HH:MM AM/PM" (e.g. "08:00 AM", "01:30 PM").
 */
export function formatMinutesToTime12h(totalMinutes: number): string {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const meridiem: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;
  const hh = hour12 < 10 ? `0${hour12}` : `${hour12}`;
  const mm = minute < 10 ? `0${minute}` : `${minute}`;
  return `${hh}:${mm} ${meridiem}`;
}

/**
 * Adds a duration in minutes to a 12-hour time string and returns the new 12-hour time string.
 */
export function addMinutesToTime12h(timeStr: string, minutesToAdd: number, fallbackShift: Shift = 'Morning'): string {
  const startMins = parseTime12hToMinutes(timeStr, fallbackShift);
  return formatMinutesToTime12h(startMins + minutesToAdd);
}

/**
 * Alias for addMinutesToTime12h used across components.
 */
export function addMinutesToTimeString(timeStr: string, minutesToAdd: number, fallbackShift: Shift = 'Morning'): string {
  return addMinutesToTime12h(timeStr, minutesToAdd, fallbackShift);
}

/**
 * Computes positive duration in minutes between two 12-hour time strings.
 */
export function calculateDurationMinutesBetween(
  startStr: string,
  endStr: string,
  fallbackDuration = DEFAULT_PERIOD_DURATION_MINUTES
): number {
  const startMins = parseTime12hToMinutes(startStr);
  const endMins = parseTime12hToMinutes(endStr);
  const diff = endMins - startMins;
  if (diff > 0 && diff <= 360) return diff;
  return fallbackDuration;
}

/**
 * Generates sequential period slots from shift configuration while preserving
 * any period that has `isManuallyEdited === true` unless `forceResetManual === true` or `forceResetAllManual === true`.
 */
export function recalculateShiftSchedulePeriods(
  config: {
    shift?: Shift;
    firstPeriodStartTime?: string;
    defaultDurationMinutes?: number;
    numberOfPeriods?: number;
    breaks?: PeriodBreakConfig[];
    periods?: PeriodSlotConfig[];
    existingPeriods?: PeriodSlotConfig[];
    forceResetAllManual?: boolean;
  },
  options?: { forceResetManual?: boolean }
): PeriodSlotConfig[] {
  const shift: Shift = config.shift === 'Day' ? 'Day' : 'Morning';
  const firstStart = (config.firstPeriodStartTime || SHIFT_DEFAULT_START_TIME[shift]).trim();
  const defaultDuration =
    typeof config.defaultDurationMinutes === 'number' &&
    Number.isFinite(config.defaultDurationMinutes) &&
    config.defaultDurationMinutes >= 5 &&
    config.defaultDurationMinutes <= 300
      ? Math.round(config.defaultDurationMinutes)
      : DEFAULT_PERIOD_DURATION_MINUTES;

  const numPeriods =
    typeof config.numberOfPeriods === 'number' &&
    Number.isInteger(config.numberOfPeriods) &&
    config.numberOfPeriods >= 1 &&
    config.numberOfPeriods <= 12
      ? config.numberOfPeriods
      : DEFAULT_NUMBER_OF_PERIODS;

  const forceReset = Boolean(options?.forceResetManual || config.forceResetAllManual);
  const sourcePeriods = Array.isArray(config.existingPeriods)
    ? config.existingPeriods
    : Array.isArray(config.periods)
    ? config.periods
    : [];

  const existingMap = new Map<number, PeriodSlotConfig>();
  for (const p of sourcePeriods) {
    if (p && typeof p.periodNumber === 'number') {
      existingMap.set(p.periodNumber, p);
    }
  }

  const breakMap = new Map<number, PeriodBreakConfig>();
  if (Array.isArray(config.breaks)) {
    for (const b of config.breaks) {
      const targetPeriod = b?.afterPeriodNumber ?? b?.afterPeriod;
      if (b && typeof targetPeriod === 'number' && b.durationMinutes >= 0) {
        breakMap.set(targetPeriod, b);
      }
    }
  }

  const result: PeriodSlotConfig[] = [];
  let cursorMinutes = parseTime12hToMinutes(firstStart, shift);

  for (let pNum = 1; pNum <= numPeriods; pNum++) {
    const prevSlot = existingMap.get(pNum);
    const configuredBreak = breakMap.get(pNum);
    const breakMins =
      configuredBreak !== undefined
        ? Math.max(0, Math.round(configuredBreak.durationMinutes))
        : !forceReset && prevSlot && typeof prevSlot.breakAfterMinutes === 'number'
        ? Math.max(0, Math.round(prevSlot.breakAfterMinutes))
        : 0;
    const breakLabel = configuredBreak?.label || prevSlot?.breakLabel;

    if (!forceReset && prevSlot && prevSlot.isManuallyEdited) {
      // Preserve manually edited start and end times
      const manualStart = prevSlot.startTime || formatMinutesToTime12h(cursorMinutes);
      const manualEnd =
        prevSlot.endTime || addMinutesToTime12h(manualStart, prevSlot.durationMinutes || defaultDuration, shift);
      const manualDuration = calculateDurationMinutesBetween(
        manualStart,
        manualEnd,
        prevSlot.durationMinutes || defaultDuration
      );

      result.push({
        periodNumber: pNum,
        startTime: manualStart,
        endTime: manualEnd,
        durationMinutes: manualDuration,
        isManuallyEdited: true,
        breakAfterMinutes: breakMins,
        ...(breakLabel ? { breakLabel } : {})
      });

      cursorMinutes = parseTime12hToMinutes(manualEnd, shift) + breakMins;
    } else {
      // Calculate suggested start and end time from cursorMinutes and defaultDuration
      const suggestedStart = formatMinutesToTime12h(cursorMinutes);
      const suggestedEnd = formatMinutesToTime12h(cursorMinutes + defaultDuration);

      result.push({
        periodNumber: pNum,
        startTime: suggestedStart,
        endTime: suggestedEnd,
        durationMinutes: defaultDuration,
        isManuallyEdited: false,
        breakAfterMinutes: breakMins,
        ...(breakLabel ? { breakLabel } : {})
      });

      cursorMinutes = cursorMinutes + defaultDuration + breakMins;
    }
  }

  return result;
}

/**
 * Builds a complete default ShiftScheduleConfig for Morning (08:00 AM, 45m) or Day (01:30 PM, 45m).
 */
export function buildDefaultShiftScheduleConfig(
  shift: Shift,
  overrides?: Partial<ShiftScheduleConfig>
): ShiftScheduleConfig {
  const cleanShift: Shift = shift === 'Day' ? 'Day' : 'Morning';
  const firstPeriodStartTime = overrides?.firstPeriodStartTime || SHIFT_DEFAULT_START_TIME[cleanShift];
  const defaultDurationMinutes =
    overrides?.defaultDurationMinutes && overrides.defaultDurationMinutes >= 5
      ? overrides.defaultDurationMinutes
      : DEFAULT_PERIOD_DURATION_MINUTES;
  const numberOfPeriods =
    overrides?.numberOfPeriods && overrides.numberOfPeriods >= 1 && overrides.numberOfPeriods <= 12
      ? overrides.numberOfPeriods
      : DEFAULT_NUMBER_OF_PERIODS;
  const breaks = Array.isArray(overrides?.breaks) ? overrides!.breaks : [];

  const periods = recalculateShiftSchedulePeriods({
    shift: cleanShift,
    firstPeriodStartTime,
    defaultDurationMinutes,
    numberOfPeriods,
    breaks,
    periods: overrides?.periods
  });

  return {
    id: overrides?.id || `sched_${cleanShift.toLowerCase()}_${overrides?.scopeKey || 'default'}`,
    shift: cleanShift,
    scopeKey: overrides?.scopeKey || 'default',
    firstPeriodStartTime,
    defaultDurationMinutes,
    numberOfPeriods,
    breaks,
    periods,
    college: overrides?.college,
    department: overrides?.department,
    semester: overrides?.semester,
    section: overrides?.section,
    ownerId: overrides?.ownerId,
    updatedBy: overrides?.updatedBy || 'system_default',
    updatedAt: overrides?.updatedAt || new Date().toISOString()
  };
}

/**
 * Updates a single period's startTime, endTime, durationMinutes, or breakAfterMinutes.
 * When startTime or endTime is manually edited, sets `isManuallyEdited = true` on that period
 * so future shift-level duration changes preserve this manual override until explicitly reset.
 */
export function updateIndividualPeriodSlot(
  config: ShiftScheduleConfig,
  periodNumber: number,
  updates: {
    startTime?: string;
    endTime?: string;
    durationMinutes?: number;
    breakAfterMinutes?: number;
    breakLabel?: string;
  }
): ShiftScheduleConfig {
  const updatedPeriods = config.periods.map((slot) => {
    if (slot.periodNumber !== periodNumber) return slot;

    let nextStart = updates.startTime !== undefined ? updates.startTime : slot.startTime;
    let nextEnd = updates.endTime !== undefined ? updates.endTime : slot.endTime;
    let nextDuration =
      updates.durationMinutes !== undefined && updates.durationMinutes >= 5
        ? Math.round(updates.durationMinutes)
        : slot.durationMinutes;

    // If startTime was changed without an explicit endTime change, auto-suggest endTime from nextStart + duration
    if (updates.startTime !== undefined && updates.endTime === undefined) {
      nextEnd = addMinutesToTime12h(nextStart, nextDuration, config.shift);
    } else if (updates.durationMinutes !== undefined && updates.endTime === undefined) {
      nextEnd = addMinutesToTime12h(nextStart, nextDuration, config.shift);
    } else if (updates.endTime !== undefined) {
      nextDuration = calculateDurationMinutesBetween(nextStart, nextEnd, nextDuration);
    }

    const isTimeEdit =
      updates.startTime !== undefined ||
      updates.endTime !== undefined ||
      updates.durationMinutes !== undefined;

    const nextBreak =
      updates.breakAfterMinutes !== undefined
        ? Math.max(0, Math.round(updates.breakAfterMinutes))
        : slot.breakAfterMinutes;

    return {
      ...slot,
      startTime: nextStart,
      endTime: nextEnd,
      durationMinutes: nextDuration,
      isManuallyEdited: isTimeEdit ? true : slot.isManuallyEdited,
      breakAfterMinutes: nextBreak,
      ...(updates.breakLabel !== undefined ? { breakLabel: updates.breakLabel } : {})
    };
  });

  // Sync breaks list
  const nextBreaks: PeriodBreakConfig[] = updatedPeriods
    .filter((p) => p.breakAfterMinutes > 0)
    .map((p) => ({
      afterPeriod: p.periodNumber,
      afterPeriodNumber: p.periodNumber,
      durationMinutes: p.breakAfterMinutes,
      ...(p.breakLabel ? { label: p.breakLabel } : {})
    }));

  // Recalculate downstream non-manual periods so non-manual periods follow any updated times or breaks
  const recalculated = recalculateShiftSchedulePeriods({
    ...config,
    breaks: nextBreaks,
    periods: updatedPeriods
  });

  return {
    ...config,
    breaks: nextBreaks,
    periods: recalculated,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Resets a single period's manual override (`isManuallyEdited = false`) and recalculates its suggested time.
 */
export function resetSinglePeriodToSuggested(
  config: ShiftScheduleConfig,
  periodNumber: number
): ShiftScheduleConfig {
  const clearedPeriods = config.periods.map((slot) =>
    slot.periodNumber === periodNumber ? { ...slot, isManuallyEdited: false } : slot
  );
  const recalculated = recalculateShiftSchedulePeriods({
    ...config,
    periods: clearedPeriods
  });
  return {
    ...config,
    periods: recalculated,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Formats a PeriodSlotConfig into a standard human-readable selector label:
 * e.g. "Period 1 (08:00 AM - 08:45 AM)"
 */
export function formatPeriodOptionLabel(slot: PeriodSlotConfig): string {
  return `Period ${slot.periodNumber} (${slot.startTime} - ${slot.endTime})`;
}

/**
 * Builds a deterministic storage key for a ShiftScheduleConfig so Morning and Day Shift
 * settings are stored separately per cohort/context without overwriting each other.
 */
export function buildShiftScheduleKey(
  shiftOrParams:
    | Shift
    | {
        shift: Shift;
        scopeKey?: string;
        college?: string;
        department?: string;
        semester?: SemesterNumber | number;
        section?: Section | string;
      },
  scopeKeyArg = 'default'
): string {
  if (typeof shiftOrParams === 'string') {
    const cleanShift = shiftOrParams === 'Day' ? 'Day' : 'Morning';
    const cleanScope = (scopeKeyArg || 'default').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
    return `sched_${cleanScope}_${cleanShift.toLowerCase()}`;
  }
  const cleanShift = shiftOrParams.shift === 'Day' ? 'Day' : 'Morning';
  if (shiftOrParams.scopeKey) {
    const cleanScope = shiftOrParams.scopeKey.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
    return `sched_${cleanScope}_${cleanShift.toLowerCase()}`;
  }
  const col = (shiftOrParams.college || 'default_college').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const dept = (shiftOrParams.department || 'default_dept').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const sem = shiftOrParams.semester ? `s${shiftOrParams.semester}` : 's_all';
  const sec = shiftOrParams.section ? String(shiftOrParams.section).trim().toLowerCase() : 'sec_all';
  return `sched_${col}_${dept}_${sem}_${sec}_${cleanShift.toLowerCase()}`;
}
