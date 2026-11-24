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
  '2024-2025'
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

export const INITIAL_ANNOUNCEMENTS: ClassAnnouncement[] = [
  {
    id: 'ann_1',
    authorName: 'Nusrat Jahan (CR)',
    authorRole: 'Class Captain - CST 6th Sem A1',
    title: '📢 2nd Class Test on Microprocessor & Interfacing (66662)',
    content: 'All students are requested to prepare Chapter 3 & 4 (8086 Pin diagram and Memory segmentation) for tomorrow\'s 3rd period test. Sir informed that attendance is mandatory.',
    postedAt: 'Today, 07:45 AM',
    priority: 'Important',
    isPinned: true
  }
];


const RAW_INITIAL_ROUTINE: RoutinePeriod[] = [
  // SATURDAY - Morning
  {
    id: 'r_sat_1',
    day: 'Saturday',
    periodNumber: 1,
    startTime: '08:00 AM',
    endTime: '08:45 AM',
    subjectCode: '66661',
    subjectName: 'Web Development Project (Theory)',
    teacherName: 'Engr. Md. Rafiqul Islam',
    room: 'Room 304 (Academic Bldg 2)',
    type: 'Theory',
    shift: 'Morning',
    section: 'A1'
  },
  {
    id: 'r_sat_2',
    day: 'Saturday',
    periodNumber: 2,
    startTime: '08:45 AM',
    endTime: '09:30 AM',
    subjectCode: '66662',
    subjectName: 'Microprocessor & Interfacing',
    teacherName: 'Engr. Shamima Nasrin',
    room: 'Room 304 (Academic Bldg 2)',
    type: 'Theory',
    shift: 'Morning',
    section: 'A1'
  },
  {
    id: 'r_sat_3',
    day: 'Saturday',
    periodNumber: 3,
    startTime: '09:30 AM',
    endTime: '10:15 AM',
    subjectCode: '66663',
    subjectName: 'Surveillance & Security System',
    teacherName: 'Engr. Tanmoy Roy',
    room: 'Room 304 (Academic Bldg 2)',
    type: 'Theory',
    shift: 'Morning',
    section: 'A1'
  },
  {
    id: 'r_sat_4',
    day: 'Saturday',
    periodNumber: 4,
    startTime: '10:45 AM',
    endTime: '12:15 PM',
    subjectCode: '66661',
    subjectName: 'Web Development Project (Lab)',
    teacherName: 'Engr. Md. Rafiqul Islam',
    room: 'Software Lab 402',
    type: 'Practical / Lab',
    shift: 'Morning',
    section: 'A1'
  },
  {
    id: 'r_sat_5',
    day: 'Saturday',
    periodNumber: 5,
    startTime: '12:15 PM',
    endTime: '01:15 PM',
    subjectCode: '65852',
    subjectName: 'Industrial Management',
    teacherName: 'Md. Abdur Rahim (Associate Prof.)',
    room: 'Room 202 (Main Bldg)',
    type: 'Theory',
    shift: 'Morning',
    section: 'A1'
  },

  // SUNDAY - Morning
  {
    id: 'r_sun_1',
    day: 'Sunday',
    periodNumber: 1,
    startTime: '08:00 AM',
    endTime: '08:45 AM',
    subjectCode: '66664',
    subjectName: 'Database Management System',
    teacherName: 'Engr. Mahbubur Rahman',
    room: 'Room 304',
    type: 'Theory',
    shift: 'Morning',
    section: 'A1'
  },
  {
    id: 'r_sun_2',
    day: 'Sunday',
    periodNumber: 2,
    startTime: '08:45 AM',
    endTime: '10:15 AM',
    subjectCode: '66662',
    subjectName: 'Microprocessor Hardware Lab',
    teacherName: 'Engr. Shamima Nasrin',
    room: 'Hardware Lab 308',
    type: 'Practical / Lab',
    shift: 'Morning',
    section: 'A1'
  },
  {
    id: 'r_sun_3',
    day: 'Sunday',
    periodNumber: 3,
    startTime: '10:45 AM',
    endTime: '11:30 AM',
    subjectCode: '66665',
    subjectName: 'Data Communication & Networking',
    teacherName: 'Engr. Kazi Farhan',
    room: 'Room 304',
    type: 'Theory',
    shift: 'Morning',
    section: 'A1'
  },
  {
    id: 'r_sun_4',
    day: 'Sunday',
    periodNumber: 4,
    startTime: '11:30 AM',
    endTime: '01:00 PM',
    subjectCode: '66665',
    subjectName: 'Networking CISCO Packet Tracer Lab',
    teacherName: 'Engr. Kazi Farhan',
    room: 'Network Lab 405',
    type: 'Practical / Lab',
    shift: 'Morning',
    section: 'A1'
  },

  // MONDAY - Morning
  {
    id: 'r_mon_1',
    day: 'Monday',
    periodNumber: 1,
    startTime: '08:00 AM',
    endTime: '08:45 AM',
    subjectCode: '66663',
    subjectName: 'Surveillance & Security System',
    teacherName: 'Engr. Tanmoy Roy',
    room: 'Room 304',
    type: 'Theory',
    shift: 'Morning',
    section: 'A1'
  },
  {
    id: 'r_mon_2',
    day: 'Monday',
    periodNumber: 2,
    startTime: '08:45 AM',
    endTime: '10:15 AM',
    subjectCode: '66664',
    subjectName: 'SQL & Database Lab Practice',
    teacherName: 'Engr. Mahbubur Rahman',
    room: 'Database Lab 401',
    type: 'Practical / Lab',
    shift: 'Morning',
    section: 'A1'
  },
  {
    id: 'r_mon_3',
    day: 'Monday',
    periodNumber: 3,
    startTime: '10:45 AM',
    endTime: '11:30 AM',
    subjectCode: '65852',
    subjectName: 'Industrial Management',
    teacherName: 'Md. Abdur Rahim',
    room: 'Room 202',
    type: 'Theory',
    shift: 'Morning',
    section: 'A1'
  },
  {
    id: 'r_mon_4',
    day: 'Monday',
    periodNumber: 4,
    startTime: '11:30 AM',
    endTime: '12:30 PM',
    subjectCode: '66661',
    subjectName: 'React & Full-Stack Web Lab',
    teacherName: 'Engr. Md. Rafiqul Islam',
    room: 'Software Lab 402',
    type: 'Practical / Lab',
    shift: 'Morning',
    section: 'A1'
  },

  // TUESDAY - Morning
  {
    id: 'r_tue_1',
    day: 'Tuesday',
    periodNumber: 1,
    startTime: '08:00 AM',
    endTime: '08:45 AM',
    subjectCode: '66662',
    subjectName: 'Microprocessor & Interfacing',
    teacherName: 'Engr. Shamima Nasrin',
    room: 'Room 304',
    type: 'Theory',
    shift: 'Morning',
    section: 'A1'
  },
  {
    id: 'r_tue_2',
    day: 'Tuesday',
    periodNumber: 2,
    startTime: '08:45 AM',
    endTime: '09:30 AM',
    subjectCode: '66665',
    subjectName: 'Data Communication & Networking',
    teacherName: 'Engr. Kazi Farhan',
    room: 'Room 304',
    type: 'Theory',
    shift: 'Morning',
    section: 'A1'
  },
  {
    id: 'r_tue_3',
    day: 'Tuesday',
    periodNumber: 3,
    startTime: '09:30 AM',
    endTime: '11:00 AM',
    subjectCode: '66663',
    subjectName: 'CCTV & Biometric Practical Lab',
    teacherName: 'Engr. Tanmoy Roy',
    room: 'Electronics Lab 208',
    type: 'Practical / Lab',
    shift: 'Morning',
    section: 'A1'
  },
  {
    id: 'r_tue_4',
    day: 'Tuesday',
    periodNumber: 4,
    startTime: '11:30 AM',
    endTime: '01:00 PM',
    subjectCode: '66666',
    subjectName: 'Environmental Management (BTEB)',
    teacherName: 'Dr. Shah Alam',
    room: 'Auditorium Hall',
    type: 'Theory',
    shift: 'Morning',
    section: 'A1'
  },

  // WEDNESDAY - Morning
  {
    id: 'r_wed_1',
    day: 'Wednesday',
    periodNumber: 1,
    startTime: '08:00 AM',
    endTime: '08:45 AM',
    subjectCode: '66661',
    subjectName: 'Web Development Project (Theory)',
    teacherName: 'Engr. Md. Rafiqul Islam',
    room: 'Room 304',
    type: 'Theory',
    shift: 'Morning',
    section: 'A1'
  },
  {
    id: 'r_wed_2',
    day: 'Wednesday',
    periodNumber: 2,
    startTime: '08:45 AM',
    endTime: '09:30 AM',
    subjectCode: '66664',
    subjectName: 'Database Management System',
    teacherName: 'Engr. Mahbubur Rahman',
    room: 'Room 304',
    type: 'Theory',
    shift: 'Morning',
    section: 'A1'
  },
  {
    id: 'r_wed_3',
    day: 'Wednesday',
    periodNumber: 3,
    startTime: '09:30 AM',
    endTime: '11:30 AM',
    subjectCode: '66662',
    subjectName: '8086 Assembly Language Coding Lab',
    teacherName: 'Engr. Shamima Nasrin',
    room: 'Hardware Lab 308',
    type: 'Practical / Lab',
    shift: 'Morning',
    section: 'A1'
  },

  // THURSDAY - Morning
  {
    id: 'r_thu_1',
    day: 'Thursday',
    periodNumber: 1,
    startTime: '08:00 AM',
    endTime: '09:30 AM',
    subjectCode: '66661',
    subjectName: 'Project Defense & Viva Practice',
    teacherName: 'Department Faculty Panel',
    room: 'Seminar Room 501',
    type: 'Practical / Lab',
    shift: 'Morning',
    section: 'A1'
  },
  {
    id: 'r_thu_2',
    day: 'Thursday',
    periodNumber: 2,
    startTime: '09:30 AM',
    endTime: '10:15 AM',
    subjectCode: '65852',
    subjectName: 'Industrial Management (Case Studies)',
    teacherName: 'Md. Abdur Rahim',
    room: 'Room 202',
    type: 'Theory',
    shift: 'Morning',
    section: 'A1'
  },
  {
    id: 'r_thu_3',
    day: 'Thursday',
    periodNumber: 3,
    startTime: '10:45 AM',
    endTime: '12:00 PM',
    subjectCode: '66665',
    subjectName: 'Network Troubleshooting & Subnetting',
    teacherName: 'Engr. Kazi Farhan',
    room: 'Network Lab 405',
    type: 'Practical / Lab',
    shift: 'Morning',
    section: 'A1'
  }
];

