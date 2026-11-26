import { apiFetch } from '../../services/apiClient';
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  FileText, 
  Filter, 
  Users, 
  Trash2, 
  Search,
  ExternalLink,
  Ban,
  GraduationCap,
  Key,
  Unlock,
  Lock,
  Phone,
  Mail,
  Building,
  Database,
  Upload,
  FileSpreadsheet,
  RefreshCw,
  Award,
  BookOpen,
  Plus,
  Edit3,
  Send,
  Megaphone,
  Settings,
  BarChart3
} from 'lucide-react';
import {
  CaptainApplication,
  Shift,
  Section,
  TeacherProfile,
  BtebResultBatch,
  ResultImportAuditLog,
  SemesterNumber,
  BtebRegulation,
  BtebExamType,
  SubjectCatalogRecord,
  CatalogImportPreviewSummary,
  CatalogRegulation,
  CatalogVerificationStatus
} from '../../types';
import { TECHNOLOGIES_DIRECTORY } from '../../data/directoryData';
import { AdminManagementScreen } from './AdminManagementScreen';
import { AdminNoticesSection } from '../admin/AdminNoticesSection';
import { AdminNotificationsSection } from '../admin/AdminNotificationsSection';
import { AdminRoutinesSection } from '../admin/AdminRoutinesSection';
import { AdminFlagsSection } from '../admin/AdminFlagsSection';
import { AdminVersionSection } from '../admin/AdminVersionSection';
import { AdminReportsSection } from '../admin/AdminReportsSection';
import { AdminRolesSection } from '../admin/AdminRolesSection';
import { AdminSessionsSection } from '../admin/AdminSessionsSection';
import { AdminTicketsSection } from '../admin/AdminTicketsSection';
import { AdminAnalyticsSection } from '../admin/AdminAnalyticsSection';
import { LiquidFillLoader } from '../LiquidFillLoader';
import { Modal } from '../common/Modal';

