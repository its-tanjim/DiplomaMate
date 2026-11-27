import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '../../services/apiClient';
import { 
  WeekDay, 
  Shift, 
  Section, 
  RoutinePeriod,
  UploadedRoutineDocument,
  CatalogRegulation,
  SemesterNumber
} from '../../types';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  BookOpen, 
  Filter,
  CheckCircle2,
  CalendarCheck,
  Bell,
  Upload,
  FileText,
  FileImage,
  Eye,
  Sparkles,
  AlertCircle,
  Edit2,
  Save,
  Lock,
  Layers,
  Sliders,
  RotateCcw
} from 'lucide-react';
import { nativeService } from '../../services/nativeService';
import { TimePicker } from '../common/TimePicker';
import { CatalogSubjectSelect } from '../common/CatalogSubjectSelect';
import { SearchableDepartmentSelect } from '../common/SearchableDepartmentSelect';
import { ShiftScheduleConfigModal } from '../common/ShiftScheduleConfigModal';
import {
  SHIFT_DEFAULT_START_TIME,
  DEFAULT_PERIOD_DURATION_MINUTES,
  addMinutesToTimeString,
  updateIndividualPeriodSlot
} from '../../data/shiftScheduleUtils';
import { prepareFileForDocumentIntelligence } from '../../services/documentIntelligenceService';
import { Modal } from '../common/Modal';

const WEEKDAYS: WeekDay[] = [
  'Saturday', 
  'Sunday', 
  'Monday', 
  'Tuesday', 
  'Wednesday', 
  'Thursday'
];

