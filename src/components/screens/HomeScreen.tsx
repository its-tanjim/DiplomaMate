import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
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
import { ScreenType, WeekDay } from '../../types';

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
    isTeacherContactAccessLocked,
    jobs
  } = useApp();

  // Class Captain Notice Modal state
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticePriority, setNoticePriority] = useState<'Important' | 'Normal'>('Important');

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

  const handlePostNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;
    addAnnouncement(noticeTitle, noticeContent, noticePriority);
    setNoticeTitle('');
    setNoticeContent('');
    setShowNoticeModal(false);
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Student Profile Hero Card */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-[#172554] rounded-2xl p-4 sm:p-5 text-white shadow-md shadow-blue-900/10 relative overflow-hidden">
        {/* Soft decorative accent */}
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-blue-200 text-xs font-medium">Assalamu Alaikum,</span>
              {accountType === 'class_captain' ? (
                <span className="inline-flex items-center gap-1 bg-teal-500/20 text-teal-200 border border-teal-400/30 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-teal-300" />
                  Class Captain (CR)
                </span>
              ) : (
                <span className="text-blue-200 text-xs">· Diploma Student</span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {userProfile.name}
            </h1>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-blue-100/90 mt-1">
              <span className="font-medium text-white">{userProfile.department}</span>
              <span className="text-blue-300">·</span>
              <span>Semester {userProfile.semester}</span>
              <span className="text-blue-300">·</span>
              <span>{userProfile.shift} Shift (Sec {userProfile.section})</span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-blue-200/80 mt-1.5 font-mono">
              <span>Roll: {userProfile.boardRoll}</span>
              <span>Reg: {userProfile.regNumber}</span>
            </div>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 border-t sm:border-t-0 border-blue-600/50 pt-2 sm:pt-0">
            <button
              onClick={() => setActiveScreen('profile')}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg border border-white/20 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>View Profile</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Class Captain Quick Broadcast Bar (If CR) */}
      {accountType === 'class_captain' && (
        <div className="bg-teal-50 border border-teal-200/90 rounded-2xl p-3.5 sm:p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0D9488] text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#172554]">
                  Class Captain Control Center
                </h3>
                <p className="text-[11px] text-teal-700">
                  Manage announcements, routine changes & assignments for Section {userProfile.section}
                </p>
              </div>
            </div>
            <button
              onClick={() => openNotesSection('notices')}
              className="bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Publish Group Notice</span>
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => setActiveScreen('routine')}
              className="text-left p-2 rounded-lg bg-white border border-teal-200/60 hover:border-teal-400 transition-colors cursor-pointer"
            >
              <span className="text-xs font-semibold text-slate-800 block">Edit Class Routine</span>
              <span className="text-[10px] text-slate-500">Update periods & substitute teachers</span>
            </button>
            <button
              onClick={() => openNotesSection('assignments')}
              className="text-left p-2 rounded-lg bg-white border border-teal-200/60 hover:border-teal-400 transition-colors cursor-pointer"
            >
              <span className="text-xs font-semibold text-slate-800 block">Add Class Assignment</span>
              <span className="text-[10px] text-slate-500">Post new job sheets & submission dates</span>
            </button>
          </div>
        </div>
      )}

      {/* Up Next Class Alert Banner */}
      {nextClass && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <div className="flex items-center gap-1.5 font-medium text-[#2563EB]">
              <Clock className="w-3.5 h-3.5" />
              <span>Today's Next Class · {nextClass.startTime} - {nextClass.endTime}</span>
            </div>
            <span className="text-slate-400 text-[11px]">Period #{nextClass.periodNumber}</span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[#172554]">
                {nextClass.subjectName}
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1">
                <span className="inline-flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {nextClass.teacherName}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {nextClass.room}
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveScreen('routine')}
              className="shrink-0 p-2 rounded-lg bg-blue-50 text-[#2563EB] hover:bg-blue-100 transition-colors"
              title="Full Routine"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Announcements / Notice Board */}
      {announcements.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-[#172554] uppercase tracking-wider">
              Class & BTEB Notice Board
            </h2>
            <button
              onClick={() => openNotesSection('notices')}
              className="text-[11px] font-bold text-[#2563EB] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>All BTEB & Campus Notices</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2.5 shadow-xs">
            {announcements.slice(0, 2).map((ann) => (
              <div key={ann.id} className="border-b border-slate-100 last:border-0 pb-2.5 last:pb-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-[#172554]">{ann.title}</span>
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">{ann.postedAt}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {ann.content}
                </p>
                <div className="text-[10px] text-slate-400 mt-1">
                  Posted by <span className="font-semibold text-slate-600">{ann.authorName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Core Screens Cards Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-[#172554] tracking-tight">
            Academic & Career Modules
          </h2>
          <span className="text-xs text-slate-500">Semester {userProfile.semester}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card 1: Class Routine */}
          <button
            onClick={() => setActiveScreen('routine')}
            className="group bg-white rounded-2xl border border-slate-200/90 p-4 text-left shadow-xs hover:border-[#2563EB] hover:shadow-md transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                <CalendarDays className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#2563EB] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                View <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-[#172554]">Class Routine</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                Periods, timings, labs & teacher assignments
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-[#2563EB]">6 Days/Week</span>
                <span className="text-slate-300">·</span>
                <span>{todayClasses.length} classes today</span>
              </div>
            </div>
          </button>

          {/* Card 2: BTEB & Campus Notices */}
          <button
            onClick={() => openNotesSection('notices')}
            className="group bg-white rounded-2xl border border-slate-200/90 p-4 text-left shadow-xs hover:border-[#2563EB] hover:shadow-md transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                <Megaphone className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#2563EB] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Notices <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-[#172554]">Notices (নোটিশ বোর্ড)</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                Official BTEB Notices + Teacher & Class Captain Notices
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-[#2563EB]">Live BTEB Sync</span>
                <span className="text-slate-300">·</span>
                <span className="text-[#0D9488] font-semibold">College & Cohort</span>
              </div>
            </div>
          </button>

          {/* Card 3: Diploma Job Circulars */}
          <button
            onClick={() => openNotesSection('jobs')}
            className="group bg-white rounded-2xl border border-slate-200/90 p-4 text-left shadow-xs hover:border-[#0D9488] hover:shadow-md transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center group-hover:bg-[#0D9488] group-hover:text-white transition-colors">
                <Briefcase className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#0D9488] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Browse Jobs <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-[#172554]">Job Circulars (চাকরির বিজ্ঞপ্তি)</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                Sub-Assistant Engineer (SAE) & Diploma Engineering Jobs
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-[#0D9488]">{jobs.length} Circulars</span>
                <span className="text-slate-300">·</span>
                <span>Govt & Private</span>
              </div>
            </div>
          </button>

          {/* Card 4: Assignments & Lecture Notes */}
          <button
            onClick={() => openNotesSection('assignments')}
            className="group bg-white rounded-2xl border border-slate-200/90 p-4 text-left shadow-xs hover:border-[#0D9488] hover:shadow-md transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center group-hover:bg-[#0D9488] group-hover:text-white transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#0D9488] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Open <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-[#172554]">Notes & Assignments</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                Lecture PDFs, lab assignments & study hand-outs
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-amber-600">{pendingAssignments.length} Assignments Due</span>
                <span className="text-slate-300">·</span>
                <span className="text-[#0D9488] font-semibold">Subject Notes</span>
              </div>
            </div>
          </button>

          {/* Card: Academic Community */}
          <button
            onClick={() => setActiveScreen('community')}
            className="group bg-white rounded-2xl border border-slate-200/90 p-4 text-left shadow-xs hover:border-[#2563EB] hover:shadow-md transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#2563EB] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Join / Chat <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-[#172554]">Academic Community</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                Study groups, lecture PDFs, lab videos & announcements
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-teal-600">Cohort Verified</span>
                <span className="text-slate-300">·</span>
                <span>Peer & Faculty Hub</span>
              </div>
            </div>
          </button>

          {/* Card 3: Reminders */}
          <button
            onClick={() => setActiveScreen('reminders')}
            className="group bg-white rounded-2xl border border-slate-200/90 p-4 text-left shadow-xs hover:border-[#2563EB] hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Bell className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Manage <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-[#172554]">Reminders</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                Midterms, class tests & BTEB form fill-up alerts
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-indigo-600">{activeReminders.length} Active Reminders</span>
                <span className="text-slate-300">·</span>
                <span>Next: Tomorrow 8:45 AM</span>
              </div>
            </div>
          </button>

          {/* Card 4: My Semester */}
          <button
            onClick={() => setActiveScreen('semester')}
            className="group bg-white rounded-2xl border border-slate-200/90 p-4 text-left shadow-xs hover:border-[#2563EB] hover:shadow-md transition-all relative overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-sky-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Details <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-[#172554]">My Semester</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                Curriculum, subjects, credits & BTEB CGPA calculator
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-sky-700">6 Core Subjects</span>
                <span className="text-slate-300">·</span>
                <span>19 Total Credits</span>
              </div>
            </div>
          </button>

          {/* Card 5: BTEB Exam Results & Group Analytics */}
          <button
            onClick={() => setActiveScreen('bteb_results')}
            className="group bg-white rounded-2xl border border-slate-200/90 p-4 text-left shadow-xs hover:border-[#2563EB] hover:shadow-md transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-[#2563EB] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Search <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-[#172554]">BTEB Exam Results</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                My Result (1st–8th Sem), Group Results & GPA Analysis
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-[#2563EB]">Individual & Group</span>
                <span className="text-slate-300">·</span>
                <span>Roll & Range Lookup</span>
              </div>
            </div>
          </button>

          {/* Card 6: Teachers' Contacts */}
          <button
            onClick={() => setActiveScreen('teachers')}
            className="group bg-white rounded-2xl border border-slate-200/90 p-4 text-left shadow-xs hover:border-[#0D9488] hover:shadow-md transition-all relative overflow-hidden cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#0D9488] flex items-center justify-center group-hover:bg-[#0D9488] group-hover:text-white transition-colors">
                <Contact2 className="w-5 h-5" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isTeacherContactUnlocked 
                    ? 'bg-teal-50 text-[#0D9488] border border-teal-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {isTeacherContactAccessLocked
                    ? isTeacherContactUnlocked ? 'Lifetime access' : 'Access restricted'
                    : 'Free access'}
                </span>
                <span className="text-xs font-semibold text-[#0D9488] group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                  Directory <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-[#172554]">Teachers' Contacts</h3>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                Department instructors, phone numbers & consulting hours
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-[#0D9488]">{teachers.length} Faculty Contacts</span>
                <span className="text-slate-300">·</span>
                <span>{isTeacherContactUnlocked ? 'Direct Call & SMS' : 'Admin-managed access'}</span>
              </div>
            </div>
          </button>

          {/* Card 7: Book List & Curriculum Catalog */}
          <button
            onClick={() => setActiveScreen('book_list')}
            className="group bg-white rounded-2xl border border-slate-200/90 p-4 text-left shadow-xs hover:border-indigo-600 hover:shadow-md transition-all relative overflow-hidden cursor-pointer sm:col-span-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                Open Book List <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
            <div className="mt-3">
              <h3 className="font-bold text-base text-[#172554]">Book List & Central Subject Catalog (বইয়ের তালিকা)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Browse BTEB subject codes, names, marks & verification status across all 19 Technologies, Regulations 2016 & 2022, and Semesters 1–8
              </p>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-semibold text-indigo-600">19 Technologies</span>
                <span className="text-slate-300">·</span>
                <span>Regulation 2016 & 2022</span>
                <span className="text-slate-300">·</span>
                <span>Semesters 1–8</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Class Captain Modal: Post Notice */}
      {showNoticeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9488] flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[#172554] text-base">Broadcast Class Notice</h3>
              </div>
              <button 
                onClick={() => setShowNoticeModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePostNotice} className="space-y-3.5 mt-3">
              <div>
                <label className="block text-xs font-semibold text-[#172554] mb-1">Notice Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Class Test Schedule Update or Lab Requirement"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-[#172554] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172554] mb-1">Announcement Message</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter detailed notice for Section A1 classmates..."
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-[#172554] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#172554] mb-1">Priority</label>
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
                    Urgent / Important
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
                    Regular Notice
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoticeModal(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-[#0D9488] text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-xs cursor-pointer"
                >
                  Post to Notice Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
