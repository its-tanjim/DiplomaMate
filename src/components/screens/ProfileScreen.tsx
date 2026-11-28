import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { apiFetch } from '../../services/apiClient';
import { 
  POLYTECHNIC_COLLEGES, 
  DEPARTMENTS, 
  SESSIONS 
} from '../../data/mockData';
import { 
  Section, 
  SemesterNumber, 
  Shift, 
  StudentProfile 
} from '../../types';
import { SearchableCollegeSelect } from '../common/SearchableCollegeSelect';
import { SearchableDepartmentSelect } from '../common/SearchableDepartmentSelect';
import { CatalogSubjectSelect } from '../common/CatalogSubjectSelect';
import { 
  UserCircle, 
  Edit3, 
  Check, 
  ShieldCheck, 
  LogOut, 
  Building2, 
  Layers, 
  Mail,
  Calendar
} from 'lucide-react';

export const ProfileScreen: React.FC = () => {
  const {
    userProfile,
    setUserProfile,
    accountType,
    isServerVerifiedAdmin,
    authToken,
    logout,
    setActiveScreen,
    showToast,
    updateStudentProfileFields
  } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<StudentProfile>(userProfile);
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  // B17 — My Attendance (student view, GET /api/attendance/mine).
  // Read-only: the student's own marks as recorded by their teachers.
  const [myAttendance, setMyAttendance] = useState<Array<{
    date: string;
    subjectCode: string;
    subjectName: string;
    status: string;
    periodLabel?: string;
  }>>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');

  useEffect(() => {
    if (accountType !== 'student' && accountType !== 'class_captain') return;
    const tokenToUse = authToken || localStorage.getItem('diplomamate_auth_token');
    if (!tokenToUse) return;
    let cancelled = false;
    setAttendanceLoading(true);
    setAttendanceError('');
    apiFetch('/api/attendance/mine', {
      headers: { Authorization: `Bearer ${tokenToUse}` }
    })
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !data.success || !Array.isArray(data.records)) {
          setAttendanceError(data?.error || 'Could not load your attendance.');
          return;
        }
        const records = [...data.records].sort((a, b) =>
          String(b.date || '').localeCompare(String(a.date || ''))
        );
        setMyAttendance(records);
      })
      .catch(() => {
        if (!cancelled) setAttendanceError('Could not load your attendance — check your connection.');
      })
      .finally(() => {
        if (!cancelled) setAttendanceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accountType, authToken]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Never allow profile editing to escalate or alter accountType
    const newEmail = (formData.email || '').trim();
    const oldEmail = (userProfile.email || '').trim();
    const emailChanged = newEmail.toLowerCase() !== oldEmail.toLowerCase();
    const newSubjects = formData.enrolledSubjects || [];
    const oldSubjects = userProfile.enrolledSubjects || [];
    const subjectsChanged = JSON.stringify(newSubjects) !== JSON.stringify(oldSubjects);

    // Client-side format check before hitting the server.
    if (emailChanged && newEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      showToast('Please enter a valid email address.');
      return;
    }

    // The profile to keep locally once every server save succeeds.
    const profileToSave: StudentProfile = {
      ...formData,
      accountType: userProfile.accountType
    };

    if (emailChanged) {
      // Email is one of the two profile fields that live on the server
      // (it is what Google sign-in links by), so a changed email goes
      // through PATCH /api/me/email.
      if (!authToken) {
        setUserProfile(profileToSave);
        setIsEditing(false);
        showToast('Profile saved on this device. Email could not be saved to the server — please sign in again.');
        return;
      }
      setIsSavingEmail(true);
      try {
        const res = await apiFetch('/api/me/email', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({ email: newEmail })
        });
        const data = await res.json().catch(() => ({} as { error?: string; email?: string }));
        if (!res.ok) {
          // Server rejected the email (invalid / already used by another
          // account): keep the old email and leave the form open so the
          // user can fix it.
          showToast(data?.error || 'Could not save your email. Please try again.');
          return;
        }
        profileToSave.email = data.email || newEmail;
      } catch {
        // Network failure: keep the new email locally and say the
        // server save did not happen.
        setUserProfile(profileToSave);
        setIsEditing(false);
        showToast('Profile saved on this device. Email could not be saved to the server — check your connection and try again.');
        return;
      } finally {
        setIsSavingEmail(false);
      }
    }

    // B1: name/phone/session/regulation/semester/shift/section (+ subjects) now
    // live on the server via PATCH /api/me/profile. Only the fields
    // that actually changed are sent. A 400/409 rejection (e.g. an
    // Approved captain changing section/shift/semester) leaves the form open
    // with the server message; a network failure keeps the values
    // locally and says so honestly.
    const profilePatch: {
      name?: string;
      phone?: string;
      session?: string;
      regulation?: string;
      semester?: number;
      shift?: Shift;
      section?: Section;
      enrolledSubjects?: { code: string; name: string }[];
    } = {};
    if ((formData.name || '').trim() !== (userProfile.name || '').trim()) profilePatch.name = (formData.name || '').trim();
    if ((formData.phone || '').trim() !== (userProfile.phone || '').trim()) profilePatch.phone = (formData.phone || '').trim();
    if ((formData.session || '') !== (userProfile.session || '')) profilePatch.session = formData.session;
    if ((formData.regulation || '') !== (userProfile.regulation || '')) profilePatch.regulation = formData.regulation;
    if (formData.semester !== userProfile.semester) profilePatch.semester = formData.semester;
    if (formData.shift !== userProfile.shift) profilePatch.shift = formData.shift;
    if (formData.section !== userProfile.section) profilePatch.section = formData.section;
    if (subjectsChanged) profilePatch.enrolledSubjects = newSubjects;

    if (Object.keys(profilePatch).length > 0) {
      if (!authToken) {
        setUserProfile(profileToSave);
        setIsEditing(false);
        showToast('Profile saved on this device. These changes could not be saved to the server — please sign in again.');
        return;
      }
      const res = await updateStudentProfileFields(profilePatch);
      if (!res.success) {
        // Server rejected the change (validation / captain cohort
        // guard): keep the form open so the user can fix it.
        showToast(res.message);
        return;
      }
    }

    setUserProfile(profileToSave);
    setIsEditing(false);
    showToast('Profile updated successfully!');
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header Card */}
      <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center">
              <UserCircle aria-hidden="true" className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-text-primary">
              {accountType === 'teacher' ? 'Faculty Profile' : 'Student Profile'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => {
                  if (accountType === 'teacher') {
                    setActiveScreen('teacher_setup');
                  } else {
                    setFormData(userProfile);
                    setIsEditing(true);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-50 text-brand-blue text-xs font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 aria-hidden="true" className="w-3.5 h-3.5" />
                <span>{accountType === 'teacher' ? 'Setup Faculty Profile' : 'Edit Profile'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Class Captain Accreditation & Verification Card */}
      <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-brand-teal flex items-center justify-center font-bold">
              <ShieldCheck aria-hidden="true" className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-text-primary">Class Captain Verification</h3>
            </div>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
            userProfile.captainVerificationStatus === 'Approved'
              ? 'bg-teal-100 text-brand-teal'
              : userProfile.captainVerificationStatus === 'Pending'
              ? 'bg-amber-100 text-amber-700'
              : userProfile.captainVerificationStatus === 'Rejected'
              ? 'bg-red-100 text-red-700'
              : 'bg-slate-100 text-slate-600'
          }`}>
            {userProfile.captainVerificationStatus}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-slate-100">
          <button
            onClick={() => setActiveScreen('captain_verification')}
            className="flex-1 py-2 px-3 rounded-xl bg-brand-teal hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5" />
            <span>{userProfile.captainVerificationStatus === 'Approved' ? 'View Captain Accreditation' : 'Apply / Check Captain Status'}</span>
          </button>

          {accountType === 'system_admin' && isServerVerifiedAdmin && (
            <button
              onClick={() => window.location.replace('https://admin.diplomamate.online/')}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Admin Review Portal</span>
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        /* Edit Profile Form */
        <form onSubmit={handleSave} className="bg-surface rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-text-primary border-b border-slate-100 pb-2">
            Edit Student Information
          </h2>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Full Student Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-text-primary focus:ring-2 focus:ring-brand-blue"
            />
          </div>

          <SearchableCollegeSelect
            value={formData.college}
            onChange={(name) => setFormData({ ...formData, college: name })}
            label="College / Polytechnic Institute"
            required
          />

          <SearchableDepartmentSelect
            value={formData.department}
            onChange={(name) => setFormData({ ...formData, department: name })}
            label="Department / Technology"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">BTEB Board Roll</label>
              <input
                type="text"
                readOnly
                aria-readonly="true"
                value={formData.boardRoll}
                className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-text-primary cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Registration No</label>
              <input
                type="text"
                readOnly
                aria-readonly="true"
                value={formData.regNumber}
                className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-200 rounded-lg text-text-primary cursor-not-allowed"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500">Board roll and registration number cannot be changed — one board roll has one account. Contact the admin if yours is wrong.</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Regulation</label>
              <select
                value={formData.regulation || '2022'}
                onChange={(e) => setFormData({ ...formData, regulation: e.target.value as '2016' | '2022' })}
                className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary font-semibold"
              >
                <option value="2022">2022 Reg</option>
                <option value="2016">2016 Reg</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Semester (1-8)</label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) as SemesterNumber })}
                className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{s}th</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Section</label>
              <select
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value as Section })}
                className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
              >
                {['A1', 'B1', 'A2', 'B2'].map(sec => <option key={sec} value={sec}>{sec}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Shift</label>
              <select
                value={formData.shift}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value as Shift })}
                className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
              >
                <option value="Morning">Morning</option>
                <option value="Day">Day</option>
              </select>
            </div>
          </div>

          {/* Automatic Subject Suggestions from Central Catalog */}
          <div className="pt-1">
            <CatalogSubjectSelect
              technology={formData.department}
              regulation={formData.regulation || '2022'}
              onRegulationChange={(reg) => setFormData({ ...formData, regulation: reg })}
              semester={formData.semester}
              isMulti={true}
              label="Enrolled Semester Subjects (Auto-Suggested from Catalog)"
              selectedSubjects={
                (formData.enrolledSubjects || []).map(s => `${s.name} (${s.code})`)
              }
              onMultiSelect={(subjLabels) => {
                const parsed = subjLabels.map((lbl) => {
                  const m = lbl.match(/^(.*?)\s*\((\d{4,6})\)\s*$/);
                  return m ? { name: m[1].trim(), code: m[2].trim() } : { name: lbl, code: '' };
                });
                setFormData({ ...formData, enrolledSubjects: parsed });
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Academic Session</label>
              <select
                value={formData.session}
                onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
              >
                {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Email Address</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@gmail.com"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
            />
            <p className="text-[11px] text-slate-500 mt-1">Add your Gmail to sign in with Google later. One email can belong to only one account.</p>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingEmail}
              className="flex-1 py-2 px-3 rounded-xl bg-brand-blue text-white text-xs font-semibold hover:bg-blue-700 shadow-xs disabled:opacity-60"
            >
              {isSavingEmail ? 'Saving…' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      ) : (
        /* Profile Display Card */
        <div className="bg-surface rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              {userProfile.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary leading-tight">
                {userProfile.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {userProfile.email || 'No email added — tap Edit to add your Gmail.'}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-brand-blue bg-blue-50 px-2 py-0.5 rounded-md">
                  {userProfile.shift} Shift
                </span>
                <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  Section {userProfile.section}
                </span>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                  Reg {userProfile.regulation || '2022'}
                </span>
              </div>
            </div>
          </div>

          {/* Grid of Profile Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Polytechnic Institute</span>
              <span className="text-text-primary font-bold text-sm mt-0.5 block">
                {userProfile.college}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Department / Technology</span>
              <span className="text-text-primary font-bold text-sm mt-0.5 block">
                {userProfile.department}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">BTEB Board Roll</span>
              <span className="text-text-primary font-bold font-mono text-base mt-0.5 block">
                {userProfile.boardRoll}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Registration Number</span>
              <span className="text-text-primary font-bold font-mono text-base mt-0.5 block">
                {userProfile.regNumber}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Current Semester & Regulation</span>
              <span className="text-text-primary font-bold text-sm mt-0.5 block">
                Semester {userProfile.semester} · Regulation {userProfile.regulation || '2022'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Section & Shift</span>
              <span className="text-text-primary font-bold text-sm mt-0.5 block">
                Section {userProfile.section} · {userProfile.shift} Shift
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Academic Session</span>
              <span className="text-text-primary font-bold text-sm mt-0.5 block">
                {userProfile.session}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Contact Phone</span>
              <span className="text-text-primary font-bold font-mono text-sm mt-0.5 block">
                {userProfile.phone || '+880 1712-345678'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Email Address</span>
              <span className="text-text-primary font-bold text-sm mt-0.5 block break-all">
                {userProfile.email || 'No email added — tap Edit to add your Gmail.'}
              </span>
            </div>
          </div>

          {/* Selected Enrolled Subjects from Catalog */}
          {userProfile.enrolledSubjects && userProfile.enrolledSubjects.length > 0 && (
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                  Selected Semester Subjects ({userProfile.enrolledSubjects.length})
                </span>
                <button
                  type="button"
                  onClick={() => setActiveScreen('book_list')}
                  className="text-[11px] font-bold text-blue-600 hover:underline"
                >
                  Open Full Book List
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {userProfile.enrolledSubjects.map((s) => (
                  <span
                    key={`${s.code}_${s.name}`}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-blue-200 text-xs font-semibold text-slate-800"
                  >
                    <strong className="font-mono text-blue-700">{s.code}</strong> · {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(!userProfile.enrolledSubjects || userProfile.enrolledSubjects.length === 0) && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500">No semester subjects selected yet — tap Edit Profile to choose your subjects.</span>
            </div>
          )}

          {/* My Attendance — read-only view of the student's own marks (B17) */}
          {(accountType === 'student' || accountType === 'class_captain') && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                My Attendance
              </span>
              {attendanceLoading ? (
                <span className="text-xs text-slate-500">Loading your attendance…</span>
              ) : attendanceError ? (
                <span className="text-xs text-rose-600">{attendanceError}</span>
              ) : myAttendance.length === 0 ? (
                <span className="text-xs text-slate-500">No attendance recorded for you yet.</span>
              ) : (
                <div className="space-y-1.5">
                  {myAttendance.slice(0, 10).map((rec, idx) => (
                    <div key={`${rec.date}_${rec.subjectCode}_${idx}`} className="flex items-center justify-between gap-2 text-xs bg-surface rounded-lg border border-slate-100 px-2.5 py-1.5">
                      <div className="min-w-0">
                        <span className="font-semibold text-text-primary block truncate">
                          {rec.subjectName || rec.subjectCode}
                          {rec.subjectCode ? ` (${rec.subjectCode})` : ''}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {rec.date}
                          {rec.periodLabel ? ` · ${rec.periodLabel}` : ''}
                        </span>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        rec.status === 'present'
                          ? 'bg-teal-100 text-teal-700'
                          : rec.status === 'absent'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {rec.status === 'present' ? 'Present' : rec.status === 'absent' ? 'Absent' : 'Not marked'}
                      </span>
                    </div>
                  ))}
                  {myAttendance.length > 10 && (
                    <span className="text-[11px] text-slate-500">Showing the 10 most recent records.</span>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Logout / Sign Out Button */}
      <div className="pt-2">
        <button
          onClick={logout}
          className="w-full py-2.5 px-4 rounded-xl border border-rose-200 text-rose-600 bg-surface hover:bg-rose-50 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          <LogOut aria-hidden="true" className="w-4 h-4" />
          <span>Sign Out of DiplomaMate</span>
        </button>
      </div>
    </div>
  );
};
