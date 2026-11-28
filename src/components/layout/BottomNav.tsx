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

/**
 * iOS-style tab bar (v1.0.36): full-width, translucent with blur, hairline
 * top border, icons + 10px labels. Replaces the old floating pill bar.
 */
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 no-print">
      <div className="mx-auto max-w-lg border-t border-border-app bg-surface/80 backdrop-blur-xl">
        <div className="grid grid-cols-7 h-14 items-center px-1 pb-[env(safe-area-inset-bottom)]">
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
                  <Icon className={`w-6 h-6 transition-transform ${isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'}`} />
                  {item.screen === 'reminders' && pendingRemindersCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-brand-orange" />
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 whitespace-nowrap tracking-tight ${isActive ? 'font-semibold text-brand-blue' : 'font-medium text-text-secondary'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
