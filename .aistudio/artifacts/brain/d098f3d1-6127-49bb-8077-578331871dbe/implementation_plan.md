# Implementation Plan: Academic Community in DiplomaMate

## 1. Project Inspection & Architecture Overview
DiplomaMate is a full-stack React 19 + Express + TypeScript application running on Node.js.
- **Persistence Store**: `data/academic-store.json` via `academicStore` object in `server.ts`.
- **Identity & Sessions**: Server-issued `ServerSession` tokens validated through `Bearer` headers in `getAuthenticatedSession(req)`.
- **Canonical Directories**: `directoryData.ts` contains `resolveStrictCollege` and `resolveStrictTechnology` ensuring non-guessing academic resolution.
- **Roles Supported**:
  1. `student`: Enforces strict cohort boundaries (`college_id`, `department_id`, `semester`).
  2. `class_captain`: Must be approved via `captainRecords`, restricted to their authorized college, department, semester, shift, and section.
  3. `teacher`: Verified teachers can create academic groups within their polytechnic college and assigned technologies.
  4. `system_admin`: Full oversight, report resolution, and group deactivation controls.

---

## 2. Proposed Database Schema Changes (`data/academic-store.json`)

We extend `PersistentAcademicStore` with the following 4 collections:

### A. `communities: AcademicCommunity[]`
```typescript
export interface AcademicCommunity {
  id: string; // e.g. "comm_1719283721_cst4"
  name: string; // e.g. "CST 4th Semester Study Group"
  description: string;
  college_id: string; // canonical college ID (e.g. "clg_dhaka")
  college: string;
  department_id: string; // canonical technology ID (e.g. "tech_cst")
  department: string;
  semester: SemesterNumber; // 1..8
  regulation: string; // "2022", "2016", or "all"
  shift: Shift | 'Both';
  section: Section | 'All';
  visibility: 'public' | 'private';
  created_by: string; // user ID
  created_by_name: string;
  created_by_role: 'teacher' | 'class_captain' | 'system_admin';
  moderators: string[]; // array of user IDs
  member_count: number;
  is_active: boolean;
  pinned_notice_id?: string | null;
  created_at: string;
  updated_at: string;
}
```

### B. `communityMemberships: CommunityMembershipRecord[]`
```typescript
export interface CommunityMembershipRecord {
  id: string; // e.g. "mem_comm123_user456"
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
```

### C. `communityMessages: CommunityMessageRecord[]`
```typescript
export interface CommunityAttachment {
  id: string;
  file_name: string;
  file_type: 'document' | 'pdf' | 'image' | 'video';
  mime_type: string;
  file_size_bytes: number;
  file_url: string; // /api/communities/:id/files/:fileId
  duration_seconds?: number; // for small videos: max 60s, max 15MB
}

export interface CommunityMessageRecord {
  id: string; // e.g. "msg_1719283721_abc"
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
```

### D. `communityReports: CommunityReportRecord[]`
```typescript
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
```

---

## 3. Server-Side Security & API Endpoints (`server.ts`)

1. **`GET /api/communities`**:
   Lists communities discoverable by the authenticated user.
   - Strictly filters public groups matching `session.college_id`, `session.department_id`, and `session.semester`.
   - Private groups appear only if user has an active membership or invitation.
2. **`GET /api/communities/recommended`**:
   Used during New Student Onboarding & Dashboard. Returns matching academic communities for their exact cohort.
3. **`GET /api/communities/:id`**:
   Verifies membership or eligibility. Returns 403 Forbidden for unauthorized users.
4. **`POST /api/communities`**:
   Allows only verified Teachers and authorized Class Captains to create communities.
   - Captains can only create for their verified cohort.
   - Teachers can only create within their college.
5. **`POST /api/communities/:id/join`**:
   Revalidates student academic profile.
   - If public: joins immediately with `status: 'active'`.
   - If private: creates `status: 'pending_approval'`.
6. **`POST /api/communities/:id/leave`**:
   Allows member to leave.
7. **`GET /api/communities/:id/messages`**:
   Restricted to active members of the community. Supports search query parameter `q`.
8. **`POST /api/communities/:id/messages`**:
   Sends text message or file attachment. Enforces membership check and file size constraints (max 15MB, video max 60s).
9. **`POST /api/communities/:id/messages/:msgId/pin`**:
   Moderator/Teacher only. Pins message to community banner.
10. **`DELETE /api/communities/:id/messages/:msgId`**:
    Sender or community moderator only.
11. **`PUT /api/communities/:id/mute`**:
    Toggles `is_muted` for the current user.
12. **`POST /api/communities/:id/report`**:
    Submits a moderation report.
13. **`GET /api/communities/:id/files/:fileId`**:
    Authorized private file download.
14. **`POST /api/communities/revalidate-memberships`**:
    Revalidates all user memberships against updated academic profile.

---

## 4. Frontend Components (`src/components/screens/CommunityScreen.tsx`)

- **Community Hub Screen**:
  - Directory of "My Communities" & "Discover Eligible Groups".
  - Community Creator modal (for Teachers & Captains) with automatic naming format (`CST 4th Semester Study Group`).
  - Search & filter by semester / department.
- **Community Chat & Collaboration View**:
  - Pinned Announcements banner.
  - Real-time message thread with sender role badges (`Teacher`, `CR`, `Student`).
  - Document & PDF attachment cards with inline viewer/download.
  - Small video player for short lecture snippets / lab demonstrations.
  - Search bar for messages and study materials.
  - Mute/Unmute notifications toggle.
  - Members sidebar/modal.
  - Report Message & User modal.
  - Moderator management tools.
- **Onboarding Integration (`WelcomeScreen.tsx`)**:
  - Step 3 recommended communities after registration with one-click join.
- **Navigation Updates**:
  - Added to `BottomNav.tsx` and `MobileHeader.tsx` and `HomeScreen.tsx`.
