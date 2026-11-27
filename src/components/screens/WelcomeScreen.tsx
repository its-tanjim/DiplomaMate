import { apiFetch } from '../../services/apiClient';
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { LiquidFillLoader } from '../LiquidFillLoader';
import { TurnstileWidget, isTurnstileEnabled } from '../TurnstileWidget';
import {
  renderGoogleButton,
  signInWithFacebook,
  isGoogleSignInEnabled,
  isFacebookSignInEnabled
} from '../../services/socialAuth';
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
  Building,
  ArrowRight,
  Users,
  Smartphone,
  Facebook
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

// Small "Privacy Policy · Terms of Service" link row shown near the
// sign-in and sign-up submit buttons.
const LegalLinks: React.FC = () => {
  const { setActiveScreen } = useApp();
  const { lang } = useLanguage();
  const bn = lang === 'bn';
  return (
    <p className="text-center text-[11px] text-slate-500">
      {bn ? 'ব্যবহার করে আপনি আমাদের ' : 'By using DiplomaMate you agree to our '}
      <button
        type="button"
        onClick={() => setActiveScreen('privacy_policy')}
        className="font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-1 cursor-pointer"
      >
        {bn ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}
      </button>
      {bn ? ' ও ' : ' and '}
      <button
        type="button"
        onClick={() => setActiveScreen('terms')}
        className="font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-1 cursor-pointer"
      >
        {bn ? 'সেবার শর্তাবলি' : 'Terms of Service'}
      </button>
      {bn ? ' মেনে নিচ্ছেন।' : '.'}
    </p>
  );
};
const CONSENT_VERSION = '2026-11-26';

const ConsentCheckbox: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => {
  const { setActiveScreen } = useApp();
  const { lang } = useLanguage();
  const bn = lang === 'bn';
  return (
    <label className="flex w-full items-start gap-2 text-[11px] leading-relaxed text-slate-600 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 shrink-0 accent-blue-600 cursor-pointer"
      />
      <span className="min-w-0 flex-1 break-words">
        {bn ? 'আমি ' : 'I agree to the '}
        <button
          type="button"
          onClick={() => setActiveScreen('privacy_policy')}
          className="font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-1 cursor-pointer"
        >
          {bn ? 'গোপনীয়তা নীতি' : 'Privacy Policy'}
        </button>
        {bn ? ' এবং ' : ' and '}
        <button
          type="button"
          onClick={() => setActiveScreen('terms')}
          className="font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-1 cursor-pointer"
        >
          {bn ? 'সেবার শর্তাবলি' : 'Terms of Service'}
        </button>
        {bn ? 'তে রাজি আছি।' : '.'}
      </span>
    </label>
  );
};

