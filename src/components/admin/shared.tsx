/**
 * Shared helpers for the admin-only screens (src/components/admin/*).
 *
 * All admin API calls go through `useAdminRequest().request`, which sends
 * the admin session token as a Bearer header — the same pattern
 * AdminManagementScreen uses for /api/admin/management. Endpoints are
 * expected to answer `{ success: true, ... }`; a non-2xx response or an
 * explicit `success: false` throws with the server's error message.
 *
 * Nothing in this file is imported by the main app (src/App.tsx), so none
 * of it can leak admin UI into the student build.
 */
import React, { useCallback, useMemo } from 'react';
import { apiFetch } from '../../services/apiClient';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { TECHNOLOGIES_DIRECTORY } from '../../data/directoryData';

export function useAdminRequest() {
  const { authToken } = useApp();
  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    }),
    [authToken]
  );

  /** JSON admin call. Returns the parsed body; throws on failure. */
  const request = useCallback(
    async (url: string, init: RequestInit = {}): Promise<Record<string, unknown>> => {
      const response = await apiFetch(url, {
        ...init,
        headers: { ...headers, ...(init.headers || {}) },
      });
      const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok || body.success === false) {
        throw new Error(
          typeof body.error === 'string'
            ? body.error
            : typeof body.message === 'string'
              ? body.message
              : `Request failed (${response.status}).`
        );
      }
      return body;
    },
    [headers]
  );

  /** Raw authenticated fetch (for CSV/blob downloads — no JSON parsing). */
  const authedFetch = useCallback(
    (url: string, init: RequestInit = {}) =>
      apiFetch(url, { ...init, headers: { ...headers, ...(init.headers || {}) } }),
    [headers]
  );

  return { request, authedFetch, authToken };
}

/** Download a blob response as a file (same anchor-click pattern the app uses elsewhere). */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-text-primary outline-none focus:border-blue-400';
export const selectCls =
  'rounded-xl border border-slate-200 bg-surface px-3 py-2 text-xs text-text-primary outline-none focus:border-blue-400';
export const primaryBtnCls =
  'rounded-xl bg-brand-blue px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50';
export const outlineBtnCls =
  'rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
export const dangerBtnCls =
  'rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50';

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

export function AdminError({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss error" className="font-bold">✕</button>
    </div>
  );
}

export function AdminSuccess({ message }: { message: string }) {
  return (
    <div role="status" className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs text-teal-800">
      {message}
    </div>
  );
}

export function AdminEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-surface p-8 text-center text-xs text-slate-500">
      {children}
    </div>
  );
}

export function AdminCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function AdminSectionTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-bold text-text-primary">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** Confirm dialog for destructive actions (archive, revoke, deactivate…). */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  danger = true,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      onClose={onCancel}
      labelledBy="admin-confirm-dialog-title"
      panelClassName="my-auto w-full max-w-md rounded-2xl bg-surface p-5 shadow-2xl"
      overlayClassName="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3"
      showCloseButton={false}
    >
      <h2 id="admin-confirm-dialog-title" className="text-base font-bold text-text-primary">{title}</h2>
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{message}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className={outlineBtnCls}>Cancel</button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={danger ? 'rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50' : primaryBtnCls}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/** Audience picker shared by notices + broadcast composer. */
export type AudienceType = 'all' | 'department' | 'semester';

export function AudienceFields({
  audienceType,
  audience,
  onChange,
}: {
  audienceType: AudienceType;
  audience: string;
  onChange: (audienceType: AudienceType, audience: string) => void;
}) {
  return (
    <>
      <label className="space-y-1 text-xs font-semibold text-slate-700">
        Audience
        <select
          value={audienceType}
          onChange={event => onChange(event.target.value as AudienceType, '')}
          className={inputCls}
        >
          <option value="all">All users</option>
          <option value="department">Department</option>
          <option value="semester">Semester</option>
        </select>
      </label>
      {audienceType === 'department' && (
        <label className="space-y-1 text-xs font-semibold text-slate-700">
          Department
          <input
            required
            list="admin-audience-departments"
            value={audience}
            onChange={event => onChange(audienceType, event.target.value)}
            placeholder="e.g. Computer Science & Technology"
            className={inputCls}
          />
          <datalist id="admin-audience-departments">
            {TECHNOLOGIES_DIRECTORY.map(item => <option key={item.id} value={item.name} />)}
          </datalist>
        </label>
      )}
      {audienceType === 'semester' && (
        <label className="space-y-1 text-xs font-semibold text-slate-700">
          Semester
          <select value={audience} onChange={event => onChange(audienceType, event.target.value)} className={inputCls}>
            <option value="">Select semester</option>
            {Array.from({ length: 8 }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>Semester {i + 1}</option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}

export function audienceLabel(audienceType?: string, audience?: string | number | null): string {
  if (!audienceType || audienceType === 'all') return 'All users';
  if (audienceType === 'department') return `Department: ${audience || '—'}`;
  if (audienceType === 'semester') return `Semester ${audience || '—'}`;
  return String(audienceType);
}
