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
  Sparkles, 
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
import { Modal } from '../common/Modal';

export const TeachersContactsScreen: React.FC = () => {
  const { 
    teachers, 
    addTeacher, 
    updateTeacherContact,
    archiveTeacherContact,
    accountType, 
    userProfile,
    setActiveScreen,
    showToast 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  // Contact being edited by the admin (null = adding a new contact)
  const [editingContact, setEditingContact] = useState<TeacherContact | null>(null);

  // Archive / Removal confirmation modal state
  const [contactToArchive, setContactToArchive] = useState<TeacherContact | null>(null);
  const [archiveReason, setArchiveReason] = useState('Faculty reassignment / transfer');
  const [customArchiveReason, setCustomArchiveReason] = useState('');
  const [isArchiving, setIsArchiving] = useState(false);


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
  // System Administrator has full access: add / edit / archive ANY contact.
  const isAdmin = accountType === 'system_admin';

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

  const resetNewTeacherForm = () => {
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
  };

  const closeContactModal = () => {
    setShowAddModal(false);
    setEditingContact(null);
    setAddFormError(null);
  };

  // Admin: open the form prefilled with this contact's data for editing
  const openEditContactModal = (tch: TeacherContact) => {
    setNewTeacher({
      name: tch.name,
      designation: tch.designation,
      collegeName: tch.collegeName || (tch as unknown as { college?: string }).college || userProfile.college || 'Dhaka Polytechnic Institute',
      department: tch.department,
      regulation: userProfile.regulation || '2022',
      semester: userProfile.semester || 6,
      subject: tch.subject,
      phone: tch.phone,
      email: tch.email || '',
      room: tch.room,
      consultingHours: tch.consultingHours
    });
    setEditingContact(tch);
    setAddFormError(null);
    setShowAddModal(true);
  };

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

    // Admin editing an existing contact → PUT, not a new contact
    if (editingContact) {
      const res = await updateTeacherContact(editingContact.id, {
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
        closeContactModal();
      } else {
        setAddFormError(res.message);
      }
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
      resetNewTeacherForm();
      closeContactModal();
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


  // Unlocked State: Render Faculty Directory
  return (
    <div className="space-y-4 pb-12">
      {/* Top Header Card with Access & Role Permissions Banner */}
      <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-brand-teal flex items-center justify-center font-bold">
                <Contact2 aria-hidden="true" className="w-4 h-4" />
              </div>
              <h1 className="ios-large-title text-base sm:text-lg font-bold text-text-primary">
                Teachers' Contacts
              </h1>
            </div>
          </div>

          {/* Action Button: Strictly forbidden for students! Admin has full access. */}
          {isAdmin ? (
            <button
              onClick={() => {
                resetNewTeacherForm();
                setEditingContact(null);
                setShowAddModal(true);
              }}
              className="bg-brand-teal hover:bg-teal-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Plus aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Add Teacher</span>
            </button>
          ) : isCaptain ? (
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
                setEditingContact(null);
                setShowAddModal(true);
              }}
              className="bg-brand-teal hover:bg-teal-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Plus aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Add Teacher (CR Scope)</span>
            </button>
          ) : isTeacher ? (
            <button
              onClick={() => setActiveScreen('teacher_setup')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <UserCheck aria-hidden="true" className="w-3.5 h-3.5" />
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
          <Search aria-hidden="true" className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search teachers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-text-primary placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-teal"
          />
        </div>
      </div>

      {/* Teachers Directory List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-text-primary">
            Faculty Directory ({filteredTeachers.length})
          </h2>
        </div>

        {filteredTeachers.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-slate-200 p-8 text-center shadow-xs">
            <Contact2 aria-hidden="true" className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-text-primary">
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
                className="bg-surface rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:border-slate-300 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-text-primary text-sm shrink-0">
                      {tch.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-sm sm:text-base text-text-primary">
                          {tch.name}
                        </h3>
                        {canTeacherManage && (
                          <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200">
                            My Profile
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-brand-teal mt-0.5">
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
                      className="px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border border-green-200/80 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Phone aria-hidden="true" className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                    <a
                      href={`sms:${cleanPhone}`}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-brand-blue border border-blue-200/80 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Send SMS"
                    >
                      <MessageSquare aria-hidden="true" className="w-3.5 h-3.5" />
                      <span>SMS</span>
                    </a>

                    {/* Class Captain Removal Action (scoped to their cohort) */}
                    {isCaptain && canCaptainManage && (
                      <button
                        onClick={() => setContactToArchive(tch)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs transition-colors cursor-pointer"
                        aria-label="Archive contact"
                        title="Archive contact (Class Captain permission)"
                      >
                        <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
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

                    {/* System Administrator: full edit + archive on ANY contact */}
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => openEditContactModal(tch)}
                          className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                          title="Edit contact (Admin)"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setContactToArchive(tch)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs transition-colors cursor-pointer"
                          aria-label="Archive contact"
                          title="Archive contact (Admin)"
                        >
                          <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Details Footer */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <Phone aria-hidden="true" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-slate-700">{tch.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail aria-hidden="true" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{tch.email || 'dept.cst@dpi.gov.bd'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin aria-hidden="true" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{tch.room}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock aria-hidden="true" className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{tch.consultingHours}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Class Captain / Admin Add & Edit Teacher Modal */}
      {showAddModal && (isCaptain || isAdmin) && (
        <Modal
          onClose={closeContactModal}
          labelledBy="contacts-contact-title"
          panelClassName="bg-surface rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
          overlayClassName="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          showCloseButton={false}
        >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-brand-teal flex items-center justify-center">
                  <Contact2 aria-hidden="true" className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="contacts-contact-title" className="font-bold text-text-primary text-base">{editingContact ? 'Edit Teacher Contact' : 'Add Teacher Contact'}</h3>
                  <p className="text-[10px] text-slate-500">{isAdmin ? 'Full admin access — any college & department' : 'Scoped to your Class Captain authority'}</p>
                </div>
              </div>
              <button 
                onClick={closeContactModal}
                className="text-slate-400 hover:text-slate-600 p-1"
               aria-label="Close">
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
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Teacher's Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Engr. Md. Rafiqul Islam"
                  value={newTeacher.name}
                  onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
                />
              </div>

              {/* Institution Autocomplete */}
              <SearchableCollegeSelect
                value={newTeacher.collegeName}
                onChange={(name) => setNewTeacher({ ...newTeacher, collegeName: name })}
                label={isAdmin ? 'College' : 'College (Auto-set to your institution)'}
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
                  <label className="block text-xs font-semibold text-text-primary mb-1">Designation</label>
                  <select
                    value={newTeacher.designation}
                    onChange={(e) => setNewTeacher({ ...newTeacher, designation: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
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
                  <label className="block text-xs font-semibold text-text-primary mb-1">Regulation</label>
                  <select
                    value={newTeacher.regulation}
                    onChange={(e) => setNewTeacher({ ...newTeacher, regulation: e.target.value as CatalogRegulation })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
                  >
                    <option value="2022">Probidhan 2022</option>
                    <option value="2016">Probidhan 2016</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Semester</label>
                  <select
                    value={newTeacher.semester}
                    onChange={(e) => setNewTeacher({ ...newTeacher, semester: Number(e.target.value) as SemesterNumber })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
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
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="01712-000000"
                    value={newTeacher.phone}
                    onChange={(e) => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Office Email</label>
                  <input
                    type="email"
                    placeholder="teacher@dpi.gov.bd"
                    value={newTeacher.email}
                    onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Office / Lab Room</label>
                  <input
                    type="text"
                    placeholder="Room 304, Bldg 2"
                    value={newTeacher.room}
                    onChange={(e) => setNewTeacher({ ...newTeacher, room: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">Consulting Hours</label>
                  <input
                    type="text"
                    placeholder="Sun & Tue: 10am-12pm"
                    value={newTeacher.consultingHours}
                    onChange={(e) => setNewTeacher({ ...newTeacher, consultingHours: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeContactModal}
                  className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-brand-teal text-white text-xs font-semibold hover:bg-teal-700 shadow-xs cursor-pointer"
                >
                  {editingContact ? 'Save Changes' : 'Save Contact'}
                </button>
              </div>
            </form>
        </Modal>
      )}

      {/* Archive / Removal Confirmation Modal */}
      {contactToArchive && (
        <Modal
          onClose={() => setContactToArchive(null)}
          labelledBy="contacts-archive-title"
          panelClassName="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95"
          overlayClassName="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
        >
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-rose-600">
              <AlertTriangle aria-hidden="true" className="w-5 h-5 shrink-0" />
              <h3 id="contacts-archive-title" className="font-bold text-text-primary text-sm">Archive Teacher Contact?</h3>
            </div>

            <div className="mt-3 space-y-2 text-xs text-slate-600">
              <p>
                Are you sure you want to remove <strong>{contactToArchive.name}</strong> from the student contact directory?
              </p>

              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900">
                <strong>Important:</strong> This performs a soft-deletion for directory cleanup. The teacher's actual account and institutional login privileges will <em>NOT</em> be deleted.
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-text-primary mb-1">
                  Reason for Removal <span className="text-rose-500">*</span>
                </label>
                <select
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
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
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-text-primary"
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
        </Modal>
      )}
    </div>
  );
};