export const INITIAL_ROUTINE: RoutinePeriod[] = RAW_INITIAL_ROUTINE.map((period) => ({
  ...period,
  college_id: 'clg_dhaka',
  college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
  department_id: 'tech_cst',
  technology_id: 'tech_cst',
  department: 'Computer Science & Technology (CST)',
  regulation: '2022',
  semester: 6,
  created_by: 'cr_01',
  created_by_name: 'Nusrat Jahan (Class Captain)',
  created_by_role: 'class_captain',
  publication_status: 'published',
  created_at: '2026-10-08T08:00:00.000Z',
  updated_at: '2026-10-08T08:00:00.000Z'
}));

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
}

export const MOCK_ENROLLED_STUDENTS: EnrolledStudent[] = [
  {
    id: 'cr_01',
    name: 'Nusrat Jahan',
    classRoll: '01',
    boardRoll: '542880',
    regNumber: '1502187320',
    college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
    department: 'Computer Science & Technology (CST)',
    semester: 6,
    shift: 'Morning',
    section: 'A1',
    phone: '+880 1819-876543',
    accountType: 'class_captain',
    captainVerificationStatus: 'Approved',
    attendanceRate: '98%'
  },
  {
    id: 'std_01',
    name: 'Tanvir Ahmed',
    classRoll: '02',
    boardRoll: '542891',
    regNumber: '1502187342',
    college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
    department: 'Computer Science & Technology (CST)',
    semester: 6,
    shift: 'Morning',
    section: 'A1',
    phone: '+880 1712-345678',
    accountType: 'student',
    captainVerificationStatus: 'NotApplied',
    attendanceRate: '92%'
  },
  {
    id: 'std_02_rahim',
    name: 'Rahim Ullah',
    classRoll: '05',
    boardRoll: '542895',
    regNumber: '1502187350',
    college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
    department: 'Computer Science & Technology (CST)',
    semester: 6,
    shift: 'Morning',
    section: 'A1',
    phone: '+880 1722-112233',
    accountType: 'class_captain',
    captainVerificationStatus: 'Pending',
    attendanceRate: '95%'
  },
  {
    id: 'std_03_mehedi',
    name: 'Mehedi Hasan',
    classRoll: '08',
    boardRoll: '542901',
    regNumber: '1502187365',
    college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
    department: 'Computer Science & Technology (CST)',
    semester: 6,
    shift: 'Morning',
    section: 'A1',
    phone: '+880 1633-445566',
    accountType: 'student',
    captainVerificationStatus: 'NotApplied',
    attendanceRate: '88%'
  },
  {
    id: 'std_04_anika',
    name: 'Anika Tabassum',
    classRoll: '12',
    boardRoll: '542915',
    regNumber: '1502187380',
    college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
    department: 'Computer Science & Technology (CST)',
    semester: 6,
    shift: 'Morning',
    section: 'A1',
    phone: '+880 1944-778899',
    accountType: 'student',
    captainVerificationStatus: 'NotApplied',
    attendanceRate: '94%'
  },
  {
    id: 'std_05_sakib',
    name: 'Sakib Al Hasan',
    classRoll: '03',
    boardRoll: '543110',
    regNumber: '1502187410',
    college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
    department: 'Computer Science & Technology (CST)',
    semester: 5,
    shift: 'Morning',
    section: 'A1',
    phone: '+880 1755-667788',
    accountType: 'student',
    captainVerificationStatus: 'NotApplied',
    attendanceRate: '91%'
  },
  {
    id: 'std_06_fariha',
    name: 'Fariha Islam',
    classRoll: '01',
    boardRoll: '543105',
    regNumber: '1502187405',
    college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
    department: 'Computer Science & Technology (CST)',
    semester: 5,
    shift: 'Morning',
    section: 'A1',
    phone: '+880 1866-990011',
    accountType: 'class_captain',
    captainVerificationStatus: 'Approved',
    attendanceRate: '99%'
  },
  {
    id: 'std_07_tariq',
    name: 'Tariq Mahmud',
    classRoll: '04',
    boardRoll: '541200',
    regNumber: '1502187100',
    college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
    department: 'Computer Science & Technology (CST)',
    semester: 7,
    shift: 'Morning',
    section: 'A1',
    phone: '+880 1788-223344',
    accountType: 'student',
    captainVerificationStatus: 'NotApplied',
    attendanceRate: '87%'
  },
  {
    id: 'std_08_sadia',
    name: 'Sadia Afrin',
    classRoll: '02',
    boardRoll: '541204',
    regNumber: '1502187104',
    college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
    department: 'Computer Science & Technology (CST)',
    semester: 7,
    shift: 'Morning',
    section: 'A1',
    phone: '+880 1799-112244',
    accountType: 'class_captain',
    captainVerificationStatus: 'Approved',
    attendanceRate: '96%'
  },
  {
    id: 'std_09_rakib',
    name: 'Rakibul Hasan',
    classRoll: '01',
    boardRoll: '542940',
    regNumber: '1502187390',
    college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
    department: 'Computer Science & Technology (CST)',
    semester: 6,
    shift: 'Day',
    section: 'B1',
    phone: '+880 1611-223355',
    accountType: 'class_captain',
    captainVerificationStatus: 'Approved',
    attendanceRate: '95%'
  },
  {
    id: 'std_10_farzana',
    name: 'Farzana Yeasmin',
    classRoll: '02',
    boardRoll: '542942',
    regNumber: '1502187392',
    college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
    department: 'Computer Science & Technology (CST)',
    semester: 6,
    shift: 'Day',
    section: 'B1',
    phone: '+880 1812-445577',
    accountType: 'student',
    captainVerificationStatus: 'NotApplied',
    attendanceRate: '90%'
  },
  {
    id: 'std_11_imran',
    name: 'Imran Hossain',
    classRoll: '03',
    boardRoll: '542945',
    regNumber: '1502187395',
    college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
    department: 'Computer Science & Technology (CST)',
    semester: 6,
    shift: 'Day',
    section: 'B1',
    phone: '+880 1914-667788',
    accountType: 'student',
    captainVerificationStatus: 'NotApplied',
    attendanceRate: '85%'
  },
  {
    id: 'std_12_nabila',
    name: 'Nabila Chowdhury',
    classRoll: '01',
    boardRoll: '542920',
    regNumber: '1502187382',
    college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
    department: 'Computer Science & Technology (CST)',
    semester: 6,
    shift: 'Morning',
    section: 'A2',
    phone: '+880 1715-889900',
    accountType: 'class_captain',
    captainVerificationStatus: 'Approved',
    attendanceRate: '97%'
  },
  {
    id: 'std_13_arman',
    name: 'Arman Kabir',
    classRoll: '02',
    boardRoll: '542922',
    regNumber: '1502187384',
    college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
    department: 'Computer Science & Technology (CST)',
    semester: 6,
    shift: 'Morning',
    section: 'A2',
    phone: '+880 1516-334455',
    accountType: 'student',
    captainVerificationStatus: 'NotApplied',
    attendanceRate: '91%'
  }
];
