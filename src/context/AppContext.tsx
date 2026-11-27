import { apiFetch } from '../services/apiClient';
import {
  fetchWithNetworkRetry,
  NETWORK_ERROR_MESSAGE,
  type NetworkRetryOptions
} from '../services/networkRetry';
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
  ServerRoutineDocument,
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
  LEGACY_DEMO_CONTENT_IDS,
  DEFAULT_NOTIFICATION_SETTINGS,
  normalizeCollege,
  normalizeTechnology,
  resolveStrictCollege,
  resolveStrictTechnology
} from '../data/mockData';
import { nativeService } from '../services/nativeService';

// Student authentication result (login rework): a login can succeed
// outright, or pause for an SMS code (when SMS verification is enabled).
// There is deliberately no PIN-setup step any more: login is Board Roll +
// PIN only, and accounts without a PIN cannot sign in until an
// administrator sets one (see the item-7 note in server.ts).
export interface StudentAuthResult {
  success: boolean;
  message: string;
  requiresSmsVerification?: boolean;
  smsChallengeId?: string;
  maskedPhone?: string;
  name?: string;
}

// Proof that the Cloudflare Turnstile widget rendered in the form.
export interface TurnstileProof {
  token: string | null;
  enabled: boolean;
}

interface AppContextType {
  userProfile: StudentProfile;
  setUserProfile: React.Dispatch<React.SetStateAction<StudentProfile>>;
  activeScreen: ScreenType;
  setActiveScreen: (screen: ScreenType) => void;
  isLoggedIn: boolean;
  login: (profile: StudentProfile, pin?: string) => Promise<StudentAuthResult>;
  authenticateStudent: (
    boardRoll: string,
    pin: string,
    role: 'student' | 'class_captain',
    turnstile?: TurnstileProof
  ) => Promise<StudentAuthResult>;
  verifySmsCode: (smsChallengeId: string, code: string) => Promise<StudentAuthResult>;
  resendSmsCode: (smsChallengeId: string) => Promise<{ success: boolean; message: string; maskedPhone?: string }>;
  socialLogin: (
    provider: 'google' | 'facebook',
    token: string,
    role: 'student' | 'class_captain'
  ) => Promise<StudentAuthResult>;
  logout: () => void;
  requestAccountDeletion: (reason?: string) => Promise<{ success: boolean; message: string }>;
  accountType: AccountType;
  setAccountType: (type: AccountType) => void;
  switchAccountType: (type: AccountType) => void;
  isVerifiedCaptain: boolean;

  // Server-Side Session & System Administrator Authentication
  authToken: string | null;
  systemAdminProfile: SystemAdminProfile | null;
  isServerVerifiedAdmin: boolean;
  isCheckingAdminSession: boolean;
  adminLogin: (email: string, password: string, pinToken?: string, options?: Pick<NetworkRetryOptions, 'onRetry'>) => Promise<{ success: boolean; message: string }>;
  adminBootstrap: (bootstrapToken: string, name: string, email: string, password: string, pinToken?: string) => Promise<{ success: boolean; message: string }>;
  verifyServerAdminSession: () => Promise<boolean>;

  // Teacher Authentication & Institutional Faculty State
  currentTeacherProfile: TeacherProfile | null;
  teachersList: TeacherProfile[];
  teacherLogin: (phoneOrEmail: string, pin: string, turnstile?: TurnstileProof) => Promise<{ success: boolean; message: string; teacher?: TeacherProfile }>;
  teacherRegister: (data: any, turnstile?: TurnstileProof) => Promise<{ success: boolean; message: string; teacher?: TeacherProfile }>;
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
  routineDocuments: ServerRoutineDocument[];
  loadRoutineDocuments: () => Promise<void>;
  uploadRoutineDocument: (fileName: string, fileType: 'IMAGE' | 'PDF', dataUrl: string, cohort?: { semester: StudentProfile['semester']; shift: Shift; section: Section }) => Promise<UploadedRoutineDocument | null>;
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
  
  // Reminders (server-synced via /api/reminders; see B2)
  reminders: ReminderItem[];
  addReminder: (reminder: Omit<ReminderItem, 'id' | 'isCompleted'>) => Promise<{ success: boolean; message: string }>;
  toggleReminder: (id: string) => Promise<{ success: boolean; message: string }>;
  deleteReminder: (id: string) => Promise<{ success: boolean; message: string }>;
  loadReminders: () => Promise<boolean>;
  
  // Teacher Contact access. Payments are currently disabled, so contacts are free for everyone.
  teachers: TeacherContact[];
  addTeacher: (teacher: Omit<TeacherContact, 'id'>) => Promise<{ success: boolean; message: string }>;
  updateTeacherContact: (contactId: string, updates: Partial<TeacherContact>) => Promise<{ success: boolean; message: string }>;
  archiveTeacherContact: (contactId: string, reason: string) => Promise<{ success: boolean; message: string }>;
  isTeacherContactUnlocked: boolean;
  isTeacherContactAccessLocked: boolean;
  updateTeacherContactAccessLock: (locked: boolean) => Promise<{ success: boolean; message: string }>;

  
  // Class Captain Verification Workflow
  applications: CaptainApplication[];
  loadCaptainApplications: () => Promise<boolean>;
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
  
  // Announcements (for Class Captain) — server-backed (POST/GET
  // /api/announcements); addAnnouncement only reports success when the
  // server stored the post.
  announcements: ClassAnnouncement[];
  addAnnouncement: (title: string, content: string, priority: 'Important' | 'Normal', cohort?: { semester: number; shift: Shift; section: Section }) => Promise<{ success: boolean; message: string }>;
  loadAnnouncements: () => Promise<boolean>;

  // Student profile fields (B1): save name/phone/session/regulation/
  // shift/section (+ subjects, notifications) via PATCH /api/me/profile.
  updateStudentProfileFields: (fields: {
    name?: string;
    phone?: string;
    session?: string;
    regulation?: string;
    shift?: Shift;
    section?: Section;
    enrolledSubjects?: { code: string; name: string }[];
    notifications?: NotificationPreferences;
  }) => Promise<{ success: boolean; message: string }>;
  
  // Settings
  notifications: NotificationPreferences;
  updateNotifications: (updates: Partial<NotificationPreferences>) => void;
  
