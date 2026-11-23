/**
 * Supabase data layer for DiplomaMate — Phase 4 prep.
 *
 * Gradual replacement for the JSON store in `server.ts`
 * (`loadAcademicStore()` / `saveAcademicStore()` on
 * `data/academic-store.json`, 13,500 lines / 77 whole-file saves).
 *
 * DESIGN
 * - Server-side only. Uses the SERVICE ROLE key, which bypasses Row Level
 *   Security. Never import this file from frontend code, and never put
 *   SUPABASE_SERVICE_ROLE_KEY in a VITE_ variable or in the APK build.
 * - Lazy singleton: the client is created on first use, NOT at import time,
 *   so `server.ts` still boots when Supabase is not configured yet. Every
 *   helper throws a clear error naming the missing env var instead of
 *   failing with an opaque Supabase error.
 * - Env must already be loaded before the first call. `server.ts` calls
 *   `dotenv.config()` at startup; a standalone tsx script using this file
 *   must call `dotenv.config()` itself first.
 * - Postgres uses snake_case, the app uses camelCase. Every helper maps a
 *   `*Row` (exact Postgres columns, see
 *   `supabase-schema-phase1.sql` / `supabase-migration-phase2.sql`) to the
 *   app's existing domain types (`EnrolledStudent`, `CaptainRecord`,
 *   `AcademicCommunity`, …) so callers in `server.ts` do not change shape.
 * - Cohort filters match on the STORED display names (`college`,
 *   `department` as written in Postgres, e.g.
 *   "Dhaka Polytechnic Institute (DPI), Tejgaon"), NOT on canonical ids.
 *   Callers must resolve names first with the existing
 *   `normalizeCollege()` / `normalizeTechnology()` / `resolveStrict*()`
 *   helpers in `server.ts` / `src/data/directoryData`, exactly as
 *   `getCohortRoster()` does today. Postgres has no name-normalisation.
 *
 * KNOWN GAPS (fix in the route-migration step, not here)
 * - `pin_hash_version`: the column does NOT exist in Postgres yet — it is
 *   added by `supabase-schema-phase4.sql` (run it in the SQL Editor).
 *   `toStudent()` / `toTeacher()` map it when present and return
 *   `undefined` otherwise (`select('*')` simply does not return a
 *   missing column), which the verifiers treat as a legacy hash:
 *   `verifyTeacherPin()` uses PBKDF2-1000 for `undefined`/1 and
 *   PBKDF2-100000 for 2, and `verifyStudentPin()` always uses the v2
 *   count for students, so a missing value changes nothing for
 *   students. The write helpers (`insertStudent`,
 *   `updateStudentById`, `updateTeacherById`) include the column in
 *   the payload and retry once without it on a PostgREST PGRST204
 *   (unknown-column) error, so a write still lands in Postgres before
 *   the ALTER has been run — the column just stays unset until then.
 * - Student lockout is in-memory only in `server.ts`
 *   (`studentLoginFailures` Map, line ~612); the Postgres columns
 *   `failed_pin_attempts` / `lockout_until` exist but `EnrolledStudent`
 *   has no such fields, so they are only exposed via the raw-row helpers.
 * - `pendingTeacherEndorsements` (a `Record<string, …>` inside the JSON
 *   store) has NO Postgres table yet — the table is defined in
 *   `supabase-schema-phase4.sql`; it needs to be run before
 *   `POST /api/captains/sync` can migrate.
 * - `attendance_rate` is a string like "98%" in the app and `numeric`
 *   in Postgres; the mapper converts numeric -> "98%".
 * - Teacher `lockout_until` is epoch-ms `number | null` in the app and
 *   `timestamptz` in Postgres; the mapper converts both ways.
 *
 * NOTHING in this file is wired into `server.ts` yet. Routes keep reading
 * the JSON store until they are migrated one at a time (see
 * `supabase-backend-prep.md`).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { EnrolledStudent } from '../src/data/mockData';
import type {
  AcademicCommunity,
  CampusNoticeItem,
  CaptainRecord,
  CommunityMembershipRecord,
  CommunityMessageRecord,
  RoutinePeriod,
} from '../src/types';

// ---------------------------------------------------------------------------
// Client (lazy singleton)
// ---------------------------------------------------------------------------

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseConfig(): { url: string; serviceRoleKey: string } {
  const url = (process.env.SUPABASE_URL || '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const missing: string[] = [];
  if (!url) missing.push('SUPABASE_URL');
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length > 0) {
    throw new Error(
      `Supabase is not configured: missing ${missing.join(' and ')} in the environment (.env). ` +
        `Set SUPABASE_URL to the project URL (https://<project-ref>.supabase.co) and ` +
        `SUPABASE_SERVICE_ROLE_KEY to the secret key from Supabase Dashboard → Settings → API Keys. ` +
        `The service_role key is server-only — never put it in the frontend or commit it.`,
    );
  }
  return { url, serviceRoleKey };
}

let cachedClient: SupabaseClient | null = null;

/** Create (once) and return the server-side Supabase client. Throws if env is missing. */
export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const { url, serviceRoleKey } = getSupabaseConfig();
  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

/** Cheap liveness check: true when Postgres answers, false on any error. Never throws. */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('students').select('id', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
}

function throwIfError(error: unknown, context: string): void {
  if (error) {
    // PostgREST errors are plain objects ({ code, message, details,
    // hint }), not Error instances — String(error) would only give
    // "[object Object]" and hide the real message (e.g. a PGRST204
    // unknown-column error). Prefer the object's message when present.
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : String(error);
    throw new Error(`Supabase ${context} failed: ${message}`);
  }
}

/**
 * PostgREST PGRST204: the payload names a column that does not exist in
 * the table yet (e.g. `pin_hash_version` before
 * `supabase-schema-phase4.sql` has been run in the SQL Editor). The
 * student / teacher write helpers below retry once without that column
 * instead of failing the whole write.
 */
