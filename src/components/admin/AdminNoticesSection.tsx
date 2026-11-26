/**
 * Admin Notices (module 1).
 * GET /api/admin/notices · POST /api/admin/notices · PATCH /api/admin/notices/:id
 * POST /api/admin/notices/:id/publish · POST /api/admin/notices/:id/archive
 * If the server endpoints are not deployed yet the list shows a note instead
 * of breaking the admin panel.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import {
  AdminCard,
  AdminEmpty,
  AdminError,
  AdminSectionTitle,
  AdminSuccess,
  AudienceFields,
  ConfirmDialog,
  audienceLabel,
  formatDateTime,
  inputCls,
  outlineBtnCls,
  primaryBtnCls,
  selectCls,
  useAdminRequest,
  type AudienceType,
} from './shared';
import { Megaphone, Pencil, Plus, RefreshCw, X } from 'lucide-react';

type NoticeStatus = 'draft' | 'scheduled' | 'published' | 'archived';
type NoticePriority = 'Normal' | 'Important' | 'Urgent';

type AdminNotice = {
  id: string;
  title: string;
  body: string;
  audienceType?: AudienceType | string;
  audience?: string | number | null;
  priority?: NoticePriority | string;
  pinned?: boolean;
  status?: NoticeStatus | string;
  publishAt?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type NoticeDraft = {
  id?: string;
  title: string;
  body: string;
  audienceType: AudienceType;
  audience: string;
  priority: NoticePriority;
  pinned: boolean;
  publishAt: string;
  expiresAt: string;
};

const emptyDraft = (): NoticeDraft => ({
  title: '',
  body: '',
  audienceType: 'all',
  audience: '',
  priority: 'Normal',
  pinned: false,
  publishAt: '',
  expiresAt: '',
});

const priorityCls: Record<string, string> = {
  Normal: 'border-slate-200 bg-slate-100 text-slate-600',
  Important: 'border-amber-200 bg-amber-50 text-amber-700',
  Urgent: 'border-rose-200 bg-rose-50 text-rose-700',
};

const statusCls: Record<string, string> = {
  draft: 'border-slate-200 bg-slate-100 text-slate-600',
  scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
  published: 'border-teal-200 bg-teal-50 text-teal-700',
  archived: 'border-slate-200 bg-slate-100 text-slate-500',
};

function toInputDateTime(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const AdminNoticesSection: React.FC = () => {
  const { isServerVerifiedAdmin } = useApp();
  const { request } = useAdminRequest();
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | NoticeStatus>('all');
  const [draft, setDraft] = useState<NoticeDraft | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<AdminNotice | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request('/api/admin/notices');
      const list = (data.notices || data.items || []) as AdminNotice[];
      setNotices(list);
    } catch (loadError) {
      setNotices([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load notices. The server endpoint may not be deployed yet.'
      );
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (isServerVerifiedAdmin) void load();
  }, [isServerVerifiedAdmin, load]);

  const notifySuccess = (message: string) => {
    setSuccess(message);
    window.setTimeout(() => setSuccess(''), 3500);
  };

  const saveNotice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        title: draft.title.trim(),
        body: draft.body.trim(),
        audienceType: draft.audienceType,
        audience: draft.audienceType === 'all' ? undefined : draft.audience,
        priority: draft.priority,
        pinned: draft.pinned,
        publishAt: draft.publishAt ? new Date(draft.publishAt).toISOString() : undefined,
        expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : undefined,
      };
      const data = await request(
        draft.id ? `/api/admin/notices/${encodeURIComponent(draft.id)}` : '/api/admin/notices',
        { method: draft.id ? 'PATCH' : 'POST', body: JSON.stringify(body) }
      );
      setDraft(null);
      notifySuccess(typeof data.message === 'string' ? data.message : draft.id ? 'Notice updated.' : 'Notice created.');
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save notice.');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (notice: AdminNotice, action: 'publish' | 'archive') => {
    setSaving(true);
    setError('');
    try {
      const data = await request(`/api/admin/notices/${encodeURIComponent(notice.id)}/${action}`, { method: 'POST' });
      notifySuccess(typeof data.message === 'string' ? data.message : action === 'publish' ? 'Notice published.' : 'Notice archived.');
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Could not ${action} notice.`);
    } finally {
      setSaving(false);
      setConfirmArchive(null);
    }
  };

  const openEdit = (notice: AdminNotice) => {
    setDraft({
      id: notice.id,
      title: notice.title,
      body: notice.body,
      audienceType: (notice.audienceType as AudienceType) || 'all',
      audience: notice.audience != null ? String(notice.audience) : '',
      priority: (notice.priority as NoticePriority) || 'Normal',
      pinned: Boolean(notice.pinned),
      publishAt: toInputDateTime(notice.publishAt),
      expiresAt: toInputDateTime(notice.expiresAt),
    });
  };

  const visible = notices.filter(n => statusFilter === 'all' || n.status === statusFilter);

  if (!isServerVerifiedAdmin) {
    return <AdminEmpty>A server-verified administrator session is required.</AdminEmpty>;
  }

  return (
    <div className="space-y-3">
      {error && <AdminError message={error} onDismiss={() => setError('')} />}
      {success && <AdminSuccess message={success} />}
      <AdminSectionTitle
        title="Campus notices"
        subtitle="Create, schedule and publish notices for students, teachers and captains."
        action={
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} className={outlineBtnCls}>
              <RefreshCw aria-hidden="true" className="inline h-3.5 w-3.5" /> Refresh
            </button>
            <button type="button" onClick={() => setDraft(emptyDraft())} className={primaryBtnCls}>
              <Plus aria-hidden="true" className="inline h-3.5 w-3.5" /> New notice
            </button>
          </div>
        }
      />
      <div className="flex gap-2">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | NoticeStatus)} className={selectCls} aria-label="Filter notices by status">
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <AdminEmpty>Loading notices…</AdminEmpty>
      ) : !visible.length ? (
        <AdminEmpty>No notices match this filter yet.</AdminEmpty>
      ) : (
        <div className="grid gap-2">
          {visible.map(notice => (
            <AdminCard key={notice.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Megaphone aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-600" />
                    <h3 className="text-sm font-bold text-text-primary">{notice.title}</h3>
                    {notice.pinned && <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 border border-violet-200">Pinned</span>}
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${priorityCls[String(notice.priority || 'Normal')] || priorityCls.Normal}`}>
                      {notice.priority || 'Normal'}
                    </span>
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize ${statusCls[String(notice.status || 'draft')] || statusCls.draft}`}>
                      {notice.status || 'draft'}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{notice.body}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {audienceLabel(notice.audienceType, notice.audience)}
                    {notice.publishAt ? ` · Publishes ${formatDateTime(notice.publishAt)}` : ''}
                    {notice.expiresAt ? ` · Expires ${formatDateTime(notice.expiresAt)}` : ''}
                    {notice.createdAt ? ` · Created ${formatDateTime(notice.createdAt)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button type="button" onClick={() => openEdit(notice)} disabled={saving} className={outlineBtnCls}>
                    <Pencil aria-hidden="true" className="inline h-3.5 w-3.5" /> Edit
                  </button>
                  {notice.status !== 'published' && (
                    <button type="button" onClick={() => void runAction(notice, 'publish')} disabled={saving} className="rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50">
                      {notice.publishAt ? 'Publish now' : 'Publish'}
                    </button>
                  )}
                  {notice.status !== 'archived' && (
                    <button type="button" onClick={() => setConfirmArchive(notice)} disabled={saving} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                      Archive
                    </button>
                  )}
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {draft && (
        <Modal
          onClose={() => setDraft(null)}
          labelledBy="admin-notice-modal-title"
          panelClassName="my-auto max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface shadow-2xl"
          overlayClassName="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3"
          panelAsForm
          onSubmit={saveNotice}
          showCloseButton={false}
        >
          <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-surface p-4">
            <h2 id="admin-notice-modal-title" className="font-bold text-text-primary">{draft.id ? 'Edit notice' : 'New notice'}</h2>
            <button type="button" onClick={() => setDraft(null)} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100"><X aria-hidden="true" className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">
              Title
              <input required maxLength={200} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className={inputCls} />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">
              Body
              <textarea required maxLength={5000} rows={5} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} className={inputCls} />
            </label>
            <AudienceFields
              audienceType={draft.audienceType}
              audience={draft.audience}
              onChange={(audienceType, audience) => setDraft({ ...draft, audienceType, audience })}
            />
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Priority
              <select value={draft.priority} onChange={e => setDraft({ ...draft, priority: e.target.value as NoticePriority })} className={inputCls}>
                <option>Normal</option><option>Important</option><option>Urgent</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input type="checkbox" checked={draft.pinned} onChange={e => setDraft({ ...draft, pinned: e.target.checked })} />
              Pin to the top of the notice list
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Publish at (leave empty to publish immediately)
              <input type="datetime-local" value={draft.publishAt} onChange={e => setDraft({ ...draft, publishAt: e.target.value })} className={inputCls} />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Expires at (optional)
              <input type="datetime-local" value={draft.expiresAt} onChange={e => setDraft({ ...draft, expiresAt: e.target.value })} className={inputCls} />
            </label>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setDraft(null)} className={outlineBtnCls}>Cancel</button>
            <button type="submit" disabled={saving} className={primaryBtnCls}>
              {saving ? 'Saving…' : draft.id ? 'Save changes' : draft.publishAt ? 'Schedule notice' : 'Create notice'}
            </button>
          </div>
        </Modal>
      )}

      {confirmArchive && (
        <ConfirmDialog
          title="Archive notice"
          message={`Archive "${confirmArchive.title}"? It will no longer be shown to users. You can still see it under the Archived filter.`}
          confirmLabel="Archive"
          busy={saving}
          onConfirm={() => void runAction(confirmArchive, 'archive')}
          onCancel={() => setConfirmArchive(null)}
        />
      )}
    </div>
  );
};
