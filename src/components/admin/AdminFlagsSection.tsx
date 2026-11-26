/**
 * Admin feature flags + maintenance mode (module 4).
 * GET /api/admin/flags · POST /api/admin/flags { key, enabled }
 * POST /api/admin/maintenance { enabled, message }
 */
import React, { useCallback, useEffect, useState } from 'react';
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
import { Flag, RefreshCw, Wrench } from 'lucide-react';

type FeatureFlag = {
  key: string;
  name?: string;
  description?: string;
  enabled: boolean;
};

type MaintenanceState = {
  enabled: boolean;
  message: string;
};

export const AdminFlagsSection: React.FC = () => {
  const { isServerVerifiedAdmin } = useApp();
  const { request } = useAdminRequest();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceState>({ enabled: false, message: '' });
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newKey, setNewKey] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request('/api/admin/flags');
      setFlags((data.flags || data.items || []) as FeatureFlag[]);
      const m = (data.maintenance || {}) as Partial<MaintenanceState>;
      setMaintenance({ enabled: Boolean(m.enabled), message: typeof m.message === 'string' ? m.message : '' });
    } catch (loadError) {
      setFlags([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load feature flags. The server endpoint may not be deployed yet.'
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

  const toggleFlag = async (flag: FeatureFlag) => {
    setSavingKey(flag.key);
    setError('');
    try {
      const data = await request('/api/admin/flags', {
        method: 'POST',
        body: JSON.stringify({ key: flag.key, enabled: !flag.enabled }),
      });
      setFlags(prev => prev.map(f => (f.key === flag.key ? { ...f, enabled: !f.enabled } : f)));
      notifySuccess(typeof data.message === 'string' ? data.message : `Flag "${flag.key}" ${!flag.enabled ? 'enabled' : 'disabled'}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update flag.');
    } finally {
      setSavingKey(null);
    }
  };

  const addFlag = async (event: React.FormEvent) => {
    event.preventDefault();
    const key = newKey.trim();
    if (!key) return;
    setSavingKey(key);
    setError('');
    try {
      const data = await request('/api/admin/flags', {
        method: 'POST',
        body: JSON.stringify({ key, enabled: true }),
      });
      setFlags(prev => [...prev, { key, enabled: true }]);
      setNewKey('');
      notifySuccess(typeof data.message === 'string' ? data.message : `Flag "${key}" created and enabled.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not create flag.');
    } finally {
      setSavingKey(null);
    }
  };

  const saveMaintenance = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingMaintenance(true);
    setError('');
    try {
      const data = await request('/api/admin/maintenance', {
        method: 'POST',
        body: JSON.stringify({ enabled: maintenance.enabled, message: maintenance.message.trim() }),
      });
      notifySuccess(
        typeof data.message === 'string'
          ? data.message
          : maintenance.enabled
            ? 'Maintenance mode enabled — users will see the maintenance message.'
            : 'Maintenance mode disabled.'
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update maintenance mode.');
    } finally {
      setSavingMaintenance(false);
    }
  };

  if (!isServerVerifiedAdmin) {
    return <AdminEmpty>A server-verified administrator session is required.</AdminEmpty>;
  }

  return (
    <div className="space-y-4">
      {error && <AdminError message={error} onDismiss={() => setError('')} />}
      {success && <AdminSuccess message={success} />}
      <AdminSectionTitle
        title="Feature flags"
        subtitle="Turn app features on or off without a new release."
        action={
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />
      {loading ? (
        <AdminEmpty>Loading flags…</AdminEmpty>
      ) : (
        <AdminCard>
          {!flags.length && <p className="text-xs text-slate-500">No feature flags are defined yet. Add one below.</p>}
          <div className="divide-y divide-slate-100">
            {flags.map(flag => (
              <div key={flag.key} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex items-start gap-2">
                  <Flag aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs font-bold text-text-primary">{flag.key}</div>
                    {flag.description ? <p className="mt-0.5 text-xs text-slate-500">{flag.description}</p> : null}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={flag.enabled}
                  aria-label={`Toggle flag ${flag.key}`}
                  disabled={savingKey === flag.key}
                  onClick={() => void toggleFlag(flag)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${flag.enabled ? 'bg-teal-600' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${flag.enabled ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={addFlag} className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
            <input
              value={newKey}
              onChange={e => setNewKey(e.target.value)}
              placeholder="New flag key, e.g. payments_enabled"
              className={inputCls}
              aria-label="New flag key"
            />
            <button type="submit" disabled={!newKey.trim() || savingKey !== null} className={primaryBtnCls}>Add flag</button>
          </form>
        </AdminCard>
      )}

      <AdminSectionTitle title="Maintenance mode" subtitle="When enabled, users see a maintenance message instead of the app." />
      <AdminCard>
        <form onSubmit={saveMaintenance} className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={maintenance.enabled}
              onChange={e => setMaintenance({ ...maintenance, enabled: e.target.checked })}
            />
            <Wrench aria-hidden="true" className="h-4 w-4 text-amber-600" />
            Maintenance mode enabled
          </label>
          <label className="block space-y-1 text-xs font-semibold text-slate-700">
            Maintenance message shown to users
            <textarea
              rows={3}
              maxLength={500}
              value={maintenance.message}
              onChange={e => setMaintenance({ ...maintenance, message: e.target.value })}
              placeholder="e.g. DiplomaMate is under maintenance. Please check back in an hour."
              className={inputCls}
            />
          </label>
          <button type="submit" disabled={savingMaintenance} className={primaryBtnCls}>
            {savingMaintenance ? 'Saving…' : 'Save maintenance settings'}
          </button>
        </form>
      </AdminCard>
    </div>
  );
};
