# Cleaner Scheduling / Turnover Management Feature

## Overview

Build a complete "Turnover Management" portal within HostMetrics for managing cleaning projects, cleaner assignments, and property turnovers - inspired by Operto Teams and Turno.

---

## Confirmed Requirements

| Decision | Choice |
|----------|--------|
| **Cleaner Auth** | Full Supabase accounts (email/password) |
| **Navigation** | New "Turnover" sidebar section |
| **Project Creation** | Auto-create on booking import |
| **Auto-Assignment** | Assign default cleaner, notify PM; pending if no default |
| **Decline Flow** | Notify PM, project goes back to unassigned |
| **MVP Features** | Calendar views (both modes), Checklists with photos, Cleaner portal, Alerts system |
| **Photo Storage** | Supabase Storage |
| **Guest Info for Cleaners** | Guest count only (store full info, show count) |
| **Notifications** | In-app + Email + SMS via Twilio |
| **Default Calendar** | Week view, property rows (Turno-style) |
| **Owner Access** | PM only (no client access to turnover portal) |
| **Unclean Trigger** | Auto on checkout date (midnight or checkout time) |
| **iCal Support** | Yes, in MVP scope |

---

## Database Schema

### New Tables (Run in Supabase SQL Editor)

```sql
-- ==============================================
-- TURNOVER MANAGEMENT TABLES
-- ==============================================

-- 1. Cleaners (staff members managed by PM)
create table public.cleaners (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,                        -- PM who manages this cleaner
  auth_user_id uuid null,                       -- Supabase auth user (for cleaner login)
  name text not null,
  email text,
  phone text,
  hourly_rate decimal(10,2),
  default_turnaround_minutes int default 120,   -- Default cleaning duration
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint cleaners_pkey primary key (id),
  constraint cleaners_user_id_fkey foreign key (user_id) references profiles(id) on delete cascade,
  constraint cleaners_auth_user_id_fkey foreign key (auth_user_id) references auth.users(id) on delete set null
);

-- 2. Cleaner-Property assignments
create table public.cleaner_properties (
  id uuid not null default gen_random_uuid(),
  cleaner_id uuid not null,
  property_id uuid not null,
  is_default boolean default false,             -- Primary cleaner for this property
  priority int default 1,                       -- Backup order (1 = highest)
  created_at timestamptz not null default now(),
  constraint cleaner_properties_pkey primary key (id),
  constraint cleaner_properties_cleaner_fkey foreign key (cleaner_id) references cleaners(id) on delete cascade,
  constraint cleaner_properties_property_fkey foreign key (property_id) references properties(id) on delete cascade,
  constraint cleaner_properties_unique unique (cleaner_id, property_id)
);

-- 3. Property checklists (reusable templates)
create table public.property_checklists (
  id uuid not null default gen_random_uuid(),
  property_id uuid not null,
  name text not null,                           -- e.g., "Standard Turnover", "Deep Clean"
  is_default boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint property_checklists_pkey primary key (id),
  constraint property_checklists_property_fkey foreign key (property_id) references properties(id) on delete cascade
);

-- 4. Checklist items (tasks within a checklist)
create table public.checklist_items (
  id uuid not null default gen_random_uuid(),
  checklist_id uuid not null,
  room_name text,                               -- e.g., "Living Room", "Master Bedroom"
  task_description text not null,
  requires_photo boolean default false,
  sort_order int default 0,
  created_at timestamptz not null default now(),
  constraint checklist_items_pkey primary key (id),
  constraint checklist_items_checklist_fkey foreign key (checklist_id) references property_checklists(id) on delete cascade
);

-- 5. Cleaning Projects (core entity)
create table public.cleaning_projects (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,                        -- PM who owns this project
  property_id uuid not null,
  booking_id uuid null,                         -- Optional link to booking
  cleaner_id uuid null,                         -- Assigned cleaner (null = unassigned)
  checklist_id uuid null,                       -- Which checklist to use

  -- Scheduling
  scheduled_date date not null,
  checkout_time time,                           -- When guests leave
  checkin_time time,                            -- When next guests arrive
  estimated_duration_minutes int,
  actual_start timestamptz,
  actual_end timestamptz,

  -- Context (for cleaner view)
  guest_count int,
  is_same_day_turnover boolean default false,

  -- Status workflow
  status text not null default 'pending',       -- pending|assigned|confirmed|in_progress|completed|cancelled
  cleaner_accepted boolean null,                -- null=awaiting, true=accepted, false=declined

  -- Notes
  pm_notes text,
  cleaner_notes text,

  -- Source tracking
  source text default 'manual',                 -- manual|hostaway|ical

  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint cleaning_projects_pkey primary key (id),
  constraint cleaning_projects_user_fkey foreign key (user_id) references profiles(id) on delete cascade,
  constraint cleaning_projects_property_fkey foreign key (property_id) references properties(id) on delete cascade,
  constraint cleaning_projects_booking_fkey foreign key (booking_id) references bookings(id) on delete set null,
  constraint cleaning_projects_cleaner_fkey foreign key (cleaner_id) references cleaners(id) on delete set null,
  constraint cleaning_projects_checklist_fkey foreign key (checklist_id) references property_checklists(id) on delete set null
);

-- 6. Project checklist progress (per-project completion)
create table public.project_checklist_items (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  checklist_item_id uuid not null,
  is_completed boolean default false,
  completed_at timestamptz,
  photo_url text,                               -- Supabase storage URL
  notes text,
  constraint project_checklist_items_pkey primary key (id),
  constraint project_checklist_items_project_fkey foreign key (project_id) references cleaning_projects(id) on delete cascade,
  constraint project_checklist_items_item_fkey foreign key (checklist_item_id) references checklist_items(id) on delete cascade,
  constraint project_checklist_items_unique unique (project_id, checklist_item_id)
);

-- 7. Project issues/problems reported by cleaners
create table public.project_issues (
  id uuid not null default gen_random_uuid(),
  project_id uuid not null,
  reported_by uuid null,                        -- cleaner_id
  issue_type text,                              -- damage|missing_item|maintenance|supply|other
  description text not null,
  photo_urls text[],                            -- Array of Supabase storage URLs
  status text default 'open',                   -- open|acknowledged|resolved
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint project_issues_pkey primary key (id),
  constraint project_issues_project_fkey foreign key (project_id) references cleaning_projects(id) on delete cascade,
  constraint project_issues_cleaner_fkey foreign key (reported_by) references cleaners(id) on delete set null
);

-- 8. Property clean status (current state tracker)
create table public.property_status (
  property_id uuid not null,
  status text not null default 'unknown',       -- clean|unclean|in_progress|unknown
  last_cleaned_at timestamptz,
  last_project_id uuid,
  next_checkout_at timestamptz,
  updated_at timestamptz default now(),
  constraint property_status_pkey primary key (property_id),
  constraint property_status_property_fkey foreign key (property_id) references properties(id) on delete cascade,
  constraint property_status_project_fkey foreign key (last_project_id) references cleaning_projects(id) on delete set null
);

-- 9. iCal subscriptions (for non-Hostaway calendars)
create table public.ical_subscriptions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  property_id uuid not null,
  ical_url text not null,
  name text,                                    -- Friendly name (e.g., "Airbnb Calendar")
  last_synced_at timestamptz,
  sync_status text default 'pending',           -- pending|syncing|success|error
  error_message text,
  auto_sync boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint ical_subscriptions_pkey primary key (id),
  constraint ical_subscriptions_user_fkey foreign key (user_id) references profiles(id) on delete cascade,
  constraint ical_subscriptions_property_fkey foreign key (property_id) references properties(id) on delete cascade
);

-- 10. Notification preferences per cleaner
create table public.cleaner_notification_preferences (
  cleaner_id uuid not null,
  email_enabled boolean default true,
  sms_enabled boolean default true,
  in_app_enabled boolean default true,
  constraint cleaner_notif_pkey primary key (cleaner_id),
  constraint cleaner_notif_cleaner_fkey foreign key (cleaner_id) references cleaners(id) on delete cascade
);

-- Indexes for performance
create index idx_cleaning_projects_date on cleaning_projects(scheduled_date);
create index idx_cleaning_projects_status on cleaning_projects(status);
create index idx_cleaning_projects_cleaner on cleaning_projects(cleaner_id);
create index idx_cleaning_projects_property on cleaning_projects(property_id);
create index idx_property_status_status on property_status(status);
```

