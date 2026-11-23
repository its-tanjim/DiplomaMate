// DiplomaMate — Supabase smoke test (Phase 4)
// Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/supabase-smoke-test.ts
// Or put the keys in a .env file in the repo root (never commit .env).
// Exits 0 when all checks pass, 1 otherwise. Read-only: no writes.
import "dotenv/config";
import {
  checkSupabaseConnection,
  getStudentByBoardRoll,
  getTeacherByEmail,
  listCaptainRecordsByCohort,
  listCommunities,
  listStudentsByCohort,
} from "../server/supabaseClient";

async function main() {
  console.log("Supabase smoke test — DiplomaMate");
  const ok = await checkSupabaseConnection();
  console.log("connection:", ok ? "OK" : "FAILED");
  if (!ok) process.exit(1);

  // Tanjim Khan, class captain, roll 843900 — must be in Postgres
  const tanjim = await getStudentByBoardRoll("843900", { registeredOnly: false });
  console.log("student 843900:", tanjim ? `${tanjim.name} / ${tanjim.accountType}` : "NOT FOUND");
  if (!tanjim) process.exit(1);

  const roster = await listStudentsByCohort({
    college: "Barishal Polytechnic Institute",
    department: "Computer Science and Technology (CST)",
    semester: 4,
    shift: "Day",
    section: "B2",
  });
  console.log("roster Barishal CST Sem 4 Day B2:", roster.length, "students");

  const teachers = await getTeacherByEmail("mahbubur.cst@dpi.gov.bd").catch(() => null);
  console.log("teacher lookup:", teachers ? teachers.name : "not found");

  const captains = await listCaptainRecordsByCohort({
    semester: 4,
    shift: "Day",
    section: "B2",
  });
  console.log("captain records Sem 4 Day B2:", captains.length);

  const communities = await listCommunities();
  console.log("communities:", communities.length, communities.map((c) => c.name).join(", "));

  console.log("SMOKE TEST PASSED");
}

main().catch((e) => {
  console.error("SMOKE TEST FAILED:", e?.message ?? e);
  process.exit(1);
});
