/**
 * Admin session control (module 8).
 * GET /api/admin/sessions · POST /api/admin/sessions/:id/revoke
 * Revoking asks for confirmation first.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AdminCard,
  AdminEmpty,
  AdminError,
  AdminSectionTitle,
  AdminSuccess,
  ConfirmDialog,
  formatDateTime,
  outlineBtnCls,
  useAdminRequest,
} from './shared';
import { MonitorSmartphone, RefreshCw } from 'lucide-react';

type AdminSession = {
  // A1: sessionId is an opaque UUID (the revoke key), never a bearer
  // token. tokenFingerprint is the first 8 chars of the token + '…' —
  // display-only, it cannot be used as a bearer token.
  sessionId: string;
  tokenFingerprint?: string;
  id?: string;
  user?: string;
  userName?: string;
  userId?: string;
  email?: string;
  role?: string;
  createdAt?: string;
  lastSeenAt?: string;
  device?: string;
};

export const AdminSessionsSection: React.FC = () => {
  const { isServerVerifiedAdmin } = useApp();
  const { request } = useAdminRequest();
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmRevoke, setConfirmRevoke] = useState<AdminSession | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request('/api/admin/sessions');
      const list = (data.sessions || data.items || []) as AdminSession[];
      setSessions(list);
    } catch (loadError) {
      setSessions([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load sessions. The server endpoint may not be deployed yet.'
      );
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (isServerVerifiedAdmin) void load();
  }, [isServerVerifiedAdmin, load]);

  const revoke = async (session: AdminSession) => {
    const id = session.sessionId || session.id || '';
    setRevoking(true);
    setError('');
    try {
      const data = await request(`/api/admin/sessions/${encodeURIComponent(id)}/revoke`, { method: 'POST' });
      setSuccess(typeof data.message === 'string' ? data.message : 'Session revoked — the user is signed out.');
      window.setTimeout(() => setSuccess(''), 3500);
      await load();
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'Could not revoke session.');
    } finally {
      setRevoking(false);
      setConfirmRevoke(null);
    }
  };

  if (!isServerVerifiedAdmin) {
    return <AdminEmpty>A server-verified administrator session is required.</AdminEmpty>;
  }

  return (
    <div className="space-y-3">
      {error && <AdminError message={error} onDismiss={() => setError('')} />}
      {success && <AdminSuccess message={success} />}
      <AdminSectionTitle
        title="Active sessions"
        subtitle="Every signed-in session. Revoking signs that user out immediately on all their devices for that session."
        action={
          <button type="button" onClick={() => void load()} className={outlineBtnCls}>
            <RefreshCw aria-hidden="true" className="inline h-3.5 w-3.5" /> Refresh
          </button>
        }
      />
      {loading ? (
        <AdminEmpty>Loading sessions…</AdminEmpty>
      ) : !sessions.length ? (
        <AdminEmpty>No active sessions.</AdminEmpty>
      ) : (
        <div className="grid gap-2">
          {sessions.map(session => {
            const id = session.sessionId || session.id || '';
            const who = session.user || session.userName || session.email || session.userId || 'Unknown user';
            return (
              <AdminCard key={id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex items-start gap-2">
                    <MonitorSmartphone aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-text-primary">{who}</h3>
                        {session.role && (
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-blue-700 border border-blue-200">
                            {String(session.role).replaceAll('_', ' ')}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Session <span className="font-mono">{id.slice(0, 16)}{id.length > 16 ? '…' : ''}</span>
                        {session.tokenFingerprint ? (
                          <span> · Token <span className="font-mono">{session.tokenFingerprint}</span></span>
                        ) : null}
                        {session.device ? ` · ${session.device}` : ''}
                        {session.createdAt ? ` · Signed in ${formatDateTime(session.createdAt)}` : ''}
                        {session.lastSeenAt ? ` · Last seen ${formatDateTime(session.lastSeenAt)}` : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmRevoke(session)}
                    disabled={revoking}
                    className="shrink-0 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  >
                    Force logout
                  </button>
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}

      {confirmRevoke && (
        <ConfirmDialog
          title="Force logout"
          message={`Revoke this session for ${confirmRevoke.user || confirmRevoke.userName || confirmRevoke.email || 'this user'}? They will be signed out immediately and must sign in again.`}
          confirmLabel="Force logout"
          busy={revoking}
          onConfirm={() => void revoke(confirmRevoke)}
          onCancel={() => setConfirmRevoke(null)}
        />
      )}
    </div>
  );
};