---

## New Routes Structure

```
app/
├── (user)/
│   ├── property-manager/
│   │   ├── turnover/                    # PM Turnover Portal
│   │   │   └── page.tsx                 # Calendar views + project management
│   │   ├── cleaners/                    # Cleaner Management
│   │   │   └── page.tsx                 # Cleaner roster CRUD
│   │   └── checklists/                  # Checklist Templates (optional separate page)
│   │       └── page.tsx
│   └── cleaner/                         # Cleaner Portal (new role)
│       ├── layout.tsx                   # Cleaner-specific navbar
│       ├── dashboard/
│       │   └── page.tsx                 # Today's tasks overview
│       └── projects/
│           ├── page.tsx                 # All assigned projects
│           └── [id]/
│               └── page.tsx             # Project detail with checklist
```

---

## Component Architecture

```
components/
├── turnover/
│   ├── calendar/
│   │   ├── TurnoverCalendar.tsx         # Main calendar (uses FullCalendar)
│   │   ├── PropertyRowView.tsx          # Turno-style: properties as rows
│   │   ├── CleanerRowView.tsx           # Operto-style: cleaners as rows
│   │   ├── ProjectEvent.tsx             # Event rendering in calendar
│   │   └── CalendarToolbar.tsx          # Date nav + view switcher
│   ├── project/
│   │   ├── CreateProjectModal.tsx       # Manual project creation
│   │   ├── ProjectDetailModal.tsx       # Full project view for PM
│   │   ├── AssignCleanerModal.tsx       # Assign/reassign cleaner
│   │   └── ProjectStatusBadge.tsx       # Status indicator
│   ├── alerts/
│   │   ├── TurnoverAlerts.tsx           # Alert panel
│   │   └── AlertCard.tsx                # Individual alert
│   └── shared/
│       ├── PropertyStatusBadge.tsx      # Clean/Unclean indicator
│       └── SameDayBadge.tsx             # Same-day turnover highlight
├── cleaner/
│   ├── create/createCleanerModal.tsx
│   ├── update/updateCleanerModal.tsx
│   ├── delete/deleteCleanerModal.tsx
│   ├── preview/previewCleanerModal.tsx
│   └── AssignPropertiesModal.tsx        # Assign cleaner to properties
├── checklist/
│   ├── ChecklistEditor.tsx              # Template editor
│   ├── ChecklistProgress.tsx            # Project checklist view
│   ├── ChecklistItemRow.tsx             # Individual item with photo
│   └── PhotoUpload.tsx                  # Photo capture/upload
├── cleaner-portal/
│   ├── CleanerNavbar.tsx                # Cleaner-specific nav
│   ├── TodaysTasks.tsx                  # Dashboard widget
│   ├── ProjectCard.tsx                  # Task card for cleaner
│   ├── ChecklistView.tsx                # Interactive checklist
│   └── IssueReportModal.tsx             # Report problems
└── ical/
    ├── ICalSubscriptionModal.tsx        # Add iCal URL
    └── ICalSyncStatus.tsx               # Sync status indicator
```

