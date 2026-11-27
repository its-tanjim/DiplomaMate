import { 
  RoutinePeriod, 
  SemesterSubject,
  ClassAnnouncement,
  NotificationPreferences 
} from '../types';

export {
  COLLEGES_DIRECTORY,
  TECHNOLOGIES_DIRECTORY,
  normalizeCollege,
  normalizeTechnology,
  resolveStrictCollege,
  resolveStrictTechnology,
  getCurriculumSubjects
} from './directoryData';

import { COLLEGES_DIRECTORY, TECHNOLOGIES_DIRECTORY } from './directoryData';

export const LEGACY_DEMO_CONTENT_IDS: Record<
  'notes' | 'assignments' | 'assignmentSubmissions' | 'reminders' | 'teachers' | 'jobs' | 'notices',
  readonly string[]
> = {
  notes: ['note_1', 'note_2', 'note_3', 'note_4', 'note_5'],
  assignments: ['asg_1', 'asg_2', 'asg_3', 'asg_4'],
  assignmentSubmissions: ['sub_seed_asg_3_std_01', 'sub_seed_asg_3_cr_01', 'sub_seed_asg_1_cr_01'],
  reminders: ['rem_1', 'rem_2', 'rem_3', 'rem_4', 'rem_5'],
  teachers: ['tch_1', 'tch_2', 'tch_3', 'tch_4', 'tch_5', 'tch_6'],
  // Invented sample job circulars removed 2026-11-24 (see INITIAL_JOBS note above).
  jobs: ['job_01', 'job_02', 'job_03', 'job_04', 'job_05', 'job_06'],
  // Invented sample campus notices removed 2026-11-24 (see INITIAL_CAMPUS_NOTICES
  // note below) — same fake-content pattern as the removed seed jobs.
  notices: ['cnotice_01', 'cnotice_02', 'cnotice_03']
};

export const POLYTECHNIC_COLLEGES = COLLEGES_DIRECTORY.map(c => c.name);

export const DEPARTMENTS = TECHNOLOGIES_DIRECTORY.map(t => t.name);


export const SESSIONS = [
  '2021-2022',
  '2022-2023',
  '2023-2024',
  '2024-2025',
  '2025-2026'
];

export const INITIAL_APPLICATIONS: any[] = [];

// No seeded job circulars (item 5 notes-trustworthiness audit, 2026-11-24).
// The previous six entries (job_01..job_06) were invented sample listings:
// plausible companies/salaries/deadlines with generic career-page links,
// falsely labelled "Careerjet Bangladesh", all expired by late Nov 2026.
// Per the user rule (notes/jobs only from trustworthy sources, with a real
// apply link), jobs now start empty and are filled only by the live
// Careerjet Partner API feed (when CAREERJET_API_KEY is set) or by a
// Placement Cell / teacher / captain post carrying a real apply URL.
// LEGACY_DEMO_CONTENT_IDS.jobs below heals stores that still hold job_01..06.
export const INITIAL_JOBS: any[] = [];

// No seeded campus notices (follow-up to item 5 notes-trustworthiness audit, 2026-11-24).
// The previous three entries (cnotice_01..cnotice_03) were invented demo notices:
// a fabricated mid-term schedule, class test and attachment-form notice with
// plausible teacher/captain publishers and a dead PDF attachment URL, all
// expired by late Nov 2026. Per the user rule (notes/notices only from
// trustworthy sources), notices now start empty and are filled only by real
// admin / teacher / captain posts. LEGACY_DEMO_CONTENT_IDS.notices above
// heals stores that still hold cnotice_01..03.
export const INITIAL_CAMPUS_NOTICES: any[] = [];

// No seeded announcements (compliance audit 2026-11-26, §6 item 2).
// The previous entry (ann_1) was an invented class-test notice attributed to
// a named class captain with a permanently stale timestamp.
// Announcements now start empty and are filled only by real teacher /
// captain posts. LEGACY_DEMO_CONTENT_IDS does not list ann_1; old cached
// copies are purged by the healing filter in AppContext.
export const INITIAL_ANNOUNCEMENTS: ClassAnnouncement[] = [];


