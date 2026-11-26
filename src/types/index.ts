export type AccountType = 'student' | 'class_captain' | 'teacher' | 'system_admin';

export interface SystemAdminProfile {
  id: string;
  name: string;
  email: string;
  role: 'system_admin';
  createdAt: string;
  lastLoginAt?: string;
}

export type Shift = 'Morning' | 'Day';

export type Section = 'A1' | 'B1' | 'A2' | 'B2';

export type SemesterNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type WeekDay = 'Saturday' | 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday';

export type CaptainVerificationStatus = 'NotApplied' | 'Pending' | 'Approved' | 'Rejected';

export type TeacherVerificationStatus = 'Pending' | 'Verified' | 'Rejected';

export interface CollegeItem {
  id: string;
  name: string;
  shortName?: string;
  aliases: string[];
  district: string;
  division: string;
  isWomenOnly?: boolean;
}

export interface TechnologyItem {
  id: string;
  name: string;
  shortCode: string;
  aliases: string[];
  semestersCurriculum?: Record<number, string[]>;
}

export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  collegeId?: string;
  department: string;
  departmentId?: string;
  designation: string;
  teachingSubjects: string[];
  semestersTaught: SemesterNumber[];
  shift: Shift | 'Both';
  sectionsTaught?: Section[];
  accountType: 'teacher';
  verificationStatus: TeacherVerificationStatus;
  createdAt: string;
  hasPin: boolean;
  pinLockoutUntil?: string | null;
  failedPinAttempts?: number;
  adminNotes?: string;
  isProfileComplete?: boolean;
  isGuideTeacher?: boolean;
  guideTeacherCohort?: {
    semester: SemesterNumber;
    shift: Shift;
    section: Section;
  };
  regulation?: CatalogRegulation;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  college: string;
  department: string;
  boardRoll: string;
  regNumber: string;
  semester: SemesterNumber;
  section: Section;
  shift: Shift;
  session: string;
  regulation?: CatalogRegulation;
  enrolledSubjects?: { code: string; name: string }[];
  accountType: AccountType;
  captainVerificationStatus: CaptainVerificationStatus;
  isTeacherContactUnlocked: boolean;
  phone?: string;
  designation?: string;
  teachingSubjects?: string[];
  semestersTaught?: SemesterNumber[];
  teacherVerificationStatus?: TeacherVerificationStatus;
  hasPin?: boolean;
}

export interface CaptainApplication {
  id: string;
  studentId: string;
  studentName: string;
  college: string;
  department: string;
  semester: SemesterNumber;
  shift: Shift;
  section: Section;
  boardRoll: string;
  regNumber: string;
  phone: string;
  session: string;
  status: CaptainVerificationStatus;
  appliedAt: string;
  verificationFormUrl?: string;
  verificationFormName?: string;
  teacherEndorsement?: {
    teacherId?: string;
    teacherName: string;
    teacherDesignation: string;
    endorsedAt: string;
    comments?: string;
  };
  adminDecision?: {
    decidedBy: string;
    decidedAt: string;
    notes?: string;
  };
  rejectionReason?: string;
}

export type RoutinePublicationStatus = 'published' | 'draft' | 'needs_admin_review' | 'archived';

export interface RoutinePeriod {
  id: string;
  day: WeekDay;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subjectCode: string;
  subjectName: string;
  teacherName: string;
  room: string;
  type: 'Theory' | 'Practical / Lab';
  shift: Shift;
  section: Section;
  // Academic Group Ownership & Targeting Fields
  college_id?: string | null;
  college?: string;
  department_id?: string | null;
  technology_id?: string | null;
  department?: string;
  regulation?: CatalogRegulation;
  semester?: SemesterNumber | null;
  created_by?: string;
  created_by_name?: string;
  created_by_role?: AccountType;
  publication_status?: RoutinePublicationStatus;
  created_at?: string;
  updated_at?: string;
  migration_review_reason?: string;
  // Document Intelligence metadata
  confidence?: 'high' | 'medium' | 'low';
  uncertainFields?: string[];
}