function isMissingColumnError(error: unknown, column: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: unknown; message?: unknown };
  return (
    err.code === 'PGRST204' && typeof err.message === 'string' && err.message.includes(column)
  );
}

// ---------------------------------------------------------------------------
// Postgres row types (exact columns in supabase-schema-phase1.sql,
// plus `students.email`, added by supabase-migration-phase2.sql)
// ---------------------------------------------------------------------------

export interface StudentRow {
  id: string;
  name: string;
  class_roll: string | null;
  board_roll: string | null;
  reg_number: string | null;
  college: string | null;
  department: string | null;
  semester: number | null;
  shift: string | null;
  section: string | null;
  phone: string | null;
  email: string | null;
  account_type: string | null;
  captain_verification_status: string | null;
  attendance_rate: number | null;
  pin_hash: string | null;
  pin_salt: string | null;
  // Added by supabase-schema-phase4.sql; null until that ALTER is run.
  pin_hash_version: number | null;
  failed_pin_attempts: number | null;
  lockout_until: string | null;
  is_registered_account: boolean | null;
  auth_user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TeacherRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  college: string | null;
  department: string | null;
  designation: string | null;
  teaching_subjects: string[] | null;
  semesters_taught: number[] | null;
  shift: string | null;
  sections_taught: string[] | null;
  verification_status: string | null;
  pin_salt: string | null;
  pin_hash: string | null;
  // Added by supabase-schema-phase4.sql; null until that ALTER is run.
  pin_hash_version: number | null;
  failed_pin_attempts: number | null;
  lockout_until: string | null;
  admin_notes: string | null;
  auth_user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** ServerTeacher shape as defined in server.ts (pinHashVersion maps to the pin_hash_version column added by supabase-schema-phase4.sql; undefined until that ALTER runs). */
export interface TeacherAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  department: string;
  designation: string;
  teachingSubjects: string[];
  semestersTaught: number[];
  shift: 'Morning' | 'Day' | 'Both';
  sectionsTaught?: string[];
  verificationStatus: 'Pending' | 'Verified' | 'Rejected';
  pinHash: string;
  pinSalt: string;
  pinHashVersion?: number;
  failedPinAttempts: number;
  lockoutUntil: number | null;
  createdAt: string;
  adminNotes?: string;
  isRegisteredAccount?: boolean;
}

