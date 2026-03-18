# Team Member RBAC System - Implementation Plan

## Context

Property managers want to invite assistants/co-workers ("Team Members") to use the platform with granular per-page access control (read-only, read-write, or no access). Currently the platform has zero authorization — only authentication. The cleaners system already implements a multi-user invite pattern that we'll mirror for team members. Team members will share the same `/property-manager/*` portal with a dynamically filtered sidebar.

**Key decisions:**
- Team members see ALL PM data (same `userId` scope), with page-level + read/write permissions
- Shared PM portal (no duplicate route group)
- Named "Team Members" in the UI
- Full implementation (not phased)

---

## Architecture Overview

```
PM invites team member via email
  → Supabase admin creates auth user (role: TEAM_MEMBER)
  → Magic link email sent
  → Team member clicks link → /api/auth/callback → /auth/set-password
  → Password set → profile created (role: TEAM_MEMBER)
  → Redirected to /property-manager/dashboard (filtered sidebar)
  → All API calls use PM's userId (from team_members.user_id)
  → Backend authorize() middleware checks permissions per route
```

---

## 1. Database Schema

### 1.1 Add role enum value

```sql
ALTER TYPE public.role ADD VALUE 'TEAM_MEMBER';
```

### 1.2 New table: `team_members`

```sql
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,   -- PM who owns this team member
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,           -- Team member's own Supabase auth ID
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'inactive')),
  permissions JSONB NOT NULL DEFAULT '{}',
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, email)
);

CREATE INDEX idx_team_members_auth_user_id ON public.team_members(auth_user_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
```

### 1.3 Permissions JSONB structure

Each key maps to a page. Values: `"none"` | `"read"` | `"read-write"`.

```json
{
  "dashboard": "read",
  "clients": "read-write",
  "properties": "read-write",
  "bookings": "read-write",
  "incoming_bookings": "read",
  "upload_bookings": "none",
  "reports": "read",
  "scheduled_reports": "none",
  "report_templates": "none",
  "expenses": "read-write",
  "turnover": "read",
  "checklists": "read",
  "supply_lists": "read",
  "cleaners": "read",
  "analytics": "read",
  "settings": "none"
}
```

---

## 2. Backend Changes

### 2.1 New: Authorization middleware

**File:** `middleware/authorize.js`

Runs AFTER existing `auth.js` middleware. For PMs: always passes. For team members: checks `permissions` JSONB from `team_members` table.

```
function authorize(resource, level = 'read') → Express middleware
  - PM/ADMIN → next()
  - TEAM_MEMBER → look up team_members row by auth_user_id, check permissions[resource] >= level
  - Also sets req.pmUserId (PM's userId for team members, or own ID for PMs)
  - Caches team member lookup on req.teamMember to avoid re-querying
```

### 2.2 New: Team member invite service

**File:** `services/teamMemberInviteService.js`

Mirror `services/cleanerInviteService.js` exactly:
- `inviteTeamMember({ email, name })` → `supabase.auth.admin.inviteUserByEmail()` with `role: 'TEAM_MEMBER'`
- `resendTeamMemberInvite(email)`
- `deleteTeamMemberAuthUser(authUserId)`

### 2.3 New: Team member CRUD

**Files:**
- `routes/team-members.routes.js`
- `controllers/team-members.controller.js`
- `queries/team-members.queries.js`

