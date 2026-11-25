import React from 'react';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Home,
  CalendarDays,
  Users,
  FileText,
  Bell,
  Contact2,
  UserCircle
} from 'lucide-react';
import { ScreenType } from '../../types';

export const BottomNav: React.FC = () => {
  const { activeScreen, setActiveScreen, reminders } = useApp();
  const { t } = useLanguage();

  const pendingRemindersCount = reminders.filter(r => !r.isCompleted).length;

  const navItems: { label: string; screen: ScreenType; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: t('nav.home'), screen: 'home', icon: Home },
    { label: t('nav.routine'), screen: 'routine', icon: CalendarDays },
    { label: t('nav.community'), screen: 'community', icon: Users },
    { label: t('nav.notes'), screen: 'notes', icon: FileText },
    { label: t('nav.reminders'), screen: 'reminders', icon: Bell },
    { label: t('nav.teachers'), screen: 'teachers', icon: Contact2 },
    { label: t('nav.profile'), screen: 'profile', icon: UserCircle },
  ];

  const activeIndex = Math.max(
    0,
    navItems.findIndex((item) => item.screen === activeScreen)
  );

  return (
    <nav className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-4 right-4 z-40 max-w-lg mx-auto rounded-full bg-surface border border-border-app shadow-xl backdrop-blur-md no-print">
      <div className="relative grid grid-cols-7 h-16 items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.screen;
          return (
            <button
              key={item.screen}
              onClick={() => setActiveScreen(item.screen)}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] transition-colors relative ${
                isActive ? 'text-brand-blue' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'}`} />
                {item.screen === 'reminders' && pendingRemindersCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-brand-orange" />
                )}
              </div>
              <span className={`text-[10px] mt-1 whitespace-nowrap tracking-tight ${isActive ? 'font-bold text-brand-blue' : 'font-medium text-text-secondary'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
        {/* Single hopping indicator dot: slides under the active tab */}
        <span
          aria-hidden="true"
          className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full bg-brand-blue transition-all duration-300 ease pointer-events-none"
          style={{ left: `calc(${(activeIndex + 0.5) / 7 * 100}% - 3px)` }}
        />
      </div>
    </nav>
  );
};
