import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  ShieldCheck, 
  Download, 
  Upload, 
  FileCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  UserCheck, 
  Building2, 
  FileText, 
  Key, 
  Printer, 
  ArrowLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Shift, Section, CaptainApplication, DocumentScanResult } from '../../types';
import { SearchableCollegeSelect } from '../common/SearchableCollegeSelect';
import { SearchableDepartmentSelect } from '../common/SearchableDepartmentSelect';
import {
  prepareFileForDocumentIntelligence,
  scanDocumentOnServer
} from '../../services/documentIntelligenceService';

export const CaptainVerificationScreen: React.FC = () => {
  const { 
    userProfile, 
    accountType, 
    applications, 
    submitCaptainApplication, 
    teacherEndorseApplication, 
    getVerifiedCaptainsCount,
    setActiveScreen,
    showToast,
    authToken
  } = useApp();

  const [activeTab, setActiveTab] = useState<'apply' | 'teacher_endorse' | 'status'>('apply');
  const [showPrintableForm, setShowPrintableForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    studentName: userProfile.name,
    college: userProfile.college,
    department: userProfile.department,
    semester: userProfile.semester,
    shift: userProfile.shift,
    section: userProfile.section,
    boardRoll: userProfile.boardRoll,
    regNumber: userProfile.regNumber,
    phone: userProfile.phone || '+880 1712-345678',
    session: userProfile.session,
  });

  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    type: string;
    dataUrl: string;
    size: number;
  } | null>(null);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanningForm, setIsScanningForm] = useState(false);
  const [formScanResult, setFormScanResult] = useState<DocumentScanResult | null>(null);

  // Teacher Endorsement form state
  const [teacherSelectedAppId, setTeacherSelectedAppId] = useState<string>('');
  const [teacherPin, setTeacherPin] = useState('');
  const [teacherComments, setTeacherComments] = useState('');
  const [isEndorsing, setIsEndorsing] = useState(false);
  const [teacherError, setTeacherError] = useState<string | null>(null);

  // Current user's application (if any)
  const myApplication = applications.find(
    app => app.studentId === userProfile.id || app.boardRoll === userProfile.boardRoll
  );

  const currentQuotaCount = getVerifiedCaptainsCount(
    formData.college,
    formData.department,
    formData.semester,
    formData.shift,
    formData.section
  );

  // File change handler with shared Document Intelligence verification scan
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setFormScanResult(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10MB limit. Please compress your document.');
      return;
    }

    setIsScanningForm(true);
    try {
      const prepared = await prepareFileForDocumentIntelligence(file);
      if (!prepared.valid || !prepared.dataUrl) {
        setUploadError(prepared.error || 'Only valid PDF, JPG, PNG, or WebP files are supported.');
        return;
      }

      setUploadedFile({
        name: prepared.fileName,
        type: prepared.mimeType,
        dataUrl: prepared.dataUrl,
        size: file.size
      });
      showToast('Signed form document attached! Scanning fields...');

      const scanRes = await scanDocumentOnServer({
        feature: 'captain_form',
        fileName: prepared.fileName,
        mimeType: prepared.mimeType,
        fileDataUrl: prepared.dataUrl,
        authToken
      });
      setFormScanResult(scanRes);

      if (scanRes.captainFormData) {
        const cd = scanRes.captainFormData;
        setFormData(prev => ({
          ...prev,
          studentName: cd.studentName || prev.studentName,
          boardRoll: cd.boardRoll || prev.boardRoll,
          regNumber: cd.regNumber || prev.regNumber,
          college: cd.college || prev.college,
          department: cd.department || prev.department,
          semester: cd.semester || prev.semester,
          shift: cd.shift || prev.shift,
          section: cd.section || prev.section
        }));
      }
    } finally {
      setIsScanningForm(false);
    }
  };

  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedFile) {
      setUploadError('Please upload your signed verification form (image or PDF).');
      return;
    }

    if (currentQuotaCount >= 2 && (!myApplication || myApplication.status !== 'Approved')) {
      setUploadError('Section quota reached! This section already has 2 verified Class Captains.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await submitCaptainApplication({
        ...formData,
        studentId: userProfile.id,
        verificationFormUrl: uploadedFile.dataUrl,
        verificationFormName: uploadedFile.name,
      });

      if (success) {
        setActiveTab('status');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTeacherEndorseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherSelectedAppId) {
      setTeacherError('Please select a student application to endorse.');
      return;
    }
    if (!teacherPin.trim()) {
      setTeacherError('Please enter your authorized Teacher Faculty PIN.');
      return;
    }

    setIsEndorsing(true);
    setTeacherError(null);
    try {
      const result = await teacherEndorseApplication(
        teacherSelectedAppId,
        teacherPin.trim(),
        teacherComments.trim()
      );

      if (!result.success) {
        setTeacherError(result.message);
      } else {
        setTeacherPin('');
        setTeacherComments('');
        setActiveTab('status');
      }
    } finally {
      setIsEndorsing(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveScreen('profile')}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              title="Back to profile"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9488] flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-[#172554]">
                Class Captain Verification
              </h1>
              <p className="text-xs text-slate-500">
                Official accreditation for Section {userProfile.section} Representative
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveScreen('admin_portal')}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1"
          >
            <span>Admin Review</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mt-4 border-t border-slate-100 pt-3">
          <button
            onClick={() => setActiveTab('apply')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'apply'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>1. Apply & Upload</span>
          </button>

          <button
            onClick={() => setActiveTab('teacher_endorse')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'teacher_endorse'
                ? 'bg-[#0D9488] text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>2. Teacher PIN Sign-off</span>
          </button>

          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'status'
                ? 'bg-[#172554] text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>3. Status ({myApplication ? myApplication.status : 'None'})</span>
          </button>
        </div>
      </div>

      {/* Quota Banner */}
      <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3.5 flex items-start gap-3">
        <Building2 className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <span className="font-bold">Quota Governance Rule: </span>
          Each department section ({userProfile.department}, Sem {userProfile.semester}, {userProfile.shift} Shift, Sec {userProfile.section}) is limited to 
          <span className="font-bold text-[#2563EB]"> maximum 2 verified Class Captains</span>.
          Currently verified: <span className="font-bold text-teal-800">{currentQuotaCount} / 2 slots occupied</span>.
        </div>
      </div>

      {/* TAB 1: APPLY & FORM DOWNLOAD */}
      {activeTab === 'apply' && (
        <div className="space-y-4">
          {/* Printable Verification Form Modal Trigger Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-[#172554] flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-[#0D9488]" />
                  Download Official BTEB Verification Form
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Download or print this formatted form to obtain physical signature & recommendation from your Guide / Class Teacher.
                </p>
              </div>

              <button
                onClick={() => setShowPrintableForm(true)}
                className="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-[#0D9488] border border-teal-200 font-semibold text-xs flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>View & Print Form</span>
              </button>
            </div>
          </div>

          {/* Application Form */}
          <form onSubmit={handleApplicationSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h2 className="text-sm font-bold text-[#172554]">
                Class Captain Application Details
              </h2>
              <span className="text-[11px] text-slate-500">Auto-filled from profile</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-[#172554] mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>

              <div className="sm:col-span-2">
                <SearchableCollegeSelect
                  value={formData.college}
                  onChange={(name) => setFormData({ ...formData, college: name })}
                  label="Institute / Polytechnic"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <SearchableDepartmentSelect
                  value={formData.department}
                  onChange={(name) => setFormData({ ...formData, department: name })}
                  label="Department / Technology"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-[#172554] mb-1">Semester</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) as any })}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#172554] mb-1">Shift</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value as Shift })}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Day">Day</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#172554] mb-1">Section</label>
                  <select
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value as Section })}
                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  >
                    <option value="A1">A1</option>
                    <option value="B1">B1</option>
                    <option value="A2">A2</option>
                    <option value="B2">B2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#172554] mb-1">BTEB Board Roll</label>
                <input
                  type="text"
                  required
                  value={formData.boardRoll}
                  onChange={(e) => setFormData({ ...formData, boardRoll: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172554] mb-1">Registration Number</label>
                <input
                  type="text"
                  required
                  value={formData.regNumber}
                  onChange={(e) => setFormData({ ...formData, regNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172554] mb-1">Applicant Contact Phone</label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172554] mb-1">Academic Session</label>
                <input
                  type="text"
                  required
                  value={formData.session}
                  onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>
            </div>

            {/* Document Upload Zone */}
            <div className="pt-2">
              <label className="block font-bold text-xs text-[#172554] mb-1.5">
                Upload Signed Verification Form Document (PDF or Photo) *
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-5 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <input
                  type="file"
                  id="verificationDocInput"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="verificationDocInput"
                  className="cursor-pointer flex flex-col items-center justify-center"
                >
                  <Upload className="w-8 h-8 text-[#0D9488] mb-2" />
                  <span className="text-xs font-semibold text-[#172554]">
                    Tap to upload signed form photo or PDF
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    Max size: 5MB (JPG, PNG, PDF accepted)
                  </span>
                </label>
              </div>

              {isScanningForm && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 animate-spin text-[#2563EB] shrink-0" />
                  <span>Scanning uploaded verification form for roll, registration & signature...</span>
                </div>
              )}

              {uploadedFile && (
                <div className="mt-3 p-3 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-[#0D9488]" />
                      <span className="text-xs font-semibold text-teal-900 truncate max-w-[200px]">
                        {uploadedFile.name}
                      </span>
                      <span className="text-[10px] text-teal-700">
                        ({(uploadedFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-[#0D9488] bg-white px-2 py-0.5 rounded border border-teal-200">
                      Ready
                    </span>
                  </div>

                  {formScanResult && (
                    <div className="p-2.5 bg-white rounded-lg border border-teal-200/80 text-[11px] space-y-1 text-slate-700">
                      <div className="flex items-center justify-between font-bold text-[#172554]">
                        <span>Document Scan Confidence: {formScanResult.confidence}</span>
                        {formScanResult.captainFormData?.hasSignatureOrSeal && (
                          <span className="text-emerald-700">✓ Signature/Seal Mention Detected</span>
                        )}
                      </div>
                      {formScanResult.uncertainFields.length > 0 && (
                        <p className="text-amber-700">
                          Please verify fields above: {formScanResult.uncertainFields.join(', ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {uploadError && (
                <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || currentQuotaCount >= 2}
              className={`w-full py-3 rounded-xl font-bold text-xs text-white shadow-xs transition-colors flex items-center justify-center gap-2 ${
                currentQuotaCount >= 2
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-[#2563EB] hover:bg-blue-700 cursor-pointer'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Submitting Application...' : 'Submit Class Captain Application'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: DIGITAL TEACHER ENDORSEMENT PIN PORTAL */}
      {activeTab === 'teacher_endorse' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#172554]">
                Teacher Faculty Digital Verification
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Authorized Guide Teachers and Faculty Members can digitally approve Class Captain applications using their official Teacher PIN.
              </p>
            </div>
          </div>

          <form onSubmit={handleTeacherEndorseSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-[#172554] mb-1">
                Select Pending Student Application *
              </label>
              <select
                value={teacherSelectedAppId}
                onChange={(e) => setTeacherSelectedAppId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554] text-xs"
              >
                <option value="">-- Choose student application --</option>
                {applications
                  .filter(app => app.status === 'Pending')
                  .map(app => (
                    <option key={app.id} value={app.id}>
                      {app.studentName} — Roll: {app.boardRoll} (Sec {app.section}, {app.shift} Shift)
                    </option>
                  ))}
              </select>
              {applications.filter(a => a.status === 'Pending').length === 0 && (
                <p className="text-[11px] text-slate-400 mt-1">
                  No applications currently pending teacher endorsement.
                </p>
              )}
            </div>

            <div>
              <label className="block font-semibold text-[#172554] mb-1">
                Authorized Teacher Faculty PIN / Secret Code *
              </label>
              <input
                type="password"
                required
                placeholder="Enter Teacher Faculty PIN (e.g., TCH-DPI-2026)"
                value={teacherPin}
                onChange={(e) => setTeacherPin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554] font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Valid Faculty PINs for demonstration: <span className="font-mono text-[#0D9488]">TCH-DPI-2026</span>, <span className="font-mono text-[#0D9488]">TCH-CST-666</span>, <span className="font-mono text-[#0D9488]">FACULTY-BTEB-77</span>.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-[#172554] mb-1">
                Faculty Endorsement Remarks / Observations (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Recommended for CR role. Academic record and attendance are satisfactory."
                value={teacherComments}
                onChange={(e) => setTeacherComments(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
              />
            </div>

            {teacherError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{teacherError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isEndorsing}
              className="w-full py-2.5 rounded-xl bg-[#0D9488] hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isEndorsing ? 'Verifying PIN & Endorsing...' : 'Endorse & Approve Student as Class Captain'}</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: APPLICATION STATUS & HISTORY */}
      {activeTab === 'status' && (
        <div className="space-y-3">
          {myApplication ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-[#172554]">
                    Your Captain Application
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Application ID: <span className="font-mono">{myApplication.id}</span>
                  </p>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                  myApplication.status === 'Approved'
                    ? 'bg-teal-100 text-[#0D9488]'
                    : myApplication.status === 'Rejected'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {myApplication.status === 'Approved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {myApplication.status === 'Rejected' && <XCircle className="w-3.5 h-3.5" />}
                  {myApplication.status === 'Pending' && <Clock className="w-3.5 h-3.5" />}
                  <span>{myApplication.status}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400">Department:</span> {myApplication.department}
                </div>
                <div>
                  <span className="text-slate-400">Section:</span> {myApplication.section} ({myApplication.shift} Shift)
                </div>
                <div>
                  <span className="text-slate-400">Board Roll:</span> <span className="font-mono font-medium">{myApplication.boardRoll}</span>
                </div>
                <div>
                  <span className="text-slate-400">Applied On:</span> {myApplication.appliedAt.slice(0, 10)}
                </div>
              </div>

              {/* Uploaded Form Indicator */}
              {myApplication.verificationFormName && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span className="font-medium text-[#172554] truncate max-w-[200px]">
                      {myApplication.verificationFormName}
                    </span>
                  </div>
                  <span className="text-teal-700 font-semibold text-[11px]">Uploaded Form</span>
                </div>
              )}

              {/* Teacher Endorsement Info */}
              {myApplication.teacherEndorsement ? (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-[#0D9488] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Endorsed by Teacher: {myApplication.teacherEndorsement.teacherName}</span>
                  </div>
                  <div className="text-slate-600">
                    Designation: {myApplication.teacherEndorsement.teacherDesignation}
                  </div>
                  {myApplication.teacherEndorsement.comments && (
                    <div className="italic text-slate-500 text-[11px]">
                      "{myApplication.teacherEndorsement.comments}"
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <Clock className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-semibold">Awaiting Teacher PIN Sign-off: </span>
                    Ask your Guide Teacher to enter their Faculty PIN in the "Teacher PIN Sign-off" tab, or wait for Institute Admin approval.
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {myApplication.status === 'Rejected' && myApplication.rejectionReason && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                  <span className="font-bold">Reason for Rejection: </span>
                  {myApplication.rejectionReason}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
              <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-[#172554]">No Application Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                You haven't submitted a Class Captain verification request yet. Click "Apply & Upload" to begin.
              </p>
            </div>
          )}
        </div>
      )}

      {/* PRINTABLE OFFICIAL VERIFICATION FORM MODAL */}
      {showPrintableForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-300 my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Actions */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#2563EB]" />
                <h3 className="font-bold text-sm sm:text-base text-[#172554]">
                  BTEB Class Captain Verification Form
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#2563EB] text-white hover:bg-blue-700 flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  onClick={() => setShowPrintableForm(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 text-sm font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Official Document Layout */}
            <div className="mt-4 p-5 bg-slate-50 border border-slate-300 rounded-xl font-serif text-slate-800 text-xs space-y-4">
              <div className="text-center border-b border-slate-300 pb-3">
                <h2 className="font-bold text-sm tracking-wide uppercase text-[#172554]">
                  Bangladesh Technical Education Board (BTEB)
                </h2>
                <h3 className="text-xs font-semibold text-slate-700">
                  {userProfile.college}
                </h3>
                <p className="text-[11px] font-sans text-slate-500 mt-0.5">
                  Class Representative (CR) Accreditation & Verification Certificate
                </p>
              </div>

              <div className="space-y-1.5 font-sans text-xs">
                <div><span className="font-semibold">Student Name:</span> {formData.studentName}</div>
                <div><span className="font-semibold">Technology / Department:</span> {formData.department}</div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-semibold">Semester:</span> {formData.semester}th</div>
                  <div><span className="font-semibold">Shift:</span> {formData.shift} Shift</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-semibold">Section:</span> Section {formData.section}</div>
                  <div><span className="font-semibold">Session:</span> {formData.session}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-semibold">Board Roll:</span> {formData.boardRoll}</div>
                  <div><span className="font-semibold">Reg Number:</span> {formData.regNumber}</div>
                </div>
              </div>

              {/* Guide Teacher Recommendation Section */}
              <div className="pt-3 border-t border-slate-300 font-sans space-y-3">
                <h4 className="font-bold text-[11px] uppercase tracking-wider text-[#172554]">
                  Recommendation of Guide / Class Teacher
                </h4>
                <p className="text-[11px] text-slate-600 leading-relaxed italic">
                  "I hereby certify that the above student possesses satisfactory attendance, academic standing, and disciplinary conduct. I recommend them for the position of Class Captain for the designated semester & section."
                </p>

                <div className="grid grid-cols-2 gap-6 pt-6">
                  <div className="border-t border-slate-400 pt-1 text-center text-[10px] text-slate-600">
                    Signature of Guide Teacher<br/>Name & Designation
                  </div>
                  <div className="border-t border-slate-400 pt-1 text-center text-[10px] text-slate-600">
                    Official College Seal / Stamp<br/>Head of Department
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowPrintableForm(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-300 cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
