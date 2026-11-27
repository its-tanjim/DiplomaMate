/**
 * Admin password change (A3).
 * POST /api/admin/change-password { currentPassword, newPassword }
 * New password: at least 8 characters, stored as a PBKDF2 v2 (600k)
 * hash server-side. Changing the password invalidates ALL of the
 * admin's live sessions — including this one — so the form signs the
 * admin out afterwards and they sign in again with the new password.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AdminCard,
  AdminEmpty,
  AdminError,
  AdminSectionTitle,
  AdminSuccess,
  inputCls,
  primaryBtnCls,
  useAdminRequest,
} from './shared';
import { KeyRound } from 'lucide-react';

export const AdminChangePasswordSection: React.FC = () => {
  const { isServerVerifiedAdmin, logout } = useApp();
  const { request } = useAdminRequest();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const logoutTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (logoutTimer.current !== null) window.clearTimeout(logoutTimer.current);
    };
  }, []);

  if (!isServerVerifiedAdmin) {
    return <AdminEmpty>A server-verified administrator session is required.</AdminEmpty>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Current password, new password, and confirmation are all required.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from the current password.');
      return;
    }
    setSaving(true);
    try {
      const data = await request('/api/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setSuccess(
        typeof data.message === 'string'
          ? `${data.message} Signing you out — sign in again with the new password.`
          : 'Password changed. Signing you out — sign in again with the new password.'
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // All sessions (including this one) were revoked server-side.
      logoutTimer.current = window.setTimeout(() => logout(), 2500);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not change password. The server endpoint may not be deployed yet.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && <AdminError message={error} onDismiss={() => setError('')} />}
      {success && <AdminSuccess message={success} />}
      <AdminSectionTitle
        title="Change password"
        subtitle="Your current password is checked first. The new password must be at least 8 characters. Every live session for this account is signed out when the password changes."
      />
      <AdminCard>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Current password *</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">New password (min 8 characters) *</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Confirm new password *</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className={`${inputCls} pl-9`}
              />
            </div>
          </div>
          <button type="submit" disabled={saving} className={primaryBtnCls}>
            {saving ? 'Changing password…' : 'Change password'}
          </button>
        </form>
      </AdminCard>
    </div>
  );
};
