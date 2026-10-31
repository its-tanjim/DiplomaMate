/**
 * Automated Test Suite: Academic Community & Peer Collaboration
 * Tests:
 * 1. Session creation & onboarding recommendations
 * 2. Captain cohort-restricted community creation & cross-cohort rejection (HTTP 403)
 * 3. Teacher polytechnic-restricted community creation
 * 4. Student academic cohort isolation & cross-cohort access rejection (HTTP 403)
 * 5. Private group request & approval flow
 * 6. Messaging, documents/PDFs, and video upload constraints (<=15MB, <=60s)
 * 7. Authorized file streaming (/api/communities/:id/files/:fileId)
 * 8. Pinned study notes & announcements
 * 9. Per-community mute settings
 * 10. Abuse reporting & resolution
 * 11. Profile change membership revalidation
 */

import http from 'http';

const BASE_URL = 'http://localhost:3000';

function makeRequest(method: string, path: string, body?: any, token?: string): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options: http.RequestOptions = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          resolve({ status: res.statusCode || 200, data: parsed });
        } catch {
          resolve({ status: res.statusCode || 200, data: raw });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('STARTING ACADEMIC COMMUNITY VERIFICATION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // 1. Session Setup for 3 Users
  console.log('1. Setting up Sessions (Captain, Eligible Student, Cross-Cohort Student, Teacher)...');
  
  // A. Class Captain (Nusrat Jahan - Approved CR for Dhaka Polytechnic CST Sem 6 Morning A1)
  const capSessionRes = await makeRequest('POST', '/api/auth/session', {
    userId: 'cr_nusrat_01',
    role: 'class_captain',
    name: 'Nusrat Jahan (CR)',
    email: 'nusrat.cr@dpi.edu.bd',
    college: 'Dhaka Polytechnic Institute (DPI), Tejgaon',
    department: 'Computer Science & Technology (CST)',
    boardRoll: '542880',
    regNumber: '1502187320',
    semester: 6,
    shift: 'Morning',
    section: 'A1'
  });
  const capToken = capSessionRes.data.sessionToken;
  assert(!!capToken, 'Class Captain session provisioned');

  // B. Eligible Student (Dhaka Polytechnic, CST, Sem 6, Morning, Sec A1)
  const stdSessionRes = await makeRequest('POST', '/api/auth/session', {
    userId: 'std_rahim_01',
    role: 'student',
    name: 'Rahim Khan',
    email: 'rahim@dpi.edu.bd',
    college: 'Dhaka Polytechnic Institute',
    department: 'Computer Science and Technology (CST)',
    boardRoll: '542892',
    semester: 6,
    shift: 'Morning',
    section: 'A1'
  });
  const stdToken = stdSessionRes.data.sessionToken;
  assert(!!stdToken, 'Eligible Student session provisioned');

  // C. Cross-Cohort Student (Chittagong Polytechnic, Civil, Sem 4)
  const crossStdSessionRes = await makeRequest('POST', '/api/auth/session', {
    userId: 'std_farhan_cross',
    role: 'student',
    name: 'Farhan Ali (Chittagong Civil)',
    email: 'farhan@cpi.edu.bd',
    college: 'Chattogram Polytechnic Institute',
    department: 'Civil Technology',
    boardRoll: '612345',
    semester: 4,
    shift: 'Morning',
    section: 'A1'
  });
  const crossStdToken = crossStdSessionRes.data.sessionToken;
  assert(!!crossStdToken, 'Cross-Cohort Student session provisioned');

  // D. Teacher - Authenticates with institutional PIN via /api/teachers/login
  const teacherLoginRes = await makeRequest('POST', '/api/teachers/login', {
    phoneOrEmail: '+880 1819-334455',
    pin: '1234'
  });
  const teacherToken = teacherLoginRes.data.sessionToken;
  assert(!!teacherToken, 'Teacher session authenticated via institutional PIN');

  // 2. Class Captain Group Creation & Cross-Cohort Rejection
  console.log('\n2. Testing Captain Group Creation & Authorization Guard...');
  
  // Captain tries to create community for Civil Technology (UNAUTHORIZED -> MUST BE REJECTED 403)
  const rogueCaptainCreate = await makeRequest('POST', '/api/communities', {
    name: 'Civil 6th Sem Hack Group',
    department: 'Civil Technology',
    semester: 6
  }, capToken);
  assert(rogueCaptainCreate.status === 403, 'Captain unauthorized department group creation rejected with HTTP 403');

  // Captain tries to create community for Semester 2 (UNAUTHORIZED -> MUST BE REJECTED 403)
  const rogueCaptainSemCreate = await makeRequest('POST', '/api/communities', {
    name: 'CST 2nd Sem Junior Group',
    department: 'Computer Science and Technology (CST)',
    semester: 2
  }, capToken);
  assert(rogueCaptainSemCreate.status === 403, 'Captain unauthorized semester group creation rejected with HTTP 403');

  // Captain creates group for their exact verified cohort: CST 6th Sem (AUTHORIZED)
  const validCaptainCreate = await makeRequest('POST', '/api/communities', {
    name: 'CST 6th Semester Study Group',
    description: 'Official academic discussion and notes sharing for CST 6th semester morning shift.',
    department: 'Computer Science and Technology (CST)',
    semester: 6,
    shift: 'Morning',
    section: 'A1',
    visibility: 'public'
  }, capToken);
  assert(validCaptainCreate.status === 201 && validCaptainCreate.data.success, 'Captain successfully created group for authorized cohort');
  const communityId = validCaptainCreate.data.community?.id;
  assert(!!communityId, 'Community ID generated');

  // 3. Teacher Group Creation (Private Group)
  console.log('\n3. Testing Teacher Academic Group Creation...');
  const teacherCreate = await makeRequest('POST', '/api/communities', {
    name: 'Microprocessor Lab Project Group',
    description: 'Faculty-guided practical project and lab test discussions.',
    department: 'Computer Science and Technology (CST)',
    semester: 6,
    visibility: 'private'
  }, teacherToken);
  assert(teacherCreate.status === 201 && teacherCreate.data.success, 'Teacher successfully created private academic group');
  const privateCommunityId = teacherCreate.data.community?.id;

  // 4. Student Cohort Isolation & Cross-Cohort Access Protection
  console.log('\n4. Testing Student Cohort Isolation & Unauthorized Access Rejection...');
  
  // Eligible student discovers public group
  const stdDiscRes = await makeRequest('GET', '/api/communities', undefined, stdToken);
  const eligibleHasGroup = stdDiscRes.data.communities?.some((c: any) => c.id === communityId);
  assert(eligibleHasGroup, 'Eligible student can discover matching public group');

  // Cross-cohort student tries to discover Dhaka CST group (MUST BE FILTERED OUT)
  const crossDiscRes = await makeRequest('GET', '/api/communities', undefined, crossStdToken);
  const crossHasGroup = crossDiscRes.data.communities?.some((c: any) => c.id === communityId);
  assert(!crossHasGroup, 'Cross-cohort student CANNOT discover group from other college/department');

  // Cross-cohort student attempts direct join on Dhaka CST group (MUST BE REJECTED 403)
  const crossJoinRes = await makeRequest('POST', `/api/communities/${communityId}/join`, {}, crossStdToken);
  assert(crossJoinRes.status === 403, 'Cross-cohort student direct join rejected with HTTP 403');

  // Eligible student joins the public group (AUTHORIZED -> DIRECT ACTIVE)
  const stdJoinRes = await makeRequest('POST', `/api/communities/${communityId}/join`, {}, stdToken);
  assert(stdJoinRes.status === 200 && stdJoinRes.data.membership?.status === 'active', 'Eligible student joined public group with active status');

  // Eligible student requests to join private group (STATUS PENDING_APPROVAL)
  const stdPrivateJoinRes = await makeRequest('POST', `/api/communities/${privateCommunityId}/join`, {}, stdToken);
  assert(stdPrivateJoinRes.status === 200 && stdPrivateJoinRes.data.membership?.status === 'pending_approval', 'Student join to private group requires moderator approval');

  // 5. Onboarding Recommendation Endpoint
  console.log('\n5. Testing Onboarding Recommendations Endpoint...');
  const recRes = await makeRequest('GET', '/api/communities/recommended', undefined, stdToken);
  assert(recRes.status === 200 && recRes.data.success, 'Recommendations retrieved for student profile');

  // 6. Messaging, Files & Video Limits
  console.log('\n6. Testing Messaging & File Sharing Controls...');

  // A. Post text message
  const msgPostRes = await makeRequest('POST', `/api/communities/${communityId}/messages`, {
    content: 'Welcome everyone! Midterms for Microprocessor (66662) start next week.'
  }, capToken);
  assert(msgPostRes.status === 201 && msgPostRes.data.success, 'Class Captain posted text announcement');
  const msgId = msgPostRes.data.message?.id;

  // B. Post study note PDF
  const pdfMsgRes = await makeRequest('POST', `/api/communities/${communityId}/messages`, {
    content: 'Attached are Chapter 4 lecture slides and lab circuit diagram.',
    attachments: [
      {
        file_name: 'Microprocessor_Ch4_Interfacing.pdf',
        file_type: 'pdf',
        mime_type: 'application/pdf',
        file_size_bytes: 524288, // 512 KB
        file_url: 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9ia...'
      }
    ]
  }, teacherToken);
  assert(pdfMsgRes.status === 201 && pdfMsgRes.data.message?.attachments?.length === 1, 'Teacher shared PDF lecture document');
  const fileId = pdfMsgRes.data.message?.attachments?.[0]?.id;

  // C. Test video duration and size limit (Video > 60s must be rejected)
  const longVideoRes = await makeRequest('POST', `/api/communities/${communityId}/messages`, {
    content: 'Full length lab recording',
    attachments: [
      {
        file_name: 'Lab_Full.mp4',
        file_type: 'video',
        mime_type: 'video/mp4',
        file_size_bytes: 10 * 1024 * 1024,
        duration_seconds: 120 // exceeds 60s limit
      }
    ]
  }, stdToken);
  assert(longVideoRes.status === 400, 'Video exceeding 60-second limit rejected with HTTP 400');

  // D. Valid small video clip (<= 15MB, <= 60s)
  const validVideoRes = await makeRequest('POST', `/api/communities/${communityId}/messages`, {
    content: '30s demonstration of 8086 register addressing.',
    attachments: [
      {
        file_name: 'Register_Demo_30s.mp4',
        file_type: 'video',
        mime_type: 'video/mp4',
        file_size_bytes: 4 * 1024 * 1024, // 4MB
        duration_seconds: 30
      }
    ]
  }, stdToken);
  assert(validVideoRes.status === 201, 'Valid short video clip (<=15MB, <=60s) accepted and posted');

  // 7. Authorized File Streaming Route Protection
  console.log('\n7. Testing Private File Streaming Endpoint (/api/communities/:id/files/:fileId)...');
  
  // Member downloads file (AUTHORIZED -> 200)
  const memberFileRes = await makeRequest('GET', `/api/communities/${communityId}/files/${fileId}`, undefined, stdToken);
  assert(memberFileRes.status === 200, 'Active community member authorized to stream/download shared study file');

  // Cross-cohort non-member tries to download file (FORBIDDEN -> 403)
  const nonMemberFileRes = await makeRequest('GET', `/api/communities/${communityId}/files/${fileId}`, undefined, crossStdToken);
  assert(nonMemberFileRes.status === 403, 'Non-member unauthorized direct file access blocked with HTTP 403');

  // 8. Pinned Study Notes & Announcements
  console.log('\n8. Testing Pinned Notes Toggle...');
  const pinRes = await makeRequest('POST', `/api/communities/${communityId}/messages/${msgId}/pin`, {}, teacherToken);
  assert(pinRes.status === 200 && pinRes.data.is_pinned === true, 'Faculty moderator pinned important midterm notice');

  // 9. Per-Community Mute Notifications
  console.log('\n9. Testing Per-Community Mute Notifications...');
  const muteRes = await makeRequest('PUT', `/api/communities/${communityId}/mute`, { is_muted: true }, stdToken);
  assert(muteRes.status === 200 && muteRes.data.is_muted === true, 'Student successfully muted community notifications');

  // 10. Abuse Reporting & Admin Controls
  console.log('\n10. Testing Content Reporting & Moderation...');
  const reportRes = await makeRequest('POST', `/api/communities/${communityId}/report`, {
    reported_message_id: msgId,
    reported_user_id: 'cr_tanvir_01',
    reason: 'Spam or Misleading announcement'
  }, stdToken);
  assert(reportRes.status === 201 && reportRes.data.success, 'Student successfully reported content to moderators');

  // 11. Profile Change Membership Revalidation
  console.log('\n11. Testing Automatic Membership Revalidation on Student Profile Change...');
  // Student moves from Semester 6 to Semester 7 -> should be revoked from Semester 6 group
  const revalRes = await makeRequest('POST', '/api/communities/revalidate-memberships', {
    userId: 'std_rahim_01',
    college: 'Dhaka Polytechnic Institute',
    department: 'Computer Science and Technology (CST)',
    semester: 7 // Promoted to Sem 7
  }, stdToken);
  assert(revalRes.status === 200 && revalRes.data.revokedCount >= 1, 'Membership safely revoked when student cohort changed');

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