export interface CaptainRow {
  id: string;
  student_id: string | null;
  student_name: string | null;
  college: string | null;
  department: string | null;
  semester: number | null;
  shift: string | null;
  section: string | null;
  board_roll: string | null;
  reg_number: string | null;
  phone: string | null;
  session: string | null;
  status: string | null;
  applied_at: string | null;
  verification_form_url: string | null;
  verification_form_name: string | null;
  teacher_endorsement: unknown;
  admin_decision: unknown;
  rejection_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CommunityRow {
  id: string;
  name: string;
  description: string | null;
  college_id: string | null;
  college: string | null;
  department_id: string | null;
  department: string | null;
  semester: number | null;
  regulation: string | null;
  shift: string | null;
  section: string | null;
  visibility: string | null;
  created_by: string | null;
  created_by_name: string | null;
  created_by_role: string | null;
  moderators: string[] | null;
  member_count: number | null;
  is_active: boolean | null;
  avatar_emoji: string | null;
  pinned_notice_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface MembershipRow {
  id: string;
  community_id: string;
  user_id: string;
  user_name: string | null;
  user_role: string | null;
  college_id: string | null;
  department_id: string | null;
  semester: number | null;
  shift: string | null;
  section: string | null;
  membership_role: string | null;
  status: string | null;
  is_muted: boolean | null;
  joined_at: string | null;
  updated_at: string | null;
}

export interface MessageRow {
  id: string;
  community_id: string;
  sender_id: string | null;
  sender_name: string | null;
  sender_role: string | null;
  sender_designation: string | null;
  is_moderator: boolean | null;
  content: string | null;
  attachments: unknown;
  is_pinned: boolean | null;
  pinned_by: string | null;
  pinned_at: string | null;
  is_deleted: boolean | null;
  reports_count: number | null;
  created_at: string | null;
}

export interface RoutineRow {
  id: string;
  day: string | null;
  period_number: number | null;
  start_time: string | null;
  end_time: string | null;
  subject_code: string | null;
  subject_name: string | null;
  teacher_name: string | null;
  room: string | null;
  type: string | null;
  shift: string | null;
  section: string | null;
  college_id: string | null;
  college: string | null;
  department_id: string | null;
  technology_id: string | null;
  department: string | null;
  regulation: string | null;
  semester: number | null;
  created_by: string | null;
  created_by_name: string | null;
  created_by_role: string | null;
  publication_status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CampusNoticeRow {
  id: string;
  title: string | null;
  description: string | null;
  publisher_id: string | null;
  publisher_name: string | null;
  publisher_role: string | null;
  publisher_designation: string | null;
  college_id: string | null;
  college: string | null;
  department_id: string | null;
  department: string | null;
  semester: number | null;
  shift: string | null;
  section: string | null;
  target_scope: string | null;
  priority: string | null;
  is_pinned: boolean | null;
  attachment_name: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  expiry_date: string | null;
  reports_count: number | null;
  published_at: string | null;
  updated_at: string | null;
}

// ---------------------------------------------------------------------------
// Row -> domain mappers (snake_case -> the app's camelCase types)
// ---------------------------------------------------------------------------

export function toStudent(row: StudentRow): EnrolledStudent {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? undefined,
    classRoll: row.class_roll ?? '',
    boardRoll: row.board_roll ?? '',
    regNumber: row.reg_number ?? '',
    college: row.college ?? '',
    department: row.department ?? '',
    semester: row.semester ?? 1,
    shift: row.shift === 'Day' ? 'Day' : 'Morning',
    section: (['A1', 'A2', 'B1', 'B2'].includes(String(row.section)) ? row.section : 'A1') as EnrolledStudent['section'],
    phone: row.phone ?? '',
    accountType: row.account_type === 'class_captain' ? 'class_captain' : 'student',
    captainVerificationStatus: (row.captain_verification_status ?? 'NotApplied') as EnrolledStudent['captainVerificationStatus'],
    attendanceRate: row.attendance_rate === null ? '' : `${row.attendance_rate}%`,
    createdAt: row.created_at ?? undefined,
    isRegisteredAccount: row.is_registered_account ?? false,
    pinHash: row.pin_hash ?? undefined,
    pinSalt: row.pin_salt ?? undefined,
    // pin_hash_version is added by supabase-schema-phase4.sql. Until
    // that ALTER runs, select('*') does not return the column and this
    // is undefined (= legacy hash). verifyStudentPin() always uses the
    // v2 iteration count for students, so a missing value changes
    // nothing for students.
    pinHashVersion: row.pin_hash_version ?? undefined,
  };
}

export function toTeacher(row: TeacherRow): TeacherAccount {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? '',
    phone: row.phone ?? '',
    college: row.college ?? '',
    department: row.department ?? '',
    designation: row.designation ?? '',
    teachingSubjects: Array.isArray(row.teaching_subjects) ? row.teaching_subjects : [],
    semestersTaught: Array.isArray(row.semesters_taught) ? row.semesters_taught : [],
    shift: row.shift === 'Day' ? 'Day' : row.shift === 'Both' ? 'Both' : 'Morning',
    sectionsTaught: Array.isArray(row.sections_taught) ? row.sections_taught : undefined,
    verificationStatus: (row.verification_status ?? 'Pending') as TeacherAccount['verificationStatus'],
    pinHash: row.pin_hash ?? '',
    pinSalt: row.pin_salt ?? '',
    // pin_hash_version is added by supabase-schema-phase4.sql. Until
    // that ALTER runs, select('*') does not return the column and this
    // is undefined, which verifyTeacherPin() treats as legacy
    // PBKDF2-1000 (v1) — correct for the migrated hashes.
    pinHashVersion: row.pin_hash_version ?? undefined,
    failedPinAttempts: row.failed_pin_attempts ?? 0,
    lockoutUntil: row.lockout_until ? Date.parse(row.lockout_until) : null,
    createdAt: row.created_at ?? '',
    adminNotes: row.admin_notes ?? undefined,
  };
}

export function toCaptain(row: CaptainRow): CaptainRecord {
  return {
    id: row.id,
    studentId: row.student_id ?? '',
    studentName: row.student_name ?? '',
    college: row.college ?? '',
    department: row.department ?? '',
    semester: (row.semester ?? 1) as CaptainRecord['semester'],
    shift: row.shift === 'Day' ? 'Day' : 'Morning',
    section: (row.section ?? 'A1') as CaptainRecord['section'],
    boardRoll: row.board_roll ?? undefined,
    regNumber: row.reg_number ?? undefined,
    phone: row.phone ?? undefined,
    session: row.session ?? undefined,
    status: row.status ?? 'Pending',
    appliedAt: row.applied_at ?? '',
    verificationFormUrl: row.verification_form_url ?? undefined,
    verificationFormName: row.verification_form_name ?? undefined,
    teacherEndorsement: (row.teacher_endorsement ?? undefined) as CaptainRecord['teacherEndorsement'],
    adminDecision: (row.admin_decision ?? undefined) as CaptainRecord['adminDecision'],
    rejectionReason: row.rejection_reason ?? undefined,
  };
}

export function toCommunity(row: CommunityRow): AcademicCommunity {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    college_id: row.college_id ?? '',
    college: row.college ?? '',
    department_id: row.department_id ?? '',
    department: row.department ?? '',
    semester: (row.semester ?? 1) as AcademicCommunity['semester'],
    regulation: row.regulation ?? '',
    shift: (row.shift ?? 'Morning') as AcademicCommunity['shift'],
    section: (row.section ?? 'All') as AcademicCommunity['section'],
    visibility: row.visibility === 'private' ? 'private' : 'public',
    created_by: row.created_by ?? '',
    created_by_name: row.created_by_name ?? '',
    created_by_role: (row.created_by_role ?? 'class_captain') as AcademicCommunity['created_by_role'],
    moderators: Array.isArray(row.moderators) ? row.moderators : [],
    member_count: row.member_count ?? 0,
    is_active: row.is_active ?? true,
    pinned_notice_id: row.pinned_notice_id ?? undefined,
    avatar_emoji: row.avatar_emoji ?? undefined,
    created_at: row.created_at ?? '',
    updated_at: row.updated_at ?? '',
  };
}

export function toMembership(row: MembershipRow): CommunityMembershipRecord {
  return {
    id: row.id,
    community_id: row.community_id,
    user_id: row.user_id,
    user_name: row.user_name ?? '',
    user_role: (row.user_role ?? 'student') as CommunityMembershipRecord['user_role'],
    college_id: row.college_id ?? '',
    department_id: row.department_id ?? '',
    semester: (row.semester ?? 1) as CommunityMembershipRecord['semester'],
    shift: (row.shift ?? undefined) as CommunityMembershipRecord['shift'],
    section: (row.section ?? undefined) as CommunityMembershipRecord['section'],
    membership_role: (row.membership_role ?? 'member') as CommunityMembershipRecord['membership_role'],
    status: (row.status ?? 'active') as CommunityMembershipRecord['status'],
    is_muted: row.is_muted ?? false,
    joined_at: row.joined_at ?? '',
    updated_at: row.updated_at ?? '',
  };
}

