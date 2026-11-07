import { apiFetch } from '../../services/apiClient';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  X,
  Plus,
  Edit3,
  ShieldCheck,
  Clock
} from 'lucide-react';
import {
  CatalogRegulation,
  SemesterNumber,
  SubjectCatalogRecord
} from '../../types';
import { TECHNOLOGIES_DIRECTORY } from '../../data/directoryData';
import { buildStarterSubjectCatalog } from '../../data/starterSubjectCatalog';

interface CatalogSubjectSelectProps {
  technology: string;
  regulation?: CatalogRegulation;
  onRegulationChange?: (reg: CatalogRegulation) => void;
  showRegulationSelector?: boolean;
  semester: SemesterNumber | SemesterNumber[] | null | '';
  // Single select props
  multiple?: false;
  selectedCode?: string;
  selectedName?: string;
  onSelect?: (selected: { code: string; name: string; type?: string | null; marks?: number | string | null; record?: SubjectCatalogRecord } | null) => void;
  // Multi select props
  isMulti?: boolean;
  selectedSubjects?: string[]; // Format: "Subject Name (66661)"
  onMultiSelect?: (subjects: string[], records: SubjectCatalogRecord[]) => void;
  // UI customization
  label?: string;
  placeholder?: string;
  allowExceptionalManualEntry?: boolean;
  required?: boolean;
  compact?: boolean;
  catalogVersion?: number;
}

