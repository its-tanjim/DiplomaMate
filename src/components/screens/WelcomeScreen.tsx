import { apiFetch } from '../../services/apiClient';
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  POLYTECHNIC_COLLEGES,
  DEPARTMENTS,
  SESSIONS
} from '../../data/mockData';
import { 
  AccountType, 
  Shift, 
  Section, 
  SemesterNumber, 
  StudentProfile,
  CatalogRegulation,
  AcademicCommunity
} from '../../types';
import { SearchableCollegeSelect } from '../common/SearchableCollegeSelect';
import { SearchableDepartmentSelect } from '../common/SearchableDepartmentSelect';
import { CatalogSubjectSelect } from '../common/CatalogSubjectSelect';

import { 
  GraduationCap, 
  ShieldCheck, 
  UserCheck, 
  UserPlus, 
  Key, 
  Phone, 
  Mail, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Lock,
  Building,
  ArrowRight,
  Users
} from 'lucide-react';

const BANGLA_DIGIT_MAP: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
};

const normalizeDigits = (val: string): string =>
  String(val || '')
    .trim()
    .replace(/[০-৯]/g, ch => BANGLA_DIGIT_MAP[ch] ?? ch)
    .replace(/[\s\-_]+/g, '');

export const WelcomeScreen: React.FC = () => {
  const { login, authenticateStudent, teacherLogin, teacherRegister, setActiveScreen, showToast } = useApp();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [selectedRole, setSelectedRole] = useState<AccountType>('student');

  // Sign In Form State
  const [signInRoll, setSignInRoll] = useState('');
  const [signInReg, setSignInReg] = useState('');
  const [teacherPhoneOrEmail, setTeacherPhoneOrEmail] = useState('');
  const [teacherPin, setTeacherPin] = useState('');
  const [signInError, setSignInError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Student / Captain Sign Up Form State
  const [signUpData, setSignUpData] = useState<Partial<StudentProfile>>({
    name: '',
    email: '',
    college: POLYTECHNIC_COLLEGES[0],
    department: DEPARTMENTS[0],
    boardRoll: '',
    regNumber: '',
    semester: 6,
    section: 'A1',
    shift: 'Morning',
    session: '2022-2023',
    accountType: 'student',
    phone: ''
  });

  // Teacher Sign Up Form State
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPhone, setTeacherPhone] = useState('');
  const [teacherCollege, setTeacherCollege] = useState(POLYTECHNIC_COLLEGES[0]);
  const [teacherDepartment, setTeacherDepartment] = useState(DEPARTMENTS[0]);
  const [teacherDesignation, setTeacherDesignation] = useState('Senior Instructor & Guide Teacher');
  const [teacherShift, setTeacherShift] = useState<Shift | 'Both'>('Morning');
  const [teacherSemesters, setTeacherSemesters] = useState<SemesterNumber[]>([5, 6]);
  const [teacherRegulation, setTeacherRegulation] = useState<CatalogRegulation>('2022');
  const [teacherSubjectsList, setTeacherSubjectsList] = useState<string[]>(['66662 — Microprocessor & Interfacing']);
  const [teacherNewPin, setTeacherNewPin] = useState('');
  const [teacherConfirmPin, setTeacherConfirmPin] = useState('');

  // New Student Onboarding State
  const [onboardingProfile, setOnboardingProfile] = useState<StudentProfile | null>(null);
  const [recommendedCommunities, setRecommendedCommunities] = useState<AcademicCommunity[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [joinedCommunityIds, setJoinedCommunityIds] = useState<string[]>([]);

  const designationOptions = [
    'Chief Instructor & Head of Dept',
    'Senior Instructor & Guide Teacher',
    'Senior Instructor',
    'Instructor (Tech)',
    'Junior Instructor',
    'Workshop Superintendent',
    'Guest Lecturer'
  ];

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError('');
    setIsSubmitting(true);

    try {
      if (selectedRole === 'teacher') {
        if (!teacherPhoneOrEmail.trim() || !teacherPin.trim()) {
          setSignInError('Please enter both your registered Phone/Email and Security PIN.');
          return;
        }

        const res = await teacherLogin(teacherPhoneOrEmail.trim(), teacherPin.trim());
        if (!res.success) {
          setSignInError(res.message);
        }
      } else {
        const cleanRoll = normalizeDigits(signInRoll);
        const cleanReg = normalizeDigits(signInReg);
        if (!cleanRoll || !cleanReg) {
          setSignInError('Please enter both Board Roll and Registration Number.');
          return;
        }
        if (!/^\d{4,8}$/.test(cleanRoll)) {
          setSignInError('Board Roll must be a valid 4 to 8 digit number.');
          return;
        }
        if (selectedRole !== 'student' && selectedRole !== 'class_captain') {
          setSignInError('Select a student account type to continue.');
          return;
        }

        const result = await authenticateStudent(cleanRoll, cleanReg, selectedRole);
        if (!result.success) {
          setSignInError(result.message);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError('');
    setIsSubmitting(true);

    try {
      if (selectedRole === 'teacher') {
        if (!teacherName.trim() || !teacherPhone.trim() || !teacherNewPin.trim()) {
          setSignInError('Please fill in Full Name, Phone Number, and Security PIN.');
          return;
        }

        if (teacherNewPin !== teacherConfirmPin) {
          setSignInError('PIN confirmation does not match.');
          return;
        }

        if (teacherNewPin.length < 4 || teacherNewPin.length > 8) {
          setSignInError('PIN must be 4 to 8 digits.');
          return;
        }

        if (teacherSemesters.length === 0) {
          setSignInError('Please select at least one semester you teach.');
          return;
        }

        const subjectsArray = teacherSubjectsList
          .map(s => s.trim())
          .filter(Boolean);

        const res = await teacherRegister({
          name: teacherName.trim(),
          email: teacherEmail.trim(),
          phone: teacherPhone.trim(),
          college: teacherCollege,
          department: teacherDepartment,
          regulation: teacherRegulation,
          designation: teacherDesignation,
          teachingSubjects: subjectsArray.length > 0 ? subjectsArray : ['Department Core Subject'],
          semestersTaught: teacherSemesters,
          shift: teacherShift,
          pin: teacherNewPin.trim()
        });

        if (!res.success) {
          setSignInError(res.message);
        } else {
          setTab('signin');
          setTeacherPhoneOrEmail(teacherPhone.trim());
          setTeacherPin('');
          showToast('Registration submitted. Sign in after an administrator approves your account.');
        }
      } else {
        const cleanRoll = normalizeDigits(signUpData.boardRoll || '');
        const cleanReg = normalizeDigits(signUpData.regNumber || '');
        if (!signUpData.name?.trim() || !cleanRoll || !cleanReg) {
          setSignInError('Please fill in your Name, Board Roll, and Registration Number.');
          return;
        }
        if (!/^\d{4,8}$/.test(cleanRoll)) {
          setSignInError('Board Roll must be a valid 4 to 8 digit number.');
          return;
        }

        let newProfile: StudentProfile = {
          id: `std_${Date.now()}`,
          name: signUpData.name.trim(),
          email: signUpData.email?.trim() || 'student@polytechnic.edu.bd',
          college: signUpData.college || POLYTECHNIC_COLLEGES[0],
          department: signUpData.department || DEPARTMENTS[0],
          boardRoll: cleanRoll,
          regNumber: cleanReg,
          semester: (signUpData.semester || 1) as SemesterNumber,
          section: (signUpData.section || 'A1') as Section,
          shift: (signUpData.shift || 'Morning') as Shift,
          session: signUpData.session || '2023-2024',
          accountType: selectedRole === 'class_captain' ? 'class_captain' : 'student',
          captainVerificationStatus: selectedRole === 'class_captain' ? 'Pending' : 'NotApplied',
          isTeacherContactUnlocked: false,
          phone: signUpData.phone || '+880 1700-000000'
        };

        try {
          const response = await apiFetch('/api/students/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newProfile)
          });
          const data = await response.json();
          if (!response.ok || !data.success || !data.account) {
            setSignInError(data.error || 'Could not create your account.');
            return;
          }
          newProfile = {
            ...newProfile,
            id: data.account.id,
            captainVerificationStatus: data.account.captainVerificationStatus
          };

          const savedRaw = localStorage.getItem('diplomamate_registered_students');
          const savedList: StudentProfile[] = savedRaw ? JSON.parse(savedRaw) : [];
          const filtered = savedList.filter(s => normalizeDigits(s.boardRoll) !== cleanRoll);
          filtered.unshift(newProfile);
          localStorage.setItem('diplomamate_registered_students', JSON.stringify(filtered));
        } catch (error) {
          console.error('Student registration failed:', error);
          setSignInError('Could not connect to the account service. Please try again.');
          return;
        }

        // Trigger new student onboarding flow with cohort recommendations
        setOnboardingProfile(newProfile);
        setLoadingRecommendations(true);
        try {
          const q = new URLSearchParams({
            college: newProfile.college,
            department: newProfile.department,
            semester: String(newProfile.semester),
            shift: newProfile.shift,
            section: newProfile.section
          });
          const res = await apiFetch(`/api/communities/recommended?${q.toString()}`);
          const d = await res.json();
          if (d.success && Array.isArray(d.recommendedCommunities)) {
            setRecommendedCommunities(d.recommendedCommunities);
          }
        } catch {
          // proceed with fallback
        } finally {
          setLoadingRecommendations(false);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOnboardingJoinCommunity = async (comm: AcademicCommunity) => {
    if (!onboardingProfile) return;
    try {
      const sessionRes = await apiFetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: onboardingProfile.id,
          role: onboardingProfile.accountType,
          name: onboardingProfile.name,
          email: onboardingProfile.email,
          college: onboardingProfile.college,
          department: onboardingProfile.department,
          boardRoll: onboardingProfile.boardRoll,
          regNumber: onboardingProfile.regNumber,
          semester: onboardingProfile.semester,
          shift: onboardingProfile.shift,
          section: onboardingProfile.section
        })
      });
      const sessionData = await sessionRes.json();
      const token = sessionData.sessionToken;

      const res = await apiFetch(`/api/communities/${comm.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const d = await res.json();
      if (d.success) {
        setJoinedCommunityIds(prev => [...prev, comm.id]);
      }
    } catch {
      // ignore
    }
  };

  const handleFinishOnboarding = async () => {
    if (onboardingProfile) {
      const result = await login(onboardingProfile);
      if (!result.success) {
        showToast(result.message);
        return;
      }
      if (joinedCommunityIds.length > 0) {
        setActiveScreen('community');
      }
    }
  };

  const toggleTeacherSemester = (sem: SemesterNumber) => {
    setTeacherSemesters(prev => 
      prev.includes(sem) ? prev.filter(s => s !== sem) : [...prev, sem].sort((a, b) => a - b)
    );
  };

  if (onboardingProfile) {
    return (
      <div className="min-h-screen bg-app-bg flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-lg">
          <div className="bg-surface rounded-2xl shadow-xl border border-slate-200/90 p-5 sm:p-6 space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 mb-2">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-text-primary">
                Welcome, {onboardingProfile.name}!
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Your academic profile is verified for:
              </p>
              <div className="inline-flex flex-wrap items-center justify-center gap-1.5 text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200/80 rounded-xl px-3 py-1.5 mt-2">
                <span>{onboardingProfile.college}</span>
                <span>·</span>
                <span>{onboardingProfile.department}</span>
                <span>·</span>
                <span>Sem {onboardingProfile.semester} ({onboardingProfile.shift} Shift)</span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Recommended Academic Communities
                </h3>
                <span className="text-[11px] text-teal-600 font-semibold">Cohort Verified</span>
              </div>

              {loadingRecommendations ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>Finding your cohort study groups...</span>
                </div>
              ) : recommendedCommunities.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-center space-y-1.5">
                  <p className="text-xs font-bold text-slate-700">No active groups created yet for your cohort</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Groups are created dynamically when your Class Captain or Department Teacher sets one up for Semester {onboardingProfile.semester}. You can always join from the Community Hub anytime!
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recommendedCommunities.map((comm) => {
                    const isJoined = joinedCommunityIds.includes(comm.id);
                    return (
                      <div
                        key={comm.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 truncate">{comm.name}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {comm.member_count} members · Created by {comm.created_by_name} ({comm.created_by_role === 'teacher' ? 'Faculty' : 'CR'})
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOnboardingJoinCommunity(comm)}
                          disabled={isJoined}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                            isJoined
                              ? 'bg-teal-100 text-teal-800 cursor-default'
                              : 'bg-brand-blue hover:bg-blue-700 text-white cursor-pointer shadow-xs'
                          }`}
                        >
                          {isJoined ? '✓ Joined' : 'Join Group'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleFinishOnboarding}
                className="w-full py-2.5 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>{joinedCommunityIds.length > 0 ? 'Enter Community Hub' : 'Proceed to Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* App Logo & Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-blue text-white shadow-md shadow-blue-500/20 mb-3">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            DiplomaMate
          </h1>
          <p className="mt-1 text-sm text-slate-600 font-normal">
            BTEB Diploma Engineering Academic System
          </p>
        </div>

        {/* Main Card */}
        <div className="mt-5 bg-surface rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6">
          {/* Sign In vs Sign Up Tabs */}
          <div className="flex rounded-lg bg-slate-100 p-1 mb-4">
            <button
              type="button"
              onClick={() => { setTab('signin'); setSignInError(''); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                tab === 'signin'
                  ? 'bg-surface text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setTab('signup'); setSignInError(''); }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                tab === 'signup'
                  ? 'bg-surface text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Role Selection Segmented Control */}
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
              Account Type:
            </label>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => { setSelectedRole('student'); setSignInError(''); }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  selectedRole === 'student'
                    ? 'bg-surface text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Student</span>
              </button>

              <button
                type="button"
                onClick={() => { setSelectedRole('class_captain'); setSignInError(''); }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  selectedRole === 'class_captain'
                    ? 'bg-surface text-teal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Captain</span>
              </button>

              <button
                type="button"
                onClick={() => { setSelectedRole('teacher'); setSignInError(''); }}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  selectedRole === 'teacher'
                    ? 'bg-surface text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Teacher</span>
              </button>
            </div>
          </div>

          {signInError && (
            <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{signInError}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {tab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-3.5">
              {selectedRole === 'teacher' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">
                      Faculty Phone Number or Institutional Email
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="+880 1819-334455 or teacher@dpi.gov.bd"
                      value={teacherPhoneOrEmail}
                      onChange={(e) => setTeacherPhoneOrEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1 flex items-center justify-between">
                      <span>Faculty Security PIN</span>
                    </label>
                    <input
                      type="password"
                      required
                      maxLength={8}
                      placeholder="Enter 4-8 digit PIN"
                      value={teacherPin}
                      onChange={(e) => setTeacherPin(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 tracking-widest font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 bg-blue-50/60 border border-blue-100 p-2 rounded-xl">
                    Institutional faculty PIN is salt-hashed on the server with 5-attempt rate-limiting lockout.
                  </p>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">
                      BTEB Board Roll Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your Board Roll Number"
                      value={signInRoll}
                      onChange={(e) => setSignInRoll(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter your Registration Number"
                      value={signInReg}
                      onChange={(e) => setSignInReg(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {selectedRole === 'class_captain' && (
                    <p className="text-[11px] text-teal-700 bg-teal-50/70 border border-teal-200 p-2 rounded-xl">
                      ★ Class Captain login requires prior Guide Teacher and administrator verification.
                    </p>
                  )}
                </>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedRole === 'teacher'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : selectedRole === 'class_captain'
                      ? 'bg-teal-600 hover:bg-teal-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <span>{isSubmitting ? 'Authenticating...' : `Sign In as ${selectedRole === 'teacher' ? 'Teacher' : selectedRole === 'class_captain' ? 'Class Captain' : 'Student'}`}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* SIGN UP FORM */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3">
              {selectedRole === 'teacher' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">Full Name (with Title) *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Engr. Md. Mahbubur Rahman"
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">Phone Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="+880 1711-223344"
                        value={teacherPhone}
                        onChange={(e) => setTeacherPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">Official Email</label>
                      <input
                        type="email"
                        placeholder="teacher@dpi.gov.bd"
                        value={teacherEmail}
                        onChange={(e) => setTeacherEmail(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                      />
                    </div>
                  </div>

                  <SearchableCollegeSelect
                    value={teacherCollege}
                    onChange={(name) => setTeacherCollege(name)}
                    label="Polytechnic Institute"
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <SearchableDepartmentSelect
                      value={teacherDepartment}
                      onChange={(name) => setTeacherDepartment(name)}
                      label="Department"
                      required
                    />
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1.5">Designation</label>
                      <select
                        value={teacherDesignation}
                        onChange={(e) => setTeacherDesignation(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                      >
                        {designationOptions.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>


                  {/* Semesters Taught (Multi-select 1-8) & Regulation */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-text-primary mb-1">
                        Semesters Taught (1–8):
                      </label>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
                        {([1, 2, 3, 4, 5, 6, 7, 8] as SemesterNumber[]).map(sem => {
                          const isChecked = teacherSemesters.includes(sem);
                          return (
                            <button
                              key={sem}
                              type="button"
                              onClick={() => toggleTeacherSemester(sem)}
                              className={`py-1 text-xs font-bold rounded-lg border transition-colors ${
                                isChecked
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {sem}th
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">
                        Regulation
                      </label>
                      <select
                        value={teacherRegulation}
                        onChange={(e) => setTeacherRegulation(e.target.value as CatalogRegulation)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold"
                      >
                        <option value="2022">Probidhan 2022</option>
                        <option value="2016">Probidhan 2016</option>
                      </select>
                    </div>
                  </div>

                  {/* Teaching Subjects from Central Catalog */}
                  <div>
                    <CatalogSubjectSelect
                      technology={teacherDepartment}
                      regulation={teacherRegulation}
                      onRegulationChange={(reg) => setTeacherRegulation(reg)}
                      showRegulationSelector={false}
                      semester={teacherSemesters}
                      isMulti={true}
                      selectedSubjects={teacherSubjectsList}
                      onMultiSelect={(vals) => setTeacherSubjectsList(vals)}
                      label="Teaching Subjects (Central Catalog Suggestions)"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">Assigned Shift</label>
                    <select
                      value={teacherShift}
                      onChange={(e) => setTeacherShift(e.target.value as Shift | 'Both')}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                    >
                      <option value="Morning">Morning Shift</option>
                      <option value="Day">Day Shift</option>
                      <option value="Both">Both Shifts (Morning & Day)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">Security PIN (4-8 digits) *</label>
                      <input
                        type="password"
                        required
                        maxLength={8}
                        placeholder="Enter your PIN"
                        value={teacherNewPin}
                        onChange={(e) => setTeacherNewPin(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">Confirm PIN *</label>
                      <input
                        type="password"
                        required
                        maxLength={8}
                        placeholder="Re-enter PIN"
                        value={teacherConfirmPin}
                        onChange={(e) => setTeacherConfirmPin(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-center font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Institutional Verification Notice:
                    </p>
                    <p>
                      Teacher accounts are registered with <strong>Pending Verification</strong> status. You can sign in immediately, but an Academic Administrator must verify your credentials before you can approve Class Captain applications.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">Student Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tanvir Ahmed"
                      value={signUpData.name}
                      onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">Board Roll *</label>
                      <input
                        type="text"
                        required
                        placeholder="Enter your Board Roll"
                        value={signUpData.boardRoll}
                        onChange={(e) => setSignUpData({ ...signUpData, boardRoll: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">Registration No *</label>
                      <input
                        type="text"
                        required
                        placeholder="Enter your Registration Number"
                        value={signUpData.regNumber}
                        onChange={(e) => setSignUpData({ ...signUpData, regNumber: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  <SearchableCollegeSelect
                    value={signUpData.college || ''}
                    onChange={(name) => setSignUpData({ ...signUpData, college: name })}
                    label="Polytechnic Institute"
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <SearchableDepartmentSelect
                      value={signUpData.department || ''}
                      onChange={(name) => setSignUpData({ ...signUpData, department: name })}
                      label="Department"
                      required
                    />
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1.5">Semester</label>
                      <select
                        value={signUpData.semester}
                        onChange={(e) => setSignUpData({ ...signUpData, semester: Number(e.target.value) as SemesterNumber })}
                        className="w-full px-2.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">Shift</label>
                      <select
                        value={signUpData.shift}
                        onChange={(e) => setSignUpData({ ...signUpData, shift: e.target.value as Shift })}
                        className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                      >
                        <option value="Morning">Morning</option>
                        <option value="Day">Day</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">Section</label>
                      <select
                        value={signUpData.section}
                        onChange={(e) => setSignUpData({ ...signUpData, section: e.target.value as Section })}
                        className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                      >
                        <option value="A1">A1</option>
                        <option value="A2">A2</option>
                        <option value="B1">B1</option>
                        <option value="B2">B2</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">Session</label>
                      <select
                        value={signUpData.session}
                        onChange={(e) => setSignUpData({ ...signUpData, session: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                      >
                        {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  {selectedRole === 'class_captain' && (
                    <div className="p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-[11px] space-y-1">
                      <p className="font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                        Class Captain Registration:
                      </p>
                      <p>
                        Your account will start with "Pending" status until verified by your guide teacher and academic admin (max 2 captains per section).
                      </p>
                    </div>
                  )}
                </>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedRole === 'teacher'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : selectedRole === 'class_captain'
                      ? 'bg-teal-600 hover:bg-teal-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <span>{isSubmitting ? 'Registering...' : `Complete ${selectedRole === 'teacher' ? 'Teacher' : selectedRole === 'class_captain' ? 'Captain' : 'Student'} Registration`}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* Dedicated System Administrator Sign-In Link (Separate from public registration) */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Central Academic Authority</span>
            <button
              type="button"
              onClick={() => setActiveScreen('admin_login')}
              className="font-semibold text-slate-600 hover:text-text-primary inline-flex items-center gap-1 cursor-pointer"
            >
              <Lock className="w-3 h-3" />
              <span>System Administrator Sign In →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
