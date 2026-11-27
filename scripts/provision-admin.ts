import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const ADMINS_STORE_FILE = path.join(DATA_DIR, 'system-admins.json');
const BOOTSTRAP_TOKEN_FILE = path.join(DATA_DIR, '.admin-bootstrap-token');

interface StoredSystemAdmin {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  // Hash scheme version: 2 = PBKDF2-SHA256 600,000 iterations (see
  // server.ts ADMIN_PASSWORD_ITERATIONS_V2). Records minted before the
  // v2 scheme carry no version (= legacy 10,000 iterations) and are
  // upgraded transparently on the next successful admin login.
  passwordHashVersion?: number;
  role: 'system_admin';
  failedAttempts: number;
  lockoutUntil: number | null;
  createdAt: string;
  lastLoginAt?: string;
}

// S2: mint v2 hashes (PBKDF2-SHA256, 600,000 iterations) — the old
// 10,000-iteration default silently re-introduced legacy hashes on
// every re-provision, undoing the login-time upgrade in server.ts.
function hashAdminPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 600000, 32, 'sha256').toString('hex');
}

function parseCliArgs(argv: string[]) {
  const result: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      result[key] = val;
    }
  }
  return result;
}

function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const email = (args.email || process.env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = (args.password || process.env.INITIAL_ADMIN_PASSWORD || '').trim();
  const name = (args.name || 'Academic System Administrator').trim();

  if (!email || !password) {
    console.error('Usage: npm run provision-admin -- --email <admin@domain.edu.bd> --password <strong-password> [--name "Admin Name"]');
    console.error('Or set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD in your environment.');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: Administrator password must be at least 8 characters long.');
    process.exit(1);
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let admins: StoredSystemAdmin[] = [];
  if (fs.existsSync(ADMINS_STORE_FILE)) {
    try {
      const raw = fs.readFileSync(ADMINS_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.admins)) {
        admins = parsed.admins;
      }
    } catch {
      admins = [];
    }
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashAdminPassword(password, salt);
  const nowIso = new Date().toISOString();

  const existingIdx = admins.findIndex(a => a.email.toLowerCase() === email);
  if (existingIdx >= 0) {
    admins[existingIdx] = {
      ...admins[existingIdx],
      name: name || admins[existingIdx].name,
      passwordSalt: salt,
      passwordHash,
      passwordHashVersion: 2,
      failedAttempts: 0,
      lockoutUntil: null
    };
    console.log(`[Provision Admin] Updated existing system_admin account: ${email}`);
  } else {
    const newAdmin: StoredSystemAdmin = {
      id: `sysadmin_${Date.now()}`,
      name,
      email,
      passwordHash,
      passwordSalt: salt,
      passwordHashVersion: 2,
      role: 'system_admin',
      failedAttempts: 0,
      lockoutUntil: null,
      createdAt: nowIso
    };
    admins.push(newAdmin);
    console.log(`[Provision Admin] Provisioned new system_admin account: ${email} (${newAdmin.id})`);
  }

  fs.writeFileSync(ADMINS_STORE_FILE, JSON.stringify({ admins }, null, 2), 'utf-8');

  // Remove one-time bootstrap token file once an admin exists
  if (fs.existsSync(BOOTSTRAP_TOKEN_FILE)) {
    try {
      fs.unlinkSync(BOOTSTRAP_TOKEN_FILE);
    } catch {
      // ignore
    }
  }
}

main();
