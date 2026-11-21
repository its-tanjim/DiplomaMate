import { apiFetch } from '../services/apiClient';
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  StudentProfile, 
  TeacherProfile,
  TeacherVerificationStatus,
  RoutinePeriod, 
  NoteItem, 
  AssignmentItem, 
  ReminderItem, 
  TeacherContact, 
  ScreenType, 
  AccountType,
  Shift,
  Section,
  ClassAnnouncement,
  NotificationPreferences,
  CaptainApplication,
  JobCircular,
  UploadedRoutineDocument,
  PaymentRecord,
  CaptainVerificationStatus,
  SystemAdminProfile,
  ShiftScheduleConfig,
  RoutineNotificationRecord
} from '../types';
import {
  buildDefaultShiftScheduleConfig,
  recalculateShiftSchedulePeriods,
  resetSinglePeriodToSuggested,
  SHIFT_DEFAULT_START_TIME,
  DEFAULT_PERIOD_DURATION_MINUTES
} from '../data/shiftScheduleUtils';
import { 
  INITIAL_ROUTINE, 
  INITIAL_ANNOUNCEMENTS,
  INITIAL_APPLICATIONS,
  INITIAL_JOBS,
  LEGACY_DEMO_CONTENT_IDS,
  DEFAULT_NOTIFICATION_SETTINGS,
  normalizeCollege,
  normalizeTechnology,
  resolveStrictCollege,
  resolveStrictTechnology
} from '../data/mockData';
import { nativeService } from '../services/nativeService';

interface AppContextType {
  userProfile: StudentProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<StudentProfile>>;
  activeScreen: ScreenType;
  setActiveScreen: (screen: ScreenType) => void;
  isLoggedIn: boolean;
  login: (profile: StudentProfile) => Promise<{ success: boolean; message: string }>;
  authenticateStudent: (
    boardRoll: string,
    regNumber: string,
    role: 'student' | 'class_captain'
  ) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  accountType: AccountType;
  setAccountType: (type: AccountType) => void;
  switchAccountType: (type: AccountType) => void;
  isVerifiedCaptain: boolean;

