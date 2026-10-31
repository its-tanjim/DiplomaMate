import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  BookOpen,
  Briefcase,
  Download,
  Upload,
  Plus,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  ExternalLink,
  MapPin,
  Building,
  Lock,
  Users,
  RefreshCw,
  Search,
  Filter,
  Megaphone,
  Flag,
  Trash2,
  Edit3,
  Award,
  GraduationCap,
  ChevronRight,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import {
  AssignmentItem,
  NoteItem,
  JobCircular,
  SemesterNumber,
  Shift,
  Section,
  AssignmentSubmissionRecord,
  CatalogRegulation,
  BtebOfficialNotice,
  BtebNoticeCategory,
  CampusNoticeItem,
  CampusNoticeScope,
  DocumentScanFeature,
  DocumentScanResult
} from '../../types';
import { nativeService } from '../../services/nativeService';
import {
  prepareFileForDocumentIntelligence,
  scanDocumentOnServer
} from '../../services/documentIntelligenceService';
import { SearchableCollegeSelect } from '../common/SearchableCollegeSelect';
import { SearchableDepartmentSelect } from '../common/SearchableDepartmentSelect';
import { CatalogSubjectSelect } from '../common/CatalogSubjectSelect';
import { TECHNOLOGIES_DIRECTORY } from '../../data/directoryData';

const BTEB_CATEGORIES: BtebNoticeCategory[] = [
  'Diploma in Engineering',
  'Diploma in Textile',
  'Diploma in Agriculture',
  'HSC (BMT / Vocational)',
  'SSC (Vocational / Dakhil)',
  'Admission & Registration',
  'Examination & Form Fill-up',
  'Result & Scholarship',
  'General / Administrative'
];

