import { apiFetch } from '../../services/apiClient';
import { nativeService } from '../../services/nativeService';
import { LiquidFillLoader } from '../LiquidFillLoader';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ArrowLeft,
  Search,
  Users,
  Award,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowUpDown,
  Database,
  ShieldCheck,
  Info,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Building2,
  Hash,
  BarChart3,
  Printer,
  Calendar,
  GraduationCap,
  Sparkles,
  HelpCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import {
  BtebResultBatch,
  GroupResultItem,
  GroupResultAnalytics,
  SemesterNumber,
  BtebRegulation,
  BtebExamType,
  BtebCurriculumId,
  BtebStudentResultStatement,
  BtebSemesterSummaryItem,
  BtebFailedSubjectDetail
} from '../../types';

type MainViewMode = 'search' | 'statement' | 'result-zone' | 'official-bteb';
type WorkspaceTab = 'individual' | 'group' | 'batches';
type GroupSortField = 'roll_asc' | 'roll_desc' | 'gpa_desc' | 'gpa_asc' | 'status';
type GroupStatusFilter = 'ALL' | 'PASSED' | 'REFERRED' | 'NOT_FOUND';

// DiplomaMate shows Diploma in Engineering results only — there is no
// curriculum picker anywhere in this flow. The gazette store itself holds
// Diploma in Engineering records only, and every Result Zone link carries
// the Diploma filter (see buildResultZoneUrl below).

const OFFICIAL_BTEB_RESULTS_URL = 'https://result.bteb.gov.bd/result-search';
const BTEB_RESULTS_ZONE_URL = 'https://btebresultszone.com/results';
// DiplomaMate is a diploma app: it shows Diploma in Engineering results
// ONLY. The same board roll can exist in several BTEB exams, and BTEB
// Result Zone defaults an unfiltered roll to another exam — verified live
// 2026-11-24: /results/750102 with no filter shows "SSC (Vocational)",
// while ?curriculumId=diploma_in_engineering shows "Diploma In
// Engineering (2022)". Every Result Zone link in this file MUST go through
// buildResultZoneUrl() so the filter can never be dropped by accident.
// Honest limit: the viewer is a cross-origin iframe, so DiplomaMate cannot
// read inside the page to verify which exam it actually shows — the banner
// in the viewer says so instead of claiming verification.
const RESULT_ZONE_DIPLOMA_FILTER = 'curriculumId=diploma_in_engineering';
const DIPLOMA_CURRICULUM_ID: BtebCurriculumId = 'diploma_in_engineering';
const DIPLOMA_CURRICULUM_LABEL = 'Diploma in Engineering';
const RESULT_LOOKUP_TIMEOUT_MS = 15_000;

type ResultLookupTransportFailure = 'timeout' | 'network' | 'request';

class ResultLookupRequestError extends Error {
  constructor(
    message: string,
    readonly failure: ResultLookupTransportFailure
  ) {
    super(message);
    this.name = 'ResultLookupRequestError';
  }
}

function normalizeRollInput(raw: string): string {
  const banglaDigits = '০১২৩৪৫৬৭৮৯';
  return String(raw || '')
    .trim()
    .replace(/[০-৯]/g, ch => String(banglaDigits.indexOf(ch)))
    .replace(/[\s\-_]+/g, '');
}

// Single place that builds a BTEB Result Zone URL. The Diploma in
// Engineering filter is ALWAYS attached — with a roll
// (/results/<roll>?curriculumId=diploma_in_engineering) and without one
// (the site's own search form). Never link to btebresultszone.com without
// this filter: an unfiltered roll defaults to another exam (verified live:
// roll 750102 unfiltered shows SSC Vocational, not Diploma).
function buildResultZoneUrl(roll?: string): string {
  const targetRoll = normalizeRollInput(roll || '');
  const base =
    targetRoll && /^\d{4,8}$/.test(targetRoll)
      ? `${BTEB_RESULTS_ZONE_URL}/${targetRoll}`
      : BTEB_RESULTS_ZONE_URL;
  return `${base}?${RESULT_ZONE_DIPLOMA_FILTER}`;
}