export interface RoutineNotificationRecord {
  id: string;
  routineId: string;
  title: string;
  message: string;
  college_id: string;
  college: string;
  department_id: string;
  technology_id: string;
  department: string;
  regulation?: CatalogRegulation;
  semester: SemesterNumber;
  shift: Shift;
  section: Section;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface UploadedRoutineDocument {
  id: string;
  fileName: string;
  fileType: 'IMAGE' | 'PDF';
  dataUrl: string;
  uploadedAt: string;
  uploadedBy: string;
  extractedPeriodsCount: number;
  isConfirmed: boolean;
  college_id?: string | null;
  department_id?: string | null;
  semester?: SemesterNumber | null;
  shift?: Shift;
  section?: Section;
}

export interface NoteItem {
  id: string;
  title: string;
  subjectCode: string;
  subjectName: string;
  chapter: string;
  uploadedBy: string;
  uploadedById?: string;
  uploadedByRole?: AccountType;
  uploadedDate: string;
  fileType: 'PDF' | 'DOCX' | 'SLIDES' | 'IMAGE' | 'VIDEO';
  fileSize: string;
  summary: string;
  semester: SemesterNumber;
  college?: string;
  collegeId?: string;
  department?: string;
  departmentId?: string;
  shift?: Shift;
  section?: Section;
  mediaUrl?: string;
  mediaName?: string;
  // Stored file bytes (base64 payload, no data: prefix) + detected MIME.
  // mediaUrl is the authenticated download endpoint (/api/notes/:id/file);
  // when `storage_path` is set the bytes live in the Supabase `notes`
  // bucket instead and media_data is dropped. List responses strip
  // media_data — bytes are only ever served via the download endpoint.
  media_data?: string;
  media_mime?: string;
  storage_path?: string;
  // Optional source / reference for the note (textbook, official site, link).
  // Shown in the UI so students can verify the note. When absent, the note
  // is attributed only to its uploader (verified teacher / class captain).
  sourceName?: string;
  sourceUrl?: string;
  // Document Intelligence searchable extracted content
  extractedText?: string;
  headings?: string[];
  tables?: string[];
  pageCount?: number;
  pageNumbers?: number[];
  scanConfidence?: 'high' | 'medium' | 'low';
}

export interface AssignmentSubmissionRecord {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  boardRoll: string;
  classRoll?: string;
  regNumber?: string;
  college: string;
  department: string;
  semester: SemesterNumber;
  shift: Shift;
  section: Section;
  submittedAt: string;
  lastUpdatedAt: string;
  submissionNote: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: 'PDF' | 'IMAGE' | 'DOCX' | 'ZIP' | 'VIDEO';
  attachmentSize?: string;
  // Stored file bytes (base64 payload) + detected MIME. attachmentUrl is
  // the authenticated download endpoint; `storage_path` means the bytes
  // live in the Supabase `assignments` bucket and attachment_data is
  // dropped. List responses strip attachment_data.
  attachment_data?: string;
  attachment_mime?: string;
  storage_path?: string;
  attemptCount: number;
}

export interface AssignmentSubmissionSummary {
  totalSubmitted: number;
  totalNotSubmitted: number | null;
  eligibleRosterCount: number | null;
  totalAttempts: number;
  mySubmission?: AssignmentSubmissionRecord | null;
}

export interface AssignmentItem {
  id: string;
  title: string;
  subjectCode: string;
  subjectName: string;
  assignedBy: string;
  assignedById?: string;
  assignedByRole?: AccountType;
  dueDate: string;
  status: 'Pending' | 'Submitted' | 'Overdue';
  description: string;
  submittedAt?: string;
  submissionNote?: string;
  shift: Shift;
  section: Section;
  semester: SemesterNumber;
  college?: string;
  collegeId?: string;
  department?: string;
  departmentId?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: 'PDF' | 'IMAGE' | 'DOCX' | 'ZIP' | 'VIDEO';
  // Stored file bytes (base64 payload) + detected MIME. attachmentUrl is
  // the authenticated download endpoint (/api/assignments/:id/file);
  // `storage_path` means the bytes live in the Supabase `assignments`
  // bucket and attachment_data is dropped. List responses strip
  // attachment_data.
  attachment_data?: string;
  attachment_mime?: string;
  storage_path?: string;
  submissionSummary?: AssignmentSubmissionSummary;
  // Document Intelligence structured fields
  questions?: string[];
  marks?: string | number;
  submissionMethod?: string;
  extractedText?: string;
  pageNumbers?: number[];
  scanConfidence?: 'high' | 'medium' | 'low';
  uncertainFields?: string[];
}

export type AttendanceStatus = 'present' | 'absent' | 'not_marked';

export interface AttendanceRecordEntry {
  studentId: string;
  studentName: string;
  boardRoll: string;
  classRoll: string;
  regNumber: string;
  status: AttendanceStatus;
  remarks?: string;
  updatedAt?: string;
}

export interface AttendanceAuditEntry {
  action: 'created' | 'updated' | 'roster_imported' | 'deleted';
  performedBy: string;
  performedById: string;
  performedByRole: AccountType;
  timestamp: string;
  summary: string;
}

export interface AttendanceSheet {
  id: string;
  college: string;
  collegeId: string;
  department: string;
  departmentId: string;
  semester: SemesterNumber;
  shift: Shift;
  section: Section;
  date: string; // YYYY-MM-DD
  subjectCode: string;
  subjectName: string;
  periodLabel: string;
  teacherId: string;
  teacherName: string;
  entries: AttendanceRecordEntry[];
  createdAt: string;
  updatedAt: string;
  auditTrail: AttendanceAuditEntry[];
}

export interface OcrExtractedStudentCandidate {
  tempId: string;
  name: string;
  boardRoll: string;
  classRoll: string;
  regNumber: string;
  confidence: 'high' | 'medium' | 'uncertain';
  matchedStudentId?: string;
  matchStatus: 'matched_existing' | 'new_student' | 'duplicate_in_file' | 'invalid_missing_fields';
  warning?: string;
}

export interface MonthlyStudentAttendanceRow {
  studentId: string;
  studentName: string;
  boardRoll: string;
  classRoll: string;
  regNumber: string;
  dailyStatuses: Record<string, {
    status: AttendanceStatus | 'no_session' | 'holiday';
    sessionsCount: number;
    presentSessions: number;
    absentSessions: number;
    notMarkedSessions: number;
  }>;
  presentCount: number;
  absentCount: number;
  notMarkedCount: number;
  recordedSessionsCount: number;
  attendancePercentage: number | null;
}

export type JobStatus = 'Open' | 'Closing Soon' | 'Expired';

export interface JobCircular {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'Internship' | 'Full-Time' | 'Apprenticeship' | 'Part-Time' | 'Contract';
  targetDepartments: string[];
  publishedAt?: string;
  deadline: string;
  stipendOrSalary: string;
  experienceRequirements?: string;
  educationalQualifications?: string;
  description?: string;
  requirements: string;
  sourceName?: string;
  sourceUrl?: string;
  applyUrl?: string;
  applicationMethod?: 'external_url' | 'authorized_partner';
  status?: JobStatus;
  postedBy: string;
  postedById?: string;
  postedByRole?: AccountType;
  postedAt: string;
  updatedAt?: string;
  mediaUrl?: string;
  mediaType?: 'IMAGE' | 'PDF' | 'VIDEO';
  mediaName?: string;
  // Stored file bytes (base64 payload) + detected MIME. mediaUrl is the
  // authenticated download endpoint (/api/jobs/:id/file). List responses
  // strip media_data.
  media_data?: string;
  media_mime?: string;
}

export type BtebNoticeCategory =
  | 'Diploma in Engineering'
  | 'Diploma in Textile'
  | 'Diploma in Agriculture'
  | 'HSC (BMT / Vocational)'
  | 'SSC (Vocational / Dakhil)'
  | 'Admission & Registration'
  | 'Examination & Form Fill-up'
  | 'Result & Scholarship'
  | 'General / Administrative';

export interface BtebOfficialNotice {
  id: string;
  serialBn: string;
  serialNumber: number;
  title: string;
  publishedDateIso: string;
  publishedDateDisplay: string;
  publishedDateBn: string;
  category: BtebNoticeCategory;
  sourceLabel: 'Bangladesh Technical Education Board (BTEB)';
  noticeUrl: string;
  pdfUrl?: string | null;
  imageUrl?: string | null;
  isNew?: boolean;
  firstDiscoveredAt: string;
  lastVerifiedAt: string;
  updatedAt?: string;
}

export type CampusNoticeScope = 'college' | 'department' | 'cohort';

export interface CampusNoticeItem {
  id: string;
  title: string;
  description: string;
  publisherId: string;
  publisherName: string;
  publisherRole: 'teacher' | 'class_captain' | 'system_admin';
  publisherDesignation?: string;
  college_id: string;
  college: string;
  department_id: string;
  department: string;
  semester?: SemesterNumber | null;
  shift?: Shift | 'Both' | null;
  section?: Section | 'All' | null;
  targetScope: CampusNoticeScope;
  priority: 'Important' | 'Normal';
  isPinned?: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: 'PDF' | 'IMAGE' | 'DOCX' | 'VIDEO' | 'ZIP';
  // Stored file bytes (base64 payload) + detected MIME. attachmentUrl is
  // the authenticated download endpoint
  // (/api/notices/campus/:id/attachment). List responses strip
  // attachment_data — bytes are only served via the download endpoint.
  attachment_data?: string;
  attachment_mime?: string;
  expiryDate?: string;
  publishedAt: string;
  updatedAt?: string;
  reportsCount?: number;
}

export interface CampusNoticeReportRecord {
  id: string;
  noticeId: string;
  noticeTitle: string;
  reportedById: string;
  reportedByName: string;
  reason: string;
  createdAt: string;
  status: 'pending' | 'reviewed' | 'dismissed';
}

export interface ReminderItem {
  id: string;
  title: string;
  category: 'Exam' | 'Assignment' | 'Lab Report' | 'BTEB Notice' | 'Personal' | 'Routine';
  dueDate: string;
  dueTime: string;
  priority: 'High' | 'Medium' | 'Normal';
  isCompleted: boolean;
  note?: string;
  college_id?: string;
  department_id?: string;
  semester?: SemesterNumber;
  shift?: Shift;
  section?: Section;
  routineId?: string;
}

export interface ContactAuditEntry {
  action: 'created' | 'updated' | 'archived';
  performedBy: string;
  performedByRole: AccountType;
  timestamp: string;
  reason?: string;
}

export interface TeacherContact {
  id: string;
  teacherId?: string; // links to TeacherProfile.id if registered
  collegeId?: string;
  collegeName?: string;
  departmentId?: string;
  name: string;
  designation: string;
  department: string;
  subject: string;
  teachingSubjects?: string[];
  semestersTaught?: SemesterNumber[];
  phone: string;
  email: string;
  room: string;
  consultingHours: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
  auditTrail?: ContactAuditEntry[];
}

export interface SemesterSubject {
  code: string;
  name: string;
  credits: number;
  theoryContinuous: number;
  theoryFinal: number;
  practicalContinuous: number;
  practicalFinal: number;
  totalMarks: number;
  type: 'Core' | 'Support' | 'Elective';
}

export interface NotificationPreferences {
  routineAlerts: boolean;
  routineLeadMinutes: number;
  assignmentAlerts: boolean;
  crAnnouncements: boolean;
  btebNotices: boolean;
  soundVibration: boolean;
}

export interface ClassAnnouncement {
  id: string;
  authorName: string;
  authorRole: string;
  title: string;
  content: string;
  postedAt: string;
  priority: 'Important' | 'Normal';
  isPinned: boolean;
}

export type BtebRegulation = '2022' | '2016' | '2010';

export type BtebExamType = 'Regular' | 'Irregular' | 'Improvement';

export type BtebResultStatus = 'PASSED' | 'REFERRED' | 'WITHHELD' | 'NOT_FOUND';

export interface ReferredSubjectEntry {
  code: string;
  name: string | null;
  failedComponent: 'T' | 'P' | 'T,P' | 'UNKNOWN';
  nameSource: 'official-import' | 'curriculum-mapped' | 'unmapped';
}

export interface SubjectGradeEntry {
  code: string;
  name: string;
  grade: string;
  point: number;
}

export interface BtebResultBatch {
  id: string;
  title: string;
  semester: SemesterNumber;
  regulation: BtebRegulation;
  examYear: number;
  examType: BtebExamType;
  publishedDate: string;
  importedAt: string;
  importedBy: string;
  sourceFileName: string;
  totalRecords: number;
  passCount: number;
  referredCount: number;
  withheldCount?: number;
  notes?: string;
}

export interface StudentResultRecord {
  id: string;
  batchId: string;
  batchTitle?: string;
  rollNumber: string;
  semester: SemesterNumber;
  regulation: BtebRegulation;
  examYear: number;
  examType: BtebExamType;
  publishedDate?: string;
  sourceFileName?: string;
  instituteCode?: string;
  collegeId?: string;
  collegeName?: string;
  departmentId?: string;
  departmentName?: string;
  studentName?: string;
  status: 'PASSED' | 'REFERRED' | 'WITHHELD';
  gpa: number | null;
  cgpa?: number | null;
  referredSubjects: ReferredSubjectEntry[];
  clearedSubjects?: ReferredSubjectEntry[];
  subjectGrades?: SubjectGradeEntry[];
  dataSource: 'official-bteb-import';
  importedAt: string;
}

export interface GroupResultItem {
  rollNumber: string;
  found: boolean;
  record: StudentResultRecord | null;
}

export interface GroupResultAnalytics {
  totalRequested: number;
  foundCount: number;
  notFoundCount: number;
  passCount: number;
  referredCount: number;
  withheldCount: number;
  passRate: number;
  averageGpa: number | null;
  highestGpa: number | null;
  lowestPassGpa: number | null;
  mostCommonReferredSubjects: {
    code: string;
    name: string | null;
    count: number;
  }[];
}

export type BtebCurriculumId =
  | 'diploma_in_engineering'
  | 'diploma_in_textile'
  | 'diploma_in_agriculture'
  | 'diploma_in_tourism'
  | 'hsc_bm'
  | 'ssc_vocational';

export interface BtebFailedSubjectDetail {
  subCode: number | string;
  subName?: string;
  type: 'T' | 'P' | 'T,P' | string;
  originSemester: number;
  passed?: boolean;
}

export interface BtebSemesterResultPublication {
  date: string;
  fileHash?: string;
  fileName?: string;
  semester: number;
  instituteCode?: number | string;
  deptCode?: number | string | null;
  gpa?: number | null;
  cgpa?: number | null;
  failedSubjects?: BtebFailedSubjectDetail[];
  republished?: boolean;
}

export interface BtebSemesterSummaryItem {
  semester: SemesterNumber;
  status: 'passed' | 'failed' | 'referred' | 'withheld';
  gpa?: number | null;
  cgpa?: number | null;
  publications: BtebSemesterResultPublication[];
  latestPublication?: BtebSemesterResultPublication;
  failedSubjects: BtebFailedSubjectDetail[];
}

export interface BtebStudentResultStatement {
  rollNumber: string;
  curriculumId: BtebCurriculumId;
  curriculumName: string;
  regulation: string | number;
  regulationNote?: string | null;
  deptCode?: number | string | null;
  deptName?: string | null;
  institute: {
    code: number | string;
    name: string;
    district?: string;
  };
  overallStatus: 'passed_all' | 'referred_pending' | 'in_progress';
  overallCgpa?: number | null;
  completedSemestersCount: number;
  highestSemester: number;
  currentFailedSubjects: BtebFailedSubjectDetail[];
  semesterResults: BtebSemesterSummaryItem[];
  dataSource: 'bteb_results_zone_online' | 'official_bteb_gazette_store' | 'local_verified_dataset';
  dataSourceLabel: string;
  retrievedAt: string;
}

export interface ResultImportAuditLog {
  id: string;
  batchId: string;
  batchTitle: string;
  importedBy: string;
  importedAt: string;
  sourceFileName: string;
  totalParsed: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  duplicateMode: 'skip' | 'overwrite';
}

export type CatalogRegulation = '2016' | '2022';

export type CatalogVerificationStatus = 'verified' | 'provisional' | 'unverified';

export interface SubjectCatalogRecord {
  id: string;
  technology_key: string;
  technology: string;
  department_code?: string | null;
  regulation: CatalogRegulation;
  semester: SemesterNumber;
  subject_code: string;
  subject_name: string;
  subject_type: string | null;
  marks: number | string | null;
  credits?: number | null;
  theory_per_week?: number | null;
  practical_per_week?: number | null;
  source_url: string | null;
  source_file?: string | null;
  verification_status: CatalogVerificationStatus;
  notes: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface CatalogDuplicateWarning {
  subject_code: string;
  technology_key: string;
  regulation: CatalogRegulation;
  semester: SemesterNumber;
  occurrences: number;
  subject_names: string[];
  message: string;
}

export interface CatalogVerifiedConflict {
  existing_id: string;
  subject_code: string;
  technology_key: string;
  regulation: CatalogRegulation;
  semester: SemesterNumber;
  existing_name: string;
  incoming_name: string;
  existing_status: CatalogVerificationStatus;
  incoming_status: CatalogVerificationStatus;
  reason: string;
}

export interface CatalogImportPreviewSummary {
  valid: boolean;
  totalRecords: number;
  validRecordsCount: number;
  invalidRecords: { index: number; reason: string; raw?: unknown }[];
  syntaxWarnings?: string[];
  groupedCounts: {
    technology_key: string;
    technology: string;
    regulation: CatalogRegulation;
    semesterCounts: Record<number, number>;
    missingSemesters: number[];
    totalInGroup: number;
  }[];
  duplicateCodes: CatalogDuplicateWarning[];
  unverifiedOrProvisionalCount: number;
  verifiedCount: number;
  protectedVerifiedConflicts: CatalogVerifiedConflict[];
  insertableCount: number;
  updatableCount: number;
  unchangedCount?: number;
}

export interface CatalogImportAuditLog {
  id: string;
  importedBy: string;
  importedAt: string;
  sourceName: string;
  totalSubmitted: number;
  insertedCount: number;
  updatedCount: number;
  unchangedCount?: number;
  skippedVerifiedCount: number;
  duplicateWarningsCount: number;
}

export type ScreenType = 
  | 'welcome'
  | 'admin_login'
  | 'home'
  | 'book_list'
  | 'routine'
  | 'notes'
  | 'reminders'
  | 'notifications'
  | 'support'
  | 'teachers'
  | 'semester'
  | 'profile'
  | 'settings'
  | 'captain_verification'
  | 'admin_portal'
  | 'teacher_portal'
  | 'teacher_setup'
  | 'bteb_results'
  | 'community'
  | 'privacy_policy'
  | 'terms'
  | 'delete_account';

// ============================================================================
// ACADEMIC COMMUNITY TYPES
// ============================================================================

export interface AcademicCommunity {
  id: string;
  name: string;
  description: string;
  college_id: string;
  college: string;
  department_id: string;
  department: string;
  semester: SemesterNumber;
  regulation: string;
  shift: Shift | 'Both';
  section: Section | 'All';
  visibility: 'public' | 'private';
  created_by: string;
  created_by_name: string;
  created_by_role: 'teacher' | 'class_captain' | 'system_admin';
  moderators: string[];
  member_count: number;
  is_active: boolean;
  pinned_notice_id?: string | null;
  avatar_emoji?: string;
  image_url?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CommunityMembershipRecord {
  id: string;
  community_id: string;
  user_id: string;
  user_name: string;
  user_role: AccountType;
  college_id: string;
  department_id: string;
  semester: SemesterNumber;
  shift?: Shift;
  section?: Section;
  membership_role: 'member' | 'moderator' | 'owner';
  status: 'active' | 'pending_approval' | 'invited' | 'banned';
  is_muted: boolean;
  joined_at: string;
  updated_at: string;
}

export interface CommunityAttachment {
  id: string;
  file_name: string;
  file_type: 'document' | 'pdf' | 'image' | 'video';
  mime_type: string;
  file_size_bytes: number;
  file_url: string;
  // Raw base64 bytes of the uploaded file (without the data: prefix).
  // Stored on the record itself so the file survives Render deploys — files
  // written to disk under data/community-files/ are lost on every deploy
  // and are not covered by the GitHub store backup. Never sent to clients
  // in message lists; only the file download endpoint reads it.
  file_data?: string;
  duration_seconds?: number;
}

export interface CommunityMessageRecord {
  id: string;
  community_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: AccountType;
  sender_designation?: string;
  is_moderator: boolean;
  content: string;
  attachments: CommunityAttachment[];
  is_pinned: boolean;
  pinned_by?: string;
  pinned_at?: string;
  is_deleted: boolean;
  deleted_by?: string;
  reports_count: number;
  created_at: string;
  updated_at?: string;
}

export interface CommunityReportRecord {
  id: string;
  community_id: string;
  reported_message_id?: string;
  reported_user_id: string;
  reported_by_id: string;
  reported_by_name: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_by?: string;
  resolution_notes?: string;
}

// ============================================================================
// FEATURE 1: CONFIGURABLE PERIOD AND SHIFT MANAGEMENT TYPES
// ============================================================================

export interface PeriodBreakConfig {
  afterPeriod?: number;
  afterPeriodNumber?: number;
  durationMinutes: number;
  label?: string;
}

export interface PeriodSlotConfig {
  periodNumber: number;
  startTime: string; // e.g. "08:00 AM" or "01:30 PM"
  endTime: string;   // e.g. "08:45 AM" or "02:15 PM"
  durationMinutes: number; // default 45, editable
  isManuallyEdited: boolean; // preserves manual startTime/endTime unless explicitly reset
  breakAfterMinutes: number; // break duration after this period (0 if none)
  breakLabel?: string;
}

export interface ShiftScheduleConfig {
  id: string;
  shift: Shift; // 'Morning' | 'Day'
  scopeKey?: string;
  firstPeriodStartTime: string; // Default: "08:00 AM" (Morning) | "01:30 PM" (Day)
  defaultDurationMinutes: number; // Default: 45
  numberOfPeriods: number; // Default: 7
  breaks: PeriodBreakConfig[];
  periods: PeriodSlotConfig[];
  college?: string;
  department?: string;
  semester?: SemesterNumber | number;
  section?: Section | string;
  ownerId?: string;
  updatedBy?: string;
  updatedAt: string;
}

// ============================================================================
// FEATURE 2: MY SEMESTER GPA / CGPA CALCULATOR TYPES
// ============================================================================

export type CalculatorRegulation = '2010' | '2016' | '2022';

export interface SubjectMarkInputEntry {
  subjectId?: string;
  subjectCode: string;
  subjectName: string;
  catalogCredits: number | null;
  catalogFullMarks: number | null;
  effectiveCredits: number | null;
  effectiveFullMarks: number | null;
  creditsSource?: 'catalog_verified' | 'user_provisional' | 'missing';
  marksSource?: 'catalog_verified' | 'user_provisional' | 'missing';
  isFullMarksProvisional?: boolean;
  isCreditsProvisional?: boolean;
  verificationStatus?: CatalogVerificationStatus;
  obtainedMarks: number | null;
  percentage: number | null;
  letterGrade: string | null;
  gradePoint: number | null;
  weightedPoints?: number | null;
  error?: string | null;
}

export interface SavedSemesterCalculatorRecord {
  id: string;
  ownerUserId: string;
  ownerName: string;
  ownerRole: AccountType;
  boardRoll?: string;
  college?: string;
  technology: string;
  technologyKey: string;
  technologyName?: string;
  regulation: CalculatorRegulation;
  semester: SemesterNumber;
  subjectEntries: SubjectMarkInputEntry[];
  calculatedGpa: number | null;
  rawConditionalGpa?: number | null;
  totalCredits?: number;
  totalCreditsCounted: number;
  totalSubjectsCounted: number;
  hasFailedSubject: boolean;
  isEstimate: boolean;
  limitations?: string[];
  estimateReasons: string[];
  manualGpaOverride?: number | null;
  semesterGpaOverrides?: Partial<Record<SemesterNumber, number | null>>;
  updatedAt: string;
}

export interface CaptainRecord {
  id: string;
  studentId: string;
  studentName: string;
  college: string;
  department: string;
  semester: SemesterNumber;
  shift: Shift;
  section: Section;
  boardRoll?: string;
  regNumber?: string;
  phone?: string;
  session?: string;
  status: string;
  appliedAt: string;
  verificationFormUrl?: string;
  verificationFormName?: string;
  teacherEndorsement?: any;
  adminDecision?: any;
  rejectionReason?: string;
  isRegisteredAccount?: boolean;
}

// ============================================================================
// SHARED DOCUMENT INTELLIGENCE & EXTRACTION TYPES
// ============================================================================

export type DocumentScanFeature =
  | 'routine'
  | 'assignment'
  | 'note'
  | 'notice'
  | 'job'
  | 'roster'
  | 'captain_form'
  | 'bteb_result'
  | 'video';

export interface ExtractedPdfPage {
  pageNumber: number;
  text: string;
  hasTable: boolean;
}

export interface RoutineExtractionData {
  college?: string | null;
  college_id?: string | null;
  department?: string | null;
  department_id?: string | null;
  semester?: SemesterNumber | null;
  section?: Section | null;
  shift?: Shift | null;
  periods: RoutinePeriod[];
  uncertainFields: string[];
}

export interface AssignmentExtractionData {
  title: string;
  subjectCode: string;
  subjectName: string;
  semester?: SemesterNumber | null;
  department?: string | null;
  instructions: string;
  questions: string[];
  dueDate: string;
  submissionMethod: string;
  teacherName: string;
  marks: string;
  pageNumbers: number[];
  confidence: 'high' | 'medium' | 'low';
  uncertainFields: string[];
}

export interface NoteExtractionData {
  title: string;
  subjectCode: string;
  subjectName: string;
  semester?: SemesterNumber | null;
  chapter: string;
  summary: string;
  extractedText: string;
  headings: string[];
  tables: string[];
  pageCount: number;
  pageNumbers: number[];
  confidence: 'high' | 'medium' | 'low';
  uncertainFields: string[];
}

export interface NoticeExtractionData {
  title: string;
  description: string;
  college?: string | null;
  department?: string | null;
  semester?: SemesterNumber | null;
  expiryDate?: string;
  priority: 'Important' | 'Normal';
  confidence: 'high' | 'medium' | 'low';
  uncertainFields: string[];
}

export interface JobExtractionData {
  title: string;
  company: string;
  location: string;
  type: 'Internship' | 'Full-Time' | 'Apprenticeship' | 'Part-Time' | 'Contract';
  deadline: string;
  stipendOrSalary: string;
  experienceRequirements: string;
  educationalQualifications: string;
  targetDepartments: string[];
  description: string;
  applyUrl?: string;
  confidence: 'high' | 'medium' | 'low';
  uncertainFields: string[];
}

export interface CaptainFormExtractionData {
  studentName: string;
  boardRoll: string;
  regNumber: string;
  college?: string | null;
  department?: string | null;
  semester?: SemesterNumber | null;
  shift?: Shift | null;
  section?: Section | null;
  hasSignatureOrSeal: boolean;
  teacherName?: string;
  confidence: 'high' | 'medium' | 'low';
  uncertainFields: string[];
}

export interface VideoExtractionData {
  title: string;
  summary: string;
  extractedFrameTexts: string[];
  analyzedFramesCount: number;
  transcriptText?: string;
  transcriptionSupported: boolean;
  capabilityNotice: string;
  subjectCode?: string;
  subjectName?: string;
  chapter?: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface DocumentScanResult {
  success: boolean;
  feature: DocumentScanFeature;
  fileCategory: 'IMAGE' | 'PDF' | 'VIDEO' | 'TEXT';
  detectedMimeType: string;
  extractionMethod:
    | 'pdf_text_layer'
    | 'pdf_scanned_ocr'
    | 'image_multimodal_ocr'
    | 'image_embedded_text_ocr'
    | 'video_keyframe_analysis'
    | 'direct_text_parser'
    | 'failed';
  isScannedPdf?: boolean;
  isReadable: boolean;
  confidence: 'high' | 'medium' | 'low';
  rawExtractedText: string;
  pageCount?: number;
  processedPages?: number[];
  pages?: ExtractedPdfPage[];
  warnings: string[];
  uncertainFields: string[];
  error?: string;
  errorCode?:
    | 'UNSUPPORTED_FILE_TYPE'
    | 'CORRUPTED_FILE'
    | 'FILE_TOO_LARGE'
    | 'EMPTY_FILE'
    | 'UNREADABLE_CONTENT'
    | 'AI_SERVICE_UNAVAILABLE'
    | 'AI_INVALID_RESPONSE'
    | 'EXTRACTION_FAILED';
  routineData?: RoutineExtractionData;
  assignmentData?: AssignmentExtractionData;
  noteData?: NoteExtractionData;
  noticeData?: NoticeExtractionData;
  jobData?: JobExtractionData;
  rosterCandidates?: OcrExtractedStudentCandidate[];
  captainFormData?: CaptainFormExtractionData;
  videoData?: VideoExtractionData;
}
