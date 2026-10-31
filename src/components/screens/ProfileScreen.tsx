import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
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
  UserCheck, 
  LogOut, 
  Building2, 
  GraduationCap, 
  Layers, 
  Phone,
  Mail,
  Calendar,
  Settings as SettingsIcon
} from 'lucide-react';

export const ProfileScreen: React.FC = () => {
  const { 
    userProfile, 
    setUserProfile, 
    accountType, 
    isTeacherContactUnlocked,
    isTeacherContactAccessLocked,
    isServerVerifiedAdmin,
    logout, 
    setActiveScreen,
    showToast 
  } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<StudentProfile>(userProfile);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Never allow profile editing to escalate or alter accountType
    setUserProfile({
      ...formData,
      accountType: userProfile.accountType
    });
    setIsEditing(false);
    showToast('Profile updated successfully!');
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <UserCircle className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-[#172554]">
              {accountType === 'teacher' ? 'Faculty Profile' : 'Student Profile'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveScreen('settings')}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Settings"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
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
                className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#2563EB] text-xs font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{accountType === 'teacher' ? 'Setup Faculty Profile' : 'Edit Profile'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Account Type Status Banner (Strict role separation) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              accountType === 'teacher'
                ? 'bg-indigo-50 text-indigo-700'
                : accountType === 'class_captain' 
                  ? 'bg-teal-50 text-[#0D9488]' 
                  : 'bg-blue-50 text-[#2563EB]'
            }`}>
              {accountType === 'teacher' ? (
                <GraduationCap className="w-5 h-5" />
              ) : accountType === 'class_captain' ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <UserCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Account Role (Strictly Enforced)</div>
              <div className="text-sm font-bold text-[#172554]">
                {accountType === 'teacher' 
                  ? `${userProfile.designation || 'Institutional Faculty Member'}`
                  : accountType === 'class_captain' 
                    ? 'Official Class Captain (CR)' 
                    : 'General Diploma Student'}
              </div>
            </div>
          </div>

          {accountType === 'student' && (
            <button
              onClick={() => setActiveScreen('captain_verification')}
              className="self-start xs:self-auto px-3 py-1.5 rounded-xl border border-teal-200 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Apply for Class Captain</span>
            </button>
          )}

          {accountType === 'teacher' && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
              {userProfile.teacherVerificationStatus || 'Verified'} Faculty
            </span>
          )}
        </div>
        
        {accountType === 'class_captain' && (
          <p className="text-[11px] text-teal-700 bg-teal-50/70 p-2 rounded-lg mt-3 border border-teal-100">
            ★ As Class Captain, you have authorized permission to broadcast notices, add or edit class routine slots, and post assignments for Section {userProfile.section}.
          </p>
        )}
      </div>

      {/* Class Captain Accreditation & Verification Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9488] flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#172554]">Class Captain Verification</h3>
              <p className="text-[11px] text-slate-500">Official Guide Teacher & BTEB accreditation</p>
            </div>
          </div>

          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
            userProfile.captainVerificationStatus === 'Approved'
              ? 'bg-teal-100 text-[#0D9488]'
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
            className="flex-1 py-2 px-3 rounded-xl bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{userProfile.captainVerificationStatus === 'Approved' ? 'View Captain Accreditation' : 'Apply / Check Captain Status'}</span>
          </button>

          {accountType === 'system_admin' && isServerVerifiedAdmin && (
            <button
              onClick={() => setActiveScreen('admin_portal')}
              className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
            >
              <span>Admin Review Portal</span>
            </button>
          )}
        </div>
      </div>

      {/* Teacher Contact access status */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9488] flex items-center justify-center font-bold">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#172554]">Teacher's Contact Access</h3>
              <p className="text-[11px] text-slate-500">
                {isTeacherContactUnlocked
                  ? isTeacherContactAccessLocked && userProfile.isTeacherContactUnlocked
                    ? 'Lifetime access active'
                    : 'Free and available'
                  : 'Access restricted by administrator'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveScreen('teachers')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer bg-teal-50 text-[#0D9488] border border-teal-200 hover:bg-teal-100"
          >
            Open Directory
          </button>
        </div>
      </div>

      {isEditing ? (
        /* Edit Profile Form */
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-[#172554] border-b border-slate-100 pb-2">
            Edit Student Information
          </h2>

          <div>
            <label className="block text-xs font-semibold text-[#172554] mb-1">Full Student Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-[#172554] focus:ring-2 focus:ring-[#2563EB]"
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
              <label className="block text-xs font-semibold text-[#172554] mb-1">BTEB Board Roll</label>
              <input
                type="text"
                required
                value={formData.boardRoll}
                onChange={(e) => setFormData({ ...formData, boardRoll: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172554] mb-1">Registration No</label>
              <input
                type="text"
                required
                value={formData.regNumber}
                onChange={(e) => setFormData({ ...formData, regNumber: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#172554] mb-1">Regulation</label>
              <select
                value={formData.regulation || '2022'}
                onChange={(e) => setFormData({ ...formData, regulation: e.target.value as '2016' | '2022' })}
                className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#172554] font-semibold"
              >
                <option value="2022">2022 Reg</option>
                <option value="2016">2016 Reg</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172554] mb-1">Semester (1-8)</label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) as SemesterNumber })}
                className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s}>{s}th</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172554] mb-1">Section</label>
              <select
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value as Section })}
                className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
              >
                {['A1', 'B1', 'A2', 'B2'].map(sec => <option key={sec} value={sec}>{sec}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172554] mb-1">Shift</label>
              <select
                value={formData.shift}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value as Shift })}
                className="w-full px-2 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
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
              <label className="block text-xs font-semibold text-[#172554] mb-1">Academic Session</label>
              <select
                value={formData.session}
                onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
              >
                {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#172554] mb-1">Contact Phone</label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
              />
            </div>
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
              className="flex-1 py-2 px-3 rounded-xl bg-[#2563EB] text-white text-xs font-semibold hover:bg-blue-700 shadow-xs"
            >
              Save Profile Changes
            </button>
          </div>
        </form>
      ) : (
        /* Profile Display Card */
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              {userProfile.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#172554] leading-tight">
                {userProfile.name}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {userProfile.email}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-md">
                  {userProfile.shift} Shift
                </span>
                <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                  Section {userProfile.section}
                </span>
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                  Reg {userProfile.regulation || '2022'}
                </span>
              </div>
            </div>
          </div>

          {/* Grid of Profile Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Polytechnic Institute</span>
              <span className="text-[#172554] font-bold text-sm mt-0.5 block">
                {userProfile.college}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Department / Technology</span>
              <span className="text-[#172554] font-bold text-sm mt-0.5 block">
                {userProfile.department}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">BTEB Board Roll</span>
              <span className="text-[#172554] font-bold font-mono text-base mt-0.5 block">
                {userProfile.boardRoll}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Registration Number</span>
              <span className="text-[#172554] font-bold font-mono text-base mt-0.5 block">
                {userProfile.regNumber}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Current Semester & Regulation</span>
              <span className="text-[#172554] font-bold text-sm mt-0.5 block">
                Semester {userProfile.semester} · Regulation {userProfile.regulation || '2022'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Section & Shift</span>
              <span className="text-[#172554] font-bold text-sm mt-0.5 block">
                Section {userProfile.section} · {userProfile.shift} Shift
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Academic Session</span>
              <span className="text-[#172554] font-bold text-sm mt-0.5 block">
                {userProfile.session}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block">Contact Phone</span>
              <span className="text-[#172554] font-bold font-mono text-sm mt-0.5 block">
                {userProfile.phone || '+880 1712-345678'}
              </span>
            </div>
          </div>

          {/* Selected Enrolled Subjects from Catalog */}
          {userProfile.enrolledSubjects && userProfile.enrolledSubjects.length > 0 && (
            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                  Selected Semester Subjects ({userProfile.enrolledSubjects.length})
                </span>
                <button
                  type="button"
                  onClick={() => setActiveScreen('book_list')}
                  className="text-[11px] font-bold text-indigo-600 hover:underline"
                >
                  Open Full Book List
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {userProfile.enrolledSubjects.map((s) => (
                  <span
                    key={`${s.code}_${s.name}`}
                    className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-xs font-semibold text-slate-800"
                  >
                    <strong className="font-mono text-indigo-700">{s.code}</strong> · {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Logout / Sign Out Button */}
      <div className="pt-2">
        <button
          onClick={logout}
          className="w-full py-2.5 px-4 rounded-xl border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of DiplomaMate</span>
        </button>
      </div>
    </div>
  );
};