  // Server-Side Session & System Administrator Authentication
  authToken: string | null;
  systemAdminProfile: SystemAdminProfile | null;
  isServerVerifiedAdmin: boolean;
  isCheckingAdminSession: boolean;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  adminBootstrap: (bootstrapToken: string, name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  verifyServerAdminSession: () => Promise<boolean>;

  // Teacher Authentication & Institutional Faculty State
  currentTeacherProfile: TeacherProfile | null;
  teachersList: TeacherProfile[];
  teacherLogin: (phoneOrEmail: string, pin: string) => Promise<{ success: boolean; message: string; teacher?: TeacherProfile }>;
  teacherRegister: (data: any) => Promise<{ success: boolean; message: string; teacher?: TeacherProfile }>;
  updateTeacherProfile: (profileUpdates: Partial<TeacherProfile>, contactDetails?: { room?: string; consultingHours?: string }) => Promise<{ success: boolean; message: string }>;
  adminVerifyTeacher: (teacherId: string, status: 'Verified' | 'Rejected', adminNotes?: string) => Promise<boolean>;
  adminResetTeacherLockout: (teacherId: string) => Promise<boolean>;
  teacherChangePin: (currentPin: string, newPin: string) => Promise<{ success: boolean; message: string }>;
  
  // Routine
  routine: RoutinePeriod[];
  routineNotifications: RoutineNotificationRecord[];
  addRoutinePeriod: (period: Omit<RoutinePeriod, 'id'>) => Promise<{ success: boolean; message: string }>;
  updateRoutinePeriod: (id: string, updates: Partial<RoutinePeriod>) => Promise<{ success: boolean; message: string }>;
  deleteRoutinePeriod: (id: string) => Promise<{ success: boolean; message: string }>;
  setFullRoutine: (periods: RoutinePeriod[]) => void;
  
  // Routine Documents & OCR
  uploadedRoutines: UploadedRoutineDocument[];
  uploadRoutineDocument: (fileName: string, fileType: 'IMAGE' | 'PDF', dataUrl: string) => UploadedRoutineDocument;
  analyzeRoutineOCR: (
    docId: string,
    directDoc?: UploadedRoutineDocument,
    onProgress?: (stage: string, progress: number) => void
  ) => Promise<{
    success: boolean;
    periods: RoutinePeriod[];
    routineMetadata?: {
      college?: string | null;
      department?: string | null;
      semester?: number | null;
      shift?: Shift | null;
      section?: Section | null;
    };
    warnings?: string[];
    uncertainFields?: string[];
    confidence?: 'high' | 'medium' | 'low';
    rawExtractedText?: string;
    diagnostics?: string[];
    error?: string;
  }>;
  saveConfirmedRoutine: (periods: RoutinePeriod[], docId: string) => Promise<{ success: boolean; message: string }>;
  
  // Notes & Assignments
  notes: NoteItem[];
  addNote: (note: Omit<NoteItem, 'id' | 'uploadedDate'>) => Promise<{ success: boolean; message: string }>;
  assignments: AssignmentItem[];
  addAssignment: (assignment: Omit<AssignmentItem, 'id' | 'status'>) => Promise<{ success: boolean; message: string }>;
  submitAssignment: (
    id: string,
    submissionNote?: string,
    attachment?: { url: string; name: string; type?: string }
  ) => Promise<{ success: boolean; message: string }>;
  refreshAcademicFeed: () => Promise<void>;
  
  // Job Circulars & Notices Navigation State
  jobs: JobCircular[];
  addJobCircular: (job: Omit<JobCircular, 'id' | 'postedAt' | 'postedBy'>) => Promise<{ success: boolean; message: string }>;
  notesInitialTab: 'notices' | 'jobs' | 'assignments' | 'notes';
  setNotesInitialTab: (tab: 'notices' | 'jobs' | 'assignments' | 'notes') => void;
  openNotesSection: (tab: 'notices' | 'jobs' | 'assignments' | 'notes') => void;
  
  // Reminders
  reminders: ReminderItem[];
  addReminder: (reminder: Omit<ReminderItem, 'id' | 'isCompleted'>) => void;
  toggleReminder: (id: string) => void;
  deleteReminder: (id: string) => void;
  
  // Teacher Contact access; legacy payment-based unlock is retained for future use.
  teachers: TeacherContact[];
  addTeacher: (teacher: Omit<TeacherContact, 'id'>) => Promise<{ success: boolean; message: string }>;
  archiveTeacherContact: (contactId: string, reason: string) => Promise<{ success: boolean; message: string }>;
  isTeacherContactUnlocked: boolean;
  isTeacherContactAccessLocked: boolean;
  updateTeacherContactAccessLock: (locked: boolean) => Promise<{ success: boolean; message: string }>;
  unlockTeacherContactsWithPayment: (provider: 'bKash' | 'Nagad' | 'Rocket' | 'Card', transactionId: string) => Promise<{ success: boolean; message: string }>;

  
  // Class Captain Verification Workflow
  applications: CaptainApplication[];
  submitCaptainApplication: (data: Partial<CaptainApplication>) => Promise<boolean>;
  teacherEndorseApplication: (
    appId: string, 
    teacherPin: string, 
    comments?: string, 
    action?: 'approve' | 'reject', 
    teacherId?: string
  ) => Promise<{ success: boolean; message: string }>;
  adminApproveApplication: (appId: string, notes?: string) => Promise<{ success: boolean; message: string }>;
  adminRejectApplication: (appId: string, reason: string) => Promise<boolean>;
  adminRevokeApplication: (appId: string, reason: string) => Promise<boolean>;
  getVerifiedCaptainsCount: (college: string, department: string, semester: number, shift: Shift, section: Section) => number;
  
  // Announcements (for Class Captain)
  announcements: ClassAnnouncement[];
  addAnnouncement: (title: string, content: string, priority: 'Important' | 'Normal') => void;
  
  // Settings
  notifications: NotificationPreferences;
  updateNotifications: (updates: Partial<NotificationPreferences>) => void;
  
  // Quick Filters / State
  selectedShift: Shift;
  setSelectedShift: (shift: Shift) => void;
  selectedSection: Section;
  setSelectedSection: (section: Section) => void;
  resetAllData: () => void;
  
  // Configurable Period & Shift Schedule Management
  shiftSchedules: Record<Shift, ShiftScheduleConfig>;
  getShiftSchedule: (shift: Shift) => ShiftScheduleConfig;
  saveShiftSchedule: (
    config: Partial<ShiftScheduleConfig> & { shift: Shift; forceResetAllManual?: boolean }
  ) => Promise<ShiftScheduleConfig>;
  resetShiftSchedule: (shift: Shift, periodNumber?: number) => Promise<ShiftScheduleConfig>;

  // Toast notifications
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'diplomamate_';
const EMPTY_STUDENT_PROFILE: StudentProfile = {
  id: '',
  name: '',
  email: '',
  college: '',
  department: '',
  boardRoll: '',
  regNumber: '',
  semester: 1,
  section: 'A1',
  shift: 'Morning',
  session: '',
  accountType: 'student',
  captainVerificationStatus: 'NotApplied',
  isTeacherContactUnlocked: false
};

const removeLegacyDemoContent = <T extends { id: string }>(
  records: T[],
  legacyIds: readonly string[]
): T[] => {
  const legacyIdSet = new Set(legacyIds);
  return records.filter(record => !legacyIdSet.has(record.id));
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}is_logged_in`) === 'true';
  });

  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`) || null;
  });

  const [systemAdminProfile, setSystemAdminProfile] = useState<SystemAdminProfile | null>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}system_admin`);
    return saved ? JSON.parse(saved) : null;
  });

  const [isServerVerifiedAdmin, setIsServerVerifiedAdmin] = useState<boolean>(false);
  const [isCheckingAdminSession, setIsCheckingAdminSession] = useState<boolean>(true);

  const [userProfile, setUserProfile] = useState<StudentProfile>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}profile`);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Never allow a localStorage profile to claim system_admin unless verified by server
      return parsed;
    }
    return EMPTY_STUDENT_PROFILE;
  });

  const [activeScreen, setActiveScreen] = useState<ScreenType>(() => {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    if (pathname === '/admin/login') return 'admin_login';
    if (pathname === '/admin' || pathname === '/admin/results-import') return 'admin_portal';
    const logged = localStorage.getItem(`${STORAGE_KEY_PREFIX}is_logged_in`) === 'true';
    return logged ? 'home' : 'welcome';
  });

  // Safe client-side migration helper: never guesses missing college_id, department_id, or semester.
  const sanitizeStoredRoutineList = (rawList: any[]): RoutinePeriod[] => {
    const seedById = new Map<string, RoutinePeriod>(INITIAL_ROUTINE.map(r => [r.id, r]));
    return rawList.map((raw) => {
      // If this is one of the known seed IDs from INITIAL_ROUTINE and lacks college_id, upgrade from INITIAL_ROUTINE
      if (raw && raw.id && seedById.has(raw.id) && !raw.college_id && !raw.college) {
        return { ...seedById.get(raw.id)!, ...raw, ...seedById.get(raw.id)! };
      }
      const colObj = resolveStrictCollege(raw?.college_id || raw?.college || null);
      const deptObj = resolveStrictTechnology(raw?.department_id || raw?.technology_id || raw?.department || null);
      const semNum =
        raw?.semester !== undefined && raw?.semester !== null && raw?.semester !== ''
          ? Number(raw.semester)
          : null;
      const validSem = semNum !== null && Number.isInteger(semNum) && semNum >= 1 && semNum <= 8 ? semNum : null;

      if (!colObj || !deptObj || !validSem) {
        return {
          ...raw,
          college_id: colObj ? colObj.id : null,
          department_id: deptObj ? deptObj.id : null,
          technology_id: deptObj ? deptObj.id : null,
          semester: validSem,
          publication_status: 'needs_admin_review',
          migration_review_reason: 'Missing or ambiguous college_id, department_id, or semester — quarantined for administrator review.'
        } as RoutinePeriod;
      }

      return {
        ...raw,
        college_id: colObj.id,
        college: colObj.name,
        department_id: deptObj.id,
        technology_id: deptObj.id,
        department: deptObj.name,
        semester: validSem,
        publication_status: raw.publication_status || 'published'
      } as RoutinePeriod;
    });
  };

  const [allStoredRoutines, setAllStoredRoutines] = useState<RoutinePeriod[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}routine`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeStoredRoutineList(parsed);
        }
      } catch {
        // ignore parse error
      }
    }
    return INITIAL_ROUTINE;
  });

  const [routineNotifications, setRoutineNotifications] = useState<RoutineNotificationRecord[]>([]);

  const [uploadedRoutines, setUploadedRoutines] = useState<UploadedRoutineDocument[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}uploaded_routines`);
    return saved ? JSON.parse(saved) : [];
  });
  const uploadedRoutinesRef = useRef<UploadedRoutineDocument[]>(uploadedRoutines);
  useEffect(() => {
    uploadedRoutinesRef.current = uploadedRoutines;
  }, [uploadedRoutines]);

  const [notes, setNotes] = useState<NoteItem[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}notes`);
    return saved ? removeLegacyDemoContent(JSON.parse(saved), LEGACY_DEMO_CONTENT_IDS.notes) : [];
  });

  const [assignments, setAssignments] = useState<AssignmentItem[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}assignments`);
    return saved ? removeLegacyDemoContent(JSON.parse(saved), LEGACY_DEMO_CONTENT_IDS.assignments) : [];
  });

  const [jobs, setJobs] = useState<JobCircular[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}jobs`);
    return saved ? JSON.parse(saved) : INITIAL_JOBS;
  });

  const [notesInitialTab, setNotesInitialTab] = useState<'notices' | 'jobs' | 'assignments' | 'notes'>('notices');

  const openNotesSection = (tab: 'notices' | 'jobs' | 'assignments' | 'notes') => {
    setNotesInitialTab(tab);
    setActiveScreen('notes');
  };

  const [reminders, setReminders] = useState<ReminderItem[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}reminders`);
    return saved ? removeLegacyDemoContent(JSON.parse(saved), LEGACY_DEMO_CONTENT_IDS.reminders) : [];
  });

  const [teachers, setTeachers] = useState<TeacherContact[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}teachers`);
    return saved ? removeLegacyDemoContent(JSON.parse(saved), LEGACY_DEMO_CONTENT_IDS.teachers) : [];
  });
  const [isTeacherContactAccessLocked, setIsTeacherContactAccessLocked] = useState(false);

  const [applications, setApplications] = useState<CaptainApplication[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}applications`);
    return saved ? JSON.parse(saved) : INITIAL_APPLICATIONS;
  });

  const [announcements, setAnnouncements] = useState<ClassAnnouncement[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}announcements`);
    return saved
      ? (JSON.parse(saved) as ClassAnnouncement[]).filter(announcement => announcement.id !== 'ann_2')
      : INITIAL_ANNOUNCEMENTS;
  });

  const [notifications, setNotifications] = useState<NotificationPreferences>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}notifications`);
    return saved ? JSON.parse(saved) : DEFAULT_NOTIFICATION_SETTINGS;
  });

  const [teachersList, setTeachersList] = useState<TeacherProfile[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}teachers_list`);
    return saved ? JSON.parse(saved) : [];
  });

  const [currentTeacherProfile, setCurrentTeacherProfile] = useState<TeacherProfile | null>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}current_teacher`);
    return saved ? JSON.parse(saved) : null;
  });

  const [selectedShift, setSelectedShift] = useState<Shift>(userProfile.shift || 'Morning');
  const [selectedSection, setSelectedSection] = useState<Section>(userProfile.section || 'A1');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [shiftSchedules, setShiftSchedules] = useState<Record<Shift, ShiftScheduleConfig>>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}shift_schedules`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          Morning: parsed.Morning || buildDefaultShiftScheduleConfig('Morning', { scopeKey: 'default' }),
          Day: parsed.Day || buildDefaultShiftScheduleConfig('Day', { scopeKey: 'default' })
        };
      } catch {
        // Fallback to defaults
      }
    }
    return {
      Morning: buildDefaultShiftScheduleConfig('Morning', { scopeKey: 'default' }),
      Day: buildDefaultShiftScheduleConfig('Day', { scopeKey: 'default' })
    };
  });

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}shift_schedules`, JSON.stringify(shiftSchedules));
  }, [shiftSchedules]);

  // Fetch verified teachers, contacts, and shift schedule configurations from backend on mount
  useEffect(() => {
    apiFetch('/api/teacher-contacts/access')
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.success || typeof data.locked !== 'boolean') {
          throw new Error(data.error || 'Could not load Teacher Contact access settings.');
        }
        setIsTeacherContactAccessLocked(data.locked);
      })
      .catch(error => {
        console.error('Teacher Contact access settings request failed:', error);
      });

    apiFetch('/api/teachers')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.teachers)) {
          setTeachersList(data.teachers);
        }
      })
      .catch(() => {});

    apiFetch('/api/teacher-contacts')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.contacts)) {
          const serverContacts = removeLegacyDemoContent<TeacherContact>(
            data.contacts,
            LEGACY_DEMO_CONTENT_IDS.teachers
          );
          setTeachers(current => {
            const serverContactIds = new Set(serverContacts.map(contact => contact.id));
            const cachedContacts = removeLegacyDemoContent(current, LEGACY_DEMO_CONTENT_IDS.teachers)
              .filter(contact => !contact.isArchived && !serverContactIds.has(contact.id));
            return [...serverContacts, ...cachedContacts];
          });
        }
      })
      .catch(() => {});

    apiFetch('/api/schedule-config?scopeKey=default')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.schedules) {
          setShiftSchedules(prev => ({
            Morning: data.schedules.Morning || prev.Morning,
            Day: data.schedules.Day || prev.Day
          }));
        }
      })
      .catch(() => {});
  }, []);

  // Ensure student / class_captain has a valid server session token whenever profile or academic group changes
  useEffect(() => {
    if (
      isLoggedIn &&
      (userProfile.accountType === 'student' || userProfile.accountType === 'class_captain')
    ) {
      apiFetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userProfile.id,
          role: userProfile.accountType,
          name: userProfile.name,
          email: userProfile.email,
          college: userProfile.college,
          department: userProfile.department,
          boardRoll: userProfile.boardRoll,
          classRoll: userProfile.boardRoll?.slice(-2) || '01',
          regNumber: userProfile.regNumber,
          semester: userProfile.semester,
          shift: userProfile.shift,
          section: userProfile.section
        })
      })
        .then(async res => ({ ok: res.ok, data: await res.json() }))
        .then(({ ok, data }) => {
          if (ok && data.success && data.sessionToken) {
            setAuthToken(data.sessionToken);
          } else {
            setAuthToken(null);
            setIsLoggedIn(false);
            setCurrentTeacherProfile(null);
            setUserProfile(EMPTY_STUDENT_PROFILE);
            setActiveScreen('welcome');
          }
        })
        .catch(() => {
          setAuthToken(null);
          setIsLoggedIn(false);
          setCurrentTeacherProfile(null);
          setUserProfile(EMPTY_STUDENT_PROFILE);
          setActiveScreen('welcome');
        });
    }
  }, [
    isLoggedIn,
    userProfile.id,
    userProfile.accountType,
    userProfile.college,
    userProfile.department,
    userProfile.semester,
    userProfile.shift,
    userProfile.section
  ]);

  useEffect(() => {
    if (!isLoggedIn || userProfile.accountType !== 'teacher') return;

    const tokenToCheck = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    const invalidateTeacherSession = () => {
      setAuthToken(null);
      setCurrentTeacherProfile(null);
      setUserProfile(EMPTY_STUDENT_PROFILE);
      setIsLoggedIn(false);
      setActiveScreen('welcome');
    };

    if (!tokenToCheck) {
      invalidateTeacherSession();
      return;
    }

    apiFetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${tokenToCheck}` }
    })
      .then(async res => ({ ok: res.ok, data: await res.json() }))
      .then(({ ok, data }) => {
        if (
          !ok ||
          !data.success ||
          !data.authenticated ||
          data.session?.role !== 'teacher' ||
          data.session.userId !== currentTeacherProfile?.id
        ) {
          invalidateTeacherSession();
        }
      })
      .catch(invalidateTeacherSession);
  }, [isLoggedIn, userProfile.accountType, authToken, currentTeacherProfile?.id]);

  const refreshAcademicFeed = async () => {
    try {
      const headers: Record<string, string> = {};
      const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
      if (tokenToUse) {
        headers.Authorization = `Bearer ${tokenToUse}`;
      }

      const includeDrafts = userProfile.accountType === 'class_captain' || userProfile.accountType === 'teacher';
      const routineQuery = new URLSearchParams({
        shift: selectedShift || userProfile.shift || 'Morning',
        section: selectedSection || userProfile.section || 'A1',
        includeDrafts: includeDrafts ? 'true' : 'false'
      });

      const [notesRes, asgRes, routinesRes, notifRes] = await Promise.all([
        apiFetch('/api/notes', { headers }),
        apiFetch('/api/assignments', { headers }),
        tokenToUse ? apiFetch(`/api/routines?${routineQuery.toString()}`, { headers }) : Promise.resolve(null),
        tokenToUse ? apiFetch('/api/routines/notifications', { headers }) : Promise.resolve(null)
      ]);

      if (notesRes.ok) {
        const notesData = await notesRes.json();
        if (notesData.success && Array.isArray(notesData.notes)) {
          setNotes(notesData.notes);
        }
      }

      if (asgRes.ok) {
        const asgData = await asgRes.json();
        if (asgData.success && Array.isArray(asgData.assignments)) {
          setAssignments(asgData.assignments);
        }
      }

      if (routinesRes && routinesRes.ok) {
        const routinesData = await routinesRes.json();
        if (routinesData.success && Array.isArray(routinesData.routines)) {
          setAllStoredRoutines(routinesData.routines);
        }
      }

      if (notifRes && notifRes.ok) {
        const notifData = await notifRes.json();
        if (notifData.success && Array.isArray(notifData.notifications)) {
          setRoutineNotifications(notifData.notifications);
        }
      }
    } catch {
      // Fallback to local group-filtered state if offline
    }
  };

  useEffect(() => {
    refreshAcademicFeed();
  }, [
    authToken,
    userProfile.id,
    userProfile.accountType,
    userProfile.college,
    userProfile.department,
    userProfile.semester,
    userProfile.shift,
    userProfile.section,
    selectedShift,
    selectedSection
  ]);


  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}profile`, JSON.stringify(userProfile));
    setSelectedShift(userProfile.shift);
    setSelectedSection(userProfile.section);
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}is_logged_in`, String(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}teachers_list`, JSON.stringify(teachersList));
  }, [teachersList]);

  useEffect(() => {
    if (currentTeacherProfile) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}current_teacher`, JSON.stringify(currentTeacherProfile));
    } else {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}current_teacher`);
    }
  }, [currentTeacherProfile]);

  useEffect(() => {
    if (authToken) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}auth_token`, authToken);
    } else {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}auth_token`);
    }
  }, [authToken]);

  useEffect(() => {
    if (systemAdminProfile) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}system_admin`, JSON.stringify(systemAdminProfile));
    } else {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}system_admin`);
    }
  }, [systemAdminProfile]);

  const verifyServerAdminSession = async (): Promise<boolean> => {
    const tokenToCheck = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    if (!tokenToCheck) {
      setIsServerVerifiedAdmin(false);
      setIsCheckingAdminSession(false);
      if (userProfile.accountType === 'system_admin') {
        setUserProfile(EMPTY_STUDENT_PROFILE);
        setSystemAdminProfile(null);
      }
      return false;
    }

    setIsCheckingAdminSession(true);
    try {
      const res = await apiFetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${tokenToCheck}` }
      });
      const data = await res.json();
      if (res.ok && data.success && data.authenticated && data.session?.role === 'system_admin') {
        setIsServerVerifiedAdmin(true);
        setIsCheckingAdminSession(false);
        return true;
      } else {
        setIsServerVerifiedAdmin(false);
        setIsCheckingAdminSession(false);
        // If local profile claimed system_admin but server rejected it, strip privilege immediately
        if (userProfile.accountType === 'system_admin') {
          setSystemAdminProfile(null);
          setUserProfile(EMPTY_STUDENT_PROFILE);
        }
        return false;
      }
    } catch {
      setIsServerVerifiedAdmin(false);
      setIsCheckingAdminSession(false);
      return false;
    }
  };

  useEffect(() => {
    verifyServerAdminSession();
  }, [authToken]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}routine`, JSON.stringify(allStoredRoutines));
  }, [allStoredRoutines]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}uploaded_routines`, JSON.stringify(uploadedRoutines));
  }, [uploadedRoutines]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}notes`, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}assignments`, JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}jobs`, JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}reminders`, JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}teachers`, JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}applications`, JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}announcements`, JSON.stringify(announcements));
  }, [announcements]);

  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}notifications`, JSON.stringify(notifications));
  }, [notifications]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const isVerifiedCaptain = 
    userProfile.accountType === 'class_captain' && 
    userProfile.captainVerificationStatus === 'Approved';

  const authenticateStudent = async (
    boardRoll: string,
    regNumber: string,
    role: 'student' | 'class_captain'
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiFetch('/api/students/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardRoll, regNumber, role })
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.account || !data.sessionToken || !data.session) {
        return { success: false, message: data.error || 'Student authentication failed.' };
      }

      const account = data.account;
      const savedProfileRaw = localStorage.getItem(`${STORAGE_KEY_PREFIX}profile`);
      const savedProfile: StudentProfile | null = savedProfileRaw ? JSON.parse(savedProfileRaw) : null;
      const sameAccount = savedProfile?.id === account.id;
      const authenticatedProfile: StudentProfile = {
        id: account.id,
        name: account.name,
        email: account.email || '',
        college: account.college,
        department: account.department,
        boardRoll: account.boardRoll,
        regNumber: account.regNumber,
        semester: Number(account.semester) as StudentProfile['semester'],
        section: account.section,
        shift: account.shift,
        session: sameAccount && savedProfile ? savedProfile.session : '',
        accountType: data.session.role,
        captainVerificationStatus: account.captainVerificationStatus,
        isTeacherContactUnlocked: sameAccount && Boolean(savedProfile?.isTeacherContactUnlocked),
        paymentRecord: sameAccount && savedProfile ? savedProfile.paymentRecord : undefined,
        phone: account.phone || ''
      };

      setIsServerVerifiedAdmin(false);
      setSystemAdminProfile(null);
      setAuthToken(data.sessionToken);
      setUserProfile(authenticatedProfile);
      setSelectedShift(authenticatedProfile.shift);
      setSelectedSection(authenticatedProfile.section);
      setIsLoggedIn(true);
      setActiveScreen('home');
      showToast(`Welcome, ${authenticatedProfile.name}!`);
      return { success: true, message: 'Signed in successfully.' };
    } catch {
      return { success: false, message: 'Could not connect to the student authentication server.' };
    }
  };

  const login = (profile: StudentProfile): Promise<{ success: boolean; message: string }> => {
    const role =
      profile.accountType === 'class_captain' && profile.captainVerificationStatus === 'Approved'
        ? 'class_captain'
        : 'student';
    return authenticateStudent(profile.boardRoll, profile.regNumber, role);
  };

  const logout = () => {
    const tokenToInvalidate = authToken;
    if (tokenToInvalidate) {
      apiFetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenToInvalidate}` }
      }).catch(() => {});
    }
    setAuthToken(null);
    setIsServerVerifiedAdmin(false);
    setSystemAdminProfile(null);
    setIsLoggedIn(false);
    setCurrentTeacherProfile(null);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}current_teacher`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}auth_token`);
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}system_admin`);
    setActiveScreen('welcome');
    showToast('Signed out of DiplomaMate.');
  };

  const setAccountType = (type: AccountType) => {
    if (type === 'system_admin' || type === 'teacher') {
      showToast('Privileged roles require authentication with the corresponding account.');
      return;
    }

    if (type === 'class_captain' && userProfile.captainVerificationStatus !== 'Approved') {
      showToast('⚠️ Class Captain account requires verified teacher & admin approval.');
      setActiveScreen('captain_verification');
      return;
    }

    setUserProfile(prev => ({
      ...prev,
      accountType: type
    }));
    showToast(`Account mode set to ${type === 'class_captain' ? 'Class Captain (CR)' : 'Student'}`);
  };

  const switchAccountType = (type: AccountType) => {
    showToast(`Account switching is disabled for security. Sign out and sign in with your ${type} credentials.`);
  };

  // SYSTEM ADMINISTRATOR AUTHENTICATION & BOOTSTRAP
  const applyAuthenticatedSystemAdmin = (admin: SystemAdminProfile, sessionToken: string) => {
    setAuthToken(sessionToken);
    setSystemAdminProfile(admin);
    setIsServerVerifiedAdmin(true);
    setIsCheckingAdminSession(false);
    setCurrentTeacherProfile(null);

    const adminProfileView: StudentProfile = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      college: 'Bangladesh Technical Education Board (BTEB)',
      department: 'Central System Administration',
      boardRoll: 'SYS-ADMIN',
      regNumber: 'ADMIN-AUTH',
      semester: 6,
      section: 'A1',
      shift: 'Morning',
      session: 'System Authority',
      accountType: 'system_admin',
      captainVerificationStatus: 'NotApplied',
      isTeacherContactUnlocked: true
    };

    setUserProfile(adminProfileView);
    setIsLoggedIn(true);
    setActiveScreen('admin_portal');
    showToast(`Authenticated as System Administrator (${admin.email})`);
  };

  const adminLogin = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.sessionToken || !data.admin) {
        return { success: false, message: data.error || 'System Administrator authentication failed.' };
      }

      applyAuthenticatedSystemAdmin(data.admin, data.sessionToken);
      return { success: true, message: data.message || 'Authenticated as System Administrator.' };
        } catch (error) {
      console.error('Admin authentication error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Could not connect to administrator authentication server.'
      };
    }
  };

  const adminBootstrap = async (
    bootstrapToken: string,
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiFetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bootstrapToken, name, email, password })
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.sessionToken || !data.admin) {
        return { success: false, message: data.error || 'Administrator provisioning failed.' };
      }

      applyAuthenticatedSystemAdmin(data.admin, data.sessionToken);
      return { success: true, message: data.message || 'First System Administrator provisioned and signed in.' };
    } catch {
      return { success: false, message: 'Could not connect to administrator provisioning service.' };
    }
  };

  // TEACHER AUTHENTICATION & MANAGEMENT
  const teacherLogin = async (
    phoneOrEmail: string, 
    pin: string
  ): Promise<{ success: boolean; message: string; teacher?: TeacherProfile }> => {
    try {
      const response = await apiFetch('/api/teachers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneOrEmail, pin })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, message: data.error || 'Authentication failed' };
      }

      const teacher: TeacherProfile = {
        ...data.teacher,
        accountType: 'teacher'
      };

      setIsServerVerifiedAdmin(false);
      setSystemAdminProfile(null);
      if (data.sessionToken) {
        setAuthToken(data.sessionToken);
      }

      setCurrentTeacherProfile(teacher);
      localStorage.setItem(`${STORAGE_KEY_PREFIX}current_teacher`, JSON.stringify(teacher));
      
      const teacherStudentView: StudentProfile = {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        college: teacher.college,
        department: teacher.department,
        boardRoll: 'FACULTY',
        regNumber: teacher.phone,
        semester: teacher.semestersTaught[0] || 6,
        section: (teacher.sectionsTaught?.[0] || 'A1') as Section,
        shift: teacher.shift === 'Both' ? 'Morning' : teacher.shift,
        session: 'Faculty Staff',
        accountType: 'teacher',
        captainVerificationStatus: 'NotApplied',
        isTeacherContactUnlocked: true,
        phone: teacher.phone,
        designation: teacher.designation,
        teachingSubjects: teacher.teachingSubjects,
        semestersTaught: teacher.semestersTaught,
        teacherVerificationStatus: teacher.verificationStatus,
        hasPin: true
      };
      setUserProfile(teacherStudentView);
      setSelectedShift(teacher.shift === 'Both' ? 'Morning' : teacher.shift);
      setSelectedSection((teacher.sectionsTaught?.[0] || 'A1') as Section);
      setIsLoggedIn(true);
      setActiveScreen('home');
      showToast(`Welcome, ${teacher.name}!`);
      return { success: true, message: 'Logged in successfully', teacher };
    } catch (e) {
      return { success: false, message: 'Could not connect to faculty authentication server.' };
    }
  };

  const teacherRegister = async (regData: any): Promise<{ success: boolean; message: string; teacher?: TeacherProfile }> => {
    try {
      const response = await apiFetch('/api/teachers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regData)
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, message: data.error || 'Registration failed' };
      }

      const teacher: TeacherProfile = {
        ...data.teacher,
        accountType: 'teacher'
      };

      setTeachersList(prev => [...prev, teacher]);
      showToast('Registration submitted! Your faculty account is Pending admin approval.');
      return { success: true, message: data.message, teacher };
    } catch (e) {
      return { success: false, message: 'Could not connect to registration server.' };
    }
  };

  const updateTeacherProfile = async (
    profileUpdates: Partial<TeacherProfile>,
    contactDetails?: { room?: string; consultingHours?: string }
  ): Promise<{ success: boolean; message: string }> => {
    if (!currentTeacherProfile) {
      return { success: false, message: 'No active teacher session.' };
    }

    const mergedTeacher: TeacherProfile = {
      ...currentTeacherProfile,
      ...profileUpdates,
      isProfileComplete: true
    };

    setCurrentTeacherProfile(mergedTeacher);
    localStorage.setItem(`${STORAGE_KEY_PREFIX}current_teacher`, JSON.stringify(mergedTeacher));

    // Update userProfile wrapper
    setUserProfile(prev => ({
      ...prev,
      name: mergedTeacher.name,
      college: mergedTeacher.college,
      department: mergedTeacher.department,
      phone: mergedTeacher.phone,
      email: mergedTeacher.email,
      designation: mergedTeacher.designation,
      teachingSubjects: mergedTeacher.teachingSubjects,
      semestersTaught: mergedTeacher.semestersTaught,
      shift: mergedTeacher.shift === 'Both' ? 'Morning' : mergedTeacher.shift
    }));

    // Sync teacher profile with server-side teacher store
    try {
      if (authToken) {
        await apiFetch('/api/teachers/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify(profileUpdates)
        });
      }
    } catch (e) {
      console.warn('Teacher server profile sync error:', e);
    }

    // Sync or create corresponding contact in Faculty Directory to prevent duplication
    try {
      const contactPayload = {
        teacherId: mergedTeacher.id,
        name: mergedTeacher.name,
        designation: mergedTeacher.designation,
        college: mergedTeacher.college,
        department: mergedTeacher.department,
        subject: (mergedTeacher.teachingSubjects && mergedTeacher.teachingSubjects[0]) || 'Core Department Subject',
        teachingSubjects: mergedTeacher.teachingSubjects,
        semestersTaught: mergedTeacher.semestersTaught,
        phone: mergedTeacher.phone,
        email: mergedTeacher.email,
        room: contactDetails?.room || 'Academic Bldg 2',
        consultingHours: contactDetails?.consultingHours || 'Mon & Wed: 11:00 AM - 01:00 PM'
      };

      const res = await apiFetch('/api/teacher-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterRole: 'teacher',
          requesterId: mergedTeacher.id,
          requesterName: mergedTeacher.name,
          requesterCollege: mergedTeacher.college,
          requesterDepartment: mergedTeacher.department,
          contact: contactPayload
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.contact) {
        setTeachers(prev => {
          const exists = prev.some(t => t.id === data.contact.id || (t.teacherId && t.teacherId === mergedTeacher.id));
          if (exists) {
            return prev.map(t => (t.id === data.contact.id || t.teacherId === mergedTeacher.id) ? { ...t, ...data.contact } : t);
          }
          return [...prev, data.contact];
        });
      }
    } catch (e) {
      console.warn('Sync contact error:', e);
    }

    return { success: true, message: 'Teacher profile updated successfully.' };
  };

  const adminVerifyTeacher = async (teacherId: string, status: 'Verified' | 'Rejected', adminNotes?: string): Promise<boolean> => {
    try {
      const response = await apiFetch('/api/teachers/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ teacherId, status, adminNotes })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        showToast(data.error || 'Failed to update teacher verification');
        return false;
      }

      setTeachersList(prev => prev.map(t => t.id === teacherId ? { ...t, verificationStatus: status, adminNotes } : t));
      if (currentTeacherProfile?.id === teacherId) {
        setCurrentTeacherProfile(prev => prev ? { ...prev, verificationStatus: status, adminNotes } : null);
        setUserProfile(prev => ({ ...prev, teacherVerificationStatus: status }));
      }

      showToast(`Teacher status updated to "${status}".`);
      return true;
    } catch (e) {
      showToast('Error communicating with verification service');
      return false;
    }
  };

  const adminResetTeacherLockout = async (teacherId: string): Promise<boolean> => {
    try {
      const response = await apiFetch('/api/teachers/reset-lockout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ teacherId })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        showToast(data.error || 'Failed to reset lockout');
        return false;
      }
      setTeachersList(prev => prev.map(t => t.id === teacherId ? { ...t, failedPinAttempts: 0, pinLockoutUntil: null } : t));
      showToast('Teacher PIN lockout has been reset.');
      return true;
    } catch (e) {
      showToast('Error communicating with server');
      return false;
    }
  };

  const teacherChangePin = async (currentPin: string, newPin: string): Promise<{ success: boolean; message: string }> => {
    if (!currentTeacherProfile) return { success: false, message: 'No teacher signed in.' };
    try {
      const response = await apiFetch('/api/teachers/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: currentTeacherProfile.id, currentPin, newPin })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, message: data.error || 'Could not change PIN.' };
      }
      showToast('Teacher Security PIN updated successfully.');
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: 'Server communication error.' };
    }
  };

  // 1. CLASS CAPTAIN VERIFICATION & GROUP LIMIT ENFORCEMENT
  const getVerifiedCaptainsCount = (
    college: string, 
    department: string, 
    semester: number, 
    shift: Shift, 
    section: Section
  ): number => {
    const colId = normalizeCollege(college).id;
    const deptId = normalizeTechnology(department).id;
    return applications.filter(app => 
      app.status === 'Approved' &&
      normalizeCollege(app.college).id === colId &&
      normalizeTechnology(app.department).id === deptId &&
      app.semester === semester &&
      app.shift === shift &&
      app.section === section
    ).length;
  };

  const submitCaptainApplication = async (data: Partial<CaptainApplication>): Promise<boolean> => {
    // Check if already applied
    const existing = applications.find(a => a.studentId === userProfile.id && a.status === 'Pending');
    if (existing) {
      showToast('You already have a verification application pending review.');
      return false;
    }

    const newApp: CaptainApplication = {
      id: `app_${Date.now()}`,
      studentId: userProfile.id,
      studentName: userProfile.name,
      college: data.college || userProfile.college,
      department: data.department || userProfile.department,
      semester: data.semester || userProfile.semester,
      shift: data.shift || userProfile.shift,
      section: data.section || userProfile.section,
      boardRoll: data.boardRoll || userProfile.boardRoll,
      regNumber: data.regNumber || userProfile.regNumber,
      phone: data.phone || userProfile.phone || '+880 1700-000000',
      session: data.session || userProfile.session,
      status: 'Pending',
      appliedAt: `${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      // Direct approval requests attach no form — leave these empty instead
      // of pointing at a sample PDF that was never uploaded.
      verificationFormUrl: data.verificationFormUrl || '',
      verificationFormName: data.verificationFormName || ''
    };

    setApplications(prev => [newApp, ...prev]);
    setUserProfile(prev => ({
      ...prev,
      captainVerificationStatus: 'Pending'
    }));
    showToast('Approval request sent to your Guide Teacher and Admin.');
    return true;
  };

  const teacherEndorseApplication = async (
    appId: string, 
    teacherPin: string, 
    comments?: string,
    action: 'approve' | 'reject' = 'approve',
    teacherId?: string
  ): Promise<{ success: boolean; message: string }> => {
    const targetApp = applications.find(a => a.id === appId);
    if (!targetApp) return { success: false, message: 'Application not found.' };

    try {
      const response = await apiFetch('/api/verification/teacher-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          applicationId: appId, 
          teacherId: teacherId || currentTeacherProfile?.id,
          teacherPin, 
          comments,
          action,
          applicantCohort: {
            college: targetApp.college,
            department: targetApp.department,
            semester: targetApp.semester,
            shift: targetApp.shift,
            section: targetApp.section
          }
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return { success: false, message: data.error || 'Teacher authorization failed.' };
      }

      if (action === 'reject') {
        setApplications(prev => prev.map(a => {
          if (a.id === appId) {
            return {
              ...a,
              status: 'Rejected',
              rejectionReason: comments || 'Rejected by Guide Teacher.'
            };
          }
          return a;
        }));
        showToast('Application marked as Rejected by Teacher.');
        return { success: true, message: data.message };
      }

      // Check quota: max 2 captains per section
      const count = getVerifiedCaptainsCount(targetApp.college, targetApp.department, targetApp.semester, targetApp.shift, targetApp.section);
      if (count >= 2 && targetApp.status !== 'Approved') {
        return { 
          success: false, 
          message: `Quota Reached: Section ${targetApp.section} (${targetApp.shift} shift) already has 2 verified Class Captains.` 
        };
      }

      setApplications(prev => prev.map(a => {
        if (a.id === appId) {
          return {
            ...a,
            status: 'Approved',
            teacherEndorsement: data.endorsement
          };
        }
        return a;
      }));

      // If applicant is currently logged in, update their account
      if (userProfile.id === targetApp.studentId) {
        setUserProfile(prev => ({
          ...prev,
          accountType: 'class_captain',
          captainVerificationStatus: 'Approved'
        }));
      }

      showToast(`Verified & endorsed by ${data.endorsement.teacherName}`);
      return { success: true, message: data.message };
    } catch (e) {
      return { success: false, message: 'Could not contact teacher verification service.' };
    }
  };

  const adminApproveApplication = async (
    appId: string, 
    notes?: string
  ): Promise<{ success: boolean; message: string }> => {
    const target = applications.find(a => a.id === appId);
    if (!target) return { success: false, message: 'Application not found.' };

    // Strictly enforce limit of no more than two verified captains per section group
    const currentCount = getVerifiedCaptainsCount(
      target.college,
      target.department,
      target.semester,
      target.shift,
      target.section
    );

    if (currentCount >= 2 && target.status !== 'Approved') {
      const msg = `Quota Exceeded: Section ${target.section} (${target.shift} shift) already has the maximum of 2 verified Class Captains.`;
      showToast(msg);
      return { success: false, message: msg };
    }

    // Verify server-side system_admin authorization before approving captain
    const res = await apiFetch('/api/admin/captains/decision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify({ applicationId: appId, decision: 'approve', notes })
    });
    const decisionData = await res.json();
    if (!res.ok || !decisionData.success) {
      const errMsg = decisionData.error || 'Forbidden: System Administrator authorization required.';
      showToast(errMsg);
      return { success: false, message: errMsg };
    }

    const now = new Date();
    const decidedAt = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    setApplications(prev => prev.map(a => {
      if (a.id === appId) {
        return {
          ...a,
          status: 'Approved',
          adminDecision: decisionData.adminDecision || {
            decidedBy: 'System Administrator',
            decidedAt,
            notes: notes || 'Verified with Guide Teacher signature & departmental record.'
          }
        };
      }
      return a;
    }));

    // If current active user was approved, update role
    if (userProfile.id === target.studentId) {
      setUserProfile(prev => ({
        ...prev,
        accountType: 'class_captain',
        captainVerificationStatus: 'Approved'
      }));
    }

    showToast(`Approved ${target.studentName} as official Class Captain.`);
    return { success: true, message: 'Class Captain approved successfully.' };
  };

  const adminRejectApplication = async (appId: string, reason: string): Promise<boolean> => {
    const res = await apiFetch('/api/admin/captains/decision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify({ applicationId: appId, decision: 'reject', notes: reason })
    });
    const decisionData = await res.json();
    if (!res.ok || !decisionData.success) {
      showToast(decisionData.error || 'Forbidden: System Administrator authorization required.');
      return false;
    }

    const now = new Date();
    const decidedAt = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    setApplications(prev => prev.map(a => {
      if (a.id === appId) {
        return {
          ...a,
          status: 'Rejected',
          rejectionReason: reason,
          adminDecision: decisionData.adminDecision || {
            decidedBy: 'System Administrator',
            decidedAt,
            notes: reason
          }
        };
      }
      return a;
    }));

    const target = applications.find(a => a.id === appId);
    if (target && userProfile.id === target.studentId) {
      setUserProfile(prev => ({
        ...prev,
        captainVerificationStatus: 'Rejected',
        accountType: 'student'
      }));
    }

    showToast('Application marked as Rejected.');
    return true;
  };

  const adminRevokeApplication = async (appId: string, reason: string): Promise<boolean> => {
    const target = applications.find(a => a.id === appId);
    if (!target) return false;

    const res = await apiFetch('/api/admin/captains/decision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
      },
      body: JSON.stringify({ applicationId: appId, decision: 'revoke', notes: reason })
    });
    const decisionData = await res.json();
    if (!res.ok || !decisionData.success) {
      showToast(decisionData.error || 'Forbidden: System Administrator authorization required.');
      return false;
    }

    setApplications(prev => prev.map(a => {
      if (a.id === appId) {
        return {
          ...a,
          status: 'Rejected',
          rejectionReason: `Approval Revoked: ${reason}`
        };
      }
      return a;
    }));

    if (userProfile.id === target.studentId) {
      setUserProfile(prev => ({
        ...prev,
        accountType: 'student',
        captainVerificationStatus: 'Rejected'
      }));
    }

    showToast(`Revoked Class Captain status for ${target.studentName}.`);
    return true;
  };

  // 2. PREMIUM TEACHER'S CONTACT: BDT 10 ONE-TIME PAYMENT & LIFETIME ACCESS
  const unlockTeacherContactsWithPayment = async (
    provider: 'bKash' | 'Nagad' | 'Rocket' | 'Card', 
    transactionId: string
  ): Promise<{ success: boolean; message: string }> => {
    if (userProfile.isTeacherContactUnlocked) {
      return { success: true, message: 'You already possess verified lifetime access to Teacher Contacts.' };
    }

    try {
      const response = await apiFetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: userProfile.id,
          rollNumber: userProfile.boardRoll,
          provider,
          transactionId,
          amount: 10
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return { success: false, message: data.error || 'Payment verification failed.' };
      }

      // Unlock permanently
      setUserProfile(prev => ({
        ...prev,
        isTeacherContactUnlocked: true,
        paymentRecord: data.paymentRecord
      }));

      showToast('🎉 Lifetime Access Unlocked! Teacher Contacts are now permanently available.');
      return { success: true, message: 'Payment verified and lifetime entitlement activated.' };
    } catch (e) {
      console.error('Payment verification request failed:', e);
      return { success: false, message: 'Could not communicate with payment verification server.' };
    }
  };

  const updateTeacherContactAccessLock = async (
    locked: boolean
  ): Promise<{ success: boolean; message: string }> => {
    const token = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    if (!token) {
      return { success: false, message: 'A verified administrator session is required.' };
    }

    try {
      const response = await apiFetch('/api/admin/settings/teacher-contact-access', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ locked })
      });
      const data = await response.json();
      if (!response.ok || !data.success || typeof data.locked !== 'boolean') {
        return { success: false, message: data.error || 'Could not update Teacher Contact access.' };
      }

      setIsTeacherContactAccessLocked(data.locked);
      return { success: true, message: data.message || 'Teacher Contact access updated.' };
    } catch (error) {
      console.error('Teacher Contact access update request failed:', error);
      return { success: false, message: 'Could not connect to the access settings service.' };
    }
  };

  // 3. CLASS ROUTINE & OCR (STRICT ACADEMIC GROUP ISOLATION)
  const activeUserCollegeObj = resolveStrictCollege(userProfile.college);
  const activeUserDeptObj = resolveStrictTechnology(userProfile.department);
  const activeUserSemester = Number(userProfile.semester);

  // Strict academic-group filter: Students and Captains only see routines matching their exact
  // college_id, department_id, and semester (never falling back to a global unfiltered routine list).
  const routine: RoutinePeriod[] = allStoredRoutines.filter((r) => {
    if (!activeUserCollegeObj || !activeUserDeptObj || !Number.isFinite(activeUserSemester)) {
      return false;
    }
    if (r.publication_status === 'needs_admin_review' || r.publication_status === 'archived') {
      return false;
    }
    if (
      r.publication_status === 'draft' &&
      !(userProfile.accountType === 'class_captain' || userProfile.accountType === 'teacher')
    ) {
      return false;
    }
    const rColId = r.college_id || resolveStrictCollege(r.college || null)?.id || null;
    const rDeptId =
      r.department_id ||
      r.technology_id ||
      resolveStrictTechnology(r.department || null)?.id ||
      null;
    const rSem = r.semester !== undefined && r.semester !== null ? Number(r.semester) : null;

    if (!rColId || !rDeptId || !rSem) {
      return false;
    }

    return (
      rColId === activeUserCollegeObj.id &&
      rDeptId === activeUserDeptObj.id &&
      rSem === activeUserSemester
    );
  });

  const addRoutinePeriod = async (
    period: Omit<RoutinePeriod, 'id'>
  ): Promise<{ success: boolean; message: string }> => {
    const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    const targetCollege = period.college_id || period.college || userProfile.college;
    const targetDept = period.department_id || period.technology_id || period.department || userProfile.department;
    const targetSemester = period.semester ?? userProfile.semester;

    try {
      const res = await apiFetch('/api/routines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {})
        },
        body: JSON.stringify({
          ...period,
          college_id: targetCollege,
          department_id: targetDept,
          semester: targetSemester,
          shift: period.shift || selectedShift || userProfile.shift,
          section: period.section || selectedSection || userProfile.section,
          publication_status: period.publication_status || 'published'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Failed to publish routine period.';
        showToast(errMsg);
        return { success: false, message: errMsg };
      }

      if (data.routine) {
        setAllStoredRoutines(prev => [...prev.filter(p => p.id !== data.routine.id), data.routine]);
      }
      if (data.notification) {
        setRoutineNotifications(prev => [data.notification, ...prev]);
      }
      showToast(data.message || 'Routine period published!');
      return { success: true, message: data.message || 'Routine period published!' };
    } catch {
      const colObj = resolveStrictCollege(targetCollege);
      const deptObj = resolveStrictTechnology(targetDept);
      if (!colObj || !deptObj || !targetSemester) {
        const msg = 'Cannot publish routine: valid college, department, and semester are required.';
        showToast(msg);
        return { success: false, message: msg };
      }
      const newPeriod: RoutinePeriod = {
        ...period,
        id: `r_${Date.now()}`,
        college_id: colObj.id,
        college: colObj.name,
        department_id: deptObj.id,
        technology_id: deptObj.id,
        department: deptObj.name,
        semester: targetSemester,
        created_by: userProfile.id,
        created_by_name: userProfile.name,
        created_by_role: userProfile.accountType,
        publication_status: period.publication_status || 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setAllStoredRoutines(prev => [...prev, newPeriod]);
      showToast('Routine period added!');
      return { success: true, message: 'Routine period added.' };
    }
  };

  const updateRoutinePeriod = async (
    id: string,
    updates: Partial<RoutinePeriod>
  ): Promise<{ success: boolean; message: string }> => {
    const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    try {
      const res = await apiFetch(`/api/routines/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {})
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Failed to update routine period.';
        showToast(errMsg);
        return { success: false, message: errMsg };
      }
      if (data.routine) {
        setAllStoredRoutines(prev => prev.map(r => (r.id === id ? data.routine : r)));
      }
      showToast(data.message || 'Routine period updated!');
      return { success: true, message: data.message || 'Routine period updated.' };
    } catch {
      setAllStoredRoutines(prev => prev.map(r => (r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r)));
      showToast('Routine period updated.');
      return { success: true, message: 'Routine period updated.' };
    }
  };

  const deleteRoutinePeriod = async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    try {
      const res = await apiFetch(`/api/routines/${id}`, {
        method: 'DELETE',
        headers: {
          ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {})
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Failed to delete routine period.';
        showToast(errMsg);
        return { success: false, message: errMsg };
      }
      setAllStoredRoutines(prev => prev.filter(p => p.id !== id));
      showToast(data.message || 'Routine period removed.');
      return { success: true, message: data.message || 'Routine period removed.' };
    } catch {
      setAllStoredRoutines(prev => prev.filter(p => p.id !== id));
      showToast('Routine period removed.');
      return { success: true, message: 'Routine period removed.' };
    }
  };

  const setFullRoutine = (periods: RoutinePeriod[]) => {
    setAllStoredRoutines(sanitizeStoredRoutineList(periods));
  };

  const uploadRoutineDocument = (
    fileName: string, 
    fileType: 'IMAGE' | 'PDF', 
    dataUrl: string
  ): UploadedRoutineDocument => {
    const colObj = resolveStrictCollege(userProfile.college);
    const deptObj = resolveStrictTechnology(userProfile.department);
    const newDoc: UploadedRoutineDocument = {
      id: `doc_${Date.now()}`,
      fileName,
      fileType,
      dataUrl,
      uploadedAt: `${new Date().toLocaleDateString('en-GB')}, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      uploadedBy: userProfile.name,
      extractedPeriodsCount: 0,
      isConfirmed: false,
      college_id: colObj?.id || null,
      department_id: deptObj?.id || null,
      semester: userProfile.semester,
      shift: selectedShift,
      section: selectedSection
    };

    uploadedRoutinesRef.current = [newDoc, ...uploadedRoutinesRef.current];
    setUploadedRoutines(prev => [newDoc, ...prev]);
    showToast(`Routine file "${fileName}" uploaded. Scanning document...`);
    return newDoc;
  };

  const analyzeRoutineOCR = async (
    docId: string,
    directDoc?: UploadedRoutineDocument,
    onProgress?: (stage: string, progress: number) => void
  ): Promise<{
    success: boolean;
    periods: RoutinePeriod[];
    routineMetadata?: {
      college?: string | null;
      department?: string | null;
      semester?: number | null;
      shift?: Shift | null;
      section?: Section | null;
    };
    warnings?: string[];
    uncertainFields?: string[];
    confidence?: 'high' | 'medium' | 'low';
    rawExtractedText?: string;
    diagnostics?: string[];
    error?: string;
  }> => {
    const doc =
      directDoc ||
      uploadedRoutinesRef.current.find(d => d.id === docId) ||
      uploadedRoutines.find(d => d.id === docId);

    if (!doc) {
      return { success: false, periods: [], error: 'Routine file not found.' };
    }

    try {
      const { scanRoutineLocally } = await import('../services/routineOcrService');
      const result = await scanRoutineLocally({
        fileName: doc.fileName,
        dataUrl: doc.dataUrl,
        shift: selectedShift,
        section: selectedSection,
        onProgress
      });
      const periods = result.periods;
      uploadedRoutinesRef.current = uploadedRoutinesRef.current.map(d =>
        d.id === docId ? { ...d, extractedPeriodsCount: periods.length } : d
      );
      setUploadedRoutines(prev =>
        prev.map(d => (d.id === docId ? { ...d, extractedPeriodsCount: periods.length } : d))
      );

      showToast(`Extracted ${periods.length} timetable periods! Please review before publishing.`);
      if (periods.length === 0) {
        return {
          success: false,
          periods: [],
          routineMetadata: result.routineMetadata,
          warnings: result.warnings,
          rawExtractedText: result.rawExtractedText,
          diagnostics: result.diagnostics,
          error: result.rawExtractedText.trim()
            ? 'OCR read text, but no routine rows matched. Review the raw OCR text below or enter periods manually.'
            : 'OCR returned no text. Check the original file, OCR model loading, and browser network access; raw diagnostics are shown below.'
        };
      }

      return {
        success: true,
        periods,
        routineMetadata: result.routineMetadata,
        warnings: result.warnings,
        confidence: result.confidence,
        rawExtractedText: result.rawExtractedText,
        diagnostics: result.diagnostics
      };
    } catch (error) {
      console.error('Local routine OCR failed:', error);
      return {
        success: false,
        periods: [],
        diagnostics: [error instanceof Error ? error.message : String(error)],
        error: error instanceof Error ? error.message : 'Local OCR failed. Please retry or enter periods manually.'
      };
    }
  };

  const saveConfirmedRoutine = async (
    periods: RoutinePeriod[],
    docId: string
  ): Promise<{ success: boolean; message: string }> => {
    const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    try {
      const res = await apiFetch('/api/routines/publish-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {})
        },
        body: JSON.stringify({
          college_id: userProfile.college,
          department_id: userProfile.department,
          semester: userProfile.semester,
          shift: selectedShift || userProfile.shift,
          section: selectedSection || userProfile.section,
          publication_status: 'published',
          replaceExistingForCohort: true,
          periods
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Failed to publish confirmed routine.';
        showToast(errMsg);
        return { success: false, message: errMsg };
      }

      if (Array.isArray(data.routines)) {
        setAllStoredRoutines(data.routines);
      }
      setUploadedRoutines(prev => prev.map(d => d.id === docId ? { ...d, isConfirmed: true } : d));
      showToast(data.message || '✅ Confirmed timetable published for your academic group!');
      return { success: true, message: data.message || 'Confirmed routine published.' };
    } catch {
      const stamped = sanitizeStoredRoutineList(
        periods.map(p => ({
          ...p,
          college: userProfile.college,
          department: userProfile.department,
          semester: userProfile.semester,
          shift: selectedShift || userProfile.shift,
          section: selectedSection || userProfile.section,
          created_by: userProfile.id,
          publication_status: 'published'
        }))
      );
      setAllStoredRoutines(stamped);
      setUploadedRoutines(prev => prev.map(d => d.id === docId ? { ...d, isConfirmed: true } : d));
      showToast('✅ Confirmed timetable saved for your academic group!');
      return { success: true, message: 'Confirmed routine saved.' };
    }
  };

  // 4. MULTIMEDIA NOTES, ASSIGNMENTS & JOBS
  const addNote = async (
    noteData: Omit<NoteItem, 'id' | 'uploadedDate'>
  ): Promise<{ success: boolean; message: string }> => {
    const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    try {
      const res = await apiFetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {})
        },
        body: JSON.stringify(noteData)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Failed to publish study note.';
        showToast(errMsg);
        return { success: false, message: errMsg };
      }

      if (data.note) {
        setNotes(prev => [data.note, ...prev.filter(n => n.id !== data.note.id)]);
      }
      showToast('New study notes published!');
      return { success: true, message: data.message || 'Study note published.' };
    } catch {
      const newNote: NoteItem = {
        ...noteData,
        id: `note_${Date.now()}`,
        uploadedDate: 'Just now'
      };
      setNotes(prev => [newNote, ...prev]);
      showToast('New study notes published!');
      return { success: true, message: 'Study note published.' };
    }
  };

  const addAssignment = async (
    asgData: Omit<AssignmentItem, 'id' | 'status'>
  ): Promise<{ success: boolean; message: string }> => {
    const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    try {
      const res = await apiFetch('/api/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {})
        },
        body: JSON.stringify(asgData)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Failed to publish assignment.';
        showToast(errMsg);
        return { success: false, message: errMsg };
      }

      await refreshAcademicFeed();
      showToast('New assignment published to class feed!');
      return { success: true, message: data.message || 'Assignment published.' };
    } catch {
      const newAsg: AssignmentItem = {
        ...asgData,
        id: `asg_${Date.now()}`,
        status: 'Pending'
      };
      setAssignments(prev => [newAsg, ...prev]);
      showToast('New assignment added to class feed!');
      return { success: true, message: 'Assignment added.' };
    }
  };

  const submitAssignment = async (
    id: string,
    note?: string,
    attachment?: { url: string; name: string; type?: string }
  ): Promise<{ success: boolean; message: string }> => {
    if (userProfile.accountType === 'teacher' || userProfile.accountType === 'system_admin') {
      const msg = 'Forbidden: Teacher and Administrator accounts cannot submit student assignments.';
      showToast(msg);
      return { success: false, message: msg };
    }

    const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    try {
      const res = await apiFetch(`/api/assignments/${id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {})
        },
        body: JSON.stringify({
          submissionNote: note || 'Completed and submitted through student portal.',
          attachmentUrl: attachment?.url,
          attachmentName: attachment?.name,
          attachmentType: attachment?.type,
          boardRoll: userProfile.boardRoll,
          classRoll: userProfile.boardRoll?.slice(-2) || '01',
          regNumber: userProfile.regNumber,
          semester: userProfile.semester,
          shift: userProfile.shift,
          section: userProfile.section
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Failed to submit assignment.';
        showToast(errMsg);
        return { success: false, message: errMsg };
      }

      await refreshAcademicFeed();
      showToast(data.message || 'Assignment submitted successfully!');
      return { success: true, message: data.message || 'Assignment submitted.' };
    } catch {
      const now = new Date();
      const formatted = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      setAssignments(prev => prev.map(a => {
        if (a.id === id) {
          return {
            ...a,
            status: 'Submitted',
            submittedAt: formatted,
            submissionNote: note || 'Completed and submitted through student portal.'
          };
        }
        return a;
      }));
      showToast('Assignment submitted successfully!');
      return { success: true, message: 'Assignment submitted.' };
    }
  };

  const addJobCircular = async (
    jobData: Omit<JobCircular, 'id' | 'postedAt' | 'postedBy'>
  ): Promise<{ success: boolean; message: string }> => {
    const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    try {
      const res = await apiFetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {})
        },
        body: JSON.stringify(jobData)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Failed to publish job circular.';
        showToast(errMsg);
        return { success: false, message: errMsg };
      }
      if (data.job) {
        setJobs(prev => [data.job, ...prev.filter(j => j.id !== data.job.id)]);
      }
      showToast(data.message || 'Job & Internship circular published!');
      return { success: true, message: data.message || 'Published!' };
    } catch {
      const newJob: JobCircular = {
        ...jobData,
        id: `job_${Date.now()}`,
        postedBy: userProfile.name,
        postedAt: 'Today'
      };
      setJobs(prev => [newJob, ...prev]);
      showToast('Job & Internship circular published!');
      return { success: true, message: 'Published!' };
    }
  };

  // 5. REMINDERS & TEACHERS
  const addReminder = (remData: Omit<ReminderItem, 'id' | 'isCompleted'>) => {
    const newRem: ReminderItem = {
      ...remData,
      id: `rem_${Date.now()}`,
      isCompleted: false
    };
    setReminders(prev => [newRem, ...prev]);
    nativeService.scheduleCustomReminder(remData.title, remData.note || remData.title, remData.dueDate);
    showToast('Reminder scheduled!');
  };

  const toggleReminder = (id: string) => {
    setReminders(prev => prev.map(r => {
      if (r.id === id) {
        const next = !r.isCompleted;
        showToast(next ? 'Marked as completed!' : 'Marked as pending.');
        return { ...r, isCompleted: next };
      }
      return r;
    }));
  };

  const deleteReminder = (id: string) => {
    setReminders(prev => prev.filter(p => p.id !== id));
    showToast('Reminder deleted.');
  };

  const addTeacher = async (teacherData: Omit<TeacherContact, 'id'>): Promise<{ success: boolean; message: string }> => {
    // 1. Client-side RBAC check: Student accounts cannot add contacts
    if (userProfile.accountType === 'student') {
      showToast('Forbidden: Students have read-only access to the Faculty Directory.');
      return { success: false, message: 'Student accounts cannot add teacher contacts.' };
    }

    try {
      const response = await apiFetch('/api/teacher-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterRole: userProfile.accountType,
          requesterId: userProfile.id,
          requesterName: userProfile.name,
          requesterCollege: userProfile.college,
          requesterDepartment: userProfile.department,
          contact: {
            ...teacherData,
            college: teacherData.collegeName || userProfile.college,
            department: teacherData.department || userProfile.department
          }
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        showToast(data.error || 'Failed to add teacher contact.');
        return { success: false, message: data.error || 'Failed to add contact.' };
      }

      setTeachers(prev => {
        const existingIdx = prev.findIndex(t => t.id === data.contact.id);
        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx] = data.contact;
          return copy;
        }
        return [...prev, data.contact];
      });

      showToast(data.message || 'Teacher contact added to directory!');
      return { success: true, message: data.message };
    } catch (err) {
      // Resilient local fallback
      const newTch: TeacherContact = {
        ...teacherData,
        id: `tch_${Date.now()}`
      };
      setTeachers(prev => [...prev, newTch]);
      showToast('Teacher contact added to directory!');
      return { success: true, message: 'Added contact.' };
    }
  };

  const archiveTeacherContact = async (contactId: string, reason: string): Promise<{ success: boolean; message: string }> => {
    if (userProfile.accountType === 'student') {
      showToast('Forbidden: Students cannot remove teacher contacts.');
      return { success: false, message: 'Students cannot remove contacts.' };
    }

    try {
      const response = await apiFetch(`/api/teacher-contacts/${contactId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterRole: userProfile.accountType,
          requesterId: userProfile.id,
          requesterName: userProfile.name,
          requesterCollege: userProfile.college,
          requesterDepartment: userProfile.department,
          reason
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        showToast(data.error || 'Failed to archive teacher contact.');
        return { success: false, message: data.error || 'Archive failed.' };
      }

      setTeachers(prev => prev.map(t => {
        if (t.id === contactId) {
          return {
            ...t,
            isArchived: true,
            archivedAt: new Date().toISOString(),
            archivedBy: userProfile.name,
            archiveReason: reason
          };
        }
        return t;
      }));

      showToast(data.message || 'Teacher contact archived from active directory.');
      return { success: true, message: data.message };
    } catch (err) {
      showToast('Failed to reach archive service.');
      return { success: false, message: 'Server communication error.' };
    }
  };

  const addAnnouncement = (title: string, content: string, priority: 'Important' | 'Normal') => {
    const newAnn: ClassAnnouncement = {
      id: `ann_${Date.now()}`,
      authorName: userProfile.name,
      authorRole: `${userProfile.accountType === 'class_captain' ? 'Class Captain' : 'Student'} - Sec ${userProfile.section}`,
      title,
      content,
      postedAt: 'Just now',
      priority,
      isPinned: priority === 'Important'
    };
    setAnnouncements(prev => [newAnn, ...prev]);
    nativeService.broadcastAnnouncementAlert(title, content, userProfile.name);
    showToast('Announcement broadcasted to class!');
  };

  const updateNotifications = (updates: Partial<NotificationPreferences>) => {
    setNotifications(prev => ({ ...prev, ...updates }));
    showToast('Notification preferences updated.');
  };

  const getShiftSchedule = (shift: Shift): ShiftScheduleConfig => {
    return shiftSchedules[shift] || buildDefaultShiftScheduleConfig(shift, { scopeKey: 'default' });
  };

  const saveShiftSchedule = async (
    config: Partial<ShiftScheduleConfig> & { shift: Shift; forceResetAllManual?: boolean }
  ): Promise<ShiftScheduleConfig> => {
    const shift: Shift = config.shift === 'Day' ? 'Day' : 'Morning';
    const current = getShiftSchedule(shift);
    const firstPeriodStartTime = config.firstPeriodStartTime || current.firstPeriodStartTime || SHIFT_DEFAULT_START_TIME[shift];
    const defaultDurationMinutes = config.defaultDurationMinutes ?? current.defaultDurationMinutes ?? DEFAULT_PERIOD_DURATION_MINUTES;
    const numberOfPeriods = config.numberOfPeriods ?? current.numberOfPeriods ?? 7;
    const breaks = config.breaks ?? current.breaks ?? [];
    const incomingPeriods = config.periods ?? current.periods;

    const recalculatedPeriods = recalculateShiftSchedulePeriods({
      firstPeriodStartTime,
      defaultDurationMinutes,
      numberOfPeriods,
      existingPeriods: incomingPeriods,
      breaks,
      forceResetAllManual: Boolean(config.forceResetAllManual)
    });

    const localUpdated: ShiftScheduleConfig = {
      ...current,
      ...config,
      shift,
      firstPeriodStartTime,
      defaultDurationMinutes,
      numberOfPeriods,
      breaks,
      periods: recalculatedPeriods,
      updatedAt: new Date().toISOString()
    };

    // Immediately update local state while keeping opposite shift strictly separate
    setShiftSchedules(prev => ({
      ...prev,
      [shift]: localUpdated
    }));

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
      if (tokenToUse) {
        headers.Authorization = `Bearer ${tokenToUse}`;
      }
      const res = await apiFetch('/api/schedule-config', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...localUpdated,
          scopeKey: localUpdated.scopeKey || 'default',
          forceResetAllManual: Boolean(config.forceResetAllManual)
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.schedule) {
        setShiftSchedules(prev => ({
          ...prev,
          [shift]: data.schedule
        }));
        showToast(`${shift} Shift period schedule saved.`);
        return data.schedule;
      }
    } catch {
      // Fallback to localUpdated
    }

    showToast(`${shift} Shift period schedule updated.`);
    return localUpdated;
  };

  const resetShiftSchedule = async (shift: Shift, periodNumber?: number): Promise<ShiftScheduleConfig> => {
    const targetShift: Shift = shift === 'Day' ? 'Day' : 'Morning';
    const current = getShiftSchedule(targetShift);

    const localReset =
      periodNumber && Number.isFinite(periodNumber)
        ? resetSinglePeriodToSuggested(current, periodNumber)
        : buildDefaultShiftScheduleConfig(targetShift, { scopeKey: current.scopeKey || 'default' });

    setShiftSchedules(prev => ({
      ...prev,
      [targetShift]: localReset
    }));

    try {
      const res = await apiFetch('/api/schedule-config/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift: targetShift,
          scopeKey: current.scopeKey || 'default',
          periodNumber
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.schedule) {
        setShiftSchedules(prev => ({
          ...prev,
          [targetShift]: data.schedule
        }));
        showToast(data.message || `${targetShift} Shift schedule reset.`);
        return data.schedule;
      }
    } catch {
      // Fallback to localReset
    }

    showToast(
      periodNumber
        ? `Period ${periodNumber} reset to suggested timing.`
        : `${targetShift} Shift reset to default (${SHIFT_DEFAULT_START_TIME[targetShift]}, ${DEFAULT_PERIOD_DURATION_MINUTES} min).`
    );
    return localReset;
  };

  const resetAllData = () => {
    setAllStoredRoutines(INITIAL_ROUTINE);
    setUploadedRoutines([]);
    setNotes(prev => removeLegacyDemoContent(prev, LEGACY_DEMO_CONTENT_IDS.notes));
    setAssignments(prev => removeLegacyDemoContent(prev, LEGACY_DEMO_CONTENT_IDS.assignments));
    setJobs(INITIAL_JOBS);
    setReminders(prev => removeLegacyDemoContent(prev, LEGACY_DEMO_CONTENT_IDS.reminders));
    setTeachers(prev => removeLegacyDemoContent(prev, LEGACY_DEMO_CONTENT_IDS.teachers));
    setApplications(INITIAL_APPLICATIONS);
    setAnnouncements(INITIAL_ANNOUNCEMENTS);
    setUserProfile(EMPTY_STUDENT_PROFILE);
    setNotifications(DEFAULT_NOTIFICATION_SETTINGS);
    setSelectedShift(EMPTY_STUDENT_PROFILE.shift);
    setSelectedSection(EMPTY_STUDENT_PROFILE.section);
    setShiftSchedules({
      Morning: buildDefaultShiftScheduleConfig('Morning', { scopeKey: 'default' }),
      Day: buildDefaultShiftScheduleConfig('Day', { scopeKey: 'default' })
    });
    showToast('Legacy demo content removed; user-created academic content preserved.');
  };

  return (
    <AppContext.Provider
      value={{
        userProfile,
        setUserProfile,
        activeScreen,
        setActiveScreen,
        isLoggedIn,
        login,
        authenticateStudent,
        logout,
        accountType: userProfile.accountType,
        setAccountType,
        switchAccountType,
        isVerifiedCaptain,
        authToken,
        systemAdminProfile,
        isServerVerifiedAdmin,
        isCheckingAdminSession,
        adminLogin,
        adminBootstrap,
        verifyServerAdminSession,
        currentTeacherProfile,
        teachersList,
        teacherLogin,
        teacherRegister,
        updateTeacherProfile,
        adminVerifyTeacher,
        adminResetTeacherLockout,
        teacherChangePin,
        routine,
        routineNotifications,
        addRoutinePeriod,
        updateRoutinePeriod,
        deleteRoutinePeriod,
        setFullRoutine,
        uploadedRoutines,
        uploadRoutineDocument,
        analyzeRoutineOCR,
        saveConfirmedRoutine,
        notes,
        addNote,
        assignments,
        addAssignment,
        submitAssignment,
        refreshAcademicFeed,
        jobs,
        addJobCircular,
        notesInitialTab,
        setNotesInitialTab,
        openNotesSection,
        reminders,
        addReminder,
        toggleReminder,
        deleteReminder,
        teachers,
        addTeacher,
        archiveTeacherContact,
        isTeacherContactUnlocked:
          !isTeacherContactAccessLocked || Boolean(userProfile.isTeacherContactUnlocked),
        isTeacherContactAccessLocked,
        updateTeacherContactAccessLock,
        unlockTeacherContactsWithPayment,
        applications,
        submitCaptainApplication,
        teacherEndorseApplication,
        adminApproveApplication,
        adminRejectApplication,
        adminRevokeApplication,
        getVerifiedCaptainsCount,
        announcements,
        addAnnouncement,
        notifications,
        updateNotifications,
        selectedShift,
        setSelectedShift,
        selectedSection,
        setSelectedSection,
        resetAllData,
        shiftSchedules,
        getShiftSchedule,
        saveShiftSchedule,
        resetShiftSchedule,
        toastMessage,
        showToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
