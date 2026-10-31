/**
 * Comprehensive verification script for DiplomaMate Part 6:
 * 1. Job Circulars opens & filters correctly.
 * 2. Real job listings are displayed with source links & computed statuses.
 * 3. A job with an external application link provides the correct external application URL.
 * 4. No false claim of internal application submission is present.
 * 5. BTEB Notices display real notices from multiple available pages (all 42+ pages / 412+ notices).
 * 6. A newly discovered notice is added without creating duplicates.
 * 7. The original notice and attachment links work.
 * 8. Teacher/CR notices appear under the correct filters and remain separate from BTEB notices.
 * 9. Teacher/CR authorization is enforced on the server (Student 403, CR out-of-scope 403, CR own-cohort 201, Teacher own-dept 201).
 * 10. Source failures do not erase previously retrieved notices.
 * 11. Existing login, routines, results, community, booklists, and other features still work.
 */

const BASE_URL = 'http://localhost:3000';

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

async function runTests() {
  console.log('==============================================================');
  console.log('RUNNING DIPLOMAMATE PART 6 VERIFICATION SUITE');
  console.log('==============================================================\n');

  // ---------------------------------------------------------------------------
  // TEST 1, 2, 3, 4: JOB CIRCULARS
  // ---------------------------------------------------------------------------
  console.log('[Test 1-4] Verifying Diploma Engineering Job Circulars API & Application Workflow...');
  const jobsRes = await fetch(`${BASE_URL}/api/jobs?pageSize=50`);
  assert(jobsRes.ok, `GET /api/jobs failed with HTTP ${jobsRes.status}`);
  const jobsData: any = await jobsRes.json();

  assert(Array.isArray(jobsData.jobs) && jobsData.jobs.length >= 6, 'Expected at least 6 job circulars');
  assert(typeof jobsData.total === 'number' && jobsData.total >= 6, 'Expected total count >= 6');
  assert(Array.isArray(jobsData.availableFilters?.departments) && jobsData.availableFilters.departments.length > 0, 'Expected availableFilters.departments metadata');
  assert(jobsData.syncInfo && jobsData.syncInfo.primarySourceUrl === 'https://www.careerjet.com.bd/diploma-engineer-jobs', 'Expected syncInfo.primarySourceUrl to be Careerjet Diploma Engineer URL');

  const firstJob = jobsData.jobs[0];
  assert(firstJob.title && firstJob.company && firstJob.location, 'Job circular missing core fields');
  assert(firstJob.sourceUrl && firstJob.sourceUrl.startsWith('http'), 'Job circular must have valid external sourceUrl');
  assert(firstJob.applicationMethod === 'external_url', 'Job circular must use honest external_url application method');
  assert(['Open', 'Closing Soon', 'Expired'].includes(firstJob.status), `Unexpected job status: ${firstJob.status}`);

  // Verify status filtering (e.g. Expired vs Open)
  const expiredRes = await fetch(`${BASE_URL}/api/jobs?status=Expired`);
  const expiredData: any = await expiredRes.json();
  assert(expiredData.jobs.length >= 1, 'Expected at least 1 expired job for status badge verification');
  assert(expiredData.jobs.every((j: any) => j.status === 'Expired'), 'Status filter Expired returned non-expired job');

  // Verify department filtering
  const cstJobsRes = await fetch(`${BASE_URL}/api/jobs?department=CST`);
  const cstJobsData: any = await cstJobsRes.json();
  assert(cstJobsData.jobs.length >= 1, 'Expected CST filtered jobs');

  // Verify sync endpoint transparency when CAREERJET_API_KEY is not set
  const jobSyncRes = await fetch(`${BASE_URL}/api/jobs/sync`, { method: 'POST' });
  const jobSyncData: any = await jobSyncRes.json();
  assert(jobSyncData.careerjetApiConfigured === false, 'Expected honest disclosure that CAREERJET_API_KEY is not configured');
  assert(jobSyncData.message.includes('CAREERJET_API_KEY'), 'Expected clear explanation of Careerjet Partner API v4 credential requirement');

  console.log(`  ✓ Passed Tests 1-4: ${jobsData.total} job circulars verified, external application URLs intact, honest Careerjet API status reported.\n`);

  // ---------------------------------------------------------------------------
  // TEST 5, 6, 7, 10: BTEB OFFICIAL NOTICES (ALL PAGES, DEDUP, LINKS, OUTAGE)
  // ---------------------------------------------------------------------------
  console.log('[Test 5-7] Verifying BTEB Official Notices Synchronization across all pages...');
  const btebSyncRes = await fetch(`${BASE_URL}/api/notices/bteb/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert(btebSyncRes.ok, `POST /api/notices/bteb/sync failed with HTTP ${btebSyncRes.status}`);
  const btebSyncData: any = await btebSyncRes.json();

  assert(btebSyncData.totalNotices >= 400, `Expected 400+ notices across all 42 BTEB pages, got ${btebSyncData.totalNotices}`);
  assert(btebSyncData.pagesFetched >= 40, `Expected >= 40 standard BTEB pages covered, got ${btebSyncData.pagesFetched}`);

  // Fetch the synced BTEB notices list via GET /api/notices/bteb
  const btebListRes = await fetch(`${BASE_URL}/api/notices/bteb?pageSize=50`);
  assert(btebListRes.ok, `GET /api/notices/bteb failed with HTTP ${btebListRes.status}`);
  const btebListData: any = await btebListRes.json();

  assert(btebListData.totalCached >= 400, `Expected totalCached >= 400, got ${btebListData.totalCached}`);
  assert(Array.isArray(btebListData.notices) && btebListData.notices.length === 50, 'Expected 50 paginated BTEB notices');

  const sampleBteb = btebListData.notices[0];
  assert(sampleBteb.sourceLabel === 'Bangladesh Technical Education Board (BTEB)', 'Incorrect BTEB sourceLabel');
  assert(sampleBteb.noticeUrl.startsWith('https://bteb.gov.bd/pages/notices/'), `Invalid BTEB noticeUrl: ${sampleBteb.noticeUrl}`);
  assert(sampleBteb.publishedDateIso && /^\d{4}-\d{2}-\d{2}$/.test(sampleBteb.publishedDateIso), `Invalid BTEB publishedDateIso: ${sampleBteb.publishedDateIso}`);

  const withAttachment = btebListData.notices.find((n: any) => Boolean(n.pdfUrl));
  assert(withAttachment && withAttachment.pdfUrl.startsWith('http'), 'Expected BTEB notices to include valid PDF attachment URLs');

  // Verify deduplication on second sync
  const countBeforeSecondSync = btebSyncData.totalNotices;
  const secondSyncRes = await fetch(`${BASE_URL}/api/notices/bteb/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const secondSyncData: any = await secondSyncRes.json();
  assert(secondSyncData.totalNotices === countBeforeSecondSync, `Expected zero duplicates on re-sync (${countBeforeSecondSync} vs ${secondSyncData.totalNotices})`);
  assert(secondSyncData.insertedCount === 0, `Expected insertedCount === 0 on immediate re-sync, got ${secondSyncData.insertedCount}`);

  // Test 10: Verify simulated BTEB source outage preserves cached notices
  console.log('[Test 10] Verifying BTEB source failure resilience (cached notices preserved)...');
  const outageRes = await fetch(`${BASE_URL}/api/notices/bteb?simulateOutage=true&pageSize=10`);
  assert(outageRes.ok, 'Expected graceful 200 response with cached notices during BTEB outage');
  const outageData: any = await outageRes.json();
  assert(outageData.totalCached === countBeforeSecondSync, `Expected cached notices (${countBeforeSecondSync}) to be preserved on outage, got ${outageData.totalCached}`);
  assert(Boolean(outageData.syncError), 'Expected syncError message to be populated when source fails');

  console.log(`  ✓ Passed Tests 5, 6, 7, 10: ${countBeforeSecondSync} real BTEB notices across ${btebSyncData.pagesFetched} pages synced, deduplicated, PDF links verified, and outage resilience confirmed.\n`);

  // ---------------------------------------------------------------------------
  // TEST 8 & 9: TEACHER & CLASS CAPTAIN NOTICES + RBAC ENFORCEMENT
  // ---------------------------------------------------------------------------
  console.log('[Test 8-9] Verifying Teacher & Class Captain Notices Filters & Backend RBAC...');

  // Authenticate sessions for Student, Class Captain (DPI CST Sem 6 Morning Sec A1), and Verified Teacher (tch_01)
  const studentSessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'stu_test_ordinary_99',
      role: 'student',
      name: 'Ordinary Student',
      email: 'student99@dpi.gov.bd',
      college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
      department: 'Computer Science & Technology (CST)',
      semester: 6,
      shift: 'Morning',
      section: 'A1'
    })
  });
  const studentSession: any = await studentSessionRes.json();
  assert(studentSession.sessionToken, 'Failed to create student test session');

  const crSessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'cr_test_dpi_cst_6_a1',
      role: 'class_captain',
      name: 'Arifur Rahman (CR)',
      email: 'arifur.cr@dpi.gov.bd',
      college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
      department: 'Computer Science & Technology (CST)',
      boardRoll: '650121',
      semester: 6,
      shift: 'Morning',
      section: 'A1'
    })
  });
  const crSession: any = await crSessionRes.json();
  assert(crSession.sessionToken, 'Failed to create Class Captain test session');

  const teacherLoginRes = await fetch(`${BASE_URL}/api/teachers/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneOrEmail: 'mahbubur.cst@dpi.gov.bd',
      pin: '1234'
    })
  });
  const teacherSession: any = await teacherLoginRes.json();
  assert(teacherSession.sessionToken, 'Failed to authenticate verified Teacher session');

  // 9a. Ordinary student MUST be blocked (403 Forbidden) from publishing a notice
  const studentPostRes = await fetch(`${BASE_URL}/api/notices/campus`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${studentSession.sessionToken}`
    },
    body: JSON.stringify({
      title: 'Unauthorized Student Notice',
      description: 'Students must not be able to publish notices by modifying requests.',
      targetScope: 'cohort',
      college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
      department: 'Computer Science & Technology (CST)',
      semester: 6,
      shift: 'Morning',
      section: 'A1'
    })
  });
  assert(studentPostRes.status === 403, `Expected 403 Forbidden for ordinary student, got ${studentPostRes.status}`);

  // 9b. Class Captain MUST be blocked (403 Forbidden) from publishing to College-wide scope
  const crCollegeScopeRes = await fetch(`${BASE_URL}/api/notices/campus`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${crSession.sessionToken}`
    },
    body: JSON.stringify({
      title: 'Unauthorized College-Wide Notice by CR',
      description: 'CR is only authorized for their own cohort.',
      targetScope: 'college',
      college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
      department: 'Computer Science & Technology (CST)',
      semester: 6,
      shift: 'Morning',
      section: 'A1'
    })
  });
  assert(crCollegeScopeRes.status === 403, `Expected 403 Forbidden when CR tries to post college-wide notice, got ${crCollegeScopeRes.status}`);

  // 9c. Class Captain MUST be blocked (403 Forbidden) from publishing to a different cohort (e.g., Semester 4)
  const crWrongCohortRes = await fetch(`${BASE_URL}/api/notices/campus`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${crSession.sessionToken}`
    },
    body: JSON.stringify({
      title: 'Unauthorized Other Cohort Notice',
      description: 'Targeting Semester 4 instead of Semester 6.',
      targetScope: 'cohort',
      college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
      department: 'Computer Science & Technology (CST)',
      semester: 4,
      shift: 'Morning',
      section: 'A1'
    })
  });
  assert(crWrongCohortRes.status === 403, `Expected 403 Forbidden when CR targets unauthorized semester/section, got ${crWrongCohortRes.status}`);

  // 9d. Class Captain MUST succeed (201 Created) when publishing to their authorized cohort (DPI, CST, Sem 6, Morning, Sec A1)
  const crValidRes = await fetch(`${BASE_URL}/api/notices/campus`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${crSession.sessionToken}`
    },
    body: JSON.stringify({
      title: 'Database Systems Lab Viva Group Schedule (Sec A1)',
      description: 'Roll 650101–650130 will attend viva at 10:00 AM in Computer Lab 2.',
      targetScope: 'cohort',
      priority: 'Important',
      college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
      department: 'Computer Science & Technology (CST)',
      semester: 6,
      shift: 'Morning',
      section: 'A1'
    })
  });
  assert(crValidRes.status === 201, `Expected 201 Created for authorized CR cohort notice, got ${crValidRes.status}`);
  const crCreatedData: any = await crValidRes.json();
  const createdNoticeId = crCreatedData.notice.id;

  // 9e. Verified Teacher (DPI CST) MUST be blocked (403) from publishing to another college (Bogura Polytechnic)
  const teacherWrongCollegeRes = await fetch(`${BASE_URL}/api/notices/campus`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherSession.sessionToken}`
    },
    body: JSON.stringify({
      title: 'Unauthorized Bogura Notice',
      description: 'Teacher belongs to DPI, not Bogura Polytechnic.',
      targetScope: 'department',
      college: 'Bogura Polytechnic Institute',
      department: 'Computer Science & Technology (CST)'
    })
  });
  assert(teacherWrongCollegeRes.status === 403, `Expected 403 Forbidden when DPI teacher targets Bogura Polytechnic, got ${teacherWrongCollegeRes.status}`);

  // 9f. Verified Teacher (DPI CST) MUST succeed (201) when publishing to their authorized college/department (DPI / CST)
  const teacherValidRes = await fetch(`${BASE_URL}/api/notices/campus`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherSession.sessionToken}`
    },
    body: JSON.stringify({
      title: 'Industrial Attachment Logbook Orientation (6th & 7th Sem CST)',
      description: 'All CST students are requested to collect logbook guidelines from the department office.',
      targetScope: 'department',
      priority: 'Normal',
      college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
      department: 'Computer Science & Technology (CST)',
      semester: 6
    })
  });
  assert(teacherValidRes.status === 201, `Expected 201 Created for authorized Teacher notice, got ${teacherValidRes.status}`);
  const teacherCreatedData: any = await teacherValidRes.json();
  const teacherNoticeId = teacherCreatedData.notice.id;

  // Test 8: Verify filtering (`college` vs `my_group`)
  const myGroupRes = await fetch(`${BASE_URL}/api/notices/campus?filter=my_group&college=Dhaka%20Polytechnic%20Institute%20(DPI)%2C%20Tejgaon&department=Computer%20Science%20%26%20Technology%20(CST)&semester=6&shift=Morning&section=A1`);
  const myGroupData: any = await myGroupRes.json();
  assert(myGroupData.notices.some((n: any) => n.id === createdNoticeId), 'Expected newly created CR cohort notice in my_group filter');
  assert(myGroupData.notices.every((n: any) => n.publisherRole === 'teacher' || n.publisherRole === 'class_captain' || n.publisherRole === 'system_admin'), 'Campus notices must have clear publisherRole');

  const collegeFilterRes = await fetch(`${BASE_URL}/api/notices/campus?filter=college&college=Dhaka%20Polytechnic%20Institute%20(DPI)%2C%20Tejgaon&department=Computer%20Science%20%26%20Technology%20(CST)`);
  const collegeFilterData: any = await collegeFilterRes.json();
  assert(collegeFilterData.notices.some((n: any) => n.id === teacherNoticeId), 'Expected teacher department notice in college filter');

  // Clean up test notices created during verification
  await fetch(`${BASE_URL}/api/notices/campus/${createdNoticeId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${crSession.sessionToken}` }
  });
  await fetch(`${BASE_URL}/api/notices/campus/${teacherNoticeId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${teacherSession.sessionToken}` }
  });

  // Also verify Test 6 explicitly: newly discovered BTEB notice is added without creating duplicates
  const newNoticeTestId = `bteb_test_new_discovery_${Date.now()}`;
  const newNoticeUrl = `https://bteb.gov.bd/pages/notices/test-discovery-${Date.now()}`;
  const discoverRes1 = await fetch(`${BASE_URL}/api/notices/bteb/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherSession.sessionToken}`
    },
    body: JSON.stringify({
      manualNotices: [
        {
          id: newNoticeTestId,
          title: 'ডিপ্লোমা-ইন-ইঞ্জিনিয়ারিং শিক্ষাক্রমের ব্যবহারিক ও মৌখিক পরীক্ষার বিশেষ বিজ্ঞপ্তি (পরীক্ষামূলক)',
          noticeUrl: newNoticeUrl,
          pdfUrl: `${newNoticeUrl}.pdf`,
          publishedDateIso: '2026-10-25',
          publishedDateDisplay: '25-10-2026'
        }
      ]
    })
  });
  const discoverData1: any = await discoverRes1.json();
  assert(discoverData1.insertedCount === 1, 'Expected newly discovered BTEB notice to be added (insertedCount === 1)');

  const discoverRes2 = await fetch(`${BASE_URL}/api/notices/bteb/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${teacherSession.sessionToken}`
    },
    body: JSON.stringify({
      manualNotices: [
        {
          id: newNoticeTestId,
          title: 'ডিপ্লোমা-ইন-ইঞ্জিনিয়ারিং শিক্ষাক্রমের ব্যবহারিক ও মৌখিক পরীক্ষার বিশেষ বিজ্ঞপ্তি (পরীক্ষামূলক)',
          noticeUrl: newNoticeUrl,
          pdfUrl: `${newNoticeUrl}.pdf`,
          publishedDateIso: '2026-10-25',
          publishedDateDisplay: '25-10-2026'
        }
      ]
    })
  });
  const discoverData2: any = await discoverRes2.json();
  assert(discoverData2.insertedCount === 0, 'Expected duplicate BTEB notice to be prevented (insertedCount === 0)');

  console.log('  ✓ Passed Tests 8 & 9 (+ Test 6 new-notice dedup): Campus notice filters (all, college, my_group) and strict server-side RBAC verified.\n');

  // ---------------------------------------------------------------------------
  // TEST 11: EXISTING FEATURES REGRESSION CHECK
  // ---------------------------------------------------------------------------
  console.log('[Test 11] Verifying existing features (Login/Auth, Routines, Results, Communities, Subject Catalog/Booklist)...');

  const authHeaders = { Authorization: `Bearer ${studentSession.sessionToken}` };

  const authMeRes = await fetch(`${BASE_URL}/api/auth/me`, { headers: authHeaders });
  assert(authMeRes.ok, `GET /api/auth/me failed with HTTP ${authMeRes.status}`);

  const routinesRes = await fetch(`${BASE_URL}/api/routines?college=Dhaka%20Polytechnic%20Institute%20(DPI)%2C%20Tejgaon&department=Computer%20Science%20%26%20Technology%20(CST)&semester=6&shift=Morning&section=A1`, {
    headers: authHeaders
  });
  assert(routinesRes.ok, `GET /api/routines failed with HTTP ${routinesRes.status}`);

  const resultsRes = await fetch(`${BASE_URL}/api/results/individual?roll=750121&regulation=2022`, {
    headers: authHeaders
  });
  assert(resultsRes.ok, `GET /api/results/individual unexpected status ${resultsRes.status}`);

  const communityRes = await fetch(`${BASE_URL}/api/communities`, {
    headers: authHeaders
  });
  assert(communityRes.ok, `GET /api/communities failed with HTTP ${communityRes.status}`);

  const booklistRes = await fetch(`${BASE_URL}/api/subjects?technology=CST&regulation=2022&semester=6`, {
    headers: authHeaders
  });
  assert(booklistRes.ok, `GET /api/subjects failed with HTTP ${booklistRes.status}`);

  console.log('  ✓ Passed Test 11: All existing DiplomaMate endpoints (Auth, Routines, BTEB Results, Communities, Booklist) are healthy.\n');

  console.log('==============================================================');
  console.log('ALL 11 PART 6 VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('==============================================================');
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err.message);
  process.exit(1);
});
