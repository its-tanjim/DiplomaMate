import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, UserCheck, Bell, GraduationCap, Users, BookOpen } from 'lucide-react';

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
    <header className="dm-header sticky top-0 z-30 border-b shadow-sm no-print">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Zone */}
        <button 
          onClick={() => setActiveScreen('home')}
          className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-lg group"
        >
          <img
            src="/diploma-mate-logo.png"
            alt=""
            className="w-8 h-8 rounded-lg object-contain shadow-xs"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white whitespace-nowrap">
                DiplomaMate
              </span>
            </div>
          </div>
        </button>

        {/* Center: Shift & Section Badge */}
        {accountType !== 'system_admin' && (
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-white bg-white/10 px-3 py-1 rounded-md border border-white/15">
            <span className="text-white font-semibold">{userProfile.shift} Shift</span>
            <span className="text-white/70">·</span>
            <span>Sec {userProfile.section}</span>
            <span className="text-white/70">·</span>
            <span>Sem {userProfile.semester}</span>
          </div>
        )}

        {/* Action Zone: Reminders & Profile / CR Status */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Role Status Indicator */}
          {accountType === 'system_admin' && isServerVerifiedAdmin ? (
            <button 
              onClick={() => window.location.replace('https://admin.diplomamate.online/')}
              title="System Administrator Account"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold whitespace-nowrap hover:bg-white/20 transition-colors"
            >
              <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5 text-white" />
              <span>System Admin</span>
            </button>
          ) : accountType === 'teacher' ? (
            <button 
              onClick={() => setActiveScreen('profile')}
              title="Teacher Account"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold whitespace-nowrap hover:bg-white/20 transition-colors"
            >
              <GraduationCap aria-hidden="true" className="w-3.5 h-3.5 text-white" />
              <span>Teacher</span>
            </button>
          ) : accountType === 'class_captain' ? (
            <button 
              onClick={() => setActiveScreen('profile')}
              title="Class Captain Account"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold whitespace-nowrap hover:bg-white/20 transition-colors"
            >
              <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5 text-white" />
              <span>Class Captain</span>
            </button>
          ) : (
            <button 
              onClick={() => setActiveScreen('profile')}
              title="Student Account"
              className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold whitespace-nowrap hover:bg-white/20 transition-colors"
            >
              <UserCheck aria-hidden="true" className="w-3.5 h-3.5 text-white" />
              <span>Student</span>
            </button>
          )}

          {/* Quick Community Button */}
          <button
            onClick={() => setActiveScreen('community')}
            aria-label="Community"
            className={`min-h-10 min-w-9 px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-colors ${
              activeScreen === 'community'
                ? 'bg-white text-brand-navy border-white'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}
            title="Academic Community Hub & Peer Discussions"
          >
            <Users aria-hidden="true" className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Community</span>
          </button>

          {/* Quick Book List Button */}
          <button
            onClick={() => setActiveScreen('book_list')}
            aria-label="Book List"
            className={`min-h-10 min-w-9 px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-colors ${
              activeScreen === 'book_list'
                ? 'bg-white text-brand-navy border-white'
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
            }`}
            title="Book List & Central Subject Catalog"
          >
            <BookOpen aria-hidden="true" className="w-4 h-4" />
            <span className="hidden sm:inline">Book List</span>
          </button>

          {/* Quick Reminders Bell */}
          <button
            onClick={() => setActiveScreen('reminders')}
            className={`min-h-10 min-w-9 p-2 rounded-xl text-white hover:text-white hover:bg-white/15 transition-colors relative flex items-center justify-center ${activeScreen === 'reminders' ? 'bg-white text-brand-navy' : ''}`}
            aria-label="View Reminders"
          >
            <Bell aria-hidden="true" className="w-4 h-4" />
            {pendingRemindersCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