---

## Service Layer

```
services/
├── cleanerService.ts                    # Cleaner CRUD
├── cleaningProjectService.ts            # Project CRUD + status transitions
├── checklistService.ts                  # Checklist template CRUD
├── propertyStatusService.ts             # Property clean/unclean status
├── icalService.ts                       # iCal subscription management
├── turnoverNotificationService.ts       # Twilio SMS/Email + in-app
├── types/
│   ├── cleaner.ts
│   ├── cleaningProject.ts
│   ├── checklist.ts
│   ├── propertyStatus.ts
│   └── icalSubscription.ts
```

---

## Backend API Endpoints

### Cleaners
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/cleaners?userId=X` | List cleaners for PM |
| GET | `/api/cleaners/:id` | Get cleaner details |
| POST | `/api/cleaners` | Create cleaner (also creates Supabase auth user) |
| PUT | `/api/cleaners/:id` | Update cleaner |
| DELETE | `/api/cleaners/:id` | Delete cleaner |
| POST | `/api/cleaners/:id/assign-properties` | Assign properties to cleaner |

### Cleaning Projects
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/cleaning-projects?userId=X&startDate=X&endDate=X` | List projects (date range) |
| GET | `/api/cleaning-projects/:id` | Get project with checklist progress |
| POST | `/api/cleaning-projects` | Create project (manual) |
| PUT | `/api/cleaning-projects/:id` | Update project |
| DELETE | `/api/cleaning-projects/:id` | Delete project |
| POST | `/api/cleaning-projects/:id/assign` | Assign cleaner |
| POST | `/api/cleaning-projects/:id/accept` | Cleaner accepts |
| POST | `/api/cleaning-projects/:id/decline` | Cleaner declines |
| POST | `/api/cleaning-projects/:id/start` | Cleaner starts work |
| POST | `/api/cleaning-projects/:id/complete` | Cleaner completes |
| POST | `/api/cleaning-projects/:id/checklist/:itemId` | Update checklist item |
| POST | `/api/cleaning-projects/:id/issues` | Report issue |