**Endpoints:**
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/team-members?userId=X` | List all team members for a PM |
| GET | `/api/team-members/:id` | Get single team member |
| GET | `/api/team-members/me?authUserId=X` | Team member finds own record (like cleaners/me) |
| POST | `/api/team-members` | Create + invite via email |
| PUT | `/api/team-members/:id` | Update name, phone, permissions, status |
| DELETE | `/api/team-members/:id` | Delete team member + cleanup auth user |
| POST | `/api/team-members/:id/resend-invite` | Resend invite email |

Pattern: Follow `controllers/cleaners.controller.js` exactly (same transform pattern, same CRUD structure, same invite flow with orphan cleanup).

### 2.4 New: Profile endpoint for team members

**File:** `controllers/profile.controller.js` — add `getOrCreateTeamMemberProfile()`

Mirror `getOrCreateCleanerProfile()` (lines 270-360):
- Creates profile with `role: 'TEAM_MEMBER'`
- Auto-activates team member from 'invited' → 'active'
- Returns profile + `pmUserId` + `permissions` from `team_members` row

### 2.5 Add authorize() to existing routes

Incrementally add `authorize(resource, level)` middleware to ALL existing route files. Example for properties:

```js
// routes/property.routes.js
router.get('/', auth, authorize('properties', 'read'), controller.getAll)
router.post('/', auth, authorize('properties', 'read-write'), controller.create)
router.put('/:id', auth, authorize('properties', 'read-write'), controller.update)
router.delete('/:id', auth, authorize('properties', 'read-write'), controller.delete)
```

Apply this pattern to all ~30 route files, mapping each to the appropriate permission key.

### 2.6 Update controllers to use `req.pmUserId`

Controllers currently read `req.query.userId` or `req.query.parentId`. The authorize middleware will set `req.pmUserId`. Controllers should prefer `req.pmUserId` when available, falling back to query params for backward compatibility.

### 2.7 Register routes in server.js

```js
const teamMembersRoutes = require("./routes/team-members.routes")
app.use("/api/team-members", teamMembersRoutes)
```

---

## 3. Frontend Changes

### 3.1 New: Permission constants & types

**File:** `src/constants/permissionTemplates.ts`

```typescript
export const PERMISSION_KEYS = [
  'dashboard', 'clients', 'properties', 'bookings', 'incoming_bookings',
  'upload_bookings', 'reports', 'scheduled_reports', 'report_templates',
  'expenses', 'turnover', 'checklists', 'supply_lists', 'cleaners',
  'analytics', 'settings'
] as const

export type PermissionKey = typeof PERMISSION_KEYS[number]
export type PermissionLevel = 'none' | 'read' | 'read-write'
export type Permissions = Record<PermissionKey, PermissionLevel>