export const BTEBResultsScreen: React.FC = () => {
  const { userProfile, accountType, isServerVerifiedAdmin, setActiveScreen, showToast } = useApp();
  const canAccessAdminImport = accountType === 'system_admin' && isServerVerifiedAdmin;

  // View state: 'search' or 'statement' (Native results page)
  const [viewMode, setViewMode] = useState<MainViewMode>('search');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('individual');

  // Search input state
  const [rollInput, setRollInput] = useState<string>(userProfile.boardRoll || '');
  const [selectedRegulation, setSelectedRegulation] = useState<string>('all');
  const isResultLookupInProgress = useRef(false);

  // Result retrieval status distinguishes missing local data from transport/service failures.
  const [searchStatus, setSearchStatus] = useState<
    | 'idle'
    | 'loading'
    | 'not_found'
    | 'error'
    | 'rate_limited'
    | 'external_unavailable'
    | 'timeout'
    | 'network_error'
    | 'service_unavailable'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [notFoundRoll, setNotFoundRoll] = useState<string>('');
  const [alternateCurricula, setAlternateCurricula] = useState<string[]>([]);
  const [statementSourceNotice, setStatementSourceNotice] = useState<string | null>(null);
  const [activeStatement, setActiveStatement] = useState<BtebStudentResultStatement | null>(null);

  // In-app BTEB Result Zone viewer state (live result shown inside DiplomaMate)
  const [zoneRollInput, setZoneRollInput] = useState<string>(userProfile.boardRoll || '');
  const [zoneUrl, setZoneUrl] = useState<string>(BTEB_RESULTS_ZONE_URL);
  const [isZoneFrameLoading, setIsZoneFrameLoading] = useState<boolean>(true);
  // Roll that was auto-sent to Result Zone after a DiplomaMate gazette miss.
  // Shown in the viewer so the student knows why they are seeing Result Zone.
  const [zoneFallbackRoll, setZoneFallbackRoll] = useState<string | null>(null);

  // In-app official BTEB portal viewer state
  const [isOfficialFrameLoading, setIsOfficialFrameLoading] = useState<boolean>(true);

  // Statement page filters & navigation
  const [selectedSemesterTab, setSelectedSemesterTab] = useState<'all' | number>('all');

  // Published batches metadata from backend
  const [batches, setBatches] = useState<BtebResultBatch[]>([]);
  const [totalRecordsInDb, setTotalRecordsInDb] = useState<number>(0);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(true);

  // Group search state
  const [groupRollInput, setGroupRollInput] = useState<string>('');
  const [groupSemester, setGroupSemester] = useState<string>('all');
  const [groupRegulation, setGroupRegulation] = useState<string>('all');
  const [groupExamYear, setGroupExamYear] = useState<string>('all');
  const [groupExamType, setGroupExamType] = useState<string>('all');
  const [isSearchingGroup, setIsSearchingGroup] = useState<boolean>(false);
  const [groupResultData, setGroupResultData] = useState<{
    items: GroupResultItem[];
    analytics: GroupResultAnalytics;
    invalidTokens: string[];
    truncated: boolean;
    totalBatchesInDatabase: number;
  } | null>(null);
  const [groupError, setGroupError] = useState<string>('');
  const [groupSort, setGroupSort] = useState<GroupSortField>('roll_asc');
  const [groupFilter, setGroupFilter] = useState<GroupStatusFilter>('ALL');
  const [expandedGroupRoll, setExpandedGroupRoll] = useState<string | null>(null);

  const semestersList: SemesterNumber[] = [1, 2, 3, 4, 5, 6, 7, 8];
  const regulationsList: BtebRegulation[] = ['2022', '2016', '2010'];
  const examTypesList: BtebExamType[] = ['Regular', 'Irregular', 'Improvement'];

  const openOfficialResultPortal = async () => {
    try {
      await nativeService.openExternalUrl(OFFICIAL_BTEB_RESULTS_URL);
    } catch (error) {
      console.error('Failed to open official BTEB result portal:', error);
      showToast('Could not open the official BTEB Result Portal.');
    }
  };

  const openBtebResultsZone = async () => {
    try {
      // Rebuild the link from the current roll instead of reusing a stored
      // URL, so the Diploma filter can never be lost — "Open in Browser"
      // always shows exactly what the viewer shows.
      await nativeService.openExternalUrl(buildResultZoneUrl(zoneRollInput));
    } catch (error) {
      console.error('Failed to open BTEB Results Zone:', error);
      showToast('Could not open BTEB Results Zone.');
    }
  };

  // Copy text (roll / registration no) so the student can paste it into the
  // official portal's form, which DiplomaMate cannot fill for them.
  const copyTextToClipboard = async (value: string, label: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast(`${label} copied — paste it into the portal form.`);
    } catch (error) {
      console.error('Failed to copy text:', error);
      showToast(`Could not copy ${label}. Please type it manually.`);
    }
  };

  // Open the BTEB Result Zone viewer inside the app. A valid roll deep-links
  // straight to that roll's result page (btebresultszone.com/results/<roll>);
  // without a roll it opens the site's own roll search form.
  // `fromGazetteMiss` marks the unified-flow step 2: View Result found
  // nothing in DiplomaMate's own gazette, so the viewer opens automatically.
  const openResultZone = (roll?: string, fromGazetteMiss = false) => {
    const targetRoll = normalizeRollInput(roll !== undefined ? roll : zoneRollInput);
    setZoneRollInput(targetRoll);
    setZoneFallbackRoll(fromGazetteMiss ? targetRoll : null);
    // Always through buildResultZoneUrl — the Diploma in Engineering
    // filter is attached even when there is no roll yet.
    setZoneUrl(buildResultZoneUrl(targetRoll));
    setIsZoneFrameLoading(true);
    setViewMode('result-zone');
  };

  // Open the official BTEB result portal inside the app. The portal asks for
  // exam, curriculum, semester, year, roll, registration number and an image
  // captcha that only the student can solve on the portal itself, so the
  // embedded page shows the portal's own form — the student fills it without
  // leaving the app. Defined here (before the view returns) because the
  // Result Zone viewer links to it as the unified flow's step 3.
  const openOfficialBteb = () => {
    setZoneFallbackRoll(null);
    setIsOfficialFrameLoading(true);
    setViewMode('official-bteb');
  };

  const requestResultLookup = async (url: string): Promise<{ response: Response; data: any }> => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      let timedOut = false;
      const timeoutId = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, RESULT_LOOKUP_TIMEOUT_MS);

      try {
        const response = await apiFetch(url, { signal: controller.signal });
        let data: any = null;
        try {
          data = await response.json();
        } catch (error) {
          if (controller.signal.aborted) throw error;
          if (!(error instanceof SyntaxError)) throw error;
        }
        return { response, data };
      } catch (error) {
        const failure: ResultLookupTransportFailure =
          timedOut || (error instanceof Error && error.name === 'AbortError')
            ? 'timeout'
            : error instanceof TypeError
              ? 'network'
              : 'request';

        if (attempt === 0 && (failure === 'timeout' || failure === 'network')) {
          continue;
        }

        const message =
          failure === 'timeout'
            ? 'The result lookup request timed out.'
            : failure === 'network'
              ? 'Could not connect to DiplomaMate’s result service.'
              : 'The result service returned an unreadable response.';
        throw new ResultLookupRequestError(message, failure);
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    throw new ResultLookupRequestError('Could not connect to DiplomaMate’s result service.', 'network');
  };

  // Fetch batches
  const fetchBatches = async () => {
    setIsLoadingBatches(true);
    try {
      const res = await apiFetch('/api/results/batches');
      const data = await res.json();
      if (data.success) {
        setBatches(data.batches || []);
        setTotalRecordsInDb(data.totalStudentRecords || 0);
      }
    } catch (err) {
      console.error('Failed to load BTEB result batches:', err);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  // Live preview of count in group box (supports Bangla numerals too)
  const parsedGroupPreviewCount = useMemo(() => {
    if (!groupRollInput.trim()) return 0;
    const banglaDigits = '০১২৩৪৫৬৭৮৯';
    const normalizedInput = groupRollInput.replace(/[০-৯]/g, ch => String(banglaDigits.indexOf(ch)));
    const set = new Set<string>();
    const segments = normalizedInput.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    for (const seg of segments) {
      const m = seg.match(/^(\d{4,8})\s*-\s*(\d{4,8})$/);
      if (m) {
        const s = parseInt(m[1], 10);
        const e = parseInt(m[2], 10);
        if (e >= s && e - s <= 500) {
          for (let r = s; r <= e && set.size < 150; r++) {
            set.add(String(r));
          }
        }
      } else {
        const toks = seg.split(/\s+/).filter(Boolean);
        for (const t of toks) {
          const clean = normalizeRollInput(t);
          if (/^\d{4,8}$/.test(clean) && set.size < 150) {
            set.add(clean);
          }
        }
      }
    }
    return set.size;
  }, [groupRollInput]);

  // Main Native Result Lookup Handler — gazette first (step 1 of the
  // unified flow). The curriculum is always Diploma in Engineering: the
  // gazette store holds Diploma records only, and Result Zone is always
  // opened with the Diploma filter, so no other exam can be shown.
  const handleViewResult = async (
    overrideRoll?: string,
    overrideRegulation?: string
  ) => {
    if (isResultLookupInProgress.current) return;

    const rawTarget = overrideRoll !== undefined ? overrideRoll : rollInput;
    const targetRoll = normalizeRollInput(rawTarget);
    const effectiveCurriculum = DIPLOMA_CURRICULUM_ID;
    const effectiveRegulation = overrideRegulation !== undefined ? overrideRegulation : selectedRegulation;

    if (overrideRoll !== undefined) setRollInput(targetRoll);
    if (overrideRegulation !== undefined) setSelectedRegulation(overrideRegulation);

    setErrorMessage('');
    setAlternateCurricula([]);
    setStatementSourceNotice(null);

    if (!targetRoll || !/^\d{4,8}$/.test(targetRoll)) {
      setSearchStatus('error');
      setErrorMessage('Please enter a valid BTEB Board Roll Number (4 to 8 numeric digits).');
      return;
    }

    isResultLookupInProgress.current = true;
    setSearchStatus('loading');
    setNotFoundRoll('');

    try {
      const params = new URLSearchParams({
        roll: targetRoll,
        curriculum: effectiveCurriculum,
        regulation: effectiveRegulation
      });

      const { response: res, data } = await requestResultLookup(`/api/results/lookup?${params.toString()}`);

      if (res.status === 429 || data?.rateLimited) {
        setSearchStatus('rate_limited');
        setErrorMessage(data?.error || 'The result lookup service is temporarily limiting requests. Please retry shortly.');
        return;
      }

      if (data?.externalUnavailable && data?.found === false) {
        console.warn(
          'BTEB result is not present in the imported Gazette records:',
          data.error || 'Result is not in the imported Gazette records.'
        );
        setSearchStatus('not_found');
        setNotFoundRoll(targetRoll);
        setErrorMessage('');
        // Unified flow, step 2: not in our gazette, so open BTEB Result
        // Zone automatically inside the app with this roll.
        openResultZone(targetRoll, true);
        return;
      }

      if (data?.timeout) {
        setSearchStatus('timeout');
        setErrorMessage(
          data.error || 'The result lookup timed out after 15 seconds. This does not mean the student has no result; please try again.'
        );
        return;
      }

      if (!res.ok) {
        console.error(`BTEB result API returned HTTP ${res.status}:`, data?.error || 'No error details returned.');
        if (res.status >= 500) {
          setSearchStatus('service_unavailable');
          setErrorMessage(data?.error || 'DiplomaMate’s result service is temporarily unavailable. Please try again later.');
        } else {
          setSearchStatus('error');
          setErrorMessage(data?.error || `The result service returned HTTP ${res.status}. Please check the request and try again.`);
        }
        return;
      }

      if (!data) {
        setSearchStatus('error');
        setErrorMessage('The result service returned an unreadable response. Please try again later.');
        return;
      }

      if (data.externalUnavailable) {
        setSearchStatus('service_unavailable');
        setErrorMessage(data.error || 'The result service is temporarily unavailable. This does not mean the student has no result.');
        return;
      }

      if (!data.found || !data.statement) {
        setSearchStatus('not_found');
        setNotFoundRoll(targetRoll);
        setAlternateCurricula(Array.isArray(data.alternateCurricula) ? data.alternateCurricula : []);
        // Unified flow, step 2: not in our gazette, so open BTEB Result
        // Zone automatically inside the app with this roll.
        openResultZone(targetRoll, true);
        return;
      }

      // Success: open native result statement page inside DiplomaMate
      setActiveStatement(data.statement);
      setStatementSourceNotice(data.notice || null);
      setViewMode('statement');
      setSelectedSemesterTab('all');
      setSearchStatus('idle');
      showToast(`Results loaded for Board Roll ${targetRoll}`);
    } catch (err) {
      const failure = err instanceof ResultLookupRequestError ? err.failure : 'request';
      const reason = err instanceof Error ? err.message : 'Unknown result lookup error.';
      console.error('BTEB Result lookup request failed:', reason);
      if (failure === 'timeout') {
        setSearchStatus('timeout');
        setErrorMessage('The result lookup timed out after 15 seconds, including one retry. This does not mean the student has no result; please try again.');
      } else if (failure === 'network') {
        setSearchStatus('network_error');
        setErrorMessage('Could not connect to DiplomaMate’s result service after one retry. Check your internet connection, backend URL, and CORS settings.');
      } else {
        setSearchStatus('error');
        setErrorMessage(reason);
      }
    } finally {
      isResultLookupInProgress.current = false;
    }
  };

  const handleGroupSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGroupError('');
    if (!groupRollInput.trim()) {
      setGroupError('Please enter comma-separated Board Roll numbers or a valid roll range (e.g., 750101-750120).');
      return;
    }

    setIsSearchingGroup(true);
    try {
      const res = await apiFetch('/api/results/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollInput: groupRollInput,
          semester: groupSemester,
          regulation: groupRegulation,
          examYear: groupExamYear,
          examType: groupExamType
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setGroupError(data.error || 'Group result query failed.');
      } else {
        setGroupResultData(data);
        setExpandedGroupRoll(null);
      }
    } catch {
      setGroupError('Network error while performing group result analysis.');
    } finally {
      setIsSearchingGroup(false);
    }
  };

  // Group-search suggestions come only from real data. The previous
  // hardcoded roll list (and the invented seed roster) was removed in the
  // 2026-11-26 compliance pass: no gazette roll list is available on the
  // client, so only the signed-in user's own board roll is pre-filled.
  // Any other rolls must be typed in manually.
  const handleLoadSectionRosterRolls = () => {
    const combined = userProfile.boardRoll ? [userProfile.boardRoll] : [];
    setGroupRollInput(combined.join(', '));
    setGroupSemester('all');
    setGroupRegulation('all');
    showToast(
      combined.length
        ? 'Loaded your own board roll into Group Search — add other rolls manually'
        : 'No imported gazette rolls available — enter rolls manually'
    );
  };

  // Trigger print / save PDF
  const handlePrintOrSavePdf = () => {
    window.print();
  };

  const formatOrdinal = (num: number) => {
    if (num === 1) return '1st';
    if (num === 2) return '2nd';
    if (num === 3) return '3rd';
    return `${num}th`;
  };

  const getGpaBadge = (gpa: number | null | undefined) => {
    if (gpa === null || gpa === undefined) return '—';
    return gpa.toFixed(2);
  };

  const getGpaScaleComment = (gpa: number | null | undefined) => {
    if (gpa === null || gpa === undefined) return '';
    if (gpa >= 4.0) return 'A+ (Outstanding)';
    if (gpa >= 3.75) return 'A (Excellent)';
    if (gpa >= 3.5) return 'A- (Very Good)';
    if (gpa >= 3.25) return 'B+ (Good)';
    if (gpa >= 3.0) return 'B (Above Average)';
    if (gpa >= 2.75) return 'B- (Average)';
    if (gpa >= 2.5) return 'C+ (Satisfactory)';
    if (gpa >= 2.25) return 'C (Pass)';
    if (gpa >= 2.0) return 'D (Minimum Pass)';
    return 'F (Fail)';
  };

  // Filtered semester results for active statement
  const displayedSemesterItems = useMemo(() => {
    if (!activeStatement) return [];
    if (selectedSemesterTab === 'all') {
      return activeStatement.semesterResults;
    }
    return activeStatement.semesterResults.filter(s => s.semester === selectedSemesterTab);
  }, [activeStatement, selectedSemesterTab]);

  // ============================================================================
  // VIEW MODE: NATIVE RESULTS PAGE INSIDE DIPLOMAMATE
  // ============================================================================
  if (viewMode === 'statement' && activeStatement) {
    const isCompleted = activeStatement.overallStatus === 'passed_all';
    const isReferredPending = activeStatement.overallStatus === 'referred_pending';

    return (
      <div className="space-y-4 pb-16 print-page-container">
        {/* Navigation & Action Bar (Hidden during print) */}
        <div className="no-print bg-surface rounded-2xl border border-slate-200/90 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('search')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-xs gap-1.5 cursor-pointer"
              title="Return to Result Search"
            >
              <ArrowLeft aria-hidden="true" className="w-4 h-4" />
              <span>Back to Search</span>
            </button>

            <div className="h-5 w-px bg-slate-200 hidden sm:block" />

            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
              Viewing Official Result for Roll <strong className="font-mono text-text-primary">{activeStatement.rollNumber}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintOrSavePdf}
              className="allow-print px-3.5 py-2 rounded-xl bg-brand-blue hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Print result sheet or save as PDF"
            >
              <Printer aria-hidden="true" className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveStatement(null);
                setViewMode('search');
              }}
              className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Search Another Roll
            </button>
          </div>
        </div>

        {/* Official Academic Transcript Card / Statement */}
        <div className="dm-card overflow-hidden print-card">
          {/* Official BTEB Header Header Strip */}
          <div className="bg-blue-950 text-white p-5 sm:p-6 relative">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30 text-[11px] font-bold">
                    <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5 text-teal-300" />
                    Gazette Result Statement (admin-imported)
                  </span>
                  <span className="text-[11px] text-blue-200 font-mono">
                    {activeStatement.regulation} Probidhan
                  </span>
                </div>
                <h1 className="ios-large-title text-xl sm:text-2xl font-black tracking-tight text-white">
                  Bangladesh Technical Education Board
                </h1>
                <p className="text-xs sm:text-sm text-blue-200 font-medium">
                  {activeStatement.curriculumName} · Academic Progression Sheet
                </p>
              </div>

              {/* Status Emblem */}
              <div className="sm:text-right shrink-0">
                {isCompleted ? (
                  <div className="inline-flex flex-col sm:items-end bg-green-500/20 border border-green-400/40 px-3.5 py-2 rounded-2xl">
                    <span className="text-[10px] font-extrabold uppercase text-green-300 tracking-wider flex items-center gap-1">
                      <Award aria-hidden="true" className="w-3.5 h-3.5" />
                      Diploma Completed
                    </span>
                    <span className="text-xl font-black font-mono text-green-200">
                      CGPA {activeStatement.overallCgpa?.toFixed(2) || 'PASS'}
                    </span>
                  </div>
                ) : isReferredPending ? (
                  <div className="inline-flex flex-col sm:items-end bg-amber-500/20 border border-amber-400/40 px-3.5 py-2 rounded-2xl">
                    <span className="text-[10px] font-extrabold uppercase text-amber-300 tracking-wider flex items-center gap-1">
                      <AlertTriangle aria-hidden="true" className="w-3.5 h-3.5" />
                      Referred Pending
                    </span>
                    <span className="text-sm font-extrabold text-amber-200 font-mono">
                      {activeStatement.currentFailedSubjects.length} Subject{activeStatement.currentFailedSubjects.length !== 1 ? 's' : ''} to Clear
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex flex-col sm:items-end bg-blue-500/20 border border-blue-400/40 px-3.5 py-2 rounded-2xl">
                    <span className="text-[10px] font-extrabold uppercase text-blue-300 tracking-wider">
                      Academic Progress
                    </span>
                    <span className="text-sm font-extrabold text-blue-100 font-mono">
                      {activeStatement.completedSemestersCount} Semesters Cleared
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Student & Polytechnic Identification Grid */}
          <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/60">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 bg-surface rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  BTEB Board Roll
                </span>
                <span className="text-base sm:text-lg font-black font-mono text-text-primary tracking-tight tabular-nums block mt-0.5">
                  {activeStatement.rollNumber}
                </span>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Curriculum & Reg
                </span>
                <span className="font-bold text-text-primary text-xs sm:text-sm block mt-0.5 truncate" title={activeStatement.curriculumName}>
                  {activeStatement.curriculumName}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {activeStatement.regulation} Probidhan
                </span>
              </div>

              <div className="p-3 bg-surface rounded-xl border border-slate-200/80 shadow-2xs col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Polytechnic Institute
                </span>
                <span className="font-bold text-text-primary text-xs sm:text-sm block mt-0.5">
                  {activeStatement.institute.name}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Code: {activeStatement.institute.code} {activeStatement.institute.district ? `· District: ${activeStatement.institute.district}` : ''}
                </span>
              </div>
            </div>

            {(activeStatement.regulationNote || statementSourceNotice) && (
              <div className="mt-3 p-2.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
                <Info aria-hidden="true" className="w-4 h-4 text-brand-blue shrink-0" />
                <span>
                  {activeStatement.regulationNote}
                  {activeStatement.regulationNote && statementSourceNotice ? ' · ' : ''}
                  {statementSourceNotice}
                </span>
              </div>
            )}
          </div>

          {/* Multi-Semester Progression Timeline (1st to 8th Semester) */}
          <div className="p-4 sm:p-6 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <Calendar aria-hidden="true" className="w-3.5 h-3.5 text-brand-blue" />
                <span>1st through 8th Semester Progression Strip</span>
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                {activeStatement.semesterResults.length} Published Semester{activeStatement.semesterResults.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {semestersList.map(sem => {
                const semRec = activeStatement.semesterResults.find(s => s.semester === sem);
                const isPassed = semRec?.status === 'passed';
                const isReferred = semRec?.status === 'referred' || semRec?.status === 'failed';
                const isWithheld = semRec?.status === 'withheld';
                const isSelected = selectedSemesterTab === sem;
                const activeRefCount = semRec?.failedSubjects.filter(f => !f.passed).length || semRec?.failedSubjects.length || 0;

                return (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setSelectedSemesterTab(selectedSemesterTab === sem ? 'all' : sem)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-brand-blue shadow-xs'
                        : ''
                    } ${
                      isPassed
                        ? 'bg-green-50/80 border-green-200 text-green-950 hover:border-green-400'
                        : isReferred
                          ? 'bg-amber-50/80 border-amber-200 text-amber-950 hover:border-amber-400'
                          : isWithheld
                            ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                            : 'bg-slate-50 border-slate-200/60 text-slate-400'
                    }`}
                  >
                    <span className="text-[10px] font-bold block">
                      {formatOrdinal(sem)}
                    </span>
                    {isPassed ? (
                      <span className="text-xs font-black font-mono text-green-700 block mt-0.5 tabular-nums">
                        {semRec?.gpa ? semRec.gpa.toFixed(2) : 'PASS'}
                      </span>
                    ) : isReferred ? (
                      <span className="text-[10px] font-bold text-amber-800 block mt-0.5">
                        REF ({activeRefCount || '!'})
                      </span>
                    ) : isWithheld ? (
                      <span className="text-[10px] font-bold text-rose-800 block mt-0.5">
                        WH
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono block mt-0.5 text-slate-300">
                        —
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedSemesterTab !== 'all' && (
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">
                  Filtered to: <strong>{formatOrdinal(selectedSemesterTab)} Semester</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSemesterTab('all')}
                  className="text-brand-blue font-bold hover:underline"
                >
                  Show All Semesters
                </button>
              </div>
            )}
          </div>

          {/* Pending Referred Subjects Notice Banner (if any) */}
          {activeStatement.currentFailedSubjects.length > 0 && (
            <div className="m-4 sm:m-6 p-4 rounded-2xl bg-amber-50 border border-amber-200/90 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle aria-hidden="true" className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-amber-950">
                    Action Required: {activeStatement.currentFailedSubjects.length} Referred Subject(s) Currently Uncleared
                  </h3>
                  <p className="text-xs text-amber-800/90 mt-0.5">
                    According to BTEB examination regulations, a student must clear all referred theoretical (T) and practical (P) components in the upcoming examination to receive their official final GPA.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {activeStatement.currentFailedSubjects.map((sub, idx) => (
                  <div
                    key={`${sub.subCode}_${idx}`}
                    className="p-3 bg-surface rounded-xl border border-amber-200/80 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded text-[11px]">
                          {sub.subCode}
                        </span>
                        <span className="font-bold text-text-primary">
                          {sub.subName || `Subject Code ${sub.subCode}`}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Origin: {formatOrdinal(sub.originSemester)} Semester
                      </span>
                    </div>

                    <span className="px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono font-bold text-[10px] shrink-0">
                      Failed: {sub.type === 'T' ? 'Theory (T)' : sub.type === 'P' ? 'Practical (P)' : sub.type === 'T,P' ? 'Theory & Practical (T,P)' : sub.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Semester-by-Semester Cards */}
          <div className="p-4 sm:p-6 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
              <GraduationCap aria-hidden="true" className="w-4 h-4 text-brand-blue" />
              <span>Official Semester-Wise Examination Results</span>
            </h2>

            {displayedSemesterItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No examination records match this semester filter.
              </div>
            ) : (
              <div className="space-y-4">
                {displayedSemesterItems.map(semItem => {
                  const isPass = semItem.status === 'passed';
                  const isRef = semItem.status === 'referred' || semItem.status === 'failed';
                  const activeSemFailedCount = semItem.failedSubjects.filter(f => !f.passed).length || semItem.failedSubjects.length;

                  return (
                    <div
                      key={semItem.semester}
                      className="border border-slate-200 rounded-2xl overflow-hidden bg-surface shadow-xs"
                    >
                      {/* Card Header */}
                      <div
                        className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${
                          isPass
                            ? 'bg-green-50/70 border-green-200/80 text-green-950'
                            : isRef
                              ? 'bg-amber-50/70 border-amber-200/80 text-amber-950'
                              : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-text-primary text-white text-[11px] font-bold uppercase font-mono">
                              {formatOrdinal(semItem.semester)} Semester
                            </span>
                            <span className="text-xs font-semibold text-slate-600">
                              {activeStatement.regulation} Probidhan
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-text-primary mt-1">
                            {formatOrdinal(semItem.semester)} Semester Examination Result
                          </h3>
                        </div>

                        <div className="flex items-center gap-3">
                          {isPass ? (
                            <div className="bg-surface px-3.5 py-2 rounded-xl border border-green-200 shadow-2xs flex items-center gap-2">
                              <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-green-600" />
                              <div>
                                <span className="text-[10px] font-bold uppercase text-green-700 block">
                                  Semester GPA
                                </span>
                                <span className="text-base font-black font-mono text-green-800 tabular-nums">
                                  {semItem.gpa !== null && semItem.gpa !== undefined ? semItem.gpa.toFixed(2) : 'PASS'}
                                </span>
                              </div>
                            </div>
                          ) : isRef ? (
                            <div className="bg-surface px-3.5 py-2 rounded-xl border border-amber-300 shadow-2xs flex items-center gap-2">
                              <AlertTriangle aria-hidden="true" className="w-4 h-4 text-amber-600" />
                              <div>
                                <span className="text-[10px] font-bold uppercase text-amber-700 block">
                                  Result Status
                                </span>
                                <span className="text-xs font-extrabold text-amber-900 font-mono">
                                  REFERRED ({activeSemFailedCount} Subj)
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">
                              {semItem.status.toUpperCase()}
                            </span>
                          )}

                          {semItem.cgpa && (
                            <div className="bg-surface px-3 py-1.5 rounded-xl border border-blue-200">
                              <span className="text-[10px] font-bold text-brand-blue block">CGPA</span>
                              <span className="text-sm font-extrabold font-mono text-text-primary">
                                {semItem.cgpa.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Content & Breakdown */}
                      <div className="p-4 space-y-3 text-xs">
                        {isPass && semItem.gpa !== null && (
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-green-50/50 border border-green-200/60">
                            <span className="font-semibold text-green-950">
                              Status: Clear Pass across all prescribed curriculum subjects
                            </span>
                            <span className="font-bold text-green-800 bg-surface px-2 py-0.5 rounded border border-green-200 text-[11px]">
                              {getGpaScaleComment(semItem.gpa)}
                            </span>
                          </div>
                        )}

                        {/* Referred / Cleared Subjects List if any */}
                        {semItem.failedSubjects.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="font-bold text-amber-950 text-[11px] uppercase tracking-wider block">
                              Referred & Cleared Subject Breakdown:
                            </span>
                            <div className="divide-y divide-amber-100 border border-amber-200 rounded-xl overflow-hidden bg-amber-50/30">
                              {semItem.failedSubjects.map((fs, idx) => (
                                <div
                                  key={`${fs.subCode}_${idx}`}
                                  className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`font-mono font-bold px-2 py-0.5 rounded text-xs border ${
                                        fs.passed
                                          ? 'bg-green-100 text-green-900 border-green-300'
                                          : 'bg-amber-100 text-amber-900 border-amber-300'
                                      }`}
                                    >
                                      {fs.subCode}
                                    </span>
                                    <span className="font-semibold text-text-primary">
                                      {fs.subName || `Subject Code ${fs.subCode}`}
                                    </span>
                                  </div>
                                  {fs.passed ? (
                                    <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 border border-green-200 font-mono font-bold text-[10px] self-start sm:self-center">
                                      Cleared in Subsequent Exam ({fs.type === 'T' ? 'Theory' : fs.type === 'P' ? 'Practical' : fs.type})
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 font-mono font-bold text-[10px] self-start sm:self-center">
                                      Failed: {fs.type === 'T' ? 'Theory (T)' : fs.type === 'P' ? 'Practical (P)' : fs.type}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Publications & Gazette Provenance */}
                        <div className="pt-2 border-t border-slate-100 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Official BTEB Publication Gazette Reference:
                          </span>
                          <div className="space-y-1">
                            {semItem.publications.map((pub, pIdx) => (
                              <div
                                key={pIdx}
                                className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600"
                              >
                                <span className="font-mono text-slate-700">
                                  📄 {pub.fileName || 'Official Result Book PDF'}
                                </span>
                                <div className="flex items-center gap-2 text-slate-500">
                                  <span>
                                    Published: {pub.date ? new Date(pub.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Official Gazette'}
                                  </span>
                                  {pub.republished && (
                                    <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                                      Republished
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Legal Provenance & Disclaimer Footer */}
          <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck aria-hidden="true" className="w-4 h-4 text-green-600" />
                <span className="font-bold text-text-primary">
                  Data Source: {activeStatement.dataSourceLabel}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Retrieved: {new Date(activeStatement.retrievedAt).toLocaleString('en-GB')}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500">
              This result transcript is retrieved and formatted for academic tracking within DiplomaMate. The signed paper gazette and official transcript issued by the Bangladesh Technical Education Board (BTEB) and your polytechnic registrar remain the official legal authority.
            </p>
          </div>
        </div>

        {/* Quick Footer Action Buttons (Hidden during print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => setViewMode('search')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-surface hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft aria-hidden="true" className="w-4 h-4" />
            <span>Search Another Roll</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveScreen('semester')}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Open CGPA Calculator
            </button>

            <button
              type="button"
              onClick={handlePrintOrSavePdf}
              className="allow-print px-4 py-2.5 rounded-xl bg-brand-blue hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer aria-hidden="true" className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW MODE: BTEB RESULT ZONE — LIVE RESULT SHOWN INSIDE DIPLOMAMATE
  // ============================================================================
  if (viewMode === 'result-zone') {
    return (
      <div className="space-y-4 pb-12">
        {/* Navigation & Action Bar */}
        <div className="bg-surface rounded-2xl border border-slate-200/90 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setZoneFallbackRoll(null);
                setViewMode('search');
              }}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-xs gap-1.5 cursor-pointer"
              title="Return to Result Search"
            >
              <ArrowLeft aria-hidden="true" className="w-4 h-4" />
              <span>Back to Search</span>
            </button>
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
              Live result, shown inside DiplomaMate
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openOfficialBteb}
              className="px-3 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Open BTEB's official result portal instead"
            >
              <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Open Official BTEB</span>
            </button>
            <button
              type="button"
              onClick={openBtebResultsZone}
              className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Open in Browser</span>
            </button>
          </div>
        </div>

        {/* Source attribution — the result below comes from BTEB Result Zone */}
        <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 shadow-xs space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-600 text-white text-[11px] font-extrabold tracking-wide">
              <Award aria-hidden="true" className="w-3.5 h-3.5" />
              BTEB RESULT ZONE
            </span>
            <span className="text-[11px] font-semibold text-teal-800">
              Result source: btebresultszone.com
            </span>
          </div>
        </div>

        {/* Roll input inside the app */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            openResultZone();
          }}
          className="dm-card p-4 sm:p-5 space-y-3"
        >
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1.5">
              BTEB Board Roll Number *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash aria-hidden="true" className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  placeholder="Enter Board Roll (e.g. 750102)"
                  value={zoneRollInput}
                  onChange={(e) => setZoneRollInput(e.target.value)}
                  className="dm-field w-full pl-10 pr-4 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <button
                type="submit"
                className="dm-primary-action px-4 py-2.5 text-sm font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Search aria-hidden="true" className="w-4 h-4" />
                <span>View Result</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Enter your roll above and the Diploma in Engineering result will appear below, inside the app.
              {userProfile.boardRoll && zoneRollInput !== userProfile.boardRoll && (
                <>
                  {' '}
                  <button
                    type="button"
                    onClick={() => setZoneRollInput(userProfile.boardRoll || '')}
                    className="font-semibold text-brand-blue hover:underline cursor-pointer"
                  >
                    Use my roll ({userProfile.boardRoll})
                  </button>
                </>
              )}
            </p>
          </div>
        </form>

        {/* Live result from BTEB Result Zone */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-surface shadow-xs">
          {isZoneFrameLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface p-6 text-center">
              <LiquidFillLoader size={44} label="Loading result from BTEB Result Zone..." />
            </div>
          )}
          <iframe
            key={zoneUrl}
            src={zoneUrl}
            title="BTEB Result Zone — Board Result"
            className="w-full block bg-white"
            style={{ height: '72vh' }}
            onLoad={() => setIsZoneFrameLoading(false)}
          />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] text-slate-500 text-center">
            Result source: <strong className="text-slate-700">BTEB Result Zone</strong> (btebresultszone.com) · Diploma in Engineering filter applied · If the result does not load here, use one of the buttons below.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={openOfficialBteb}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-950 hover:bg-blue-900 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Check on Official BTEB instead</span>
            </button>
            <button
              type="button"
              onClick={openBtebResultsZone}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Open Result Zone in Browser</span>
            </button>
          </div>
        </div>

        {/* Persistent Diploma-only warning — shown below the result so the
            result itself comes first. The viewer is a cross-origin iframe,
            so DiplomaMate cannot read inside the page to check which exam
            is shown; the student must check the exam name at the top of
            the result themselves. */}
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-xs space-y-1.5" role="alert">
          <p className="text-xs font-bold text-amber-950 flex items-start gap-2">
            <AlertTriangle aria-hidden="true" className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Diploma in Engineering result only — if this page shows HSC / BMT, SSC (Vocational) or any other exam, it is NOT your result.</span>
          </p>
          <p className="text-xs text-amber-900/90 leading-relaxed">
            This page was opened with the Diploma in Engineering filter, but DiplomaMate cannot see inside it to double-check — please look at the exam name at the top of the result below. If it is not Diploma in Engineering, use “Open Official BTEB” above and check on BTEB&apos;s own portal.
          </p>
          <p className="text-xs text-amber-900/90 leading-relaxed" lang="bn">
            শুধু Diploma in Engineering এর ফলাফল দেখুন — নিচে HSC / BMT বা SSC দেখালে সেটা আপনার ফলাফল নয়।
          </p>
        </div>

        {/* Unified-flow step 2 notice: opened automatically after a gazette miss */}
        {zoneFallbackRoll && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-xs space-y-2.5">
            <p className="text-xs text-amber-900 leading-relaxed">
              DiplomaMate&apos;s gazette did not have a record for Board Roll <strong className="font-mono">{zoneFallbackRoll}</strong>, so the live result from <strong>BTEB Result Zone</strong> is shown here instead — still inside the app.
            </p>
            <p className="text-xs text-amber-900 leading-relaxed" lang="bn">
              এই রোলের ফলাফল DiplomaMate-এর গেজেটে পাওয়া যায়নি, তাই BTEB Result Zone থেকে দেখানো হচ্ছে।
            </p>
            <button
              type="button"
              onClick={openOfficialBteb}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-950 hover:bg-blue-900 text-white text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck aria-hidden="true" className="w-4 h-4" />
              <span>Not here either? Check Official BTEB Result →</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // VIEW MODE: OFFICIAL BTEB RESULT — PORTAL SHOWN INSIDE DIPLOMAMATE
  // ============================================================================
  if (viewMode === 'official-bteb') {
    return (
      <div className="space-y-4 pb-12">
        {/* Navigation & Action Bar */}
        <div className="bg-surface rounded-2xl border border-slate-200/90 p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('search')}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center font-bold text-xs gap-1.5 cursor-pointer"
              title="Return to Result Search"
            >
              <ArrowLeft aria-hidden="true" className="w-4 h-4" />
              <span>Back to Search</span>
            </button>
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
              Official result, shown inside DiplomaMate
            </span>
          </div>
          <button
            type="button"
            onClick={openOfficialResultPortal}
            className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ExternalLink aria-hidden="true" className="w-3.5 h-3.5" />
            <span>Open in Browser</span>
          </button>
        </div>

        {/* Source attribution — the result below comes from BTEB's own portal */}
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-xs space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950 text-white text-[11px] font-extrabold tracking-wide">
              <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5" />
              BTEB OFFICIAL
            </span>
            <span className="text-[11px] font-semibold text-blue-900">
              Result source: Bangladesh Technical Education Board — result.bteb.gov.bd
            </span>
          </div>
        </div>

        {/* How to use the portal, inside the app */}
        <div className="dm-card p-4 sm:p-5 space-y-2.5">
          {(userProfile.boardRoll || userProfile.regNumber) && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-2">
              <span className="font-bold text-slate-700 block">Your saved details (copy, then paste into the portal):</span>
              {userProfile.boardRoll && (
                <p className="flex flex-wrap items-center justify-between gap-2">
                  <span>Board Roll: <strong className="font-mono text-text-primary">{userProfile.boardRoll}</strong></span>
                  <button
                    type="button"
                    onClick={() => copyTextToClipboard(userProfile.boardRoll || '', 'Board Roll')}
                    className="px-2.5 py-1.5 rounded-lg bg-surface border border-slate-200 hover:border-blue-400 text-brand-blue font-bold text-[11px] cursor-pointer"
                  >
                    Copy roll
                  </button>
                </p>
              )}
              {userProfile.regNumber && (
                <p className="flex flex-wrap items-center justify-between gap-2">
                  <span>Registration No: <strong className="font-mono text-text-primary">{userProfile.regNumber}</strong></span>
                  <button
                    type="button"
                    onClick={() => copyTextToClipboard(userProfile.regNumber || '', 'Registration Number')}
                    className="px-2.5 py-1.5 rounded-lg bg-surface border border-slate-200 hover:border-blue-400 text-brand-blue font-bold text-[11px] cursor-pointer"
                  >
                    Copy reg. no.
                  </button>
                </p>
              )}
              {userProfile.boardRoll && userProfile.regNumber && (
                <button
                  type="button"
                  onClick={() => copyTextToClipboard(`Roll: ${userProfile.boardRoll}, Reg: ${userProfile.regNumber}`, 'Roll and registration number')}
                  className="px-3 py-2 rounded-xl bg-brand-blue hover:bg-blue-700 text-white font-bold text-[11px] shadow-xs cursor-pointer"
                >
                  Copy both
                </button>
              )}
            </div>
          )}
        </div>

        {/* Official BTEB portal */}
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-surface shadow-xs">
          {isOfficialFrameLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface p-6 text-center">
              <LiquidFillLoader size={44} label="Loading the official BTEB result portal..." />
            </div>
          )}
          <iframe
            src={OFFICIAL_BTEB_RESULTS_URL}
            title="BTEB Official Result Portal — Board Result Search"
            className="w-full block bg-white"
            style={{ height: '72vh' }}
            onLoad={() => setIsOfficialFrameLoading(false)}
          />
        </div>
        <p className="text-[11px] text-slate-500 text-center">
          Result source: <strong className="text-slate-700">Bangladesh Technical Education Board (Official)</strong> (result.bteb.gov.bd) · If the portal does not load here, use “Open in Browser” above.
        </p>
      </div>
    );
  }

  // ============================================================================
  // VIEW MODE: RESULT SEARCH PAGE
  // ============================================================================
  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner Card */}
      <div className="bg-blue-950 rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-start gap-2.5">
            <button
              onClick={() => setActiveScreen('home')}
              className="p-2 rounded-xl bg-surface/10 hover:bg-surface/20 text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Back to Home"
              title="Back to Home"
            >
              <ArrowLeft aria-hidden="true" className="w-5 h-5" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 bg-teal-500/20 text-teal-300 border border-teal-400/30 text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
                  <Award aria-hidden="true" className="w-3.5 h-3.5 text-teal-300" />
                  BTEB Examination Hub
                </span>
              </div>
              <h1 className="ios-large-title text-lg sm:text-xl font-bold tracking-tight text-white">
                BTEB Examination Results
              </h1>
            </div>
          </div>

          <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 border-t sm:border-t-0 border-blue-800/60 pt-2.5 sm:pt-0">
            <div className="text-left sm:text-right">
              <span className="text-[10px] uppercase tracking-wider text-blue-300 block font-semibold">
                Indexed Datasets
              </span>
              <span className="text-xs font-bold font-mono text-teal-300">
                {batches.length} Batch{batches.length !== 1 ? 'es' : ''} · {totalRecordsInDb} Verified Rolls
              </span>
            </div>
            {canAccessAdminImport && (
              <button
                onClick={() => window.location.replace('https://admin.diplomamate.online/')}
                className="text-[11px] font-semibold bg-surface/10 hover:bg-surface/20 text-white px-3 py-1.5 rounded-xl border border-white/15 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Database aria-hidden="true" className="w-3.5 h-3.5 text-teal-300" />
                <span>Admin Result Import</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1.5 bg-slate-200/80 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('individual')}
          className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'individual'
              ? 'bg-surface text-brand-blue shadow-xs'
              : 'text-slate-600 hover:text-text-primary'
          }`}
        >
          <Search aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          <span>My Result (Roll Search)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('group')}
          className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'group'
              ? 'bg-surface text-brand-teal shadow-xs'
              : 'text-slate-600 hover:text-text-primary'
          }`}
        >
          <Users aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          <span>Group Results</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('batches')}
          className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'batches'
              ? 'bg-surface text-text-primary shadow-xs'
              : 'text-slate-600 hover:text-text-primary'
          }`}
        >
          <Database aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          <span>Datasets ({batches.length})</span>
        </button>
      </div>

      {/* TAB 1: INDIVIDUAL RESULT SEARCH (PRIMARY WORKSPACE) */}
      {activeTab === 'individual' && (
        <div className="space-y-4">
          {/* Main Search Card */}
          <div className="dm-card p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <Search aria-hidden="true" className="w-5 h-5 text-brand-blue" />
                  <span>Search BTEB Board Result</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  View full semester-by-semester grades, GPA, referred papers, and CGPA
                </p>
              </div>

              {userProfile.boardRoll && rollInput !== userProfile.boardRoll && (
                <button
                  type="button"
                  onClick={() => {
                    setRollInput(userProfile.boardRoll || '');
                    setErrorMessage('');
                  }}
                  className="text-xs font-semibold text-brand-blue hover:underline cursor-pointer"
                >
                  Use My Roll ({userProfile.boardRoll})
                </button>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleViewResult();
              }}
              className="space-y-4"
            >
              {/* Curriculum is fixed: DiplomaMate shows Diploma in
                  Engineering results only. The gazette store holds Diploma
                  records only, and the same roll can belong to another exam
                  (HSC BMT, SSC Vocational) — those are never shown. */}
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-teal-50 border border-teal-200">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-600 text-white text-[11px] font-extrabold tracking-wide">
                  <GraduationCap aria-hidden="true" className="w-3.5 h-3.5" />
                  {DIPLOMA_CURRICULUM_LABEL} ONLY
                </span>
                <span className="text-[11px] text-teal-900">
                  Results are shown for Diploma in Engineering only — never HSC, BMT or SSC.
                </span>
              </div>

              {/* Regulation (Probidhan) Selector */}
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1.5">
                  Regulation (Probidhan)
                </label>
                <select
                  value={selectedRegulation}
                  onChange={(e) => setSelectedRegulation(e.target.value)}
                  className="dm-field w-full px-3.5 py-2.5 text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
                >
                  <option value="all">All Regulations (Auto-Detect)</option>
                  <option value="2022">2022 Probidhan (Current Standard)</option>
                  <option value="2016">2016 Probidhan</option>
                  <option value="2010">2010 Probidhan</option>
                </select>
              </div>

              {/* Board Roll Input */}
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1.5">
                  BTEB Board Roll Number *
                </label>
                <div className="relative">
                  <Hash aria-hidden="true" className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    placeholder="Enter 6-digit Board Roll (e.g. 542880, 750102, 750104)"
                    value={rollInput}
                    onChange={(e) => {
                      setRollInput(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    className="dm-field w-full pl-10 pr-4 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </div>
              </div>

              {/* Verified Sample Test Rolls for One-Click Verification */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <Sparkles aria-hidden="true" className="w-3.5 h-3.5 text-teal-600" />
                  <span>Verified Official Gazette Records for One-Click Inspection:</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleViewResult('542880', '2016')}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-slate-200 hover:border-blue-400 text-xs font-medium text-slate-700 hover:text-brand-blue transition-colors cursor-pointer"
                  >
                    <strong className="font-mono">542880</strong> (Barguna Poly · 2016 Reg · CGPA 3.43)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleViewResult('750102', '2022')}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-slate-200 hover:border-blue-400 text-xs font-medium text-slate-700 hover:text-brand-blue transition-colors cursor-pointer"
                  >
                    <strong className="font-mono">750102</strong> (Confidence Poly · 2022 Reg · Sem 1-2)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleViewResult('750104', '2022')}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-slate-200 hover:border-blue-400 text-xs font-medium text-slate-700 hover:text-brand-blue transition-colors cursor-pointer"
                  >
                    <strong className="font-mono">750104</strong> (Confidence Poly · 2022 Reg · Sem 1-4)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleViewResult('542891', '2016')}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-slate-200 hover:border-blue-400 text-xs font-medium text-slate-700 hover:text-brand-blue transition-colors cursor-pointer"
                  >
                    <strong className="font-mono">542891</strong> (Barguna Poly · 2016 Reg · Sem 4-5)
                  </button>
                </div>
              </div>

              {/* Error Message Box */}
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle aria-hidden="true" className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* View Result Action Button */}
              <button
                type="submit"
                disabled={searchStatus === 'loading'}
                className="dm-primary-action w-full py-3 px-4 text-sm font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {searchStatus === 'loading' ? (
                  <>
                    <RefreshCw aria-hidden="true" className="w-4 h-4 animate-spin" />
                    <span>Checking Imported Gazette Results...</span>
                  </>
                ) : (
                  <>
                    <Search aria-hidden="true" className="w-4 h-4" />
                    <span>View Result</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* How the single View Result button works — one tap checks every source */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-xs space-y-2.5">
            <h2 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Info aria-hidden="true" className="w-4 h-4 text-brand-blue" />
              <span>How View Result works — 3 steps, inside the app</span>
            </h2>
            <ol className="text-xs text-slate-600 leading-relaxed space-y-1 list-decimal list-inside">
              <li><strong>Step 1 — DiplomaMate gazette:</strong> your roll is checked against DiplomaMate&apos;s own imported gazette (Diploma in Engineering only).</li>
              <li><strong>Step 2 — BTEB Result Zone:</strong> if the roll is not in the gazette, the live result from <strong>BTEB Result Zone</strong> (btebresultszone.com) opens automatically, with the Diploma in Engineering filter applied.</li>
              <li><strong>Step 3 — Official BTEB:</strong> if it is not there either, one tap opens <strong>BTEB&apos;s official portal</strong> (result.bteb.gov.bd) — your roll and registration number are ready to copy, and only you solve its security check.</li>
            </ol>
          </div>

          {/* Loading State Banner */}
          {searchStatus === 'loading' && (
            <div className="p-6 bg-surface rounded-2xl border border-blue-100 text-center space-y-3 shadow-xs">
              <LiquidFillLoader size={44} />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-text-primary">
                  Checking DiplomaMate’s Imported Gazette...
                </h3>
              </div>
            </div>
          )}

          {/* Result Not Found State */}
          {searchStatus === 'not_found' && (
            <div className="bg-surface rounded-2xl border border-slate-200 p-6 text-center shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Info aria-hidden="true" className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold text-text-primary">
                  No Result in DiplomaMate Gazette
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  No imported Gazette record was found for Board Roll <strong className="font-mono text-text-primary">{notFoundRoll}</strong> under <strong>{DIPLOMA_CURRICULUM_LABEL}</strong>.
                </p>
                <p className="text-sm font-semibold text-amber-900" lang="bn">
                  এই রোল নম্বরের ফলাফল বর্তমানে DiplomaMate-এ পাওয়া যায়নি।
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  BTEB Result Zone was already shown automatically — if the result was not there either, try BTEB&apos;s official portal below.
                </p>
                <button
                  type="button"
                  onClick={openOfficialBteb}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-sm font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Official BTEB Result দেখুন
                </button>
                <button
                  type="button"
                  onClick={() => openResultZone(notFoundRoll || rollInput)}
                  className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm font-bold shadow-xs transition-colors cursor-pointer"
                >
                  BTEB Results Zone থেকে আবার দেখুন
                </button>
                <p className="text-[11px] text-slate-500">
                  BTEB Results Zone is a third-party portal. Results viewed there are not verified or provided by DiplomaMate.
                </p>
                {alternateCurricula.length > 0 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-left text-xs text-blue-900 space-y-1 mt-2">
                    <span className="font-bold block">Same roll, another exam:</span>
                    <p>
                      Board Roll <strong className="font-mono">{notFoundRoll}</strong> also has published BTEB records under{' '}
                      <strong>{alternateCurricula.join(', ')}</strong>. DiplomaMate only shows Diploma in Engineering results, so those are not shown here — check them on BTEB&apos;s official portal if you need them.
                    </p>
                  </div>
                )}
                <div className="p-3 bg-slate-50 rounded-xl text-left text-xs text-slate-500 space-y-1 mt-2">
                  <span className="font-bold text-slate-700 block">Common reasons:</span>
                  <p>• If your semester result has not yet been imported into the official gazette dataset, ask your System Administrator to import the official BTEB result sheet PDF/text.</p>
                </div>
              </div>
            </div>
          )}

          {/* Rate Limited State */}
          {searchStatus === 'rate_limited' && (
            <div className="bg-surface rounded-2xl border border-amber-200 p-6 text-center shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <Clock aria-hidden="true" className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-sm font-bold text-amber-950">
                  Result Lookup Temporarily Unavailable
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {errorMessage || 'The result lookup service is temporarily limiting requests. This does not mean the student has no result.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleViewResult()}
                className="px-4 py-2 rounded-xl bg-brand-blue hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}

          {['timeout', 'network_error', 'service_unavailable', 'external_unavailable'].includes(searchStatus) && (
            <div className="bg-surface rounded-2xl border border-rose-200 p-6 text-center shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                <AlertTriangle aria-hidden="true" className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-sm font-bold text-rose-950">
                  {searchStatus === 'timeout'
                    ? 'Result Check Timed Out'
                    : searchStatus === 'network_error'
                      ? 'Connection Error'
                      : 'Result Service Unavailable'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => handleViewResult()}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-brand-blue hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Data Transparency Information Card */}
          <div className="bg-surface rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-2 text-xs">
            <h3 className="font-bold text-text-primary flex items-center gap-1.5">
              <ShieldCheck aria-hidden="true" className="w-4 h-4 text-brand-teal" />
              <span>How Results Are Retrieved and Protected</span>
            </h3>
            <p className="text-slate-600 leading-relaxed">
              We do not store or track students&apos; private searches, nor do we fabricate academic results.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: GROUP RESULTS (Retained for Captains & Teachers) */}
      {activeTab === 'group' && (
        <div className="space-y-4">
          <form
            onSubmit={handleGroupSearch}
            className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                  <Users aria-hidden="true" className="w-4 h-4 text-brand-teal" />
                  <span>Multi-Roll & Range Group Results Search</span>
                </h2>
              </div>

              <button
                type="button"
                onClick={handleLoadSectionRosterRolls}
                className="text-xs font-semibold bg-teal-50 hover:bg-teal-100 text-brand-teal px-3 py-1.5 rounded-xl border border-teal-200 transition-colors cursor-pointer"
              >
                + Load Section Roster Rolls
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-text-primary">
                  Board Roll Numbers / Roll Ranges (Max 150 Rolls per Query) *
                </label>
                <span className="text-[11px] font-mono font-bold text-brand-teal">
                  {parsedGroupPreviewCount} Roll{parsedGroupPreviewCount !== 1 ? 's' : ''} Queued
                </span>
              </div>
              <textarea
                rows={3}
                required
                placeholder="Example: 542880, 542891, 542915, 750102, 750104"
                value={groupRollInput}
                onChange={(e) => setGroupRollInput(e.target.value)}
                className="dm-field w-full px-3 py-2.5 text-xs sm:text-sm font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-teal"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Semester
                </label>
                <select
                  value={groupSemester}
                  onChange={(e) => setGroupSemester(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-text-primary"
                >
                  <option value="all">All Semesters (Latest)</option>
                  {semestersList.map(sem => (
                    <option key={sem} value={String(sem)}>{formatOrdinal(sem)} Semester</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Regulation
                </label>
                <select
                  value={groupRegulation}
                  onChange={(e) => setGroupRegulation(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-text-primary"
                >
                  <option value="all">All Regulations</option>
                  {regulationsList.map(r => (
                    <option key={r} value={r}>{r} Probidhan</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Exam Year
                </label>
                <select
                  value={groupExamYear}
                  onChange={(e) => setGroupExamYear(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-text-primary"
                >
                  <option value="all">All Years</option>
                  {[2025, 2024, 2023, 2022, 2021, 2020].map(yr => (
                    <option key={yr} value={String(yr)}>{yr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Exam Type
                </label>
                <select
                  value={groupExamType}
                  onChange={(e) => setGroupExamType(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-text-primary"
                >
                  <option value="all">All Types</option>
                  {examTypesList.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {groupError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle aria-hidden="true" className="w-4 h-4 shrink-0" />
                <span>{groupError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSearchingGroup}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-brand-teal hover:bg-teal-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <BarChart3 aria-hidden="true" className="w-4 h-4" />
              <span>{isSearchingGroup ? 'Analyzing Group Results...' : 'Analyze Group Results'}</span>
            </button>
          </form>

          {/* Group search loading state */}
          {isSearchingGroup && (
            <div className="p-6 bg-surface rounded-2xl border border-teal-100 text-center space-y-3 shadow-xs">
              <LiquidFillLoader size={44} label="Analyzing group results from the imported gazette..." />
              <p className="text-xs text-slate-500">
                Checking the imported Diploma in Engineering gazette for your rolls.
              </p>
            </div>
          )}

          {/* Group Performance Statistics & Detailed Student Table */}
          {groupResultData && (
            <div className="space-y-4">
              <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 aria-hidden="true" className="w-4 h-4 text-brand-teal" />
                    <span>Group Analytics Summary</span>
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {groupResultData.analytics.foundCount} of {groupResultData.analytics.totalRequested} Found in Verified Gazette Store
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Records Found
                    </span>
                    <span className="text-xl font-extrabold font-mono text-text-primary tabular-nums">
                      {groupResultData.analytics.foundCount}
                      <span className="text-xs font-normal text-slate-400"> / {groupResultData.analytics.totalRequested}</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-green-50/70 border border-green-200">
                    <span className="text-[10px] font-bold uppercase text-green-700 block">
                      Passed
                    </span>
                    <span className="text-xl font-extrabold font-mono text-green-800 tabular-nums">
                      {groupResultData.analytics.passCount}
                      <span className="text-xs font-bold text-green-600 ml-1.5">
                        ({groupResultData.analytics.passRate}%)
                      </span>
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                    <span className="text-[10px] font-bold uppercase text-amber-700 block">
                      Referred
                    </span>
                    <span className="text-xl font-extrabold font-mono text-amber-800 tabular-nums">
                      {groupResultData.analytics.referredCount}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                    <span className="text-[10px] font-bold uppercase text-brand-blue block">
                      Group GPA
                    </span>
                    <span className="text-xl font-extrabold font-mono text-text-primary tabular-nums">
                      {groupResultData.analytics.averageGpa !== null
                        ? groupResultData.analytics.averageGpa.toFixed(2)
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Most Common Referred Subjects */}
                {groupResultData.analytics.mostCommonReferredSubjects.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                      Most Frequently Referred Subjects in Group:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {groupResultData.analytics.mostCommonReferredSubjects.map(sub => (
                        <span
                          key={sub.code}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900"
                        >
                          <strong className="font-mono">{sub.code}</strong>
                          {sub.name ? ` · ${sub.name}` : ''} ({sub.count} student{sub.count !== 1 ? 's' : ''})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {groupResultData.invalidTokens.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                    Skipped invalid roll token(s): <code className="font-mono">{groupResultData.invalidTokens.join(', ')}</code>
                  </div>
                )}
              </div>

              {/* Filter & Sort Controls + Individual Roll Breakdown List */}
              <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'ALL', label: `All (${groupResultData.items.length})` },
                        { id: 'PASSED', label: `Passed (${groupResultData.analytics.passCount})` },
                        { id: 'REFERRED', label: `Referred (${groupResultData.analytics.referredCount})` },
                        { id: 'NOT_FOUND', label: `Not in Store (${groupResultData.analytics.notFoundCount})` }
                      ] as { id: GroupStatusFilter; label: string }[]
                    ).map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setGroupFilter(f.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          groupFilter === f.id
                            ? 'bg-text-primary text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-slate-500 font-semibold">Sort:</span>
                    <select
                      value={groupSort}
                      onChange={e => setGroupSort(e.target.value as GroupSortField)}
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-text-primary"
                    >
                      <option value="roll_asc">Roll (Ascending)</option>
                      <option value="gpa_desc">GPA (Highest First)</option>
                      <option value="status">Status (Pass / Ref)</option>
                    </select>
                  </div>
                </div>

                {/* Student Result Rows */}
                <div className="divide-y divide-slate-100">
                  {groupResultData.items
                    .filter(item => {
                      if (groupFilter === 'PASSED') return item.found && item.record?.status === 'PASSED';
                      if (groupFilter === 'REFERRED') return item.found && item.record?.status === 'REFERRED';
                      if (groupFilter === 'NOT_FOUND') return !item.found;
                      return true;
                    })
                    .sort((a, b) => {
                      if (groupSort === 'gpa_desc') {
                        const ga = a.record?.gpa ?? -1;
                        const gb = b.record?.gpa ?? -1;
                        return gb - ga;
                      }
                      if (groupSort === 'status') {
                        const order = (it: GroupResultItem) =>
                          !it.found ? 3 : it.record?.status === 'PASSED' ? 1 : 2;
                        return order(a) - order(b);
                      }
                      return Number(a.rollNumber) - Number(b.rollNumber);
                    })
                    .map(item => {
                      const rec = item.record;
                      const isExpanded = expandedGroupRoll === item.rollNumber;

                      return (
                        <div key={item.rollNumber} className="py-3 space-y-2 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-black text-sm text-text-primary bg-slate-100 px-2.5 py-1 rounded-lg">
                                {item.rollNumber}
                              </span>

                              {item.found && rec ? (
                                <>
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                      rec.status === 'PASSED'
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : rec.status === 'WITHHELD'
                                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                                          : 'bg-amber-50 text-amber-800 border-amber-200'
                                    }`}
                                  >
                                    {rec.status}
                                  </span>
                                  <span className="text-slate-600 font-semibold">
                                    {formatOrdinal(rec.semester)} Sem ({rec.regulation} Reg)
                                  </span>
                                  {rec.collegeName && (
                                    <span className="text-slate-500 hidden sm:inline">
                                      · {rec.collegeName}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-500">
                                  Not in Local Gazette Store
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {item.found && rec && (
                                <span className="font-mono font-bold text-text-primary">
                                  {rec.status === 'PASSED'
                                    ? rec.gpa !== null
                                      ? `GPA ${rec.gpa.toFixed(2)}`
                                      : 'PASS'
                                    : `${rec.referredSubjects.length} Ref Subj`}
                                </span>
                              )}

                              {item.found && rec && rec.referredSubjects.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedGroupRoll(isExpanded ? null : item.rollNumber)
                                  }
                                  className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-[11px] cursor-pointer"
                                >
                                  {isExpanded ? 'Hide Subjects' : 'Subjects'}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  handleViewResult(
                                    item.rollNumber,
                                    rec?.regulation || 'all'
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-brand-blue font-bold text-[11px] cursor-pointer"
                              >
                                View Transcript
                              </button>
                            </div>
                          </div>

                          {isExpanded && rec && rec.referredSubjects.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/80 flex flex-wrap gap-1.5">
                              {rec.referredSubjects.map((rs, idx) => (
                                <span
                                  key={`${rs.code}_${idx}`}
                                  className="px-2 py-0.5 rounded bg-surface border border-amber-200 text-[11px] text-amber-900 font-medium"
                                >
                                  <strong className="font-mono">{rs.code}</strong>
                                  {rs.name ? ` · ${rs.name}` : ''} ({rs.failedComponent})
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PUBLISHED DATASETS */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-text-primary">
                  Indexed Examination Batches ({batches.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={fetchBatches}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                aria-label="Refresh"
                title="Refresh"
              >
                <RefreshCw aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>

            {batches.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-50 text-center space-y-2">
                <Database aria-hidden="true" className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">
                  No gazette batches imported yet. Results then come live from BTEB Result Zone (Diploma in Engineering only) or BTEB&apos;s official portal — ask an admin to import the official result sheet to search the gazette here.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {batches.map(batch => (
                  <div
                    key={batch.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-brand-blue">
                            {formatOrdinal(batch.semester)} Semester
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {batch.examYear} · {batch.regulation} Probidhan · {batch.examType}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-text-primary mt-1">
                          {batch.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold">
                          {batch.totalRecords} Rolls
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-green-50 text-green-700 font-bold">
                          {batch.passCount} Passed
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 font-bold">
                          {batch.referredCount} Ref
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                      <span>Source: <strong className="text-slate-600">{batch.sourceFileName}</strong></span>
                      <span>Published: {batch.publishedDate || new Date(batch.importedAt).toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
