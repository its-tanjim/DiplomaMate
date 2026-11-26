/**
 * Admin analytics (module 10).
 * GET /api/admin/analytics?range=7d|30d
 * Charts are plain SVG/CSS bars — no new dependency.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  AdminCard,
  AdminEmpty,
  AdminError,
  AdminSectionTitle,
  selectCls,
  useAdminRequest,
} from './shared';
import { BarChart3, RefreshCw, Ticket, Users } from 'lucide-react';

type AnalyticsPayload = {
  signupsPerDay?: Array<{ date: string; count: number }>;
  usersByDepartment?: Record<string, number> | Array<{ department: string; count: number }>;
  usersBySemester?: Record<string, number> | Array<{ semester: string | number; count: number }>;
  activeUsers?: number;
  totalUsers?: number;
  ticketsByStatus?: Record<string, number>;
  newUsers?: number;
};

function toEntries(value: Record<string, number> | Array<{ label: string; count: number }> | undefined): Array<{ label: string; count: number }> {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return Object.entries(value).map(([label, count]) => ({ label, count }));
}

function BarList({ data, color }: { data: Array<{ label: string; count: number }>; color: string }) {
  const max = Math.max(1, ...data.map(d => d.count));
  if (!data.length) return <p className="text-xs text-slate-500">No data for this range.</p>;
  return (
    <div className="space-y-2">
      {data.map(item => (
        <div key={item.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs">
          <div className="min-w-0">
            <div className="mb-1 flex justify-between gap-2">
              <span className="truncate font-semibold text-slate-700">{item.label}</span>
              <span className="font-bold text-text-primary">{item.count}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, (item.count / max) * 100)}%`, background: color }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export const AdminAnalyticsSection: React.FC = () => {
  const { isServerVerifiedAdmin } = useApp();
  const { request } = useAdminRequest();
  const [range, setRange] = useState<'7d' | '30d'>('7d');
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const body = await request(`/api/admin/analytics?range=${range}`);
      setData((body.analytics || body) as AnalyticsPayload);
    } catch (loadError) {
      setData(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load analytics. The server endpoint may not be deployed yet.'
      );
    } finally {
      setLoading(false);
    }
  }, [request, range]);

  useEffect(() => {
    if (isServerVerifiedAdmin) void load();
  }, [isServerVerifiedAdmin, load]);

  const signups = useMemo(() => data?.signupsPerDay || [], [data]);
  const byDepartment = useMemo(() => {
    const raw = data?.usersByDepartment;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(d => ({ label: d.department, count: d.count }));
    return toEntries(raw);
  }, [data]);
  const bySemester = useMemo(() => {
    const raw = data?.usersBySemester;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(d => ({ label: `Semester ${d.semester}`, count: d.count }));
    return Object.entries(raw).map(([label, count]) => ({ label: `Semester ${label}`, count }));
  }, [data]);
  const ticketsByStatus = useMemo(() => toEntries(data?.ticketsByStatus), [data]);

  const maxSignups = Math.max(1, ...signups.map(d => d.count));

  if (!isServerVerifiedAdmin) {
    return <AdminEmpty>A server-verified administrator session is required.</AdminEmpty>;
  }

  return (
    <div className="space-y-3">
      {error && <AdminError message={error} onDismiss={() => setError('')} />}
      <AdminSectionTitle
        title="Analytics"
        subtitle="Signups, users by cohort, active users and ticket load."
        action={
          <div className="flex gap-2">
            <select value={range} onChange={e => setRange(e.target.value as '7d' | '30d')} className={selectCls} aria-label="Date range">
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
            <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        }
      />

      {loading ? (
        <AdminEmpty>Loading analytics…</AdminEmpty>
      ) : !data ? (
        <AdminEmpty>No analytics data yet.</AdminEmpty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <AdminCard className="p-4">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Users aria-hidden="true" className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold text-text-primary">{data.totalUsers ?? 0}</div>
              <div className="mt-1 text-xs font-medium text-slate-500">Total users</div>
            </AdminCard>
            <AdminCard className="p-4">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <BarChart3 aria-hidden="true" className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold text-text-primary">{data.newUsers ?? signups.reduce((sum, d) => sum + d.count, 0)}</div>
              <div className="mt-1 text-xs font-medium text-slate-500">New signups ({range})</div>
            </AdminCard>
            <AdminCard className="p-4">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <Users aria-hidden="true" className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold text-text-primary">{data.activeUsers ?? 0}</div>
              <div className="mt-1 text-xs font-medium text-slate-500">Active users ({range})</div>
            </AdminCard>
            <AdminCard className="p-4">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <Ticket aria-hidden="true" className="h-4 w-4" />
              </div>
              <div className="text-2xl font-bold text-text-primary">{ticketsByStatus.reduce((sum, t) => sum + t.count, 0)}</div>
              <div className="mt-1 text-xs font-medium text-slate-500">Support tickets</div>
            </AdminCard>
          </div>

          <AdminCard>
            <h3 className="mb-3 text-sm font-bold text-text-primary">Signups per day ({range})</h3>
            {signups.length ? (
              <div className="flex items-end gap-1" style={{ height: 120 }} role="img" aria-label={`Signups per day, ${range}`}>
                {signups.map(day => (
                  <div key={day.date} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${day.date}: ${day.count} signups`}>
                    <span className="text-[10px] font-bold text-slate-600">{day.count}</span>
                    <div className="w-full rounded-t bg-brand-blue" style={{ height: `${Math.max(4, (day.count / maxSignups) * 80)}px` }} />
                    <span className="text-[9px] text-slate-400">{day.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No signups in this range.</p>
            )}
          </AdminCard>

          <div className="grid gap-3 md:grid-cols-2">
            <AdminCard>
              <h3 className="mb-3 text-sm font-bold text-text-primary">Users by department</h3>
              <BarList data={byDepartment} color="var(--primary, #3880FF)" />
            </AdminCard>
            <AdminCard>
              <h3 className="mb-3 text-sm font-bold text-text-primary">Users by semester</h3>
              <BarList data={bySemester} color="#00B8A9" />
            </AdminCard>
          </div>

          <AdminCard>
            <h3 className="mb-3 text-sm font-bold text-text-primary">Tickets by status</h3>
            {ticketsByStatus.length ? (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                {ticketsByStatus.map(item => (
                  <div key={item.label} className="rounded-xl bg-slate-50 px-3 py-2 text-xs">
                    <div className="font-semibold capitalize text-slate-700">{item.label.replaceAll('_', ' ')}</div>
                    <div className="mt-1 text-lg font-bold text-text-primary">{item.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No tickets yet.</p>
            )}
          </AdminCard>
        </>
      )}
    </div>
  );
};
