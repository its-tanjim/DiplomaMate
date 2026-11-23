import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import crypto from 'crypto';
import {
  resolveBtebSubjectCode,
  resolveBtebInstitute,
  normalizeCollege,
  normalizeTechnology,
  resolveStrictCollege,
  resolveStrictTechnology,
  getCurriculumSubjects,
  TECHNOLOGIES_DIRECTORY
} from './src/data/directoryData';
import {
  buildStarterSubjectCatalog,
  buildUploaded2022DepartmentRecords,
  validateAndNormalizeCatalogRecord,
  extractRawCatalogItemsFromPayload,
  parseJsonPayloadWithSyntaxCheck,
  buildCatalogRecordId,
  buildCatalogCompositeKey,
  matchCanonicalTechnology
} from './src/data/starterSubjectCatalog';
import { UPLOADED_DEPARTMENT_DATASETS } from './src/data/uploadedDepartmentDatasets';
import {
  MOCK_ENROLLED_STUDENTS,
  INITIAL_ROUTINE,
  INITIAL_APPLICATIONS,
  INITIAL_JOBS,
  INITIAL_CAMPUS_NOTICES,
  LEGACY_DEMO_CONTENT_IDS,
  type EnrolledStudent
} from './src/data/mockData';
import type {
  AccountType,
  SystemAdminProfile,
  Shift,
  Section,
  BtebRegulation,
  BtebExamType,
  SemesterNumber,
  ReferredSubjectEntry,
  SubjectGradeEntry,
  BtebResultBatch,
  StudentResultRecord,
  GroupResultItem,
  GroupResultAnalytics,
  BtebStudentResultStatement,
  BtebSemesterSummaryItem,
  BtebFailedSubjectDetail,
  BtebCurriculumId,
  ResultImportAuditLog,
  NoteItem,
  AssignmentItem,
  AssignmentSubmissionRecord,
  AssignmentSubmissionSummary,
  AttendanceStatus,
  AttendanceRecordEntry,
  AttendanceAuditEntry,
  AttendanceSheet,
  OcrExtractedStudentCandidate,
  MonthlyStudentAttendanceRow,
  CatalogRegulation,
  CatalogVerificationStatus,
  SubjectCatalogRecord,
  CatalogDuplicateWarning,
  CatalogVerifiedConflict,
  CatalogImportPreviewSummary,
  CatalogImportAuditLog,
  ShiftScheduleConfig,
  PeriodSlotConfig,
  PeriodBreakConfig,
  CalculatorRegulation,
  SubjectMarkInputEntry,
  SavedSemesterCalculatorRecord,
  RoutinePeriod,
  RoutinePublicationStatus,
  RoutineNotificationRecord,
  CaptainRecord,
  AcademicCommunity,
  CommunityMembershipRecord,
  CommunityAttachment,
  CommunityMessageRecord,
  CommunityReportRecord,
  JobCircular,
  JobStatus,
  BtebOfficialNotice,
  BtebNoticeCategory,
  CampusNoticeItem,
  CampusNoticeScope,
  CampusNoticeReportRecord,
  WeekDay
} from './src/types';
import {
  buildDefaultShiftScheduleConfig,
  recalculateShiftSchedulePeriods,
  resetSinglePeriodToSuggested,
  buildShiftScheduleKey,
  SHIFT_DEFAULT_START_TIME,
  DEFAULT_PERIOD_DURATION_MINUTES
} from './src/data/shiftScheduleUtils';
import {
  scanDocumentWithIntelligence,
  extractPdfContentInBatches,
  extractEmbeddedTextFromImageBuffer,
  validateAndDecodeUploadedFile
} from './src/services/serverDocumentIntelligence';
// Phase 4 route migration 1: GET /api/communities reads Postgres first,
// falling back to the JSON store. Only that route uses these helpers so far.
import {
  isSupabaseConfigured,
  listCommunities,
  listMembershipsForUser
} from './server/supabaseClient';

dotenv.config();

// Startup guard: refuse to run unless the environment is explicit. Without
// NODE_ENV=production the server mounts the Vite dev middleware (source
// serving + HMR) and Express leaks stack traces — that must never happen on
// a public host. Render sets NODE_ENV=production by default and the VPS
// .env sets it explicitly; local development must use NODE_ENV=development.
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'development') {
  throw new Error('Refusing to start: NODE_ENV must be explicitly set to "production" or "development".');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// AI Studio dev environment requires port 3000. Use process.env.PORT only in production container deployments.
const PORT = process.env.NODE_ENV === 'production' && process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const allowedAppOrigins = new Set([
  'https://localhost',
  'http://localhost:3000'
]);
for (const configuredUrl of [
  process.env.APP_URL,
  process.env.VITE_API_BASE_URL,
  ...(process.env.CORS_ALLOWED_ORIGINS || '').split(',')
]) {
  if (!configuredUrl?.trim()) continue;
  const parsedUrl = new URL(configuredUrl.trim());
  if (
    parsedUrl.protocol !== 'https:' ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.pathname !== '/' ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error('APP_URL, VITE_API_BASE_URL, and CORS_ALLOWED_ORIGINS must contain HTTPS origins without paths or credentials.');
  }
  allowedAppOrigins.add(parsedUrl.origin);
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('Origin');
  if (origin && allowedAppOrigins.has(origin)) {
    res.vary('Origin');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ---------------------------------------------------------------------------
// Security headers (defence in depth; no new dependencies).
// CSP allows the app's own result viewers in iframes (BTEB Result Zone and
// the official BTEB portal), Google Fonts, the GitHub update-checker API,
// and the jsDelivr CDN used by the client-side Tesseract OCR worker.
// Login rework: also allows Google Identity Services, the Facebook JS SDK
// and Cloudflare Turnstile (scripts + frames + API calls) so the social
// login buttons and the CAPTCHA widget can load when configured.
// ---------------------------------------------------------------------------
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  const cspConnectSrc = [
    "'self'",
    ...Array.from(allowedAppOrigins),
    'https://api.github.com',
    'https://raw.githubusercontent.com',
    'https://cdn.jsdelivr.net',
    'https://accounts.google.com',
    'https://oauth2.googleapis.com',
    'https://graph.facebook.com',
    'https://challenges.cloudflare.com'
  ].join(' ');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'wasm-unsafe-eval' https://accounts.google.com https://connect.facebook.net https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      'font-src \'self\' https://fonts.gstatic.com data:',
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: data:",
      `connect-src ${cspConnectSrc}`,
      "frame-src 'self' https://btebresultszone.com https://result.bteb.gov.bd https://accounts.google.com https://www.facebook.com https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );
  next();
});

// ---------------------------------------------------------------------------
// In-memory rate limiting (no new dependencies).
// The client IP comes from X-Forwarded-For when a trusted proxy sets it
// (Render does); otherwise it falls back to the socket address. Note the
// VPS nginx template does not forward the client IP yet, so anonymous
// traffic from the VPS currently shares one bucket — see the deployment
// note in the summary; authenticated traffic is keyed by session token
// and is unaffected.
// ---------------------------------------------------------------------------
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

function createRateLimiter(options: {
  windowMs: number;
  max: number;
  key: (req: Request) => string;
  message: string;
}) {
  const buckets = new Map<string, RateLimitBucket>();
  const pruneTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 10 * 60 * 1000);
  if (typeof (pruneTimer as unknown as { unref?: unknown }).unref === 'function') {
    (pruneTimer as unknown as { unref: () => void }).unref();
  }
  return (req: Request, res: Response, next: NextFunction) => {
    const key = options.key(req);
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > options.max) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ success: false, error: options.message });
    }
    return next();
  };
}

// Global API limit: ~100 requests / 15 min per logged-in session; anonymous
// (no session token) traffic shares a 300 / 15 min bucket per client IP.
const sessionApiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  key: (req) => `sess:${(extractBearerToken(req) || '').slice(0, 16)}`,
  message: 'Too many requests. Please wait a few minutes and try again.'
});
const anonymousApiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  key: (req) => `ip:${getClientIp(req)}`,
  message: 'Too many requests. Please wait a few minutes and try again.'
});
function apiRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith('/api')) return next();
  if (req.method === 'OPTIONS') return next();
  return extractBearerToken(req)
    ? sessionApiRateLimiter(req, res, next)
    : anonymousApiRateLimiter(req, res, next);
}

// Strict limit for login / PIN / auth endpoints: 5 attempts / 15 min per
// (client IP + account identifier), so one attacker's guessing against many
// accounts still hits the IP bucket while a single account is protected.
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  key: (req) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const identifier = String(
      body.email || body.phoneOrEmail || body.boardRoll || body.teacherId || body.userId || ''
    ).trim().toLowerCase() || 'unknown';
    return `auth:${getClientIp(req)}:${identifier}`;
  },
  message: 'Too many login attempts. Please wait 15 minutes and try again.'
});

// Second layer for auth endpoints: 30 attempts / 15 min per client IP, so
// an attacker cannot dodge the per-account limit by rotating identifiers.
const authIpRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  key: (req) => `authip:${getClientIp(req)}`,
  message: 'Too many login attempts from this network. Please wait 15 minutes and try again.'
});

// Strict limit for the Gemini-backed scan endpoints: 10 scans / 15 min per
// session (or per IP when anonymous) so the GEMINI_API_KEY quota cannot be
// burned by automated calls.
const aiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  key: (req) => {
    const token = extractBearerToken(req);
    return token ? `ai:sess:${token.slice(0, 16)}` : `ai:ip:${getClientIp(req)}`;
  },
  message: 'Too many document scans. Please wait a few minutes and try again.'
});

// ---------------------------------------------------------------------------
// Global authentication for mutating API routes.
// Every POST/PUT/PATCH/DELETE under /api requires a valid session, except
// the explicit public allow-list below (login / registration / bootstrap /
// PIN-verified teacher endorsement / public result lookup / payments
// (disabled: the handler returns 503). GET reads keep their
// existing per-handler checks.
// ---------------------------------------------------------------------------
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = getAuthenticatedSession(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please sign in.' });
  }
  (req as unknown as { session: ServerSession }).session = session;
  return next();
}

// System administrators and verified teachers only. The schedule config
// (and other admin/teacher writes) must not be changeable by students.
function requireAdminOrTeacher(req: Request, res: Response, next: NextFunction) {
  const existing = (req as unknown as { session?: ServerSession }).session;
  const session = existing || getAuthenticatedSession(req);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please sign in.' });
  }
  if (session.role !== 'system_admin' && session.role !== 'teacher') {
    return res.status(403).json({ success: false, error: 'Forbidden: Only a System Administrator or a verified Teacher can do this.' });
  }
  (req as unknown as { session: ServerSession }).session = session;
  return next();
}

const PUBLIC_MUTATING_ROUTES = new Set([
  'POST /api/payments/verify', // payments disabled: handler returns 503
  'POST /api/teachers/register',
  'POST /api/students/register',
  'POST /api/students/setup-pin', // one-time PIN setup, token-authenticated internally
  'POST /api/students/sms/verify', // login step, challenge-authenticated internally
  'POST /api/students/sms/resend', // login step, challenge-authenticated internally
  'POST /api/auth/google', // Google ID-token verification, server-side
  'POST /api/auth/facebook', // Facebook token verification, server-side
  'POST /api/auth/session',
  'POST /api/auth/logout',
  'POST /api/students/login',
  'POST /api/admin/bootstrap',
  'POST /api/admin/login',
  'POST /api/teachers/login',
  'POST /api/verification/teacher-approve', // PIN-authenticated internally
  'POST /api/results/group' // public result lookup
]);

function requireAuthForMutations(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith('/api')) return next();
  if (req.method === 'OPTIONS' || req.method === 'GET' || req.method === 'HEAD') return next();
  if (PUBLIC_MUTATING_ROUTES.has(`${req.method} ${req.path}`)) return next();
  return requireAuth(req, res, next);
}

app.use(apiRateLimitMiddleware);
app.use(requireAuthForMutations);

// In-memory verified transaction storage to prevent replay attacks / duplicate payments
const verifiedTransactions = new Set<string>();

/**
 * ============================================================================
 * 0. SERVER-SIDE AUTHENTICATION, SESSIONS & SYSTEM_ADMIN PROVISIONING
 * ============================================================================
 * - Stores System Administrator credentials in `data/system-admins.json`
 * - Zero hardcoded administrator passwords in code
 * - Supports startup env var provisioning (`INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`),
 *   one-time server bootstrap token (`ADMIN_BOOTSTRAP_TOKEN` or `data/.admin-bootstrap-token`),
 *   and CLI provisioning (`npm run provision-admin`)
 * - Server-side session store (`serverSessions`) derives role from Bearer token,
 *   never trusting client-supplied `requesterRole` fields
 */
export interface StoredSystemAdmin {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  // Hash scheme version: undefined/1 = PBKDF2-SHA256 10,000 iterations
  // (legacy), 2 = PBKDF2-SHA256 600,000 iterations. Verification stays
  // compatible with stored legacy hashes; a successful legacy login
  // transparently upgrades the hash to v2 (see verifyAdminPassword).
  passwordHashVersion?: number;
  role: 'system_admin';
  failedAttempts: number;
  lockoutUntil: number | null;
  createdAt: string;
  lastLoginAt?: string;
}

export interface ServerSession {
  token: string;
  userId: string;
  role: AccountType;
  name: string;
  email: string;
  college?: string;
  department?: string;
  boardRoll?: string;
  classRoll?: string;
  regNumber?: string;
  semester?: SemesterNumber;
  shift?: Shift;
  section?: Section;
  createdAt: number;
  expiresAt: number;
}

const AUTH_DATA_DIR = path.resolve(__dirname, 'data');
const ADMINS_STORE_FILE = path.join(AUTH_DATA_DIR, 'system-admins.json');
const BOOTSTRAP_TOKEN_FILE = path.join(AUTH_DATA_DIR, '.admin-bootstrap-token');

// Cryptographic PBKDF2 helper for administrator passwords.
// Legacy hashes use 10,000 iterations; new hashes (v2) use 600,000.
// The iteration count is a parameter (default legacy) so verification of
// already-stored hashes keeps working — see verifyAdminPassword.
const ADMIN_PASSWORD_ITERATIONS_V2 = 600000;
function hashAdminPassword(password: string, salt: string, iterations = 10000): string {
  return crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
}

// Verify an admin password against the hash scheme the stored record uses.
// On a successful legacy login the caller should upgrade the stored hash
// to v2 via upgradeAdminPasswordHash (persisted by the existing save call).
function verifyAdminPassword(password: string, admin: StoredSystemAdmin): boolean {
  const iterations = admin.passwordHashVersion === 2 ? ADMIN_PASSWORD_ITERATIONS_V2 : 10000;
  return hashAdminPassword(password, admin.passwordSalt, iterations) === admin.passwordHash;
}

function upgradeAdminPasswordHash(admin: StoredSystemAdmin, password: string): void {
  if (admin.passwordHashVersion === 2) return;
  const salt = generateSalt();
  admin.passwordSalt = salt;
  admin.passwordHash = hashAdminPassword(password, salt, ADMIN_PASSWORD_ITERATIONS_V2);
  admin.passwordHashVersion = 2;
}

function sanitizeSystemAdmin(admin: StoredSystemAdmin): SystemAdminProfile {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    role: 'system_admin',
    createdAt: admin.createdAt,
    lastLoginAt: admin.lastLoginAt
  };
}

function loadSystemAdminsFromDisk(): Map<string, StoredSystemAdmin> {
  const map = new Map<string, StoredSystemAdmin>();
  try {
    if (!fs.existsSync(AUTH_DATA_DIR)) {
      fs.mkdirSync(AUTH_DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(ADMINS_STORE_FILE)) {
      const raw = fs.readFileSync(ADMINS_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.admins)) {
        for (const a of parsed.admins) {
          if (a && a.id && a.email && a.passwordHash && a.passwordSalt) {
            map.set(a.id, {
              ...a,
              role: 'system_admin',
              failedAttempts: Number(a.failedAttempts) || 0,
              lockoutUntil: a.lockoutUntil || null
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('[System Admin Store] Error reading system-admins.json:', err);
  }
  return map;
}

function saveSystemAdminsToDisk(adminsMap: Map<string, StoredSystemAdmin>): void {
  try {
    if (!fs.existsSync(AUTH_DATA_DIR)) {
      fs.mkdirSync(AUTH_DATA_DIR, { recursive: true });
    }
    const list = Array.from(adminsMap.values());
    const tempFile = `${ADMINS_STORE_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify({ admins: list }, null, 2), 'utf-8');
    fs.renameSync(tempFile, ADMINS_STORE_FILE);
  } catch (err) {
    console.error('[System Admin Store] Error writing system-admins.json:', err);
  }
}

let systemAdmins: Map<string, StoredSystemAdmin> = loadSystemAdminsFromDisk();

// Initialize or synchronize startup environment-provisioned admin or one-time bootstrap token
function initializeAdminProvisioning(): void {
  systemAdmins = loadSystemAdminsFromDisk();
  const envEmail = (process.env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();
  const envPassword = (process.env.INITIAL_ADMIN_PASSWORD || '').trim();

  if (envEmail && envPassword && envPassword.length >= 8) {
    let exists = false;
    for (const admin of systemAdmins.values()) {
      if (admin.email.toLowerCase() === envEmail) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashAdminPassword(envPassword, salt, ADMIN_PASSWORD_ITERATIONS_V2);
      const newAdmin: StoredSystemAdmin = {
        id: `sysadmin_${Date.now()}`,
        name: 'Academic System Administrator',
        email: envEmail,
        passwordHash,
        passwordSalt: salt,
        passwordHashVersion: 2,
        role: 'system_admin',
        failedAttempts: 0,
        lockoutUntil: null,
        createdAt: new Date().toISOString()
      };
      systemAdmins.set(newAdmin.id, newAdmin);
      saveSystemAdminsToDisk(systemAdmins);
      console.log(`[System Admin Provisioning] Provisioned initial system_admin from environment variable: ${envEmail}`);
    }
  }

  // If zero admins exist, ensure a one-time server-side bootstrap setup token is available on the server
  if (systemAdmins.size === 0) {
    let token = (process.env.ADMIN_BOOTSTRAP_TOKEN || '').trim();
    if (!token) {
      if (fs.existsSync(BOOTSTRAP_TOKEN_FILE)) {
        try {
          token = fs.readFileSync(BOOTSTRAP_TOKEN_FILE, 'utf-8').trim();
        } catch {
          token = '';
        }
      }
      if (!token) {
        token = crypto.randomBytes(24).toString('hex');
        try {
          if (!fs.existsSync(AUTH_DATA_DIR)) {
            fs.mkdirSync(AUTH_DATA_DIR, { recursive: true });
          }
          fs.writeFileSync(BOOTSTRAP_TOKEN_FILE, token, { encoding: 'utf-8', mode: 0o600 });
        } catch {
          // ignore file write issues
        }
      }
    }
    console.log(
      `[System Admin Provisioning] No system_admin account exists yet. Use 'npm run provision-admin' or POST /api/admin/bootstrap with the server setup token (stored in data/.admin-bootstrap-token or ADMIN_BOOTSTRAP_TOKEN).`
    );
  } else {
    // Clean up one-time bootstrap token file if at least one admin exists
    if (fs.existsSync(BOOTSTRAP_TOKEN_FILE)) {
      try {
        fs.unlinkSync(BOOTSTRAP_TOKEN_FILE);
      } catch {
        // ignore
      }
    }
  }
}

initializeAdminProvisioning();

// Server-side opaque session token store
const serverSessions = new Map<string, ServerSession>();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Student login failure tracking (mirrors the admin/teacher lockout: 5
// failed attempts -> 15 minute lockout). In-memory like the teacher
// lockout; keyed by student id once the account is found, otherwise by
// board roll so unknown roll+reg pairs cannot be enumerated freely.
interface StudentLoginFailure {
  count: number;
  lockoutUntil: number | null;
}
const studentLoginFailures = new Map<string, StudentLoginFailure>();
const STUDENT_LOGIN_MAX_FAILURES = 5;
const STUDENT_LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

function createServerSession(params: {
  userId: string;
  role: AccountType;
  name: string;
  email: string;
  college?: string;
  department?: string;
  boardRoll?: string;
  classRoll?: string;
  regNumber?: string;
  semester?: SemesterNumber;
  shift?: Shift;
  section?: Section;
}): ServerSession {
  const token = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const session: ServerSession = {
    token,
    userId: params.userId,
    role: params.role,
    name: params.name,
    email: params.email,
    college: params.college,
    department: params.department,
    boardRoll: params.boardRoll,
    classRoll: params.classRoll,
    regNumber: params.regNumber,
    semester: params.semester,
    shift: params.shift,
    section: params.section,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS
  };
  serverSessions.set(token, session);
  return session;
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const headerToken = req.headers['x-auth-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }
  return null;
}

function getAuthenticatedSession(req: Request): ServerSession | null {
  const token = extractBearerToken(req);
  if (!token) return null;
  const session = serverSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    serverSessions.delete(token);
    return null;
  }
  if (deletedAccountIds.has(session.userId)) {
    serverSessions.delete(token);
    return null;
  }
  // If session is system_admin, verify admin still exists in store
  if (session.role === 'system_admin') {
    systemAdmins = loadSystemAdminsFromDisk();
    if (!systemAdmins.has(session.userId)) {
      serverSessions.delete(token);
      return null;
    }
  }
  return session;
}

/**
 * Strict Server-Side Middleware: Only allows authenticated `system_admin` sessions.
 * Never trusts client-supplied `requesterRole` in body or query parameters.
 * Returns HTTP 403 Forbidden for any non-admin or unauthenticated call.
 */
function requireSystemAdmin(req: Request, res: Response, next: NextFunction) {
  const session = getAuthenticatedSession(req);
  if (!session || session.role !== 'system_admin') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Only an authenticated System Administrator is authorized to perform this administrative operation.'
    });
  }
  (req as any).adminSession = session;
  return next();
}

/**
 * Community creation gate: allows authenticated `system_admin`, verified
 * `teacher`, and verified `class_captain` sessions to create academic
 * communities. Plain students cannot create communities. Never trusts
 * client-supplied `requesterRole` in body or query parameters.
 * (Teacher login already requires a Verified faculty account, and a
 * `class_captain` session only exists for an approved captain.)
 */
function requireCommunityCreator(req: Request, res: Response, next: NextFunction) {
  const session = getAuthenticatedSession(req);
  if (!session || (session.role !== 'system_admin' && session.role !== 'teacher' && session.role !== 'class_captain')) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Only a System Administrator, a verified Teacher, or a verified Class Captain can create an academic community.'
    });
  }
  return next();
}

// ---------------------------------------------------------------------------
// Cloudflare Turnstile verification helper (CAPTCHA for public forms).
// TODO (login rework): call verifyTurnstileToken() on registration, login
// and OCR/scan routes before processing the request. Enforcement is NOT
// enabled yet — this helper only exists so the wiring can land with the
// login rework. Requires env TURNSTILE_SECRET_KEY (and the matching site
// key in the frontend form). Returns false when no secret is configured.
// ---------------------------------------------------------------------------
async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  const secret = (process.env.TURNSTILE_SECRET_KEY || '').trim();
  if (!secret || !token) return false;
  try {
    const params = new URLSearchParams({ secret, response: token });
    if (remoteIp) params.set('remoteip', remoteIp);
    const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const data = (await verification.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error('[Turnstile] verification request failed:', err);
    return false;
  }
}

// Enforce Turnstile on a public form when the server secret is configured.
// Half-configuration never locks users out: if the secret is set but the
// client did not render the widget (no VITE_TURNSTILE_SITE_KEY in the
// build), the request is allowed and a warning is logged; if the widget
// WAS rendered (client sends turnstileEnabled=true) a missing/invalid
// token is rejected. Returns { ok, error? }.
async function enforceTurnstileIfConfigured(req: Request): Promise<{ ok: boolean; error?: string }> {
  const secret = (process.env.TURNSTILE_SECRET_KEY || '').trim();
  if (!secret) return { ok: true };
  const token = String(req.body?.turnstileToken || '').trim();
  const clientEnabled = req.body?.turnstileEnabled === true;
  if (!token) {
    if (clientEnabled) {
      return { ok: false, error: 'Please complete the security check and try again.' };
    }
    console.warn('[Turnstile] Secret is configured but the client did not render the widget (missing VITE_TURNSTILE_SITE_KEY?) — allowing request without CAPTCHA.');
    return { ok: true };
  }
  let valid = false;
  try {
    valid = await verifyTurnstileToken(token, getClientIp(req));
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false, error: 'Security check failed. Please try again.' };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// SMS verification for student login (login rework, 2026-11-23).
// Pluggable provider behind the SMS_VERIFICATION_ENABLED feature flag
// (default off). When enabled, a successful roll+PIN login issues a
// 6-digit code (10-minute expiry, max 3 attempts) instead of a session;
// the client completes it via POST /api/students/sms/verify.
// Provider selection (env SMS_PROVIDER):
//   - unset/empty: not configured — login FAILS with a clear error when
//     the flag is on (never silently skips SMS).
//   - "log": dev/test provider — prints the code to the server console.
//   - anything else: generic HTTP JSON provider — POSTs
//     { to, message, sender } to SMS_API_URL with
//     `Authorization: Bearer SMS_API_KEY` and SMS_SENDER_ID as sender.
//     If your provider needs a different payload shape, add a provider
//     adapter in sendSms() instead of changing the login flow.
// Codes live in memory: a deploy/restart invalidates pending codes.
// ---------------------------------------------------------------------------
const SMS_VERIFICATION_ENABLED = process.env.SMS_VERIFICATION_ENABLED === 'true';
const SMS_CODE_TTL_MS = 10 * 60 * 1000;
const SMS_CODE_MAX_ATTEMPTS = 3;

interface SmsChallenge {
  id: string;
  studentId: string;
  role: AccountType;
  phone: string;
  code: string;
  expiresAt: number;
  attempts: number;
}
const smsChallenges = new Map<string, SmsChallenge>();

function isSmsProviderConfigured(): boolean {
  return Boolean((process.env.SMS_PROVIDER || '').trim());
}

async function sendSms(phone: string, message: string): Promise<boolean> {
  const provider = (process.env.SMS_PROVIDER || '').trim().toLowerCase();
  if (!provider) return false;
  if (provider === 'log') {
    console.log(`[SMS:log] to ${phone}: ${message}`);
    return true;
  }
  const url = (process.env.SMS_API_URL || '').trim();
  const apiKey = (process.env.SMS_API_KEY || '').trim();
  const sender = (process.env.SMS_SENDER_ID || '').trim();
  if (!url) return false;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({ to: phone, message, sender: sender || undefined })
    });
    if (!response.ok) {
      console.error('[SMS] Provider request failed:', response.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[SMS] Provider request error:', err);
    return false;
  }
}

// One-time PIN-setup tokens for accounts created before PINs existed.
// Issued after a successful roll+reg login; 15-minute expiry.
interface PinSetupToken {
  token: string;
  studentId: string;
  role: AccountType;
  expiresAt: number;
}
const pinSetupTokens = new Map<string, PinSetupToken>();
const PIN_SETUP_TOKEN_TTL_MS = 15 * 60 * 1000;




export interface ServerTeacher {
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
  // Hash scheme version: undefined/1 = PBKDF2-SHA256 1,000 iterations
  // (legacy), 2 = PBKDF2-SHA256 100,000 iterations. Verification stays
  // compatible with stored legacy hashes; a successful legacy login
  // transparently upgrades the hash to v2 (see verifyTeacherPin).
  pinHashVersion?: number;
  failedPinAttempts: number;
  lockoutUntil: number | null;
  createdAt: string;
  adminNotes?: string;
  isRegisteredAccount?: boolean;
}

// PBKDF2 helper for secure PIN hashing.
// Legacy hashes use 1,000 iterations; new hashes (v2) use 100,000.
// The iteration count is a parameter (default legacy) so verification of
// already-stored hashes keeps working — see verifyTeacherPin.
const TEACHER_PIN_ITERATIONS_V2 = 100000;
function hashPinWithSalt(pin: string, salt: string, iterations = 1000): string {
  return crypto.pbkdf2Sync(pin.trim(), salt, iterations, 32, 'sha256').toString('hex');
}

// Verify a teacher PIN against the hash scheme the stored record uses.
function verifyTeacherPin(pin: string, teacher: ServerTeacher): boolean {
  const iterations = teacher.pinHashVersion === 2 ? TEACHER_PIN_ITERATIONS_V2 : 1000;
  return hashPinWithSalt(pin, teacher.pinSalt, iterations) === teacher.pinHash;
}

// Transparently upgrade a legacy PIN hash to v2 after a successful login.
// The caller must persist the record (saveAcademicStore) for the upgrade
// to stick; if it is not persisted the old hash still verifies next time.
function upgradeTeacherPinHash(teacher: ServerTeacher, pin: string): void {
  if (teacher.pinHashVersion === 2) return;
  const salt = generateSalt();
  teacher.pinSalt = salt;
  teacher.pinHash = hashPinWithSalt(pin, salt, TEACHER_PIN_ITERATIONS_V2);
  teacher.pinHashVersion = 2;
}

// ---------------------------------------------------------------------------
// Student login PINs (login rework, 2026-11-23).
// Same PBKDF2-SHA256 scheme as teacher PINs: new hashes use 100,000
// iterations (v2). A student PIN is 4–6 digits. PIN hashes must NEVER be
// sent to the client — use sanitizeStudent() for every response that
// includes a student record (login, register, roster, admin details).
// ---------------------------------------------------------------------------
const STUDENT_PIN_ITERATIONS_V2 = 100000;
const STUDENT_PIN_REGEX = /^\d{4,6}$/;

function isValidStudentPin(pin: string): boolean {
  return STUDENT_PIN_REGEX.test(String(pin || '').trim());
}

function hashStudentPin(pin: string, salt: string): string {
  return hashPinWithSalt(pin, salt, STUDENT_PIN_ITERATIONS_V2);
}

function verifyStudentPin(pin: string, student: EnrolledStudent): boolean {
  if (!student.pinHash || !student.pinSalt) return false;
  return hashPinWithSalt(pin, student.pinSalt, STUDENT_PIN_ITERATIONS_V2) === student.pinHash;
}

function setStudentPin(student: EnrolledStudent, pin: string): void {
  const salt = generateSalt();
  student.pinSalt = salt;
  student.pinHash = hashStudentPin(pin, salt);
  student.pinHashVersion = 2;
}

function sanitizeStudent(student: EnrolledStudent) {
  const { pinHash, pinSalt, ...safeStudent } = student;
  return {
    ...safeStudent,
    hasPin: Boolean(student.pinHash)
  };
}

function maskPhone(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length <= 3) return '***';
  return `****-***${digits.slice(-3)}`;
}

// Generate random salt
function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

const serverTeachers: Map<string, ServerTeacher> = new Map();
const legacyUnregisteredTeachers: Map<string, ServerTeacher> = new Map();

// Helper to strip sensitive secrets before sending teacher object to client
function sanitizeTeacher(teacher: ServerTeacher) {
  const { pinHash, pinSalt, ...safeTeacher } = teacher;
  return {
    ...safeTeacher,
    hasPin: true,
    isLockedOut: Boolean(teacher.lockoutUntil && Date.now() < teacher.lockoutUntil),
    lockoutRemainingSeconds: teacher.lockoutUntil && Date.now() < teacher.lockoutUntil 
      ? Math.ceil((teacher.lockoutUntil - Date.now()) / 1000) 
      : 0
  };
}

export interface ServerContactAuditEntry {
  action: 'created' | 'updated' | 'archived';
  performedBy: string;
  performedByRole: string;
  timestamp: string;
  reason?: string;
}

export interface ServerTeacherContact {
  id: string;
  teacherId?: string;
  college: string;
  department: string;
  name: string;
  designation: string;
  subject: string;
  teachingSubjects?: string[];
  semestersTaught?: number[];
  phone: string;
  email: string;
  room: string;
  consultingHours: string;
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archiveReason?: string;
  auditTrail: ServerContactAuditEntry[];
}

const serverTeacherContacts: Map<string, ServerTeacherContact> = new Map();

// Normalization helper for scope checking (handles Dhaka vs Dhaka Polytechnic Institute (DPI), Tejgaon)
function areCollegesEquivalent(col1?: string, col2?: string): boolean {
  if (!col1 || !col2) return false;
  const c1 = col1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const c2 = col2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (c1 === c2) return true;
  // If either contains the other
  return c1.includes(c2) || c2.includes(c1);
}

function areDepartmentsEquivalent(dept1?: string, dept2?: string): boolean {
  if (!dept1 || !dept2) return false;
  const d1 = dept1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const d2 = dept2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (d1 === d2) return true;
  // Check CST / computer
  if ((d1.includes('computer') || d1.includes('cst')) && (d2.includes('computer') || d2.includes('cst'))) return true;
  if (d1.includes('civil') && d2.includes('civil')) return true;
  if (d1.includes('electrical') && d2.includes('electrical')) return true;
  if (d1.includes('mechanical') && d2.includes('mechanical')) return true;
  if (d1.includes('electronics') && d2.includes('electronics')) return true;
  if (d1.includes('rac') && d2.includes('rac')) return true;
  return d1.includes(d2) || d2.includes(d1);
}

/**
 * 1. BACKEND PAYMENT VERIFICATION (BDT 10 ONE-TIME LIFETIME ACCESS)
 * Verifies gateway transaction, enforces BDT 10 amount, and issues verified entitlement token.
 */
app.post('/api/payments/verify', (req: Request, res: Response) => {
  try {
    // Payments are currently disabled: no payment gateway is integrated yet,
    // so the previous verification stub must never accept a payment again.
    // Re-enable only as part of a real gateway integration. There is
    // deliberately no env flag that can re-enable the stub.
    return res.status(503).json({ success: false, error: 'Payments are currently disabled' });
    const { studentId, rollNumber, provider, transactionId, amount } = req.body;

    if (!studentId || !rollNumber || !provider || !transactionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required payment verification fields (studentId, rollNumber, provider, transactionId).' 
      });
    }

    // Enforce exact BDT 10 fee
    const numericAmount = Number(amount);
    if (numericAmount !== 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid payment amount. Teacher Contact lifetime access fee must be exactly BDT 10.' 
      });
    }

    const cleanTxnId = String(transactionId).trim().toUpperCase();

    // Prevent duplicate transaction replay
    if (verifiedTransactions.has(cleanTxnId)) {
      appendSystemAudit('payment_replay_blocked', cleanTxnId, String(rollNumber), `Duplicate ${provider} transaction rejected.`);
      return res.status(409).json({ 
        success: false, 
        error: 'This transaction ID has already been redeemed and verified.' 
      });
    }

    verifiedTransactions.add(cleanTxnId);
    appendSystemAudit('payment_verified', cleanTxnId, String(rollNumber), `BDT 10 via ${provider} (student ${studentId}).`);
    saveAcademicStore(academicStore);

    const now = new Date();
    const paidAt = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const receiptToken = `ENT_LIFETIME_${provider}_${cleanTxnId}_${Date.now()}`;

    const paymentRecord = {
      transactionId: cleanTxnId,
      provider,
      amount: 10,
      currency: 'BDT',
      paidAt,
      verifiedByBackend: true,
      receiptToken
    };

    return res.status(200).json({
      success: true,
      verified: true,
      message: 'Payment successfully verified by backend. Lifetime access unlocked permanently.',
      paymentRecord
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({ success: false, error: 'Internal payment verification failure' });
  }
});

/**
 * 2. TEACHER REGISTRATION ENDPOINT
 * Creates a new teacher account with status: 'Pending'. Salt and hash PIN with PBKDF2.
 */
app.post('/api/teachers/register', authRateLimiter, authIpRateLimiter, async (req: Request, res: Response) => {
  try {
    // Turnstile (only enforced when TURNSTILE_SECRET_KEY is configured).
    const turnstile = await enforceTurnstileIfConfigured(req);
    if (!turnstile.ok) {
      return res.status(403).json({ success: false, error: turnstile.error });
    }
    const { 
      name, 
      email, 
      phone, 
      college, 
      department, 
      designation, 
      teachingSubjects, 
      semestersTaught, 
      shift, 
      pin 
    } = req.body;

    if (!name || !phone || !college || !department || !pin) {
      return res.status(400).json({
        success: false,
        error: 'Name, phone number, college, department, and PIN are required.'
      });
    }

    // Verify PIN length (4-6 digits or characters)
    const cleanPin = String(pin).trim();
    if (cleanPin.length < 4 || cleanPin.length > 8) {
      return res.status(400).json({
        success: false,
        error: 'Teacher Security PIN must be between 4 and 8 digits.'
      });
    }

    // Check duplicate phone or email
    for (const t of serverTeachers.values()) {
      if (t.phone === phone.trim() || (email && t.email === email.trim())) {
        return res.status(409).json({
          success: false,
          error: 'A teacher account with this phone number or email is already registered.'
        });
      }
    }

    const teacherId = `tch_${Date.now()}`;
    const salt = generateSalt();
    const pinHash = hashPinWithSalt(cleanPin, salt, TEACHER_PIN_ITERATIONS_V2);

    const newTeacher: ServerTeacher = {
      id: teacherId,
      name: name.trim(),
      email: email ? email.trim() : `${phone.replace(/\D/g, '')}@polytechnic.edu.bd`,
      phone: phone.trim(),
      college: college.trim(),
      department: department.trim(),
      designation: designation ? designation.trim() : 'Instructor',
      teachingSubjects: Array.isArray(teachingSubjects) && teachingSubjects.length > 0 ? teachingSubjects : ['General Department Subject'],
      semestersTaught: Array.isArray(semestersTaught) && semestersTaught.length > 0 ? semestersTaught.map(Number) : [1],
      shift: shift || 'Morning',
      verificationStatus: 'Pending', // Strictly requires administrator approval before teacher can verify captains
      pinHash,
      pinSalt: salt,
      pinHashVersion: 2,
      failedPinAttempts: 0,
      lockoutUntil: null,
      createdAt: new Date().toISOString(),
      isRegisteredAccount: true
    };

    serverTeachers.set(teacherId, newTeacher);
    saveAcademicStore(academicStore);

    return res.status(201).json({
      success: true,
      message: 'Teacher registration submitted. Your account is pending departmental administrator approval.',
      teacher: sanitizeTeacher(newTeacher)
    });
  } catch (error) {
    console.error('Teacher registration error:', error);
    return res.status(500).json({ success: false, error: 'Teacher registration failed' });
  }
});

/**
 * 2B. PUBLIC SESSION ISSUANCE FOR STUDENT & CLASS CAPTAIN ACCOUNTS
 * Strictly forbids issuing `system_admin` or `teacher` sessions via public client state.
 */
app.post('/api/auth/session', authRateLimiter, authIpRateLimiter, (req: Request, res: Response) => {
  try {
    const { userId, role } = req.body;

    // Never allow public session creation to grant system_admin or teacher privileges
    if (role === 'system_admin' || role === 'admin' || role === 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Privileged roles (system_admin, teacher) cannot be granted via public session initialization.'
      });
    }

    const requestedUserId = String(userId || '').trim();
    if (requestedUserId && deletedAccountIds.has(requestedUserId)) {
      return res.status(403).json({ success: false, error: 'This account has been deactivated.' });
    }

    const accountCheck = ensureStudentAccountForSession(req.body || {});
    if (accountCheck.error || !accountCheck.userId) {
      return res.status(accountCheck.status || 401).json({
        success: false,
        error: accountCheck.error || 'A registered student account is required.'
      });
    }
    const sessionUserId = accountCheck.userId;
    const persistedStudent = academicStore.students.find(student => student.id === sessionUserId);
    const canUseCaptainRole =
      persistedStudent?.isRegisteredAccount === true &&
      persistedStudent?.accountType === 'class_captain' &&
      persistedStudent.captainVerificationStatus === 'Approved';
    if (role === 'class_captain' && !canUseCaptainRole) {
      return res.status(403).json({ success: false, error: 'Class Captain access requires administrator approval.' });
    }
    const safeRole: AccountType = role === 'class_captain' ? 'class_captain' : 'student';
    const session = createServerSession({
      userId: sessionUserId,
      role: safeRole,
      name: persistedStudent!.name,
      email: persistedStudent!.email || '',
      college: persistedStudent!.college,
      department: persistedStudent!.department,
      boardRoll: persistedStudent!.boardRoll,
      classRoll: persistedStudent!.classRoll,
      regNumber: persistedStudent!.regNumber,
      semester: Number(persistedStudent!.semester) as SemesterNumber,
      shift: persistedStudent!.shift,
      section: persistedStudent!.section
    });

    return res.status(200).json({
      success: true,
      sessionToken: session.token,
      session: {
        userId: session.userId,
        role: session.role,
        name: session.name,
        email: session.email,
        college: session.college,
        department: session.department,
        boardRoll: session.boardRoll,
        semester: session.semester,
        shift: session.shift,
        section: session.section
      }
    });
  } catch (error) {
    console.error('Auth session creation error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create session.' });
  }
});

app.post('/api/students/login', authRateLimiter, authIpRateLimiter, async (req: Request, res: Response) => {
  // Turnstile (only enforced when TURNSTILE_SECRET_KEY is configured).
  try {
    const turnstile = await enforceTurnstileIfConfigured(req);
    if (!turnstile.ok) {
      return res.status(403).json({ success: false, error: turnstile.error });
    }
  } catch {
    return res.status(503).json({ success: false, error: 'Security check is unavailable. Please try again.' });
  }

  const boardRoll = String(req.body?.boardRoll || '').trim();
  const pin = String(req.body?.pin || '').trim();
  const regNumber = String(req.body?.regNumber || '').trim();
  const requestedRole = req.body?.role === 'class_captain' ? 'class_captain' : 'student';
  if (!boardRoll) {
    return res.status(400).json({ success: false, error: 'Board Roll is required.' });
  }

  const student = academicStore.students.find(
    account => account.boardRoll === boardRoll && account.isRegisteredAccount === true
  );
  // Lockout key: the student id once the account is found, otherwise the
  // board roll, so unknown roll+reg pairs cannot be enumerated freely.
  const lockoutKey = student ? `student:${student.id}` : `roll:${boardRoll}`;
  const failure = studentLoginFailures.get(lockoutKey);
  if (failure?.lockoutUntil && Date.now() < failure.lockoutUntil) {
    const remainingMinutes = Math.ceil((failure.lockoutUntil - Date.now()) / 60000);
    return res.status(429).json({
      success: false,
      error: `Security Lockout: Too many failed login attempts. Try again in ${remainingMinutes} minute(s).`
    });
  }
  const recordLoginFailure = (): boolean => {
    const current = studentLoginFailures.get(lockoutKey) || { count: 0, lockoutUntil: null };
    current.count += 1;
    if (current.count >= STUDENT_LOGIN_MAX_FAILURES) {
      current.lockoutUntil = Date.now() + STUDENT_LOGIN_LOCKOUT_MS;
      studentLoginFailures.set(lockoutKey, current);
      return true;
    }
    studentLoginFailures.set(lockoutKey, current);
    return false;
  };

  if (!student) {
    if (recordLoginFailure()) {
      return res.status(429).json({ success: false, error: 'Maximum failed login attempts exceeded (5/5). Account locked for 15 minutes.' });
    }
    return res.status(401).json({ success: false, error: 'No registered account matches those credentials.' });
  }
  if (deletedAccountIds.has(student.id)) {
    return res.status(403).json({ success: false, error: 'This account has been deactivated.' });
  }

  if (
    requestedRole === 'class_captain' &&
    (student.accountType !== 'class_captain' || student.captainVerificationStatus !== 'Approved')
  ) {
    return res.status(403).json({ success: false, error: 'Class Captain access requires administrator approval.' });
  }

  // Credential check. Accounts with a PIN log in with Board Roll + PIN
  // only — the registration number is no longer accepted once a PIN
  // exists. Accounts created before PINs existed get one last roll+reg
  // login, which issues a short-lived PIN-setup token instead of a
  // session (see POST /api/students/setup-pin).
  if (student.pinHash) {
    if (!pin) {
      return res.status(400).json({ success: false, error: 'Please enter your PIN. If you have not set a PIN yet, use "Set up my PIN" below.' });
    }
    if (!verifyStudentPin(pin, student)) {
      if (recordLoginFailure()) {
        return res.status(429).json({ success: false, error: 'Maximum failed login attempts exceeded (5/5). Account locked for 15 minutes.' });
      }
      return res.status(401).json({ success: false, error: 'Incorrect Board Roll or PIN.' });
    }
  } else {
    if (!regNumber) {
      return res.status(400).json({ success: false, error: 'Please enter your Registration Number to set up your PIN.' });
    }
    if (student.regNumber !== regNumber) {
      if (recordLoginFailure()) {
        return res.status(429).json({ success: false, error: 'Maximum failed login attempts exceeded (5/5). Account locked for 15 minutes.' });
      }
      return res.status(401).json({ success: false, error: 'No registered account matches those credentials.' });
    }
    const setupToken = crypto.randomBytes(32).toString('hex');
    pinSetupTokens.set(setupToken, {
      token: setupToken,
      studentId: student.id,
      role: requestedRole,
      expiresAt: Date.now() + PIN_SETUP_TOKEN_TTL_MS
    });
    return res.status(200).json({
      success: false,
      requiresPinSetup: true,
      pinSetupToken: setupToken,
      studentName: student.name,
      boardRoll: student.boardRoll,
      message: 'Please set a 4–6 digit PIN for your account.'
    });
  }

  studentLoginFailures.delete(lockoutKey);

  // SMS code verification (only when the feature flag is on). When the
  // flag is on but no provider is configured, login FAILS with a clear
  // error — it never silently skips SMS.
  if (SMS_VERIFICATION_ENABLED) {
    if (!isSmsProviderConfigured()) {
      return res.status(503).json({ success: false, error: 'SMS verification is enabled but no SMS provider is configured. Please contact the administrator.' });
    }
    const phone = String(student.phone || '').trim();
    if (!phone) {
      return res.status(403).json({ success: false, error: 'No phone number is linked to this account. Please ask your administrator to add one before signing in.' });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const challengeId = crypto.randomBytes(16).toString('hex');
    smsChallenges.set(challengeId, {
      id: challengeId,
      studentId: student.id,
      role: requestedRole,
      phone,
      code,
      expiresAt: Date.now() + SMS_CODE_TTL_MS,
      attempts: 0
    });
    const sent = await sendSms(phone, `Your DiplomaMate login code is ${code}. It expires in 10 minutes. Do not share it with anyone.`);
    if (!sent) {
      smsChallenges.delete(challengeId);
      return res.status(503).json({ success: false, error: 'Could not send the SMS code. Please try again.' });
    }
    return res.status(200).json({
      success: true,
      requiresSmsVerification: true,
      smsChallengeId: challengeId,
      maskedPhone: maskPhone(phone),
      name: student.name
    });
  }

  const sessionRole: AccountType = requestedRole === 'class_captain' ? 'class_captain' : 'student';
  const session = createServerSession({
    userId: student.id,
    role: sessionRole,
    name: student.name,
    email: student.email || '',
    college: student.college,
    department: student.department,
    boardRoll: student.boardRoll,
    classRoll: student.classRoll,
    regNumber: student.regNumber,
    semester: Number(student.semester) as SemesterNumber,
    shift: student.shift,
    section: student.section
  });

  return res.status(200).json({
    success: true,
    account: sanitizeStudent(student),
    sessionToken: session.token,
    session: { userId: session.userId, role: session.role }
  });
});

/**
 * Helper: mint a student session from a verified student record.
 * Shared by PIN setup, SMS verification and social login.
 */
function mintStudentSession(student: EnrolledStudent, role: AccountType): ServerSession {
  return createServerSession({
    userId: student.id,
    role,
    name: student.name,
    email: student.email || '',
    college: student.college,
    department: student.department,
    boardRoll: student.boardRoll,
    classRoll: student.classRoll,
    regNumber: student.regNumber,
    semester: Number(student.semester) as SemesterNumber,
    shift: student.shift,
    section: student.section
  });
}

/**
 * 2B1. ONE-TIME STUDENT PIN SETUP (`POST /api/students/setup-pin`)
 * Completes the migration for accounts created before PINs existed: the
 * caller presents the short-lived token issued by a roll+reg login and a
 * new 4–6 digit PIN. Sets the PIN (PBKDF2 v2) and signs the student in
 * immediately. The token is single-use.
 */
app.post('/api/students/setup-pin', authRateLimiter, authIpRateLimiter, (req: Request, res: Response) => {
  const token = String(req.body?.pinSetupToken || '').trim();
  const pin = String(req.body?.pin || '').trim();
  const requestedRole = req.body?.role === 'class_captain' ? 'class_captain' : 'student';
  if (!token || !pin) {
    return res.status(400).json({ success: false, error: 'PIN setup token and a new PIN are required.' });
  }
  if (!isValidStudentPin(pin)) {
    return res.status(400).json({ success: false, error: 'PIN must be 4–6 digits.' });
  }
  const stored = pinSetupTokens.get(token);
  if (!stored || Date.now() > stored.expiresAt) {
    pinSetupTokens.delete(token);
    return res.status(401).json({ success: false, error: 'This PIN setup link has expired. Please sign in again with your Board Roll and Registration Number.' });
  }
  const student = academicStore.students.find(account => account.id === stored.studentId);
  if (!student || student.isRegisteredAccount !== true) {
    pinSetupTokens.delete(token);
    return res.status(404).json({ success: false, error: 'Account not found.' });
  }
  if (deletedAccountIds.has(student.id)) {
    pinSetupTokens.delete(token);
    return res.status(403).json({ success: false, error: 'This account has been deactivated.' });
  }
  if (student.pinHash) {
    pinSetupTokens.delete(token);
    return res.status(409).json({ success: false, error: 'This account already has a PIN. Please sign in with Board Roll + PIN.' });
  }
  const role: AccountType =
    stored.role === 'class_captain' && student.accountType === 'class_captain' && student.captainVerificationStatus === 'Approved'
      ? 'class_captain'
      : 'student';
  pinSetupTokens.delete(token);
  setStudentPin(student, pin);
  saveAcademicStore(academicStore);
  studentLoginFailures.delete(`student:${student.id}`);
  const session = mintStudentSession(student, role);
  return res.status(200).json({
    success: true,
    message: 'PIN set successfully. You are now signed in.',
    account: sanitizeStudent(student),
    sessionToken: session.token,
    session: { userId: session.userId, role: session.role }
  });
});

/**
 * 2B2. SMS CODE VERIFICATION (`POST /api/students/sms/verify`)
 * Completes a login when SMS verification is enabled: the caller presents
 * the challenge id from the login response and the 6-digit code. 10-minute
 * expiry, max 3 attempts. On success mints the session.
 */
app.post('/api/students/sms/verify', authRateLimiter, authIpRateLimiter, (req: Request, res: Response) => {
  const challengeId = String(req.body?.smsChallengeId || '').trim();
  const code = String(req.body?.code || '').trim();
  if (!challengeId || !code) {
    return res.status(400).json({ success: false, error: 'Verification code is required.' });
  }
  const challenge = smsChallenges.get(challengeId);
  if (!challenge) {
    return res.status(401).json({ success: false, error: 'This SMS verification has expired. Please sign in again.' });
  }
  if (Date.now() > challenge.expiresAt) {
    smsChallenges.delete(challengeId);
    return res.status(401).json({ success: false, error: 'The SMS code has expired. Please sign in again to get a new code.' });
  }
  if (challenge.attempts >= SMS_CODE_MAX_ATTEMPTS) {
    smsChallenges.delete(challengeId);
    return res.status(429).json({ success: false, error: 'Too many wrong codes. Please sign in again to get a new code.' });
  }
  if (challenge.code !== code) {
    challenge.attempts += 1;
    const remaining = SMS_CODE_MAX_ATTEMPTS - challenge.attempts;
    if (remaining <= 0) {
      smsChallenges.delete(challengeId);
      return res.status(429).json({ success: false, error: 'Too many wrong codes. Please sign in again to get a new code.' });
    }
    return res.status(401).json({ success: false, error: `Incorrect code. ${remaining} attempt(s) left.` });
  }
  const student = academicStore.students.find(account => account.id === challenge.studentId);
  smsChallenges.delete(challengeId);
  if (!student || student.isRegisteredAccount !== true || deletedAccountIds.has(student.id)) {
    return res.status(404).json({ success: false, error: 'Account not found.' });
  }
  const role: AccountType =
    challenge.role === 'class_captain' && student.accountType === 'class_captain' && student.captainVerificationStatus === 'Approved'
      ? 'class_captain'
      : 'student';
  const session = mintStudentSession(student, role);
  return res.status(200).json({
    success: true,
    account: sanitizeStudent(student),
    sessionToken: session.token,
    session: { userId: session.userId, role: session.role }
  });
});

/**
 * 2B3. RESEND SMS CODE (`POST /api/students/sms/resend`)
 * Issues a fresh code for an unexpired challenge (resets attempts and the
 * 10-minute expiry). Rate-limited by the auth limiters.
 */
app.post('/api/students/sms/resend', authRateLimiter, authIpRateLimiter, async (req: Request, res: Response) => {
  const challengeId = String(req.body?.smsChallengeId || '').trim();
  if (!challengeId) {
    return res.status(400).json({ success: false, error: 'SMS challenge id is required.' });
  }
  const challenge = smsChallenges.get(challengeId);
  if (!challenge || Date.now() > challenge.expiresAt) {
    smsChallenges.delete(challengeId);
    return res.status(401).json({ success: false, error: 'This SMS verification has expired. Please sign in again.' });
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  challenge.code = code;
  challenge.attempts = 0;
  challenge.expiresAt = Date.now() + SMS_CODE_TTL_MS;
  const sent = await sendSms(challenge.phone, `Your DiplomaMate login code is ${code}. It expires in 10 minutes. Do not share it with anyone.`);
  if (!sent) {
    return res.status(503).json({ success: false, error: 'Could not send the SMS code. Please try again.' });
  }
  return res.status(200).json({
    success: true,
    message: 'A new code was sent.',
    maskedPhone: maskPhone(challenge.phone)
  });
});

/**
 * Helper: resolve a social (Google/Facebook) sign-in to an existing
 * registered student by verified email. Linking happens by email only —
 * there is no separate social-account table yet, so an account must exist
 * first (created with Board Roll + PIN); linking from Settings is a
 * later step.
 */
function resolveSocialStudent(email: string, requestedRole: AccountType): { student?: EnrolledStudent; error?: string; status?: number } {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) return { error: 'No email address was shared by the social account.', status: 401 };
  const student = academicStore.students.find(
    account => (account.email || '').trim().toLowerCase() === cleanEmail && account.isRegisteredAccount === true
  );
  if (!student) {
    return { error: 'No DiplomaMate account is linked to this email. Sign in with Board Roll + PIN first, then link your social account from Settings.', status: 404 };
  }
  if (deletedAccountIds.has(student.id)) {
    return { error: 'This account has been deactivated.', status: 403 };
  }
  if (
    requestedRole === 'class_captain' &&
    (student.accountType !== 'class_captain' || student.captainVerificationStatus !== 'Approved')
  ) {
    return { error: 'Class Captain access requires administrator approval.', status: 403 };
  }
  return { student };
}

/**
 * 2B4. GOOGLE SIGN-IN (`POST /api/auth/google`)
 * Verifies a Google ID token server-side (tokeninfo endpoint) and signs
 * in the linked student. Requires env GOOGLE_CLIENT_ID. The button only
 * appears in the app when VITE_GOOGLE_CLIENT_ID is set at build time.
 */
app.post('/api/auth/google', authRateLimiter, authIpRateLimiter, async (req: Request, res: Response) => {
  const idToken = String(req.body?.idToken || '').trim();
  const requestedRole = req.body?.role === 'class_captain' ? 'class_captain' : 'student';
  if (!idToken) {
    return res.status(400).json({ success: false, error: 'Google sign-in token is required.' });
  }
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  if (!clientId) {
    return res.status(503).json({ success: false, error: 'Google sign-in is not configured yet.' });
  }
  try {
    const verification = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!verification.ok) {
      return res.status(401).json({ success: false, error: 'Google sign-in verification failed.' });
    }
    const payload = (await verification.json()) as { aud?: string; email?: string; email_verified?: string; exp?: string };
    if (payload.aud !== clientId) {
      return res.status(401).json({ success: false, error: 'Google sign-in verification failed.' });
    }
    if (payload.email_verified !== 'true') {
      return res.status(401).json({ success: false, error: 'Your Google email is not verified.' });
    }
    if (Number(payload.exp) * 1000 < Date.now()) {
      return res.status(401).json({ success: false, error: 'Google sign-in has expired. Please try again.' });
    }
    const resolved = resolveSocialStudent(payload.email || '', requestedRole);
    if (!resolved.student) {
      return res.status(resolved.status || 401).json({ success: false, error: resolved.error });
    }
    const student = resolved.student;
    const role: AccountType =
      requestedRole === 'class_captain' && student.accountType === 'class_captain' && student.captainVerificationStatus === 'Approved'
        ? 'class_captain'
        : 'student';
    const session = mintStudentSession(student, role);
    return res.status(200).json({
      success: true,
      account: sanitizeStudent(student),
      sessionToken: session.token,
      session: { userId: session.userId, role: session.role }
    });
  } catch (err) {
    console.error('[Google] sign-in verification error:', err);
    return res.status(500).json({ success: false, error: 'Google sign-in is unavailable right now. Please try again.' });
  }
});

/**
 * 2B5. FACEBOOK SIGN-IN (`POST /api/auth/facebook`)
 * Verifies a Facebook user access token server-side (debug_token with the
 * app access token, then the user's email from Graph API) and signs in
 * the linked student. Requires env FACEBOOK_APP_ID + FACEBOOK_APP_SECRET.
 * The button only appears in the app when VITE_FACEBOOK_APP_ID is set.
 */
app.post('/api/auth/facebook', authRateLimiter, authIpRateLimiter, async (req: Request, res: Response) => {
  const accessToken = String(req.body?.accessToken || '').trim();
  const requestedRole = req.body?.role === 'class_captain' ? 'class_captain' : 'student';
  if (!accessToken) {
    return res.status(400).json({ success: false, error: 'Facebook sign-in token is required.' });
  }
  const appId = (process.env.FACEBOOK_APP_ID || '').trim();
  const appSecret = (process.env.FACEBOOK_APP_SECRET || '').trim();
  if (!appId || !appSecret) {
    return res.status(503).json({ success: false, error: 'Facebook sign-in is not configured yet.' });
  }
  try {
    const debugRes = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`
    );
    if (!debugRes.ok) {
      return res.status(401).json({ success: false, error: 'Facebook sign-in verification failed.' });
    }
    const debugData = (await debugRes.json()) as { data?: { is_valid?: boolean; app_id?: string; user_id?: string } };
    if (!debugData.data?.is_valid || debugData.data.app_id !== appId || !debugData.data.user_id) {
      return res.status(401).json({ success: false, error: 'Facebook sign-in verification failed.' });
    }
    const meRes = await fetch(
      `https://graph.facebook.com/${encodeURIComponent(debugData.data.user_id)}?fields=email,name&access_token=${encodeURIComponent(accessToken)}`
    );
    if (!meRes.ok) {
      return res.status(401).json({ success: false, error: 'Facebook sign-in verification failed.' });
    }
    const me = (await meRes.json()) as { email?: string };
    if (!me.email) {
      return res.status(401).json({ success: false, error: 'Facebook did not share an email address. Please allow email access and try again.' });
    }
    const resolved = resolveSocialStudent(me.email, requestedRole);
    if (!resolved.student) {
      return res.status(resolved.status || 401).json({ success: false, error: resolved.error });
    }
    const student = resolved.student;
    const role: AccountType =
      requestedRole === 'class_captain' && student.accountType === 'class_captain' && student.captainVerificationStatus === 'Approved'
        ? 'class_captain'
        : 'student';
    const session = mintStudentSession(student, role);
    return res.status(200).json({
      success: true,
      account: sanitizeStudent(student),
      sessionToken: session.token,
      session: { userId: session.userId, role: session.role }
    });
  } catch (err) {
    console.error('[Facebook] sign-in verification error:', err);
    return res.status(500).json({ success: false, error: 'Facebook sign-in is unavailable right now. Please try again.' });
  }
});

/**
 * 2C. VERIFY CURRENT AUTHENTICATED SESSION (`GET /api/auth/me`)
 * Used by frontend to confirm server-trusted role before rendering protected screens.
 */
app.get('/api/auth/me', (req: Request, res: Response) => {
  const session = getAuthenticatedSession(req);
  if (!session) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: 'No active server session found.'
    });
  }

  return res.status(200).json({
    success: true,
    authenticated: true,
    session: {
      userId: session.userId,
      role: session.role,
      name: session.name,
      email: session.email,
      college: session.college,
      department: session.department
    }
  });
});

/**
 * 2D. LOGOUT & INVALIDATE SERVER SESSION
 */
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = extractBearerToken(req);
  if (token) {
    serverSessions.delete(token);
  }
  return res.status(200).json({ success: true, message: 'Session terminated.' });
});

/**
 * 2E. SYSTEM ADMINISTRATOR PROVISIONING STATUS (`GET /api/admin/bootstrap-status`)
 * Reports whether an initial system_admin has been provisioned (never exposes tokens or passwords).
 */
app.get('/api/admin/bootstrap-status', (_req: Request, res: Response) => {
  systemAdmins = loadSystemAdminsFromDisk();
  return res.status(200).json({
    success: true,
    isBootstrapped: systemAdmins.size > 0,
    adminCount: systemAdmins.size
  });
});

// Admin audit-log viewer (paginated). The audit log was previously
// write-only — entries were recorded but no endpoint could read them.
app.get('/api/admin/audit-logs', requireSystemAdmin, (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const actionFilter = typeof req.query.action === 'string' && req.query.action.trim()
    ? req.query.action.trim()
    : null;
  const adminFilter = typeof req.query.adminId === 'string' && req.query.adminId.trim()
    ? req.query.adminId.trim()
    : null;
  const allLogs = academicStore.adminAuditLogs || [];
  const filtered = allLogs.filter(entry =>
    (!actionFilter || entry.action === actionFilter) &&
    (!adminFilter || entry.adminId === adminFilter)
  );
  const total = filtered.length;
  const start = (page - 1) * limit;
  return res.status(200).json({
    success: true,
    logs: filtered.slice(start, start + limit),
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit))
  });
});

/**
 * 2F. ONE-TIME FIRST SYSTEM ADMINISTRATOR BOOTSTRAP (`POST /api/admin/bootstrap`)
 * Only works when zero admins exist in `data/system-admins.json` AND the caller supplies
 * the valid server-side `bootstrapToken` (from `process.env.ADMIN_BOOTSTRAP_TOKEN` or `data/.admin-bootstrap-token`).
 */
app.post('/api/admin/bootstrap', authRateLimiter, authIpRateLimiter, (req: Request, res: Response) => {
  try {
    systemAdmins = loadSystemAdminsFromDisk();
    if (systemAdmins.size > 0) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Initial System Administrator has already been provisioned. Public or repeated bootstrap is disabled.'
      });
    }

    const { bootstrapToken, name, email, password } = req.body;
    const providedToken = String(bootstrapToken || '').trim();

    let expectedToken = (process.env.ADMIN_BOOTSTRAP_TOKEN || '').trim();
    if (!expectedToken && fs.existsSync(BOOTSTRAP_TOKEN_FILE)) {
      try {
        expectedToken = fs.readFileSync(BOOTSTRAP_TOKEN_FILE, 'utf-8').trim();
      } catch {
        expectedToken = '';
      }
    }

    if (!expectedToken || !providedToken || providedToken !== expectedToken) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Invalid or missing server bootstrap setup token.'
      });
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();
    const cleanName = String(name || 'Academic System Administrator').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'A valid administrator email address is required.'
      });
    }

    if (cleanPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Administrator password must be at least 8 characters long.'
      });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashAdminPassword(cleanPassword, salt, ADMIN_PASSWORD_ITERATIONS_V2);
    const nowIso = new Date().toISOString();

    const newAdmin: StoredSystemAdmin = {
      id: `sysadmin_${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      passwordSalt: salt,
      passwordHashVersion: 2,
      role: 'system_admin',
      failedAttempts: 0,
      lockoutUntil: null,
      createdAt: nowIso,
      lastLoginAt: nowIso
    };

    systemAdmins.set(newAdmin.id, newAdmin);
    saveSystemAdminsToDisk(systemAdmins);

    // Delete the one-time bootstrap token file immediately
    if (fs.existsSync(BOOTSTRAP_TOKEN_FILE)) {
      try {
        fs.unlinkSync(BOOTSTRAP_TOKEN_FILE);
      } catch {
        // ignore
      }
    }

    const session = createServerSession({
      userId: newAdmin.id,
      role: 'system_admin',
      name: newAdmin.name,
      email: newAdmin.email
    });

    return res.status(201).json({
      success: true,
      message: 'First System Administrator provisioned and authenticated successfully.',
      admin: sanitizeSystemAdmin(newAdmin),
      sessionToken: session.token
    });
  } catch (error) {
    console.error('Admin bootstrap error:', error);
    return res.status(500).json({ success: false, error: 'Failed to provision initial administrator.' });
  }
});

/**
 * 2G. SYSTEM ADMINISTRATOR LOGIN (`POST /api/admin/login`)
 * Authenticates against `data/system-admins.json` with PBKDF2 verification and 5-attempt lockout.
 */
app.post('/api/admin/login', authRateLimiter, authIpRateLimiter, (req: Request, res: Response) => {
  try {
    systemAdmins = loadSystemAdminsFromDisk();
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Administrator email and password are required.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    let targetAdmin: StoredSystemAdmin | undefined;
    for (const a of systemAdmins.values()) {
      if (a.email.toLowerCase() === cleanEmail) {
        targetAdmin = a;
        break;
      }
    }

    if (!targetAdmin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid System Administrator email or password.'
      });
    }

    // Check rate-limit lockout
    if (targetAdmin.lockoutUntil && Date.now() < targetAdmin.lockoutUntil) {
      const remainingMinutes = Math.ceil((targetAdmin.lockoutUntil - Date.now()) / 60000);
      appendSystemAudit('admin_login_locked_out', targetAdmin.id, targetAdmin.email, `Login attempt while locked out (${remainingMinutes} min remaining).`, targetAdmin.id);
      return res.status(429).json({
        success: false,
        error: `Security Lockout: Administrator account locked due to 5 failed login attempts. Try again in ${remainingMinutes} minute(s).`
      });
    }

    if (!verifyAdminPassword(cleanPassword, targetAdmin)) {
      targetAdmin.failedAttempts = (targetAdmin.failedAttempts || 0) + 1;
      const attemptsLeft = 5 - targetAdmin.failedAttempts;

      if (targetAdmin.failedAttempts >= 5) {
        targetAdmin.lockoutUntil = Date.now() + 15 * 60 * 1000;
        saveSystemAdminsToDisk(systemAdmins);
        appendSystemAudit('admin_login_locked_out', targetAdmin.id, targetAdmin.email, 'Account locked after 5 failed login attempts.', targetAdmin.id);
        saveAcademicStore(academicStore);
        return res.status(429).json({
          success: false,
          error: 'Maximum failed login attempts exceeded (5/5). Administrator account locked for 15 minutes.'
        });
      }

      saveSystemAdminsToDisk(systemAdmins);
      appendSystemAudit('admin_login_failed', targetAdmin.id, targetAdmin.email, `Failed login attempt (${targetAdmin.failedAttempts}/5).`, targetAdmin.id);
      saveAcademicStore(academicStore);
      return res.status(401).json({
        success: false,
        error: `Invalid System Administrator email or password. ${attemptsLeft} attempt(s) remaining.`
      });
    }

    targetAdmin.failedAttempts = 0;
    targetAdmin.lockoutUntil = null;
    targetAdmin.lastLoginAt = new Date().toISOString();
    // Transparent hash upgrade: a successful legacy (10k-iteration) login
    // re-hashes the password with the v2 scheme (600k iterations).
    upgradeAdminPasswordHash(targetAdmin, cleanPassword);
    saveSystemAdminsToDisk(systemAdmins);
    appendSystemAudit('admin_login_success', targetAdmin.id, targetAdmin.email, 'Administrator signed in.', targetAdmin.id);
    saveAcademicStore(academicStore);

    const session = createServerSession({
      userId: targetAdmin.id,
      role: 'system_admin',
      name: targetAdmin.name,
      email: targetAdmin.email
    });

    return res.status(200).json({
      success: true,
      message: 'System Administrator authenticated successfully.',
      admin: sanitizeSystemAdmin(targetAdmin),
      sessionToken: session.token
    });
  } catch (error) {
    console.error('System admin login error:', error);
    return res.status(500).json({ success: false, error: 'System Administrator authentication error.' });
  }
});

/**
 * 3. TEACHER SIGN IN / AUTHENTICATION ENDPOINT
 * Checks credentials, rate limits failed PIN attempts (locks for 15 minutes after 5 failures).
 */
app.post('/api/teachers/login', authRateLimiter, authIpRateLimiter, async (req: Request, res: Response) => {
  try {
    // Turnstile (only enforced when TURNSTILE_SECRET_KEY is configured).
    const turnstile = await enforceTurnstileIfConfigured(req);
    if (!turnstile.ok) {
      return res.status(403).json({ success: false, error: turnstile.error });
    }
    const { phoneOrEmail, pin } = req.body;

    if (!phoneOrEmail || !pin) {
      return res.status(400).json({ success: false, error: 'Phone number/email and PIN are required.' });
    }

    const cleanIdentifier = String(phoneOrEmail).trim().toLowerCase();
    const cleanPin = String(pin).trim();

    // Find teacher
    let targetTeacher: ServerTeacher | undefined;
    for (const t of serverTeachers.values()) {
      if (t.phone.toLowerCase() === cleanIdentifier || t.email.toLowerCase() === cleanIdentifier) {
        targetTeacher = t;
        break;
      }
    }

    if (!targetTeacher) {
      return res.status(404).json({ success: false, error: 'No teacher found with this phone number or email.' });
    }
    if (deletedAccountIds.has(targetTeacher.id)) {
      return res.status(403).json({ success: false, error: 'This teacher account has been deactivated.' });
    }

    // Check Lockout
    if (targetTeacher.lockoutUntil && Date.now() < targetTeacher.lockoutUntil) {
      const remainingMinutes = Math.ceil((targetTeacher.lockoutUntil - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        error: `Security Lockout: Account is locked due to 5 consecutive failed PIN attempts. Try again in ${remainingMinutes} minute(s) or contact administrator.`
      });
    }

    // Verify PIN with PBKDF2 hash (version-aware: legacy 1,000-iteration
    // hashes still verify; a success upgrades the hash to v2 below).
    if (!verifyTeacherPin(cleanPin, targetTeacher)) {
      targetTeacher.failedPinAttempts += 1;
      const attemptsLeft = 5 - targetTeacher.failedPinAttempts;

      if (targetTeacher.failedPinAttempts >= 5) {
        targetTeacher.lockoutUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
        saveAcademicStore(academicStore); // persist the lockout across restarts
        return res.status(429).json({
          success: false,
          error: 'Maximum failed PIN attempts exceeded (5/5). Account has been locked for 15 minutes.'
        });
      }

      saveAcademicStore(academicStore); // persist the failed-attempt count
      return res.status(401).json({
        success: false,
        error: `Invalid Teacher PIN. ${attemptsLeft} attempt(s) remaining before security lockout.`
      });
    }

    if (targetTeacher.verificationStatus !== 'Verified') {
      return res.status(403).json({
        success: false,
        error: 'Your teacher account must be approved by an administrator before signing in.'
      });
    }

    // Reset failed counter on successful login
    targetTeacher.failedPinAttempts = 0;
    targetTeacher.lockoutUntil = null;
    // Transparent hash upgrade: a successful legacy (1,000-iteration) login
    // re-hashes the PIN with the v2 scheme (100,000 iterations).
    upgradeTeacherPinHash(targetTeacher, cleanPin);
    saveAcademicStore(academicStore);

    const session = createServerSession({
      userId: targetTeacher.id,
      role: 'teacher',
      name: targetTeacher.name,
      email: targetTeacher.email,
      college: targetTeacher.college,
      department: targetTeacher.department
    });

    return res.status(200).json({
      success: true,
      message: 'Teacher authenticated successfully.',
      teacher: sanitizeTeacher(targetTeacher),
      sessionToken: session.token
    });
  } catch (error) {
    console.error('Teacher login error:', error);
    return res.status(500).json({ success: false, error: 'Teacher login service error' });
  }
});

/**
 * 4. GET ALL TEACHERS (Sanitized)
 */
app.get('/api/teachers', (req: Request, res: Response) => {
  const session = getAuthenticatedSession(req);
  const list = Array.from(serverTeachers.values())
    .filter(teacher => !deletedAccountIds.has(teacher.id))
    .map(teacher => {
      const safe = sanitizeTeacher(teacher);
      // Phone numbers and email addresses are only for signed-in users.
      // Anonymous callers (the public teacher directory) get names,
      // colleges and subjects only — contact details stay private.
      if (!session) {
        return { ...safe, phone: '', email: '' };
      }
      return safe;
    });
  return res.status(200).json({ success: true, teachers: list });
});

/**
 * 5. ADMIN VERIFY OR REJECT TEACHER (Protected by requireSystemAdmin)
 */
app.post('/api/teachers/verify', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const { teacherId, status, adminNotes } = req.body;

    if (!teacherId || !status || !['Verified', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ success: false, error: 'teacherId and valid status required' });
    }

    const teacher = serverTeachers.get(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    teacher.verificationStatus = status;
    if (adminNotes) {
      teacher.adminNotes = adminNotes;
    }
    const admin = (req as any).adminSession as ServerSession;
    if (status === 'Verified' || status === 'Rejected') {
      appendAdminAudit(admin, status === 'Verified' ? 'account_approved' : 'account_rejected', teacher.id, teacher.name);
    }
    saveAcademicStore(academicStore);

    return res.status(200).json({
      success: true,
      message: `Teacher ${teacher.name} status updated to ${status}`,
      teacher: sanitizeTeacher(teacher)
    });
  } catch (error) {
    console.error('Teacher verification error:', error);
    return res.status(500).json({ success: false, error: 'Admin teacher verification error' });
  }
});

/**
 * 6. RESET TEACHER LOCKOUT (Admin action - Protected by requireSystemAdmin)
 */
app.post('/api/teachers/reset-lockout', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const { teacherId } = req.body;
    const teacher = serverTeachers.get(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    teacher.failedPinAttempts = 0;
    teacher.lockoutUntil = null;
    saveAcademicStore(academicStore);

    return res.status(200).json({
      success: true,
      message: `Lockout reset for ${teacher.name}`,
      teacher: sanitizeTeacher(teacher)
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Reset lockout failed' });
  }
});

/**
 * 7. TEACHER PIN UPDATE
 */
// Change a teacher's own security PIN. Requires the teacher's own session
// (the teacherId in the body may NOT identify a different teacher), the
// current PIN, and is rate-limited + locked out after 5 failed attempts —
// the same protections as teacher login. Previously this endpoint took any
// teacherId with no session at all, and it never saved the store, so a PIN
// change was lost on the next server restart.
app.post('/api/teachers/change-pin', authRateLimiter, authIpRateLimiter, requireAuth, (req: Request, res: Response) => {
  try {
    const { teacherId, currentPin, newPin } = req.body;
    const session = (req as unknown as { session: ServerSession }).session;

    if (!currentPin || !newPin) {
      return res.status(400).json({ success: false, error: 'Current PIN and new PIN are required.' });
    }

    const cleanNewPin = String(newPin).trim();
    if (cleanNewPin.length < 4 || cleanNewPin.length > 8) {
      return res.status(400).json({ success: false, error: 'New PIN must be between 4 and 8 digits.' });
    }

    // Identity comes from the session only. A body-supplied teacherId may
    // not point at anyone else.
    if (teacherId && String(teacherId) !== session.userId) {
      return res.status(403).json({ success: false, error: 'You can only change your own PIN.' });
    }
    if (session.role !== 'teacher') {
      return res.status(403).json({ success: false, error: 'Only a signed-in teacher can change a teacher PIN.' });
    }
    const teacher = serverTeachers.get(session.userId);
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher not found' });
    }

    // Check lockout
    if (teacher.lockoutUntil && Date.now() < teacher.lockoutUntil) {
      const remainingMinutes = Math.ceil((teacher.lockoutUntil - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        error: `Security Lockout: Too many failed PIN attempts. Try again in ${remainingMinutes} minute(s).`
      });
    }

    // Verify current PIN
    const cleanCurrentPin = String(currentPin).trim();
    if (!verifyTeacherPin(cleanCurrentPin, teacher)) {
      teacher.failedPinAttempts += 1;
      if (teacher.failedPinAttempts >= 5) {
        teacher.lockoutUntil = Date.now() + 15 * 60 * 1000;
        saveAcademicStore(academicStore);
        return res.status(429).json({ success: false, error: 'Maximum failed PIN attempts exceeded (5/5). Account locked for 15 minutes.' });
      }
      saveAcademicStore(academicStore);
      return res.status(401).json({
        success: false,
        error: `Current PIN is incorrect. ${5 - teacher.failedPinAttempts} attempt(s) remaining.`
      });
    }

    const newSalt = generateSalt();
    teacher.pinSalt = newSalt;
    teacher.pinHash = hashPinWithSalt(cleanNewPin, newSalt, TEACHER_PIN_ITERATIONS_V2);
    teacher.pinHashVersion = 2;
    teacher.failedPinAttempts = 0;
    teacher.lockoutUntil = null;
    saveAcademicStore(academicStore);
    appendSystemAudit('teacher_pin_changed', teacher.id, teacher.name, 'Teacher changed their own security PIN.', teacher.id);
    saveAcademicStore(academicStore);

    return res.status(200).json({ success: true, message: 'Teacher Security PIN updated successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Change PIN failed' });
  }
});

/**
 * 7A. TEACHER CONTACTS DIRECTORY API WITH STRICT RBAC ENFORCEMENT
 * - Student accounts: Strictly READ-ONLY. Mutations yield HTTP 403 Forbidden.
 * - Class Captain accounts: Permitted to Add/Archive ONLY within their college and department scope.
 * - Teacher accounts: Permitted to create/update their own profile/contact.
 * - Archiving: Soft-deletion only, preserves audit trail and keeps teacher login account intact.
 */

// GET all teacher contacts
app.get('/api/teacher-contacts', (req: Request, res: Response) => {
  const includeArchived = req.query.includeArchived === 'true';
  const college = req.query.college ? String(req.query.college) : undefined;
  const department = req.query.department ? String(req.query.department) : undefined;

  let list = Array.from(serverTeacherContacts.values());

  if (!includeArchived) {
    list = list.filter(c => !c.isArchived);
  }

  if (college) {
    list = list.filter(c => areCollegesEquivalent(c.college, college));
  }

  if (department) {
    list = list.filter(c => areDepartmentsEquivalent(c.department, department));
  }

  return res.status(200).json({
    success: true,
    contacts: list
  });
});

// Helper to resolve trusted caller role for teacher-contacts endpoints
function resolveCallerRoleForContacts(req: Request, fallbackRole?: string): {
  allowed: boolean;
  role: string;
  error?: string;
} {
  const session = getAuthenticatedSession(req);
  if (session) {
    return { allowed: true, role: session.role };
  }
  // Never allow unverified client requests to claim system_admin or admin
  if (fallbackRole === 'system_admin' || fallbackRole === 'admin') {
    return {
      allowed: false,
      role: 'unauthenticated',
      error: 'Forbidden: System Administrator role requires a valid server-side administrator session token.'
    };
  }
  return { allowed: true, role: fallbackRole || 'student' };
}

// CREATE teacher contact
app.post('/api/teacher-contacts', (req: Request, res: Response) => {
  try {
    const { 
      requesterRole, 
      requesterId, 
      requesterName, 
      requesterCollege, 
      requesterDepartment,
      contact 
    } = req.body;

    const resolvedRole = resolveCallerRoleForContacts(req, requesterRole);
    if (!resolvedRole.allowed) {
      return res.status(403).json({ success: false, error: resolvedRole.error });
    }
    const effectiveRole = resolvedRole.role;

    // 1. RBAC Check: Students are strictly forbidden from mutating contacts
    if (effectiveRole === 'student') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Student accounts have read-only access to the Faculty Directory. Contact additions require Class Captain or Faculty credentials.'
      });
    }

    if (!contact || !contact.name || !contact.phone) {
      return res.status(400).json({
        success: false,
        error: 'Teacher name and phone number are required.'
      });
    }

    const targetCollege = contact.college || requesterCollege || 'Dhaka Polytechnic Institute';
    const targetDept = contact.department || requesterDepartment || 'Computer Science and Technology (CST)';

    // 2. Scope Check: Class Captains are strictly scoped to their own college and department
    if (effectiveRole === 'class_captain') {
      if (
        !areCollegesEquivalent(requesterCollege, targetCollege) ||
        !areDepartmentsEquivalent(requesterDepartment, targetDept)
      ) {
        return res.status(403).json({
          success: false,
          error: `Scope Restriction: Class Captains are only authorized to manage contacts within their enrolled institution (${requesterCollege}) and department (${requesterDepartment}).`
        });
      }
    }

    // 3. Prevent duplicate contact for same phone or teacherId
    for (const existing of serverTeacherContacts.values()) {
      if (!existing.isArchived) {
        if (contact.teacherId && existing.teacherId === contact.teacherId) {
          // Update existing instead of creating duplicate
          existing.name = contact.name.trim();
          existing.designation = contact.designation || existing.designation;
          existing.phone = contact.phone.trim();
          existing.email = contact.email || existing.email;
          existing.room = contact.room || existing.room;
          existing.consultingHours = contact.consultingHours || existing.consultingHours;
          existing.subject = contact.subject || existing.subject;
          existing.teachingSubjects = contact.teachingSubjects || existing.teachingSubjects;
          existing.semestersTaught = contact.semestersTaught || existing.semestersTaught;
          existing.college = targetCollege;
          existing.department = targetDept;
          existing.auditTrail.push({
            action: 'updated',
            performedBy: requesterName || requesterId || 'Authorized User',
            performedByRole: effectiveRole,
            timestamp: new Date().toISOString(),
            reason: 'Profile synced from teacher setup'
          });

          return res.status(200).json({
            success: true,
            message: 'Existing teacher contact updated to prevent duplicate entry.',
            contact: existing
          });
        }
      }
    }

    const contactId = `tch_${Date.now()}`;
    const newContact: ServerTeacherContact = {
      id: contactId,
      teacherId: contact.teacherId,
      college: targetCollege,
      department: targetDept,
      name: contact.name.trim(),
      designation: contact.designation || 'Instructor',
      subject: contact.subject || (Array.isArray(contact.teachingSubjects) && contact.teachingSubjects[0]) || 'Core Subject',
      teachingSubjects: contact.teachingSubjects || [contact.subject || 'Core Subject'],
      semestersTaught: contact.semestersTaught || [1],
      phone: contact.phone.trim(),
      email: contact.email ? contact.email.trim() : '',
      room: contact.room ? contact.room.trim() : 'Academic Building',
      consultingHours: contact.consultingHours ? contact.consultingHours.trim() : 'By Appointment',
      isArchived: false,
      auditTrail: [
        {
          action: 'created',
          performedBy: requesterName || requesterId || 'Authorized User',
          performedByRole: effectiveRole,
          timestamp: new Date().toISOString(),
          reason: 'Initial contact directory entry'
        }
      ]
    };

    serverTeacherContacts.set(contactId, newContact);

    return res.status(201).json({
      success: true,
      message: 'Teacher contact added successfully to directory.',
      contact: newContact
    });
  } catch (error) {
    console.error('Create contact error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create teacher contact.' });
  }
});

// UPDATE teacher contact
app.put('/api/teacher-contacts/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      requesterRole, 
      requesterId, 
      requesterName, 
      requesterCollege, 
      requesterDepartment, 
      updates 
    } = req.body;

    const resolvedRole = resolveCallerRoleForContacts(req, requesterRole);
    if (!resolvedRole.allowed) {
      return res.status(403).json({ success: false, error: resolvedRole.error });
    }
    const effectiveRole = resolvedRole.role;

    const contact = serverTeacherContacts.get(id);
    if (!contact || contact.isArchived) {
      return res.status(404).json({ success: false, error: 'Teacher contact not found.' });
    }

    // 1. Students are strictly read-only
    if (effectiveRole === 'student') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Students are not permitted to modify faculty contact records.'
      });
    }

    // 2. Class Captain scope check
    if (effectiveRole === 'class_captain') {
      if (
        !areCollegesEquivalent(requesterCollege, contact.college) ||
        !areDepartmentsEquivalent(requesterDepartment, contact.department)
      ) {
        return res.status(403).json({
          success: false,
          error: 'Scope Restriction: You can only edit faculty contacts within your assigned college and department.'
        });
      }
    }

    // 3. Teachers can only edit their own contact
    if (effectiveRole === 'teacher') {
      const isOwner = (contact.teacherId && contact.teacherId === requesterId) || 
                      (contact.phone === updates?.phone);
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Access Denied: Teachers can only edit their own contact details.'
        });
      }
    }

    // Apply updates
    if (updates.name) contact.name = updates.name.trim();
    if (updates.designation) contact.designation = updates.designation.trim();
    if (updates.phone) contact.phone = updates.phone.trim();
    if (updates.email !== undefined) contact.email = updates.email.trim();
    if (updates.room) contact.room = updates.room.trim();
    if (updates.consultingHours) contact.consultingHours = updates.consultingHours.trim();
    if (updates.subject) contact.subject = updates.subject.trim();
    if (updates.teachingSubjects) contact.teachingSubjects = updates.teachingSubjects;
    if (updates.semestersTaught) contact.semestersTaught = updates.semestersTaught;

    contact.auditTrail.push({
      action: 'updated',
      performedBy: requesterName || requesterId || 'Authorized User',
      performedByRole: effectiveRole,
      timestamp: new Date().toISOString(),
      reason: updates.reason || 'Contact information update'
    });

    return res.status(200).json({
      success: true,
      message: 'Teacher contact updated successfully.',
      contact
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Update contact error.' });
  }
});

// SOFT DELETE / ARCHIVE teacher contact
app.post('/api/teacher-contacts/:id/archive', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      requesterRole, 
      requesterId, 
      requesterName, 
      requesterCollege, 
      requesterDepartment, 
      reason 
    } = req.body;

    const resolvedRole = resolveCallerRoleForContacts(req, requesterRole);
    if (!resolvedRole.allowed) {
      return res.status(403).json({ success: false, error: resolvedRole.error });
    }
    const effectiveRole = resolvedRole.role;

    const contact = serverTeacherContacts.get(id);
    if (!contact || contact.isArchived) {
      return res.status(404).json({ success: false, error: 'Teacher contact not found or already archived.' });
    }

    // 1. Students strictly forbidden
    if (effectiveRole === 'student') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Students are not permitted to remove teacher contacts.'
      });
    }

    // 2. Class Captain scope check
    if (effectiveRole === 'class_captain') {
      if (
        !areCollegesEquivalent(requesterCollege, contact.college) ||
        !areDepartmentsEquivalent(requesterDepartment, contact.department)
      ) {
        return res.status(403).json({
          success: false,
          error: 'Scope Restriction: You cannot remove teacher contacts outside your assigned college and department.'
        });
      }
    }

    // 3. Teachers cannot remove other faculty contacts
    if (effectiveRole === 'teacher') {
      const isOwner = contact.teacherId && contact.teacherId === requesterId;
      if (!isOwner) {
        return res.status(403).json({
          success: false,
          error: 'Access Denied: Teachers cannot remove other faculty contact profiles.'
        });
      }
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        error: 'A valid reason for contact removal is required for institutional audit records.'
      });
    }

    // Perform SOFT DELETION
    contact.isArchived = true;
    contact.archivedAt = new Date().toISOString();
    contact.archivedBy = requesterName || requesterId || 'Class Captain';
    contact.archiveReason = reason.trim();

    contact.auditTrail.push({
      action: 'archived',
      performedBy: requesterName || requesterId || 'Authorized User',
      performedByRole: effectiveRole,
      timestamp: contact.archivedAt,
      reason: reason.trim()
    });

    // NOTE: The teacher's actual login account in `serverTeachers` is intentionally PRESERVED and NOT deleted!

    return res.status(200).json({
      success: true,
      message: `Teacher contact for ${contact.name} archived. Teacher login account remains active.`,
      contact
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Archive contact error.' });
  }
});

/**
 * 7B. ADMIN ONLY: VERIFY / REJECT / REVOKE CAPTAIN APPLICATION (`POST /api/admin/captains/decision`)
 */
app.post('/api/admin/captains/decision', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const adminSession: ServerSession = (req as any).adminSession;
    const { applicationId, decision, notes } = req.body;
    if (!applicationId || !['approve', 'reject', 'revoke'].includes(String(decision))) {
      return res.status(400).json({
        success: false,
        error: 'applicationId and valid decision (approve | reject | revoke) are required.'
      });
    }
    const application = academicStore.captainRecords.find(item => item.id === applicationId);
    if (!application) {
      return res.status(404).json({ success: false, error: 'Captain application not found.' });
    }
    const student = academicStore.students.find(item => item.id === application.studentId);
    if (decision === 'approve' && student) {
      const approvedCount = academicStore.students.filter(item =>
        item.id !== student.id &&
        item.accountType === 'class_captain' &&
        item.captainVerificationStatus === 'Approved' &&
        item.college === student.college &&
        item.department === student.department &&
        item.semester === student.semester &&
        item.shift === student.shift &&
        item.section === student.section
      ).length;
      if (approvedCount >= 2 && application.status !== 'Approved') {
        return res.status(409).json({ success: false, error: 'This class already has the maximum of two approved captains.' });
      }
    }
    const now = new Date().toISOString();
    const nextStatus = decision === 'approve' ? 'Approved' : decision === 'reject' ? 'Rejected' : 'NotApplied';
    application.status = nextStatus;
    application.adminDecision = {
      decidedBy: `${adminSession.name} (${adminSession.email})`,
      decidedAt: now,
      notes: String(notes || 'Decision recorded by System Administrator.').trim().slice(0, 1000)
    };
    if (decision !== 'approve') application.rejectionReason = String(notes || '').trim().slice(0, 1000);
    if (student) {
      student.accountType = 'class_captain';
      student.captainVerificationStatus = decision === 'approve' ? 'Approved' : decision === 'reject' ? 'Rejected' : 'NotApplied';
    }
    appendAdminAudit(
      adminSession,
      decision === 'approve' ? 'account_approved' : decision === 'reject' ? 'account_rejected' : 'captain_revoked',
      application.studentId,
      application.studentName
    );
    saveAcademicStore(academicStore);
    return res.status(200).json({
      success: true,
      applicationId,
      decision,
      status: nextStatus,
      adminDecision: {
        decidedBy: `${adminSession.name} (${adminSession.email})`,
        decidedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        notes: notes || 'Decision recorded by System Administrator.'
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to process captain decision.' });
  }
});


/**
 * 8. SECURE TEACHER ENDORSEMENT & CAPTAIN VERIFICATION ENDPOINT
 * Validates institutional teacher faculty PIN, enforces PBKDF2 hash, rate limits failed PINs,
 * validates cohort match (college, dept, semester, shift), and checks teacher verification status.
 */
app.post('/api/verification/teacher-approve', authRateLimiter, authIpRateLimiter, (req: Request, res: Response) => {
  try {
    const { 
      teacherId, 
      teacherPin, 
      applicationId, 
      comments, 
      action = 'approve',
      applicantCohort // { college, department, semester, shift, section }
    } = req.body;

    if (!teacherPin || !applicationId) {
      return res.status(400).json({ success: false, error: 'Teacher PIN and Application ID required' });
    }

    const cleanPin = String(teacherPin).trim();

    // Find teacher by teacherId or legacy PIN match (version-aware verify:
    // legacy 1,000-iteration hashes still verify; a success upgrades the
    // hash to v2 on the teacher record — see the login handler).
    let teacher: ServerTeacher | undefined;
    if (teacherId && serverTeachers.has(teacherId)) {
      teacher = serverTeachers.get(teacherId);
    } else {
      // Search all teachers for a matching PIN
      for (const t of serverTeachers.values()) {
        if (verifyTeacherPin(cleanPin, t)) {
          teacher = t;
          break;
        }
      }
    }

    if (!teacher) {
      return res.status(401).json({ 
        success: false, 
        error: 'Unauthorized. The provided Teacher Faculty PIN is invalid. Typed names or signatures alone are not accepted.' 
      });
    }

    // Check lockout
    if (teacher.lockoutUntil && Date.now() < teacher.lockoutUntil) {
      const remainingMinutes = Math.ceil((teacher.lockoutUntil - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        error: `Teacher account is locked out due to multiple failed PIN entries. Lockout expires in ${remainingMinutes} minute(s).`
      });
    }

    if (!verifyTeacherPin(cleanPin, teacher)) {
      teacher.failedPinAttempts += 1;
      if (teacher.failedPinAttempts >= 5) {
        teacher.lockoutUntil = Date.now() + 15 * 60 * 1000;
        saveAcademicStore(academicStore); // persist the lockout across restarts
        return res.status(429).json({
          success: false,
          error: 'Maximum PIN attempts reached (5/5). Account locked for 15 minutes.'
        });
      }
      saveAcademicStore(academicStore); // persist the failed-attempt count
      return res.status(401).json({
        success: false,
        error: `Incorrect Teacher PIN. ${5 - teacher.failedPinAttempts} attempt(s) remaining.`
      });
    }

    // Reset failed attempts on valid PIN
    teacher.failedPinAttempts = 0;
    teacher.lockoutUntil = null;
    saveAcademicStore(academicStore);

    // Check Teacher Verification Status: Only VERIFIED teachers can approve Class Captains!
    if (teacher.verificationStatus !== 'Verified') {
      return res.status(403).json({
        success: false,
        error: `Teacher Verification Incomplete: Your faculty account (${teacher.name}) is currently "${teacher.verificationStatus}". Only institutional teachers approved by an Academic Administrator can endorse Class Captains.`
      });
    }

    // Cohort Validation: Ensure teacher is assigned to this applicant's college, department, and semester
    if (applicantCohort) {
      const { college, department, semester, shift } = applicantCohort;
      
      // College and department check (normalized for legacy and canonical names)
      if (college && !areCollegesEquivalent(teacher.college, college)) {
        return res.status(403).json({
          success: false,
          error: `College Mismatch: You belong to "${teacher.college}", but this application is for "${college}".`
        });
      }

      if (department && !areDepartmentsEquivalent(teacher.department, department)) {
        return res.status(403).json({
          success: false,
          error: `Department Mismatch: You belong to "${teacher.department}", but this application is for "${department}".`
        });
      }

      // Semester check
      if (semester && !teacher.semestersTaught.includes(Number(semester))) {
        return res.status(403).json({
          success: false,
          error: `Semester Authorization: You teach semesters [${teacher.semestersTaught.join(', ')}], but this applicant is in Semester ${semester}. An authorized teacher for this semester must approve.`
        });
      }

      // Shift check
      if (shift && teacher.shift !== 'Both' && teacher.shift !== shift) {
        return res.status(403).json({
          success: false,
          error: `Shift Authorization: You are assigned to "${teacher.shift} Shift", but applicant is in "${shift} Shift".`
        });
      }
    }

    const now = new Date();
    const endorsedAt = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const endorsement = {
      teacherId: teacher.id,
      teacherName: teacher.name,
      teacherDesignation: teacher.designation,
      endorsedAt,
      comments: comments || 'Endorsed as authorized student Class Captain for this section cohort.'
    };

    // Persist the endorsement on the server's captain record. Previously the
    // endorsement was only returned to the browser that entered the PIN, so
    // it lived in that device's local state only — the Admin Portal reads
    // the server record, still saw no endorsement, and its approve guard
    // ("A teacher endorsement is required before approving a class
    // captain.") blocked the admin even though the teacher had endorsed.
    const serverRecord = academicStore.captainRecords.find(item => item.id === applicationId);
    if (serverRecord) {
      if (action === 'reject') {
        serverRecord.status = 'Rejected';
        serverRecord.rejectionReason = comments || 'Rejected by Guide Teacher.';
      } else {
        serverRecord.teacherEndorsement = endorsement;
      }
    }
    if (action !== 'reject') {
      // Registry write: remember this endorsement independently of the
      // captain record, so POST /api/captains/sync can tell a genuine
      // server-side endorsement apart from a client-forged one. This
      // matters when the captain record itself was created client-side
      // and is not on the server yet — the registry entry is the proof.
      academicStore.pendingTeacherEndorsements[applicationId] = endorsement;
    }
    saveAcademicStore(academicStore);

    if (action === 'reject') {
      return res.status(200).json({
        success: true,
        action: 'rejected',
        message: `Application rejected by Guide Teacher ${teacher.name}`,
        teacher: sanitizeTeacher(teacher)
      });
    }

    return res.status(200).json({
      success: true,
      action: 'approved',
      message: `Application successfully endorsed & verified by authorized faculty ${teacher.name}`,
      endorsement,
      teacher: sanitizeTeacher(teacher)
    });
  } catch (error) {
    console.error('Teacher verification error:', error);
    return res.status(500).json({ success: false, error: 'Teacher verification service error' });
  }
});

/**
 * 3. CLASS ROUTINE DOCUMENT OCR & TIMETABLE EXTRACTION
 * Uses Gemini 3.8 Flash Vision to extract periods, times, teachers, subjects, and rooms.
 */
app.post('/api/routine/ocr', requireAuth, aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const {
      fileDataUrl,
      dataUrl,
      fileName,
      mimeType,
      rawText,
      shift,
      section,
      college,
      department,
      semester,
      simulateApiFailure
    } = req.body || {};
    const effectiveFileDataUrl = fileDataUrl || dataUrl;

    if (!effectiveFileDataUrl && !rawText) {
      return res.status(400).json({
        success: false,
        error: 'No routine image, PDF, or text content provided.',
        errorCode: 'EMPTY_FILE'
      });
    }

    const scanResult = await scanDocumentWithIntelligence({
      feature: 'routine',
      fileDataUrl: effectiveFileDataUrl,
      fileName,
      mimeType,
      rawText,
      simulateApiFailure: Boolean(simulateApiFailure),
      defaults: {
        college,
        department,
        semester: semester ? Number(semester) : undefined,
        shift: shift === 'Day' ? 'Day' : 'Morning',
        section: (['A1', 'A2', 'B1', 'B2'].includes(String(section)) ? section : 'A1') as Section
      }
    });

    if (!scanResult.success || !scanResult.routineData || scanResult.routineData.periods.length === 0) {
      const statusCode =
        scanResult.errorCode === 'FILE_TOO_LARGE'
          ? 413
          : scanResult.errorCode === 'AI_SERVICE_UNAVAILABLE'
            ? 503
            : 422;
      return res.status(statusCode).json({
        success: false,
        method: scanResult.extractionMethod,
        errorCode: scanResult.errorCode || 'UNREADABLE_CONTENT',
        error:
          scanResult.error ||
          'Could not extract valid class periods from the uploaded document. No periods were fabricated — please upload a clearer routine or add periods manually.',
        warnings: scanResult.warnings,
        uncertainFields: scanResult.uncertainFields,
        periods: []
      });
    }

    return res.status(200).json({
      success: true,
      method: scanResult.extractionMethod,
      isScannedPdf: scanResult.isScannedPdf,
      confidence: scanResult.confidence,
      rawExtractedText: scanResult.rawExtractedText,
      pageCount: scanResult.pageCount,
      warnings: scanResult.warnings,
      uncertainFields: scanResult.uncertainFields,
      routineMetadata: {
        college: scanResult.routineData.college,
        college_id: scanResult.routineData.college_id,
        department: scanResult.routineData.department,
        department_id: scanResult.routineData.department_id,
        semester: scanResult.routineData.semester,
        shift: scanResult.routineData.shift,
        section: scanResult.routineData.section
      },
      periods: scanResult.routineData.periods
    });
  } catch (error) {
    console.error('Routine OCR error:', error);
    return res.status(500).json({ success: false, error: 'Document OCR processing failed' });
  }
});

/**
 * 8B. UNIFIED SHARED DOCUMENT INTELLIGENCE ENDPOINT (`POST /api/documents/scan`)
 * Supports: routine, assignment, note, notice, job, roster, captain_form, bteb_result, video
 */
app.post('/api/documents/scan', requireAuth, aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const {
      feature = 'note',
      fileDataUrl,
      dataUrl,
      fileName,
      mimeType,
      rawText,
      videoFramesDataUrls,
      videoFrames,
      videoDurationSeconds,
      durationSec,
      pageStart,
      pageEnd,
      pageRange,
      batchSize,
      maxBytesOverride,
      simulateApiFailure,
      defaults,
      contextHint
    } = req.body || {};

    const normalizedFrames = Array.isArray(videoFramesDataUrls)
      ? videoFramesDataUrls
      : Array.isArray(videoFrames)
        ? videoFrames.map((f: any) => (typeof f === 'string' ? f : f?.dataUrl)).filter(Boolean)
        : undefined;

    const result = await scanDocumentWithIntelligence({
      feature,
      fileDataUrl: fileDataUrl || dataUrl,
      fileName,
      mimeType,
      rawText,
      videoFramesDataUrls: normalizedFrames,
      videoDurationSeconds: videoDurationSeconds ? Number(videoDurationSeconds) : durationSec ? Number(durationSec) : undefined,
      pageStart: pageStart ? Number(pageStart) : pageRange?.start ? Number(pageRange.start) : undefined,
      pageEnd: pageEnd ? Number(pageEnd) : pageRange?.end ? Number(pageRange.end) : undefined,
      batchSize: batchSize ? Number(batchSize) : undefined,
      maxBytesOverride: maxBytesOverride ? Number(maxBytesOverride) : undefined,
      simulateApiFailure: Boolean(simulateApiFailure),
      defaults: defaults || contextHint
    });

    if (feature === 'roster' && result.success && result.rawExtractedText) {
      const existingRoster = getCohortRoster({
        college: defaults?.college || 'Dhaka Polytechnic Institute',
        department: defaults?.department || 'Computer Science and Technology (CST)',
        semester: Number(defaults?.semester) || 6,
        shift: defaults?.shift || 'Morning',
        section: defaults?.section || 'A1'
      });
      const rows = extractStudentRowsFromText(result.rawExtractedText);
      result.rosterCandidates = parseRosterLinesToCandidates(rows, existingRoster);
    }

    if (!result.success) {
      const status =
        result.errorCode === 'FILE_TOO_LARGE'
          ? 413
          : result.errorCode === 'AI_SERVICE_UNAVAILABLE'
            ? 503
            : result.errorCode === 'EMPTY_FILE'
              ? 400
              : 422;
      return res.status(status).json(result);
    }

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[POST /api/documents/scan] Error:', err);
    return res.status(500).json({
      success: false,
      feature: req.body?.feature || 'note',
      fileCategory: 'IMAGE',
      detectedMimeType: 'application/octet-stream',
      extractionMethod: 'failed',
      isReadable: false,
      confidence: 'low',
      rawExtractedText: '',
      warnings: [],
      uncertainFields: [],
      errorCode: 'EXTRACTION_FAILED',
      error: err?.message || 'Internal error while scanning document.'
    });
  }
});

/**
 * ============================================================================
 * 9. BTEB DIPLOMA EXAMINATION RESULTS & GROUP ANALYTICS ENGINE
 * ============================================================================
 * - Persistent local JSON store (`data/bteb-results.json`)
 * - Deterministic parser for official BTEB Result Book text/PDFs/CSV/JSON
 * - Strict separation between Official Imported Data and Curriculum-Mapped Subject Names
 * - No fabricated GPA or fake result records pre-populated
 * - Admin-only import, preview validation, deduplication, and batch management
 */

interface PersistentResultsStore {
  resultBatches: BtebResultBatch[];
  studentResults: StudentResultRecord[];
  importAuditLogs: ResultImportAuditLog[];
}

const DATA_DIR = path.resolve(__dirname, 'data');
const DEFAULT_RESULTS_STORE_FILE = path.join(DATA_DIR, 'bteb-results.json');
const RESULTS_STORE_FILE = process.env.BTEB_RESULTS_STORE_PATH
  ? path.resolve(process.env.BTEB_RESULTS_STORE_PATH)
  : DEFAULT_RESULTS_STORE_FILE;

function normalizeBtebRollDigits(raw: string): string {
  const banglaDigits = '০১২৩৪৫৬৭৮৯';
  return String(raw || '')
    .trim()
    .replace(/[০-৯]/g, ch => String(banglaDigits.indexOf(ch)))
    .replace(/[\s\-_]+/g, '');
}

function matchesBtebRoll(recordRoll: unknown, requestedRoll: string): boolean {
  return normalizeBtebRollDigits(String(recordRoll ?? '')) === requestedRoll;
}

function convertBanglaDigitsInText(raw: string): string {
  const banglaDigits = '০১২৩৪৫৬৭৮৯';
  return String(raw || '').replace(/[০-৯]/g, ch => String(banglaDigits.indexOf(ch)));
}

function loadResultsStore(): PersistentResultsStore {
  const readStore = (filePath: string): PersistentResultsStore => {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return {
      resultBatches: Array.isArray(parsed.resultBatches)
        ? parsed.resultBatches
        : Array.isArray(parsed.batches)
          ? parsed.batches
          : [],
      studentResults: Array.isArray(parsed.studentResults)
        ? parsed.studentResults
        : Array.isArray(parsed.records)
          ? parsed.records
          : [],
      importAuditLogs: Array.isArray(parsed.importAuditLogs)
        ? parsed.importAuditLogs
        : Array.isArray(parsed.importLogs)
          ? parsed.importLogs
          : []
    };
  };

  if (fs.existsSync(RESULTS_STORE_FILE)) {
    return readStore(RESULTS_STORE_FILE);
  }

  if (
    RESULTS_STORE_FILE !== DEFAULT_RESULTS_STORE_FILE &&
    fs.existsSync(DEFAULT_RESULTS_STORE_FILE)
  ) {
    const bundledStore = readStore(DEFAULT_RESULTS_STORE_FILE);
    saveResultsStore(bundledStore);
    return bundledStore;
  }

  const initialStore: PersistentResultsStore = {
    resultBatches: [],
    studentResults: [],
    importAuditLogs: []
  };
  saveResultsStore(initialStore);
  return initialStore;
}

function saveResultsStore(store: PersistentResultsStore): void {
  fs.mkdirSync(path.dirname(RESULTS_STORE_FILE), { recursive: true });
  const serialized = {
    batches: store.resultBatches,
    records: store.studentResults,
    importLogs: store.importAuditLogs,
    resultBatches: store.resultBatches,
    studentResults: store.studentResults,
    importAuditLogs: store.importAuditLogs
  };
  const tempFile = `${RESULTS_STORE_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(serialized, null, 2), 'utf-8');
  fs.renameSync(tempFile, RESULTS_STORE_FILE);
}

const btebResultsStore: PersistentResultsStore = loadResultsStore();
console.info(
  `[BTEB Results Store] Loaded ${btebResultsStore.resultBatches.length} batches and ` +
  `${btebResultsStore.studentResults.length} records; persistence=${process.env.BTEB_RESULTS_STORE_PATH ? 'configured-path' : 'instance-local'}.`
);

/**
 * Parses a group roll query string supporting comma/space/newline-separated rolls,
 * Bangla numerals, and inclusive ranges like "542880-542910". Capped at maxCount (default 150).
 */
function parseGroupRollInput(rawInput: string, maxCount = 150): {
  rolls: string[];
  invalidTokens: string[];
  truncated: boolean;
} {
  const rollsSet = new Set<string>();
  const invalidTokens: string[] = [];
  let truncated = false;

  const normalizedRaw = convertBanglaDigitsInText(String(rawInput || ''));
  const segments = normalizedRaw
    .split(/[\n,;]+/)
    .map(s => s.trim())
    .filter(Boolean);

  for (const seg of segments) {
    if (rollsSet.size >= maxCount) {
      truncated = true;
      break;
    }

    // Check for range pattern e.g. "542880-542910" or "542880 - 542910"
    const rangeMatch = seg.match(/^(\d{4,8})\s*-\s*(\d{4,8})$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (isNaN(start) || isNaN(end) || end < start || (end - start) > 500) {
        invalidTokens.push(seg);
        continue;
      }
      for (let r = start; r <= end; r++) {
        if (rollsSet.size >= maxCount) {
          truncated = true;
          break;
        }
        rollsSet.add(String(r));
      }
      continue;
    }

    // Single roll or space-separated rolls
    const subTokens = seg.split(/\s+/).filter(Boolean);
    for (const tok of subTokens) {
      if (rollsSet.size >= maxCount) {
        truncated = true;
        break;
      }
      const cleanTok = normalizeBtebRollDigits(tok);
      if (/^\d{4,8}$/.test(cleanTok)) {
        rollsSet.add(cleanTok);
      } else {
        invalidTokens.push(tok);
      }
    }
  }

  return {
    rolls: Array.from(rollsSet),
    invalidTokens,
    truncated
  };
}

/**
 * Deterministic Official BTEB Result Text / CSV / JSON Parser.
 * Supports:
 * 1. Official BTEB Result Book text syntax:
 *    - Institute Header lines: "50118 - Dhaka Polytechnic Institute, Dhaka"
 *    - Passed Roll entry: "542880 (3.85)" or multi-semester "542880 (gpa6: 3.85, gpa5: 3.70)"
 *    - Referred Roll entry: "542881 { 66662(T), 66664(T,P) }"
 *    - Withheld Roll entry: "542882 (WH)" or "542882 { WH }"
 * 2. Structured JSON array of records
 * 3. CSV rows: "roll,status,gpa,referred_codes,institute_code,student_name"
 */
interface ParsedCandidateRecord {
  rollNumber: string;
  status: 'PASSED' | 'REFERRED' | 'WITHHELD';
  gpa: number | null;
  referredSubjects: ReferredSubjectEntry[];
  subjectGrades?: SubjectGradeEntry[];
  instituteCode?: string;
  collegeId?: string;
  collegeName?: string;
  departmentName?: string;
  studentName?: string;
}

function parseOfficialBtebContent(
  rawText: string,
  targetSemester: SemesterNumber
): {
  parsedRecords: ParsedCandidateRecord[];
  duplicateRollsInPayload: string[];
  unrecognizedSnippets: string[];
  detectedInstitutes: string[];
} {
  const parsedRecords: ParsedCandidateRecord[] = [];
  const seenRolls = new Set<string>();
  const duplicateRollsInPayload: string[] = [];
  const unrecognizedSnippets: string[] = [];
  const detectedInstitutesSet = new Set<string>();

  const trimmed = convertBanglaDigitsInText(String(rawText || '')).trim();
  if (!trimmed) {
    return { parsedRecords, duplicateRollsInPayload, unrecognizedSnippets, detectedInstitutes: [] };
  }

  // 1. Check if JSON array or object with "records"
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const jsonObj = JSON.parse(trimmed);
      const arr = Array.isArray(jsonObj) ? jsonObj : (Array.isArray(jsonObj.records) ? jsonObj.records : null);
      if (arr) {
        for (const item of arr) {
          const roll = normalizeBtebRollDigits(String(item.rollNumber || item.roll || ''));
          if (!/^\d{4,8}$/.test(roll)) {
            unrecognizedSnippets.push(JSON.stringify(item).slice(0, 60));
            continue;
          }
          if (seenRolls.has(roll)) {
            duplicateRollsInPayload.push(roll);
            continue;
          }
          seenRolls.add(roll);

          const rawGpa = item.gpa !== undefined && item.gpa !== null && item.gpa !== '' ? Number(item.gpa) : null;
          const validGpa = rawGpa !== null && !isNaN(rawGpa) && rawGpa >= 0 && rawGpa <= 4.0 ? Number(rawGpa.toFixed(2)) : null;

          const referredList: ReferredSubjectEntry[] = [];
          if (Array.isArray(item.referredSubjects)) {
            for (const ref of item.referredSubjects) {
              if (typeof ref === 'string') {
                const subMatch = ref.match(/(\d{4,6})(?:\(([TP,\s]+)\))?/i);
                const code = subMatch ? subMatch[1] : ref.replace(/\D/g, '');
                const compRaw = subMatch && subMatch[2] ? subMatch[2].toUpperCase().replace(/\s+/g, '') : 'T';
                const comp = (compRaw === 'T' || compRaw === 'P' || compRaw === 'T,P') ? compRaw : 'UNKNOWN';
                const resolved = resolveBtebSubjectCode(code);
                referredList.push({
                  code: resolved.code,
                  name: resolved.name,
                  failedComponent: comp,
                  nameSource: resolved.nameSource
                });
              } else if (ref && typeof ref === 'object' && ref.code) {
                const resolved = resolveBtebSubjectCode(String(ref.code));
                const explicitName = ref.name ? String(ref.name).trim() : null;
                referredList.push({
                  code: resolved.code,
                  name: explicitName || resolved.name,
                  failedComponent: ref.failedComponent || 'T',
                  nameSource: explicitName ? 'official-import' : resolved.nameSource
                });
              }
            }
          }

          const resolvedCollege = resolveBtebInstitute(item.instituteCode, item.collegeName || item.college);
          if (resolvedCollege) {
            detectedInstitutesSet.add(resolvedCollege.name);
          }

          const status: 'PASSED' | 'REFERRED' | 'WITHHELD' =
            item.status === 'WITHHELD'
              ? 'WITHHELD'
              : referredList.length > 0 || item.status === 'REFERRED'
                ? 'REFERRED'
                : 'PASSED';

          parsedRecords.push({
            rollNumber: roll,
            status,
            gpa: status === 'PASSED' ? validGpa : null,
            referredSubjects: referredList,
            subjectGrades: Array.isArray(item.subjectGrades) ? item.subjectGrades : undefined,
            instituteCode: item.instituteCode ? String(item.instituteCode).trim() : undefined,
            collegeId: resolvedCollege?.id,
            collegeName: resolvedCollege?.name || item.collegeName,
            departmentName: item.departmentName || item.department,
            studentName: item.studentName || item.name
          });
        }
        return {
          parsedRecords,
          duplicateRollsInPayload,
          unrecognizedSnippets,
          detectedInstitutes: Array.from(detectedInstitutesSet)
        };
      }
    } catch {
      // Not valid JSON, proceed to text/CSV parsing
    }
  }

  // 2. Check if CSV format (header or comma-separated lines where line starts with 6-digit roll and comma)
  const lines = trimmed.split(/\r?\n/);
  const looksLikeCsv = lines.some(l => /^\d{4,8}\s*,\s*(PASSED|REFERRED|WITHHELD|\d\.\d{1,2})/i.test(l.trim())) ||
                       /^roll\s*,/i.test(lines[0].trim());

  if (looksLikeCsv) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || /^roll/i.test(line)) continue;
      const cols = line.split(',').map(c => c.trim());
      const roll = cols[0];
      if (!/^\d{4,8}$/.test(roll)) {
        unrecognizedSnippets.push(line.slice(0, 60));
        continue;
      }
      if (seenRolls.has(roll)) {
        duplicateRollsInPayload.push(roll);
        continue;
      }
      seenRolls.add(roll);

      let status: 'PASSED' | 'REFERRED' | 'WITHHELD' = 'PASSED';
      let gpa: number | null = null;
      const referredSubjects: ReferredSubjectEntry[] = [];

      const col1 = (cols[1] || '').toUpperCase();
      if (col1 === 'PASSED' || col1 === 'PASS') {
        status = 'PASSED';
        const parsedGpa = parseFloat(cols[2]);
        if (!isNaN(parsedGpa) && parsedGpa >= 0 && parsedGpa <= 4.0) {
          gpa = Number(parsedGpa.toFixed(2));
        }
      } else if (col1 === 'REFERRED' || col1 === 'FAIL' || col1 === 'REF') {
        status = 'REFERRED';
        const refRaw = cols[3] || cols[2] || '';
        const codes = refRaw.split(/[;|+\s]+/).filter(Boolean);
        for (const c of codes) {
          const m = c.match(/(\d{4,6})(?:\(([TP,]+)\))?/i);
          if (m) {
            const resolved = resolveBtebSubjectCode(m[1]);
            const compRaw = m[2] ? m[2].toUpperCase() : 'T';
            referredSubjects.push({
              code: resolved.code,
              name: resolved.name,
              failedComponent: (compRaw === 'T' || compRaw === 'P' || compRaw === 'T,P') ? compRaw : 'T',
              nameSource: resolved.nameSource
            });
          }
        }
      } else if (!isNaN(parseFloat(col1))) {
        status = 'PASSED';
        const parsedGpa = parseFloat(col1);
        if (parsedGpa >= 0 && parsedGpa <= 4.0) {
          gpa = Number(parsedGpa.toFixed(2));
        }
      }

      const instCode = cols[4] || undefined;
      const studentName = cols[5] || undefined;
      const resolvedCol = resolveBtebInstitute(instCode, cols[4]);
      if (resolvedCol) detectedInstitutesSet.add(resolvedCol.name);

      parsedRecords.push({
        rollNumber: roll,
        status,
        gpa,
        referredSubjects,
        instituteCode: instCode && /^\d{4,6}$/.test(instCode) ? instCode : undefined,
        collegeId: resolvedCol?.id,
        collegeName: resolvedCol?.name,
        studentName
      });
    }

    return {
      parsedRecords,
      duplicateRollsInPayload,
      unrecognizedSnippets,
      detectedInstitutes: Array.from(detectedInstitutesSet)
    };
  }

  // 3. Official BTEB Result PDF / Text Stream Format Parser
  // Process line by line to track active Institute Header (e.g., "50118 - Dhaka Polytechnic Institute")
  let currentInstituteCode: string | undefined;
  let currentCollegeId: string | undefined;
  let currentCollegeName: string | undefined;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Check if line is an Institute Header e.g. "50118 - Dhaka Polytechnic Institute" or "Institute: 50118 Dhaka Polytechnic Institute"
    const headerMatch = line.match(/^(?:Institute\s*:?\s*)?(\d{5})\s*[-:]\s*([A-Za-z][A-Za-z0-9\s.,'()-]+)$/i);
    if (headerMatch && !line.includes('{') && !/\(\d\.\d{2}\)/.test(line)) {
      currentInstituteCode = headerMatch[1].trim();
      const rawInstName = headerMatch[2].trim();
      const resolved = resolveBtebInstitute(currentInstituteCode, rawInstName);
      currentCollegeId = resolved?.id;
      currentCollegeName = resolved?.name || rawInstName;
      if (currentCollegeName) detectedInstitutesSet.add(currentCollegeName);
      continue;
    }

    // Scan all passed tokens, multi-gpa tokens, and referred tokens in the line
    // Pattern A: Passed token `542880 (3.85)` or multi-semester `542880 (gpa6: 3.85, gpa5: 3.70)`
    // Pattern B: Referred token `542881 { 66662(T), 66664(T,P) }`
    // Pattern C: Withheld token `542882 (WH)` or `542882 { WH }`
    const tokenRegex = /(\d{5,8})\s*(?:\(\s*([^)]+?)\s*\)|\{\s*([^}]+?)\s*\})/g;
    let match: RegExpExecArray | null;
    let matchedAnyOnLine = false;

    while ((match = tokenRegex.exec(line)) !== null) {
      matchedAnyOnLine = true;
      const roll = match[1].trim();
      const parenContent = match[2]?.trim();
      const braceContent = match[3]?.trim();

      if (seenRolls.has(roll)) {
        duplicateRollsInPayload.push(roll);
        continue;
      }

      if (parenContent !== undefined) {
        // Inside parentheses: could be "3.85", "WH", or "gpa6: 3.85, gpa5: 3.60"
        if (/^WH|WITHHELD$/i.test(parenContent)) {
          seenRolls.add(roll);
          parsedRecords.push({
            rollNumber: roll,
            status: 'WITHHELD',
            gpa: null,
            referredSubjects: [],
            instituteCode: currentInstituteCode,
            collegeId: currentCollegeId,
            collegeName: currentCollegeName
          });
          continue;
        }

        // Check direct GPA e.g. "3.85"
        const directGpaMatch = parenContent.match(/^(\d\.\d{1,2})$/);
        if (directGpaMatch) {
          const gpaVal = parseFloat(directGpaMatch[1]);
          if (gpaVal >= 0 && gpaVal <= 4.0) {
            seenRolls.add(roll);
            parsedRecords.push({
              rollNumber: roll,
              status: 'PASSED',
              gpa: Number(gpaVal.toFixed(2)),
              referredSubjects: [],
              instituteCode: currentInstituteCode,
              collegeId: currentCollegeId,
              collegeName: currentCollegeName
            });
            continue;
          }
        }

        // Check multi-semester GPA e.g. "gpa6: 3.85, gpa5: 3.70"
        const semGpaRegex = new RegExp(`gpa${targetSemester}\\s*:\\s*(\\d\\.\\d{1,2})`, 'i');
        const targetGpaMatch = parenContent.match(semGpaRegex) || parenContent.match(/gpa\d?\s*:\s*(\d\.\d{1,2})/i);
        if (targetGpaMatch) {
          const gpaVal = parseFloat(targetGpaMatch[1]);
          if (gpaVal >= 0 && gpaVal <= 4.0) {
            seenRolls.add(roll);
            parsedRecords.push({
              rollNumber: roll,
              status: 'PASSED',
              gpa: Number(gpaVal.toFixed(2)),
              referredSubjects: [],
              instituteCode: currentInstituteCode,
              collegeId: currentCollegeId,
              collegeName: currentCollegeName
            });
            continue;
          }
        }

        // Check if parenContent actually contains referred subject codes e.g. "542881 (66662T)"
        const subCodesInParen = parenContent.match(/\d{4,6}/g);
        if (subCodesInParen && subCodesInParen.length > 0) {
          seenRolls.add(roll);
          const referredSubjects: ReferredSubjectEntry[] = subCodesInParen.map(code => {
            const resolved = resolveBtebSubjectCode(code);
            return {
              code: resolved.code,
              name: resolved.name,
              failedComponent: 'T',
              nameSource: resolved.nameSource
            };
          });
          parsedRecords.push({
            rollNumber: roll,
            status: 'REFERRED',
            gpa: null,
            referredSubjects,
            instituteCode: currentInstituteCode,
            collegeId: currentCollegeId,
            collegeName: currentCollegeName
          });
          continue;
        }

        unrecognizedSnippets.push(match[0]);
      } else if (braceContent !== undefined) {
        if (/^WH|WITHHELD$/i.test(braceContent)) {
          seenRolls.add(roll);
          parsedRecords.push({
            rollNumber: roll,
            status: 'WITHHELD',
            gpa: null,
            referredSubjects: [],
            instituteCode: currentInstituteCode,
            collegeId: currentCollegeId,
            collegeName: currentCollegeName
          });
          continue;
        }

        // Parse referred subjects inside `{ ... }` e.g. `66662(T), 66664(T,P)` or `gpa6: ref, sub: 66662(T)`
        const subRegex = /(\d{4,6})\s*(?:\(\s*([TP,\s]+)\s*\))?/gi;
        let subMatch: RegExpExecArray | null;
        const referredSubjects: ReferredSubjectEntry[] = [];

        while ((subMatch = subRegex.exec(braceContent)) !== null) {
          const rawCode = subMatch[1];
          // Avoid treating a 4-digit year as a subject code if preceded by "year"
          const compRaw = subMatch[2] ? subMatch[2].toUpperCase().replace(/\s+/g, '') : 'T';
          const failedComponent: 'T' | 'P' | 'T,P' | 'UNKNOWN' =
            compRaw === 'T' || compRaw === 'P' || compRaw === 'T,P'
              ? compRaw
              : compRaw === 'P,T'
                ? 'T,P'
                : 'UNKNOWN';

          const resolved = resolveBtebSubjectCode(rawCode);
          referredSubjects.push({
            code: resolved.code,
            name: resolved.name,
            failedComponent,
            nameSource: resolved.nameSource
          });
        }

        seenRolls.add(roll);
        parsedRecords.push({
          rollNumber: roll,
          status: 'REFERRED',
          gpa: null,
          referredSubjects,
          instituteCode: currentInstituteCode,
          collegeId: currentCollegeId,
          collegeName: currentCollegeName
        });
      }
    }

    // Ignore common page header/footer lines in BTEB PDFs
    if (
      !matchedAnyOnLine &&
      !/^(Bangladesh Technical|Diploma in Engineering|Page \d+|Result Sheet|Exam|Regulation|Date)/i.test(line)
    ) {
      if (line.length > 3 && unrecognizedSnippets.length < 25) {
        unrecognizedSnippets.push(line.slice(0, 80));
      }
    }
  }

  return {
    parsedRecords,
    duplicateRollsInPayload,
    unrecognizedSnippets,
    detectedInstitutes: Array.from(detectedInstitutesSet)
  };
}

/**
 * 9A. GET PUBLISHED RESULT BATCHES & COVERAGE SUMMARY (Public metadata; importLogs restricted to system_admin)
 */
app.get('/api/results/batches', (req: Request, res: Response) => {
  const sortedBatches = [...btebResultsStore.resultBatches].sort(
    (a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime()
  );

  const session = getAuthenticatedSession(req);
  const isSystemAdmin = session?.role === 'system_admin';

  return res.status(200).json({
    success: true,
    totalBatches: sortedBatches.length,
    totalStudentRecords: btebResultsStore.studentResults.length,
    persistenceMode: process.env.BTEB_RESULTS_STORE_PATH ? 'configured-path' : 'instance-local',
    batches: sortedBatches,
    ...(isSystemAdmin ? { importLogs: btebResultsStore.importAuditLogs.slice(0, 20) } : {})
  });
});

/**
 * 9A-2. ADMIN ONLY: GET RESULT IMPORT MANAGEMENT HISTORY (`GET /api/admin/results/import-history`)
 */
app.get('/api/admin/results/import-history', requireSystemAdmin, (_req: Request, res: Response) => {
  const sortedBatches = [...btebResultsStore.resultBatches].sort(
    (a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime()
  );
  return res.status(200).json({
    success: true,
    batches: sortedBatches,
    importLogs: btebResultsStore.importAuditLogs
  });
});

/**
 * 9B. GET INDIVIDUAL & MULTI-SEMESTER STUDENT RESULT
 * Query params:
 * - roll (required)
 * - semester (optional: 1..8 or 'all')
 * - regulation (optional: '2022' | '2016' | '2010' | 'all')
 * - examYear (optional)
 * - examType (optional)
 */
app.get('/api/results/individual', (req: Request, res: Response) => {
  try {
    const roll = normalizeBtebRollDigits(String(req.query.roll || ''));
    if (!roll || !/^\d{4,8}$/.test(roll)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid BTEB Board Roll Number (4 to 8 digits).'
      });
    }

    const semesterParam = req.query.semester ? String(req.query.semester).trim() : 'all';
    const regulationParam = req.query.regulation ? String(req.query.regulation).trim() : 'all';
    const examYearParam = req.query.examYear ? String(req.query.examYear).trim() : 'all';
    const examTypeParam = req.query.examType ? String(req.query.examType).trim() : 'all';

    // All records for this roll across all semesters (for the 1st-8th Semester Progression Strip)
    const allRollRecords = btebResultsStore.studentResults
      .filter(r => matchesBtebRoll(r.rollNumber, roll))
      .sort((a, b) => a.semester - b.semester || b.examYear - a.examYear);

    // Filtered records matching specific search criteria
    let matchedRecords = allRollRecords.filter(r => {
      if (semesterParam !== 'all' && Number(r.semester) !== Number(semesterParam)) return false;
      if (regulationParam !== 'all' && String(r.regulation) !== regulationParam) return false;
      if (examYearParam !== 'all' && Number(r.examYear) !== Number(examYearParam)) return false;
      if (examTypeParam !== 'all' && String(r.examType).toLowerCase() !== examTypeParam.toLowerCase()) return false;
      return true;
    });

    let regulationNote: string | null = null;
    if (matchedRecords.length === 0 && regulationParam !== 'all' && allRollRecords.length > 0) {
      const crossRegMatches = allRollRecords.filter(r => {
        if (semesterParam !== 'all' && Number(r.semester) !== Number(semesterParam)) return false;
        if (examYearParam !== 'all' && Number(r.examYear) !== Number(examYearParam)) return false;
        if (examTypeParam !== 'all' && String(r.examType).toLowerCase() !== examTypeParam.toLowerCase()) return false;
        return true;
      });
      if (crossRegMatches.length > 0) {
        matchedRecords = crossRegMatches;
        regulationNote = `Record found under ${crossRegMatches[0].regulation} Probidhan (searched with ${regulationParam} Probidhan filter).`;
      }
    }

    // Check if ANY batch has been imported for the requested filter (so UI can explain whether dataset is unimported vs roll not found in imported batch)
    const matchingBatches = btebResultsStore.resultBatches.filter(b => {
      if (semesterParam !== 'all' && Number(b.semester) !== Number(semesterParam)) return false;
      if (regulationParam !== 'all' && String(b.regulation) !== regulationParam) return false;
      if (examYearParam !== 'all' && Number(b.examYear) !== Number(examYearParam)) return false;
      if (examTypeParam !== 'all' && String(b.examType).toLowerCase() !== examTypeParam.toLowerCase()) return false;
      return true;
    });

    return res.status(200).json({
      success: true,
      rollNumber: roll,
      found: matchedRecords.length > 0,
      records: matchedRecords,
      allSemesterRecords: allRollRecords,
      regulationNote,
      matchingBatchesCount: matchingBatches.length,
      totalBatchesInDatabase: btebResultsStore.resultBatches.length,
      persistenceMode: process.env.BTEB_RESULTS_STORE_PATH ? 'configured-path' : 'instance-local',
      dataSourceNotice:
        'Official BTEB Imported Dataset. Subject names marked as "curriculum-mapped" are resolved from the BTEB Probidhan curriculum directory.'
    });
  } catch (error) {
    console.error('Individual result lookup error:', error);
    return res.status(500).json({ success: false, error: 'Failed to query BTEB result database.' });
  }
});

/**
 * ============================================================================
 * 9D. NATIVE BTEB RESULT STATEMENT ENDPOINT (`GET /api/results/lookup`)
 * ============================================================================
 * - Queries BTEB Examination results by Board Roll number
 * - Queries the locally imported, verified official BTEB gazette database
 * - Does not call undocumented external result APIs
 * - Validates input format (4-8 numeric digits, including Bangla numerals)
 * - Sanitizes parameters and maps curriculum names
 * - Resolves subject names via central BTEB curriculum directory
 * - Does NOT persist student roll queries to disk (privacy preservation)
 */
function getCurriculumDisplayName(curriculumId: string): string {
  switch (curriculumId) {
    case 'diploma_in_engineering':
      return 'Diploma in Engineering';
    case 'diploma_in_textile':
      return 'Diploma in Textile Engineering';
    case 'diploma_in_agriculture':
      return 'Diploma in Agriculture';
    case 'diploma_in_tourism':
      return 'Diploma in Tourism & Hospitality';
    case 'hsc_bm':
      return 'HSC (BMT)';
    case 'ssc_vocational':
      return 'SSC (Vocational)';
    default:
      return curriculumId.replace(/_/g, ' ').toUpperCase();
  }
}

function buildStatementFromLocalStore(
  roll: string,
  curriculumId = 'diploma_in_engineering',
  regulation?: string
): BtebStudentResultStatement | null {
  // Local official gazette store contains verified Diploma in Engineering BTEB records
  if (curriculumId && curriculumId !== 'diploma_in_engineering') {
    return null;
  }

  const allForRoll = btebResultsStore.studentResults
    .filter(r => matchesBtebRoll(r.rollNumber, roll))
    .sort((a, b) => a.semester - b.semester || b.examYear - a.examYear);

  if (allForRoll.length === 0) return null;

  let records = allForRoll.filter(
    r => !regulation || regulation === 'all' || String(r.regulation) === String(regulation)
  );
  let regulationNote: string | null = null;

  if (records.length === 0 && regulation && regulation !== 'all') {
    records = allForRoll;
    regulationNote = `Matched under ${allForRoll[0].regulation} Probidhan (no record under ${regulation} Probidhan).`;
  }

  const firstRec = records[0];

  // Group records by semester so multiple publications for the same semester are combined cleanly
  const bySemester = new Map<SemesterNumber, StudentResultRecord[]>();
  for (const r of records) {
    const semester = Number(r.semester) as SemesterNumber;
    const list = bySemester.get(semester) || [];
    list.push(r);
    bySemester.set(semester, list);
  }

  const sortedSemesters = Array.from(bySemester.keys()).sort((a, b) => a - b);

  const semItems: BtebSemesterSummaryItem[] = sortedSemesters.map(semNum => {
    const semRecs = (bySemester.get(semNum) || []).sort(
      (a, b) =>
        new Date(b.publishedDate || b.importedAt).getTime() -
        new Date(a.publishedDate || a.importedAt).getTime()
    );
    const latestRec = semRecs[0];

    const activeFailed: BtebFailedSubjectDetail[] = (latestRec.referredSubjects || []).map(rs => ({
      subCode: rs.code,
      subName: rs.name || resolveBtebSubjectCode(rs.code)?.name || `Subject ${rs.code}`,
      type: rs.failedComponent || 'T',
      originSemester: semNum,
      passed: false
    }));

    const clearedFailed: BtebFailedSubjectDetail[] = (latestRec.clearedSubjects || []).map(cs => ({
      subCode: cs.code,
      subName: cs.name || resolveBtebSubjectCode(cs.code)?.name || `Subject ${cs.code}`,
      type: cs.failedComponent || 'T',
      originSemester: semNum,
      passed: true
    }));

    const combinedFailed = [...activeFailed, ...clearedFailed];

    const statusVal: 'passed' | 'referred' | 'withheld' =
      latestRec.status === 'WITHHELD'
        ? 'withheld'
        : latestRec.status === 'PASSED'
          ? 'passed'
          : 'referred';

    const semCgpa = typeof latestRec.cgpa === 'number' ? latestRec.cgpa : null;

    return {
      semester: semNum,
      status: statusVal,
      gpa: latestRec.gpa,
      cgpa: semCgpa,
      publications: semRecs.map(r => ({
        date: r.publishedDate || r.importedAt,
        fileName: r.sourceFileName || r.batchTitle || 'Official BTEB Result Gazette',
        semester: r.semester,
        instituteCode: r.instituteCode ? Number(r.instituteCode) || r.instituteCode : undefined,
        gpa: r.gpa,
        cgpa: typeof r.cgpa === 'number' ? r.cgpa : null,
        failedSubjects: [
          ...(r.referredSubjects || []).map(rs => ({
            subCode: rs.code,
            subName: rs.name || resolveBtebSubjectCode(rs.code)?.name || `Subject ${rs.code}`,
            type: rs.failedComponent || 'T',
            originSemester: r.semester,
            passed: false
          })),
          ...(r.clearedSubjects || []).map(cs => ({
            subCode: cs.code,
            subName: cs.name || resolveBtebSubjectCode(cs.code)?.name || `Subject ${cs.code}`,
            type: cs.failedComponent || 'T',
            originSemester: r.semester,
            passed: true
          }))
        ]
      })),
      failedSubjects: combinedFailed
    };
  });

  // Active pending failed subjects from the latest publication of the student's current/latest semesters
  // Deduplicate by subject code; if a subject was cleared in a later semester, exclude it
  const clearedCodeSet = new Set<string>();
  const pendingMap = new Map<string, BtebFailedSubjectDetail>();

  for (const semItem of semItems) {
    for (const fs of semItem.failedSubjects) {
      const codeKey = String(fs.subCode);
      if (fs.passed) {
        clearedCodeSet.add(codeKey);
        pendingMap.delete(codeKey);
      } else if (!clearedCodeSet.has(codeKey)) {
        pendingMap.set(codeKey, fs);
      }
    }
  }

  // If the highest semester is PASSED (e.g. passed 5th/6th/7th/8th sem), clear earlier referrals that were resolved
  const latestSemItem = semItems[semItems.length - 1];
  const allPendingFailed =
    latestSemItem && latestSemItem.status === 'passed' && latestSemItem.semester >= 5
      ? []
      : Array.from(pendingMap.values());

  const highestSemester = Math.max(...semItems.map(s => s.semester));
  const passedSemesters = semItems.filter(s => s.status === 'passed').length;

  let overallCgpa: number | null = null;
  for (const s of semItems) {
    if (typeof s.cgpa === 'number') {
      overallCgpa = s.cgpa;
    }
  }

  const overallStatus: 'passed_all' | 'referred_pending' | 'in_progress' =
    allPendingFailed.length > 0 || semItems.some(s => s.status === 'referred' || s.status === 'withheld')
      ? 'referred_pending'
      : highestSemester === 8 && overallCgpa !== null
        ? 'passed_all'
        : 'in_progress';

  return {
    rollNumber: roll,
    curriculumId: (curriculumId as BtebCurriculumId) || 'diploma_in_engineering',
    curriculumName: getCurriculumDisplayName(curriculumId || 'diploma_in_engineering'),
    regulation: firstRec.regulation,
    regulationNote,
    deptName: firstRec.departmentName || null,
    institute: {
      code: firstRec.instituteCode || '—',
      name: firstRec.collegeName || 'Polytechnic Institute'
    },
    overallStatus,
    overallCgpa,
    completedSemestersCount: passedSemesters,
    highestSemester,
    currentFailedSubjects: allPendingFailed,
    semesterResults: semItems,
    dataSource: 'official_bteb_gazette_store',
    dataSourceLabel: 'DiplomaMate Official Gazette Database',
    retrievedAt: new Date().toISOString()
  };
}

app.get('/api/results/lookup', async (req: Request, res: Response) => {
  try {
    const rawRoll = normalizeBtebRollDigits(String(req.query.roll || ''));
    if (!rawRoll || !/^\d{4,8}$/.test(rawRoll)) {
      return res.status(400).json({
        success: false,
        invalidRoll: true,
        error: 'Please enter a valid BTEB Board Roll Number (4 to 8 numeric digits).'
      });
    }

    const curriculum = String(req.query.curriculum || req.query.curriculumId || 'diploma_in_engineering').trim();
    const rawReg = req.query.regulation ? String(req.query.regulation).trim() : 'all';
    const regulation = rawReg === 'any' ? 'all' : rawReg;

    const supportedCurricula = new Set<string>([
      'diploma_in_engineering',
      'diploma_in_textile',
      'diploma_in_agriculture',
      'diploma_in_tourism',
      'hsc_bm',
      'ssc_vocational'
    ]);
    if (!supportedCurricula.has(curriculum)) {
      return res.status(400).json({
        success: false,
        error: 'Please select a supported BTEB curriculum.'
      });
    }

    if (!['all', '2022', '2016', '2010'].includes(regulation)) {
      return res.status(400).json({
        success: false,
        error: 'Please select a supported BTEB regulation or "all".'
      });
    }

    const localStatement = buildStatementFromLocalStore(rawRoll, curriculum, regulation);
    if (localStatement) {
      return res.status(200).json({
        success: true,
        found: true,
        rollNumber: rawRoll,
        statement: localStatement
      });
    }

    console.warn(
      `[BTEB Results Lookup] No imported record; curriculum=${curriculum}, regulation=${regulation}, ` +
      `records=${btebResultsStore.studentResults.length}, batches=${btebResultsStore.resultBatches.length}, ` +
      `persistence=${process.env.BTEB_RESULTS_STORE_PATH ? 'configured-path' : 'instance-local'}.`
    );
    return res.status(503).json({
      success: false,
      found: false,
      rollNumber: rawRoll,
      externalUnavailable: true,
      manualVerificationRequired: true,
      officialPortalUrl: 'https://result.bteb.gov.bd/result-search',
      error:
        'This roll is not present in DiplomaMate’s imported official Gazette records. The official BTEB portal requires registration number, exam details, and a manual security check, so DiplomaMate cannot verify this result automatically. Open the official portal or ask an administrator to import the official result file.'
    });
  } catch (err: any) {
    const errorType = err instanceof Error ? err.name : 'UnknownError';
    console.error(`[BTEB Results Lookup] HTTP 500: local Gazette lookup failed (${errorType}).`);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred while retrieving examination results. Please try again later.'
    });
  }
});

/**
 * 9C. POST GROUP RESULTS & STATISTICAL PERFORMANCE ANALYSIS
 */
app.post('/api/results/group', (req: Request, res: Response) => {
  try {
    const {
      rollInput,
      rollsInput,
      semester,
      regulation = 'all',
      examYear = 'all',
      examType = 'all'
    } = req.body;

    const effectiveRollInput = rollInput || rollsInput;
    if (!effectiveRollInput || !String(effectiveRollInput).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please enter comma-separated Board Roll numbers or a roll range (e.g., 542880-542910).'
      });
    }

    const { rolls, invalidTokens, truncated } = parseGroupRollInput(String(effectiveRollInput), 150);

    if (rolls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid Board Roll numbers (4–8 digits) were found in your query.'
      });
    }

    const semNum = semester && semester !== 'all' ? Number(semester) : null;
    const yearNum = examYear && examYear !== 'all' ? Number(examYear) : null;

    // Filter candidate pool from store
    const candidatePool = btebResultsStore.studentResults.filter(r => {
      if (semNum !== null && Number(r.semester) !== semNum) return false;
      if (regulation !== 'all' && String(r.regulation) !== regulation) return false;
      if (yearNum !== null && Number(r.examYear) !== yearNum) return false;
      if (examType !== 'all' && String(r.examType).toLowerCase() !== String(examType).toLowerCase()) return false;
      return true;
    });

    // Map by roll number (if multiple records match when 'all' is selected, pick latest semester/year)
    const rollRecordMap = new Map<string, StudentResultRecord>();
    for (const rec of candidatePool) {
      const normalizedRoll = normalizeBtebRollDigits(String(rec.rollNumber ?? ''));
      const existing = rollRecordMap.get(normalizedRoll);
      if (
        !existing ||
        Number(rec.examYear) > Number(existing.examYear) ||
        (Number(rec.examYear) === Number(existing.examYear) && Number(rec.semester) > Number(existing.semester))
      ) {
        rollRecordMap.set(normalizedRoll, rec);
      }
    }

    // If regulation was restricted (e.g. '2022') and a requested roll exists in the store under another regulation for the requested semester, include it as fallback
    if (regulation !== 'all') {
      for (const roll of rolls) {
        if (!rollRecordMap.has(roll)) {
          const crossRegPool = btebResultsStore.studentResults.filter(r => {
            if (!matchesBtebRoll(r.rollNumber, roll)) return false;
            if (semNum !== null && Number(r.semester) !== semNum) return false;
            if (yearNum !== null && Number(r.examYear) !== yearNum) return false;
            if (examType !== 'all' && String(r.examType).toLowerCase() !== String(examType).toLowerCase()) return false;
            return true;
          });
          for (const rec of crossRegPool) {
            const normalizedRoll = normalizeBtebRollDigits(String(rec.rollNumber ?? ''));
            const existing = rollRecordMap.get(normalizedRoll);
            if (
              !existing ||
              Number(rec.examYear) > Number(existing.examYear) ||
              (Number(rec.examYear) === Number(existing.examYear) && Number(rec.semester) > Number(existing.semester))
            ) {
              rollRecordMap.set(normalizedRoll, rec);
            }
          }
        }
      }
    }

    const items: GroupResultItem[] = rolls.map(roll => {
      const rec = rollRecordMap.get(roll) || null;
      return {
        rollNumber: roll,
        found: Boolean(rec),
        record: rec
      };
    });

    // Compute Group Performance Analytics
    const foundItems = items.filter(i => i.found && i.record);
    const passItems = foundItems.filter(i => i.record?.status === 'PASSED');
    const referredItems = foundItems.filter(i => i.record?.status === 'REFERRED');
    const withheldItems = foundItems.filter(i => i.record?.status === 'WITHHELD');

    const validGpas = passItems
      .map(i => i.record?.gpa)
      .filter((g): g is number => typeof g === 'number' && !isNaN(g));

    const averageGpa =
      validGpas.length > 0
        ? Number((validGpas.reduce((a, b) => a + b, 0) / validGpas.length).toFixed(2))
        : null;
    const highestGpa = validGpas.length > 0 ? Number(Math.max(...validGpas).toFixed(2)) : null;
    const lowestPassGpa = validGpas.length > 0 ? Number(Math.min(...validGpas).toFixed(2)) : null;

    const passRate =
      foundItems.length > 0
        ? Number(((passItems.length / foundItems.length) * 100).toFixed(1))
        : 0;

    // Count most common referred subjects across the group
    const refSubjectCounter = new Map<string, { code: string; name: string | null; count: number }>();
    for (const item of referredItems) {
      for (const sub of item.record?.referredSubjects || []) {
        const prev = refSubjectCounter.get(sub.code);
        if (prev) {
          prev.count += 1;
        } else {
          refSubjectCounter.set(sub.code, {
            code: sub.code,
            name: sub.name,
            count: 1
          });
        }
      }
    }

    const mostCommonReferredSubjects = Array.from(refSubjectCounter.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const analytics: GroupResultAnalytics = {
      totalRequested: rolls.length,
      foundCount: foundItems.length,
      notFoundCount: rolls.length - foundItems.length,
      passCount: passItems.length,
      referredCount: referredItems.length,
      withheldCount: withheldItems.length,
      passRate,
      averageGpa,
      highestGpa,
      lowestPassGpa,
      mostCommonReferredSubjects
    };

    return res.status(200).json({
      success: true,
      items,
      analytics,
      invalidTokens,
      truncated,
      totalBatchesInDatabase: btebResultsStore.resultBatches.length
    });
  } catch (error) {
    console.error('Group result query error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process group result search.' });
  }
});

/**
 * Helper to extract text from an uploaded PDF or image using Gemini when raw text isn't directly provided
 */
async function extractTextFromUploadedResultPdf(fileDataUrl: string, mimeType?: string): Promise<string> {
  const val = validateAndDecodeUploadedFile({ fileDataUrl, mimeType });
  if (!val.valid) {
    throw new Error(val.errorMessage || 'Invalid or corrupted result document.');
  }

  if (val.fileCategory === 'PDF') {
    const pdfRes = extractPdfContentInBatches(val.buffer);
    if (pdfRes.combinedText && pdfRes.combinedText.trim().length > 10) {
      return pdfRes.combinedText;
    }
    if (pdfRes.embeddedOcrTextHint && pdfRes.embeddedOcrTextHint.trim().length > 10) {
      return pdfRes.embeddedOcrTextHint;
    }
  } else if (val.fileCategory === 'IMAGE') {
    const emb = extractEmbeddedTextFromImageBuffer(val.buffer, val.detectedMimeType);
    if (emb && emb.length > 10) return emb;
  }

  // Fallback to raw ASCII pattern check
  try {
    const rawAscii = val.buffer.toString('latin1');
    const directMatches = rawAscii.match(/\d{6}\s*(?:\(\s*\d\.\d{2}\s*\)|\{\s*[\dTP,\s()]+\s*\})/g);
    if (directMatches && directMatches.length >= 2) {
      return directMatches.join('\n');
    }
  } catch {
    // Continue to Gemini extraction if available
  }

  if (process.env.GEMINI_API_KEY) {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: val.base64Clean,
                mimeType: val.detectedMimeType || 'application/pdf'
              }
            },
            {
              text: `Extract all Bangladesh Technical Education Board (BTEB) examination result entries verbatim from this document.
Preserve institute headers like "50118 - Dhaka Polytechnic Institute", passed roll entries like "542880 (3.85)", and referred roll entries like "542881 { 66662(T), 66664(T,P) }".
Do not invent or alter any roll numbers, GPAs, or subject codes. Return plain text only.`
            }
          ]
        }
      ]
    });
    return response.text || '';
  }

  throw new Error(
    'Uploaded PDF is a scanned image without selectable text and GEMINI_API_KEY is not configured. Please paste the extracted text from the BTEB Result PDF or upload a text-based PDF / .txt / .csv / .json file.'
  );
}

/**
 * 9D. ADMIN ONLY: PREVIEW & VALIDATE OFFICIAL BTEB RESULT IMPORT
 * Enforces server-side `requireSystemAdmin` session verification (ignores client-supplied `requesterRole`).
 */
app.post('/api/admin/results/preview-parse', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const {
      semester = 6,
      regulation = '2022',
      examYear = 2024,
      examType = 'Regular',
      rawText,
      fileDataUrl,
      mimeType
    } = req.body;

    let contentToParse = '';

    if (fileDataUrl) {
      try {
        contentToParse = await extractTextFromUploadedResultPdf(fileDataUrl, mimeType);
      }

      catch (pdfErr: any) {
        return res.status(400).json({
          success: false,
          error: pdfErr?.message || 'Could not extract text from PDF.'
        });
      }
    }
    else {
  contentToParse = String(rawText || '').trim();
}

    if (!contentToParse) {
      return res.status(400).json({
        success: false,
        error: 'No BTEB result content provided. Please upload a result file or paste official BTEB result text.'
      });
    }

    const semNum = (Number(semester) || 6) as SemesterNumber;
    const yearNum = Number(examYear) || 2024;
    const regStr = (['2022', '2016', '2010'].includes(String(regulation)) ? String(regulation) : '2022') as BtebRegulation;
    const typeStr = (['Regular', 'Irregular', 'Improvement'].includes(String(examType)) ? String(examType) : 'Regular') as BtebExamType;

    const {
      parsedRecords,
      duplicateRollsInPayload,
      unrecognizedSnippets,
      detectedInstitutes
    } = parseOfficialBtebContent(contentToParse, semNum);

    if (parsedRecords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid BTEB roll result entries were recognized. Expected format: "542880 (3.85)" for passed or "542881 { 66662(T), 66664(T,P) }" for referred rolls.',
        unrecognizedSnippets
      });
    }

    // Check existing conflicts in database for same (roll + semester + regulation + examYear + examType)
    const existingKeys = new Set(
      btebResultsStore.studentResults
        .filter(
          r =>
          Number(r.semester) === semNum &&
          String(r.regulation) === regStr &&
          Number(r.examYear) === yearNum &&
          String(r.examType).toLowerCase() === typeStr.toLowerCase()
        )
      .map(r => normalizeBtebRollDigits(String(r.rollNumber ?? '')))
    );

    const existingConflicts = parsedRecords
      .filter(r => existingKeys.has(r.rollNumber))
      .map(r => r.rollNumber);

    const passCount = parsedRecords.filter(r => r.status === 'PASSED').length;
    const referredCount = parsedRecords.filter(r => r.status === 'REFERRED').length;
    const withheldCount = parsedRecords.filter(r => r.status === 'WITHHELD').length;

    return res.status(200).json({
      success: true,
      summary: {
        totalParsed: parsedRecords.length,
        passCount,
        referredCount,
        withheldCount,
        duplicateRollsInPayloadCount: duplicateRollsInPayload.length,
        duplicateRollsInPayload: duplicateRollsInPayload.slice(0, 20),
        existingConflictsCount: existingConflicts.length,
        existingConflicts: existingConflicts.slice(0, 20),
        unrecognizedCount: unrecognizedSnippets.length,
        unrecognizedSnippets: unrecognizedSnippets.slice(0, 10),
        detectedInstitutes
      },
      sampleRecords: parsedRecords.slice(0, 25),
      extractedTextPreview: fileDataUrl ? contentToParse.slice(0, 2000) : undefined
    });
  } catch (error) {
    console.error('Admin preview-parse error:', error);
    return res.status(500).json({ success: false, error: 'Failed to parse BTEB result dataset.' });
  }
});

/**
 * 9E. ADMIN ONLY: COMMIT & PUBLISH OFFICIAL BTEB RESULT BATCH
 * Enforces server-side `requireSystemAdmin` session verification (ignores client-supplied `requesterRole`).
 */
app.post('/api/admin/results/import', requireSystemAdmin, async (req: Request, res: Response) => {
  try {
    const adminSession: ServerSession = (req as any).adminSession;
    const {
      title,
      semester = 6,
      regulation = '2022',
      examYear = 2024,
      examType = 'Regular',
      publishedDate,
      sourceFileName = 'Official_BTEB_Result_Sheet.txt',
      duplicateMode = 'overwrite',
      rawText,
      fileDataUrl,
      mimeType,
      notes
    } = req.body;

    const importedBy = adminSession?.name
      ? `${adminSession.name} (${adminSession.email})`
      : 'System Administrator';

    let contentToParse = '';
    if (fileDataUrl) {
      contentToParse = await extractTextFromUploadedResultPdf(fileDataUrl, mimeType);
    } else {
      contentToParse = String(rawText || '').trim();
    }

    if (!contentToParse) {
      return res.status(400).json({
        success: false,
        error: 'No BTEB result content provided for import.'
      });
    }

    const semNum = (Number(semester) || 6) as SemesterNumber;
    const yearNum = Number(examYear) || 2024;
    const regStr = (['2022', '2016', '2010'].includes(String(regulation)) ? String(regulation) : '2022') as BtebRegulation;
    const typeStr = (['Regular', 'Irregular', 'Improvement'].includes(String(examType)) ? String(examType) : 'Regular') as BtebExamType;

    const { parsedRecords } = parseOfficialBtebContent(contentToParse, semNum);
    if (parsedRecords.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot import empty batch: zero valid BTEB roll records were parsed.'
      });
    }

    const nextStore: PersistentResultsStore = {
      resultBatches: [...btebResultsStore.resultBatches],
      studentResults: [...btebResultsStore.studentResults],
      importAuditLogs: [...btebResultsStore.importAuditLogs]
    };

    const batchId = `BTEB_${yearNum}_REG${regStr}_SEM${semNum}_${typeStr.toUpperCase()}`;
    const batchTitle =
      title && String(title).trim()
        ? String(title).trim()
        : `${semNum}${semNum === 1 ? 'st' : semNum === 2 ? 'nd' : semNum === 3 ? 'rd' : 'th'} Semester ${typeStr} Examination ${yearNum} (${regStr} Probidhan)`;
    const nowIso = new Date().toISOString();
    const pubDate = publishedDate || new Date().toISOString().split('T')[0];

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Index existing records by composite key `${batchId}_${rollNumber}`
    const existingIndexMap = new Map<string, number>();
    nextStore.studentResults.forEach((rec, idx) => {
      existingIndexMap.set(`${rec.batchId}_${normalizeBtebRollDigits(String(rec.rollNumber ?? ''))}`, idx);
    });

    for (const candidate of parsedRecords) {
      const recordId = `${batchId}_${candidate.rollNumber}`;
      const existingIdx = existingIndexMap.get(recordId);

      const fullRecord: StudentResultRecord = {
        id: recordId,
        batchId,
        batchTitle,
        rollNumber: candidate.rollNumber,
        semester: semNum,
        regulation: regStr,
        examYear: yearNum,
        examType: typeStr,
        publishedDate: pubDate,
        instituteCode: candidate.instituteCode,
        collegeId: candidate.collegeId,
        collegeName: candidate.collegeName,
        departmentName: candidate.departmentName,
        studentName: candidate.studentName,
        status: candidate.status,
        gpa: candidate.gpa,
        referredSubjects: candidate.referredSubjects,
        subjectGrades: candidate.subjectGrades,
        dataSource: 'official-bteb-import',
        importedAt: nowIso
      };

      if (existingIdx !== undefined) {
        if (duplicateMode === 'skip') {
          skippedCount += 1;
        } else {
          nextStore.studentResults[existingIdx] = fullRecord;
          updatedCount += 1;
        }
      } else {
        nextStore.studentResults.push(fullRecord);
        existingIndexMap.set(recordId, nextStore.studentResults.length - 1);
        insertedCount += 1;
      }
    }

    // Recompute batch totals from all records belonging to this batchId
    const batchRecords = nextStore.studentResults.filter(r => r.batchId === batchId);
    const passCount = batchRecords.filter(r => r.status === 'PASSED').length;
    const referredCount = batchRecords.filter(r => r.status === 'REFERRED').length;
    const withheldCount = batchRecords.filter(r => r.status === 'WITHHELD').length;

    const batchRecord: BtebResultBatch = {
      id: batchId,
      title: batchTitle,
      semester: semNum,
      regulation: regStr,
      examYear: yearNum,
      examType: typeStr,
      publishedDate: pubDate,
      importedAt: nowIso,
      importedBy: String(importedBy),
      sourceFileName: String(sourceFileName),
      totalRecords: batchRecords.length,
      passCount,
      referredCount,
      withheldCount,
      notes: notes ? String(notes).trim() : undefined
    };

    const existingBatchIdx = nextStore.resultBatches.findIndex(b => b.id === batchId);
    if (existingBatchIdx >= 0) {
      nextStore.resultBatches[existingBatchIdx] = batchRecord;
    } else {
      nextStore.resultBatches.push(batchRecord);
    }

    const auditEntry: ResultImportAuditLog = {
      id: `imp_${Date.now()}`,
      batchId,
      batchTitle,
      importedBy: String(importedBy),
      importedAt: nowIso,
      sourceFileName: String(sourceFileName),
      totalParsed: parsedRecords.length,
      insertedCount,
      updatedCount,
      skippedCount,
      duplicateMode: duplicateMode === 'skip' ? 'skip' : 'overwrite'
    };
    nextStore.importAuditLogs.unshift(auditEntry);

    saveResultsStore(nextStore);
    btebResultsStore.resultBatches = nextStore.resultBatches;
    btebResultsStore.studentResults = nextStore.studentResults;
    btebResultsStore.importAuditLogs = nextStore.importAuditLogs;

    console.info(
      `[BTEB Results Import] Saved batch ${batchId}: parsed=${parsedRecords.length}, inserted=${insertedCount}, updated=${updatedCount}, skipped=${skippedCount}.`
    );

    return res.status(200).json({
      success: true,
      message: `Successfully published ${batchTitle}: ${insertedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped.`,
      batch: batchRecord,
      auditEntry
    });
  } catch (error) {
    const errorType = error instanceof Error ? error.name : 'UnknownError';
    console.error(`[BTEB Results Import] Failed to persist result batch (${errorType}).`);
    return res.status(500).json({ success: false, error: 'Failed to save the imported BTEB result batch. Please try again or contact an administrator.' });
  }
});

/**
 * 9F. ADMIN ONLY: DELETE AN IMPORTED RESULT BATCH
 * Enforces server-side `requireSystemAdmin` session verification (ignores client-supplied `requesterRole`).
 */
app.delete('/api/admin/results/batches/:batchId', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;

    const existingBatch = btebResultsStore.resultBatches.find(b => b.id === batchId);
    if (!existingBatch) {
      return res.status(404).json({ success: false, error: 'Result batch not found.' });
    }

    const nextStore: PersistentResultsStore = {
      resultBatches: btebResultsStore.resultBatches.filter(b => b.id !== batchId),
      studentResults: btebResultsStore.studentResults.filter(r => r.batchId !== batchId),
      importAuditLogs: [...btebResultsStore.importAuditLogs]
    };
    const beforeCount = btebResultsStore.studentResults.length;
    const removedRecords = beforeCount - nextStore.studentResults.length;

    saveResultsStore(nextStore);
    btebResultsStore.resultBatches = nextStore.resultBatches;
    btebResultsStore.studentResults = nextStore.studentResults;
    btebResultsStore.importAuditLogs = nextStore.importAuditLogs;

    return res.status(200).json({
      success: true,
      message: `Removed batch "${existingBatch.title}" and ${removedRecords} associated roll records.`,
      removedRecords
    });
  } catch (error) {
    const errorType = error instanceof Error ? error.name : 'UnknownError';
    console.error(`[BTEB Results Import] Failed to delete batch (${errorType}).`);
    return res.status(500).json({ success: false, error: 'Failed to delete result batch.' });
  }
});

/**
 * ============================================================================
 * 10. TEACHER ATTENDANCE, ROSTER OCR, MONTHLY MATRIX & ASSIGNMENT SUBMISSIONS
 * ============================================================================
 * - Persistent store in `data/academic-store.json`
 * - Enforces server-side teacher authentication & cohort scope authorization
 * - Prevents duplicate attendance sheets for same (class, date, period)
 * - Preserves Present, Absent, and Not Marked statuses explicitly
 * - Extracts roster from Image/PDF via OCR without auto-marking Present or duplicating students
 * - Calculates monthly attendance percentages strictly from recorded class sessions
 * - Enforces Teacher vs Student RBAC on Assignment Posting, Student Submissions, and Submission Inspection
 */

interface PersistentAcademicStore {
  students: EnrolledStudent[];
  teacherAccounts: ServerTeacher[];
  attendanceSheets: AttendanceSheet[];
  notes: NoteItem[];
  assignments: AssignmentItem[];
  assignmentSubmissions: AssignmentSubmissionRecord[];
  shiftSchedules: Record<string, ShiftScheduleConfig>;
  savedSemesterCalculatorRecords: SavedSemesterCalculatorRecord[];
  routines: RoutinePeriod[];
  routineNotifications: RoutineNotificationRecord[];
  captainRecords: CaptainRecord[];
  communities: AcademicCommunity[];
  communityMemberships: CommunityMembershipRecord[];
  communityMessages: CommunityMessageRecord[];
  communityReports: CommunityReportRecord[];
  deletedAccountIds: string[];
  adminAuditLogs: AdminAuditEntry[];
  jobs: JobCircular[];
  campusNotices: CampusNoticeItem[];
  campusNoticeReports: CampusNoticeReportRecord[];
  teacherContactAccessLocked: boolean;
  // Endorsements created by teacher-approve, keyed by application id.
  // This is the server-side proof that an endorsement is genuine, so
  // POST /api/captains/sync can reject client-forged endorsements while
  // still accepting a healing sync that replays a real one.
  pendingTeacherEndorsements: Record<string, {
    teacherId: string;
    teacherName: string;
    teacherDesignation: string;
    endorsedAt: string;
    comments: string;
  }>;
}

const ACADEMIC_STORE_FILE = path.join(DATA_DIR, 'academic-store.json');

interface AdminAuditEntry {
  id: string;
  adminId: string;
  action: string;
  targetId: string;
  targetName: string;
  timestamp: string;
  details?: string;
}

const deletedAccountIds = new Set<string>();

/**
 * SAFE MIGRATION & VALIDATION OF ROUTINE RECORDS
 * - Resolves `college_id` and `department_id` (`technology_id`) using strict non-guessing resolvers.
 * - Never guesses a college, department, or semester when missing or ambiguous.
 * - Any routine record missing a valid `college_id`, `department_id`, or `semester` (1..8)
 *   is quarantined with `publication_status: 'needs_admin_review'` so it is NEVER globally
 *   visible to students and can be reviewed/assigned by an administrator.
 * - Preserves all routine content, schedule times, rooms, and metadata.
 */
export function migrateAndValidateRoutineRecord(raw: any): {
  record: RoutinePeriod;
  migratedStatus: 'valid' | 'quarantined_needs_admin_review';
  reasons: string[];
} {
  const reasons: string[] = [];
  const rawCollegeInput = raw?.college_id ?? raw?.collegeId ?? raw?.college ?? null;
  const rawDeptInput = raw?.department_id ?? raw?.departmentId ?? raw?.technology_id ?? raw?.technologyId ?? raw?.department ?? raw?.technology ?? null;
  const rawSemester = raw?.semester !== undefined && raw?.semester !== null && raw?.semester !== '' ? Number(raw.semester) : null;

  const resolvedCollege = resolveStrictCollege(rawCollegeInput ? String(rawCollegeInput) : null);
  const resolvedDept = resolveStrictTechnology(rawDeptInput ? String(rawDeptInput) : null);
  const validSemester =
    rawSemester !== null && Number.isInteger(rawSemester) && rawSemester >= 1 && rawSemester <= 8
      ? (rawSemester as SemesterNumber)
      : null;

  if (!resolvedCollege) {
    reasons.push(
      rawCollegeInput
        ? `Unrecognized college identifier "${String(rawCollegeInput)}"`
        : 'Missing college_id / college'
    );
  }
  if (!resolvedDept) {
    reasons.push(
      rawDeptInput
        ? `Unrecognized department/technology identifier "${String(rawDeptInput)}"`
        : 'Missing department_id / technology_id'
    );
  }
  if (!validSemester) {
    reasons.push(
      raw?.semester !== undefined && raw?.semester !== null
        ? `Invalid semester "${String(raw.semester)}" (must be 1..8)`
        : 'Missing semester'
    );
  }

  const shiftClean: Shift = raw?.shift === 'Day' ? 'Day' : 'Morning';
  const sectionClean: Section = (['A1', 'A2', 'B1', 'B2'].includes(String(raw?.section)) ? String(raw.section) : 'A1') as Section;
  const regulationClean: CatalogRegulation | undefined =
    raw?.regulation === '2016' || raw?.regulation === '2022' ? raw.regulation : '2022';

  const nowIso = new Date().toISOString();
  const isTargetComplete = Boolean(resolvedCollege && resolvedDept && validSemester);

  let pubStatus: RoutinePublicationStatus = 'published';
  if (!isTargetComplete) {
    pubStatus = 'needs_admin_review';
  } else if (
    raw?.publication_status === 'draft' ||
    raw?.publication_status === 'needs_admin_review' ||
    raw?.publication_status === 'archived' ||
    raw?.publication_status === 'published'
  ) {
    pubStatus = raw.publication_status;
  }

  const migratedRecord: RoutinePeriod = {
    id: String(raw?.id || `rt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    day: (['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].includes(String(raw?.day))
      ? String(raw.day)
      : 'Saturday') as WeekDay,
    periodNumber: Number(raw?.periodNumber) || 1,
    startTime: String(raw?.startTime || '08:00 AM'),
    endTime: String(raw?.endTime || '08:45 AM'),
    subjectCode: String(raw?.subjectCode || '').trim(),
    subjectName: String(raw?.subjectName || '').trim(),
    teacherName: String(raw?.teacherName || 'Department Instructor').trim(),
    room: String(raw?.room || 'TBA').trim(),
    type: raw?.type === 'Practical / Lab' ? 'Practical / Lab' : 'Theory',
    shift: shiftClean,
    section: sectionClean,
    college_id: resolvedCollege ? resolvedCollege.id : null,
    college: resolvedCollege ? resolvedCollege.name : (raw?.college ? String(raw.college) : undefined),
    department_id: resolvedDept ? resolvedDept.id : null,
    technology_id: resolvedDept ? resolvedDept.id : null,
    department: resolvedDept ? resolvedDept.name : (raw?.department ? String(raw.department) : undefined),
    regulation: regulationClean,
    semester: validSemester,
    created_by: raw?.created_by ? String(raw.created_by) : 'system_seed',
    created_by_name: raw?.created_by_name ? String(raw.created_by_name) : 'Class Captain',
    created_by_role: (raw?.created_by_role as AccountType) || 'class_captain',
    publication_status: pubStatus,
    created_at: raw?.created_at ? String(raw.created_at) : nowIso,
    updated_at: raw?.updated_at ? String(raw.updated_at) : nowIso,
    migration_review_reason: !isTargetComplete
      ? `Quarantined during migration (never guess target group): ${reasons.join('; ')}`
      : raw?.migration_review_reason
  };

  return {
    record: migratedRecord,
    migratedStatus: isTargetComplete && pubStatus !== 'needs_admin_review' ? 'valid' : 'quarantined_needs_admin_review',
    reasons
  };
}

function buildInitialAcademicStore(): PersistentAcademicStore {
  // Seed 2 realistic recorded attendance sessions in Oct 2026 for Semester 6 Morning A1
  const seedCohortStudents = MOCK_ENROLLED_STUDENTS.filter(
    s => s.semester === 6 && s.shift === 'Morning' && s.section === 'A1'
  );

  const initialSheets: AttendanceSheet[] = [
    {
      id: 'att_seed_2026_10_19_66662_p1',
      college: 'Dhaka Polytechnic Institute',
      collegeId: 'clg_dhaka',
      department: 'Computer Science and Technology (CST)',
      departmentId: 'tech_computer',
      semester: 6,
      shift: 'Morning',
      section: 'A1',
      date: '2026-10-19',
      subjectCode: '66662',
      subjectName: 'Microprocessor & Interfacing',
      periodLabel: 'Period 1 (08:00 AM - 08:45 AM)',
      teacherId: 'tch_02',
      teacherName: 'Engr. Shamima Nasrin',
      entries: seedCohortStudents.map((st, idx) => ({
        studentId: st.id,
        studentName: st.name,
        boardRoll: st.boardRoll,
        classRoll: st.classRoll,
        regNumber: st.regNumber,
        status: idx === 3 ? 'absent' : 'present'
      })),
      createdAt: '2026-10-19T08:45:00.000Z',
      updatedAt: '2026-10-19T08:45:00.000Z',
      auditTrail: [
        {
          action: 'created',
          performedBy: 'Engr. Shamima Nasrin',
          performedById: 'tch_02',
          performedByRole: 'teacher',
          timestamp: '2026-10-19T08:45:00.000Z',
          summary: 'Created attendance sheet (4 Present, 1 Absent, 0 Not Marked)'
        }
      ]
    },
    {
      id: 'att_seed_2026_10_21_66662_p1',
      college: 'Dhaka Polytechnic Institute',
      collegeId: 'clg_dhaka',
      department: 'Computer Science and Technology (CST)',
      departmentId: 'tech_computer',
      semester: 6,
      shift: 'Morning',
      section: 'A1',
      date: '2026-10-21',
      subjectCode: '66662',
      subjectName: 'Microprocessor & Interfacing',
      periodLabel: 'Period 1 (08:00 AM - 08:45 AM)',
      teacherId: 'tch_02',
      teacherName: 'Engr. Shamima Nasrin',
      entries: seedCohortStudents.map((st, idx) => ({
        studentId: st.id,
        studentName: st.name,
        boardRoll: st.boardRoll,
        classRoll: st.classRoll,
        regNumber: st.regNumber,
        status: idx === 4 ? 'not_marked' : 'present'
      })),
      createdAt: '2026-10-21T08:45:00.000Z',
      updatedAt: '2026-10-21T08:45:00.000Z',
      auditTrail: [
        {
          action: 'created',
          performedBy: 'Engr. Shamima Nasrin',
          performedById: 'tch_02',
          performedByRole: 'teacher',
          timestamp: '2026-10-21T08:45:00.000Z',
          summary: 'Created attendance sheet (4 Present, 0 Absent, 1 Not Marked)'
        }
      ]
    }
  ];

  const initialRoutines = INITIAL_ROUTINE.map(r => migrateAndValidateRoutineRecord(r).record);

  return {
    students: [...MOCK_ENROLLED_STUDENTS],
    teacherAccounts: Array.from(serverTeachers.values()),
    attendanceSheets: initialSheets,
    notes: [],
    assignments: [],
    assignmentSubmissions: [],
    shiftSchedules: {
      [buildShiftScheduleKey('Morning', 'default')]: buildDefaultShiftScheduleConfig('Morning', { scopeKey: 'default' }),
      [buildShiftScheduleKey('Day', 'default')]: buildDefaultShiftScheduleConfig('Day', { scopeKey: 'default' })
    },
    savedSemesterCalculatorRecords: [],
    routines: initialRoutines,
    routineNotifications: [],
    captainRecords: [...(INITIAL_APPLICATIONS as CaptainRecord[])],
    communities: [],
    communityMemberships: [],
    communityMessages: [],
    communityReports: [],
    deletedAccountIds: [],
    adminAuditLogs: [],
    jobs: [...(INITIAL_JOBS as JobCircular[])],
    campusNotices: [...(INITIAL_CAMPUS_NOTICES as CampusNoticeItem[])],
    campusNoticeReports: [],
    teacherContactAccessLocked: false,
    pendingTeacherEndorsements: {}
  };
}

function loadAcademicStore(): PersistentAcademicStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(ACADEMIC_STORE_FILE)) {
      const raw = fs.readFileSync(ACADEMIC_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const loadedSchedules: Record<string, ShiftScheduleConfig> =
        parsed.shiftSchedules && typeof parsed.shiftSchedules === 'object'
          ? parsed.shiftSchedules
          : {};
      if (!loadedSchedules[buildShiftScheduleKey('Morning', 'default')]) {
        loadedSchedules[buildShiftScheduleKey('Morning', 'default')] = buildDefaultShiftScheduleConfig('Morning', { scopeKey: 'default' });
      }
      if (!loadedSchedules[buildShiftScheduleKey('Day', 'default')]) {
        loadedSchedules[buildShiftScheduleKey('Day', 'default')] = buildDefaultShiftScheduleConfig('Day', { scopeKey: 'default' });
      }

      // Safely migrate stored routines or initialize from INITIAL_ROUTINE
      const rawRoutinesList: any[] =
        Array.isArray(parsed.routines) && parsed.routines.length > 0
          ? parsed.routines
          : [...INITIAL_ROUTINE];
      const migratedRoutines = rawRoutinesList.map(r => migrateAndValidateRoutineRecord(r).record);

      const loadedCaptains: CaptainRecord[] =
        Array.isArray(parsed.captainRecords) && parsed.captainRecords.length > 0
          ? parsed.captainRecords
          : [...(INITIAL_APPLICATIONS as CaptainRecord[])];

      const loadedJobs: JobCircular[] =
        Array.isArray(parsed.jobs) && parsed.jobs.length > 0
          ? parsed.jobs
          : [...(INITIAL_JOBS as JobCircular[])];

      const loadedCampusNotices: CampusNoticeItem[] =
        Array.isArray(parsed.campusNotices) && parsed.campusNotices.length > 0
          ? parsed.campusNotices
          : [...(INITIAL_CAMPUS_NOTICES as CampusNoticeItem[])];
        const loadedTeacherAccounts: ServerTeacher[] = Array.isArray(parsed.teacherAccounts)
        ? parsed.teacherAccounts
        : [];
      loadedTeacherAccounts.forEach(teacher => {
        if (teacher?.id && teacher.pinHash && teacher.pinSalt) {
            if (teacher.isRegisteredAccount === true) {
              serverTeachers.set(teacher.id, teacher);
            } else {
              legacyUnregisteredTeachers.set(teacher.id, teacher);
            }
          }
        });

      const loadedDeletedAccountIds: string[] = Array.isArray(parsed.deletedAccountIds)
        ? parsed.deletedAccountIds.filter((id: unknown): id is string => typeof id === 'string')
        : [];
      loadedDeletedAccountIds.forEach(id => deletedAccountIds.add(id));

      const storeObj: PersistentAcademicStore = {
        students: Array.isArray(parsed.students) && parsed.students.length > 0 ? parsed.students : [...MOCK_ENROLLED_STUDENTS],
        teacherAccounts: [...legacyUnregisteredTeachers.values(), ...serverTeachers.values()],
        attendanceSheets: Array.isArray(parsed.attendanceSheets) ? parsed.attendanceSheets : [],
        notes: Array.isArray(parsed.notes)
          ? parsed.notes.filter((note: NoteItem) => !LEGACY_DEMO_CONTENT_IDS.notes.includes(note.id))
          : [],
        assignments: Array.isArray(parsed.assignments)
          ? parsed.assignments.filter((assignment: AssignmentItem) => !LEGACY_DEMO_CONTENT_IDS.assignments.includes(assignment.id))
          : [],
        assignmentSubmissions: Array.isArray(parsed.assignmentSubmissions)
          ? parsed.assignmentSubmissions.filter((submission: AssignmentSubmissionRecord) => !LEGACY_DEMO_CONTENT_IDS.assignmentSubmissions.includes(submission.id))
          : [],
        shiftSchedules: loadedSchedules,
        savedSemesterCalculatorRecords: Array.isArray(parsed.savedSemesterCalculatorRecords) ? parsed.savedSemesterCalculatorRecords : [],
        routines: migratedRoutines,
        routineNotifications: Array.isArray(parsed.routineNotifications) ? parsed.routineNotifications : [],
        captainRecords: loadedCaptains,
        communities: Array.isArray(parsed.communities) ? parsed.communities : [],
        communityMemberships: Array.isArray(parsed.communityMemberships) ? parsed.communityMemberships : [],
        communityMessages: Array.isArray(parsed.communityMessages) ? parsed.communityMessages : [],
        communityReports: Array.isArray(parsed.communityReports) ? parsed.communityReports : [],
        deletedAccountIds: loadedDeletedAccountIds,
        adminAuditLogs: Array.isArray(parsed.adminAuditLogs) ? parsed.adminAuditLogs : [],
        jobs: loadedJobs,
        campusNotices: loadedCampusNotices,
        campusNoticeReports: Array.isArray(parsed.campusNoticeReports) ? parsed.campusNoticeReports : [],
        teacherContactAccessLocked: parsed.teacherContactAccessLocked === true,
        pendingTeacherEndorsements: (parsed.pendingTeacherEndorsements && typeof parsed.pendingTeacherEndorsements === 'object')
          ? parsed.pendingTeacherEndorsements
          : {}
      };
      saveAcademicStore(storeObj);
      return storeObj;
    }
  } catch (err) {
    console.error('[Academic Store] Error reading academic-store.json, initializing defaults:', err);
  }
  const initial = buildInitialAcademicStore();
  saveAcademicStore(initial);
  return initial;
}

function saveAcademicStore(store: PersistentAcademicStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    store.teacherAccounts = [...legacyUnregisteredTeachers.values(), ...serverTeachers.values()];
    store.deletedAccountIds = Array.from(deletedAccountIds);
    const tempFile = `${ACADEMIC_STORE_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), 'utf-8');
    fs.renameSync(tempFile, ACADEMIC_STORE_FILE);
    // The store file is the only copy of all accounts — back it up to
    // GitHub (debounced) so the next Render deploy starts from it.
    scheduleAcademicStoreBackup();
  } catch (err) {
    console.error('[Academic Store] Failed to persist academic-store.json:', err);
    throw new Error('Failed to persist academic-store.json.');
  }
}

// ---------------------------------------------------------------------------
// GitHub auto-backup of the academic store.
//
// Render's free tier has an ephemeral filesystem: every deploy or restart
// resets data/academic-store.json to the version committed in GitHub, so
// student/teacher/captain accounts registered and approvals granted at
// runtime were lost on each deploy. The server therefore commits the store
// file back to the repo (main branch) shortly after every save, so the
// next deploy starts from the latest data instead of the old seed.
//
// Requires env GITHUB_STORE_BACKUP_TOKEN — a fine-grained PAT with
// Contents read/write on this repo. Without it, backups are skipped and a
// warning is logged at startup; the server otherwise works normally.
// GITHUB_BACKUP_DEBOUNCE_MS (default 60000) caps backup frequency, and a
// backup is only sent when the file actually changed since the last one.
// The backup never blocks a request: it runs on a timer, logs failures,
// and retries once on a GitHub sha conflict (409).
// ---------------------------------------------------------------------------
const GITHUB_STORE_BACKUP_TOKEN = process.env.GITHUB_STORE_BACKUP_TOKEN || '';
const GITHUB_API_BASE_URL = (process.env.GITHUB_API_BASE_URL || 'https://api.github.com').replace(/\/$/, '');
const GITHUB_BACKUP_REPO = 'its-tanjim/DiplomaMate';
const GITHUB_BACKUP_BRANCH = 'main';
const GITHUB_BACKUP_PATH = 'data/academic-store.json';
const GITHUB_BACKUP_DEBOUNCE_MS = Number(process.env.GITHUB_BACKUP_DEBOUNCE_MS || 60000) || 60000;
let githubBackupTimer: ReturnType<typeof setTimeout> | null = null;
let githubBackupLastContent: string | null = null;

if (!GITHUB_STORE_BACKUP_TOKEN) {
  console.warn('[Store Backup] GITHUB_STORE_BACKUP_TOKEN is not set — automatic GitHub backup of academic-store.json is DISABLED. Accounts changed at runtime will be lost on the next Render deploy.');
}

function scheduleAcademicStoreBackup(): void {
  if (!GITHUB_STORE_BACKUP_TOKEN || githubBackupTimer) return;
  githubBackupTimer = setTimeout(() => {
    githubBackupTimer = null;
    void pushAcademicStoreBackup();
  }, GITHUB_BACKUP_DEBOUNCE_MS);
  githubBackupTimer.unref?.();
}

async function pushAcademicStoreBackup(): Promise<void> {
  if (!GITHUB_STORE_BACKUP_TOKEN) return;
  try {
    const content = fs.readFileSync(ACADEMIC_STORE_FILE, 'utf-8');
    if (content === githubBackupLastContent) return;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${GITHUB_STORE_BACKUP_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'DiplomaMate-Server'
    };
    const url = `${GITHUB_API_BASE_URL}/repos/${GITHUB_BACKUP_REPO}/contents/${GITHUB_BACKUP_PATH}`;
    for (let attempt = 0; attempt < 2; attempt++) {
      const getRes = await fetch(url, { headers });
      if (!getRes.ok) {
        console.error('[Store Backup] GitHub read failed:', getRes.status);
        return;
      }
      const current = (await getRes.json()) as { sha?: string };
      if (!current.sha) {
        console.error('[Store Backup] GitHub read returned no sha.');
        return;
      }
      const putRes = await fetch(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'chore: auto-backup academic store [skip ci]',
          content: Buffer.from(content, 'utf-8').toString('base64'),
          sha: current.sha,
          branch: GITHUB_BACKUP_BRANCH
        })
      });
      if (putRes.ok) {
        githubBackupLastContent = content;
        console.log('[Store Backup] academic-store.json backed up to GitHub.');
        return;
      }
      if (putRes.status === 409 && attempt === 0) {
        console.warn('[Store Backup] Conflict (file changed on GitHub), retrying with fresh sha.');
        continue;
      }
      console.error('[Store Backup] GitHub write failed:', putRes.status);
      return;
    }
  } catch (err) {
    console.error('[Store Backup] failed:', err);
  }
}

const academicStore: PersistentAcademicStore = loadAcademicStore();

// Seed the "last backed up" snapshot so the first backup only fires when
// the data actually changes after startup.
try {
  githubBackupLastContent = fs.readFileSync(ACADEMIC_STORE_FILE, 'utf-8');
} catch {
  // ignore — the next save will trigger a backup attempt instead
}

app.get('/api/teacher-contacts/access', (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    locked: academicStore.teacherContactAccessLocked
  });
});

app.put('/api/admin/settings/teacher-contact-access', requireSystemAdmin, (req: Request, res: Response) => {
  const locked = req.body?.locked;
  if (typeof locked !== 'boolean') {
    return res.status(400).json({ success: false, error: 'The locked setting must be a boolean.' });
  }

  const previousValue = academicStore.teacherContactAccessLocked;
  const previousAuditLogs = [...academicStore.adminAuditLogs];
  academicStore.teacherContactAccessLocked = locked;
  const admin = (req as any).adminSession as ServerSession;
  appendAdminAudit(
    admin,
    locked ? 'teacher_contact_access_locked' : 'teacher_contact_access_unlocked',
    'teacher_contacts',
    'Teacher Contact access'
  );

  try {
    saveAcademicStore(academicStore);
  } catch (error) {
    academicStore.teacherContactAccessLocked = previousValue;
    academicStore.adminAuditLogs = previousAuditLogs;
    console.error('Teacher Contact access setting update failed:', error);
    return res.status(500).json({ success: false, error: 'Could not save the Teacher Contact access setting.' });
  }

  return res.status(200).json({
    success: true,
    locked,
    message: locked ? 'Teacher Contact access is now locked.' : 'Teacher Contact access is now free.'
  });
});

function ensureStudentAccountForSession(body: Record<string, unknown>): { error?: string; status?: number; userId?: string } {
  const userId = String(body.userId || '').trim();
  const boardRoll = String(body.boardRoll || '').trim();
  const regNumber = String(body.regNumber || '').trim();
  if (!userId || !boardRoll || !regNumber) {
    return { error: 'Registered account ID, Board Roll, and Registration Number are required.', status: 400 };
  }
  if (deletedAccountIds.has(userId)) return { error: 'This account has been deactivated.', status: 403 };

  const byId = academicStore.students.find(student => student.id === userId);
  if (byId && (byId.boardRoll !== boardRoll || byId.regNumber !== regNumber)) {
    return { error: 'The account ID does not match the supplied roll and registration number.' };
  }
  const byRoll = academicStore.students.find(student => student.boardRoll === boardRoll);
  const byRegistration = academicStore.students.find(student => student.regNumber === regNumber);
  if ((byRoll || byRegistration) && (!byRoll || byRoll !== byRegistration)) {
    return { error: 'The supplied roll and registration number do not identify the same account.' };
  }
  const existing = byId || byRoll;
  if (!existing || existing.id !== userId || !existing.isRegisteredAccount) {
    return { error: 'A registered student account is required.', status: 401 };
  }
  if (deletedAccountIds.has(existing.id)) return { error: 'This account has been deactivated.', status: 403 };
  return { userId: existing.id };
}

app.post('/api/students/register', authRateLimiter, authIpRateLimiter, async (req: Request, res: Response) => {
  // Turnstile (only enforced when TURNSTILE_SECRET_KEY is configured).
  try {
    const turnstile = await enforceTurnstileIfConfigured(req);
    if (!turnstile.ok) {
      return res.status(403).json({ success: false, error: turnstile.error });
    }
  } catch {
    return res.status(503).json({ success: false, error: 'Security check is unavailable. Please try again.' });
  }

  const body = req.body || {};
  const name = String(body.name || '').trim();
  const boardRoll = String(body.boardRoll || '').trim();
  const regNumber = String(body.regNumber || '').trim();
  const pin = String(body.pin || '').trim();
  const semester = Number(body.semester);
  const role = body.accountType === 'class_captain' ? 'class_captain' : 'student';
  const section = String(body.section || 'A1');
  const college = resolveStrictCollege(String(body.college || ''));
  const department = resolveStrictTechnology(String(body.department || ''));

  if (!name || !boardRoll || !regNumber || !body.college || !body.department) {
    return res.status(400).json({ success: false, error: 'Name, roll, registration number, college, and department are required.' });
  }
  if (!isValidStudentPin(pin)) {
    return res.status(400).json({ success: false, error: 'Please choose a 4–6 digit PIN for your account. You will sign in with Board Roll + PIN.' });
  }
  if (!college || !department) {
    return res.status(400).json({ success: false, error: 'Select a valid canonical college and department.' });
  }
  if (!Number.isInteger(semester) || semester < 1 || semester > 8) {
    return res.status(400).json({ success: false, error: 'Semester must be between 1 and 8.' });
  }
  if (!['A1', 'A2', 'B1', 'B2'].includes(section)) {
    return res.status(400).json({ success: false, error: 'A valid section is required.' });
  }

  const existingByRoll = academicStore.students.find(student => student.boardRoll === boardRoll);
  const existingByReg = academicStore.students.find(student => student.regNumber === regNumber);
  if (existingByRoll || existingByReg) {
    if (!existingByRoll || existingByRoll !== existingByReg) {
      return res.status(409).json({ success: false, error: 'This roll or registration number is already associated with a different record.' });
    }
    if (existingByRoll.isRegisteredAccount) {
      return res.status(409).json({ success: false, error: 'An account with these credentials is already registered.' });
    }
    if (deletedAccountIds.has(existingByRoll.id)) {
      return res.status(403).json({ success: false, error: 'This account has been deactivated.' });
    }
    if (role === 'class_captain') {
      existingByRoll.accountType = 'class_captain';
      existingByRoll.captainVerificationStatus = 'Pending';
    } else if (role === 'student') {
      existingByRoll.accountType = 'student';
      existingByRoll.captainVerificationStatus = 'NotApplied';
    }
    existingByRoll.isRegisteredAccount = true;
    setStudentPin(existingByRoll, pin);
    saveAcademicStore(academicStore);
    return res.status(200).json({
      success: true,
      message: role === 'class_captain' ? 'Account created; captain approval is pending.' : 'Student account created.',
      account: sanitizeStudent(existingByRoll)
    });
  }

  const account: EnrolledStudent = {
    id: `std_${crypto.randomUUID()}`,
    name,
    email: String(body.email || '').trim(),
    classRoll: String(body.classRoll || boardRoll.slice(-2)),
    boardRoll,
    regNumber,
    college: college.name,
    department: department.name,
    semester,
    shift: body.shift === 'Day' ? 'Day' : 'Morning',
    section: section as EnrolledStudent['section'],
    phone: String(body.phone || '').trim(),
    accountType: role,
    captainVerificationStatus: role === 'class_captain' ? 'Pending' : 'NotApplied',
    attendanceRate: '',
    createdAt: new Date().toISOString(),
    isRegisteredAccount: true
  };
  setStudentPin(account, pin);
  academicStore.students.push(account);
  saveAcademicStore(academicStore);
  return res.status(201).json({
    success: true,
    message: role === 'class_captain' ? 'Account created; captain approval is pending.' : 'Student account created.',
    account: sanitizeStudent(account)
  });
});

/**
 * Helper: Check whether an authenticated teacher is verified and authorized to manage a specific class cohort.
 */
function checkTeacherCohortAuthorization(
  session: ServerSession | null,
  target: {
    college?: string;
    department?: string;
    semester?: number;
    shift?: string;
    section?: string;
  }
): {
  authorized: boolean;
  status: number;
  error?: string;
  teacher?: ServerTeacher;
} {
  if (!session) {
    return {
      authorized: false,
      status: 401,
      error: 'Authentication Required: Please sign in with an authorized Teacher account.'
    };
  }

  if (session.role !== 'teacher') {
    return {
      authorized: false,
      status: 403,
      error: `Forbidden: Role "${session.role}" is not authorized to perform teacher attendance or faculty management operations.`
    };
  }

  const teacher = serverTeachers.get(session.userId);
  if (!teacher) {
    return {
      authorized: false,
      status: 401,
      error: 'Unauthorized: Teacher account record not found on server.'
    };
  }

  if (teacher.verificationStatus !== 'Verified') {
    return {
      authorized: false,
      status: 403,
      error: `Forbidden: Faculty account "${teacher.name}" is currently "${teacher.verificationStatus}". Only verified teachers can manage attendance or class assignments.`
    };
  }

  if (target.college && !areCollegesEquivalent(teacher.college, target.college)) {
    return {
      authorized: false,
      status: 403,
      error: `Forbidden (College Scope): You are authorized for "${teacher.college}", not "${target.college}".`
    };
  }

  if (target.department && !areDepartmentsEquivalent(teacher.department, target.department)) {
    return {
      authorized: false,
      status: 403,
      error: `Forbidden (Department Scope): You are authorized for "${teacher.department}", not "${target.department}".`
    };
  }

  if (
    target.semester &&
    Array.isArray(teacher.semestersTaught) &&
    teacher.semestersTaught.length > 0 &&
    !teacher.semestersTaught.includes(Number(target.semester))
  ) {
    return {
      authorized: false,
      status: 403,
      error: `Forbidden (Semester Scope): You are assigned to Semesters [${teacher.semestersTaught.join(', ')}], not Semester ${target.semester}.`
    };
  }

  if (
    target.shift &&
    teacher.shift !== 'Both' &&
    teacher.shift.toLowerCase() !== String(target.shift).toLowerCase()
  ) {
    return {
      authorized: false,
      status: 403,
      error: `Forbidden (Shift Scope): You are assigned to ${teacher.shift} Shift, not ${target.shift} Shift.`
    };
  }

  return { authorized: true, status: 200, teacher };
}

/**
 * Helper: Filter enrolled students matching a specific cohort `(college, department, semester, shift, section)`
 */
function getCohortRoster(params: {
  college: string;
  department: string;
  semester: number;
  shift: string;
  section: string;
}): EnrolledStudent[] {
  const colId = normalizeCollege(params.college).id;
  const deptId = normalizeTechnology(params.department).id;
  const semNum = Number(params.semester);
  const shiftClean = params.shift === 'Day' ? 'Day' : 'Morning';
  const secClean = params.section || 'A1';

  return academicStore.students
    .filter(s => {
      const sColId = normalizeCollege(s.college).id;
      const sDeptId = normalizeTechnology(s.department).id;
      return (
        sColId === colId &&
        sDeptId === deptId &&
        Number(s.semester) === semNum &&
        s.shift === shiftClean &&
        s.section === secClean
      );
    })
    .sort((a, b) => {
      const crA = parseInt(a.classRoll, 10) || 999;
      const crB = parseInt(b.classRoll, 10) || 999;
      if (crA !== crB) return crA - crB;
      return a.boardRoll.localeCompare(b.boardRoll);
    });
}

/**
 * 10A. UPDATE TEACHER PROFILE SCOPE ON SERVER (`PUT /api/teachers/profile`)
 */
app.put('/api/teachers/profile', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session || session.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only authenticated teachers can update their faculty profile.'
      });
    }

    const teacher = serverTeachers.get(session.userId);
    if (!teacher) {
      return res.status(404).json({ success: false, error: 'Teacher record not found.' });
    }

    const {
      name,
      college,
      department,
      designation,
      teachingSubjects,
      semestersTaught,
      shift,
      sectionsTaught
    } = req.body;

    if (name) teacher.name = String(name).trim();
    if (college) {
      teacher.college = String(college).trim();
      session.college = teacher.college;
    }
    if (department) {
      teacher.department = String(department).trim();
      session.department = teacher.department;
    }
    if (designation) teacher.designation = String(designation).trim();
    if (Array.isArray(teachingSubjects) && teachingSubjects.length > 0) {
      teacher.teachingSubjects = teachingSubjects.map(String);
    }
    if (Array.isArray(semestersTaught) && semestersTaught.length > 0) {
      teacher.semestersTaught = semestersTaught.map(Number);
    }
    if (shift && ['Morning', 'Day', 'Both'].includes(String(shift))) {
      teacher.shift = shift as 'Morning' | 'Day' | 'Both';
    }
    if (Array.isArray(sectionsTaught)) {
      teacher.sectionsTaught = sectionsTaught.map(String);
    }

    saveAcademicStore(academicStore);
    return res.status(200).json({
      success: true,
      message: 'Teacher profile and authorized scope updated on server.',
      teacher: sanitizeTeacher(teacher)
    });
  } catch (error) {
    console.error('Update teacher profile error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update teacher profile.' });
  }
});

/**
 * 10B. GET STUDENT ROSTER FOR SELECTED CLASS (`GET /api/roster`)
 * Protected: Only authorized Teachers (or System Admins) can load the confidential student roster.
 */
app.get('/api/roster', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    const college = String(req.query.college || 'Dhaka Polytechnic Institute').trim();
    const department = String(req.query.department || 'Computer Science and Technology (CST)').trim();
    const semester = Number(req.query.semester) || 6;
    const shift = String(req.query.shift || 'Morning').trim();
    const section = String(req.query.section || 'A1').trim();

    if (!session || (session.role !== 'teacher' && session.role !== 'system_admin')) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only authenticated teachers can access the student attendance roster.'
      });
    }

    if (session.role === 'teacher') {
      const authCheck = checkTeacherCohortAuthorization(session, {
        college,
        department,
        semester,
        shift,
        section
      });
      if (!authCheck.authorized) {
        return res.status(authCheck.status).json({
          success: false,
          error: authCheck.error
        });
      }
    }

    const roster = getCohortRoster({ college, department, semester, shift, section });
    return res.status(200).json({
      success: true,
      cohort: {
        college: normalizeCollege(college).name,
        collegeId: normalizeCollege(college).id,
        department: normalizeTechnology(department).name,
        departmentId: normalizeTechnology(department).id,
        semester,
        shift,
        section
      },
      students: roster.map(student => sanitizeStudent(student))
    });
  } catch (error) {
    console.error('Get roster error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load class student roster.' });
  }
});

/**
 * Helper: Parse raw text lines into OCR student candidates and cross-reference existing cohort roster
 */
function parseRosterLinesToCandidates(
  rawLines: Array<{ name?: string; boardRoll?: string; classRoll?: string; regNumber?: string; confidence?: string }>,
  existingCohortRoster: EnrolledStudent[]
): OcrExtractedStudentCandidate[] {
  const existingByBoardRoll = new Map<string, EnrolledStudent>();
  const existingByRegNumber = new Map<string, EnrolledStudent>();
  for (const st of existingCohortRoster) {
    if (st.boardRoll) existingByBoardRoll.set(st.boardRoll.trim(), st);
    if (st.regNumber) existingByRegNumber.set(st.regNumber.trim(), st);
  }

  const seenRollsInFile = new Set<string>();
  const candidates: OcrExtractedStudentCandidate[] = [];

  rawLines.forEach((item, idx) => {
    const cleanName = String(item.name || '').replace(/\s+/g, ' ').trim();
    const cleanBoardRoll = String(item.boardRoll || '').replace(/[^\d]/g, '').trim();
    const cleanClassRoll = String(item.classRoll || '').replace(/[^\d]/g, '').trim() || String(idx + 1).padStart(2, '0');
    const cleanReg = String(item.regNumber || '').replace(/[^\d]/g, '').trim();

    if (!cleanName || cleanName.length < 2 || !cleanBoardRoll || cleanBoardRoll.length < 4) {
      candidates.push({
        tempId: `ocr_cand_${Date.now()}_${idx}`,
        name: cleanName,
        boardRoll: cleanBoardRoll,
        classRoll: cleanClassRoll,
        regNumber: cleanReg,
        confidence: 'uncertain',
        matchStatus: 'invalid_missing_fields',
        warning: !cleanName
          ? 'Missing student name — please type the student name or remove this row.'
          : 'Missing or invalid Board Roll (4-8 digits required) — please correct before importing.'
      });
      return;
    }

    if (seenRollsInFile.has(cleanBoardRoll)) {
      candidates.push({
        tempId: `ocr_cand_${Date.now()}_${idx}`,
        name: cleanName,
        boardRoll: cleanBoardRoll,
        classRoll: cleanClassRoll,
        regNumber: cleanReg,
        confidence: 'medium',
        matchStatus: 'duplicate_in_file',
        warning: `Duplicate Board Roll ${cleanBoardRoll} detected within the uploaded file.`
      });
      return;
    }

    seenRollsInFile.add(cleanBoardRoll);

    const matchedExisting =
      existingByBoardRoll.get(cleanBoardRoll) ||
      (cleanReg ? existingByRegNumber.get(cleanReg) : undefined);

    if (matchedExisting) {
      candidates.push({
        tempId: `ocr_cand_${Date.now()}_${idx}`,
        name: matchedExisting.name,
        boardRoll: matchedExisting.boardRoll,
        classRoll: matchedExisting.classRoll || cleanClassRoll,
        regNumber: matchedExisting.regNumber || cleanReg,
        confidence: 'high',
        matchedStudentId: matchedExisting.id,
        matchStatus: 'matched_existing',
        warning:
          matchedExisting.name.toLowerCase() !== cleanName.toLowerCase()
            ? `Matched existing student "${matchedExisting.name}" by Board Roll ${cleanBoardRoll} (existing profile preserved).`
            : undefined
      });
    } else {
      candidates.push({
        tempId: `ocr_cand_${Date.now()}_${idx}`,
        name: cleanName,
        boardRoll: cleanBoardRoll,
        classRoll: cleanClassRoll,
        regNumber: cleanReg || `1502${cleanBoardRoll}`,
        confidence: (item.confidence === 'uncertain' ? 'uncertain' : 'high') as 'high' | 'medium' | 'uncertain',
        matchStatus: 'new_student'
      });
    }
  });

  return candidates;
}

/**
 * Deterministic text parser for student lists extracted from PDFs/Images/Text
 * Supports formats like:
 * - "01 | Nusrat Jahan | 542880 | 1502187320"
 * - "1. Tanvir Ahmed - 542891 (1502187342)"
 * - "542880 Nusrat Jahan"
 * - CSV rows: "classRoll,name,boardRoll,regNumber"
 */
function extractStudentRowsFromText(text: string): Array<{
  name: string;
  boardRoll: string;
  classRoll: string;
  regNumber: string;
  confidence: string;
}> {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0 && !/^(sl|serial|class\s*roll|roll\s*no|student\s*name|board\s*roll)/i.test(l));

  const extracted: Array<{
    name: string;
    boardRoll: string;
    classRoll: string;
    regNumber: string;
    confidence: string;
  }> = [];

  lines.forEach((line, index) => {
    // Pattern 1: Pipe or comma or tab separated with 3+ columns
    if (line.includes('|') || line.includes('\t') || (line.split(',').length >= 2)) {
      const parts = line
        .split(/[|\t,]/)
        .map(p => p.trim())
        .filter(Boolean);

      const sixDigitRolls = parts.filter(p => /^\d{5,8}$/.test(p));
      const tenDigitRegs = parts.filter(p => /^\d{9,12}$/.test(p));
      const shortClassRolls = parts.filter(p => /^\d{1,3}$/.test(p));
      const namePart = parts.find(p => /[a-zA-Z]{2,}/.test(p) && !/^\d+$/.test(p));

      if (namePart || sixDigitRolls.length > 0) {
        extracted.push({
          classRoll: shortClassRolls[0] ? shortClassRolls[0].padStart(2, '0') : String(index + 1).padStart(2, '0'),
          name: namePart ? namePart.replace(/^[\d.\-)\s]+/, '').trim() : '',
          boardRoll: sixDigitRolls[0] || '',
          regNumber: tenDigitRegs[0] || sixDigitRolls[1] || '',
          confidence: namePart && sixDigitRolls[0] ? 'high' : 'uncertain'
        });
        return;
      }
    }

    // Pattern 2: Free-form line containing a 5-8 digit board roll and a student name
    const numbers = line.match(/\b\d+\b/g) || [];
    const boardRoll = numbers.find(n => n.length >= 5 && n.length <= 8) || '';
    const regNumber = numbers.find(n => n.length >= 9 && n.length <= 12 && n !== boardRoll) || '';
    const classRoll = numbers.find(n => n.length <= 3 && n !== boardRoll) || String(index + 1).padStart(2, '0');

    const cleanedName = line
      .replace(/\b\d+\b/g, ' ')
      .replace(/[()[\]{}|,\-:;#._/]/g, ' ')
      .replace(/\b(roll|reg|no|id|student|name|present|absent)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (boardRoll || cleanedName.length >= 3) {
      extracted.push({
        classRoll: String(classRoll).padStart(2, '0'),
        name: cleanedName,
        boardRoll,
        regNumber,
        confidence: cleanedName.length >= 3 && boardRoll.length >= 5 ? 'high' : 'uncertain'
      });
    }
  });

  return extracted;
}

/**
 * 10C. UPLOAD STUDENT ROSTER IMAGE / PDF FOR OCR EXTRACTION & PREVIEW (`POST /api/attendance/roster-ocr`)
 * - Never automatically marks any student Present
 * - Matches against existing cohort students by Board Roll / Registration Number
 * - Flags duplicates and uncertain/incomplete records for teacher review
 */
app.post('/api/attendance/roster-ocr', requireAuth, aiRateLimiter, async (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    const {
      college = 'Dhaka Polytechnic Institute',
      department = 'Computer Science and Technology (CST)',
      semester = 6,
      shift = 'Morning',
      section = 'A1',
      fileName = '',
      mimeType = '',
      fileDataUrl = '',
      rawText = ''
    } = req.body;

    const authCheck = checkTeacherCohortAuthorization(session, {
      college,
      department,
      semester: Number(semester),
      shift,
      section
    });
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({
        success: false,
        error: authCheck.error
      });
    }

    const existingRoster = getCohortRoster({
      college,
      department,
      semester: Number(semester),
      shift,
      section
    });

    let extractedRows: Array<{
      name: string;
      boardRoll: string;
      classRoll: string;
      regNumber: string;
      confidence: string;
    }> = [];
    let extractionMethod = 'text_parser';

    // 1. If teacher pasted or uploaded plain text / CSV directly
    if (rawText && String(rawText).trim().length > 0) {
      extractedRows = extractStudentRowsFromText(String(rawText));
      extractionMethod = 'direct_text_extraction';
    } else if (fileDataUrl && String(fileDataUrl).trim().length > 0) {
      const base64Data = String(fileDataUrl).includes('base64,')
        ? String(fileDataUrl).split('base64,')[1]
        : String(fileDataUrl);

      let buf: Buffer;
      try {
        buf = Buffer.from(base64Data, 'base64');
      } catch {
        return res.status(422).json({
          success: false,
          error: 'The uploaded file is corrupted or not a valid base64-encoded image/PDF.'
        });
      }

      if (buf.length < 16) {
        return res.status(422).json({
          success: false,
          error: 'The uploaded file appears to be empty or unreadable. Please upload a clear roster image/PDF or edit rows manually.'
        });
      }

      const detectedMime =
        mimeType ||
        (String(fileDataUrl).startsWith('data:application/pdf') || String(fileName).toLowerCase().endsWith('.pdf')
          ? 'application/pdf'
          : 'image/png');

      // Use shared PDF stream decompressor & image embedded text extractor first
      let candidateText = '';
      if (detectedMime === 'application/pdf' || buf.slice(0, 5).toString('ascii') === '%PDF-') {
        const pdfParsed = extractPdfContentInBatches(buf);
        candidateText = pdfParsed.combinedText || pdfParsed.embeddedOcrTextHint || '';
      } else {
        candidateText = extractEmbeddedTextFromImageBuffer(buf, detectedMime);
      }
      if (!candidateText) {
        candidateText = buf.toString('utf-8');
      }

      const asciiRows = extractStudentRowsFromText(candidateText).filter(
        r => r.boardRoll.length >= 5 && r.name.length >= 3 && !/obj|endobj|stream|endstream|xref/i.test(r.name)
      );

      if (asciiRows.length > 0) {
        extractedRows = asciiRows;
        extractionMethod = 'embedded_document_text';
      } else if (process.env.GEMINI_API_KEY) {
        // Call Gemini 3.8 Flash Vision OCR
        try {
          const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            httpOptions: {
              headers: { 'User-Agent': 'aistudio-build' }
            }
          });

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: detectedMime
                    }
                  },
                  {
                    text: `Extract the student roster from this polytechnic class sheet image or PDF.
Do NOT invent students if the image is completely blank or unreadable.
For each student row visible, extract:
- classRoll (2-digit roll e.g. "01")
- name (student full name)
- boardRoll (5 to 8 digit BTEB board roll number)
- regNumber (registration number if visible, otherwise empty string)
- confidence ("high", "medium", or "uncertain")`
                  }
                ]
              }
            ],
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  isReadable: { type: Type.BOOLEAN },
                  unreadableReason: { type: Type.STRING },
                  students: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        classRoll: { type: Type.STRING },
                        name: { type: Type.STRING },
                        boardRoll: { type: Type.STRING },
                        regNumber: { type: Type.STRING },
                        confidence: { type: Type.STRING }
                      }
                    }
                  }
                }
              }
            }
          });

          const parsedJson = JSON.parse(response.text?.trim() || '{}');
          if (parsedJson.isReadable === false && (!parsedJson.students || parsedJson.students.length === 0)) {
            return res.status(422).json({
              success: false,
              error:
                parsedJson.unreadableReason ||
                'The uploaded image or PDF could not be read clearly. Please upload a clearer scan or enter/correct the student list manually.'
            });
          }
          if (Array.isArray(parsedJson.students) && parsedJson.students.length > 0) {
            extractedRows = parsedJson.students;
            extractionMethod = 'gemini_vision_ocr';
          }
        } catch (ocrErr) {
          console.warn('[Roster OCR] Gemini OCR fallback triggered:', ocrErr);
        }
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please upload a student roster image/PDF or provide roster text to extract.'
      });
    }

    if (extractedRows.length === 0) {
      return res.status(422).json({
        success: false,
        error:
          'No readable student names or BTEB Board Roll numbers could be detected in this file. If the document is a low-resolution scan, please paste the roll list text or add/correct rows manually in the editor.'
      });
    }

    const candidates = parseRosterLinesToCandidates(extractedRows, existingRoster);

    return res.status(200).json({
      success: true,
      method: extractionMethod,
      candidates,
      summary: {
        totalDetected: candidates.length,
        matchedExistingCount: candidates.filter(c => c.matchStatus === 'matched_existing').length,
        newStudentCount: candidates.filter(c => c.matchStatus === 'new_student').length,
        duplicateInFileCount: candidates.filter(c => c.matchStatus === 'duplicate_in_file').length,
        uncertainOrInvalidCount: candidates.filter(
          c => c.matchStatus === 'invalid_missing_fields' || c.confidence === 'uncertain'
        ).length
      },
      notice:
        'Roster extraction complete. Review and edit any uncertain names or roll numbers below. Adding these students to the attendance sheet will initialize their status as Not Marked (never automatically Present).'
    });
  } catch (error) {
    console.error('Roster OCR error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process student roster file.'
    });
  }
});

/**
 * 10D. CONFIRM & MERGE EXTRACTED ROSTER STUDENTS INTO CLASS ROSTER (`POST /api/attendance/roster/merge`)
 * - Matches existing students by Board Roll or ID without creating duplicates or overwriting profiles
 * - Adds verified new students to the cohort roster
 * - Returns the updated cohort roster and newly initialized `not_marked` attendance entries
 */
app.post('/api/attendance/roster/merge', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    const {
      college = 'Dhaka Polytechnic Institute',
      department = 'Computer Science and Technology (CST)',
      semester = 6,
      shift = 'Morning',
      section = 'A1',
      students = []
    } = req.body;

    const authCheck = checkTeacherCohortAuthorization(session, {
      college,
      department,
      semester: Number(semester),
      shift,
      section
    });
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({
        success: false,
        error: authCheck.error
      });
    }

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No student records provided to merge into the roster.'
      });
    }

    const canonicalCollege = normalizeCollege(college);
    const canonicalDept = normalizeTechnology(department);
    const semNum = Number(semester) as SemesterNumber;
    const shiftClean: Shift = shift === 'Day' ? 'Day' : 'Morning';
    const sectionClean: Section = (['A1', 'A2', 'B1', 'B2'].includes(String(section)) ? String(section) : 'A1') as Section;

    let matchedCount = 0;
    let addedNewCount = 0;
    let skippedDuplicateCount = 0;
    const seenRollsInBatch = new Set<string>();
    const resolvedStudentsForSheet: EnrolledStudent[] = [];

    for (let i = 0; i < students.length; i++) {
      const item = students[i];
      const cleanName = String(item.name || '').trim();
      const cleanBoardRoll = String(item.boardRoll || '').replace(/[^\d]/g, '').trim();
      const cleanClassRoll = String(item.classRoll || '').replace(/[^\d]/g, '').trim() || String(i + 1).padStart(2, '0');
      const cleanReg = String(item.regNumber || '').replace(/[^\d]/g, '').trim() || `1502${cleanBoardRoll}`;

      if (!cleanName || !cleanBoardRoll || cleanBoardRoll.length < 4) {
        return res.status(400).json({
          success: false,
          error: `Row ${i + 1} is missing a valid student name or Board Roll number (4-8 digits). Please correct or remove incomplete rows before confirming.`
        });
      }

      if (seenRollsInBatch.has(cleanBoardRoll)) {
        skippedDuplicateCount += 1;
        continue;
      }
      seenRollsInBatch.add(cleanBoardRoll);

      // Check if student already exists globally by boardRoll or id
      const existingStudent = academicStore.students.find(
        s => s.boardRoll === cleanBoardRoll || (item.matchedStudentId && s.id === item.matchedStudentId)
      );

      if (existingStudent) {
        // Preserve existing student profile without overwriting or duplicating!
        matchedCount += 1;
        resolvedStudentsForSheet.push(existingStudent);
      } else {
        const newStudent: EnrolledStudent = {
          id: `std_ocr_${cleanBoardRoll}_${Date.now()}_${i}`,
          name: cleanName,
          classRoll: cleanClassRoll,
          boardRoll: cleanBoardRoll,
          regNumber: cleanReg,
          college: canonicalCollege.name,
          department: canonicalDept.name,
          semester: semNum,
          shift: shiftClean,
          section: sectionClean,
          phone: 'N/A',
          accountType: 'student',
          captainVerificationStatus: 'NotApplied',
          attendanceRate: 'N/A'
        };
        academicStore.students.push(newStudent);
        addedNewCount += 1;
        resolvedStudentsForSheet.push(newStudent);
      }
    }

    saveAcademicStore(academicStore);

    const updatedRoster = getCohortRoster({
      college: canonicalCollege.name,
      department: canonicalDept.name,
      semester: semNum,
      shift: shiftClean,
      section: sectionClean
    });

    return res.status(200).json({
      success: true,
      message: `Roster updated: ${addedNewCount} new student(s) added, ${matchedCount} existing student(s) matched (${skippedDuplicateCount} duplicate(s) skipped). All entries remain Not Marked until you record attendance.`,
      addedNewCount,
      matchedCount,
      skippedDuplicateCount,
      roster: updatedRoster,
      importedStudents: resolvedStudentsForSheet
    });
  } catch (error) {
    console.error('Roster merge error:', error);
    return res.status(500).json({ success: false, error: 'Failed to merge student roster.' });
  }
});

/**
 * 10E. GET ATTENDANCE SHEETS FOR COHORT / DATE (`GET /api/attendance/sheets`)
 */
app.get('/api/attendance/sheets', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    const college = String(req.query.college || 'Dhaka Polytechnic Institute').trim();
    const department = String(req.query.department || 'Computer Science and Technology (CST)').trim();
    const semester = Number(req.query.semester) || 6;
    const shift = String(req.query.shift || 'Morning').trim();
    const section = String(req.query.section || 'A1').trim();
    const date = req.query.date ? String(req.query.date).trim() : '';
    const subjectCode = req.query.subjectCode ? String(req.query.subjectCode).trim() : '';
    const periodLabel = req.query.periodLabel ? String(req.query.periodLabel).trim() : '';

    const authCheck = checkTeacherCohortAuthorization(session, {
      college,
      department,
      semester,
      shift,
      section
    });
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({
        success: false,
        error: authCheck.error
      });
    }

    const colId = normalizeCollege(college).id;
    const deptId = normalizeTechnology(department).id;

    const sheets = academicStore.attendanceSheets
      .filter(sh => {
        if (sh.collegeId !== colId || sh.departmentId !== deptId) return false;
        if (sh.semester !== semester) return false;
        if (sh.shift !== shift) return false;
        if (sh.section !== section) return false;
        if (date && sh.date !== date) return false;
        if (subjectCode && subjectCode !== 'all' && sh.subjectCode !== subjectCode) return false;
        if (periodLabel && periodLabel !== 'all' && sh.periodLabel !== periodLabel) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));

    return res.status(200).json({
      success: true,
      sheets
    });
  } catch (error) {
    console.error('Get attendance sheets error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load attendance sheets.' });
  }
});

/**
 * 10F. CREATE OR SAVE DAILY ATTENDANCE SHEET (`POST /api/attendance/sheets`)
 * - Prevents accidental duplicate sheets for the same (class, date, subject, period) unless `allowUpdate: true`
 * - Enforces explicit statuses (`present`, `absent`, `not_marked`)
 * - Never silently converts `not_marked` to Present or Absent
 */
app.post('/api/attendance/sheets', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    const {
      college,
      department,
      semester,
      shift,
      section,
      date,
      subjectCode,
      subjectName,
      periodLabel = 'Period 1 (08:00 AM - 08:45 AM)',
      entries = [],
      allowUpdate = false
    } = req.body;

    if (!college || !department || !semester || !shift || !section || !date || !subjectCode) {
      return res.status(400).json({
        success: false,
        error: 'College, department, semester, shift, section, date, and subject are required to save an attendance sheet.'
      });
    }

    const authCheck = checkTeacherCohortAuthorization(session, {
      college,
      department,
      semester: Number(semester),
      shift,
      section
    });
    if (!authCheck.authorized || !authCheck.teacher) {
      return res.status(authCheck.status).json({
        success: false,
        error: authCheck.error
      });
    }

    const canonicalCollege = normalizeCollege(college);
    const canonicalDept = normalizeTechnology(department);
    const semNum = Number(semester) as SemesterNumber;
    const shiftClean: Shift = shift === 'Day' ? 'Day' : 'Morning';
    const sectionClean: Section = (['A1', 'A2', 'B1', 'B2'].includes(String(section)) ? String(section) : 'A1') as Section;
    const dateClean = String(date).trim();
    const subjCodeClean = String(subjectCode).trim();
    const subjNameClean = String(subjectName || subjCodeClean).trim();
    const periodClean = String(periodLabel || 'Period 1').trim();

    // Check for duplicate attendance sheet for the same class, date, subject, and period
    const existingIdx = academicStore.attendanceSheets.findIndex(
      sh =>
        sh.collegeId === canonicalCollege.id &&
        sh.departmentId === canonicalDept.id &&
        sh.semester === semNum &&
        sh.shift === shiftClean &&
        sh.section === sectionClean &&
        sh.date === dateClean &&
        sh.subjectCode === subjCodeClean &&
        sh.periodLabel.toLowerCase() === periodClean.toLowerCase()
    );

    if (existingIdx >= 0 && !allowUpdate) {
      return res.status(409).json({
        success: false,
        error: `Duplicate Attendance Sheet Prevented: An attendance sheet already exists for ${canonicalDept.shortCode} Sem ${semNum} (${shiftClean} · Sec ${sectionClean}) on ${dateClean} for ${subjNameClean} [${periodClean}]. Load the existing sheet to review or update it.`,
        existingSheet: academicStore.attendanceSheets[existingIdx]
      });
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Attendance sheet must contain at least one student row.'
      });
    }

    const nowIso = new Date().toISOString();
    const sanitizedEntries: AttendanceRecordEntry[] = entries.map((e: any, idx: number) => {
      const rawStatus = String(e.status || 'not_marked').toLowerCase();
      const validStatus: AttendanceStatus =
        rawStatus === 'present' ? 'present' : rawStatus === 'absent' ? 'absent' : 'not_marked';
      return {
        studentId: String(e.studentId || `std_${idx}`),
        studentName: String(e.studentName || 'Student').trim(),
        boardRoll: String(e.boardRoll || '').trim(),
        classRoll: String(e.classRoll || String(idx + 1).padStart(2, '0')).trim(),
        regNumber: String(e.regNumber || '').trim(),
        status: validStatus,
        remarks: e.remarks ? String(e.remarks).trim() : undefined,
        updatedAt: nowIso
      };
    });

    const presentCount = sanitizedEntries.filter(e => e.status === 'present').length;
    const absentCount = sanitizedEntries.filter(e => e.status === 'absent').length;
    const notMarkedCount = sanitizedEntries.filter(e => e.status === 'not_marked').length;

    if (existingIdx >= 0 && allowUpdate) {
      const existing = academicStore.attendanceSheets[existingIdx];
      const auditEntry: AttendanceAuditEntry = {
        action: 'updated',
        performedBy: authCheck.teacher.name,
        performedById: authCheck.teacher.id,
        performedByRole: 'teacher',
        timestamp: nowIso,
        summary: `Updated attendance (${presentCount} Present, ${absentCount} Absent, ${notMarkedCount} Not Marked)`
      };
      const updatedSheet: AttendanceSheet = {
        ...existing,
        entries: sanitizedEntries,
        updatedAt: nowIso,
        auditTrail: [auditEntry, ...(existing.auditTrail || [])]
      };
      academicStore.attendanceSheets[existingIdx] = updatedSheet;
      saveAcademicStore(academicStore);

      return res.status(200).json({
        success: true,
        message: `Attendance sheet updated for ${dateClean} (${presentCount} Present, ${absentCount} Absent, ${notMarkedCount} Not Marked).`,
        sheet: updatedSheet
      });
    }

    const newSheet: AttendanceSheet = {
      id: `att_${dateClean.replace(/-/g, '')}_${subjCodeClean}_${Date.now()}`,
      college: canonicalCollege.name,
      collegeId: canonicalCollege.id,
      department: canonicalDept.name,
      departmentId: canonicalDept.id,
      semester: semNum,
      shift: shiftClean,
      section: sectionClean,
      date: dateClean,
      subjectCode: subjCodeClean,
      subjectName: subjNameClean,
      periodLabel: periodClean,
      teacherId: authCheck.teacher.id,
      teacherName: authCheck.teacher.name,
      entries: sanitizedEntries,
      createdAt: nowIso,
      updatedAt: nowIso,
      auditTrail: [
        {
          action: 'created',
          performedBy: authCheck.teacher.name,
          performedById: authCheck.teacher.id,
          performedByRole: 'teacher',
          timestamp: nowIso,
          summary: `Created attendance sheet (${presentCount} Present, ${absentCount} Absent, ${notMarkedCount} Not Marked)`
        }
      ]
    };

    academicStore.attendanceSheets.push(newSheet);
    saveAcademicStore(academicStore);

    return res.status(201).json({
      success: true,
      message: `Attendance sheet saved for ${dateClean} (${presentCount} Present, ${absentCount} Absent, ${notMarkedCount} Not Marked).`,
      sheet: newSheet
    });
  } catch (error) {
    console.error('Save attendance sheet error:', error);
    return res.status(500).json({ success: false, error: 'Failed to save attendance sheet.' });
  }
});

/**
 * 10G. UPDATE EXISTING ATTENDANCE SHEET BY ID (`PUT /api/attendance/sheets/:id`)
 */
app.put('/api/attendance/sheets/:id', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    const { id } = req.params;
    const { entries, periodLabel, subjectCode, subjectName } = req.body;

    const existingIdx = academicStore.attendanceSheets.findIndex(sh => sh.id === id);
    if (existingIdx < 0) {
      return res.status(404).json({ success: false, error: 'Attendance sheet not found.' });
    }

    const existing = academicStore.attendanceSheets[existingIdx];
    const authCheck = checkTeacherCohortAuthorization(session, {
      college: existing.college,
      department: existing.department,
      semester: existing.semester,
      shift: existing.shift,
      section: existing.section
    });
    if (!authCheck.authorized || !authCheck.teacher) {
      return res.status(authCheck.status).json({
        success: false,
        error: authCheck.error
      });
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Updated attendance sheet must contain student entries.'
      });
    }

    const nowIso = new Date().toISOString();
    const sanitizedEntries: AttendanceRecordEntry[] = entries.map((e: any, idx: number) => {
      const rawStatus = String(e.status || 'not_marked').toLowerCase();
      const validStatus: AttendanceStatus =
        rawStatus === 'present' ? 'present' : rawStatus === 'absent' ? 'absent' : 'not_marked';
      return {
        studentId: String(e.studentId || `std_${idx}`),
        studentName: String(e.studentName || 'Student').trim(),
        boardRoll: String(e.boardRoll || '').trim(),
        classRoll: String(e.classRoll || String(idx + 1).padStart(2, '0')).trim(),
        regNumber: String(e.regNumber || '').trim(),
        status: validStatus,
        remarks: e.remarks ? String(e.remarks).trim() : undefined,
        updatedAt: nowIso
      };
    });

    const presentCount = sanitizedEntries.filter(e => e.status === 'present').length;
    const absentCount = sanitizedEntries.filter(e => e.status === 'absent').length;
    const notMarkedCount = sanitizedEntries.filter(e => e.status === 'not_marked').length;

    const auditEntry: AttendanceAuditEntry = {
      action: 'updated',
      performedBy: authCheck.teacher.name,
      performedById: authCheck.teacher.id,
      performedByRole: 'teacher',
      timestamp: nowIso,
      summary: `Updated attendance (${presentCount} Present, ${absentCount} Absent, ${notMarkedCount} Not Marked)`
    };

    const updatedSheet: AttendanceSheet = {
      ...existing,
      subjectCode: subjectCode ? String(subjectCode).trim() : existing.subjectCode,
      subjectName: subjectName ? String(subjectName).trim() : existing.subjectName,
      periodLabel: periodLabel ? String(periodLabel).trim() : existing.periodLabel,
      entries: sanitizedEntries,
      updatedAt: nowIso,
      auditTrail: [auditEntry, ...(existing.auditTrail || [])]
    };

    academicStore.attendanceSheets[existingIdx] = updatedSheet;
    saveAcademicStore(academicStore);

    return res.status(200).json({
      success: true,
      message: `Attendance sheet updated (${presentCount} Present, ${absentCount} Absent, ${notMarkedCount} Not Marked).`,
      sheet: updatedSheet
    });
  } catch (error) {
    console.error('Update attendance sheet error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update attendance sheet.' });
  }
});

/**
 * 10H. DELETE ATTENDANCE SHEET (`DELETE /api/attendance/sheets/:id`)
 */
app.delete('/api/attendance/sheets/:id', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    const { id } = req.params;

    const existing = academicStore.attendanceSheets.find(sh => sh.id === id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Attendance sheet not found.' });
    }

    const authCheck = checkTeacherCohortAuthorization(session, {
      college: existing.college,
      department: existing.department,
      semester: existing.semester,
      shift: existing.shift,
      section: existing.section
    });
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({
        success: false,
        error: authCheck.error
      });
    }

    academicStore.attendanceSheets = academicStore.attendanceSheets.filter(sh => sh.id !== id);
    saveAcademicStore(academicStore);

    return res.status(200).json({
      success: true,
      message: `Deleted attendance sheet for ${existing.date} (${existing.subjectName}).`
    });
  } catch (error) {
    console.error('Delete attendance sheet error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete attendance sheet.' });
  }
});

/**
 * 10I. MONTHLY ATTENDANCE MATRIX & SUMMARY ANALYTICS (`GET /api/attendance/monthly`)
 * - Computes student × calendar-date matrix for the selected month and year
 * - Distinguishes Fridays/holidays (`holiday`), dates with no recorded sheet (`no_session`),
 *   and recorded session statuses (`present`, `absent`, `not_marked`)
 * - Calculates percentages ONLY from applicable recorded class sessions (never counting unmarked students as Present
 *   and never counting non-class days / holidays as absences)
 */
app.get('/api/attendance/monthly', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    const college = String(req.query.college || 'Dhaka Polytechnic Institute').trim();
    const department = String(req.query.department || 'Computer Science and Technology (CST)').trim();
    const semester = Number(req.query.semester) || 6;
    const shift = String(req.query.shift || 'Morning').trim();
    const section = String(req.query.section || 'A1').trim();
    const year = Number(req.query.year) || 2026;
    const month = Number(req.query.month) || 10; // 1..12
    const subjectCode = req.query.subjectCode ? String(req.query.subjectCode).trim() : 'all';

    const authCheck = checkTeacherCohortAuthorization(session, {
      college,
      department,
      semester,
      shift,
      section
    });
    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({
        success: false,
        error: authCheck.error
      });
    }

    const canonicalCollege = normalizeCollege(college);
    const canonicalDept = normalizeTechnology(department);
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const daysInMonth = new Date(year, month, 0).getDate();

    // Filter sheets recorded in this month for this cohort (and optional subject filter)
    const monthlySheets = academicStore.attendanceSheets
      .filter(sh => {
        if (sh.collegeId !== canonicalCollege.id || sh.departmentId !== canonicalDept.id) return false;
        if (sh.semester !== semester) return false;
        if (sh.shift !== shift) return false;
        if (sh.section !== section) return false;
        if (!sh.date.startsWith(monthPrefix)) return false;
        if (subjectCode && subjectCode !== 'all' && sh.subjectCode !== subjectCode) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

    // Build calendar days list
    const calendarDays: Array<{
      date: string;
      dayOfMonth: number;
      weekdayShort: string;
      isWeeklyOff: boolean;
      recordedSheetsCount: number;
    }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthPrefix}-${String(d).padStart(2, '0')}`;
      const dt = new Date(Date.UTC(year, month - 1, d));
      const dayOfWeek = dt.getUTCDay(); // 5 = Friday (Weekly holiday in Bangladesh polytechnics)
      const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const sheetsOnDate = monthlySheets.filter(sh => sh.date === dateStr);
      calendarDays.push({
        date: dateStr,
        dayOfMonth: d,
        weekdayShort: weekdayNames[dayOfWeek],
        isWeeklyOff: dayOfWeek === 5,
        recordedSheetsCount: sheetsOnDate.length
      });
    }

    // Collect union of cohort roster + any student appearing in monthlySheets
    const roster = getCohortRoster({ college, department, semester, shift, section });
    const studentMap = new Map<string, { id: string; name: string; boardRoll: string; classRoll: string; regNumber: string }>();
    for (const s of roster) {
      studentMap.set(s.boardRoll, {
        id: s.id,
        name: s.name,
        boardRoll: s.boardRoll,
        classRoll: s.classRoll,
        regNumber: s.regNumber
      });
    }
    for (const sh of monthlySheets) {
      for (const entry of sh.entries) {
        if (entry.boardRoll && !studentMap.has(entry.boardRoll)) {
          studentMap.set(entry.boardRoll, {
            id: entry.studentId,
            name: entry.studentName,
            boardRoll: entry.boardRoll,
            classRoll: entry.classRoll,
            regNumber: entry.regNumber
          });
        }
      }
    }

    const totalRecordedSessions = monthlySheets.length;
    const studentRows: MonthlyStudentAttendanceRow[] = Array.from(studentMap.values()).map(stu => {
      const dailyStatuses: MonthlyStudentAttendanceRow['dailyStatuses'] = {};
      let presentCount = 0;
      let absentCount = 0;
      let notMarkedCount = 0;

      for (const calDay of calendarDays) {
        const sheetsOnDay = monthlySheets.filter(sh => sh.date === calDay.date);
        if (sheetsOnDay.length === 0) {
          dailyStatuses[calDay.date] = {
            status: calDay.isWeeklyOff ? 'holiday' : 'no_session',
            sessionsCount: 0,
            presentSessions: 0,
            absentSessions: 0,
            notMarkedSessions: 0
          };
          continue;
        }

        let pSess = 0;
        let aSess = 0;
        let nmSess = 0;

        for (const sh of sheetsOnDay) {
          const entry = sh.entries.find(
            e => e.boardRoll === stu.boardRoll || e.studentId === stu.id
          );
          const stStatus: AttendanceStatus = entry ? entry.status : 'not_marked';
          if (stStatus === 'present') {
            pSess += 1;
            presentCount += 1;
          } else if (stStatus === 'absent') {
            aSess += 1;
            absentCount += 1;
          } else {
            nmSess += 1;
            notMarkedCount += 1;
          }
        }

        // Dominant status for the date cell
        const cellStatus: AttendanceStatus =
          pSess > 0 ? 'present' : aSess > 0 ? 'absent' : 'not_marked';

        dailyStatuses[calDay.date] = {
          status: cellStatus,
          sessionsCount: sheetsOnDay.length,
          presentSessions: pSess,
          absentSessions: aSess,
          notMarkedSessions: nmSess
        };
      }

      // Percentage is calculated strictly from recorded class sessions where the student was explicitly marked (present or absent).
      // Unmarked students (`not_marked`) are NEVER counted as Present or silently treated as Absent, and holidays/non-class days are excluded.
      const markedSessionsCount = presentCount + absentCount;
      const attendancePercentage =
        markedSessionsCount > 0
          ? Number(((presentCount / markedSessionsCount) * 100).toFixed(1))
          : null;

      return {
        studentId: stu.id,
        studentName: stu.name,
        boardRoll: stu.boardRoll,
        classRoll: stu.classRoll,
        regNumber: stu.regNumber,
        dailyStatuses,
        presentCount,
        absentCount,
        notMarkedCount,
        recordedSessionsCount: totalRecordedSessions,
        attendancePercentage
      };
    });

    // Overall class monthly statistics
    const totalPresentMarks = studentRows.reduce((acc, r) => acc + r.presentCount, 0);
    const totalAbsentMarks = studentRows.reduce((acc, r) => acc + r.absentCount, 0);
    const totalNotMarkedMarks = studentRows.reduce((acc, r) => acc + r.notMarkedCount, 0);
    const totalMarkedSlots = totalPresentMarks + totalAbsentMarks;
    const overallAttendancePercentage =
      totalMarkedSlots > 0
        ? Number(((totalPresentMarks / totalMarkedSlots) * 100).toFixed(1))
        : null;

    return res.status(200).json({
      success: true,
      cohort: {
        college: canonicalCollege.name,
        collegeId: canonicalCollege.id,
        department: canonicalDept.name,
        departmentId: canonicalDept.id,
        semester,
        shift,
        section,
        year,
        month,
        subjectCode
      },
      calendarDays,
      sheets: monthlySheets,
      studentRows,
      summary: {
        totalStudents: studentRows.length,
        totalRecordedSessions,
        recordedDatesCount: calendarDays.filter(d => d.recordedSheetsCount > 0).length,
        totalPresentMarks,
        totalAbsentMarks,
        totalNotMarkedMarks,
        overallAttendancePercentage
      }
    });
  } catch (error) {
    console.error('Monthly attendance matrix error:', error);
    return res.status(500).json({ success: false, error: 'Failed to compute monthly attendance matrix.' });
  }
});

/**
 * ============================================================================
 * 10J. TEACHER & STUDENT NOTES AND ASSIGNMENTS + SUBMISSIONS ENGINE
 * ============================================================================
 */

function computeAssignmentSubmissionSummary(
  asg: AssignmentItem,
  viewerSession: ServerSession | null
): AssignmentSubmissionSummary {
  const asgCollege = asg.college || 'Dhaka Polytechnic Institute';
  const asgDept = asg.department || 'Computer Science and Technology (CST)';
  const eligibleRoster = getCohortRoster({
    college: asgCollege,
    department: asgDept,
    semester: asg.semester,
    shift: asg.shift,
    section: asg.section
  });

  const eligibleBoardRolls = new Set(eligibleRoster.map(s => s.boardRoll));
  const eligibleStudentIds = new Set(eligibleRoster.map(s => s.id));
  const hasKnownRoster = eligibleRoster.length > 0;

  // All saved submission records for this assignment
  const rawSubs = academicStore.assignmentSubmissions.filter(s => s.assignmentId === asg.id);

  // Deduplicate by student identifier (boardRoll or studentId) and filter to eligible cohort when roster is known
  const uniqueByStudent = new Map<string, AssignmentSubmissionRecord>();
  let totalAttempts = 0;

  for (const sub of rawSubs) {
    // Check if submission matches assignment's cohort targeting
    const matchesCohort =
      areCollegesEquivalent(sub.college || asgCollege, asgCollege) &&
      areDepartmentsEquivalent(sub.department || asgDept, asgDept) &&
      Number(sub.semester) === Number(asg.semester) &&
      sub.shift === asg.shift &&
      sub.section === asg.section;

    if (!matchesCohort) continue;

    // If eligible roster is known, only count students who belong to that eligible cohort
    if (hasKnownRoster) {
      const isInEligibleRoster =
        (sub.boardRoll && eligibleBoardRolls.has(sub.boardRoll)) ||
        eligibleStudentIds.has(sub.studentId);
      if (!isInEligibleRoster) continue;
    }

    const key = sub.boardRoll || sub.studentId;
    totalAttempts += Number(sub.attemptCount) || 1;
    if (!uniqueByStudent.has(key)) {
      uniqueByStudent.set(key, sub);
    }
  }

  const totalSubmitted = uniqueByStudent.size;
  const eligibleRosterCount = hasKnownRoster ? eligibleRoster.length : null;
  const totalNotSubmitted =
    eligibleRosterCount !== null ? Math.max(0, eligibleRosterCount - totalSubmitted) : null;

  let mySubmission: AssignmentSubmissionRecord | null = null;
  if (viewerSession && (viewerSession.role === 'student' || viewerSession.role === 'class_captain')) {
    mySubmission =
      rawSubs.find(
        s =>
          s.studentId === viewerSession.userId ||
          (viewerSession.boardRoll && s.boardRoll === viewerSession.boardRoll)
      ) || null;
  }

  return {
    totalSubmitted,
    totalNotSubmitted,
    eligibleRosterCount,
    totalAttempts,
    mySubmission
  };
}

/**
 * GET NOTES (`GET /api/notes`)
 */
app.get('/api/notes', (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    notes: academicStore.notes
  });
});

/**
 * PUBLISH NOTE (`POST /api/notes`)
 * Authorized for Verified Teachers (within scope), Verified Class Captains, or System Admins
 */
app.post('/api/notes', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required: Please sign in to publish study notes.'
      });
    }

    if (session.role === 'student') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only verified Teachers or Class Captains can publish official lecture notes.'
      });
    }

    const {
      title,
      subjectCode,
      subjectName,
      chapter,
      fileType = 'PDF',
      fileSize = '2.5 MB',
      summary,
      semester = 6,
      college = session.college || 'Dhaka Polytechnic Institute',
      department = session.department || 'Computer Science and Technology (CST)',
      shift = session.shift || 'Morning',
      section = session.section || 'A1',
      mediaUrl,
      mediaName,
      extractedText,
      headings,
      tables,
      pageCount,
      pageNumbers,
      scanConfidence
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, error: 'Note title is required.' });
    }

    if (session.role === 'teacher') {
      const authCheck = checkTeacherCohortAuthorization(session, {
        college,
        department,
        semester: Number(semester),
        shift,
        section
      });
      if (!authCheck.authorized) {
        return res.status(authCheck.status).json({
          success: false,
          error: authCheck.error
        });
      }
    }

    const canonicalCol = normalizeCollege(college);
    const canonicalDept = normalizeTechnology(department);
    const now = new Date();
    const uploadedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const newNote: NoteItem = {
      id: `note_${Date.now()}`,
      title: String(title).trim(),
      subjectCode: String(subjectCode || '66662').trim(),
      subjectName: String(subjectName || 'Department Subject').trim(),
      chapter: String(chapter || 'Chapter 1').trim(),
      uploadedBy: session.role === 'teacher' ? session.name : `${session.name} (CR)`,
      uploadedById: session.userId,
      uploadedByRole: session.role,
      uploadedDate,
      fileType: (['PDF', 'DOCX', 'SLIDES', 'IMAGE', 'VIDEO'].includes(String(fileType)) ? fileType : 'PDF') as NoteItem['fileType'],
      fileSize: String(fileSize || '2.0 MB'),
      summary: String(summary || '').trim(),
      semester: Number(semester) as SemesterNumber,
      college: canonicalCol.name,
      collegeId: canonicalCol.id,
      department: canonicalDept.name,
      departmentId: canonicalDept.id,
      shift: shift === 'Day' ? 'Day' : 'Morning',
      section: (['A1', 'A2', 'B1', 'B2'].includes(String(section)) ? section : 'A1') as Section,
      mediaUrl: mediaUrl || undefined,
      mediaName: mediaName || undefined,
      extractedText: extractedText ? String(extractedText).trim() : undefined,
      headings: Array.isArray(headings) ? headings.map(String) : undefined,
      tables: Array.isArray(tables) ? tables.map(String) : undefined,
      pageCount: pageCount ? Number(pageCount) : undefined,
      pageNumbers: Array.isArray(pageNumbers) ? pageNumbers.map(Number) : undefined,
      scanConfidence: scanConfidence === 'high' || scanConfidence === 'medium' || scanConfidence === 'low' ? scanConfidence : undefined
    };

    academicStore.notes.unshift(newNote);
    saveAcademicStore(academicStore);

    return res.status(201).json({
      success: true,
      message: 'Lecture note published successfully.',
      note: newNote
    });
  } catch (error) {
    console.error('Publish note error:', error);
    return res.status(500).json({ success: false, error: 'Failed to publish study note.' });
  }
});

/**
 * GET ASSIGNMENTS WITH ACCURATE SUBMISSION COUNTS (`GET /api/assignments`)
 */
app.get('/api/assignments', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    const enrichedAssignments: AssignmentItem[] = academicStore.assignments.map(asg => {
      const summary = computeAssignmentSubmissionSummary(asg, session);
      const isSubmittedForStudent =
        session && (session.role === 'student' || session.role === 'class_captain')
          ? Boolean(summary.mySubmission)
          : asg.status === 'Submitted';

      return {
        ...asg,
        status: isSubmittedForStudent ? 'Submitted' : 'Pending',
        submittedAt: summary.mySubmission?.lastUpdatedAt || asg.submittedAt,
        submissionNote: summary.mySubmission?.submissionNote || asg.submissionNote,
        submissionSummary: summary
      };
    });

    return res.status(200).json({
      success: true,
      assignments: enrichedAssignments
    });
  } catch (error) {
    console.error('Get assignments error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load assignments.' });
  }
});

/**
 * PUBLISH ASSIGNMENT (`POST /api/assignments`)
 * Authorized for Verified Teachers (within scope) or Verified Class Captains
 */
app.post('/api/assignments', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required: Please sign in to publish an assignment.'
      });
    }

    if (session.role === 'student') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Regular student accounts cannot publish class assignments.'
      });
    }

    const {
      title,
      subjectCode = '66664',
      subjectName = 'Database Management System',
      assignedBy,
      dueDate,
      description,
      college = session.college || 'Dhaka Polytechnic Institute',
      department = session.department || 'Computer Science and Technology (CST)',
      semester = 6,
      shift = session.shift || 'Morning',
      section = session.section || 'A1',
      attachmentUrl,
      attachmentName,
      attachmentType,
      questions,
      marks,
      submissionMethod,
      extractedText,
      pageNumbers,
      scanConfidence,
      uncertainFields
    } = req.body;

    if (!title || !String(title).trim() || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Assignment title and due date are required.'
      });
    }

    if (session.role === 'teacher') {
      const authCheck = checkTeacherCohortAuthorization(session, {
        college,
        department,
        semester: Number(semester),
        shift,
        section
      });
      if (!authCheck.authorized) {
        return res.status(authCheck.status).json({
          success: false,
          error: authCheck.error
        });
      }
    }

    const canonicalCol = normalizeCollege(college);
    const canonicalDept = normalizeTechnology(department);

    const newAsg: AssignmentItem = {
      id: `asg_${Date.now()}`,
      title: String(title).trim(),
      subjectCode: String(subjectCode).trim(),
      subjectName: String(subjectName).trim(),
      assignedBy: session.role === 'teacher' ? session.name : String(assignedBy || session.name).trim(),
      assignedById: session.userId,
      assignedByRole: session.role,
      dueDate: String(dueDate).trim(),
      status: 'Pending',
      description: String(description || '').trim(),
      college: canonicalCol.name,
      collegeId: canonicalCol.id,
      department: canonicalDept.name,
      departmentId: canonicalDept.id,
      semester: Number(semester) as SemesterNumber,
      shift: shift === 'Day' ? 'Day' : 'Morning',
      section: (['A1', 'A2', 'B1', 'B2'].includes(String(section)) ? section : 'A1') as Section,
      attachmentUrl: attachmentUrl || undefined,
      attachmentName: attachmentName || undefined,
      attachmentType: attachmentType || undefined,
      questions: Array.isArray(questions) ? questions.map(String) : undefined,
      marks: marks !== undefined ? marks : undefined,
      submissionMethod: submissionMethod ? String(submissionMethod).trim() : undefined,
      extractedText: extractedText ? String(extractedText).trim() : undefined,
      pageNumbers: Array.isArray(pageNumbers) ? pageNumbers.map(Number) : undefined,
      scanConfidence: scanConfidence === 'high' || scanConfidence === 'medium' || scanConfidence === 'low' ? scanConfidence : undefined,
      uncertainFields: Array.isArray(uncertainFields) ? uncertainFields.map(String) : undefined
    };

    academicStore.assignments.unshift(newAsg);
    saveAcademicStore(academicStore);

    const enriched: AssignmentItem = {
      ...newAsg,
      submissionSummary: computeAssignmentSubmissionSummary(newAsg, session)
    };

    return res.status(201).json({
      success: true,
      message: 'Assignment published to class feed.',
      assignment: enriched
    });
  } catch (error) {
    console.error('Publish assignment error:', error);
    return res.status(500).json({ success: false, error: 'Failed to publish assignment.' });
  }
});

/**
 * STUDENT ASSIGNMENT SUBMISSION (`POST /api/assignments/:id/submit`)
 * - Strictly blocks Teachers (`role === 'teacher'`) and System Admins with HTTP 403 Forbidden
 * - Validates that the submitting student belongs to the assignment's eligible cohort
 * - Deduplicates submissions by student: resubmissions update the existing record and increment `attemptCount`
 */
app.post('/api/assignments/:id/submit', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required: Please sign in as a Student to submit assignments.'
      });
    }

    if (session.role === 'teacher' || session.role === 'system_admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Teacher and Administrator accounts cannot submit student homework assignments.'
      });
    }

    const { id } = req.params;
    const asg = academicStore.assignments.find(a => a.id === id);
    if (!asg) {
      return res.status(404).json({ success: false, error: 'Assignment not found.' });
    }

    const {
      submissionNote,
      attachmentUrl,
      attachmentName,
      attachmentType,
      attachmentSize
    } = req.body;

    // Identity is derived from the session (and the server roster) ONLY.
    // Body-supplied board roll / class roll / registration number / college
    // / department / semester / shift / section are ignored: a caller must
    // not be able to submit an assignment as somebody else, and the server
    // must not fabricate placeholder rolls or registration numbers.
    const studentInRoster = academicStore.students.find(
      s => s.id === session.userId || (session.boardRoll && s.boardRoll === session.boardRoll)
    );

    const studentCollege = studentInRoster?.college || session.college || 'Dhaka Polytechnic Institute';
    const studentDept = studentInRoster?.department || session.department || 'Computer Science and Technology (CST)';
    const studentSemester = Number(studentInRoster?.semester || session.semester || 6) as SemesterNumber;
    const studentShift = (studentInRoster?.shift || session.shift || 'Morning') as Shift;
    const studentSection = (studentInRoster?.section || session.section || 'A1') as Section;
    const studentBoardRoll = studentInRoster?.boardRoll || session.boardRoll || '';

    // Check cohort eligibility against the assignment targeting
    const asgCollege = asg.college || 'Dhaka Polytechnic Institute';
    const asgDept = asg.department || 'Computer Science and Technology (CST)';

    if (
      !areCollegesEquivalent(studentCollege, asgCollege) ||
      !areDepartmentsEquivalent(studentDept, asgDept) ||
      studentSemester !== Number(asg.semester) ||
      studentShift !== asg.shift ||
      studentSection !== asg.section
    ) {
      return res.status(403).json({
        success: false,
        error: `Forbidden (Cohort Eligibility): This assignment is targeted to Semester ${asg.semester} (${asg.shift} Shift · Sec ${asg.section}), which does not match your enrolled class cohort.`
      });
    }

    // Ensure student is present in academicStore.students so eligible roster counts stay accurate
    if (!studentInRoster && studentBoardRoll) {
      academicStore.students.push({
        id: session.userId,
        name: session.name,
        classRoll: '',
        boardRoll: studentBoardRoll,
        regNumber: '',
        college: normalizeCollege(studentCollege).name,
        department: normalizeTechnology(studentDept).name,
        semester: studentSemester,
        shift: studentShift,
        section: studentSection,
        phone: 'N/A',
        accountType: session.role === 'class_captain' ? 'class_captain' : 'student',
        captainVerificationStatus: session.role === 'class_captain' ? 'Approved' : 'NotApplied',
        attendanceRate: 'N/A'
      });
    }

    const now = new Date();
    const formattedNow = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const existingSubIdx = academicStore.assignmentSubmissions.findIndex(
      s =>
        s.assignmentId === asg.id &&
        (s.studentId === session.userId || (studentBoardRoll && s.boardRoll === studentBoardRoll))
    );

    let savedSubmission: AssignmentSubmissionRecord;
    let isResubmission = false;

    if (existingSubIdx >= 0) {
      isResubmission = true;
      const prev = academicStore.assignmentSubmissions[existingSubIdx];
      savedSubmission = {
        ...prev,
        lastUpdatedAt: formattedNow,
        submissionNote: String(submissionNote || prev.submissionNote || 'Submitted via student portal.').trim(),
        attachmentUrl: attachmentUrl !== undefined ? attachmentUrl : prev.attachmentUrl,
        attachmentName: attachmentName !== undefined ? attachmentName : prev.attachmentName,
        attachmentType: attachmentType !== undefined ? attachmentType : prev.attachmentType,
        attachmentSize: attachmentSize !== undefined ? attachmentSize : prev.attachmentSize,
        attemptCount: (Number(prev.attemptCount) || 1) + 1
      };
      academicStore.assignmentSubmissions[existingSubIdx] = savedSubmission;
    } else {
      savedSubmission = {
        id: `sub_${asg.id}_${session.userId}_${Date.now()}`,
        assignmentId: asg.id,
        studentId: session.userId,
        studentName: studentInRoster?.name || session.name,
        boardRoll: studentBoardRoll,
        classRoll: studentInRoster?.classRoll || '',
        regNumber: studentInRoster?.regNumber || '',
        college: normalizeCollege(studentCollege).name,
        department: normalizeTechnology(studentDept).name,
        semester: studentSemester,
        shift: studentShift,
        section: studentSection,
        submittedAt: formattedNow,
        lastUpdatedAt: formattedNow,
        submissionNote: String(submissionNote || 'Completed and submitted through student portal.').trim(),
        attachmentUrl: attachmentUrl || undefined,
        attachmentName: attachmentName || undefined,
        attachmentType: attachmentType || undefined,
        attachmentSize: attachmentSize || undefined,
        attemptCount: 1
      };
      academicStore.assignmentSubmissions.unshift(savedSubmission);
    }

    saveAcademicStore(academicStore);

    const updatedSummary = computeAssignmentSubmissionSummary(asg, session);

    return res.status(200).json({
      success: true,
      isResubmission,
      message: isResubmission
        ? `Assignment resubmitted (Attempt #${savedSubmission.attemptCount}). Your unique student submission count remains 1.`
        : 'Assignment submitted successfully!',
      submission: savedSubmission,
      submissionSummary: updatedSummary
    });
  } catch (error) {
    console.error('Submit assignment error:', error);
    return res.status(500).json({ success: false, error: 'Failed to submit assignment.' });
  }
});

/**
 * TEACHER VIEW ASSIGNMENT SUBMISSIONS (`GET /api/assignments/:id/submissions`)
 * - Strictly restricted to Verified Teachers authorized for the assignment's cohort (or System Admins)
 * - Students and Class Captains receive HTTP 403 Forbidden (protecting other students' private submission files)
 */
app.get('/api/assignments/:id/submissions', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required: Please sign in as an authorized Teacher to view student submissions.'
      });
    }

    if (session.role === 'student' || session.role === 'class_captain') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Students cannot view or download other students\' private assignment submissions.'
      });
    }

    const { id } = req.params;
    const asg = academicStore.assignments.find(a => a.id === id);
    if (!asg) {
      return res.status(404).json({ success: false, error: 'Assignment not found.' });
    }

    const asgCollege = asg.college || 'Dhaka Polytechnic Institute';
    const asgDept = asg.department || 'Computer Science and Technology (CST)';

    if (session.role === 'teacher') {
      const authCheck = checkTeacherCohortAuthorization(session, {
        college: asgCollege,
        department: asgDept,
        semester: asg.semester,
        shift: asg.shift,
        section: asg.section
      });
      if (!authCheck.authorized) {
        return res.status(authCheck.status).json({
          success: false,
          error: authCheck.error
        });
      }
    }

    const eligibleRoster = getCohortRoster({
      college: asgCollege,
      department: asgDept,
      semester: asg.semester,
      shift: asg.shift,
      section: asg.section
    });

    const eligibleBoardRolls = new Set(eligibleRoster.map(s => s.boardRoll));
    const eligibleStudentIds = new Set(eligibleRoster.map(s => s.id));
    const hasKnownRoster = eligibleRoster.length > 0;

    const rawSubs = academicStore.assignmentSubmissions.filter(s => s.assignmentId === asg.id);
    const uniqueSubmissions: AssignmentSubmissionRecord[] = [];
    const submittedRolls = new Set<string>();
    const submittedIds = new Set<string>();

    for (const sub of rawSubs) {
      const matchesCohort =
        areCollegesEquivalent(sub.college || asgCollege, asgCollege) &&
        areDepartmentsEquivalent(sub.department || asgDept, asgDept) &&
        Number(sub.semester) === Number(asg.semester) &&
        sub.shift === asg.shift &&
        sub.section === asg.section;
      if (!matchesCohort) continue;

      if (hasKnownRoster) {
        const isEligible =
          (sub.boardRoll && eligibleBoardRolls.has(sub.boardRoll)) ||
          eligibleStudentIds.has(sub.studentId);
        if (!isEligible) continue;
      }

      const key = sub.boardRoll || sub.studentId;
      if (!submittedRolls.has(key)) {
        submittedRolls.add(key);
        submittedIds.add(sub.studentId);
        uniqueSubmissions.push(sub);
      }
    }

    const notSubmittedStudents = hasKnownRoster
      ? eligibleRoster
          .filter(st => !submittedRolls.has(st.boardRoll) && !submittedIds.has(st.id))
          .map(st => ({
            studentId: st.id,
            studentName: st.name,
            boardRoll: st.boardRoll,
            classRoll: st.classRoll,
            regNumber: st.regNumber
          }))
      : [];

    const summary = computeAssignmentSubmissionSummary(asg, session);

    return res.status(200).json({
      success: true,
      assignment: asg,
      summary,
      submissions: uniqueSubmissions,
      notSubmittedStudents
    });
  } catch (error) {
    console.error('Get assignment submissions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to load assignment submissions.' });
  }
});

/**
 * ============================================================================
 * 11. CENTRAL SUBJECT CATALOG & ADMIN CATALOG MANAGEMENT ENGINE
 * ============================================================================
 * - Persistent store in `data/subject-catalog.json` seeded from validated `data/starter-subject-catalog.json`
 * - Supports all 19 BTEB Technologies, Regulations 2016 & 2022, and Semesters 1..8
 * - Never invents missing subjects or falls back to other semesters/regulations/technologies
 * - Protects existing 'verified' records from being overwritten by 'provisional' or 'unverified' records
 * - Strictly enforces `requireSystemAdmin` (HTTP 403 Forbidden for Student, Teacher, Class Captain) on all write/import endpoints
 */

interface PersistentCatalogStore {
  records: SubjectCatalogRecord[];
  importAuditLogs: CatalogImportAuditLog[];
}

const STARTER_CATALOG_FILE = path.join(DATA_DIR, 'starter-subject-catalog.json');
const SUBJECT_CATALOG_FILE = path.join(DATA_DIR, 'subject-catalog.json');

function ensureStarterCatalogJsonOnDisk(): SubjectCatalogRecord[] {
  const generated = buildStarterSubjectCatalog();
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STARTER_CATALOG_FILE, JSON.stringify(generated, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Subject Catalog] Could not write starter-subject-catalog.json, using generated starter dataset:', err);
  }
  return generated;
}

function saveCatalogStore(store: PersistentCatalogStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${SUBJECT_CATALOG_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), 'utf-8');
    fs.renameSync(tempFile, SUBJECT_CATALOG_FILE);
  } catch (err) {
    console.error('[Subject Catalog] Failed to save subject-catalog.json:', err);
  }
}

function loadCatalogStore(): PersistentCatalogStore {
  const starterRecords = ensureStarterCatalogJsonOnDisk();
  const uploaded2022Records = buildUploaded2022DepartmentRecords();
  try {
    if (fs.existsSync(SUBJECT_CATALOG_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SUBJECT_CATALOG_FILE, 'utf-8'));
      if (parsed && Array.isArray(parsed.records) && parsed.records.length > 0) {
        const existingRecords = parsed.records as SubjectCatalogRecord[];
        const existingKeys = new Set(existingRecords.map((r) => buildCatalogCompositeKey(r)));
        const missingUploaded2022 = uploaded2022Records.filter(
          (r) => !existingKeys.has(buildCatalogCompositeKey(r))
        );

        // If all 15 uploaded 2022 department datasets (796 records) are already present, return as-is
        if (missingUploaded2022.length === 0) {
          return {
            records: existingRecords,
            importAuditLogs: Array.isArray(parsed.importAuditLogs) ? parsed.importAuditLogs : []
          };
        }

        // Preserve all existing verified/admin records and 2016 records, and merge any newly added uploaded 2022 department records
        const preservedRecords = existingRecords.filter(
          (r) => !(r.regulation === '2022' && (r.updated_by === 'starter_seed' || r.updated_by === 'starter_json'))
        );
        const mergedMap = new Map<string, SubjectCatalogRecord>();
        for (const r of preservedRecords) {
          mergedMap.set(buildCatalogCompositeKey(r), r);
        }
        let newlyInsertedCount = 0;
        for (const r of starterRecords) {
          const key = buildCatalogCompositeKey(r);
          if (!mergedMap.has(key)) {
            mergedMap.set(key, r);
            if (r.updated_by === 'uploaded_department_dataset') {
              newlyInsertedCount++;
            }
          }
        }
        const mergedRecords = Array.from(mergedMap.values());
        const migratedStore: PersistentCatalogStore = {
          records: mergedRecords,
          importAuditLogs: [
            {
              id: `cat_audit_uploaded_15_depts_${Date.now()}`,
              importedBy: 'system_bootstrap (15 Uploaded Dept JSONs)',
              importedAt: new Date().toISOString(),
              sourceName: '15_uploaded_department_datasets_2022.json',
              totalSubmitted: uploaded2022Records.length,
              insertedCount: newlyInsertedCount,
              updatedCount: 0,
              unchangedCount: uploaded2022Records.length - newlyInsertedCount,
              skippedVerifiedCount: 0,
              duplicateWarningsCount: UPLOADED_DEPARTMENT_DATASETS.length
            },
            ...(Array.isArray(parsed.importAuditLogs) ? parsed.importAuditLogs : [])
          ]
        };
        saveCatalogStore(migratedStore);
        return migratedStore;
      }
    }
  } catch (err) {
    console.warn('[Subject Catalog] Initializing clean subject-catalog.json from starter dataset:', err);
  }
  const initialStore: PersistentCatalogStore = {
    records: starterRecords,
    importAuditLogs: [
      {
        id: 'cat_audit_uploaded_15_depts',
        importedBy: 'system_bootstrap (15 Uploaded Dept JSONs)',
        importedAt: '2026-10-24T00:00:00.000Z',
        sourceName: '15_uploaded_department_datasets_2022.json',
        totalSubmitted: uploaded2022Records.length,
        insertedCount: uploaded2022Records.length,
        updatedCount: 0,
        unchangedCount: 0,
        skippedVerifiedCount: 0,
        duplicateWarningsCount: UPLOADED_DEPARTMENT_DATASETS.length
      }
    ]
  };
  saveCatalogStore(initialStore);
  return initialStore;
}

const subjectCatalogStore: PersistentCatalogStore = loadCatalogStore();

/**
 * Strictly resolves a technology query string to one of the 19 canonical BTEB technologies
 * without falling back to CST if an unknown technology string is passed.
 */
function findExactTechnology(input: string | undefined) {
  if (!input) return null;
  return matchCanonicalTechnology(input);
}

function areCatalogRecordsIdentical(
  existing: SubjectCatalogRecord,
  incoming: Omit<SubjectCatalogRecord, 'id'>
): boolean {
  return (
    existing.technology_key === incoming.technology_key &&
    existing.regulation === incoming.regulation &&
    existing.semester === incoming.semester &&
    existing.subject_code.trim().toLowerCase() === incoming.subject_code.trim().toLowerCase() &&
    existing.subject_name.trim() === incoming.subject_name.trim() &&
    (existing.subject_type ?? null) === (incoming.subject_type ?? null) &&
    (existing.marks ?? null) === (incoming.marks ?? null) &&
    (existing.credits ?? null) === (incoming.credits ?? null) &&
    (existing.theory_per_week ?? null) === (incoming.theory_per_week ?? null) &&
    (existing.practical_per_week ?? null) === (incoming.practical_per_week ?? null) &&
    existing.verification_status === incoming.verification_status &&
    existing.is_active === incoming.is_active
  );
}

/**
 * Helper: Analyzes a raw payload (flat array, single department JSON, or array of department JSONs)
 * against the current catalog store to produce the required pre-import preview summary:
 * - Total records
 * - Records grouped by technology/regulation/semester + missing semesters
 * - Duplicate subject codes in payload (warnings, never silently deleted)
 * - Unverified/provisional record counts
 * - Existing verified records that would conflict (protected from overwrite by provisional/unverified)
 * - Insertable, updatable, and unchanged (idempotent) record counts
 */
function buildCatalogImportPreview(
  rawPayload: unknown,
  syntaxWarnings: string[] = []
): CatalogImportPreviewSummary {
  const extracted = extractRawCatalogItemsFromPayload(rawPayload);
  if (!extracted.validStructure) {
    return {
      valid: false,
      totalRecords: 0,
      validRecordsCount: 0,
      invalidRecords: [
        {
          index: 0,
          reason:
            extracted.structureError ||
            'Payload must be a department JSON or a JSON array of subject catalog records.'
        }
      ],
      syntaxWarnings,
      groupedCounts: [],
      duplicateCodes: [],
      unverifiedOrProvisionalCount: 0,
      verifiedCount: 0,
      protectedVerifiedConflicts: [],
      insertableCount: 0,
      updatableCount: 0,
      unchangedCount: 0
    };
  }

  const arr = extracted.items;
  const invalidRecords: { index: number; reason: string; raw?: unknown }[] = [];
  const validItems: Omit<SubjectCatalogRecord, 'id'>[] = [];

  arr.forEach((item, idx) => {
    const res = validateAndNormalizeCatalogRecord(item, idx);
    if (!res.valid) {
      invalidRecords.push({ index: idx, reason: res.reason, raw: item });
    } else {
      validItems.push(res.record);
    }
  });

  // Group by (technology_key, regulation)
  const groupMap = new Map<
    string,
    {
      technology_key: string;
      technology: string;
      regulation: CatalogRegulation;
      semesterCounts: Record<number, number>;
      totalInGroup: number;
    }
  >();

  // Track duplicate codes within the same (technology_key, regulation, semester, subject_code)
  const codeOccurrenceMap = new Map<
    string,
    {
      subject_code: string;
      technology_key: string;
      regulation: CatalogRegulation;
      semester: SemesterNumber;
      occurrences: number;
      subject_names: string[];
    }
  >();

  let unverifiedOrProvisionalCount = 0;
  let verifiedCount = 0;
  let insertableCount = 0;
  let updatableCount = 0;
  let unchangedCount = 0;
  const protectedVerifiedConflicts: CatalogVerifiedConflict[] = [];

  // Index existing store records by composite idempotency key (tech, reg, sem, code, name)
  // AND by code-only key (tech, reg, sem, code) to detect single-code verified overwrite attempts
  const existingByCompositeKey = new Map<string, SubjectCatalogRecord>();
  const existingByCodeKey = new Map<string, SubjectCatalogRecord[]>();
  for (const existing of subjectCatalogStore.records) {
    const compKey = buildCatalogCompositeKey(existing);
    existingByCompositeKey.set(compKey, existing);
    const codeKey = `${existing.technology_key}|${existing.regulation}|${existing.semester}|${existing.subject_code.trim().toLowerCase()}`;
    if (!existingByCodeKey.has(codeKey)) {
      existingByCodeKey.set(codeKey, []);
    }
    existingByCodeKey.get(codeKey)!.push(existing);
  }

  const seenCompositeInPayload = new Set<string>();

  for (const rec of validItems) {
    if (rec.verification_status === 'verified') {
      verifiedCount++;
    } else {
      unverifiedOrProvisionalCount++;
    }

    const grpKey = `${rec.technology_key}|${rec.regulation}`;
    if (!groupMap.has(grpKey)) {
      groupMap.set(grpKey, {
        technology_key: rec.technology_key,
        technology: rec.technology,
        regulation: rec.regulation,
        semesterCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
        totalInGroup: 0
      });
    }
    const grp = groupMap.get(grpKey)!;
    grp.semesterCounts[rec.semester] = (grp.semesterCounts[rec.semester] || 0) + 1;
    grp.totalInGroup += 1;

    const codeKey = `${rec.technology_key}|${rec.regulation}|${rec.semester}|${rec.subject_code.trim().toLowerCase()}`;
    const occ = codeOccurrenceMap.get(codeKey);
    if (!occ) {
      codeOccurrenceMap.set(codeKey, {
        subject_code: rec.subject_code,
        technology_key: rec.technology_key,
        regulation: rec.regulation,
        semester: rec.semester,
        occurrences: 1,
        subject_names: [rec.subject_name]
      });
    } else {
      occ.occurrences += 1;
      if (!occ.subject_names.includes(rec.subject_name)) {
        occ.subject_names.push(rec.subject_name);
      }
    }

    const compKey = buildCatalogCompositeKey(rec);
    if (seenCompositeInPayload.has(compKey)) {
      continue;
    }
    seenCompositeInPayload.add(compKey);

    const exactExisting = existingByCompositeKey.get(compKey);
    const sameCodeList = existingByCodeKey.get(codeKey) || [];
    const targetExisting =
      exactExisting || (sameCodeList.length === 1 && (codeOccurrenceMap.get(codeKey)?.occurrences || 1) === 1 ? sameCodeList[0] : undefined);

    if (!targetExisting) {
      // Also check if any existing record with the same code is 'verified' while incoming is 'provisional'/'unverified'
      const verifiedSameCode = sameCodeList.find((e) => e.verification_status === 'verified');
      if (verifiedSameCode && rec.verification_status !== 'verified') {
        protectedVerifiedConflicts.push({
          existing_id: verifiedSameCode.id,
          subject_code: verifiedSameCode.subject_code,
          technology_key: verifiedSameCode.technology_key,
          regulation: verifiedSameCode.regulation,
          semester: verifiedSameCode.semester,
          existing_name: verifiedSameCode.subject_name,
          incoming_name: rec.subject_name,
          existing_status: verifiedSameCode.verification_status,
          incoming_status: rec.verification_status,
          reason: `Protected: Existing verified record "${verifiedSameCode.subject_name} (${verifiedSameCode.subject_code})" cannot be overwritten by a ${rec.verification_status} record.`
        });
      } else {
        insertableCount++;
      }
    } else {
      if (targetExisting.verification_status === 'verified' && rec.verification_status !== 'verified') {
        protectedVerifiedConflicts.push({
          existing_id: targetExisting.id,
          subject_code: targetExisting.subject_code,
          technology_key: targetExisting.technology_key,
          regulation: targetExisting.regulation,
          semester: targetExisting.semester,
          existing_name: targetExisting.subject_name,
          incoming_name: rec.subject_name,
          existing_status: targetExisting.verification_status,
          incoming_status: rec.verification_status,
          reason: `Protected: Existing verified record "${targetExisting.subject_name} (${targetExisting.subject_code})" cannot be overwritten by a ${rec.verification_status} record.`
        });
      } else if (areCatalogRecordsIdentical(targetExisting, rec)) {
        unchangedCount++;
      } else {
        updatableCount++;
      }
    }
  }

  const duplicateCodes: CatalogDuplicateWarning[] = [];
  for (const occ of codeOccurrenceMap.values()) {
    if (occ.occurrences > 1) {
      duplicateCodes.push({
        ...occ,
        message: `Duplicate subject code ${occ.subject_code} appears ${occ.occurrences} times in ${occ.technology_key} (${occ.regulation} Reg, Semester ${occ.semester}): ${occ.subject_names.join(' / ')}`
      });
    }
  }

  const groupedCounts = Array.from(groupMap.values()).map((g) => {
    const missingSemesters = [1, 2, 3, 4, 5, 6, 7, 8].filter(
      (s) => !g.semesterCounts[s] || g.semesterCounts[s] === 0
    );
    return {
      ...g,
      missingSemesters
    };
  });

  return {
    valid: validItems.length > 0,
    totalRecords: arr.length,
    validRecordsCount: validItems.length,
    invalidRecords,
    syntaxWarnings,
    groupedCounts,
    duplicateCodes,
    unverifiedOrProvisionalCount,
    verifiedCount,
    protectedVerifiedConflicts,
    insertableCount,
    updatableCount,
    unchangedCount
  };
}

const EMPTY_BOOK_LIST_MESSAGE = 'Book list is not available for this selection yet.';

/**
 * 11A. GET SUBJECT CATALOG (`GET /api/catalog/subjects`)
 * - Accessible to authenticated Students, Teachers, Class Captains, and System Admins (and public read for setup forms)
 * - Strictly filters by technology, regulation, and semester without inventing or falling back to other semesters/regulations
 */
app.get('/api/catalog/subjects', (req: Request, res: Response) => {
  try {
    const {
      technology,
      regulation,
      semester,
      semesters,
      search,
      sortBy = 'code',
      includeInactive,
      activeOnly,
      verificationStatus
    } = req.query;

    const session = getAuthenticatedSession(req);
    const isAdmin = session?.role === 'system_admin';
    const allowInactive =
      isAdmin && (String(includeInactive) === 'true' || String(activeOnly) === 'false');

    let results = subjectCatalogStore.records.filter((r) => (allowInactive ? true : r.is_active));

    // 1. Technology filter (strictly resolved — never falls back to another technology)
    if (technology !== undefined && String(technology).trim() !== '' && String(technology) !== 'ALL') {
      const matchedTech = findExactTechnology(String(technology));
      if (!matchedTech) {
        return res.status(200).json({
          success: true,
          records: [],
          total: 0,
          emptyMessage: EMPTY_BOOK_LIST_MESSAGE
        });
      }
      results = results.filter((r) => r.technology_key === matchedTech.id);
    }

    // 2. Regulation filter (strictly 2016 or 2022 — never falls back to another regulation)
    if (regulation !== undefined && String(regulation).trim() !== '' && String(regulation) !== 'ALL') {
      const regStr = String(regulation).trim();
      if (regStr !== '2016' && regStr !== '2022') {
        return res.status(200).json({
          success: true,
          records: [],
          total: 0,
          emptyMessage: EMPTY_BOOK_LIST_MESSAGE
        });
      }
      results = results.filter((r) => r.regulation === regStr);
    }

    // 3. Semester filter (supports single `semester=6` or multi `semesters=1,2,3` — never falls back to another semester)
    const rawSem =
      semesters !== undefined ? String(semesters) : semester !== undefined ? String(semester) : '';
    if (rawSem.trim() !== '' && rawSem !== 'ALL') {
      const parsedSems = rawSem
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 8);

      if (parsedSems.length === 0) {
        return res.status(200).json({
          success: true,
          records: [],
          total: 0,
          emptyMessage: EMPTY_BOOK_LIST_MESSAGE
        });
      }
      const semSet = new Set(parsedSems);
      results = results.filter((r) => semSet.has(r.semester));
    }

    // 4. Optional verification status filter
    if (verificationStatus && String(verificationStatus) !== 'ALL') {
      results = results.filter((r) => r.verification_status === String(verificationStatus));
    }

    // 5. Search by subject_code or subject_name
    if (search && String(search).trim() !== '') {
      const q = String(search).trim().toLowerCase();
      results = results.filter(
        (r) =>
          r.subject_code.toLowerCase().includes(q) ||
          r.subject_name.toLowerCase().includes(q) ||
          (r.subject_type && r.subject_type.toLowerCase().includes(q))
      );
    }

    // 6. Sorting
    const sortMode = String(sortBy).toLowerCase();
    results = [...results].sort((a, b) => {
      if (sortMode === 'name') {
        return a.subject_name.localeCompare(b.subject_name);
      }
      if (sortMode === 'marks') {
        const ma = typeof a.marks === 'number' ? a.marks : Number(a.marks) || 0;
        const mb = typeof b.marks === 'number' ? b.marks : Number(b.marks) || 0;
        return mb - ma || a.subject_code.localeCompare(b.subject_code);
      }
      if (sortMode === 'credits') {
        const ca = typeof a.credits === 'number' ? a.credits : Number(a.credits) || 0;
        const cb = typeof b.credits === 'number' ? b.credits : Number(b.credits) || 0;
        return cb - ca || a.subject_code.localeCompare(b.subject_code);
      }
      if (sortMode === 'status') {
        const order: Record<CatalogVerificationStatus, number> = {
          verified: 1,
          provisional: 2,
          unverified: 3
        };
        return (
          (order[a.verification_status] || 9) - (order[b.verification_status] || 9) ||
          a.subject_code.localeCompare(b.subject_code)
        );
      }
      return (
        a.semester - b.semester ||
        a.subject_code.localeCompare(b.subject_code) ||
        a.subject_name.localeCompare(b.subject_name)
      );
    });

    return res.status(200).json({
      success: true,
      records: results,
      total: results.length,
      emptyMessage: results.length === 0 ? EMPTY_BOOK_LIST_MESSAGE : null
    });
  } catch (error) {
    console.error('[Subject Catalog] Query error:', error);
    return res.status(500).json({ success: false, error: 'Failed to query subject catalog.' });
  }
});

/**
 * 11B. GET CATALOG COVERAGE SUMMARY (`GET /api/catalog/coverage`)
 * - Shows transparent, accurate coverage across all 19 technologies and regulations (2016 & 2022)
 * - Highlights which semesters are available vs missing and verified vs provisional
 */
app.get('/api/catalog/coverage', (_req: Request, res: Response) => {
  try {
    const activeRecords = subjectCatalogStore.records.filter((r) => r.is_active);
    const technologiesSummary = TECHNOLOGIES_DIRECTORY.map((tech) => {
      const techRecords = activeRecords.filter((r) => r.technology_key === tech.id);
      const byReg: Record<
        CatalogRegulation,
        {
          totalRecords: number;
          verifiedCount: number;
          provisionalCount: number;
          unverifiedCount: number;
          availableSemesters: number[];
          missingSemesters: number[];
        }
      > = {
        '2016': {
          totalRecords: 0,
          verifiedCount: 0,
          provisionalCount: 0,
          unverifiedCount: 0,
          availableSemesters: [],
          missingSemesters: []
        },
        '2022': {
          totalRecords: 0,
          verifiedCount: 0,
          provisionalCount: 0,
          unverifiedCount: 0,
          availableSemesters: [],
          missingSemesters: []
        }
      };

      (['2016', '2022'] as CatalogRegulation[]).forEach((reg) => {
        const regRecs = techRecords.filter((r) => r.regulation === reg);
        const semSet = new Set(regRecs.map((r) => r.semester));
        byReg[reg] = {
          totalRecords: regRecs.length,
          verifiedCount: regRecs.filter((r) => r.verification_status === 'verified').length,
          provisionalCount: regRecs.filter((r) => r.verification_status === 'provisional').length,
          unverifiedCount: regRecs.filter((r) => r.verification_status === 'unverified').length,
          availableSemesters: [1, 2, 3, 4, 5, 6, 7, 8].filter((s) => semSet.has(s as SemesterNumber)),
          missingSemesters: [1, 2, 3, 4, 5, 6, 7, 8].filter((s) => !semSet.has(s as SemesterNumber))
        };
      });

      return {
        technology_key: tech.id,
        technology: tech.name,
        shortCode: tech.shortCode,
        regulations: byReg
      };
    });

    return res.status(200).json({
      success: true,
      totalActiveRecords: activeRecords.length,
      totalInactiveRecords: subjectCatalogStore.records.length - activeRecords.length,
      verifiedCount: activeRecords.filter((r) => r.verification_status === 'verified').length,
      provisionalCount: activeRecords.filter((r) => r.verification_status === 'provisional').length,
      unverifiedCount: activeRecords.filter((r) => r.verification_status === 'unverified').length,
      uploaded2022DepartmentsCount: UPLOADED_DEPARTMENT_DATASETS.length,
      uploaded2022SubjectsCount: buildUploaded2022DepartmentRecords().length,
      technologies: technologiesSummary,
      importAuditLogs: subjectCatalogStore.importAuditLogs.slice(0, 25)
    });
  } catch (error) {
    console.error('[Subject Catalog] Coverage error:', error);
    return res.status(500).json({ success: false, error: 'Failed to compute catalog coverage.' });
  }
});

/**
 * 11C. ADMIN ONLY: LOAD STARTER JSON OR 10 UPLOADED DEPARTMENT DATASETS FOR PREVIEW
 */
app.get('/api/admin/catalog/starter-json', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const mode = String(req.query.mode || 'uploaded_10_depts');
    if (mode === 'uploaded_10_depts') {
      const syntaxWarnings = UPLOADED_DEPARTMENT_DATASETS.map((d) => d.syntaxWarning).filter(
        Boolean
      ) as string[];
      const preview = buildCatalogImportPreview(UPLOADED_DEPARTMENT_DATASETS, syntaxWarnings);
      return res.status(200).json({
        success: true,
        sourceName: '10_uploaded_department_datasets_2022.json',
        totalCount: preview.totalRecords,
        departments: UPLOADED_DEPARTMENT_DATASETS,
        records: UPLOADED_DEPARTMENT_DATASETS,
        preview,
        summary: preview
      });
    }
    const starterRecords = ensureStarterCatalogJsonOnDisk();
    const preview = buildCatalogImportPreview(starterRecords);
    return res.status(200).json({
      success: true,
      sourceName: 'starter-subject-catalog.json',
      totalCount: starterRecords.length,
      records: starterRecords,
      preview,
      summary: preview
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Failed to load starter catalog JSON.' });
  }
});

/**
 * 11D. ADMIN ONLY: PREVIEW CATALOG IMPORT (`POST /api/admin/catalog/preview-import`)
 * - Validates JSON records (flat array or hierarchical department JSON) before import
 * - Returns grouped counts, duplicate codes, missing semesters, unverified/provisional counts, syntax warnings, and protected verified conflicts
 */
app.post('/api/admin/catalog/preview-import', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const { records, rawJson, rawJsonText } = req.body;
    const rawStr = typeof rawJson === 'string' && rawJson.trim() ? rawJson : rawJsonText;
    let payload: unknown = records;
    let syntaxWarnings: string[] = [];

    if (typeof rawStr === 'string' && rawStr.trim()) {
      const parsedRes = parseJsonPayloadWithSyntaxCheck(rawStr);
      if (!parsedRes.ok) {
        return res.status(400).json({
          success: false,
          error: parsedRes.error || 'Invalid JSON syntax.'
        });
      }
      payload = parsedRes.payload;
      syntaxWarnings = parsedRes.syntaxWarnings;
    }

    const preview = buildCatalogImportPreview(payload, syntaxWarnings);
    return res.status(200).json({
      success: true,
      preview,
      summary: preview
    });
  } catch (error) {
    console.error('[Subject Catalog] Preview import error:', error);
    return res.status(500).json({ success: false, error: 'Failed to generate catalog import preview.' });
  }
});

/**
 * 11E. ADMIN ONLY: CONFIRM & EXECUTE CATALOG IMPORT (`POST /api/admin/catalog/import`)
 * - Requires explicit `confirmed: true`
 * - Idempotent: importing the same file again does not create duplicate records (`unchangedCount` tracked)
 * - Preserves both 8th-semester entries sharing a subject code ("Industrial Attachment" and "Project Presentation")
 * - Never overwrites existing `'verified'` records with `'provisional'` or `'unverified'` records
 */
app.post('/api/admin/catalog/import', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const adminSession: ServerSession = (req as any).adminSession;
    const { records, rawJson, rawJsonText, confirmed, sourceName, sourceFileName } = req.body;
    const finalSourceName = sourceName || sourceFileName || 'admin_json_import.json';

    if (confirmed !== true) {
      return res.status(400).json({
        success: false,
        error: 'Explicit administrator confirmation (confirmed: true) is required after reviewing the import preview.'
      });
    }

    const rawStr = typeof rawJson === 'string' && rawJson.trim() ? rawJson : rawJsonText;
    let payload: unknown = records;
    let syntaxWarnings: string[] = [];

    if (typeof rawStr === 'string' && rawStr.trim()) {
      const parsedRes = parseJsonPayloadWithSyntaxCheck(rawStr);
      if (!parsedRes.ok) {
        return res.status(400).json({
          success: false,
          error: parsedRes.error || 'Invalid JSON syntax.'
        });
      }
      payload = parsedRes.payload;
      syntaxWarnings = parsedRes.syntaxWarnings;
    }

    const preview = buildCatalogImportPreview(payload, syntaxWarnings);
    if (!preview.valid) {
      return res.status(400).json({
        success: false,
        error: 'Import payload contains no valid subject catalog records.',
        preview,
        summary: preview
      });
    }

    const extracted = extractRawCatalogItemsFromPayload(payload);
    const arr = extracted.items;

    // Count code occurrences within payload to know whether a code is a legitimate 8th-sem pair vs single code
    const batchCodeCounts = new Map<string, number>();
    const validatedItems: Omit<SubjectCatalogRecord, 'id'>[] = [];
    for (let i = 0; i < arr.length; i++) {
      const validated = validateAndNormalizeCatalogRecord(arr[i], i);
      if (!validated.valid) continue;
      const rec = validated.record;
      validatedItems.push(rec);
      const codeKey = `${rec.technology_key}|${rec.regulation}|${rec.semester}|${rec.subject_code.trim().toLowerCase()}`;
      batchCodeCounts.set(codeKey, (batchCodeCounts.get(codeKey) || 0) + 1);
    }

    const now = new Date().toISOString();
    const actor = `${adminSession.name} (${adminSession.email})`;

    let insertedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    let skippedVerifiedCount = 0;
    const seenCompositeInBatch = new Set<string>();

    for (let i = 0; i < validatedItems.length; i++) {
      const incoming = validatedItems[i];
      const compKey = buildCatalogCompositeKey(incoming);

      if (seenCompositeInBatch.has(compKey)) {
        // Exact duplicate (same code AND same name in same semester) in payload -> skip idempotently
        unchangedCount++;
        continue;
      }
      seenCompositeInBatch.add(compKey);

      const codeKey = `${incoming.technology_key}|${incoming.regulation}|${incoming.semester}|${incoming.subject_code.trim().toLowerCase()}`;
      const isMultiNameCodeInBatch = (batchCodeCounts.get(codeKey) || 1) > 1;

      // 1. Look for exact composite match (technology_key, regulation, semester, subject_code, subject_name)
      let existingIdx = subjectCatalogStore.records.findIndex(
        (r) => buildCatalogCompositeKey(r) === compKey
      );

      // 2. If not found by exact name and this code only appears once in the batch & once in the store, match by code
      if (existingIdx === -1 && !isMultiNameCodeInBatch) {
        const sameCodeIndices = subjectCatalogStore.records
          .map((r, idx) => ({ r, idx }))
          .filter(
            ({ r }) =>
              r.technology_key === incoming.technology_key &&
              r.regulation === incoming.regulation &&
              r.semester === incoming.semester &&
              r.subject_code.trim().toLowerCase() === incoming.subject_code.trim().toLowerCase()
          );

        if (sameCodeIndices.length === 1) {
          existingIdx = sameCodeIndices[0].idx;
        } else if (sameCodeIndices.some(({ r }) => r.verification_status === 'verified') && incoming.verification_status !== 'verified') {
          skippedVerifiedCount++;
          continue;
        }
      }

      if (existingIdx === -1) {
        subjectCatalogStore.records.push({
          id: buildCatalogRecordId(incoming),
          ...incoming,
          created_at: now,
          updated_at: now,
          updated_by: actor
        });
        insertedCount++;
      } else {
        const existing = subjectCatalogStore.records[existingIdx];
        // CRITICAL PROTECTION: Never overwrite an existing 'verified' record with a 'provisional' or 'unverified' record!
        if (existing.verification_status === 'verified' && incoming.verification_status !== 'verified') {
          skippedVerifiedCount++;
          continue;
        }

        if (areCatalogRecordsIdentical(existing, incoming)) {
          unchangedCount++;
          continue;
        }

        subjectCatalogStore.records[existingIdx] = {
          ...existing,
          subject_name: incoming.subject_name,
          department_code: incoming.department_code ?? existing.department_code,
          subject_type: incoming.subject_type ?? existing.subject_type,
          marks: incoming.marks ?? existing.marks,
          credits: incoming.credits ?? existing.credits,
          theory_per_week: incoming.theory_per_week ?? existing.theory_per_week,
          practical_per_week: incoming.practical_per_week ?? existing.practical_per_week,
          source_url: incoming.source_url ?? existing.source_url,
          source_file: incoming.source_file ?? existing.source_file,
          verification_status: incoming.verification_status,
          notes: incoming.notes ?? existing.notes,
          is_active: incoming.is_active,
          updated_at: now,
          updated_by: actor
        };
        updatedCount++;
      }
    }

    const auditEntry: CatalogImportAuditLog = {
      id: `cat_audit_${Date.now()}`,
      importedBy: actor,
      importedAt: now,
      sourceName: String(finalSourceName),
      totalSubmitted: arr.length,
      insertedCount,
      updatedCount,
      unchangedCount,
      skippedVerifiedCount,
      duplicateWarningsCount: preview.duplicateCodes.length
    };

    subjectCatalogStore.importAuditLogs.unshift(auditEntry);
    saveCatalogStore(subjectCatalogStore);

    return res.status(200).json({
      success: true,
      message: `Catalog import complete: ${insertedCount} inserted, ${updatedCount} updated, ${unchangedCount} unchanged (idempotent), ${skippedVerifiedCount} verified records protected.`,
      insertedCount,
      updatedCount,
      unchangedCount,
      skippedVerifiedCount,
      auditEntry,
      preview,
      summary: preview
    });
  } catch (error) {
    console.error('[Subject Catalog] Import error:', error);
    return res.status(500).json({ success: false, error: 'Failed to import catalog records.' });
  }
});

/**
 * 11F. ADMIN ONLY: CREATE SINGLE CATALOG RECORD (`POST /api/admin/catalog/records`)
 */
app.post('/api/admin/catalog/records', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const adminSession: ServerSession = (req as any).adminSession;
    const validated = validateAndNormalizeCatalogRecord(req.body || {}, 0);
    if (!validated.valid) {
      return res.status(400).json({ success: false, error: validated.reason });
    }

    const rec = validated.record;
    const duplicate = subjectCatalogStore.records.find(
      (r) =>
        r.technology_key === rec.technology_key &&
        r.regulation === rec.regulation &&
        r.semester === rec.semester &&
        r.subject_code.toLowerCase() === rec.subject_code.toLowerCase() &&
        r.subject_name.trim().toLowerCase() === rec.subject_name.trim().toLowerCase()
    );

    if (duplicate) {
      return res.status(409).json({
        success: false,
        error: `Duplicate subject record: "${rec.subject_name} (${rec.subject_code})" already exists for ${rec.technology} (${rec.regulation} Regulation, Semester ${rec.semester}). Update the existing record instead.`
      });
    }

    const now = new Date().toISOString();
    const newRecord: SubjectCatalogRecord = {
      id: `${buildCatalogRecordId(rec)}_${Date.now()}`,
      ...rec,
      created_at: now,
      updated_at: now,
      updated_by: `${adminSession.name} (${adminSession.email})`
    };

    subjectCatalogStore.records.push(newRecord);
    saveCatalogStore(subjectCatalogStore);

    return res.status(201).json({
      success: true,
      message: `Subject "${newRecord.subject_name} (${newRecord.subject_code})" added to central catalog.`,
      record: newRecord
    });
  } catch (error) {
    console.error('[Subject Catalog] Create record error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create catalog record.' });
  }
});

/**
 * 11G. ADMIN ONLY: UPDATE / APPROVE / DEACTIVATE CATALOG RECORD (`PUT /api/admin/catalog/records/:id`)
 */
app.put('/api/admin/catalog/records/:id', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const adminSession: ServerSession = (req as any).adminSession;
    const { id } = req.params;
    const idx = subjectCatalogStore.records.findIndex((r) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Catalog record not found.' });
    }

    const existing = subjectCatalogStore.records[idx];
    const updates = req.body || {};

    // Prevent downgrading a verified record to provisional unless forceDowngrade is explicitly set by admin
    if (
      existing.verification_status === 'verified' &&
      updates.verification_status &&
      updates.verification_status !== 'verified' &&
      updates.forceDowngrade !== true
    ) {
      return res.status(409).json({
        success: false,
        error: 'Protection Warning: Cannot downgrade a verified record to provisional/unverified without explicit forceDowngrade confirmation.'
      });
    }

    const nextCode = updates.subject_code !== undefined ? String(updates.subject_code).trim() : existing.subject_code;
    const nextName = updates.subject_name !== undefined ? String(updates.subject_name).trim() : existing.subject_name;
    const nextSem = updates.semester !== undefined ? (Number(updates.semester) as SemesterNumber) : existing.semester;
    const nextReg = updates.regulation !== undefined ? (String(updates.regulation) as CatalogRegulation) : existing.regulation;
    const nextTechObj = updates.technology_key || updates.technology
      ? findExactTechnology(String(updates.technology_key || updates.technology))
      : null;
    const nextTechKey = nextTechObj ? nextTechObj.id : existing.technology_key;
    const nextTechName = nextTechObj ? nextTechObj.name : existing.technology;

    const conflicting = subjectCatalogStore.records.find(
      (r) =>
        r.id !== id &&
        r.technology_key === nextTechKey &&
        r.regulation === nextReg &&
        r.semester === nextSem &&
        r.subject_code.toLowerCase() === nextCode.toLowerCase() &&
        r.subject_name.trim().toLowerCase() === nextName.toLowerCase()
    );
    if (conflicting) {
      return res.status(409).json({
        success: false,
        error: `Conflict: Subject "${nextName} (${nextCode})" already exists in ${nextTechName} (${nextReg} Regulation, Semester ${nextSem}).`
      });
    }

    const updated: SubjectCatalogRecord = {
      ...existing,
      technology_key: nextTechKey,
      technology: nextTechName,
      regulation: nextReg,
      semester: nextSem,
      subject_code: nextCode,
      subject_name: nextName,
      subject_type: updates.subject_type !== undefined ? (updates.subject_type ? String(updates.subject_type).trim() : null) : existing.subject_type,
      marks: updates.marks !== undefined ? (updates.marks === '' || updates.marks === null ? null : Number.isFinite(Number(updates.marks)) ? Number(updates.marks) : String(updates.marks)) : existing.marks,
      credits: updates.credits !== undefined ? (updates.credits === '' || updates.credits === null ? null : Number(updates.credits)) : existing.credits,
      theory_per_week: updates.theory_per_week !== undefined ? (updates.theory_per_week === '' || updates.theory_per_week === null ? null : Number(updates.theory_per_week)) : existing.theory_per_week,
      practical_per_week: updates.practical_per_week !== undefined ? (updates.practical_per_week === '' || updates.practical_per_week === null ? null : Number(updates.practical_per_week)) : existing.practical_per_week,
      source_url: updates.source_url !== undefined ? (updates.source_url ? String(updates.source_url).trim() : null) : existing.source_url,
      verification_status: updates.verification_status !== undefined ? updates.verification_status : existing.verification_status,
      notes: updates.notes !== undefined ? (updates.notes ? String(updates.notes).trim() : null) : existing.notes,
      is_active: updates.is_active !== undefined ? Boolean(updates.is_active) : existing.is_active,
      updated_at: new Date().toISOString(),
      updated_by: `${adminSession.name} (${adminSession.email})`
    };

    subjectCatalogStore.records[idx] = updated;
    saveCatalogStore(subjectCatalogStore);

    return res.status(200).json({
      success: true,
      message: `Catalog record "${updated.subject_name} (${updated.subject_code})" updated.`,
      record: updated
    });
  } catch (error) {
    console.error('[Subject Catalog] Update record error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update catalog record.' });
  }
});

/**
 * ============================================================================
 * 12. CONFIGURABLE PERIOD & SHIFT SCHEDULE MANAGEMENT API
 * ============================================================================
 * - Separate Morning Shift (08:00 AM default) and Day Shift (01:30 PM default)
 * - Default period duration: 45 minutes (configurable, not a restriction)
 * - Preserves manually edited period start/end times (`isManuallyEdited: true`)
 *   unless explicitly reset by the user
 * - Never overwrites opposite shift settings or existing saved routines
 */
app.get('/api/schedule-config', (req: Request, res: Response) => {
  try {
    const scopeKey = String(req.query.scopeKey || 'default').trim() || 'default';
    const requestedShift = req.query.shift ? (String(req.query.shift) as Shift) : null;

    const morningKey = buildShiftScheduleKey('Morning', scopeKey);
    const dayKey = buildShiftScheduleKey('Day', scopeKey);

    if (!academicStore.shiftSchedules[morningKey]) {
      academicStore.shiftSchedules[morningKey] = buildDefaultShiftScheduleConfig('Morning', { scopeKey });
    }
    if (!academicStore.shiftSchedules[dayKey]) {
      academicStore.shiftSchedules[dayKey] = buildDefaultShiftScheduleConfig('Day', { scopeKey });
    }

    if (requestedShift === 'Morning' || requestedShift === 'Day') {
      const key = buildShiftScheduleKey(requestedShift, scopeKey);
      return res.status(200).json({
        success: true,
        shift: requestedShift,
        scopeKey,
        schedule: academicStore.shiftSchedules[key],
        schedules: {
          Morning: academicStore.shiftSchedules[morningKey],
          Day: academicStore.shiftSchedules[dayKey]
        }
      });
    }

    return res.status(200).json({
      success: true,
      scopeKey,
      schedules: {
        Morning: academicStore.shiftSchedules[morningKey],
        Day: academicStore.shiftSchedules[dayKey]
      }
    });
  } catch (err) {
    console.error('[Schedule Config] GET error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load shift schedule configuration.' });
  }
});

app.put('/api/schedule-config', requireAdminOrTeacher, (req: Request, res: Response) => {
  try {
    const session = (req as unknown as { session: ServerSession }).session;
    const body = req.body || {};
    const shift: Shift = body.shift === 'Day' ? 'Day' : 'Morning';
    const scopeKey = String(body.scopeKey || 'default').trim() || 'default';
    const key = buildShiftScheduleKey(shift, scopeKey);

    const existing =
      academicStore.shiftSchedules[key] ||
      buildDefaultShiftScheduleConfig(shift, { scopeKey });

    const firstPeriodStartTime =
      typeof body.firstPeriodStartTime === 'string' && body.firstPeriodStartTime.trim()
        ? body.firstPeriodStartTime.trim()
        : existing.firstPeriodStartTime || SHIFT_DEFAULT_START_TIME[shift];

    const rawDuration = Number(body.defaultDurationMinutes ?? existing.defaultDurationMinutes ?? DEFAULT_PERIOD_DURATION_MINUTES);
    const defaultDurationMinutes = Number.isFinite(rawDuration) && rawDuration >= 5 && rawDuration <= 300
      ? Math.round(rawDuration)
      : DEFAULT_PERIOD_DURATION_MINUTES;

    const rawCount = Number(body.numberOfPeriods ?? existing.numberOfPeriods ?? 7);
    const numberOfPeriods = Number.isFinite(rawCount) && rawCount >= 1 && rawCount <= 12
      ? Math.round(rawCount)
      : 7;

    const breaks: PeriodBreakConfig[] = Array.isArray(body.breaks)
      ? body.breaks
          .map((b: any) => ({
            afterPeriodNumber: Number(b.afterPeriodNumber),
            durationMinutes: Math.max(0, Math.min(180, Math.round(Number(b.durationMinutes) || 0))),
            label: b.label ? String(b.label).trim() : undefined
          }))
          .filter((b: PeriodBreakConfig) => typeof b.afterPeriodNumber === 'number' && Number.isFinite(b.afterPeriodNumber) && b.afterPeriodNumber >= 1 && b.durationMinutes > 0)
      : existing.breaks || [];

    const incomingPeriods: PeriodSlotConfig[] = Array.isArray(body.periods)
      ? body.periods
      : existing.periods;

    // Recalculate suggested times while strictly preserving any period with isManuallyEdited === true
    const recalculatedPeriods = recalculateShiftSchedulePeriods({
      firstPeriodStartTime,
      defaultDurationMinutes,
      numberOfPeriods,
      existingPeriods: incomingPeriods,
      breaks,
      forceResetAllManual: Boolean(body.forceResetAllManual)
    });

    const updatedConfig: ShiftScheduleConfig = {
      id: existing.id || `sched_${shift.toLowerCase()}_${scopeKey}`,
      shift,
      scopeKey,
      college: body.college ?? existing.college,
      department: body.department ?? existing.department,
      semester: body.semester !== undefined ? Number(body.semester) : existing.semester,
      section: body.section ?? existing.section,
      firstPeriodStartTime,
      defaultDurationMinutes,
      numberOfPeriods,
      periods: recalculatedPeriods,
      breaks,
      updatedAt: new Date().toISOString(),
      // updatedBy is derived from the authenticated session only — a
      // body-supplied value must not be able to impersonate anyone.
      updatedBy: `${session.name} (${session.role})`
    };

    academicStore.shiftSchedules[key] = updatedConfig;
    saveAcademicStore(academicStore);

    const oppositeShift: Shift = shift === 'Morning' ? 'Day' : 'Morning';
    const oppositeKey = buildShiftScheduleKey(oppositeShift, scopeKey);
    if (!academicStore.shiftSchedules[oppositeKey]) {
      academicStore.shiftSchedules[oppositeKey] = buildDefaultShiftScheduleConfig(oppositeShift, { scopeKey });
    }

    return res.status(200).json({
      success: true,
      message: `${shift} Shift schedule configuration saved.`,
      schedule: updatedConfig,
      schedules: {
        Morning: shift === 'Morning' ? updatedConfig : academicStore.shiftSchedules[oppositeKey],
        Day: shift === 'Day' ? updatedConfig : academicStore.shiftSchedules[oppositeKey]
      }
    });
  } catch (err) {
    console.error('[Schedule Config] PUT error:', err);
    return res.status(500).json({ success: false, error: 'Failed to save shift schedule configuration.' });
  }
});

app.post('/api/schedule-config/reset', requireAdminOrTeacher, (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const shift: Shift = body.shift === 'Day' ? 'Day' : 'Morning';
    const scopeKey = String(body.scopeKey || 'default').trim() || 'default';
    const periodNumber = body.periodNumber !== undefined ? Number(body.periodNumber) : null;
    const key = buildShiftScheduleKey(shift, scopeKey);

    const existing =
      academicStore.shiftSchedules[key] ||
      buildDefaultShiftScheduleConfig(shift, { scopeKey });

    let updatedConfig: ShiftScheduleConfig;
    if (periodNumber && Number.isFinite(periodNumber) && periodNumber >= 1) {
      updatedConfig = resetSinglePeriodToSuggested(existing, periodNumber);
    } else {
      updatedConfig = buildDefaultShiftScheduleConfig(shift, {
        scopeKey,
        college: existing.college,
        department: existing.department,
        semester: existing.semester,
        section: existing.section
      });
    }

    academicStore.shiftSchedules[key] = updatedConfig;
    saveAcademicStore(academicStore);

    const oppositeShift: Shift = shift === 'Morning' ? 'Day' : 'Morning';
    const oppositeKey = buildShiftScheduleKey(oppositeShift, scopeKey);
    if (!academicStore.shiftSchedules[oppositeKey]) {
      academicStore.shiftSchedules[oppositeKey] = buildDefaultShiftScheduleConfig(oppositeShift, { scopeKey });
    }

    return res.status(200).json({
      success: true,
      message: periodNumber
        ? `Period ${periodNumber} reset to suggested timing.`
        : `${shift} Shift schedule reset to defaults (${SHIFT_DEFAULT_START_TIME[shift]}, ${DEFAULT_PERIOD_DURATION_MINUTES} min).`,
      schedule: updatedConfig,
      schedules: {
        Morning: shift === 'Morning' ? updatedConfig : academicStore.shiftSchedules[oppositeKey],
        Day: shift === 'Day' ? updatedConfig : academicStore.shiftSchedules[oppositeKey]
      }
    });
  } catch (err) {
    console.error('[Schedule Config] POST reset error:', err);
    return res.status(500).json({ success: false, error: 'Failed to reset shift schedule configuration.' });
  }
});

/**
 * ============================================================================
 * 13. MY SEMESTER GPA / CGPA CALCULATOR SAVED RESULTS API
 * ============================================================================
 * - Allows authenticated users (Students, Class Captains, Teachers) to save
 *   and edit their own semester calculator marks & GPA results
 * - Enforces strict user privacy: users can ONLY read, save, or delete their
 *   own saved records (`ownerUserId === session.userId`)
 */
app.get('/api/my-semester-results', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required: Please sign in to access saved semester GPA results.'
      });
    }

    const requestedOwnerId = req.query.ownerUserId ? String(req.query.ownerUserId).trim() : session.userId;
    if (requestedOwnerId !== session.userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden (Data Privacy): You may only view your own saved semester results.'
      });
    }

    const records = (academicStore.savedSemesterCalculatorRecords || []).filter(
      (r) => r.ownerUserId === session.userId
    );

    return res.status(200).json({
      success: true,
      ownerUserId: session.userId,
      records
    });
  } catch (err) {
    console.error('[My Semester Results] GET error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load saved semester results.' });
  }
});

app.put('/api/my-semester-results', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required: Please sign in to save your semester GPA results.'
      });
    }

    const body = req.body || {};
    if (body.ownerUserId && String(body.ownerUserId).trim() !== session.userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden (Data Privacy): You cannot modify or overwrite another user\'s semester results.'
      });
    }

    const technology = String(body.technology || '').trim();
    const regulation = (String(body.regulation || '2022').trim() as CalculatorRegulation);
    const semester = Number(body.semester) as SemesterNumber;

    if (!technology || !Number.isFinite(semester) || semester < 1 || semester > 8) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: Department/Technology, Regulation, and valid Semester (1-8) are required.'
      });
    }

    const matchedTech = matchCanonicalTechnology(technology);
    const technologyKey = matchedTech ? matchedTech.id : String(body.technologyKey || technology);
    const canonicalTechName = matchedTech ? matchedTech.name : technology;

    const subjectEntries: SubjectMarkInputEntry[] = Array.isArray(body.subjectEntries)
      ? body.subjectEntries
      : [];

    const existingIdx = academicStore.savedSemesterCalculatorRecords.findIndex(
      (r) =>
        r.ownerUserId === session.userId &&
        (r.technologyKey === technologyKey || r.technology === canonicalTechName) &&
        r.regulation === regulation &&
        r.semester === semester
    );

    const recordId =
      existingIdx >= 0
        ? academicStore.savedSemesterCalculatorRecords[existingIdx].id
        : `sem_calc_${session.userId}_${technologyKey}_${regulation}_s${semester}`;

    const savedRecord: SavedSemesterCalculatorRecord = {
      id: recordId,
      ownerUserId: session.userId,
      ownerName: session.name,
      ownerRole: session.role,
      boardRoll: session.boardRoll || body.boardRoll,
      college: session.college || body.college,
      technology: canonicalTechName,
      technologyKey,
      regulation,
      semester,
      subjectEntries,
      calculatedGpa: body.calculatedGpa !== undefined && body.calculatedGpa !== null ? Number(body.calculatedGpa) : null,
      totalCreditsCounted: Number(body.totalCreditsCounted || 0),
      totalSubjectsCounted: Number(body.totalSubjectsCounted || 0),
      hasFailedSubject: Boolean(body.hasFailedSubject),
      isEstimate: Boolean(body.isEstimate),
      estimateReasons: Array.isArray(body.estimateReasons) ? body.estimateReasons : [],
      manualGpaOverride:
        body.manualGpaOverride !== undefined && body.manualGpaOverride !== null && body.manualGpaOverride !== ''
          ? Number(body.manualGpaOverride)
          : null,
      updatedAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      academicStore.savedSemesterCalculatorRecords[existingIdx] = savedRecord;
    } else {
      academicStore.savedSemesterCalculatorRecords.push(savedRecord);
    }

    saveAcademicStore(academicStore);

    const userRecords = academicStore.savedSemesterCalculatorRecords.filter(
      (r) => r.ownerUserId === session.userId
    );

    return res.status(200).json({
      success: true,
      message: `Semester ${semester} (${canonicalTechName} - ${regulation}) GPA record saved.`,
      record: savedRecord,
      records: userRecords
    });
  } catch (err) {
    console.error('[My Semester Results] PUT error:', err);
    return res.status(500).json({ success: false, error: 'Failed to save semester GPA record.' });
  }
});

app.delete('/api/my-semester-results/:id', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required: Please sign in to delete a saved semester result.'
      });
    }

    const { id } = req.params;
    const idx = academicStore.savedSemesterCalculatorRecords.findIndex((r) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: 'Saved semester result not found.'
      });
    }

    const target = academicStore.savedSemesterCalculatorRecords[idx];
    if (target.ownerUserId !== session.userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden (Data Privacy): You cannot delete another user\'s saved semester result.'
      });
    }

    academicStore.savedSemesterCalculatorRecords.splice(idx, 1);
    saveAcademicStore(academicStore);

    return res.status(200).json({
      success: true,
      message: `Deleted saved result for Semester ${target.semester}.`,
      records: academicStore.savedSemesterCalculatorRecords.filter((r) => r.ownerUserId === session.userId)
    });
  } catch (err) {
    console.error('[My Semester Results] DELETE error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete saved semester result.' });
  }
});

/**
 * ============================================================================
 * 14. CLASS ROUTINE VISIBILITY, ACADEMIC GROUP ISOLATION & CAPTAIN PUBLISHING
 * ============================================================================
 * - Every routine is associated with an explicit canonical academic group:
 *   `college_id`, `department_id` (`technology_id`), `regulation`, `semester`,
 *   `section`, `shift`, `created_by`, `publication_status`, `created_at`, `updated_at`.
 * - Students ONLY see routines with `publication_status === 'published'` that
 *   strictly match their `college_id`, `department_id`, and `semester` (plus
 *   `shift`, `section`, and `regulation` where applicable).
 * - Never falls back to an unfiltered global routine list.
 * - Class Captains can ONLY publish/modify routines for the exact academic group
 *   they are server-verified to manage (max 2 Approved captains per group).
 * - Direct-ID endpoint (`GET /api/routines/:id`) blocks cross-cohort access with HTTP 403.
 * - Legacy/ambiguous routines without valid targeting are quarantined with
 *   `publication_status: 'needs_admin_review'` and hidden from students.
 */

interface ResolvedAcademicGroup {
  college_id: string;
  college: string;
  department_id: string;
  technology_id: string;
  department: string;
  semester: SemesterNumber;
  shift: Shift;
  section: Section;
  regulation: CatalogRegulation;
}

function resolveExplicitAcademicGroupInput(input: {
  college_id?: string | null;
  collegeId?: string | null;
  college?: string | null;
  department_id?: string | null;
  departmentId?: string | null;
  technology_id?: string | null;
  technologyId?: string | null;
  department?: string | null;
  technology?: string | null;
  semester?: number | string | null;
  shift?: string | null;
  section?: string | null;
  regulation?: string | null;
}): {
  valid: boolean;
  group?: ResolvedAcademicGroup;
  missingOrInvalidFields: string[];
} {
  const missing: string[] = [];
  const rawCol = input.college_id ?? input.collegeId ?? input.college ?? null;
  const rawDept =
    input.department_id ??
    input.departmentId ??
    input.technology_id ??
    input.technologyId ??
    input.department ??
    input.technology ??
    null;
  const rawSem =
    input.semester !== undefined && input.semester !== null && input.semester !== ''
      ? Number(input.semester)
      : null;

  const colItem = resolveStrictCollege(rawCol ? String(rawCol) : null);
  const deptItem = resolveStrictTechnology(rawDept ? String(rawDept) : null);
  const semValid =
    rawSem !== null && Number.isInteger(rawSem) && rawSem >= 1 && rawSem <= 8
      ? (rawSem as SemesterNumber)
      : null;

  if (!colItem) missing.push('college_id');
  if (!deptItem) missing.push('department_id');
  if (!semValid) missing.push('semester');

  if (!colItem || !deptItem || !semValid) {
    return { valid: false, missingOrInvalidFields: missing };
  }

  const shiftClean: Shift = input.shift === 'Day' ? 'Day' : 'Morning';
  const sectionClean: Section = (['A1', 'A2', 'B1', 'B2'].includes(String(input.section || 'A1'))
    ? String(input.section)
    : 'A1') as Section;
  const regClean: CatalogRegulation =
    input.regulation === '2016' || input.regulation === '2022' ? input.regulation : '2022';

  return {
    valid: true,
    missingOrInvalidFields: [],
    group: {
      college_id: colItem.id,
      college: colItem.name,
      department_id: deptItem.id,
      technology_id: deptItem.id,
      department: deptItem.name,
      semester: semValid,
      shift: shiftClean,
      section: sectionClean,
      regulation: regClean
    }
  };
}

/**
 * Resolves the authenticated caller's server-verified academic group from their session
 * and server-side records (`academicStore.captainRecords` / `academicStore.students`).
 */
function resolveSessionAcademicGroup(session: ServerSession): ResolvedAcademicGroup | null {
  if (session.role === 'class_captain') {
    const approvedRecord = academicStore.captainRecords.find(
      (c) =>
        c.status === 'Approved' &&
        (c.studentId === session.userId ||
          (session.boardRoll && c.boardRoll === session.boardRoll))
    );
    if (approvedRecord) {
      const resolved = resolveExplicitAcademicGroupInput({
        college: approvedRecord.college,
        department: approvedRecord.department,
        semester: approvedRecord.semester,
        shift: approvedRecord.shift,
        section: approvedRecord.section
      });
      if (resolved.valid && resolved.group) {
        return resolved.group;
      }
    }
  }

  // Also check enrolled student record on server if available
  const enrolledStudent = academicStore.students.find(
    (s) =>
      s.id === session.userId ||
      (session.boardRoll && s.boardRoll === session.boardRoll)
  );

  const rawCollege = session.college || enrolledStudent?.college || null;
  const rawDept = session.department || enrolledStudent?.department || null;
  const rawSem = session.semester ?? enrolledStudent?.semester ?? null;
  const rawShift = session.shift || enrolledStudent?.shift || 'Morning';
  const rawSection = session.section || enrolledStudent?.section || 'A1';

  const resolved = resolveExplicitAcademicGroupInput({
    college: rawCollege,
    department: rawDept,
    semester: rawSem,
    shift: rawShift,
    section: rawSection
  });

  return resolved.valid && resolved.group ? resolved.group : null;
}

/**
 * Helper: Count verified (`Approved`) Class Captains for an exact academic group.
 */
function getApprovedCaptainsForGroup(group: {
  college_id: string;
  department_id: string;
  semester: number;
  shift: Shift;
  section: Section;
}): CaptainRecord[] {
  return academicStore.captainRecords.filter((c) => {
    if (c.status !== 'Approved') return false;
    const cCol = resolveStrictCollege(c.college);
    const cDept = resolveStrictTechnology(c.department);
    if (!cCol || !cDept) return false;
    return (
      cCol.id === group.college_id &&
      cDept.id === group.department_id &&
      Number(c.semester) === Number(group.semester) &&
      c.shift === group.shift &&
      c.section === group.section
    );
  });
}

/**
 * Server-side authorization check for publishing, editing, or deleting a routine.
 * - Never trusts client-submitted `college_id`, `department_id`, or `semester` without
 *   verifying that the authenticated Captain or Teacher is authorized for that exact cohort.
 */
function checkRoutinePublishAuthorization(
  session: ServerSession | null,
  requestedGroupInput: {
    college_id?: string | null;
    collegeId?: string | null;
    college?: string | null;
    department_id?: string | null;
    departmentId?: string | null;
    technology_id?: string | null;
    technologyId?: string | null;
    department?: string | null;
    semester?: number | string | null;
    shift?: string | null;
    section?: string | null;
    regulation?: string | null;
  }
): {
  authorized: boolean;
  status: number;
  error?: string;
  verifiedGroup?: ResolvedAcademicGroup;
  publisherName?: string;
  publisherRole?: AccountType;
} {
  if (!session) {
    return {
      authorized: false,
      status: 401,
      error: 'Authentication Required: Please sign in to publish or modify class routines.'
    };
  }

  if (session.role === 'student') {
    return {
      authorized: false,
      status: 403,
      error: 'Forbidden: Student accounts have read-only access to class routines and cannot publish or modify routines.'
    };
  }

  // Validate that the requested target group is complete and unambiguous
  const resolvedTarget = resolveExplicitAcademicGroupInput(requestedGroupInput);
  if (!resolvedTarget.valid || !resolvedTarget.group) {
    return {
      authorized: false,
      status: 400,
      error: `Invalid Routine Target Group: Missing or unrecognized [${resolvedTarget.missingOrInvalidFields.join(', ')}]. Every routine must specify a valid college_id, department_id, and semester (1-8).`
    };
  }

  const targetGroup = resolvedTarget.group;

  if (session.role === 'class_captain') {
    // Look up server-verified CaptainRecord for this session user
    const captainRecord = academicStore.captainRecords.find(
      (c) =>
        c.status === 'Approved' &&
        (c.studentId === session.userId ||
          (session.boardRoll && c.boardRoll === session.boardRoll))
    );

    if (!captainRecord) {
      return {
        authorized: false,
        status: 403,
        error: 'Forbidden: Only verified Class Captains with an Approved verification status on the server can publish routines.'
      };
    }

    const captainGroupRes = resolveExplicitAcademicGroupInput({
      college: captainRecord.college,
      department: captainRecord.department,
      semester: captainRecord.semester,
      shift: captainRecord.shift,
      section: captainRecord.section,
      regulation: targetGroup.regulation
    });

    if (!captainGroupRes.valid || !captainGroupRes.group) {
      return {
        authorized: false,
        status: 403,
        error: 'Forbidden: Your Class Captain record has an incomplete academic group assignment.'
      };
    }

    const captainGroup = captainGroupRes.group;

    // Enforce exact college_id match
    if (targetGroup.college_id !== captainGroup.college_id) {
      return {
        authorized: false,
        status: 403,
        error: `Forbidden (College Scope Mismatch): You are authorized as Class Captain for "${captainGroup.college}" (${captainGroup.college_id}), not "${targetGroup.college}" (${targetGroup.college_id}).`
      };
    }

    // Enforce exact department_id match
    if (targetGroup.department_id !== captainGroup.department_id) {
      return {
        authorized: false,
        status: 403,
        error: `Forbidden (Department Scope Mismatch): You are authorized as Class Captain for "${captainGroup.department}" (${captainGroup.department_id}), not "${targetGroup.department}" (${targetGroup.department_id}).`
      };
    }

    // Enforce exact semester match
    if (Number(targetGroup.semester) !== Number(captainGroup.semester)) {
      return {
        authorized: false,
        status: 403,
        error: `Forbidden (Semester Scope Mismatch): You are authorized as Class Captain for Semester ${captainGroup.semester}, not Semester ${targetGroup.semester}.`
      };
    }

    // Enforce exact shift match
    if (targetGroup.shift !== captainGroup.shift) {
      return {
        authorized: false,
        status: 403,
        error: `Forbidden (Shift Scope Mismatch): You are authorized as Class Captain for ${captainGroup.shift} Shift, not ${targetGroup.shift} Shift.`
      };
    }

    // Enforce exact section match
    if (targetGroup.section !== captainGroup.section) {
      return {
        authorized: false,
        status: 403,
        error: `Forbidden (Section Scope Mismatch): You are authorized as Class Captain for Section ${captainGroup.section}, not Section ${targetGroup.section}.`
      };
    }

    // Verify the cohort has at most 2 Approved captains and this captain is one of the first 2
    const cohortCaptains = getApprovedCaptainsForGroup(captainGroup);
    const captainIndex = cohortCaptains.findIndex((c) => c.id === captainRecord.id);
    if (captainIndex < 0 || captainIndex >= 2) {
      return {
        authorized: false,
        status: 403,
        error: 'Forbidden: Maximum of 2 verified Class Captains per academic group exceeded.'
      };
    }

    return {
      authorized: true,
      status: 200,
      verifiedGroup: captainGroup,
      publisherName: captainRecord.studentName || session.name,
      publisherRole: 'class_captain'
    };
  }

  if (session.role === 'teacher') {
    const tchAuth = checkTeacherCohortAuthorization(session, {
      college: targetGroup.college,
      department: targetGroup.department,
      semester: targetGroup.semester,
      shift: targetGroup.shift,
      section: targetGroup.section
    });
    if (!tchAuth.authorized || !tchAuth.teacher) {
      return {
        authorized: false,
        status: tchAuth.status,
        error: tchAuth.error
      };
    }
    return {
      authorized: true,
      status: 200,
      verifiedGroup: targetGroup,
      publisherName: tchAuth.teacher.name,
      publisherRole: 'teacher'
    };
  }

  if (session.role === 'system_admin') {
    return {
      authorized: true,
      status: 200,
      verifiedGroup: targetGroup,
      publisherName: session.name,
      publisherRole: 'system_admin'
    };
  }

  return {
    authorized: false,
    status: 403,
    error: 'Forbidden: Unrecognized account role for routine publishing.'
  };
}

/**
 * Helper: Emit a cohort-isolated RoutineNotificationRecord when a routine is published.
 * Never notifies students outside `(college_id, department_id, semester, shift, section)`.
 */
function createScopedRoutineNotification(
  routine: RoutinePeriod,
  group: ResolvedAcademicGroup,
  publisherId: string,
  publisherName: string,
  customMessage?: string
): RoutineNotificationRecord {
  const notif: RoutineNotificationRecord = {
    id: `rnotif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    routineId: routine.id,
    title: `Class Routine Published: ${routine.subjectName} (${routine.subjectCode})`,
    message:
      customMessage ||
      `${routine.day} Period ${routine.periodNumber} (${routine.startTime} - ${routine.endTime}) · ${routine.room} [${group.department} · Sem ${group.semester} · ${group.shift} · Sec ${group.section}]`,
    college_id: group.college_id,
    college: group.college,
    department_id: group.department_id,
    technology_id: group.technology_id,
    department: group.department,
    regulation: group.regulation,
    semester: group.semester,
    shift: group.shift,
    section: group.section,
    created_by: publisherId,
    created_by_name: publisherName,
    created_at: new Date().toISOString()
  };
  academicStore.routineNotifications.unshift(notif);
  if (academicStore.routineNotifications.length > 200) {
    academicStore.routineNotifications = academicStore.routineNotifications.slice(0, 200);
  }
  return notif;
}

/**
 * 14A. GET ROUTINES FOR AUTHENTICATED USER'S ACADEMIC GROUP (`GET /api/routines`)
 * - Enforces strict backend filtering by `college_id`, `department_id`, `semester` (plus `shift`, `section`, `regulation`).
 * - Students ONLY receive `publication_status === 'published'` routines matching their exact group.
 * - Never returns an unfiltered global routine list as a fallback.
 */
app.get('/api/routines', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required: Please sign in to view your class routine.'
      });
    }

    const qCollege = req.query.college_id || req.query.collegeId || req.query.college;
    const qDept = req.query.department_id || req.query.departmentId || req.query.technology_id || req.query.department;
    const qSemester = req.query.semester !== undefined && req.query.semester !== '' ? Number(req.query.semester) : undefined;
    const qShift = req.query.shift ? String(req.query.shift) : undefined;
    const qSection = req.query.section ? String(req.query.section) : undefined;
    const qRegulation = req.query.regulation ? String(req.query.regulation) : undefined;
    const includeDrafts = req.query.includeDrafts === 'true';

    if (session.role === 'student' || session.role === 'class_captain') {
      const userGroup = resolveSessionAcademicGroup(session);
      if (!userGroup) {
        return res.status(200).json({
          success: true,
          routines: [],
          targetGroup: null,
          message: 'Your academic profile is missing a valid college, department, or semester.'
        });
      }

      // If client explicitly passed college, department, or semester filters, verify they match the user's enrolled profile!
      if (qCollege) {
        const reqCol = resolveStrictCollege(String(qCollege));
        if (!reqCol || reqCol.id !== userGroup.college_id) {
          return res.status(403).json({
            success: false,
            error: `Forbidden (College Isolation): You belong to "${userGroup.college}" (${userGroup.college_id}) and cannot query routines for another college.`
          });
        }
      }
      if (qDept) {
        const reqDept = resolveStrictTechnology(String(qDept));
        if (!reqDept || reqDept.id !== userGroup.department_id) {
          return res.status(403).json({
            success: false,
            error: `Forbidden (Department Isolation): You belong to "${userGroup.department}" (${userGroup.department_id}) and cannot query routines for another department.`
          });
        }
      }
      if (qSemester !== undefined && Number(qSemester) !== Number(userGroup.semester)) {
        return res.status(403).json({
          success: false,
          error: `Forbidden (Semester Isolation): You are enrolled in Semester ${userGroup.semester} and cannot query routines for Semester ${qSemester}.`
        });
      }

      const effectiveShift: Shift =
        qShift === 'Morning' || qShift === 'Day' ? qShift : userGroup.shift;
      const effectiveSection: Section =
        qSection && ['A1', 'A2', 'B1', 'B2'].includes(qSection)
          ? (qSection as Section)
          : userGroup.section;

      // For a student, shift and section must also match their profile unless they are viewing their own shift/section
      // Wait: if a student queries a different shift or section, should students only see their own shift/section?
      // Let's check requirement 2: "Also apply regulation, section, and shift filters when these fields are part of the existing routine and student profile targeting rules. Only published and active routines should be visible."
      const canSeeDrafts =
        includeDrafts &&
        session.role === 'class_captain' &&
        effectiveShift === userGroup.shift &&
        effectiveSection === userGroup.section;

      const filtered = academicStore.routines.filter((r) => {
        if (r.publication_status === 'needs_admin_review' || r.publication_status === 'archived') {
          return false;
        }
        if (r.publication_status === 'draft' && !canSeeDrafts) {
          return false;
        }
        if (r.publication_status !== 'published' && r.publication_status !== 'draft') {
          return false;
        }
        // Strict canonical ID match on college_id, department_id, and semester
        if (!r.college_id || !r.department_id || !r.semester) {
          return false;
        }
        if (r.college_id !== userGroup.college_id) return false;
        if (r.department_id !== userGroup.department_id) return false;
        if (Number(r.semester) !== Number(userGroup.semester)) return false;
        if (r.shift !== effectiveShift) return false;
        if (r.section !== effectiveSection) return false;
        if (qRegulation && r.regulation && r.regulation !== qRegulation) return false;
        return true;
      });

      return res.status(200).json({
        success: true,
        targetGroup: {
          ...userGroup,
          shift: effectiveShift,
          section: effectiveSection
        },
        routines: filtered
      });
    }

    if (session.role === 'teacher') {
      const teacher = serverTeachers.get(session.userId);
      if (!teacher) {
        return res.status(401).json({ success: false, error: 'Teacher record not found.' });
      }
      const targetCol = qCollege ? String(qCollege) : teacher.college;
      const targetDept = qDept ? String(qDept) : teacher.department;
      const targetSem = qSemester ?? (teacher.semestersTaught?.[0] || 6);
      const targetShift = qShift === 'Day' ? 'Day' : qShift === 'Morning' ? 'Morning' : (teacher.shift === 'Day' ? 'Day' : 'Morning');
      const targetSec = (qSection && ['A1', 'A2', 'B1', 'B2'].includes(qSection) ? qSection : (teacher.sectionsTaught?.[0] || 'A1')) as Section;

      const authCheck = checkTeacherCohortAuthorization(session, {
        college: targetCol,
        department: targetDept,
        semester: targetSem,
        shift: targetShift,
        section: targetSec
      });
      if (!authCheck.authorized) {
        return res.status(authCheck.status).json({
          success: false,
          error: authCheck.error
        });
      }

      const resolvedGroup = resolveExplicitAcademicGroupInput({
        college: targetCol,
        department: targetDept,
        semester: targetSem,
        shift: targetShift,
        section: targetSec,
        regulation: qRegulation ? String(qRegulation) : '2022'
      });

      if (!resolvedGroup.valid || !resolvedGroup.group) {
        return res.status(200).json({ success: true, routines: [], targetGroup: null });
      }

      const grp = resolvedGroup.group;
      const filtered = academicStore.routines.filter((r) => {
        if (r.publication_status === 'needs_admin_review' || r.publication_status === 'archived') return false;
        if (r.publication_status === 'draft' && !includeDrafts) return false;
        return (
          r.college_id === grp.college_id &&
          r.department_id === grp.department_id &&
          Number(r.semester) === Number(grp.semester) &&
          r.shift === grp.shift &&
          r.section === grp.section
        );
      });

      return res.status(200).json({
        success: true,
        targetGroup: grp,
        routines: filtered
      });
    }

    // system_admin querying a specific cohort
    const adminGroupRes = resolveExplicitAcademicGroupInput({
      college: qCollege ? String(qCollege) : 'clg_dhaka',
      department: qDept ? String(qDept) : 'tech_computer',
      semester: qSemester ?? 6,
      shift: qShift || 'Morning',
      section: qSection || 'A1',
      regulation: qRegulation ? String(qRegulation) : '2022'
    });

    if (!adminGroupRes.valid || !adminGroupRes.group) {
      return res.status(200).json({ success: true, routines: [], targetGroup: null });
    }

    const grp = adminGroupRes.group;
    const filtered = academicStore.routines.filter((r) => {
      if (r.publication_status === 'needs_admin_review' || r.publication_status === 'archived') return false;
      return (
        r.college_id === grp.college_id &&
        r.department_id === grp.department_id &&
        Number(r.semester) === Number(grp.semester) &&
        r.shift === grp.shift &&
        r.section === grp.section
      );
    });

    return res.status(200).json({
      success: true,
      targetGroup: grp,
      routines: filtered
    });
  } catch (err) {
    console.error('[Routines API] GET /api/routines error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load class routines.' });
  }
});

/**
 * 14B. GET routine notifications for the authenticated user's exact academic group
 * (`GET /api/routines/notifications`)
 * NOTE: Declared before `/api/routines/:id` so `notifications` is not matched as `:id`.
 */
app.get('/api/routines/notifications', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required: Please sign in to view routine notifications.'
      });
    }

    const userGroup = resolveSessionAcademicGroup(session);
    if (!userGroup) {
      return res.status(200).json({
        success: true,
        notifications: []
      });
    }

    const matchingNotifications = academicStore.routineNotifications.filter(
      (n) =>
        n.college_id === userGroup.college_id &&
        n.department_id === userGroup.department_id &&
        Number(n.semester) === Number(userGroup.semester) &&
        n.shift === userGroup.shift &&
        n.section === userGroup.section
    );

    return res.status(200).json({
      success: true,
      targetGroup: userGroup,
      notifications: matchingNotifications
    });
  } catch (err) {
    console.error('[Routines API] GET notifications error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load routine notifications.' });
  }
});

/**
 * 14C. GET SINGLE ROUTINE BY ID WITH STRICT ACADEMIC GROUP ACCESS CONTROL (`GET /api/routines/:id`)
 * - Prevents any student or captain from accessing another college, department, or semester's
 *   routine by guessing or requesting its routine ID directly (Scenario F).
 */
app.get('/api/routines/:id', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required: Please sign in to view routine details.'
      });
    }

    const { id } = req.params;
    const routine = academicStore.routines.find((r) => r.id === id);
    if (!routine) {
      return res.status(404).json({
        success: false,
        error: 'Routine record not found.'
      });
    }

    // Quarantined or archived routines are hidden from all non-admins
    if (
      (routine.publication_status === 'needs_admin_review' || routine.publication_status === 'archived') &&
      session.role !== 'system_admin'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: This routine is awaiting administrator review or is archived and is not visible to students.'
      });
    }

    if (session.role === 'student' || session.role === 'class_captain') {
      const userGroup = resolveSessionAcademicGroup(session);
      if (!userGroup) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Unable to verify your academic group for routine access.'
        });
      }

      if (
        routine.college_id !== userGroup.college_id ||
        routine.department_id !== userGroup.department_id ||
        Number(routine.semester) !== Number(userGroup.semester) ||
        routine.shift !== userGroup.shift ||
        routine.section !== userGroup.section
      ) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden (Direct ID Isolation): You are not authorized to access a routine belonging to another college, department, semester, shift, or section.'
        });
      }

      if (session.role === 'student' && routine.publication_status !== 'published') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Unpublished draft routines are not visible to students.'
        });
      }

      return res.status(200).json({
        success: true,
        routine
      });
    }

    if (session.role === 'teacher') {
      const authCheck = checkTeacherCohortAuthorization(session, {
        college: routine.college || routine.college_id || '',
        department: routine.department || routine.department_id || '',
        semester: Number(routine.semester),
        shift: routine.shift,
        section: routine.section
      });
      if (!authCheck.authorized) {
        return res.status(authCheck.status).json({
          success: false,
          error: authCheck.error
        });
      }
      return res.status(200).json({
        success: true,
        routine
      });
    }

    // system_admin
    return res.status(200).json({
      success: true,
      routine
    });
  } catch (err) {
    console.error('[Routines API] GET /api/routines/:id error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve routine record.' });
  }
});

/**
 * 14D. CREATE / PUBLISH A ROUTINE PERIOD (`POST /api/routines`)
 * - Validates the target academic group before publishing.
 * - Verifies Captain or Teacher server-side authorization for that exact group.
 * - Never trusts client-supplied `college_id`, `department_id`, or `semester` if they
 *   differ from the Captain's authorized academic group.
 */
app.post('/api/routines', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    const body = req.body || {};

    // If caller did not pass explicit group fields, default to their session group,
    // EXCEPT if caller explicitly passed college/department/semester we MUST validate
    // what they passed so cross-group tampering is rejected with HTTP 403!
    const callerSessionGroup = session ? resolveSessionAcademicGroup(session) : null;
    const requestedGroupInput = {
      college_id: body.college_id ?? body.collegeId ?? body.college ?? callerSessionGroup?.college_id,
      department_id:
        body.department_id ??
        body.departmentId ??
        body.technology_id ??
        body.technologyId ??
        body.department ??
        callerSessionGroup?.department_id,
      semester: body.semester !== undefined ? body.semester : callerSessionGroup?.semester,
      shift: body.shift ?? callerSessionGroup?.shift ?? 'Morning',
      section: body.section ?? callerSessionGroup?.section ?? 'A1',
      regulation: body.regulation ?? callerSessionGroup?.regulation ?? '2022'
    };

    const authCheck = checkRoutinePublishAuthorization(session, requestedGroupInput);
    if (!authCheck.authorized || !authCheck.verifiedGroup || !session) {
      return res.status(authCheck.status).json({
        success: false,
        error: authCheck.error
      });
    }

    const verifiedGroup = authCheck.verifiedGroup;

    const day = String(body.day || '').trim() as WeekDay;
    const periodNumber = Number(body.periodNumber);
    const startTime = String(body.startTime || '').trim();
    const endTime = String(body.endTime || '').trim();
    const subjectCode = String(body.subjectCode || '').trim();
    const subjectName = String(body.subjectName || '').trim();
    const teacherName = String(body.teacherName || 'Department Instructor').trim();
    const room = String(body.room || 'TBA').trim();
    const type: 'Theory' | 'Practical / Lab' =
      body.type === 'Practical / Lab' ? 'Practical / Lab' : 'Theory';
    const publicationStatus: RoutinePublicationStatus =
      body.publication_status === 'draft' ? 'draft' : 'published';

    if (
      !['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].includes(day) ||
      !Number.isFinite(periodNumber) ||
      periodNumber < 1 ||
      !startTime ||
      !endTime ||
      !subjectCode ||
      !subjectName
    ) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: day, periodNumber, startTime, endTime, subjectCode, and subjectName are required.'
      });
    }

    const nowIso = new Date().toISOString();
    const newRoutine: RoutinePeriod = {
      id: body.id ? String(body.id).trim() : `rt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      day,
      periodNumber,
      startTime,
      endTime,
      subjectCode,
      subjectName,
      teacherName,
      room,
      type,
      shift: verifiedGroup.shift,
      section: verifiedGroup.section,
      college_id: verifiedGroup.college_id,
      college: verifiedGroup.college,
      department_id: verifiedGroup.department_id,
      technology_id: verifiedGroup.technology_id,
      department: verifiedGroup.department,
      regulation: verifiedGroup.regulation,
      semester: verifiedGroup.semester,
      created_by: session.userId,
      created_by_name: authCheck.publisherName || session.name,
      created_by_role: authCheck.publisherRole || session.role,
      publication_status: publicationStatus,
      created_at: nowIso,
      updated_at: nowIso
    };

    academicStore.routines.push(newRoutine);

    let notification: RoutineNotificationRecord | null = null;
    if (publicationStatus === 'published') {
      notification = createScopedRoutineNotification(
        newRoutine,
        verifiedGroup,
        session.userId,
        authCheck.publisherName || session.name
      );
    }

    saveAcademicStore(academicStore);

    return res.status(201).json({
      success: true,
      message:
        publicationStatus === 'published'
          ? `Routine published for ${verifiedGroup.college} · ${verifiedGroup.department} · Semester ${verifiedGroup.semester} (${verifiedGroup.shift} · Sec ${verifiedGroup.section}).`
          : `Routine saved as draft for ${verifiedGroup.department} · Semester ${verifiedGroup.semester}.`,
      routine: newRoutine,
      notification
    });
  } catch (err) {
    console.error('[Routines API] POST /api/routines error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create routine period.' });
  }
});

/**
 * 14E. BATCH PUBLISH / REPLACE COHORT ROUTINE (`POST /api/routines/publish-batch`)
 * - Used when confirming OCR-extracted timetable periods or publishing all draft periods for a cohort.
 * - Strictly isolated to the verified academic group `(college_id, department_id, semester, shift, section)`.
 * - Never overwrites routines belonging to any other college, department, semester, shift, or section.
 */
app.post('/api/routines/publish-batch', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    const body = req.body || {};
    const callerSessionGroup = session ? resolveSessionAcademicGroup(session) : null;

    const requestedGroupInput = {
      college_id: body.college_id ?? body.collegeId ?? body.college ?? callerSessionGroup?.college_id,
      department_id:
        body.department_id ??
        body.departmentId ??
        body.technology_id ??
        body.technologyId ??
        body.department ??
        callerSessionGroup?.department_id,
      semester: body.semester !== undefined ? body.semester : callerSessionGroup?.semester,
      shift: body.shift ?? callerSessionGroup?.shift ?? 'Morning',
      section: body.section ?? callerSessionGroup?.section ?? 'A1',
      regulation: body.regulation ?? callerSessionGroup?.regulation ?? '2022'
    };

    const authCheck = checkRoutinePublishAuthorization(session, requestedGroupInput);
    if (!authCheck.authorized || !authCheck.verifiedGroup || !session) {
      return res.status(authCheck.status).json({
        success: false,
        error: authCheck.error
      });
    }

    const verifiedGroup = authCheck.verifiedGroup;
    const periodsInput: any[] = Array.isArray(body.periods) ? body.periods : [];
    if (periodsInput.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one routine period is required to publish a batch.'
      });
    }

    const replaceExistingForCohort = body.replaceExistingForCohort !== false;
    const publicationStatus: RoutinePublicationStatus =
      body.publication_status === 'draft' ? 'draft' : 'published';
    const nowIso = new Date().toISOString();

    const sanitizedPeriods: RoutinePeriod[] = periodsInput.map((p, idx) => ({
      id: p.id ? String(p.id).trim() : `rt_batch_${Date.now()}_${idx}`,
      day: (['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'].includes(String(p.day))
        ? String(p.day)
        : 'Saturday') as WeekDay,
      periodNumber: Number(p.periodNumber) || idx + 1,
      startTime: String(p.startTime || '08:00 AM').trim(),
      endTime: String(p.endTime || '08:45 AM').trim(),
      subjectCode: String(p.subjectCode || '').trim(),
      subjectName: String(p.subjectName || '').trim(),
      teacherName: String(p.teacherName || 'Department Instructor').trim(),
      room: String(p.room || 'TBA').trim(),
      type: p.type === 'Practical / Lab' ? 'Practical / Lab' : 'Theory',
      shift: verifiedGroup.shift,
      section: verifiedGroup.section,
      college_id: verifiedGroup.college_id,
      college: verifiedGroup.college,
      department_id: verifiedGroup.department_id,
      technology_id: verifiedGroup.technology_id,
      department: verifiedGroup.department,
      regulation: verifiedGroup.regulation,
      semester: verifiedGroup.semester,
      created_by: session.userId,
      created_by_name: authCheck.publisherName || session.name,
      created_by_role: authCheck.publisherRole || session.role,
      publication_status: publicationStatus,
      created_at: nowIso,
      updated_at: nowIso
    }));

    if (replaceExistingForCohort) {
      // Remove ONLY routines belonging to this exact (college_id, department_id, semester, shift, section)
      academicStore.routines = academicStore.routines.filter(
        (r) =>
          !(
            r.college_id === verifiedGroup.college_id &&
            r.department_id === verifiedGroup.department_id &&
            Number(r.semester) === Number(verifiedGroup.semester) &&
            r.shift === verifiedGroup.shift &&
            r.section === verifiedGroup.section
          )
      );
    }

    academicStore.routines.push(...sanitizedPeriods);

    let notification: RoutineNotificationRecord | null = null;
    if (publicationStatus === 'published' && sanitizedPeriods.length > 0) {
      notification = createScopedRoutineNotification(
        sanitizedPeriods[0],
        verifiedGroup,
        session.userId,
        authCheck.publisherName || session.name,
        `Published ${sanitizedPeriods.length} class period(s) for ${verifiedGroup.department} · Semester ${verifiedGroup.semester} (${verifiedGroup.shift} · Sec ${verifiedGroup.section}).`
      );
    }

    saveAcademicStore(academicStore);

    return res.status(200).json({
      success: true,
      message: `Published ${sanitizedPeriods.length} routine period(s) for ${verifiedGroup.college} · ${verifiedGroup.department} · Semester ${verifiedGroup.semester} (${verifiedGroup.shift} · Sec ${verifiedGroup.section}).`,
      routines: sanitizedPeriods,
      notification
    });
  } catch (err) {
    console.error('[Routines API] POST /api/routines/publish-batch error:', err);
    return res.status(500).json({ success: false, error: 'Failed to publish routine batch.' });
  }
});

/**
 * 14F. UPDATE AN EXISTING ROUTINE PERIOD (`PUT /api/routines/:id`)
 * - Verifies Captain/Teacher authorization against the existing routine's target group
 *   AND any updated target group fields.
 */
app.put('/api/routines/:id', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    const { id } = req.params;
    const body = req.body || {};

    const idx = academicStore.routines.findIndex((r) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: 'Routine period not found.'
      });
    }

    const existing = academicStore.routines[idx];

    // 1. Check authorization for the existing routine's group
    const existingAuth = checkRoutinePublishAuthorization(session, {
      college_id: existing.college_id || existing.college,
      department_id: existing.department_id || existing.department,
      semester: existing.semester,
      shift: existing.shift,
      section: existing.section,
      regulation: existing.regulation
    });
    if (!existingAuth.authorized || !existingAuth.verifiedGroup || !session) {
      return res.status(existingAuth.status).json({
        success: false,
        error: existingAuth.error
      });
    }

    // 2. If body attempts to change college, department, semester, shift, or section, validate authorization for that too
    const nextGroupAuth = checkRoutinePublishAuthorization(session, {
      college_id: body.college_id ?? body.collegeId ?? body.college ?? existing.college_id,
      department_id:
        body.department_id ??
        body.departmentId ??
        body.technology_id ??
        body.department ??
        existing.department_id,
      semester: body.semester !== undefined ? body.semester : existing.semester,
      shift: body.shift ?? existing.shift,
      section: body.section ?? existing.section,
      regulation: body.regulation ?? existing.regulation
    });
    if (!nextGroupAuth.authorized || !nextGroupAuth.verifiedGroup) {
      return res.status(nextGroupAuth.status).json({
        success: false,
        error: nextGroupAuth.error
      });
    }

    const verifiedGroup = nextGroupAuth.verifiedGroup;
    const nextStatus: RoutinePublicationStatus =
      body.publication_status === 'draft' ||
      body.publication_status === 'published' ||
      body.publication_status === 'archived'
        ? body.publication_status
        : existing.publication_status || 'published';

    const updatedRoutine: RoutinePeriod = {
      ...existing,
      day: body.day ? (String(body.day) as WeekDay) : existing.day,
      periodNumber: body.periodNumber !== undefined ? Number(body.periodNumber) : existing.periodNumber,
      startTime: body.startTime !== undefined ? String(body.startTime).trim() : existing.startTime,
      endTime: body.endTime !== undefined ? String(body.endTime).trim() : existing.endTime,
      subjectCode: body.subjectCode !== undefined ? String(body.subjectCode).trim() : existing.subjectCode,
      subjectName: body.subjectName !== undefined ? String(body.subjectName).trim() : existing.subjectName,
      teacherName: body.teacherName !== undefined ? String(body.teacherName).trim() : existing.teacherName,
      room: body.room !== undefined ? String(body.room).trim() : existing.room,
      type: body.type === 'Practical / Lab' || body.type === 'Theory' ? body.type : existing.type,
      shift: verifiedGroup.shift,
      section: verifiedGroup.section,
      college_id: verifiedGroup.college_id,
      college: verifiedGroup.college,
      department_id: verifiedGroup.department_id,
      technology_id: verifiedGroup.technology_id,
      department: verifiedGroup.department,
      regulation: verifiedGroup.regulation,
      semester: verifiedGroup.semester,
      publication_status: nextStatus,
      updated_at: new Date().toISOString()
    };

    academicStore.routines[idx] = updatedRoutine;

    let notification: RoutineNotificationRecord | null = null;
    if (existing.publication_status !== 'published' && nextStatus === 'published') {
      notification = createScopedRoutineNotification(
        updatedRoutine,
        verifiedGroup,
        session.userId,
        nextGroupAuth.publisherName || session.name
      );
    }

    saveAcademicStore(academicStore);

    return res.status(200).json({
      success: true,
      message: `Routine period updated for ${verifiedGroup.department} · Semester ${verifiedGroup.semester}.`,
      routine: updatedRoutine,
      notification
    });
  } catch (err) {
    console.error('[Routines API] PUT /api/routines/:id error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update routine period.' });
  }
});

/**
 * 14G. DELETE A ROUTINE PERIOD (`DELETE /api/routines/:id`)
 */
app.delete('/api/routines/:id', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    const { id } = req.params;

    const idx = academicStore.routines.findIndex((r) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({
        success: false,
        error: 'Routine period not found.'
      });
    }

    const existing = academicStore.routines[idx];
    const authCheck = checkRoutinePublishAuthorization(session, {
      college_id: existing.college_id || existing.college,
      department_id: existing.department_id || existing.department,
      semester: existing.semester,
      shift: existing.shift,
      section: existing.section,
      regulation: existing.regulation
    });

    if (!authCheck.authorized) {
      return res.status(authCheck.status).json({
        success: false,
        error: authCheck.error
      });
    }

    academicStore.routines.splice(idx, 1);
    saveAcademicStore(academicStore);

    return res.status(200).json({
      success: true,
      message: `Routine period "${existing.subjectName}" deleted.`
    });
  } catch (err) {
    console.error('[Routines API] DELETE /api/routines/:id error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete routine period.' });
  }
});

/**
 * 14H. CAPTAIN COHORT REGISTRATION / APPROVAL SYNC (`POST /api/captains/sync`)
 * - Synchronizes CaptainRecord state on the server and enforces the maximum of 2
 *   verified (`Approved`) Class Captains per `(college_id, department_id, semester, shift, section)`.
 */
app.post('/api/captains/sync', requireAuth, (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const recordInput = body.captainRecord || body;

    if (!recordInput || !recordInput.studentId || !recordInput.college || !recordInput.department || !recordInput.semester) {
      return res.status(400).json({
        success: false,
        error: 'studentId, college, department, and semester are required for captain record synchronization.'
      });
    }

    // Identity comes from the session only: a caller may only sync their
    // own captain record.
    const session = (req as unknown as { session: ServerSession }).session;
    if (String(recordInput.studentId) !== session.userId) {
      return res.status(403).json({ success: false, error: 'You can only sync your own captain record.' });
    }

    const groupRes = resolveExplicitAcademicGroupInput({
      college: recordInput.college,
      department: recordInput.department,
      semester: recordInput.semester,
      shift: recordInput.shift || 'Morning',
      section: recordInput.section || 'A1'
    });

    if (!groupRes.valid || !groupRes.group) {
      return res.status(400).json({
        success: false,
        error: `Invalid academic group for Captain record: [${groupRes.missingOrInvalidFields.join(', ')}].`
      });
    }

    const grp = groupRes.group;
    const existingIdx = academicStore.captainRecords.findIndex(
      c => c.isRegisteredAccount && (c.id === recordInput.id || c.studentId === recordInput.studentId)
    );

    if (recordInput.status === 'Approved') {
      const existingApproved = getApprovedCaptainsForGroup(grp).filter(
        (c) => c.id !== recordInput.id && c.studentId !== recordInput.studentId
      );
      if (existingApproved.length >= 2) {
        return res.status(409).json({
          success: false,
          error: `Captain Limit Reached: ${grp.college} · ${grp.department} · Semester ${grp.semester} (${grp.shift} · Sec ${grp.section}) already has the maximum of 2 verified Class Captains.`
        });
      }
    }

    // Teacher endorsements are NEVER trusted from the client. An incoming
    // endorsement is accepted only when the server already holds a matching
    // one — on the existing captain record or in the endorsement registry
    // (written by teacher-approve). Otherwise it is stripped, so a forged
    // endorsement cannot approve a captain. When the client sends no
    // endorsement, an existing server endorsement is kept, so the healing
    // sync cannot erase one.
    const incomingEndorsement = recordInput.teacherEndorsement;
    const existingEndorsement = existingIdx >= 0
      ? academicStore.captainRecords[existingIdx].teacherEndorsement
      : undefined;
    const registryEndorsement = (recordInput.id && academicStore.pendingTeacherEndorsements[String(recordInput.id)])
      || (existingIdx >= 0 ? academicStore.pendingTeacherEndorsements[academicStore.captainRecords[existingIdx].id] : undefined);
    const endorsementMatches = (candidate: unknown, reference: unknown): boolean => {
      if (!candidate || typeof candidate !== 'object' || !reference || typeof reference !== 'object') return false;
      const c = candidate as { teacherId?: unknown; endorsedAt?: unknown };
      const r = reference as { teacherId?: unknown; endorsedAt?: unknown };
      return c.teacherId === r.teacherId && c.endorsedAt === r.endorsedAt;
    };
    const trustedEndorsement = incomingEndorsement && (endorsementMatches(incomingEndorsement, existingEndorsement) || endorsementMatches(incomingEndorsement, registryEndorsement))
      ? incomingEndorsement
      : undefined;
    const teacherEndorsement = trustedEndorsement || existingEndorsement;

    const normalizedCaptain: CaptainRecord = {
      id: existingIdx >= 0
        ? academicStore.captainRecords[existingIdx].id
        : recordInput.id && !academicStore.captainRecords.some(c => c.id === String(recordInput.id))
          ? String(recordInput.id)
          : `app_cr_${crypto.randomUUID()}`,
      studentId: String(recordInput.studentId),
      studentName: String(recordInput.studentName || 'Class Captain').trim(),
      college: grp.college,
      department: grp.department,
      semester: grp.semester,
      shift: grp.shift,
      section: grp.section,
      boardRoll: String(recordInput.boardRoll || '').trim(),
      regNumber: String(recordInput.regNumber || '').trim(),
      phone: String(recordInput.phone || '').trim(),
      session: String(recordInput.session || '2021-2022').trim(),
      status: existingIdx >= 0 && academicStore.captainRecords[existingIdx].status === 'Approved' ? 'Approved' : 'Pending',
      appliedAt: String(recordInput.appliedAt || new Date().toISOString()),
      verificationFormUrl: recordInput.verificationFormUrl,
      verificationFormName: recordInput.verificationFormName,
      teacherEndorsement,
      adminDecision: existingIdx >= 0
        ? academicStore.captainRecords[existingIdx].adminDecision
        : undefined,
      rejectionReason: existingIdx >= 0
        ? academicStore.captainRecords[existingIdx].rejectionReason
        : undefined,
      isRegisteredAccount: true
    };

    const linkedStudent = academicStore.students.find(student => student.id === normalizedCaptain.studentId);
    if (linkedStudent) {
      if (
        (normalizedCaptain.boardRoll && linkedStudent.boardRoll !== normalizedCaptain.boardRoll) ||
        (normalizedCaptain.regNumber && linkedStudent.regNumber !== normalizedCaptain.regNumber)
      ) {
        return res.status(409).json({ success: false, error: 'Captain application credentials do not match the student account.' });
      }
      linkedStudent.isRegisteredAccount = true;
      if (linkedStudent.captainVerificationStatus !== 'Approved') {
        linkedStudent.accountType = 'class_captain';
        linkedStudent.captainVerificationStatus = 'Pending';
      }
    } else {
      const duplicateStudent = academicStore.students.find(student =>
        (normalizedCaptain.boardRoll && student.boardRoll === normalizedCaptain.boardRoll) ||
        (normalizedCaptain.regNumber && student.regNumber === normalizedCaptain.regNumber)
      );
      if (duplicateStudent) {
        return res.status(409).json({ success: false, error: 'Captain application roll or registration number belongs to another account.' });
      }
      if (!normalizedCaptain.boardRoll || !normalizedCaptain.regNumber) {
        return res.status(400).json({ success: false, error: 'Board roll and registration number are required to register this captain account.' });
      }
      academicStore.students.push({
        id: normalizedCaptain.studentId,
        name: normalizedCaptain.studentName,
        classRoll: normalizedCaptain.boardRoll.slice(-2),
        boardRoll: normalizedCaptain.boardRoll,
        regNumber: normalizedCaptain.regNumber,
        college: normalizedCaptain.college,
        department: normalizedCaptain.department,
        semester: normalizedCaptain.semester,
        shift: normalizedCaptain.shift,
        section: normalizedCaptain.section,
        phone: normalizedCaptain.phone || '',
        accountType: 'class_captain',
        captainVerificationStatus: 'Pending',
        attendanceRate: '',
        createdAt: normalizedCaptain.appliedAt,
        isRegisteredAccount: true
      });
    }

    if (existingIdx >= 0) {
      academicStore.captainRecords[existingIdx] = normalizedCaptain;
    } else {
      academicStore.captainRecords.push(normalizedCaptain);
    }

    saveAcademicStore(academicStore);

    return res.status(200).json({
      success: true,
      captainRecord: normalizedCaptain,
      cohortApprovedCount: getApprovedCaptainsForGroup(grp).length
    });
  } catch (err) {
    console.error('[Captains API] POST /api/captains/sync error:', err);
    return res.status(500).json({ success: false, error: 'Failed to sync captain record.' });
  }
});

/**
 * 14I. ADMIN ROUTINE MIGRATION & REVIEW QUEUE ENDPOINTS
 * - `GET /api/admin/routines/review-queue`: Lists routines with `publication_status === 'needs_admin_review'`
 * - `POST /api/admin/routines/migrate-legacy`: Runs `migrateAndValidateRoutineRecord` on legacy/untargeted
 *   records, quarantining any record with missing/ambiguous `college_id`, `department_id`, or `semester`
 *   instead of guessing.
 * - `POST /api/admin/routines/:id/assign-group`: Allows a System Administrator to assign a verified
 *   target academic group to a quarantined routine and publish it.
 */
app.get('/api/admin/routines/review-queue', requireSystemAdmin, (_req: Request, res: Response) => {
  const reviewQueue = academicStore.routines.filter(
    (r) => r.publication_status === 'needs_admin_review' || !r.college_id || !r.department_id || !r.semester
  );
  return res.status(200).json({
    success: true,
    totalQuarantined: reviewQueue.length,
    routines: reviewQueue
  });
});

app.post('/api/admin/routines/migrate-legacy', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const incomingRecords: any[] = Array.isArray(req.body?.records) ? req.body.records : [];
    const results = incomingRecords.map((raw) => migrateAndValidateRoutineRecord(raw));

    let validCount = 0;
    let quarantinedCount = 0;

    for (const item of results) {
      if (item.migratedStatus === 'valid') {
        validCount++;
      } else {
        quarantinedCount++;
      }
      const existingIdx = academicStore.routines.findIndex((r) => r.id === item.record.id);
      if (existingIdx >= 0) {
        academicStore.routines[existingIdx] = item.record;
      } else {
        academicStore.routines.push(item.record);
      }
    }

    saveAcademicStore(academicStore);

    return res.status(200).json({
      success: true,
      summary: {
        processed: results.length,
        validPublished: validCount,
        quarantinedForAdminReview: quarantinedCount
      },
      records: results.map((r) => r.record)
    });
  } catch (err) {
    console.error('[Routines Migration] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to migrate legacy routine records.' });
  }
});

app.post('/api/admin/routines/:id/assign-group', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const idx = academicStore.routines.findIndex((r) => r.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Routine record not found.' });
    }

    const groupRes = resolveExplicitAcademicGroupInput({
      college_id: body.college_id ?? body.college,
      department_id: body.department_id ?? body.technology_id ?? body.department,
      semester: body.semester,
      shift: body.shift || academicStore.routines[idx].shift,
      section: body.section || academicStore.routines[idx].section,
      regulation: body.regulation || academicStore.routines[idx].regulation || '2022'
    });

    if (!groupRes.valid || !groupRes.group) {
      return res.status(400).json({
        success: false,
        error: `Cannot assign ambiguous target group: missing or invalid [${groupRes.missingOrInvalidFields.join(', ')}].`
      });
    }

    const grp = groupRes.group;
    const updated: RoutinePeriod = {
      ...academicStore.routines[idx],
      college_id: grp.college_id,
      college: grp.college,
      department_id: grp.department_id,
      technology_id: grp.technology_id,
      department: grp.department,
      semester: grp.semester,
      shift: grp.shift,
      section: grp.section,
      regulation: grp.regulation,
      publication_status: body.publish === false ? 'draft' : 'published',
      migration_review_reason: undefined,
      updated_at: new Date().toISOString()
    };

    academicStore.routines[idx] = updated;
    saveAcademicStore(academicStore);

    return res.status(200).json({
      success: true,
      message: `Routine assigned to ${grp.college} · ${grp.department} · Semester ${grp.semester} and status set to "${updated.publication_status}".`,
      routine: updated
    });
  } catch (err) {
    console.error('[Routines Admin Assign] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to assign routine target group.' });
  }
});

/**
 * ============================================================================
 * SECTION 15. ACADEMIC COMMUNITY MANAGEMENT, COLLABORATION & MODERATION
 * ============================================================================
 * - Academic Communities strictly isolated by canonical college_id, department_id, and semester.
 * - Created by authorized Teachers or Class Captains (groups created dynamically when needed).
 * - Students discover and join ONLY communities matching their authorized cohort.
 * - Private communities require approval/invitation, yet still enforce academic cohort eligibility.
 * - Supports text messaging, documents/PDFs, small videos (<=15MB, <=60s), search, pinned notes,
 *   per-community mute settings, member lists, moderation tools, and abuse reporting.
 * - Private file access through /api/communities/:id/files/:fileId verifying active membership.
 * - Membership revalidation on student academic profile changes.
 */

const COMMUNITY_FILES_DIR = path.resolve(__dirname, 'data', 'community-files');
if (!fs.existsSync(COMMUNITY_FILES_DIR)) {
  fs.mkdirSync(COMMUNITY_FILES_DIR, { recursive: true });
}

function isUserEligibleForCommunity(session: ServerSession, comm: AcademicCommunity): { eligible: boolean; reason?: string } {
  if (session.role === 'system_admin') {
    return { eligible: true };
  }

  const grp = resolveSessionAcademicGroup(session);

  // College Check
  if (grp && grp.college_id && comm.college_id && grp.college_id !== comm.college_id) {
    return { eligible: false, reason: 'Community belongs to a different polytechnic institute.' };
  }

  // Teacher check: Teachers belong to their polytechnic college and can access academic groups in their department
  if (session.role === 'teacher') {
    return { eligible: true };
  }

  if (!grp) {
    return { eligible: false, reason: 'Valid academic group profile required.' };
  }

  // Student & Class Captain checks: department and semester must match strictly
  if (!grp.department_id || grp.department_id !== comm.department_id) {
    return { eligible: false, reason: 'Community is for a different technology/department.' };
  }

  if (!grp.semester || grp.semester !== comm.semester) {
    return { eligible: false, reason: `Community is for Semester ${comm.semester}. Your current academic profile is Semester ${grp.semester || 'unspecified'}.` };
  }

  if (comm.shift && comm.shift !== 'Both' && grp.shift && grp.shift !== comm.shift) {
    return { eligible: false, reason: `Community is restricted to ${comm.shift} Shift.` };
  }

  if (comm.section && comm.section !== 'All' && grp.section && grp.section !== comm.section) {
    return { eligible: false, reason: `Community is restricted to Section ${comm.section}.` };
  }

  return { eligible: true };
}

function isUserCommunityModerator(session: ServerSession, comm: AcademicCommunity): boolean {
  if (session.role === 'system_admin') return true;
  if (comm.created_by === session.userId) return true;
  if (Array.isArray(comm.moderators) && comm.moderators.includes(session.userId)) return true;
  if (session.role === 'teacher') {
    const grp = resolveSessionAcademicGroup(session);
    if (!grp || grp.college_id === comm.college_id) return true;
  }
  return false;
}

// Shared filtering for GET /api/communities, used by BOTH the Supabase path
// and the JSON-store fallback so the response shape is identical either way.
// `allMemberships` is every membership row for this user; the returned
// `memberships` field keeps only active / pending_approval / invited, exactly
// as the original JSON-only route did.
function filterCommunitiesForSession(
  session: ServerSession,
  communities: AcademicCommunity[],
  allMemberships: CommunityMembershipRecord[],
  scope: string
): { communities: AcademicCommunity[]; memberships: CommunityMembershipRecord[] } {
  const userMemberships = allMemberships.filter(
    m => m.user_id === session.userId && (m.status === 'active' || m.status === 'pending_approval' || m.status === 'invited')
  );
  const membershipMap = new Map(userMemberships.map(m => [m.community_id, m]));

  const visibleCommunities = communities.filter(comm => {
    if (comm.deleted_at && session.role !== 'system_admin') return false;
    if (!comm.is_active && session.role !== 'system_admin') return false;

    const mem = membershipMap.get(comm.id);
    if (mem && (mem.status === 'active' || mem.status === 'pending_approval' || mem.status === 'invited')) {
      return true;
    }

    // If public, check if academically eligible
    if (comm.visibility === 'public') {
      return isUserEligibleForCommunity(session, comm).eligible;
    }

    // Private groups are discoverable ONLY if member, invited, or creator/admin
    return session.role === 'system_admin' || comm.created_by === session.userId;
  });

  let filtered = visibleCommunities;
  if (scope === 'joined') {
    filtered = visibleCommunities.filter(c => {
      const mem = membershipMap.get(c.id);
      return mem && mem.status === 'active';
    });
  } else if (scope === 'discover') {
    filtered = visibleCommunities.filter(c => {
      const mem = membershipMap.get(c.id);
      return !mem || mem.status === 'pending_approval' || mem.status === 'invited';
    });
  }

  return { communities: filtered, memberships: userMemberships };
}

// 15A. GET DISCOVERABLE & JOINED COMMUNITIES
app.get('/api/communities', async (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Valid academic session required.' });
    }

    const scope = String(req.query.scope || 'all');

    // Phase 4 migration 1: try Supabase (Postgres) first. Any failure falls
    // back to the JSON store below — the route never crashes for a DB error.
    if (isSupabaseConfigured()) {
      try {
        const [communities, memberships] = await Promise.all([
          listCommunities(),
          listMembershipsForUser(session.userId)
        ]);
        const result = filterCommunitiesForSession(session, communities, memberships, scope);
        return res.status(200).json({
          success: true,
          communities: result.communities,
          memberships: result.memberships
        });
      } catch (err) {
        console.warn('[Communities List] Supabase read failed, falling back to JSON store:', err);
      }
    }

    // JSON-store fallback (original behaviour, unchanged).
    const result = filterCommunitiesForSession(
      session,
      academicStore.communities,
      academicStore.communityMemberships,
      scope
    );
    return res.status(200).json({
      success: true,
      communities: result.communities,
      memberships: result.memberships
    });
  } catch (err) {
    console.error('[Communities List] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve academic communities.' });
  }
});

// Shared filtering for GET /api/communities/recommended, used by BOTH the
// Supabase path and the JSON-store fallback so the response shape is
// identical either way. This is NOT filterCommunitiesForSession(): recommended
// excludes already-joined groups, only requires is_active (no deleted_at
// check), and only recommends groups the user is eligible for that are
// public or created by the user — exactly as the original JSON-only route did.
function filterRecommendedCommunities(
  session: ServerSession,
  communities: AcademicCommunity[],
  allMemberships: CommunityMembershipRecord[]
): { recommendedCommunities: AcademicCommunity[]; hasJoinedGroups: boolean } {
  const userMemberships = allMemberships.filter(
    m => m.user_id === session.userId && m.status === 'active'
  );
  const joinedIds = new Set(userMemberships.map(m => m.community_id));

  const recommended = communities.filter(comm => {
    if (!comm.is_active) return false;
    if (joinedIds.has(comm.id)) return false;
    const eligibility = isUserEligibleForCommunity(session, comm);
    return eligibility.eligible && (comm.visibility === 'public' || comm.created_by === session.userId);
  });

  return { recommendedCommunities: recommended, hasJoinedGroups: joinedIds.size > 0 };
}

// 15B. GET RECOMMENDED COMMUNITIES (FOR ONBOARDING & DASHBOARD)
app.get('/api/communities/recommended', async (req: Request, res: Response) => {
  try {
    let session = getAuthenticatedSession(req);
    if (!session && (req.query.college || req.query.department)) {
      const qClg = resolveStrictCollege(String(req.query.college || ''));
      const qTech = resolveStrictTechnology(String(req.query.department || ''));
      const qSem = req.query.semester ? Number(req.query.semester) : null;
      if (qClg && qTech && qSem && qSem >= 1 && qSem <= 8) {
        session = {
          token: 'temp_onboarding',
          userId: 'temp_student',
          role: 'student',
          name: 'Student',
          email: '',
          college: qClg.name,
          department: qTech.name,
          semester: qSem as SemesterNumber,
          shift: (req.query.shift as Shift) || 'Morning',
          section: (req.query.section as Section) || 'A1',
          createdAt: Date.now(),
          expiresAt: Date.now() + 60000
        };
      }
    }

    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Session or academic profile required.' });
    }

    // Phase 4 migration 2: try Supabase (Postgres) first. Any failure falls
    // back to the JSON store below — the route never crashes for a DB error.
    if (isSupabaseConfigured()) {
      try {
        const [communities, memberships] = await Promise.all([
          listCommunities(),
          listMembershipsForUser(session.userId)
        ]);
        const result = filterRecommendedCommunities(session, communities, memberships);
        return res.status(200).json({
          success: true,
          recommendedCommunities: result.recommendedCommunities,
          hasJoinedGroups: result.hasJoinedGroups
        });
      } catch (err) {
        console.warn('[Communities Recommended] Supabase read failed, falling back to JSON store:', err);
      }
    }

    // JSON-store fallback (original behaviour, unchanged).
    const result = filterRecommendedCommunities(
      session,
      academicStore.communities,
      academicStore.communityMemberships
    );

    return res.status(200).json({
      success: true,
      recommendedCommunities: result.recommendedCommunities,
      hasJoinedGroups: result.hasJoinedGroups
    });
  } catch (err) {
    console.error('[Communities Recommended] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve recommendations.' });
  }
});

// 15C. GET COMMUNITY BY ID WITH AUTHORIZATION
app.get('/api/communities/:id', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const comm = academicStore.communities.find(c => c.id === req.params.id);
    if (!comm || (comm.deleted_at && session.role !== 'system_admin')) {
      return res.status(404).json({ success: false, error: 'Community not found.' });
    }

    const membership = academicStore.communityMemberships.find(
      m => m.community_id === comm.id && m.user_id === session.userId
    );

    const eligibility = isUserEligibleForCommunity(session, comm);
    if (!eligibility.eligible && !membership && session.role !== 'system_admin') {
      return res.status(403).json({
        success: false,
        error: `Access Denied: ${eligibility.reason || 'You do not belong to this academic cohort.'}`
      });
    }

    return res.status(200).json({
      success: true,
      community: comm,
      membership: membership || null,
      isModerator: isUserCommunityModerator(session, comm)
    });
  } catch (err) {
    console.error('[Community Detail] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve community details.' });
  }
});

// 15D. CREATE ACADEMIC COMMUNITY
app.post('/api/communities', requireCommunityCreator, (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Session required.' });
    }

    const body = req.body || {};
    const image = validateCommunityImage(body.image_url);
    if (image === null) {
      return res.status(400).json({ success: false, error: 'Image must be an HTTPS URL or a PNG, JPEG, or WebP image under 500 KB.' });
    }
    const inputCollege = String(body.college || session.college || '');
    const inputDept = String(body.department || session.department || '');
    const inputSemester = Number(body.semester || session.semester || 1);

    const clg = resolveStrictCollege(inputCollege);
    const tech = resolveStrictTechnology(inputDept);

    if (!clg || !tech) {
      return res.status(400).json({
        success: false,
        error: 'Invalid college or technology selected. Both must be canonical BTEB institutions.'
      });
    }

    if (!Number.isInteger(inputSemester) || inputSemester < 1 || inputSemester > 8) {
      return res.status(400).json({
        success: false,
        error: 'Semester must be between 1 and 8.'
      });
    }

    const shiftVal: Shift | 'Both' = body.shift === 'Morning' || body.shift === 'Day' ? body.shift : 'Both';
    const sectionVal: Section | 'All' = body.section === 'A1' || body.section === 'A2' || body.section === 'B1' || body.section === 'B2' ? body.section : 'All';
    const visibilityVal: 'public' | 'private' = body.visibility === 'private' ? 'private' : 'public';

    // Format standard suggested name if not provided
    const ordinal = inputSemester === 1 ? '1st' : inputSemester === 2 ? '2nd' : inputSemester === 3 ? '3rd' : `${inputSemester}th`;
    const defaultName = `${tech.shortCode || tech.name} ${ordinal} Semester Study Group`;
    const communityName = String(body.name || '').trim() || defaultName;
    const communityDesc = String(body.description || '').trim() || `Official academic study and routine collaboration group for ${tech.name} (${ordinal} Semester) at ${clg.name}.`;

    const commId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newCommunity: AcademicCommunity = {
      id: commId,
      name: communityName,
      description: communityDesc,
      college_id: clg.id,
      college: clg.name,
      department_id: tech.id,
      department: tech.name,
      semester: inputSemester as SemesterNumber,
      regulation: String(body.regulation || '2022'),
      shift: shiftVal,
      section: sectionVal,
      visibility: visibilityVal,
      created_by: session.userId,
      created_by_name: session.name,
      // requireCommunityCreator already guarantees one of these three roles.
      created_by_role: session.role === 'teacher' ? 'teacher' : session.role === 'class_captain' ? 'class_captain' : 'system_admin',
      moderators: [session.userId],
      member_count: 1,
      is_active: true,
      avatar_emoji: body.avatar_emoji || (session.role === 'teacher' ? '🎓' : '📚'),
      image_url: image,
      created_at: nowIso,
      updated_at: nowIso
    };

    academicStore.communities.push(newCommunity);

    // Add creator as owner/moderator
    const creatorMembership: CommunityMembershipRecord = {
      id: `mem_${commId}_${session.userId}`,
      community_id: commId,
      user_id: session.userId,
      user_name: session.name,
      user_role: session.role,
      college_id: clg.id,
      department_id: tech.id,
      semester: inputSemester as SemesterNumber,
      shift: session.shift,
      section: session.section,
      membership_role: 'owner',
      status: 'active',
      is_muted: false,
      joined_at: nowIso,
      updated_at: nowIso
    };
    academicStore.communityMemberships.push(creatorMembership);

    // Initial system welcome message
    const welcomeMsg: CommunityMessageRecord = {
      id: `msg_${Date.now()}_welcome`,
      community_id: commId,
      sender_id: session.userId,
      sender_name: session.name,
      sender_role: session.role,
      sender_designation: session.role === 'teacher' ? 'Teacher' : session.role === 'class_captain' ? 'Class Captain' : 'System Administrator',
      is_moderator: true,
      content: `Welcome to the ${communityName}! This group is created for academic collaboration, routine updates, lecture notes, and study discussions. Please adhere to respectful academic conduct.`,
      attachments: [],
      is_pinned: true,
      pinned_by: session.userId,
      pinned_at: nowIso,
      is_deleted: false,
      reports_count: 0,
      created_at: nowIso
    };
    academicStore.communityMessages.push(welcomeMsg);
    newCommunity.pinned_notice_id = welcomeMsg.id;

    appendAdminAudit(session, 'community_created', commId, communityName);
    saveAcademicStore(academicStore);

    return res.status(201).json({
      success: true,
      message: 'Academic community created successfully.',
      community: newCommunity,
      membership: creatorMembership
    });
  } catch (err) {
    console.error('[Community Create] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create academic community.' });
  }
});

// 15E. JOIN COMMUNITY
app.post('/api/communities/:id/join', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const comm = academicStore.communities.find(c => c.id === req.params.id);
    if (!comm || !comm.is_active) {
      return res.status(404).json({ success: false, error: 'Community not found or inactive.' });
    }

    const eligibility = isUserEligibleForCommunity(session, comm);
    if (!eligibility.eligible) {
      return res.status(403).json({
        success: false,
        error: `Ineligible: ${eligibility.reason || 'You do not match this academic group.'}`
      });
    }

    const existingMemIndex = academicStore.communityMemberships.findIndex(
      m => m.community_id === comm.id && m.user_id === session.userId
    );

    const nowIso = new Date().toISOString();
    const grp = resolveSessionAcademicGroup(session);

    if (existingMemIndex >= 0) {
      const existing = academicStore.communityMemberships[existingMemIndex];
      if (existing.status === 'active') {
        return res.status(200).json({ success: true, message: 'Already an active member.', membership: existing });
      }
      if (existing.status === 'banned') {
        return res.status(403).json({ success: false, error: 'You have been restricted from this community.' });
      }
    }

    const isDirectActive = comm.visibility === 'public' || session.role === 'teacher' || session.role === 'system_admin';
    const statusVal = isDirectActive ? 'active' : 'pending_approval';

    const membershipRecord: CommunityMembershipRecord = {
      id: `mem_${comm.id}_${session.userId}`,
      community_id: comm.id,
      user_id: session.userId,
      user_name: session.name,
      user_role: session.role,
      college_id: grp?.college_id || comm.college_id,
      department_id: grp?.department_id || comm.department_id,
      semester: ((grp?.semester) || comm.semester) as SemesterNumber,
      shift: session.shift,
      section: session.section,
      membership_role: 'member',
      status: statusVal,
      is_muted: false,
      joined_at: nowIso,
      updated_at: nowIso
    };

    if (existingMemIndex >= 0) {
      academicStore.communityMemberships[existingMemIndex] = membershipRecord;
    } else {
      academicStore.communityMemberships.push(membershipRecord);
    }

    if (isDirectActive) {
      comm.member_count = academicStore.communityMemberships.filter(m => m.community_id === comm.id && m.status === 'active').length;
    }

    saveAcademicStore(academicStore);

    return res.status(200).json({
      success: true,
      message: isDirectActive ? `Joined ${comm.name} successfully.` : 'Join request submitted for moderator approval.',
      membership: membershipRecord,
      community: comm
    });
  } catch (err) {
    console.error('[Community Join] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to join community.' });
  }
});

// 15F. LEAVE COMMUNITY
app.post('/api/communities/:id/leave', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const comm = academicStore.communities.find(c => c.id === req.params.id);
    if (!comm) {
      return res.status(404).json({ success: false, error: 'Community not found.' });
    }

    const memIndex = academicStore.communityMemberships.findIndex(
      m => m.community_id === comm.id && m.user_id === session.userId
    );

    if (memIndex >= 0) {
      academicStore.communityMemberships.splice(memIndex, 1);
      comm.member_count = academicStore.communityMemberships.filter(m => m.community_id === comm.id && m.status === 'active').length;
      saveAcademicStore(academicStore);
    }

    return res.status(200).json({ success: true, message: `Left ${comm.name}.` });
  } catch (err) {
    console.error('[Community Leave] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to leave community.' });
  }
});

// 15G. GET MEMBERS OF COMMUNITY
app.get('/api/communities/:id/members', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const comm = academicStore.communities.find(c => c.id === req.params.id);
    if (!comm) {
      return res.status(404).json({ success: false, error: 'Community not found.' });
    }

    // Active membership check
    const userMem = academicStore.communityMemberships.find(
      m => m.community_id === comm.id && m.user_id === session.userId && m.status === 'active'
    );
    if (!userMem && session.role !== 'system_admin') {
      return res.status(403).json({ success: false, error: 'Must be an active member to view member roster.' });
    }

    const members = academicStore.communityMemberships.filter(m => m.community_id === comm.id);
    return res.status(200).json({
      success: true,
      members,
      isModerator: isUserCommunityModerator(session, comm)
    });
  } catch (err) {
    console.error('[Community Members] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve members.' });
  }
});

// 15H. GET MESSAGES IN COMMUNITY (WITH SEARCH & PINNED FILTER)
app.get('/api/communities/:id/messages', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const comm = academicStore.communities.find(c => c.id === req.params.id);
    if (!comm || (!comm.is_active && session.role !== 'system_admin')) {
      return res.status(404).json({ success: false, error: 'Community not found or deactivated.' });
    }

    // Must be active member, moderator, teacher, or system admin
    const userMem = academicStore.communityMemberships.find(
      m => m.community_id === comm.id && m.user_id === session.userId && m.status === 'active'
    );
    const isMod = isUserCommunityModerator(session, comm);
    if (!userMem && !isMod && session.role !== 'system_admin') {
      return res.status(403).json({ success: false, error: 'Must be an active member of this community to access messages.' });
    }

    const q = String(req.query.q || '').trim().toLowerCase();
    let messages = academicStore.communityMessages.filter(m => m.community_id === comm.id && !m.is_deleted);

    if (q) {
      messages = messages.filter(m => {
        const textMatch = m.content.toLowerCase().includes(q);
        const fileMatch = m.attachments.some(a => a.file_name.toLowerCase().includes(q));
        const senderMatch = m.sender_name.toLowerCase().includes(q);
        return textMatch || fileMatch || senderMatch;
      });
    }

    // Sort chronologically (oldest first so chat flows naturally downwards)
    messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const pinnedMessages = messages.filter(m => m.is_pinned);

    return res.status(200).json({
      success: true,
      messages: messages.map(publicCommunityMessage),
      pinnedMessages,
      totalCount: messages.length,
      isMuted: userMem?.is_muted || false
    });
  } catch (err) {
    console.error('[Community Messages] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve messages.' });
  }
});

// 15I. POST MESSAGE IN COMMUNITY (TEXT & ATTACHMENTS)
// Attachments carry their file bytes in `file_data`, but message list /
// post responses must stay light — the bytes are only served through the
// file download endpoint, never embedded in chat payloads.
function publicAttachment(att: CommunityAttachment): CommunityAttachment {
  const { file_data: _fileData, ...rest } = att;
  return rest as CommunityAttachment;
}

function publicCommunityMessage(msg: CommunityMessageRecord): CommunityMessageRecord {
  return { ...msg, attachments: (msg.attachments || []).map(publicAttachment) };
}

// ---------------------------------------------------------------------------
// Community attachment validation (magic-byte inspection).
// The client claims a file type / mime / size, but none of it is trusted:
// the bytes are decoded, the real type is detected from magic bytes, the
// real byte length is capped (10 MB, 15 MB video), and HTML/SVG/scripts
// and executables are rejected outright so a stored file can never be
// served back as executable content in a browser.
// ---------------------------------------------------------------------------
function sanitizeDownloadFilename(name: string): string {
  const base = String(name || 'document').split(/[\\/]/).pop() || 'document';
  const cleaned = base.replace(/["\r\n\x00-\x1f\x7f]/g, '').trim();
  return cleaned || 'document';
}

interface InspectedCommunityUpload {
  mimeType: string;
  fileType: 'image' | 'video' | 'pdf' | 'document';
  fileSizeBytes: number;
  fileData: string; // base64 payload, or '' when the client sent no bytes
}

function isPrintableTextBuffer(buf: Buffer): boolean {
  const sample = buf.subarray(0, Math.min(buf.length, 8192));
  for (const byte of sample) {
    if (byte === 0x09 || byte === 0x0a || byte === 0x0d) continue;
    if (byte < 0x20 || byte === 0x7f) return false;
  }
  return true;
}

function inspectCommunityUpload(rawDataUrl: string, claimedFileName: string): InspectedCommunityUpload {
  const fileData = rawDataUrl.includes('base64,') ? rawDataUrl.split('base64,')[1] : '';
  if (!fileData) {
    // No bytes sent (legacy / seeded attachment). Never trust the claimed
    // mime type; serve a safe generic type instead.
    return { mimeType: 'application/octet-stream', fileType: 'document', fileSizeBytes: 0, fileData: '' };
  }
  let buf: Buffer;
  try {
    buf = Buffer.from(fileData, 'base64');
  } catch {
    throw new Error('Attachment is not valid base64 data.');
  }
  if (buf.length === 0) {
    throw new Error('Attachment is empty.');
  }

  // Reject active content masquerading as a document.
  const head = buf.subarray(0, 512).toString('utf8').replace(/^\uFEFF/, '').trimStart().toLowerCase();
  if (
    head.startsWith('<html') || head.startsWith('<!doctype html') || head.startsWith('<head') ||
    head.startsWith('<script') || head.startsWith('<svg')
  ) {
    throw new Error(`File ${claimedFileName} looks like a web page or script and cannot be uploaded.`);
  }
  if (buf[0] === 0x4d && buf[1] === 0x5a) { // 'MZ' Windows executable
    throw new Error(`File ${claimedFileName} is an executable and cannot be uploaded.`);
  }
  if (buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46) { // ELF binary
    throw new Error(`File ${claimedFileName} is an executable and cannot be uploaded.`);
  }
  if (head.startsWith('#!')) {
    throw new Error(`File ${claimedFileName} is a script and cannot be uploaded.`);
  }

  const ext = claimedFileName.split('.').pop()?.toLowerCase() || '';
  let mimeType = 'application/octet-stream';
  let fileType: InspectedCommunityUpload['fileType'] = 'document';

  if (buf.subarray(0, 4).toString('ascii') === '%PDF') {
    mimeType = 'application/pdf';
    fileType = 'pdf';
  } else if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    mimeType = 'image/png';
    fileType = 'image';
  } else if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    mimeType = 'image/jpeg';
    fileType = 'image';
  } else if (buf.subarray(0, 6).toString('ascii') === 'GIF87a' || buf.subarray(0, 6).toString('ascii') === 'GIF89a') {
    mimeType = 'image/gif';
    fileType = 'image';
  } else if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    mimeType = 'image/webp';
    fileType = 'image';
  } else if (buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    mimeType = 'video/mp4';
    fileType = 'video';
  } else if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    mimeType = 'video/webm';
    fileType = 'video';
  } else if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    // ZIP container: Office documents and archives. The extension decides
    // the mime; an unknown extension stays a generic archive.
    if (ext === 'docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (ext === 'xlsx') mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    else if (ext === 'pptx') mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    else mimeType = 'application/zip';
    fileType = 'document';
  } else if (isPrintableTextBuffer(buf)) {
    mimeType = 'text/plain';
    fileType = 'document';
  }

  const fileSizeBytes = buf.length;
  const maxBytes = fileType === 'video' ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
  if (fileSizeBytes > maxBytes) {
    throw new Error(`File ${claimedFileName} exceeds the ${fileType === 'video' ? '15MB' : '10MB'} size limit.`);
  }
  return { mimeType, fileType, fileSizeBytes, fileData };
}

app.post('/api/communities/:id/messages', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const comm = academicStore.communities.find(c => c.id === req.params.id);
    if (!comm || !comm.is_active) {
      return res.status(404).json({ success: false, error: 'Community not found or inactive.' });
    }

    const userMem = academicStore.communityMemberships.find(
      m => m.community_id === comm.id && m.user_id === session.userId && m.status === 'active'
    );
    const isMod = isUserCommunityModerator(session, comm);
    if (!userMem && !isMod && session.role !== 'system_admin') {
      return res.status(403).json({ success: false, error: 'Active community membership required to send messages.' });
    }

    const body = req.body || {};
    const content = String(body.content || '').trim();
    const rawAttachments = Array.isArray(body.attachments) ? body.attachments : [];

    if (!content && rawAttachments.length === 0) {
      return res.status(400).json({ success: false, error: 'Message content or attachment is required.' });
    }

    // Process attachments: the client claims a type / mime / size, but none
    // of it is trusted. inspectCommunityUpload decodes the real bytes,
    // detects the type from magic bytes, and enforces the size caps on the
    // real decoded length. The bytes are persisted on the attachment record
    // itself: files written to data/community-files/ are lost on every
    // Render deploy and are not covered by the GitHub store backup, so disk
    // storage alone meant every uploaded file came back as a fake
    // placeholder PDF.
    const processedAttachments: CommunityAttachment[] = [];
    for (const att of rawAttachments) {
      const fileName = String(att.file_name || 'attachment.pdf').trim();

      // The client sends the file bytes as a base64 data URL in `file_url`
      // (older clients may send `base64_data`).
      const rawDataUrl =
        typeof att.base64_data === 'string' && att.base64_data
          ? att.base64_data
          : typeof att.file_url === 'string' && att.file_url.startsWith('data:')
            ? att.file_url
            : '';
      let inspected: InspectedCommunityUpload;
      try {
        inspected = inspectCommunityUpload(rawDataUrl, fileName);
      } catch (err) {
        return res.status(400).json({ success: false, error: (err as Error).message || 'Invalid attachment.' });
      }

      // Small video duration validation: max 60 seconds
      const durationSeconds = att.duration_seconds ? Math.round(Number(att.duration_seconds)) : undefined;
      if (inspected.fileType === 'video' && durationSeconds && durationSeconds > 60) {
        return res.status(400).json({ success: false, error: 'Video duration exceeds maximum allowed length of 60 seconds.' });
      }

      const attId = `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      processedAttachments.push({
        id: attId,
        file_name: fileName,
        file_type: inspected.fileType,
        mime_type: inspected.mimeType,
        file_size_bytes: inspected.fileSizeBytes,
        file_url: `/api/communities/${comm.id}/files/${attId}`,
        file_data: inspected.fileData || undefined,
        duration_seconds: durationSeconds
      });
    }

    const nowIso = new Date().toISOString();

    const newMsg: CommunityMessageRecord = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      community_id: comm.id,
      sender_id: session.userId,
      sender_name: session.name,
      sender_role: session.role,
      sender_designation: session.role === 'teacher' ? 'Instructor' : session.role === 'class_captain' ? 'Class Captain' : 'Student',
      is_moderator: isMod,
      content,
      attachments: processedAttachments,
      is_pinned: Boolean(body.is_pinned && isMod),
      pinned_by: body.is_pinned && isMod ? session.userId : undefined,
      pinned_at: body.is_pinned && isMod ? nowIso : undefined,
      is_deleted: false,
      reports_count: 0,
      created_at: nowIso
    };

    academicStore.communityMessages.push(newMsg);
    comm.updated_at = nowIso;
    saveAcademicStore(academicStore);

    return res.status(201).json({
      success: true,
      message: publicCommunityMessage(newMsg)
    });
  } catch (err) {
    console.error('[Community Post Message] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to post message.' });
  }
});

// 15J. PIN / UNPIN MESSAGE (MODERATOR ONLY)
app.post('/api/communities/:id/messages/:msgId/pin', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const comm = academicStore.communities.find(c => c.id === req.params.id);
    if (!comm) {
      return res.status(404).json({ success: false, error: 'Community not found.' });
    }

    if (!isUserCommunityModerator(session, comm)) {
      return res.status(403).json({ success: false, error: 'Only community moderators or teachers can pin announcements.' });
    }

    const msg = academicStore.communityMessages.find(m => m.id === req.params.msgId && m.community_id === comm.id);
    if (!msg) {
      return res.status(404).json({ success: false, error: 'Message not found.' });
    }

    const willBePinned = !msg.is_pinned;
    msg.is_pinned = willBePinned;
    msg.pinned_by = willBePinned ? session.userId : undefined;
    msg.pinned_at = willBePinned ? new Date().toISOString() : undefined;

    if (willBePinned) {
      comm.pinned_notice_id = msg.id;
    } else if (comm.pinned_notice_id === msg.id) {
      comm.pinned_notice_id = null;
    }

    saveAcademicStore(academicStore);

    return res.status(200).json({
      success: true,
      is_pinned: msg.is_pinned,
      message: msg.is_pinned ? 'Message pinned as community announcement.' : 'Message unpinned.'
    });
  } catch (err) {
    console.error('[Community Pin] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update message pin state.' });
  }
});

// 15K. DELETE MESSAGE (SENDER OR MODERATOR)
app.delete('/api/communities/:id/messages/:msgId', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const comm = academicStore.communities.find(c => c.id === req.params.id);
    if (!comm) {
      return res.status(404).json({ success: false, error: 'Community not found.' });
    }

    const msg = academicStore.communityMessages.find(m => m.id === req.params.msgId && m.community_id === comm.id);
    if (!msg) {
      return res.status(404).json({ success: false, error: 'Message not found.' });
    }

    const isSender = msg.sender_id === session.userId;
    const isMod = isUserCommunityModerator(session, comm);

    if (!isSender && !isMod) {
      return res.status(403).json({ success: false, error: 'You do not have permission to delete this message.' });
    }

    msg.is_deleted = true;
    msg.deleted_by = session.userId;
    if (comm.pinned_notice_id === msg.id) {
      comm.pinned_notice_id = null;
    }

    saveAcademicStore(academicStore);

    return res.status(200).json({ success: true, message: 'Message removed.' });
  } catch (err) {
    console.error('[Community Delete Msg] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete message.' });
  }
});

// 15L. MUTE / UNMUTE NOTIFICATIONS FOR COMMUNITY
app.put('/api/communities/:id/mute', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const mem = academicStore.communityMemberships.find(
      m => m.community_id === req.params.id && m.user_id === session.userId
    );
    if (!mem) {
      return res.status(404).json({ success: false, error: 'Membership not found.' });
    }

    mem.is_muted = !mem.is_muted;
    mem.updated_at = new Date().toISOString();
    saveAcademicStore(academicStore);

    return res.status(200).json({
      success: true,
      is_muted: mem.is_muted,
      message: mem.is_muted ? 'Notifications muted for this community.' : 'Notifications enabled.'
    });
  } catch (err) {
    console.error('[Community Mute] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update mute settings.' });
  }
});

// 15M. REPORT MESSAGE OR USER FOR ABUSE
app.post('/api/communities/:id/report', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const { reported_message_id, reported_user_id, reason } = req.body || {};
    if (!reason || !reported_user_id) {
      return res.status(400).json({ success: false, error: 'Reason and reported user are required.' });
    }

    const report: CommunityReportRecord = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      community_id: req.params.id,
      reported_message_id,
      reported_user_id,
      reported_by_id: session.userId,
      reported_by_name: session.name,
      reason: String(reason).trim(),
      status: 'pending',
      created_at: new Date().toISOString()
    };

    academicStore.communityReports.push(report);

    if (reported_message_id) {
      const msg = academicStore.communityMessages.find(m => m.id === reported_message_id);
      if (msg) msg.reports_count = (msg.reports_count || 0) + 1;
    }

    saveAcademicStore(academicStore);

    return res.status(201).json({
      success: true,
      message: 'Report submitted. Moderators and Administrators will review the issue.'
    });
  } catch (err) {
    console.error('[Community Report] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit report.' });
  }
});

// 15N. SECURE PRIVATE FILE ACCESS
app.get('/api/communities/:id/files/:fileId', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const comm = academicStore.communities.find(c => c.id === req.params.id);
    if (!comm) {
      return res.status(404).json({ success: false, error: 'Community not found.' });
    }

    // Verify active membership or admin
    const userMem = academicStore.communityMemberships.find(
      m => m.community_id === comm.id && m.user_id === session.userId && m.status === 'active'
    );
    if (!userMem && session.role !== 'system_admin') {
      return res.status(403).json({ success: false, error: 'Forbidden: Active membership required to download study files.' });
    }

    const fileId = req.params.fileId;
    // Find attachment metadata
    let foundAtt: CommunityAttachment | null = null;
    for (const msg of academicStore.communityMessages) {
      if (msg.community_id === comm.id) {
        const a = msg.attachments.find(att => att.id === fileId);
        if (a) {
          foundAtt = a;
          break;
        }
      }
    }

    // Serve bytes stored on the attachment record itself — the durable path,
    // kept in the academic store (and its GitHub backup), so uploaded files
    // survive Render deploys. Always served as an attachment with a
    // sanitized filename and nosniff, so a stored file can never be
    // executed as a web page in the browser.
    if (foundAtt?.file_data) {
      const buf = Buffer.from(foundAtt.file_data, 'base64');
      res.setHeader('Content-Type', foundAtt.mime_type || 'application/octet-stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizeDownloadFilename(foundAtt.file_name || 'document')}"`);
      return res.send(buf);
    }

    // Look for matching file in data/community-files
    const files = fs.readdirSync(COMMUNITY_FILES_DIR);
    const matchDiskFile = files.find(f => f.startsWith(`${fileId}_`));

    if (matchDiskFile) {
      const diskPath = path.join(COMMUNITY_FILES_DIR, matchDiskFile);
      res.setHeader('Content-Type', foundAtt?.mime_type || 'application/octet-stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizeDownloadFilename(foundAtt?.file_name || 'document')}"`);
      return fs.createReadStream(diskPath).pipe(res);
    }

    // If file was not yet persisted to disk (e.g. mock seed), serve mock PDF/text payload
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizeDownloadFilename(foundAtt?.file_name || 'document.pdf')}"`);
    return res.send(Buffer.from(`%PDF-1.4\n% DiplomaMate Study File: ${foundAtt?.file_name || fileId}\nCommunity: ${comm.name}`));
  } catch (err) {
    console.error('[Community File Access] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to access file.' });
  }
});

// 15O. REVALIDATE MEMBERSHIPS ON ACADEMIC PROFILE CHANGE
app.post('/api/communities/revalidate-memberships', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const body = req.body || {};
    if (body.semester) session.semester = Number(body.semester) as SemesterNumber;
    if (body.college) session.college = String(body.college);
    if (body.department) session.department = String(body.department);
    if (body.shift) session.shift = body.shift;
    if (body.section) session.section = body.section;

    // Also update in enrolled students store if present
    const stIndex = academicStore.students.findIndex(s => s.id === session.userId || (session.boardRoll && s.boardRoll === session.boardRoll));
    if (stIndex >= 0) {
      if (body.semester) academicStore.students[stIndex].semester = Number(body.semester) as SemesterNumber;
      if (body.college) academicStore.students[stIndex].college = String(body.college);
      if (body.department) academicStore.students[stIndex].department = String(body.department);
    }

    let revokedCount = 0;

    academicStore.communityMemberships.forEach(mem => {
      if (mem.user_id === session.userId && mem.status === 'active') {
        const comm = academicStore.communities.find(c => c.id === mem.community_id);
        if (comm) {
          const check = isUserEligibleForCommunity(session, comm);
          if (!check.eligible) {
            mem.status = 'banned'; // Revoke membership
            mem.updated_at = new Date().toISOString();
            comm.member_count = Math.max(0, comm.member_count - 1);
            revokedCount++;
          }
        }
      }
    });

    if (revokedCount > 0) {
      saveAcademicStore(academicStore);
    }

    return res.status(200).json({
      success: true,
      message: `Revalidated memberships. ${revokedCount} ineligible communities revoked.`,
      revokedCount
    });
  } catch (err) {
    console.error('[Community Revalidate] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to revalidate memberships.' });
  }
});

interface AdminManagedAccount {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'student' | 'class_captain' | 'teacher';
  roll?: string;
  department?: string;
  college?: string;
  semester?: number;
  approvalStatus: 'Pending' | 'Approved' | 'Rejected';
  createdAt?: string;
  deleted: boolean;
}

function getAdminManagedAccounts(): AdminManagedAccount[] {
  const accounts = new Map<string, AdminManagedAccount>();
  const applicationsByStudent = new Map(
    academicStore.captainRecords.filter(app => app.isRegisteredAccount).map(app => [app.studentId, app] as const)
  );

  academicStore.students.filter(student => student.isRegisteredAccount).forEach(student => {
    const application = applicationsByStudent.get(student.id);
    const isCaptain = student.accountType === 'class_captain' || Boolean(application);
    const rawStatus = isCaptain ? application?.status || student.captainVerificationStatus : 'Approved';
    const status = rawStatus === 'Approved' ? 'Approved' : rawStatus === 'Rejected' ? 'Rejected' : 'Pending';
    accounts.set(student.id, {
      id: student.id,
      name: application?.studentName || student.name,
      email: student.email,
      phone: student.phone,
      role: isCaptain ? 'class_captain' : 'student',
      roll: student.boardRoll,
      department: student.department,
      college: student.college,
      semester: student.semester,
      approvalStatus: status === 'Pending' || status === 'Rejected' ? status : 'Approved',
      createdAt: student.createdAt,
      deleted: deletedAccountIds.has(student.id)
    });
  });

  academicStore.captainRecords.filter(application =>
    application.isRegisteredAccount || academicStore.students.some(student => student.id === application.studentId && student.isRegisteredAccount)
  ).forEach(application => {
    if (!accounts.has(application.studentId)) {
      accounts.set(application.studentId, {
        id: application.studentId,
        name: application.studentName,
        phone: application.phone,
        role: 'class_captain',
        roll: application.boardRoll,
        department: application.department,
        college: application.college,
        semester: application.semester,
        approvalStatus: application.status === 'Approved' ? 'Approved' : application.status === 'Rejected' ? 'Rejected' : 'Pending',
        createdAt: application.appliedAt,
        deleted: deletedAccountIds.has(application.studentId)
      });
    }
  });

  serverTeachers.forEach(teacher => {
    if (!teacher.isRegisteredAccount) return;
    accounts.set(teacher.id, {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      role: 'teacher',
      department: teacher.department,
      college: teacher.college,
      approvalStatus: teacher.verificationStatus === 'Pending'
        ? 'Pending'
        : teacher.verificationStatus === 'Rejected' ? 'Rejected' : 'Approved',
      createdAt: teacher.createdAt,
      deleted: deletedAccountIds.has(teacher.id)
    });
  });

  return Array.from(accounts.values());
}

function appendSystemAudit(
  action: string,
  targetId: string,
  targetName: string,
  details?: string,
  adminId = 'system'
): void {
  academicStore.adminAuditLogs.unshift({
    id: `audit_${crypto.randomUUID()}`,
    adminId,
    action,
    targetId,
    targetName,
    timestamp: new Date().toISOString(),
    details
  });
  academicStore.adminAuditLogs = academicStore.adminAuditLogs.slice(0, 5000);
}

function appendAdminAudit(
  admin: ServerSession,
  action: string,
  targetId: string,
  targetName: string,
  details?: string
): void {
  appendSystemAudit(action, targetId, targetName, details, admin.userId);
}

// 15P. ADMIN ACCOUNT AND COMMUNITY MANAGEMENT ENDPOINTS
app.get('/api/admin/management', requireSystemAdmin, (_req: Request, res: Response) => {
  const accounts = getAdminManagedAccounts().filter(account => !account.deleted);
  const communities = academicStore.communities.filter(community => !community.deleted_at);
  return res.status(200).json({
    success: true,
    stats: {
      totalUsers: accounts.length,
      pendingAccounts: accounts.filter(account => account.approvalStatus === 'Pending').length,
      approvedAccounts: accounts.filter(account => account.approvalStatus === 'Approved').length,
      students: accounts.filter(account => account.role === 'student').length,
      captains: accounts.filter(account => account.role === 'class_captain').length,
      teachers: accounts.filter(account => account.role === 'teacher').length,
      totalCommunities: communities.length
    },
    accounts,
    communities,
    auditLogs: academicStore.adminAuditLogs.slice(0, 100)
  });
});

app.get('/api/admin/accounts/:id', requireSystemAdmin, (req: Request, res: Response) => {
  const account = getAdminManagedAccounts().find(item => item.id === req.params.id);
  if (!account) return res.status(404).json({ success: false, error: 'Account not found.' });
  const student = academicStore.students.find(item => item.id === account.id);
  const application = academicStore.captainRecords.find(item => item.studentId === account.id && item.isRegisteredAccount);
  const teacher = serverTeachers.get(account.id);
  return res.status(200).json({
    success: true,
    account: {
      ...account,
      details: student ? sanitizeStudent(student) : teacher ? sanitizeTeacher(teacher) : application || null,
      application: application || null
    }
  });
});

app.post('/api/admin/accounts/:id/decision', requireSystemAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminSession as ServerSession;
  const accountId = req.params.id;
  const decision = req.body?.decision;
  if (decision !== 'approve' && decision !== 'reject') {
    return res.status(400).json({ success: false, error: 'Decision must be approve or reject.' });
  }
  if (accountId === admin.userId) {
    return res.status(403).json({ success: false, error: 'Administrators cannot change their own account status.' });
  }
  if (deletedAccountIds.has(accountId)) {
    return res.status(409).json({ success: false, error: 'Deleted accounts cannot be approved or rejected.' });
  }

  const teacher = serverTeachers.get(accountId);
  const student = academicStore.students.find(item => item.id === accountId);
  const application = academicStore.captainRecords.find(item => item.studentId === accountId && item.isRegisteredAccount);
  const status = decision === 'approve' ? 'Approved' : 'Rejected';
  if (teacher) {
    if (teacher.verificationStatus !== 'Pending') {
      return res.status(409).json({ success: false, error: 'Only pending teacher accounts can be reviewed.' });
    }
    teacher.verificationStatus = decision === 'approve' ? 'Verified' : 'Rejected';
    if (typeof req.body?.notes === 'string') teacher.adminNotes = req.body.notes.trim().slice(0, 1000);
  } else if (student && (student.accountType === 'class_captain' || application)) {
    const currentStatus = application?.status || student.captainVerificationStatus;
    if (currentStatus !== 'Pending') {
      return res.status(409).json({ success: false, error: 'Only pending captain accounts can be reviewed.' });
    }
    if (decision === 'approve' && !application?.teacherEndorsement) {
      return res.status(409).json({ success: false, error: 'A teacher endorsement is required before approving a class captain.' });
    }
    if (decision === 'approve') {
      const currentCaptainCount = academicStore.students.filter(item =>
        item.id !== student.id &&
        item.accountType === 'class_captain' &&
        item.captainVerificationStatus === 'Approved' &&
        item.college === student.college &&
        item.department === student.department &&
        item.semester === student.semester &&
        item.shift === student.shift &&
        item.section === student.section
      ).length;
      if (currentCaptainCount >= 2) {
        return res.status(409).json({ success: false, error: 'This class already has the maximum of two approved captains.' });
      }
    }
    student.accountType = 'class_captain';
    student.captainVerificationStatus = status;
    if (application) {
      application.status = status;
      application.adminDecision = {
        decidedBy: `${admin.name} (${admin.email})`,
        decidedAt: new Date().toISOString(),
        notes: typeof req.body?.notes === 'string' ? req.body.notes.trim().slice(0, 1000) : undefined
      };
      if (decision === 'reject') {
        application.rejectionReason = application.adminDecision.notes;
      }
    }
  } else {
    return res.status(404).json({ success: false, error: 'No pending account found for review.' });
  }

  const targetName = teacher?.name || student?.name || application?.studentName || accountId;
  appendAdminAudit(admin, decision === 'approve' ? 'account_approved' : 'account_rejected', accountId, targetName);
  saveAcademicStore(academicStore);
  return res.status(200).json({ success: true, message: `${targetName} ${status.toLowerCase()}.` });
});

app.delete('/api/admin/accounts/:id', requireSystemAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminSession as ServerSession;
  const accountId = req.params.id;
  if (accountId === admin.userId) {
    return res.status(403).json({ success: false, error: 'You cannot delete the currently signed-in administrator.' });
  }
  const account = getAdminManagedAccounts().find(item => item.id === accountId);
  if (!account) return res.status(404).json({ success: false, error: 'Account not found.' });
  if (account.deleted) return res.status(409).json({ success: false, error: 'Account is already deleted.' });

  deletedAccountIds.add(accountId);
  academicStore.communityMemberships.forEach(membership => {
    if (membership.user_id === accountId && membership.status === 'active') {
      membership.status = 'banned';
      membership.updated_at = new Date().toISOString();
    }
  });
  academicStore.communities.forEach(community => {
    community.moderators = (Array.isArray(community.moderators) ? community.moderators : []).filter(id => id !== accountId);
    community.member_count = academicStore.communityMemberships.filter(
      membership => membership.community_id === community.id && membership.status === 'active' && !deletedAccountIds.has(membership.user_id)
    ).length;
  });
  appendAdminAudit(admin, 'account_deleted', accountId, account.name, 'Soft-deleted; related academic records retained.');
  saveAcademicStore(academicStore);
  return res.status(200).json({ success: true, message: `${account.name} was deactivated. Related academic records were retained.` });
});

app.get('/api/admin/communities', requireSystemAdmin, (_req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    communities: academicStore.communities,
    memberships: academicStore.communityMemberships,
    totalMemberships: academicStore.communityMemberships.length,
    totalMessages: academicStore.communityMessages.length,
    reports: academicStore.communityReports
  });
});

function validateCommunityImage(value: unknown): string | undefined | null {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > 500_000) return null;
  if (/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

app.post('/api/admin/communities', requireSystemAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminSession as ServerSession;
  const body = req.body || {};
  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim();
  const college = resolveStrictCollege(String(body.college || ''));
  const department = resolveStrictTechnology(String(body.department || ''));
  const semester = Number(body.semester);
  const image = validateCommunityImage(body.image_url);
  if (!name || name.length > 120 || description.length > 2000) {
    return res.status(400).json({ success: false, error: 'Community name (1-120 chars) and description (up to 2000 chars) are required.' });
  }
  if (!college || !department || !Number.isInteger(semester) || semester < 1 || semester > 8) {
    return res.status(400).json({ success: false, error: 'Select a valid college, department, and semester.' });
  }
  if (image === null) {
    return res.status(400).json({ success: false, error: 'Image must be an HTTPS URL or a PNG, JPEG, or WebP image under 500 KB.' });
  }
  const shift = body.shift === 'Morning' || body.shift === 'Day' ? body.shift : 'Both';
  const section = ['A1', 'A2', 'B1', 'B2'].includes(String(body.section)) ? body.section : 'All';
  const visibility = body.visibility === 'private' ? 'private' : 'public';
  const now = new Date().toISOString();
  const id = `comm_${crypto.randomUUID()}`;
  const community: AcademicCommunity = {
    id,
    name,
    description,
    college_id: college.id,
    college: college.name,
    department_id: department.id,
    department: department.name,
    semester: semester as SemesterNumber,
    regulation: body.regulation === '2016' ? '2016' : '2022',
    shift,
    section,
    visibility,
    created_by: admin.userId,
    created_by_name: admin.name,
    created_by_role: 'system_admin',
    moderators: [admin.userId],
    member_count: 1,
    is_active: true,
    avatar_emoji: typeof body.avatar_emoji === 'string' ? body.avatar_emoji.slice(0, 8) : '📚',
    image_url: image,
    created_at: now,
    updated_at: now
  };
  academicStore.communities.push(community);
  academicStore.communityMemberships.push({
    id: `mem_${id}_${admin.userId}`,
    community_id: id,
    user_id: admin.userId,
    user_name: admin.name,
    user_role: 'system_admin',
    college_id: college.id,
    department_id: department.id,
    semester: semester as SemesterNumber,
    membership_role: 'owner',
    status: 'active',
    is_muted: false,
    joined_at: now,
    updated_at: now
  });
  appendAdminAudit(admin, 'community_created', id, name);
  saveAcademicStore(academicStore);
  return res.status(201).json({ success: true, message: `Community "${name}" created.`, community });
});

app.put('/api/admin/communities/:id', requireSystemAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminSession as ServerSession;
  const community = academicStore.communities.find(item => item.id === req.params.id);
  if (!community || community.deleted_at) {
    return res.status(404).json({ success: false, error: 'Community not found.' });
  }
  const body = req.body || {};
  const nextName = body.name === undefined ? community.name : String(body.name).trim();
  const nextDescription = body.description === undefined ? community.description : String(body.description).trim();
  const nextImage = body.image_url === undefined ? community.image_url : validateCommunityImage(body.image_url);
  const nextCollege = body.college === undefined ? null : resolveStrictCollege(String(body.college || ''));
  const nextDepartment = body.department === undefined ? null : resolveStrictTechnology(String(body.department || ''));
  const nextSemester = body.semester === undefined ? community.semester : Number(body.semester);
  if (!nextName || nextName.length > 120 || nextDescription.length > 2000) {
    return res.status(400).json({ success: false, error: 'Community name must be 1-120 chars and description at most 2000 chars.' });
  }
  if (nextImage === null) {
    return res.status(400).json({ success: false, error: 'Image must be an HTTPS URL or a PNG, JPEG, or WebP image under 500 KB.' });
  }
  if ((body.college !== undefined && !nextCollege) || (body.department !== undefined && !nextDepartment)) {
    return res.status(400).json({ success: false, error: 'Select a valid canonical college and department.' });
  }
  if (!Number.isInteger(nextSemester) || nextSemester < 1 || nextSemester > 8) {
    return res.status(400).json({ success: false, error: 'Semester must be between 1 and 8.' });
  }
  community.name = nextName;
  community.description = nextDescription;
  community.image_url = nextImage;
  if (nextCollege) {
    community.college_id = nextCollege.id;
    community.college = nextCollege.name;
  }
  if (nextDepartment) {
    community.department_id = nextDepartment.id;
    community.department = nextDepartment.name;
  }
  if (body.visibility === 'public' || body.visibility === 'private') community.visibility = body.visibility;
  if (body.shift === 'Morning' || body.shift === 'Day' || body.shift === 'Both') community.shift = body.shift;
  if (['A1', 'A2', 'B1', 'B2', 'All'].includes(String(body.section))) community.section = body.section;
  if (body.is_active === true || body.is_active === false) community.is_active = body.is_active;
  community.semester = nextSemester as SemesterNumber;
  community.updated_at = new Date().toISOString();
  appendAdminAudit(admin, 'community_edited', community.id, community.name);
  saveAcademicStore(academicStore);
  return res.status(200).json({ success: true, message: `Community "${community.name}" updated.`, community });
});

app.delete('/api/admin/communities/:id', requireSystemAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminSession as ServerSession;
  const community = academicStore.communities.find(item => item.id === req.params.id);
  if (!community || community.deleted_at) {
    return res.status(404).json({ success: false, error: 'Community not found or already deleted.' });
  }
  community.is_active = false;
  community.deleted_at = new Date().toISOString();
  community.updated_at = community.deleted_at;
  appendAdminAudit(admin, 'community_deleted', community.id, community.name, 'Soft-deleted; messages and memberships retained.');
  saveAcademicStore(academicStore);
  return res.status(200).json({ success: true, message: `Community "${community.name}" was deleted. Its history was retained.` });
});

app.post('/api/admin/communities/:id/members', requireSystemAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminSession as ServerSession;
  const community = academicStore.communities.find(item => item.id === req.params.id && !item.deleted_at);
  const userId = String(req.body?.userId || '');
  const account = getAdminManagedAccounts().find(item => item.id === userId && !item.deleted);
  if (!community) return res.status(404).json({ success: false, error: 'Community not found.' });
  if (!account) return res.status(404).json({ success: false, error: 'Active account not found.' });
  const current = academicStore.communityMemberships.find(item => item.community_id === community.id && item.user_id === userId);
  if (current?.status === 'active') return res.status(409).json({ success: false, error: 'This account is already a member.' });
  const student = academicStore.students.find(item => item.id === userId);
  const teacher = serverTeachers.get(userId);
  const college = resolveStrictCollege(student?.college || teacher?.college || community.college);
  const department = resolveStrictTechnology(student?.department || teacher?.department || community.department);
  const now = new Date().toISOString();
  const membership: CommunityMembershipRecord = {
    id: current?.id || `mem_${community.id}_${userId}`,
    community_id: community.id,
    user_id: userId,
    user_name: account.name,
    user_role: account.role,
    college_id: college?.id || community.college_id,
    department_id: department?.id || community.department_id,
    semester: (student?.semester || teacher?.semestersTaught[0] || community.semester) as SemesterNumber,
    shift: student?.shift || (teacher?.shift === 'Both' ? undefined : teacher?.shift),
    section: student?.section,
    membership_role: 'member',
    status: 'active',
    is_muted: false,
    joined_at: current?.joined_at || now,
    updated_at: now
  };
  if (current) academicStore.communityMemberships[academicStore.communityMemberships.indexOf(current)] = membership;
  else academicStore.communityMemberships.push(membership);
  community.member_count = academicStore.communityMemberships.filter(item => item.community_id === community.id && item.status === 'active').length;
  appendAdminAudit(admin, 'community_member_added', community.id, community.name, `Added ${account.name} (${userId}).`);
  saveAcademicStore(academicStore);
  return res.status(200).json({ success: true, message: `${account.name} added to ${community.name}.`, membership });
});

app.delete('/api/admin/communities/:id/members/:userId', requireSystemAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminSession as ServerSession;
  const community = academicStore.communities.find(item => item.id === req.params.id);
  const index = academicStore.communityMemberships.findIndex(
    item => item.community_id === req.params.id && item.user_id === req.params.userId
  );
  if (!community) return res.status(404).json({ success: false, error: 'Community not found.' });
  if (index < 0) return res.status(404).json({ success: false, error: 'Community member not found.' });
  const [membership] = academicStore.communityMemberships.splice(index, 1);
  community.moderators = (Array.isArray(community.moderators) ? community.moderators : []).filter(id => id !== membership.user_id);
  community.member_count = academicStore.communityMemberships.filter(item => item.community_id === community.id && item.status === 'active').length;
  community.updated_at = new Date().toISOString();
  appendAdminAudit(admin, 'community_member_removed', community.id, community.name, `Removed ${membership.user_name} (${membership.user_id}).`);
  saveAcademicStore(academicStore);
  return res.status(200).json({ success: true, message: `${membership.user_name} removed from ${community.name}.` });
});

app.put('/api/admin/communities/:id/members/:userId/moderator', requireSystemAdmin, (req: Request, res: Response) => {
  const admin = (req as any).adminSession as ServerSession;
  const community = academicStore.communities.find(item => item.id === req.params.id && !item.deleted_at);
  const membership = academicStore.communityMemberships.find(
    item => item.community_id === req.params.id && item.user_id === req.params.userId && item.status === 'active'
  );
  if (!community) return res.status(404).json({ success: false, error: 'Community not found.' });
  if (!membership) return res.status(404).json({ success: false, error: 'Active community member not found.' });
  if (!Array.isArray(community.moderators)) community.moderators = [];
  const isModerator = req.body?.isModerator === true;
  if (isModerator) {
    membership.membership_role = 'moderator';
    if (!community.moderators.includes(membership.user_id)) community.moderators.push(membership.user_id);
  } else {
    membership.membership_role = membership.user_id === community.created_by ? 'owner' : 'member';
    community.moderators = community.moderators.filter(id => id !== membership.user_id);
  }
  membership.updated_at = new Date().toISOString();
  community.updated_at = membership.updated_at;
  appendAdminAudit(admin, isModerator ? 'community_moderator_assigned' : 'community_moderator_removed', community.id, community.name, `${membership.user_name} (${membership.user_id}).`);
  saveAcademicStore(academicStore);
  return res.status(200).json({ success: true, message: isModerator ? 'Moderator assigned.' : 'Moderator removed.', membership });
});

app.post('/api/admin/communities/:id/toggle-active', requireSystemAdmin, (req: Request, res: Response) => {
  const comm = academicStore.communities.find(c => c.id === req.params.id);
  if (!comm || comm.deleted_at) {
    return res.status(404).json({ success: false, error: 'Community not found.' });
  }

  const admin = (req as any).adminSession as ServerSession;
  comm.is_active = !comm.is_active;
  comm.updated_at = new Date().toISOString();
  appendAdminAudit(admin, 'community_edited', comm.id, comm.name, comm.is_active ? 'Activated.' : 'Deactivated.');
  saveAcademicStore(academicStore);

  return res.status(200).json({
    success: true,
    is_active: comm.is_active,
    message: comm.is_active ? `Community ${comm.name} activated.` : `Community ${comm.name} deactivated.`
  });
});

app.post('/api/admin/communities/reports/:id/resolve', requireSystemAdmin, (req: Request, res: Response) => {
  const report = academicStore.communityReports.find(r => r.id === req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, error: 'Report not found.' });
  }

  const { status, notes } = req.body || {};
  report.status = status === 'dismissed' ? 'dismissed' : 'resolved';
  report.resolution_notes = notes ? String(notes).trim() : 'Resolved by System Administrator.';
  saveAcademicStore(academicStore);

  return res.status(200).json({
    success: true,
    report
  });
});

/**
 * ============================================================================
 * 16. AUTOMATIC BTEB NOTICES, TEACHER/CR CAMPUS NOTICES & JOB CIRCULARS
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 16A. OFFICIAL BTEB NOTICES SYNCHRONIZER (`https://bteb.gov.bd/pages/notices`)
// ----------------------------------------------------------------------------
interface BtebNoticesCacheStore {
  notices: BtebOfficialNotice[];
  lastSyncedAt: string | null;
  lastSyncAttemptAt: string | null;
  lastSyncError: string | null;
  pagesFetched: number;
  totalReportedOnBteb: number;
}

const BTEB_NOTICES_CACHE_FILE = path.join(DATA_DIR, 'bteb-notices-cache.json');
const BTEB_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes automatic refresh

function isBtebNoticesSyncDue(nowMs = Date.now()): boolean {
  const lastSyncedMs = btebNoticesCache.lastSyncedAt ? new Date(btebNoticesCache.lastSyncedAt).getTime() : 0;
  const lastAttemptMs = btebNoticesCache.lastSyncAttemptAt ? new Date(btebNoticesCache.lastSyncAttemptAt).getTime() : 0;
  return nowMs - Math.max(lastSyncedMs, lastAttemptMs) >= BTEB_SYNC_INTERVAL_MS;
}

function loadBtebNoticesCache(): BtebNoticesCacheStore {
  try {
    if (fs.existsSync(BTEB_NOTICES_CACHE_FILE)) {
      const raw = fs.readFileSync(BTEB_NOTICES_CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.notices)) {
        return {
          notices: parsed.notices,
          lastSyncedAt: parsed.lastSyncedAt || null,
          lastSyncAttemptAt: parsed.lastSyncAttemptAt || null,
          lastSyncError: parsed.lastSyncError || null,
          pagesFetched: Number(parsed.pagesFetched) || 0,
          totalReportedOnBteb: Number(parsed.totalReportedOnBteb) || parsed.notices.length
        };
      }
    }
  } catch (err) {
    console.error('[BTEB Notices Cache] Error loading bteb-notices-cache.json:', err);
  }
  return {
    notices: [],
    lastSyncedAt: null,
    lastSyncAttemptAt: null,
    lastSyncError: null,
    pagesFetched: 0,
    totalReportedOnBteb: 0
  };
}

function saveBtebNoticesCache(store: BtebNoticesCacheStore): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${BTEB_NOTICES_CACHE_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), 'utf-8');
    fs.renameSync(tempFile, BTEB_NOTICES_CACHE_FILE);
  } catch (err) {
    console.error('[BTEB Notices Cache] Error saving bteb-notices-cache.json:', err);
  }
}

const btebNoticesCache: BtebNoticesCacheStore = loadBtebNoticesCache();

const BN_DIGITS_MAP: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9'
};

function bnToEnDigits(input: string): string {
  return String(input || '').replace(/[০-৯]/g, d => BN_DIGITS_MAP[d] ?? d);
}

function decodeHtmlEntities(text: string): string {
  return String(text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifyBtebNoticeCategory(title: string): BtebNoticeCategory {
  const t = title.toLowerCase();
  if (t.includes('টেক্সটাইল') || t.includes('textile')) {
    return 'Diploma in Textile';
  }
  if (t.includes('কৃষি') || t.includes('agriculture') || t.includes('ফিশারিজ') || t.includes('লাইভস্টক') || t.includes('ফরেস্ট্রি')) {
    return 'Diploma in Agriculture';
  }
  if (t.includes('এইচএসসি') || t.includes('বিএমটি') || t.includes('বিএম') || t.includes('hsc') || t.includes('bmt')) {
    return 'HSC (BMT / Vocational)';
  }
  if (t.includes('এসএসসি') || t.includes('দাখিল') || t.includes('ssc') || t.includes('ভোকেশনাল শিক্ষাক্রমের এসএসসি')) {
    return 'SSC (Vocational / Dakhil)';
  }
  if (t.includes('ডিপ্লোমা') || t.includes('diploma') || t.includes('ইঞ্জিনিয়ারিং') || t.includes('ইঞ্জিনিয়ারিং') || t.includes('ট্যুরিজম')) {
    return 'Diploma in Engineering';
  }
  if (t.includes('ভর্তি') || t.includes('রেজিস্ট্রেশন') || t.includes('admission') || t.includes('registration')) {
    return 'Admission & Registration';
  }
  if (t.includes('ফলাফল') || t.includes('বৃত্তি') || t.includes('উপবৃত্তি') || t.includes('result') || t.includes('scholarship')) {
    return 'Result & Scholarship';
  }
  if (t.includes('পরীক্ষা') || t.includes('ফরম ফিলআপ') || t.includes('ফরম পূরণ') || t.includes('রুটিন') || t.includes('কেন্দ্র') || t.includes('প্রবেশপত্র')) {
    return 'Examination & Form Fill-up';
  }
  return 'General / Administrative';
}

function parseBtebDateStrings(commentDateRaw: string, publishDateBnRaw: string): {
  isoDate: string;
  displayDate: string;
  bnDate: string;
} {
  const cleanBn = String(publishDateBnRaw || '').trim();
  const enFromBn = bnToEnDigits(cleanBn); // e.g. "19-10-2026"
  const dmyMatch = enFromBn.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    const yyyy = dmyMatch[3];
    return {
      isoDate: `${yyyy}-${mm}-${dd}`,
      displayDate: `${dd}-${mm}-${yyyy}`,
      bnDate: cleanBn || `${dd}-${mm}-${yyyy}`
    };
  }

  // Fallback to commented MM/DD/YYYY date
  const cleanComment = String(commentDateRaw || '').trim();
  const mdyMatch = cleanComment.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const mm = mdyMatch[1].padStart(2, '0');
    const dd = mdyMatch[2].padStart(2, '0');
    const yyyy = mdyMatch[3];
    return {
      isoDate: `${yyyy}-${mm}-${dd}`,
      displayDate: `${dd}-${mm}-${yyyy}`,
      bnDate: cleanBn || `${dd}-${mm}-${yyyy}`
    };
  }

  return {
    isoDate: '2026-01-01',
    displayDate: enFromBn || cleanComment || 'N/A',
    bnDate: cleanBn || enFromBn || 'N/A'
  };
}

function parseBtebNoticesPageHtml(html: string): {
  parsedNotices: Array<Omit<BtebOfficialNotice, 'firstDiscoveredAt' | 'lastVerifiedAt'>>;
  totalEntriesReported: number;
} {
  const parsedNotices: Array<Omit<BtebOfficialNotice, 'firstDiscoveredAt' | 'lastVerifiedAt'>> = [];

  // Extract total count e.g. "মোট ৪১২ এন্ট্রি"
  let totalEntriesReported = 0;
  const totalMatch = html.match(/মোট\s+([০-৯0-9,]+)\s+এন্ট্রি/i) || html.match(/of\s+([0-9,]+)\s+entries/i);
  if (totalMatch) {
    const numStr = bnToEnDigits(totalMatch[1]).replace(/,/g, '');
    totalEntriesReported = parseInt(numStr, 10) || 0;
  }

  // Extract tbody inside <table id="noticeTable" ...>
  const tableMatch = html.match(/<table[^>]*id=["']noticeTable["'][^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
    return { parsedNotices, totalEntriesReported };
  }

  const tbodyMatch = tableMatch[1].match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  const rowsScope = tbodyMatch ? tbodyMatch[1] : tableMatch[1];

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(rowsScope)) !== null) {
    const rowHtml = rowMatch[1];

    // 1. Serial ID
    const idMatch = rowHtml.match(/<td[^>]*data-column=["']id["'][^>]*>([\s\S]*?)<\/td>/i);
    const serialBn = idMatch ? decodeHtmlEntities(idMatch[1].replace(/<[^>]+>/g, '')) : '';
    const serialNumber = parseInt(bnToEnDigits(serialBn), 10) || parsedNotices.length + 1;

    // 2. Commented English date: <!-- <td class="table-td">10/19/2026</td>-->
    const commentDateMatch = rowHtml.match(/<!--\s*<td[^>]*>\s*([^<]+?)\s*<\/td>\s*-->/i);
    const commentDateRaw = commentDateMatch ? commentDateMatch[1].trim() : '';

    // 3. Title
    const titleMatch = rowHtml.match(/<td[^>]*data-column=["']title["'][^>]*>([\s\S]*?)<\/td>/i);
    const rawTitleHtml = titleMatch ? titleMatch[1] : '';
    const title = decodeHtmlEntities(rawTitleHtml.replace(/<[^>]+>/g, ''));
    if (!title) continue;

    // 4. PDF / Attachment link in data-column="files"
    const filesTdMatch = rowHtml.match(/<td[^>]*data-column=["']files["'][^>]*>([\s\S]*?)<\/td>/i);
    let pdfUrl: string | null = null;
    if (filesTdMatch) {
      const hrefMatch = filesTdMatch[1].match(/href=["']([^"']+)["']/i);
      if (hrefMatch && hrefMatch[1].trim()) {
        const rawHref = hrefMatch[1].trim();
        pdfUrl = rawHref.startsWith('http') ? rawHref : `https://bteb.gov.bd${rawHref.startsWith('/') ? '' : '/'}${rawHref}`;
      }
    }

    // 5. Image link in data-column="image"
    const imageTdMatch = rowHtml.match(/<td[^>]*data-column=["']image["'][^>]*>([\s\S]*?)<\/td>/i);
    let imageUrl: string | null = null;
    if (imageTdMatch) {
      const hrefMatch = imageTdMatch[1].match(/href=["']([^"']+)["']/i);
      if (hrefMatch && hrefMatch[1].trim()) {
        const rawHref = hrefMatch[1].trim();
        imageUrl = rawHref.startsWith('http') ? rawHref : `https://bteb.gov.bd${rawHref.startsWith('/') ? '' : '/'}${rawHref}`;
      }
    }

    // 6. Publish date in data-column="publish_date"
    const pubDateTdMatch = rowHtml.match(/<td[^>]*data-column=["']publish_date["'][^>]*>([\s\S]*?)<\/td>/i);
    const publishDateBn = pubDateTdMatch ? decodeHtmlEntities(pubDateTdMatch[1].replace(/<[^>]+>/g, '')) : '';

    // 7. Original notice URL in `/pages/notices/...`
    const detailsLinkMatch = rowHtml.match(/href=["'](\/pages\/notices\/[^"']+|https?:\/\/bteb\.gov\.bd\/pages\/notices\/[^"']+)["']/i);
    let noticeUrl = 'https://bteb.gov.bd/pages/notices';
    let noticeId = '';
    if (detailsLinkMatch && detailsLinkMatch[1]) {
      const rawUrl = detailsLinkMatch[1].trim();
      noticeUrl = rawUrl.startsWith('http') ? rawUrl : `https://bteb.gov.bd${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
      const slugParts = rawUrl.split('-');
      const tailHex = slugParts[slugParts.length - 1];
      if (tailHex && /^[a-f0-9]{10,32}$/i.test(tailHex)) {
        noticeId = `bteb_${tailHex}`;
      }
    }

    if (!noticeId) {
      const hash = crypto.createHash('sha1').update(`${title}_${publishDateBn}_${pdfUrl || ''}`).digest('hex').slice(0, 16);
      noticeId = `bteb_${hash}`;
    }

    const { isoDate, displayDate, bnDate } = parseBtebDateStrings(commentDateRaw, publishDateBn);
    const category = classifyBtebNoticeCategory(title);

    parsedNotices.push({
      id: noticeId,
      serialBn: serialBn || String(serialNumber),
      serialNumber,
      title,
      publishedDateIso: isoDate,
      publishedDateDisplay: displayDate,
      publishedDateBn: bnDate,
      category,
      sourceLabel: 'Bangladesh Technical Education Board (BTEB)',
      noticeUrl,
      pdfUrl: pdfUrl || imageUrl || null,
      imageUrl
    });
  }

  return { parsedNotices, totalEntriesReported };
}

let isBtebSyncInProgress = false;

async function syncBtebOfficialNotices(options?: {
  force?: boolean;
  simulateOutage?: boolean;
}): Promise<{
  success: boolean;
  insertedCount: number;
  updatedCount: number;
  totalNotices: number;
  pagesFetched: number;
  lastSyncedAt: string | null;
  error?: string;
}> {
  if (isBtebSyncInProgress) {
    return {
      success: true,
      insertedCount: 0,
      updatedCount: 0,
      totalNotices: btebNoticesCache.notices.length,
      pagesFetched: btebNoticesCache.pagesFetched,
      lastSyncedAt: btebNoticesCache.lastSyncedAt
    };
  }

  const nowMs = Date.now();
  if (!options?.force && !options?.simulateOutage && !isBtebNoticesSyncDue(nowMs)) {
    return {
      success: true,
      insertedCount: 0,
      updatedCount: 0,
      totalNotices: btebNoticesCache.notices.length,
      pagesFetched: btebNoticesCache.pagesFetched,
      lastSyncedAt: btebNoticesCache.lastSyncedAt
    };
  }

  isBtebSyncInProgress = true;
  const nowIso = new Date().toISOString();
  btebNoticesCache.lastSyncAttemptAt = nowIso;

  try {
    if (options?.simulateOutage) {
      throw new Error('Simulated BTEB source server outage (Connection Timed Out).');
    }

    const pageSize = 500; // BTEB DatatableBrowseWidget supports page_size=500 to retrieve all 412+ notices efficiently
    let currentPage = 1;
    let totalPagesToFetch = 1;
    let pagesFetched = 0;
    let totalReported = 0;
    const allDiscovered: Array<Omit<BtebOfficialNotice, 'firstDiscoveredAt' | 'lastVerifiedAt'>> = [];

    while (currentPage <= totalPagesToFetch && currentPage <= 10) {
      const targetUrl = `https://bteb.gov.bd/pages/notices?page_size=${pageSize}&page=${currentPage}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);

      let html = '';
      try {
        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DiplomaMate/2.5 AcademicNoticeSync',
            'Accept': 'text/html,application/xhtml+xml'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`BTEB server returned HTTP ${response.status}`);
        }
        html = await response.text();
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        throw fetchErr;
      }

      const { parsedNotices, totalEntriesReported } = parseBtebNoticesPageHtml(html);
      pagesFetched += 1;

      if (totalEntriesReported > 0) {
        totalReported = totalEntriesReported;
        totalPagesToFetch = Math.ceil(totalEntriesReported / pageSize);
      }

      if (parsedNotices.length === 0) {
        break;
      }

      allDiscovered.push(...parsedNotices);
      currentPage += 1;
    }

    if (allDiscovered.length === 0) {
      throw new Error('BTEB notice page returned 0 recognizable notice rows.');
    }

    // Merge with existing cache: deduplicate by ID or noticeUrl, detect updates, preserve existing notices
    const existingById = new Map<string, BtebOfficialNotice>();
    const existingByUrl = new Map<string, BtebOfficialNotice>();
    for (const item of btebNoticesCache.notices) {
      existingById.set(item.id, item);
      if (item.noticeUrl) existingByUrl.set(item.noticeUrl, item);
    }

    let insertedCount = 0;
    let updatedCount = 0;
    const mergedMap = new Map<string, BtebOfficialNotice>();

    // Determine "New" badge threshold: top 12 newest serials or published within last 14 days
    const fourteenDaysAgoMs = Date.now() - 14 * 24 * 60 * 60 * 1000;

    for (let idx = 0; idx < allDiscovered.length; idx++) {
      const incoming = allDiscovered[idx];
      const existing = existingById.get(incoming.id) || existingByUrl.get(incoming.noticeUrl);
      const pubTimeMs = new Date(incoming.publishedDateIso).getTime();
      const isRecent = idx < 12 || (!isNaN(pubTimeMs) && pubTimeMs >= fourteenDaysAgoMs && pubTimeMs <= Date.now() + 86400000);

      if (!existing) {
        insertedCount += 1;
        mergedMap.set(incoming.id, {
          ...incoming,
          isNew: isRecent,
          firstDiscoveredAt: nowIso,
          lastVerifiedAt: nowIso
        });
      } else {
        const hasChanged =
          existing.title !== incoming.title ||
          existing.pdfUrl !== incoming.pdfUrl ||
          existing.publishedDateDisplay !== incoming.publishedDateDisplay;

        if (hasChanged) {
          updatedCount += 1;
        }

        mergedMap.set(existing.id, {
          ...existing,
          ...incoming,
          id: existing.id,
          isNew: isRecent,
          firstDiscoveredAt: existing.firstDiscoveredAt || nowIso,
          lastVerifiedAt: nowIso,
          updatedAt: hasChanged ? nowIso : existing.updatedAt
        });
      }
    }

    // Preserve any previously cached notices that were not in the current fetch window
    for (const oldItem of btebNoticesCache.notices) {
      if (!mergedMap.has(oldItem.id)) {
        mergedMap.set(oldItem.id, oldItem);
      }
    }

    const finalNotices = Array.from(mergedMap.values()).sort((a, b) => {
      if (a.serialNumber !== b.serialNumber) return a.serialNumber - b.serialNumber;
      return b.publishedDateIso.localeCompare(a.publishedDateIso);
    });

    // Equivalent to covering all 10-per-page standard BTEB pages (e.g. 412 notices = 42 standard pages)
    const effectiveStandardPagesCovered = Math.max(pagesFetched, Math.ceil(finalNotices.length / 10));

    btebNoticesCache.notices = finalNotices;
    btebNoticesCache.lastSyncedAt = nowIso;
    btebNoticesCache.lastSyncError = null;
    btebNoticesCache.pagesFetched = effectiveStandardPagesCovered;
    btebNoticesCache.totalReportedOnBteb = totalReported || finalNotices.length;
    saveBtebNoticesCache(btebNoticesCache);

    isBtebSyncInProgress = false;
    return {
      success: true,
      insertedCount,
      updatedCount,
      totalNotices: finalNotices.length,
      pagesFetched: effectiveStandardPagesCovered,
      lastSyncedAt: nowIso
    };
  } catch (err: any) {
    isBtebSyncInProgress = false;
    const errMsg = err?.message || 'Unable to reach official BTEB server (bteb.gov.bd).';
    console.warn('[BTEB Notice Sync] Warning — preserving cached notices:', errMsg);
    btebNoticesCache.lastSyncError = errMsg;
    saveBtebNoticesCache(btebNoticesCache);

    return {
      success: false,
      insertedCount: 0,
      updatedCount: 0,
      totalNotices: btebNoticesCache.notices.length,
      pagesFetched: btebNoticesCache.pagesFetched,
      lastSyncedAt: btebNoticesCache.lastSyncedAt,
      error: `BTEB live synchronization failed (${errMsg}). Displaying ${btebNoticesCache.notices.length} preserved cached notices.`
    };
  }
}

// Trigger initial non-blocking background BTEB sync on server boot & schedule 30-min periodic refresh
setTimeout(() => {
  syncBtebOfficialNotices({ force: false }).catch(err =>
    console.warn('[BTEB Initial Sync] Non-fatal error:', err?.message)
  );
}, 500);

setInterval(() => {
  syncBtebOfficialNotices({ force: true }).catch(err =>
    console.warn('[BTEB Scheduled Sync] Non-fatal error:', err?.message)
  );
}, BTEB_SYNC_INTERVAL_MS);

/**
 * 16A-1. GET OFFICIAL BTEB NOTICES (`GET /api/notices/bteb`)
 * Supports search (`q`), `category`, `dateFrom`, `dateTo`, pagination (`page`, `pageSize`),
 * and preserves cached notices if source fails.
 */
app.get('/api/notices/bteb', async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const simulateOutage = req.query.simulateOutage === 'true';

    let syncResult = null;
    if (forceRefresh || simulateOutage || isBtebNoticesSyncDue()) {
      syncResult = await syncBtebOfficialNotices({ force: forceRefresh, simulateOutage });
    }

    const q = String(req.query.q || '').trim().toLowerCase();
    const category = String(req.query.category || 'all').trim();
    const dateFrom = String(req.query.dateFrom || '').trim();
    const dateTo = String(req.query.dateTo || '').trim();
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize || '25'), 10) || 25));

    const filtered = btebNoticesCache.notices.filter(item => {
      if (q && !item.title.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q) && !item.publishedDateDisplay.includes(q) && !item.publishedDateBn.includes(q)) {
        return false;
      }
      if (category && category !== 'all' && item.category.toLowerCase() !== category.toLowerCase()) {
        return false;
      }
      if (dateFrom && item.publishedDateIso < dateFrom) {
        return false;
      }
      if (dateTo && item.publishedDateIso > dateTo) {
        return false;
      }
      return true;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIdx = (page - 1) * pageSize;
    const paginated = filtered.slice(startIdx, startIdx + pageSize);

    // Distinct categories with counts
    const categoryCounts: Record<string, number> = {};
    for (const n of btebNoticesCache.notices) {
      categoryCounts[n.category] = (categoryCounts[n.category] || 0) + 1;
    }

    return res.status(200).json({
      success: true,
      sourceLabel: 'Bangladesh Technical Education Board (BTEB)',
      sourceUrl: 'https://bteb.gov.bd/pages/notices',
      lastSyncedAt: btebNoticesCache.lastSyncedAt,
      lastSyncAttemptAt: btebNoticesCache.lastSyncAttemptAt,
      syncError: syncResult?.error || btebNoticesCache.lastSyncError || null,
      pagesFetched: btebNoticesCache.pagesFetched,
      totalAvailableOnBteb: btebNoticesCache.totalReportedOnBteb || btebNoticesCache.notices.length,
      totalCached: btebNoticesCache.notices.length,
      totalFiltered: total,
      page,
      pageSize,
      totalPages,
      hasMore: startIdx + paginated.length < total,
      categoryCounts,
      notices: paginated
    });
  } catch (err: any) {
    console.error('[GET /api/notices/bteb] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve BTEB official notices.'
    });
  }
});

/**
 * 16A-2. TRIGGER ON-DEMAND BTEB NOTICE SYNC OR ADMIN ASSISTED IMPORT (`POST /api/notices/bteb/sync`)
 */
app.post('/api/notices/bteb/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const { simulateOutage, manualNotices } = req.body || {};

    // Support admin-assisted or test discovery of new notices without duplicating existing ones
    if (Array.isArray(manualNotices) && manualNotices.length > 0) {
      const session = getAuthenticatedSession(req);
      if (!session || (session.role !== 'system_admin' && session.role !== 'teacher')) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Only System Administrators or Verified Teachers can import manual BTEB notice entries.'
        });
      }

      const nowIso = new Date().toISOString();
      let insertedCount = 0;
      let updatedCount = 0;

      for (const raw of manualNotices) {
        const title = String(raw.title || '').trim();
        if (!title) continue;
        const noticeUrl = String(raw.noticeUrl || 'https://bteb.gov.bd/pages/notices').trim();
        const id = raw.id
          ? String(raw.id).trim()
          : `bteb_${crypto.createHash('sha1').update(`${title}_${noticeUrl}`).digest('hex').slice(0, 16)}`;

        const existingIdx = btebNoticesCache.notices.findIndex(
          n => n.id === id || (n.noticeUrl === noticeUrl && n.title === title)
        );

        const pubIso = raw.publishedDateIso || new Date().toISOString().slice(0, 10);
        const pubDisplay = raw.publishedDateDisplay || pubIso.split('-').reverse().join('-');

        if (existingIdx >= 0) {
          const existing = btebNoticesCache.notices[existingIdx];
          const changed = existing.title !== title || existing.pdfUrl !== (raw.pdfUrl || existing.pdfUrl);
          if (changed) updatedCount += 1;
          btebNoticesCache.notices[existingIdx] = {
            ...existing,
            title,
            pdfUrl: raw.pdfUrl !== undefined ? raw.pdfUrl : existing.pdfUrl,
            noticeUrl,
            category: raw.category || classifyBtebNoticeCategory(title),
            lastVerifiedAt: nowIso,
            updatedAt: changed ? nowIso : existing.updatedAt
          };
        } else {
          insertedCount += 1;
          btebNoticesCache.notices.unshift({
            id,
            serialBn: raw.serialBn || 'নতুন',
            serialNumber: 0,
            title,
            publishedDateIso: pubIso,
            publishedDateDisplay: pubDisplay,
            publishedDateBn: raw.publishedDateBn || pubDisplay,
            category: raw.category || classifyBtebNoticeCategory(title),
            sourceLabel: 'Bangladesh Technical Education Board (BTEB)',
            noticeUrl,
            pdfUrl: raw.pdfUrl || null,
            imageUrl: raw.imageUrl || null,
            isNew: true,
            firstDiscoveredAt: nowIso,
            lastVerifiedAt: nowIso
          });
        }
      }

      btebNoticesCache.lastSyncedAt = nowIso;
      saveBtebNoticesCache(btebNoticesCache);

      return res.status(200).json({
        success: true,
        insertedCount,
        updatedCount,
        totalNotices: btebNoticesCache.notices.length,
        lastSyncedAt: btebNoticesCache.lastSyncedAt,
        message: `Synchronized BTEB notices (${insertedCount} new added, ${updatedCount} updated, duplicates prevented).`
      });
    }

    const result = await syncBtebOfficialNotices({
      force: true,
      simulateOutage: Boolean(simulateOutage)
    });

    return res.status(200).json({
      ...result,
      message: result.success
        ? `Synchronized ${result.totalNotices} official BTEB notices across ${result.pagesFetched} pages (${result.insertedCount} new, ${result.updatedCount} updated).`
        : result.error
    });
  } catch (err: any) {
    console.error('[POST /api/notices/bteb/sync] Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to synchronize BTEB notices.'
    });
  }
});

// ----------------------------------------------------------------------------
// 16B. TEACHER & CLASS CAPTAIN (CR) PUBLISHED NOTICES (`/api/notices/campus`)
// ----------------------------------------------------------------------------

function isCaptainAuthorizedForCohort(
  session: ServerSession,
  target: {
    college: string;
    department: string;
    semester: number;
    shift: string;
    section: string;
  }
): { authorized: boolean; error?: string; captainCollege?: string; captainDept?: string; captainSem?: number; captainShift?: Shift; captainSec?: Section } {
  // Check session + approved captain records / enrolled students
  const colNorm = normalizeCollege(target.college);
  const deptNorm = normalizeTechnology(target.department);

  // Find captain's own verified cohort from session or store
  const sessionCollege = session.college ? normalizeCollege(session.college) : null;
  const sessionDept = session.department ? normalizeTechnology(session.department) : null;
  const sessionSem = session.semester ? Number(session.semester) : null;
  const sessionShift = session.shift || 'Morning';
  const sessionSec = session.section || 'A1';

  // Also check if captain has an approved application in captainRecords
  const approvedApp = academicStore.captainRecords.find(
    app =>
      app.status === 'Approved' &&
      (app.studentId === session.userId || (session.boardRoll && app.boardRoll === session.boardRoll))
  );

  const authCollege = approvedApp ? normalizeCollege(approvedApp.college) : sessionCollege;
  const authDept = approvedApp ? normalizeTechnology(approvedApp.department) : sessionDept;
  const authSem = approvedApp ? Number(approvedApp.semester) : sessionSem;
  const authShift = (approvedApp ? approvedApp.shift : sessionShift) as Shift;
  const authSec = (approvedApp ? approvedApp.section : sessionSec) as Section;

  if (!authCollege || !authDept || !authSem) {
    return {
      authorized: false,
      error: 'Forbidden: Class Captain profile is missing a verified college, department, or semester cohort.'
    };
  }

  if (colNorm.id !== authCollege.id) {
    return {
      authorized: false,
      error: `Forbidden (College Scope): As Class Captain, you can only publish notices for "${authCollege.name}", not "${target.college}".`
    };
  }

  if (deptNorm.id !== authDept.id) {
    return {
      authorized: false,
      error: `Forbidden (Department Scope): As Class Captain, you can only publish notices for "${authDept.name}", not "${target.department}".`
    };
  }

  if (Number(target.semester) !== authSem) {
    return {
      authorized: false,
      error: `Forbidden (Semester Scope): As Class Captain, you can only publish notices for Semester ${authSem}, not Semester ${target.semester}.`
    };
  }

  if (String(target.shift).toLowerCase() !== String(authShift).toLowerCase()) {
    return {
      authorized: false,
      error: `Forbidden (Shift Scope): As Class Captain, you can only publish notices for ${authShift} Shift, not ${target.shift} Shift.`
    };
  }

  if (String(target.section).toUpperCase() !== String(authSec).toUpperCase()) {
    return {
      authorized: false,
      error: `Forbidden (Section Scope): As Class Captain, you can only publish notices for Section ${authSec}, not Section ${target.section}.`
    };
  }

  return {
    authorized: true,
    captainCollege: authCollege.name,
    captainDept: authDept.name,
    captainSem: authSem,
    captainShift: authShift,
    captainSec: authSec
  };
}

/**
 * 16B-1. GET TEACHER & CR CAMPUS NOTICES (`GET /api/notices/campus`)
 * Supports `filter`: `'all' | 'college' | 'my_group'`, search `q`, and user cohort context.
 */
app.get('/api/notices/campus', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    const filter = String(req.query.filter || 'all').trim().toLowerCase();
    const q = String(req.query.q || '').trim().toLowerCase();
    const includeExpired = req.query.includeExpired === 'true';

    const rawCollege = String(req.query.college || session?.college || 'Dhaka Polytechnic Institute (DPI), Tejgaon').trim();
    const rawDept = String(req.query.department || session?.department || 'Computer Science & Technology (CST)').trim();
    const semNum = Number(req.query.semester || session?.semester || 6);
    const shiftStr = String(req.query.shift || session?.shift || 'Morning').trim();
    const sectionStr = String(req.query.section || session?.section || 'A1').trim();

    const userCollege = normalizeCollege(rawCollege);
    const userDept = normalizeTechnology(rawDept);
    const todayIso = new Date().toISOString().slice(0, 10);

    const notices = academicStore.campusNotices
      .filter(notice => {
        // Expiry check
        if (!includeExpired && notice.expiryDate && notice.expiryDate < todayIso) {
          return false;
        }

        // Search query check
        if (
          q &&
          !notice.title.toLowerCase().includes(q) &&
          !notice.description.toLowerCase().includes(q) &&
          !notice.publisherName.toLowerCase().includes(q) &&
          !notice.department.toLowerCase().includes(q)
        ) {
          return false;
        }

        const noticeColId = notice.college_id || normalizeCollege(notice.college).id;
        const noticeDeptId = notice.department_id || normalizeTechnology(notice.department).id;

        // Ensure notice belongs to the student's college (unless system_admin viewing all)
        if (session?.role !== 'system_admin' && noticeColId !== userCollege.id) {
          return false;
        }

        if (filter === 'college') {
          // College-wide or Departmental Teacher notices
          return notice.targetScope === 'college' || notice.targetScope === 'department' || notice.publisherRole === 'teacher' || notice.publisherRole === 'system_admin';
        }

        if (filter === 'my_group') {
          // Strictly notices targeted to the student's department + semester + shift/section cohort
          if (noticeDeptId !== userDept.id) return false;
          if (notice.semester && Number(notice.semester) !== semNum) return false;
          if (notice.shift && notice.shift !== 'Both' && notice.shift.toLowerCase() !== shiftStr.toLowerCase()) return false;
          if (notice.section && notice.section !== 'All' && notice.section.toUpperCase() !== sectionStr.toUpperCase()) return false;
          return true;
        }

        // Default 'all' campus notices relevant to this student's college/group
        if (notice.targetScope === 'college') return true;
        if (notice.targetScope === 'department') {
          return noticeDeptId === userDept.id;
        }
        // Cohort notice: must match student's department & semester & shift & section (or publisher is viewing their own)
        if (session && notice.publisherId === session.userId) return true;
        if (noticeDeptId !== userDept.id) return false;
        if (notice.semester && Number(notice.semester) !== semNum) return false;
        if (notice.shift && notice.shift !== 'Both' && notice.shift.toLowerCase() !== shiftStr.toLowerCase()) return false;
        if (notice.section && notice.section !== 'All' && notice.section.toUpperCase() !== sectionStr.toUpperCase()) return false;
        return true;
      })
      .sort((a, b) => {
        if (Boolean(a.isPinned) !== Boolean(b.isPinned)) {
          return a.isPinned ? -1 : 1;
        }
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      });

    return res.status(200).json({
      success: true,
      total: notices.length,
      notices
    });
  } catch (err) {
    console.error('[GET /api/notices/campus] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load campus & group notices.' });
  }
});

/**
 * 16B-2. PUBLISH TEACHER OR CLASS CAPTAIN NOTICE (`POST /api/notices/campus`)
 * Enforces strict backend RBAC:
 * - Ordinary students (`student`) -> HTTP 403 Forbidden
 * - Class Captains (`class_captain`) -> Restricted strictly to their authorized `(college, department, semester, shift, section)` cohort
 * - Teachers (`teacher`) -> Must be Verified and restricted to their authorized college/department scope
 */
app.post('/api/notices/campus', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required: Please sign in as a Verified Teacher or Class Captain to publish a notice.'
      });
    }

    if (session.role === 'student') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Ordinary student accounts are not authorized to publish official college or class notices.'
      });
    }

    const {
      title,
      description,
      college,
      department,
      semester,
      shift,
      section,
      targetScope,
      priority = 'Normal',
      isPinned = false,
      attachmentUrl,
      attachmentName,
      attachmentType,
      expiryDate
    } = req.body || {};

    const cleanTitle = String(title || '').trim();
    const cleanDesc = String(description || '').trim();

    if (!cleanTitle || cleanTitle.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Notice title must be at least 4 characters long.'
      });
    }

    if (!cleanDesc || cleanDesc.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Notice description must be at least 8 characters long.'
      });
    }

    const nowIso = new Date().toISOString();

    if (session.role === 'class_captain') {
      const targetCol = String(college || session.college || '').trim();
      const targetDept = String(department || session.department || '').trim();
      const targetSem = Number(semester ?? session.semester ?? 0);
      const targetShift = String(shift || session.shift || 'Morning').trim();
      const targetSec = String(section || session.section || 'A1').trim();

      if (targetScope === 'college' || targetScope === 'department') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden (Scope Violation): Class Captains can only publish cohort notices for their own class group, not college-wide notices.'
        });
      }

      const crCheck = isCaptainAuthorizedForCohort(session, {
        college: targetCol,
        department: targetDept,
        semester: targetSem,
        shift: targetShift,
        section: targetSec
      });

      if (!crCheck.authorized) {
        return res.status(403).json({
          success: false,
          error: crCheck.error || 'Forbidden: You are not authorized to publish notices for this class group.'
        });
      }

      const normCol = normalizeCollege(crCheck.captainCollege!);
      const normDept = normalizeTechnology(crCheck.captainDept!);

      const newNotice: CampusNoticeItem = {
        id: `cnotice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: cleanTitle,
        description: cleanDesc,
        publisherId: session.userId,
        publisherName: session.name,
        publisherRole: 'class_captain',
        publisherDesignation: `Verified Class Captain (Sem ${crCheck.captainSem} · ${crCheck.captainShift} · ${crCheck.captainSec})`,
        college_id: normCol.id,
        college: normCol.name,
        department_id: normDept.id,
        department: normDept.name,
        semester: crCheck.captainSem as SemesterNumber,
        shift: crCheck.captainShift!,
        section: crCheck.captainSec!,
        targetScope: 'cohort',
        priority: priority === 'Important' ? 'Important' : 'Normal',
        isPinned: Boolean(isPinned),
        attachmentUrl: attachmentUrl ? String(attachmentUrl).trim() : undefined,
        attachmentName: attachmentName ? String(attachmentName).trim() : undefined,
        attachmentType: attachmentType || (attachmentName ? 'PDF' : undefined),
        expiryDate: expiryDate ? String(expiryDate).trim() : undefined,
        publishedAt: nowIso,
        updatedAt: nowIso,
        reportsCount: 0
      };

      academicStore.campusNotices.unshift(newNotice);
      saveAcademicStore(academicStore);

      return res.status(201).json({
        success: true,
        message: `Notice published to ${normDept.shortCode} Semester ${crCheck.captainSem} (${crCheck.captainShift} · Sec ${crCheck.captainSec}).`,
        notice: newNotice
      });
    }

    if (session.role === 'teacher') {
      const teacher = serverTeachers.get(session.userId);
      if (!teacher || teacher.verificationStatus !== 'Verified') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Only Verified Faculty accounts can publish teacher notices.'
        });
      }

      const reqCol = String(college || teacher.college).trim();
      const reqDept = String(department || teacher.department).trim();

      if (!areCollegesEquivalent(teacher.college, reqCol)) {
        return res.status(403).json({
          success: false,
          error: `Forbidden (College Scope): You are authorized for "${teacher.college}", not "${reqCol}".`
        });
      }

      const requestedScope: CampusNoticeScope =
        targetScope === 'college' || targetScope === 'department' || targetScope === 'cohort'
          ? targetScope
          : 'department';

      if (requestedScope !== 'college' && !areDepartmentsEquivalent(teacher.department, reqDept)) {
        return res.status(403).json({
          success: false,
          error: `Forbidden (Department Scope): You are authorized for "${teacher.department}", not "${reqDept}".`
        });
      }

      const normCol = normalizeCollege(teacher.college);
      const normDept = normalizeTechnology(teacher.department);
      const semNum = semester ? (Number(semester) as SemesterNumber) : null;

      const newNotice: CampusNoticeItem = {
        id: `cnotice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: cleanTitle,
        description: cleanDesc,
        publisherId: teacher.id,
        publisherName: teacher.name,
        publisherRole: 'teacher',
        publisherDesignation: teacher.designation || 'Faculty Instructor',
        college_id: normCol.id,
        college: normCol.name,
        department_id: normDept.id,
        department: normDept.name,
        semester: semNum,
        shift: (shift === 'Morning' || shift === 'Day' ? shift : 'Both') as Shift | 'Both',
        section: (['A1', 'A2', 'B1', 'B2'].includes(String(section)) ? section : 'All') as Section | 'All',
        targetScope: requestedScope,
        priority: priority === 'Important' ? 'Important' : 'Normal',
        isPinned: Boolean(isPinned),
        attachmentUrl: attachmentUrl ? String(attachmentUrl).trim() : undefined,
        attachmentName: attachmentName ? String(attachmentName).trim() : undefined,
        attachmentType: attachmentType || (attachmentName ? 'PDF' : undefined),
        expiryDate: expiryDate ? String(expiryDate).trim() : undefined,
        publishedAt: nowIso,
        updatedAt: nowIso,
        reportsCount: 0
      };

      academicStore.campusNotices.unshift(newNotice);
      saveAcademicStore(academicStore);

      return res.status(201).json({
        success: true,
        message: 'Faculty notice published successfully.',
        notice: newNotice
      });
    }

    // system_admin
    const normCol = normalizeCollege(String(college || 'Dhaka Polytechnic Institute (DPI), Tejgaon'));
    const normDept = normalizeTechnology(String(department || 'Computer Science & Technology (CST)'));
    const newNotice: CampusNoticeItem = {
      id: `cnotice_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: cleanTitle,
      description: cleanDesc,
      publisherId: session.userId,
      publisherName: session.name,
      publisherRole: 'system_admin',
      publisherDesignation: 'System Administrator',
      college_id: normCol.id,
      college: normCol.name,
      department_id: normDept.id,
      department: normDept.name,
      semester: semester ? (Number(semester) as SemesterNumber) : null,
      shift: (shift === 'Morning' || shift === 'Day' ? shift : 'Both') as Shift | 'Both',
      section: (['A1', 'A2', 'B1', 'B2'].includes(String(section)) ? section : 'All') as Section | 'All',
      targetScope: (targetScope as CampusNoticeScope) || 'college',
      priority: priority === 'Important' ? 'Important' : 'Normal',
      isPinned: Boolean(isPinned),
      attachmentUrl: attachmentUrl ? String(attachmentUrl).trim() : undefined,
      attachmentName: attachmentName ? String(attachmentName).trim() : undefined,
      attachmentType: attachmentType || (attachmentName ? 'PDF' : undefined),
      expiryDate: expiryDate ? String(expiryDate).trim() : undefined,
      publishedAt: nowIso,
      updatedAt: nowIso,
      reportsCount: 0
    };

    academicStore.campusNotices.unshift(newNotice);
    saveAcademicStore(academicStore);

    return res.status(201).json({
      success: true,
      message: 'Administrative campus notice published.',
      notice: newNotice
    });
  } catch (err) {
    console.error('[POST /api/notices/campus] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to publish campus notice.' });
  }
});

/**
 * 16B-3. UPDATE TEACHER / CR NOTICE (`PUT /api/notices/campus/:id`)
 */
app.put('/api/notices/campus/:id', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const idx = academicStore.campusNotices.findIndex(n => n.id === req.params.id);
    if (idx < 0) {
      return res.status(404).json({ success: false, error: 'Notice not found.' });
    }

    const existing = academicStore.campusNotices[idx];
    const isOwner = existing.publisherId === session.userId;
    const isAdmin = session.role === 'system_admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only the original notice publisher or System Administrator can edit this notice.'
      });
    }

    const { title, description, priority, isPinned, expiryDate, attachmentUrl, attachmentName } = req.body || {};
    if (title !== undefined) existing.title = String(title).trim() || existing.title;
    if (description !== undefined) existing.description = String(description).trim() || existing.description;
    if (priority === 'Important' || priority === 'Normal') existing.priority = priority;
    if (isPinned !== undefined) existing.isPinned = Boolean(isPinned);
    if (expiryDate !== undefined) existing.expiryDate = expiryDate ? String(expiryDate).trim() : undefined;
    if (attachmentUrl !== undefined) existing.attachmentUrl = attachmentUrl ? String(attachmentUrl).trim() : undefined;
    if (attachmentName !== undefined) existing.attachmentName = attachmentName ? String(attachmentName).trim() : undefined;
    existing.updatedAt = new Date().toISOString();

    saveAcademicStore(academicStore);
    return res.status(200).json({
      success: true,
      message: 'Notice updated successfully.',
      notice: existing
    });
  } catch (err) {
    console.error('[PUT /api/notices/campus/:id] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update notice.' });
  }
});

/**
 * 16B-4. DELETE TEACHER / CR NOTICE (`DELETE /api/notices/campus/:id`)
 */
app.delete('/api/notices/campus/:id', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const existing = academicStore.campusNotices.find(n => n.id === req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Notice not found.' });
    }

    const isOwner = existing.publisherId === session.userId;
    const isAdmin = session.role === 'system_admin';
    const isDeptTeacherModeratingCr =
      session.role === 'teacher' &&
      existing.publisherRole === 'class_captain' &&
      existing.college_id === normalizeCollege(session.college || '').id &&
      existing.department_id === normalizeTechnology(session.department || '').id;

    if (!isOwner && !isAdmin && !isDeptTeacherModeratingCr) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to delete this notice.'
      });
    }

    academicStore.campusNotices = academicStore.campusNotices.filter(n => n.id !== req.params.id);
    saveAcademicStore(academicStore);

    return res.status(200).json({
      success: true,
      message: 'Notice deleted.'
    });
  } catch (err) {
    console.error('[DELETE /api/notices/campus/:id] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete notice.' });
  }
});

/**
 * 16B-5. REPORT CAMPUS NOTICE (`POST /api/notices/campus/:id/report`)
 */
app.post('/api/notices/campus/:id/report', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Please sign in to report a notice.' });
    }

    const notice = academicStore.campusNotices.find(n => n.id === req.params.id);
    if (!notice) {
      return res.status(404).json({ success: false, error: 'Notice not found.' });
    }

    const reason = String(req.body?.reason || '').trim();
    if (!reason || reason.length < 4) {
      return res.status(400).json({ success: false, error: 'Please provide a brief reason for reporting this notice.' });
    }

    const report: CampusNoticeReportRecord = {
      id: `cnrep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      noticeId: notice.id,
      noticeTitle: notice.title,
      reportedById: session.userId,
      reportedByName: session.name,
      reason,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    academicStore.campusNoticeReports.push(report);
    notice.reportsCount = (notice.reportsCount || 0) + 1;
    saveAcademicStore(academicStore);

    return res.status(201).json({
      success: true,
      message: 'Notice report submitted for faculty & administrator review.'
    });
  } catch (err) {
    console.error('[POST /api/notices/campus/:id/report] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit report.' });
  }
});

/**
 * 16B-6. DOWNLOAD / VIEW CAMPUS NOTICE ATTACHMENT (`GET /api/notices/campus/:id/attachment`)
 */
app.get('/api/notices/campus/:id/attachment', (req: Request, res: Response) => {
  const notice = academicStore.campusNotices.find(n => n.id === req.params.id);
  if (!notice) {
    return res.status(404).send('Notice attachment not found.');
  }
  if (notice.attachmentUrl && notice.attachmentUrl.startsWith('data:')) {
    const parts = notice.attachmentUrl.split(',');
    const mimeMatch = parts[0].match(/data:([^;]+);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const buf = Buffer.from(parts[1] || '', 'base64');
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `inline; filename="${notice.attachmentName || 'notice-attachment.pdf'}"`);
    return res.send(buf);
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${notice.attachmentName || 'campus-notice.pdf'}"`);
  return res.send(
    Buffer.from(
      `%PDF-1.4\n% Official Campus Notice Attachment\n% Title: ${notice.title}\n% Published By: ${notice.publisherName} (${notice.publisherRole})\n% Institution: ${notice.college} - ${notice.department}\n`
    )
  );
});

// ----------------------------------------------------------------------------
// 16C. DIPLOMA ENGINEERING JOB CIRCULARS (`/api/jobs`)
// ----------------------------------------------------------------------------

let lastJobsSyncAt: string = new Date().toISOString();
let lastJobsSyncStatusMsg: string = process.env.CAREERJET_API_KEY
  ? 'Careerjet Partner API v4 configured and active.'
  : 'Careerjet public HTML pages enforce bot-challenge protection and the legacy API is retired. Automated Careerjet feed requires CAREERJET_API_KEY (Partner API v4). Serving verified Diploma Engineer job circulars managed via Placement Cell & Admin Import.';

function computeJobCircularStatus(deadlineStr?: string): JobStatus | undefined {
  if (!deadlineStr) return undefined;
  const clean = String(deadlineStr).trim();
  const parsedMs = new Date(clean).getTime();
  if (isNaN(parsedMs)) return undefined;

  const nowMs = Date.now();
  // End of deadline day (23:59:59)
  const endOfDayMs = parsedMs + 24 * 60 * 60 * 1000 - 1;
  const diffDays = (endOfDayMs - nowMs) / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return 'Expired';
  if (diffDays <= 7) return 'Closing Soon';
  return 'Open';
}

function enrichJobCircular(job: JobCircular): JobCircular {
  const computedStatus = computeJobCircularStatus(job.deadline);
  return {
    ...job,
    status: computedStatus || job.status,
    sourceName: job.sourceName || 'Careerjet Bangladesh / Placement Cell',
    sourceUrl: job.sourceUrl || job.applyUrl || 'https://www.careerjet.com.bd/diploma-engineer-jobs.html',
    applicationMethod: job.applicationMethod || 'external_url',
    educationalQualifications: job.educationalQualifications || 'Diploma in Engineering (BTEB)',
    experienceRequirements: job.experienceRequirements || 'Freshers / 0–2 Years'
  };
}

async function syncCareerjetJobs(): Promise<{
  syncedFromApi: boolean;
  insertedCount: number;
  updatedCount: number;
  message: string;
}> {
  const apiKey = (process.env.CAREERJET_API_KEY || '').trim();
  if (!apiKey) {
    lastJobsSyncAt = new Date().toISOString();
    return {
      syncedFromApi: false,
      insertedCount: 0,
      updatedCount: 0,
      message:
        'Careerjet Partner API v4 key (CAREERJET_API_KEY) is not configured in environment. Direct scraping of careerjet.com.bd is blocked by bot-challenge protection and prohibited by terms. Verified listings from the Placement Cell & Admin Import store are active and statuses have been refreshed.'
    };
  }

  try {
    const authHeader = 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64');
    const url = new URL('https://search.api.careerjet.net/v4/query');
    url.searchParams.set('locale_code', 'en_BD');
    url.searchParams.set('keywords', 'diploma engineer');
    url.searchParams.set('location', 'bangladesh');
    url.searchParams.set('sort', 'date');
    url.searchParams.set('page_size', '50');
    url.searchParams.set('user_ip', '103.112.204.1');
    url.searchParams.set('user_agent', 'DiplomaMate/2.5 AcademicJobPortal');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Careerjet API v4 returned HTTP ${response.status}: ${errBody.slice(0, 120)}`);
    }

    const data = (await response.json()) as any;
    const rawJobs: any[] = Array.isArray(data?.jobs) ? data.jobs : [];
    let insertedCount = 0;
    let updatedCount = 0;
    const nowIso = new Date().toISOString();

    for (const item of rawJobs) {
      const title = String(item.title || '').replace(/<[^>]+>/g, '').trim();
      const company = String(item.company || 'Employer on Careerjet BD').trim();
      const jobUrl = String(item.url || '').trim();
      if (!title || !jobUrl) continue;

      const existingIdx = academicStore.jobs.findIndex(
        j => j.applyUrl === jobUrl || j.sourceUrl === jobUrl || (j.title.toLowerCase() === title.toLowerCase() && j.company.toLowerCase() === company.toLowerCase())
      );

      const descClean = String(item.description || '').replace(/<[^>]+>/g, '').trim();
      const salaryClean = String(item.salary || 'Negotiable (See Employer Circular)').trim();
      const locClean = String(item.locations || 'Bangladesh').trim();
      const pubDate = item.date ? new Date(item.date).toISOString().slice(0, 10) : nowIso.slice(0, 10);

      if (existingIdx >= 0) {
        const existing = academicStore.jobs[existingIdx];
        academicStore.jobs[existingIdx] = {
          ...existing,
          title,
          company,
          location: locClean,
          stipendOrSalary: salaryClean,
          description: descClean || existing.description,
          sourceName: 'Careerjet Bangladesh (Official API v4)',
          sourceUrl: jobUrl,
          applyUrl: jobUrl,
          updatedAt: nowIso
        };
        updatedCount += 1;
      } else {
        insertedCount += 1;
        academicStore.jobs.unshift({
          id: `job_cj_${crypto.createHash('sha1').update(jobUrl).digest('hex').slice(0, 12)}`,
          title,
          company,
          location: locClean,
          type: 'Full-Time',
          targetDepartments: ['All Diploma Technologies'],
          publishedAt: pubDate,
          deadline: '',
          stipendOrSalary: salaryClean,
          experienceRequirements: 'Refer to original job circular',
          educationalQualifications: 'Diploma in Engineering',
          description: descClean,
          requirements: descClean,
          sourceName: 'Careerjet Bangladesh (Official API v4)',
          sourceUrl: jobUrl,
          applyUrl: jobUrl,
          applicationMethod: 'external_url',
          postedBy: 'Careerjet Automated Sync',
          postedAt: pubDate,
          updatedAt: nowIso
        });
      }
    }

    lastJobsSyncAt = nowIso;
    lastJobsSyncStatusMsg = `Synchronized with Careerjet API v4 (${insertedCount} added, ${updatedCount} updated).`;
    saveAcademicStore(academicStore);

    return {
      syncedFromApi: true,
      insertedCount,
      updatedCount,
      message: lastJobsSyncStatusMsg
    };
  } catch (err: any) {
    console.warn('[Careerjet Sync] Warning:', err?.message);
    return {
      syncedFromApi: false,
      insertedCount: 0,
      updatedCount: 0,
      message: `Careerjet API sync error (${err?.message}). Preserving existing verified job listings.`
    };
  }
}

/**
 * 16C-1. GET DIPLOMA ENGINEERING JOB CIRCULARS (`GET /api/jobs`)
 */
app.get('/api/jobs', (req: Request, res: Response) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase();
    const department = String(req.query.department || 'all').trim();
    const location = String(req.query.location || 'all').trim();
    const type = String(req.query.type || 'all').trim();
    const statusFilter = String(req.query.status || 'all').trim();
    const sort = String(req.query.sort || 'newest').trim();
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '20'), 10) || 20));

    const enrichedAll = academicStore.jobs.map(enrichJobCircular);

    const filtered = enrichedAll.filter(job => {
      if (
        q &&
        !job.title.toLowerCase().includes(q) &&
        !job.company.toLowerCase().includes(q) &&
        !job.location.toLowerCase().includes(q) &&
        !(job.description || '').toLowerCase().includes(q) &&
        !(job.requirements || '').toLowerCase().includes(q)
      ) {
        return false;
      }

      if (department && department !== 'all') {
        const deptQueryNorm = normalizeTechnology(department);
        const matchesDept = job.targetDepartments.some(td => {
          if (td.toLowerCase().includes('all')) return true;
          if (td.toLowerCase().includes(department.toLowerCase())) return true;
          return normalizeTechnology(td).id === deptQueryNorm.id;
        });
        if (!matchesDept) return false;
      }

      if (location && location !== 'all') {
        if (!job.location.toLowerCase().includes(location.toLowerCase())) {
          return false;
        }
      }

      if (type && type !== 'all') {
        if (job.type.toLowerCase() !== type.toLowerCase()) {
          return false;
        }
      }

      if (statusFilter && statusFilter !== 'all') {
        if ((job.status || '').toLowerCase() !== statusFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });

    // Sort by newest publishedAt / postedAt or closest active deadline
    filtered.sort((a, b) => {
      if (sort === 'deadline') {
        const da = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      }
      const pa = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const pb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return pb - pa;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startIdx = (page - 1) * pageSize;
    const paginated = filtered.slice(startIdx, startIdx + pageSize);

    // Collect distinct filter options from all stored jobs
    const departmentsSet = new Set<string>();
    const locationsSet = new Set<string>();
    const typesSet = new Set<string>();

    for (const j of enrichedAll) {
      j.targetDepartments.forEach(d => departmentsSet.add(d));
      if (j.location) {
        const city = j.location.split(',')[0].trim();
        if (city) locationsSet.add(city);
      }
      if (j.type) typesSet.add(j.type);
    }

    return res.status(200).json({
      success: true,
      total,
      page,
      pageSize,
      totalPages,
      hasMore: startIdx + paginated.length < total,
      jobs: paginated,
      availableFilters: {
        departments: Array.from(departmentsSet),
        locations: Array.from(locationsSet),
        types: Array.from(typesSet)
      },
      syncInfo: {
        primarySourceUrl: 'https://www.careerjet.com.bd/diploma-engineer-jobs',
        careerjetApiConfigured: Boolean((process.env.CAREERJET_API_KEY || '').trim()),
        autoSyncActive: Boolean((process.env.CAREERJET_API_KEY || '').trim()),
        lastUpdatedAt: lastJobsSyncAt,
        sourceStatusMessage: lastJobsSyncStatusMsg
      }
    });
  } catch (err) {
    console.error('[GET /api/jobs] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to load job circulars.' });
  }
});

/**
 * 16C-2. POST NEW JOB CIRCULAR (`POST /api/jobs`)
 * Authorized for System Admin, Verified Teacher, or Approved Class Captain.
 * Ordinary students are rejected with HTTP 403.
 */
app.post('/api/jobs', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Required: Please sign in as a System Administrator, Verified Teacher, or Class Captain to post a job circular.'
      });
    }

    if (session.role === 'student') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Ordinary student accounts cannot publish job circulars.'
      });
    }

    const {
      title,
      company,
      location,
      type = 'Full-Time',
      targetDepartments,
      publishedAt,
      deadline,
      stipendOrSalary,
      experienceRequirements,
      educationalQualifications,
      description,
      requirements,
      sourceName,
      sourceUrl,
      applyUrl,
      mediaUrl,
      mediaType,
      mediaName
    } = req.body || {};

    const cleanTitle = String(title || '').trim();
    const cleanCompany = String(company || '').trim();
    const cleanLocation = String(location || 'Dhaka, Bangladesh').trim();

    if (!cleanTitle || !cleanCompany) {
      return res.status(400).json({
        success: false,
        error: 'Job title and company/employer name are required.'
      });
    }

    const externalApply = String(applyUrl || sourceUrl || '').trim();
    if (externalApply && !/^https?:\/\//i.test(externalApply)) {
      return res.status(400).json({
        success: false,
        error: 'External application URL must be a valid http:// or https:// web address.'
      });
    }

    // Prevent duplicates by (title + company + applyUrl)
    const duplicate = academicStore.jobs.find(
      j =>
        j.title.toLowerCase() === cleanTitle.toLowerCase() &&
        j.company.toLowerCase() === cleanCompany.toLowerCase() &&
        (!externalApply || j.applyUrl === externalApply)
    );

    const nowIso = new Date().toISOString();
    const cleanDepts = Array.isArray(targetDepartments) && targetDepartments.length > 0
      ? targetDepartments.map(String)
      : ['Computer Science & Technology (CST)'];

    if (duplicate) {
      // Update existing instead of creating duplicate
      duplicate.location = cleanLocation;
      duplicate.deadline = deadline ? String(deadline).trim() : duplicate.deadline;
      duplicate.stipendOrSalary = stipendOrSalary ? String(stipendOrSalary).trim() : duplicate.stipendOrSalary;
      duplicate.description = description ? String(description).trim() : duplicate.description;
      duplicate.requirements = requirements ? String(requirements).trim() : duplicate.requirements;
      duplicate.experienceRequirements = experienceRequirements ? String(experienceRequirements).trim() : duplicate.experienceRequirements;
      duplicate.educationalQualifications = educationalQualifications ? String(educationalQualifications).trim() : duplicate.educationalQualifications;
      if (externalApply) duplicate.applyUrl = externalApply;
      duplicate.updatedAt = nowIso;
      lastJobsSyncAt = nowIso;
      saveAcademicStore(academicStore);

      return res.status(200).json({
        success: true,
        deduplicated: true,
        message: 'Existing job circular updated (duplicate prevented).',
        job: enrichJobCircular(duplicate)
      });
    }

    const newJob: JobCircular = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: cleanTitle,
      company: cleanCompany,
      location: cleanLocation,
      type: (['Internship', 'Full-Time', 'Apprenticeship', 'Part-Time', 'Contract'].includes(String(type))
        ? type
        : 'Full-Time') as JobCircular['type'],
      targetDepartments: cleanDepts,
      publishedAt: publishedAt ? String(publishedAt).trim() : nowIso.slice(0, 10),
      deadline: deadline ? String(deadline).trim() : '',
      stipendOrSalary: String(stipendOrSalary || 'Negotiable').trim(),
      experienceRequirements: String(experienceRequirements || 'Freshers / 0–2 Years').trim(),
      educationalQualifications: String(educationalQualifications || 'Diploma in Engineering (BTEB)').trim(),
      description: String(description || requirements || '').trim(),
      requirements: String(requirements || description || '').trim(),
      sourceName: String(sourceName || 'Careerjet Bangladesh / Placement Cell').trim(),
      sourceUrl: externalApply || 'https://www.careerjet.com.bd/diploma-engineer-jobs.html',
      applyUrl: externalApply || undefined,
      applicationMethod: 'external_url',
      postedBy: session.name,
      postedById: session.userId,
      postedByRole: session.role,
      postedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      updatedAt: nowIso,
      mediaUrl: mediaUrl ? String(mediaUrl) : undefined,
      mediaType: mediaType === 'IMAGE' || mediaType === 'PDF' ? mediaType : undefined,
      mediaName: mediaName ? String(mediaName) : undefined
    };

    academicStore.jobs.unshift(newJob);
    lastJobsSyncAt = nowIso;
    saveAcademicStore(academicStore);

    return res.status(201).json({
      success: true,
      deduplicated: false,
      message: 'Job circular published successfully.',
      job: enrichJobCircular(newJob)
    });
  } catch (err) {
    console.error('[POST /api/jobs] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to publish job circular.' });
  }
});

/**
 * 16C-3. ADMIN / PLACEMENT CELL BATCH JOB IMPORT (`POST /api/admin/jobs/import`)
 */
app.post('/api/admin/jobs/import', requireSystemAdmin, (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session || (session.role !== 'system_admin' && session.role !== 'teacher')) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only System Administrators or Verified Placement Cell Teachers can batch-import job circulars.'
      });
    }

    const { jobsPayload } = req.body || {};
    if (!Array.isArray(jobsPayload) || jobsPayload.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a non-empty array of job listings in jobsPayload.'
      });
    }

    let insertedCount = 0;
    let updatedCount = 0;
    const nowIso = new Date().toISOString();

    for (const raw of jobsPayload) {
      const title = String(raw.title || '').trim();
      const company = String(raw.company || '').trim();
      if (!title || !company) continue;

      const applyUrl = String(raw.applyUrl || raw.sourceUrl || '').trim();
      const existingIdx = academicStore.jobs.findIndex(
        j =>
          (applyUrl && j.applyUrl === applyUrl && j.title.toLowerCase() === title.toLowerCase()) ||
          (j.title.toLowerCase() === title.toLowerCase() && j.company.toLowerCase() === company.toLowerCase())
      );

      if (existingIdx >= 0) {
        const existing = academicStore.jobs[existingIdx];
        academicStore.jobs[existingIdx] = {
          ...existing,
          location: raw.location ? String(raw.location).trim() : existing.location,
          deadline: raw.deadline !== undefined ? String(raw.deadline).trim() : existing.deadline,
          stipendOrSalary: raw.stipendOrSalary || raw.salary || existing.stipendOrSalary,
          experienceRequirements: raw.experienceRequirements || existing.experienceRequirements,
          educationalQualifications: raw.educationalQualifications || existing.educationalQualifications,
          description: raw.description || existing.description,
          requirements: raw.requirements || raw.description || existing.requirements,
          sourceName: raw.sourceName || existing.sourceName,
          sourceUrl: raw.sourceUrl || applyUrl || existing.sourceUrl,
          applyUrl: applyUrl || existing.applyUrl,
          updatedAt: nowIso
        };
        updatedCount += 1;
      } else {
        insertedCount += 1;
        academicStore.jobs.unshift({
          id: `job_imp_${Date.now()}_${insertedCount}`,
          title,
          company,
          location: String(raw.location || 'Dhaka, Bangladesh').trim(),
          type: (['Internship', 'Full-Time', 'Apprenticeship', 'Part-Time', 'Contract'].includes(String(raw.type))
            ? raw.type
            : 'Full-Time') as JobCircular['type'],
          targetDepartments: Array.isArray(raw.targetDepartments) && raw.targetDepartments.length > 0
            ? raw.targetDepartments.map(String)
            : ['Computer Science & Technology (CST)'],
          publishedAt: raw.publishedAt || nowIso.slice(0, 10),
          deadline: String(raw.deadline || '').trim(),
          stipendOrSalary: String(raw.stipendOrSalary || raw.salary || 'Negotiable').trim(),
          experienceRequirements: String(raw.experienceRequirements || 'Freshers / 0–2 Years').trim(),
          educationalQualifications: String(raw.educationalQualifications || 'Diploma in Engineering (BTEB)').trim(),
          description: String(raw.description || raw.requirements || '').trim(),
          requirements: String(raw.requirements || raw.description || '').trim(),
          sourceName: String(raw.sourceName || 'Careerjet Bangladesh / Admin Import').trim(),
          sourceUrl: String(raw.sourceUrl || applyUrl || 'https://www.careerjet.com.bd/diploma-engineer-jobs.html').trim(),
          applyUrl: applyUrl || undefined,
          applicationMethod: 'external_url',
          postedBy: session.name,
          postedById: session.userId,
          postedByRole: session.role,
          postedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          updatedAt: nowIso
        });
      }
    }

    lastJobsSyncAt = nowIso;
    saveAcademicStore(academicStore);

    return res.status(200).json({
      success: true,
      insertedCount,
      updatedCount,
      totalJobs: academicStore.jobs.length,
      message: `Batch import complete: ${insertedCount} new job circulars added, ${updatedCount} existing circulars updated.`
    });
  } catch (err) {
    console.error('[POST /api/admin/jobs/import] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to import job circulars.' });
  }
});

/**
 * 16C-4. DELETE JOB CIRCULAR (`DELETE /api/jobs/:id`)
 */
app.delete('/api/jobs/:id', (req: Request, res: Response) => {
  try {
    const session = getAuthenticatedSession(req);
    if (!session) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const existing = academicStore.jobs.find(j => j.id === req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Job circular not found.' });
    }

    if (session.role !== 'system_admin' && existing.postedById !== session.userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden: Only the publisher or System Administrator can delete this job circular.'
      });
    }

    academicStore.jobs = academicStore.jobs.filter(j => j.id !== req.params.id);
    saveAcademicStore(academicStore);

    return res.status(200).json({
      success: true,
      message: 'Job circular removed.'
    });
  } catch (err) {
    console.error('[DELETE /api/jobs/:id] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete job circular.' });
  }
});

/**
 * 16C-5. SYNC / REFRESH JOB CIRCULARS (`POST /api/jobs/sync`)
 */
app.post('/api/jobs/sync', requireAuth, async (_req: Request, res: Response) => {
  try {
    const result = await syncCareerjetJobs();
    return res.status(200).json({
      success: true,
      ...result,
      lastUpdatedAt: lastJobsSyncAt,
      careerjetApiConfigured: Boolean((process.env.CAREERJET_API_KEY || '').trim())
    });
  } catch (err) {
    console.error('[POST /api/jobs/sync] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to refresh job circulars.' });
  }
});

// Global error handler: never leak stack traces (or other internals) to
// clients in production. Async route errors land here via next(err).
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Server] Unhandled error:', err);
  if (res.headersSent) return;
  if (process.env.NODE_ENV === 'development') {
    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
      details: err instanceof Error ? err.message : String(err)
    });
  }
  return res.status(500).json({ success: false, error: 'Internal server error.' });
});

// Mount Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);

    // Fallback for HTML navigation requests
    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api')) {
        return next();
      }
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
          let template = fs.readFileSync(indexPath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } else {
          next();
        }
      } catch (e: any) {
        if (vite && typeof vite.ssrFixStacktrace === 'function') {
          vite.ssrFixStacktrace(e);
        }
        next(e);
      }
    });
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DiplomaMate Server] Running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err) => {
    console.error(`[DiplomaMate Server Error] Failed to listen on port ${PORT}:`, err);
  });
}

startServer();
