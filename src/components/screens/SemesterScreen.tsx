import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calculator,
  ArrowLeft,
  BookOpen,
  Award,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Layers,
  Calendar,
  Save,
  Trash2,
  Sparkles,
  Info,
  ShieldCheck,
  BarChart3,
  Edit3
} from 'lucide-react';
import {
  CatalogRegulation,
  CalculatorRegulation,
  SemesterNumber,
  SubjectCatalogRecord,
  SubjectMarkInputEntry,
  SavedSemesterCalculatorRecord
} from '../../types';
import { SearchableDepartmentSelect } from '../common/SearchableDepartmentSelect';
import {
  OFFICIAL_BTEB_GRADE_SCALE,
  PROVISIONAL_BTEB_SEMESTER_WEIGHTAGES,
  initializeSubjectMarkEntriesFromCatalog,
  updateSubjectMarkEntry,
  calculateSemesterGpaSummary,
  calculateWeightedBtebCgpa
} from '../../data/btebGpaCalculatorUtils';

export const SemesterScreen: React.FC = () => {
  const {
    userProfile,
    accountType,
    isVerifiedCaptain,
    authToken,
    setActiveScreen,
    showToast
  } = useApp();

  const [selectedTechnology, setSelectedTechnology] = useState<string>(userProfile.department);
  const [selectedRegulation, setSelectedRegulation] = useState<CatalogRegulation>(
    userProfile.regulation || '2022'
  );
  const [cgpaWeightRegulation, setCgpaWeightRegulation] = useState<CalculatorRegulation>(
    (userProfile.regulation as CalculatorRegulation) || '2022'
  );
  const [selectedSemester, setSelectedSemester] = useState<SemesterNumber>(userProfile.semester);

  const [catalogSubjects, setCatalogSubjects] = useState<SubjectCatalogRecord[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(false);

  // Subject-wise marks & grade entries for current semester
  const [subjectEntries, setSubjectEntries] = useState<SubjectMarkInputEntry[]>([]);

  // Saved semester results for the current authenticated user across Semesters 1..8
  const [savedRecords, setSavedRecords] = useState<SavedSemesterCalculatorRecord[]>([]);
  const [isSavingRecord, setIsSavingRecord] = useState<boolean>(false);

  // Optional direct semester GPA inputs for multi-semester CGPA estimation (1..8)
  const [manualSemesterGpas, setManualSemesterGpas] = useState<Partial<Record<SemesterNumber, string>>>({});

  const localStorageKey = `diplomamate_my_sem_calc_${userProfile.id || 'guest'}`;

  // Sync cgpaWeightRegulation when selectedRegulation changes
  useEffect(() => {
    setCgpaWeightRegulation(selectedRegulation);
  }, [selectedRegulation]);

  // 1. Load user's saved semester calculator records from server (with localStorage backup)
  const loadSavedUserRecords = async () => {
    try {
      const localRaw = localStorage.getItem(localStorageKey);
      if (localRaw) {
        const parsed = JSON.parse(localRaw);
        if (Array.isArray(parsed)) {
          setSavedRecords(parsed);
        }
      }
    } catch {
      // ignore local parse errors
    }

    const tokenToUse = authToken || localStorage.getItem('diplomamate_auth_token');
    if (!tokenToUse) return;

    try {
      const res = await fetch('/api/my-semester-results', {
        headers: { Authorization: `Bearer ${tokenToUse}` }
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.records)) {
        setSavedRecords(data.records);
        localStorage.setItem(localStorageKey, JSON.stringify(data.records));
      }
    } catch {
      // keep local records if offline
    }
  };

  useEffect(() => {
    loadSavedUserRecords();
  }, [userProfile.id, authToken]);

  // Find if current (technology, regulation, semester) has a saved record for this user
  const matchingSavedRecord = useMemo(() => {
    return (
      savedRecords.find(
        r =>
          r.ownerUserId === userProfile.id &&
          r.technology.toLowerCase() === selectedTechnology.toLowerCase() &&
          r.regulation === selectedRegulation &&
          r.semester === selectedSemester
      ) || null
    );
  }, [savedRecords, userProfile.id, selectedTechnology, selectedRegulation, selectedSemester]);

  // 2. Load subjects from Central Subject Catalog when Department, Regulation, or Semester changes
  useEffect(() => {
    let cancelled = false;
    const loadCatalog = async () => {
      setIsLoadingCatalog(true);
      try {
        const params = new URLSearchParams({
          technology: selectedTechnology,
          regulation: selectedRegulation,
          semester: String(selectedSemester),
          activeOnly: 'true'
        });
        const res = await fetch(`/api/catalog/subjects?${params.toString()}`);
        const data = await res.json();
        if (!cancelled) {
          if (res.ok && data.success && Array.isArray(data.records)) {
            setCatalogSubjects(data.records);
          } else {
            setCatalogSubjects([]);
          }
        }
      } catch {
        if (!cancelled) {
          setCatalogSubjects([]);
        }
      } finally {
        if (!cancelled) setIsLoadingCatalog(false);
      }
    };
    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [selectedTechnology, selectedRegulation, selectedSemester]);

  // Initialize or merge subjectEntries whenever catalogSubjects or matchingSavedRecord updates
  useEffect(() => {
    if (catalogSubjects.length === 0) {
      setSubjectEntries([]);
      return;
    }
    const initialized = initializeSubjectMarkEntriesFromCatalog(
      catalogSubjects,
      matchingSavedRecord ? matchingSavedRecord.subjectEntries : undefined
    );
    setSubjectEntries(initialized);
  }, [catalogSubjects, matchingSavedRecord]);

  // Live Semester GPA Calculation Summary
  const gpaSummary = useMemo(() => {
    return calculateSemesterGpaSummary(subjectEntries);
  }, [subjectEntries]);

  // Check if any subject is missing catalogFullMarks or catalogCredits
  const subjectsMissingCatalogFullMarks = useMemo(
    () => subjectEntries.filter(e => e.catalogFullMarks === null),
    [subjectEntries]
  );
  const subjectsMissingCatalogCredits = useMemo(
    () => subjectEntries.filter(e => e.catalogCredits === null),
    [subjectEntries]
  );

  // Handlers for updating subject marks, full marks, or credits
  const handleObtainedMarksChange = (subjectCode: string, value: string) => {
    if (value.trim() === '') {
      setSubjectEntries(prev =>
        prev.map(entry =>
          entry.subjectCode === subjectCode
            ? updateSubjectMarkEntry(entry, { obtainedMarks: null })
            : entry
        )
      );
      return;
    }
    const num = Number(value);
    if (Number.isNaN(num)) return;
    setSubjectEntries(prev =>
      prev.map(entry =>
        entry.subjectCode === subjectCode
          ? updateSubjectMarkEntry(entry, { obtainedMarks: num })
          : entry
      )
    );
  };

  const handleFullMarksChange = (subjectCode: string, value: string) => {
    const num = value.trim() === '' ? null : Number(value);
    setSubjectEntries(prev =>
      prev.map(entry =>
        entry.subjectCode === subjectCode
          ? updateSubjectMarkEntry(entry, {
              effectiveFullMarks: num && num > 0 ? num : null,
              isFullMarksProvisional: entry.catalogFullMarks === null
            })
          : entry
      )
    );
  };

  const handleCreditsChange = (subjectCode: string, value: string) => {
    const num = value.trim() === '' ? null : Number(value);
    setSubjectEntries(prev =>
      prev.map(entry =>
        entry.subjectCode === subjectCode
          ? updateSubjectMarkEntry(entry, {
              effectiveCredits: num && num > 0 ? num : null,
              isCreditsProvisional: entry.catalogCredits === null
            })
          : entry
      )
    );
  };

  // Helper to apply standard BTEB Provisional Full Marks (Credits * 50, or 150) when catalog marks are null
  const handleApplyProvisionalBtebFullMarks = () => {
    setSubjectEntries(prev =>
      prev.map(entry => {
        if (entry.effectiveFullMarks !== null && entry.effectiveFullMarks > 0) {
          return entry;
        }
        const cr = entry.effectiveCredits || entry.catalogCredits || 3;
        const standardFullMarks = cr * 50;
        return updateSubjectMarkEntry(entry, {
          effectiveFullMarks: standardFullMarks,
          isFullMarksProvisional: true,
          effectiveCredits: entry.effectiveCredits || cr,
          isCreditsProvisional: entry.catalogCredits === null
        });
      })
    );
    showToast(
      'Applied provisional BTEB Full Marks (Credits × 50). Results using provisional full marks are labeled as Estimates.'
    );
  };

  // Quick sample fill for educational demonstration (Teachers / Captains / Students)
  const handleFillDemoMarks = () => {
    setSubjectEntries(prev =>
      prev.map((entry, idx) => {
        const cr = entry.effectiveCredits || entry.catalogCredits || 3;
        const fullMarks =
          entry.effectiveFullMarks && entry.effectiveFullMarks > 0
            ? entry.effectiveFullMarks
            : cr * 50;
        const samplePercentages = [0.84, 0.78, 0.72, 0.81, 0.68, 0.76, 0.88];
        const pct = samplePercentages[idx % samplePercentages.length];
        const obtained = Math.round(fullMarks * pct);
        return updateSubjectMarkEntry(entry, {
          effectiveFullMarks: fullMarks,
          isFullMarksProvisional: entry.catalogFullMarks === null,
          effectiveCredits: cr,
          isCreditsProvisional: entry.catalogCredits === null,
          obtainedMarks: obtained
        });
      })
    );
    showToast('Populated sample subject marks for GPA calculation preview.');
  };

  // Save current semester marks & GPA to user's private records
  const handleSaveCurrentSemesterResult = async () => {
    if (gpaSummary.evaluatedSubjectCount === 0) {
      showToast('Please enter marks for at least one subject before saving.');
      return;
    }

    setIsSavingRecord(true);
    const payload = {
      ownerUserId: userProfile.id,
      boardRoll: userProfile.boardRoll,
      college: userProfile.college,
      technology: selectedTechnology,
      regulation: selectedRegulation as CalculatorRegulation,
      semester: selectedSemester,
      subjectEntries,
      calculatedGpa: gpaSummary.semesterGpa,
      totalCreditsCounted: gpaSummary.totalCreditsCounted,
      totalSubjectsCounted: gpaSummary.evaluatedSubjectCount,
      hasFailedSubject: gpaSummary.hasFailedSubject,
      isEstimate: gpaSummary.isEstimate,
      estimateReasons: gpaSummary.limitations
    };

    try {
      const tokenToUse = authToken || localStorage.getItem('diplomamate_auth_token');
      if (tokenToUse) {
        const res = await fetch('/api/my-semester-results', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenToUse}`
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.records)) {
          setSavedRecords(data.records);
          localStorage.setItem(localStorageKey, JSON.stringify(data.records));
          showToast(data.message || `Semester ${selectedSemester} GPA saved!`);
          setIsSavingRecord(false);
          return;
        }
      }

      // Fallback local save for current user
      const localRecord: SavedSemesterCalculatorRecord = {
        id: `sem_calc_${userProfile.id}_${selectedRegulation}_s${selectedSemester}`,
        ownerUserId: userProfile.id,
        ownerName: userProfile.name,
        ownerRole: accountType,
        boardRoll: userProfile.boardRoll,
        college: userProfile.college,
        technology: selectedTechnology,
        technologyKey: selectedTechnology,
        regulation: selectedRegulation as CalculatorRegulation,
        semester: selectedSemester,
        subjectEntries,
        calculatedGpa: gpaSummary.semesterGpa,
        totalCreditsCounted: gpaSummary.totalCreditsCounted,
        totalSubjectsCounted: gpaSummary.evaluatedSubjectCount,
        hasFailedSubject: gpaSummary.hasFailedSubject,
        isEstimate: gpaSummary.isEstimate,
        estimateReasons: gpaSummary.limitations,
        updatedAt: new Date().toISOString()
      };

      const nextRecords = [
        ...savedRecords.filter(
          r =>
            !(
              r.ownerUserId === userProfile.id &&
              r.technology.toLowerCase() === selectedTechnology.toLowerCase() &&
              r.regulation === selectedRegulation &&
              r.semester === selectedSemester
            )
        ),
        localRecord
      ];
      setSavedRecords(nextRecords);
      localStorage.setItem(localStorageKey, JSON.stringify(nextRecords));
      showToast(`Saved Semester ${selectedSemester} GPA result to your profile.`);
    } finally {
      setIsSavingRecord(false);
    }
  };

  const handleDeleteSavedRecord = async (record: SavedSemesterCalculatorRecord) => {
    const tokenToUse = authToken || localStorage.getItem('diplomamate_auth_token');
    if (tokenToUse) {
      try {
        const res = await fetch(`/api/my-semester-results/${encodeURIComponent(record.id)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${tokenToUse}` }
        });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.records)) {
          setSavedRecords(data.records);
          localStorage.setItem(localStorageKey, JSON.stringify(data.records));
          showToast(`Removed saved Semester ${record.semester} result.`);
          return;
        }
      } catch {
        // fallback to local removal
      }
    }
    const next = savedRecords.filter(r => r.id !== record.id);
    setSavedRecords(next);
    localStorage.setItem(localStorageKey, JSON.stringify(next));
    showToast(`Removed saved Semester ${record.semester} result.`);
  };

  // Build Semester 1..8 GPA map for Overall Weighted CGPA Calculation
  const semesterGpasForCgpa = useMemo(() => {
    const map: Partial<Record<SemesterNumber, { gpa: number | null; isEstimate?: boolean }>> = {};
    const sems: SemesterNumber[] = [1, 2, 3, 4, 5, 6, 7, 8];

    for (const s of sems) {
      // 1. Check if manual override entered in the multi-semester table
      const manualStr = manualSemesterGpas[s];
      if (manualStr !== undefined && manualStr.trim() !== '') {
        const parsed = Number(manualStr);
        if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 4.0) {
          map[s] = { gpa: parsed, isEstimate: true };
          continue;
        }
      }

      // 2. If it's the currently active semester and has evaluated subjects, use live calculated GPA
      if (s === selectedSemester && gpaSummary.semesterGpa !== null) {
        map[s] = {
          gpa: gpaSummary.semesterGpa,
          isEstimate: gpaSummary.isEstimate
        };
        continue;
      }

      // 3. Otherwise check user's saved records for the selected technology
      const saved = savedRecords.find(
        r =>
          r.ownerUserId === userProfile.id &&
          r.technology.toLowerCase() === selectedTechnology.toLowerCase() &&
          r.semester === s &&
          r.calculatedGpa !== null
      );
      if (saved && saved.calculatedGpa !== null) {
        map[s] = {
          gpa: saved.calculatedGpa,
          isEstimate: saved.isEstimate
        };
      }
    }

    return map;
  }, [
    manualSemesterGpas,
    selectedSemester,
    gpaSummary.semesterGpa,
    gpaSummary.isEstimate,
    savedRecords,
    userProfile.id,
    selectedTechnology
  ]);

  const cgpaCalculation = useMemo(() => {
    return calculateWeightedBtebCgpa({
      regulation: cgpaWeightRegulation,
      semesterGpas: semesterGpasForCgpa
    });
  }, [cgpaWeightRegulation, semesterGpasForCgpa]);

  const totalCatalogCredits = catalogSubjects.reduce(
    (acc, curr) => acc + (curr.credits ?? 0),
    0
  );

  return (
    <div className="space-y-4 pb-10">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveScreen('home')}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-[#172554]">
                  My Semester & BTEB GPA/CGPA Calculator
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                  {accountType === 'teacher'
                    ? 'Faculty Educational Mode'
                    : isVerifiedCaptain
                    ? 'Class Captain Mode'
                    : 'Student Academic Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Central Subject Catalog · Subject-Wise Marks Entry · Official BTEB 4.00 Grading Scale & Weighted CGPA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveScreen('book_list')}
              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Book List (বইয়ের তালিকা)</span>
            </button>
            {totalCatalogCredits > 0 && (
              <div className="text-right pl-2 border-l border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">Verified Credits</span>
                <span className="font-bold font-mono text-sm text-[#2563EB]">{totalCatalogCredits} Cr</span>
              </div>
            )}
          </div>
        </div>

        {/* Role & Privacy Notice for Teachers / Class Captains / Students */}
        <div className="mt-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              {accountType === 'teacher' || isVerifiedCaptain ? (
                <>
                  <strong>Educational & Advising Access:</strong> Teachers and Class Captains can simulate marks and GPA/CGPA for any department/semester. Saved records are strictly private to your own account (<strong>{userProfile.name}</strong>).
                </>
              ) : (
                <>
                  <strong>Private Student Records:</strong> Your saved semester marks and GPA calculations are linked privately to your account (<strong>{userProfile.name}</strong>).
                </>
              )}
            </span>
          </div>
        </div>

        {/* Technology, Regulation & Semester Selectors */}
        <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <SearchableDepartmentSelect
              value={selectedTechnology}
              onChange={(dept) => setSelectedTechnology(dept)}
              label="1. Department / Technology"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172554] mb-1.5 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>2. Catalog Regulation (প্রবিধান)</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              {(['2016', '2022'] as CatalogRegulation[]).map((reg) => (
                <button
                  key={reg}
                  type="button"
                  onClick={() => setSelectedRegulation(reg)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedRegulation === reg
                      ? 'bg-[#2563EB] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Regulation {reg}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#172554] mb-1.5 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>3. Semester (পর্ব ১–৮)</span>
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(Number(e.target.value) as SemesterNumber)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-[#172554] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {([1, 2, 3, 4, 5, 6, 7, 8] as SemesterNumber[]).map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: SUBJECT-WISE MARKS & SEMESTER GPA CALCULATOR               */}
      {/* ===================================================================== */}
      {isLoadingCatalog ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500">
          Loading subjects from Central Subject Catalog...
        </div>
      ) : catalogSubjects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#172554]">
            Book list is not available for this selection yet.
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No catalog subjects exist for <strong>{selectedTechnology}</strong> · Regulation{' '}
            <strong>{selectedRegulation}</strong> · <strong>Semester {selectedSemester}</strong>. Missing
            subjects or credits are never invented or borrowed from another semester.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Calculator Top Summary Banner */}
          <div className="bg-gradient-to-br from-indigo-950 via-blue-950 to-slate-900 p-4 sm:p-5 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-teal-500/20 text-teal-300 text-[11px] font-bold border border-teal-400/30">
                    <Calculator className="w-3.5 h-3.5" />
                    Semester {selectedSemester} GPA Calculator
                  </span>
                  {gpaSummary.isEstimate ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-200 text-[11px] font-bold border border-amber-400/30">
                      <AlertTriangle className="w-3 h-3" />
                      Estimate (See Data Notes Below)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-400/30">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified Catalog Credits & Marks
                    </span>
                  )}
                  {matchingSavedRecord && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-500/20 text-blue-200 text-[10px] font-semibold border border-blue-400/30">
                      Saved {new Date(matchingSavedRecord.updatedAt).toLocaleDateString('en-GB')}
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-bold">
                  {selectedTechnology} · Regulation {selectedRegulation} · Semester {selectedSemester}
                </h2>
                <p className="text-xs text-blue-200">
                  Enter obtained marks for each catalog subject to compute Percentage, Letter Grade, Grade Point, and Credit-Weighted GPA.
                </p>
              </div>

              {/* Live GPA Readout Card */}
              <div className="flex items-center gap-3 self-start sm:self-auto">
                <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl px-4 py-2.5 text-center min-w-[135px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block">
                    {gpaSummary.isEstimate ? 'Estimated SGPA' : 'Semester GPA'}
                  </span>
                  <div className="text-2xl font-black font-mono tracking-tight text-white">
                    {gpaSummary.semesterGpa !== null ? gpaSummary.semesterGpa.toFixed(2) : '—'}
                    <span className="text-xs font-normal text-blue-300"> / 4.00</span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-200 block">
                    {gpaSummary.semesterLetterGrade
                      ? `Grade: ${gpaSummary.semesterLetterGrade}${gpaSummary.hasFailedSubject ? ' (Referred/F)' : ''}`
                      : `${gpaSummary.evaluatedSubjectCount}/${gpaSummary.totalCatalogSubjects} Subjects`}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Toolbar inside Banner */}
            <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-blue-200">
                <span>
                  Evaluated: <strong>{gpaSummary.evaluatedSubjectCount}/{gpaSummary.totalCatalogSubjects}</strong> subjects
                </span>
                <span>·</span>
                <span>
                  Counted Credits: <strong>{gpaSummary.totalCreditsCounted} Cr</strong>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {subjectsMissingCatalogFullMarks.length > 0 && (
                  <button
                    type="button"
                    onClick={handleApplyProvisionalBtebFullMarks}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Apply Standard BTEB Full Marks (Cr × 50)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleFillDemoMarks}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-300" />
                  <span>Fill Sample Marks</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveCurrentSemesterResult}
                  disabled={isSavingRecord || gpaSummary.evaluatedSubjectCount === 0}
                  className="px-4 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>
                    {isSavingRecord
                      ? 'Saving...'
                      : matchingSavedRecord
                      ? `Update Semester ${selectedSemester} Result`
                      : `Save Semester ${selectedSemester} Result`}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Missing Full Marks / Credits Transparency Notice (Requirement I & J) */}
          {(subjectsMissingCatalogFullMarks.length > 0 ||
            subjectsMissingCatalogCredits.length > 0 ||
            gpaSummary.limitations.length > 0) && (
            <div className="p-3.5 bg-amber-50 border-b border-amber-200/80 text-xs text-amber-950 space-y-1.5">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">
                    Data Completeness & Estimate Notice:
                  </span>
                  {subjectsMissingCatalogFullMarks.length > 0 && (
                    <p className="text-[11px] text-amber-900">
                      • <strong>{subjectsMissingCatalogFullMarks.length}</strong> subject(s) in this catalog selection have verified Credits but do not have Full Marks explicitly stored in the source JSON dataset. Never inventing silent values: please enter the Full Marks for each subject below or click <strong>"Apply Standard BTEB Full Marks (Cr × 50)"</strong> to use provisional BTEB full marks (labeled as an Estimate).
                    </p>
                  )}
                  {subjectsMissingCatalogCredits.length > 0 && (
                    <p className="text-[11px] text-amber-900">
                      • <strong>{subjectsMissingCatalogCredits.length}</strong> subject(s) do not have verified Credits in the catalog. Enter provisional credits in the table below to include them in an estimated GPA calculation.
                    </p>
                  )}
                  {gpaSummary.limitations.map((lim, i) => (
                    <p key={i} className="text-[11px] text-amber-800">
                      • {lim}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Subject-Wise Marks Entry Table */}
          <div className="p-4 space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-2">Subject (Code & Name)</th>
                    <th className="py-2.5 px-2 text-center w-24">Credits</th>
                    <th className="py-2.5 px-2 text-center w-28">Full Marks</th>
                    <th className="py-2.5 px-2 text-center w-32">Obtained Marks</th>
                    <th className="py-2.5 px-2 text-center w-20">% Score</th>
                    <th className="py-2.5 px-2 text-center w-20">Grade</th>
                    <th className="py-2.5 px-2 text-right w-24">Grade Point</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjectEntries.map((entry) => {
                    const isFailed = entry.letterGrade === 'F';
                    const isEvaluated = entry.gradePoint !== null && !entry.error;

                    return (
                      <tr
                        key={entry.subjectCode}
                        className={`transition-colors ${
                          isFailed
                            ? 'bg-rose-50/50'
                            : isEvaluated
                            ? 'bg-emerald-50/20'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Subject Code & Name */}
                        <td className="py-3 px-2 align-middle">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-blue-50 text-[#2563EB] border border-blue-200">
                              {entry.subjectCode}
                            </span>
                            {entry.verificationStatus === 'verified' ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                                Verified
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800">
                                Provisional
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-slate-900 mt-1">
                            {entry.subjectName}
                          </div>
                          {entry.error && (
                            <div className="text-[10px] font-bold text-rose-600 mt-0.5">
                              {entry.error}
                            </div>
                          )}
                        </td>

                        {/* Credits */}
                        <td className="py-3 px-2 text-center align-middle">
                          {entry.catalogCredits !== null ? (
                            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg inline-block">
                              {entry.catalogCredits} Cr
                            </span>
                          ) : (
                            <div>
                              <input
                                type="number"
                                min={1}
                                max={10}
                                placeholder="Cr?"
                                value={entry.effectiveCredits ?? ''}
                                onChange={(e) => handleCreditsChange(entry.subjectCode, e.target.value)}
                                className="w-16 px-2 py-1 text-center font-mono font-bold rounded-lg border border-amber-300 bg-amber-50/60 text-amber-950 focus:outline-none focus:border-indigo-600"
                                title="Catalog credits missing — enter provisional credits"
                              />
                              <span className="block text-[9px] text-amber-700 font-semibold mt-0.5">
                                Provisional Cr
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Full Marks */}
                        <td className="py-3 px-2 text-center align-middle">
                          {entry.catalogFullMarks !== null ? (
                            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg inline-block">
                              {entry.catalogFullMarks}
                            </span>
                          ) : (
                            <div>
                              <input
                                type="number"
                                min={10}
                                max={500}
                                placeholder="e.g. 150"
                                value={entry.effectiveFullMarks ?? ''}
                                onChange={(e) => handleFullMarksChange(entry.subjectCode, e.target.value)}
                                className="w-20 px-2 py-1 text-center font-mono font-bold rounded-lg border border-amber-300 bg-amber-50/60 text-amber-950 focus:outline-none focus:border-indigo-600"
                                title="Catalog full marks not specified — enter full marks"
                              />
                              <span className="block text-[9px] text-amber-700 font-semibold mt-0.5">
                                {entry.effectiveFullMarks ? 'Provisional Max' : 'Set Max Marks'}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Obtained Marks Input */}
                        <td className="py-3 px-2 text-center align-middle">
                          <input
                            type="number"
                            min={0}
                            max={entry.effectiveFullMarks || 500}
                            step="any"
                            placeholder={
                              entry.effectiveFullMarks
                                ? `0 - ${entry.effectiveFullMarks}`
                                : 'Set Full Marks'
                            }
                            value={entry.obtainedMarks ?? ''}
                            onChange={(e) => handleObtainedMarksChange(entry.subjectCode, e.target.value)}
                            className={`w-24 px-2.5 py-1.5 text-center font-mono font-bold rounded-xl border text-xs focus:outline-none focus:ring-2 ${
                              entry.error
                                ? 'border-rose-400 bg-rose-50 text-rose-900 focus:ring-rose-400'
                                : entry.obtainedMarks !== null
                                ? 'border-indigo-300 bg-white text-indigo-950 focus:ring-indigo-500'
                                : 'border-slate-200 bg-slate-50 text-slate-800 focus:ring-blue-500'
                            }`}
                          />
                        </td>

                        {/* Percentage */}
                        <td className="py-3 px-2 text-center align-middle font-mono font-semibold text-slate-700">
                          {entry.percentage !== null ? `${entry.percentage.toFixed(1)}%` : '—'}
                        </td>

                        {/* Letter Grade */}
                        <td className="py-3 px-2 text-center align-middle">
                          {entry.letterGrade ? (
                            <span
                              className={`inline-block min-w-[36px] px-2 py-0.5 rounded-lg font-extrabold text-xs ${
                                entry.letterGrade === 'F'
                                  ? 'bg-rose-600 text-white'
                                  : entry.letterGrade.startsWith('A')
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : entry.letterGrade.startsWith('B')
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {entry.letterGrade}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Grade Point */}
                        <td className="py-3 px-2 text-right align-middle font-mono font-extrabold text-sm">
                          {entry.gradePoint !== null ? (
                            <span className={entry.gradePoint === 0 ? 'text-rose-600' : 'text-[#172554]'}>
                              {entry.gradePoint.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 2: MULTI-SEMESTER RESULTS & PROVISIONAL WEIGHTED CGPA         */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-[#172554]">
                  Overall Diploma CGPA Calculator (Semesters 1 – 8)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Estimate · Provisional Reference Weightages
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Uses regulation-specific semester weightages rather than a simple arithmetic average of semester GPAs.
              </p>
            </div>
          </div>

          {/* Regulation Weightage Switcher (2010 / 2016 / 2022 from supplied reference) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            {(['2010', '2016', '2022'] as CalculatorRegulation[]).map((reg) => (
              <button
                key={reg}
                type="button"
                onClick={() => setCgpaWeightRegulation(reg)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  cgpaWeightRegulation === reg
                    ? 'bg-indigo-950 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Probidhan {reg} Weights
              </button>
            ))}
          </div>
        </div>

        {/* Provisional Weightage Disclaimer Banner (Requirement H & J) */}
        <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Provisional Reference Weightage Notice: </span>
            {cgpaCalculation.weightageNote} Calculated CGPA values are clearly labeled as{' '}
            <strong>Estimates</strong> until verified against an official BTEB transcript.
          </div>
        </div>

        {/* 8-Semester Weightage & GPA Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          {cgpaCalculation.semesterBreakdown.map((item) => {
            const isCurrentSem = item.semester === selectedSemester;
            const savedForSem = savedRecords.find(
              r =>
                r.ownerUserId === userProfile.id &&
                r.technology.toLowerCase() === selectedTechnology.toLowerCase() &&
                r.semester === item.semester
            );

            return (
              <div
                key={item.semester}
                className={`rounded-2xl p-3 border transition-all flex flex-col justify-between ${
                  isCurrentSem
                    ? 'bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-200'
                    : item.gpa !== null
                    ? 'bg-emerald-50/30 border-emerald-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <button
                      type="button"
                      onClick={() => setSelectedSemester(item.semester)}
                      className="text-xs font-extrabold text-[#172554] hover:text-blue-600 underline cursor-pointer"
                    >
                      Sem {item.semester}
                    </button>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-slate-200 text-indigo-900">
                      {item.weightPercent}%
                    </span>
                  </div>

                  <input
                    type="number"
                    min={0}
                    max={4}
                    step="0.01"
                    placeholder={item.gpa !== null ? item.gpa.toFixed(2) : 'GPA'}
                    value={
                      manualSemesterGpas[item.semester] !== undefined
                        ? manualSemesterGpas[item.semester]
                        : item.gpa !== null
                        ? item.gpa.toFixed(2)
                        : ''
                    }
                    onChange={(e) =>
                      setManualSemesterGpas(prev => ({
                        ...prev,
                        [item.semester]: e.target.value
                      }))
                    }
                    className="w-full px-2 py-1.5 mt-1 rounded-xl border border-slate-200 bg-white font-mono font-bold text-sm text-center text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div className="mt-2 pt-1.5 border-t border-slate-200/70 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Weighted:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {item.weightedContribution !== null
                      ? item.weightedContribution.toFixed(3)
                      : '—'}
                  </span>
                </div>

                {savedForSem && (
                  <div className="mt-1 flex items-center justify-between text-[9px] text-emerald-700 font-semibold">
                    <span>Saved</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSavedRecord(savedForSem)}
                      className="text-rose-500 hover:text-rose-700"
                      title="Delete saved semester record"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CGPA Summary Cards: Weighted CGPA vs Simple Arithmetic Mean */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="rounded-2xl bg-indigo-950 text-white p-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block">
                {cgpaCalculation.completedSemestersCount === 8
                  ? `Estimated 8-Sem Weighted CGPA (${cgpaWeightRegulation})`
                  : `Partial Weighted CGPA (${cgpaCalculation.completedSemestersCount}/8 Semesters)`}
              </span>
              <div className="text-2xl font-black font-mono mt-0.5">
                {cgpaCalculation.weightedCgpa !== null
                  ? cgpaCalculation.weightedCgpa.toFixed(2)
                  : '—'}
                <span className="text-xs font-normal text-indigo-300"> / 4.00</span>
              </div>
              <span className="text-[10px] text-indigo-200 block mt-0.5">
                Weight Covered: {cgpaCalculation.totalWeightCovered}% of 100%
              </span>
            </div>
            <Award className="w-8 h-8 text-teal-400 shrink-0" />
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Simple Arithmetic Mean (For Comparison Only)
            </span>
            <div className="text-xl font-bold font-mono text-slate-800 mt-0.5">
              {cgpaCalculation.arithmeticMeanGpa !== null
                ? cgpaCalculation.arithmeticMeanGpa.toFixed(2)
                : '—'}
              <span className="text-xs font-normal text-slate-400"> / 4.00</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5">
              BTEB uses regulation semester weights, not simple average.
            </span>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Provisional Weightage Table (Reg {cgpaWeightRegulation})
            </span>
            <div className="text-[11px] font-mono font-bold text-slate-800 mt-1 leading-relaxed">
              {([1, 2, 3, 4, 5, 6, 7, 8] as SemesterNumber[])
                .map(
                  s =>
                    `S${s}:${PROVISIONAL_BTEB_SEMESTER_WEIGHTAGES[cgpaWeightRegulation].weights[s]}%`
                )
                .join(' · ')}
            </div>
          </div>
        </div>
      </div>

      {/* Official BTEB Examination Results & Group Lookup Banner */}
      <div className="bg-white rounded-2xl border border-blue-200/90 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#172554]">
              Official BTEB Board Examination Results (1st – 8th Semester)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Search individual board roll results, referred subject codes, or analyze group roll ranges
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActiveScreen('bteb_results')}
          className="px-4 py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          Open BTEB Results →
        </button>
      </div>

      {/* Official BTEB 4.00 Grading Scale Reference Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs text-xs space-y-2.5">
        <h4 className="font-bold text-[#172554] flex items-center gap-1.5">
          <Award className="w-4 h-4 text-amber-500" />
          <span>Official BTEB 4.00 Grading Scale Reference</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {OFFICIAL_BTEB_GRADE_SCALE.map((row) => (
            <div
              key={row.letterGrade}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between"
            >
              <div>
                <span className="font-extrabold text-[#172554] block">{row.letterGrade}</span>
                <span className="text-[10px] text-slate-500">{row.rangeLabel}</span>
              </div>
              <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {row.gradePoint.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
