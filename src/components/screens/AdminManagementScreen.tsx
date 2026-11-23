import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../services/apiClient';
import { LiquidFillLoader } from '../LiquidFillLoader';
import {
  AcademicCommunity,
  CommunityMembershipRecord
} from '../../types';
import { COLLEGES_DIRECTORY, TECHNOLOGIES_DIRECTORY } from '../../data/directoryData';
import { useApp } from '../../context/AppContext';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  ImagePlus,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X
} from 'lucide-react';

type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected';
type ManagedRole = 'student' | 'class_captain' | 'teacher';
type AdminAccount = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: ManagedRole;
  roll?: string;
  department?: string;
  college?: string;
  semester?: number;
  approvalStatus: ApprovalStatus;
  createdAt?: string;
  deleted: boolean;
  details?: Record<string, unknown> | null;
  application?: Record<string, unknown> | null;
};
type AdminStats = {
  totalUsers: number;
  pendingAccounts: number;
  approvedAccounts: number;
  students: number;
  captains: number;
  teachers: number;
  totalCommunities: number;
};
type AdminAuditEntry = {
  id: string;
  adminId: string;
  action: string;
  targetId: string;
  targetName: string;
  timestamp: string;
  details?: string;
};
type CommunityDraft = {
  id?: string;
  name: string;
  description: string;
  college: string;
  department: string;
  semester: string;
  shift: 'Morning' | 'Day' | 'Both';
  section: 'A1' | 'A2' | 'B1' | 'B2' | 'All';
  visibility: 'public' | 'private';
  image_url: string;
};
type ManagementPayload = {
  stats: AdminStats;
  accounts: AdminAccount[];
  communities: AcademicCommunity[];
  auditLogs: AdminAuditEntry[];
};

const emptyDraft = (): CommunityDraft => ({
  name: '',
  description: '',
  college: COLLEGES_DIRECTORY[0]?.name || '',
  department: TECHNOLOGIES_DIRECTORY[0]?.name || '',
  semester: '1',
  shift: 'Both',
  section: 'All',
  visibility: 'public',
  image_url: ''
});

const statusClass: Record<ApprovalStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  Approved: 'bg-teal-50 text-teal-700 border-teal-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200'
};

const roleLabel: Record<ManagedRole, string> = {
  student: 'Student',
  class_captain: 'Class Captain',
  teacher: 'Teacher'
};