  // Quick Filters / State
  selectedShift: Shift;
  setSelectedShift: (shift: Shift) => void;
  selectedSection: Section;
  setSelectedSection: (section: Section) => void;
  
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
  // Server-side routine documents (GET /api/routines/documents) — the
  // durable list; uploadedRoutines above keeps the in-memory bytes for
  // this session's OCR + original-viewer.
  const [routineDocuments, setRoutineDocuments] = useState<ServerRoutineDocument[]>([]);
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
    // No seeded jobs: start empty and drop the removed invented sample
    // listings (job_01..job_06) from any cached copy.
    return saved ? removeLegacyDemoContent(JSON.parse(saved), LEGACY_DEMO_CONTENT_IDS.jobs) : [];
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

  // Fetch verified teachers, contacts, and shift schedule configurations from backend on mount.
  // Re-runs when the session token changes: the server strips phone/email
  // from the teacher directory for anonymous callers, so the full directory
  // must reload once the user signs in.
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

    const teachersToken = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    apiFetch('/api/teachers', {
      headers: teachersToken ? { Authorization: `Bearer ${teachersToken}` } : {}
    })
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
  }, [authToken]);

  // Ensure student / class_captain has a valid server session token whenever profile or academic group changes.
  // IMPORTANT: only a genuine auth failure (HTTP 401/403) logs the user out.
  // Transient failures (network error, cold-start timeout, 429, 5xx) must NOT
  // bounce a signed-in user back to the login screen: the session is kept
  // and the call is retried twice, then left alone until the next trigger.
  // (Logging out on any failure used to burn the shared auth rate-limit
  // bucket until 429s made the logout loop self-sustaining.)
  useEffect(() => {
    if (
      !isLoggedIn ||
      (userProfile.accountType !== 'student' && userProfile.accountType !== 'class_captain')
    ) {
      return;
    }
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const invalidateStudentSession = () => {
      setAuthToken(null);
      setIsLoggedIn(false);
      setCurrentTeacherProfile(null);
      setUserProfile(EMPTY_STUDENT_PROFILE);
      setActiveScreen('welcome');
    };

    const ensureSession = async (attempt: number): Promise<void> => {
      if (cancelled) return;
      try {
        const res = await apiFetch('/api/auth/session', {
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
        });
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success && data.sessionToken) {
          setAuthToken(data.sessionToken);
          return;
        }
        // Genuine auth failure: the server rejected this account/session.
        if (res.status === 401 || res.status === 403) {
          invalidateStudentSession();
          return;
        }
        // Transient (429 rate-limited, 5xx, or other non-auth failure):
        // keep the session and retry briefly, then stop quietly.
        if (attempt < 2) {
          retryTimer = setTimeout(() => void ensureSession(attempt + 1), 10000);
        }
      } catch {
        // Network error / cold-start timeout: keep the session, retry briefly.
        if (cancelled) return;
        if (attempt < 2) {
          retryTimer = setTimeout(() => void ensureSession(attempt + 1), 10000);
        }
      }
    };

    void ensureSession(0);
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
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

    // Same rule as the student session effect: only a genuine auth failure
    // (401/403, or a 2xx answer saying this is not a teacher session) logs
    // the user out. Network errors, 429s and 5xx keep the session and retry.
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const checkTeacherSession = async (attempt: number): Promise<void> => {
      if (cancelled) return;
      try {
        const res = await apiFetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${tokenToCheck}` }
        });
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        if (
          res.ok &&
          data.success &&
          data.authenticated &&
          data.session?.role === 'teacher' &&
          data.session.userId === currentTeacherProfile?.id
        ) {
          return;
        }
        if (res.status === 401 || res.status === 403) {
          invalidateTeacherSession();
          return;
        }
        if (
          res.ok &&
          (!data.success ||
            !data.authenticated ||
            data.session?.role !== 'teacher' ||
            data.session.userId !== currentTeacherProfile?.id)
        ) {
          // Server answered: this session is not a valid teacher session.
          invalidateTeacherSession();
          return;
        }
        // Transient (429, 5xx, or other non-auth failure): retry briefly.
        if (attempt < 2) {
          retryTimer = setTimeout(() => void checkTeacherSession(attempt + 1), 10000);
        }
      } catch {
        if (cancelled) return;
        if (attempt < 2) {
          retryTimer = setTimeout(() => void checkTeacherSession(attempt + 1), 10000);
        }
      }
    };

    void checkTeacherSession(0);
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [isLoggedIn, userProfile.accountType, authToken, currentTeacherProfile?.id]);

  // Captain applications used to live in this device's localStorage only,
  // so the Admin and the Guide Teacher — on their own devices — never saw
  // requests submitted on a student's device, and the admin Captains tab
  // showed (0). Load the server list whenever a session is active. This
  // also runs on session restore (app reopen with a stored token), not
  // just on a fresh login. For students it also refreshes their own
  // captain status from the server record, so an admin approval shows up
  // without a re-login.
  useEffect(() => {
    if (!isLoggedIn) return;
    void loadCaptainApplications();
    void loadAnnouncements();
    // loadCaptainApplications / loadAnnouncements are defined below; the
    // effect callback only runs after the render completes, so the
    // references are initialized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, authToken, userProfile.accountType, currentTeacherProfile?.id]);

  // Student self-refresh: when the Profile or Captain Verification
  // screen opens, reload the student's own record from the server so the
  // displayed role/status cannot go stale after an admin decision.
  useEffect(() => {
    if (!isLoggedIn) return;
    if (userProfile.accountType !== 'student' && userProfile.accountType !== 'class_captain') return;
    if (activeScreen !== 'profile' && activeScreen !== 'captain_verification') return;
    void loadCaptainApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScreen]);

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

      // Server-side routine documents list (B3).
      if (tokenToUse) void loadRoutineDocuments();
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
    // Persist routine-document metadata only, never the file bytes:
    // a scanned routine photo/PDF is several MB as a data: URL and
    // localStorage (~5 MB quota) throws QuotaExceededError on the
    // whole write, so the document would not persist at all. The
    // bytes stay in memory for this session (view-original + OCR);
    // the extracted periods — the actual published data — live on
    // the server. The viewer only offers "Original Routine" while
    // the bytes are in memory.
    try {
      const lightweight = uploadedRoutines.map(d => ({ ...d, dataUrl: '' }));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}uploaded_routines`, JSON.stringify(lightweight));
    } catch {
      // localStorage full or unavailable — the in-memory copy still
      // works for this session.
    }
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

  // Heal captain records whose teacher endorsement only exists on this
  // device (endorsed before the server sync existed): push each endorsed
  // record to the server once, so the admin approval guard can see the
  // endorsement and approve. Without this, an already-endorsed application
  // stays stuck — the teacher cannot re-endorse it (it is no longer
  // Pending) and the admin cannot approve it (the server has no
  // endorsement on file).
  const syncedEndorsementKeys = useRef<Set<string>>(new Set());
  useEffect(() => {
    applications.forEach(app => {
      if (!app.teacherEndorsement) return;
      const key = `${app.id}:${app.teacherEndorsement.endorsedAt || ''}`;
      if (syncedEndorsementKeys.current.has(key)) return;
      syncedEndorsementKeys.current.add(key);
      void syncCaptainRecordToServer(app);
    });
    // syncCaptainRecordToServer is defined below; the effect callback only
    // runs after the render completes, so the reference is initialized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Shared success path for every student sign-in flow (PIN, PIN setup,
  // SMS code, social): build the profile from the server account and
  // install the session.
  const applyStudentSession = (data: any): StudentAuthResult => {
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
      // Server value wins when present; a missing server value keeps the
      // saved local one for the same account — never wipe (B1, same
      // merge discipline as enrolled subjects in v1.0.28).
      section: account.section || (sameAccount && savedProfile ? savedProfile.section : 'A1'),
      shift: account.shift || (sameAccount && savedProfile ? savedProfile.shift : 'Morning'),
      session:
        account.session ||
        (sameAccount && savedProfile ? savedProfile.session : ''),
      regulation:
        account.regulation ||
        (sameAccount && savedProfile ? savedProfile.regulation : undefined),
      accountType: data.session.role,
      captainVerificationStatus: account.captainVerificationStatus,
      isTeacherContactUnlocked: sameAccount && Boolean(savedProfile?.isTeacherContactUnlocked),
      // Enrolled subjects: the server value wins when present — even an
      // empty list, because the user may have cleared all subjects.
      // When the server has no value yet (older record, or a Postgres
      // read from before the enrolled_subjects column exists), keep the
      // saved local selection for the same account instead of wiping it.
      // A missing server value must never destroy a local selection.
      enrolledSubjects: Array.isArray(account.enrolledSubjects)
        ? account.enrolledSubjects
        : (sameAccount && savedProfile ? savedProfile.enrolledSubjects : undefined),
      phone:
        account.phone ||
        (sameAccount && savedProfile ? savedProfile.phone || '' : '')
    };

    // Notification preferences (B6): install the server copy when the
    // account carries one; otherwise keep the local preferences.
    if (account.notifications && typeof account.notifications === 'object') {
      setNotifications(prev => ({ ...prev, ...account.notifications }));
    }

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
  };

  const authenticateStudent = async (
    boardRoll: string,
    pin: string,
    role: 'student' | 'class_captain',
    turnstile?: TurnstileProof
  ): Promise<StudentAuthResult> => {
    try {
      const response = await apiFetch('/api/students/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardRoll,
          pin,
          role,
          turnstileToken: turnstile?.token || undefined,
          turnstileEnabled: turnstile?.enabled || false
        })
      });
      const data = await response.json();
      if (data.requiresSmsVerification && data.smsChallengeId) {
        return {
          success: true,
          message: 'SMS code sent.',
          requiresSmsVerification: true,
          smsChallengeId: data.smsChallengeId,
          maskedPhone: data.maskedPhone,
          name: data.name
        };
      }
      if (!response.ok || !data.success || !data.account || !data.sessionToken || !data.session) {
        return { success: false, message: data.error || 'Student authentication failed.' };
      }
      return applyStudentSession(data);
    } catch {
      return { success: false, message: 'Could not connect to the student authentication server.' };
    }
  };

  const verifySmsCode = async (smsChallengeId: string, code: string): Promise<StudentAuthResult> => {
    try {
      const response = await apiFetch('/api/students/sms/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smsChallengeId, code })
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.account || !data.sessionToken || !data.session) {
        return { success: false, message: data.error || 'SMS verification failed.' };
      }
      return applyStudentSession(data);
    } catch {
      return { success: false, message: 'Could not connect to the student authentication server.' };
    }
  };

  const resendSmsCode = async (
    smsChallengeId: string
  ): Promise<{ success: boolean; message: string; maskedPhone?: string }> => {
    try {
      const response = await apiFetch('/api/students/sms/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smsChallengeId })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        return { success: false, message: data.error || 'Could not resend the SMS code.' };
      }
      return { success: true, message: data.message || 'A new code was sent.', maskedPhone: data.maskedPhone };
    } catch {
      return { success: false, message: 'Could not connect to the student authentication server.' };
    }
  };

  const socialLogin = async (
    provider: 'google' | 'facebook',
    token: string,
    role: 'student' | 'class_captain'
  ): Promise<StudentAuthResult> => {
    try {
      const endpoint = provider === 'google' ? '/api/auth/google' : '/api/auth/facebook';
      const body =
        provider === 'google' ? { idToken: token, role } : { accessToken: token, role };
      const response = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.account || !data.sessionToken || !data.session) {
        return {
          success: false,
          message: data.error || `${provider === 'google' ? 'Google' : 'Facebook'} sign-in failed.`
        };
      }
      return applyStudentSession(data);
    } catch {
      return { success: false, message: 'Could not connect to the student authentication server.' };
    }
  };

  const login = (profile: StudentProfile, pin?: string): Promise<StudentAuthResult> => {
    const role =
      profile.accountType === 'class_captain' && profile.captainVerificationStatus === 'Approved'
        ? 'class_captain'
        : 'student';
    if (pin) return authenticateStudent(profile.boardRoll, pin, role);
    // No PIN: there is no PIN-setup fallback any more (removed in item 7
    // — roll+reg must never mint a PIN or a session). Sign-in needs a PIN.
    return Promise.resolve({
      success: false,
      message: 'Please sign in with your Board Roll + PIN. If your account has no PIN yet, please contact your administrator.'
    });
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

  // Self-service account-deletion request (signed-in): queues the request
  // with the server (POST /api/me/deletion-request). Personal data is
  // hard-erased when the request is processed; only anonymised academic
  // records are kept. The account stays usable until the admin processes it.
  const requestAccountDeletion = async (reason?: string): Promise<{ success: boolean; message: string }> => {
    const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    if (!tokenToUse) {
      return { success: false, message: 'Please sign in first.' };
    }
    try {
      const response = await apiFetch('/api/me/deletion-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenToUse}`
        },
        body: JSON.stringify({ reason: reason?.trim() || undefined })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        return { success: false, message: data.error || 'Could not send the deletion request. Please try again.' };
      }
      return { success: true, message: data.message || 'Your account deletion request has been queued.' };
    } catch {
      return { success: false, message: 'Could not connect to the server. Please try again.' };
    }
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
    password: string,
    pinToken?: string,
    options?: Pick<NetworkRetryOptions, 'onRetry'>
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // Render free tier sleeps after ~15 min idle: the first login attempt
      // often fails at the network level. Retry network failures only (2
      // more attempts, ~3s then ~8s); HTTP error responses (401/403/...)
      // are real answers and are never retried.
      const response = await fetchWithNetworkRetry(
        () =>
          apiFetch('/api/admin/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, ...(pinToken ? { pinToken } : {}) })
          }),
        { onRetry: options?.onRetry }
      );
      const data = await response.json();
      if (!response.ok || !data.success || !data.sessionToken || !data.admin) {
        return { success: false, message: data.error || 'System Administrator authentication failed.' };
      }

      applyAuthenticatedSystemAdmin(data.admin, data.sessionToken);
      return { success: true, message: data.message || 'Authenticated as System Administrator.' };
        } catch (error) {
      console.error('Admin authentication error:', error);
      // Never surface a raw JS error string (e.g. "Failed to fetch") to
      // the admin: after all retries, report a human-readable message.
      return {
        success: false,
        message: NETWORK_ERROR_MESSAGE
      };
    }
  };

  const adminBootstrap = async (
    bootstrapToken: string,
    name: string,
    email: string,
    password: string,
    pinToken?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await apiFetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bootstrapToken, name, email, password, ...(pinToken ? { pinToken } : {}) })
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
    pin: string,
    turnstile?: TurnstileProof
  ): Promise<{ success: boolean; message: string; teacher?: TeacherProfile }> => {
    try {
      const response = await apiFetch('/api/teachers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneOrEmail,
          pin,
          turnstileToken: turnstile?.token || undefined,
          turnstileEnabled: turnstile?.enabled || false
        })
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

  const teacherRegister = async (regData: any, turnstile?: TurnstileProof): Promise<{ success: boolean; message: string; teacher?: TeacherProfile }> => {
    try {
      const response = await apiFetch('/api/teachers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...regData,
          turnstileToken: turnstile?.token || undefined,
          turnstileEnabled: turnstile?.enabled || false
        })
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

  // Teacher profile save (B7): the server PUT is the source of truth
  // for phone / isGuideTeacher / guideTeacherCohort. The local profile
  // is only updated AFTER the server accepts the save — a 400/409
  // rejection or a network failure returns success:false and the screen
  // keeps the form open with the server message instead of claiming
  // the profile was saved.
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

    // Sync teacher profile with server-side teacher store FIRST.
    if (authToken) {
      try {
        const profileRes = await apiFetch('/api/teachers/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify(profileUpdates)
        });
        const profileData = await profileRes.json().catch(() => ({} as { error?: string }));
        if (!profileRes.ok) {
          return {
            success: false,
            message: profileData?.error || 'Could not save your teacher profile. Please try again.'
          };
        }
      } catch {
        return {
          success: false,
          message: 'Could not reach the server. Your teacher profile was not saved — check your connection and try again.'
        };
      }
    }

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

      const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
      const res = await apiFetch('/api/teacher-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {})
        },
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
      const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
      const response = await apiFetch('/api/teachers/change-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {})
        },
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

  // Guard against concurrent/duplicate in-flight loads of the server
  // captain-application list (the session trigger effect and the
  // post-mutation refreshes can otherwise fire at the same time).
  const captainApplicationsLoadInFlight = useRef(false);

  // Load captain applications from the server (`GET /api/captains`,
  // Bearer session token; role gating is server-side: admin sees all,
  // teacher sees own cohort, student sees own record only). Merge rule:
  // SERVER ROWS WIN by id; a LOCAL row with status `Pending` (e.g. an
  // offline submit) or `Approved` that the server does not have yet is
  // kept so it still shows. For students the own server record also
  // refreshes the profile (role + verification status). On any failure
  // (non-OK, network error) the local cache is kept silently — the list
  // is never wiped by a failed load, and a failed load never logs the
  // user out.
  const loadCaptainApplications = async (): Promise<boolean> => {
    if (captainApplicationsLoadInFlight.current) return false;
    const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    if (!tokenToUse) return false;
    captainApplicationsLoadInFlight.current = true;
    try {
      const res = await apiFetch('/api/captains', {
        headers: { Authorization: `Bearer ${tokenToUse}` }
      });
      if (!res.ok) {
        console.warn('Captain applications load failed:', res.status);
        return false;
      }
      const data = await res.json().catch(() => ({}));
      if (!data.success || !Array.isArray(data.applications)) {
        console.warn('Captain applications load failed: unexpected response.');
        return false;
      }
      const serverApps = data.applications as CaptainApplication[];
      const serverIds = new Set(serverApps.map(app => app.id));
      setApplications(prev => {
        // Server rows win by id. Keep a local row the server has not seen
        // yet when it is still Pending (e.g. an offline submit) or already
        // Approved — a failed or empty load must never wipe or downgrade
        // the local state.
        const keptLocal = prev.filter(
          app =>
            !serverIds.has(app.id) &&
            (app.status === 'Pending' || app.status === 'Approved')
        );
        return [...serverApps, ...keptLocal];
      });
      // Student self-refresh: if the server returned this student's own
      // record, refresh the profile from it, so an admin approval (or
      // rejection) shows up without a re-login. Only applies when a server
      // record actually exists and differs from the local profile; a
      // failed or empty load never touches the profile, and a failed load
      // never logs the user out (v1.0.22 rule: only 401/403 logs out).
      if (
        userProfile.accountType === 'student' ||
        userProfile.accountType === 'class_captain'
      ) {
        const ownRecord = serverApps.find(app => app.studentId === userProfile.id);
        if (ownRecord) {
          const nextAccountType = ownRecord.status === 'Approved' ? 'class_captain' : 'student';
          const nextStatus = ownRecord.status;
          if (
            userProfile.accountType !== nextAccountType ||
            userProfile.captainVerificationStatus !== nextStatus
          ) {
            setUserProfile(prev => ({
              ...prev,
              accountType: nextAccountType,
              captainVerificationStatus: nextStatus
            }));
          }
        }
      }
      return true;
    } catch (err) {
      console.warn('Captain applications load failed:', err);
      return false;
    } finally {
      captainApplicationsLoadInFlight.current = false;
    }
  };

  // Push one captain record to the server (`POST /api/captains/sync`).
  // Captain applications used to live in this device's local state only, so
  // the Guide Teacher and the Admin — on their own devices — never saw
  // them, and a teacher endorsement never reached the server record that
  // the admin approval guard reads. Best-effort: a failed sync never
  // blocks the local action; the healing effect below retries it.
  const syncCaptainRecordToServer = async (record: CaptainApplication): Promise<boolean> => {
    try {
      const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
      const res = await apiFetch('/api/captains/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {})
        },
        body: JSON.stringify({ captainRecord: record })
      });
      if (!res.ok) {
        console.warn('Captain record sync failed:', res.status);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Captain record sync failed:', err);
      return false;
    }
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
      phone: data.phone || userProfile.phone || '',
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
    // So the Guide Teacher and the Admin can see and act on this request
    // from any device, not just this one.
    void syncCaptainRecordToServer(newApp);
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
        // Reconcile with the server state after the decision.
        void loadCaptainApplications();
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

      // Push the updated record to the server as well, so the server record
      // stays in sync with this final approval.
      void syncCaptainRecordToServer({
        ...targetApp,
        status: 'Approved',
        teacherEndorsement: data.endorsement
      });

      // If applicant is currently logged in, update their account
      if (userProfile.id === targetApp.studentId) {
        setUserProfile(prev => ({
          ...prev,
          accountType: 'class_captain',
          captainVerificationStatus: 'Approved'
        }));
      }

      showToast(data.endorsement?.teacherName ? `Approved by ${data.endorsement.teacherName} — student is now a Class Captain.` : 'Captain approved.');
      // Reconcile with the server state after the decision.
      void loadCaptainApplications();
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
            notes: notes || 'Verified with departmental record.'
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
    // Reconcile with the server state after the decision.
    void loadCaptainApplications();
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
    // Reconcile with the server state after the decision.
    void loadCaptainApplications();
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
    // Reconcile with the server state after the decision.
    void loadCaptainApplications();
    return true;
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
      // Fail loudly (B4): a network failure must NOT save the period
      // locally and report success — the next feed refresh would wipe
      // it anyway. Keep the form/state unchanged and say so.
      const msg = 'Could not publish the routine period — check your connection and try again.';
      showToast(msg);
      return { success: false, message: msg };
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
      // Fail loudly (B4): do not apply the edit locally on network
      // failure — it would be discarded by the next feed refresh.
      const msg = 'Could not update the routine period — check your connection and try again.';
      showToast(msg);
      return { success: false, message: msg };
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
      // Fail loudly (B4): do not remove the period locally on network
      // failure — the server still has it.
      const msg = 'Could not delete the routine period — check your connection and try again.';
      showToast(msg);
      return { success: false, message: msg };
    }
  };

  const setFullRoutine = (periods: RoutinePeriod[]) => {
    setAllStoredRoutines(sanitizeStoredRoutineList(periods));
  };

  // Server-side routine documents (B3): list the stored documents for
  // this cohort. A failed load keeps the previous list silently — the
  // list is a read view, never wiped by a failed load.
  const loadRoutineDocuments = async (): Promise<void> => {
    const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    if (!tokenToUse) return;
    try {
      const res = await apiFetch('/api/routines/documents', {
        headers: { Authorization: `Bearer ${tokenToUse}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && Array.isArray(data.documents)) {
        setRoutineDocuments(data.documents as ServerRoutineDocument[]);
      }
    } catch {
      // keep the previous list
    }
  };

  const uploadRoutineDocument = async (
    fileName: string,
    fileType: 'IMAGE' | 'PDF',
    dataUrl: string,
    cohort?: { semester: StudentProfile['semester']; shift: Shift; section: Section }
  ): Promise<UploadedRoutineDocument | null> => {
    const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    if (!tokenToUse) {
      showToast('Please sign in again to upload a routine file.');
      return null;
    }
    const mimeMatch = dataUrl.match(/^data:([^;,]+)[;,]/);
    const mimeType =
      fileType === 'PDF'
        ? 'application/pdf'
        : mimeMatch?.[1] || 'image/jpeg';
    const base64Data = dataUrl.includes(',') ? dataUrl.split(',').slice(1).join(',') : dataUrl;
    // The cohort the document belongs to: the caller passes the
    // currently-displayed cohort (ClassRoutineScreen). Teachers MUST
    // send it — their session carries no cohort, so the server 400s
    // without semester/shift/section. Captains are session-derived.
    const docSemester = cohort?.semester ?? userProfile.semester;
    const docShift = cohort?.shift ?? selectedShift;
    const docSection = cohort?.section ?? selectedSection;
    try {
      const res = await apiFetch('/api/routines/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenToUse}`
        },
        body: JSON.stringify({ fileName, mimeType, base64_data: base64Data, semester: docSemester, shift: docShift, section: docSection })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.document) {
        const errMsg = data?.error || 'Could not upload the routine file. Please try again.';
        showToast(errMsg);
        return null;
      }
      const serverDoc = data.document as ServerRoutineDocument;
      const colObj = resolveStrictCollege(userProfile.college);
      const deptObj = resolveStrictTechnology(userProfile.department);
      // The local copy keeps the bytes in memory for this session's OCR
      // and original-viewer; the id is now the server id and the
      // downloadUrl fetches the stored bytes back later.
      const newDoc: UploadedRoutineDocument = {
        id: serverDoc.id,
        fileName: serverDoc.fileName,
        fileType,
        dataUrl,
        uploadedAt: serverDoc.createdAt
          ? new Date(serverDoc.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          : `${new Date().toLocaleDateString('en-GB')}, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        uploadedBy: userProfile.name,
        extractedPeriodsCount: 0,
        isConfirmed: false,
        college_id: colObj?.id || null,
        department_id: deptObj?.id || null,
        semester: docSemester,
        shift: docShift,
        section: docSection,
        downloadUrl: serverDoc.downloadUrl,
        sizeBytes: serverDoc.sizeBytes
      };

      uploadedRoutinesRef.current = [newDoc, ...uploadedRoutinesRef.current];
      setUploadedRoutines(prev => [newDoc, ...prev]);
      setRoutineDocuments(prev => [serverDoc, ...prev.filter(d => d.id !== serverDoc.id)]);
      showToast(`Routine file "${fileName}" uploaded. Scanning document...`);
      return newDoc;
    } catch {
      // Fail loudly (B3): do not add the document to the list on a
      // network failure — the server never got the bytes.
      const msg = 'Could not upload the routine file — check your connection and try again.';
      showToast(msg);
      return null;
    }
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
      // Fail loudly (audit fail-loudly family): a publish-batch
      // failure must NOT save locally and claim success — the server
      // never got the periods, and the next feed refresh would discard
      // them. The form/state stays unchanged so the user can retry.
      const msg = 'Could not publish the confirmed timetable — check your connection and try again.';
      showToast(msg);
      return { success: false, message: msg };
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
      // Fail loudly (B11): do not invent a local note and claim it was
      // published — the server never got it and the next feed refresh
      // would wipe it. Keep the form open (the caller decides that from
      // the returned success:false).
      const msg = 'Could not publish the note — check your connection and try again.';
      showToast(msg);
      return { success: false, message: msg };
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
      // Fail loudly (B12): no local asg_* record, no success toast.
      const msg = 'Could not publish the assignment — check your connection and try again.';
      showToast(msg);
      return { success: false, message: msg };
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
      // Fail loudly (B12): do not flip the local assignment to
      // 'Submitted' — the server never recorded the submission.
      const msg = 'Could not submit the assignment — check your connection and try again.';
      showToast(msg);
      return { success: false, message: msg };
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
      // Fail loudly (B13): no local job_* record — the list the screen
      // renders comes from the server, so a local-only job would be
      // simultaneously "published" and invisible.
      const msg = 'Could not publish the job circular — check your connection and try again.';
      showToast(msg);
      return { success: false, message: msg };
    }
  };

  // 5. REMINDERS & TEACHERS — server-synced (B2). The server is the
  // source of truth after the first sync; localStorage is only a cache
  // so reminders survive offline. On first login, local-only reminders
  // are uploaded (matched by id) so none are lost. Every mutation goes
  // through the server first and fails loudly on network failure —
  // never silently kept local-only.
  const reminderAuthHeaders = (): Record<string, string> => {
    const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    return {
      'Content-Type': 'application/json',
      ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {})
    };
  };

  const normalizeReminder = (raw: any): ReminderItem | null => {
    if (!raw || typeof raw !== 'object' || !raw.id || !raw.title) return null;
    return {
      id: String(raw.id),
      title: String(raw.title),
      category: raw.category || 'Personal',
      dueDate: String(raw.dueDate || ''),
      dueTime: String(raw.dueTime || ''),
      priority: raw.priority || 'Normal',
      isCompleted: Boolean(raw.isCompleted),
      note: raw.note,
      college_id: raw.college_id,
      department_id: raw.department_id,
      semester: raw.semester,
      shift: raw.shift,
      section: raw.section,
      routineId: raw.routineId
    };
  };

  const loadReminders = async (): Promise<boolean> => {
    const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    if (!tokenToUse) return false;
    try {
      const res = await apiFetch('/api/reminders', { headers: reminderAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !Array.isArray(data.reminders)) {
        showToast('Could not load your reminders from the server — showing this device’s copy.');
        return false;
      }
      const serverReminders = (data.reminders as any[])
        .map(normalizeReminder)
        .filter((r): r is ReminderItem => r !== null);
      const serverIds = new Set(serverReminders.map(r => r.id));
      // First-login upload: any reminder that only exists on this
      // device is POSTed to the server (matched by id) so it is not lost.
      let localOnly: ReminderItem[] = [];
      try {
        const savedRaw = localStorage.getItem(`${STORAGE_KEY_PREFIX}reminders`);
        if (savedRaw) {
          localOnly = (JSON.parse(savedRaw) as ReminderItem[]).filter(
            r => r && r.id && !serverIds.has(r.id)
          );
        }
      } catch {
        localOnly = [];
      }
      const uploaded: ReminderItem[] = [];
      let uploadFailures = 0;
      for (const local of localOnly) {
        try {
          const upRes = await apiFetch('/api/reminders', {
            method: 'POST',
            headers: reminderAuthHeaders(),
            body: JSON.stringify(local)
          });
          const upData = await upRes.json().catch(() => ({}));
          if (upRes.ok && upData.success) {
            uploaded.push(normalizeReminder(upData.reminder || local) || local);
          } else {
            uploadFailures += 1;
            uploaded.push(local);
          }
        } catch {
          uploadFailures += 1;
          uploaded.push(local);
        }
      }
      if (uploadFailures > 0) {
        showToast('Some reminders could not be uploaded to the server yet — they are kept on this device.');
      }
      setReminders([...serverReminders, ...uploaded]);
      return true;
    } catch {
      showToast('Could not load your reminders from the server — showing this device’s copy.');
      return false;
    }
  };

  // Sync reminders once per signed-in account (login + session restore).
  const remindersSyncKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isLoggedIn || !authToken || !userProfile.id) return;
    const key = `${userProfile.id}:${authToken.slice(-8)}`;
    if (remindersSyncKeyRef.current === key) return;
    remindersSyncKeyRef.current = key;
    void loadReminders();
    // loadReminders is defined above; the effect only runs after render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, authToken, userProfile.id]);

  const addReminder = async (
    remData: Omit<ReminderItem, 'id' | 'isCompleted'>
  ): Promise<{ success: boolean; message: string }> => {
    const newRem: ReminderItem = {
      ...remData,
      id: `rem_${Date.now()}`,
      isCompleted: false
    };
    try {
      const res = await apiFetch('/api/reminders', {
        method: 'POST',
        headers: reminderAuthHeaders(),
        body: JSON.stringify(newRem)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        const errMsg = data?.error || 'Could not save the reminder. Please try again.';
        showToast(errMsg);
        return { success: false, message: errMsg };
      }
      const saved = normalizeReminder(data.reminder) || newRem;
      setReminders(prev => [saved, ...prev.filter(r => r.id !== saved.id)]);
      nativeService.scheduleCustomReminder(saved.title, saved.note || saved.title, saved.dueDate);
      showToast('Reminder scheduled!');
      return { success: true, message: 'Reminder scheduled.' };
    } catch {
      const msg = 'Could not save the reminder — check your connection and try again.';
      showToast(msg);
      return { success: false, message: msg };
    }
  };

  const toggleReminder = async (id: string): Promise<{ success: boolean; message: string }> => {
    const current = reminders.find(r => r.id === id);
    if (!current) return { success: false, message: 'Reminder not found.' };
    const next = !current.isCompleted;
    try {
      const res = await apiFetch(`/api/reminders/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: reminderAuthHeaders(),
        body: JSON.stringify({ ...current, isCompleted: next })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        const errMsg = data?.error || 'Could not update the reminder. Please try again.';
        showToast(errMsg);
        return { success: false, message: errMsg };
      }
      setReminders(prev => prev.map(r => (r.id === id ? { ...r, isCompleted: next } : r)));
      showToast(next ? 'Marked as completed!' : 'Marked as pending.');
      return { success: true, message: 'Reminder updated.' };
    } catch {
      const msg = 'Could not update the reminder — check your connection and try again.';
      showToast(msg);
      return { success: false, message: msg };
    }
  };

  const deleteReminder = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiFetch(`/api/reminders/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: reminderAuthHeaders()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        const errMsg = data?.error || 'Could not delete the reminder. Please try again.';
        showToast(errMsg);
        return { success: false, message: errMsg };
      }
      setReminders(prev => prev.filter(p => p.id !== id));
      showToast('Reminder deleted.');
      return { success: true, message: 'Reminder deleted.' };
    } catch {
      const msg = 'Could not delete the reminder — check your connection and try again.';
      showToast(msg);
      return { success: false, message: msg };
    }
  };

  const addTeacher = async (teacherData: Omit<TeacherContact, 'id'>): Promise<{ success: boolean; message: string }> => {
    // 1. Client-side RBAC check: Student accounts cannot add contacts
    if (userProfile.accountType === 'student') {
      showToast('Forbidden: Students have read-only access to the Faculty Directory.');
      return { success: false, message: 'Student accounts cannot add teacher contacts.' };
    }

    try {
      const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
      const response = await apiFetch('/api/teacher-contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {})
        },
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
    } catch {
      // Fail loudly (audit fail-loudly family): a failed create must
      // NOT add a local-only contact and claim success — the server
      // never got it, and the next directory refresh would drop it.
      const msg = 'Could not add the teacher contact — check your connection and try again.';
      showToast(msg);
      return { success: false, message: msg };
    }
  };

  const archiveTeacherContact = async (contactId: string, reason: string): Promise<{ success: boolean; message: string }> => {
    if (userProfile.accountType === 'student') {
      showToast('Forbidden: Students cannot remove teacher contacts.');
      return { success: false, message: 'Students cannot remove contacts.' };
    }

    try {
      const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
      const response = await apiFetch(`/api/teacher-contacts/${contactId}/archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {})
        },
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

  // Admin / authorized edit of ANY teacher contact (PUT). Students are
  // read-only; the server enforces captain scope and teacher ownership,
  // while system_admin has full access to every contact.
  const updateTeacherContact = async (
    contactId: string,
    updates: Partial<TeacherContact>
  ): Promise<{ success: boolean; message: string }> => {
    if (userProfile.accountType === 'student') {
      showToast('Forbidden: Students have read-only access to the Faculty Directory.');
      return { success: false, message: 'Students cannot edit teacher contacts.' };
    }

    try {
      const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
      const response = await apiFetch(`/api/teacher-contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {})
        },
        body: JSON.stringify({
          requesterRole: userProfile.accountType,
          requesterId: userProfile.id,
          requesterName: userProfile.name,
          requesterCollege: userProfile.college,
          requesterDepartment: userProfile.department,
          updates: {
            name: updates.name,
            designation: updates.designation,
            phone: updates.phone,
            email: updates.email,
            room: updates.room,
            consultingHours: updates.consultingHours,
            subject: updates.subject,
            college: (updates as { collegeName?: string }).collegeName,
            department: updates.department
          }
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        showToast(data.error || 'Failed to update teacher contact.');
        return { success: false, message: data.error || 'Update failed.' };
      }

      // Server contacts carry `college`; the client shape uses `collegeName`.
      setTeachers(prev => prev.map(t => {
        if (t.id !== contactId) return t;
        const updated = data.contact || {};
        return {
          ...t,
          ...updated,
          collegeName: updated.college ?? (updates as { collegeName?: string }).collegeName ?? t.collegeName,
          id: contactId
        };
      }));
      showToast(data.message || 'Teacher contact updated.');
      return { success: true, message: data.message };
    } catch (err) {
      showToast('Failed to reach update service.');
      return { success: false, message: 'Server communication error.' };
    }
  };

  // Announcements (B5): real server posts (POST /api/announcements,
  // teacher/class_captain only) + cohort feed (GET /api/announcements).
  // The old local-only addAnnouncement + its success toast are gone:
  // success is only reported when the server stores the post.
  const normalizeAnnouncement = (raw: any, fallbackPriority: 'Important' | 'Normal' = 'Normal'): ClassAnnouncement | null => {
    if (!raw || typeof raw !== 'object' || !raw.id) return null;
    const created = raw.createdAt ? new Date(raw.createdAt) : null;
    return {
      id: String(raw.id),
      authorName: String(raw.authorName || 'Class Captain'),
      authorRole: String(raw.authorRole || ''),
      title: String(raw.title || 'Notice'),
      content: String(raw.text ?? raw.content ?? ''),
      postedAt:
        created && !Number.isNaN(created.getTime())
          ? `${created.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : String(raw.postedAt || 'Just now'),
      priority: fallbackPriority,
      isPinned: Boolean(raw.isPinned)
    };
  };

  const loadAnnouncements = async (): Promise<boolean> => {
    const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    if (!tokenToUse) return false;
    try {
      const res = await apiFetch('/api/announcements', {
        headers: { Authorization: `Bearer ${tokenToUse}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !Array.isArray(data.announcements)) return false;
      const serverAnns = (data.announcements as any[])
        .map(a => normalizeAnnouncement(a))
        .filter((a): a is ClassAnnouncement => a !== null);
      setAnnouncements(serverAnns);
      return true;
    } catch {
      // Keep the local cache on a failed load — never wipe the feed.
      return false;
    }
  };

  const addAnnouncement = async (
    title: string,
    content: string,
    priority: 'Important' | 'Normal',
    cohort?: { semester: number; shift: Shift; section: Section }
  ): Promise<{ success: boolean; message: string }> => {
    const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    if (!tokenToUse) {
      const msg = 'Please sign in again to publish an announcement.';
      showToast(msg);
      return { success: false, message: msg };
    }
    try {
      const res = await apiFetch('/api/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenToUse}`
        },
        // Teachers must target a cohort explicitly (their session
        // carries no cohort — the server 400s without semester/shift/
        // section). Captains are session-derived and ignore these.
        body: JSON.stringify({ title, text: content, ...(cohort ? { semester: cohort.semester, shift: cohort.shift, section: cohort.section } : {}) })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.announcement) {
        const errMsg = data?.error || 'Could not publish the announcement. Please try again.';
        showToast(errMsg);
        return { success: false, message: errMsg };
      }
      const posted = normalizeAnnouncement(data.announcement, priority) || {
        id: String(data.announcement.id),
        authorName: userProfile.name,
        authorRole: `${userProfile.accountType === 'class_captain' ? 'Class Captain' : 'Student'} - Sec ${userProfile.section}`,
        title,
        content,
        postedAt: 'Just now',
        priority,
        isPinned: priority === 'Important'
      };
      setAnnouncements(prev => [posted, ...prev.filter(a => a.id !== posted.id)]);
      nativeService.broadcastAnnouncementAlert(title, content, userProfile.name);
      showToast('Announcement published to your class!');
      return { success: true, message: data.message || 'Announcement published.' };
    } catch {
      const msg = 'Could not publish the announcement — check your connection and try again.';
      showToast(msg);
      return { success: false, message: msg };
    }
  };

  // Student profile fields (B1): one PATCH /api/me/profile call for
  // name/phone/session/regulation/shift/section (+ subjects /
  // notifications). Returns success:false with the server message on
  // 400/409 (e.g. an Approved captain changing section/shift) and on
  // network failure; the caller keeps the form open.
  const updateStudentProfileFields = async (fields: {
    name?: string;
    phone?: string;
    session?: string;
    regulation?: string;
    semester?: number;
    shift?: Shift;
    section?: Section;
    enrolledSubjects?: { code: string; name: string }[];
    notifications?: NotificationPreferences;
  }): Promise<{ success: boolean; message: string }> => {
    const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
    if (!tokenToUse) {
      return { success: false, message: 'Please sign in again to save your profile.' };
    }
    try {
      const res = await apiFetch('/api/me/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenToUse}`
        },
        body: JSON.stringify(fields)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return {
          success: false,
          message: data?.error || 'Could not save your profile. Please try again.'
        };
      }
      const saved = (data.profile || {}) as Record<string, unknown>;
      setUserProfile(prev => ({
        ...prev,
        ...(fields.name !== undefined ? { name: fields.name } : {}),
        ...(fields.phone !== undefined ? { phone: fields.phone } : {}),
        ...(fields.session !== undefined ? { session: fields.session } : {}),
        ...(fields.regulation !== undefined ? { regulation: fields.regulation as StudentProfile['regulation'] } : {}),
        ...(fields.semester !== undefined ? { semester: fields.semester as StudentProfile['semester'] } : {}),
        ...(fields.shift !== undefined ? { shift: fields.shift } : {}),
        ...(fields.section !== undefined ? { section: fields.section } : {}),
        ...(fields.enrolledSubjects !== undefined ? { enrolledSubjects: fields.enrolledSubjects } : {}),
        ...(typeof saved.name === 'string' ? { name: saved.name } : {}),
        ...(typeof saved.phone === 'string' ? { phone: saved.phone } : {}),
        ...(typeof saved.session === 'string' ? { session: saved.session } : {}),
        ...(typeof saved.semester === 'number' ? { semester: saved.semester as StudentProfile['semester'] } : {}),
        ...(typeof saved.shift === 'string' ? { shift: saved.shift as Shift } : {}),
        ...(typeof saved.section === 'string' ? { section: saved.section as Section } : {}),
        ...(Array.isArray(saved.enrolledSubjects)
          ? { enrolledSubjects: saved.enrolledSubjects as { code: string; name: string }[] }
          : {})
      }));
      if (fields.notifications) {
        setNotifications(prev => ({ ...prev, ...fields.notifications }));
      } else if (saved.notifications && typeof saved.notifications === 'object') {
        setNotifications(prev => ({ ...prev, ...(saved.notifications as Partial<NotificationPreferences>) }));
      }
      return { success: true, message: data.message || 'Profile updated.' };
    } catch {
      return {
        success: false,
        message: 'Could not reach the server. Your profile was not saved — check your connection and try again.'
      };
    }
  };

  // Notification preferences (B6): apply locally at once, then persist
  // the merged preferences via PATCH /api/me/profile (debounced, so
  // dragging the lead-time slider does not fire a request per step).
  // A failed save keeps the local choice and says so honestly.
  const notificationsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateNotifications = (updates: Partial<NotificationPreferences>) => {
    const merged = { ...notifications, ...updates };
    setNotifications(merged);
    showToast('Notification preferences updated.');
    if (notificationsSaveTimer.current) clearTimeout(notificationsSaveTimer.current);
    notificationsSaveTimer.current = setTimeout(() => {
      const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
      if (!tokenToUse) return;
      apiFetch('/api/me/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenToUse}`
        },
        body: JSON.stringify({ notifications: merged })
      })
        .then(async res => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.success) {
            showToast(data?.error || 'Could not save notification preferences to the server — they are saved on this device only.');
          }
        })
        .catch(() => {
          showToast('Could not save notification preferences to the server — they are saved on this device only.');
        });
    }, 600);
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
      const tokenToUse = authToken || localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_token`);
      const res = await apiFetch('/api/schedule-config/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tokenToUse ? { Authorization: `Bearer ${tokenToUse}` } : {})
        },
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
        verifySmsCode,
        resendSmsCode,
        socialLogin,
        logout,
        requestAccountDeletion,
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
        routineDocuments,
        loadRoutineDocuments,
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
        loadReminders,
        teachers,
        addTeacher,
        updateTeacherContact,
        archiveTeacherContact,
        // Payments are currently disabled, so Teacher Contacts are free for everyone.
        isTeacherContactUnlocked: true,
        isTeacherContactAccessLocked,
        updateTeacherContactAccessLock,
        applications,
        loadCaptainApplications,
        submitCaptainApplication,
        teacherEndorseApplication,
        adminApproveApplication,
        adminRejectApplication,
        adminRevokeApplication,
        getVerifiedCaptainsCount,
        announcements,
        addAnnouncement,
        loadAnnouncements,
        updateStudentProfileFields,
        notifications,
        updateNotifications,
        selectedShift,
        setSelectedShift,
        selectedSection,
        setSelectedSection,
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
