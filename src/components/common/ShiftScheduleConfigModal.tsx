import React, { useState, useEffect } from 'react';
import {
  Clock,
  Sun,
  Moon,
  RotateCcw,
  Save,
  X,
  Sliders,
  Coffee,
  Edit3,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Shift, ShiftScheduleConfig, PeriodSlotConfig, PeriodBreakConfig } from '../../types';
import {
  SHIFT_DEFAULT_START_TIME,
  DEFAULT_PERIOD_DURATION_MINUTES,
  recalculateShiftSchedulePeriods,
  updateIndividualPeriodSlot,
  resetSinglePeriodToSuggested,
  buildDefaultShiftScheduleConfig
} from '../../data/shiftScheduleUtils';
import { TimePicker } from './TimePicker';

interface ShiftScheduleConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialShift: Shift;
  shiftSchedules: Record<Shift, ShiftScheduleConfig>;
  onSaveSchedule: (
    config: Partial<ShiftScheduleConfig> & { shift: Shift; forceResetAllManual?: boolean }
  ) => Promise<ShiftScheduleConfig>;
  onResetSchedule: (shift: Shift, periodNumber?: number) => Promise<ShiftScheduleConfig>;
  onShiftChanged?: (shift: Shift) => void;
}

export const ShiftScheduleConfigModal: React.FC<ShiftScheduleConfigModalProps> = ({
  isOpen,
  onClose,
  initialShift,
  shiftSchedules,
  onSaveSchedule,
  onResetSchedule,
  onShiftChanged
}) => {
  const [editingShift, setEditingShift] = useState<Shift>(initialShift);
  const [draftConfig, setDraftConfig] = useState<ShiftScheduleConfig>(() =>
    shiftSchedules[initialShift] || buildDefaultShiftScheduleConfig(initialShift)
  );
  const [isSaving, setIsSaving] = useState(false);

  // Sync draft when modal opens or when editingShift changes
  useEffect(() => {
    if (isOpen) {
      setEditingShift(initialShift);
      const source = shiftSchedules[initialShift] || buildDefaultShiftScheduleConfig(initialShift);
      setDraftConfig(JSON.parse(JSON.stringify(source)));
    }
  }, [isOpen, initialShift]);

  const handleSwitchShiftTab = (targetShift: Shift) => {
    setEditingShift(targetShift);
    const source = shiftSchedules[targetShift] || buildDefaultShiftScheduleConfig(targetShift);
    setDraftConfig(JSON.parse(JSON.stringify(source)));
    if (onShiftChanged) {
      onShiftChanged(targetShift);
    }
  };

  if (!isOpen) return null;

  const rebuildDraftPeriods = (
    nextStartTime: string,
    nextDuration: number,
    nextCount: number,
    nextBreaks: PeriodBreakConfig[],
    existingPeriods: PeriodSlotConfig[],
    forceResetManual = false
  ) => {
    const updatedPeriods = recalculateShiftSchedulePeriods({
      firstPeriodStartTime: nextStartTime,
      defaultDurationMinutes: nextDuration,
      numberOfPeriods: nextCount,
      existingPeriods,
      breaks: nextBreaks,
      forceResetAllManual: forceResetManual
    });

    setDraftConfig(prev => ({
      ...prev,
      firstPeriodStartTime: nextStartTime,
      defaultDurationMinutes: nextDuration,
      numberOfPeriods: nextCount,
      breaks: nextBreaks,
      periods: updatedPeriods
    }));
  };

  const handleFirstPeriodStartChange = (newStart: string) => {
    rebuildDraftPeriods(
      newStart,
      draftConfig.defaultDurationMinutes,
      draftConfig.numberOfPeriods,
      draftConfig.breaks || [],
      draftConfig.periods,
      false
    );
  };

  const handleDefaultDurationChange = (newDuration: number) => {
    const clamped = Math.max(5, Math.min(300, Number(newDuration) || DEFAULT_PERIOD_DURATION_MINUTES));
    rebuildDraftPeriods(
      draftConfig.firstPeriodStartTime,
      clamped,
      draftConfig.numberOfPeriods,
      draftConfig.breaks || [],
      draftConfig.periods,
      false
    );
  };

  const handlePeriodCountChange = (newCount: number) => {
    const clamped = Math.max(1, Math.min(12, Number(newCount) || 7));
    rebuildDraftPeriods(
      draftConfig.firstPeriodStartTime,
      draftConfig.defaultDurationMinutes,
      clamped,
      draftConfig.breaks || [],
      draftConfig.periods,
      false
    );
  };

  const handleBreakChange = (afterPeriodNumber: number, minutes: number) => {
    const clamped = Math.max(0, Math.min(180, Number(minutes) || 0));
    const existingBreaks = (draftConfig.breaks || []).filter(
      b => b.afterPeriodNumber !== afterPeriodNumber
    );
    const nextBreaks: PeriodBreakConfig[] =
      clamped > 0
        ? [...existingBreaks, { afterPeriodNumber, durationMinutes: clamped, label: 'Break' }]
        : existingBreaks;

    // Also update period slot's breakAfterMinutes
    const updatedExisting = draftConfig.periods.map(p =>
      p.periodNumber === afterPeriodNumber ? { ...p, breakAfterMinutes: clamped } : p
    );

    rebuildDraftPeriods(
      draftConfig.firstPeriodStartTime,
      draftConfig.defaultDurationMinutes,
      draftConfig.numberOfPeriods,
      nextBreaks,
      updatedExisting,
      false
    );
  };

  const handleIndividualPeriodTimeEdit = (
    periodNumber: number,
    updates: { startTime?: string; endTime?: string }
  ) => {
    const updated = updateIndividualPeriodSlot(draftConfig, periodNumber, updates);
    setDraftConfig(updated);
  };

  const handleResetSinglePeriod = (periodNumber: number) => {
    const updated = resetSinglePeriodToSuggested(draftConfig, periodNumber);
    setDraftConfig(updated);
  };

  const handleResetFullShiftToDefaults = async () => {
    setIsSaving(true);
    try {
      const fresh = await onResetSchedule(editingShift);
      setDraftConfig(JSON.parse(JSON.stringify(fresh)));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSchedule({
        ...draftConfig,
        shift: editingShift
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const manualOverrideCount = draftConfig.periods.filter(p => p.isManuallyEdited).length;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-surface w-full max-w-2xl rounded-t-3xl sm:rounded-3xl p-5 max-h-[92vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="flex justify-between items-start pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
              <Sliders size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Configurable Period & Shift Schedule
              </h3>
              <p className="text-[11px] text-slate-500">
                Morning (08:00 AM default) & Day (01:30 PM default) settings are stored separately
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Shift Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 my-3 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => handleSwitchShiftTab('Morning')}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
              editingShift === 'Morning'
                ? 'bg-surface text-blue-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sun size={14} className={editingShift === 'Morning' ? 'text-amber-500' : 'text-slate-400'} />
            <span>Morning Shift (Default 08:00 AM)</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchShiftTab('Day')}
            className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
              editingShift === 'Day'
                ? 'bg-surface text-blue-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Moon size={14} className={editingShift === 'Day' ? 'text-blue-600' : 'text-slate-400'} />
            <span>Day Shift (Default 01:30 PM)</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {/* Global Shift Controls */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} className="text-blue-600" />
                {editingShift} Shift Base Parameters
              </span>
              <button
                type="button"
                onClick={handleResetFullShiftToDefaults}
                disabled={isSaving}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={11} />
                <span>Reset {editingShift} Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. First Period Start Time */}
              <div>
                <TimePicker
                  label="1st Period Start Time"
                  value={draftConfig.firstPeriodStartTime}
                  onChange={handleFirstPeriodStartChange}
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Default for {editingShift}: <strong>{SHIFT_DEFAULT_START_TIME[editingShift]}</strong>
                </p>
              </div>

              {/* 2. Default Period Duration */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Default Period Duration (Min)
                </label>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={draftConfig.defaultDurationMinutes}
                    onChange={e => handleDefaultDurationChange(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-surface text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {[35, 40, 45, 50, 60].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleDefaultDurationChange(mins)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                        draftConfig.defaultDurationMinutes === mins
                          ? 'bg-blue-900 text-white border-blue-900'
                          : 'bg-surface text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {mins}m{mins === 45 ? ' (Def)' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Number of Periods */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Number of Periods (1 - 12)
                </label>
                <select
                  value={draftConfig.numberOfPeriods}
                  onChange={e => handlePeriodCountChange(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-surface text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(cnt => (
                    <option key={cnt} value={cnt}>
                      {cnt} {cnt === 1 ? 'Period' : 'Periods'} {cnt === 7 ? '(Standard)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {manualOverrideCount > 0 && (
              <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between text-[11px] text-amber-900">
                <div className="flex items-center space-x-2">
                  <AlertCircle size={14} className="text-amber-600 shrink-0" />
                  <span>
                    <strong>{manualOverrideCount}</strong> period(s) have manual time overrides and are preserved automatically when base settings change.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Individual Period Slots & Breaks */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Individual Period Timings & Breaks ({draftConfig.periods.length} Periods)
              </h4>
            </div>

            {draftConfig.periods.map((slot, index) => {
              const isLastPeriod = index === draftConfig.periods.length - 1;
              return (
                <div
                  key={slot.periodNumber}
                  className={`rounded-2xl p-3 border transition-all ${
                    slot.isManuallyEdited
                      ? 'bg-amber-50/40 border-amber-300'
                      : 'bg-surface border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-blue-950 text-white text-xs font-bold">
                        Period {slot.periodNumber}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {slot.startTime} – {slot.endTime}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {slot.durationMinutes} min
                      </span>
                      {slot.isManuallyEdited ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
                          <Edit3 size={10} /> Manual Override Preserved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 size={10} /> Auto-Calculated
                        </span>
                      )}
                    </div>

                    {slot.isManuallyEdited && (
                      <button
                        type="button"
                        onClick={() => handleResetSinglePeriod(slot.periodNumber)}
                        className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1"
                      >
                        <RotateCcw size={11} />
                        <span>Reset Period {slot.periodNumber}</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                    <TimePicker
                      label={`P${slot.periodNumber} Start Time`}
                      value={slot.startTime}
                      onChange={val =>
                        handleIndividualPeriodTimeEdit(slot.periodNumber, { startTime: val })
                      }
                    />
                    <TimePicker
                      label={`P${slot.periodNumber} End Time`}
                      value={slot.endTime}
                      onChange={val =>
                        handleIndividualPeriodTimeEdit(slot.periodNumber, { endTime: val })
                      }
                    />
                    {!isLastPeriod ? (
                      <div>
                        <label className="text-xs font-semibold text-slate-600 flex items-center gap-1 mb-1">
                          <Coffee size={11} className="text-amber-600" />
                          <span>Break After P{slot.periodNumber} (Min)</span>
                        </label>
                        <div className="flex items-center space-x-1">
                          <input
                            type="number"
                            min={0}
                            max={120}
                            value={slot.breakAfterMinutes || 0}
                            onChange={e =>
                              handleBreakChange(slot.periodNumber, Number(e.target.value))
                            }
                            placeholder="0"
                            className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                          />
                          {[0, 15, 20, 30].map(bm => (
                            <button
                              key={bm}
                              type="button"
                              onClick={() => handleBreakChange(slot.periodNumber, bm)}
                              className={`px-2 py-2 rounded-lg text-[10px] font-bold border ${
                                (slot.breakAfterMinutes || 0) === bm
                                  ? 'bg-amber-600 text-white border-amber-600'
                                  : 'bg-surface text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {bm}m
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic pb-2">
                        Final period of {editingShift} Shift
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-white text-xs font-bold flex items-center space-x-2 shadow-md transition-all"
          >
            <Save size={15} />
            <span>{isSaving ? 'Saving...' : `Save ${editingShift} Shift Schedule`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
