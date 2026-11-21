import React from 'react';
import { AppProvider, useApp } from '../../src/context/AppContext';
import { AdminLoginScreen } from '../../src/components/screens/AdminLoginScreen';
import { AdminPortalScreen } from '../../src/components/screens/AdminPortalScreen';
import { BTEBResultsScreen } from '../../src/components/screens/BTEBResultsScreen';
import { CheckCircle2 } from 'lucide-react';

const AdminToast: React.FC = () => {
  const { toastMessage } = useApp();
  if (!toastMessage) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-text-primary text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2 border border-slate-700/80 max-w-sm text-center animate-in fade-in slide-in-from-bottom-2 duration-150">
      <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
      <span>{toastMessage}</span>
    </div>
  );
};

const AdminContent: React.FC = () => {
  const { isServerVerifiedAdmin, activeScreen } = useApp();

  // Not verified yet, or explicitly on the login screen (switch account):
  // show the System Administrator sign-in.
  if (!isServerVerifiedAdmin || activeScreen === 'admin_login') {
    return (
      <div className="min-h-screen bg-app-bg">
        <AdminLoginScreen />
        <AdminToast />
      </div>
    );
  }

  // The portal's "Open Student Result Search" button navigates here, so the
  // admin can check the published results exactly as a student sees them.
  if (activeScreen === 'bteb_results') {
    return (
      <div className="min-h-screen bg-app-bg text-text-primary flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
        <main className="dm-app-content flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-5">
          <BTEBResultsScreen />
        </main>
        <AdminToast />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg text-text-primary flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <main className="dm-app-content flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-5">
        <AdminPortalScreen />
      </main>
      <AdminToast />
    </div>
  );
};

export default function AdminApp() {
  return (
    <AppProvider>
      <AdminContent />
    </AppProvider>
  );
}
