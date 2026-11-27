/**
 * Admin force update / version control (module 5).
 * GET /api/admin/version-control · POST /api/admin/version-control
 * { minVersionCode, latestVersionCode, latestVersionName, forceUpdate, updateUrl }
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
import { RefreshCw, Smartphone, Download } from 'lucide-react';
import {
  currentAdminVersionLabel,
  fetchLatestAdminRelease,
  type AdminUpdateInfo
} from '../../services/adminAppUpdateService';
import { nativeService } from '../../services/nativeService';

type VersionControl = {
  minVersionCode: number;
  latestVersionCode: number;
  latestVersionName: string;
  forceUpdate: boolean;
  updateUrl: string;
};

export const AdminVersionSection: React.FC = () => {
  const { isServerVerifiedAdmin } = useApp();
  const { request } = useAdminRequest();
  const [form, setForm] = useState<VersionControl>({
    minVersionCode: 0,
    latestVersionCode: 0,
    latestVersionName: '',
    forceUpdate: false,
    updateUrl: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Admin app self-update (v1.0.24): the manual "Check for Update" for
  // THIS admin app — reads releases/admin-latest.json, never the
  // main-app release. The banner in AdminApp does the same check
  // automatically once a day on native.
  const [checkingAdminUpdate, setCheckingAdminUpdate] = useState(false);
  const [adminUpdate, setAdminUpdate] = useState<AdminUpdateInfo | null>(null);
  const [adminCheckMessage, setAdminCheckMessage] = useState('');

  const checkAdminUpdate = async () => {
    setCheckingAdminUpdate(true);
    setAdminCheckMessage('');
    try {
      const info = await fetchLatestAdminRelease();
      if (!info) {
        setAdminCheckMessage('Could not check for updates right now. Please retry.');
        return;
      }
      setAdminUpdate(info);
      setAdminCheckMessage(
        info.available
          ? `Admin update available — ${info.tag}.`
          : `You are on the latest admin version (${currentAdminVersionLabel()}).`
      );
    } finally {
      setCheckingAdminUpdate(false);
    }
  };

  const downloadAdminUpdate = async () => {
    if (!adminUpdate?.downloadUrl) return;
    try {
      await nativeService.openExternalUrl(adminUpdate.downloadUrl);
    } catch {
      window.open(adminUpdate.downloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request('/api/admin/version-control');
      const v = (data.versionControl || data) as Partial<VersionControl>;
      setForm({
        minVersionCode: typeof v.minVersionCode === 'number' ? v.minVersionCode : 0,
        latestVersionCode: typeof v.latestVersionCode === 'number' ? v.latestVersionCode : 0,
        latestVersionName: typeof v.latestVersionName === 'string' ? v.latestVersionName : '',
        forceUpdate: Boolean(v.forceUpdate),
        updateUrl: typeof v.updateUrl === 'string' ? v.updateUrl : '',
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load version control. The server endpoint may not be deployed yet.'
      );
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (isServerVerifiedAdmin) void load();
  }, [isServerVerifiedAdmin, load]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = await request('/api/admin/version-control', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setSuccess(typeof data.message === 'string' ? data.message : 'Version control settings saved.');
      window.setTimeout(() => setSuccess(''), 3500);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save version control settings.');
    } finally {
      setSaving(false);
    }
  };

  if (!isServerVerifiedAdmin) {
    return <AdminEmpty>A server-verified administrator session is required.</AdminEmpty>;
  }

  return (
    <div className="space-y-3">
      {error && <AdminError message={error} onDismiss={() => setError('')} />}
      {success && <AdminSuccess message={success} />}
      <AdminCard>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800">Admin app update</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              This admin app is {currentAdminVersionLabel()}. A newer admin build shows a banner on login, like the main app.
            </p>
            {adminCheckMessage && (
              <p className="text-[11px] font-semibold text-slate-700 mt-1.5">{adminCheckMessage}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void checkAdminUpdate()}
              disabled={checkingAdminUpdate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              {checkingAdminUpdate ? 'Checking…' : 'Check for Update'}
            </button>
            {adminUpdate?.available && adminUpdate.downloadUrl && (
              <button
                type="button"
                onClick={() => void downloadAdminUpdate()}
                className={primaryBtnCls}
              >
                <Download aria-hidden="true" className="h-3.5 w-3.5" />
                Download Update
              </button>
            )}
          </div>
        </div>
      </AdminCard>
      <AdminSectionTitle
        title="Force update"
        subtitle="Apps below the minimum version code are forced to update. The latest version is what the in-app update checker offers."
        action={
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />
      {loading ? (
        <AdminEmpty>Loading version settings…</AdminEmpty>
      ) : (
        <AdminCard>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Minimum supported version code
              <input
                type="number"
                min={0}
                required
                value={form.minVersionCode}
                onChange={e => setForm({ ...form, minVersionCode: Number(e.target.value) || 0 })}
                className={inputCls}
              />
              <span className="block text-[11px] font-normal text-slate-500">
                Apps with a lower versionCode must update before they can continue.
              </span>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Latest version code
              <input
                type="number"
                min={0}
                required
                value={form.latestVersionCode}
                onChange={e => setForm({ ...form, latestVersionCode: Number(e.target.value) || 0 })}
                className={inputCls}
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Latest version name
              <input
                value={form.latestVersionName}
                onChange={e => setForm({ ...form, latestVersionName: e.target.value })}
                placeholder="e.g. 1.0.20"
                className={inputCls}
              />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Update URL
              <input
                type="url"
                value={form.updateUrl}
                onChange={e => setForm({ ...form, updateUrl: e.target.value })}
                placeholder="https://github.com/its-tanjim/DiplomaMate/releases"
                className={inputCls}
              />
              <span className="block text-[11px] font-normal text-slate-500">
                Where the update button sends users (usually the GitHub release page).
              </span>
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={form.forceUpdate}
                onChange={e => setForm({ ...form, forceUpdate: e.target.checked })}
              />
              <Smartphone aria-hidden="true" className="h-4 w-4 text-blue-600" />
              Force update — block older apps until they update
            </label>
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className={primaryBtnCls}>
                {saving ? 'Saving…' : 'Save version settings'}
              </button>
            </div>
          </form>
        </AdminCard>
      )}
    </div>
  );
};
