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
import { TeacherDashboardScreen } from './components/screens/TeacherDashboardScreen';
import { TeacherProfileSetupScreen } from './components/screens/TeacherProfileSetupScreen';
import { BTEBResultsScreen } from './components/screens/BTEBResultsScreen';
import { BookListScreen } from './components/screens/BookListScreen';
import { CommunityScreen } from './components/screens/CommunityScreen';
import { PrivacyPolicyScreen } from './components/screens/PrivacyPolicyScreen';
import { TermsScreen } from './components/screens/TermsScreen';
import { DeleteAccountScreen } from './components/screens/DeleteAccountScreen';
import { CheckCircle2 } from 'lucide-react';
import { nativeService } from './services/nativeService';
import { AppUpdateBanner } from './components/AppUpdateBanner';
import { MaintenanceBanner } from './components/student/MaintenanceBanner';
import { ForceUpdatePrompt } from './components/student/ForceUpdatePrompt';
import { NotificationsScreen } from './components/student/NotificationsScreen';
import { SupportScreen } from './components/student/SupportScreen';
import { getAppConfig, type AppConfig } from './services/appConfigService';
import { SplashScreen } from './components/SplashScreen';

/**
 * Catches render errors anywhere below and shows a reload screen instead of
 * a blank white page (what happened when the splash hook-order bug shipped).
 */
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message || 'Something went wrong.' };
  }

  componentDidCatch(error: Error) {
    console.error('DiplomaMate crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'sans-serif', textAlign: 'center', background: 'var(--dm-app-bg)' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>DiplomaMate</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Something went wrong while opening the app.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>{this.state.message}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: '10px 20px', borderRadius: 12, border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
          >
            Reload the app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const { isLoggedIn, activeScreen, setActiveScreen, toastMessage, accountType, isServerVerifiedAdmin, openNotesSection } = useApp();
  const [showSplash, setShowSplash] = React.useState(true);
  const [appConfig, setAppConfig] = React.useState<AppConfig | null>(null);

  // App config at boot (public endpoint, no auth): fetched once per
  // session and cached in the service. Drives the maintenance banner and
  // the force-update gate; a failed fetch leaves the app as-is.
  React.useEffect(() => {
    let cancelled = false;
    getAppConfig().then(config => {
      if (!cancelled) setAppConfig(config);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // App-open splash: centred 3D-animated logo for ~1.2s (tappable to skip)
  React.useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Initialize Android status bar and notification channels on mount
  React.useEffect(() => {
    nativeService.initializeNativeApp();
  }, []);

  // Support direct URL navigation to /book-list, /community, /notices, or /jobs
  // — and to the public legal pages /privacy, /terms and /delete-account
  // (no sign-in required for any of the three).
  // Admin URLs (/admin, /admin/login, /admin/results-import) live in the
  // separate admin app — send them there instead of rendering admin here.
  React.useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    if (path === '/admin/login' || path === '/admin' || path === '/admin/results-import') {
      window.location.replace('https://admin.diplomamate.online/');
    } else if (path === '/privacy') {
      setActiveScreen('privacy_policy');
    } else if (path === '/terms') {
      setActiveScreen('terms');
    } else if (path === '/delete-account') {
      setActiveScreen('delete_account');
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

  // A stale admin session (e.g. restored from a previous version) has no
  // admin UI in this app any more — send it to the separate admin app.
  React.useEffect(() => {
    if (isLoggedIn && accountType === 'system_admin' && isServerVerifiedAdmin) {
      window.location.replace('https://admin.diplomamate.online/');
    }
  }, [isLoggedIn, accountType, isServerVerifiedAdmin]);

  // Splash renders ONLY after every hook above has run. An early return
  // before these hooks made React throw "Rendered more hooks than during
  // the previous render" the moment the splash finished (~1.2s), which
  // unmounted the whole app and left a blank white page. Never put a
  // conditional return above a hook in this component.
  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  // Public legal pages — privacy, terms and account deletion need no
  // sign-in, so they render before the welcome gate below.
  const isPublicLegalScreen =
    activeScreen === 'privacy_policy' || activeScreen === 'terms' || activeScreen === 'delete_account';
  if (isPublicLegalScreen) {
    return (
      <div className="min-h-screen bg-app-bg">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-slate-900 focus:px-3 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold"
        >
          Skip to main content
        </a>
        <main id="main-content">
          {activeScreen === 'privacy_policy' && <PrivacyPolicyScreen />}
          {activeScreen === 'terms' && <TermsScreen />}
          {activeScreen === 'delete_account' && <DeleteAccountScreen />}
        </main>
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
  if (!isLoggedIn || activeScreen === 'welcome') {
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

  const isWideScreen = activeScreen === 'notes' || activeScreen === 'bteb_results' || activeScreen === 'book_list' || activeScreen === 'teacher_portal' || activeScreen === 'community';

  return (
    <div className="min-h-screen bg-app-bg text-text-primary flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Skip link — visually hidden until focused (keyboard users) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-slate-900 focus:px-3 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Skip to main content
      </a>

      {/* Top Mobile Bar */}
      <MobileHeader />

      {/* Server maintenance notice — only when the flag is on */}
      <MaintenanceBanner config={appConfig} />

      {/* Mandatory update — full-screen, blocks the app when forced */}
      <ForceUpdatePrompt versionControl={appConfig?.appVersionControl ?? null} />

      {/* New APK available — the app checks GitHub Releases itself */}
      <AppUpdateBanner />

      {/* Main Content Viewport */}
      <main id="main-content" className={`dm-app-content flex-1 ${isWideScreen ? 'max-w-6xl' : 'max-w-4xl'} mx-auto w-full px-4 sm:px-6 lg:px-8 pt-5`}>
        {activeScreen === 'home' && (
          accountType === 'teacher' ? (
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
        {activeScreen === 'notifications' && <NotificationsScreen />}
        {activeScreen === 'support' && <SupportScreen />}
        {activeScreen === 'teachers' && <TeachersContactsScreen />}
        {activeScreen === 'semester' && <SemesterScreen />}
        {activeScreen === 'profile' && <ProfileScreen />}
        {activeScreen === 'settings' && <SettingsScreen />}
        {activeScreen === 'captain_verification' && <CaptainVerificationScreen />}
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
      <AppErrorBoundary>
        <AppContent />
      </AppErrorBoundary>
    </AppProvider>
  );
}