export function toMessage(row: MessageRow): CommunityMessageRecord {
  return {
    id: row.id,
    community_id: row.community_id,
    sender_id: row.sender_id ?? '',
    sender_name: row.sender_name ?? '',
    sender_role: (row.sender_role ?? 'student') as CommunityMessageRecord['sender_role'],
    sender_designation: row.sender_designation ?? undefined,
    is_moderator: row.is_moderator ?? false,
    content: row.content ?? '',
    attachments: (Array.isArray(row.attachments) ? row.attachments : []) as CommunityMessageRecord['attachments'],
    is_pinned: row.is_pinned ?? false,
    pinned_by: row.pinned_by ?? undefined,
    pinned_at: row.pinned_at ?? undefined,
    is_deleted: row.is_deleted ?? false,
    reports_count: row.reports_count ?? 0,
    created_at: row.created_at ?? '',
  };
}

/**
 * Routine row -> RoutinePeriod. Same scalar cleaning as
 * migrateAndValidateRoutineRecord() in server.ts (day / shift / section /
 * type fallbacks, regulation default '2022'), but NO re-resolution of
 * college/department and NO quarantine: the Postgres rows are verbatim
 * copies of already-migrated store records, and the route's own filter
 * (college_id / department_id / semester / publication_status) decides
 * visibility exactly as it does for the JSON store. A row with an invalid
 * semester maps to `semester: null`, which the route filter excludes.
 */
export function toRoutine(row: RoutineRow): RoutinePeriod {
  const day = (
    ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].includes(String(row.day))
      ? String(row.day)
      : 'Saturday'
  ) as RoutinePeriod['day'];
  const publicationStatus = (
    ['published', 'draft', 'needs_admin_review', 'archived'].includes(String(row.publication_status))
      ? String(row.publication_status)
      : 'published'
  ) as RoutinePeriod['publication_status'];
  return {
    id: row.id,
    day,
    periodNumber: Number(row.period_number) || 1,
    startTime: String(row.start_time || '08:00 AM'),
    endTime: String(row.end_time || '08:45 AM'),
    subjectCode: String(row.subject_code || '').trim(),
    subjectName: String(row.subject_name || '').trim(),
    teacherName: String(row.teacher_name || 'Department Instructor').trim(),
    room: String(row.room || 'TBA').trim(),
    type: row.type === 'Practical / Lab' ? 'Practical / Lab' : 'Theory',
    shift: row.shift === 'Day' ? 'Day' : 'Morning',
    section: (
      ['A1', 'A2', 'B1', 'B2'].includes(String(row.section)) ? String(row.section) : 'A1'
    ) as RoutinePeriod['section'],
    college_id: row.college_id ?? null,
    college: row.college ?? undefined,
    department_id: row.department_id ?? null,
    technology_id: row.technology_id ?? null,
    department: row.department ?? undefined,
    regulation: (
      row.regulation === '2016' || row.regulation === '2022' ? row.regulation : '2022'
    ) as RoutinePeriod['regulation'],
    semester: (
      row.semester !== null && Number.isInteger(row.semester) && row.semester >= 1 && row.semester <= 8
        ? row.semester
        : null
    ) as RoutinePeriod['semester'],
    created_by: row.created_by ?? undefined,
    created_by_name: row.created_by_name ?? undefined,
    created_by_role: (row.created_by_role ?? undefined) as RoutinePeriod['created_by_role'],
    publication_status: publicationStatus,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
  };
}

/**
 * Campus-notice row -> CampusNoticeItem. Same scalar cleaning as the
 * seed records in `INITIAL_CAMPUS_NOTICES` (src/data/mockData.ts):
 * enum fields fall back to their safe defaults, an invalid semester
 * maps to `null` (college-wide notice). Two date normalisations keep
 * the route's comparisons identical to the JSON path:
 * - `expiry_date` is `timestamptz` in Postgres but a date-only
 *   'YYYY-MM-DD' string in the store, and the route compares it with
 *   `< todayIso` as a string — so it is reduced to its date part.
 * - `published_at` / `updated_at` are normalised to `.000Z` ISO
 *   strings, the store's format (the route sorts on them via
 *   `new Date(...).getTime()`, so either format would sort the same,
 *   but the response shape stays identical).
 * NO re-resolution of college/department and NO cohort filtering here:
 * the Postgres rows are verbatim copies of already-migrated store
 * records, and the route's own filter (college/department ids,
 * semester/shift/section, targetScope, search, expiry) decides
 * visibility exactly as it does for the JSON store.
 */