// No seeded routine (compliance audit 2026-11-26, §6 item 3).
// The previous entries were an invented Saturday–Thursday timetable naming
// real teachers' names with fabricated rooms/times, shown to new users
// as if real. Routines now start
// empty and are filled only by real teacher / captain entries.
const RAW_INITIAL_ROUTINE: RoutinePeriod[] = [];

export const INITIAL_ROUTINE: RoutinePeriod[] = [];

export const SEMESTER_CURRICULUM: Record<number, SemesterSubject[]> = {
  6: [
    {
      code: '66661',
      name: 'Web Development Project',
      credits: 3,
      theoryContinuous: 40,
      theoryFinal: 60,
      practicalContinuous: 25,
      practicalFinal: 25,
      totalMarks: 150,
      type: 'Core'
    },
    {
      code: '66662',
      name: 'Microprocessor & Interfacing',
      credits: 4,
      theoryContinuous: 60,
      theoryFinal: 90,
      practicalContinuous: 25,
      practicalFinal: 25,
      totalMarks: 200,
      type: 'Core'
    },
    {
      code: '66663',
      name: 'Surveillance & Security System',
      credits: 3,
      theoryContinuous: 40,
      theoryFinal: 60,
      practicalContinuous: 25,
      practicalFinal: 25,
      totalMarks: 150,
      type: 'Core'
    },
    {
      code: '66664',
      name: 'Database Management System',
      credits: 4,
      theoryContinuous: 60,
      theoryFinal: 90,
      practicalContinuous: 25,
      practicalFinal: 25,
      totalMarks: 200,
      type: 'Core'
    },
    {
      code: '66665',
      name: 'Data Communication & Networking',
      credits: 3,
      theoryContinuous: 40,
      theoryFinal: 60,
      practicalContinuous: 25,
      practicalFinal: 25,
      totalMarks: 150,
      type: 'Core'
    },
    {
      code: '65852',
      name: 'Industrial Management',
      credits: 2,
      theoryContinuous: 40,
      theoryFinal: 60,
      practicalContinuous: 0,
      practicalFinal: 0,
      totalMarks: 100,
      type: 'Support'
    }
  ]
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationPreferences = {
  routineAlerts: true,
  routineLeadMinutes: 15,
  assignmentAlerts: true,
  crAnnouncements: true,
  btebNotices: true,
  soundVibration: true
};

export interface EnrolledStudent {
  id: string;
  name: string;
  email?: string;
  classRoll: string;
  boardRoll: string;
  regNumber: string;
  college: string;
  department: string;
  semester: number;
  shift: 'Morning' | 'Day';
  section: 'A1' | 'B1' | 'A2' | 'B2';
  phone: string;
  accountType: 'student' | 'class_captain';
  captainVerificationStatus: 'Approved' | 'Pending' | 'NotApplied' | 'Rejected';
  attendanceRate: string;
  createdAt?: string;
  isRegisteredAccount?: boolean;
  // Student login PIN (PBKDF2-SHA256, 100,000 iterations = v2).
  // Never sent to the client — see sanitizeStudent() in server.ts.
  pinHash?: string;
  pinSalt?: string;
  pinHashVersion?: number;
  // Enrolled semester subjects, chosen in Profile → Edit Profile.
  // Persisted on the server (PATCH /api/me/profile); the client merges
  // them in applyStudentSession so a fresh login never wipes a selection.
  enrolledSubjects?: { code: string; name: string }[];
}

// No seeded students (compliance audit 2026-11-26, §6 item 1).
// The previous 14 entries were invented people with real-looking board
// rolls, registration numbers and phone numbers, presented as a genuine
// roster. The roster now starts empty and is filled only by real registered
// accounts. The EnrolledStudent type above is kept for the roster shape.
export const MOCK_ENROLLED_STUDENTS: EnrolledStudent[] = [];
