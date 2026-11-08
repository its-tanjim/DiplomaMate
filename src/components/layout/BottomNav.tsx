import React from 'react';
import { useApp } from '../../context/AppContext';
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

  const pendingRemindersCount = reminders.filter(r => !r.isCompleted).length;

  const navItems: { label: string; screen: ScreenType; icon: React.ComponentType<{ className?: string }> }[] = [
    { label: 'Home', screen: 'home', icon: Home },
    { label: 'Routine', screen: 'routine', icon: CalendarDays },
    { label: 'Community', screen: 'community', icon: Users },
    { label: 'Notes', screen: 'notes', icon: FileText },
    { label: 'Reminders', screen: 'reminders', icon: Bell },
    { label: 'Teachers', screen: 'teachers', icon: Contact2 },
    { label: 'Profile', screen: 'profile', icon: UserCircle },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg pb-[env(safe-area-inset-bottom)] no-print">
      <div className="max-w-lg mx-auto grid grid-cols-7 h-16 items-center px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.screen;
          return (
            <button
              key={item.screen}
              onClick={() => setActiveScreen(item.screen)}
              className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] transition-colors relative ${
                isActive ? 'text-brand-blue' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'}`} />
                {item.screen === 'reminders' && pendingRemindersCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </div>
              <span className={`text-[10px] mt-1 whitespace-nowrap tracking-tight ${isActive ? 'font-bold text-brand-blue' : 'font-medium text-slate-500'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-1 w-5 h-0.5 bg-brand-blue rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