export function toCampusNotice(row: CampusNoticeRow): CampusNoticeItem {
  const toIso = (value: string | null | undefined): string | undefined => {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
  };
  const publisherRole = (
    ['teacher', 'class_captain', 'system_admin'].includes(String(row.publisher_role))
      ? String(row.publisher_role)
      : 'teacher'
  ) as CampusNoticeItem['publisherRole'];
  const targetScope = (
    ['college', 'department', 'cohort'].includes(String(row.target_scope))
      ? String(row.target_scope)
      : 'college'
  ) as CampusNoticeItem['targetScope'];
  return {
    id: row.id,
    title: String(row.title ?? '').trim(),
    description: String(row.description ?? '').trim(),
    publisherId: String(row.publisher_id ?? ''),
    publisherName: String(row.publisher_name ?? '').trim(),
    publisherRole,
    publisherDesignation: row.publisher_designation ?? undefined,
    college_id: String(row.college_id ?? ''),
    college: String(row.college ?? ''),
    department_id: String(row.department_id ?? ''),
    department: String(row.department ?? ''),
    semester: (
      row.semester !== null && Number.isInteger(row.semester) && row.semester >= 1 && row.semester <= 8
        ? row.semester
        : null
    ) as CampusNoticeItem['semester'],
    shift: (
      ['Morning', 'Day', 'Both'].includes(String(row.shift)) ? String(row.shift) : null
    ) as CampusNoticeItem['shift'],
    section: (
      ['A1', 'A2', 'B1', 'B2', 'All'].includes(String(row.section)) ? String(row.section) : null
    ) as CampusNoticeItem['section'],
    targetScope,
    priority: (row.priority === 'Important' ? 'Important' : 'Normal') as CampusNoticeItem['priority'],
    isPinned: row.is_pinned ?? false,
    attachmentUrl: row.attachment_url ?? undefined,
    attachmentName: row.attachment_name ?? undefined,
    attachmentType: (
      ['PDF', 'IMAGE', 'DOCX'].includes(String(row.attachment_type)) ? String(row.attachment_type) : undefined
    ) as CampusNoticeItem['attachmentType'],
    expiryDate: row.expiry_date ? String(row.expiry_date).slice(0, 10) : undefined,
    publishedAt: toIso(row.published_at) ?? '',
    updatedAt: toIso(row.updated_at),
    reportsCount: row.reports_count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Shared filter types
// ---------------------------------------------------------------------------

export interface CohortFilter {
  college?: string;
  department?: string;
  semester?: number;
  shift?: string;
  section?: string;
}

// ---------------------------------------------------------------------------
// Students — replaces `academicStore.students.find/filter` + `getCohortRoster()`
// ---------------------------------------------------------------------------

/** Raw row (includes pin_hash/pin_salt and lockout columns) — for login/PIN code only. */
export async function getStudentRowByBoardRoll(boardRoll: string): Promise<StudentRow | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('students')
    .select('*')
    .eq('board_roll', boardRoll.trim())
    .maybeSingle();
  throwIfError(error, 'getStudentRowByBoardRoll');
  return (data as StudentRow | null) ?? null;
}

/** Mapped student by board roll. `registeredOnly` mirrors the login lookup (`isRegisteredAccount === true`). */
export async function getStudentByBoardRoll(
  boardRoll: string,
  options?: { registeredOnly?: boolean },
): Promise<EnrolledStudent | null> {
  const client = getSupabaseClient();
  let query = client.from('students').select('*').eq('board_roll', boardRoll.trim());
  if (options?.registeredOnly) query = query.eq('is_registered_account', true);
  const { data, error } = await query.maybeSingle();
  throwIfError(error, 'getStudentByBoardRoll');
  return data ? toStudent(data as StudentRow) : null;
}

export async function getStudentById(id: string): Promise<EnrolledStudent | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('students').select('*').eq('id', id).maybeSingle();
  throwIfError(error, 'getStudentById');
  return data ? toStudent(data as StudentRow) : null;
}

export async function getStudentRowById(id: string): Promise<StudentRow | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('students').select('*').eq('id', id).maybeSingle();
  throwIfError(error, 'getStudentRowById');
  return (data as StudentRow | null) ?? null;
}

export async function getStudentByRegNumber(regNumber: string): Promise<EnrolledStudent | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('students')
    .select('*')
    .eq('reg_number', regNumber.trim())
    .maybeSingle();
  throwIfError(error, 'getStudentByRegNumber');
  return data ? toStudent(data as StudentRow) : null;
}

/**
 * Cohort roster — replaces `getCohortRoster()` in server.ts.
 * Pass the EXACT stored college/department display names (resolve them
 * first with normalizeCollege()/normalizeTechnology()). NOTE: the stored
 * names do not always equal the canonical ones (e.g. stored
 * "Dhaka Polytechnic Institute (DPI), Tejgaon" vs canonical
 * "Dhaka Polytechnic Institute"), so callers that need canonical-id
 * matching must filter the returned rows in memory with
 * filterStudentsByCohort() instead of passing college/department here —
 * see GET /api/roster. Sorted by class roll numeric, then board roll, like
 * the JSON version (class_roll is text in Postgres, so the numeric sort
 * happens in memory, not in SQL).
 */
export async function listStudentsByCohort(filter: CohortFilter): Promise<EnrolledStudent[]> {
  const client = getSupabaseClient();
  let query = client.from('students').select('*');
  if (filter.college) query = query.eq('college', filter.college);
  if (filter.department) query = query.eq('department', filter.department);
  if (filter.semester !== undefined) query = query.eq('semester', filter.semester);
  if (filter.shift) query = query.eq('shift', filter.shift);
  if (filter.section) query = query.eq('section', filter.section);
  const { data, error } = await query;
  throwIfError(error, 'listStudentsByCohort');
  // class_roll is text in Postgres, so a SQL ORDER BY would sort it
  // lexicographically ("10" before "2"). Sort numerically in memory,
  // exactly like getCohortRoster() does in server.ts.
  return ((data ?? []) as StudentRow[])
    .map(toStudent)
    .sort((a, b) => {
      const crA = parseInt(a.classRoll, 10) || 999;
      const crB = parseInt(b.classRoll, 10) || 999;
      if (crA !== crB) return crA - crB;
      return a.boardRoll.localeCompare(b.boardRoll);
    });
}

/**
 * Partial update of one student (PIN setup, lockout persistence, profile
 * changes). Sets `updated_at`. Returns the mapped student, or null if the id
 * does not exist. Only columns present in `StudentRow` may be patched.
 * If the patch includes `pin_hash_version` and Postgres does not have
 * that column yet (supabase-schema-phase4.sql not run), the update is
 * retried once without it instead of failing — the PIN still lands.
 */