export const WelcomeScreen: React.FC = () => {
  const {
    login,
    authenticateStudent,
    verifySmsCode,
    resendSmsCode,
    socialLogin,
    teacherLogin,
    teacherRegister,
    setActiveScreen,
    showToast
  } = useApp();
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [selectedRole, setSelectedRole] = useState<AccountType>('student');

  // Sign In Form State
  const [signInRoll, setSignInRoll] = useState('');
  const [signInPin, setSignInPin] = useState('');
  const [teacherPhoneOrEmail, setTeacherPhoneOrEmail] = useState('');
  const [teacherPin, setTeacherPin] = useState('');
  const [signInError, setSignInError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // SMS code verification step (when SMS_VERIFICATION_ENABLED on the server)
  const [smsChallenge, setSmsChallenge] = useState<{ id: string; maskedPhone?: string; name?: string } | null>(null);
  const [smsCode, setSmsCode] = useState('');

  // Turnstile CAPTCHA proof (only rendered when a site key is configured)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);
  const turnstileProof = { token: turnstileToken, enabled: isTurnstileEnabled };
  const resetTurnstile = () => {
    setTurnstileToken(null);
    setTurnstileKey(k => k + 1);
  };

  // Social sign-in (buttons only render when the client ids are configured)
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [socialLoading, setSocialLoading] = useState(false);

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
  const [signUpPin, setSignUpPin] = useState('');
  const [signUpConfirmPin, setSignUpConfirmPin] = useState('');
  // Privacy/terms consent — unchecked by default on BOTH sign-up forms.
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [teacherConsentAccepted, setTeacherConsentAccepted] = useState(false);

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
          setSignInError(t('welcome.errTeacherCredentials'));
          return;
        }

        const res = await teacherLogin(teacherPhoneOrEmail.trim(), teacherPin.trim(), turnstileProof);
        resetTurnstile();
        if (!res.success) {
          setSignInError(res.message);
        }
      } else {
        const cleanRoll = normalizeDigits(signInRoll);
        const cleanPin = normalizeDigits(signInPin);
        if (!cleanRoll || !cleanPin) {
          setSignInError(t('welcome.errRollPin'));
          return;
        }
        if (!/^\d{4,8}$/.test(cleanRoll)) {
          setSignInError(t('welcome.errRollInvalid'));
          return;
        }
        if (!/^\d{4,6}$/.test(cleanPin)) {
          setSignInError(t('welcome.errPinInvalid'));
          return;
        }
        if (selectedRole !== 'student' && selectedRole !== 'class_captain') {
          setSignInError(t('welcome.errSelectStudentType'));
          return;
        }

        const result = await authenticateStudent(cleanRoll, cleanPin, selectedRole, turnstileProof);
        resetTurnstile();
        if (result.requiresSmsVerification && result.smsChallengeId) {
          setSmsChallenge({
            id: result.smsChallengeId,
            maskedPhone: result.maskedPhone,
            name: result.name
          });
          setSmsCode('');
          return;
        }
        if (!result.success) {
          setSignInError(result.message);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // SMS code step (only shown when the server has SMS verification on).
  const handleSmsVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsChallenge) return;
    const code = normalizeDigits(smsCode);
    if (!/^\d{6}$/.test(code)) {
      setSignInError(t('welcome.errSmsCode'));
      return;
    }
    setSignInError('');
    setIsSubmitting(true);
    try {
      const result = await verifySmsCode(smsChallenge.id, code);
      if (!result.success) {
        setSignInError(result.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSmsResend = async () => {
    if (!smsChallenge) return;
    setSignInError('');
    const result = await resendSmsCode(smsChallenge.id);
    if (!result.success) {
      setSignInError(result.message);
    } else {
      showToast(t('welcome.smsResentToast'));
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook', token: string) => {
    setSignInError('');
    setSocialLoading(true);
    try {
      const role = selectedRole === 'class_captain' ? 'class_captain' : 'student';
      const result = await socialLogin(provider, token, role);
      if (!result.success) {
        setSignInError(result.message);
      }
    } finally {
      setSocialLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setSignInError('');
    setSocialLoading(true);
    try {
      const accessToken = await signInWithFacebook();
      const role = selectedRole === 'class_captain' ? 'class_captain' : 'student';
      const result = await socialLogin('facebook', accessToken, role);
      if (!result.success) {
        setSignInError(result.message);
      }
    } catch (err) {
      setSignInError(err instanceof Error ? err.message : t('welcome.errFacebookFailed'));
    } finally {
      setSocialLoading(false);
    }
  };

  // Render the official Google button when it is configured and visible.
  useEffect(() => {
    if (tab !== 'signin' || selectedRole === 'teacher' || !isGoogleSignInEnabled) return;
    const container = googleButtonRef.current;
    if (!container) return;
    let cancelled = false;
    container.innerHTML = '';
    renderGoogleButton(container, idToken => {
      if (cancelled) return;
      void handleSocialLogin('google', idToken);
    }).catch(err => {
      console.error('Google sign-in failed to load:', err);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedRole]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError('');
    setIsSubmitting(true);

    try {
      if (selectedRole === 'teacher') {
        if (!teacherName.trim() || !teacherPhone.trim() || !teacherNewPin.trim()) {
          setSignInError(t('welcome.errTeacherFields'));
          return;
        }

        if (teacherNewPin !== teacherConfirmPin) {
          setSignInError(t('welcome.errPinMismatch'));
          return;
        }

        if (!/^\d{4,6}$/.test(normalizeDigits(teacherNewPin))) {
          setSignInError(t('welcome.errPinInvalid'));
          return;
        }

        if (teacherSemesters.length === 0) {
          setSignInError(t('welcome.errNoSemester'));
          return;
        }

        if (!teacherConsentAccepted) {
          setSignInError(lang === 'bn'
            ? 'অ্যাকাউন্ট খুলতে গোপনীয়তা নীতি এবং সেবার শর্তাবলিতে রাজি হোন।'
            : 'Please agree to the Privacy Policy and Terms of Service to create an account.');
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
          pin: normalizeDigits(teacherNewPin),
          consentAccepted: true,
          consentVersion: CONSENT_VERSION
        }, turnstileProof);
        resetTurnstile();

        if (!res.success) {
          setSignInError(res.message);
        } else {
          setTab('signin');
          setTeacherPhoneOrEmail(teacherPhone.trim());
          setTeacherPin('');
          showToast(t('welcome.teacherRegisteredToast'));
        }
      } else {
        const cleanRoll = normalizeDigits(signUpData.boardRoll || '');
        const cleanReg = normalizeDigits(signUpData.regNumber || '');
        if (!signUpData.name?.trim() || !cleanRoll || !cleanReg) {
          setSignInError(t('welcome.errStudentFields'));
          return;
        }
        if (!/^\d{4,8}$/.test(cleanRoll)) {
          setSignInError(t('welcome.errRollInvalid'));
          return;
        }
        const cleanPin = normalizeDigits(signUpPin);
        if (!/^\d{4,6}$/.test(cleanPin)) {
          setSignInError(t('welcome.errChoosePin'));
          return;
        }
        if (cleanPin !== normalizeDigits(signUpConfirmPin)) {
          setSignInError(t('welcome.errPinMismatch'));
          return;
        }

        if (!consentAccepted) {
          setSignInError(lang === 'bn'
            ? 'অ্যাকাউন্ট খুলতে গোপনীয়তা নীতি এবং সেবার শর্তাবলিতে রাজি হোন।'
            : 'Please agree to the Privacy Policy and Terms of Service to create an account.');
          return;
        }

        let newProfile: StudentProfile = {
          id: `std_${Date.now()}`,
          name: signUpData.name.trim(),
          email: signUpData.email?.trim() || '',
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
          phone: signUpData.phone?.trim() || ''
        };

        try {
          const response = await apiFetch('/api/students/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...newProfile,
              pin: cleanPin,
              consentAccepted: true,
              consentVersion: CONSENT_VERSION,
              turnstileToken: turnstileToken || undefined,
              turnstileEnabled: isTurnstileEnabled
            })
          });
          resetTurnstile();
          const data = await response.json();
          if (!response.ok || !data.success || !data.account) {
            setSignInError(data.error || t('welcome.errCreateAccount'));
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
          setSignInError(t('welcome.errConnectService'));
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
          section: onboardingProfile.section,
          // AU1: no stored token exists yet at onboarding time (the user
          // has only just registered), so the fresh mint needs the PIN
          // they just chose — roll + reg number alone no longer suffice.
          pin: normalizeDigits(signUpPin)
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
      const result = await login(onboardingProfile, normalizeDigits(signUpPin));
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
          <div className="dm-card p-5 sm:p-6 space-y-5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 mb-2">
                <Users className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-text-primary">
                {t('welcome.onboardingWelcome')} {onboardingProfile.name}!
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {lang === 'bn' ? 'আপনার প্রোফাইল:' : 'Your profile:'}
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
                  {t('welcome.recommendedCommunities')}
                </h3>
                <span className="text-[11px] text-teal-600 font-semibold">{t('home.cohortVerified')}</span>
              </div>

              {loadingRecommendations ? (
                <div className="py-8 flex justify-center">
                  <LiquidFillLoader size={44} label={t('welcome.findingGroups')} />
                </div>
              ) : recommendedCommunities.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-center space-y-1.5">
                  <p className="text-xs font-bold text-slate-700">{t('welcome.noGroupsYet')}</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                    {t('welcome.noGroupsBodyPrefix')} {onboardingProfile.semester}{t('welcome.noGroupsBodySuffix')}
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
                            {comm.member_count} {t('welcome.members')} · {t('welcome.createdBy')} {comm.created_by_name} ({comm.created_by_role === 'teacher' ? t('welcome.facultyRole') : t('welcome.captainShort')})
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
                          {isJoined ? t('welcome.joined') : t('welcome.joinGroup')}
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
                <span>{joinedCommunityIds.length > 0 ? t('welcome.enterCommunityHub') : t('welcome.proceedDashboard')}</span>
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
        {/* App Logo & Header (the splash screen carries the big logo moment) */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white shadow-lg shadow-blue-500/20 mb-3 overflow-hidden">
            <img src="/diploma-mate-logo.png" alt="" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            DiplomaMate
          </h1>
        </div>

        {/* Main Card */}
        <div className="dm-card mt-6 p-5 sm:p-6">
          {/* Sign In vs Sign Up Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
            <button
              type="button"
              onClick={() => { setTab('signin'); setSignInError(''); }}
              className={`flex-1 min-h-11 py-2 text-sm font-bold rounded-lg transition-all ${
                tab === 'signin'
                  ? 'bg-surface text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('welcome.signInTitle')}
            </button>
            <button
              type="button"
              onClick={() => { setTab('signup'); setSignInError(''); }}
              className={`flex-1 min-h-11 py-2 text-sm font-bold rounded-lg transition-all ${
                tab === 'signup'
                  ? 'bg-surface text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('welcome.createAccountTitle')}
            </button>
          </div>

          {/* Role Selection Segmented Control */}
          <div className="mb-4">
            <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
              {t('welcome.accountType')}
            </label>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => { setSelectedRole('student'); setSignInError(''); }}
                className={`min-h-11 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  selectedRole === 'student'
                    ? 'bg-surface text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{t('welcome.student')}</span>
              </button>

              <button
                type="button"
                onClick={() => { setSelectedRole('class_captain'); setSignInError(''); }}
                className={`min-h-11 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  selectedRole === 'class_captain'
                    ? 'bg-surface text-teal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{t('welcome.captain')}</span>
              </button>

              <button
                type="button"
                onClick={() => { setSelectedRole('teacher'); setSignInError(''); }}
                className={`min-h-11 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                  selectedRole === 'teacher'
                    ? 'bg-surface text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{t('welcome.teacher')}</span>
              </button>
            </div>
          </div>

          {signInError && (
            <div role="alert" className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{signInError}</span>
            </div>
          )}

          {/* SIGN IN — Board Roll + PIN, with SMS-code and PIN-setup steps */}
          {tab === 'signin' && (
            <>
              {smsChallenge ? (
                <form onSubmit={handleSmsVerify} className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-center space-y-1">
                    <Smartphone className="w-5 h-5 text-blue-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-800">
                      {smsChallenge.name ? `${t('welcome.smsHi')} ${smsChallenge.name}, ${t('welcome.smsCodeSentLower')}` : t('welcome.smsCodeSent')}
                      {smsChallenge.maskedPhone ? ` ${t('welcome.smsTo')} ${smsChallenge.maskedPhone}` : ` ${t('welcome.smsToPhone')}`}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {t('welcome.smsCodeHint')}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">
                      {t('welcome.smsCodeLabel')}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      inputMode="numeric"
                      placeholder="• • • • • •"
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value)}
                      className="dm-field w-full px-3 py-2.5 text-sm text-slate-800 tracking-[0.5em] font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="dm-primary-action w-full py-3 px-4 text-sm font-bold shadow-sm flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <LiquidFillLoader size={18} />}
                    <span>{isSubmitting ? t('welcome.verifying') : t('welcome.verifyCodeSignIn')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center justify-between text-[11px]">
                    <button
                      type="button"
                      onClick={() => { setSmsChallenge(null); setSmsCode(''); setSignInError(''); }}
                      className="font-semibold text-slate-500 hover:text-text-primary cursor-pointer"
                    >
                      {t('welcome.backToSignIn')}
                    </button>
                    <button
                      type="button"
                      onClick={handleSmsResend}
                      className="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      {t('welcome.resendCode')}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-3.5">
                  {selectedRole === 'teacher' ? (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-text-primary mb-1">
                          {t('welcome.teacherPhoneEmail')}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="+880 1819-334455 or teacher@dpi.gov.bd"
                          value={teacherPhoneOrEmail}
                          onChange={(e) => setTeacherPhoneOrEmail(e.target.value)}
                          className="dm-field w-full px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-text-primary mb-1 flex items-center justify-between">
                          <span>{t('welcome.teacherPin')}</span>
                        </label>
                        <input
                          type="password"
                          required
                          maxLength={6}
                          inputMode="numeric"
                          placeholder={t('welcome.pinPlaceholder')}
                          value={teacherPin}
                          onChange={(e) => setTeacherPin(e.target.value)}
                          className="dm-field w-full px-3 py-2.5 text-sm text-slate-800 tracking-widest font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <p className="text-[11px] text-slate-500 bg-blue-50/60 border border-blue-100 p-2 rounded-xl">
                        {t('welcome.teacherPinNote')}
                      </p>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-text-primary mb-1">
                          {t('welcome.boardRoll')}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={t('welcome.boardRollPlaceholder')}
                          value={signInRoll}
                          onChange={(e) => setSignInRoll(e.target.value)}
                          className="dm-field w-full px-3 py-2.5 text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-text-primary mb-1">
                          {t('welcome.pin')}
                        </label>
                        <input
                          type="password"
                          required
                          maxLength={6}
                          inputMode="numeric"
                          placeholder={t('welcome.pinPlaceholder')}
                          value={signInPin}
                          onChange={(e) => setSignInPin(e.target.value)}
                          className="dm-field w-full px-3 py-2.5 text-sm text-slate-800 tracking-widest font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {selectedRole === 'class_captain' && (
                        <p className="text-[11px] text-teal-700 bg-teal-50/70 border border-teal-200 p-2 rounded-xl">
                          {t('welcome.captainLoginNote')}
                        </p>
                      )}
                    </>
                  )}

                  <TurnstileWidget key={turnstileKey} onToken={setTurnstileToken} />

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="dm-primary-action w-full py-3 px-4 text-sm font-bold shadow-sm flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <LiquidFillLoader size={18} />}
                    <span>{isSubmitting ? t('welcome.authenticating') : selectedRole === 'teacher' ? t('welcome.signInAsTeacher') : selectedRole === 'class_captain' ? t('welcome.signInAsCaptain') : t('welcome.signInAsStudent')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <LegalLinks />
                </form>
              )}

              {/* Social sign-in (only when the OAuth apps are configured) */}
              {!smsChallenge && selectedRole !== 'teacher' && (isGoogleSignInEnabled || isFacebookSignInEnabled) && (
                <div className="mt-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex-1 h-px bg-slate-200" />
                    <span className="text-[11px] font-semibold text-slate-400">{t('welcome.orContinueWith')}</span>
                    <span className="flex-1 h-px bg-slate-200" />
                  </div>
                  <div className="space-y-2.5">
                    {isGoogleSignInEnabled && (
                      <div ref={googleButtonRef} className="flex justify-center [&>div]:w-full [&>div]:flex [&>div]:justify-center" />
                    )}
                    {isFacebookSignInEnabled && (
                      <button
                        type="button"
                        onClick={handleFacebookLogin}
                        disabled={socialLoading}
                        className="w-full py-2.5 rounded-xl bg-[#1877f2] hover:bg-[#1667d6] text-white text-sm font-bold shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {socialLoading ? <LiquidFillLoader size={18} /> : <Facebook className="w-4 h-4" />}
                        <span>{t('welcome.continueFacebook')}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

            </>
          )}

          {/* SIGN UP FORM */}
          {tab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3">
              {selectedRole === 'teacher' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">{t('welcome.fullNameTitle')}</label>
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
                      <label className="block text-xs font-semibold text-text-primary mb-1">{t('welcome.phone')}</label>
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
                      <label className="block text-xs font-semibold text-text-primary mb-1">{t('welcome.officialEmail')}</label>
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
                    label={t('welcome.college')}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <SearchableDepartmentSelect
                      value={teacherDepartment}
                      onChange={(name) => setTeacherDepartment(name)}
                      label={t('welcome.department')}
                      required
                    />
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1.5">{t('welcome.designation')}</label>
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
                        {t('welcome.semestersTaught')}
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
                        {t('welcome.regulation')}
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
                      label={t('welcome.teachingSubjects')}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">{t('welcome.assignedShift')}</label>
                    <select
                      value={teacherShift}
                      onChange={(e) => setTeacherShift(e.target.value as Shift | 'Both')}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                    >
                      <option value="Morning">{t('welcome.shiftMorning')}</option>
                      <option value="Day">{t('welcome.shiftDay')}</option>
                      <option value="Both">{t('welcome.shiftBoth')}</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">{t('welcome.securityPinLabel')}</label>
                      <input
                        type="password"
                        required
                        maxLength={6}
                        inputMode="numeric"
                        placeholder={t('welcome.choosePinPlaceholder')}
                        value={teacherNewPin}
                        onChange={(e) => setTeacherNewPin(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">{t('welcome.confirmPin')}</label>
                      <input
                        type="password"
                        required
                        maxLength={6}
                        inputMode="numeric"
                        placeholder={t('welcome.reenterPinPlaceholder')}
                        value={teacherConfirmPin}
                        onChange={(e) => setTeacherConfirmPin(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-center font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      {t('welcome.verificationNoticeTitle')}
                    </p>
                    <p>
                      {t('welcome.verificationNoticeBodyPrefix')} <strong>Pending Verification</strong>{t('welcome.verificationNoticeBodySuffix')}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">{t('welcome.studentFullName')}</label>
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
                      <label className="block text-xs font-semibold text-text-primary mb-1">{t('welcome.boardRollShort')}</label>
                      <input
                        type="text"
                        required
                        placeholder={t('welcome.boardRollPlaceholderShort')}
                        value={signUpData.boardRoll}
                        onChange={(e) => setSignUpData({ ...signUpData, boardRoll: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">{t('welcome.registrationNo')}</label>
                      <input
                        type="text"
                        required
                        placeholder={t('welcome.registrationPlaceholder')}
                        value={signUpData.regNumber}
                        onChange={(e) => setSignUpData({ ...signUpData, regNumber: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">{t('welcome.phoneSms')}</label>
                    <input
                      type="tel"
                      placeholder="+880 1XXX-XXXXXX"
                      value={signUpData.phone}
                      onChange={(e) => setSignUpData({ ...signUpData, phone: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">{t('welcome.securityPinLabel')}</label>
                      <input
                        type="password"
                        required
                        maxLength={6}
                        inputMode="numeric"
                        placeholder={t('welcome.choosePinShortPlaceholder')}
                        value={signUpPin}
                        onChange={(e) => setSignUpPin(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">{t('welcome.confirmPin')}</label>
                      <input
                        type="password"
                        required
                        maxLength={6}
                        inputMode="numeric"
                        placeholder={t('welcome.reenterPinPlaceholder')}
                        value={signUpConfirmPin}
                        onChange={(e) => setSignUpConfirmPin(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-center font-mono"
                      />
                    </div>
                  </div>

                  <SearchableCollegeSelect
                    value={signUpData.college || ''}
                    onChange={(name) => setSignUpData({ ...signUpData, college: name })}
                    label={t('welcome.college')}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <SearchableDepartmentSelect
                      value={signUpData.department || ''}
                      onChange={(name) => setSignUpData({ ...signUpData, department: name })}
                      label={t('welcome.department')}
                      required
                    />
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1.5">{t('welcome.semester')}</label>
                      <select
                        value={signUpData.semester}
                        onChange={(e) => setSignUpData({ ...signUpData, semester: Number(e.target.value) as SemesterNumber })}
                        className="w-full px-2.5 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{t('welcome.semester')} {s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">{t('welcome.shift')}</label>
                      <select
                        value={signUpData.shift}
                        onChange={(e) => setSignUpData({ ...signUpData, shift: e.target.value as Shift })}
                        className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                      >
                        <option value="Morning">{t('welcome.shiftMorningShort')}</option>
                        <option value="Day">{t('welcome.shiftDayShort')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-primary mb-1">{t('welcome.section')}</label>
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
                      <label className="block text-xs font-semibold text-text-primary mb-1">{t('welcome.session')}</label>
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
                        {t('welcome.captainRegistrationTitle')}
                      </p>
                    </div>
                  )}
                </>
              )}

              <TurnstileWidget key={turnstileKey} onToken={setTurnstileToken} />

              <ConsentCheckbox
                checked={selectedRole === 'teacher' ? teacherConsentAccepted : consentAccepted}
                onChange={selectedRole === 'teacher' ? setTeacherConsentAccepted : setConsentAccepted}
              />

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
                {isSubmitting && <LiquidFillLoader size={18} />}
                <span>{isSubmitting ? t('welcome.registering') : selectedRole === 'teacher' ? t('welcome.completeTeacherRegistration') : selectedRole === 'class_captain' ? t('welcome.completeCaptainRegistration') : t('welcome.completeStudentRegistration')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