function findStrictTechnology(input: string | undefined) {
  if (!input) return null;
  const q = input.trim().toLowerCase();
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

export const CatalogSubjectSelect: React.FC<CatalogSubjectSelectProps> = ({
  technology,
  regulation: propRegulation,
  onRegulationChange,
  showRegulationSelector = true,
  semester,
  isMulti = false,
  selectedCode = '',
  selectedName = '',
  onSelect,
  selectedSubjects = [],
  onMultiSelect,
  label = 'Subject (Central BTEB Catalog)',
  placeholder = 'Search by subject code or name...',
  allowExceptionalManualEntry = true,
  required = false,
  compact = false,
  catalogVersion = 0
}) => {
  const [internalRegulation, setInternalRegulation] = useState<CatalogRegulation>(propRegulation || '2022');
  const activeRegulation: CatalogRegulation = propRegulation || internalRegulation;

  const [records, setRecords] = useState<SubjectCatalogRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualName, setManualName] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  const handleRegulationChange = (reg: CatalogRegulation) => {
    setInternalRegulation(reg);
    if (onRegulationChange) {
      onRegulationChange(reg);
    }
  };

  // Normalize semester(s) into a sorted array of valid integers 1..8
  const normalizedSemesters = useMemo<SemesterNumber[]>(() => {
    if (Array.isArray(semester)) {
      return semester.filter((s) => Number.isInteger(Number(s)) && Number(s) >= 1 && Number(s) <= 8) as SemesterNumber[];
    }
    if (semester !== null && semester !== '' && Number.isInteger(Number(semester)) && Number(semester) >= 1 && Number(semester) <= 8) {
      return [Number(semester) as SemesterNumber];
    }
    return [];
  }, [semester]);

  const resolvedTech = useMemo(() => findStrictTechnology(technology), [technology]);
  const hasCompleteCriteria = Boolean(resolvedTech && activeRegulation && normalizedSemesters.length > 0);
  const semesterKey = normalizedSemesters.join(',');

  // Fetch matching subjects from the Central Subject Catalog API
  useEffect(() => {
    if (!hasCompleteCriteria || !resolvedTech) {
      setRecords([]);
      return;
    }

    let cancelled = false;
    const fetchSubjects = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          technology: resolvedTech.id,
          regulation: activeRegulation,
          semesters: semesterKey
        });
        const res = await apiFetch(`/api/catalog/subjects?${params.toString()}`);
        const data = await res.json();
        if (!cancelled && res.ok && Array.isArray(data.records)) {
          setRecords(data.records);
        }
      } catch {
        // Strict local fallback using starter catalog (never invents or falls back to other semesters/regulations)
        if (!cancelled) {
          const allStarter = buildStarterSubjectCatalog();
          const semSet = new Set(normalizedSemesters);
          const filtered = allStarter.filter(
            (r) =>
              r.is_active &&
              r.technology_key === resolvedTech.id &&
              r.regulation === activeRegulation &&
              semSet.has(r.semester)
          );
          setRecords(filtered);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSubjects();
    return () => {
      cancelled = true;
    };
  }, [resolvedTech?.id, activeRegulation, semesterKey, hasCompleteCriteria, catalogVersion]);

  // Helper to check if a selected string matches a catalog record (supports shared 8th-semester subject codes)
  const doesLabelMatchRecord = (labelStr: string, rec: SubjectCatalogRecord, allRecs: SubjectCatalogRecord[]) => {
    const formatted = `${rec.subject_name} (${rec.subject_code})`;
    if (labelStr.trim().toLowerCase() === formatted.toLowerCase()) return true;
    const sameCodeCount = allRecs.filter(
      (r) => r.subject_code.toLowerCase() === rec.subject_code.toLowerCase()
    ).length;
    if (sameCodeCount === 1 && labelStr.includes(`(${rec.subject_code})`)) {
      return true;
    }
    return false;
  };

  // Reset incompatible selections automatically when Technology, Regulation, or Semester changes
  const prevCriteriaRef = useRef<string>('');
  useEffect(() => {
    if (loading) return;
    const currentCriteria = `${resolvedTech?.id || ''}|${activeRegulation}|${semesterKey}`;
    if (prevCriteriaRef.current && prevCriteriaRef.current !== currentCriteria) {
      setSearchQuery('');
    }
    prevCriteriaRef.current = currentCriteria;

    if (!manualMode && hasCompleteCriteria) {
      if (records.length > 0) {
        // Validate single selection compatibility
        if (!isMulti && selectedCode && onSelect) {
          const stillCompatible = records.some((r) => {
            const codeMatches = r.subject_code.toLowerCase() === selectedCode.trim().toLowerCase();
            if (!codeMatches) return false;
            const sameCodeCount = records.filter(
              (item) => item.subject_code.toLowerCase() === r.subject_code.toLowerCase()
            ).length;
            if (sameCodeCount > 1 && selectedName) {
              return r.subject_name.trim().toLowerCase() === selectedName.trim().toLowerCase();
            }
            return true;
          });
          if (!stillCompatible) {
            onSelect(null);
          }
        }
        // Validate multi selection compatibility
        if (isMulti && selectedSubjects.length > 0 && onMultiSelect) {
          const compatibleList = selectedSubjects.filter((labelStr) =>
            records.some((r) => doesLabelMatchRecord(labelStr, r, records))
          );
          if (compatibleList.length !== selectedSubjects.length) {
            const matchedRecs = records.filter((r) =>
              compatibleList.some((l) => doesLabelMatchRecord(l, r, records))
            );
            onMultiSelect(compatibleList, matchedRecs);
          }
        }
      } else {
        if (!isMulti && selectedCode && onSelect) {
          onSelect(null);
        }
        if (isMulti && selectedSubjects.length > 0 && onMultiSelect) {
          onMultiSelect([], []);
        }
      }
    }
  }, [resolvedTech?.id, activeRegulation, semesterKey, records, loading, hasCompleteCriteria]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.trim().toLowerCase();
    return records.filter(
      (r) =>
        r.subject_code.toLowerCase().includes(q) ||
        r.subject_name.toLowerCase().includes(q) ||
        (r.subject_type && r.subject_type.toLowerCase().includes(q))
    );
  }, [records, searchQuery]);

  const handleSinglePick = (rec: SubjectCatalogRecord) => {
    setManualMode(false);
    if (onSelect) {
      onSelect({
        code: rec.subject_code,
        name: rec.subject_name,
        type: rec.subject_type,
        marks: rec.marks,
        record: rec
      });
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleToggleMulti = (rec: SubjectCatalogRecord) => {
    if (!onMultiSelect) return;
    const formatted = `${rec.subject_name} (${rec.subject_code})`;
    const exists = selectedSubjects.some((s) => doesLabelMatchRecord(s, rec, records));
    let nextStrings: string[];
    if (exists) {
      nextStrings = selectedSubjects.filter((s) => !doesLabelMatchRecord(s, rec, records));
    } else {
      nextStrings = [...selectedSubjects, formatted];
    }
    const nextRecs = records.filter((r) =>
      nextStrings.some((s) => doesLabelMatchRecord(s, r, records))
    );
    onMultiSelect(nextStrings, nextRecs);
  };

  const applyManualSubject = () => {
    const cleanCode = manualCode.trim();
    const cleanName = manualName.trim();
    if (!cleanCode || !cleanName) return;

    if (isMulti && onMultiSelect) {
      const formatted = `${cleanName} (${cleanCode})`;
      if (!selectedSubjects.includes(formatted)) {
        onMultiSelect([...selectedSubjects, formatted], []);
      }
      setManualCode('');
      setManualName('');
    } else if (onSelect) {
      onSelect({
        code: cleanCode,
        name: cleanName,
        type: 'Manual Entry',
        marks: null
      });
    }
  };

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Header Row with Label + Regulation Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>

        {showRegulationSelector && (
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-500 px-1.5">Reg:</span>
            {(['2022', '2016'] as CatalogRegulation[]).map((reg) => (
              <button
                key={reg}
                type="button"
                onClick={() => handleRegulationChange(reg)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                  activeRegulation === reg
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {reg}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Criteria Banner */}
      {resolvedTech && normalizedSemesters.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900">
          <div className="flex items-center gap-1.5 font-medium truncate">
            <span className="font-bold text-blue-700">{resolvedTech.shortCode}</span>
            <span className="text-blue-300">•</span>
            <span>Reg {activeRegulation}</span>
            <span className="text-blue-300">•</span>
            <span>
              Sem {normalizedSemesters.join(', ')}
            </span>
          </div>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface text-blue-700 border border-blue-200/70 shrink-0">
            {loading ? 'Loading...' : `${records.length} catalog subject${records.length === 1 ? '' : 's'}`}
          </span>
        </div>
      ) : (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Please select Technology, Regulation, and Semester first to load catalog subject suggestions.</span>
        </div>
      )}

      {/* Main Catalog Selector (when not in manual override mode) */}
      {hasCompleteCriteria && !manualMode && (
        <>
          {records.length === 0 && !loading ? (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <p className="text-xs font-bold text-slate-700">
                Book list is not available for this selection yet.
              </p>
              <p className="text-[11px] text-slate-500">
                No verified or provisional subjects exist in the central catalog for{' '}
                <span className="font-semibold text-slate-700">{resolvedTech?.name}</span> ({activeRegulation} Regulation, Semester {normalizedSemesters.join(', ')}).
              </p>
              {allowExceptionalManualEntry && (
                <button
                  type="button"
                  onClick={() => setManualMode(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-slate-300 text-slate-700 text-[11px] font-bold hover:bg-slate-100 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  Use Exceptional Manual Subject Entry
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Single Select Selected Pill or Trigger */}
              {!isMulti && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full flex items-center justify-between gap-2 px-3 ${
                      compact ? 'py-2' : 'py-2.5'
                    } bg-surface border rounded-xl text-left transition-all ${
                      selectedCode && selectedName
                        ? 'border-blue-300 bg-blue-50/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {selectedCode && selectedName ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-xs font-bold shrink-0">
                          {selectedCode}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {selectedName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs sm:text-sm text-slate-400">
                        Select subject from {records.length} available in catalog...
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="absolute z-40 left-0 right-0 mt-1.5 bg-surface border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                      <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={placeholder}
                          autoFocus
                          className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {filteredRecords.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-500">
                            No subjects matching "{searchQuery}" in this semester's catalog.
                          </div>
                        ) : (
                          filteredRecords.map((rec) => {
                            const sameCodeCount = records.filter(
                              (item) => item.subject_code.toLowerCase() === rec.subject_code.toLowerCase()
                            ).length;
                            const isSelected =
                              selectedCode.trim().toLowerCase() === rec.subject_code.toLowerCase() &&
                              (sameCodeCount === 1 ||
                                !selectedName ||
                                selectedName.trim().toLowerCase() === rec.subject_name.trim().toLowerCase());
                            return (
                              <button
                                key={rec.id}
                                type="button"
                                onClick={() => handleSinglePick(rec)}
                                className={`w-full px-3 py-2.5 text-left flex items-start justify-between gap-2 transition-colors ${
                                  isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                      {rec.subject_code}
                                    </span>
                                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                                      {rec.subject_name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                                    <span>Sem {rec.semester}</span>
                                    {rec.subject_type && (
                                      <>
                                        <span>•</span>
                                        <span>{rec.subject_type}</span>
                                      </>
                                    )}
                                    {rec.marks !== null && rec.marks !== undefined && (
                                      <>
                                        <span>•</span>
                                        <span>{rec.marks} Marks</span>
                                      </>
                                    )}
                                    {rec.credits !== null && rec.credits !== undefined && (
                                      <>
                                        <span>•</span>
                                        <span>{rec.credits} Cr</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                      rec.verification_status === 'verified'
                                        ? 'bg-green-50 text-green-700 border border-green-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}
                                  >
                                    {rec.verification_status === 'verified' ? (
                                      <ShieldCheck className="w-2.5 h-2.5" />
                                    ) : (
                                      <Clock className="w-2.5 h-2.5" />
                                    )}
                                    {rec.verification_status}
                                  </span>
                                  {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Multi-Select Mode */}
              {isMulti && (
                <div className="border border-slate-200 rounded-xl bg-surface overflow-hidden">
                  <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400 ml-1 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={placeholder}
                      className="w-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="p-1 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Selected Multi Tags */}
                  {selectedSubjects.length > 0 && (
                    <div className="p-2 bg-blue-50/40 border-b border-slate-100 flex flex-wrap gap-1.5">
                      {selectedSubjects.map((subj) => (
                        <span
                          key={subj}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold"
                        >
                          <span>{subj}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (!onMultiSelect) return;
                              const next = selectedSubjects.filter((s) => s !== subj);
                              const nextRecs = records.filter((r) =>
                                next.some((s) => doesLabelMatchRecord(s, r, records))
                              );
                              onMultiSelect(next, nextRecs);
                            }}
                            className="hover:text-blue-200"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                    {filteredRecords.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500">
                        No catalog subjects matching "{searchQuery}".
                      </div>
                    ) : (
                      filteredRecords.map((rec) => {
                        const checked = selectedSubjects.some((s) =>
                          doesLabelMatchRecord(s, rec, records)
                        );
                        return (
                          <button
                            key={rec.id}
                            type="button"
                            onClick={() => handleToggleMulti(rec)}
                            className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors ${
                              checked ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  {rec.subject_code}
                                </span>
                                <span className="text-xs font-bold text-slate-900">
                                  {rec.subject_name}
                                </span>
                                <span className="text-[10px] text-slate-400">Sem {rec.semester}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  rec.verification_status === 'verified'
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {rec.verification_status}
                              </span>
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center border ${
                                  checked
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-slate-300 bg-surface'
                                }`}
                              >
                                {checked && <CheckCircle2 className="w-3 h-3" />}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Link to Exceptional Manual Entry */}
              {allowExceptionalManualEntry && (
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[10px] text-slate-400">
                    Auto-populated from BTEB {activeRegulation} Central Catalog
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setManualMode(true);
                      setManualCode(selectedCode || '');
                      setManualName(selectedName || '');
                    }}
                    className="text-[10px] font-bold text-slate-500 hover:text-blue-600 underline"
                  >
                    Exceptional Manual Entry
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Exceptional Manual Entry Mode (Clearly Labeled) */}
      {manualMode && (
        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
              <Edit3 className="w-3 h-3" />
              Exceptional Manual Subject Entry (Non-Catalog)
            </span>
            {records.length > 0 && (
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className="text-[10px] font-bold text-blue-700 hover:underline"
              >
                Back to Central Catalog ({records.length})
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Subject Code</label>
              <input
                type="text"
                value={isMulti ? manualCode : selectedCode}
                onChange={(e) => {
                  const val = e.target.value;
                  setManualCode(val);
                  if (!isMulti && onSelect) {
                    onSelect({ code: val, name: selectedName, type: 'Manual Entry', marks: null });
                  }
                }}
                placeholder="e.g. 66661"
                className="w-full px-2.5 py-2 bg-surface border border-amber-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-slate-600 mb-1">Subject Name</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={isMulti ? manualName : selectedName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setManualName(val);
                    if (!isMulti && onSelect) {
                      onSelect({ code: selectedCode, name: val, type: 'Manual Entry', marks: null });
                    }
                  }}
                  placeholder="Enter official subject title"
                  className="w-full px-2.5 py-2 bg-surface border border-amber-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
                {isMulti && (
                  <button
                    type="button"
                    onClick={applyManualSubject}
                    className="px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 shrink-0 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
