import { apiFetch } from '../../services/apiClient';
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  GraduationCap, 
  ShieldCheck, 
  Users, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  Eye, 
  Lock, 
  Key, 
  Search, 
  Phone, 
  Mail, 
  Building, 
  BookOpen, 
  Sparkles, 
  Megaphone, 
  Layers, 
  ExternalLink,
  ChevronRight,
  LogOut,
  RefreshCw,
  CheckSquare,
  Award
} from 'lucide-react';
import { SemesterNumber, Shift, Section, CaptainApplication } from '../../types';
import { DEPARTMENTS, MOCK_ENROLLED_STUDENTS, POLYTECHNIC_COLLEGES, normalizeCollege, normalizeTechnology } from '../../data/mockData';
import { SearchableCollegeSelect } from '../common/SearchableCollegeSelect';
import { SearchableDepartmentSelect } from '../common/SearchableDepartmentSelect';
import { TeacherAttendanceSection } from './TeacherAttendanceSection';

export const TeacherDashboardScreen: React.FC = () => {
  const { 
    userProfile, 
    currentTeacherProfile, 
    authToken,
    applications, 
    teacherEndorseApplication, 
    teacherChangePin,
    getVerifiedCaptainsCount,
    setActiveScreen, 
    addAnnouncement,
    showToast,
    logout 
  } = useApp();

  // Cohort Selection State
  const [selectedCollege, setSelectedCollege] = useState<string>(
    userProfile.college || POLYTECHNIC_COLLEGES[0]
  );
  const [selectedSemester, setSelectedSemester] = useState<SemesterNumber>(
    (userProfile.semestersTaught?.[0] as SemesterNumber) || 6
  );
  const [selectedDept, setSelectedDept] = useState<string>(
    userProfile.department || DEPARTMENTS[0]
  );
  const [selectedShift, setSelectedShift] = useState<Shift>(
    userProfile.shift || 'Morning'
  );
  const [selectedSection, setSelectedSection] = useState<Section>(
    (userProfile.section as Section) || 'A1'
  );

  // Search & Filter
  const [searchRosterQuery, setSearchRosterQuery] = useState('');
  
  // Modals
  const [selectedFormApp, setSelectedFormApp] = useState<CaptainApplication | null>(null);
  
  // Approval / Rejection Modal
  const [actionApp, setActionApp] = useState<{
    app: CaptainApplication;
    action: 'approve' | 'reject';
  } | null>(null);
  const [teacherPinInput, setTeacherPinInput] = useState('');
  const [actionComment, setActionComment] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Change PIN modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Notice modal
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<'attendance' | 'verifications' | 'roster' | 'curriculum'>('attendance');
  const [serverRoster, setServerRoster] = useState<typeof MOCK_ENROLLED_STUDENTS | null>(null);

  const semestersList: SemesterNumber[] = [1, 2, 3, 4, 5, 6, 7, 8];
  const shiftsList: Shift[] = ['Morning', 'Day'];
  const sectionsList: Section[] = ['A1', 'A2', 'B1', 'B2'];

  const teacherStatus = userProfile.teacherVerificationStatus || 'Verified';
  const isFacultyVerified = teacherStatus === 'Verified';

  // Filter Captain applications for selected cohort (using normalized IDs for legacy compatibility)
  const teacherCollegeId = normalizeCollege(selectedCollege).id;
  const selectedDeptId = normalizeTechnology(selectedDept).id;

  React.useEffect(() => {
    const token = authToken || localStorage.getItem('diplomamate_auth_token');
    if (!token || !isFacultyVerified) {
      setServerRoster(null);
      return;
    }
    const params = new URLSearchParams({
      college: selectedCollege,
      department: selectedDept,
      semester: String(selectedSemester),
      shift: selectedShift,
      section: selectedSection
    });
    apiFetch(`/api/roster?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.students)) {
          setServerRoster(data.students);
        } else {
          setServerRoster(null);
        }
      })
      .catch(() => setServerRoster(null));
  }, [authToken, isFacultyVerified, selectedCollege, selectedDept, selectedSemester, selectedShift, selectedSection, activeTab]);

  const cohortApplications = applications.filter(app => 
    normalizeCollege(app.college).id === teacherCollegeId &&
    normalizeTechnology(app.department).id === selectedDeptId &&
    app.semester === selectedSemester &&
    app.shift === selectedShift &&
    app.section === selectedSection
  );

  const pendingApplications = cohortApplications.filter(a => a.status === 'Pending');
  const currentVerifiedCount = getVerifiedCaptainsCount(
    selectedCollege,
    selectedDept,
    selectedSemester,
    selectedShift,
    selectedSection
  );

  // Filter roster for this cohort
  const cohortStudents = serverRoster || MOCK_ENROLLED_STUDENTS.filter(s => 
    normalizeCollege(s.college).id === teacherCollegeId &&
    normalizeTechnology(s.department).id === selectedDeptId &&
    s.semester === selectedSemester &&
    s.shift === selectedShift &&
    s.section === selectedSection
  );

  const filteredRoster = cohortStudents.filter(s => 
    s.name.toLowerCase().includes(searchRosterQuery.toLowerCase()) ||
    s.boardRoll.includes(searchRosterQuery) ||
    s.classRoll.includes(searchRosterQuery) ||
    s.regNumber.includes(searchRosterQuery)
  );

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionApp) return;
    if (!teacherPinInput.trim()) {
      showToast('Please enter your Faculty Security PIN.');
      return;
    }

    setIsSubmittingAction(true);
    try {
      const result = await teacherEndorseApplication(
        actionApp.app.id,
        teacherPinInput.trim(),
        actionComment.trim() || undefined,
        actionApp.action,
        userProfile.id
      );

      if (result.success) {
        setActionApp(null);
        setTeacherPinInput('');
        setActionComment('');
      } else {
        showToast(result.message);
      }
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    if (!currentPin.trim() || !newPin.trim()) {
      setPinError('Both current and new PIN are required.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError('New PINs do not match.');
      return;
    }
    if (!/^\d{4,6}$/.test(newPin.trim())) {
      setPinError('New PIN must be 4–6 digits.');
      return;
    }

    const res = await teacherChangePin(currentPin.trim(), newPin.trim());
    if (res.success) {
      setShowPinModal(false);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } else {
      setPinError(res.message);
    }
  };

  const handlePostFacultyNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;
    addAnnouncement(noticeTitle.trim(), noticeContent.trim(), 'Important');
    setNoticeTitle('');
    setNoticeContent('');
    setShowNoticeModal(false);
    showToast('Official Department Notice published to students!');
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Teacher Profile Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-blue-950 rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-blue-300 text-xs font-semibold">Institutional Faculty Portal</span>
              <span className="text-slate-400">·</span>
              {isFacultyVerified ? (
                <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-300 border border-green-400/30 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-green-300" />
                  Verified Faculty
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3 text-amber-300" />
                  Pending Admin Approval
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {userProfile.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-blue-100/90 mt-1">
              <span className="font-semibold text-white">{userProfile.designation || 'Faculty Member'}</span>
              <span className="text-blue-400">·</span>
              <span>{userProfile.department}</span>
              <span className="text-blue-400">·</span>
              <span>{userProfile.college}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-blue-200/80 mt-2 font-mono">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {userProfile.phone}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {userProfile.email}
              </span>
            </div>
          </div>

          {/* Quick Security, Profile Setup & PIN Management */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 border-blue-800/60 pt-2 sm:pt-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setActiveScreen('teacher_setup')}
                className="text-[11px] font-semibold bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 px-2.5 py-1.5 rounded-xl border border-teal-400/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <GraduationCap className="w-3.5 h-3.5 text-teal-300" />
                <span>Profile & Contact Setup</span>
              </button>
              <button
                onClick={() => setShowPinModal(true)}
                className="text-[11px] font-semibold bg-surface/10 hover:bg-surface/20 text-white px-2.5 py-1.5 rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-amber-300" />
                <span>PIN Settings</span>
              </button>
            </div>
            <button
              onClick={logout}
              className="text-xs text-blue-200 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Verification Warning if Pending */}
        {!isFacultyVerified && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              Your teacher registration is currently pending review by your college administrator. Class Captain verification and official approvals are locked until verified.
            </span>
          </div>
        )}
      </div>

      {/* Dedicated Teacher Attendance & Quick Actions Card on Teacher Homepage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`text-left p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-blue-50/90 border-blue-400 shadow-xs'
              : 'bg-surface border-slate-200 hover:border-blue-300 shadow-xs'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md mb-1">
                Class Attendance
              </span>
              <h2 className="text-sm font-bold text-text-primary">
                Take Attendance & Monthly Register
              </h2>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-blue-600 shrink-0 mt-1" />
        </button>

        <button
          type="button"
          onClick={() => setActiveScreen('notes')}
          className="text-left p-4 rounded-2xl border border-slate-200 bg-surface hover:border-teal-400 shadow-xs transition-all flex items-start justify-between gap-3 cursor-pointer"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-teal text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md mb-1">
                Notes & Submissions
              </span>
              <h2 className="text-sm font-bold text-text-primary">
                Publish Assignments & View Submissions
              </h2>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-teal-600 shrink-0 mt-1" />
        </button>

        <button
          type="button"
          onClick={() => setActiveScreen('community')}
          className="text-left p-4 rounded-2xl border border-slate-200 bg-surface hover:border-brand-blue shadow-xs transition-all flex items-start justify-between gap-3 cursor-pointer sm:col-span-2"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center shrink-0 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md mb-1">
                Academic Community
              </span>
              <h2 className="text-sm font-bold text-text-primary">
                Create & Moderate Semester Academic Groups
              </h2>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-brand-blue shrink-0 mt-1" />
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap sm:flex-nowrap rounded-xl bg-slate-200/80 p-1 gap-1">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-surface text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Attendance</span>
        </button>

        <button
          onClick={() => setActiveTab('verifications')}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'verifications'
              ? 'bg-surface text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Captain Approvals</span>
          {pendingApplications.length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {pendingApplications.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('roster')}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'roster'
              ? 'bg-surface text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Student Roster ({cohortStudents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('curriculum')}
          className={`flex-1 py-2 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'curriculum'
              ? 'bg-surface text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Faculty Actions</span>
        </button>
      </div>

      {/* Cohort Selector (Shown on Captain Approvals & Student Roster tabs; Attendance tab has its own full cohort + date/subject selector) */}
      {activeTab !== 'attendance' && (
        <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>1. Select Semester (1st to 8th Semester)</span>
              </label>
              <span className="text-[11px] font-medium text-slate-500">
                Assigned: {userProfile.semestersTaught?.map(s => `${s}th`).join(', ') || 'All'}
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {semestersList.map((sem) => {
                const isSelected = selectedSemester === sem;
                const isTaughtByTeacher = userProfile.semestersTaught?.includes(sem);
                return (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setSelectedSemester(sem)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all relative ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isTaughtByTeacher
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/70'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                    }`}
                  >
                    <span>{sem}th</span>
                    {isTaughtByTeacher && !isSelected && (
                      <span className="block text-[8px] text-blue-600 font-normal">Assigned</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* College, Department, Shift, Section row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            <SearchableCollegeSelect
              value={selectedCollege}
              onChange={(name) => setSelectedCollege(name)}
              label="2. Polytechnic Institution"
            />
            <SearchableDepartmentSelect
              value={selectedDept}
              onChange={(name) => setSelectedDept(name)}
              label="3. Academic Department"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                4. Shift (Morning / Day)
              </label>
              <div className="flex rounded-xl bg-slate-100 p-0.5">
                {shiftsList.map(sh => (
                  <button
                    key={sh}
                    type="button"
                    onClick={() => setSelectedShift(sh)}
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors ${
                      selectedShift === sh
                        ? 'bg-surface text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {sh} Shift
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
                    className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors ${
                      selectedSection === sec
                        ? 'bg-surface text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Current Cohort Summary Bar */}
          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-primary">Active Cohort:</span>
              <span className="font-bold text-blue-600">
                Semester {selectedSemester} · {selectedShift} Shift · Section {selectedSection}
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-600">
              <span>Verified Captains: <strong className="text-teal-700">{currentVerifiedCount} / 2</strong></span>
              <span>Enrolled Students: <strong className="text-blue-700">{cohortStudents.length}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 0: TEACHER ATTENDANCE MANAGEMENT */}
      {activeTab === 'attendance' && (
        !isFacultyVerified ? (
          <div className="bg-surface rounded-2xl border border-amber-200 p-8 text-center space-y-2 shadow-xs">
            <Lock className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-sm font-bold text-text-primary">
              Faculty Verification Required for Attendance Management
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Only verified teachers can create attendance sheets, upload roster files, or modify official class attendance registers.
            </p>
          </div>
        ) : (
          <TeacherAttendanceSection
            selectedCollege={selectedCollege}
            setSelectedCollege={setSelectedCollege}
            selectedDept={selectedDept}
            setSelectedDept={setSelectedDept}
            selectedSemester={selectedSemester}
            setSelectedSemester={setSelectedSemester}
            selectedShift={selectedShift}
            setSelectedShift={setSelectedShift}
            selectedSection={selectedSection}
            setSelectedSection={setSelectedSection}
          />
        )
      )}

      {/* TAB 1: CAPTAIN VERIFICATION APPROVALS */}
      {activeTab === 'verifications' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-text-primary">
                Class Captain Verification Requests
              </h2>
              <p className="text-[11px] text-slate-500">
                Semester {selectedSemester} · {selectedShift} Shift · Section {selectedSection} (Max 2 verified captains)
              </p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-1 rounded-lg border border-blue-200">
              {cohortApplications.length} Application{cohortApplications.length !== 1 ? 's' : ''}
            </span>
          </div>

          {cohortApplications.length === 0 ? (
            <div className="bg-surface rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
              <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-text-primary">No Captain Applications for this Section</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No students in Semester {selectedSemester} (Shift {selectedShift}, Sec {selectedSection}) have submitted Class Captain applications.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cohortApplications.map((app) => (
                <div
                  key={app.id}
                  className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-text-primary">{app.studentName}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          app.status === 'Approved'
                            ? 'bg-teal-100 text-teal-800'
                            : app.status === 'Rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {app.status === 'Approved' ? '★ Verified Captain' : app.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-mono">
                        Board Roll: {app.boardRoll} · Reg: {app.regNumber} · Phone: {app.phone}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Applied: {app.appliedAt}
                      </p>
                    </div>

                    {/* View Uploaded Form — direct requests have no form attached */}
                    {app.verificationFormUrl || app.verificationFormName ? (
                      <button
                        type="button"
                        onClick={() => setSelectedFormApp(app)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>View Form</span>
                      </button>
                    ) : (
                      <span className="px-2.5 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-[11px] font-bold border border-teal-200 shrink-0">
                        Direct request
                      </span>
                    )}
                  </div>

                  {/* Endorsement information if already endorsed */}
                  {app.teacherEndorsement && (
                    <div className="bg-teal-50 border border-teal-200/80 rounded-xl p-2.5 text-xs text-teal-900 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                          Endorsed by {app.teacherEndorsement.teacherName}
                        </span>
                        <span className="text-[10px] text-teal-700">{app.teacherEndorsement.endorsedAt}</span>
                      </div>
                      <p className="text-[11px] text-teal-800 italic">
                        "{app.teacherEndorsement.comments}"
                      </p>
                    </div>
                  )}

                  {/* Rejection reason if rejected */}
                  {app.status === 'Rejected' && app.rejectionReason && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-900">
                      <span className="font-bold block">Rejection Reason:</span>
                      <p className="text-[11px] text-rose-800">{app.rejectionReason}</p>
                    </div>
                  )}

                  {/* Action Buttons for Pending application */}
                  {app.status === 'Pending' && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActionApp({ app, action: 'reject' });
                          setActionComment('');
                          setTeacherPinInput('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        disabled={!isFacultyVerified}
                        onClick={() => {
                          setActionApp({ app, action: 'approve' });
                          setActionComment('Endorsed as official student Class Captain.');
                          setTeacherPinInput('');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer ${
                          isFacultyVerified
                            ? 'bg-teal-600 hover:bg-teal-700 text-white'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                        title={!isFacultyVerified ? 'Requires Administrator Verification First' : 'Endorse with PIN'}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verify & Approve (PIN)</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STUDENT ROSTER (ROLE-BASED ACCESS CONTROL) */}
      {activeTab === 'roster' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-600" />
                <span>Confidential Student Directory (RBAC)</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Board Roll and Registration numbers restricted to authorized faculty
              </p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search name or roll..."
                value={searchRosterQuery}
                onChange={(e) => setSearchRosterQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-surface border border-slate-200 rounded-xl text-xs w-full sm:w-56 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Class Roll</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3 font-mono">BTEB Board Roll</th>
                    <th className="py-2.5 px-3 font-mono">Reg Number</th>
                    <th className="py-2.5 px-3">Attendance</th>
                    <th className="py-2.5 px-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRoster.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No enrolled students matching criteria for Semester {selectedSemester} Sec {selectedSection}.
                      </td>
                    </tr>
                  ) : (
                    filteredRoster.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">
                          {st.classRoll}
                        </td>
                        <td className="py-2 px-3 font-semibold text-text-primary">
                          {st.name}
                        </td>
                        <td className="py-2 px-3 font-mono text-blue-700 bg-blue-50/40 font-semibold">
                          {st.boardRoll}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {st.regNumber}
                        </td>
                        <td className="py-2 px-3 font-bold text-green-600">
                          {st.attendanceRate}
                        </td>
                        <td className="py-2 px-3">
                          {st.accountType === 'class_captain' ? (
                            <span className="inline-flex items-center gap-1 bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <ShieldCheck className="w-3 h-3" />
                              Class Captain
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-medium">Student</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FACULTY ACTIONS */}
      {activeTab === 'curriculum' && (
        <div className="space-y-3">
          <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-600" />
              <span>Academic Management & Announcements</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActiveScreen('bteb_results')}
                className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100/70 text-left transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-brand-teal text-white flex items-center justify-center mb-2 shadow-xs">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-text-primary">BTEB Results & Group Analytics</h3>
              </button>

              <button
                type="button"
                onClick={() => setShowNoticeModal(true)}
                className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 text-left transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs">
                  <Megaphone className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-text-primary">Post Official Notice</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Broadcast urgent class schedule update</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveScreen('routine')}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-surface text-left transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-text-primary">Class Timetable</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Review and adjust period schedules</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveScreen('notes')}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 bg-surface text-left transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center mb-2">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-text-primary">Study Notes & Labs</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Publish lecture slides and job sheets</p>
              </button>

              <button
                type="button"
                onClick={() => setActiveScreen('book_list')}
                className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/70 text-left transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-2 shadow-xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-text-primary">Book List & BTEB Subject Catalog</h3>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Browse official subject codes, names, marks, and verification statuses by Technology, Regulation (2016 / 2022), and Semester (1–8)
                </p>
              </button>

              <button
                type="button"
                onClick={() => setActiveScreen('semester')}
                className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 text-left transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center mb-2 shadow-xs">
                  <Award className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold text-text-primary">Semester GPA / CGPA Calculator</h3>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: VIEW UPLOADED SIGNED VERIFICATION FORM */}
      {selectedFormApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Verification Form Document
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedFormApp.studentName} · Board Roll {selectedFormApp.boardRoll}
                </p>
              </div>
              <button
                onClick={() => setSelectedFormApp(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 mx-auto flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-text-primary">
                  {selectedFormApp.verificationFormName || 'BTEB_Captain_Signed_Form.pdf'}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Institutional Class Teacher Signed Clearance
                </p>
              </div>

              <div className="p-3 bg-surface rounded-lg border border-slate-200 text-left text-xs space-y-1 font-mono text-slate-700">
                <p><strong>Applicant:</strong> {selectedFormApp.studentName}</p>
                <p><strong>Department:</strong> {selectedFormApp.department}</p>
                <p><strong>Semester / Shift:</strong> Semester {selectedFormApp.semester} ({selectedFormApp.shift} Shift)</p>
                <p><strong>Section:</strong> {selectedFormApp.section}</p>
                <p><strong>Submitted:</strong> {selectedFormApp.appliedAt}</p>
              </div>

              <p className="text-[11px] text-slate-400">
                ★ Verification Notice: Uploaded document has been cross-checked with institutional admission registry.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedFormApp(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
              >
                Close Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ENDORSE / REJECT WITH SECURITY PIN */}
      {actionApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                  actionApp.action === 'approve' ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {actionApp.action === 'approve' ? <ShieldCheck className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    {actionApp.action === 'approve' ? 'Verify & Endorse Class Captain' : 'Reject Captain Application'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Applicant: {actionApp.app.studentName} (Sec {actionApp.app.section})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActionApp(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAction} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  {actionApp.action === 'approve' ? 'Endorsement Remarks' : 'Rejection Reason *'}
                </label>
                <textarea
                  rows={2}
                  required={actionApp.action === 'reject'}
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder={actionApp.action === 'approve' ? 'Recommended for Class Captain role...' : 'State why application is rejected...'}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Security PIN requirement */}
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1 flex items-center justify-between">
                  <span>Enter Faculty Security PIN *</span>
                  <span className="text-[10px] text-slate-400 font-mono">PBKDF2 Secured</span>
                </label>
                <input
                  type="password"
                  required
                  maxLength={8}
                  placeholder="Enter your faculty PIN"
                  value={teacherPinInput}
                  onChange={(e) => setTeacherPinInput(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 tracking-widest font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Protects against unauthorized endorsements. Account locks for 15 minutes after 5 failed attempts.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmittingAction}
                  onClick={() => setActionApp(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition-colors ${
                    actionApp.action === 'approve'
                      ? 'bg-teal-600 hover:bg-teal-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmittingAction ? 'Verifying...' : actionApp.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: FACULTY PIN CHANGE */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Faculty Security PIN</h3>
                  <p className="text-[11px] text-slate-500">Update your confidential PIN</p>
                </div>
              </div>
              <button
                onClick={() => setShowPinModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {pinError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {pinError}
              </div>
            )}

            <form onSubmit={handleChangePinSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Current PIN</label>
                <input
                  type="password"
                  required
                  placeholder="Enter current PIN"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">New PIN (4–6 digits)</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="Enter new PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Confirm New PIN</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new PIN"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  Update PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: POST OFFICIAL FACULTY NOTICE */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Broadcast Faculty Notice</h3>
                  <p className="text-[11px] text-slate-500">Official Department Notice to students</p>
                </div>
              </div>
              <button
                onClick={() => setShowNoticeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePostFacultyNotice} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Notice Headline *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Practical Lab Exam Schedule Rescheduled"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">Notice Details *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Notice message"
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoticeModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
                >
                  Broadcast Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
