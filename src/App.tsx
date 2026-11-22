/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { MobileHeader } from './components/layout/MobileHeader';
import { BottomNav } from './components/layout/BottomNav';
import { WelcomeScreen } from './components/screens/WelcomeScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { ClassRoutineScreen } from './components/screens/ClassRoutineScreen';
import { NotesAssignmentsScreen } from './components/screens/NotesAssignmentsScreen';
import { RemindersScreen } from './components/screens/RemindersScreen';
import { TeachersContactsScreen } from './components/screens/TeachersContactsScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { SemesterScreen } from './components/screens/SemesterScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { CaptainVerificationScreen } from './components/screens/CaptainVerificationScreen';
import { AdminPortalScreen } from './components/screens/AdminPortalScreen';
import { AdminLoginScreen } from './components/screens/AdminLoginScreen';
import { TeacherDashboardScreen } from './components/screens/TeacherDashboardScreen';
import { TeacherProfileSetupScreen } from './components/screens/TeacherProfileSetupScreen';
import { BTEBResultsScreen } from './components/screens/BTEBResultsScreen';
import { BookListScreen } from './components/screens/BookListScreen';
import { CommunityScreen } from './components/screens/CommunityScreen';
import { CheckCircle2 } from 'lucide-react';
import { nativeService } from './services/nativeService';
import { AppUpdateBanner } from './components/AppUpdateBanner';

const AppContent: React.FC = () => {
  const { isLoggedIn, activeScreen, setActiveScreen, toastMessage, accountType, isServerVerifiedAdmin, openNotesSection } = useApp();

  // Initialize Android status bar and notification channels on mount
  React.useEffect(() => {
    nativeService.initializeNativeApp();
  }, []);

  // Support direct URL navigation to /admin/login, /admin, /book-list, /community, /notices, or /jobs
  React.useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    if (path === '/admin/login') {
      setActiveScreen('admin_login');
    } else if (path === '/admin' || path === '/admin/results-import') {
      setActiveScreen('admin_portal');
    } else if (path === '/book-list' || path === '/books') {
      setActiveScreen('book_list');
    } else if (path === '/community' || path === '/communities') {
      setActiveScreen('community');
    } else if (path === '/notices' || path === '/bteb-notices') {
      openNotesSection('notices');
    } else if (path === '/jobs' || path === '/job-circulars') {
      openNotesSection('jobs');
    }
  }, [setActiveScreen, openNotesSection]);

  // Hardware back button behavior for Android devices
  React.useEffect(() => {
    nativeService.registerBackButtonListener(() => {
      if (activeScreen !== 'home') {
        setActiveScreen('home');
        return true; // handled
      }
      return false; // let Android OS exit or minimize app
    });
  }, [activeScreen, setActiveScreen]);

  if (activeScreen === 'admin_login') {
    return (
      <div className="min-h-screen bg-app-bg">
        <AdminLoginScreen />
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-text-primary text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // If not signed in or currently on welcome screen, show WelcomeScreen
  // (Unless user navigated directly to admin_portal to verify 403 guard)
  if ((!isLoggedIn || activeScreen === 'welcome') && activeScreen !== 'admin_portal') {
    return (
      <div className="min-h-screen bg-app-bg">
        <WelcomeScreen />
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-text-primary text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  const isWideScreen = activeScreen === 'notes' || activeScreen === 'bteb_results' || activeScreen === 'book_list' || activeScreen === 'admin_portal' || activeScreen === 'teacher_portal' || activeScreen === 'community' || (activeScreen === 'home' && accountType === 'system_admin');

  return (
    <div className="min-h-screen bg-app-bg text-text-primary flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Mobile Bar */}
      <MobileHeader />

      {/* New APK available — the app checks GitHub Releases itself */}
      <AppUpdateBanner />

      {/* Main Content Viewport */}
      <main className={`dm-app-content flex-1 ${isWideScreen ? 'max-w-6xl' : 'max-w-4xl'} mx-auto w-full px-4 sm:px-6 lg:px-8 pt-5`}>
        {activeScreen === 'home' && (
          accountType === 'system_admin' && isServerVerifiedAdmin ? (
            <AdminPortalScreen />
          ) : accountType === 'teacher' ? (
            <TeacherDashboardScreen />
          ) : (
            <HomeScreen />
          )
        )}
        {activeScreen === 'teacher_portal' && <TeacherDashboardScreen />}
        {activeScreen === 'book_list' && <BookListScreen />}
        {activeScreen === 'community' && <CommunityScreen />}
        {activeScreen === 'routine' && <ClassRoutineScreen />}
        {activeScreen === 'notes' && <NotesAssignmentsScreen />}
        {activeScreen === 'reminders' && <RemindersScreen />}
        {activeScreen === 'teachers' && <TeachersContactsScreen />}
        {activeScreen === 'semester' && <SemesterScreen />}
        {activeScreen === 'profile' && <ProfileScreen />}
        {activeScreen === 'settings' && <SettingsScreen />}
        {activeScreen === 'captain_verification' && <CaptainVerificationScreen />}
        {activeScreen === 'admin_portal' && <AdminPortalScreen />}
        {activeScreen === 'teacher_setup' && <TeacherProfileSetupScreen />}
        {activeScreen === 'bteb_results' && <BTEBResultsScreen />}
      </main>

      {/* Fixed Bottom Ergonomic Thumb Navigation */}
      <BottomNav />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-text-primary text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2 border border-slate-700/80 max-w-sm text-center animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
