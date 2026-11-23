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
 * - `pin_hash_version` is NOT a column in Postgres yet. Mapped teachers
 *   return `pinHashVersion: undefined`, which `server.ts`
 *   `verifyTeacherPin()` treats as legacy PBKDF2-1000 (v1). That is correct
 *   for the migrated hashes (all legacy), but a v2 upgrade after login
 *   needs `ALTER TABLE teacher_accounts ADD COLUMN pin_hash_version int`.
 * - Student lockout is in-memory only in `server.ts`
 *   (`studentLoginFailures` Map, line ~612); the Postgres columns
 *   `failed_pin_attempts` / `lockout_until` exist but `EnrolledStudent`
 *   has no such fields, so they are only exposed via the raw-row helpers.
 * - `pendingTeacherEndorsements` (a `Record<string, …>` inside the JSON
 *   store) has NO Postgres table yet — it needs one before
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
  CaptainRecord,
  CommunityMembershipRecord,
  CommunityMessageRecord,
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
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Supabase ${context} failed: ${message}`);
  }
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
  failed_pin_attempts: number | null;
  lockout_until: string | null;
  admin_notes: string | null;
  auth_user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** ServerTeacher shape as defined in server.ts (pinHashVersion has no Postgres column yet). */
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
    // pinHashVersion: no Postgres column yet — see header note.
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
    // pinHashVersion: no Postgres column yet — see header note.
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
 * first with normalizeCollege()/normalizeTechnology()). Sorted by class
 * roll numeric, then board roll, like the JSON version.
 */
export async function listStudentsByCohort(filter: CohortFilter): Promise<EnrolledStudent[]> {
  const client = getSupabaseClient();
  let query = client.from('students').select('*');
  if (filter.college) query = query.eq('college', filter.college);
  if (filter.department) query = query.eq('department', filter.department);
  if (filter.semester !== undefined) query = query.eq('semester', filter.semester);
  if (filter.shift) query = query.eq('shift', filter.shift);
  if (filter.section) query = query.eq('section', filter.section);
  const { data, error } = await query.order('class_roll', { ascending: true }).order('board_roll', { ascending: true });
  throwIfError(error, 'listStudentsByCohort');
  return ((data ?? []) as StudentRow[]).map(toStudent);
}

/**
 * Partial update of one student (PIN setup, lockout persistence, profile
 * changes). Sets `updated_at`. Returns the mapped student, or null if the id
 * does not exist. Only columns present in `StudentRow` may be patched.
 */
export async function updateStudentById(
  id: string,
  patch: Partial<Omit<StudentRow, 'id' | 'created_at'>>,
): Promise<EnrolledStudent | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('students')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  throwIfError(error, 'updateStudentById');
  return data ? toStudent(data as StudentRow) : null;
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
  const { data, error } = await client
    .from('teacher_accounts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .maybeSingle();
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

/** Approved captains for one exact group — the 2-per-section quota check (`getApprovedCaptainsForGroup()`). */
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
