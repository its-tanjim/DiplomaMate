import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  FileText,
  Key,
  ArrowLeft,
  ChevronRight,
  Send
} from 'lucide-react';

export const CaptainVerificationScreen: React.FC = () => {
  const { 
    userProfile, 
    accountType, 
    applications, 
    submitCaptainApplication, 
    teacherEndorseApplication, 
    getVerifiedCaptainsCount,
    setActiveScreen,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'apply' | 'teacher_endorse' | 'status'>('apply');
  // Direct approval request — no form. The student's profile details are
  // sent straight to the semester's Guide Teacher and the Institute Admin.
  const [applyError, setApplyError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    userProfile.college,
    userProfile.department,
    userProfile.semester,
    userProfile.shift,
    userProfile.section
  );

  // Direct apply: no form fields, no upload. submitCaptainApplication
  // fills every detail from the student profile and creates the Pending
  // request, which appears on the Guide Teacher's dashboard (cohort match)
  // and in the Admin Portal's captain review queue.
  const handleDirectApply = async () => {
    setApplyError(null);

    if (currentQuotaCount >= 2 && (!myApplication || myApplication.status !== 'Approved')) {
      setApplyError('Section quota reached! This section already has 2 verified Class Captains.');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await submitCaptainApplication({
        studentId: userProfile.id,
        verificationFormUrl: '',
        verificationFormName: '',
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
      <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveScreen('profile')}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              title="Back to profile"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-brand-teal flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-text-primary">
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
                ? 'bg-brand-blue text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>1. Apply Directly</span>
          </button>

          <button
            onClick={() => setActiveTab('teacher_endorse')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'teacher_endorse'
                ? 'bg-brand-teal text-white shadow-xs'
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
                ? 'bg-text-primary text-white shadow-xs'
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
        <Building2 className="w-5 h-5 text-brand-blue shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <span className="font-bold">Quota Governance Rule: </span>
          Each department section ({userProfile.department}, Sem {userProfile.semester}, {userProfile.shift} Shift, Sec {userProfile.section}) is limited to 
          <span className="font-bold text-brand-blue"> maximum 2 verified Class Captains</span>.
          Currently verified: <span className="font-bold text-teal-800">{currentQuotaCount} / 2 slots occupied</span>.
        </div>
      </div>

      {/* TAB 1: APPLY DIRECTLY — NO FORM. The request goes straight to the
          semester's Guide Teacher and the Institute Admin, using the
          student's profile details. */}
      {activeTab === 'apply' && (
        <div className="space-y-4">
          <div className="bg-surface rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-brand-teal flex items-center justify-center shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-text-primary">
                  Send Captain Approval Request
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  No form to fill. Your profile details below are sent directly to your semester&apos;s Guide Teacher and the Institute Admin for approval.
                </p>
              </div>
            </div>

            {/* Details that will be sent — read-only, taken from the student profile */}
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <span className="text-slate-400 block text-[10px]">Student Name</span>
                <span className="font-semibold text-text-primary">{userProfile.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Board Roll</span>
                <span className="font-mono font-semibold text-text-primary">{userProfile.boardRoll}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Institute</span>
                <span className="font-semibold text-text-primary">{userProfile.college}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Department</span>
                <span className="font-semibold text-text-primary">{userProfile.department}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Semester</span>
                <span className="font-semibold text-text-primary">{userProfile.semester}th · {userProfile.shift} Shift · Sec {userProfile.section}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Registration No</span>
                <span className="font-mono font-semibold text-text-primary">{userProfile.regNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Phone</span>
                <span className="font-semibold text-text-primary">{userProfile.phone || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Session</span>
                <span className="font-semibold text-text-primary">{userProfile.session}</span>
              </div>
            </div>
            {applyError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{applyError}</span>
              </div>
            )}

            {myApplication?.status === 'Pending' ? (
              <div className="space-y-2.5">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                  <Clock className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-semibold">Request already sent. </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('status')}
                  className="w-full py-3 rounded-xl font-bold text-xs text-white bg-brand-blue hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
                >
                  Check Request Status
                </button>
              </div>
            ) : myApplication?.status === 'Approved' ? (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-600 mt-0.5" />
                <div>
                  <span className="font-semibold">You are already a verified Class Captain. </span>
                  No new request needed.
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleDirectApply}
                disabled={isSubmitting || currentQuotaCount >= 2}
                className={`w-full py-3 rounded-xl font-bold text-xs text-white shadow-xs transition-colors flex items-center justify-center gap-2 ${
                  currentQuotaCount >= 2
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-brand-blue hover:bg-blue-700 cursor-pointer'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Sending Request...' : 'Send Approval Request to Guide Teacher & Admin'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DIGITAL TEACHER ENDORSEMENT PIN PORTAL */}
      {activeTab === 'teacher_endorse' && (
        <div className="bg-surface rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-brand-teal flex items-center justify-center shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary">
                Teacher Faculty Digital Verification
              </h2>
            </div>
          </div>

          <form onSubmit={handleTeacherEndorseSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-text-primary mb-1">
                Select Pending Student Application *
              </label>
              <select
                value={teacherSelectedAppId}
                onChange={(e) => setTeacherSelectedAppId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-text-primary text-xs"
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
              <label className="block font-semibold text-text-primary mb-1">
                Authorized Teacher Faculty PIN / Secret Code *
              </label>
              <input
                type="password"
                required
                placeholder="Enter your registered teacher PIN"
                value={teacherPin}
                onChange={(e) => setTeacherPin(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-text-primary font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-text-primary mb-1">
                Faculty Endorsement Remarks / Observations (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Comments (optional)"
                value={teacherComments}
                onChange={(e) => setTeacherComments(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
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
              className="w-full py-2.5 rounded-xl bg-brand-teal hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
            <div className="bg-surface rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-text-primary">
                    Your Captain Application
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Application ID: <span className="font-mono">{myApplication.id}</span>
                  </p>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                  myApplication.status === 'Approved'
                    ? 'bg-teal-100 text-brand-teal'
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
                    <span className="font-medium text-text-primary truncate max-w-[200px]">
                      {myApplication.verificationFormName}
                    </span>
                  </div>
                  <span className="text-teal-700 font-semibold text-[11px]">Uploaded Form</span>
                </div>
              )}

              {/* Teacher Endorsement Info */}
              {myApplication.teacherEndorsement ? (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-brand-teal flex items-center gap-1">
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
            <div className="bg-surface rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
              <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-text-primary">No Application Found</h3>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
