/**
 * Admin-only app shell (Phase 1 of the separate-admin build).
 *
 * Same codebase as the main app, but this shell renders ONLY the admin
 * flow: splash screen, then AdminLoginScreen when no verified admin
 * session exists, then AdminPortalScreen when one does
 * (AdminManagementScreen lives inside the portal). It uses the same
 * AppProvider (same session/API state) and the same backend API base
 * (VITE_API_BASE_URL) as the main app.
 *
 * Student/teacher screens are unreachable here by construction: this
 * file never imports them, and the admin entry (`src/admin-main.tsx`)
 * never imports `src/App.tsx`. No update checker runs here either —
 * AppUpdateBanner and the Settings "Check for Update" row live only in
 * the main app, so the admin build can never offer the main-app APK.
 *
 * LanguageProvider is intentionally NOT used here (see
 * `src/config/buildMode.ts`): no admin screen uses `useLanguage`, and
 * including it would bundle `src/i18n/strings.ts` — including every
 * student welcome-screen string — into the admin bundle.
 */
import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ThemeProvider } from './context/ThemeContext';
import { SplashScreen } from './components/SplashScreen';
import { AdminLoginScreen } from './components/screens/AdminLoginScreen';
import { AdminPortalScreen } from './components/screens/AdminPortalScreen';
import { CheckCircle2 } from 'lucide-react';
import { nativeService } from './services/nativeService';

/**
 * Same crash guard as the main app: a render error shows a reload
 * screen instead of a blank white page.
 */
class AdminAppErrorBoundary extends React.Component<
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
    console.error('DiplomaMate Admin crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'sans-serif', textAlign: 'center', background: 'var(--dm-app-bg)' }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>DiplomaMate Admin</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Something went wrong while opening the admin app.</p>
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

const AdminAppContent: React.FC = () => {
  const { isLoggedIn, accountType, isServerVerifiedAdmin, isCheckingAdminSession, systemAdminProfile, toastMessage } = useApp();
  const [showSplash, setShowSplash] = React.useState(true);

  // App-open splash: centred 3D-animated logo for ~1.2s (tappable to skip)
  React.useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Initialize Android status bar and notification channels on mount
  React.useEffect(() => {
    nativeService.initializeNativeApp();
  }, []);

  // Splash renders ONLY after every hook above has run (same hook-order
  // rule as the main App: never put a conditional return above a hook).
  if (showSplash) {
    return <SplashScreen onDone={() => setShowSplash(false)} />;
  }

  // Admin session gate. A stored admin session still counts while the
  // server verification round-trip is in flight — the portal itself
  // shows its own "Verifying System Administrator session..." loader
  // and its 403 guard if the server rejects the session. Anything else
  // (logged out, or a stale student/teacher session) gets the login
  // screen. No other screen exists in this build.
  const hasVerifiedAdminSession =
    isLoggedIn &&
    accountType === 'system_admin' &&
    (isServerVerifiedAdmin || (isCheckingAdminSession && systemAdminProfile !== null));

  return (
    <div className="min-h-screen bg-app-bg">
      {hasVerifiedAdminSession ? <AdminPortalScreen /> : <AdminLoginScreen />}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-text-primary text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default function AdminApp() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AdminAppErrorBoundary>
          <AdminAppContent />
        </AdminAppErrorBoundary>
      </AppProvider>
    </ThemeProvider>
  );
}