// Preset templates (applied in UI, stored as JSONB)
export const PERMISSION_TEMPLATES = {
  full_access: { label: 'Full Access', permissions: { /* all read-write except settings */ } },
  reports_only: { label: 'Reports & Analytics', permissions: { /* reports rw, data read */ } },
  read_only: { label: 'View Only', permissions: { /* all read, none write */ } },
  operations: { label: 'Operations', permissions: { /* turnover/cleaners rw, rest read */ } },
}
```

**File:** `src/constants/routePermissionMap.ts`

Maps each `/property-manager/*` route to its permission key.

### 3.2 Update: User store

**File:** `src/store/useUserStore.ts`

- Add `'TEAM_MEMBER'` to `UserProfile.role` union type
- Add `pmUserId?: string | null` field (the PM's ID, for API calls)
- Add `permissions?: Permissions | null` field
- Add `case 'TEAM_MEMBER': return '/property-manager/dashboard'` to `getRedirectPath()`

### 3.3 New: Permissions hook

**File:** `src/hooks/usePermissions.ts`

```typescript
export function usePermissions() {
  const profile = useUserStore(s => s.profile)
  const isPM = profile?.role === 'PROPERTY-MANAGER' || profile?.role === 'ADMIN'
  const isTeamMember = profile?.role === 'TEAM_MEMBER'

  const canRead = (resource: PermissionKey): boolean => { /* PM=true, TM=check permissions */ }
  const canWrite = (resource: PermissionKey): boolean => { /* PM=true, TM=check read-write */ }

  // For API calls: returns PM's userId for team members, own ID for PMs
  const effectiveUserId = isTeamMember ? profile?.pmUserId : profile?.id

  return { canRead, canWrite, isPM, isTeamMember, effectiveUserId }
}
```

### 3.4 New: Permission guard hook

**File:** `src/hooks/usePermissionGuard.ts`

Called in each page to redirect if no access:

```typescript
export function usePermissionGuard(resource: PermissionKey, level: PermissionLevel = 'read') {
  // If team member lacks permission → redirect to dashboard + show error notification
}
```

### 3.5 Update: Sidebar filtering

**File:** `src/app/(user)/property-manager/layout.tsx`

Create `useFilteredNavConfig()` hook that:
1. Takes full `managerNavConfig` from `sidebarItems.ts`
2. Reads permissions via `usePermissions()`
3. Filters out items where permission is `'none'`
4. Adds "Team Members" item only for PMs (not team members)
5. Returns filtered config to `ResponsiveSidebar`

### 3.6 Update: Sidebar items

**File:** `src/components/navbar/sidebarItems.ts`

Add "Team Members" entry to the `managerNavConfig.top` array (in a logical group, e.g., bottom items alongside Settings, or in its own group).

### 3.7 Update: API client — differentiate 401 vs 403

**File:** `src/services/apiClient.ts`

Currently lines 178-184 treat both 401 and 403 as session expired. Fix:
- `401` → session expired modal (keep current behavior)
- `403` → show notification "You don't have permission" (do NOT trigger session expired modal)

### 3.8 Update: Auth callback

**File:** `src/app/api/auth/callback/route.ts`

Add `TEAM_MEMBER` handling alongside `CLEANER` (line 114):

```typescript
} else if (role === 'TEAM_MEMBER') {
  redirectTo.pathname = '/auth/set-password'
  redirectTo.search = ''
}
```

### 3.9 Update: Set password page

**File:** `src/app/(prelogin)/auth/set-password/page.tsx`

Generalize to handle both CLEANER and TEAM_MEMBER roles:
- If `TEAM_MEMBER`: call `getOrCreateTeamMemberProfile()` instead of `getOrCreateCleanerProfile()`
- Redirect to `/property-manager/dashboard` instead of `/cleaner/dashboard`

### 3.10 Update: Login page

**File:** `src/app/(prelogin)/login/page.tsx`

After login, when fetching profile — if role is `TEAM_MEMBER`, also fetch team member record to get `pmUserId` and `permissions`, store in Zustand.

### 3.11 Update: All 16 PM pages — `effectiveUserId`

Every page currently uses `profile.id` for API calls. Must change to `effectiveUserId` from `usePermissions()`. This is the most widespread change.

Pages to update:
- `dashboard/page.tsx`
- `clients/page.tsx`
- `properties/page.tsx`
- `bookings/page.tsx`
- `incoming-bookings/page.tsx`
- `upload-bookings/page.tsx`
- `reports/page.tsx`
- `scheduled-reports/page.tsx`
- `report-templates/page.tsx`
- `expenses/page.tsx`
- `turnover/page.tsx`
- `checklists/page.tsx`
- `supply-lists/page.tsx`
- `cleaners/page.tsx`
- `analytics/page.tsx`
- `settings/page.tsx`

Each page also needs:
1. `usePermissionGuard('resource_key')` call at top
2. Conditional rendering of create/edit/delete buttons based on `canWrite('resource_key')`

### 3.12 New: Team member service & types

**File:** `src/services/teamMemberService.ts`

Mirror `src/services/cleanerService.ts`:
- `getTeamMembers(userId)`
- `getTeamMember(id)`
- `getTeamMemberByAuthUserId(authUserId)`
- `createTeamMember(data)`
- `updateTeamMember(id, data)`
- `deleteTeamMember(id)`
- `resendTeamMemberInvite(id)`

**File:** `src/services/types/teamMember.ts`

```typescript
export interface TeamMember {
  id: string
  userId: string
  authUserId: string | null
  name: string
  email: string
  phone: string | null
  status: 'invited' | 'active' | 'inactive'
  permissions: Permissions
  lastActiveAt: string | null
  createdAt: string
  updatedAt: string
}
```

### 3.13 New: Team Members management page

**File:** `src/app/(user)/property-manager/team/page.tsx`

Follow the pattern of `cleaners/page.tsx`:
- Stats cards (Total, Active, Invited, Inactive)
- Search and filter
- Table: Name, Email, Status, Permission Template, Last Active, Actions
- Actions: View, Edit, Edit Permissions, Resend Invite, Deactivate, Delete
- Only accessible to PM role (not team members)

### 3.14 New: Team member CRUD modals

Following `components/[resource]/[action]/` pattern:

```
src/components/team-member/
├── create/CreateTeamMemberModal.tsx    — Name, email, permission template selector
├── update/UpdateTeamMemberModal.tsx    — Edit name, phone, status
├── delete/DeleteTeamMemberModal.tsx    — Confirmation with auth cleanup warning
├── preview/PreviewTeamMemberModal.tsx  — View details + current permissions
└── permissions/PermissionEditor.tsx    — Grid: 16 rows × 3 columns (none/read/read-write)
                                          + preset template dropdown at top