### Checklists
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/checklists?propertyId=X` | List checklists for property |
| POST | `/api/checklists` | Create checklist template |
| PUT | `/api/checklists/:id` | Update checklist |
| DELETE | `/api/checklists/:id` | Delete checklist |

### Property Status
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/property-status?userId=X` | Get all property statuses |
| GET | `/api/property-status/:propertyId` | Get single property status |
| PUT | `/api/property-status/:propertyId` | Manually update status |

### iCal
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/ical-subscriptions?userId=X` | List subscriptions |
| POST | `/api/ical-subscriptions` | Add iCal URL |
| POST | `/api/ical-subscriptions/:id/sync` | Trigger manual sync |
| DELETE | `/api/ical-subscriptions/:id` | Remove subscription |

### Cleaner Portal (cleaner-authenticated)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/cleaner/projects` | Get assigned projects |
| GET | `/api/cleaner/projects/:id` | Get project detail |
| POST | `/api/cleaner/projects/:id/accept` | Accept assignment |
| POST | `/api/cleaner/projects/:id/decline` | Decline assignment |
| POST | `/api/cleaner/projects/:id/start` | Start cleaning |
| POST | `/api/cleaner/projects/:id/complete` | Mark complete |
| POST | `/api/cleaner/projects/:id/checklist/:itemId` | Update item + photo |
| POST | `/api/cleaner/projects/:id/issues` | Report issue |

---

## Automation Logic

### 1. Auto-Create Project on Booking Import
**Trigger**: When `IncomingBooking` status changes to `imported` (booking created)

```javascript
// In booking import flow
async function onBookingImported(booking) {
  // 1. Create cleaning project
  const project = await createCleaningProject({
    userId: booking.userId,
    propertyId: booking.propertyId,
    bookingId: booking.id,
    scheduledDate: booking.checkOutDate,  // Cleaning day = checkout day
    checkoutTime: extractTimeFromWebhook(booking.rawWebhookData),
    checkinTime: extractNextCheckinTime(booking),
    guestCount: extractGuestCount(booking.rawWebhookData),
    source: 'hostaway'
  });

  // 2. Check for same-day turnover
  if (hasBookingStartingSameDay(booking.propertyId, booking.checkOutDate)) {
    await updateProject(project.id, { isSameDayTurnover: true });
  }

  // 3. Auto-assign default cleaner
  const defaultCleaner = await getDefaultCleanerForProperty(booking.propertyId);
  if (defaultCleaner) {
    await assignCleaner(project.id, defaultCleaner.id);
    await sendNotification('pm', 'project_auto_assigned', project);
    await sendNotification('cleaner', 'new_assignment', project);
  } else {
    await sendNotification('pm', 'project_unassigned', project);
  }
}
```

### 2. Auto-Mark Property Unclean
**Trigger**: Scheduled job at midnight OR checkout time

```javascript
// Cron job: runs every hour
async function checkCheckouts() {
  const now = new Date();
  const checkouts = await getBookingsCheckingOutNow(now);

  for (const booking of checkouts) {
    await updatePropertyStatus(booking.propertyId, {
      status: 'unclean',
      nextCheckoutAt: booking.checkOutDate
    });
  }
}
```

### 3. Alert Generation
**Triggers**: Various conditions checked periodically

```javascript
// Alert types
const ALERTS = {
  UNASSIGNED_48H: 'Unassigned project within 48 hours',
  SCHEDULING_CONFLICT: 'Cleaner has 2+ same-day turnovers',
  UNACCEPTED_24H: 'Project not accepted within 24 hours',
  LAST_MINUTE_UNCLEAN: 'New booking for unclean property',
  SAME_DAY_TURNOVER: 'Same-day turnover needs attention'
};
```

---

## Notification System (Twilio)

### Setup Required
1. Twilio account with SMS + SendGrid email
2. Environment variables:
   ```
   TWILIO_ACCOUNT_SID=xxx
   TWILIO_AUTH_TOKEN=xxx
   TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
   TWILIO_SENDGRID_API_KEY=xxx
   ```

### Notification Types
| Event | PM Notification | Cleaner Notification |
|-------|-----------------|---------------------|
| Project auto-created | In-app | - |
| Project assigned | In-app | SMS + Email + In-app |
| Cleaner accepts | In-app | - |
| Cleaner declines | SMS + Email + In-app | - |
| Project started | In-app | - |
| Project completed | In-app + Email | - |
| Issue reported | SMS + Email + In-app | - |
| Same-day turnover | SMS + In-app | SMS + In-app |

