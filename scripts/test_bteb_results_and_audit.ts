const BASE_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function recordTest(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  console.log(`${passed ? '✅ PASS' : '❌ FAIL'} | ${name} — ${details}`);
}

async function runTests() {
  console.log('==================================================================');
  console.log('DIPLOMAMATE — BTEB RESULT BUG FIX & FULL APPLICATION AUDIT SUITE');
  console.log('==================================================================\n');

  // 1. Valid existing roll lookup (542880 — 2016 Reg, Barguna Polytechnic, multi-semester + cleared referral)
  try {
    const res = await fetch(`${BASE_URL}/api/results/lookup?roll=542880&curriculum=diploma_in_engineering&regulation=2016`);
    const data = await res.json();
    const stmt = data?.statement;
    const sem8 = stmt?.semesterResults?.find((s: any) => s.semester === 8);
    const sem4 = stmt?.semesterResults?.find((s: any) => s.semester === 4);
    const passed =
      res.status === 200 &&
      data.found === true &&
      stmt?.rollNumber === '542880' &&
      ['38033', '35048'].includes(String(stmt?.institute?.code)) &&
      stmt?.institute?.name?.includes('Barguna Polytechnic Institute') &&
      stmt?.semesterResults?.length >= 5 &&
      sem8?.gpa === 4.0 &&
      sem8?.cgpa === 3.43 &&
      Array.isArray(stmt?.currentFailedSubjects) &&
      stmt.currentFailedSubjects.length === 0 &&
      String(sem4?.failedSubjects?.[0]?.subCode) === '66841' &&
      sem4?.failedSubjects?.[0]?.passed === true;

    recordTest(
      '1. Valid Roll Lookup (542880, 2016 Reg, Multi-Semester & Cleared Referral)',
      Boolean(passed),
      `Status=${res.status}, found=${data.found}, inst="${stmt?.institute?.name} (${stmt?.institute?.code})", sems=${stmt?.semesterResults?.length}, sem8_gpa=${sem8?.gpa}, sem8_cgpa=${sem8?.cgpa}, activeRefs=${stmt?.currentFailedSubjects?.length}, sem4_cleared=${sem4?.failedSubjects?.[0]?.passed}`
    );
  } catch (err: any) {
    recordTest('1. Valid Roll Lookup (542880)', false, err.message);
  }

  // 2. Valid existing roll lookup (750104 — 2022 Reg, Confidence Polytechnic, active vs cleared referrals)
  try {
    const res = await fetch(`${BASE_URL}/api/results/lookup?roll=750104&curriculum=diploma_in_engineering&regulation=2022`);
    const data = await res.json();
    const stmt = data?.statement;
    const sem4 = stmt?.semesterResults?.find((s: any) => s.semester === 4);
    const activeCodes = (stmt?.currentFailedSubjects || []).map((s: any) => String(s.subCode));
    const clearedInSem4 = (sem4?.failedSubjects || [])
      .filter((s: any) => s.passed === true)
      .map((s: any) => String(s.subCode));
    const passed =
      res.status === 200 &&
      data.found === true &&
      stmt?.rollNumber === '750104' &&
      stmt?.semesterResults?.length === 4 &&
      activeCodes.includes('25931') &&
      !activeCodes.includes('26811') &&
      !activeCodes.includes('27032') &&
      !activeCodes.includes('29041') &&
      clearedInSem4.includes('26811') &&
      clearedInSem4.includes('27032') &&
      clearedInSem4.includes('29041');

    recordTest(
      '2. Active vs Cleared Referral Separation (750104, 2022 Reg)',
      Boolean(passed),
      `Status=${res.status}, sems=${stmt?.semesterResults?.length}, activeRefs=[${activeCodes.join(',')}], sem4Cleared=[${clearedInSem4.join(',')}]`
    );
  } catch (err: any) {
    recordTest('2. Active vs Cleared Referral Separation (750104)', false, err.message);
  }

  // 3. Valid roll with whitespace, hyphens, and Bangla numerals (" ৫৪২৮৮০ ", "750-102")
  try {
    const banglaRoll = encodeURIComponent(' ৫৪২৮৮০ ');
    const res1 = await fetch(`${BASE_URL}/api/results/lookup?roll=${banglaRoll}&curriculum=diploma_in_engineering&regulation=all`);
    const data1 = await res1.json();

    const hyphenRoll = encodeURIComponent('750-102');
    const res2 = await fetch(`${BASE_URL}/api/results/lookup?roll=${hyphenRoll}&curriculum=diploma_in_engineering&regulation=all`);
    const data2 = await res2.json();
    const individualParams = new URLSearchParams({ roll: '542-880' });
    const individualRes = await fetch(`${BASE_URL}/api/results/individual?${individualParams.toString()}`);
    const individualData = await individualRes.json();

    const passed =
      res1.status === 200 &&
      data1.found === true &&
      data1.statement?.rollNumber === '542880' &&
      res2.status === 200 &&
      data2.found === true &&
      data2.statement?.rollNumber === '750102' &&
      individualRes.status === 200 &&
      individualData.found === true &&
      individualData.records?.length >= 5;

    recordTest(
      '3. Roll Normalization Across Statement and Individual Lookup',
      Boolean(passed),
      `Bangla->${data1.statement?.rollNumber} (found=${data1.found}), hyphen->${data2.statement?.rollNumber} (found=${data2.found}), individualRecords=${individualData.records?.length}`
    );
  } catch (err: any) {
    recordTest('3. Bangla Numerals & Whitespace Sanitization', false, err.message);
  }

  // 4. Cross-Regulation Auto-Detection (Roll 542880 searched with regulation=2022)
  try {
    const res = await fetch(`${BASE_URL}/api/results/lookup?roll=542880&curriculum=diploma_in_engineering&regulation=2022`);
    const data = await res.json();
    const stmt = data?.statement;
    const passed =
      res.status === 200 &&
      data.found === true &&
      stmt?.rollNumber === '542880' &&
      String(stmt?.regulation) === '2016' &&
      typeof stmt?.regulationNote === 'string' &&
      stmt.regulationNote.includes('2016');

    recordTest(
      '4. Cross-Regulation Auto-Detection (542880 queried with regulation=2022)',
      Boolean(passed),
      `found=${data.found}, matchedReg=${stmt?.regulation}, regulationNote="${stmt?.regulationNote}"`
    );
  } catch (err: any) {
    recordTest('4. Cross-Regulation Auto-Detection', false, err.message);
  }

  // 5. Invalid Roll Format Rejection ("12", "abc", "123456789")
  try {
    const r1 = await fetch(`${BASE_URL}/api/results/lookup?roll=12`);
    const r2 = await fetch(`${BASE_URL}/api/results/lookup?roll=abc`);
    const r3 = await fetch(`${BASE_URL}/api/results/lookup?roll=123456789`);
    const passed = r1.status === 400 && r2.status === 400 && r3.status === 400;
    recordTest(
      '5. Invalid Roll Format Rejection ("12", "abc", "123456789")',
      passed,
      `Statuses: "12"=${r1.status}, "abc"=${r2.status}, "123456789"=${r3.status}`
    );
  } catch (err: any) {
    recordTest('5. Invalid Roll Format Rejection', false, err.message);
  }

  // 6. Non-Existent Roll vs External Service Status Integrity ("999999")
  try {
    const res = await fetch(`${BASE_URL}/api/results/lookup?roll=999999&curriculum=diploma_in_engineering&regulation=all`);
    const data = await res.json();
    // Missing local records are not proof that BTEB has no result when no authorized API is configured.
    const passed =
      res.status === 503 &&
      data.statement == null &&
      data.success === false &&
      data.found === false &&
      data.externalUnavailable === true &&
      data.manualVerificationRequired === true &&
      data.officialPortalUrl === 'https://result.bteb.gov.bd/result-search' &&
      typeof data.error === 'string';

    recordTest(
      '6. Non-Existent Roll Integrity (999999 — Zero Fabricated Data & Honest Upstream Status)',
      Boolean(passed),
      `HTTP=${res.status}, found=${data.found ?? 'null'}, externalUnavailable=${Boolean(data.externalUnavailable)}, msg="${data.message || data.error}"`
    );
  } catch (err: any) {
    recordTest('6. Non-Existent Roll Integrity', false, err.message);
  }

  // 7. Group Result Lookup (Multiple valid rolls, Bangla digits, range, missing roll, invalid token)
  try {
    const res = await fetch(`${BASE_URL}/api/results/group`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rollInput: '৫৪২৮৮০, 542891, 750102, 750104, 542915, 999998, bad_token',
        regulation: '2022', // tests cross-regulation fallback for 542880/542891/542915 as well!
        semester: 'all'
      })
    });
    const data = await res.json();
    const analytics = data?.analytics;
    const passed =
      res.status === 200 &&
      data.success === true &&
      analytics?.totalRequested === 6 &&
      data.invalidTokens?.includes('bad_token') &&
      analytics?.foundCount === 5 &&
      analytics?.notFoundCount === 1 &&
      analytics?.passCount >= 1 &&
      analytics?.referredCount >= 3 &&
      Array.isArray(data.items) &&
      data.items.length === 6;

    recordTest(
      '7. Group Result Lookup (Bangla Digits, Cross-Regulation Fallback, Invalid Tokens, Breakdown)',
      Boolean(passed),
      `requested=${analytics?.totalRequested}, found=${analytics?.foundCount}, notFound=${analytics?.notFoundCount}, pass=${analytics?.passCount}, ref=${analytics?.referredCount}, invalidTokens=[${(data.invalidTokens || []).join(',')}]`
    );
  } catch (err: any) {
    recordTest('7. Group Result Lookup', false, err.message);
  }

  // 8. Official Gazette Dataset Store & Admin RBAC Protection
  try {
    const batchesRes = await fetch(`${BASE_URL}/api/results/batches`);
    const batchesData = await batchesRes.json();

    const individualRes = await fetch(`${BASE_URL}/api/results/individual?roll=542880`);
    const individualData = await individualRes.json();

    // Verify unauthenticated/student cannot access admin preview-parse or import into verified dataset
    const unauthPreviewRes = await fetch(`${BASE_URL}/api/admin/results/preview-parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: '35048 - Barguna Polytechnic Institute\n542880 (4.00)',
        semester: 8,
        regulation: '2016'
      })
    });

    const unauthImportRes = await fetch(`${BASE_URL}/api/admin/results/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText: '35048 - Barguna Polytechnic Institute\n542880 (4.00)',
        semester: 8,
        regulation: '2016'
      })
    });

    const passed =
      batchesRes.status === 200 &&
      batchesData.success === true &&
      Array.isArray(batchesData.batches) &&
      batchesData.batches.length >= 9 &&
      individualRes.status === 200 &&
      individualData.found === true &&
      individualData.records?.length >= 5 &&
      unauthPreviewRes.status === 403 &&
      unauthImportRes.status === 403;

    recordTest(
      '8. Official Gazette Store & Admin RBAC Protection (/api/results/batches & /api/admin/results/*)',
      Boolean(passed),
      `batches=${batchesData.batches?.length}, recordsFor542880=${individualData.records?.length}, unauthPreview=${unauthPreviewRes.status}, unauthImport=${unauthImportRes.status}`
    );
  } catch (err: any) {
    recordTest('8. Official Gazette Store & Admin RBAC Protection', false, err.message);
  }

  // 9. Subject Catalog & Auto-Suggest API (/api/catalog/subjects)
  try {
    const res = await fetch(
      `${BASE_URL}/api/catalog/subjects?technology=tech_cst&semesters=6&regulation=2022`
    );
    const data = await res.json();
    const passed =
      res.status === 200 &&
      data.success === true &&
      Array.isArray(data.records) &&
      data.records.length > 0 &&
      data.records.every((s: any) => s.subject_code && s.subject_name);

    recordTest(
      '9. Subject Catalog & BookList Auto-Suggestions (/api/catalog/subjects)',
      Boolean(passed),
      `count=${data.records?.length}, first="${data.records?.[0]?.subject_code} — ${data.records?.[0]?.subject_name}"`
    );
  } catch (err: any) {
    recordTest('9. Subject Catalog & BookList Auto-Suggestions', false, err.message);
  }

  // 10. Student-Facing APIs: Auth Session, Jobs, BTEB Notices, Campus Notices, Communities
  try {
    const authRes = await fetch(`${BASE_URL}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'std_test_542880',
        role: 'student',
        name: 'Tanvir Ahmed',
        email: 'tanvir@dpi.edu.bd',
        college: 'Barguna Polytechnic Institute',
        department: 'Computer Science & Technology (CST)',
        boardRoll: '542880',
        regNumber: '1502187342',
        semester: 8,
        shift: 'Morning',
        section: 'A1'
      })
    });
    const authData = await authRes.json();
    const sessionToken = authData?.sessionToken;

    const [jobsRes, btebRes, campusRes, commRes] = await Promise.all([
      fetch(`${BASE_URL}/api/jobs`),
      fetch(`${BASE_URL}/api/notices/bteb`),
      fetch(`${BASE_URL}/api/notices/campus`),
      fetch(`${BASE_URL}/api/communities`, {
        headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}
      })
    ]);

    const jobsData = await jobsRes.json();
    const btebData = await btebRes.json();
    const campusData = await campusRes.json();
    const commData = await commRes.json();

    const passed =
      authRes.status === 200 &&
      authData.success === true &&
      Boolean(sessionToken) &&
      jobsRes.status === 200 &&
      Array.isArray(jobsData.jobs) &&
      jobsData.jobs.length > 0 &&
      btebRes.status === 200 &&
      Array.isArray(btebData.notices) &&
      btebData.notices.length > 0 &&
      campusRes.status === 200 &&
      Array.isArray(campusData.notices) &&
      commRes.status === 200 &&
      commData.success === true &&
      Array.isArray(commData.communities);

    recordTest(
      '10. Student-Facing Endpoints (Auth Session, Jobs, BTEB Notices, Campus Notices, Communities)',
      Boolean(passed),
      `authToken=${Boolean(sessionToken)}, jobs=${jobsData.jobs?.length}, btebNotices=${btebData.notices?.length}, campusNotices=${campusData.notices?.length}, communities=${commData.communities?.length}`
    );
  } catch (err: any) {
    recordTest('10. Student-Facing Endpoints', false, err.message);
  }

  console.log('\n==================================================================');
  const passedCount = results.filter(r => r.passed).length;
  console.log(`SUMMARY: ${passedCount}/${results.length} TESTS PASSED`);
  console.log('==================================================================');

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runTests();