export async function updateStudentById(
  id: string,
  patch: Partial<Omit<StudentRow, 'id' | 'created_at'>>,
): Promise<EnrolledStudent | null> {
  const client = getSupabaseClient();
  const runUpdate = (p: Partial<Omit<StudentRow, 'id' | 'created_at'>>) =>
    client
      .from('students')
      .update({ ...p, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle();
  let { data, error } = await runUpdate(patch);
  if (error && 'pin_hash_version' in patch && isMissingColumnError(error, 'pin_hash_version')) {
    const { pin_hash_version: _dropped, ...patchWithoutVersion } = patch;
    ({ data, error } = await runUpdate(patchWithoutVersion));
  }
  throwIfError(error, 'updateStudentById');
  return data ? toStudent(data as StudentRow) : null;
}

/**
 * Insert helper for write route 3 (student register). Inserts one row
 * into `students` and returns the mapped student. Throws on any query
 * error (callers catch and fall back to JSON-only), following the same
 * contract as `updateCaptainRecordById` / `insertCommunity`.
 *
 * Column notes: `email` was added by supabase-migration-phase2.sql.
 * `pin_hash_version` is added by supabase-schema-phase4.sql — until
 * that ALTER runs, the insert is retried once without it on a
 * PGRST204 error, so the registration still lands in Postgres (the
 * column just stays unset). `attendance_rate` is numeric in Postgres
 * and a "98%" string in the app; an empty rate inserts as NULL.
 * `board_roll` is unique in Postgres: re-registering a roll that
 * already has a Postgres row fails here and the caller keeps the
 * JSON-store write (the register route's own duplicate check runs on
 * the JSON store first, so this only fires on a JSON/Postgres skew).
 */
export async function insertStudent(student: EnrolledStudent): Promise<EnrolledStudent> {
  const client = getSupabaseClient();
  const rate = parseFloat(String(student.attendanceRate || '').replace('%', ''));
  const row: StudentRow = {
    id: student.id,
    name: student.name,
    class_roll: student.classRoll || null,
    board_roll: student.boardRoll || null,
    reg_number: student.regNumber || null,
    college: student.college || null,
    department: student.department || null,
    semester: student.semester ?? null,
    shift: student.shift ?? null,
    section: student.section ?? null,
    phone: student.phone || null,
    email: student.email?.trim() ? student.email.trim() : null,
    account_type: student.accountType ?? 'student',
    captain_verification_status: student.captainVerificationStatus ?? 'NotApplied',
    attendance_rate: Number.isFinite(rate) ? rate : null,
    pin_hash: student.pinHash ?? null,
    pin_salt: student.pinSalt ?? null,
    pin_hash_version: student.pinHashVersion ?? null,
    failed_pin_attempts: 0,
    lockout_until: null,
    is_registered_account: student.isRegisteredAccount ?? false,
    auth_user_id: null,
    created_at: student.createdAt ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  let { data, error } = await client.from('students').insert(row).select('*').single();
  if (error && isMissingColumnError(error, 'pin_hash_version')) {
    const { pin_hash_version: _dropped, ...rowWithoutVersion } = row;
    ({ data, error } = await client.from('students').insert(rowWithoutVersion).select('*').single());
  }
  throwIfError(error, 'insertStudent');
  return toStudent(data as StudentRow);
}

// ---------------------------------------------------------------------------
// Teachers — replaces `serverTeachers` / `legacyUnregisteredTeachers` Maps.
// NOTE: those Maps are the live source of truth in server.ts today; a route
// migrated to these helpers must stop reading the Maps for that lookup, or
// the two sources will disagree. There is no sync between them yet.
// ---------------------------------------------------------------------------

export async function getTeacherRowByEmail(email: string): Promise<TeacherRow | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('teacher_accounts')
    .select('*')
    .eq('email', email.trim())
    .maybeSingle();
  throwIfError(error, 'getTeacherRowByEmail');
  return (data as TeacherRow | null) ?? null;
}

export async function getTeacherByEmail(email: string): Promise<TeacherAccount | null> {
  const row = await getTeacherRowByEmail(email);
  return row ? toTeacher(row) : null;
}

export async function getTeacherRowByPhone(phone: string): Promise<TeacherRow | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('teacher_accounts')
    .select('*')
    .eq('phone', phone.trim())
    .maybeSingle();
  throwIfError(error, 'getTeacherRowByPhone');
  return (data as TeacherRow | null) ?? null;
}

export async function getTeacherByPhone(phone: string): Promise<TeacherAccount | null> {
  const row = await getTeacherRowByPhone(phone);
  return row ? toTeacher(row) : null;
}

export async function getTeacherById(id: string): Promise<TeacherAccount | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('teacher_accounts').select('*').eq('id', id).maybeSingle();
  throwIfError(error, 'getTeacherById');
  return data ? toTeacher(data as TeacherRow) : null;
}

