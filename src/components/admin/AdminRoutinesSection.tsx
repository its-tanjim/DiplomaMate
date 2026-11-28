/**
 * Admin Routines (module 3).
 * GET /api/admin/routines?department=&semester=&day=
 * POST /api/admin/routines · PATCH /api/admin/routines/:id
 * POST /api/admin/routines/:id/publish · POST /api/admin/routines/:id/archive
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
  ConfirmDialog,
  formatDateTime,
  inputCls,
  outlineBtnCls,
  primaryBtnCls,
  selectCls,
  useAdminRequest,
} from './shared';
import { CalendarDays, Pencil, Plus, RefreshCw, X } from 'lucide-react';
import { TECHNOLOGIES_DIRECTORY } from '../../data/directoryData';

type RoutineKind = 'class' | 'exam';
type RoutineStatus = 'draft' | 'published' | 'archived';

type AdminRoutine = {
  id: string;
  department?: string;
  semester?: number | string;
  day?: string;
  startTime?: string;
  endTime?: string;
  subject?: string;
  room?: string;
  teacher?: string;
  kind?: RoutineKind | string;
  status?: RoutineStatus | string;
  createdAt?: string;
};

type RoutineDraft = {
  id?: string;
  department: string;
  semester: string;
  day: string;
  startTime: string;
  endTime: string;
  subject: string;
  room: string;
  teacher: string;
  kind: RoutineKind;
};

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const emptyDraft = (): RoutineDraft => ({
  department: TECHNOLOGIES_DIRECTORY[0]?.name || '',
  semester: '1',
  day: 'Saturday',
  startTime: '09:00',
  endTime: '09:50',
  subject: '',
  room: '',
  teacher: '',
  kind: 'class',
});

const statusCls: Record<string, string> = {
  draft: 'border-slate-200 bg-slate-100 text-slate-600',
  published: 'border-teal-200 bg-teal-50 text-teal-700',
  archived: 'border-slate-200 bg-slate-100 text-slate-500',
};

export const AdminRoutinesSection: React.FC = () => {
  const { isServerVerifiedAdmin } = useApp();
  const { request } = useAdminRequest();
  const [routines, setRoutines] = useState<AdminRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');
  const [day, setDay] = useState('');
  const [draft, setDraft] = useState<RoutineDraft | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<AdminRoutine | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (department) params.set('department', department);
      if (semester) params.set('semester', semester);
      if (day) params.set('day', day);
      const query = params.toString();
      const data = await request(`/api/admin/routines${query ? `?${query}` : ''}`);
      const list = (data.routines || data.items || []) as AdminRoutine[];
      setRoutines(list);
    } catch (loadError) {
      setRoutines([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load routines. The server endpoint may not be deployed yet.'
      );
    } finally {
      setLoading(false);
    }
  }, [request, department, semester, day]);

  useEffect(() => {
    if (isServerVerifiedAdmin) void load();
  }, [isServerVerifiedAdmin, load]);

  const notifySuccess = (message: string) => {
    setSuccess(message);
    window.setTimeout(() => setSuccess(''), 3500);
  };

  const saveRoutine = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        department: draft.department,
        semester: Number(draft.semester),
        day: draft.day,
        startTime: draft.startTime,
        endTime: draft.endTime,
        subject: draft.subject.trim(),
        room: draft.room.trim(),
        teacher: draft.teacher.trim(),
        kind: draft.kind,
      };
      const data = await request(
        draft.id ? `/api/admin/routines/${encodeURIComponent(draft.id)}` : '/api/admin/routines',
        { method: draft.id ? 'PATCH' : 'POST', body: JSON.stringify(body) }
      );
      setDraft(null);
      notifySuccess(typeof data.message === 'string' ? data.message : draft.id ? 'Routine updated.' : 'Routine created.');
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save routine.');
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (routine: AdminRoutine, action: 'publish' | 'archive') => {
    setSaving(true);
    setError('');
    try {
      const data = await request(`/api/admin/routines/${encodeURIComponent(routine.id)}/${action}`, { method: 'POST' });
      notifySuccess(typeof data.message === 'string' ? data.message : action === 'publish' ? 'Routine published.' : 'Routine archived.');
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Could not ${action} routine.`);
    } finally {
      setSaving(false);
      setConfirmArchive(null);
    }
  };

  const openEdit = (routine: AdminRoutine) => {
    setDraft({
      id: routine.id,
      department: routine.department || TECHNOLOGIES_DIRECTORY[0]?.name || '',
      semester: String(routine.semester || '1'),
      day: routine.day || 'Saturday',
      startTime: routine.startTime || '09:00',
      endTime: routine.endTime || '09:50',
      subject: routine.subject || '',
      room: routine.room || '',
      teacher: routine.teacher || '',
      kind: (routine.kind as RoutineKind) || 'class',
    });
  };

  if (!isServerVerifiedAdmin) {
    return <AdminEmpty>A server-verified administrator session is required.</AdminEmpty>;
  }

  return (
    <div className="space-y-3">
      {error && <AdminError message={error} onDismiss={() => setError('')} />}
      {success && <AdminSuccess message={success} />}
      <AdminSectionTitle
        title="Class routines"
        subtitle="Create and publish weekly routines by department, semester and day."
        action={
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} className={outlineBtnCls}>
              <RefreshCw aria-hidden="true" className="inline h-3.5 w-3.5" /> Refresh
            </button>
            <button type="button" onClick={() => setDraft(emptyDraft())} className={primaryBtnCls}>
              <Plus aria-hidden="true" className="inline h-3.5 w-3.5" /> New routine
            </button>
          </div>
        }
      />
      <div className="flex flex-wrap gap-2">
        <select value={department} onChange={e => setDepartment(e.target.value)} className={selectCls} aria-label="Filter by department">
          <option value="">All departments</option>
          {TECHNOLOGIES_DIRECTORY.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
        </select>
        <select value={semester} onChange={e => setSemester(e.target.value)} className={selectCls} aria-label="Filter by semester">
          <option value="">All semesters</option>
          {Array.from({ length: 8 }, (_, i) => <option key={i + 1} value={String(i + 1)}>Semester {i + 1}</option>)}
        </select>
        <select value={day} onChange={e => setDay(e.target.value)} className={selectCls} aria-label="Filter by day">
          <option value="">All days</option>
          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {loading ? (
        <AdminEmpty>Loading routines…</AdminEmpty>
      ) : !routines.length ? (
        <AdminEmpty>No routines match these filters yet.</AdminEmpty>
      ) : (
        <div className="grid gap-2">
          {routines.map(routine => (
            <AdminCard key={routine.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-blue-600" />
                    <h3 className="text-sm font-bold text-text-primary">{routine.subject || 'Untitled routine'}</h3>
                    <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 capitalize">{routine.kind || 'class'}</span>
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize ${statusCls[String(routine.status || 'draft')] || statusCls.draft}`}>
                      {routine.status || 'draft'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {routine.department || '—'} · Semester {routine.semester ?? '—'} · {routine.day || '—'} · {routine.startTime || '—'}–{routine.endTime || '—'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {routine.teacher ? `Teacher: ${routine.teacher}` : ''}
                    {routine.teacher && routine.room ? ' · ' : ''}
                    {routine.room ? `Room: ${routine.room}` : ''}
                    {routine.createdAt ? ` · Created ${formatDateTime(routine.createdAt)}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button type="button" onClick={() => openEdit(routine)} disabled={saving} className={outlineBtnCls}>
                    <Pencil aria-hidden="true" className="inline h-3.5 w-3.5" /> Edit
                  </button>
                  {routine.status !== 'published' && (
                    <button type="button" onClick={() => void runAction(routine, 'publish')} disabled={saving} className="rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50">
                      Publish
                    </button>
                  )}
                  {routine.status !== 'archived' && (
                    <button type="button" onClick={() => setConfirmArchive(routine)} disabled={saving} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
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
          labelledBy="admin-routine-modal-title"
          panelClassName="dm-modal-panel max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface shadow-2xl"
          overlayClassName="dm-modal-overlay fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3"
          panelAsForm
          onSubmit={saveRoutine}
          showCloseButton={false}
        >
          <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-surface p-4">
            <h2 id="admin-routine-modal-title" className="font-bold text-text-primary">{draft.id ? 'Edit routine' : 'New routine'}</h2>
            <button type="button" onClick={() => setDraft(null)} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100"><X aria-hidden="true" className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Department
              <select value={draft.department} onChange={e => setDraft({ ...draft, department: e.target.value })} className={inputCls}>
                {TECHNOLOGIES_DIRECTORY.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Semester
              <select value={draft.semester} onChange={e => setDraft({ ...draft, semester: e.target.value })} className={inputCls}>
                {Array.from({ length: 8 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Day
              <select value={draft.day} onChange={e => setDraft({ ...draft, day: e.target.value })} className={inputCls}>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Type
              <select value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value as RoutineKind })} className={inputCls}>
                <option value="class">Class</option>
                <option value="exam">Exam</option>
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Start time
              <input type="time" required value={draft.startTime} onChange={e => setDraft({ ...draft, startTime: e.target.value })} className={inputCls} />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              End time
              <input type="time" required value={draft.endTime} onChange={e => setDraft({ ...draft, endTime: e.target.value })} className={inputCls} />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">
              Subject
              <input required maxLength={200} value={draft.subject} onChange={e => setDraft({ ...draft, subject: e.target.value })} placeholder="e.g. Programming in C" className={inputCls} />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Room
              <input maxLength={100} value={draft.room} onChange={e => setDraft({ ...draft, room: e.target.value })} placeholder="e.g. Room 302" className={inputCls} />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Teacher
              <input maxLength={200} value={draft.teacher} onChange={e => setDraft({ ...draft, teacher: e.target.value })} placeholder="Teacher name (optional)" className={inputCls} />
            </label>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setDraft(null)} className={outlineBtnCls}>Cancel</button>
            <button type="submit" disabled={saving} className={primaryBtnCls}>{saving ? 'Saving…' : draft.id ? 'Save changes' : 'Create routine'}</button>
          </div>
        </Modal>
      )}

      {confirmArchive && (
        <ConfirmDialog
          title="Archive routine"
          message={`Archive the ${confirmArchive.subject || 'routine'} slot (${confirmArchive.day || ''} ${confirmArchive.startTime || ''}–${confirmArchive.endTime || ''})? It will no longer be shown to students.`}
          confirmLabel="Archive"
          busy={saving}
          onConfirm={() => void runAction(confirmArchive, 'archive')}
          onCancel={() => setConfirmArchive(null)}
        />
      )}
    </div>
  );
};