export const AdminManagementScreen: React.FC = () => {
  const { authToken, isServerVerifiedAdmin, updateTeacherContactAccessLock } = useApp();
  const [section, setSection] = useState<'overview' | 'accounts' | 'communities' | 'audit' | 'access'>('overview');
  const [payload, setPayload] = useState<ManagementPayload | null>(null);
  const [memberships, setMemberships] = useState<CommunityMembershipRecord[]>([]);
  const [teacherContactsLocked, setTeacherContactsLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountDetailsLoading, setAccountDetailsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | ManagedRole>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | ApprovalStatus>('All');
  const [selectedAccount, setSelectedAccount] = useState<AdminAccount | null>(null);
  const [communityModal, setCommunityModal] = useState<CommunityDraft | null>(null);
  const [membersCommunity, setMembersCommunity] = useState<AcademicCommunity | null>(null);
  const [memberToAdd, setMemberToAdd] = useState('');

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
  }), [authToken]);

  const request = async (url: string, init: RequestInit = {}) => {
    const response = await apiFetch(url, {
      ...init,
      headers: { ...headers, ...(init.headers || {}) }
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.success) {
      throw new Error(body.error || `Request failed (${response.status}).`);
    }
    return body;
  };

  const loadManagement = async () => {
    setLoading(true);
    setError('');
    try {
      const [management, communityData, accessSettings] = await Promise.all([
        request('/api/admin/management'),
        request('/api/admin/communities'),
        request('/api/teacher-contacts/access')
      ]);
      setPayload({
        stats: management.stats,
        accounts: management.accounts,
        communities: communityData.communities,
        auditLogs: management.auditLogs
      });
      setMemberships(communityData.memberships || []);
      setTeacherContactsLocked(accessSettings.locked === true);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isServerVerifiedAdmin) void loadManagement();
  }, [isServerVerifiedAdmin, authToken]);

  const filteredAccounts = useMemo(() => (payload?.accounts || []).filter(account => {
    if (account.deleted) return false;
    if (roleFilter !== 'All' && account.role !== roleFilter) return false;
    if (statusFilter !== 'All' && account.approvalStatus !== statusFilter) return false;
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [
      account.name,
      account.role,
      account.roll,
      account.department,
      account.college,
      account.semester ? `semester ${account.semester}` : '',
      account.approvalStatus
    ].some(value => String(value || '').toLowerCase().includes(query));
  }), [payload, roleFilter, statusFilter, search]);

  const notifySuccess = (message: string) => {
    setSuccess(message);
    window.setTimeout(() => setSuccess(''), 3500);
  };

  const updateTeacherContactAccess = async () => {
    setSaving(true);
    setError('');
    try {
      const result = await updateTeacherContactAccessLock(!teacherContactsLocked);
      if (!result.success) throw new Error(result.message);
      setTeacherContactsLocked(!teacherContactsLocked);
      notifySuccess(result.message);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not update Teacher Contact access.');
    } finally {
      setSaving(false);
    }
  };

  const viewAccount = async (account: AdminAccount) => {
    setError('');
    setSelectedAccount(account);
    setAccountDetailsLoading(true);
    try {
      const data = await request(`/api/admin/accounts/${encodeURIComponent(account.id)}`);
      setSelectedAccount(data.account);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load account details.');
    } finally {
      setAccountDetailsLoading(false);
    }
  };

  const decideAccount = async (decision: 'approve' | 'reject') => {
    if (!selectedAccount) return;
    setSaving(true);
    setError('');
    try {
      const data = await request(`/api/admin/accounts/${encodeURIComponent(selectedAccount.id)}/decision`, {
        method: 'POST',
        body: JSON.stringify({ decision })
      });
      notifySuccess(data.message);
      setSelectedAccount(null);
      await loadManagement();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not update account status.');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!selectedAccount) return;
    const target = selectedAccount;
    if (!window.confirm(`Delete ${roleLabel[target.role]} account "${target.name}" (${target.id})? The account will be deactivated; academic records will be retained.`)) return;
    setSaving(true);
    setError('');
    try {
      const data = await request(`/api/admin/accounts/${encodeURIComponent(target.id)}`, { method: 'DELETE' });
      notifySuccess(data.message);
      setSelectedAccount(null);
      await loadManagement();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not delete account.');
    } finally {
      setSaving(false);
    }
  };

  const saveCommunity = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!communityModal) return;
    setSaving(true);
    setError('');
    try {
      const { id, ...body } = communityModal;
      const data = await request(
        id ? `/api/admin/communities/${encodeURIComponent(id)}` : '/api/admin/communities',
        { method: id ? 'PUT' : 'POST', body: JSON.stringify({ ...body, semester: Number(body.semester) }) }
      );
      setCommunityModal(null);
      notifySuccess(data.message);
      await loadManagement();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not save community.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCommunity = async (community: AcademicCommunity) => {
    if (!window.confirm(`Delete community "${community.name}"? It will be deactivated; members, messages, and files will be retained.`)) return;
    setSaving(true);
    setError('');
    try {
      const data = await request(`/api/admin/communities/${encodeURIComponent(community.id)}`, { method: 'DELETE' });
      notifySuccess(data.message);
      await loadManagement();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not delete community.');
    } finally {
      setSaving(false);
    }
  };

  const addMember = async () => {
    if (!membersCommunity || !memberToAdd) return;
    setSaving(true);
    setError('');
    try {
      const data = await request(`/api/admin/communities/${encodeURIComponent(membersCommunity.id)}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId: memberToAdd })
      });
      notifySuccess(data.message);
      setMemberToAdd('');
      await loadManagement();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not add community member.');
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (membership: CommunityMembershipRecord) => {
    if (!membersCommunity) return;
    if (!window.confirm(`Remove ${membership.user_name} from "${membersCommunity.name}"?`)) return;
    setSaving(true);
    setError('');
    try {
      const data = await request(`/api/admin/communities/${encodeURIComponent(membersCommunity.id)}/members/${encodeURIComponent(membership.user_id)}`, {
        method: 'DELETE'
      });
      notifySuccess(data.message);
      await loadManagement();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not remove community member.');
    } finally {
      setSaving(false);
    }
  };

  const setModerator = async (membership: CommunityMembershipRecord, isModerator: boolean) => {
    if (!membersCommunity) return;
    setSaving(true);
    setError('');
    try {
      const data = await request(`/api/admin/communities/${encodeURIComponent(membersCommunity.id)}/members/${encodeURIComponent(membership.user_id)}/moderator`, {
        method: 'PUT',
        body: JSON.stringify({ isModerator })
      });
      notifySuccess(data.message);
      await loadManagement();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not update moderator permissions.');
    } finally {
      setSaving(false);
    }
  };

  const uploadCommunityImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !communityModal) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setError('Choose a PNG, JPEG, or WebP image.');
      event.target.value = '';
      return;
    }
    // Phone photos are usually 1–5 MB — downscale them in the browser so
    // they fit the 350 KB image limit instead of rejecting the upload.
    const applyImage = (dataUrl: string) =>
      setCommunityModal(current => current ? { ...current, image_url: dataUrl } : current);
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      if (file.size <= 350_000) {
        applyImage(raw);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          applyImage(raw);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        applyImage(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => applyImage(raw);
      img.src = raw;
    };
    reader.onerror = () => setError('Could not read the selected image.');
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const activeCommunityMembers = useMemo(() => {
    if (!membersCommunity) return [];
    return memberships.filter(item => item.community_id === membersCommunity.id);
  }, [memberships, membersCommunity]);
  const memberIds = new Set(activeCommunityMembers.filter(item => item.status === 'active').map(item => item.user_id));
  const addableAccounts = (payload?.accounts || []).filter(item => !item.deleted && !memberIds.has(item.id));

  if (!isServerVerifiedAdmin) {
    return <div className="rounded-2xl border border-rose-200 bg-surface p-5 text-sm text-rose-700">A server-verified administrator session is required.</div>;
  }

  return (
    <section className="space-y-4">
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button type="button" className="ml-auto" onClick={() => setError('')} aria-label="Dismiss error"><X className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs text-teal-800">
          <CheckCircle2 className="h-4 w-4" />{success}
        </div>
      )}

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 sm:grid-cols-5">
        {([
          ['overview', 'Overview'],
          ['accounts', 'Accounts'],
          ['communities', 'Communities'],
          ['audit', 'Audit log'],
          ['access', 'Feature access']
        ] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setSection(id)}
            className={`rounded-lg px-2 py-2 text-xs font-bold ${section === id ? 'bg-surface text-text-primary shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-surface p-10 text-sm text-slate-600">
          <LiquidFillLoader size={36} label="Loading management data..." />
        </div>
      ) : (
        <>
          {section === 'overview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Admin Dashboard</h2>
                  <p className="text-xs text-slate-500">Live counts from the server-backed academic account and community stores.</p>
                </div>
                <button type="button" onClick={() => void loadManagement()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  <RefreshCw className="h-3.5 w-3.5" />Refresh
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {([
                  ['Total users', payload?.stats.totalUsers ?? 0, Users, 'bg-blue-50 text-blue-700'],
                  ['Pending accounts', payload?.stats.pendingAccounts ?? 0, Clock, 'bg-amber-50 text-amber-700'],
                  ['Approved accounts', payload?.stats.approvedAccounts ?? 0, CheckCircle2, 'bg-teal-50 text-teal-700'],
                  ['Students', payload?.stats.students ?? 0, GraduationCap, 'bg-blue-50 text-blue-700'],
                  ['Class Captains', payload?.stats.captains ?? 0, ShieldCheck, 'bg-violet-50 text-violet-700'],
                  ['Teachers', payload?.stats.teachers ?? 0, BookOpen, 'bg-sky-50 text-sky-700'],
                  ['Communities', payload?.stats.totalCommunities ?? 0, Users, 'bg-green-50 text-green-700']
                ] as const).map(([label, count, Icon, colorClass]) => (
                  <div key={String(label)} className="rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm">
                    <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-2xl font-bold text-text-primary">{count}</div>
                    <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-surface p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-text-primary"><Activity className="h-4 w-4 text-teal-600" />Recent admin actions</div>
                {(payload?.auditLogs || []).slice(0, 5).length ? (
                  <div className="divide-y divide-slate-100">
                    {(payload?.auditLogs || []).slice(0, 5).map(log => (
                      <div key={log.id} className="flex flex-col gap-1 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-semibold text-slate-700">{log.action.replaceAll('_', ' ')} · {log.targetName}</span>
                        <time className="text-slate-500">{new Date(log.timestamp).toLocaleString()}</time>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-slate-500">No admin actions have been recorded yet.</p>}
              </div>
            </div>
          )}

          {section === 'access' && (
            <div className="rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Teacher Contact access</h2>
                  <p className="mt-1 max-w-xl text-xs text-slate-600">
                    {teacherContactsLocked
                      ? 'Access is locked, but the payment flow is currently off, so the lock has no effect — Teacher Contacts are free for everyone.'
                      : 'Teacher Contacts are free and available to users without payment.'}
                  </p>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Changing this setting does not modify user accounts or payment history.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void updateTeacherContactAccess()}
                  disabled={saving}
                  className={`rounded-xl px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                    teacherContactsLocked ? 'bg-teal-700 hover:bg-teal-800' : 'bg-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {saving
                    ? 'Saving...'
                    : teacherContactsLocked
                      ? 'Make free for everyone'
                      : 'Lock Teacher Contacts'}
                </button>
              </div>
              <div className={`mt-4 rounded-xl border p-3 text-xs font-semibold ${
                teacherContactsLocked
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-teal-200 bg-teal-50 text-teal-800'
              }`}>
                Current status: {teacherContactsLocked ? 'Locked' : 'Free and unlocked'}
              </div>
            </div>
          )}

          {section === 'accounts' && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-surface p-3 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, roll, department, semester..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-400" />
                  </div>
                  <select value={roleFilter} onChange={event => setRoleFilter(event.target.value as 'All' | ManagedRole)} className="rounded-xl border border-slate-200 bg-surface px-3 py-2 text-xs">
                    <option value="All">All roles</option><option value="student">Student</option><option value="class_captain">Class Captain</option><option value="teacher">Teacher</option>
                  </select>
                  <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'All' | ApprovalStatus)} className="rounded-xl border border-slate-200 bg-surface px-3 py-2 text-xs">
                    <option value="All">All statuses</option><option value="Pending">Pending</option><option value="Approved">Approved</option><option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-2">
                {filteredAccounts.map(account => (
                  <article key={account.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-text-primary">{account.name}</h3>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{roleLabel[account.role]}</span>
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${statusClass[account.approvalStatus]}`}>{account.approvalStatus}</span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">{account.roll ? `Roll ${account.roll} · ` : ''}{account.department || account.email || account.phone || account.id}{account.semester ? ` · Sem ${account.semester}` : ''}</p>
                    </div>
                    <button type="button" onClick={() => void viewAccount(account)} className="shrink-0 rounded-xl bg-text-primary px-4 py-2 text-xs font-bold text-white hover:bg-blue-950">View details</button>
                  </article>
                ))}
                {!filteredAccounts.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-surface p-8 text-center text-xs text-slate-500">No accounts match these filters.</div>}
              </div>
            </div>
          )}

          {section === 'communities' && (
            <div className="space-y-3">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div><h2 className="text-lg font-bold text-text-primary">Community management</h2><p className="text-xs text-slate-500">Create, edit, archive, and manage members and moderators.</p></div>
                <button type="button" onClick={() => { setError(''); setCommunityModal(emptyDraft()); }} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-text-primary px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-950"><Plus className="h-4 w-4" />Create community</button>
              </div>
              {(payload?.communities || []).map(community => (
                <article key={community.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-surface p-4 shadow-sm sm:flex-row sm:items-center">
                  {community.image_url ? <img src={community.image_url} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-lg">{community.avatar_emoji || '👥'}</div>}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-bold text-text-primary">{community.name}</h3>
                      <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${community.deleted_at ? 'border-rose-200 bg-rose-50 text-rose-700' : community.is_active ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}>{community.deleted_at ? 'Deleted' : community.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{community.department} · Semester {community.semester} · {community.member_count} members · {community.visibility}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={Boolean(community.deleted_at)} onClick={() => setCommunityModal({
                      id: community.id,
                      name: community.name,
                      description: community.description,
                      college: community.college,
                      department: community.department,
                      semester: String(community.semester),
                      shift: community.shift,
                      section: community.section,
                      visibility: community.visibility,
                      image_url: community.image_url || ''
                    })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40">Edit</button>
                    <button type="button" onClick={() => setMembersCommunity(community)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Members</button>
                    {!community.deleted_at && <button type="button" onClick={() => void deleteCommunity(community)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"><Trash2 className="inline h-3.5 w-3.5" /> Delete</button>}
                  </div>
                </article>
              ))}
              {!payload?.communities.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-surface p-8 text-center text-xs text-slate-500">No communities have been created.</div>}
            </div>
          )}

          {section === 'audit' && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-surface">
              <div className="border-b border-slate-100 p-4"><h2 className="text-sm font-bold text-text-primary">Admin audit log</h2><p className="text-xs text-slate-500">Most recent 100 actions. The server retains up to 5,000 records.</p></div>
              {(payload?.auditLogs || []).length ? (payload?.auditLogs || []).map(log => (
                <div key={log.id} className="grid gap-1 border-b border-slate-100 p-3 text-xs sm:grid-cols-[1fr_auto]">
                  <div><div className="font-semibold capitalize text-slate-800">{log.action.replaceAll('_', ' ')} · {log.targetName}</div><div className="mt-0.5 text-slate-500">Target {log.targetId} · Admin {log.adminId}{log.details ? ` · ${log.details}` : ''}</div></div>
                  <time className="text-slate-500">{new Date(log.timestamp).toLocaleString()}</time>
                </div>
              )) : <p className="p-5 text-xs text-slate-500">No administrator actions have been recorded.</p>}
            </div>
          )}
        </>
      )}

      {selectedAccount && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3" role="dialog" aria-modal="true" aria-label="Account details">
          <div className="my-auto w-full max-w-xl rounded-2xl bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-4"><div><h2 className="font-bold text-text-primary">Account details</h2><p className="text-xs text-slate-500">{roleLabel[selectedAccount.role]} · {selectedAccount.id}</p></div><button type="button" onClick={() => setSelectedAccount(null)} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
            <div className="max-h-[65vh] space-y-3 overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Object.entries({
                  Name: selectedAccount.name,
                  Role: roleLabel[selectedAccount.role],
                  Status: selectedAccount.approvalStatus,
                  Email: selectedAccount.email || '—',
                  Phone: selectedAccount.phone || '—',
                  Roll: selectedAccount.roll || '—',
                  College: selectedAccount.college || '—',
                  Department: selectedAccount.department || '—',
                  Semester: selectedAccount.semester || '—',
                  'Created at': selectedAccount.createdAt || '—'
                }).map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><div className="text-[10px] font-semibold uppercase text-slate-500">{label}</div><div className="mt-1 break-words text-xs font-medium text-slate-800">{value}</div></div>)}
              </div>
              {selectedAccount.details && (
                <details className="rounded-xl border border-slate-200 p-3">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-700">Additional profile information</summary>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-[10px] text-slate-600">{JSON.stringify(selectedAccount.details, null, 2)}</pre>
                </details>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => void deleteAccount()} disabled={saving || accountDetailsLoading || !selectedAccount.details} className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-bold text-rose-700 disabled:opacity-50">Delete account</button>
              {selectedAccount.approvalStatus === 'Pending' && <>
                <button type="button" onClick={() => void decideAccount('reject')} disabled={saving || accountDetailsLoading || !selectedAccount.details} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">Reject</button>
                <button type="button" onClick={() => void decideAccount('approve')} disabled={saving || accountDetailsLoading || !selectedAccount.details} className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{accountDetailsLoading ? 'Loading...' : saving ? 'Saving...' : 'Approve'}</button>
              </>}
            </div>
          </div>
        </div>
      )}

      {communityModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3" role="dialog" aria-modal="true" aria-label="Edit community">
          <form onSubmit={saveCommunity} className="my-auto max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-surface p-4"><div><h2 className="font-bold text-text-primary">{communityModal.id ? 'Edit community' : 'Create community'}</h2><p className="text-xs text-slate-500">Settings are validated and saved on the server.</p></div><button type="button" onClick={() => setCommunityModal(null)} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">Name<input required maxLength={120} value={communityModal.name} onChange={event => setCommunityModal({ ...communityModal, name: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal" /></label>
              <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">Description<textarea maxLength={2000} rows={3} value={communityModal.description} onChange={event => setCommunityModal({ ...communityModal, description: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal" /></label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">College<input list="admin-community-colleges" required value={communityModal.college} onChange={event => setCommunityModal({ ...communityModal, college: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal" /><datalist id="admin-community-colleges">{COLLEGES_DIRECTORY.map(item => <option key={item.id} value={item.name} />)}</datalist></label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">Department<input list="admin-community-departments" required value={communityModal.department} onChange={event => setCommunityModal({ ...communityModal, department: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal" /><datalist id="admin-community-departments">{TECHNOLOGIES_DIRECTORY.map(item => <option key={item.id} value={item.name} />)}</datalist></label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">Semester<select value={communityModal.semester} onChange={event => setCommunityModal({ ...communityModal, semester: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal">{Array.from({ length: 8 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">Shift<select value={communityModal.shift} onChange={event => setCommunityModal({ ...communityModal, shift: event.target.value as CommunityDraft['shift'] })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal"><option>Both</option><option>Morning</option><option>Day</option></select></label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">Section<select value={communityModal.section} onChange={event => setCommunityModal({ ...communityModal, section: event.target.value as CommunityDraft['section'] })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal"><option>All</option><option>A1</option><option>A2</option><option>B1</option><option>B2</option></select></label>
              <label className="space-y-1 text-xs font-semibold text-slate-700">Visibility<select value={communityModal.visibility} onChange={event => setCommunityModal({ ...communityModal, visibility: event.target.value as CommunityDraft['visibility'] })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal"><option value="public">Public</option><option value="private">Private</option></select></label>
              <label className="space-y-1 text-xs font-semibold text-slate-700 sm:col-span-2">Image URL or upload<input value={communityModal.image_url.startsWith('data:') ? 'Image uploaded' : communityModal.image_url} onChange={event => setCommunityModal({ ...communityModal, image_url: event.target.value })} placeholder="https://..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-normal" /><span className="flex items-center gap-2 pt-1"><ImagePlus className="h-4 w-4" /><input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadCommunityImage} className="text-[11px] font-normal" />Photos are compressed automatically</span></label>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => setCommunityModal(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold">Cancel</button><button type="submit" disabled={saving} className="rounded-xl bg-text-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? 'Saving...' : communityModal.id ? 'Save changes' : 'Create community'}</button></div>
          </form>
        </div>
      )}

      {membersCommunity && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3" role="dialog" aria-modal="true" aria-label="Community members">
          <div className="my-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-surface p-4"><div><h2 className="font-bold text-text-primary">Members · {membersCommunity.name}</h2><p className="text-xs text-slate-500">{activeCommunityMembers.length} membership records</p></div><button type="button" onClick={() => setMembersCommunity(null)} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
            <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row"><select value={memberToAdd} onChange={event => setMemberToAdd(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs"><option value="">Select an account to add</option>{addableAccounts.map(account => <option key={account.id} value={account.id}>{account.name} · {roleLabel[account.role]}</option>)}</select><button type="button" onClick={() => void addMember()} disabled={!memberToAdd || saving} className="rounded-xl bg-text-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Add member</button></div>
            <div className="divide-y divide-slate-100">
              {activeCommunityMembers.map(membership => (
                <div key={membership.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1"><div className="truncate text-xs font-bold text-slate-800">{membership.user_name}</div><div className="text-[10px] text-slate-500">{membership.user_role} · {membership.status} · {membership.membership_role}</div></div>
                  {membership.status === 'active' && <button type="button" onClick={() => void setModerator(membership, membership.membership_role !== 'moderator')} disabled={saving} className="rounded-lg border border-slate-200 px-3 py-2 text-[11px] font-semibold disabled:opacity-50">{membership.membership_role === 'moderator' ? 'Remove moderator' : 'Make moderator'}</button>}
                  <button type="button" onClick={() => void removeMember(membership)} disabled={saving} className="rounded-lg border border-rose-200 px-3 py-2 text-[11px] font-semibold text-rose-700 disabled:opacity-50">Remove</button>
                </div>
              ))}
              {!activeCommunityMembers.length && <p className="p-6 text-center text-xs text-slate-500">No members.</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
