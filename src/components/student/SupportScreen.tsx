import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, HelpCircle, LifeBuoy, RefreshCw, Send, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  createSupportTicket,
  fetchMySupportTickets,
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_PRIORITIES,
  type SupportTicket,
  type SupportTicketCategory,
  type SupportTicketPriority
} from '../../services/supportService';

// Help / Support: the student files a ticket (POST /api/support/tickets)
// and sees their own tickets below the form (GET /api/support/tickets/mine).
export const SupportScreen: React.FC = () => {
  const { setActiveScreen, showToast } = useApp();

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<SupportTicketCategory>('other');
  const [priority, setPriority] = useState<SupportTicketPriority>('medium');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdTicket, setCreatedTicket] = useState<SupportTicket | null>(null);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketsFailed, setTicketsFailed] = useState(false);

  const loadTickets = async () => {
    setLoadingTickets(true);
    setTicketsFailed(false);
    try {
      setTickets(await fetchMySupportTickets());
    } catch {
      setTicketsFailed(true);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    void loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const ticket = await createSupportTicket({
        subject: subject.trim(),
        category,
        priority,
        description: description.trim()
      });
      setCreatedTicket(ticket);
      setSubject('');
      setDescription('');
      setCategory('other');
      setPriority('medium');
      showToast('Support ticket submitted.');
      void loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (value: string) => {
    const time = Date.parse(value);
    if (!time) return value;
    return new Date(time).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const statusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'resolved' || s === 'closed') return 'bg-teal-50 text-teal-700 border-teal-200';
    if (s === 'in_progress' || s === 'in-progress' || s === 'answered') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveScreen('settings')}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer shrink-0"
            aria-label="Back to settings"
            title="Back"
          >
            <ArrowLeft aria-hidden="true" className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
            <LifeBuoy aria-hidden="true" className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary">Help &amp; Support</h1>
            <p className="text-[11px] text-slate-500">Report a problem or ask for help</p>
          </div>
        </div>
      </div>

      {createdTicket && (
        <div role="status" className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-teal-900 flex items-start gap-2 shadow-xs">
          <CheckCircle2 aria-hidden="true" className="w-4 h-4 shrink-0 text-teal-600 mt-px" />
          <div>
            <p className="text-xs font-bold">Ticket submitted successfully.</p>
            <p className="text-xs leading-relaxed mt-0.5">
              Your ticket ID is <strong className="font-mono">{createdTicket.id}</strong>.
              Keep it for reference — an admin will reply to it.
            </p>
            <button
              type="button"
              onClick={() => setCreatedTicket(null)}
              className="mt-2 text-[11px] font-semibold text-teal-700 hover:text-teal-900 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* New ticket form */}
      <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <HelpCircle aria-hidden="true" className="w-4 h-4 text-brand-blue" />
          <h2 className="text-sm font-bold text-text-primary">New support ticket</h2>
        </div>

        <div>
          <label htmlFor="support-subject" className="block text-xs font-semibold text-slate-700 mb-1">Subject</label>
          <input
            id="support-subject"
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="e.g. Routine for 5th semester is missing"
            maxLength={120}
            required
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary font-medium"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="support-category" className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
            <select
              id="support-category"
              value={category}
              onChange={e => setCategory(e.target.value as SupportTicketCategory)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary font-medium"
            >
              {SUPPORT_TICKET_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="support-priority" className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
            <select
              id="support-priority"
              value={priority}
              onChange={e => setPriority(e.target.value as SupportTicketPriority)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary font-medium"
            >
              {SUPPORT_TICKET_PRIORITIES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="support-description" className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
          <textarea
            id="support-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the problem in detail…"
            rows={4}
            maxLength={2000}
            required
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-text-primary font-medium resize-y"
          />
        </div>

        {error && (
          <div role="alert" className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle aria-hidden="true" className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !subject.trim() || !description.trim()}
          className="w-full py-2.5 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Send aria-hidden="true" className="w-3.5 h-3.5" />
          <span>{submitting ? 'Submitting…' : 'Submit ticket'}</span>
        </button>
      </form>

      {/* My tickets */}
      <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-sm font-bold text-text-primary">My tickets</h2>
          <button
            type="button"
            onClick={() => void loadTickets()}
            disabled={loadingTickets}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
            aria-label="Refresh my tickets"
            title="Refresh"
          >
            <RefreshCw aria-hidden="true" className={`w-4 h-4 ${loadingTickets ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingTickets ? (
          <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw aria-hidden="true" className="w-4 h-4 animate-spin text-teal-600" />
            <span>Loading your tickets…</span>
          </div>
        ) : ticketsFailed ? (
          <p className="text-xs text-slate-500 text-center p-2">Could not load your tickets. Pull to refresh.</p>
        ) : tickets.length === 0 ? (
          <p className="text-xs text-slate-500 text-center p-2">You have not submitted any tickets yet.</p>
        ) : (
          tickets.map(ticket => (
            <div key={ticket.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xs font-bold text-text-primary">{ticket.subject}</h3>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${statusStyle(ticket.status)}`}>
                  {ticket.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                <span className="font-mono">{ticket.id}</span>
                {' · '}
                {SUPPORT_TICKET_CATEGORIES.find(c => c.value === ticket.category)?.label || ticket.category}
                {' · '}
                {ticket.priority} priority
                {ticket.createdAt && ` · ${formatDate(ticket.createdAt)}`}
              </p>
              {ticket.description && (
                <p className="text-xs text-slate-700 leading-relaxed">{ticket.description}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
