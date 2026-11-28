/**
 * Admin roles & permissions (module 7) — founder-only section.
 * GET /api/admin/admins · POST /api/admin/admins (invite)
 * PATCH /api/admin/admins/:id (edit role / deactivate / reactivate)
 * The permission matrix below is a read-only reference table.
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
import { KeyRound, Plus, RefreshCw, ShieldCheck, X } from 'lucide-react';

export const ADMIN_ROLES = ['super_admin', 'academic_manager', 'content_manager', 'support_manager', 'analyst'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  academic_manager: 'Academic Manager',
  content_manager: 'Content Manager',
  support_manager: 'Support Manager',
  analyst: 'Analyst',
};

/** Read-only permission matrix: which role may do what. */
const PERMISSION_MATRIX: Array<{ capability: string; roles: Record<AdminRole, boolean> }> = [
  { capability: 'Approve / reject accounts & captains', roles: { super_admin: true, academic_manager: true, content_manager: false, support_manager: false, analyst: false } },
  { capability: 'Manage teachers & routines', roles: { super_admin: true, academic_manager: true, content_manager: false, support_manager: false, analyst: false } },
  { capability: 'Publish notices & broadcasts', roles: { super_admin: true, academic_manager: true, content_manager: true, support_manager: false, analyst: false } },
  { capability: 'Manage subject catalog & results import', roles: { super_admin: true, academic_manager: true, content_manager: true, support_manager: false, analyst: false } },
  { capability: 'Answer support tickets', roles: { super_admin: true, academic_manager: false, content_manager: false, support_manager: true, analyst: false } },
  { capability: 'View reports & analytics', roles: { super_admin: true, academic_manager: true, content_manager: true, support_manager: true, analyst: true } },
  { capability: 'Export user data (CSV)', roles: { super_admin: true, academic_manager: true, content_manager: false, support_manager: false, analyst: true } },
  { capability: 'Manage feature flags & force update', roles: { super_admin: true, academic_manager: false, content_manager: false, support_manager: false, analyst: false } },
  { capability: 'Manage sessions & revoke logins', roles: { super_admin: true, academic_manager: false, content_manager: false, support_manager: false, analyst: false } },
  { capability: 'Invite / edit / deactivate admins', roles: { super_admin: true, academic_manager: false, content_manager: false, support_manager: false, analyst: false } },
];

type AdminTeamMember = {
  id: string;
  name: string;
  email: string;
  role: AdminRole | string;
  active?: boolean;
  deactivated?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
};