---

## Calendar Library: FullCalendar

```bash
npm install @fullcalendar/react @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/resource-timeline @fullcalendar/interaction
```

### Why FullCalendar
- **Resource Timeline view**: Perfect for "cleaners as rows" or "properties as rows"
- **Week/Month/Day views** built-in
- **Drag-and-drop** for rescheduling
- **Event rendering** customizable
- **TypeScript support**

---

## Implementation Phases

### Phase 1: Database & Foundation
- [ ] Run SQL migrations in Supabase
- [ ] Create Supabase Storage bucket for photos
- [ ] Create TypeScript types
- [ ] Create service files (CRUD operations)
- [ ] Add "Turnover" to sidebar navigation

### Phase 2: Cleaner Management
- [ ] Cleaners list page (`/property-manager/cleaners`)
- [ ] Create/Update/Delete/Preview cleaner modals
- [ ] Assign properties to cleaners modal
- [ ] Cleaner Supabase auth user creation

### Phase 3: Calendar & Projects (PM View)
- [ ] Install FullCalendar
- [ ] TurnoverCalendar component with view switching
- [ ] PropertyRowView (default)
- [ ] CleanerRowView
- [ ] CreateProjectModal
- [ ] ProjectDetailModal
- [ ] AssignCleanerModal
- [ ] Project status workflow

### Phase 4: Checklists
- [ ] Property checklist template editor
- [ ] Checklist items CRUD
- [ ] PhotoUpload component (Supabase Storage)
- [ ] Project checklist progress view

