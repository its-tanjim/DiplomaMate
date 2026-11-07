import { apiFetch } from '../../services/apiClient';
import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  UserCheck
} from 'lucide-react';

export const AdminLoginScreen: React.FC = () => {
  const { adminLogin, adminBootstrap, setActiveScreen, isLoggedIn } = useApp();

  const [isBootstrapped, setIsBootstrapped] = useState<boolean>(true);
  const [mode, setMode] = useState<'login' | 'bootstrap'>('login');
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);

  // Login state
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // First-Admin Bootstrap state (only usable when zero admins exist on server)
  const [bootstrapToken, setBootstrapToken] = useState<string>('');
  const [adminName, setAdminName] = useState<string>('Academic System Administrator');

  useEffect(() => {
    apiFetch('/api/admin/bootstrap-status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsBootstrapped(Boolean(data.isBootstrapped));
          if (!data.isBootstrapped) {
            setMode('bootstrap');
          }
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingStatus(false));
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Administrator email and password are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await adminLogin(email.trim(), password);
      if (!res.success) {
        setErrorMessage(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBootstrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!bootstrapToken.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('Server setup token, administrator email, and password (min 8 chars) are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await adminBootstrap(
        bootstrapToken.trim(),
        adminName.trim() || 'Academic System Administrator',
        email.trim(),
        password
      );
      if (!res.success) {
        setErrorMessage(res.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-app-bg flex flex-col justify-center py-8 px-4">
      <div className="max-w-md w-full mx-auto space-y-4">
        {/* Back button */}
        <button
          type="button"
          onClick={() => setActiveScreen(isLoggedIn ? 'home' : 'welcome')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isLoggedIn ? 'Back to Dashboard' : 'Back to DiplomaMate Sign In'}</span>
        </button>

        {/* Main Card */}
        <div className="bg-surface rounded-2xl border border-slate-200/90 shadow-lg overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-text-primary via-slate-900 to-blue-950 p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-300 block font-bold">
                  Restricted Authority Access
                </span>
                <h1 className="text-lg font-bold tracking-tight text-white">
                  System Administrator Portal
                </h1>
              </div>
            </div>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Authorized BTEB Result Import, Faculty Credential Verification, and Class Captain Quota Governance.
            </p>
          </div>

          <div className="p-5 space-y-4">
            {/* Mode Switcher if unbootstrapped */}
            {!isLoadingStatus && !isBootstrapped && (
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMessage('');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-surface text-text-primary shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Admin Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('bootstrap');
                    setErrorMessage('');
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    mode === 'bootstrap'
                      ? 'bg-surface text-brand-teal shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  First-Admin Setup
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Administrator Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      autoComplete="username"
                      placeholder="admin@bteb-authority.edu.bd"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Administrator Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      placeholder="Enter administrator password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-text-primary hover:bg-blue-950 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  <span>{isSubmitting ? 'Verifying Server Session...' : 'Sign In as System Administrator'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleBootstrapSubmit} className="space-y-3.5">
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-[11px] text-teal-950 space-y-1">
                  <span className="font-bold flex items-center gap-1 text-brand-teal">
                    <KeyRound className="w-3.5 h-3.5" />
                    One-Time First Administrator Provisioning
                  </span>
                  <p className="leading-relaxed">
                    No <code className="font-mono font-bold">system_admin</code> account exists yet. Enter the server bootstrap setup token (from <code className="font-mono">ADMIN_BOOTSTRAP_TOKEN</code> or <code className="font-mono">data/.admin-bootstrap-token</code>) or run <code className="font-mono">npm run provision-admin</code> in the server terminal.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Server Bootstrap Setup Token *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      placeholder="Paste server-side setup token"
                      value={bootstrapToken}
                      onChange={(e) => setBootstrapToken(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-teal"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Administrator Full Name *
                  </label>
                  <div className="relative">
                    <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-text-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Administrator Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="admin@dpi.gov.bd"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-text-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Password (Min 8 Characters) *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="Create strong administrator password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-text-primary"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-brand-teal hover:bg-teal-700 text-white text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Provisioning...' : 'Provision & Sign In as First Administrator'}</span>
                </button>
              </form>
            )}

            {/* Security Notice Footer */}
            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Terminal className="w-3.5 h-3.5 text-slate-500" />
                <span>Server CLI Provisioning Command:</span>
              </div>
              <code className="block bg-slate-100 text-slate-800 px-2.5 py-1.5 rounded-lg font-mono text-[10px] break-all">
                npm run provision-admin -- --email admin@dpi.gov.bd --password "&lt;StrongPassword&gt;"
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
