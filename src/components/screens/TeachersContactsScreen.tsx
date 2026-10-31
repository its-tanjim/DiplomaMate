import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Contact2, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Search, 
  Plus, 
  MessageSquare, 
  Trash2,
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Sparkles, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  HelpCircle,
  Building2,
  Cpu,
  History,
  X
} from 'lucide-react';
import { TeacherContact, CatalogRegulation, SemesterNumber } from '../../types';
import { SearchableCollegeSelect } from '../common/SearchableCollegeSelect';
import { SearchableDepartmentSelect } from '../common/SearchableDepartmentSelect';
import { CatalogSubjectSelect } from '../common/CatalogSubjectSelect';
import { normalizeCollege, normalizeTechnology } from '../../data/directoryData';

export const TeachersContactsScreen: React.FC = () => {
  const { 
    teachers, 
    addTeacher, 
    archiveTeacherContact,
    accountType, 
    isTeacherContactUnlocked, 
    unlockTeacherContactsWithPayment, 
    userProfile,
    setActiveScreen,
    showToast 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Archive / Removal confirmation modal state
  const [contactToArchive, setContactToArchive] = useState<TeacherContact | null>(null);
  const [archiveReason, setArchiveReason] = useState('Faculty reassignment / transfer');
  const [customArchiveReason, setCustomArchiveReason] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);

  // Payment checkout modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'bKash' | 'Nagad' | 'Rocket' | 'Card'>('bKash');
  const [transactionId, setTransactionId] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // New teacher form state
  const [newTeacher, setNewTeacher] = useState<{
    name: string;
    designation: string;
    collegeName: string;
    department: string;
    regulation: CatalogRegulation;
    semester: SemesterNumber;
    subject: string;
    phone: string;
    email: string;
    room: string;
    consultingHours: string;
  }>({
    name: '',
    designation: 'Senior Instructor',
    collegeName: userProfile.college || 'Dhaka Polytechnic Institute',
    department: userProfile.department || 'Computer Science and Technology (CST)',
    regulation: userProfile.regulation || '2022',
    semester: userProfile.semester || 6,
    subject: '',
    phone: '',
    email: '',
    room: 'Academic Bldg 2, Room 304',
    consultingHours: 'Mon & Wed: 11:00 AM - 12:30 PM'
  });
  const [addFormError, setAddFormError] = useState<string | null>(null);

  const isStudent = accountType === 'student';
  const isCaptain = accountType === 'class_captain';
  const isTeacher = accountType === 'teacher';

  // Helper to check if captain is permitted to manage this contact based on cohort scope
  const isWithinCaptainScope = (tch: TeacherContact): boolean => {
    if (!isCaptain) return false;
    const tchCollege = normalizeCollege(tch.collegeName || 'Dhaka Polytechnic Institute').id;
    const userCollege = normalizeCollege(userProfile.college).id;
    const tchDept = normalizeTechnology(tch.department).id;
    const userDept = normalizeTechnology(userProfile.department).id;
    return tchCollege === userCollege && tchDept === userDept;
  };

  // Helper to check if teacher owns this contact
  const isTeacherOwnContact = (tch: TeacherContact): boolean => {
    if (!isTeacher) return false;
    return Boolean(
      (tch.teacherId && tch.teacherId === userProfile.id) || 
      (tch.phone && tch.phone === userProfile.phone)
    );
  };

  // Filter teachers (exclude archived from standard view)
  const filteredTeachers = teachers.filter(t => {
    if (t.isArchived) return false;

    const matchesSearch = 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.department && t.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.collegeName && t.collegeName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (selectedDeptFilter === 'All') return matchesSearch;
    return matchesSearch && t.department.toLowerCase().includes(selectedDeptFilter.toLowerCase());
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError(null);

    if (!newTeacher.name.trim() || !newTeacher.phone.trim()) {
      setAddFormError('Teacher full name and phone number are required.');
      return;
    }

    // BD phone validation
    const bdPhoneRegex = /^(?:\+?8801|01)[3-9]\d{8}$/;
    const cleanPhone = newTeacher.phone.replace(/[\s-]/g, '');
    if (!bdPhoneRegex.test(cleanPhone)) {
      setAddFormError('Please enter a valid Bangladesh mobile number (e.g. 01712345678 or +8801819334455).');
      return;
    }

    const res = await addTeacher({
      name: newTeacher.name.trim(),
      designation: newTeacher.designation,
      collegeName: newTeacher.collegeName,
      department: newTeacher.department,
      subject: newTeacher.subject.trim() || 'Core Curriculum Subject',
      phone: newTeacher.phone.trim(),
      email: newTeacher.email.trim(),
      room: newTeacher.room.trim(),
      consultingHours: newTeacher.consultingHours.trim()
    });

    if (res.success) {
      setNewTeacher({
        name: '',
        designation: 'Senior Instructor',
        collegeName: userProfile.college || 'Dhaka Polytechnic Institute',
        department: userProfile.department || 'Computer Science and Technology (CST)',
        regulation: userProfile.regulation || '2022',
        semester: userProfile.semester || 6,
        subject: '',
        phone: '',
        email: '',
        room: 'Academic Bldg 2, Room 304',
        consultingHours: 'Mon & Wed: 11:00 AM - 12:30 PM'
      });
      setShowAddModal(false);
    } else {
      setAddFormError(res.message);
    }
  };

  const handleConfirmArchive = async () => {
    if (!contactToArchive) return;
    const finalReason = archiveReason === 'Other' ? customArchiveReason.trim() : archiveReason;
    if (!finalReason) {
      showToast('⚠️ Please specify a reason for archiving.');
      return;
    }

    setIsArchiving(true);
    try {
      const res = await archiveTeacherContact(contactToArchive.id, finalReason);
      if (res.success) {
        setContactToArchive(null);
        setCustomArchiveReason('');
      }
    } finally {
      setIsArchiving(false);
    }
  };

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId.trim()) {
      setPaymentError('Please enter the MFS Transaction ID.');
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);
    try {
      const res = await unlockTeacherContactsWithPayment(selectedProvider, transactionId.trim().toUpperCase());
      if (res.success) {
        setShowPaymentModal(false);
        setTransactionId('');
      } else {
        setPaymentError(res.message);
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // If locked, render the Premium BDT 10 Paywall
  if (!isTeacherContactUnlocked) {
    return (
      <div className="space-y-4 pb-12">
        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9488] flex items-center justify-center font-bold">
              <Contact2 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-[#172554]">
                Teachers' Contacts Directory
              </h1>
              <p className="text-xs text-slate-500">
                Direct faculty dialer & consulting schedule
              </p>
            </div>
          </div>
        </div>

        {/* Premium Paywall Card */}
        <div className="bg-gradient-to-b from-white to-blue-50/40 rounded-2xl border border-blue-200/80 p-6 shadow-sm text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[#2563EB] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl shadow-xs">
            One-Time Access
          </div>

          <div className="w-14 h-14 rounded-2xl bg-blue-100/80 text-[#2563EB] mx-auto flex items-center justify-center mb-3 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-extrabold text-[#172554]">
            Unlock Teachers' Contacts
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">
            Get instant, verified dial access to your college instructors, guide teachers, and heads of departments.
          </p>

          <div className="my-5 p-4 rounded-xl bg-white border border-blue-100 shadow-xs max-w-xs mx-auto">
            <div className="text-3xl font-black text-[#2563EB] flex items-center justify-center gap-1">
              <span className="text-lg font-bold text-slate-500">৳</span>10
              <span className="text-xs font-normal text-slate-400">/ lifetime</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              One-time charge. No recurring subscription.
            </p>
          </div>

          <button
            onClick={() => setShowPaymentModal(true)}
            className="w-full max-w-xs py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 mx-auto cursor-pointer transition-all"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pay BDT 10 via bKash / Nagad</span>
          </button>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-sm text-[#172554]">Complete BDT 10 Payment</h3>
                <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleVerifyPayment} className="space-y-3 mt-3">
                <div className="flex gap-2">
                  {(['bKash', 'Nagad', 'Rocket'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSelectedProvider(p)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        selectedProvider === p
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900">
                  Send Money BDT 10 to Merchant: <strong className="font-mono">01700-112233</strong> and paste Transaction ID below.
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#172554] mb-1">Transaction ID (TrxID)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TRX99214A"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="w-full px-3 py-2 text-xs uppercase font-mono bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  />
                  {paymentError && <p className="text-[11px] text-rose-500 mt-1">{paymentError}</p>}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessingPayment}
                    className="flex-1 py-2 text-xs font-bold rounded-lg bg-[#2563EB] text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isProcessingPayment ? 'Verifying...' : 'Confirm & Unlock'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Unlocked State: Render Faculty Directory
  return (
    <div className="space-y-4 pb-12">
      {/* Top Header Card with Access & Role Permissions Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9488] flex items-center justify-center font-bold">
                <Contact2 className="w-4 h-4" />
              </div>
              <h1 className="text-base sm:text-lg font-bold text-[#172554]">
                Teachers' Contacts
              </h1>
              <span className="bg-teal-50 text-[#0D9488] border border-teal-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>BDT 10 Active</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct faculty dialer & consulting schedule across 46 polytechnics
            </p>
          </div>

          {/* Action Button: Strictly forbidden for students! */}
          {isCaptain ? (
            <button
              onClick={() => {
                setNewTeacher({
                  name: '',
                  designation: 'Senior Instructor',
                  collegeName: userProfile.college,
                  department: userProfile.department,
                  regulation: userProfile.regulation || '2022',
                  semester: userProfile.semester || 6,
                  subject: '',
                  phone: '',
                  email: '',
                  room: 'Academic Bldg 2, Room 304',
                  consultingHours: 'Mon & Wed: 11:00 AM - 12:30 PM'
                });
                setShowAddModal(true);
              }}
              className="bg-[#0D9488] hover:bg-teal-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Teacher (CR Scope)</span>
            </button>
          ) : isTeacher ? (
            <button
              onClick={() => setActiveScreen('teacher_setup')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Edit My Profile & Contact</span>
            </button>
          ) : (
            <div className="bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium px-2.5 py-1 rounded-lg self-start sm:self-auto">
              Student Mode: Read-Only Faculty Directory
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative mt-3">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by teacher name, subject, department, or college..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-[#172554] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
          />
        </div>
      </div>

      {/* Teachers Directory List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-[#172554]">
            Faculty Directory ({filteredTeachers.length})
          </h2>
          <span className="text-xs text-slate-500">Tap to call or message</span>
        </div>

        {filteredTeachers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
            <Contact2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-[#172554]">
              {teachers.length === 0 ? 'No teacher contacts yet' : 'No teachers found'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {teachers.length === 0 ? 'Teacher contacts will appear here when available.' : 'Try another search term or filter.'}
            </p>
          </div>
        ) : (
          filteredTeachers.map((tch) => {
            const cleanPhone = tch.phone.replace(/[^0-9+]/g, '');
            const canCaptainManage = isWithinCaptainScope(tch);
            const canTeacherManage = isTeacherOwnContact(tch);

            return (
              <div
                key={tch.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:border-slate-300 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[#172554] text-sm shrink-0">
                      {tch.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-sm sm:text-base text-[#172554]">
                          {tch.name}
                        </h3>
                        {canTeacherManage && (
                          <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200">
                            My Profile
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-[#0D9488] mt-0.5">
                        {tch.designation}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        <span className="font-medium text-slate-700">Course:</span> {tch.subject}
                      </div>
                      {tch.department && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          <span>{tch.department}</span>
                          {tch.collegeName && <span> • {tch.collegeName}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Action Dial & Scoped Manage Buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 flex-wrap">
                    <a
                      href={`tel:${cleanPhone}`}
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                    <a
                      href={`sms:${cleanPhone}`}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200/80 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Send SMS"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>SMS</span>
                    </a>

                    {/* Class Captain Removal Action (scoped to their cohort) */}
                    {isCaptain && canCaptainManage && (
                      <button
                        onClick={() => setContactToArchive(tch)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs transition-colors cursor-pointer"
                        title="Archive contact (Class Captain permission)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Teacher Edit Action (only for their own profile) */}
                    {isTeacher && canTeacherManage && (
                      <button
                        onClick={() => setActiveScreen('teacher_setup')}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                        title="Edit profile"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Details Footer */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-slate-700">{tch.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{tch.email || 'dept.cst@dpi.gov.bd'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{tch.room}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{tch.consultingHours}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Class Captain Add Teacher Modal */}
      {showAddModal && isCaptain && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#0D9488] flex items-center justify-center">
                  <Contact2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-[#172554] text-base">Add Teacher Contact</h3>
                  <p className="text-[10px] text-slate-500">Scoped to your Class Captain authority</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {addFormError && (
              <div className="p-2.5 my-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {addFormError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-[#172554] mb-1">
                  Teacher's Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engr. Md. Rafiqul Islam"
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                />
              </div>

              {/* Institution Autocomplete */}
              <SearchableCollegeSelect
                value={newTeacher.collegeName}
                onChange={(name) => setNewTeacher({ ...newTeacher, collegeName: name })}
                label="College (Auto-set to your institution)"
                required
              />

              {/* Department Autocomplete */}
              <SearchableDepartmentSelect
                value={newTeacher.department}
                onChange={(name) => setNewTeacher({ ...newTeacher, department: name })}
                label="Department / Technology"
                required
              />

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#172554] mb-1">Designation</label>
                  <select
                    value={newTeacher.designation}
                    onChange={(e) => setNewTeacher({ ...newTeacher, designation: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  >
                    <option value="Chief Instructor & Dept Head">Chief Instructor & Dept Head</option>
                    <option value="Senior Instructor">Senior Instructor</option>
                    <option value="Junior Instructor">Junior Instructor</option>
                    <option value="Workshop Super">Workshop Super</option>
                    <option value="Craft Instructor">Craft Instructor</option>
                    <option value="Guest Lecturer">Guest Lecturer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172554] mb-1">Regulation</label>
                  <select
                    value={newTeacher.regulation}
                    onChange={(e) => setNewTeacher({ ...newTeacher, regulation: e.target.value as CatalogRegulation })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  >
                    <option value="2022">Probidhan 2022</option>
                    <option value="2016">Probidhan 2016</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172554] mb-1">Semester</label>
                  <select
                    value={newTeacher.semester}
                    onChange={(e) => setNewTeacher({ ...newTeacher, semester: Number(e.target.value) as SemesterNumber })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>Sem {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <CatalogSubjectSelect
                  technology={newTeacher.department}
                  regulation={newTeacher.regulation}
                  semester={newTeacher.semester}
                  showRegulationSelector={false}
                  selectedName={newTeacher.subject}
                  onSelect={(subj) => {
                    if (subj) {
                      setNewTeacher({ ...newTeacher, subject: `${subj.name} (${subj.code})` });
                    } else {
                      setNewTeacher({ ...newTeacher, subject: '' });
                    }
                  }}
                  label="Primary Course (Central Catalog Suggestion)"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#172554] mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="01712-000000"
                    value={newTeacher.phone}
                    onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172554] mb-1">Office Email</label>
                  <input
                    type="email"
                    placeholder="teacher@dpi.gov.bd"
                    value={newTeacher.email}
                    onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-[#172554] mb-1">Office / Lab Room</label>
                  <input
                    type="text"
                    placeholder="Room 304, Bldg 2"
                    value={newTeacher.room}
                    onChange={(e) => setNewTeacher({ ...newTeacher, room: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#172554] mb-1">Consulting Hours</label>
                  <input
                    type="text"
                    placeholder="Sun & Tue: 10am-12pm"
                    value={newTeacher.consultingHours}
                    onChange={(e) => setNewTeacher({ ...newTeacher, consultingHours: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#0D9488] text-white text-xs font-semibold hover:bg-teal-700 shadow-xs cursor-pointer"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive / Removal Confirmation Modal */}
      {contactToArchive && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-rose-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-[#172554] text-sm">Archive Teacher Contact?</h3>
            </div>

            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <p>
                Are you sure you want to remove <strong>{contactToArchive.name}</strong> from the student contact directory?
              </p>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900">
                <strong>Important:</strong> This performs a soft-deletion for directory cleanup. The teacher's actual account and institutional login privileges will <em>NOT</em> be deleted.
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#172554] mb-1">
                  Reason for Removal <span className="text-rose-500">*</span>
                </label>
                <select
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                >
                  <option value="Faculty reassignment / transfer">Faculty reassignment / transfer</option>
                  <option value="Retired / Left institution">Retired / Left institution</option>
                  <option value="On higher study / training leave">On higher study / training leave</option>
                  <option value="Duplicate or outdated record">Duplicate or outdated record</option>
                  <option value="Other">Other reason...</option>
                </select>
              </div>

              {archiveReason === 'Other' && (
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Specify the reason..."
                    value={customArchiveReason}
                    onChange={(e) => setCustomArchiveReason(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-[#172554]"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={() => setContactToArchive(null)}
                className="flex-1 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                disabled={isArchiving}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isArchiving ? 'Archiving...' : 'Confirm Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
