/**
 * Admin support tickets (module 9).
 * GET /api/admin/tickets · PATCH /api/admin/tickets/:id
 * POST /api/admin/tickets/:id/notes
 * Detail view: assign, change priority/status, internal notes, resolution.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import {
  AdminCard,
  AdminEmpty,
  AdminError,
  AdminSectionTitle,
  AdminSuccess,
  formatDateTime,
  inputCls,
  outlineBtnCls,
  primaryBtnCls,
  selectCls,
  useAdminRequest,
} from './shared';
import { LifeBuoy, RefreshCw, X } from 'lucide-react';

type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

type TicketNote = {
  id: string;
  author?: string;
  authorName?: string;
  body?: string;
  text?: string;
  createdAt?: string;
};

type SupportTicket = {
  id: string;
  subject?: string;
  title?: string;
  description?: string;
  message?: string;
  status?: TicketStatus | string;
  priority?: TicketPriority | string;
  userName?: string;
  userEmail?: string;
  userId?: string;
  assignedTo?: string;
  assignee?: string;
  assigneeId?: string | null;
  resolution?: string;
  notes?: TicketNote[];
  createdAt?: string;
  updatedAt?: string;
};

const statusCls: Record<string, string> = {
  open: 'border-blue-200 bg-blue-50 text-blue-700',
  in_progress: 'border-amber-200 bg-amber-50 text-amber-700',
  waiting: 'border-violet-200 bg-violet-50 text-violet-700',
  resolved: 'border-teal-200 bg-teal-50 text-teal-700',
  closed: 'border-slate-200 bg-slate-100 text-slate-500',
};

const priorityCls: Record<string, string> = {
  low: 'border-slate-200 bg-slate-100 text-slate-600',
  medium: 'border-blue-200 bg-blue-50 text-blue-700',
  high: 'border-amber-200 bg-amber-50 text-amber-700',
  urgent: 'border-rose-200 bg-rose-50 text-rose-700',
};

export const AdminTicketsSection: React.FC = () => {
  const { isServerVerifiedAdmin } = useApp();
  const { request } = useAdminRequest();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TicketPriority>('all');
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [editStatus, setEditStatus] = useState<TicketStatus>('open');
  const [editPriority, setEditPriority] = useState<TicketPriority>('medium');
  const [editAssignee, setEditAssignee] = useState('');
  const [editResolution, setEditResolution] = useState('');
  const [noteText, setNoteText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request('/api/admin/tickets');
      const list = (data.tickets || data.items || []) as SupportTicket[];
      setTickets(list);
    } catch (loadError) {
      setTickets([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load tickets. The server endpoint may not be deployed yet.'
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

  const openTicket = (ticket: SupportTicket) => {
    setSelected(ticket);
    setEditStatus((ticket.status as TicketStatus) || 'open');
    setEditPriority((ticket.priority as TicketPriority) || 'medium');
    setEditAssignee(ticket.assigneeId || ticket.assignedTo || ticket.assignee || '');
    setEditResolution(ticket.resolution || '');
    setNoteText('');
  };

  const saveTicket = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const data = await request(`/api/admin/tickets/${encodeURIComponent(selected.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: editStatus,
          priority: editPriority,
          assigneeId: editAssignee.trim() || undefined,
          resolution: editResolution.trim() || undefined,
        }),
      });
      notifySuccess(typeof data.message === 'string' ? data.message : 'Ticket updated.');
      setSelected(null);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update ticket.');
    } finally {
      setSaving(false);
    }
  };

  const addNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || !noteText.trim()) return;
    setSaving(true);
    setError('');
    try {
      const data = await request(`/api/admin/tickets/${encodeURIComponent(selected.id)}/notes`, {
        method: 'POST',
        body: JSON.stringify({ text: noteText.trim(), body: noteText.trim() }),
      });
      const newNote = (data.note || {}) as TicketNote;
      setSelected(prev =>
        prev ? { ...prev, notes: [...(prev.notes || []), { id: newNote.id || `note-${Date.now()}`, author: newNote.author || newNote.authorName || 'Admin', body: newNote.body || newNote.text || noteText.trim(), createdAt: newNote.createdAt || new Date().toISOString() }] } : prev
      );
      setNoteText('');
      notifySuccess(typeof data.message === 'string' ? data.message : 'Internal note added.');
    } catch (noteError) {
      setError(noteError instanceof Error ? noteError.message : 'Could not add note.');
    } finally {
      setSaving(false);
    }
  };

  const visible = useMemo(
    () =>
      tickets.filter(
        t =>
          (statusFilter === 'all' || t.status === statusFilter) &&
          (priorityFilter === 'all' || t.priority === priorityFilter)
      ),
    [tickets, statusFilter, priorityFilter]
  );

  if (!isServerVerifiedAdmin) {
    return <AdminEmpty>A server-verified administrator session is required.</AdminEmpty>;
  }

  return (
    <div className="space-y-3">
      {error && <AdminError message={error} onDismiss={() => setError('')} />}
      {success && <AdminSuccess message={success} />}
      <AdminSectionTitle
        title="Support tickets"
        subtitle="User support queue — assign, prioritise, reply with internal notes, and record the resolution."
        action={
          <button type="button" onClick={() => void load()} className={outlineBtnCls}>
            <RefreshCw aria-hidden="true" className="inline h-3.5 w-3.5" /> Refresh
          </button>
        }
      />
      <div className="flex flex-wrap gap-2">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | TicketStatus)} className={selectCls} aria-label="Filter tickets by status">
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="waiting">Waiting</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as 'all' | TicketPriority)} className={selectCls} aria-label="Filter tickets by priority">
          <option value="all">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {loading ? (
        <AdminEmpty>Loading tickets…</AdminEmpty>
      ) : !visible.length ? (
        <AdminEmpty>No tickets match these filters.</AdminEmpty>
      ) : (
        <div className="grid gap-2">
          {visible.map(ticket => (
            <AdminCard key={ticket.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex items-start gap-2">
                  <LifeBuoy aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-text-primary">{ticket.subject || ticket.title || 'Untitled ticket'}</h3>
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize ${statusCls[String(ticket.status || 'open')] || statusCls.open}`}>
                        {String(ticket.status || 'open').replaceAll('_', ' ')}
                      </span>
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize ${priorityCls[String(ticket.priority || 'medium')] || priorityCls.medium}`}>
                        {ticket.priority || 'medium'}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-600">{ticket.description || ticket.message || ''}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {ticket.userName || ticket.userEmail || ticket.userId || 'Unknown user'}
                      {ticket.assigneeId || ticket.assignedTo || ticket.assignee ? ` · Assigned to ${ticket.assigneeId || ticket.assignedTo || ticket.assignee}` : ' · Unassigned'}
                      {ticket.createdAt ? ` · ${formatDateTime(ticket.createdAt)}` : ''}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => openTicket(ticket)} className="shrink-0 rounded-xl bg-brand-blue px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">
                  Open ticket
                </button>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {selected && (
        <Modal
          onClose={() => setSelected(null)}
          labelledBy="admin-ticket-title"
          panelClassName="my-auto max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface shadow-2xl"
          overlayClassName="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3"
          showCloseButton={false}
        >
          <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-surface p-4">
            <div>
              <h2 id="admin-ticket-title" className="font-bold text-text-primary">{selected.subject || selected.title || 'Ticket'}</h2>
              <p className="text-xs text-slate-500">
                {selected.userName || selected.userEmail || selected.userId || 'Unknown user'}
                {selected.createdAt ? ` · Opened ${formatDateTime(selected.createdAt)}` : ''}
              </p>
            </div>
            <button type="button" onClick={() => setSelected(null)} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100"><X aria-hidden="true" className="h-4 w-4" /></button>
          </div>
          <div className="space-y-4 p-4">
            <p className="rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">{selected.description || selected.message || 'No description provided.'}</p>
            <form onSubmit={saveTicket} className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                Status
                <select value={editStatus} onChange={e => setEditStatus(e.target.value as TicketStatus)} className={inputCls}>
                  <option value="open">Open</option>
                  <option value="in_progress">In progress</option>
                  <option value="waiting">Waiting on user</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">
                Priority
                <select value={editPriority} onChange={e => setEditPriority(e.target.value as TicketPriority)} className={inputCls}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">
                Assign to (admin name or email)
                <input value={editAssignee} onChange={e => setEditAssignee(e.target.value)} placeholder="e.g. support@diplomamate.online" className={inputCls} />
              </label>
              <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">
                Resolution
                <textarea rows={3} maxLength={2000} value={editResolution} onChange={e => setEditResolution(e.target.value)} placeholder="What was done to resolve this ticket?" className={inputCls} />
              </label>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button type="button" onClick={() => setSelected(null)} className={outlineBtnCls}>Close</button>
                <button type="submit" disabled={saving} className={primaryBtnCls}>{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </form>
            <div>
              <h3 className="mb-2 text-sm font-bold text-text-primary">Internal notes</h3>
              <p className="mb-2 text-[11px] text-slate-500">Only admins can see these notes — they are never shown to the user.</p>
              <div className="space-y-2">
                {(selected.notes || []).map(note => (
                  <div key={note.id} className="rounded-xl bg-slate-50 p-3 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="font-bold text-slate-700">{note.author || note.authorName || 'Admin'}</span>
                      <time className="text-slate-500">{formatDateTime(note.createdAt)}</time>
                    </div>
                    <p className="mt-1 leading-relaxed text-slate-600">{note.body || note.text}</p>
                  </div>
                ))}
                {!(selected.notes || []).length && <p className="text-xs text-slate-500">No internal notes yet.</p>}
              </div>
              <form onSubmit={addNote} className="mt-3 flex gap-2">
                <input
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Add an internal note…"
                  className={inputCls}
                  aria-label="Add an internal note"
                />
                <button type="submit" disabled={saving || !noteText.trim()} className={primaryBtnCls}>Add note</button>
              </form>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
