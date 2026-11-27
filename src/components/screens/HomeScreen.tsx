import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import { apiFetch } from '../../services/apiClient';
import { 
  CalendarDays, 
  FileText, 
  Bell, 
  GraduationCap, 
  Contact2, 
  ChevronRight, 
  Clock, 
  MapPin, 
  User, 
  Users,
  ShieldCheck, 
  Megaphone, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  BookOpen,
  ArrowUpRight,
  PhoneCall,
  Briefcase
} from 'lucide-react';
import { BtebOfficialNotice, ScreenType, WeekDay } from '../../types';
import { Modal } from '../common/Modal';

const BTEB_HOME_REFRESH_INTERVAL_MS = 15 * 60 * 1000;

export const HomeScreen: React.FC = () => {
  const { 
    userProfile, 
    accountType, 
    setActiveScreen, 
    openNotesSection,
    routine, 
    assignments, 
    reminders, 
    teachers,
    announcements,
    addAnnouncement,
    switchAccountType,
    isTeacherContactUnlocked,
    jobs
  } = useApp();
  const { t } = useLanguage();

  // Class Captain Notice Modal state
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticePriority, setNoticePriority] = useState<'Important' | 'Normal'>('Important');
  const [btebNotices, setBtebNotices] = useState<BtebOfficialNotice[]>([]);
  const [isLoadingBtebNotices, setIsLoadingBtebNotices] = useState(true);
  const [btebNoticeError, setBtebNoticeError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    let isFetching = false;
    let lastRequestedAt = 0;

    const fetchLatestBtebNotices = async (ignoreThrottle = false) => {
      if (isFetching || (!ignoreThrottle && Date.now() - lastRequestedAt < 60_000)) return;
      isFetching = true;
      lastRequestedAt = Date.now();

      try {
        const response = await apiFetch('/api/notices/bteb?page=1&pageSize=2');
        const data: {
          success?: boolean;
          error?: string;
          syncError?: string | null;
          notices?: BtebOfficialNotice[];
        } = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load official BTEB notices.');
        }

        if (isActive) {
          setBtebNotices(Array.isArray(data.notices) ? data.notices.slice(0, 2) : []);
          setBtebNoticeError(data.syncError ? t('home.btebSavedNotices') : null);
        }
      } catch {
        if (isActive) {
          setBtebNoticeError(t('home.btebRefreshFailed'));
        }
      } finally {
        isFetching = false;
        if (isActive) {
          setIsLoadingBtebNotices(false);
        }
      }
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchLatestBtebNotices();
      }
    };

    void fetchLatestBtebNotices(true);
    const refreshInterval = window.setInterval(
      () => void fetchLatestBtebNotices(true),
      BTEB_HOME_REFRESH_INTERVAL_MS
    );
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      isActive = false;
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  // Find next class or today's classes strictly for the student's academic group (never use an unfiltered global fallback)
  const todayName: WeekDay = 'Saturday'; // Default realistic academic day in polytechnic
  const matchingGroupRoutines = routine.filter(
    r =>
      (r.publication_status === 'published' || !r.publication_status) &&
      r.shift === userProfile.shift &&
      r.section === userProfile.section &&
      Number(r.semester) === Number(userProfile.semester)
  );
  const todayClasses = matchingGroupRoutines.filter(r => r.day === todayName);
  const nextClass =
    todayClasses.length > 0
      ? todayClasses[0]
      : matchingGroupRoutines.length > 0
        ? matchingGroupRoutines[0]
        : null;

  const pendingAssignments = assignments.filter(a => a.status === 'Pending');
  const activeReminders = reminders.filter(r => !r.isCompleted);

  const handlePostNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;
    const res = await addAnnouncement(noticeTitle, noticeContent, noticePriority);
    if (!res.success) return; // form stays open with the error toast
    setNoticeTitle('');
    setNoticeContent('');
    setShowNoticeModal(false);
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Student Profile Hero Card */}
      <div className="bg-brand-blue rounded-2xl p-5 sm:p-6 text-white shadow-md shadow-blue-900/10 relative overflow-hidden">
        {/* Soft decorative accent */}
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white text-xs font-medium">{t('home.greeting')}</span>
              {accountType === 'class_captain' ? (
                <span className="inline-flex items-center gap-1 bg-teal-500/20 text-white border border-teal-400/30 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  <ShieldCheck aria-hidden="true" className="w-3 h-3 text-white" />
                  {t('home.classCaptain')}
                </span>
              ) : (
                <span className="text-white text-xs">· {t('home.diplomaStudent')}</span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {userProfile.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white mt-1">
              <span className="font-medium text-white">{userProfile.department}</span>
              <span className="text-white/70">·</span>
              <span>{t('welcome.semester')} {userProfile.semester}</span>
              <span className="text-white/70">·</span>
              <span>{userProfile.shift} {t('welcome.shift')} ({t('home.sectionShort')} {userProfile.section})</span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-white mt-1.5 font-mono">
              <span>{t('home.roll')} {userProfile.boardRoll}</span>
              <span>{t('home.reg')} {userProfile.regNumber}</span>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 border-blue-600/50 pt-2 sm:pt-0">
            <button
              onClick={() => setActiveScreen('profile')}
              className="text-xs bg-surface/10 hover:bg-surface/20 text-white px-3 py-1.5 rounded-lg border border-white/20 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>{t('home.viewProfile')}</span>
              <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Class Captain Quick Broadcast Bar (If CR) */}
      {accountType === 'class_captain' && (
        <div className="bg-teal-50 border border-teal-200/90 rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-brand-teal text-white flex items-center justify-center shadow-xs">
                <ShieldCheck aria-hidden="true" className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-text-primary">
                  {t('home.captainControlCenter')}
                </h3>
              </div>
            </div>
            <button
              onClick={() => openNotesSection('notices')}
              className="bg-brand-teal hover:bg-teal-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Megaphone aria-hidden="true" className="w-3.5 h-3.5" />
              <span>{t('home.publishGroupNotice')}</span>
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => setActiveScreen('routine')}
              className="text-left p-2 rounded-lg bg-surface border border-teal-200/60 hover:border-teal-400 transition-colors cursor-pointer"
            >
              <span className="text-xs font-semibold text-slate-800 block">{t('home.editClassRoutine')}</span>
              <span className="text-[10px] text-slate-500">{t('home.editClassRoutineDesc')}</span>
            </button>
            <button
              onClick={() => openNotesSection('assignments')}
              className="text-left p-2 rounded-lg bg-surface border border-teal-200/60 hover:border-teal-400 transition-colors cursor-pointer"
            >
              <span className="text-xs font-semibold text-slate-800 block">{t('home.addClassAssignment')}</span>
              <span className="text-[10px] text-slate-500">{t('home.addClassAssignmentDesc')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Up Next Class Alert Banner */}
      {nextClass && (
        <div className="dm-card p-4 sm:p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <div className="flex items-center gap-1.5 font-medium text-brand-blue">
              <Clock aria-hidden="true" className="w-3.5 h-3.5" />
              <span>{t('home.todaysNextClass')} · {nextClass.startTime} - {nextClass.endTime}</span>
            </div>
            <span className="text-slate-400 text-[11px]">{t('home.period')} #{nextClass.periodNumber}</span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-text-primary">
                {nextClass.subjectName}
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
                <span className="inline-flex items-center gap-1">
                  <User aria-hidden="true" className="w-3.5 h-3.5 text-slate-400" />
                  {nextClass.teacherName}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin aria-hidden="true" className="w-3.5 h-3.5 text-slate-400" />
                  {nextClass.room}
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveScreen('routine')}
              className="shrink-0 p-2 rounded-lg bg-blue-50 text-brand-blue hover:bg-blue-100 transition-colors"
              aria-label={t('home.fullRoutine')}
              title={t('home.fullRoutine')}
            >
              <ChevronRight aria-hidden="true" className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Announcements / Notice Board */}
      {(announcements.length > 0 || btebNotices.length > 0 || isLoadingBtebNotices || btebNoticeError) && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              {t('home.noticeBoard')}
            </h2>
          </div>
          <div className="dm-card p-4 space-y-3">
            {announcements.slice(0, 2).map((ann) => (
              <div key={ann.id} className="border-b border-slate-100 last:border-0 pb-2.5 last:pb-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-text-primary">{ann.title}</span>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">{ann.postedAt}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {ann.content}
                </p>
                <div className="text-[10px] text-slate-400 mt-1">
                  {t('home.postedBy')} <span className="font-semibold text-slate-600">{ann.authorName}</span>
                </div>
              </div>
            ))}
            {btebNotices.map((notice) => (
              <div key={notice.id} className="border-b border-slate-100 last:border-0 pb-2.5 last:pb-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <a
                    href={notice.noticeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-text-primary hover:text-brand-blue"
                  >
                    {notice.title}
                  </a>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">{notice.publishedDateDisplay}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {notice.sourceLabel} · {notice.category}
                  {notice.pdfUrl && (
                    <>
                      {' · '}
                      <a href={notice.pdfUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-blue hover:underline">
                        {t('home.viewPdf')}
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))}
            {isLoadingBtebNotices && btebNotices.length === 0 && (
              <p className="text-xs text-slate-500">{t('home.loadingBtebNotices')}</p>
            )}
            {btebNoticeError && (
              <p className="text-xs text-amber-700">{btebNoticeError}</p>
            )}
            {!isLoadingBtebNotices && btebNotices.length === 0 && !btebNoticeError && (
              <p className="text-xs text-slate-500">{t('home.noBtebNotices')}</p>
            )}
          </div>
        </div>
      )}

      {/* Core Screens Cards Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-text-primary tracking-tight">
            {t('home.academicModules')}
          </h2>
          <span className="text-xs text-slate-500">{t('welcome.semester')} {userProfile.semester}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card 1: Class Routine */}
          <button
            onClick={() => setActiveScreen('routine')}
            className="dm-card group p-4 sm:p-5 text-left hover:border-brand-blue hover:shadow-md hover:-translate-y-0.5 transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-colors">
                <CalendarDays aria-hidden="true" className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-brand-blue group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                {t('home.view')} <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-text-primary">{t('home.classRoutine')}</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {t('home.classRoutineDesc')}
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-brand-blue">{t('home.sixDaysWeek')}</span>
                <span className="text-slate-300">·</span>
                <span>{todayClasses.length} {t('home.classesToday')}</span>
              </div>
            </div>
          </button>

          {/* Card 2: BTEB & Campus Notices */}
          <button
            onClick={() => openNotesSection('notices')}
            className="dm-card group p-4 sm:p-5 text-left hover:border-brand-blue hover:shadow-md hover:-translate-y-0.5 transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-colors">
                <Megaphone aria-hidden="true" className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-brand-blue group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                {t('home.noticesLink')} <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-text-primary">{t('home.noticesTitle')}</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {t('home.noticesDesc')}
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-brand-blue">{t('home.liveBtebSync')}</span>
                <span className="text-slate-300">·</span>
                <span className="text-brand-teal font-semibold">{t('home.collegeCohort')}</span>
              </div>
            </div>
          </button>

          {/* Card 3: Diploma Job Circulars */}
          <button
            onClick={() => openNotesSection('jobs')}
            className="dm-card group p-4 sm:p-5 text-left hover:border-brand-teal hover:shadow-md hover:-translate-y-0.5 transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-brand-teal flex items-center justify-center group-hover:bg-brand-teal group-hover:text-white transition-colors">
                <Briefcase aria-hidden="true" className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-brand-teal group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                {t('home.browseJobs')} <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-text-primary">{t('home.jobCirculars')}</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {t('home.jobCircularsDesc')}
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-brand-teal">{jobs.length} {t('home.circulars')}</span>
                <span className="text-slate-300">·</span>
                <span>{t('home.govtPrivate')}</span>
              </div>
            </div>
          </button>

          {/* Card 4: Assignments & Lecture Notes */}
          <button
            onClick={() => openNotesSection('assignments')}
            className="dm-card group p-4 sm:p-5 text-left hover:border-brand-teal hover:shadow-md hover:-translate-y-0.5 transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-brand-teal flex items-center justify-center group-hover:bg-brand-teal group-hover:text-white transition-colors">
                <FileText aria-hidden="true" className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-brand-teal group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                {t('home.open')} <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-text-primary">{t('home.notesAssignments')}</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {t('home.notesAssignmentsDesc')}
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-amber-600">{pendingAssignments.length} {t('home.assignmentsDue')}</span>
                <span className="text-slate-300">·</span>
                <span className="text-brand-teal font-semibold">{t('home.subjectNotes')}</span>
              </div>
            </div>
          </button>

          {/* Card: Academic Community */}
          <button
            onClick={() => setActiveScreen('community')}
            className="dm-card group p-4 sm:p-5 text-left hover:border-brand-blue hover:shadow-md hover:-translate-y-0.5 transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-colors">
                <Users aria-hidden="true" className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-brand-blue group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                {t('home.joinChat')} <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-text-primary">{t('home.academicCommunity')}</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {t('home.academicCommunityDesc')}
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span>{t('home.peerFacultyHub')}</span>
              </div>
            </div>
          </button>

          {/* Card 3: Reminders */}
          <button
            onClick={() => setActiveScreen('reminders')}
            className="group bg-surface rounded-2xl border border-slate-200/90 p-4 text-left shadow-xs hover:border-brand-blue hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Bell aria-hidden="true" className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                {t('home.manage')} <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-text-primary">{t('nav.reminders')}</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {t('home.remindersDesc')}
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-blue-600">{activeReminders.length} {t('home.activeReminders')}</span>
              </div>
            </div>
          </button>

          {/* Card 4: My Semester */}
          <button
            onClick={() => setActiveScreen('semester')}
            className="group bg-surface rounded-2xl border border-slate-200/90 p-4 text-left shadow-xs hover:border-brand-blue hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <GraduationCap aria-hidden="true" className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-sky-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                {t('home.details')} <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-text-primary">{t('home.mySemester')}</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {t('home.mySemesterDesc')}
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-sky-700">{t('home.coreSubjects')}</span>
                <span className="text-slate-300">·</span>
                <span>{t('home.totalCredits')}</span>
              </div>
            </div>
          </button>

          {/* Card 5: BTEB Exam Results & Group Analytics */}
          <button
            onClick={() => setActiveScreen('bteb_results')}
            className="group bg-surface rounded-2xl border border-slate-200/90 p-4 text-left shadow-xs hover:border-brand-blue hover:shadow-md transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center group-hover:bg-brand-blue group-hover:text-white transition-colors">
                <BookOpen aria-hidden="true" className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-brand-blue group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                {t('common.search')} <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-text-primary">{t('home.btebResults')}</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {t('home.btebResultsDesc')}
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-brand-blue">{t('home.individualGroup')}</span>
                <span className="text-slate-300">·</span>
                <span>{t('home.rollRangeLookup')}</span>
              </div>
            </div>
          </button>

          {/* Card 6: Teachers' Contacts */}
          <button
            onClick={() => setActiveScreen('teachers')}
            className="group bg-surface rounded-2xl border border-slate-200/90 p-4 text-left shadow-xs hover:border-brand-teal hover:shadow-md transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-brand-teal flex items-center justify-center group-hover:bg-brand-teal group-hover:text-white transition-colors">
                <Contact2 aria-hidden="true" className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-brand-teal group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  {t('home.directory')} <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-text-primary">{t('home.teachersContacts')}</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {t('home.teachersContactsDesc')}
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-brand-teal">{teachers.length} {t('home.facultyContacts')}</span>
                <span className="text-slate-300">·</span>
                <span>{isTeacherContactUnlocked ? t('home.directCallSms') : t('home.adminManagedAccess')}</span>
              </div>
            </div>
          </button>

          {/* Card 7: Book List & Curriculum Catalog */}
          <button
            onClick={() => setActiveScreen('book_list')}
            className="group bg-surface rounded-2xl border border-slate-200/90 p-4 text-left shadow-xs hover:border-blue-600 hover:shadow-md transition-all relative overflow-hidden cursor-pointer sm:col-span-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <BookOpen aria-hidden="true" className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                {t('home.openBookList')} <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-text-primary">{t('home.bookList')}</h3>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-blue-600">{t('home.technologies19')}</span>
                <span className="text-slate-300">·</span>
                <span>{t('home.regulations')}</span>
                <span className="text-slate-300">·</span>
                <span>{t('home.semesters18')}</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Class Captain Modal: Post Notice */}
      {showNoticeModal && (
        <Modal
          onClose={() => setShowNoticeModal(false)}
          labelledBy="home-notice-title"
          panelClassName="bg-surface rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
          overlayClassName="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          showCloseButton={false}
        >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-brand-teal flex items-center justify-center">
                  <Megaphone aria-hidden="true" className="w-4 h-4" />
                </div>
                <h3 id="home-notice-title" className="font-bold text-text-primary text-base">{t('home.broadcastNotice')}</h3>
              </div>
              <button 
                onClick={() => setShowNoticeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
               aria-label="Close">
                ✕
              </button>
            </div>

            <form onSubmit={handlePostNotice} className="space-y-3.5 mt-3">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">{t('home.noticeTitle')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('home.noticeTitlePlaceholder')}
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">{t('home.announcementMessage')}</label>
                <textarea
                  required
                  rows={3}
                  placeholder={t('home.announcementPlaceholder')}
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">{t('home.priority')}</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNoticePriority('Important')}
                    className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold transition-all ${
                      noticePriority === 'Important' 
                        ? 'bg-rose-50 border-rose-300 text-rose-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    {t('home.priorityImportant')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoticePriority('Normal')}
                    className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-semibold transition-all ${
                      noticePriority === 'Normal' 
                        ? 'bg-teal-50 border-teal-300 text-teal-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    {t('home.priorityNormal')}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoticeModal(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-brand-teal text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-xs cursor-pointer"
                >
                  {t('home.postToNoticeBoard')}
                </button>
              </div>
            </form>
        </Modal>
      )}
    </div>
  );
};