export const NotesAssignmentsScreen: React.FC = () => {
  const {
    notes,
    assignments,
    jobs: contextJobs,
    accountType,
    isVerifiedCaptain,
    isServerVerifiedAdmin,
    userProfile,
    authToken,
    addNote,
    addAssignment,
    addJobCircular,
    submitAssignment,
    refreshAcademicFeed,
    setActiveScreen,
    showToast,
    notesInitialTab
  } = useApp();

  const isTeacher = accountType === 'teacher';
  const isAdmin = accountType === 'system_admin' && isServerVerifiedAdmin;
  const isVerifiedTeacher = isTeacher && userProfile.teacherVerificationStatus === 'Verified';
  const canPublishAcademicContent = isVerifiedCaptain || isVerifiedTeacher || isAdmin;

  // Top-level 4 tabs: 'notices' | 'jobs' | 'assignments' | 'notes'
  const [mainTab, setMainTab] = useState<'notices' | 'jobs' | 'assignments' | 'notes'>(
    notesInitialTab || 'notices'
  );

  useEffect(() => {
    if (notesInitialTab) {
      setMainTab(notesInitialTab);
    }
  }, [notesInitialTab]);

  // ============================================================================
  // PART 2 & 3 STATE: OFFICIAL BTEB NOTICES + TEACHER/CR CAMPUS NOTICES
  // ============================================================================
  const [noticeSubTab, setNoticeSubTab] = useState<'all' | 'bteb' | 'college' | 'my_group'>('all');
  const [noticeSearch, setNoticeSearch] = useState('');
  const [btebCategoryFilter, setBtebCategoryFilter] = useState<string>('all');
  const [btebDateFrom, setBtebDateFrom] = useState('');
  const [btebDateTo, setBtebDateTo] = useState('');

  // Official BTEB Notices state
  const [btebNotices, setBtebNotices] = useState<BtebOfficialNotice[]>([]);
  const [btebTotalFiltered, setBtebTotalFiltered] = useState(0);
  const [btebTotalCached, setBtebTotalCached] = useState(0);
  const [btebPagesFetched, setBtebPagesFetched] = useState(0);
  const [btebLastSyncedAt, setBtebLastSyncedAt] = useState<string | null>(null);
  const [btebSyncError, setBtebSyncError] = useState<string | null>(null);
  const [btebPage, setBtebPage] = useState(1);
  const [btebHasMore, setBtebHasMore] = useState(false);
  const [isLoadingBteb, setIsLoadingBteb] = useState(false);
  const [isSyncingBteb, setIsSyncingBteb] = useState(false);
  const [selectedBtebNotice, setSelectedBtebNotice] = useState<BtebOfficialNotice | null>(null);

  // Teacher / CR Campus Notices state
  const [campusNotices, setCampusNotices] = useState<CampusNoticeItem[]>([]);
  const [isLoadingCampusNotices, setIsLoadingCampusNotices] = useState(false);
  const [selectedCampusNotice, setSelectedCampusNotice] = useState<CampusNoticeItem | null>(null);
  const [showPublishNoticeModal, setShowPublishNoticeModal] = useState(false);
  const [editingCampusNotice, setEditingCampusNotice] = useState<CampusNoticeItem | null>(null);
  const [reportingCampusNotice, setReportingCampusNotice] = useState<CampusNoticeItem | null>(null);
  const [reportReason, setReportReason] = useState('');

  const [noticeForm, setNoticeForm] = useState<{
    title: string;
    description: string;
    targetScope: CampusNoticeScope;
    college: string;
    department: string;
    semester: SemesterNumber;
    shift: Shift | 'Both';
    section: Section | 'All';
    priority: 'Important' | 'Normal';
    isPinned: boolean;
    expiryDate: string;
  }>({
    title: '',
    description: '',
    targetScope: isVerifiedCaptain ? 'cohort' : 'department',
    college: userProfile.college,
    department: userProfile.department,
    semester: (userProfile.semestersTaught?.[0] as SemesterNumber) || userProfile.semester || 6,
    shift: isVerifiedCaptain ? userProfile.shift : 'Both',
    section: isVerifiedCaptain ? userProfile.section : 'All',
    priority: 'Important',
    isPinned: false,
    expiryDate: ''
  });

  // ============================================================================
  // PART 1 STATE: DIPLOMA ENGINEERING JOB CIRCULARS
  // ============================================================================
  const [serverJobs, setServerJobs] = useState<JobCircular[]>(contextJobs);
  const [jobsTotal, setJobsTotal] = useState(contextJobs.length);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsHasMore, setJobsHasMore] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [isSyncingJobs, setIsSyncingJobs] = useState(false);
  const [jobSearch, setJobSearch] = useState('');
  const [jobDeptFilter, setJobDeptFilter] = useState('all');
  const [jobLocationFilter, setJobLocationFilter] = useState('all');
  const [jobTypeFilter, setJobTypeFilter] = useState('all');
  const [jobStatusFilter, setJobStatusFilter] = useState('all');
  const [jobSort, setJobSort] = useState<'newest' | 'deadline'>('newest');
  const [jobSyncInfo, setJobSyncInfo] = useState<{
    primarySourceUrl: string;
    careerjetApiConfigured: boolean;
    autoSyncActive: boolean;
    lastUpdatedAt: string;
    sourceStatusMessage: string;
  } | null>(null);
  const [availableJobFilters, setAvailableJobFilters] = useState<{
    departments: string[];
    locations: string[];
    types: string[];
  }>({
    departments: TECHNOLOGIES_DIRECTORY.map(t => t.name),
    locations: ['Dhaka', 'Gazipur', 'Chattogram', 'Narayanganj'],
    types: ['Full-Time', 'Internship', 'Apprenticeship', 'Part-Time']
  });

  const [showBatchImportJobsModal, setShowBatchImportJobsModal] = useState(false);
  const [batchJobsJsonText, setBatchJobsJsonText] = useState('');

  // ============================================================================
  // EXISTING ASSIGNMENTS & NOTES STATE (100% PRESERVED)
  // ============================================================================
  const [selectedSubjectFilter] = useState<string>('All');
  const [teacherSemesterFilter, setTeacherSemesterFilter] = useState<number | 'ALL'>('ALL');
  const [teacherSectionFilter, setTeacherSectionFilter] = useState<Section | 'ALL'>('ALL');

  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobCircular | null>(null);
  const [submittingAssignment, setSubmittingAssignment] = useState<AssignmentItem | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [studentSubmissionFile, setStudentSubmissionFile] = useState<{
    name: string;
    type: string;
    dataUrl: string;
    size: string;
  } | null>(null);
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);

  const [inspectingAssignment, setInspectingAssignment] = useState<AssignmentItem | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'submitted' | 'not_submitted'>('submitted');
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [submissionsDetail, setSubmissionsDetail] = useState<{
    totalSubmitted: number;
    totalNotSubmitted: number | null;
    eligibleRosterCount: number | null;
    totalAttempts: number;
    submissions: AssignmentSubmissionRecord[];
    notSubmittedStudents: Array<{
      studentId: string;
      studentName: string;
      boardRoll: string;
      classRoll: string;
      regNumber: string;
    }>;
  } | null>(null);

  const [showAddAssignmentModal, setShowAddAssignmentModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showAddJobModal, setShowAddJobModal] = useState(false);

  const [targetCollege, setTargetCollege] = useState<string>(userProfile.college);
  const [targetDepartment, setTargetDepartment] = useState<string>(userProfile.department);
  const [targetRegulation, setTargetRegulation] = useState<CatalogRegulation>(userProfile.regulation || '2022');
  const [targetSemester, setTargetSemester] = useState<SemesterNumber>(
    (userProfile.semestersTaught?.[0] as SemesterNumber) || userProfile.semester || 6
  );
  const [targetShift, setTargetShift] = useState<Shift>(userProfile.shift || 'Morning');
  const [targetSection, setTargetSection] = useState<Section>(
    (userProfile.section as Section) || 'A1'
  );

  const [newAsgData, setNewAsgData] = useState({
    title: '',
    subjectCode: '66664',
    subjectName: 'Database Management System',
    assignedBy: isTeacher ? userProfile.name : 'Engr. Mahbubur Rahman',
    dueDate: '2026-11-10',
    description: '',
    marks: '',
    submissionMethod: '',
    questionsText: ''
  });

  const [newNoteData, setNewNoteData] = useState({
    title: '',
    subjectCode: '66662',
    subjectName: 'Microprocessor & Interfacing',
    chapter: 'Chapter 4',
    fileType: 'PDF' as 'PDF' | 'DOCX' | 'SLIDES' | 'IMAGE' | 'VIDEO',
    fileSize: '3.4 MB',
    summary: '',
    extractedText: '',
    headingsText: ''
  });

  const [newJobData, setNewJobData] = useState({
    title: '',
    company: '',
    location: 'Dhaka, Bangladesh',
    type: 'Full-Time' as 'Internship' | 'Full-Time' | 'Apprenticeship' | 'Part-Time' | 'Contract',
    targetDepartments: [userProfile.department || 'Computer Science & Technology (CST)'],
    publishedAt: new Date().toISOString().slice(0, 10),
    deadline: '2026-11-30',
    stipendOrSalary: 'BDT 20,000 - 25,000 / month',
    experienceRequirements: 'Freshers / 0–1 Year',
    educationalQualifications: '4-Year Diploma in Engineering (BTEB)',
    description: '',
    requirements: '',
    sourceName: 'Careerjet Bangladesh / Employer Career Page',
    sourceUrl: 'https://www.careerjet.com.bd/diploma-engineer-jobs',
    applyUrl: ''
  });

  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    type: string;
    dataUrl: string;
    size: string;
    rawFile?: File;
    videoFramesDataUrls?: string[];
    videoDurationSeconds?: number;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Shared Document Intelligence State
  const [isScanningDoc, setIsScanningDoc] = useState(false);
  const [scanStageText, setScanStageText] = useState<string | null>(null);
  const [activeScanResult, setActiveScanResult] = useState<DocumentScanResult | null>(null);
  const [scanErrorMsg, setScanErrorMsg] = useState<string | null>(null);
  const [pdfPageStart, setPdfPageStart] = useState<string>('');
  const [pdfPageEnd, setPdfPageEnd] = useState<string>('');
  const [noteSearchQuery, setNoteSearchQuery] = useState<string>('');
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  // ============================================================================
  // DATA FETCHERS FOR BTEB NOTICES, CAMPUS NOTICES & JOB CIRCULARS
  // ============================================================================
  const fetchBtebNotices = useCallback(
    async (pageToLoad = 1, append = false, forceRefresh = false) => {
      if (forceRefresh) setIsSyncingBteb(true);
      else setIsLoadingBteb(true);

      try {
        const params = new URLSearchParams();
        if (noticeSearch.trim()) params.set('q', noticeSearch.trim());
        if (btebCategoryFilter !== 'all') params.set('category', btebCategoryFilter);
        if (btebDateFrom) params.set('dateFrom', btebDateFrom);
        if (btebDateTo) params.set('dateTo', btebDateTo);
        params.set('page', String(pageToLoad));
        params.set('pageSize', '25');
        if (forceRefresh) params.set('refresh', 'true');

        const res = await fetch(`/api/notices/bteb?${params.toString()}`);
        const data = await res.json();
        if (res.ok && data.success) {
          const incoming: BtebOfficialNotice[] = Array.isArray(data.notices) ? data.notices : [];
          setBtebNotices(prev => (append ? [...prev, ...incoming] : incoming));
          setBtebTotalFiltered(data.totalFiltered ?? incoming.length);
          setBtebTotalCached(data.totalCached ?? incoming.length);
          setBtebPagesFetched(data.pagesFetched ?? 1);
          setBtebLastSyncedAt(data.lastSyncedAt || null);
          setBtebSyncError(data.syncError || null);
          setBtebPage(pageToLoad);
          setBtebHasMore(Boolean(data.hasMore));
          if (forceRefresh) {
            showToast(
              data.syncError
                ? `Sync notice: ${data.syncError}`
                : `Synchronized ${data.totalCached} official BTEB notices across ${data.pagesFetched} pages!`
            );
          }
        } else {
          setBtebSyncError(data.error || 'Failed to load BTEB notices.');
        }
      } catch {
        setBtebSyncError('Network error reaching BTEB notice synchronization service.');
      } finally {
        setIsLoadingBteb(false);
        setIsSyncingBteb(false);
      }
    },
    [noticeSearch, btebCategoryFilter, btebDateFrom, btebDateTo, showToast]
  );

  const fetchCampusNotices = useCallback(async () => {
    setIsLoadingCampusNotices(true);
    try {
      const token = authToken || localStorage.getItem('diplomamate_auth_token');
      const params = new URLSearchParams();
      const filterParam =
        noticeSubTab === 'college'
          ? 'college'
          : noticeSubTab === 'my_group'
            ? 'my_group'
            : 'all';
      params.set('filter', filterParam);
      if (noticeSearch.trim()) params.set('q', noticeSearch.trim());
      params.set('college', userProfile.college);
      params.set('department', userProfile.department);
      params.set('semester', String(userProfile.semester));
      params.set('shift', userProfile.shift);
      params.set('section', userProfile.section);

      const res = await fetch(`/api/notices/campus?${params.toString()}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.notices)) {
        setCampusNotices(data.notices);
      }
    } catch {
      // Keep existing state on transient error
    } finally {
      setIsLoadingCampusNotices(false);
    }
  }, [authToken, noticeSubTab, noticeSearch, userProfile]);

  const fetchJobsList = useCallback(
    async (pageToLoad = 1, append = false) => {
      setIsLoadingJobs(true);
      try {
        const params = new URLSearchParams();
        if (jobSearch.trim()) params.set('q', jobSearch.trim());
        if (jobDeptFilter !== 'all') params.set('department', jobDeptFilter);
        if (jobLocationFilter !== 'all') params.set('location', jobLocationFilter);
        if (jobTypeFilter !== 'all') params.set('type', jobTypeFilter);
        if (jobStatusFilter !== 'all') params.set('status', jobStatusFilter);
        params.set('sort', jobSort);
        params.set('page', String(pageToLoad));
        params.set('pageSize', '15');

        const res = await fetch(`/api/jobs?${params.toString()}`);
        const data = await res.json();
        if (res.ok && data.success) {
          const incoming: JobCircular[] = Array.isArray(data.jobs) ? data.jobs : [];
          setServerJobs(prev => (append ? [...prev, ...incoming] : incoming));
          setJobsTotal(data.total ?? incoming.length);
          setJobsPage(pageToLoad);
          setJobsHasMore(Boolean(data.hasMore));
          if (data.syncInfo) setJobSyncInfo(data.syncInfo);
          if (data.availableFilters) {
            setAvailableJobFilters(prev => ({
              departments:
                data.availableFilters.departments?.length > 0
                  ? Array.from(new Set([...data.availableFilters.departments, ...TECHNOLOGIES_DIRECTORY.map(t => t.name)]))
                  : prev.departments,
              locations:
                data.availableFilters.locations?.length > 0
                  ? data.availableFilters.locations
                  : prev.locations,
              types:
                data.availableFilters.types?.length > 0
                  ? data.availableFilters.types
                  : prev.types
            }));
          }
        }
      } catch {
        // Fallback to contextJobs
      } finally {
        setIsLoadingJobs(false);
      }
    },
    [jobSearch, jobDeptFilter, jobLocationFilter, jobTypeFilter, jobStatusFilter, jobSort]
  );

  useEffect(() => {
    fetchBtebNotices(1, false, false);
  }, [fetchBtebNotices]);

  useEffect(() => {
    fetchCampusNotices();
  }, [fetchCampusNotices]);

  useEffect(() => {
    fetchJobsList(1, false);
  }, [fetchJobsList]);

  // ============================================================================
  // HANDLERS FOR NOTICES & JOBS
  // ============================================================================
  const handleTriggerJobSync = async () => {
    setIsSyncingJobs(true);
    try {
      const res = await fetch('/api/jobs/sync', { method: 'POST' });
      const data = await res.json();
      if (data.message) {
        showToast(data.message);
      }
      await fetchJobsList(1, false);
    } catch {
      showToast('Could not contact job synchronization endpoint.');
    } finally {
      setIsSyncingJobs(false);
    }
  };

  const handlePublishOrUpdateCampusNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeForm.title.trim() || !noticeForm.description.trim()) return;

    const token = authToken || localStorage.getItem('diplomamate_auth_token');
    try {
      const url = editingCampusNotice
        ? `/api/notices/campus/${editingCampusNotice.id}`
        : '/api/notices/campus';
      const method = editingCampusNotice ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...noticeForm,
          attachmentUrl: attachedFile?.dataUrl,
          attachmentName: attachedFile?.name,
          attachmentType: attachedFile?.name.endsWith('.pdf') ? 'PDF' : 'IMAGE'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Failed to publish notice.');
        return;
      }

      showToast(data.message || 'Notice published!');
      setShowPublishNoticeModal(false);
      setEditingCampusNotice(null);
      setAttachedFile(null);
      setNoticeForm({
        title: '',
        description: '',
        targetScope: isVerifiedCaptain ? 'cohort' : 'department',
        college: userProfile.college,
        department: userProfile.department,
        semester: (userProfile.semestersTaught?.[0] as SemesterNumber) || userProfile.semester || 6,
        shift: isVerifiedCaptain ? userProfile.shift : 'Both',
        section: isVerifiedCaptain ? userProfile.section : 'All',
        priority: 'Important',
        isPinned: false,
        expiryDate: ''
      });
      await fetchCampusNotices();
    } catch {
      showToast('Network error while publishing notice.');
    }
  };

  const handleDeleteCampusNotice = async (noticeId: string) => {
    const token = authToken || localStorage.getItem('diplomamate_auth_token');
    try {
      const res = await fetch(`/api/notices/campus/${noticeId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Could not delete notice.');
        return;
      }
      showToast('Notice deleted.');
      setSelectedCampusNotice(null);
      await fetchCampusNotices();
    } catch {
      showToast('Failed to delete notice.');
    }
  };

  const handleReportCampusNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingCampusNotice || !reportReason.trim()) return;
    const token = authToken || localStorage.getItem('diplomamate_auth_token');
    try {
      const res = await fetch(`/api/notices/campus/${reportingCampusNotice.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ reason: reportReason.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Could not submit report.');
        return;
      }
      showToast(data.message || 'Report submitted.');
      setReportingCampusNotice(null);
      setReportReason('');
      await fetchCampusNotices();
    } catch {
      showToast('Failed to submit report.');
    }
  };

  const handleBatchImportJobs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchJobsJsonText.trim()) return;
    const token = authToken || localStorage.getItem('diplomamate_auth_token');
    try {
      const parsed = JSON.parse(batchJobsJsonText);
      const jobsPayload = Array.isArray(parsed) ? parsed : parsed.jobs || [parsed];
      const res = await fetch('/api/admin/jobs/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ jobsPayload })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Batch job import failed.');
        return;
      }
      showToast(data.message || 'Imported jobs successfully!');
      setShowBatchImportJobsModal(false);
      setBatchJobsJsonText('');
      await fetchJobsList(1, false);
    } catch {
      showToast('Invalid JSON format. Please provide a valid JSON array of job objects.');
    }
  };

  // ============================================================================
  // EXISTING HANDLERS FOR ASSIGNMENTS & NOTES
  // ============================================================================
  const filteredNotes = notes.filter(n => {
    if (selectedSubjectFilter !== 'All' && !n.subjectName.toLowerCase().includes(selectedSubjectFilter.toLowerCase())) {
      return false;
    }
    if (isTeacher && teacherSemesterFilter !== 'ALL' && Number(n.semester) !== Number(teacherSemesterFilter)) {
      return false;
    }
    if (isTeacher && teacherSectionFilter !== 'ALL' && n.section && n.section !== teacherSectionFilter) {
      return false;
    }
    if (noteSearchQuery.trim()) {
      const q = noteSearchQuery.trim().toLowerCase();
      const searchableBlob = [
        n.title,
        n.subjectName,
        n.subjectCode,
        n.chapter,
        n.summary,
        n.extractedText || '',
        ...(n.headings || []),
        ...(n.tables || [])
      ]
        .join(' ')
        .toLowerCase();
      if (!searchableBlob.includes(q)) return false;
    }
    return true;
  });

  const filteredAssignments = assignments.filter(a => {
    if (selectedSubjectFilter !== 'All' && !a.subjectName.toLowerCase().includes(selectedSubjectFilter.toLowerCase())) {
      return false;
    }
    if (isTeacher && teacherSemesterFilter !== 'ALL' && Number(a.semester) !== Number(teacherSemesterFilter)) {
      return false;
    }
    if (isTeacher && teacherSectionFilter !== 'ALL' && a.section && a.section !== teacherSectionFilter) {
      return false;
    }
    return true;
  });

  const applyScannedDataToForm = (feature: DocumentScanFeature, scan: DocumentScanResult) => {
    if (feature === 'assignment' && scan.assignmentData) {
      const ad = scan.assignmentData;
      setNewAsgData(prev => ({
        ...prev,
        title: ad.title || prev.title,
        subjectCode: ad.subjectCode || prev.subjectCode,
        subjectName: ad.subjectName || prev.subjectName,
        assignedBy: isTeacher ? userProfile.name : ad.teacherName || prev.assignedBy,
        dueDate: ad.dueDate || prev.dueDate,
        description: ad.instructions || prev.description,
        marks: ad.marks || prev.marks,
        submissionMethod: ad.submissionMethod || prev.submissionMethod,
        questionsText: ad.questions && ad.questions.length > 0 ? ad.questions.join('\n') : prev.questionsText
      }));
      if (ad.semester && isTeacher) {
        setTargetSemester(ad.semester);
      }
    } else if (feature === 'note' && scan.noteData) {
      const nd = scan.noteData;
      setNewNoteData(prev => ({
        ...prev,
        title: nd.title || prev.title,
        subjectCode: nd.subjectCode || prev.subjectCode,
        subjectName: nd.subjectName || prev.subjectName,
        chapter: nd.chapter || prev.chapter,
        summary: nd.summary || prev.summary,
        extractedText: nd.extractedText || scan.rawExtractedText || prev.extractedText,
        headingsText: nd.headings && nd.headings.length > 0 ? nd.headings.join(' | ') : prev.headingsText
      }));
      if (nd.semester && isTeacher) {
        setTargetSemester(nd.semester);
      }
    } else if (feature === 'notice' && scan.noticeData) {
      const ncd = scan.noticeData;
      setNoticeForm(prev => ({
        ...prev,
        title: ncd.title || prev.title,
        description: ncd.description || scan.rawExtractedText || prev.description,
        priority: ncd.priority || prev.priority,
        expiryDate: ncd.expiryDate || prev.expiryDate
      }));
    } else if (feature === 'job' && scan.jobData) {
      const jd = scan.jobData;
      setNewJobData(prev => ({
        ...prev,
        title: jd.title || prev.title,
        company: jd.company || prev.company,
        location: jd.location || prev.location,
        type: (jd.type as any) || prev.type,
        deadline: jd.deadline || prev.deadline,
        stipendOrSalary: jd.stipendOrSalary || prev.stipendOrSalary,
        experienceRequirements: jd.experienceRequirements || prev.experienceRequirements,
        educationalQualifications: jd.educationalQualifications || prev.educationalQualifications,
        description: jd.description || prev.description,
        requirements: jd.description || prev.requirements,
        applyUrl: jd.applyUrl || prev.applyUrl
      }));
    }
  };

  const runDocumentScanForAttachedFile = async (
    feature: DocumentScanFeature,
    filePayload: {
      name: string;
      type: string;
      dataUrl: string;
      size: string;
      rawFile?: File;
      videoFramesDataUrls?: string[];
      videoDurationSeconds?: number;
    }
  ) => {
    if (isScanningDoc) return;
    setIsScanningDoc(true);
    setScanErrorMsg(null);
    setScanStageText('Scanning document & extracting structured fields...');

    try {
      const startNum = pdfPageStart ? parseInt(pdfPageStart, 10) : undefined;
      const endNum = pdfPageEnd ? parseInt(pdfPageEnd, 10) : undefined;

      const scanRes = await scanDocumentOnServer({
        feature,
        fileName: filePayload.name,
        mimeType: filePayload.type,
        fileDataUrl: filePayload.dataUrl,
        videoFramesDataUrls: filePayload.videoFramesDataUrls,
        videoDurationSeconds: filePayload.videoDurationSeconds,
        pageStart: startNum && startNum > 0 ? startNum : undefined,
        pageEnd: endNum && endNum > 0 ? endNum : undefined,
        defaults: {
          college: isTeacher ? targetCollege : userProfile.college,
          department: isTeacher ? targetDepartment : userProfile.department,
          semester: isTeacher ? targetSemester : userProfile.semester,
          shift: isTeacher ? targetShift : userProfile.shift,
          section: isTeacher ? targetSection : userProfile.section
        },
        authToken
      });

      setActiveScanResult(scanRes);
      if (!scanRes.success) {
        setScanErrorMsg(
          scanRes.error || scanRes.warnings?.[0] || 'Could not extract structured text from this file.'
        );
      } else {
        applyScannedDataToForm(feature, scanRes);
        showToast(`Document scanned (${scanRes.confidence} confidence)`);
      }
    } catch (err: any) {
      setScanErrorMsg(err?.message || 'Document scanning failed. You can retry or enter details manually.');
    } finally {
      setIsScanningDoc(false);
      setScanStageText(null);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    maxMb = 25,
    isStudentSubmission = false,
    scanFeature?: DocumentScanFeature
  ) => {
    setFileError(null);
    setScanErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxMb * 1024 * 1024) {
      setFileError(`File exceeds maximum limit of ${maxMb}MB.`);
      return;
    }

    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    // For non-scanned attachments (like ZIP/DOCX student submissions), use direct FileReader
    const lowerName = file.name.toLowerCase();
    const isScannableMedia =
      file.type.startsWith('image/') ||
      file.type === 'application/pdf' ||
      file.type.startsWith('video/') ||
      lowerName.endsWith('.pdf') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.webp') ||
      lowerName.endsWith('.mp4') ||
      lowerName.endsWith('.webm');

    if (scanFeature && isScannableMedia && !isStudentSubmission) {
      setIsScanningDoc(true);
      const prepared = await prepareFileForDocumentIntelligence(file, {
        allowVideo: scanFeature === 'note',
        onProgress: (stage: string) => {
          setScanStageText(stage);
        }
      });
      setIsScanningDoc(false);
      setScanStageText(null);

      if (!prepared.valid || !prepared.dataUrl) {
        setFileError(prepared.error || 'Unsupported or corrupted file.');
        return;
      }

      const payload = {
        name: prepared.fileName,
        type: prepared.mimeType,
        dataUrl: prepared.dataUrl,
        size: prepared.fileSizeFormatted || sizeFormatted,
        rawFile: file,
        videoFramesDataUrls: prepared.videoFramesDataUrls,
        videoDurationSeconds: prepared.videoDurationSeconds
      };
      setAttachedFile(payload);
      showToast(`Attached ${file.name}`);
      await runDocumentScanForAttachedFile(scanFeature, payload);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const payload = {
        name: file.name,
        type: file.type,
        dataUrl: reader.result as string,
        size: sizeFormatted,
        rawFile: file
      };
      if (isStudentSubmission) {
        setStudentSubmissionFile(payload);
      } else {
        setAttachedFile(payload);
      }
      showToast(`Attached ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingAssignment) return;

    setIsSubmittingWork(true);
    try {
      const attachmentPayload = studentSubmissionFile
        ? {
            url: studentSubmissionFile.dataUrl,
            name: studentSubmissionFile.name,
            type: studentSubmissionFile.name.endsWith('.pdf')
              ? 'PDF'
              : studentSubmissionFile.name.endsWith('.zip')
                ? 'ZIP'
                : studentSubmissionFile.name.endsWith('.docx')
                  ? 'DOCX'
                  : 'IMAGE'
          }
        : undefined;

      const res = await submitAssignment(
        submittingAssignment.id,
        submissionText,
        attachmentPayload
      );
      if (res.success) {
        setSubmittingAssignment(null);
        setSubmissionText('');
        setStudentSubmissionFile(null);
      }
    } finally {
      setIsSubmittingWork(false);
    }
  };

  const handleOpenTeacherSubmissions = async (asg: AssignmentItem) => {
    setInspectingAssignment(asg);
    setInspectorTab('submitted');
    setIsLoadingSubmissions(true);
    setSubmissionsDetail(null);

    try {
      const token = authToken || localStorage.getItem('diplomamate_auth_token');
      const res = await fetch(`/api/assignments/${asg.id}/submissions`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const s = data.summary || {};
        setSubmissionsDetail({
          totalSubmitted: s.totalSubmitted ?? data.totalSubmitted ?? 0,
          totalNotSubmitted: s.totalNotSubmitted ?? data.totalNotSubmitted ?? null,
          eligibleRosterCount: s.eligibleRosterCount ?? data.totalEligible ?? null,
          totalAttempts: s.totalAttempts ?? data.totalAttempts ?? 0,
          submissions: data.submissions || [],
          notSubmittedStudents: data.notSubmittedStudents || []
        });
      } else {
        showToast(data.error || 'Could not load assignment submissions.');
      }
    } catch {
      showToast('Network error while loading assignment submissions.');
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsgData.title.trim()) return;

    const subjectCode = newAsgData.subjectCode || '66664';
    const parsedQuestions = newAsgData.questionsText
      .split('\n')
      .map(q => q.trim())
      .filter(Boolean);

    const res = await addAssignment({
      ...newAsgData,
      subjectCode,
      assignedBy: isTeacher ? userProfile.name : newAsgData.assignedBy,
      assignedById: userProfile.id,
      assignedByRole: isTeacher ? 'teacher' : 'class_captain',
      college: isTeacher ? targetCollege : userProfile.college,
      department: isTeacher ? targetDepartment : userProfile.department,
      semester: isTeacher ? targetSemester : userProfile.semester,
      shift: isTeacher ? targetShift : userProfile.shift,
      section: isTeacher ? targetSection : userProfile.section,
      attachmentUrl: attachedFile?.dataUrl,
      attachmentName: attachedFile?.name,
      attachmentType: (
        attachedFile?.name.endsWith('.pdf')
          ? 'PDF'
          : attachedFile?.name.endsWith('.zip')
            ? 'ZIP'
            : attachedFile?.name.endsWith('.docx')
              ? 'DOCX'
              : 'IMAGE'
      ) as any,
      questions: parsedQuestions.length > 0 ? parsedQuestions : activeScanResult?.assignmentData?.questions,
      marks: newAsgData.marks || activeScanResult?.assignmentData?.marks,
      submissionMethod: newAsgData.submissionMethod || activeScanResult?.assignmentData?.submissionMethod,
      extractedText: activeScanResult?.rawExtractedText,
      pageNumbers: activeScanResult?.assignmentData?.pageNumbers || activeScanResult?.pages?.map(p => p.pageNumber),
      scanConfidence: activeScanResult?.confidence,
      uncertainFields: activeScanResult?.uncertainFields
    });

    if (res.success) {
      setNewAsgData({
        title: '',
        subjectCode: '66664',
        subjectName: 'Database Management System',
        assignedBy: isTeacher ? userProfile.name : 'Engr. Mahbubur Rahman',
        dueDate: '2026-11-10',
        description: '',
        marks: '',
        submissionMethod: '',
        questionsText: ''
      });
      setAttachedFile(null);
      setActiveScanResult(null);
      setScanErrorMsg(null);
      setShowAddAssignmentModal(false);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteData.title.trim()) return;

    let detectedType: 'PDF' | 'DOCX' | 'SLIDES' | 'IMAGE' | 'VIDEO' = newNoteData.fileType;
    if (attachedFile) {
      if (attachedFile.type.startsWith('video/')) detectedType = 'VIDEO';
      else if (attachedFile.type.startsWith('image/')) detectedType = 'IMAGE';
      else if (attachedFile.name.endsWith('.pdf')) detectedType = 'PDF';
      else if (attachedFile.name.endsWith('.pptx')) detectedType = 'SLIDES';
      else if (attachedFile.name.endsWith('.docx')) detectedType = 'DOCX';
    }

    const subjectCode = newNoteData.subjectCode || '66662';
    const parsedHeadings = newNoteData.headingsText
      .split('|')
      .map(h => h.trim())
      .filter(Boolean);

    const res = await addNote({
      ...newNoteData,
      subjectCode,
      fileType: detectedType,
      fileSize: attachedFile ? attachedFile.size : newNoteData.fileSize,
      uploadedBy: isTeacher ? `${userProfile.name} (Faculty)` : `${userProfile.name} (CR)`,
      uploadedById: userProfile.id,
      uploadedByRole: isTeacher ? 'teacher' : 'class_captain',
      college: isTeacher ? targetCollege : userProfile.college,
      department: isTeacher ? targetDepartment : userProfile.department,
      semester: isTeacher ? targetSemester : userProfile.semester,
      shift: isTeacher ? targetShift : userProfile.shift,
      section: isTeacher ? targetSection : userProfile.section,
      mediaUrl: attachedFile?.dataUrl,
      mediaName: attachedFile?.name,
      extractedText: newNoteData.extractedText || activeScanResult?.noteData?.extractedText || activeScanResult?.rawExtractedText,
      headings: parsedHeadings.length > 0 ? parsedHeadings : activeScanResult?.noteData?.headings,
      tables: activeScanResult?.noteData?.tables,
      pageCount: activeScanResult?.pageCount,
      pageNumbers: activeScanResult?.noteData?.pageNumbers || activeScanResult?.pages?.map(p => p.pageNumber),
      scanConfidence: activeScanResult?.confidence
    });

    if (res.success) {
      setNewNoteData({
        title: '',
        subjectCode: '66662',
        subjectName: 'Microprocessor & Interfacing',
        chapter: 'Chapter 4',
        fileType: 'PDF',
        fileSize: '3.4 MB',
        summary: '',
        extractedText: '',
        headingsText: ''
      });
      setAttachedFile(null);
      setActiveScanResult(null);
      setScanErrorMsg(null);
      setShowAddNoteModal(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobData.title.trim() || !newJobData.company.trim()) return;

    const res = await addJobCircular({
      ...newJobData,
      description: newJobData.description || newJobData.requirements,
      requirements: newJobData.requirements || newJobData.description,
      mediaUrl: attachedFile?.dataUrl,
      mediaName: attachedFile?.name,
      mediaType: attachedFile?.type.startsWith('image/') ? 'IMAGE' : 'PDF'
    });

    if (res.success) {
      setNewJobData({
        title: '',
        company: '',
        location: 'Dhaka, Bangladesh',
        type: 'Full-Time',
        targetDepartments: [userProfile.department || 'Computer Science & Technology (CST)'],
        publishedAt: new Date().toISOString().slice(0, 10),
        deadline: '2026-11-30',
        stipendOrSalary: 'BDT 20,000 - 25,000 / month',
        experienceRequirements: 'Freshers / 0–1 Year',
        educationalQualifications: '4-Year Diploma in Engineering (BTEB)',
        description: '',
        requirements: '',
        sourceName: 'Careerjet Bangladesh / Employer Career Page',
        sourceUrl: 'https://www.careerjet.com.bd/diploma-engineer-jobs',
        applyUrl: ''
      });
      setAttachedFile(null);
      setShowAddJobModal(false);
      await fetchJobsList(1, false);
    }
  };

  const handleDownloadFile = async (fileName: string, dataUrl?: string) => {
    if (dataUrl) {
      await nativeService.downloadDocument(dataUrl, fileName);
    } else {
      showToast(`Saved ${fileName} to Downloads`);
    }
  };

  const formatDateTimeReadable = (isoStr?: string | null) => {
    if (!isoStr) return 'Never';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold">
                {mainTab === 'notices' && <Megaphone className="w-4 h-4" />}
                {mainTab === 'jobs' && <Briefcase className="w-4 h-4" />}
                {(mainTab === 'assignments' || mainTab === 'notes') && <BookOpen className="w-4 h-4" />}
              </div>
              <h1 className="text-base sm:text-lg font-bold text-[#172554]">
                {mainTab === 'notices' && 'Notices & Official Announcements (নোটিশ বোর্ড)'}
                {mainTab === 'jobs' && 'Diploma Engineering Job Circulars (চাকরির বিজ্ঞপ্তি)'}
                {mainTab === 'assignments' && (isTeacher ? 'Faculty Assignments & Submissions' : 'Assignments & Homework')}
                {mainTab === 'notes' && 'Lecture Notes & Lab Sheets'}
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {mainTab === 'notices' &&
                'Official BTEB Notices (bteb.gov.bd) + Verified Teacher & Class Captain Announcements'}
              {mainTab === 'jobs' &&
                'Diploma Engineer opportunities with verified external application links'}
              {(mainTab === 'assignments' || mainTab === 'notes') &&
                (isTeacher
                  ? `Publish course materials & inspect student submissions (${userProfile.department})`
                  : `Verified BTEB semester resources for Section ${userProfile.section}`)}
            </p>
          </div>

          {/* Context-sensitive Creation Buttons for Authorized Roles */}
          <div className="flex flex-wrap items-center gap-2">
            {canPublishAcademicContent ? (
              <>
                {mainTab === 'notices' && (
                  <button
                    onClick={() => {
                      setEditingCampusNotice(null);
                      setAttachedFile(null);
                      setFileError(null);
                      setNoticeForm({
                        title: '',
                        description: '',
                        targetScope: isVerifiedCaptain ? 'cohort' : 'department',
                        college: userProfile.college,
                        department: userProfile.department,
                        semester: (userProfile.semestersTaught?.[0] as SemesterNumber) || userProfile.semester || 6,
                        shift: isVerifiedCaptain ? userProfile.shift : 'Both',
                        section: isVerifiedCaptain ? userProfile.section : 'All',
                        priority: 'Important',
                        isPinned: false,
                        expiryDate: ''
                      });
                      setShowPublishNoticeModal(true);
                    }}
                    className="bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>Publish Notice (নোটিশ প্রকাশ)</span>
                  </button>
                )}

                {mainTab === 'jobs' && (
                  <>
                    {(isAdmin || isVerifiedTeacher) && (
                      <button
                        onClick={() => setShowBatchImportJobsModal(true)}
                        className="bg-slate-100 hover:bg-slate-200 text-[#172554] text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 border border-slate-200 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                        <span>Batch Import</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setAttachedFile(null);
                        setFileError(null);
                        setShowAddJobModal(true);
                      }}
                      className="bg-[#172554] hover:bg-blue-950 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Post Job Circular</span>
                    </button>
                  </>
                )}

                {(mainTab === 'assignments' || mainTab === 'notes') && (
                  <button
                    onClick={() => {
                      setAttachedFile(null);
                      setFileError(null);
                      setTargetCollege(userProfile.college);
                      setTargetDepartment(userProfile.department);
                      setTargetSemester(
                        (userProfile.semestersTaught?.[0] as SemesterNumber) || userProfile.semester || 6
                      );
                      setTargetShift(userProfile.shift || 'Morning');
                      setTargetSection((userProfile.section as Section) || 'A1');
                      if (mainTab === 'assignments') setShowAddAssignmentModal(true);
                      else setShowAddNoteModal(true);
                    }}
                    className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{mainTab === 'assignments' ? 'Post Assignment' : 'Upload Note / Lab'}</span>
                  </button>
                )}
              </>
            ) : isTeacher ? (
              <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Pending Faculty Verification</span>
              </span>
            ) : (
              <button
                onClick={() => setActiveScreen('captain_verification')}
                className="bg-teal-50 hover:bg-teal-100 text-[#0D9488] border border-teal-200 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                title="Only verified Class Captains or Faculty may publish"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>CR / Teacher Auth Required to Publish</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Main Section Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 border-t border-slate-100 pt-3">
          <button
            onClick={() => setMainTab('notices')}
            className={`py-2 px-2.5 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              mainTab === 'notices'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 shrink-0" />
            <span>Notices ({btebTotalCached + campusNotices.length})</span>
          </button>

          <button
            onClick={() => setMainTab('jobs')}
            className={`py-2 px-2.5 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              mainTab === 'jobs'
                ? 'bg-[#172554] text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5 shrink-0" />
            <span>Job Circulars ({jobsTotal})</span>
          </button>

          <button
            onClick={() => setMainTab('assignments')}
            className={`py-2 px-2.5 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              mainTab === 'assignments'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span>Assignments ({filteredAssignments.length})</span>
          </button>

          <button
            onClick={() => setMainTab('notes')}
            className={`py-2 px-2.5 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              mainTab === 'notes'
                ? 'bg-[#0D9488] text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>Notes & Labs ({filteredNotes.length})</span>
          </button>
        </div>

        {/* Teacher Cohort Filter Strip for Assignments & Notes */}
        {isTeacher && (mainTab === 'assignments' || mainTab === 'notes') && (
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600">Filter Cohort:</span>
              <select
                value={teacherSemesterFilter}
                onChange={e =>
                  setTeacherSemesterFilter(
                    e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-[#172554]"
              >
                <option value="ALL">All Semesters</option>
                {(userProfile.semestersTaught || [1, 2, 3, 4, 5, 6, 7, 8]).map(s => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>

              <select
                value={teacherSectionFilter}
                onChange={e => setTeacherSectionFilter(e.target.value as any)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-[#172554]"
              >
                <option value="ALL">All Sections</option>
                {(['A1', 'A2', 'B1', 'B2'] as Section[]).map(sec => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => refreshAcademicFeed()}
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Counts</span>
            </button>
          </div>
        )}
      </div>

      {/* ==========================================================================
          TAB 0: NOTICES (BTEB OFFICIAL NOTICES + TEACHER / CR CAMPUS NOTICES)
         ========================================================================== */}
      {mainTab === 'notices' && (
        <div className="space-y-4">
          {/* 4 Sub-Tab Filters: All Notices | BTEB Notices | College Notices | My Group Notices */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'All Notices (সব নোটিশ)', count: btebTotalFiltered + campusNotices.length },
                { id: 'bteb', label: 'BTEB Notices (বিটিইবি নোটিশ)', count: btebTotalFiltered },
                {
                  id: 'college',
                  label: 'College Notices (কলেজ নোটিশ)',
                  count: campusNotices.filter(n => n.targetScope === 'college' || n.targetScope === 'department' || n.publisherRole === 'teacher').length
                },
                {
                  id: 'my_group',
                  label: `My Group (${userProfile.shift} · ${userProfile.section})`,
                  count: campusNotices.filter(n => n.targetScope === 'cohort' || n.semester === userProfile.semester).length
                }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setNoticeSubTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    noticeSubTab === tab.id
                      ? 'bg-[#172554] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      noticeSubTab === tab.id ? 'bg-white/20 text-white' : 'bg-white text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search & Category / Date Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
              <div className="sm:col-span-5 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="নোটিশ খুঁজুন (Search by title, exam, or keyword)..."
                  value={noticeSearch}
                  onChange={e => setNoticeSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-[#172554] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                />
              </div>

              {(noticeSubTab === 'all' || noticeSubTab === 'bteb') && (
                <>
                  <div className="sm:col-span-4">
                    <select
                      value={btebCategoryFilter}
                      onChange={e => setBtebCategoryFilter(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-[#172554] font-medium"
                    >
                      <option value="all">All BTEB Curriculums / Categories</option>
                      {BTEB_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3 flex items-center gap-1">
                    <input
                      type="date"
                      value={btebDateFrom}
                      onChange={e => setBtebDateFrom(e.target.value)}
                      title="From Date"
                      className="w-full px-2 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-xl text-[#172554]"
                    />
                    {(noticeSearch || btebCategoryFilter !== 'all' || btebDateFrom || btebDateTo) && (
                      <button
                        type="button"
                        onClick={() => {
                          setNoticeSearch('');
                          setBtebCategoryFilter('all');
                          setBtebDateFrom('');
                          setBtebDateTo('');
                        }}
                        className="px-2 py-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 rounded-xl hover:bg-rose-100 shrink-0 cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* BTEB Live Synchronization Status Bar */}
            {(noticeSubTab === 'all' || noticeSubTab === 'bteb') && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Official BTEB Sync Active ({btebTotalCached} notices · {btebPagesFetched} pages)</span>
                  </span>
                  <span className="text-slate-400">·</span>
                  <span>
                    Last Synced: <strong className="text-slate-700">{formatDateTimeReadable(btebLastSyncedAt)}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSyncingBteb}
                    onClick={() => fetchBtebNotices(1, false, true)}
                    className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-semibold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncingBteb ? 'animate-spin' : ''}`} />
                    <span>{isSyncingBteb ? 'Syncing BTEB...' : 'Sync Now (হালনাগাদ)'}</span>
                  </button>
                  <a
                    href="https://bteb.gov.bd/pages/notices"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1"
                  >
                    <span>bteb.gov.bd</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {btebSyncError && (noticeSubTab === 'all' || noticeSubTab === 'bteb') && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Source Update Warning: </span>
                  <span>{btebSyncError}</span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION A: TEACHER & CLASS CAPTAIN PUBLISHED NOTICES (Shown in 'all', 'college', 'my_group') */}
          {noticeSubTab !== 'bteb' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#0D9488]" />
                  <h2 className="text-xs sm:text-sm font-bold text-[#172554]">
                    {noticeSubTab === 'college'
                      ? 'College & Department Faculty Notices (কলেজ ও বিভাগীয় নোটিশ)'
                      : noticeSubTab === 'my_group'
                        ? `My Class Group Notices (${userProfile.department} · Sem ${userProfile.semester} · Sec ${userProfile.section})`
                        : 'Campus, Teacher & Class Captain (CR) Notices'}
                  </h2>
                </div>
                <span className="text-[11px] text-slate-500">
                  Separate from Official BTEB Board Notices
                </span>
              </div>

              {isLoadingCampusNotices ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                  <span>Loading campus & class notices...</span>
                </div>
              ) : campusNotices.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-xs">
                  <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                  <h3 className="text-xs sm:text-sm font-bold text-[#172554]">
                    No Teacher or Class Captain notices found for this filter
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authorized Teachers and Verified Class Captains can publish notices for their college, department, or class section.
                  </p>
                </div>
              ) : (
                campusNotices.map(cNotice => {
                  const isCrNotice = cNotice.publisherRole === 'class_captain';
                  const isOwnerOrAdmin =
                    cNotice.publisherId === userProfile.id || isAdmin;

                  return (
                    <div
                      key={cNotice.id}
                      className={`bg-white rounded-2xl border p-4 shadow-xs transition-all space-y-2.5 ${
                        cNotice.priority === 'Important'
                          ? 'border-teal-300/90 bg-gradient-to-br from-white to-teal-50/20'
                          : 'border-slate-200/90'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Explicit non-BTEB Role Badge */}
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                                isCrNotice
                                  ? 'bg-teal-50 text-[#0D9488] border-teal-200'
                                  : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}
                            >
                              {isCrNotice ? (
                                <>
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>CR / Group Notice (সিআর নোটিশ)</span>
                                </>
                              ) : (
                                <>
                                  <GraduationCap className="w-3 h-3" />
                                  <span>Faculty / College Notice (শিক্ষক নোটিশ)</span>
                                </>
                              )}
                            </span>

                            {cNotice.priority === 'Important' && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Urgent / জরুরি
                              </span>
                            )}

                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {cNotice.targetScope === 'college'
                                ? 'College-Wide'
                                : cNotice.targetScope === 'department'
                                  ? `${cNotice.department}${cNotice.semester ? ` · Sem ${cNotice.semester}` : ''}`
                                  : `Sem ${cNotice.semester} · ${cNotice.shift} · Sec ${cNotice.section}`}
                            </span>
                          </div>

                          <h3 className="font-bold text-sm sm:text-base text-[#172554]">
                            {cNotice.title}
                          </h3>
                        </div>

                        <span className="text-[11px] text-slate-400 font-medium shrink-0">
                          {formatDateTimeReadable(cNotice.publishedAt)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/90 p-3 rounded-xl border border-slate-100">
                        {cNotice.description}
                      </p>

                      {cNotice.attachmentName && (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-teal-50/70 border border-teal-200/70 text-xs">
                          <div className="flex items-center gap-1.5 text-teal-900 font-medium truncate">
                            <FileText className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                            <span className="truncate">{cNotice.attachmentName}</span>
                          </div>
                          <a
                            href={cNotice.attachmentUrl || `/api/notices/campus/${cNotice.id}/attachment`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-white text-[#0D9488] font-bold text-[11px] border border-teal-200 flex items-center gap-1 shrink-0"
                          >
                            <Download className="w-3 h-3" />
                            <span>Open Attachment</span>
                          </a>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-500">
                        <div>
                          Published by{' '}
                          <strong className="text-slate-700">{cNotice.publisherName}</strong> (
                          {cNotice.publisherDesignation || cNotice.publisherRole}) ·{' '}
                          <span className="text-slate-600">{cNotice.college}</span>
                          {cNotice.expiryDate && (
                            <span className="ml-2 text-amber-700 font-medium">
                              · Valid until {cNotice.expiryDate}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedCampusNotice(cNotice)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Details</span>
                          </button>

                          {isOwnerOrAdmin ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCampusNotice(cNotice);
                                  setNoticeForm({
                                    title: cNotice.title,
                                    description: cNotice.description,
                                    targetScope: cNotice.targetScope,
                                    college: cNotice.college,
                                    department: cNotice.department,
                                    semester: (cNotice.semester || 6) as SemesterNumber,
                                    shift: cNotice.shift || 'Both',
                                    section: cNotice.section || 'All',
                                    priority: cNotice.priority,
                                    isPinned: Boolean(cNotice.isPinned),
                                    expiryDate: cNotice.expiryDate || ''
                                  });
                                  setShowPublishNoticeModal(true);
                                }}
                                className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2563EB] font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCampusNotice(cNotice.id)}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setReportingCampusNotice(cNotice);
                                setReportReason('');
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
                              title="Report inaccurate or inappropriate notice"
                            >
                              <Flag className="w-3 h-3" />
                              <span>Report</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* SECTION B: OFFICIAL BTEB NOTICES (Shown in 'all' and 'bteb') */}
          {(noticeSubTab === 'all' || noticeSubTab === 'bteb') && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#2563EB]" />
                  <h2 className="text-xs sm:text-sm font-bold text-[#172554]">
                    Official BTEB Board Notices (বাংলাদেশ কারিগরি শিক্ষা বোর্ড নোটিশ)
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-[#2563EB]">
                  Showing {btebNotices.length} of {btebTotalFiltered} notices
                </span>
              </div>

              {isLoadingBteb && btebNotices.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#2563EB]" />
                  <span className="font-semibold text-[#172554]">
                    Synchronizing official notices from bteb.gov.bd...
                  </span>
                </div>
              ) : btebNotices.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-[#172554]">
                    No BTEB notices match your current search filter
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Try clearing the search query or selecting "All BTEB Curriculums".
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {btebNotices.map(item => (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs hover:border-blue-300 transition-all space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#2563EB] border border-blue-200">
                            Bangladesh Technical Education Board (BTEB)
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {item.category}
                          </span>
                          {item.isNew && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>NEW (নতুন)</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>প্রকাশিত: {item.publishedDateBn} ({item.publishedDateDisplay})</span>
                        </div>
                      </div>

                      <h3
                        onClick={() => setSelectedBtebNotice(item)}
                        className="font-bold text-sm sm:text-base text-[#172554] hover:text-[#2563EB] cursor-pointer leading-snug"
                      >
                        {item.title}
                      </h3>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                        <span className="text-[11px] text-slate-400 font-mono">
                          ক্রমিক নং: {item.serialBn}
                        </span>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedBtebNotice(item)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>বিস্তারিত (Details)</span>
                          </button>

                          {item.pdfUrl && (
                            <a
                              href={item.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#0D9488] border border-teal-200 font-semibold flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF ডাউনলোড</span>
                            </a>
                          )}

                          <a
                            href={item.noticeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white font-semibold flex items-center gap-1 shadow-xs"
                          >
                            <span>মূল নোটিশ (BTEB)</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}

                  {btebHasMore && (
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        disabled={isLoadingBteb}
                        onClick={() => fetchBtebNotices(btebPage + 1, true, false)}
                        className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#2563EB] border border-blue-200 text-xs font-bold shadow-xs transition-all cursor-pointer inline-flex items-center gap-2"
                      >
                        {isLoadingBteb ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Loading more BTEB notices...</span>
                          </>
                        ) : (
                          <>
                            <span>Load More BTEB Notices (আরও নোটিশ দেখুন)</span>
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==========================================================================
          TAB 1: DIPLOMA ENGINEERING JOB CIRCULARS
         ========================================================================== */}
      {mainTab === 'jobs' && (
        <div className="space-y-4">
          {/* Job Source & Careerjet Integration Transparency Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-[#2563EB] border border-blue-200">
                  Diploma in Engineering Career Portal
                </span>
                {jobSyncInfo && (
                  <span className="text-[11px] text-slate-500">
                    Last Updated: <strong className="text-slate-700">{formatDateTimeReadable(jobSyncInfo.lastUpdatedAt)}</strong>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSyncingJobs}
                  onClick={handleTriggerJobSync}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2563EB] text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingJobs ? 'animate-spin' : ''}`} />
                  <span>{isSyncingJobs ? 'Refreshing...' : 'Refresh Jobs'}</span>
                </button>
                <a
                  href="https://www.careerjet.com.bd/diploma-engineer-jobs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1"
                >
                  <span>Careerjet BD</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Search & Multi-Filter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-4 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by job title, company, or skill..."
                  value={jobSearch}
                  onChange={e => setJobSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-[#172554]"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={jobDeptFilter}
                  onChange={e => setJobDeptFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-[#172554]"
                >
                  <option value="all">All Technologies / Depts</option>
                  {availableJobFilters.departments.map(dept => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <select
                  value={jobLocationFilter}
                  onChange={e => setJobLocationFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-[#172554]"
                >
                  <option value="all">All Locations</option>
                  {availableJobFilters.locations.map(loc => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3 flex gap-1.5">
                <select
                  value={jobTypeFilter}
                  onChange={e => setJobTypeFilter(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-[#172554]"
                >
                  <option value="all">All Job Types</option>
                  <option value="Full-Time">Full-Time</option>
                  <option value="Internship">Internship</option>
                  <option value="Apprenticeship">Apprenticeship</option>
                  <option value="Part-Time">Part-Time</option>
                </select>

                <select
                  value={jobStatusFilter}
                  onChange={e => setJobStatusFilter(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-[#172554]"
                >
                  <option value="all">All Status</option>
                  <option value="Open">Open</option>
                  <option value="Closing Soon">Closing Soon</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-500">
              <span>
                {jobSyncInfo?.sourceStatusMessage ||
                  'Verified Diploma Engineering opportunities from Careerjet BD & Polytechnic Placement Cells.'}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold text-slate-600">Sort by:</span>
                <button
                  type="button"
                  onClick={() => setJobSort('newest')}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                    jobSort === 'newest' ? 'bg-blue-50 text-[#2563EB]' : 'text-slate-500'
                  }`}
                >
                  Newest
                </button>
                <button
                  type="button"
                  onClick={() => setJobSort('deadline')}
                  className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
                    jobSort === 'deadline' ? 'bg-blue-50 text-[#2563EB]' : 'text-slate-500'
                  }`}
                >
                  Deadline
                </button>
              </div>
            </div>
          </div>

          {isLoadingJobs && serverJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#2563EB]" />
              <span>Loading Diploma Engineering job circulars...</span>
            </div>
          ) : serverJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
              <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#172554]">No matching job circulars found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Try clearing your filters or check back later for new Diploma Engineer postings.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {serverJobs.map(job => {
                const statusBadgeStyle =
                  job.status === 'Expired'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : job.status === 'Closing Soon'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                return (
                  <div
                    key={job.id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:border-slate-300 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#2563EB] border border-blue-200">
                            {job.type}
                          </span>
                          {job.status && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadgeStyle}`}>
                              {job.status}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            Source: {job.sourceName || 'Careerjet BD / Placement Cell'}
                          </span>
                        </div>
                        <h3
                          onClick={() => setSelectedJob(job)}
                          className="font-bold text-sm sm:text-base text-[#172554] hover:text-[#2563EB] cursor-pointer mt-1"
                        >
                          {job.title}
                        </h3>
                        <div className="text-xs font-semibold text-slate-700 flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            {job.company}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="inline-flex items-center gap-1 text-slate-600 font-normal">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {job.location}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-[#0D9488] bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 block">
                          {job.stipendOrSalary}
                        </span>
                      </div>
                    </div>

                    {/* Qualifications, Experience & Target Departments */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="font-semibold text-slate-700">Education: </span>
                        <span className="text-slate-600">
                          {job.educationalQualifications || 'Diploma in Engineering (BTEB)'}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-700">Experience: </span>
                        <span className="text-slate-600">
                          {job.experienceRequirements || 'Freshers / 0–2 Years'}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="font-semibold text-slate-700">Technologies / Departments: </span>
                        <span className="text-[#2563EB] font-medium">
                          {job.targetDepartments.join(', ')}
                        </span>
                      </div>
                    </div>

                    {/* Short Description / Requirements */}
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                      {job.description || job.requirements}
                    </p>

                    {/* Footer with Publication Date, Deadline & Honest External Apply Button */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                        <span>
                          Published: <strong className="text-slate-700">{job.publishedAt || job.postedAt}</strong>
                        </span>
                        {job.deadline && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Deadline:{' '}
                              <strong className={job.status === 'Expired' ? 'text-rose-600' : 'text-amber-700'}>
                                {job.deadline}
                              </strong>
                            </span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedJob(job)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Full Details</span>
                        </button>

                        {(job.applyUrl || job.sourceUrl) && (
                          <a
                            href={job.applyUrl || job.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Opens the employer or Careerjet official application page in your browser"
                          >
                            <span>Apply on Original Site</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {jobsHasMore && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    disabled={isLoadingJobs}
                    onClick={() => fetchJobsList(jobsPage + 1, true)}
                    className="px-5 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#172554] border border-slate-200 text-xs font-bold shadow-xs cursor-pointer"
                  >
                    {isLoadingJobs ? 'Loading...' : 'Load More Job Circulars'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==========================================================================
          TAB 2: ASSIGNMENTS (100% PRESERVED)
         ========================================================================== */}
      {mainTab === 'assignments' && (
        <div className="space-y-3">
          {filteredAssignments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
              <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#172554]">No assignments found!</h3>
              <p className="text-xs text-slate-500 mt-1">
                {isTeacher
                  ? 'Click "Post Assignment" above to publish a new assignment for your class.'
                  : 'Enjoy your free time or prepare for upcoming lab work.'}
              </p>
            </div>
          ) : (
            filteredAssignments.map(asg => {
              const isSubmitted = asg.status === 'Submitted';
              const summary = asg.submissionSummary;

              return (
                <div
                  key={asg.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:border-slate-300 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {asg.subjectCode}
                        </span>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">
                          Sem {asg.semester} · {asg.shift} · Sec {asg.section}
                        </span>
                        <h3 className="font-bold text-sm text-[#172554]">{asg.title}</h3>
                      </div>
                      <div className="text-xs font-semibold text-[#2563EB] mt-0.5">
                        {asg.subjectName} · <span className="text-slate-500 font-normal">By {asg.assignedBy}</span>
                      </div>
                    </div>

                    {isTeacher ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 shrink-0">
                        <Users className="w-3 h-3" />
                        <span>
                          {summary
                            ? `${summary.totalSubmitted} / ${summary.eligibleRosterCount ?? '?'} Submitted`
                            : 'Active Assignment'}
                        </span>
                      </span>
                    ) : (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 shrink-0 ${
                          isSubmitted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {isSubmitted ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        <span>{asg.status}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 whitespace-pre-line">
                    {asg.description}
                  </p>

                  {(asg.marks || asg.submissionMethod || (asg.pageNumbers && asg.pageNumbers.length > 0)) && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      {asg.marks && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold">
                          Marks: {asg.marks}
                        </span>
                      )}
                      {asg.submissionMethod && (
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-medium">
                          Submission: {asg.submissionMethod}
                        </span>
                      )}
                      {asg.pageNumbers && asg.pageNumbers.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono">
                          PDF Pages: {asg.pageNumbers.join(', ')}
                        </span>
                      )}
                      {asg.scanConfidence && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold">
                          Scan Confidence: {asg.scanConfidence}
                        </span>
                      )}
                    </div>
                  )}

                  {asg.questions && asg.questions.length > 0 && (
                    <div className="p-2.5 bg-blue-50/40 rounded-xl border border-blue-100/80 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#172554] block">
                        Extracted Questions ({asg.questions.length})
                      </span>
                      <ol className="list-decimal list-inside text-xs text-slate-700 space-y-0.5">
                        {asg.questions.map((q, qIdx) => (
                          <li key={qIdx} className="leading-relaxed">
                            {q.replace(/^\d+[\.\)]\s*/, '')}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {asg.attachmentName && (
                    <div className="flex items-center justify-between p-2 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-[#2563EB]">
                      <div className="flex items-center gap-1.5 truncate">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate font-medium">{asg.attachmentName}</span>
                      </div>
                      <button
                        onClick={() => handleDownloadFile(asg.attachmentName!, asg.attachmentUrl)}
                        className="px-2 py-1 text-[11px] font-bold bg-white text-[#2563EB] rounded hover:bg-blue-100 border border-blue-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                    </div>
                  )}

                  {isTeacher && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="grid grid-cols-3 gap-2 flex-1 text-center sm:text-left">
                        <div className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/80">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                            Total Submitted
                          </span>
                          <span className="text-sm font-bold text-emerald-700 font-mono">
                            {summary ? summary.totalSubmitted : 0}
                          </span>
                        </div>

                        <div className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/80">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                            Not Submitted
                          </span>
                          <span className="text-sm font-bold text-amber-700 font-mono">
                            {summary && summary.totalNotSubmitted !== null
                              ? summary.totalNotSubmitted
                              : '—'}
                          </span>
                        </div>

                        <div className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/80">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Class Roster
                          </span>
                          <span className="text-sm font-bold text-[#172554] font-mono">
                            {summary && summary.eligibleRosterCount !== null
                              ? summary.eligibleRosterCount
                              : '—'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenTeacherSubmissions(asg)}
                        className="px-3.5 py-2 rounded-xl bg-[#172554] hover:bg-blue-950 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-300" />
                        <span>View Submissions</span>
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Due: <span className="font-semibold text-slate-700">{asg.dueDate}</span>
                      </span>
                    </div>

                    {!isTeacher && accountType !== 'system_admin' && (
                      !isSubmitted ? (
                        <button
                          onClick={() => {
                            setSubmittingAssignment(asg);
                            setSubmissionText('');
                            setStudentSubmissionFile(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <Upload className="w-3 h-3" />
                          <span>Submit Work</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-700 font-semibold text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Submitted {asg.submittedAt ? `(${asg.submittedAt})` : ''}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSubmittingAssignment(asg);
                              setSubmissionText(asg.submissionNote || '');
                              setStudentSubmissionFile(null);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold cursor-pointer"
                          >
                            Update
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ==========================================================================
          TAB 3: LECTURE NOTES & LAB SHEETS (100% PRESERVED)
         ========================================================================== */}
      {mainTab === 'notes' && (
        <div className="space-y-3">
          {/* Search bar across Note Title, Subject, Chapter, and Extracted Document Text */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={noteSearchQuery}
                onChange={e => setNoteSearchQuery(e.target.value)}
                placeholder="Search lecture notes, subject code, headings, or extracted PDF/Image text..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-[#172554] focus:outline-none focus:border-[#0D9488]"
              />
            </div>
            {noteSearchQuery && (
              <button
                type="button"
                onClick={() => setNoteSearchQuery('')}
                className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {filteredNotes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#172554]">
                {noteSearchQuery ? 'No matching study materials found' : 'No notes uploaded yet'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {noteSearchQuery
                  ? 'Try searching for a different topic, chapter, Bangla/English keyword, or subject code.'
                  : isTeacher
                    ? 'Click "Upload Note / Lab" above to publish lecture slides, PDFs, or lab sheets for your students.'
                    : 'Teachers and Class Captains can upload chapter PDFs, video links, or slides.'}
              </p>
            </div>
          ) : (
            filteredNotes.map(note => (
              <div
                key={note.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {note.subjectCode}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {note.chapter}
                      </span>
                      {note.semester && (
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          Sem {note.semester}
                          {note.section ? ` · Sec ${note.section}` : ''}
                        </span>
                      )}
                      {note.pageCount && note.pageCount > 0 && (
                        <span className="text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {note.pageCount} {note.pageCount === 1 ? 'Page' : 'Pages'}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm text-[#172554] mt-1">{note.title}</h3>
                    <div className="text-xs font-semibold text-[#0D9488] mt-0.5">{note.subjectName}</div>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    {note.fileType} · {note.fileSize}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  {note.summary}
                </p>

                {note.headings && note.headings.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Topics:</span>
                    {note.headings.slice(0, 5).map((h, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-teal-50/80 text-teal-800 border border-teal-200/60 font-medium"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                )}

                {note.extractedText && (
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-2.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#0D9488] flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Searchable Extracted Text</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedNoteId(expandedNoteId === note.id ? null : note.id)}
                        className="text-[11px] font-semibold text-[#2563EB] hover:underline cursor-pointer"
                      >
                        {expandedNoteId === note.id ? 'Collapse Text' : 'Expand Full Text'}
                      </button>
                    </div>
                    <p
                      className={`text-xs text-slate-700 whitespace-pre-line font-mono leading-relaxed ${
                        expandedNoteId === note.id ? 'max-h-72 overflow-y-auto' : 'line-clamp-3'
                      }`}
                    >
                      {note.extractedText}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                  <span className="text-slate-500 text-[11px]">
                    By <span className="font-medium text-slate-700">{note.uploadedBy}</span> · {note.uploadedDate}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedNote(note)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Preview</span>
                    </button>
                    <button
                      onClick={() =>
                        handleDownloadFile(
                          note.mediaName || `${note.title}.${note.fileType.toLowerCase()}`,
                          note.mediaUrl
                        )
                      }
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 hover:bg-teal-100 text-[#0D9488] border border-teal-200 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ==========================================================================
          MODALS FOR BTEB NOTICES, CAMPUS NOTICES & JOB DETAILS
         ========================================================================== */}

      {/* 1. OFFICIAL BTEB NOTICE DETAILS MODAL */}
      {selectedBtebNotice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#2563EB] border border-blue-200">
                    {selectedBtebNotice.sourceLabel}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                    {selectedBtebNotice.category}
                  </span>
                </div>
                <h3 className="font-bold text-sm sm:text-base text-[#172554] leading-snug">
                  {selectedBtebNotice.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBtebNotice(null)}
                className="text-slate-400 hover:text-slate-600 p-1 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">প্রকাশের তারিখ (Publication Date):</span>
                <span className="font-bold text-[#172554]">
                  {selectedBtebNotice.publishedDateBn} ({selectedBtebNotice.publishedDateDisplay})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">ক্রমিক নং (Serial):</span>
                <span className="font-mono font-bold text-slate-700">{selectedBtebNotice.serialBn}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">শিক্ষাক্রম / বিভাগ (Category):</span>
                <span className="font-semibold text-[#2563EB]">{selectedBtebNotice.category}</span>
              </div>
              <div className="pt-1 border-t border-slate-200/80 text-[11px] text-slate-500">
                Original Source URL:{' '}
                <a
                  href={selectedBtebNotice.noticeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2563EB] underline break-all"
                >
                  {selectedBtebNotice.noticeUrl}
                </a>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedBtebNotice(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              {selectedBtebNotice.pdfUrl && (
                <a
                  href={selectedBtebNotice.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#0D9488] text-white hover:bg-teal-700 flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Open Official PDF (পিডিএফ দেখুন)</span>
                </a>
              )}
              <a
                href={selectedBtebNotice.noticeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#2563EB] text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-xs"
              >
                <span>Open on bteb.gov.bd</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 2. CAMPUS NOTICE DETAILS MODAL */}
      {selectedCampusNotice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-3.5">
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-[#0D9488] border border-teal-200">
                  {selectedCampusNotice.publisherRole === 'class_captain'
                    ? 'Class Captain (CR) Notice — Non-Board'
                    : 'College / Faculty Notice — Non-Board'}
                </span>
                <h3 className="font-bold text-base text-[#172554] mt-1">{selectedCampusNotice.title}</h3>
              </div>
              <button
                onClick={() => setSelectedCampusNotice(null)}
                className="text-slate-400 hover:text-slate-600 p-1 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {selectedCampusNotice.description}
            </div>

            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div>
                <span className="text-slate-500">Published By: </span>
                <strong className="text-[#172554]">{selectedCampusNotice.publisherName}</strong> (
                {selectedCampusNotice.publisherDesignation || selectedCampusNotice.publisherRole})
              </div>
              <div>
                <span className="text-slate-500">Institution: </span>
                <span className="font-medium text-slate-700">{selectedCampusNotice.college}</span>
              </div>
              <div>
                <span className="text-slate-500">Target Scope: </span>
                <span className="font-semibold text-[#2563EB]">
                  {selectedCampusNotice.department}
                  {selectedCampusNotice.semester ? ` · Semester ${selectedCampusNotice.semester}` : ''}
                  {selectedCampusNotice.shift ? ` · ${selectedCampusNotice.shift} Shift` : ''}
                  {selectedCampusNotice.section ? ` · Sec ${selectedCampusNotice.section}` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Published At: </span>
                <span>{formatDateTimeReadable(selectedCampusNotice.publishedAt)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedCampusNotice(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              {selectedCampusNotice.attachmentName && (
                <a
                  href={selectedCampusNotice.attachmentUrl || `/api/notices/campus/${selectedCampusNotice.id}/attachment`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#0D9488] text-white hover:bg-teal-700 flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Open Attachment ({selectedCampusNotice.attachmentName})</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. PUBLISH / EDIT TEACHER OR CR CAMPUS NOTICE MODAL */}
      {showPublishNoticeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 my-8 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-bold text-sm sm:text-base text-[#172554]">
                  {editingCampusNotice ? 'Edit Campus / Group Notice' : 'Publish Teacher / Class Captain Notice'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isVerifiedCaptain
                    ? `Authorized Scope: ${userProfile.department} · Sem ${userProfile.semester} · ${userProfile.shift} · Sec ${userProfile.section}`
                    : `Authorized Faculty Scope: ${userProfile.college}`}
                </p>
              </div>
              <button
                onClick={() => setShowPublishNoticeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePublishOrUpdateCampusNotice} className="space-y-3 text-xs">
              {(isVerifiedTeacher || isAdmin) && (
                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/70 space-y-2.5">
                  <label className="block font-bold text-[#172554]">Target Notice Scope</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'college', label: 'Whole College' },
                      { id: 'department', label: 'Department' },
                      { id: 'cohort', label: 'Specific Section' }
                    ].map(sc => (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => setNoticeForm(prev => ({ ...prev, targetScope: sc.id as CampusNoticeScope }))}
                        className={`py-1.5 px-2 rounded-lg font-semibold border text-center cursor-pointer ${
                          noticeForm.targetScope === sc.id
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {sc.label}
                      </button>
                    ))}
                  </div>

                  {noticeForm.targetScope !== 'college' && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Semester</label>
                        <select
                          value={noticeForm.semester}
                          onChange={e =>
                            setNoticeForm(prev => ({ ...prev, semester: Number(e.target.value) as SemesterNumber }))
                          }
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-[#172554]"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                            <option key={s} value={s}>
                              Semester {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Shift</label>
                        <select
                          value={noticeForm.shift}
                          onChange={e => setNoticeForm(prev => ({ ...prev, shift: e.target.value as any }))}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-[#172554]"
                        >
                          <option value="Both">Both Shifts</option>
                          <option value="Morning">Morning</option>
                          <option value="Day">Day</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">Section</label>
                        <select
                          value={noticeForm.section}
                          onChange={e => setNoticeForm(prev => ({ ...prev, section: e.target.value as any }))}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-[#172554]"
                        >
                          <option value="All">All Sections</option>
                          <option value="A1">Section A1</option>
                          <option value="A2">Section A2</option>
                          <option value="B1">Section B1</option>
                          <option value="B2">Section B2</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#172554] mb-1">Notice Title (নোটিশের শিরোনাম) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab Viva Schedule or Class Test Room Change"
                  value={noticeForm.title}
                  onChange={e => setNoticeForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172554] mb-1">Detailed Notice Description *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Write clear instructions for students..."
                  value={noticeForm.description}
                  onChange={e => setNoticeForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-[#172554] mb-1">Priority</label>
                  <select
                    value={noticeForm.priority}
                    onChange={e =>
                      setNoticeForm(prev => ({ ...prev, priority: e.target.value as 'Important' | 'Normal' }))
                    }
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  >
                    <option value="Important">Urgent / Important</option>
                    <option value="Normal">Regular Notice</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#172554] mb-1">Expiry Date (Optional)</label>
                  <input
                    type="date"
                    value={noticeForm.expiryDate}
                    onChange={e => setNoticeForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-semibold text-[#172554]">
                  Optional Attachment (PDF / Image — Auto-Scans Notice Title & Body)
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={e => handleFileUpload(e, 15, false, 'notice')}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-[#0D9488]"
                />
                {fileError && <p className="text-red-600 text-[11px]">{fileError}</p>}
                {isScanningDoc && (
                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-[11px] text-blue-800 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                    <span>{scanStageText || 'Scanning notice document...'}</span>
                  </div>
                )}
                {attachedFile && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-teal-50/70 border border-teal-200 text-[11px]">
                    <span className="text-teal-800 font-semibold truncate">
                      Attached: {attachedFile.name} ({attachedFile.size})
                    </span>
                    <button
                      type="button"
                      disabled={isScanningDoc}
                      onClick={() => runDocumentScanForAttachedFile('notice', attachedFile)}
                      className="px-2 py-0.5 rounded bg-white text-[#0D9488] border border-teal-200 font-bold cursor-pointer"
                    >
                      Re-Scan
                    </button>
                  </div>
                )}
                {scanErrorMsg && (
                  <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 text-[11px]">
                    {scanErrorMsg}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPublishNoticeModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#0D9488] hover:bg-teal-700 text-white font-semibold shadow-xs cursor-pointer"
                >
                  {editingCampusNotice ? 'Save Changes' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. REPORT CAMPUS NOTICE MODAL */}
      {reportingCampusNotice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-[#172554]">Report Notice for Review</h3>
              <button onClick={() => setReportingCampusNotice(null)} className="text-slate-400 p-1">
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Reporting: <strong className="text-[#172554]">{reportingCampusNotice.title}</strong>
            </p>
            <form onSubmit={handleReportCampusNotice} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#172554] mb-1">Reason for Report *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe why this notice is inaccurate or inappropriate..."
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReportingCampusNotice(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. JOB DETAILS & HONEST EXTERNAL APPLICATION MODAL */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-3.5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {selectedJob.type}
                  </span>
                  {selectedJob.status && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        selectedJob.status === 'Expired'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : selectedJob.status === 'Closing Soon'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {selectedJob.status}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-base text-[#172554] mt-1">{selectedJob.title}</h3>
                <p className="text-xs font-semibold text-slate-600">
                  {selectedJob.company} · {selectedJob.location}
                </p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-slate-400 hover:text-slate-600 p-1 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-700">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[11px]">Salary / Stipend</span>
                  <span className="text-[#0D9488] font-bold">{selectedJob.stipendOrSalary}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Application Deadline</span>
                  <span className="text-rose-600 font-bold">{selectedJob.deadline || 'Refer to circular'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Educational Qualification</span>
                  <span className="font-semibold text-[#172554]">
                    {selectedJob.educationalQualifications || 'Diploma in Engineering (BTEB)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Experience Required</span>
                  <span className="font-semibold text-[#172554]">
                    {selectedJob.experienceRequirements || 'Freshers / 0–2 Years'}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-bold text-[#172554] block mb-1">Relevant Technologies / Departments:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedJob.targetDepartments.map(dept => (
                    <span
                      key={dept}
                      className="px-2 py-0.5 rounded-md bg-blue-50 text-[#2563EB] text-[11px] font-semibold border border-blue-100"
                    >
                      {dept}
                    </span>
                  ))}
                </div>
              </div>

              {selectedJob.description && (
                <div>
                  <span className="font-bold text-[#172554] block mb-1">Job Description:</span>
                  <p className="leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {selectedJob.description}
                  </p>
                </div>
              )}

              <div>
                <span className="font-bold text-[#172554] block mb-1">Technical Requirements:</span>
                <p className="leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {selectedJob.requirements}
                </p>
              </div>

              {/* Honest Application Disclosure */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-[11px] text-slate-700 space-y-1">
                <div className="font-bold text-[#172554] flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>External Employer Application Process</span>
                </div>
                <p>
                  DiplomaMate does not collect CVs, NIDs, or submit applications on your behalf. Clicking{' '}
                  <strong>"Apply Now on Original Site"</strong> opens the verified employer or Careerjet listing page (
                  <span className="font-mono text-[10px] text-[#2563EB]">
                    {selectedJob.applyUrl || selectedJob.sourceUrl}
                  </span>
                  ) where you can complete your official application directly.
                </p>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                <span>Source: {selectedJob.sourceName || 'Careerjet BD / Placement Cell'}</span>
                <span>Published: {selectedJob.publishedAt || selectedJob.postedAt}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              {(selectedJob.applyUrl || selectedJob.sourceUrl) && (
                <a
                  href={selectedJob.applyUrl || selectedJob.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#2563EB] text-white hover:bg-blue-700 flex items-center gap-1.5 shadow-xs"
                >
                  <span>Apply Now on Original Site</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. ADMIN / PLACEMENT CELL BATCH JOB IMPORT MODAL */}
      {showBatchImportJobsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="font-bold text-sm text-[#172554]">
                  Admin / Placement Cell Batch Job Import
                </h3>
                <p className="text-[11px] text-slate-500">
                  Import verified Diploma Engineering job listings (JSON array) with automatic deduplication
                </p>
              </div>
              <button onClick={() => setShowBatchImportJobsModal(false)} className="text-slate-400 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleBatchImportJobs} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#172554] mb-1">
                  Paste JSON Array of Job Circulars *
                </label>
                <textarea
                  rows={6}
                  required
                  placeholder={`[\n  {\n    "title": "Sub-Assistant Engineer (Electrical)",\n    "company": "Walton Hi-Tech PLC",\n    "location": "Gazipur",\n    "type": "Full-Time",\n    "deadline": "2026-12-15",\n    "stipendOrSalary": "BDT 22,000",\n    "requirements": "Diploma in Electrical Technology",\n    "applyUrl": "https://waltonbd.com/career"\n  }\n]`}
                  value={batchJobsJsonText}
                  onChange={e => setBatchJobsJsonText(e.target.value)}
                  className="w-full px-3 py-2 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowBatchImportJobsModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#172554] text-white font-semibold"
                >
                  Import & Deduplicate Jobs
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW NOTE MODAL */}
      {selectedNote && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-bold text-sm text-[#172554]">{selectedNote.title}</h3>
                <p className="text-xs text-[#0D9488]">
                  {selectedNote.subjectName} · {selectedNote.chapter}
                </p>
              </div>
              <button
                onClick={() => setSelectedNote(null)}
                className="text-slate-400 hover:text-slate-600 p-1 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <p>
                <span className="font-semibold">Summary:</span> {selectedNote.summary}
              </p>
              {selectedNote.headings && selectedNote.headings.length > 0 && (
                <div>
                  <span className="font-semibold block mb-1">Extracted Headings / Topics:</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedNote.headings.map((h, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-medium"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedNote.extractedText && (
                <div className="pt-2 border-t border-slate-200/80">
                  <span className="font-semibold block mb-1 text-[#0D9488]">
                    Extracted Document Content {selectedNote.pageCount ? `(${selectedNote.pageCount} pages)` : ''}:
                  </span>
                  <div className="max-h-48 overflow-y-auto p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-[11px] whitespace-pre-line text-slate-700">
                    {selectedNote.extractedText}
                  </div>
                </div>
              )}
              <div className="text-[11px] text-slate-500">
                Uploaded by {selectedNote.uploadedBy} on {selectedNote.uploadedDate} ({selectedNote.fileType},{' '}
                {selectedNote.fileSize})
              </div>
            </div>

            {selectedNote.mediaUrl?.startsWith('data:image') && (
              <img
                src={selectedNote.mediaUrl}
                alt="Note Attachment"
                className="max-h-60 mx-auto rounded-lg border border-slate-200"
              />
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedNote(null)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                onClick={() =>
                  handleDownloadFile(
                    selectedNote.mediaName || `${selectedNote.title}.pdf`,
                    selectedNote.mediaUrl
                  )
                }
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#0D9488] text-white hover:bg-teal-700 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Offline</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT SUBMIT ASSIGNMENT MODAL */}
      {submittingAssignment && !isTeacher && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="font-bold text-sm text-[#172554]">
                  Submit Assignment: {submittingAssignment.title}
                </h3>
                <p className="text-xs text-slate-500">Subject: {submittingAssignment.subjectName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSubmittingAssignment(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignmentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#172554] mb-1">
                  Submission Notes / Google Drive or GitHub Link *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Paste your submission link or solution notes here..."
                  value={submissionText}
                  onChange={e => setSubmissionText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172554] mb-1">
                  Attach Solution File (PDF, Image, DOCX, or ZIP - Optional)
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*,.docx,.zip"
                  onChange={e => handleFileUpload(e, 20, true)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#2563EB]"
                />
                {studentSubmissionFile && (
                  <p className="text-teal-700 text-[11px] mt-1 font-semibold">
                    Attached: {studentSubmissionFile.name} ({studentSubmissionFile.size})
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSubmittingAssignment(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWork}
                  className="flex-1 py-2 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
                >
                  {isSubmittingWork ? 'Submitting...' : 'Confirm Submission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEACHER SUBMISSIONS INSPECTOR MODAL */}
      {inspectingAssignment && isTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 my-8 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {inspectingAssignment.subjectCode}
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    Sem {inspectingAssignment.semester} · {inspectingAssignment.shift} · Sec{' '}
                    {inspectingAssignment.section}
                  </span>
                </div>
                <h3 className="font-bold text-sm sm:text-base text-[#172554] mt-1">
                  {inspectingAssignment.title} — Student Submissions
                </h3>
                <p className="text-xs text-slate-500">
                  Due Date: {inspectingAssignment.dueDate} · Deduplicated by unique student record
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingAssignment(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isLoadingSubmissions ? (
              <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Loading verified student submissions...</span>
              </div>
            ) : !submissionsDetail ? (
              <div className="p-6 text-center text-xs text-rose-600">
                Could not retrieve submission details for this assignment.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                      Total Submitted
                    </span>
                    <span className="text-lg font-bold text-emerald-800 font-mono">
                      {submissionsDetail.totalSubmitted}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                      Total Not Submitted
                    </span>
                    <span className="text-lg font-bold text-amber-800 font-mono">
                      {submissionsDetail.totalNotSubmitted !== null
                        ? submissionsDetail.totalNotSubmitted
                        : '—'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                      Eligible Roster
                    </span>
                    <span className="text-lg font-bold text-blue-800 font-mono">
                      {submissionsDetail.eligibleRosterCount !== null
                        ? submissionsDetail.eligibleRosterCount
                        : '—'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Total Uploads
                    </span>
                    <span className="text-lg font-bold text-[#172554] font-mono">
                      {submissionsDetail.totalAttempts}
                    </span>
                  </div>
                </div>

                <div className="flex rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setInspectorTab('submitted')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      inspectorTab === 'submitted'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Submitted Students ({submissionsDetail.submissions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectorTab('not_submitted')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      inspectorTab === 'not_submitted'
                        ? 'bg-white text-amber-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Not Submitted ({submissionsDetail.notSubmittedStudents.length})
                  </button>
                </div>

                {inspectorTab === 'submitted' ? (
                  submissionsDetail.submissions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 border border-slate-200 rounded-xl">
                      No students have submitted this assignment yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto">
                      {submissionsDetail.submissions.map(sub => (
                        <div
                          key={sub.id}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="font-bold text-[#172554]">{sub.studentName}</span>
                              <span className="text-slate-500 font-mono ml-2">
                                Class Roll #{sub.classRoll} · Board Roll {sub.boardRoll}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {sub.attemptCount > 1 && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                                  Attempt #{sub.attemptCount}
                                </span>
                              )}
                              <span className="text-[11px] text-emerald-700 font-semibold">
                                {sub.submittedAt}
                              </span>
                            </div>
                          </div>

                          <p className="text-slate-700 bg-white p-2 rounded-lg border border-slate-200/80">
                            {sub.submissionNote}
                          </p>

                          {sub.attachmentName && (
                            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 border border-blue-200/70">
                              <span className="font-semibold text-blue-800 truncate">
                                Attachment: {sub.attachmentName}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadFile(sub.attachmentName!, sub.attachmentUrl)
                                }
                                className="px-2.5 py-1 rounded bg-white text-blue-700 font-bold text-[11px] border border-blue-200 flex items-center gap-1 cursor-pointer"
                              >
                                <Download className="w-3 h-3" />
                                <span>Download</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                ) : submissionsDetail.notSubmittedStudents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-emerald-700 font-semibold border border-emerald-200 bg-emerald-50/50 rounded-xl">
                    All eligible students in this class roster have submitted their work!
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                        <tr>
                          <th className="py-2 px-3">Class Roll</th>
                          <th className="py-2 px-3">Student Name</th>
                          <th className="py-2 px-3 font-mono">Board Roll</th>
                          <th className="py-2 px-3 font-mono">Reg Number</th>
                          <th className="py-2 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {submissionsDetail.notSubmittedStudents.map(st => (
                          <tr key={st.boardRoll}>
                            <td className="py-2 px-3 font-mono font-bold text-slate-700">
                              {st.classRoll}
                            </td>
                            <td className="py-2 px-3 font-semibold text-[#172554]">{st.studentName}</td>
                            <td className="py-2 px-3 font-mono text-blue-700">{st.boardRoll}</td>
                            <td className="py-2 px-3 font-mono text-slate-500">{st.regNumber}</td>
                            <td className="py-2 px-3 text-right">
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                                Pending
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectingAssignment(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POST ASSIGNMENT MODAL */}
      {showAddAssignmentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 my-8 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-[#172554]">
                Post New Assignment ({isTeacher ? 'Verified Faculty' : 'Class Captain'})
              </h3>
              <button onClick={() => setShowAddAssignmentModal(false)} className="text-slate-400 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-3 text-xs">
              {isTeacher && (
                <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/70 space-y-2.5">
                  <span className="font-bold text-[#172554] block">
                    Target Class Cohort (Authorized Scope)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <SearchableCollegeSelect
                      value={targetCollege}
                      onChange={name => setTargetCollege(name)}
                      label="Polytechnic"
                    />
                    <SearchableDepartmentSelect
                      value={targetDepartment}
                      onChange={name => setTargetDepartment(name)}
                      label="Department"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Semester</label>
                      <select
                        value={targetSemester}
                        onChange={e => setTargetSemester(Number(e.target.value) as SemesterNumber)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-[#172554]"
                      >
                        {(userProfile.semestersTaught || [1, 2, 3, 4, 5, 6, 7, 8]).map(s => (
                          <option key={s} value={s}>
                            {s}th Semester
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Shift</label>
                      <select
                        value={targetShift}
                        onChange={e => setTargetShift(e.target.value as Shift)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-[#172554]"
                      >
                        <option value="Morning">Morning</option>
                        <option value="Day">Day</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Section</label>
                      <select
                        value={targetSection}
                        onChange={e => setTargetSection(e.target.value as Section)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-[#172554]"
                      >
                        {(['A1', 'A2', 'B1', 'B2'] as Section[]).map(sec => (
                          <option key={sec} value={sec}>
                            Section {sec}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#172554] mb-1">Assignment Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab Report 3: SQL Triggers & Normalization"
                  value={newAsgData.title}
                  onChange={e => setNewAsgData({ ...newAsgData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>

              <CatalogSubjectSelect
                technology={isTeacher ? targetDepartment : userProfile.department}
                regulation={targetRegulation}
                onRegulationChange={reg => setTargetRegulation(reg)}
                semester={isTeacher ? targetSemester : userProfile.semester}
                selectedCode={newAsgData.subjectCode}
                selectedName={newAsgData.subjectName}
                onSelect={sel => {
                  if (sel) {
                    setNewAsgData(prev => ({
                      ...prev,
                      subjectCode: sel.code,
                      subjectName: sel.name
                    }));
                  } else {
                    setNewAsgData(prev => ({
                      ...prev,
                      subjectCode: '',
                      subjectName: ''
                    }));
                  }
                }}
                label="Assignment Subject (Code & Name)"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-[#172554] mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={newAsgData.dueDate}
                    onChange={e => setNewAsgData({ ...newAsgData, dueDate: e.target.value })}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172554] mb-1">Assigned By Teacher</label>
                  <input
                    type="text"
                    value={isTeacher ? userProfile.name : newAsgData.assignedBy}
                    readOnly={isTeacher}
                    onChange={e => setNewAsgData({ ...newAsgData, assignedBy: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-[#172554] mb-1">Total Marks (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 20 Marks"
                    value={newAsgData.marks}
                    onChange={e => setNewAsgData({ ...newAsgData, marks: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172554] mb-1">Submission Method (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Lab File / Online PDF Upload"
                    value={newAsgData.submissionMethod}
                    onChange={e => setNewAsgData({ ...newAsgData, submissionMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#172554] mb-1">
                  Description & Instructions *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Explain instructions and format requirements..."
                  value={newAsgData.description}
                  onChange={e => setNewAsgData({ ...newAsgData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172554] mb-1">
                  Extracted / Numbered Questions (One per line — Editable)
                </label>
                <textarea
                  rows={3}
                  placeholder="Upload an assignment sheet below to auto-extract questions, or type questions (one per line)..."
                  value={newAsgData.questionsText}
                  onChange={e => setNewAsgData({ ...newAsgData, questionsText: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554] font-mono text-[11px]"
                />
              </div>

              <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#172554] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Upload Assignment Sheet (Auto-Scans Image or PDF)</span>
                  </label>
                  <div className="flex items-center gap-1 text-[10px] text-slate-600">
                    <span>PDF Pages:</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="From"
                      value={pdfPageStart}
                      onChange={e => setPdfPageStart(e.target.value)}
                      className="w-12 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-center"
                    />
                    <span>-</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="To"
                      value={pdfPageEnd}
                      onChange={e => setPdfPageEnd(e.target.value)}
                      className="w-12 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-center"
                    />
                  </div>
                </div>

                <input
                  type="file"
                  accept=".pdf,image/*,.docx,.zip"
                  onChange={e => handleFileUpload(e, 25, false, 'assignment')}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-[#2563EB]"
                />
                {fileError && <p className="text-red-600 text-[11px]">{fileError}</p>}

                {isScanningDoc && (
                  <div className="p-2 rounded-lg bg-white border border-blue-200 text-xs text-blue-800 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2563EB] shrink-0" />
                    <span>{scanStageText || 'Scanning assignment sheet...'}</span>
                  </div>
                )}

                {attachedFile && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-teal-200 text-[11px]">
                    <span className="text-teal-800 font-semibold truncate">
                      Original Preserved: {attachedFile.name} ({attachedFile.size})
                    </span>
                    <button
                      type="button"
                      disabled={isScanningDoc}
                      onClick={() => runDocumentScanForAttachedFile('assignment', attachedFile)}
                      className="px-2 py-0.5 rounded bg-blue-50 text-[#2563EB] border border-blue-200 font-bold cursor-pointer"
                    >
                      Retry Scan
                    </button>
                  </div>
                )}

                {activeScanResult && activeScanResult.feature === 'assignment' && (
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#172554]">
                        Extraction Confidence: {activeScanResult.confidence}
                      </span>
                      <span className="font-mono text-slate-500">
                        {activeScanResult.pageCount} {activeScanResult.pageCount === 1 ? 'page' : 'pages'}
                      </span>
                    </div>
                    {activeScanResult.uncertainFields.length > 0 && (
                      <p className="text-amber-700">
                        Review recommended for: {activeScanResult.uncertainFields.join(', ')}
                      </p>
                    )}
                    {activeScanResult.warnings.map((w, idx) => (
                      <p key={idx} className="text-slate-600">
                        • {w}
                      </p>
                    ))}
                  </div>
                )}

                {scanErrorMsg && (
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                    {scanErrorMsg}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAssignmentModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#2563EB] text-white font-semibold shadow-xs"
                >
                  Publish Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD NOTE MODAL */}
      {showAddNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 my-8 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-[#172554]">
                Upload Lecture Note or Lab Sheet ({isTeacher ? 'Verified Faculty' : 'Class Captain'})
              </h3>
              <button onClick={() => setShowAddNoteModal(false)} className="text-slate-400 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="space-y-3 text-xs">
              {isTeacher && (
                <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-200/70 space-y-2.5">
                  <span className="font-bold text-[#172554] block">
                    Target Class Cohort (Authorized Scope)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Semester</label>
                      <select
                        value={targetSemester}
                        onChange={e => setTargetSemester(Number(e.target.value) as SemesterNumber)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-[#172554]"
                      >
                        {(userProfile.semestersTaught || [1, 2, 3, 4, 5, 6, 7, 8]).map(s => (
                          <option key={s} value={s}>
                            {s}th Semester
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Shift</label>
                      <select
                        value={targetShift}
                        onChange={e => setTargetShift(e.target.value as Shift)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-[#172554]"
                      >
                        <option value="Morning">Morning</option>
                        <option value="Day">Day</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-600 mb-1">Section</label>
                      <select
                        value={targetSection}
                        onChange={e => setTargetSection(e.target.value as Section)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-[#172554]"
                      >
                        {(['A1', 'A2', 'B1', 'B2'] as Section[]).map(sec => (
                          <option key={sec} value={sec}>
                            Section {sec}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-[#172554] mb-1">Resource Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4: Microprocessor Pin Diagrams & Architecture"
                  value={newNoteData.title}
                  onChange={e => setNewNoteData({ ...newNoteData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>

              <CatalogSubjectSelect
                technology={isTeacher ? targetDepartment : userProfile.department}
                regulation={targetRegulation}
                onRegulationChange={reg => setTargetRegulation(reg)}
                semester={isTeacher ? targetSemester : userProfile.semester}
                selectedCode={newNoteData.subjectCode}
                selectedName={newNoteData.subjectName}
                onSelect={sel => {
                  if (sel) {
                    setNewNoteData(prev => ({
                      ...prev,
                      subjectCode: sel.code,
                      subjectName: sel.name
                    }));
                  } else {
                    setNewNoteData(prev => ({
                      ...prev,
                      subjectCode: '',
                      subjectName: ''
                    }));
                  }
                }}
                label="Lecture / Lab Subject (Code & Name)"
                required
              />

              <div>
                <label className="block font-semibold text-[#172554] mb-1">Chapter / Unit</label>
                <input
                  type="text"
                  required
                  placeholder="Chapter 4"
                  value={newNoteData.chapter}
                  onChange={e => setNewNoteData({ ...newNoteData, chapter: e.target.value })}
                  className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172554] mb-1">Summary / Key Topics *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Brief summary of what this note or lab sheet covers..."
                  value={newNoteData.summary}
                  onChange={e => setNewNoteData({ ...newNoteData, summary: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172554] mb-1">
                  Extracted Section Headings (Pipe "|" separated — Editable)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1. Architecture | 2. Pin Diagram | 3. Addressing Modes"
                  value={newNoteData.headingsText}
                  onChange={e => setNewNoteData({ ...newNoteData, headingsText: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172554] mb-1">
                  Extracted Searchable Text (Auto-populated from PDF / Image / Video Keyframes)
                </label>
                <textarea
                  rows={3}
                  placeholder="Upload a PDF, image, or lecture video below to extract searchable study text..."
                  value={newNoteData.extractedText}
                  onChange={e => setNewNoteData({ ...newNoteData, extractedText: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554] font-mono text-[11px]"
                />
              </div>

              <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#172554] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#0D9488]" />
                    <span>File (PDF, Image, Slides, or Video — Auto-Extracts Text) *</span>
                  </label>
                  <div className="flex items-center gap-1 text-[10px] text-slate-600">
                    <span>PDF Pages:</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="From"
                      value={pdfPageStart}
                      onChange={e => setPdfPageStart(e.target.value)}
                      className="w-12 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-center"
                    />
                    <span>-</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="To"
                      value={pdfPageEnd}
                      onChange={e => setPdfPageEnd(e.target.value)}
                      className="w-12 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-center"
                    />
                  </div>
                </div>

                <input
                  type="file"
                  accept=".pdf,image/*,.docx,.pptx,video/*"
                  onChange={e => handleFileUpload(e, 50, false, 'note')}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-100 file:text-[#0D9488]"
                />
                {fileError && <p className="text-red-600 text-[11px]">{fileError}</p>}

                {isScanningDoc && (
                  <div className="p-2 rounded-lg bg-white border border-teal-200 text-xs text-teal-800 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0D9488] shrink-0" />
                    <span>{scanStageText || 'Processing study material...'}</span>
                  </div>
                )}

                {attachedFile && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-teal-200 text-[11px]">
                    <span className="text-teal-800 font-semibold truncate">
                      Original Preserved: {attachedFile.name} ({attachedFile.size})
                    </span>
                    <button
                      type="button"
                      disabled={isScanningDoc}
                      onClick={() => runDocumentScanForAttachedFile('note', attachedFile)}
                      className="px-2 py-0.5 rounded bg-teal-50 text-[#0D9488] border border-teal-200 font-bold cursor-pointer"
                    >
                      Retry Scan
                    </button>
                  </div>
                )}

                {activeScanResult && activeScanResult.feature === 'note' && (
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#172554]">
                        Extraction Confidence: {activeScanResult.confidence}
                      </span>
                      <span className="font-mono text-slate-500">
                        {activeScanResult.pageCount} {activeScanResult.pageCount === 1 ? 'page/frame' : 'pages/frames'}
                      </span>
                    </div>
                    {activeScanResult.videoData && (
                      <p className="text-blue-700 font-medium">
                        {activeScanResult.videoData.capabilityNotice}
                      </p>
                    )}
                    {activeScanResult.warnings.map((w, idx) => (
                      <p key={idx} className="text-slate-600">
                        • {w}
                      </p>
                    ))}
                  </div>
                )}

                {scanErrorMsg && (
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                    {scanErrorMsg}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#0D9488] text-white font-semibold shadow-xs"
                >
                  Upload Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POST JOB CIRCULAR MODAL */}
      {showAddJobModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-3 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-[#172554]">Post Diploma Job Circular / Internship</h3>
              <button onClick={() => setShowAddJobModal(false)} className="text-slate-400 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#172554] mb-1">Job / Internship Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sub-Assistant Engineer (Network & Fiber Operations)"
                  value={newJobData.title}
                  onChange={e => setNewJobData({ ...newJobData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-[#172554] mb-1">Company / Employer *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Summit Communications Ltd."
                    value={newJobData.company}
                    onChange={e => setNewJobData({ ...newJobData, company: e.target.value })}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172554] mb-1">Job Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tejgaon, Dhaka"
                    value={newJobData.location}
                    onChange={e => setNewJobData({ ...newJobData, location: e.target.value })}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-[#172554] mb-1">Employment Type</label>
                  <select
                    value={newJobData.type}
                    onChange={e => setNewJobData({ ...newJobData, type: e.target.value as any })}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Internship">Internship</option>
                    <option value="Apprenticeship">Apprenticeship</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#172554] mb-1">Salary / Stipend</label>
                  <input
                    type="text"
                    placeholder="e.g. BDT 22,000 / mo"
                    value={newJobData.stipendOrSalary}
                    onChange={e => setNewJobData({ ...newJobData, stipendOrSalary: e.target.value })}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172554] mb-1">Deadline *</label>
                  <input
                    type="date"
                    required
                    value={newJobData.deadline}
                    onChange={e => setNewJobData({ ...newJobData, deadline: e.target.value })}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-[#172554] mb-1">Educational Qualification</label>
                  <input
                    type="text"
                    value={newJobData.educationalQualifications}
                    onChange={e =>
                      setNewJobData({ ...newJobData, educationalQualifications: e.target.value })
                    }
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172554] mb-1">Experience Requirement</label>
                  <input
                    type="text"
                    value={newJobData.experienceRequirements}
                    onChange={e =>
                      setNewJobData({ ...newJobData, experienceRequirements: e.target.value })
                    }
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#172554] mb-1">
                  Job Description & Technical Requirements *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Describe responsibilities, required skills, and diploma technology eligibility..."
                  value={newJobData.requirements}
                  onChange={e =>
                    setNewJobData({
                      ...newJobData,
                      requirements: e.target.value,
                      description: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172554] mb-1">
                  Original External Application URL (https://...) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://company.com/careers/apply"
                  value={newJobData.applyUrl}
                  onChange={e => setNewJobData({ ...newJobData, applyUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <label className="block font-semibold text-[#172554]">
                  Optional Job Circular PDF / Image (Auto-Scans Title, Employer, Salary & Deadline)
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={e => handleFileUpload(e, 15, false, 'job')}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#2563EB]"
                />
                {isScanningDoc && (
                  <p className="text-[11px] text-blue-700 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>{scanStageText || 'Scanning job circular...'}</span>
                  </p>
                )}
                {attachedFile && (
                  <p className="text-teal-700 text-[11px] font-semibold">
                    Attached: {attachedFile.name} ({attachedFile.size})
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddJobModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#172554] text-white font-semibold shadow-xs"
                >
                  Publish Job Circular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