### Phase 5: Cleaner Portal
- [ ] CLEANER role in profiles
- [ ] Cleaner layout/navbar
- [ ] Cleaner dashboard (today's tasks)
- [ ] Project list view
- [ ] Project detail with checklist
- [ ] Accept/Decline/Start/Complete actions
- [ ] Issue reporting with photos

### Phase 6: Automation & Alerts
- [ ] Auto-create project on booking import
- [ ] Auto-assign default cleaner
- [ ] Property status auto-update (checkout = unclean)
- [ ] Alert generation logic
- [ ] Alerts panel component

### Phase 7: Notifications (Twilio)
- [ ] Backend Twilio integration
- [ ] SMS sending for key events
- [ ] Email sending for key events
- [ ] In-app notification system
- [ ] Notification preferences per cleaner

### Phase 8: iCal Integration
- [ ] iCal URL parsing (node-ical library)
- [ ] iCal subscription CRUD
- [ ] Auto-sync scheduled job
- [ ] Create projects from iCal events

---

## Files to Create/Modify

### Backend (thesmarthost-backend)

| File | Action |
|------|--------|
| `queries/cleaners.queries.js` | CREATE |
| `queries/cleaningProjects.queries.js` | CREATE |
| `queries/checklists.queries.js` | CREATE |
| `queries/propertyStatus.queries.js` | CREATE |
| `queries/icalSubscriptions.queries.js` | CREATE |
| `controllers/cleaners.controller.js` | CREATE |
| `controllers/cleaningProjects.controller.js` | CREATE |
| `controllers/checklists.controller.js` | CREATE |
| `controllers/propertyStatus.controller.js` | CREATE |
| `controllers/icalSubscriptions.controller.js` | CREATE |
| `routes/cleaners.routes.js` | CREATE |
| `routes/cleaningProjects.routes.js` | CREATE |
| `routes/checklists.routes.js` | CREATE |
| `routes/propertyStatus.routes.js` | CREATE |
| `routes/icalSubscriptions.routes.js` | CREATE |
| `routes/cleanerPortal.routes.js` | CREATE |
| `services/twilioService.js` | CREATE |
| `services/notificationService.js` | CREATE |
| `services/icalParserService.js` | CREATE |
| `middleware/cleanerAuth.middleware.js` | CREATE |
| `routes/index.js` | MODIFY - add new routes |
| `controllers/incomingBookings.controller.js` | MODIFY - add auto-create project |

### Frontend (thesmarthost)

| File | Action |
|------|--------|
| `services/cleanerService.ts` | CREATE |
| `services/cleaningProjectService.ts` | CREATE |
| `services/checklistService.ts` | CREATE |
| `services/propertyStatusService.ts` | CREATE |
| `services/icalService.ts` | CREATE |
| `services/types/cleaner.ts` | CREATE |
| `services/types/cleaningProject.ts` | CREATE |
| `services/types/checklist.ts` | CREATE |
| `services/types/propertyStatus.ts` | CREATE |
| `services/types/icalSubscription.ts` | CREATE |
| `components/navbar/ManagerSidebar.tsx` | MODIFY - add Turnover menu item |
| `app/(user)/property-manager/turnover/page.tsx` | CREATE |
| `app/(user)/property-manager/cleaners/page.tsx` | CREATE |
| `app/(user)/cleaner/layout.tsx` | CREATE |
| `app/(user)/cleaner/dashboard/page.tsx` | CREATE |
| `app/(user)/cleaner/projects/page.tsx` | CREATE |
| `app/(user)/cleaner/projects/[id]/page.tsx` | CREATE |
| `components/turnover/calendar/TurnoverCalendar.tsx` | CREATE |
| `components/turnover/calendar/PropertyRowView.tsx` | CREATE |
| `components/turnover/calendar/CleanerRowView.tsx` | CREATE |
| `components/turnover/project/CreateProjectModal.tsx` | CREATE |
| `components/turnover/project/ProjectDetailModal.tsx` | CREATE |
| `components/turnover/project/AssignCleanerModal.tsx` | CREATE |
| `components/turnover/alerts/TurnoverAlerts.tsx` | CREATE |
| `components/cleaner/create/createCleanerModal.tsx` | CREATE |
| `components/cleaner/update/updateCleanerModal.tsx` | CREATE |
| `components/cleaner/delete/deleteCleanerModal.tsx` | CREATE |
| `components/checklist/ChecklistEditor.tsx` | CREATE |
| `components/checklist/ChecklistProgress.tsx` | CREATE |
| `components/checklist/PhotoUpload.tsx` | CREATE |
| `components/cleaner-portal/CleanerNavbar.tsx` | CREATE |
| `components/cleaner-portal/TodaysTasks.tsx` | CREATE |
| `components/cleaner-portal/ProjectCard.tsx` | CREATE |
| `components/cleaner-portal/ChecklistView.tsx` | CREATE |
| `components/cleaner-portal/IssueReportModal.tsx` | CREATE |
| `components/ical/ICalSubscriptionModal.tsx` | CREATE |

---

## Verification Plan

1. **Cleaner Management**
   - Create a cleaner with email/phone
   - Verify Supabase auth user created
   - Assign cleaner to 2 properties (one as default)
   - Verify cleaner can log in

2. **Project Creation (Manual)**
   - Create project for property with default cleaner
   - Verify auto-assigned
   - Create project for property without default
   - Verify status is "pending"

3. **Project Creation (Auto)**
   - Import booking via Hostaway
   - Verify cleaning project auto-created
   - Verify default cleaner assigned
   - Verify PM notification received

4. **Calendar Views**
   - Switch between property-row and cleaner-row views
   - Verify projects display correctly
   - Test date navigation (week forward/back)
   - Click project to open detail modal

5. **Cleaner Portal**
   - Log in as cleaner
   - View assigned projects
   - Accept a project
   - Complete checklist items with photos
   - Report an issue with photo
   - Mark project complete

6. **Property Status**
   - After checkout time, verify property marked "unclean"
   - After project completed, verify property marked "clean"

7. **Alerts**
   - Create unassigned project within 48h
   - Verify alert appears
   - Assign cleaner to 2+ same-day turnovers
   - Verify conflict alert

8. **iCal**
   - Add iCal subscription URL
   - Trigger sync
   - Verify projects created from iCal events

---

## Dependencies to Install

### Backend
```bash
npm install twilio node-ical
```

### Frontend
```bash
npm install @fullcalendar/react @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/resource-timeline @fullcalendar/interaction
```

---

## Environment Variables (New)

### Backend
```env
# Twilio (SMS + SendGrid Email)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
TWILIO_SENDGRID_API_KEY=your_sendgrid_key
TWILIO_FROM_EMAIL=noreply@thesmarthost.co
```

---

## Notes

- **Cleaner auth**: Cleaners are created by PM, receive email invite to set password
- **Photo storage**: Use Supabase Storage bucket `cleaner-photos` with public access
- **Same-day detection**: Check if another booking starts on same property on same day
- **iCal parsing**: Use `node-ical` to parse iCal URLs, extract VEVENT items
- **Notifications**: Queue-based for reliability (consider Bull/BullMQ for production)
