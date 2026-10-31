import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, UserCheck, Bell, Sparkles, GraduationCap, Users } from 'lucide-react';

export const MobileHeader: React.FC = () => {
  const { 
    userProfile, 
    accountType, 
    isServerVerifiedAdmin,
    activeScreen, 
    setActiveScreen,
    reminders
  } = useApp();

  const pendingRemindersCount = reminders.filter(r => !r.isCompleted).length;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs no-print">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <button 
          onClick={() => setActiveScreen('home')}
          className="flex items-center gap-2.5 text-left focus:outline-none group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors">
            <span className="font-bold text-sm tracking-tighter">DM</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-[#172554] whitespace-nowrap">
                DiplomaMate
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-none -mt-0.5">
              BTEB Polytechnic Hub
            </p>
          </div>
        </button>

        {/* Center: Shift & Section Badge */}
        {accountType !== 'system_admin' && (
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-100/80 px-3 py-1 rounded-md border border-slate-200/60">
            <span className="text-[#2563EB] font-semibold">{userProfile.shift} Shift</span>
            <span className="text-slate-300">·</span>
            <span>Sec {userProfile.section}</span>
            <span className="text-slate-300">·</span>
            <span>Sem {userProfile.semester}</span>
          </div>
        )}

        {/* Action Zone: Reminders & Profile / CR Status */}
        <div className="flex items-center gap-2">
          {/* Role Status Indicator */}
          {accountType === 'system_admin' && isServerVerifiedAdmin ? (
            <button 
              onClick={() => setActiveScreen('admin_portal')}
              title="System Administrator Account"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#172554] border border-blue-800 text-white text-xs font-semibold whitespace-nowrap hover:bg-slate-800 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>System Admin</span>
            </button>
          ) : accountType === 'teacher' ? (
            <button 
              onClick={() => setActiveScreen('profile')}
              title="Teacher Account"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200/70 text-indigo-700 text-xs font-semibold whitespace-nowrap hover:bg-indigo-100 transition-colors"
            >
              <GraduationCap className="w-3.5 h-3.5 text-indigo-700" />
              <span>Teacher</span>
            </button>
          ) : accountType === 'class_captain' ? (
            <button 
              onClick={() => setActiveScreen('profile')}
              title="Class Captain Account"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200/70 text-[#0D9488] text-xs font-semibold whitespace-nowrap hover:bg-teal-100 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#0D9488]" />
              <span className="hidden xs:inline">Class Captain</span>
              <span className="xs:hidden">CR</span>
            </button>
          ) : (
            <button 
              onClick={() => setActiveScreen('profile')}
              title="Student Account"
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 border border-blue-200/70 text-[#2563EB] text-xs font-semibold whitespace-nowrap hover:bg-blue-100 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="hidden xs:inline">Student</span>
            </button>
          )}

          {/* Quick Community Button */}
          <button
            onClick={() => setActiveScreen('community')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 border transition-colors ${
              activeScreen === 'community'
                ? 'bg-[#2563EB] text-white border-[#2563EB]'
                : 'bg-slate-100 text-slate-700 border-slate-200/80 hover:bg-blue-50 hover:text-[#2563EB]'
            }`}
            title="Academic Community Hub & Peer Discussions"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Community</span>
          </button>

          {/* Quick Book List Button */}
          <button
            onClick={() => setActiveScreen('book_list')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 border transition-colors ${
              activeScreen === 'book_list'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-slate-100 text-slate-700 border-slate-200/80 hover:bg-indigo-50 hover:text-indigo-700'
            }`}
            title="Book List & Central Subject Catalog"
          >
            <span>Book List</span>
          </button>

          {/* Quick Reminders Bell */}
          <button
            onClick={() => setActiveScreen('reminders')}
            className={`p-2 rounded-lg text-slate-600 hover:text-[#2563EB] hover:bg-slate-100 transition-colors relative ${activeScreen === 'reminders' ? 'text-[#2563EB] bg-blue-50' : ''}`}
            aria-label="View Reminders"
          >
            <Bell className="w-4 h-4" />
            {pendingRemindersCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
