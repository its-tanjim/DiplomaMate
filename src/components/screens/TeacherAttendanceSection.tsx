import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  CheckSquare,
  CheckCircle2,
  Upload,
  Sparkles,
  Download,
  Printer,
  AlertTriangle,
  History,
  Search,
  RefreshCw,
  Trash2,
  UserPlus,
  Users,
  Check,
  Sliders,
  Clock
} from 'lucide-react';
import {
  SemesterNumber,
  Shift,
  Section,
  AttendanceStatus,
  AttendanceRecordEntry,
  AttendanceSheet,
  OcrExtractedStudentCandidate,
  MonthlyStudentAttendanceRow,
  CatalogRegulation
} from '../../types';
import { SearchableCollegeSelect } from '../common/SearchableCollegeSelect';
import { SearchableDepartmentSelect } from '../common/SearchableDepartmentSelect';
import { CatalogSubjectSelect } from '../common/CatalogSubjectSelect';
import { ShiftScheduleConfigModal } from '../common/ShiftScheduleConfigModal';
import { formatPeriodOptionLabel } from '../../data/shiftScheduleUtils';

interface TeacherAttendanceSectionProps {
  selectedCollege: string;
  setSelectedCollege: (college: string) => void;
  selectedDept: string;
  setSelectedDept: (dept: string) => void;
  selectedSemester: SemesterNumber;
  setSelectedSemester: (sem: SemesterNumber) => void;
  selectedShift: Shift;
  setSelectedShift: (shift: Shift) => void;
  selectedSection: Section;
  setSelectedSection: (section: Section) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const TeacherAttendanceSection: React.FC<TeacherAttendanceSectionProps> = ({
  selectedCollege,
  setSelectedCollege,
  selectedDept,
  setSelectedDept,
  selectedSemester,
  setSelectedSemester,
  selectedShift,
  setSelectedShift,
  selectedSection,
  setSelectedSection
}) => {
  const {
    userProfile,
    authToken,
    shiftSchedules,
    getShiftSchedule,
    saveShiftSchedule,
    resetShiftSchedule,
    showToast
  } = useApp();

  const semestersList: SemesterNumber[] = [1, 2, 3, 4, 5, 6, 7, 8];
  const shiftsList: Shift[] = ['Morning', 'Day'];
  const sectionsList: Section[] = ['A1', 'A2', 'B1', 'B2'];

  // Sub-view mode: 'daily' | 'monthly' | 'history'
  const [viewMode, setViewMode] = useState<'daily' | 'monthly' | 'history'>('daily');
  const [showScheduleConfigModal, setShowScheduleConfigModal] = useState<boolean>(false);

  // Date & Subject/Period selection
  const [attendanceDate, setAttendanceDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });

  const [selectedRegulation, setSelectedRegulation] = useState<CatalogRegulation>(
    userProfile.regulation || '2022'
  );
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('66662');
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>('Microprocessor & Interfacing');

  // Requirement D: Do NOT automatically select a period. User must manually select desired period.
  const [selectedPeriodLabel, setSelectedPeriodLabel] = useState<string>('');

  const activeShiftSchedule = getShiftSchedule(selectedShift);
  const shiftPeriodOptions = useMemo(() => {
    return activeShiftSchedule.periods.map(slot => ({
      periodNumber: slot.periodNumber,
      label: formatPeriodOptionLabel(slot),
      slot
    }));
  }, [activeShiftSchedule]);

  // Requirement C & J: Changing shift loads the shift-specific schedule settings and resets period
  // selection without accidentally changing department, semester, subject, or unrelated fields.
  const handleAttendanceShiftChange = (nextShift: Shift) => {
    setSelectedShift(nextShift);
    setSelectedPeriodLabel('');
  };

  const selectedSubjectObj = useMemo(() => {
    return {
      code: selectedSubjectCode || 'N/A',
      name: selectedSubjectName || 'Select Catalog Subject'
    };
  }, [selectedSubjectCode, selectedSubjectName]);

  // Daily sheet state
  const [sheetEntries, setSheetEntries] = useState<AttendanceRecordEntry[]>([]);
  const [existingSheet, setExistingSheet] = useState<AttendanceSheet | null>(null);
  const [allCohortSheets, setAllCohortSheets] = useState<AttendanceSheet[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState<boolean>(false);
  const [isSavingSheet, setIsSavingSheet] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
  } | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Select All Present explicit confirmation modal
  const [showSelectAllConfirm, setShowSelectAllConfirm] = useState<boolean>(false);

