import { apiFetch } from '../../services/apiClient';
// A6: admin sign-in/bootstrap HTTP calls live in the admin-only module
// src/admin/adminAuth.ts — not in the main AppContext.
import { adminLoginRequest, adminBootstrapRequest } from '../../admin/adminAuth';
import {
  fetchWithNetworkRetry,
  NETWORK_ERROR_MESSAGE,
  NETWORK_RETRY_MESSAGE
} from '../../services/networkRetry';
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
  UserCheck
} from 'lucide-react';

export const AdminLoginScreen: React.FC = () => {
  const { applyAdminSession, setActiveScreen, isLoggedIn } = useApp();

  const [isBootstrapped, setIsBootstrapped] = useState<boolean>(true);
  const [mode, setMode] = useState<'login' | 'bootstrap'>('login');
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);

  // Admin panel PIN gate: the password form only appears after a correct
  // PIN (POST /api/admin/pin-verify). The token is kept in memory only
  // (never localStorage) and is valid for 15 minutes server-side.
  const [pinGateEnabled, setPinGateEnabled] = useState<boolean | null>(null);
  const [pinUnlocked, setPinUnlocked] = useState<boolean>(false);
  const [pinToken, setPinToken] = useState<string | null>(null);
  const [pin, setPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [pinLockedUntil, setPinLockedUntil] = useState<number | null>(null);
  // A4: true when the PIN gate was previously enabled but ADMIN_PANEL_PIN
  // is now unset — login is password-only and the admin must be warned.
  const [pinGateMisconfigured, setPinGateMisconfigured] = useState(false);
  const [pinAttemptsRemaining, setPinAttemptsRemaining] = useState<number | null>(null);
  const [isCheckingPin, setIsCheckingPin] = useState<boolean>(true);
  const [isSubmittingPin, setIsSubmittingPin] = useState<boolean>(false);
  // Shown while a PIN request is being retried after a network failure
  // (Render free tier sleeps after ~15 min idle).
  const [pinRetryNotice, setPinRetryNotice] = useState<string>('');

  // Login state
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  // Shown while the admin login request is being retried after a network
  // failure; set via adminLoginRequest's onRetry callback.
  const [retryNotice, setRetryNotice] = useState<string>('');

  // First-Admin Bootstrap state (only usable when zero admins exist on server)
  const [bootstrapToken, setBootstrapToken] = useState<string>('');
  const [adminName, setAdminName] = useState<string>('Academic System Administrator');

  const refreshPinStatus = async () => {
    setPinRetryNotice('');
    try {
      // Retry network failures only (2 more attempts, ~3s then ~8s);
      // HTTP error responses are real answers and are never retried.
      // Fail-open behaviour unchanged: any failure still falls through
      // to the old password form so a status failure can never lock
      // the admin out.
      const res = await fetchWithNetworkRetry(() => apiFetch('/api/admin/pin-status'), {
        onRetry: () => setPinRetryNotice(NETWORK_RETRY_MESSAGE)
      });
      setPinRetryNotice('');
      const data = await res.json();
      if (data.success) {
        const enabled = Boolean(data.pinGateEnabled);
        setPinGateEnabled(enabled);
        setPinGateMisconfigured(Boolean(data.gateMisconfigured));
        if (!enabled) {
          setPinUnlocked(true);
        } else if (data.locked && typeof data.lockedUntil === 'number') {
          setPinLockedUntil(data.lockedUntil);
        } else {
          setPinLockedUntil(null);
          setPinAttemptsRemaining(typeof data.attemptsRemaining === 'number' ? data.attemptsRemaining : null);
        }
      } else {
        // Status endpoint unreachable/old server: fail open to the old
        // password form so a status failure can never lock the admin out.
        setPinGateEnabled(false);
        setPinGateMisconfigured(false);
        setPinUnlocked(true);
      }
    } catch {
      setPinRetryNotice('');
      setPinGateEnabled(false);
      setPinGateMisconfigured(false);
      setPinUnlocked(true);
    } finally {
      setIsCheckingPin(false);
    }
  };

  useEffect(() => {
    void refreshPinStatus();
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

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    if (!pin.trim()) {
      setPinError('Enter the admin panel PIN.');
      return;
    }
    setIsSubmittingPin(true);
    setPinRetryNotice('');
    try {
      // Retry network failures only (2 more attempts, ~3s then ~8s).
      // HTTP error responses (wrong PIN, lockout) are real answers and
      // are never retried — the 3-wrong-PINs = 5-hour lockout rule and
      // the attempts-remaining count are unchanged.
      const res = await fetchWithNetworkRetry(
        () =>
          apiFetch('/api/admin/pin-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: pin.trim() })
          }),
        { onRetry: () => setPinRetryNotice(NETWORK_RETRY_MESSAGE) }
      );
      setPinRetryNotice('');
      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.locked && typeof data.lockedUntil === 'number') {
          setPinLockedUntil(data.lockedUntil);
        }
        setPinError(data.error || 'Incorrect admin panel PIN.');
        setPin('');
        await refreshPinStatus();
        return;
      }
      if (data.pinToken) {
        setPinToken(data.pinToken);
      }
      setPinUnlocked(true);
      setPin('');
    } catch {
      setPinRetryNotice('');
      setPinError(NETWORK_ERROR_MESSAGE);
    } finally {
      setIsSubmittingPin(false);
    }
  };

  // The PIN token is short-lived (15 min); if the server says it is gone,
  // drop back to the PIN prompt instead of showing a dead password form.
  const handlePinRequired = () => {
    setPinToken(null);
    setPinUnlocked(false);
    setPin('');
    setIsCheckingPin(true);
    void refreshPinStatus();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Administrator email and password are required.');
      return;
    }

    setIsSubmitting(true);
    setRetryNotice('');
    try {
      const res = await adminLoginRequest(email.trim(), password, pinToken || undefined, {
        onRetry: () => setRetryNotice(NETWORK_RETRY_MESSAGE)
      });
      if (!res.success) {
        if (res.message.includes('PIN verification is required')) {
          handlePinRequired();
          return;
        }
        // Defence in depth: never show a raw JS error string on screen.
        setErrorMessage(
          res.message.includes('Failed to fetch') ? NETWORK_ERROR_MESSAGE : res.message
        );
        return;
      }
      applyAdminSession(res.admin, res.sessionToken);
    } finally {
      setRetryNotice('');
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
      const res = await adminBootstrapRequest(
        bootstrapToken.trim(),
        adminName.trim() || 'Academic System Administrator',
        email.trim(),
        password,
        pinToken || undefined
      );
      if (!res.success) {
        if (res.message.includes('PIN verification is required')) {
          handlePinRequired();
          return;
        }
        setErrorMessage(res.message);
        return;
      }
      applyAdminSession(res.admin, res.sessionToken);
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
        <div className="dm-card overflow-hidden">
          {/* Header Banner */}
          <div className="bg-blue-950 p-5 sm:p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-300 block font-bold">
                  Restricted Authority Access
                </span>
                <h1 className="ios-large-title text-lg font-bold tracking-tight text-white">
                  System Administrator Portal
                </h1>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* A4: the PIN gate was previously enabled but ADMIN_PANEL_PIN
                is now unset — sign-in is password-only. Loud warning so
                the misconfiguration cannot pass unnoticed; re-set the
                env var on Render to restore the PIN layer. */}
            {pinGateMisconfigured && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Security warning:</strong> the admin panel PIN was
                  previously enabled on this server, but it is not configured
                  now — sign-in is password-only. Re-set ADMIN_PANEL_PIN on
                  the server to restore the PIN layer.
                </span>
              </div>
            )}
            {/* Admin panel PIN gate: password form stays hidden until the PIN is verified. */}
            {pinGateEnabled && !pinUnlocked ? (
              isCheckingPin ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  {pinRetryNotice || 'Checking admin panel access...'}
                </div>
              ) : pinLockedUntil && pinLockedUntil > Date.now() ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Admin panel locked after 3 failed PIN attempts. Try again in{' '}
                      {Math.floor(Math.ceil((pinLockedUntil - Date.now()) / 60000) / 60)} hour(s){' '}
                      {Math.ceil((pinLockedUntil - Date.now()) / 60000) % 60} minute(s).
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCheckingPin(true);
                      void refreshPinStatus();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Check Again
                  </button>
                </div>
              ) : (
                <form onSubmit={handlePinSubmit} className="space-y-3.5">
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                    <span className="font-bold flex items-center gap-1 text-amber-800">
                      <KeyRound className="w-3.5 h-3.5" />
                      Admin Panel PIN Required
                    </span>
                    <p className="leading-relaxed">
                      Enter the admin panel PIN to unlock the sign-in form. 3 wrong PINs lock the panel for 5 hours.
                    </p>
                  </div>

                  {pinRetryNotice && (
                    <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-xs">
                      {pinRetryNotice}
                    </div>
                  )}

                  {pinError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{pinError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-text-primary mb-1">
                      Admin Panel PIN *
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="password"
                        required
                        autoComplete="off"
                        placeholder="Enter admin panel PIN"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        className="dm-field w-full pl-9 pr-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
                      />
                    </div>
                    {pinAttemptsRemaining !== null && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        {pinAttemptsRemaining} attempt(s) remaining before a 5-hour lockout.
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingPin}
                    className="dm-primary-action w-full py-2.5 px-4 text-sm font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    <span>{isSubmittingPin ? 'Verifying PIN...' : 'Unlock Admin Sign-In'}</span>
                  </button>
                </form>
              )
            ) : (
              <>
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

            {retryNotice && (
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 text-xs">
                {retryNotice}
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
                      className="dm-field w-full pl-9 pr-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
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
                      className="dm-field w-full pl-9 pr-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="dm-primary-action w-full py-2.5 px-4 text-sm font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer"
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

              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
