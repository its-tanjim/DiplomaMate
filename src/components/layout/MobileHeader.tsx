import React from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, UserCheck, Bell, GraduationCap, Users, BookOpen, Settings } from 'lucide-react';
import { fetchUnseenBroadcastCount } from '../../services/notificationsService';

export const MobileHeader: React.FC = () => {
  const { 
    userProfile, 
    accountType, 
    isServerVerifiedAdmin,
    activeScreen, 
    setActiveScreen,
  } = useApp();

  // Broadcast inbox dot: unseen admin announcements. The bell opens the
  // Notifications inbox now (Reminders stay on the bottom nav).
  const [unseenNotifications, setUnseenNotifications] = React.useState(0);
  React.useEffect(() => {
    let cancelled = false;
    fetchUnseenBroadcastCount()
      .then(count => {
        if (!cancelled) setUnseenNotifications(count);
      })
      .catch(() => {
        // No dot when the inbox cannot be reached.
      });
    return () => {
      cancelled = true;
    };
  }, [activeScreen]);

  return (
    <header className="sticky top-0 z-30 border-b border-border-app bg-surface/80 backdrop-blur-xl no-print">
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
              <span className="font-bold text-base tracking-tight text-text-primary whitespace-nowrap">
                DiplomaMate
              </span>
            </div>
          </div>
        </button>

        {/* Center: Shift & Section Badge */}
        {accountType !== 'system_admin' && (
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-text-secondary bg-slate-100 px-3 py-1 rounded-md border border-border-app">
            <span className="text-text-primary font-semibold">{userProfile.shift} Shift</span>
            <span className="text-text-muted">·</span>
            <span>Sec {userProfile.section}</span>
            <span className="text-text-muted">·</span>
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
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 border border-border-app text-text-secondary text-xs font-semibold whitespace-nowrap hover:bg-slate-200 transition-colors"
            >
              <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5" />
              <span>System Admin</span>
            </button>
          ) : accountType === 'teacher' ? (
            <button 
              onClick={() => setActiveScreen('profile')}
              title="Teacher Account"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 border border-border-app text-text-secondary text-xs font-semibold whitespace-nowrap hover:bg-slate-200 transition-colors"
            >
              <GraduationCap aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Teacher</span>
            </button>
          ) : accountType === 'class_captain' ? (
            <button 
              onClick={() => setActiveScreen('profile')}
              title="Class Captain Account"
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 border border-border-app text-text-secondary text-xs font-semibold whitespace-nowrap hover:bg-slate-200 transition-colors"
            >
              <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Class Captain</span>
            </button>
          ) : (
            <button 
              onClick={() => setActiveScreen('profile')}
              title="Student Account"
              className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-100 border border-border-app text-text-secondary text-xs font-semibold whitespace-nowrap hover:bg-slate-200 transition-colors"
            >
              <UserCheck aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Student</span>
            </button>
          )}

          {/* Quick Community Button */}
          <button
            onClick={() => setActiveScreen('community')}
            aria-label="Community"
            className={`min-h-10 min-w-9 px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 border transition-colors ${
              activeScreen === 'community'
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-transparent text-text-secondary border-transparent hover:text-text-primary'
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
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-transparent text-text-secondary border-transparent hover:text-text-primary'
            }`}
            title="Book List & Central Subject Catalog"
          >
            <BookOpen aria-hidden="true" className="w-4 h-4" />
            <span className="hidden sm:inline">Book List</span>
          </button>

          {/* Notifications bell — broadcast inbox */}
          <button
            onClick={() => setActiveScreen('notifications')}
            className={`min-h-10 min-w-9 p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-slate-100 transition-colors relative flex items-center justify-center ${activeScreen === 'notifications' ? 'bg-slate-100 text-brand-blue' : ''}`}
            aria-label="View Notifications"
            title="Notifications"
          >
            <Bell aria-hidden="true" className="w-4 h-4" />
            {unseenNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

          {/* Settings */}
          <button
            onClick={() => setActiveScreen('settings')}
            className={`min-h-10 min-w-9 p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-slate-100 transition-colors flex items-center justify-center ${activeScreen === 'settings' ? 'bg-slate-100 text-brand-blue' : ''}`}
            aria-label="Settings"
            title="Settings"
          >
            <Settings aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