export const AdminPortalScreen: React.FC = () => {
  const { 
    applications, 
    teachersList,
    accountType,
    authToken,
    systemAdminProfile,
    isServerVerifiedAdmin,
    isCheckingAdminSession,
    verifyServerAdminSession,
    adminApproveApplication, 
    adminRejectApplication, 
    adminRevokeApplication,
    adminVerifyTeacher,
    adminResetTeacherLockout,
    getVerifiedCaptainsCount,
    setActiveScreen, 
    logout,
    showToast 
  } = useApp();

  const [activePortalTab, setActivePortalTab] = useState<'management' | 'captains' | 'teachers' | 'results' | 'catalog' | 'content' | 'ops' | 'settings'>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/admin/results-import') {
      return 'results';
    }
    return 'management';
  });
  // Sub-sections inside the grouped Content / Operations / Settings tabs.
  const [contentSub, setContentSub] = useState<'notices' | 'notifications' | 'routines'>('notices');
  const [opsSub, setOpsSub] = useState<'reports' | 'roles' | 'sessions' | 'tickets' | 'analytics'>('reports');
  const [settingsSub, setSettingsSub] = useState<'flags' | 'version'>('flags');

  // Pill sub-nav shared by the grouped tabs (Content / Operations / Settings).
  const renderSubNav = (
    items: Array<{ id: string; label: string }>,
    active: string,
    onSelect: (id: string) => void
  ) => (
    <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 mt-3">
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className={`rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
            active === item.id ? 'bg-surface text-text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppForDoc, setSelectedAppForDoc] = useState<CaptainApplication | null>(null);
  
  // Captain Action Modal
  const [actionModal, setActionModal] = useState<{
    app: CaptainApplication;
    action: 'approve' | 'reject' | 'revoke';
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Teacher Action Modal
  const [teacherActionModal, setTeacherActionModal] = useState<{
    teacher: TeacherProfile;
    action: 'approve' | 'reject';
  } | null>(null);
  const [teacherActionNotes, setTeacherActionNotes] = useState('');

  // --- BTEB RESULTS IMPORT MANAGER STATE ---
  const [resultBatches, setResultBatches] = useState<BtebResultBatch[]>([]);
  const [importLogs, setImportLogs] = useState<ResultImportAuditLog[]>([]);
  const [batchSemester, setBatchSemester] = useState<SemesterNumber>(6);
  const [batchRegulation, setBatchRegulation] = useState<BtebRegulation>('2022');
  const [batchExamYear, setBatchExamYear] = useState<number>(2024);
  const [batchExamType, setBatchExamType] = useState<BtebExamType>('Regular');
  const [batchTitle, setBatchTitle] = useState<string>('');
  const [batchPubDate, setBatchPubDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [rawResultText, setRawResultText] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadedFileDataUrl, setUploadedFileDataUrl] = useState<string>('');
  const [uploadedFileMime, setUploadedFileMime] = useState<string>('');
  const [duplicateMode, setDuplicateMode] = useState<'overwrite' | 'skip'>('overwrite');
  const [isParsingPreview, setIsParsingPreview] = useState<boolean>(false);
  const [isPublishingBatch, setIsPublishingBatch] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string>('');
  const [previewResult, setPreviewResult] = useState<{
    summary: {
      totalParsed: number;
      passCount: number;
      referredCount: number;
      withheldCount: number;
      duplicateRollsInPayloadCount: number;
      duplicateRollsInPayload: string[];
      existingConflictsCount: number;
      existingConflicts: string[];
      unrecognizedCount: number;
      unrecognizedSnippets: string[];
      detectedInstitutes: string[];
    };
    sampleRecords: any[];
    extractedTextPreview?: string;
  } | null>(null);
  const [deleteConfirmBatch, setDeleteConfirmBatch] = useState<BtebResultBatch | null>(null);

  // --- SUBJECT CATALOG MANAGER STATE (Restricted to system_admin) ---
  const [catalogRecords, setCatalogRecords] = useState<SubjectCatalogRecord[]>([]);
  const [catalogFilterTech, setCatalogFilterTech] = useState<string>('ALL');
  const [catalogFilterReg, setCatalogFilterReg] = useState<string>('ALL');
  const [catalogFilterSem, setCatalogFilterSem] = useState<string>('ALL');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [catalogJsonInput, setCatalogJsonInput] = useState<string>('');
  const [catalogSourceFileName, setCatalogSourceFileName] = useState<string>('starter-subject-catalog.json');
  const [catalogPreview, setCatalogPreview] = useState<{
    summary: CatalogImportPreviewSummary;
    sampleRecords: SubjectCatalogRecord[];
  } | null>(null);
  const [catalogError, setCatalogError] = useState<string>('');
  const [isPreviewingCatalog, setIsPreviewingCatalog] = useState<boolean>(false);
  const [isImportingCatalog, setIsImportingCatalog] = useState<boolean>(false);
  const [confirmCatalogImportChecked, setConfirmCatalogImportChecked] = useState<boolean>(false);

  // Add/Edit single catalog record state
  const [editingCatalogRecord, setEditingCatalogRecord] = useState<SubjectCatalogRecord | null>(null);
  const [showAddCatalogModal, setShowAddCatalogModal] = useState<boolean>(false);
  const [newCatalogForm, setNewCatalogForm] = useState<{
    technology: string;
    regulation: CatalogRegulation;
    semester: SemesterNumber;
    subject_code: string;
    subject_name: string;
    subject_type: string;
    marks: string;
    credits: string;
    verification_status: CatalogVerificationStatus;
    source_url: string;
    notes: string;
  }>({
    technology: TECHNOLOGIES_DIRECTORY[0].name,
    regulation: '2022',
    semester: 1,
    subject_code: '',
    subject_name: '',
    subject_type: 'Core',
    marks: '',
    credits: '',
    verification_status: 'verified',
    source_url: '',
    notes: ''
  });

  const fetchCatalogRecords = async () => {
    try {
      const res = await apiFetch('/api/catalog/subjects?activeOnly=false');
      const data = await res.json();
      if (res.ok && data.success) {
        setCatalogRecords(data.records || []);
      }
    } catch (err) {
      console.error('Error loading catalog records:', err);
    }
  };

  const handleLoadStarterCatalogJson = async (mode: 'starter' | 'uploaded_10_depts' = 'uploaded_10_depts') => {
    if (!authToken) return;
    setCatalogError('');
    setCatalogPreview(null);
    setConfirmCatalogImportChecked(false);
    try {
      const res = await apiFetch(`/api/admin/catalog/starter-json?mode=${mode}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCatalogJsonInput(JSON.stringify(data.records, null, 2));
        setCatalogSourceFileName(
          mode === 'uploaded_10_depts' ? 'uploaded-10-departments-2022.json' : 'starter-subject-catalog.json'
        );
        showToast(`Loaded ${data.totalCount} catalog records into editor.`);
      } else {
        setCatalogError(data.error || 'Could not load catalog JSON.');
      }
    } catch {
      setCatalogError('Network error loading catalog JSON.');
    }
  };

  const handleCatalogFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCatalogSourceFileName(file.name);
    setCatalogPreview(null);
    setCatalogError('');
    setConfirmCatalogImportChecked(false);
    const reader = new FileReader();
    reader.onload = () => {
      setCatalogJsonInput(String(reader.result || ''));
    };
    reader.readAsText(file);
  };

  const handlePreviewCatalogImport = async () => {
    if (!authToken) return;
    setCatalogError('');
    setCatalogPreview(null);
    setConfirmCatalogImportChecked(false);
    if (!catalogJsonInput.trim()) {
      setCatalogError('Please load the starter JSON, upload a .json file, or paste a JSON array of subject records.');
      return;
    }

    setIsPreviewingCatalog(true);
    try {
      const res = await apiFetch('/api/admin/catalog/preview-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          rawJsonText: catalogJsonInput
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCatalogError(data.error || 'Failed to validate catalog JSON.');
      } else {
        setCatalogPreview({
          summary: data.summary,
          sampleRecords: data.sampleRecords || []
        });
        showToast(`Validated ${data.summary.validRecordsCount} of ${data.summary.totalRecords} catalog records.`);
      }
    } catch {
      setCatalogError('Network error during catalog validation preview.');
    } finally {
      setIsPreviewingCatalog(false);
    }
  };

  const handleConfirmCatalogImport = async () => {
    if (!authToken || !confirmCatalogImportChecked) return;
    setCatalogError('');
    setIsImportingCatalog(true);
    try {
      const res = await apiFetch('/api/admin/catalog/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          rawJsonText: catalogJsonInput,
          sourceFileName: catalogSourceFileName,
          confirmed: true
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCatalogError(data.error || 'Catalog import failed.');
      } else {
        showToast(data.message);
        setCatalogPreview(null);
        setConfirmCatalogImportChecked(false);
        await fetchCatalogRecords();
      }
    } catch {
      setCatalogError('Network error while importing catalog.');
    } finally {
      setIsImportingCatalog(false);
    }
  };

  const handleUpdateCatalogRecord = async (
    recordId: string,
    updates: Partial<SubjectCatalogRecord>
  ) => {
    if (!authToken) return;
    try {
      const res = await apiFetch(`/api/admin/catalog/records/${encodeURIComponent(recordId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Catalog record updated.');
        setEditingCatalogRecord(null);
        await fetchCatalogRecords();
      } else {
        showToast(data.error || 'Could not update catalog record.');
      }
    } catch {
      showToast('Network error updating catalog record.');
    }
  };

  const handleCreateCatalogRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) return;
    try {
      const res = await apiFetch('/api/admin/catalog/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          technology: newCatalogForm.technology,
          regulation: newCatalogForm.regulation,
          semester: newCatalogForm.semester,
          subject_code: newCatalogForm.subject_code.trim(),
          subject_name: newCatalogForm.subject_name.trim(),
          subject_type: newCatalogForm.subject_type.trim() || null,
          marks: newCatalogForm.marks ? Number(newCatalogForm.marks) : null,
          credits: newCatalogForm.credits ? Number(newCatalogForm.credits) : null,
          verification_status: newCatalogForm.verification_status,
          source_url: newCatalogForm.source_url.trim() || null,
          notes: newCatalogForm.notes.trim() || null
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Subject added to central catalog.');
        setShowAddCatalogModal(false);
        setNewCatalogForm({
          ...newCatalogForm,
          subject_code: '',
          subject_name: '',
          notes: ''
        });
        await fetchCatalogRecords();
      } else {
        showToast(data.error || 'Failed to add subject record.');
      }
    } catch {
      showToast('Network error creating catalog record.');
    }
  };

  const fetchResultBatches = async () => {
    if (!authToken || !isServerVerifiedAdmin) return;
    try {
      const res = await apiFetch('/api/admin/results/import-history', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResultBatches(data.batches || []);
        setImportLogs(data.importLogs || []);
      }
    } catch (err) {
      console.error('Error loading result batches:', err);
    }
  };

  useEffect(() => {
    verifyServerAdminSession();
  }, []);

  useEffect(() => {
    if (isServerVerifiedAdmin && authToken) {
      fetchResultBatches();
      fetchCatalogRecords();
    }
  }, [isServerVerifiedAdmin, authToken]);

  const handleResultFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    setUploadedFileMime(file.type || 'text/plain');
    setPreviewResult(null);
    setPreviewError('');

    // If text, CSV, or JSON, read directly as UTF-8 text
    if (
      file.name.endsWith('.txt') ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.json') ||
      file.type.startsWith('text/') ||
      file.type === 'application/json'
    ) {
      const reader = new FileReader();
      reader.onload = () => {
        setRawResultText(String(reader.result || ''));
        setUploadedFileDataUrl('');
      };
      reader.readAsText(file);
    } else {
      // PDF or image document
      const reader = new FileReader();
      reader.onload = () => {
        setUploadedFileDataUrl(String(reader.result || ''));
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePreviewParse = async () => {
    setPreviewError('');
    setPreviewResult(null);
    if (!rawResultText.trim() && !uploadedFileDataUrl) {
      setPreviewError('Please paste official BTEB result text or upload a result file (.pdf, .txt, .csv, .json).');
      return;
    }

    setIsParsingPreview(true);
    try {
      const res = await apiFetch('/api/admin/results/preview-parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          semester: batchSemester,
          regulation: batchRegulation,
          examYear: batchExamYear,
          examType: batchExamType,
          rawText: rawResultText,
          fileDataUrl: uploadedFileDataUrl || undefined,
          mimeType: uploadedFileMime || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPreviewError(data.error || 'Failed to parse result dataset.');
      } else {
        setPreviewResult(data);
        if (data.extractedTextPreview && !rawResultText.trim()) {
          setRawResultText(data.extractedTextPreview);
        }
        showToast(`Parsed ${data.summary.totalParsed} valid BTEB roll records!`);
      }
    } catch {
      setPreviewError('Network error during result validation preview.');
    } finally {
      setIsParsingPreview(false);
    }
  };

  const handlePublishBatch = async () => {
    setPreviewError('');
    setIsPublishingBatch(true);
    try {
      const res = await apiFetch('/api/admin/results/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          title: batchTitle.trim() || undefined,
          semester: batchSemester,
          regulation: batchRegulation,
          examYear: batchExamYear,
          examType: batchExamType,
          publishedDate: batchPubDate,
          sourceFileName: uploadedFileName || `BTEB_Sem${batchSemester}_${batchExamYear}_Official.txt`,
          duplicateMode,
          rawText: rawResultText,
          fileDataUrl: uploadedFileDataUrl || undefined,
          mimeType: uploadedFileMime || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPreviewError(data.error || 'Failed to publish BTEB result batch.');
      } else {
        showToast(data.message);
        setPreviewResult(null);
        setRawResultText('');
        setUploadedFileName('');
        setUploadedFileDataUrl('');
        await fetchResultBatches();
      }
    } catch {
      setPreviewError('Network error while publishing result batch.');
    } finally {
      setIsPublishingBatch(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    try {
      const res = await apiFetch(`/api/admin/results/batches/${encodeURIComponent(batchId)}`, {
        method: 'DELETE',
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message);
        setDeleteConfirmBatch(null);
        await fetchResultBatches();
      } else {
        showToast(data.error || 'Could not delete batch.');
      }
    } catch {
      showToast('Error deleting batch.');
    }
  };

  // Filtered applications
  const filteredApps = applications.filter(app => {
    const matchesFilter = statusFilter === 'All' || app.status === statusFilter;
    const matchesSearch = 
      app.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.boardRoll.includes(searchQuery) ||
      app.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.college.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Filtered teachers
  const filteredTeachers = teachersList.filter(t => {
    const matchesFilter = statusFilter === 'All' || t.verificationStatus === statusFilter;
    const matchesSearch = 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.phone.includes(searchQuery) ||
      t.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.college.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleActionConfirm = async () => {
    if (!actionModal) return;
    setIsProcessing(true);
    try {
      if (actionModal.action === 'approve') {
        const result = await adminApproveApplication(actionModal.app.id, actionReason || 'Approved by Academic Admin');
        if (!result.success) {
          showToast(result.message);
        }
      } else if (actionModal.action === 'reject') {
        if (!actionReason.trim()) {
          showToast('Please provide a rejection reason');
          return;
        }
        await adminRejectApplication(actionModal.app.id, actionReason);
      } else if (actionModal.action === 'revoke') {
        if (!actionReason.trim()) {
          showToast('Please provide a reason for revoking approval');
          return;
        }
        await adminRevokeApplication(actionModal.app.id, actionReason);
      }
      setActionModal(null);
      setActionReason('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTeacherActionConfirm = async () => {
    if (!teacherActionModal) return;
    setIsProcessing(true);
    try {
      const statusToSet = teacherActionModal.action === 'approve' ? 'Verified' : 'Rejected';
      await adminVerifyTeacher(teacherActionModal.teacher.id, statusToSet, teacherActionNotes);
      setTeacherActionModal(null);
      setTeacherActionNotes('');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetLockout = async (teacherId: string) => {
    await adminResetTeacherLockout(teacherId);
  };

  if (isCheckingAdminSession) {
    return (
      <div className="bg-surface rounded-2xl border border-slate-200 p-8 text-center shadow-xs space-y-2">
        <LiquidFillLoader size={44} label="Verifying System Administrator session with server..." />
      </div>
    );
  }

  // STRICT SERVER-CONFIRMED SYSTEM_ADMIN GUARD:
  // Student, Class Captain, and Teacher accounts are strictly blocked from viewing or using Admin Portal / Result Import
  if (accountType !== 'system_admin' || !isServerVerifiedAdmin) {
    return (
      <div className="bg-surface rounded-2xl border border-rose-200 p-6 sm:p-8 text-center shadow-sm space-y-4 my-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
          <Lock aria-hidden="true" className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-md border border-rose-200">
            HTTP 403 Forbidden · Restricted Route
          </span>
          <h2 className="text-base sm:text-lg font-bold text-text-primary">
            System Administrator Authorization Required
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your current account role (<strong className="font-mono">{accountType}</strong>) does not have permission to access the Administrator Portal or BTEB Result Import Manager. Only server-verified <strong>system_admin</strong> accounts can access this page.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => setActiveScreen('home')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
          >
            Return to My Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveScreen('admin_login')}
            className="px-4 py-2.5 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            System Administrator Sign In →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header Card */}
      <div className="dm-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveScreen('home')}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
              aria-label="Back"
              title="Back"
            >
              <ArrowLeft aria-hidden="true" className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <ShieldCheck aria-hidden="true" className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
                <h1 className="text-base sm:text-lg font-bold leading-tight text-text-primary">
                  Administrator Verification Portal
                </h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-50 text-brand-teal border border-teal-200">
                  system_admin
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Signed in as <strong>{systemAdminProfile?.email || 'System Administrator'}</strong> · Server-Verified Session
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="self-start sm:self-center px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
          >
            Sign Out Admin
          </button>
        </div>

        {/* Tab switch: Management / Captains / Faculty / BTEB Results / Catalog / Content / Operations / Settings */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 mt-3">
          <button
            type="button"
            onClick={() => setActivePortalTab('management')}
            className={`min-h-11 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activePortalTab === 'management'
                ? 'bg-surface text-teal-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Management</span>
          </button>
          <button
            type="button"
            onClick={() => setActivePortalTab('captains')}
            className={`min-h-11 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activePortalTab === 'captains'
                ? 'bg-surface text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Captains ({applications.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab('teachers')}
            className={`min-h-11 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activePortalTab === 'teachers'
                ? 'bg-surface text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Faculty ({teachersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab('results')}
            className={`min-h-11 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activePortalTab === 'results'
                ? 'bg-surface text-brand-teal shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>BTEB Results ({resultBatches.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab('catalog')}
            className={`min-h-11 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activePortalTab === 'catalog'
                ? 'bg-surface text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Subject Catalog ({catalogRecords.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab('content')}
            className={`min-h-11 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activePortalTab === 'content'
                ? 'bg-surface text-violet-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Megaphone aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Content</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab('ops')}
            className={`min-h-11 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activePortalTab === 'ops'
                ? 'bg-surface text-teal-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Operations</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePortalTab('settings')}
            className={`min-h-11 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activePortalTab === 'settings'
                ? 'bg-surface text-slate-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Settings</span>
          </button>
        </div>

        {activePortalTab === 'management' && <AdminManagementScreen />}

        {/* Content tab: notices, broadcast notifications, routines */}
        {activePortalTab === 'content' && (
          <div>
            {renderSubNav(
              [
                { id: 'notices', label: 'Notices' },
                { id: 'notifications', label: 'Broadcasts' },
                { id: 'routines', label: 'Routines' },
              ],
              contentSub,
              id => setContentSub(id as typeof contentSub)
            )}
            <div className="mt-3">
              {contentSub === 'notices' && <AdminNoticesSection />}
              {contentSub === 'notifications' && <AdminNotificationsSection />}
              {contentSub === 'routines' && <AdminRoutinesSection />}
            </div>
          </div>
        )}

        {/* Operations tab: reports, admin team, sessions, tickets, analytics */}
        {activePortalTab === 'ops' && (
          <div>
            {renderSubNav(
              [
                { id: 'reports', label: 'Reports & Export' },
                { id: 'roles', label: 'Admin Team' },
                { id: 'sessions', label: 'Sessions' },
                { id: 'tickets', label: 'Support Tickets' },
                { id: 'analytics', label: 'Analytics' },
              ],
              opsSub,
              id => setOpsSub(id as typeof opsSub)
            )}
            <div className="mt-3">
              {opsSub === 'reports' && <AdminReportsSection />}
              {opsSub === 'roles' && <AdminRolesSection />}
              {opsSub === 'sessions' && <AdminSessionsSection />}
              {opsSub === 'tickets' && <AdminTicketsSection />}
              {opsSub === 'analytics' && <AdminAnalyticsSection />}
            </div>
          </div>
        )}

        {/* Settings tab: feature flags + maintenance, force update */}
        {activePortalTab === 'settings' && (
          <div>
            {renderSubNav(
              [
                { id: 'flags', label: 'Feature Flags & Maintenance' },
                { id: 'version', label: 'Force Update' },
              ],
              settingsSub,
              id => setSettingsSub(id as typeof settingsSub)
            )}
            <div className="mt-3">
              {settingsSub === 'flags' && <AdminFlagsSection />}
              {settingsSub === 'version' && <AdminVersionSection />}
            </div>
          </div>
        )}

        {/* Filter bar (only for Captains & Teachers tabs) */}
        {(activePortalTab === 'captains' || activePortalTab === 'teachers') && (
          <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-3 border-t border-slate-100">
            <div className="relative flex-1">
              <Search aria-hidden="true" className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={activePortalTab === 'captains' ? "Search student name, roll number, or department..." : "Search teacher name, department, or phone..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-text-primary placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-1">
              {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                    statusFilter === tab
                      ? 'bg-brand-blue text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab === 'Approved' && activePortalTab === 'teachers' ? 'Verified' : tab}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 1: CLASS CAPTAINS MANAGEMENT */}
      {activePortalTab === 'captains' && (
        <>
          {/* Quota Advisory Note */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
            <AlertTriangle aria-hidden="true" className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Strict BTEB Regulation Quota:</span> A maximum of <strong>two verified Class Captains</strong> is permitted per college, department, semester, shift, and section. Approvals are blocked automatically once quota is reached.
            </div>
          </div>

          {/* Applications list */}
          <div className="space-y-3">
            {filteredApps.length === 0 ? (
              <div className="bg-surface rounded-2xl border border-slate-200 p-8 text-center text-slate-500 shadow-xs">
                <FileText aria-hidden="true" className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold">No applications found matching criteria.</p>
              </div>
            ) : (
              filteredApps.map(app => {
                const currentCount = getVerifiedCaptainsCount(
                  app.college,
                  app.department,
                  app.semester,
                  app.shift,
                  app.section
                );

                return (
                  <div 
                    key={app.id} 
                    className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-text-primary">
                            {app.studentName}
                          </h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            app.status === 'Approved' 
                              ? 'bg-teal-100 text-brand-teal'
                              : app.status === 'Rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-800'
                          }`}>
                            {app.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {app.college} · {app.department}
                        </p>
                      </div>

                      <div className="text-left sm:text-right text-xs">
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-brand-blue font-bold">
                          Sem {app.semester} · {app.shift} Shift · Sec {app.section}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Section Quota: <strong className={currentCount >= 2 ? 'text-red-600' : 'text-green-600'}>{currentCount}/2 Captains</strong>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Board Roll:</span>
                        <span className="font-mono font-semibold text-slate-800">{app.boardRoll}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Reg Number:</span>
                        <span className="font-mono font-semibold text-slate-800">{app.regNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Phone Number:</span>
                        <span className="font-semibold text-slate-800">{app.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Session:</span>
                        <span className="font-semibold text-slate-800">{app.session}</span>
                      </div>
                    </div>

                    {/* Teacher Endorsement Badge */}
                    {app.teacherEndorsement ? (
                      <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200/60 text-xs text-teal-900 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1">
                            <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 text-teal-600" />
                            Guide Teacher Endorsement: {app.teacherEndorsement.teacherName} ({app.teacherEndorsement.teacherDesignation})
                          </span>
                          <span className="text-[10px] text-teal-700">{app.teacherEndorsement.endorsedAt}</span>
                        </div>
                        <p className="text-[11px] text-teal-800 italic">
                          "{app.teacherEndorsement.comments}"
                        </p>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                        <AlertTriangle aria-hidden="true" className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>No teacher endorsement on file — you can approve this request directly.</span>
                      </div>
                    )}

                    {/* Rejection notice */}
                    {app.status === 'Rejected' && app.rejectionReason && (
                      <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                        <span className="font-bold block">Rejection / Revocation Reason:</span>
                        <span>{app.rejectionReason}</span>
                      </div>
                    )}

                    {/* Actions bar */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 flex-wrap">
                      {app.verificationFormUrl || app.verificationFormName ? (
                        <button
                          onClick={() => setSelectedAppForDoc(app)}
                          className="text-xs font-semibold text-brand-blue hover:text-blue-700 flex items-center gap-1 py-1 cursor-pointer"
                        >
                          <Eye aria-hidden="true" className="w-3.5 h-3.5" />
                          <span>Review Signed Form</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 py-1">
                          <Send aria-hidden="true" className="w-3.5 h-3.5 text-teal-600" />
                          <span>Direct request — no form attached</span>
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        {app.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => {
                                setActionModal({ app, action: 'reject' });
                                setActionReason('');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => {
                                setActionModal({ app, action: 'approve' });
                                setActionReason('Verified with institute record.');
                              }}
                              className="px-3 py-1 rounded-lg bg-brand-teal hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                            >
                              Approve Captain
                            </button>
                          </>
                        )}

                        {app.status === 'Approved' && (
                          <button
                            onClick={() => {
                              setActionModal({ app, action: 'revoke' });
                              setActionReason('');
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-red-300 text-slate-600 hover:text-red-700 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Ban aria-hidden="true" className="w-3 h-3 text-red-500" />
                            <span>Revoke Approval</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* SECTION 2: TEACHERS & FACULTY VERIFICATION MANAGEMENT */}
      {activePortalTab === 'teachers' && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-950 flex items-start gap-2">
            <GraduationCap aria-hidden="true" className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Faculty Authorization Protocol:</span> Only verified institutional faculty members can approve Class Captains for their designated semester and shift cohorts. Review identity, teaching assignments, and status below.
            </div>
          </div>

          <div className="space-y-3">
            {filteredTeachers.length === 0 ? (
              <div className="bg-surface rounded-2xl border border-slate-200 p-8 text-center text-slate-500 shadow-xs">
                <GraduationCap aria-hidden="true" className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold">No teachers found matching criteria.</p>
              </div>
            ) : (
              filteredTeachers.map(teacher => {
                const isVerified = teacher.verificationStatus === 'Verified';
                const isPending = teacher.verificationStatus === 'Pending';
                const isRejected = teacher.verificationStatus === 'Rejected';
                const isLockedOut = (teacher as any).isLockedOut;

                return (
                  <div
                    key={teacher.id}
                    className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-text-primary">
                            {teacher.name}
                          </h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isVerified 
                              ? 'bg-green-100 text-green-800'
                              : isRejected
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isVerified ? '✓ Verified Faculty' : isRejected ? 'Rejected' : 'Pending Verification'}
                          </span>
                          {isLockedOut && (
                            <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Lock aria-hidden="true" className="w-3 h-3" />
                              PIN Locked
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {teacher.designation || 'Instructor'} · {teacher.department}
                        </p>
                      </div>

                      <div className="text-left sm:text-right text-xs">
                        <span className="inline-block px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
                          Semesters: {teacher.semestersTaught.map(s => `${s}th`).join(', ')} · {teacher.shift} Shift
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Institute:</span>
                        <span className="font-semibold text-slate-800">{teacher.college}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Phone Number:</span>
                        <span className="font-mono font-semibold text-slate-800">{teacher.phone}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Teaching Subjects:</span>
                        <span className="font-semibold text-slate-800">{teacher.teachingSubjects.join(', ')}</span>
                      </div>
                    </div>

                    {teacher.adminNotes && (
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                        <span className="font-bold block text-slate-700">Administrator Remarks:</span>
                        <span>{teacher.adminNotes}</span>
                      </div>
                    )}

                    {/* Actions bar */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 flex-wrap">
                      <div className="text-[11px] text-slate-400">
                        Registered: {new Date(teacher.createdAt).toLocaleDateString('en-GB')}
                      </div>

                      <div className="flex items-center gap-2">
                        {isLockedOut && (
                          <button
                            type="button"
                            onClick={() => handleResetLockout(teacher.id)}
                            className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Unlock aria-hidden="true" className="w-3.5 h-3.5" />
                            <span>Reset PIN Lockout</span>
                          </button>
                        )}

                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setTeacherActionModal({ teacher, action: 'reject' });
                                setTeacherActionNotes('');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTeacherActionModal({ teacher, action: 'approve' });
                                setTeacherActionNotes('Credentials verified against polytechnic faculty roster.');
                              }}
                              className="px-3 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
                            >
                              Approve Faculty
                            </button>
                          </>
                        )}

                        {isVerified && (
                          <button
                            type="button"
                            onClick={() => {
                              setTeacherActionModal({ teacher, action: 'reject' });
                              setTeacherActionNotes('');
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-red-300 text-slate-600 hover:text-red-700 text-xs font-semibold cursor-pointer"
                          >
                            Revoke Approval
                          </button>
                        )}

                        {isRejected && (
                          <button
                            type="button"
                            onClick={() => {
                              setTeacherActionModal({ teacher, action: 'approve' });
                              setTeacherActionNotes('Re-evaluated and approved.');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold cursor-pointer"
                          >
                            Re-Approve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: OFFICIAL BTEB EXAMINATION RESULTS IMPORT MANAGER */}
      {activePortalTab === 'results' && (
        <div className="space-y-4">
          {/* Security & Data Integrity Banner */}
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3.5 text-xs text-teal-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start gap-2.5">
              <Database aria-hidden="true" className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Official BTEB Result Extraction & Publishing Pipeline: </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveScreen('bteb_results')}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-brand-teal hover:bg-teal-700 text-white font-bold shadow-xs cursor-pointer"
            >
              Open Student Result Search →
            </button>
          </div>

          {/* Step 1: Configure Batch Metadata & Source Content */}
          <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Upload aria-hidden="true" className="w-4 h-4 text-brand-blue" />
              <span>1. Configure Examination Batch & Upload Official BTEB Dataset</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Semester (1st–8th) *
                </label>
                <select
                  value={batchSemester}
                  onChange={(e) => setBatchSemester(Number(e.target.value) as SemesterNumber)}
                  className="w-full px-2.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-text-primary"
                >
                  {([1, 2, 3, 4, 5, 6, 7, 8] as SemesterNumber[]).map(s => (
                    <option key={s} value={s}>{s}th Semester</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Regulation (Probidhan) *
                </label>
                <select
                  value={batchRegulation}
                  onChange={(e) => setBatchRegulation(e.target.value as BtebRegulation)}
                  className="w-full px-2.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-text-primary"
                >
                  <option value="2022">2022 Probidhan</option>
                  <option value="2016">2016 Probidhan</option>
                  <option value="2010">2010 Probidhan</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Examination Year *
                </label>
                <input
                  type="number"
                  min={2010}
                  max={2030}
                  value={batchExamYear}
                  onChange={(e) => setBatchExamYear(Number(e.target.value))}
                  className="w-full px-2.5 py-2 text-xs font-bold font-mono bg-slate-50 border border-slate-200 rounded-xl text-text-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Exam Type *
                </label>
                <select
                  value={batchExamType}
                  onChange={(e) => setBatchExamType(e.target.value as BtebExamType)}
                  className="w-full px-2.5 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl text-text-primary"
                >
                  <option value="Regular">Regular</option>
                  <option value="Irregular">Irregular</option>
                  <option value="Improvement">Improvement</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Custom Batch Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder={`e.g. ${batchSemester}th Semester ${batchExamType} Exam ${batchExamYear} (${batchRegulation} Reg)`}
                  value={batchTitle}
                  onChange={(e) => setBatchTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-text-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Official Publication Date
                </label>
                <input
                  type="date"
                  value={batchPubDate}
                  onChange={(e) => setBatchPubDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-text-primary"
                />
              </div>
            </div>

            {/* File Upload Input */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-dashed border-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs">
                <span className="font-bold text-text-primary block">
                  Upload Official BTEB Result File (.pdf, .txt, .csv, .json)
                </span>
                <span className="text-[11px] text-slate-500">
                  {uploadedFileName
                    ? `Selected file: ${uploadedFileName}`
                    : 'Or paste extracted text from an official BTEB PDF sheet in the box below'}
                </span>
              </div>
              <label className="px-3.5 py-2 rounded-xl bg-surface border border-slate-200 hover:border-blue-400 text-xs font-bold text-brand-blue shadow-2xs cursor-pointer shrink-0 text-center">
                <span>Choose Result File</span>
                <input
                  type="file"
                  accept=".txt,.csv,.json,.pdf"
                  onChange={handleResultFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Raw Text / Paste Box */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-text-primary">
                  Official BTEB Result Text / CSV / JSON Content
                </label>
                <span className="text-[10px] font-mono text-slate-500">
                  Format: 50118 - Dhaka Polytechnic Institute | 750142 (3.85) | 750145 &#123; 66662(T), 66664(T,P) &#125;
                </span>
              </div>
              <textarea
                rows={6}
                placeholder="Paste result sheet text"
                value={rawResultText}
                onChange={(e) => {
                  setRawResultText(e.target.value);
                  setPreviewResult(null);
                }}
                className="w-full px-3 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>

            {previewError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle aria-hidden="true" className="w-4 h-4 shrink-0" />
                <span>{previewError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={isParsingPreview}
                onClick={handlePreviewParse}
                className="px-4 py-2.5 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                {isParsingPreview ? 'Validating & Parsing...' : 'Validate & Preview Parse'}
              </button>
            </div>
          </div>

          {/* Step 2: Dry-Run Validation Preview & Commit */}
          {previewResult && (
            <div className="bg-surface rounded-2xl border-2 border-brand-teal p-4 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                    <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-brand-teal" />
                    <span>2. Validation Dry-Run Summary (Ready to Publish)</span>
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold bg-teal-50 text-brand-teal px-3 py-1 rounded-lg border border-teal-200">
                  {previewResult.summary.totalParsed} Valid Records Parsed
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-green-50 border border-green-200">
                  <span className="text-[10px] font-bold uppercase text-green-700 block">Passed Rolls</span>
                  <span className="text-lg font-extrabold font-mono text-green-800">{previewResult.summary.passCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold uppercase text-amber-700 block">Referred Rolls</span>
                  <span className="text-lg font-extrabold font-mono text-amber-800">{previewResult.summary.referredCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">In-File Duplicates</span>
                  <span className="text-lg font-extrabold font-mono text-slate-800">{previewResult.summary.duplicateRollsInPayloadCount}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-[10px] font-bold uppercase text-blue-700 block">Existing DB Conflicts</span>
                  <span className="text-lg font-extrabold font-mono text-blue-800">{previewResult.summary.existingConflictsCount}</span>
                </div>
              </div>

              {previewResult.summary.detectedInstitutes.length > 0 && (
                <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-text-primary">Detected Polytechnic Institutes: </span>
                  {previewResult.summary.detectedInstitutes.join(', ')}
                </div>
              )}

              {/* Sample Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                  Extracted Records (Showing first {previewResult.sampleRecords.length})
                </div>
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface border-b border-slate-100 text-slate-500">
                      <tr>
                        <th className="py-2 px-3 font-mono">Roll</th>
                        <th className="py-2 px-3">Institute</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">GPA / Referred Subjects (Mapped)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewResult.sampleRecords.map((rec, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-mono font-bold text-text-primary">{rec.rollNumber}</td>
                          <td className="py-2 px-3 text-slate-600">{rec.collegeName || 'BTEB'}</td>
                          <td className="py-2 px-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              rec.status === 'PASSED'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {rec.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono">
                            {rec.status === 'PASSED' ? (
                              <span className="font-bold text-green-700">GPA: {rec.gpa?.toFixed(2)}</span>
                            ) : (
                              <span className="text-amber-900">
                                {rec.referredSubjects
                                  .map((s: any) => `${s.code}(${s.failedComponent})${s.name ? ` [${s.name}]` : ''}`)
                                  .join(', ')}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Duplicate Resolution & Publish Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-600">If roll already exists in this batch:</span>
                  <select
                    value={duplicateMode}
                    onChange={(e) => setDuplicateMode(e.target.value as 'overwrite' | 'skip')}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-text-primary"
                  >
                    <option value="overwrite">Update / Overwrite Record</option>
                    <option value="skip">Skip Existing Record</option>
                  </select>
                </div>

                <button
                  type="button"
                  disabled={isPublishingBatch}
                  onClick={handlePublishBatch}
                  className="px-5 py-2.5 rounded-xl bg-brand-teal hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  {isPublishingBatch ? 'Publishing Batch...' : `Publish ${previewResult.summary.totalParsed} Verified Records`}
                </button>
              </div>
            </div>
          )}

          {/* Published Batches Management List */}
          <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">
                Published Result Batches in Database ({resultBatches.length})
              </h3>
              <button
                type="button"
                onClick={fetchResultBatches}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw aria-hidden="true" className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {resultBatches.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No BTEB result batches have been imported yet. Use the form above to validate and publish a batch.
              </p>
            ) : (
              <div className="space-y-2">
                {resultBatches.map(b => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-bold text-text-primary">{b.title}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        ID: {b.id} · {b.totalRecords} Rolls ({b.passCount} Passed, {b.referredCount} Referred)
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmBatch(b)}
                      className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold flex items-center gap-1 self-start sm:self-center cursor-pointer"
                    >
                      <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                      <span>Remove Batch</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Import Management Audit History (Restricted to system_admin) */}
          <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-text-primary">
              Import Management Audit History ({importLogs.length})
            </h3>
            {importLogs.length === 0 ? (
              <p className="text-xs text-slate-500 py-3 text-center">
                No administrative import operations recorded yet.
              </p>
            ) : (
              <div className="space-y-2">
                {importLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-text-primary">{log.batchTitle}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Source: {log.sourceFileName} · By {log.importedBy} · {new Date(log.importedAt).toLocaleString('en-GB')}
                      </div>
                    </div>
                    <div className="text-[11px] font-mono font-bold text-slate-700 bg-surface px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                      +{log.insertedCount} new · {log.updatedCount} upd · {log.skippedCount} skip
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: CENTRAL SUBJECT CATALOG MANAGEMENT (System Admin Only) */}
      {activePortalTab === 'catalog' && (
        <div className="space-y-4">
          {/* Starter Dataset & Provisional Notice */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
            <AlertTriangle aria-hidden="true" className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">
                Central Subject Catalog Governance & Protection Policy
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Importing provisional records will <strong>never overwrite</strong> existing verified records.
              </p>
            </div>
          </div>

          {/* JSON Import & Pre-Import Validation Card */}
          <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Import & Validate Subject Catalog JSON
                </h3>
                <p className="text-xs text-slate-500">
                  Preview total counts, technology/regulation/semester groups, duplicate subject codes, missing semesters, and verified conflicts before importing.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleLoadStarterCatalogJson('uploaded_10_depts')}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  Load 15 Dept Datasets (796)
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadStarterCatalogJson('starter')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Load Full Starter JSON
                </button>
                <label className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-brand-blue text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1">
                  <Upload aria-hidden="true" className="w-3.5 h-3.5" />
                  <span>Upload .JSON</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleCatalogFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <textarea
                rows={5}
                value={catalogJsonInput}
                onChange={(e) => {
                  setCatalogJsonInput(e.target.value);
                  setCatalogPreview(null);
                  setConfirmCatalogImportChecked(false);
                }}
                placeholder="Paste catalog JSON"
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {catalogError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
                {catalogError}
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handlePreviewCatalogImport}
                disabled={isPreviewingCatalog}
                className="px-4 py-2 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isPreviewingCatalog ? 'Validating Catalog JSON...' : '1. Run Pre-Import Validation Preview'}
              </button>

              <button
                type="button"
                onClick={() => setShowAddCatalogModal(true)}
                className="px-3 py-2 rounded-xl bg-brand-teal hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus aria-hidden="true" className="w-3.5 h-3.5" />
                <span>Add Single Subject</span>
              </button>
            </div>

            {/* Pre-Import Preview Summary */}
            {catalogPreview && (
              <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-extrabold text-text-primary uppercase tracking-wider">
                    Pre-Import Validation Summary
                  </h4>
                  <span className="text-xs font-mono font-bold text-brand-blue">
                    {catalogPreview.summary.validRecordsCount} Valid / {catalogPreview.summary.totalRecords} Total
                  </span>
                </div>

                {/* Key Counters */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                  <div className="bg-surface p-2.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block font-semibold">Total Records</span>
                    <span className="text-sm font-extrabold text-text-primary font-mono">
                      {catalogPreview.summary.totalRecords}
                    </span>
                  </div>
                  <div className="bg-green-50 p-2.5 rounded-xl border border-green-200">
                    <span className="text-[10px] text-green-700 block font-semibold">Verified</span>
                    <span className="text-sm font-extrabold text-green-800 font-mono">
                      {catalogPreview.summary.verifiedCount}
                    </span>
                  </div>
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-amber-800 block font-semibold">Provisional / Unverified</span>
                    <span className="text-sm font-extrabold text-amber-900 font-mono">
                      {catalogPreview.summary.unverifiedOrProvisionalCount}
                    </span>
                  </div>
                  <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    <span className="text-[10px] text-rose-700 block font-semibold">Duplicate Codes</span>
                    <span className="text-sm font-extrabold text-rose-800 font-mono">
                      {catalogPreview.summary.duplicateCodes.length}
                    </span>
                  </div>
                  <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                    <span className="text-[10px] text-blue-700 block font-semibold">Protected Verified</span>
                    <span className="text-sm font-extrabold text-blue-800 font-mono">
                      {catalogPreview.summary.protectedVerifiedConflicts.length}
                    </span>
                  </div>
                  <div className="bg-teal-50 p-2.5 rounded-xl border border-teal-200">
                    <span className="text-[10px] text-teal-700 block font-semibold">Idempotent Unchanged</span>
                    <span className="text-sm font-extrabold text-teal-800 font-mono">
                      {catalogPreview.summary.unchangedCount ?? 0}
                    </span>
                  </div>
                </div>

                {/* Syntax Warnings (e.g., missing comma in raw JSON) */}
                {catalogPreview.summary.syntaxWarnings && catalogPreview.summary.syntaxWarnings.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle aria-hidden="true" className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>JSON Syntax Warning Detected ({catalogPreview.summary.syntaxWarnings.length}):</span>
                    </div>
                    <ul className="list-disc list-inside text-[11px] font-mono space-y-0.5">
                      {catalogPreview.summary.syntaxWarnings.map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Grouped by Technology / Regulation / Semester */}
                <div className="bg-surface p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="text-[11px] font-bold text-text-primary">
                    Records Grouped by Technology, Regulation & Semester ({catalogPreview.summary.groupedCounts.length} technology/regulation groups):
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                    {catalogPreview.summary.groupedCounts.map((grp, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[11px] py-1 px-2 rounded bg-slate-50 border border-slate-100"
                      >
                        <span className="font-medium text-slate-700 truncate">
                          {grp.technology} · Probidhan {grp.regulation} (Semesters: {Object.entries(grp.semesterCounts).map(([s, c]) => `S${s}:${c}`).join(', ')})
                        </span>
                        <span className="font-mono font-bold text-brand-blue shrink-0 ml-2">
                          {grp.totalInGroup} subjects
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Duplicate Subject Codes Warning */}
                {catalogPreview.summary.duplicateCodes.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle aria-hidden="true" className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Duplicate Subject Codes Detected ({catalogPreview.summary.duplicateCodes.length} — both entries preserved without silent deletion):
                      </span>
                    </div>
                    <ul className="list-disc list-inside text-[11px] space-y-0.5 font-mono">
                      {catalogPreview.summary.duplicateCodes.map((d, i) => (
                        <li key={i}>
                          Code {d.subject_code} ({d.technology_key.toUpperCase()} · Reg {d.regulation} · Sem {d.semester}): {d.subject_names.join(' / ')} ({d.occurrences}x)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Protected Verified Conflicts Warning */}
                {catalogPreview.summary.protectedVerifiedConflicts.length > 0 && (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck aria-hidden="true" className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Verified Record Overwrite Protection ({catalogPreview.summary.protectedVerifiedConflicts.length} protected):
                      </span>
                    </div>
                    <p className="text-[11px] text-blue-800">
                      The following existing <strong>verified</strong> catalog records will NOT be overwritten by incoming provisional/unverified records:
                    </p>
                    <ul className="list-disc list-inside text-[11px] font-mono space-y-0.5">
                      {catalogPreview.summary.protectedVerifiedConflicts.slice(0, 6).map((c, i) => (
                        <li key={i}>
                          {c.subject_code} — {c.existing_name} (incoming: {c.incoming_status})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing Semester Coverage Summary */}
                <div className="bg-surface p-3 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-[11px] font-bold text-text-primary">
                    Missing Semester Data in Grouped Selection ({catalogPreview.summary.groupedCounts.filter(g => g.missingSemesters.length > 0).length} incomplete technology/regulation pairs):
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Semesters without imported records will display <em>"Book list not available for this semester yet."</em>
                  </p>
                  <div className="max-h-28 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                    {catalogPreview.summary.groupedCounts.filter(g => g.missingSemesters.length > 0).map((m, idx) => (
                      <div key={idx} className="text-[10px] bg-slate-50 px-2 py-1 rounded border border-slate-100 text-slate-600 truncate">
                        <strong>{m.technology_key.toUpperCase()} ({m.regulation}):</strong> Missing Sem {m.missingSemesters.join(', ')}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explicit Confirmation Checkbox & Import Button */}
                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-xs font-semibold text-text-primary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmCatalogImportChecked}
                      onChange={(e) => setConfirmCatalogImportChecked(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      I have reviewed the validation summary and confirm importing these catalog records.
                    </span>
                  </label>

                  <button
                    type="button"
                    disabled={!confirmCatalogImportChecked || isImportingCatalog}
                    onClick={handleConfirmCatalogImport}
                    className="px-4 py-2 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isImportingCatalog ? 'Importing...' : '2. Confirm & Execute Catalog Import'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Existing Catalog Records Browser & Governance Table */}
          <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-text-primary">
                Central Subject Catalog Records ({catalogRecords.length})
              </h3>
              <button
                type="button"
                onClick={fetchCatalogRecords}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw aria-hidden="true" className="w-3.5 h-3.5" />
                <span>Refresh Catalog</span>
              </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select
                value={catalogFilterTech}
                onChange={(e) => setCatalogFilterTech(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-text-primary font-semibold"
              >
                <option value="ALL">All 19 Technologies</option>
                {TECHNOLOGIES_DIRECTORY.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>

              <select
                value={catalogFilterReg}
                onChange={(e) => setCatalogFilterReg(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-text-primary font-semibold"
              >
                <option value="ALL">All Regulations (2016 & 2022)</option>
                <option value="2022">Regulation 2022</option>
                <option value="2016">Regulation 2016</option>
              </select>

              <select
                value={catalogFilterSem}
                onChange={(e) => setCatalogFilterSem(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-text-primary font-semibold"
              >
                <option value="ALL">All Semesters (1–8)</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={String(s)}>
                    Semester {s}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search code or subject name..."
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-text-primary"
              />
            </div>

            {/* Filtered Catalog List */}
            <div className="space-y-2 max-h-115 overflow-y-auto pr-1">
              {catalogRecords
                .filter((r) => {
                  if (catalogFilterTech !== 'ALL' && r.technology_key !== catalogFilterTech) return false;
                  if (catalogFilterReg !== 'ALL' && r.regulation !== catalogFilterReg) return false;
                  if (catalogFilterSem !== 'ALL' && String(r.semester) !== catalogFilterSem) return false;
                  if (catalogSearch.trim()) {
                    const q = catalogSearch.trim().toLowerCase();
                    return (
                      r.subject_code.toLowerCase().includes(q) ||
                      r.subject_name.toLowerCase().includes(q)
                    );
                  }
                  return true;
                })
                .map((rec) => (
                  <div
                    key={rec.id}
                    className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      rec.is_active
                        ? 'bg-surface border-slate-200'
                        : 'bg-slate-100 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-brand-blue bg-blue-50 px-2 py-0.5 rounded">
                          {rec.subject_code}
                        </span>
                        <span className="font-bold text-text-primary">{rec.subject_name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.verification_status === 'verified'
                              ? 'bg-green-100 text-green-800'
                              : rec.verification_status === 'provisional'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {rec.verification_status}
                        </span>
                        {!rec.is_active && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                            Deactivated
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {rec.technology} · Reg {rec.regulation} · Sem {rec.semester}
                        {rec.subject_type ? ` · ${rec.subject_type}` : ''}
                        {rec.marks ? ` · ${rec.marks} Marks` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      {rec.verification_status !== 'verified' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateCatalogRecord(rec.id, { verification_status: 'verified' })
                          }
                          className="px-2.5 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold cursor-pointer"
                        >
                          Approve Verified
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingCatalogRecord(rec)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 aria-hidden="true" className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateCatalogRecord(rec.id, { is_active: !rec.is_active })
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                          rec.is_active
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200'
                        }`}
                      >
                        {rec.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD SINGLE CATALOG SUBJECT */}
      {showAddCatalogModal && (
        <Modal
          onClose={() => setShowAddCatalogModal(false)}
          labelledBy="admin-add-catalog-title"
          panelClassName="bg-surface rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-3 max-h-[90vh] overflow-y-auto"
          overlayClassName="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          showCloseButton={false}
        >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 id="admin-add-catalog-title" className="font-bold text-sm text-text-primary">Add Subject to Central Catalog</h3>
              <button
                type="button"
                onClick={() => setShowAddCatalogModal(false)}
                className="text-slate-400 hover:text-slate-600"
               aria-label="Close">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCatalogRecord} className="space-y-2.5 text-xs">
              <div>
                <label className="block font-semibold text-text-primary mb-1">Technology</label>
                <select
                  value={newCatalogForm.technology}
                  onChange={(e) => setNewCatalogForm({ ...newCatalogForm, technology: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  {TECHNOLOGIES_DIRECTORY.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Regulation</label>
                  <select
                    value={newCatalogForm.regulation}
                    onChange={(e) =>
                      setNewCatalogForm({ ...newCatalogForm, regulation: e.target.value as CatalogRegulation })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="2022">2022</option>
                    <option value="2016">2016</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Semester</label>
                  <select
                    value={newCatalogForm.semester}
                    onChange={(e) =>
                      setNewCatalogForm({
                        ...newCatalogForm,
                        semester: Number(e.target.value) as SemesterNumber
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Subject Code *</label>
                  <input
                    type="text"
                    required
                    value={newCatalogForm.subject_code}
                    onChange={(e) => setNewCatalogForm({ ...newCatalogForm, subject_code: e.target.value })}
                    placeholder="e.g. 28561"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Verification Status</label>
                  <select
                    value={newCatalogForm.verification_status}
                    onChange={(e) =>
                      setNewCatalogForm({
                        ...newCatalogForm,
                        verification_status: e.target.value as CatalogVerificationStatus
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="verified">verified</option>
                    <option value="provisional">provisional</option>
                    <option value="unverified">unverified</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-text-primary mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={newCatalogForm.subject_name}
                  onChange={(e) => setNewCatalogForm({ ...newCatalogForm, subject_name: e.target.value })}
                  placeholder="e.g. Microprocessor & Interfacing"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Type</label>
                  <input
                    type="text"
                    value={newCatalogForm.subject_type}
                    onChange={(e) => setNewCatalogForm({ ...newCatalogForm, subject_type: e.target.value })}
                    placeholder="Core / Theory"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Marks</label>
                  <input
                    type="number"
                    value={newCatalogForm.marks}
                    onChange={(e) => setNewCatalogForm({ ...newCatalogForm, marks: e.target.value })}
                    placeholder="150"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Credits</label>
                  <input
                    type="number"
                    value={newCatalogForm.credits}
                    onChange={(e) => setNewCatalogForm({ ...newCatalogForm, credits: e.target.value })}
                    placeholder="3"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCatalogModal(false)}
                  className="flex-1 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-brand-blue text-white rounded-xl font-bold cursor-pointer"
                >
                  Save Subject
                </button>
              </div>
            </form>
        </Modal>
      )}

      {/* MODAL: EDIT CATALOG RECORD */}
      {editingCatalogRecord && (
        <Modal
          onClose={() => setEditingCatalogRecord(null)}
          labelledBy="admin-edit-catalog-title"
          panelClassName="bg-surface rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-3"
          overlayClassName="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
            <h3 id="admin-edit-catalog-title" className="font-bold text-sm text-text-primary">
              Edit Catalog Subject ({editingCatalogRecord.subject_code})
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <label className="block font-semibold text-text-primary mb-1">Subject Name</label>
                <input
                  type="text"
                  value={editingCatalogRecord.subject_name}
                  onChange={(e) =>
                    setEditingCatalogRecord({ ...editingCatalogRecord, subject_name: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Subject Code</label>
                  <input
                    type="text"
                    value={editingCatalogRecord.subject_code}
                    onChange={(e) =>
                      setEditingCatalogRecord({ ...editingCatalogRecord, subject_code: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-text-primary mb-1">Verification Status</label>
                  <select
                    value={editingCatalogRecord.verification_status}
                    onChange={(e) =>
                      setEditingCatalogRecord({
                        ...editingCatalogRecord,
                        verification_status: e.target.value as CatalogVerificationStatus
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="verified">verified</option>
                    <option value="provisional">provisional</option>
                    <option value="unverified">unverified</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-text-primary mb-1">Notes</label>
                <input
                  type="text"
                  value={editingCatalogRecord.notes || ''}
                  onChange={(e) =>
                    setEditingCatalogRecord({ ...editingCatalogRecord, notes: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCatalogRecord(null)}
                className="flex-1 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleUpdateCatalogRecord(editingCatalogRecord.id, {
                    subject_name: editingCatalogRecord.subject_name,
                    subject_code: editingCatalogRecord.subject_code,
                    verification_status: editingCatalogRecord.verification_status,
                    notes: editingCatalogRecord.notes
                  })
                }
                className="flex-1 py-2 bg-brand-blue text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Save Changes
              </button>
            </div>
        </Modal>
      )}

      {/* CONFIRM DELETE RESULT BATCH MODAL */}
      {deleteConfirmBatch && (
        <Modal
          onClose={() => setDeleteConfirmBatch(null)}
          labelledBy="admin-delete-batch-title"
          panelClassName="bg-surface rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-3"
          overlayClassName="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
            <h3 id="admin-delete-batch-title" className="font-bold text-base text-text-primary">
              Remove Published BTEB Result Batch?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong>{deleteConfirmBatch.title}</strong> and all <strong>{deleteConfirmBatch.totalRecords}</strong> student result records belonging to this batch?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmBatch(null)}
                className="flex-1 py-2 text-xs font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteBatch(deleteConfirmBatch.id)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
        </Modal>
      )}

      {/* MODAL: VIEW SIGNED VERIFICATION FORM */}
      {selectedAppForDoc && (
        <Modal
          onClose={() => setSelectedAppForDoc(null)}
          labelledBy="admin-doc-title"
          panelClassName="bg-surface rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
          overlayClassName="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          showCloseButton={false}
        >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <p className="text-xs text-slate-500">
                  {selectedAppForDoc.studentName} · Roll: {selectedAppForDoc.boardRoll}
                </p>
              </div>
              <button
                onClick={() => setSelectedAppForDoc(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
               aria-label="Close">
                ✕
              </button>
            </div>

            <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center text-center">
              <FileText aria-hidden="true" className="w-16 h-16 text-brand-blue mb-2" />
              <h4 id="admin-doc-title" className="text-xs font-bold text-text-primary">
                {selectedAppForDoc.verificationFormName || 'BTEB_CR_Form_Signed.pdf'}
              </h4>

              <div className="mt-3 p-3 bg-surface rounded-lg border border-slate-200 text-xs w-full text-left space-y-1 font-mono">
                <div>Applicant: <strong>{selectedAppForDoc.studentName}</strong></div>
                <div>Institute: <strong>{selectedAppForDoc.college}</strong></div>
                <div>Cohort: <strong>Sem {selectedAppForDoc.semester} · {selectedAppForDoc.shift} · Sec {selectedAppForDoc.section}</strong></div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedAppForDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
        </Modal>
      )}

      {/* CONFIRM CAPTAIN ACTION MODAL */}
      {actionModal && (
        <Modal
          onClose={() => { setActionModal(null); setActionReason(''); }}
          labelledBy="admin-captain-action-title"
          panelClassName="bg-surface rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-3"
          overlayClassName="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
            <h3 id="admin-captain-action-title" className="font-bold text-base text-text-primary">
              {actionModal.action === 'approve' && 'Confirm Class Captain Approval'}
              {actionModal.action === 'reject' && 'Reject Class Captain Application'}
              {actionModal.action === 'revoke' && 'Revoke Class Captain Approval'}
            </h3>

            <p className="text-xs text-slate-600">
              Student: <span className="font-bold text-text-primary">{actionModal.app.studentName}</span> (Roll: {actionModal.app.boardRoll}, Sec {actionModal.app.section})
            </p>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                {actionModal.action === 'approve' ? 'Approval Remarks / Notes (Optional)' : 'Reason (Mandatory) *'}
              </label>
              <textarea
                rows={3}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder={
                  actionModal.action === 'approve'
                    ? 'e.g. Verified by Department Head. Officially authorized.'
                    : 'e.g. Document seal illegible, or section quota exhausted.'
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setActionModal(null);
                  setActionReason('');
                }}
                className="flex-1 py-2 text-xs font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleActionConfirm}
                disabled={isProcessing}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl text-white shadow-xs ${
                  actionModal.action === 'approve'
                    ? 'bg-brand-teal hover:bg-teal-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isProcessing ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
        </Modal>
      )}

      {/* CONFIRM TEACHER ACTION MODAL */}
      {teacherActionModal && (
        <Modal
          onClose={() => setTeacherActionModal(null)}
          labelledBy="admin-teacher-action-title"
          panelClassName="bg-surface rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-3"
          overlayClassName="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
            <h3 id="admin-teacher-action-title" className="font-bold text-base text-text-primary">
              {teacherActionModal.action === 'approve' ? 'Approve Faculty Verification' : 'Reject / Revoke Faculty Authorization'}
            </h3>

            <p className="text-xs text-slate-600">
              Teacher: <span className="font-bold text-text-primary">{teacherActionModal.teacher.name}</span> ({teacherActionModal.teacher.department})
            </p>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Administrator Notes & Authority Verification Remarks:
              </label>
              <textarea
                rows={3}
                value={teacherActionNotes}
                onChange={(e) => setTeacherActionNotes(e.target.value)}
                placeholder="Admin remarks"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setTeacherActionModal(null)}
                className="flex-1 py-2 text-xs font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleTeacherActionConfirm}
                disabled={isProcessing}
                className={`flex-1 py-2 text-xs font-semibold rounded-xl text-white shadow-xs ${
                  teacherActionModal.action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isProcessing ? 'Saving...' : teacherActionModal.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
};