export async function updateTeacherById(
  id: string,
  patch: Partial<Omit<TeacherRow, 'id' | 'created_at'>>,
): Promise<TeacherAccount | null> {
  const client = getSupabaseClient();
  const runUpdate = (p: Partial<Omit<TeacherRow, 'id' | 'created_at'>>) =>
    client
      .from('teacher_accounts')
      .update({ ...p, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle();
  let { data, error } = await runUpdate(patch);
  // Same pin_hash_version grace as updateStudentById (see above): the
  // column is added by supabase-schema-phase4.sql; retry without it.
  if (error && 'pin_hash_version' in patch && isMissingColumnError(error, 'pin_hash_version')) {
    const { pin_hash_version: _dropped, ...patchWithoutVersion } = patch;
    ({ data, error } = await runUpdate(patchWithoutVersion));
  }
  throwIfError(error, 'updateTeacherById');
  return data ? toTeacher(data as TeacherRow) : null;
}

// ---------------------------------------------------------------------------
// Captains — replaces `academicStore.captainRecords.find/filter`
// ---------------------------------------------------------------------------

export async function getCaptainRecordById(id: string): Promise<CaptainRecord | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('captain_records').select('*').eq('id', id).maybeSingle();
  throwIfError(error, 'getCaptainRecordById');
  return data ? toCaptain(data as CaptainRow) : null;
}

export interface CaptainCohortFilter extends CohortFilter {
  status?: string;
}

/** List captain records for one cohort (semester/shift/section), optionally filtered by status. */
export async function listCaptainRecordsByCohort(filter: CaptainCohortFilter): Promise<CaptainRecord[]> {
  const client = getSupabaseClient();
  let query = client.from('captain_records').select('*');
  if (filter.college) query = query.eq('college', filter.college);
  if (filter.department) query = query.eq('department', filter.department);
  if (filter.semester !== undefined) query = query.eq('semester', filter.semester);
  if (filter.shift) query = query.eq('shift', filter.shift);
  if (filter.section) query = query.eq('section', filter.section);
  if (filter.status) query = query.eq('status', filter.status);
  const { data, error } = await query.order('applied_at', { ascending: false });
  throwIfError(error, 'listCaptainRecordsByCohort');
  return ((data ?? []) as CaptainRow[]).map(toCaptain);
}

/**
 * Approved captains for one exact group — the 2-per-section quota check (`getApprovedCaptainsForGroup()`).
 * WARNING: `filter.college` / `filter.department` must be the EXACT STORED
 * display names (e.g. "Dhaka Polytechnic Institute (DPI), Tejgaon"), NOT
 * canonical resolver names — the stored names do not equal the canonical
 * ones (see GET /api/roster). The quota check in server.ts takes canonical
 * ids, so it does NOT call this helper: it lists by status/semester/shift/
 * section via listCaptainRecordsByCohort() and filters by id in memory.
 */
export async function countApprovedCaptainsForGroup(filter: CohortFilter): Promise<number> {
  const client = getSupabaseClient();
  let query = client.from('captain_records').select('id', { count: 'exact', head: true }).eq('status', 'Approved');
  if (filter.college) query = query.eq('college', filter.college);
  if (filter.department) query = query.eq('department', filter.department);
  if (filter.semester !== undefined) query = query.eq('semester', filter.semester);
  if (filter.shift) query = query.eq('shift', filter.shift);
  if (filter.section) query = query.eq('section', filter.section);
  const { count, error } = await query;
  throwIfError(error, 'countApprovedCaptainsForGroup');
  return count ?? 0;
}

/**
 * Partial update of one captain record (admin decision, teacher
 * endorsement, rejection reason). Sets `updated_at`. Returns the mapped
 * record, or null if the id does not exist in Postgres (e.g. a record
 * created client-side that never reached the server store). Only columns
 * present in `CaptainRow` may be patched. Callers dual-writing a captain
 * decision must treat a null return / thrown error as "Postgres did not
 * take the write" and keep the JSON-store write as the source of truth.
 */
export async function updateCaptainRecordById(
  id: string,
  patch: Partial<Omit<CaptainRow, 'id' | 'created_at'>>,
): Promise<CaptainRecord | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('captain_records')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  throwIfError(error, 'updateCaptainRecordById');
  return data ? toCaptain(data as CaptainRow) : null;
}

// ---------------------------------------------------------------------------
// Communities + memberships — replaces the in-memory filtering in
// GET /api/communities, /recommended, /:id/members, /:id/messages.
// Visibility / eligibility rules (public vs private, is_active,
// deleted_at, isUserEligibleForCommunity) still live in server.ts and
// must be applied by the caller on the rows returned here — Postgres
// does not know them.
// ---------------------------------------------------------------------------

export async function listCommunities(): Promise<AcademicCommunity[]> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('communities').select('*').order('created_at', { ascending: false });
  throwIfError(error, 'listCommunities');
  return ((data ?? []) as CommunityRow[]).map(toCommunity);
}

export async function getCommunityById(id: string): Promise<AcademicCommunity | null> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('communities').select('*').eq('id', id).maybeSingle();
  throwIfError(error, 'getCommunityById');
  return data ? toCommunity(data as CommunityRow) : null;
}

/** All memberships for one user (any status) — the `memberships` field of GET /api/communities. */
export async function listMembershipsForUser(
  userId: string,
  statuses?: string[],
): Promise<CommunityMembershipRecord[]> {
  const client = getSupabaseClient();
  let query = client.from('community_memberships').select('*').eq('user_id', userId);
  if (statuses && statuses.length > 0) query = query.in('status', statuses);
  const { data, error } = await query.order('joined_at', { ascending: false });
  throwIfError(error, 'listMembershipsForUser');
  return ((data ?? []) as MembershipRow[]).map(toMembership);
}

export async function listMembershipsForCommunity(communityId: string): Promise<CommunityMembershipRecord[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('community_memberships')
    .select('*')
    .eq('community_id', communityId)
    .order('joined_at', { ascending: true });
  throwIfError(error, 'listMembershipsForCommunity');
  return ((data ?? []) as MembershipRow[]).map(toMembership);
}

export async function getMembership(userId: string, communityId: string): Promise<CommunityMembershipRecord | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('community_memberships')
    .select('*')
    .eq('user_id', userId)
    .eq('community_id', communityId)
    .maybeSingle();
  throwIfError(error, 'getMembership');
  return data ? toMembership(data as MembershipRow) : null;
}

/** Latest messages for a community (newest first). `limit` defaults to 100. */
export async function listCommunityMessages(
  communityId: string,
  limit = 100,
): Promise<CommunityMessageRecord[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('community_messages')
    .select('*')
    .eq('community_id', communityId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);
  throwIfError(error, 'listCommunityMessages');
  return ((data ?? []) as MessageRow[]).map(toMessage);
}

/**
 * Insert helpers for write route 2 (community create + message post).
 * The caller dual-writes: Postgres FIRST, then the JSON store. These
 * throw on any query error (callers catch and fall back to JSON-only),
 * following the same contract as `updateCaptainRecordById`.
 *
 * Column gaps (same as the read mappers): `communities` has NO
 * `image_url` column, so the community image URL is JSON-only and is
 * deliberately omitted here — inserting it would fail with an unknown-
 * column error. `community_messages` has no `deleted_by` / `updated_at`
 * columns, so those are omitted too. Attachments are inserted verbatim
 * (jsonb), including `file_data` base64 bytes, so the Postgres copy is
 * faithful to the JSON store.
 */