  // Audit History modal
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);

  // Roster OCR Upload modal state
  const [showOcrModal, setShowOcrModal] = useState<boolean>(false);
  const [ocrFileName, setOcrFileName] = useState<string>('');
  const [ocrMimeType, setOcrMimeType] = useState<string>('');
  const [ocrDataUrl, setOcrDataUrl] = useState<string>('');
  const [ocrRawText, setOcrRawText] = useState<string>('');
  const [isExtractingOcr, setIsExtractingOcr] = useState<boolean>(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrCandidates, setOcrCandidates] = useState<OcrExtractedStudentCandidate[]>([]);
  const [ocrSummary, setOcrSummary] = useState<{
    totalDetected: number;
    matchedExistingCount: number;
    newStudentCount: number;
    duplicateInFileCount: number;
    uncertainOrInvalidCount: number;
  } | null>(null);
  const [isMergingRoster, setIsMergingRoster] = useState<boolean>(false);

  // Monthly Attendance state
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [monthlySubjectFilter, setMonthlySubjectFilter] = useState<string>('all');
  const [monthlyData, setMonthlyData] = useState<{
    calendarDays: Array<{
      date: string;
      dayOfMonth: number;
      weekdayShort: string;
      isWeeklyOff: boolean;
      recordedSheetsCount: number;
    }>;
    studentRows: MonthlyStudentAttendanceRow[];
    summary: {
      totalStudents: number;
      totalRecordedSessions: number;
      recordedDatesCount: number;
      totalPresentMarks: number;
      totalAbsentMarks: number;
      totalNotMarkedMarks: number;
      overallAttendancePercentage: number | null;
    };
  } | null>(null);
  const [isLoadingMonthly, setIsLoadingMonthly] = useState<boolean>(false);

  const getAuthHeaders = (): Record<string, string> => {
    const token = authToken || localStorage.getItem('diplomamate_auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  };

  // Load cohort roster & existing sheets for selected cohort/date/subject/period
  const loadRosterAndSheet = async () => {
    setIsLoadingRoster(true);
    setSaveFeedback(null);
    try {
      const params = new URLSearchParams({
        college: selectedCollege,
        department: selectedDept,
        semester: String(selectedSemester),
        shift: selectedShift,
        section: selectedSection
      });

      const [rosterRes, sheetsRes] = await Promise.all([
        fetch(`/api/roster?${params.toString()}`, { headers: getAuthHeaders() }),
        fetch(`/api/attendance/sheets?${params.toString()}`, { headers: getAuthHeaders() })
      ]);

      const rosterJson = await rosterRes.json();
      const sheetsJson = await sheetsRes.json();

      if (!rosterRes.ok || !rosterJson.success) {
        setSaveFeedback({
          type: 'error',
          message: rosterJson.error || 'Could not load student roster for this class.'
        });
        setSheetEntries([]);
        setExistingSheet(null);
        return;
      }

      const students = rosterJson.students || [];
      const cohortSheets: AttendanceSheet[] = sheetsJson.success ? sheetsJson.sheets || [] : [];
      setAllCohortSheets(cohortSheets);

      // Check if an attendance sheet already exists for this exact date + subjectCode + periodLabel
      const matchedSheet = cohortSheets.find(
        sh =>
          sh.date === attendanceDate &&
          sh.subjectCode === selectedSubjectCode &&
          sh.periodLabel.toLowerCase() === selectedPeriodLabel.toLowerCase()
      );

      if (matchedSheet) {
        setExistingSheet(matchedSheet);
        const recordByRoll = new Map<string, AttendanceRecordEntry>();
        matchedSheet.entries.forEach(r => {
          recordByRoll.set(r.boardRoll, r);
        });

        const mergedEntries: AttendanceRecordEntry[] = students.map((st: any) => {
          const existingRec = recordByRoll.get(st.boardRoll);
          if (existingRec) return existingRec;
          return {
            studentId: st.id,
            studentName: st.name,
            classRoll: st.classRoll,
            boardRoll: st.boardRoll,
            regNumber: st.regNumber,
            status: 'not_marked' as AttendanceStatus
          };
        });

        // Include any students on the sheet not in base roster
        matchedSheet.entries.forEach(r => {
          if (!mergedEntries.some(m => m.boardRoll === r.boardRoll)) {
            mergedEntries.push(r);
          }
        });

        setSheetEntries(mergedEntries);
      } else {
        setExistingSheet(null);
        // Initialize every student as 'not_marked' (never silently Present or Absent!)
        const initialEntries: AttendanceRecordEntry[] = students.map((st: any) => ({
          studentId: st.id,
          studentName: st.name,
          classRoll: st.classRoll,
          boardRoll: st.boardRoll,
          regNumber: st.regNumber,
          status: 'not_marked' as AttendanceStatus
        }));
        setSheetEntries(initialEntries);
      }
    } catch {
      setSaveFeedback({
        type: 'error',
        message: 'Network error while loading class roster and attendance sheets.'
      });
    } finally {
      setIsLoadingRoster(false);
    }
  };

  useEffect(() => {
    loadRosterAndSheet();
  }, [
    selectedCollege,
    selectedDept,
    selectedSemester,
    selectedShift,
    selectedSection,
    attendanceDate,
    selectedSubjectCode,
    selectedPeriodLabel
  ]);

  // Load Monthly Attendance when in monthly view
  const loadMonthlyAttendance = async () => {
    setIsLoadingMonthly(true);
    try {
      const params = new URLSearchParams({
        college: selectedCollege,
        department: selectedDept,
        semester: String(selectedSemester),
        shift: selectedShift,
        section: selectedSection,
        month: String(selectedMonth),
        year: String(selectedYear),
        subjectCode: monthlySubjectFilter
      });

      const res = await fetch(`/api/attendance/monthly?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMonthlyData({
          calendarDays: data.calendarDays || [],
          studentRows: data.studentRows || [],
          summary: data.summary || {
            totalStudents: 0,
            totalRecordedSessions: 0,
            recordedDatesCount: 0,
            totalPresentMarks: 0,
            totalAbsentMarks: 0,
            totalNotMarkedMarks: 0,
            overallAttendancePercentage: null
          }
        });
      } else {
        showToast(data.error || 'Could not load monthly attendance report.');
      }
    } catch {
      showToast('Failed to fetch monthly attendance matrix.');
    } finally {
      setIsLoadingMonthly(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'monthly') {
      loadMonthlyAttendance();
    }
  }, [
    viewMode,
    selectedCollege,
    selectedDept,
    selectedSemester,
    selectedShift,
    selectedSection,
    selectedMonth,
    selectedYear,
    monthlySubjectFilter
  ]);

  // Toggle or set individual student attendance status
  const setStudentStatus = (boardRoll: string, status: AttendanceStatus) => {
    setSheetEntries(prev =>
      prev.map(rec => (rec.boardRoll === boardRoll ? { ...rec, status } : rec))
    );
  };

  const togglePresentCheckbox = (boardRoll: string, currentStatus: AttendanceStatus) => {
    // Checking the box marks Present; unchecking returns to Not Marked (never silently Absent)
    const nextStatus: AttendanceStatus = currentStatus === 'present' ? 'not_marked' : 'present';
    setStudentStatus(boardRoll, nextStatus);
  };

  const handleConfirmSelectAllPresent = () => {
    setSheetEntries(prev => prev.map(r => ({ ...r, status: 'present' })));
    setShowSelectAllConfirm(false);
    showToast(`Marked all ${sheetEntries.length} students as Present. Remember to Save Attendance.`);
  };

  const handleResetAllToNotMarked = () => {
    setSheetEntries(prev => prev.map(r => ({ ...r, status: 'not_marked' })));
    showToast('Reset all students on this sheet to Not Marked.');
  };

  // Save or Update Attendance Sheet
  const handleSaveAttendanceSheet = async (allowUpdate = false) => {
    if (!selectedPeriodLabel) {
      setSaveFeedback({
        type: 'error',
        message: 'Please manually select a desired Class Period before saving attendance.'
      });
      showToast('Please manually select a Class Period first.');
      return;
    }
    if (sheetEntries.length === 0) {
      setSaveFeedback({
        type: 'error',
        message: 'Cannot save an empty attendance sheet. Load or import a student roster first.'
      });
      return;
    }

    setIsSavingSheet(true);
    setSaveFeedback(null);
    try {
      const res = await fetch('/api/attendance/sheets', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          college: selectedCollege,
          department: selectedDept,
          semester: selectedSemester,
          shift: selectedShift,
          section: selectedSection,
          date: attendanceDate,
          subjectCode: selectedSubjectObj.code,
          subjectName: selectedSubjectObj.name,
          periodLabel: selectedPeriodLabel,
          entries: sheetEntries,
          allowUpdate: allowUpdate || Boolean(existingSheet)
        })
      });

      const data = await res.json();
      if (res.status === 409 && data.existingSheet) {
        setExistingSheet(data.existingSheet);
        setSaveFeedback({
          type: 'warning',
          message:
            data.error ||
            'An attendance sheet already exists for this class, date, and period. Click "Update Attendance Sheet" to save changes.'
        });
        return;
      }

      if (!res.ok || !data.success) {
        setSaveFeedback({
          type: 'error',
          message: data.error || 'Failed to save attendance sheet.'
        });
        return;
      }

      setExistingSheet(data.sheet);
      setSaveFeedback({
        type: 'success',
        message: data.message || 'Attendance sheet saved and verified!'
      });
      showToast(data.message || 'Attendance sheet saved!');
      loadRosterAndSheet();
    } catch {
      setSaveFeedback({
        type: 'error',
        message: 'Server communication error while saving attendance.'
      });
    } finally {
      setIsSavingSheet(false);
    }
  };

  // Handle Roster Image/PDF Upload for OCR
  const handleOcrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOcrError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setOcrError('File size exceeds 15MB limit. Please upload a clearer image or compact PDF.');
      return;
    }

    setOcrFileName(file.name);
    setOcrMimeType(file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'));

    const reader = new FileReader();
    reader.onload = () => {
      setOcrDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRunRosterOcr = async () => {
    if (!ocrDataUrl && !ocrRawText.trim()) {
      setOcrError('Please select a roster image/PDF file or paste student list text first.');
      return;
    }

    setIsExtractingOcr(true);
    setOcrError(null);
    try {
      const res = await fetch('/api/attendance/roster-ocr', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          college: selectedCollege,
          department: selectedDept,
          semester: selectedSemester,
          shift: selectedShift,
          section: selectedSection,
          fileName: ocrFileName,
          mimeType: ocrMimeType,
          fileDataUrl: ocrDataUrl || undefined,
          rawText: ocrRawText.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setOcrError(
          data.error ||
            'Could not extract student records from the file. You can paste or edit the student list manually below.'
        );
        return;
      }

      setOcrCandidates(data.candidates || []);
      setOcrSummary(data.summary || null);
      showToast(`Detected ${data.candidates?.length || 0} student rows. Please review before adding.`);
    } catch {
      setOcrError('Network error while running roster OCR extraction.');
    } finally {
      setIsExtractingOcr(false);
    }
  };

  const handleUpdateOcrCandidate = (
    tempId: string,
    field: 'classRoll' | 'boardRoll' | 'regNumber' | 'name',
    value: string
  ) => {
    setOcrCandidates(prev =>
      prev.map(c => {
        if (c.tempId !== tempId) return c;
        const updated = { ...c, [field]: value };
        const missingName = !updated.name || updated.name.trim().length < 2;
        const missingRoll = !updated.boardRoll || updated.boardRoll.trim().length < 4;
        return {
          ...updated,
          confidence: missingName || missingRoll ? 'uncertain' : 'high',
          matchStatus:
            missingName || missingRoll
              ? 'invalid_missing_fields'
              : updated.matchStatus === 'invalid_missing_fields'
                ? 'new_student'
                : updated.matchStatus,
          warning: missingName || missingRoll ? 'Name or Roll Number needs review' : undefined
        };
      })
    );
  };

  const handleRemoveOcrCandidate = (tempId: string) => {
    setOcrCandidates(prev => prev.filter(c => c.tempId !== tempId));
  };

  const handleRemoveOcrDuplicates = () => {
    const seenRolls = new Set<string>();
    const deduplicated: OcrExtractedStudentCandidate[] = [];
    for (const c of ocrCandidates) {
      const key = c.boardRoll.trim();
      if (key && seenRolls.has(key)) continue;
      if (key) seenRolls.add(key);
      deduplicated.push({
        ...c,
        matchStatus: c.matchStatus === 'duplicate_in_file' ? 'new_student' : c.matchStatus
      });
    }
    const removedCount = ocrCandidates.length - deduplicated.length;
    setOcrCandidates(deduplicated);
    showToast(
      removedCount > 0
        ? `Removed ${removedCount} duplicate student row(s).`
        : 'No duplicate roll numbers found.'
    );
  };

  const handleAddBlankOcrRow = () => {
    setOcrCandidates(prev => [
      ...prev,
      {
        tempId: `manual_${Date.now()}`,
        classRoll: String(prev.length + 1).padStart(2, '0'),
        boardRoll: '',
        regNumber: '',
        name: '',
        confidence: 'uncertain',
        matchStatus: 'invalid_missing_fields',
        warning: 'Enter student Name and Board Roll'
      }
    ]);
  };

  const handleConfirmMergeRoster = async () => {
    const validCandidates = ocrCandidates.filter(
      c =>
        c.name.trim().length >= 2 &&
        c.boardRoll.trim().length >= 4 &&
        c.matchStatus !== 'duplicate_in_file'
    );
    if (validCandidates.length === 0) {
      setOcrError('Please provide at least one valid student with Name and Board Roll.');
      return;
    }

    setIsMergingRoster(true);
    setOcrError(null);
    try {
      const res = await fetch('/api/attendance/roster/merge', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          college: selectedCollege,
          department: selectedDept,
          semester: selectedSemester,
          shift: selectedShift,
          section: selectedSection,
          students: validCandidates
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setOcrError(data.error || 'Could not merge extracted student list.');
        return;
      }

      showToast(data.message || 'Student list added to roster with status Not Marked.');
      setShowOcrModal(false);
      setOcrCandidates([]);
      setOcrSummary(null);
      setOcrDataUrl('');
      setOcrRawText('');
      setOcrFileName('');
      await loadRosterAndSheet();
    } catch {
      setOcrError('Network error while merging student roster.');
    } finally {
      setIsMergingRoster(false);
    }
  };

  // Filtered daily records
  const filteredDailyRecords = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    if (!q) return sheetEntries;
    return sheetEntries.filter(
      r =>
        r.studentName.toLowerCase().includes(q) ||
        r.boardRoll.toLowerCase().includes(q) ||
        r.classRoll.toLowerCase().includes(q) ||
        (r.regNumber && r.regNumber.toLowerCase().includes(q))
    );
  }, [sheetEntries, searchFilter]);

  // Daily summary metrics
  const dailyStats = useMemo(() => {
    const total = sheetEntries.length;
    const present = sheetEntries.filter(r => r.status === 'present').length;
    const absent = sheetEntries.filter(r => r.status === 'absent').length;
    const notMarked = sheetEntries.filter(r => r.status === 'not_marked').length;
    const markedCount = present + absent;
    const percentage = markedCount > 0 ? Math.round((present / markedCount) * 100) : null;
    return { total, present, absent, notMarked, markedCount, percentage };
  }, [sheetEntries]);

  // Export Monthly Attendance CSV
  const handleExportMonthlyCsv = () => {
    if (!monthlyData || monthlyData.studentRows.length === 0) {
      showToast('No monthly attendance data to export.');
      return;
    }

    const calDays = monthlyData.calendarDays;
    const headers = [
      'Class Roll',
      'Student Name',
      'Board Roll',
      'Reg Number',
      ...calDays.map(d => `${d.dayOfMonth} ${MONTH_NAMES[selectedMonth - 1].slice(0, 3)}`),
      'Present',
      'Absent',
      'Not Marked',
      'Recorded Sessions',
      'Attendance %'
    ];

    const csvRows = [headers.join(',')];
    for (const row of monthlyData.studentRows) {
      const dayCells = calDays.map(d => {
        const cell = row.dailyStatuses[d.date];
        const st = cell?.status;
        if (st === 'present') return 'P';
        if (st === 'absent') return 'A';
        if (st === 'not_marked') return 'NM';
        if (st === 'holiday') return 'OFF';
        return '-';
      });
      const line = [
        `"${row.classRoll}"`,
        `"${row.studentName.replace(/"/g, '""')}"`,
        `"${row.boardRoll}"`,
        `"${row.regNumber}"`,
        ...dayCells,
        row.presentCount,
        row.absentCount,
        row.notMarkedCount,
        row.recordedSessionsCount,
        row.attendancePercentage !== null ? `${row.attendancePercentage}%` : 'N/A'
      ];
      csvRows.push(line.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Attendance_${selectedDept}_Sem${selectedSemester}_${selectedShift}_${selectedSection}_${MONTH_NAMES[selectedMonth - 1]}_${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported Monthly Attendance CSV!');
  };

  return (
    <div className="space-y-4">
      {/* Attendance Header & View Switcher */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#172554]">
                  Class Attendance Management
                </h2>
                <p className="text-[11px] text-slate-500">
                  Official BTEB Academic Register · Verified Faculty Access Only
                </p>
              </div>
            </div>
          </div>

          {/* Sub-navigation: Daily Sheet | Monthly Matrix | Saved Sheets */}
          <div className="flex rounded-xl bg-slate-100 p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily Sheet
            </button>
            <button
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'monthly'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Matrix
            </button>
            <button
              type="button"
              onClick={() => setViewMode('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'history'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Saved Sheets ({allCohortSheets.length})
            </button>
          </div>
        </div>

        {/* Reusable Class & Session Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <SearchableCollegeSelect
            value={selectedCollege}
            onChange={(name) => setSelectedCollege(name)}
            label="1. Polytechnic Institution"
          />
          <SearchableDepartmentSelect
            value={selectedDept}
            onChange={(name) => setSelectedDept(name)}
            label="2. Department / Technology"
          />
        </div>

        {/* Semester 1st-8th */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-[#172554]">
              3. Semester (1st–8th)
            </label>
            <span className="text-[11px] text-slate-500">
              Authorized Semesters: {userProfile.semestersTaught?.map(s => `${s}th`).join(', ') || 'All'}
            </span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {semestersList.map(sem => {
              const isSelected = selectedSemester === sem;
              const isAuthorized = userProfile.semestersTaught?.includes(sem);
              return (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setSelectedSemester(sem)}
                  className={`py-1.5 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : isAuthorized
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                        : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sem}th
                </button>
              );
            })}
          </div>
        </div>

        {/* Shift, Section, Date, Subject/Period */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              4. Shift ({activeShiftSchedule.firstPeriodStartTime} start)
            </label>
            <div className="flex rounded-xl bg-slate-100 p-0.5">
              {shiftsList.map(sh => (
                <button
                  key={sh}
                  type="button"
                  onClick={() => handleAttendanceShiftChange(sh)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    selectedShift === sh
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sh}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              5. Section
            </label>
            <div className="flex rounded-xl bg-slate-100 p-0.5">
              {sectionsList.map(sec => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setSelectedSection(sec)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    selectedSection === sec
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              6. Attendance Date
            </label>
            <input
              type="date"
              value={attendanceDate}
              onChange={e => setAttendanceDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-[#172554] font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-semibold text-slate-600">
                7. Class Period *
              </label>
              <button
                type="button"
                onClick={() => setShowScheduleConfigModal(true)}
                className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-0.5 cursor-pointer"
                title="Configure Shift & Period Timings"
              >
                <Sliders className="w-3 h-3" />
                <span>Timings</span>
              </button>
            </div>
            <select
              value={selectedPeriodLabel}
              onChange={e => setSelectedPeriodLabel(e.target.value)}
              className={`w-full px-2.5 py-1.5 text-xs border rounded-xl font-bold truncate focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                selectedPeriodLabel
                  ? 'bg-slate-50 border-slate-200 text-[#172554]'
                  : 'bg-amber-50/70 border-amber-300 text-amber-900'
              }`}
              title="Select Desired Class Period"
            >
              <option value="">-- Select Desired Period --</option>
              {shiftPeriodOptions.map(opt => (
                <option key={opt.periodNumber} value={opt.label}>
                  {opt.label} ({opt.slot.durationMinutes}m{opt.slot.isManuallyEdited ? ' · Custom' : ''})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 8. Automatic Subject Suggestion from Central Catalog */}
        <div className="pt-2 border-t border-slate-100">
          <CatalogSubjectSelect
            technology={selectedDept}
            regulation={selectedRegulation}
            onRegulationChange={(reg) => setSelectedRegulation(reg)}
            semester={selectedSemester}
            selectedCode={selectedSubjectCode}
            selectedName={selectedSubjectName}
            onSelect={(sel) => {
              if (sel) {
                setSelectedSubjectCode(sel.code);
                setSelectedSubjectName(sel.name);
              } else {
                setSelectedSubjectCode('');
                setSelectedSubjectName('');
              }
            }}
            label="8. Attendance Subject (Auto-Suggested by Technology, Regulation & Semester)"
            compact
          />
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VIEW 1: DAILY ATTENDANCE SHEET                                         */}
      {/* ===================================================================== */}
      {viewMode === 'daily' && (
        <div className="space-y-3">
          {/* Status Banner if Existing Sheet Loaded */}
          {existingSheet ? (
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-teal-950">
                    Recorded Attendance Sheet Loaded ({existingSheet.date} · {existingSheet.periodLabel})
                  </span>
                  <p className="text-[11px] text-teal-800 mt-0.5">
                    Last saved by <strong>{existingSheet.teacherName}</strong> at{' '}
                    {new Date(existingSheet.updatedAt).toLocaleString('en-GB')}. You can review, modify, and update this sheet.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(true)}
                className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-teal-100 text-teal-800 border border-teal-200 font-semibold flex items-center gap-1 self-start sm:self-auto shrink-0 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>Audit Log ({existingSheet.auditTrail?.length || 1})</span>
              </button>
            </div>
          ) : (
            <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-blue-900">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  New Attendance Sheet for <strong>{attendanceDate}</strong> ·{' '}
                  <strong>{selectedSubjectObj.code} ({selectedSubjectObj.name})</strong> · {selectedPeriodLabel}. All students start as <strong>Not Marked</strong>.
                </span>
              </div>
            </div>
          )}

          {/* Save Feedback Banner */}
          {saveFeedback && (
            <div
              className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
                saveFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : saveFeedback.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {saveFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                )}
                <span className="font-semibold">{saveFeedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setSaveFeedback(null)}
                className="text-slate-400 hover:text-slate-700 font-bold px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* KPI Summary Strip + Action Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Total Roster
                </span>
                <span className="text-base font-bold text-[#172554] font-mono">
                  {dailyStats.total}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                  Present (✓)
                </span>
                <span className="text-base font-bold text-emerald-700 font-mono">
                  {dailyStats.present}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                  Absent (✗)
                </span>
                <span className="text-base font-bold text-rose-700 font-mono">
                  {dailyStats.absent}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                  Not Marked
                </span>
                <span className="text-base font-bold text-amber-700 font-mono">
                  {dailyStats.notMarked}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/80">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                  Marked Rate
                </span>
                <span className="text-base font-bold text-blue-700 font-mono">
                  {dailyStats.percentage !== null ? `${dailyStats.percentage}%` : '—'}
                </span>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="Filter by student name or roll..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {/* Upload Student List (Image/PDF OCR) */}
                <button
                  type="button"
                  onClick={() => {
                    setOcrError(null);
                    setShowOcrModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Student List (Image/PDF)</span>
                </button>

                {/* Select All Present (Requires explicit confirmation) */}
                <button
                  type="button"
                  onClick={() => setShowSelectAllConfirm(true)}
                  disabled={sheetEntries.length === 0}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Select All Present</span>
                </button>

                {/* Clear / Reset All to Not Marked */}
                <button
                  type="button"
                  onClick={handleResetAllToNotMarked}
                  disabled={sheetEntries.length === 0}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Reset Unmarked
                </button>
              </div>
            </div>
          </div>

          {/* Student Attendance Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {isLoadingRoster ? (
              <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Loading class roster & attendance sheet...</span>
              </div>
            ) : filteredDailyRecords.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Users className="w-9 h-9 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-[#172554]">
                  No Students Found for This Cohort
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No students match Semester {selectedSemester} ({selectedShift} Shift, Section {selectedSection}) or your search filter. You can upload a student list image/PDF to populate the class roster.
                </p>
                <button
                  type="button"
                  onClick={() => setShowOcrModal(true)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Student List from Image / PDF</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3 w-16">Class Roll</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3 font-mono">Board Roll</th>
                      <th className="py-2.5 px-3 font-mono hidden sm:table-cell">Reg Number</th>
                      <th className="py-2.5 px-3 text-center">Present (✓)</th>
                      <th className="py-2.5 px-3 text-right">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDailyRecords.map(rec => {
                      const isPresent = rec.status === 'present';
                      const isAbsent = rec.status === 'absent';
                      const isNotMarked = rec.status === 'not_marked';

                      return (
                        <tr
                          key={rec.boardRoll}
                          className={`transition-colors ${
                            isPresent
                              ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                              : isAbsent
                                ? 'bg-rose-50/30 hover:bg-rose-50/60'
                                : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {rec.classRoll}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-[#172554]">
                            {rec.studentName}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-blue-700">
                            {rec.boardRoll}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500 hidden sm:table-cell">
                            {rec.regNumber || '—'}
                          </td>

                          {/* Explicit Present Checkbox */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => togglePresentCheckbox(rec.boardRoll, rec.status)}
                              aria-label={`Mark ${rec.studentName} Present`}
                              className={`w-6 h-6 rounded-lg inline-flex items-center justify-center border transition-all cursor-pointer ${
                                isPresent
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                  : 'bg-white border-slate-300 text-transparent hover:border-emerald-500'
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>
                          </td>

                          {/* Explicit 3-State Status Controls */}
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                              <button
                                type="button"
                                onClick={() => setStudentStatus(rec.boardRoll, 'present')}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  isPresent
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-emerald-700'
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => setStudentStatus(rec.boardRoll, 'absent')}
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  isAbsent
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-rose-700'
                                }`}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => setStudentStatus(rec.boardRoll, 'not_marked')}
                                className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                                  isNotMarked
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                Not Marked
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom Save Bar */}
            {sheetEntries.length > 0 && (
              <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-slate-600">
                  <span>
                    Summary: <strong className="text-emerald-700">{dailyStats.present} Present</strong> ·{' '}
                    <strong className="text-rose-700">{dailyStats.absent} Absent</strong> ·{' '}
                    <strong className="text-amber-700">{dailyStats.notMarked} Not Marked</strong>
                  </span>
                  {dailyStats.notMarked > 0 && (
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Note: Students left as "Not Marked" remain explicitly unmarked and are never silently counted as Present or Absent.
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={isSavingSheet}
                    onClick={() => handleSaveAttendanceSheet(Boolean(existingSheet))}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isSavingSheet
                        ? 'Saving...'
                        : existingSheet
                          ? 'Update Attendance Sheet'
                          : 'Save Attendance Sheet'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 2: MONTHLY ATTENDANCE MATRIX                                      */}
      {/* ===================================================================== */}
      {viewMode === 'monthly' && (
        <div className="space-y-3">
          {/* Month / Year / Subject Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#172554]">
                  Monthly Attendance Register ({MONTH_NAMES[selectedMonth - 1]} {selectedYear})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Semester {selectedSemester} · {selectedDept} · {selectedShift} Shift · Section {selectedSection}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="px-2.5 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-[#172554]"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="px-2.5 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-[#172554]"
                >
                  {[2024, 2025, 2026, 2027].map(yr => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>

                <select
                  value={monthlySubjectFilter}
                  onChange={e => setMonthlySubjectFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-[#172554]"
                >
                  <option value="all">All Subjects Combined</option>
                  {Array.from(
                    new Map(
                      [
                        ...(selectedSubjectCode && selectedSubjectName
                          ? [{ code: selectedSubjectCode, name: selectedSubjectName }]
                          : []),
                        ...allCohortSheets
                          .filter(sh => sh.subjectCode && sh.subjectName)
                          .map(sh => ({ code: sh.subjectCode, name: sh.subjectName }))
                      ].map(item => [item.code, item])
                    ).values()
                  ).map(s => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleExportMonthlyCsv}
                  className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            {/* Legend & Monthly Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-800 font-bold inline-flex items-center justify-center text-[10px]">
                    P
                  </span>
                  <span>Present</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-4 h-4 rounded bg-rose-100 text-rose-800 font-bold inline-flex items-center justify-center text-[10px]">
                    A
                  </span>
                  <span>Absent</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-4 h-4 rounded bg-amber-100 text-amber-800 font-bold inline-flex items-center justify-center text-[10px]">
                    NM
                  </span>
                  <span>Not Marked</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-4 h-4 rounded bg-slate-200 text-slate-600 font-bold inline-flex items-center justify-center text-[9px]">
                    OFF
                  </span>
                  <span>Weekly Holiday (Fri)</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-4 h-4 rounded bg-slate-50 border border-slate-200 text-slate-400 inline-flex items-center justify-center text-[10px]">
                    ·
                  </span>
                  <span>No Session Held</span>
                </span>
              </div>

              <div className="font-semibold text-slate-600">
                Recorded Class Sessions in {MONTH_NAMES[selectedMonth - 1]}:{' '}
                <strong className="text-blue-700 font-mono">
                  {monthlyData?.summary?.totalRecordedSessions || 0}
                </strong>
                {monthlyData?.summary?.overallAttendancePercentage !== null &&
                  monthlyData?.summary?.overallAttendancePercentage !== undefined && (
                    <span className="ml-3">
                      Class Avg:{' '}
                      <strong className="text-emerald-700 font-mono">
                        {monthlyData.summary.overallAttendancePercentage}%
                      </strong>
                    </span>
                  )}
              </div>
            </div>
          </div>

          {/* Monthly Matrix Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {isLoadingMonthly ? (
              <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Compiling monthly attendance matrix...</span>
              </div>
            ) : !monthlyData || monthlyData.studentRows.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No students enrolled in this cohort yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <tr>
                      <th className="py-2 px-2.5 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                        Roll & Student
                      </th>
                      {monthlyData.calendarDays.map(calDay => (
                        <th
                          key={calDay.date}
                          className={`py-1.5 px-1 text-center font-mono min-w-[26px] border-r border-slate-100 ${
                            calDay.isWeeklyOff
                              ? 'bg-slate-200/70 text-slate-500'
                              : calDay.recordedSheetsCount > 0
                                ? 'bg-blue-50/80 text-blue-800'
                                : 'text-slate-400'
                          }`}
                          title={`${calDay.date} (${calDay.weekdayShort}) - ${
                            calDay.isWeeklyOff
                              ? 'Weekly Holiday'
                              : calDay.recordedSheetsCount > 0
                                ? `${calDay.recordedSheetsCount} session(s) recorded`
                                : 'No session recorded'
                          }`}
                        >
                          <div>{calDay.dayOfMonth}</div>
                          <div className="text-[8px] font-normal">
                            {calDay.weekdayShort.slice(0, 2)}
                          </div>
                        </th>
                      ))}
                      <th className="py-2 px-2 text-center bg-emerald-50 text-emerald-800 font-mono">
                        P
                      </th>
                      <th className="py-2 px-2 text-center bg-rose-50 text-rose-800 font-mono">
                        A
                      </th>
                      <th className="py-2 px-2 text-center bg-amber-50 text-amber-800 font-mono">
                        NM
                      </th>
                      <th className="py-2 px-2.5 text-right bg-slate-100 text-[#172554] font-mono">
                        Rate %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyData.studentRows.map(row => (
                      <tr key={row.boardRoll} className="hover:bg-slate-50/80">
                        <td className="py-2 px-2.5 sticky left-0 bg-white z-10 border-r border-slate-200 whitespace-nowrap">
                          <div className="font-bold text-[#172554]">
                            <span className="font-mono text-slate-500 mr-1.5">#{row.classRoll}</span>
                            {row.studentName}
                          </div>
                          <div className="text-[10px] font-mono text-blue-600">
                            Roll: {row.boardRoll}
                          </div>
                        </td>

                        {monthlyData.calendarDays.map(calDay => {
                          const cell = row.dailyStatuses[calDay.date];
                          const status = cell?.status;
                          return (
                            <td
                              key={calDay.date}
                              className={`py-1.5 px-1 text-center font-mono border-r border-slate-100 ${
                                status === 'holiday' ? 'bg-slate-100/80' : ''
                              }`}
                            >
                              {status === 'present' && (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  P
                                </span>
                              )}
                              {status === 'absent' && (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">
                                  A
                                </span>
                              )}
                              {status === 'not_marked' && (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-amber-100 text-amber-800 font-bold text-[9px]">
                                  NM
                                </span>
                              )}
                              {status === 'holiday' && (
                                <span className="text-[9px] text-slate-400 font-semibold">
                                  OFF
                                </span>
                              )}
                              {(!status || status === 'no_session') && (
                                <span className="text-slate-300">·</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-2 px-2 text-center font-mono font-bold text-emerald-700 bg-emerald-50/40">
                          {row.presentCount}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-rose-700 bg-rose-50/40">
                          {row.absentCount}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-semibold text-amber-700 bg-amber-50/40">
                          {row.notMarkedCount}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold bg-slate-50/70">
                          {row.attendancePercentage !== null ? (
                            <span
                              className={
                                row.attendancePercentage >= 75
                                  ? 'text-emerald-700'
                                  : 'text-rose-600'
                              }
                            >
                              {row.attendancePercentage}%
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 3: SAVED SHEETS HISTORY FOR THIS COHORT                           */}
      {/* ===================================================================== */}
      {viewMode === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#172554]">
                Saved Attendance Sheets ({allCohortSheets.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Click any recorded session to open and review or edit its attendance sheet.
              </p>
            </div>
          </div>

          {allCohortSheets.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No attendance sheets have been recorded for this cohort yet.
            </div>
          ) : (
            <div className="space-y-2">
              {allCohortSheets.map(sh => {
                const pCount = sh.entries.filter(r => r.status === 'present').length;
                const aCount = sh.entries.filter(r => r.status === 'absent').length;
                const nmCount = sh.entries.filter(r => r.status === 'not_marked').length;
                return (
                  <div
                    key={sh.id}
                    className="p-3 rounded-xl border border-slate-200 hover:border-blue-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {sh.date}
                        </span>
                        <span className="font-bold text-[#172554]">
                          {sh.subjectCode} - {sh.subjectName}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {sh.periodLabel}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Recorded by <strong>{sh.teacherName}</strong> · Present:{' '}
                        <strong className="text-emerald-700">{pCount}</strong> · Absent:{' '}
                        <strong className="text-rose-700">{aCount}</strong> · Not Marked:{' '}
                        <strong className="text-amber-700">{nmCount}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAttendanceDate(sh.date);
                        setSelectedSubjectCode(sh.subjectCode);
                        setSelectedPeriodLabel(sh.periodLabel);
                        setViewMode('daily');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs self-start sm:self-auto cursor-pointer"
                    >
                      Open Sheet
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: EXPLICIT CONFIRMATION FOR "SELECT ALL PRESENT"                */}
      {/* ===================================================================== */}
      {showSelectAllConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#172554]">
                  Confirm Mark All Students Present
                </h3>
                <p className="text-xs text-slate-500">
                  {attendanceDate} · {selectedSubjectObj.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
              Are you sure you want to mark all <strong>{sheetEntries.length} students</strong> in Semester {selectedSemester} ({selectedShift} Shift, Section {selectedSection}) as <strong>Present</strong>? You can still uncheck individual absentees before saving.
            </p>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowSelectAllConfirm(false)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSelectAllPresent}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Yes, Mark All Present
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: UPLOAD STUDENT LIST FROM IMAGE / PDF (OCR PREVIEW & EDIT)     */}
      {/* ===================================================================== */}
      {showOcrModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#172554]">
                    Upload Student Roster from Image or PDF (OCR)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Extracts student Names & Roll Numbers for Semester {selectedSemester} · {selectedShift} · Sec {selectedSection}. Does NOT mark any student Present automatically.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOcrModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Upload File or Paste Roster Text */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-[#172554]">
                  Option A: Upload Roster Image or PDF
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleOcrFileChange}
                  className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 cursor-pointer"
                />
                {ocrFileName && (
                  <p className="text-[11px] text-indigo-700 font-semibold truncate">
                    Selected: {ocrFileName}
                  </p>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <label className="block text-xs font-bold text-[#172554]">
                  Option B: Or Paste Student List Text
                </label>
                <textarea
                  rows={3}
                  value={ocrRawText}
                  onChange={e => setOcrRawText(e.target.value)}
                  placeholder={'01 | 542880 | 1502187320 | Nusrat Jahan\n02 | 542891 | 1502187342 | Tanvir Ahmed'}
                  className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleRunRosterOcr}
                disabled={isExtractingOcr}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isExtractingOcr ? 'Extracting Student List...' : 'Extract & Preview Student List'}</span>
              </button>

              <button
                type="button"
                onClick={handleAddBlankOcrRow}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Row Manually</span>
              </button>
            </div>

            {ocrError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">OCR Extraction Notice</span>
                  <span>{ocrError}</span>
                </div>
              </div>
            )}

            {/* Step 2: Preview & Edit Extracted Candidates */}
            {ocrCandidates.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-bold text-[#172554]">
                      Preview Detected Students ({ocrCandidates.length})
                    </span>
                    {ocrSummary && (
                      <>
                        <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-semibold">
                          Matched Existing: {ocrSummary.matchedExistingCount}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                          New Students: {ocrSummary.newStudentCount}
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveOcrDuplicates}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold cursor-pointer"
                  >
                    Remove Duplicates
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                      <tr>
                        <th className="py-2 px-2 w-16">Class Roll</th>
                        <th className="py-2 px-2">Student Name *</th>
                        <th className="py-2 px-2 w-28">Board Roll *</th>
                        <th className="py-2 px-2 w-32">Reg Number</th>
                        <th className="py-2 px-2">Match Status</th>
                        <th className="py-2 px-2 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ocrCandidates.map(c => {
                        const isDup = c.matchStatus === 'duplicate_in_file';
                        const isUncertain =
                          c.matchStatus === 'invalid_missing_fields' || c.confidence === 'uncertain';
                        const isMatched = c.matchStatus === 'matched_existing';

                        return (
                          <tr
                            key={c.tempId}
                            className={
                              isDup
                                ? 'bg-rose-50/50'
                                : isUncertain
                                  ? 'bg-amber-50/50'
                                  : 'bg-white'
                            }
                          >
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                value={c.classRoll}
                                onChange={e =>
                                  handleUpdateOcrCandidate(c.tempId, 'classRoll', e.target.value)
                                }
                                className="w-14 px-1.5 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                value={c.name}
                                onChange={e =>
                                  handleUpdateOcrCandidate(c.tempId, 'name', e.target.value)
                                }
                                placeholder="Student Name"
                                className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded font-semibold text-[#172554]"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                value={c.boardRoll}
                                onChange={e =>
                                  handleUpdateOcrCandidate(c.tempId, 'boardRoll', e.target.value)
                                }
                                placeholder="Board Roll"
                                className="w-24 px-1.5 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded text-blue-700 font-bold"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <input
                                type="text"
                                value={c.regNumber}
                                onChange={e =>
                                  handleUpdateOcrCandidate(c.tempId, 'regNumber', e.target.value)
                                }
                                placeholder="Reg No"
                                className="w-28 px-1.5 py-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded"
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              {isDup ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                                  Duplicate Roll
                                </span>
                              ) : isUncertain ? (
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800"
                                  title={c.warning}
                                >
                                  Needs Review
                                </span>
                              ) : isMatched ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                                  Existing Profile
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                  New Roster Entry
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveOcrCandidate(c.tempId)}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                title="Remove row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-[11px] text-slate-500">
                    Existing student profiles will be matched by Board Roll without overwriting. All students added to the sheet start as <strong>Not Marked</strong>.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowOcrModal(false)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isMergingRoster}
                      onClick={handleConfirmMergeRoster}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isMergingRoster ? 'Merging Roster...' : 'Confirm & Add to Attendance Sheet'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: ATTENDANCE SHEET AUDIT LOG                                    */}
      {/* ===================================================================== */}
      {showAuditModal && existingSheet && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-[#172554]">
                  Attendance Audit Trail
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
              {(existingSheet.auditTrail || []).map((entry, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-0.5"
                >
                  <div className="flex items-center justify-between font-bold text-[#172554]">
                    <span className="capitalize">{entry.action} by {entry.performedBy}</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(entry.timestamp).toLocaleString('en-GB')}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">{entry.summary}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configurable Shift & Period Schedule Modal */}
      <ShiftScheduleConfigModal
        isOpen={showScheduleConfigModal}
        onClose={() => setShowScheduleConfigModal(false)}
        initialShift={selectedShift}
        shiftSchedules={shiftSchedules}
        onSaveSchedule={saveShiftSchedule}
        onResetSchedule={resetShiftSchedule}
        onShiftChanged={nextShift => handleAttendanceShiftChange(nextShift)}
      />
    </div>
  );
};
