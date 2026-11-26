/**
 * Admin reports & export (module 6).
 * GET /api/admin/reports/activity — user-growth summary.
 * GET /api/admin/reports/users?format=csv&department=&semester=&status=
 *   — downloaded via authenticated fetch → blob → save.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AdminCard,
  AdminEmpty,
  AdminError,
  AdminSectionTitle,
  AdminSuccess,
  downloadBlob,
  selectCls,
  useAdminRequest,
} from './shared';
import { Download, FileSpreadsheet, RefreshCw, TrendingUp } from 'lucide-react';
import { TECHNOLOGIES_DIRECTORY } from '../../data/directoryData';

type ActivitySummary = {
  totalUsers?: number;
  newUsers7d?: number;
  newUsers30d?: number;
  activeUsers7d?: number;
  activeUsers30d?: number;
  byRole?: Record<string, number>;
  byDepartment?: Record<string, number>;
  bySemester?: Record<string, number>;
  signupsPerDay?: Array<{ date: string; count: number }>;
};

export const AdminReportsSection: React.FC = () => {
  const { isServerVerifiedAdmin } = useApp();
  const { request, authedFetch } = useAdminRequest();
  const [activity, setActivity] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request('/api/admin/reports/activity');
      setActivity((data.activity || data.summary || data) as ActivitySummary);
    } catch (loadError) {
      setActivity(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load activity reports. The server endpoint may not be deployed yet.'
      );
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (isServerVerifiedAdmin) void load();
  }, [isServerVerifiedAdmin, load]);

  const downloadUsersCsv = async () => {
    setDownloading(true);
    setError('');
    setSuccess('');
    try {
      const params = new URLSearchParams({ format: 'csv' });
      if (department) params.set('department', department);
      if (semester) params.set('semester', semester);
      if (status) params.set('status', status);
      const response = await authedFetch(`/api/admin/reports/users?${params.toString()}`);
      if (!response.ok) {
        const body = await response.json().catch(() => ({} as Record<string, unknown>));
        throw new Error(typeof body.error === 'string' ? body.error : `Export failed (${response.status}).`);
      }
      const blob = await response.blob();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `diplomamate-users-${stamp}.csv`);
      setSuccess('Users CSV downloaded.');
      window.setTimeout(() => setSuccess(''), 3500);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Could not download the users CSV.');
    } finally {
      setDownloading(false);
    }
  };

  if (!isServerVerifiedAdmin) {
    return <AdminEmpty>A server-verified administrator session is required.</AdminEmpty>;
  }

  const statCards: Array<[string, number | undefined]> = [
    ['Total users', activity?.totalUsers],
    ['New users (7 days)', activity?.newUsers7d],
    ['New users (30 days)', activity?.newUsers30d],
    ['Active users (7 days)', activity?.activeUsers7d],
    ['Active users (30 days)', activity?.activeUsers30d],
  ];

  return (
    <div className="space-y-3">
      {error && <AdminError message={error} onDismiss={() => setError('')} />}
      {success && <AdminSuccess message={success} />}
      <AdminSectionTitle
        title="Reports & export"
        subtitle="User-growth summary and one-click CSV exports."
        action={
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />
      {loading ? (
        <AdminEmpty>Loading activity…</AdminEmpty>
      ) : !activity ? (
        <AdminEmpty>No activity data yet.</AdminEmpty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {statCards.map(([label, value]) => (
              <AdminCard key={label} className="p-4">
                <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <TrendingUp aria-hidden="true" className="h-4 w-4" />
                </div>
                <div className="text-2xl font-bold text-text-primary">{value ?? 0}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
              </AdminCard>
            ))}
          </div>
          {activity.byRole && Object.keys(activity.byRole).length > 0 && (
            <AdminCard>
              <h3 className="mb-3 text-sm font-bold text-text-primary">Users by role</h3>
              <div className="grid gap-2 sm:grid-cols-3">
                {Object.entries(activity.byRole).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
                    <span className="font-semibold capitalize text-slate-700">{role.replaceAll('_', ' ')}</span>
                    <span className="font-bold text-text-primary">{count}</span>
                  </div>
                ))}
              </div>
            </AdminCard>
          )}
          {activity.signupsPerDay && activity.signupsPerDay.length > 0 && (
            <AdminCard>
              <h3 className="mb-3 text-sm font-bold text-text-primary">Signups per day (recent)</h3>
              <div className="flex items-end gap-1" style={{ height: 96 }}>
                {activity.signupsPerDay.slice(-14).map(day => {
                  const max = Math.max(1, ...activity.signupsPerDay!.map(d => d.count));
                  return (
                    <div key={day.date} className="flex flex-1 flex-col items-center gap-1" title={`${day.date}: ${day.count} signups`}>
                      <span className="text-[10px] font-bold text-slate-600">{day.count}</span>
                      <div className="w-full rounded-t bg-brand-blue" style={{ height: `${Math.max(4, (day.count / max) * 56)}px` }} />
                      <span className="text-[9px] text-slate-400">{day.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </AdminCard>
          )}
        </>
      )}

      <AdminCard>
        <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <FileSpreadsheet aria-hidden="true" className="h-4 w-4 text-teal-600" /> Export users (CSV)
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Downloads a CSV of user accounts. Filters are optional — leave them blank to export everyone.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <select value={department} onChange={e => setDepartment(e.target.value)} className={selectCls} aria-label="Filter export by department">
            <option value="">All departments</option>
            {TECHNOLOGIES_DIRECTORY.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
          <select value={semester} onChange={e => setSemester(e.target.value)} className={selectCls} aria-label="Filter export by semester">
            <option value="">All semesters</option>
            {Array.from({ length: 8 }, (_, i) => <option key={i + 1} value={String(i + 1)}>Semester {i + 1}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls} aria-label="Filter export by status">
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <button type="button" onClick={() => void downloadUsersCsv()} disabled={downloading} className="rounded-xl bg-brand-blue px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
            <Download aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
            {downloading ? 'Preparing…' : 'Download users CSV'}
          </button>
        </div>
      </AdminCard>
    </div>
  );
};
