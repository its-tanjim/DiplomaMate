/**
 * Admin broadcast notifications (module 2) — IN-APP only.
 * GET /api/admin/notifications/history
 * POST /api/admin/notifications/send { title, message, audienceType, audience, channel: 'in-app' }
 * Push (FCM) is not wired yet — the UI says so explicitly.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AdminCard,
  AdminEmpty,
  AdminError,
  AdminSectionTitle,
  AdminSuccess,
  AudienceFields,
  audienceLabel,
  formatDateTime,
  inputCls,
  primaryBtnCls,
  useAdminRequest,
  type AudienceType,
} from './shared';
import { Bell, RefreshCw, Send } from 'lucide-react';

type NotificationHistoryItem = {
  id: string;
  title: string;
  message: string;
  audienceType?: AudienceType | string;
  audience?: string | number | null;
  channel?: string;
  recipientCount?: number;
  deliveredCount?: number;
  sentBy?: string;
  createdAt?: string;
  sentAt?: string;
};

export const AdminNotificationsSection: React.FC = () => {
  const { isServerVerifiedAdmin } = useApp();
  const { request } = useAdminRequest();
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audienceType, setAudienceType] = useState<AudienceType>('all');
  const [audience, setAudience] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request('/api/admin/notifications/history');
      const list = (data.history || data.notifications || data.items || []) as NotificationHistoryItem[];
      setHistory(list);
    } catch (loadError) {
      setHistory([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load notification history. The server endpoint may not be deployed yet.'
      );
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (isServerVerifiedAdmin) void load();
  }, [isServerVerifiedAdmin, load]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (audienceType !== 'all' && !audience.trim()) {
      setError('Choose an audience value (department or semester) before sending.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const data = await request('/api/admin/notifications/send', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          audienceType,
          audience: audienceType === 'all' ? undefined : audience.trim(),
          channel: 'in-app',
        }),
      });
      const count = typeof data.recipientCount === 'number' ? data.recipientCount : typeof data.deliveredCount === 'number' ? data.deliveredCount : null;
      setSuccess(typeof data.message === 'string' ? data.message : count !== null ? `Notification sent to ${count} user${count === 1 ? '' : 's'}.` : 'Notification sent.');
      setTitle('');
      setMessage('');
      setAudienceType('all');
      setAudience('');
      window.setTimeout(() => setSuccess(''), 4000);
      await load();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send notification.');
    } finally {
      setSending(false);
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
        title="Broadcast notifications"
        subtitle="Send an in-app notification to all users or one audience. It appears inside the app — no push notification is sent."
      />
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <strong>In-app only:</strong> push notifications (FCM) are not wired yet, so users see this
        message when they open DiplomaMate — it does not arrive as a phone notification.
      </div>

      <AdminCard>
        <form onSubmit={send} className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">
            Title
            <input required maxLength={150} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Class routine updated" className={inputCls} />
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">
            Message
            <textarea required maxLength={1000} rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Write the message users will see…" className={inputCls} />
          </label>
          <AudienceFields
            audienceType={audienceType}
            audience={audience}
            onChange={(nextType, nextAudience) => { setAudienceType(nextType); setAudience(nextAudience); }}
          />
          <div className="flex items-end sm:col-span-2">
            <button type="submit" disabled={sending} className={primaryBtnCls}>
              <Send aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
              {sending ? 'Sending…' : 'Send notification'}
            </button>
          </div>
        </form>
      </AdminCard>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-primary">Delivery history</h3>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>
      {loading ? (
        <AdminEmpty>Loading history…</AdminEmpty>
      ) : !history.length ? (
        <AdminEmpty>No notifications have been sent yet.</AdminEmpty>
      ) : (
        <div className="grid gap-2">
          {history.map(item => (
            <AdminCard key={item.id}>
              <div className="flex items-start gap-2">
                <Bell aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-text-primary">{item.title}</h4>
                    <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">in-app</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{item.message}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {audienceLabel(item.audienceType, item.audience)}
                    {typeof item.recipientCount === 'number' ? ` · ${item.recipientCount} recipients` : ''}
                    {typeof item.deliveredCount === 'number' ? ` · ${item.deliveredCount} delivered` : ''}
                    {item.sentBy ? ` · Sent by ${item.sentBy}` : ''}
                    {` · ${formatDateTime(item.sentAt || item.createdAt)}`}
                  </p>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}
    </div>
  );
};