export const AdminRolesSection: React.FC = () => {
  const { isServerVerifiedAdmin } = useApp();
  const { request } = useAdminRequest();
  const [admins, setAdmins] = useState<AdminTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AdminRole>('support_manager');
  const [invitePassword, setInvitePassword] = useState('');
  const [editTarget, setEditTarget] = useState<AdminTeamMember | null>(null);
  const [editRole, setEditRole] = useState<AdminRole>('support_manager');
  const [confirmDeactivate, setConfirmDeactivate] = useState<AdminTeamMember | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await request('/api/admin/admins');
      const list = (data.admins || data.items || []) as AdminTeamMember[];
      setAdmins(list);
    } catch (loadError) {
      setAdmins([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Could not load admin accounts. The server endpoint may not be deployed yet.'
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

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = await request('/api/admin/admins', {
        method: 'POST',
        body: JSON.stringify({
          name: inviteName.trim(),
          email: inviteEmail.trim(),
          role: inviteRole,
          password: invitePassword,
        }),
      });
      setInviteOpen(false);
      setInviteName('');
      setInviteEmail('');
      setInvitePassword('');
      notifySuccess(typeof data.message === 'string' ? data.message : `Admin invite created for ${inviteEmail.trim()}. Share the initial password securely — they should change it on first sign-in.`);
      await load();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Could not invite admin.');
    } finally {
      setSaving(false);
    }
  };

  const saveRole = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    setError('');
    try {
      const data = await request(`/api/admin/admins/${encodeURIComponent(editTarget.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: editRole }),
      });
      setEditTarget(null);
      notifySuccess(typeof data.message === 'string' ? data.message : 'Admin role updated.');
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update admin role.');
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (member: AdminTeamMember, active: boolean) => {
    setSaving(true);
    setError('');
    try {
      const data = await request(`/api/admin/admins/${encodeURIComponent(member.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      });
      notifySuccess(typeof data.message === 'string' ? data.message : active ? `${member.name} reactivated.` : `${member.name} deactivated.`);
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Could not update admin status.');
    } finally {
      setSaving(false);
      setConfirmDeactivate(null);
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
        title="Admin team — roles & permissions"
        subtitle="Founder-only: invite admins, change their role, or deactivate them. The initial password is set by the founder and must be shared securely."
        action={
          <div className="flex gap-2">
            <button type="button" onClick={() => void load()} className={outlineBtnCls}>
              <RefreshCw aria-hidden="true" className="inline h-3.5 w-3.5" /> Refresh
            </button>
            <button type="button" onClick={() => setInviteOpen(true)} className={primaryBtnCls}>
              <Plus aria-hidden="true" className="inline h-3.5 w-3.5" /> Invite admin
            </button>
          </div>
        }
      />

      {loading ? (
        <AdminEmpty>Loading admin accounts…</AdminEmpty>
      ) : !admins.length ? (
        <AdminEmpty>No other admin accounts yet. Use “Invite admin” to add the first team member.</AdminEmpty>
      ) : (
        <div className="grid gap-2">
          {admins.map(member => {
            const inactive = member.active === false || member.deactivated === true;
            return (
              <AdminCard key={member.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex items-start gap-2">
                    <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-text-primary">{member.name}</h3>
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">{roleLabel[member.role] || member.role}</span>
                        {inactive && <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">Deactivated</span>}
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {member.email}
                        {member.createdAt ? ` · Added ${formatDateTime(member.createdAt)}` : ''}
                        {member.lastLoginAt ? ` · Last login ${formatDateTime(member.lastLoginAt)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditTarget(member); setEditRole((member.role as AdminRole) || 'support_manager'); }}
                      disabled={saving}
                      className={outlineBtnCls}
                    >
                      Edit role
                    </button>
                    {inactive ? (
                      <button type="button" onClick={() => void setActive(member, true)} disabled={saving} className="rounded-xl bg-teal-600 px-3 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50">
                        Reactivate
                      </button>
                    ) : (
                      <button type="button" onClick={() => setConfirmDeactivate(member)} disabled={saving} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                        Deactivate
                      </button>
                    )}
                  </div>
                </div>
              </AdminCard>
            );
          })}
        </div>
      )}

      <AdminCard>
        <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary">
          <KeyRound aria-hidden="true" className="h-4 w-4 text-teal-600" /> Permission matrix (read-only)
        </h3>
        <p className="mt-1 text-xs text-slate-500">What each admin role is allowed to do. Only the founder (Super Admin) can change admin roles.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="py-2 pr-2 font-bold text-slate-700">Capability</th>
                {ADMIN_ROLES.map(role => (
                  <th key={role} className="py-2 text-center font-bold text-slate-700">{roleLabel[role]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX.map(row => (
                <tr key={row.capability} className="border-b border-slate-100">
                  <td className="py-2 pr-2 font-medium text-slate-700">{row.capability}</td>
                  {ADMIN_ROLES.map(role => (
                    <td key={role} className={`py-2 text-center font-bold ${row.roles[role] ? 'text-teal-700' : 'text-slate-300'}`}>
                      {row.roles[role] ? '✓' : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {inviteOpen && (
        <Modal
          onClose={() => setInviteOpen(false)}
          labelledBy="admin-invite-title"
          panelClassName="dm-modal-panel w-full max-w-lg rounded-2xl bg-surface p-5 shadow-2xl"
          overlayClassName="dm-modal-overlay fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3"
          panelAsForm
          onSubmit={invite}
          showCloseButton={false}
        >
          <div className="flex items-center justify-between">
            <h2 id="admin-invite-title" className="font-bold text-text-primary">Invite admin</h2>
            <button type="button" onClick={() => setInviteOpen(false)} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100"><X aria-hidden="true" className="h-4 w-4" /></button>
          </div>
          <div className="mt-4 grid gap-3">
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Name
              <input required maxLength={120} value={inviteName} onChange={e => setInviteName(e.target.value)} className={inputCls} />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Email
              <input required type="email" maxLength={200} value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className={inputCls} />
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Role
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as AdminRole)} className={inputCls}>
                {ADMIN_ROLES.map(role => <option key={role} value={role}>{roleLabel[role]}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">
              Initial password (set by the founder — share it securely)
              <input required type="password" minLength={8} autoComplete="new-password" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} placeholder="At least 8 characters" className={inputCls} />
            </label>
            <p className="text-[11px] leading-relaxed text-slate-500">
              The new admin signs in with this email and password, then changes the password on first sign-in.
            </p>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setInviteOpen(false)} className={outlineBtnCls}>Cancel</button>
            <button type="submit" disabled={saving} className={primaryBtnCls}>{saving ? 'Inviting…' : 'Invite admin'}</button>
          </div>
        </Modal>
      )}

      {editTarget && (
        <Modal
          onClose={() => setEditTarget(null)}
          labelledBy="admin-edit-role-title"
          panelClassName="dm-modal-panel w-full max-w-md rounded-2xl bg-surface p-5 shadow-2xl"
          overlayClassName="dm-modal-overlay fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3"
          panelAsForm
          onSubmit={saveRole}
          showCloseButton={false}
        >
          <div className="flex items-center justify-between">
            <h2 id="admin-edit-role-title" className="font-bold text-text-primary">Edit role — {editTarget.name}</h2>
            <button type="button" onClick={() => setEditTarget(null)} aria-label="Close" className="rounded-lg p-2 hover:bg-slate-100"><X aria-hidden="true" className="h-4 w-4" /></button>
          </div>
          <label className="mt-4 block space-y-1 text-xs font-semibold text-slate-700">
            Role
            <select value={editRole} onChange={e => setEditRole(e.target.value as AdminRole)} className={selectCls}>
              {ADMIN_ROLES.map(role => <option key={role} value={role}>{roleLabel[role]}</option>)}
            </select>
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setEditTarget(null)} className={outlineBtnCls}>Cancel</button>
            <button type="submit" disabled={saving} className={primaryBtnCls}>{saving ? 'Saving…' : 'Save role'}</button>
          </div>
        </Modal>
      )}

      {confirmDeactivate && (
        <ConfirmDialog
          title="Deactivate admin"
          message={`Deactivate ${confirmDeactivate.name} (${confirmDeactivate.email})? They will not be able to sign in to the admin panel until reactivated. Their past admin actions stay in the audit log.`}
          confirmLabel="Deactivate"
          busy={saving}
          onConfirm={() => void setActive(confirmDeactivate, false)}
          onCancel={() => setConfirmDeactivate(null)}
        />
      )}
    </div>
  );
};