```

The **PermissionEditor** is the key new UI component:
- Rows: each page/resource (16 rows)
- Columns: None / Read / Read-Write (radio buttons per row)
- Dropdown at top: select preset template to pre-fill all toggles
- Used in both Create and Update modals

---

## 4. Implementation Order

Since this is a full implementation, work in this sequence (each step builds on the previous):

### Step 1: Backend foundation
1. Run SQL migration (add role enum value, create `team_members` table)
2. Create `services/teamMemberInviteService.js` (mirror cleanerInviteService)
3. Create `queries/team-members.queries.js`
4. Create `controllers/team-members.controller.js`
5. Create `routes/team-members.routes.js`
6. Register in `server.js`
7. Add `getOrCreateTeamMemberProfile()` to profile controller

### Step 2: Backend authorization middleware
8. Create `middleware/authorize.js`
9. Add authorize() to all existing route files (map endpoints → permission keys)
10. Update controllers to use `req.pmUserId`

### Step 3: Frontend auth & permissions
11. Create `src/constants/permissionTemplates.ts` and `routePermissionMap.ts`
12. Update `useUserStore.ts` (add TEAM_MEMBER role, pmUserId, permissions)
13. Create `usePermissions.ts` hook
14. Create `usePermissionGuard.ts` hook
15. Update `apiClient.ts` (differentiate 401 vs 403)
16. Update auth callback route (handle TEAM_MEMBER)
17. Update set-password page (handle TEAM_MEMBER)
18. Update login page (fetch team member data after login)

### Step 4: Frontend sidebar & page guards
19. Update `sidebarItems.ts` (add Team Members entry)
20. Create `useFilteredNavConfig()` hook
21. Update `property-manager/layout.tsx` (use filtered nav config)
22. Update all 16 pages with `usePermissionGuard()` and `effectiveUserId`
23. Add conditional rendering of write actions based on `canWrite()`

### Step 5: Team management UI
24. Create `src/services/types/teamMember.ts`
25. Create `src/services/teamMemberService.ts`
26. Create `PermissionEditor.tsx` component
27. Create CRUD modals (create, update, delete, preview)
28. Create `team/page.tsx` management page

---

## 5. Critical Files to Modify

### Backend (existing files to modify)
| File | Change |
|------|--------|
| `server.js` | Add team-members route registration |
| `middleware/auth.js` | No changes (reuse as-is) |
| `controllers/profile.controller.js` | Add `getOrCreateTeamMemberProfile()` |
| `routes/profile.routes.js` | Add team member profile endpoint |
| ALL `routes/*.routes.js` (~30 files) | Add `authorize()` middleware to each route |

### Backend (new files)
| File | Purpose |
|------|---------|
| `middleware/authorize.js` | Authorization middleware |
| `services/teamMemberInviteService.js` | Supabase admin invite flow |
| `controllers/team-members.controller.js` | CRUD controller |
| `queries/team-members.queries.js` | SQL queries |
| `routes/team-members.routes.js` | Express routes |

### Frontend (existing files to modify)
| File | Change |
|------|--------|
| `src/store/useUserStore.ts` | Add TEAM_MEMBER role, pmUserId, permissions |
| `src/services/apiClient.ts` | Differentiate 401 vs 403 |
| `src/app/api/auth/callback/route.ts` | Handle TEAM_MEMBER role |
| `src/app/(prelogin)/auth/set-password/page.tsx` | Handle TEAM_MEMBER role |
| `src/app/(prelogin)/login/page.tsx` | Fetch team member data on login |
| `src/components/navbar/sidebarItems.ts` | Add Team Members nav entry |
| `src/app/(user)/property-manager/layout.tsx` | Use filtered nav config |
| All 16 PM `page.tsx` files | Add permission guard + effectiveUserId |

### Frontend (new files)
| File | Purpose |
|------|---------|
| `src/constants/permissionTemplates.ts` | Permission keys, types, templates |
| `src/constants/routePermissionMap.ts` | Route → permission key mapping |
| `src/hooks/usePermissions.ts` | Central permissions hook |
| `src/hooks/usePermissionGuard.ts` | Page-level access guard |
| `src/services/teamMemberService.ts` | API service |
| `src/services/types/teamMember.ts` | TypeScript types |
| `src/app/(user)/property-manager/team/page.tsx` | Management page |
| `src/components/team-member/create/CreateTeamMemberModal.tsx` | Create modal |
| `src/components/team-member/update/UpdateTeamMemberModal.tsx` | Update modal |
| `src/components/team-member/delete/DeleteTeamMemberModal.tsx` | Delete modal |
| `src/components/team-member/preview/PreviewTeamMemberModal.tsx` | Preview modal |
| `src/components/team-member/permissions/PermissionEditor.tsx` | Permission grid UI |

---

## 6. Key Patterns to Reuse

| Pattern | Source File | Reuse For |
|---------|-------------|-----------|
| Invite flow | `services/cleanerInviteService.js` | `teamMemberInviteService.js` |
| CRUD controller | `controllers/cleaners.controller.js` | `team-members.controller.js` |
| SQL queries | `queries/cleaners.queries.js` | `team-members.queries.js` |
| Profile creation | `profile.controller.js:getOrCreateCleanerProfile()` | `getOrCreateTeamMemberProfile()` |
| Auth callback routing | `app/api/auth/callback/route.ts` (line 114) | Add TEAM_MEMBER branch |
| Frontend service | `services/cleanerService.ts` | `teamMemberService.ts` |
| Management page | `property-manager/cleaners/page.tsx` | `property-manager/team/page.tsx` |
| CRUD modals | `components/client/create/createClientModal.tsx` | Team member modals |

---

## 7. Verification

### Backend testing
1. Run SQL migration and verify table creation
2. Test `POST /api/team-members` — creates record + sends invite email
3. Test `GET /api/team-members?userId=X` — returns team members for PM
4. Test `GET /api/team-members/me?authUserId=X` — team member self-lookup
5. Test authorize middleware: PM requests pass, team member requests check permissions, unauthorized returns 403
6. Test that team member API calls with `req.pmUserId` return the PM's data (not empty)

### Frontend testing
1. Login as PM → sidebar shows "Team Members" entry
2. Navigate to `/property-manager/team` → management page loads
3. Create team member with "Full Access" preset → invite email sent
4. Click invite link → set password page → set password → redirected to PM dashboard
5. Login as team member → sidebar shows only permitted pages
6. Navigate to a "none" permission page via URL → redirected to dashboard with error notification
7. On a "read" page → create/edit/delete buttons hidden
8. On a "read-write" page → full CRUD functionality works
9. All API calls return PM's data (not empty)
10. 403 errors show "no permission" notification (not session expired modal)

### Edge cases
- Team member with no permissions → sees only dashboard (if dashboard=read)
- PM deactivates team member → team member's next API call returns 403
- Deleted team member → Supabase auth user also cleaned up
- New pages added in future → team members default to "none" (deny by default)
