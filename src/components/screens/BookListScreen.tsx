import { apiFetch } from '../../services/apiClient';
import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ShieldCheck,
  Clock,
  AlertCircle,
  Filter,
  Sparkles,
  ExternalLink,
  Layers,
  CheckCircle2,
  RotateCcw,
  Info
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TECHNOLOGIES_DIRECTORY, normalizeTechnology } from '../../data/directoryData';
import { buildStarterSubjectCatalog } from '../../data/starterSubjectCatalog';
import {
  CatalogRegulation,
  SemesterNumber,
  SubjectCatalogRecord
} from '../../types';

export const BookListScreen: React.FC = () => {
  const { userProfile, currentTeacherProfile, isServerVerifiedAdmin } = useApp();

  // Resolve user's default technology and semester if available
  const defaultTechId = useMemo(() => {
    const dept = currentTeacherProfile?.department || userProfile?.department;
    if (!dept) return 'tech_cst';
    return normalizeTechnology(dept).id;
  }, [currentTeacherProfile?.department, userProfile?.department]);

  const defaultSemester = useMemo<SemesterNumber | ''>(() => {
    if (currentTeacherProfile?.semestersTaught && currentTeacherProfile.semestersTaught.length > 0) {
      return currentTeacherProfile.semestersTaught[0];
    }
    return userProfile?.semester || 6;
  }, [currentTeacherProfile?.semestersTaught, userProfile?.semester]);

  // 3 Required Selectors: 1. Technology/Department, 2. Regulation (2016 or 2022), 3. Semester (1 to 8)
  const [selectedTechnologyKey, setSelectedTechnologyKey] = useState<string>(defaultTechId);
  const [selectedRegulation, setSelectedRegulation] = useState<CatalogRegulation | ''>(
    userProfile?.regulation || currentTeacherProfile?.regulation || '2022'
  );
  const [selectedSemester, setSelectedSemester] = useState<SemesterNumber | ''>(defaultSemester);

  // Search & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'code' | 'name' | 'marks' | 'status'>('code');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'verified' | 'provisional'>('ALL');

  // Fetched Catalog Records
  const [records, setRecords] = useState<SubjectCatalogRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const allThreeSelected = Boolean(
    selectedTechnologyKey &&
      (selectedRegulation === '2016' || selectedRegulation === '2022') &&
      selectedSemester !== '' &&
      Number(selectedSemester) >= 1 &&
      Number(selectedSemester) <= 8
  );

  const selectedTechObj = useMemo(
    () => TECHNOLOGIES_DIRECTORY.find((t) => t.id === selectedTechnologyKey) || null,
    [selectedTechnologyKey]
  );

  // Reset search when Technology, Regulation, or Semester changes
  useEffect(() => {
    setSearchQuery('');
  }, [selectedTechnologyKey, selectedRegulation, selectedSemester]);

  // Load matching subjects from Central Subject Catalog when all 3 selectors are chosen
  useEffect(() => {
    if (!allThreeSelected || !selectedRegulation || !selectedSemester) {
      setRecords([]);
      return;
    }

    let cancelled = false;
    const fetchCatalog = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          technology: selectedTechnologyKey,
          regulation: selectedRegulation,
          semester: String(selectedSemester),
          sortBy
        });
        const res = await apiFetch(`/api/catalog/subjects?${params.toString()}`);
        const data = await res.json();
        if (!cancelled && res.ok && Array.isArray(data.records)) {
          setRecords(data.records);
        }
      } catch {
        if (!cancelled) {
          const fallback = buildStarterSubjectCatalog().filter(
            (r) =>
              r.is_active &&
              r.technology_key === selectedTechnologyKey &&
              r.regulation === selectedRegulation &&
              r.semester === Number(selectedSemester)
          );
          setRecords(fallback);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCatalog();
    return () => {
      cancelled = true;
    };
  }, [selectedTechnologyKey, selectedRegulation, selectedSemester, sortBy, allThreeSelected]);

  // Filter and sort client-side for immediate search responsiveness
  const displayedSubjects = useMemo(() => {
    let list = [...records];

    if (statusFilter !== 'ALL') {
      list = list.filter((r) => r.verification_status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.subject_code.toLowerCase().includes(q) ||
          r.subject_name.toLowerCase().includes(q) ||
          (r.subject_type && r.subject_type.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'name') {
        return a.subject_name.localeCompare(b.subject_name);
      }
      if (sortBy === 'marks') {
        const ma = typeof a.marks === 'number' ? a.marks : Number(a.marks) || -1;
        const mb = typeof b.marks === 'number' ? b.marks : Number(b.marks) || -1;
        return mb - ma || a.subject_code.localeCompare(b.subject_code);
      }
      if (sortBy === 'status') {
        const order = { verified: 1, provisional: 2, unverified: 3 };
        return (
          (order[a.verification_status] || 9) - (order[b.verification_status] || 9) ||
          a.subject_code.localeCompare(b.subject_code)
        );
      }
      return a.subject_code.localeCompare(b.subject_code);
    });

    return list;
  }, [records, searchQuery, sortBy, statusFilter]);

  const verifiedCount = useMemo(
    () => records.filter((r) => r.verification_status === 'verified').length,
    [records]
  );
  const provisionalCount = useMemo(
    () => records.filter((r) => r.verification_status !== 'verified').length,
    [records]
  );

  const handleApplyMyProfile = () => {
    setSelectedTechnologyKey(defaultTechId);
    setSelectedRegulation(userProfile?.regulation || currentTeacherProfile?.regulation || '2022');
    setSelectedSemester(defaultSemester || 6);
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-end gap-2">
            {isServerVerifiedAdmin && (
              <button
                type="button"
                onClick={() => window.location.replace('https://admin.diplomamate.online/')}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[10px] font-bold hover:bg-amber-500/30 transition-colors"
              >
                Manage Catalog (Admin)
              </button>
            )}
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">
            Diploma Book List & Subject Directory
          </h1>
          <p className="text-xs text-blue-200/90 leading-relaxed">
            Select your Technology/Department, Regulation (2016 or 2022), and Semester (1–8) to view official BTEB subject codes, names, marks, and verification status.
          </p>
        </div>
      </div>

      {/* 3 Required Selectors Card */}
      <div className="bg-surface rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Select Curriculum Filters (বিভাগ, প্রবিধান ও পর্ব)
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApplyMyProfile}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              My Cohort
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => {
                setSelectedTechnologyKey('');
                setSelectedRegulation('');
                setSelectedSemester('');
              }}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Clear
            </button>
          </div>
        </div>

        {/* 1. Technology / Department Selector */}
        <div>
          <label
            htmlFor="booklist-technology-select"
            className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5"
          >
            1. Technology / Department (টেকনোলজি / বিভাগ) *
          </label>
          <select
            id="booklist-technology-select"
            value={selectedTechnologyKey}
            onChange={(e) => setSelectedTechnologyKey(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-surface transition-colors"
          >
            <option value="">-- Select Technology / Department (19 Technologies) --</option>
            {TECHNOLOGIES_DIRECTORY.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.name} [{tech.shortCode}]
              </option>
            ))}
          </select>
        </div>

        {/* 2. Regulation Selector (2016 or 2022) & 3. Semester Selector (1 to 8) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              2. Regulation (প্রবিধান: ২০১৬ / ২০২২) *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['2016', '2022'] as CatalogRegulation[]).map((reg) => {
                const active = selectedRegulation === reg;
                return (
                  <button
                    key={reg}
                    type="button"
                    onClick={() => setSelectedRegulation(reg)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      active
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{reg} Regulation</span>
                    {active && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="booklist-semester-select"
              className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5"
            >
              3. Semester (পর্ব: ১ম – ৮ম) *
            </label>
            <select
              id="booklist-semester-select"
              value={selectedSemester}
              onChange={(e) =>
                setSelectedSemester(e.target.value ? (Number(e.target.value) as SemesterNumber) : '')
              }
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-surface transition-colors"
            >
              <option value="">-- Select Semester (1 to 8) --</option>
              {([1, 2, 3, 4, 5, 6, 7, 8] as SemesterNumber[]).map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem} ({sem === 1 ? '1st' : sem === 2 ? '2nd' : sem === 3 ? '3rd' : `${sem}th`} Semester)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Semester Stepper Bar on Mobile */}
        <div className="pt-1">
          <div className="grid grid-cols-8 gap-1">
            {([1, 2, 3, 4, 5, 6, 7, 8] as SemesterNumber[]).map((sem) => {
              const active = selectedSemester === sem;
              return (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setSelectedSemester(sem)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${
                    active
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  S{sem}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* State 1: Waiting for all 3 selectors */}
      {!allThreeSelected && (
        <div className="bg-surface rounded-2xl p-6 border border-slate-200/80 text-center space-y-2">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Layers className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Please complete all three selections above (Technology/Department, Regulation 2016 or 2022, and Semester 1–8) to load the matching subject book list.
          </p>
        </div>
      )}

      {/* State 2: All 3 selected -> Search, Sort & Subject List */}
      {allThreeSelected && (
        <div className="space-y-3">
          {/* Active Selection Summary & Search/Sort Bar */}
          <div className="bg-surface rounded-2xl p-3.5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                  {selectedTechObj?.name}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Regulation {selectedRegulation} • Semester {selectedSemester} •{' '}
                  <span className="font-bold text-blue-600">{records.length} Subject{records.length === 1 ? '' : 's'}</span>
                </p>
              </div>
              {records.length > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-700 border border-green-200">
                    {verifiedCount} Verified
                  </span>
                  {provisionalCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                      {provisionalCount} Provisional
                    </span>
                  )}
                </div>
              )}
            </div>

            {records.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Search input */}
                <div className="sm:col-span-2 relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by subject code (e.g. 66661) or subject name..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-surface"
                  />
                </div>

                {/* Sort selector */}
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      aria-label="Sort subjects"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600"
                    >
                      <option value="code">Sort: Code (Asc)</option>
                      <option value="name">Sort: Name (A–Z)</option>
                      <option value="marks">Sort: Marks</option>
                      <option value="status">Sort: Verification</option>
                    </select>
                  </div>

                  <select
                    aria-label="Filter by verification status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600"
                  >
                    <option value="ALL">All Status</option>
                    <option value="verified">Verified</option>
                    <option value="provisional">Provisional</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-surface rounded-2xl p-6 border border-slate-200/80 text-center text-xs text-slate-500 font-semibold">
              Loading subject book list...
            </div>
          )}

          {/* Empty State when no data exists for this (Technology, Regulation, Semester) */}
          {!loading && records.length === 0 && (
            <div className="bg-surface rounded-2xl p-6 border border-slate-200/80 text-center space-y-2.5 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                Book list is not available for this selection yet.
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                No verified or provisional curriculum subjects have been imported yet for{' '}
                <span className="font-bold text-slate-700">{selectedTechObj?.name}</span> under{' '}
                <span className="font-bold text-slate-700">Regulation {selectedRegulation}</span>,{' '}
                <span className="font-bold text-slate-700">Semester {selectedSemester}</span>.
              </p>
            </div>
          )}

          {/* Empty Search Filter Result */}
          {!loading && records.length > 0 && displayedSubjects.length === 0 && (
            <div className="bg-surface rounded-2xl p-5 border border-slate-200/80 text-center space-y-2">
              <p className="text-xs font-bold text-slate-700">
                No subjects match your search "{searchQuery}".
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Reset search filter
              </button>
            </div>
          )}

          {/* Subject Cards List */}
          {!loading && displayedSubjects.length > 0 && (
            <div className="space-y-2.5">
              {displayedSubjects.map((subj, idx) => {
                const isVerified = subj.verification_status === 'verified';
                return (
                  <div
                    key={subj.id}
                    className="bg-surface rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-xs hover:border-blue-200 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400">
                            #{idx + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs font-extrabold">
                            Code: {subj.subject_code}
                          </span>
                          {subj.subject_type && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                              {subj.subject_type}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                          {subj.subject_name}
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-slate-600">
                          <span>
                            <strong className="text-slate-800">Regulation:</strong> {subj.regulation}
                          </span>
                          <span>•</span>
                          <span>
                            <strong className="text-slate-800">Semester:</strong> {subj.semester}
                          </span>
                          {subj.credits !== null && subj.credits !== undefined && (
                            <>
                              <span>•</span>
                              <span>
                                <strong className="text-slate-800">Credits:</strong> {subj.credits}
                              </span>
                            </>
                          )}
                          {subj.marks !== null && subj.marks !== undefined && (
                            <>
                              <span>•</span>
                              <span>
                                <strong className="text-slate-800">Marks:</strong> {subj.marks}
                              </span>
                            </>
                          )}
                          {subj.theory_per_week !== null && subj.theory_per_week !== undefined && (
                            <>
                              <span>•</span>
                              <span>
                                <strong className="text-slate-800">Theory/Wk:</strong> {subj.theory_per_week}
                              </span>
                            </>
                          )}
                          {subj.practical_per_week !== null && subj.practical_per_week !== undefined && (
                            <>
                              <span>•</span>
                              <span>
                                <strong className="text-slate-800">Practical/Wk:</strong> {subj.practical_per_week}
                              </span>
                            </>
                          )}
                        </div>

                        {subj.notes && (
                          <p className="text-[11px] text-slate-500 pt-1 flex items-start gap-1">
                            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span>{subj.notes}</span>
                          </p>
                        )}
                      </div>

                      {/* Verification Status Badge */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                            isVerified
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isVerified ? (
                            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                          )}
                          {subj.verification_status}
                        </span>

                        {subj.source_url && (
                          <a
                            href={subj.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:underline"
                          >
                            <span>BTEB Source</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Transparency Footer Banner removed — data-coverage paragraph deleted */}
        </div>
      )}
    </div>
  );
};
