import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SearchableCollegeSelect } from '../common/SearchableCollegeSelect';
import { SearchableDepartmentSelect } from '../common/SearchableDepartmentSelect';
import { CatalogSubjectSelect } from '../common/CatalogSubjectSelect';
import { SemesterNumber, Shift, Section, TeacherProfile, CatalogRegulation } from '../../types';
import { 
  UserCheck, 
  Phone, 
  Mail, 
  Building2, 
  Cpu, 
  BookOpen, 
  Calendar, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';

export const TeacherProfileSetupScreen: React.FC = () => {
  const { 
    currentTeacherProfile, 
    updateTeacherProfile, 
    setActiveScreen, 
    showToast 
  } = useApp();

  const [name, setName] = useState(currentTeacherProfile?.name || '');
  const [phone, setPhone] = useState(currentTeacherProfile?.phone || '');
  const [email, setEmail] = useState(currentTeacherProfile?.email || '');
  const [college, setCollege] = useState(currentTeacherProfile?.college || 'Dhaka Polytechnic Institute');
  const [department, setDepartment] = useState(currentTeacherProfile?.department || 'Computer Science and Technology (CST)');
  const [regulation, setRegulation] = useState<CatalogRegulation>(currentTeacherProfile?.regulation || '2022');
  const [designation, setDesignation] = useState(currentTeacherProfile?.designation || 'Senior Instructor');
  const [shift, setShift] = useState<Shift | 'Both'>(currentTeacherProfile?.shift || 'Morning');
  const [semestersTaught, setSemestersTaught] = useState<SemesterNumber[]>(
    currentTeacherProfile?.semestersTaught || [5, 6]
  );
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    currentTeacherProfile?.teachingSubjects || []
  );
  
  // Guide Teacher state
  const [isGuideTeacher, setIsGuideTeacher] = useState<boolean>(
    currentTeacherProfile?.isGuideTeacher || false
  );
  const [guideSemester, setGuideSemester] = useState<SemesterNumber>(
    currentTeacherProfile?.guideTeacherCohort?.semester || 6
  );
  const [guideShift, setGuideShift] = useState<Shift>(
    currentTeacherProfile?.guideTeacherCohort?.shift || 'Morning'
  );
  const [guideSection, setGuideSection] = useState<Section>(
    currentTeacherProfile?.guideTeacherCohort?.section || 'A1'
  );

  // Office & Contact info
  const [room, setRoom] = useState('Faculty Lounge, Academic Bldg 2');
  const [consultingHours, setConsultingHours] = useState('Sun & Wed: 11:00 AM - 01:00 PM');

  // Error validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const toggleSemester = (sem: SemesterNumber) => {
    setSemestersTaught(prev => 
      prev.includes(sem) ? prev.filter(s => s !== sem) : [...prev, sem].sort((a, b) => a - b)
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Full name is required.';
    
    // Validate BD phone format: 01XXXXXXXXX or +8801XXXXXXXXX
    const bdPhoneRegex = /^(?:\+?8801|01)[3-9]\d{8}$/;
    const cleanPhone = phone.replace(/[\s-]/g, '');
    if (!cleanPhone) {
      newErrors.phone = 'Phone number is required.';
    } else if (!bdPhoneRegex.test(cleanPhone)) {
      newErrors.phone = 'Enter a valid Bangladesh mobile number (e.g. 01712345678 or +8801819334455).';
    }

    if (!college) newErrors.college = 'College selection is required.';
    if (!department) newErrors.department = 'Department selection is required.';
    if (semestersTaught.length === 0) newErrors.semesters = 'Select at least one semester you teach.';
    if (selectedSubjects.length === 0) newErrors.subjects = 'Select or enter at least one teaching subject.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showToast('⚠️ Please fix the highlighted errors.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedData: Partial<TeacherProfile> = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        college: college.trim(),
        department: department.trim(),
        designation: designation.trim(),
        shift,
        semestersTaught,
        teachingSubjects: selectedSubjects,
        isGuideTeacher,
        guideTeacherCohort: isGuideTeacher ? {
          semester: guideSemester,
          shift: guideShift,
          section: guideSection
        } : undefined,
        isProfileComplete: true
      };

      await updateTeacherProfile(updatedData, {
        room,
        consultingHours
      });

      showToast('Profile setup complete! Welcome to your Teacher Dashboard.');
      setActiveScreen('home');
    } catch (err: any) {
      showToast('Error updating profile: ' + (err.message || 'Server error'));
    } finally {
      setIsSaving(false);
    }
  };

  const isVerified = currentTeacherProfile?.verificationStatus === 'Verified';

  return (
    <div className="space-y-4 pb-12 max-w-xl mx-auto">
      {/* Top Banner */}
      <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-brand-teal flex items-center justify-center font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-text-primary">
                Teacher Profile Setup
              </h1>
            </div>
          </div>

          {/* Verification Status Badge */}
          {isVerified ? (
            <span className="bg-green-50 text-green-700 border border-green-200 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <span>Verified Faculty</span>
            </span>
          ) : (
            <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Pending Admin Review</span>
            </span>
          )}
        </div>

        {!isVerified && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Your profile is registered with <strong>Pending</strong> status. An Academic Administrator will verify your credentials before Class Captain verification privileges activate.
            </span>
          </div>
        )}
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSave} className="space-y-4">
        {/* Section 1: Basic Information */}
        <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <span>Personal & Contact Credentials</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Engr. Md. Rafiqul Islam"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Official Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01712345678 or +8801819334455"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              {errors.phone && <p className="text-[11px] text-rose-500 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Official Email (Optional)
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="faculty@dpi.gov.bd"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Faculty Designation <span className="text-rose-500">*</span>
            </label>
            <select
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="Chief Instructor & Head of Dept">Chief Instructor & Head of Dept</option>
              <option value="Senior Instructor & Guide Teacher">Senior Instructor & Guide Teacher</option>
              <option value="Senior Instructor">Senior Instructor</option>
              <option value="Instructor (Tech)">Instructor (Tech)</option>
              <option value="Junior Instructor">Junior Instructor</option>
              <option value="Workshop Superintendent">Workshop Superintendent</option>
              <option value="Craft Instructor">Craft Instructor</option>
              <option value="Guest Lecturer">Guest Lecturer</option>
            </select>
          </div>
        </div>

        {/* Section 2: Institution & Department Selectors */}
        <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Institutional Assignment</span>
          </h2>

          {/* Searchable College Autocomplete */}
          <SearchableCollegeSelect
            value={college}
            onChange={(name) => setCollege(name)}
            required
            error={errors.college}
          />

          {/* Searchable Department Autocomplete */}
          <SearchableDepartmentSelect
            value={department}
            onChange={(name) => {
              setDepartment(name);
              // Clear subjects on department change so teacher picks new curriculum
              setSelectedSubjects([]);
            }}
            required
            error={errors.department}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Teaching Shift <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                {(['Morning', 'Day', 'Both'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setShift(s)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      shift === s
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Room / Faculty Lab
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="Academic Bldg 2, Room 304"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Consulting & Counseling Hours
            </label>
            <div className="relative">
              <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={consultingHours}
                onChange={(e) => setConsultingHours(e.target.value)}
                placeholder="e.g. Mon & Wed: 11:00 AM - 01:00 PM"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Semesters Taught & Curriculum Subjects */}
        <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
            <BookOpen className="w-4 h-4 text-teal-600" />
            <span>Semesters & Teaching Subjects</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Semesters Taught (1st – 8th) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
              {([1, 2, 3, 4, 5, 6, 7, 8] as SemesterNumber[]).map(sem => {
                const isSelected = semestersTaught.includes(sem);
                return (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => toggleSemester(sem)}
                    className={`py-2 text-xs font-bold rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-teal-500 border-teal-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Sem {sem}
                  </button>
                );
              })}
            </div>
            {errors.semesters && <p className="text-[11px] text-rose-500 mt-1">{errors.semesters}</p>}
          </div>

          <div>
            <CatalogSubjectSelect
              technology={department}
              regulation={regulation}
              onRegulationChange={(reg) => setRegulation(reg)}
              semester={semestersTaught}
              isMulti={true}
              selectedSubjects={selectedSubjects}
              onMultiSelect={(nextSubjects) => setSelectedSubjects(nextSubjects)}
              label="Teaching Subjects (Auto-Suggested from BTEB Central Catalog)"
              required
            />
            {errors.subjects && <p className="text-[11px] text-rose-500 mt-1">{errors.subjects}</p>}
          </div>
        </div>

        {/* Section 4: Guide Teacher Cohort Allocation */}
        <div className="bg-surface rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Guide Teacher Authorization
              </h2>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isGuideTeacher}
                onChange={(e) => setIsGuideTeacher(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>

          {isGuideTeacher ? (
            <div className="space-y-3 bg-green-50/40 p-3 rounded-xl border border-green-100">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-text-primary mb-1">
                    Cohort Semester
                  </label>
                  <select
                    value={guideSemester}
                    onChange={(e) => setGuideSemester(Number(e.target.value) as SemesterNumber)}
                    className="w-full px-2 py-1.5 text-xs bg-surface border border-slate-200 rounded-lg text-text-primary"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <option key={sem} value={sem}>{sem}th Semester</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-primary mb-1">
                    Cohort Shift
                  </label>
                  <select
                    value={guideShift}
                    onChange={(e) => setGuideShift(e.target.value as Shift)}
                    className="w-full px-2 py-1.5 text-xs bg-surface border border-slate-200 rounded-lg text-text-primary"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Day">Day</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-text-primary mb-1">
                    Section
                  </label>
                  <select
                    value={guideSection}
                    onChange={(e) => setGuideSection(e.target.value as Section)}
                    className="w-full px-2 py-1.5 text-xs bg-surface border border-slate-200 rounded-lg text-text-primary"
                  >
                    <option value="A1">Section A1</option>
                    <option value="B1">Section B1</option>
                    <option value="A2">Section A2</option>
                    <option value="B2">Section B2</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Enable this if you are assigned as the primary Guide Teacher for a specific semester, shift, and section.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setActiveScreen('home')}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-surface hover:bg-slate-50 transition-colors"
          >
            Skip for Now
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-2 py-2.5 rounded-xl bg-brand-teal hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-teal-700/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <span>Saving Profile...</span>
            ) : (
              <>
                <span>Complete Profile & Open Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