export async function insertCommunity(community: AcademicCommunity): Promise<AcademicCommunity> {
  const client = getSupabaseClient();
  const row: CommunityRow = {
    id: community.id,
    name: community.name,
    description: community.description,
    college_id: community.college_id,
    college: community.college,
    department_id: community.department_id,
    department: community.department,
    semester: community.semester,
    regulation: community.regulation,
    shift: community.shift,
    section: community.section,
    visibility: community.visibility,
    created_by: community.created_by,
    created_by_name: community.created_by_name,
    created_by_role: community.created_by_role,
    moderators: community.moderators,
    member_count: community.member_count,
    is_active: community.is_active,
    avatar_emoji: community.avatar_emoji ?? null,
    pinned_notice_id: community.pinned_notice_id ?? null,
    created_at: community.created_at,
    updated_at: community.updated_at,
  };
  const { data, error } = await client.from('communities').insert(row).select('*').single();
  throwIfError(error, 'insertCommunity');
  return toCommunity(data as CommunityRow);
}

export async function insertCommunityMembership(
  membership: CommunityMembershipRecord,
): Promise<CommunityMembershipRecord> {
  const client = getSupabaseClient();
  const row: MembershipRow = {
    id: membership.id,
    community_id: membership.community_id,
    user_id: membership.user_id,
    user_name: membership.user_name,
    user_role: membership.user_role,
    college_id: membership.college_id,
    department_id: membership.department_id,
    semester: membership.semester,
    shift: membership.shift ?? null,
    section: membership.section ?? null,
    membership_role: membership.membership_role,
    status: membership.status,
    is_muted: membership.is_muted,
    joined_at: membership.joined_at,
    updated_at: membership.updated_at,
  };
  const { data, error } = await client.from('community_memberships').insert(row).select('*').single();
  throwIfError(error, 'insertCommunityMembership');
  return toMembership(data as MembershipRow);
}

export async function insertCommunityMessage(message: CommunityMessageRecord): Promise<CommunityMessageRecord> {
  const client = getSupabaseClient();
  const row: MessageRow = {
    id: message.id,
    community_id: message.community_id,
    sender_id: message.sender_id,
    sender_name: message.sender_name,
    sender_role: message.sender_role,
    sender_designation: message.sender_designation ?? null,
    is_moderator: message.is_moderator,
    content: message.content,
    attachments: message.attachments,
    is_pinned: message.is_pinned,
    pinned_by: message.pinned_by ?? null,
    pinned_at: message.pinned_at ?? null,
    is_deleted: message.is_deleted,
    reports_count: message.reports_count,
    created_at: message.created_at,
  };
  const { data, error } = await client.from('community_messages').insert(row).select('*').single();
  throwIfError(error, 'insertCommunityMessage');
  return toMessage(data as MessageRow);
}

// ---------------------------------------------------------------------------
// Routines — replaces the `academicStore.routines.filter(...)` reads in
// GET /api/routines. The cohort (college_id / department_id) and
// publication_status filtering still lives in server.ts and must be
// applied by the caller on the rows returned here — Postgres does not
// know the visibility rules, and the stored college/department display
// names do not equal the canonical resolver names, so exact-name SQL
// matching is unsafe (same trap as GET /api/roster).
// ---------------------------------------------------------------------------

export interface RoutineFilter {
  semester?: number;
  shift?: string;
  section?: string;
  day?: string;
}

const WEEKDAY_ORDER: Record<string, number> = {
  Saturday: 0,
  Sunday: 1,
  Monday: 2,
  Tuesday: 3,
  Wednesday: 4,
  Thursday: 5,
};

/**
 * Routines for one cohort slice. Narrows in SQL ONLY on the
 * exact-match-safe fields (semester / shift / section, plus optional
 * day) — never on college/department display names. The caller filters
 * the returned rows in memory by college_id / department_id /
 * publication_status, exactly as the JSON path does. Sorted by weekday
 * (Saturday first) then period number, like a routine list is displayed.
 */
export async function listRoutines(filter: RoutineFilter): Promise<RoutinePeriod[]> {
  const client = getSupabaseClient();
  let query = client.from('routines').select('*');
  if (filter.semester !== undefined) query = query.eq('semester', filter.semester);
  if (filter.shift) query = query.eq('shift', filter.shift);
  if (filter.section) query = query.eq('section', filter.section);
  if (filter.day) query = query.eq('day', filter.day);
  const { data, error } = await query;
  throwIfError(error, 'listRoutines');
  return ((data ?? []) as RoutineRow[])
    .map(toRoutine)
    .sort((a, b) => {
      const dayDiff = (WEEKDAY_ORDER[a.day] ?? 99) - (WEEKDAY_ORDER[b.day] ?? 99);
      return dayDiff !== 0 ? dayDiff : a.periodNumber - b.periodNumber;
    });
}

// ---------------------------------------------------------------------------
// Campus notices — replaces the `academicStore.campusNotices` read in
// GET /api/notices/campus. No SQL narrowing on college/department: the
// stored display names do not equal the canonical resolver names, so
// exact-name SQL matching is unsafe (same trap as GET /api/roster and
// GET /api/routines), and the route's visibility filter depends on the
// caller's `filter` / session role / search query anyway. The caller
// applies its unchanged in-memory filter (college/department ids,
// semester/shift/section, targetScope, search, expiry, pinned sort) to
// the rows returned here, exactly as it does for the JSON store.
// ---------------------------------------------------------------------------

/**
 * All campus notices, newest first. Throws
 * `Supabase listCampusNotices failed: …` on error (no silent nulls);
 * the route's fetch helper catches that and falls back to the JSON
 * store, so the route never 500s for a DB error.
 */
export async function listCampusNotices(): Promise<CampusNoticeItem[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('campus_notices')
    .select('*')
    .order('published_at', { ascending: false });
  throwIfError(error, 'listCampusNotices');
  return ((data ?? []) as CampusNoticeRow[]).map(toCampusNotice);
}