export const ClassRoutineScreen: React.FC = () => {
  const { 
    routine, 
    accountType, 
    isVerifiedCaptain,
    userProfile, 
    addRoutinePeriod, 
    updateRoutinePeriod,
    deleteRoutinePeriod,
    selectedShift,
    setSelectedShift,
    selectedSection,
    setSelectedSection,
    uploadedRoutines,
    routineDocuments,
    loadRoutineDocuments,
    uploadRoutineDocument,
    analyzeRoutineOCR,
    saveConfirmedRoutine,
    setActiveScreen,
    shiftSchedules,
    getShiftSchedule,
    saveShiftSchedule,
    resetShiftSchedule,
    showToast
  } = useApp();

  const [activeDay, setActiveDay] = useState<WeekDay>('Saturday');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showScheduleConfigModal, setShowScheduleConfigModal] = useState(false);

  // Routine Upload & OCR state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrStage, setOcrStage] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrWarnings, setOcrWarnings] = useState<string[]>([]);
  const [ocrRawText, setOcrRawText] = useState('');
  const [ocrDiagnostics, setOcrDiagnostics] = useState<string[]>([]);
  const [isPublishingExtractedRoutine, setIsPublishingExtractedRoutine] = useState(false);
  const [detectedRoutineMeta, setDetectedRoutineMeta] = useState<{
    college?: string | null;
    department?: string | null;
    semester?: number | null;
    shift?: Shift | null;
    section?: Section | null;
  } | null>(null);
  const [pendingDocId, setPendingDocId] = useState<string | null>(null);
  const [pendingDocObject, setPendingDocObject] = useState<UploadedRoutineDocument | null>(null);
  const [extractedPeriods, setExtractedPeriods] = useState<RoutinePeriod[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOriginalDoc, setSelectedOriginalDoc] = useState<UploadedRoutineDocument | null>(null);

  // B3: server-side routine documents list (GET /api/routines/documents).
  useEffect(() => {
    void loadRoutineDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadRoutineDocument = async (docId: string, fileName: string, downloadUrl: string) => {
    try {
      const res = await apiFetch(downloadUrl);
      if (!res.ok) {
        showToast('Could not download this routine file.');
        return;
      }
      const blob = await res.blob();
      const ok = await nativeService.downloadBlob(blob, fileName);
      if (!ok) showToast('Could not download this routine file.');
    } catch {
      showToast('Could not download this routine file — check your connection.');
    }
  };

  const [routineTechnology, setRoutineTechnology] = useState<string>(userProfile.department);
  const [routineRegulation, setRoutineRegulation] = useState<CatalogRegulation>(userProfile.regulation || '2022');
  const [routineSemester, setRoutineSemester] = useState<SemesterNumber>(userProfile.semester);

  const activeShiftSchedule = getShiftSchedule(selectedShift);

  // Requirement D: Do NOT automatically select a period. User must manually select desired period.
  const [selectedPeriodSlotNumber, setSelectedPeriodSlotNumber] = useState<number | ''>('');
  const [isFormTimeManuallyEdited, setIsFormTimeManuallyEdited] = useState<boolean>(false);

  // Form state for adding routine slot manually
  const [formData, setFormData] = useState<Omit<RoutinePeriod, 'id'>>({
    day: 'Saturday',
    periodNumber: 0,
    startTime: activeShiftSchedule.firstPeriodStartTime || SHIFT_DEFAULT_START_TIME[selectedShift],
    endTime: addMinutesToTimeString(
      activeShiftSchedule.firstPeriodStartTime || SHIFT_DEFAULT_START_TIME[selectedShift],
      activeShiftSchedule.defaultDurationMinutes || DEFAULT_PERIOD_DURATION_MINUTES
    ),
    subjectCode: '',
    subjectName: '',
    teacherName: '',
    room: 'Room 304',
    type: 'Theory',
    shift: selectedShift,
    section: userProfile.section,
    publication_status: 'published'
  });

  // Requirement C & J: When the user changes the shift, update the default starting time and load
  // corresponding shift-specific schedule settings without changing department, semester, or subject.
  const handleShiftChange = (nextShift: Shift) => {
    setSelectedShift(nextShift);
    const nextSchedule = getShiftSchedule(nextShift);
    const defaultStart = nextSchedule.firstPeriodStartTime || SHIFT_DEFAULT_START_TIME[nextShift];
    const defaultEnd = addMinutesToTimeString(
      defaultStart,
      nextSchedule.defaultDurationMinutes || DEFAULT_PERIOD_DURATION_MINUTES
    );

    // Do NOT auto-select a period on shift change; reset period selection to ''
    setSelectedPeriodSlotNumber('');

    // Update shift & default start/end times unless the user explicitly locked a manual time override in the modal
    setFormData(prev => ({
      ...prev,
      shift: nextShift,
      periodNumber: 0,
      startTime: isFormTimeManuallyEdited ? prev.startTime : defaultStart,
      endTime: isFormTimeManuallyEdited ? prev.endTime : defaultEnd
    }));
  };

  // When user manually selects a period from the shift's configured period list
  const handleSelectPeriodSlot = (periodNumValue: string) => {
    if (!periodNumValue) {
      setSelectedPeriodSlotNumber('');
      setFormData(prev => ({ ...prev, periodNumber: 0 }));
      return;
    }
    const num = Number(periodNumValue);
    setSelectedPeriodSlotNumber(num);
    const matchingSlot = activeShiftSchedule.periods.find(p => p.periodNumber === num);
    if (matchingSlot) {
      setFormData(prev => ({
        ...prev,
        periodNumber: num,
        // If user already manually edited time in the form, preserve it unless they reset, OR if slot itself has manual override
        startTime: isFormTimeManuallyEdited ? prev.startTime : matchingSlot.startTime,
        endTime: isFormTimeManuallyEdited ? prev.endTime : matchingSlot.endTime
      }));
    } else {
      setFormData(prev => ({ ...prev, periodNumber: num }));
    }
  };

  // Manual edit of start or end time inside Add Period form
  const handleManualFormStartTimeChange = (newStart: string) => {
    setIsFormTimeManuallyEdited(true);
    // Suggest end time from newStart + activeShiftSchedule.defaultDurationMinutes if end time wasn't already customized
    const suggestedEnd = addMinutesToTimeString(
      newStart,
      activeShiftSchedule.defaultDurationMinutes || DEFAULT_PERIOD_DURATION_MINUTES
    );
    setFormData(prev => ({
      ...prev,
      startTime: newStart,
      endTime: suggestedEnd
    }));
    // If a period slot is selected, also persist this manual override to the shift's schedule config
    if (selectedPeriodSlotNumber !== '') {
      const updatedSched = updateIndividualPeriodSlot(activeShiftSchedule, Number(selectedPeriodSlotNumber), {
        startTime: newStart,
        endTime: suggestedEnd
      });
      saveShiftSchedule({ ...updatedSched, shift: selectedShift });
    }
  };

  const handleManualFormEndTimeChange = (newEnd: string) => {
    setIsFormTimeManuallyEdited(true);
    setFormData(prev => ({
      ...prev,
      endTime: newEnd
    }));
    if (selectedPeriodSlotNumber !== '') {
      const updatedSched = updateIndividualPeriodSlot(activeShiftSchedule, Number(selectedPeriodSlotNumber), {
        endTime: newEnd
      });
      saveShiftSchedule({ ...updatedSched, shift: selectedShift });
    }
  };

  const handleResetFormPeriodTiming = async () => {
    setIsFormTimeManuallyEdited(false);
    if (selectedPeriodSlotNumber !== '') {
      const refreshed = await resetShiftSchedule(selectedShift, Number(selectedPeriodSlotNumber));
      const slot = refreshed.periods.find(p => p.periodNumber === Number(selectedPeriodSlotNumber));
      if (slot) {
        setFormData(prev => ({
          ...prev,
          startTime: slot.startTime,
          endTime: slot.endTime
        }));
        return;
      }
    }
    const defaultStart = activeShiftSchedule.firstPeriodStartTime || SHIFT_DEFAULT_START_TIME[selectedShift];
    const defaultEnd = addMinutesToTimeString(
      defaultStart,
      activeShiftSchedule.defaultDurationMinutes || DEFAULT_PERIOD_DURATION_MINUTES
    );
    setFormData(prev => ({
      ...prev,
      startTime: defaultStart,
      endTime: defaultEnd
    }));
  };

  // Filter routine strictly by the active academic group's shift, section, and publication status
  const cohortRoutine = routine.filter((r) => {
    if (r.shift !== selectedShift) return false;
    if (r.section !== selectedSection) return false;
    if (
      userProfile.accountType === 'student' &&
      r.publication_status &&
      r.publication_status !== 'published'
    ) {
      return false;
    }
    return true;
  });

  const dayRoutine = cohortRoutine
    .filter(r => r.day === activeDay)
    .sort((a, b) => a.periodNumber - b.periodNumber);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPeriodSlotNumber === '' || !formData.periodNumber) {
      showToast('Please manually select a desired Period before saving.');
      return;
    }
    if (!formData.subjectName.trim() || !formData.teacherName.trim()) return;

    const result = await addRoutinePeriod({
      ...formData,
      periodNumber: Number(selectedPeriodSlotNumber),
      college: userProfile.college,
      department: routineTechnology,
      semester: routineSemester,
      regulation: routineRegulation,
      shift: selectedShift,
      section: selectedSection,
      publication_status: formData.publication_status || 'published'
    });

    if (!result.success) {
      return;
    }

    const defaultStart = activeShiftSchedule.firstPeriodStartTime || SHIFT_DEFAULT_START_TIME[selectedShift];
    const defaultEnd = addMinutesToTimeString(
      defaultStart,
      activeShiftSchedule.defaultDurationMinutes || DEFAULT_PERIOD_DURATION_MINUTES
    );

    setSelectedPeriodSlotNumber('');
    setIsFormTimeManuallyEdited(false);
    setFormData({
      day: activeDay,
      periodNumber: 0,
      startTime: defaultStart,
      endTime: defaultEnd,
      subjectCode: '',
      subjectName: '',
      teacherName: '',
      room: 'Room 304',
      type: 'Theory',
      shift: selectedShift,
      section: selectedSection,
      publication_status: 'published'
    });
    setShowAddModal(false);
  };

  // Upload timetable document (PDF or image) and scan it locally.
  const runRoutineOcrForDoc = async (doc: UploadedRoutineDocument) => {
    if (ocrProcessing) return;
    setOcrError(null);
    setOcrWarnings([]);
    setOcrRawText('');
    setOcrDiagnostics([]);
    setOcrProcessing(true);
    setOcrProgress(0);
    setOcrStage('Preparing local OCR...');

    try {
      const result = await analyzeRoutineOCR(doc.id, doc, (stage, progress) => {
        setOcrStage(stage);
        setOcrProgress(progress);
      });
      setOcrRawText(result.rawExtractedText || '');
      setOcrDiagnostics(result.diagnostics || []);
      if (result.success && result.periods.length > 0) {
        setExtractedPeriods(result.periods);
        setDetectedRoutineMeta(result.routineMetadata || null);
        setOcrWarnings(result.warnings || []);
        setShowUploadModal(false);
        setShowReviewModal(true);
      } else {
        setOcrError(
          result.error ||
            'Could not extract valid class periods from this file. Please upload a clearer scan or add periods manually.'
        );
        setOcrWarnings(result.warnings || []);
      }
    } catch (err: any) {
      setOcrError(err?.message || 'OCR processing failed. You can retry or add periods manually.');
    } finally {
      setOcrProcessing(false);
      setOcrStage('');
    }
  };

  const handleRoutineDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (ocrProcessing) return;
    setOcrError(null);
    setOcrWarnings([]);
    setOcrRawText('');
    setOcrDiagnostics([]);
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrProcessing(true);
    setOcrProgress(0);
    try {
      const prepared = await prepareFileForDocumentIntelligence(file, {
        allowVideo: false,
        onProgress: (stage) => setOcrStage(stage)
      });

      if (!prepared.valid) {
        setOcrError(prepared.error || 'Unsupported or corrupted routine file.');
        return;
      }

      const fileType = prepared.fileCategory === 'PDF' ? 'PDF' : 'IMAGE';
      // B3: the upload goes to the server first (POST
      // /api/routines/documents). A failed upload returns null with an
      // error toast — the OCR flow aborts instead of scanning a file
      // the server never stored. The displayed cohort is sent so the
      // server can validate it (teachers must target a cohort
      // explicitly — their session carries none).
      const doc = await uploadRoutineDocument(prepared.fileName, fileType, prepared.dataUrl, {
        semester: routineSemester,
        shift: selectedShift,
        section: selectedSection
      });
      if (!doc) return;
      setPendingDocId(doc.id);
      setPendingDocObject(doc);
      setOcrProcessing(false);

      await runRoutineOcrForDoc(doc);
    } catch (error) {
      console.error('Routine file preparation failed:', error);
      setOcrError(error instanceof Error ? error.message : 'Could not prepare this file for local OCR.');
    } finally {
      setOcrProcessing(false);
      setOcrStage('');
      setOcrProgress(0);
      e.target.value = '';
    }
  };

  const handleUpdateExtractedPeriod = (index: number, field: keyof RoutinePeriod, value: any) => {
    setExtractedPeriods(prev => {
      const updated = [...prev];
      const clearedFields = field === 'startTime' || field === 'endTime'
        ? ['time']
        : [field];
      const existingUncertain = (updated[index].uncertainFields || []).filter(
        uncertainField => !clearedFields.includes(uncertainField)
      );
      updated[index] = {
        ...updated[index],
        [field]: value,
        uncertainFields: existingUncertain
      };
      return updated;
    });
  };

  const handleAddBlankPeriodToReview = () => {
    setExtractedPeriods(prev => [
      ...prev,
      {
        id: `ocr_manual_${Date.now()}_${prev.length}`,
        day: activeDay,
        periodNumber: 0,
        startTime: '',
        endTime: '',
        subjectCode: '',
        subjectName: '',
        teacherName: '',
        room: '',
        type: 'Theory',
        shift: selectedShift,
        section: selectedSection,
        confidence: 'high',
        uncertainFields: ['type']
      }
    ]);
  };

  const handleConfirmExtractedRoutine = async () => {
    if (!pendingDocId || extractedPeriods.length === 0) return;
    const requiredFields: Array<{ key: keyof RoutinePeriod; label: string }> = [
      { key: 'periodNumber', label: 'period number' },
      { key: 'startTime', label: 'start time' },
      { key: 'endTime', label: 'end time' },
      { key: 'subjectCode', label: 'subject code' },
      { key: 'subjectName', label: 'subject name' },
      { key: 'teacherName', label: 'teacher name' },
      { key: 'room', label: 'room number' }
    ];

    for (let index = 0; index < extractedPeriods.length; index++) {
      const period = extractedPeriods[index];
      if (period.uncertainFields?.includes('type')) {
        showToast(`Select the class type for row ${index + 1} before publishing.`);
        return;
      }
      const missing = requiredFields.find(({ key }) => {
        const value = period[key];
        return key === 'periodNumber'
          ? Number(value) < 1
          : typeof value !== 'string' || value.trim().length === 0;
      });
      if (missing) {
        showToast(`Complete the ${missing.label} for row ${index + 1} before publishing.`);
        return;
      }
    }

    setIsPublishingExtractedRoutine(true);
    try {
      const result = await saveConfirmedRoutine(extractedPeriods, pendingDocId);
      if (!result.success) return;
      setShowReviewModal(false);
      setPendingDocId(null);
      setPendingDocObject(null);
    } catch (error) {
      console.error('Publishing reviewed routine failed:', error);
      showToast(error instanceof Error ? error.message : 'Could not publish the reviewed routine.');
    } finally {
      setIsPublishingExtractedRoutine(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header Card */}
      <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center font-bold">
                <Calendar aria-hidden="true" className="w-4 h-4" />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-text-primary">
                Class Timetable
              </h1>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={() => setShowScheduleConfigModal(true)}
              className="bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Configure First Period Start Time, Default Duration, Breaks & Individual Period Timings"
            >
              <Sliders aria-hidden="true" className="w-3.5 h-3.5 text-blue-700" />
              <span>Period & Shift Settings</span>
            </button>

            {uploadedRoutines.length > 0 && uploadedRoutines[0].dataUrl && (
              <button
                onClick={() => setSelectedOriginalDoc(uploadedRoutines[0])}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                title="View original uploaded routine image/PDF"
              >
                <Eye aria-hidden="true" className="w-3.5 h-3.5 text-slate-500" />
                <span>Original Routine</span>
              </button>
            )}

            {isVerifiedCaptain || (userProfile.accountType === 'teacher' && userProfile.teacherVerificationStatus === 'Verified') ? (
              <>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  title="Upload routine photo or PDF for AI analysis"
                >
                  <Sparkles aria-hidden="true" className="w-3.5 h-3.5" />
                  <span>Scan / OCR Routine</span>
                </button>
                <button
                  onClick={() => {
                    // Open modal with NO period auto-selected
                    setSelectedPeriodSlotNumber('');
                    setIsFormTimeManuallyEdited(false);
                    const sched = getShiftSchedule(selectedShift);
                    const start = sched.firstPeriodStartTime || SHIFT_DEFAULT_START_TIME[selectedShift];
                    const end = addMinutesToTimeString(
                      start,
                      sched.defaultDurationMinutes || DEFAULT_PERIOD_DURATION_MINUTES
                    );
                    setFormData(prev => ({
                      ...prev,
                      day: activeDay,
                      periodNumber: 0,
                      startTime: start,
                      endTime: end,
                      shift: selectedShift,
                      section: selectedSection
                    }));
                    setShowAddModal(true);
                  }}
                  className="bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus aria-hidden="true" className="w-3.5 h-3.5" />
                  <span>Add Period</span>
                </button>
              </>
            ) : userProfile.accountType === 'teacher' ? (
              <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                <Lock aria-hidden="true" className="w-3.5 h-3.5" />
                <span>Pending Faculty Verification</span>
              </span>
            ) : (
              <button
                onClick={() => setActiveScreen('captain_verification')}
                className="bg-teal-50 hover:bg-teal-100 text-brand-teal border border-teal-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Lock aria-hidden="true" className="w-3.5 h-3.5" />
                <span>Captain Verification to Edit</span>
              </button>
            )}
          </div>
        </div>

        {/* OCR In Progress Banner */}
        {ocrProcessing && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900">
            <div className="flex items-center gap-2.5">
            <Sparkles aria-hidden="true" className="w-4 h-4 text-brand-blue shrink-0" />
              <span className="flex-1">{ocrStage || 'Scanning routine locally...'}</span>
              <span className="font-bold tabular-nums">{Math.round(ocrProgress)}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100">
              <div
                className="h-full rounded-full bg-brand-blue transition-[width] duration-300"
                style={{ width: `${Math.min(100, Math.max(0, ocrProgress))}%` }}
              />
            </div>
          </div>
        )}

        {/* Uploaded routine documents (B3): server-stored scans/PDFs for
            this cohort — the same place the Original Routine viewer lives. */}
        {routineDocuments.length > 0 && (
          <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Uploaded Routine Documents ({routineDocuments.length})
            </span>
            {routineDocuments.map(doc => (
              <div key={doc.id} className="flex items-center justify-between gap-2 text-xs bg-surface rounded-lg border border-slate-100 px-2.5 py-1.5">
                <div className="min-w-0">
                  <span className="font-semibold text-text-primary block truncate">{doc.fileName}</span>
                  <span className="text-[11px] text-slate-500">
                    {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                    {typeof doc.sizeBytes === 'number' ? ` · ${(doc.sizeBytes / 1024).toFixed(0)} KB` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDownloadRoutineDocument(doc.id, doc.fileName, doc.downloadUrl)}
                  className="shrink-0 px-2.5 py-1 rounded-lg bg-blue-50 text-brand-blue text-[11px] font-semibold hover:bg-blue-100 cursor-pointer"
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Shift & Section Filter Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['Morning', 'Day'] as Shift[]).map((s) => (
              <button
                key={s}
                onClick={() => handleShiftChange(s)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedShift === s
                    ? 'bg-surface text-brand-blue shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s} Shift
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['A1', 'B1', 'A2', 'B2'] as Section[]).map((sec) => (
              <button
                key={sec}
                onClick={() => setSelectedSection(sec)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedSection === sec
                    ? 'bg-surface text-brand-teal shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sec {sec}
              </button>
            ))}
          </div>
        </div>

        {/* Active Shift Configured Schedule Summary Bar */}
        <div className="mt-2.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-2 text-slate-700">
            <span className="font-bold text-blue-950 flex items-center gap-1">
              <Clock aria-hidden="true" className="w-3.5 h-3.5 text-blue-600" />
              {selectedShift} Shift Schedule:
            </span>
            <span className="px-2 py-0.5 rounded-md bg-surface border border-slate-200 font-semibold">
              1st Period: <strong>{activeShiftSchedule.firstPeriodStartTime}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-surface border border-slate-200 font-semibold">
              Default Duration: <strong>{activeShiftSchedule.defaultDurationMinutes} min</strong>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-surface border border-slate-200 font-semibold">
              {activeShiftSchedule.numberOfPeriods} Periods
            </span>
            {activeShiftSchedule.periods.some(p => p.isManuallyEdited) && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                Custom Period Overrides Active
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowScheduleConfigModal(true)}
            className="text-blue-700 hover:text-blue-900 font-bold underline cursor-pointer"
          >
            Customize {selectedShift} Timings
          </button>
        </div>

        {/* Weekday Selector Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pt-3 pb-1 no-scrollbar">
          {WEEKDAYS.map((day) => {
            const countForDay = cohortRoutine.filter(
              (r) => r.day === day
            ).length;
            const isActive = activeDay === day;

            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-text-primary text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/60'
                }`}
              >
                <span>{day.slice(0, 3)}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-slate-700 text-teal-300'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {countForDay}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Routine Periods List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
            <span>{activeDay} Schedule</span>
            <span className="text-xs text-slate-400 font-normal">
              ({dayRoutine.length} classes)
            </span>
          </h2>
          <span className="text-[11px] font-semibold text-brand-teal">
            {selectedShift} Shift · Sec {selectedSection}
          </span>
        </div>

        {dayRoutine.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
            <CalendarCheck aria-hidden="true" className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-text-primary">
              No classes scheduled on {activeDay}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Weekly off or no periods registered for {selectedShift} Shift.
            </p>
          </div>
        ) : (
          dayRoutine.map((period) => (
            <div
              key={period.id}
              className="bg-surface rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-blue flex flex-col items-center justify-center font-bold shrink-0">
                    <span className="text-[10px] uppercase font-semibold leading-none text-slate-400">P</span>
                    <span className="text-base leading-none mt-0.5">{period.periodNumber}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {period.subjectCode}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        period.type === 'Practical / Lab'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-blue-50 text-brand-blue border border-blue-200'
                      }`}>
                        {period.type}
                      </span>
                      {period.publication_status === 'draft' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          Draft (Unpublished)
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-text-primary mt-1">
                      {period.subjectName}
                    </h3>
                  </div>
                </div>

                {isVerifiedCaptain && (
                  <div className="flex items-center gap-1.5">
                    {period.publication_status === 'draft' && (
                      <button
                        onClick={() => updateRoutinePeriod(period.id, { publication_status: 'published' })}
                        className="px-2 py-1 text-[10px] font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors cursor-pointer"
                        title="Publish this draft routine period to students in your academic group"
                      >
                        Publish
                      </button>
                    )}
                    <button
                      onClick={() => deleteRoutinePeriod(period.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                      aria-label="Remove period"
                      title="Remove period"
                    >
                      <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Details Footer */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Clock aria-hidden="true" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-medium text-slate-700">{period.startTime} - {period.endTime}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User aria-hidden="true" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{period.teacherName}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin aria-hidden="true" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{period.room}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* UPLOAD TIMETABLE DOCUMENT MODAL */}
      {showUploadModal && (
        <Modal
          onClose={() => !ocrProcessing && setShowUploadModal(false)}
          labelledBy="routine-upload-title"
          panelClassName="bg-surface rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-3"
          overlayClassName="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          showCloseButton={false}
        >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-brand-teal flex items-center justify-center font-bold">
                  <Sparkles aria-hidden="true" className="w-4 h-4" />
                </div>
                <h3 id="routine-upload-title" className="font-bold text-sm text-text-primary">Scan / Upload Class Routine</h3>
              </div>
              <button
                onClick={() => !ocrProcessing && setShowUploadModal(false)}
                disabled={ocrProcessing}
                className="text-slate-400 font-bold p-1 disabled:opacity-40"
               aria-label="Close">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Scan a printed, photographed, or PDF class timetable in Bangla or English. AI scan runs on the server (Gemini) and reads the table like Gemini does; on-device OCR is the fallback. Review and correct the extracted weekdays, periods, subjects, teachers, rooms, and times before publishing.
            </p>

            <div className={`border-2 border-dashed border-teal-300 rounded-2xl p-6 text-center bg-teal-50/30 transition-colors ${ocrProcessing ? 'opacity-60 pointer-events-none' : 'hover:bg-teal-50'}`}>
              <input
                type="file"
                id="routineDocUploadInput"
                accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                disabled={ocrProcessing}
                onChange={handleRoutineDocumentUpload}
                className="hidden"
              />
              <label htmlFor="routineDocUploadInput" className="cursor-pointer flex flex-col items-center justify-center">
                <Upload aria-hidden="true" className="w-8 h-8 text-brand-teal mb-2" />
                <span className="text-xs font-bold text-text-primary">
                  {ocrProcessing ? (ocrStage || 'Scanning Routine...') : 'Select Timetable Photo or PDF'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  Supported: JPG, PNG, WebP (Max 15MB) · Text or Scanned PDF (Max 25MB)
                </span>
                {ocrProcessing && (
                  <div className="w-full max-w-xs mt-3">
                    <div className="flex justify-between text-[10px] text-slate-600 mb-1">
                      <span>Local OCR progress</span>
                      <span>{Math.round(ocrProgress)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-teal-100">
                      <div
                        className="h-full rounded-full bg-teal-600 transition-[width] duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, ocrProgress))}%` }}
                      />
                    </div>
                  </div>
                )}
              </label>
            </div>

            {pendingDocObject && !ocrProcessing && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div className="truncate pr-2">
                  <span className="font-semibold text-text-primary">{pendingDocObject.fileName}</span>
                  <span className="text-[10px] text-slate-500 ml-1.5">({pendingDocObject.fileType})</span>
                </div>
                <button
                  type="button"
                  onClick={() => runRoutineOcrForDoc(pendingDocObject)}
                  className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <RotateCcw aria-hidden="true" className="w-3 h-3" />
                  <span>Retry Scan</span>
                </button>
              </div>
            )}

            {ocrError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 space-y-2">
                <div className="flex items-start gap-1.5">
                  <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{ocrError}</span>
                </div>
                {(ocrRawText || ocrDiagnostics.length > 0) && (
                  <details className="rounded-lg border border-red-200 bg-surface/70 p-2 text-slate-700">
                    <summary className="cursor-pointer font-semibold">OCR raw text & diagnostics</summary>
                    {ocrDiagnostics.length > 0 && (
                      <pre className="mt-2 whitespace-pre-wrap break-words text-[10px]">{ocrDiagnostics.join('\n')}</pre>
                    )}
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11px]">
                      {ocrRawText || '[No text returned by OCR]'}
                    </pre>
                  </details>
                )}
                <div className="flex items-center gap-2 pt-1">
                  {pendingDocObject && (
                    <button
                      type="button"
                      onClick={() => runRoutineOcrForDoc(pendingDocObject)}
                      disabled={ocrProcessing}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                    >
                      Retry Scan
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setShowAddModal(true);
                    }}
                    className="px-3 py-1 bg-surface border border-red-300 text-red-700 rounded-lg font-semibold text-[11px] cursor-pointer"
                  >
                    Enter Period Manually
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={ocrProcessing}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
        </Modal>
      )}

      {/* EDITABLE REVIEW SCREEN FOR EXTRACTED OCR PERIODS */}
      {showReviewModal && (
        <Modal
          onClose={() => setShowReviewModal(false)}
          labelledBy="routine-review-title"
          panelClassName="bg-surface rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 my-auto animate-in fade-in zoom-in-95 duration-150 space-y-4"
          overlayClassName="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          showCloseButton={false}
        >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 id="routine-review-title" className="font-bold text-sm sm:text-base text-text-primary flex items-center gap-1.5">
                  <Sparkles aria-hidden="true" className="w-4 h-4 text-brand-teal" />
                  <span>Review Extracted Routine ({extractedPeriods.length} Classes)</span>
                </h3>
              </div>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 font-bold p-1" aria-label="Close">✕</button>
            </div>

            {detectedRoutineMeta && (
              <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-text-primary flex flex-wrap items-center gap-x-3 gap-y-1">
                {detectedRoutineMeta.college && <span>College: <strong>{detectedRoutineMeta.college}</strong></span>}
                {detectedRoutineMeta.department && <span>Dept: <strong>{detectedRoutineMeta.department}</strong></span>}
                {detectedRoutineMeta.semester && <span>Semester: <strong>{detectedRoutineMeta.semester}</strong></span>}
                {detectedRoutineMeta.shift && <span>Shift: <strong>{detectedRoutineMeta.shift}</strong></span>}
                {detectedRoutineMeta.section && <span>Section: <strong>{detectedRoutineMeta.section}</strong></span>}
              </div>
            )}

            {ocrWarnings.length > 0 && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle aria-hidden="true" className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  {ocrWarnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs">
              {ocrDiagnostics.length > 0 && (
                <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] text-slate-600">
                  {ocrDiagnostics.join('\n')}
                </pre>
              )}
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11px] text-slate-700">
                {ocrRawText || '[OCR returned no text]'}
              </pre>
            </div>

            {/* Editable List / Table */}
            <div className="max-h-[52vh] overflow-y-auto space-y-3 pr-1">
              {extractedPeriods.map((period, idx) => {
                const uncertain = period.uncertainFields || [];
                return (
                  <div
                    key={period.id || idx}
                    className={`p-3 rounded-xl border space-y-2 text-xs ${
                      uncertain.length > 0
                        ? 'bg-amber-50/40 border-amber-300'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-text-primary">
                          Slot #{idx + 1} · {period.day} (Period {period.periodNumber})
                        </span>
                        {uncertain.length > 0 && (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Review Needed: {uncertain.join(', ')}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setExtractedPeriods(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 text-[11px] font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Class Type</label>
                        <select
                          value={uncertain.includes('type') ? '' : period.type}
                          onChange={(e) => handleUpdateExtractedPeriod(idx, 'type', e.target.value)}
                          className={`w-full px-2 py-1 bg-surface border rounded text-xs ${
                            uncertain.includes('type') ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'
                          }`}
                        >
                          <option value="" disabled>Select type</option>
                          <option value="Theory">Theory</option>
                          <option value="Practical / Lab">Practical / Lab</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Day</label>
                        <select
                          value={period.day}
                          onChange={(e) => handleUpdateExtractedPeriod(idx, 'day', e.target.value)}
                          className="w-full px-2 py-1 bg-surface border border-slate-200 rounded text-xs"
                        >
                          {WEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Period Number</label>
                        <input
                          type="number"
                          min="1"
                          value={period.periodNumber > 0 ? period.periodNumber : ''}
                          placeholder="Not detected"
                          onChange={(e) => handleUpdateExtractedPeriod(idx, 'periodNumber', e.target.value ? Number(e.target.value) : 0)}
                          className={`w-full px-2 py-1 bg-surface border rounded text-xs ${
                            uncertain.includes('periodNumber') ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'
                          }`}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Subject Code</label>
                        <input
                          type="text"
                          value={period.subjectCode}
                          onChange={(e) => handleUpdateExtractedPeriod(idx, 'subjectCode', e.target.value)}
                          className={`w-full px-2 py-1 bg-surface border rounded text-xs ${
                            uncertain.includes('subjectCode') ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'
                          }`}
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-[10px] text-slate-500 mb-0.5">Subject Name</label>
                        <input
                          type="text"
                          value={period.subjectName}
                          onChange={(e) => handleUpdateExtractedPeriod(idx, 'subjectName', e.target.value)}
                          className={`w-full px-2 py-1 bg-surface border rounded text-xs font-semibold ${
                            uncertain.includes('subjectName') ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Start Time</label>
                        <input
                          type="text"
                          value={period.startTime}
                          placeholder="Not detected"
                          onChange={(e) => handleUpdateExtractedPeriod(idx, 'startTime', e.target.value)}
                          className={`w-full px-2 py-1 bg-surface border rounded text-xs ${
                            uncertain.includes('time') ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">End Time</label>
                        <input
                          type="text"
                          value={period.endTime}
                          placeholder="Not detected"
                          onChange={(e) => handleUpdateExtractedPeriod(idx, 'endTime', e.target.value)}
                          className={`w-full px-2 py-1 bg-surface border rounded text-xs ${
                            uncertain.includes('time') ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Teacher</label>
                        <input
                          type="text"
                          value={period.teacherName}
                          placeholder="Not detected"
                          onChange={(e) => handleUpdateExtractedPeriod(idx, 'teacherName', e.target.value)}
                          className={`w-full px-2 py-1 bg-surface border rounded text-xs ${
                            uncertain.includes('teacherName') ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Room</label>
                        <input
                          type="text"
                          value={period.room}
                          placeholder="Not detected"
                          onChange={(e) => handleUpdateExtractedPeriod(idx, 'room', e.target.value)}
                          className={`w-full px-2 py-1 bg-surface border rounded text-xs ${
                            uncertain.includes('room') ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleAddBlankPeriodToReview}
                  className="px-3 py-2 rounded-xl border border-teal-200 bg-teal-50 text-brand-teal text-xs font-semibold hover:bg-teal-100 cursor-pointer flex items-center gap-1"
                >
                  <Plus aria-hidden="true" className="w-3.5 h-3.5" />
                  <span>Add Row</span>
                </button>
              </div>
              <button
                type="button"
                onClick={handleConfirmExtractedRoutine}
                disabled={isPublishingExtractedRoutine}
                className="px-5 py-2 rounded-xl bg-brand-teal hover:bg-teal-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              >
                <Save aria-hidden="true" className="w-3.5 h-3.5" />
                <span>{isPublishingExtractedRoutine ? 'Publishing...' : 'Confirm & Publish Routine'}</span>
              </button>
            </div>
        </Modal>
      )}

      {/* ORIGINAL PRESERVED ROUTINE DOCUMENT VIEWER MODAL */}
      {selectedOriginalDoc && (
        <Modal
          onClose={() => setSelectedOriginalDoc(null)}
          labelledBy="routine-original-doc-title"
          panelClassName="bg-surface rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-3"
          overlayClassName="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          showCloseButton={false}
        >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 id="routine-original-doc-title" className="font-bold text-sm text-text-primary">{selectedOriginalDoc.fileName}</h3>
                <p className="text-xs text-slate-500">Uploaded {selectedOriginalDoc.uploadedAt.slice(0, 10)} by {selectedOriginalDoc.uploadedBy}</p>
              </div>
              <button onClick={() => setSelectedOriginalDoc(null)} className="text-slate-400 font-bold p-1" aria-label="Close">✕</button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2 flex items-center justify-center">
              {selectedOriginalDoc.fileType === 'IMAGE' ? (
                <img src={selectedOriginalDoc.dataUrl} alt="Preserved Routine" className="max-w-full h-auto rounded-lg shadow-xs" />
              ) : (
                <div className="p-8 text-center space-y-2">
                  <FileText aria-hidden="true" className="w-12 h-12 text-brand-blue mx-auto" />
                  <a
                    href={selectedOriginalDoc.dataUrl}
                    download={selectedOriginalDoc.fileName}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-blue text-white rounded-lg text-xs font-semibold"
                  >
                    Download Original PDF
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedOriginalDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
        </Modal>
      )}

      {/* MANUAL ADD PERIOD MODAL */}
      {showAddModal && (
        <Modal
          onClose={() => setShowAddModal(false)}
          labelledBy="routine-add-period-title"
          panelClassName="bg-surface rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-3 max-h-[92vh] overflow-y-auto"
          overlayClassName="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          showCloseButton={false}
        >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 id="routine-add-period-title" className="font-bold text-sm text-text-primary">Add Class Period</h3>
                <p className="text-[11px] text-slate-500">
                  {selectedShift} Shift · 1st Period {activeShiftSchedule.firstPeriodStartTime} ({activeShiftSchedule.defaultDurationMinutes}m default)
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 font-bold p-1" aria-label="Close">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
              {/* Shift & Weekday Selection */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Shift</label>
                  <select
                    value={selectedShift}
                    onChange={(e) => handleShiftChange(e.target.value as Shift)}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-text-primary font-semibold"
                  >
                    <option value="Morning">Morning Shift (08:00 AM)</option>
                    <option value="Day">Day Shift (01:30 PM)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Weekday</label>
                  <select
                    value={formData.day}
                    onChange={(e) => setFormData({ ...formData, day: e.target.value as WeekDay })}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
                  >
                    {WEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Manual Period Selection (Requirement D: Never auto-select a period) */}
              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-text-primary">
                    Select Desired Period *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowScheduleConfigModal(true)}
                    className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-1"
                  >
                    <Sliders aria-hidden="true" className="w-3 h-3" />
                    <span>Configure Shift Periods</span>
                  </button>
                </div>
                <select
                  required
                  value={selectedPeriodSlotNumber}
                  onChange={(e) => handleSelectPeriodSlot(e.target.value)}
                  className="w-full px-2.5 py-2 bg-surface border border-blue-200 rounded-lg text-text-primary font-semibold"
                >
                  <option value="">-- Select Desired Period --</option>
                  {activeShiftSchedule.periods.map((slot) => (
                    <option key={slot.periodNumber} value={slot.periodNumber}>
                      Period {slot.periodNumber} ({slot.startTime} - {slot.endTime}) · {slot.durationMinutes}m
                      {slot.isManuallyEdited ? ' [Custom]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Curriculum Context for Automatic Subject Suggestions */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <SearchableDepartmentSelect
                  value={routineTechnology}
                  onChange={(dept) => setRoutineTechnology(dept)}
                  label="Technology / Department"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-text-primary mb-1">Regulation</label>
                    <select
                      value={routineRegulation}
                      onChange={(e) => setRoutineRegulation(e.target.value as CatalogRegulation)}
                      className="w-full px-2 py-1.5 bg-surface border border-slate-200 rounded-lg text-text-primary font-semibold"
                    >
                      <option value="2022">2022 Regulation</option>
                      <option value="2016">2016 Regulation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-text-primary mb-1">Semester (1-8)</label>
                    <select
                      value={routineSemester}
                      onChange={(e) => setRoutineSemester(Number(e.target.value) as SemesterNumber)}
                      className="w-full px-2 py-1.5 bg-surface border border-slate-200 rounded-lg text-text-primary font-semibold"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <CatalogSubjectSelect
                technology={routineTechnology}
                regulation={routineRegulation}
                onRegulationChange={(reg) => setRoutineRegulation(reg)}
                showRegulationSelector={false}
                semester={routineSemester}
                selectedCode={formData.subjectCode}
                selectedName={formData.subjectName}
                onSelect={(sel) => {
                  if (sel) {
                    setFormData((prev) => ({
                      ...prev,
                      subjectCode: sel.code,
                      subjectName: sel.name
                    }));
                  } else {
                    setFormData((prev) => ({
                      ...prev,
                      subjectCode: '',
                      subjectName: ''
                    }));
                  }
                }}
                label="Class Subject (Code & Name)"
                required
              />

              <div>
                <label className="block font-semibold text-text-primary mb-1">Class Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
                >
                  <option value="Theory">Theory</option>
                  <option value="Practical / Lab">Practical / Lab</option>
                </select>
              </div>

              {/* Period Start & End Time with Manual Override Preservation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">
                    Period Start & End Time
                  </span>
                  {(isFormTimeManuallyEdited ||
                    (selectedPeriodSlotNumber !== '' &&
                      activeShiftSchedule.periods.find(p => p.periodNumber === Number(selectedPeriodSlotNumber))?.isManuallyEdited)) && (
                    <button
                      type="button"
                      onClick={handleResetFormPeriodTiming}
                      className="text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1"
                    >
                      <RotateCcw aria-hidden="true" className="w-2.5 h-2.5" />
                      <span>Reset to Suggested Time</span>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TimePicker
                    label="Period Start Time"
                    value={formData.startTime}
                    onChange={handleManualFormStartTimeChange}
                    required
                  />
                  <TimePicker
                    label="Period End Time"
                    value={formData.endTime}
                    onChange={handleManualFormEndTimeChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Instructor / Teacher *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engr. Tanvir Ahmed"
                    value={formData.teacherName}
                    onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Room / Lab</label>
                  <input
                    type="text"
                    placeholder="Room 304, Lab 2"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 flex items-center justify-between gap-2">
                <div>
                  <span className="block font-bold text-text-primary text-[11px]">Publication Status</span>
                  <span className="text-[10px] text-teal-800">
                    Target Group: {userProfile.college} · {routineTechnology} · Sem {routineSemester} ({selectedShift} · Sec {selectedSection})
                  </span>
                </div>
                <select
                  value={formData.publication_status || 'published'}
                  onChange={(e) => setFormData({ ...formData, publication_status: e.target.value as any })}
                  className="px-2 py-1.5 bg-surface border border-teal-300 rounded-lg text-xs font-bold text-text-primary"
                >
                  <option value="published">Publish Now</option>
                  <option value="draft">Save as Draft</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-brand-blue text-white font-semibold shadow-xs"
                >
                  {formData.publication_status === 'draft' ? 'Save Draft' : 'Publish Period'}
                </button>
              </div>
            </form>
        </Modal>
      )}

      {/* Configurable Shift & Period Schedule Modal */}
      <ShiftScheduleConfigModal
        isOpen={showScheduleConfigModal}
        onClose={() => setShowScheduleConfigModal(false)}
        initialShift={selectedShift}
        shiftSchedules={shiftSchedules}
        onSaveSchedule={saveShiftSchedule}
        onResetSchedule={resetShiftSchedule}
        onShiftChanged={(nextShift) => handleShiftChange(nextShift)}
      />
    </div>
  );
};
