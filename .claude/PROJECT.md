# HostMetrics Frontend - Quick Reference

> Complete context: `skills/hostmetrics-context.md`

**Last Updated:** November 2, 2025

---

## What is this project?

**HostMetrics** - Property management reporting platform for short-term rental managers

- **Client:** TheSmartHost Co. Inc (Luis Torres)
- **Team:** Mark Cena (Calgary) + Hussein Saab (Toronto)
- **Timeline:** Oct 7 - Dec 20, 2025 (10 weeks)
- **Status:** Week 4, Sprint 2 (Infrastructure Setup)

**Goal:** Automate monthly financial reports for property owners (2-4 hours → 10 minutes per client)

---

## Tech Stack (Frontend)

**Framework:**
- Next.js 15.5.6 with App Router
- React 19.1.0
- TypeScript 5 (strict mode)

**Styling:**
- Tailwind CSS v4
- Framer Motion for animations
- @heroicons/react for icons

**State & Auth:**
- Zustand 5.0.8 with persist middleware
- Supabase Auth (@supabase/supabase-js 2.76.0)
- @supabase/ssr for SSR support

**Key Decision:** App Router with route groups, service layer pattern, Zustand for state

---

## Critical Information

### Route Groups Architecture

**The app uses Next.js 15 App Router with route groups:**

- **(prelogin)** - Public routes: landing, login, signup, password reset
- **(user)** - Authenticated routes with UserNavbar
- **property-manager** - Manager portal with sidebar navigation

**This affects:**
- Layout composition (different layouts per group)
- Middleware/auth checks
- Navigation components

### User Roles & Routing

**3 User Roles:**
- `ADMIN` → `/admin/dashboard` (not implemented yet)
- `PROPERTY-MANAGER` → `/property-manager/dashboard`
- `CLIENT` → `/client/dashboard` (future feature)

See: [skills/hostmetrics-context.md](skills/hostmetrics-context.md) for complete architecture

---

## Current Features

| Feature | Status |
|---------|--------|
| Landing Page | ✅ Complete |
| Auth System (signup/login/reset) | ✅ Complete |
| Email Verification | ✅ Complete |
| Property Manager Dashboard | ✅ Complete |
| Client Management (CRUD) | ✅ Complete |
| Properties Management (CRUD) | ✅ Complete (Nov 2, 2025) |
| Reports/Analytics | ⏳ Not started |

---

## Architecture Pattern

```
Components → Services → Backend API
              ↓
          Zustand Store
```

**Example:**
```typescript
// Service: API calls with types
export async function getClients(parentId: string): Promise<ClientsResponse> {
  return apiClient<ClientsResponse>(`/clients?parentId=${parentId}`)
}

// Component: Business logic + UI
const clients = await getClients(user.id)
setClients(clients.data)

// Store: Global state
const { profile, setProfile } = useUserStore()
```

---

## Component Patterns

**Shared Components:**
- `Modal` - Portal-based modal with backdrop
- `Notification` - Toast notifications with Framer Motion
- `TableActionsDropdown` - Reusable table actions

**Feature Components:**
- Client CRUD modals (Create/Update/Delete)
- Navigation components (PreNavbar, UserNavbar, ManagerSidebar)

---

## Service Layer Pattern

**Backend Communication:**
```typescript
// services/apiClient.ts - Base client
async function apiClient<T>(endpoint: string, options)

// services/clientService.ts - Domain service
export async function createClient(data: CreateClientPayload)
export async function updateClient(id: string, data: UpdateClientPayload)
export async function deleteClient(id: string)
```

**API Response Format:**
```typescript
interface StandardResponse<T> {
  status: 'success' | 'error'
  data: T
  message?: string
}
```

---

## State Management

**Zustand Stores:**

1. **useUserStore** (persisted to localStorage)
   - User profile (id, fullName, role, email)
   - Role-based redirect logic
   - Actions: setProfile(), clearProfile()

2. **useNotificationStore** (non-persistent)
   - Toast notification state
   - Auto-dismiss after duration
   - Actions: showNotification(), closeNotification()

---

## Quick Links

| File | Purpose |
|------|---------|
| [skills/hostmetrics-context.md](skills/hostmetrics-context.md) | Full project overview & decisions |
| [skills/hostmetrics-conventions.md](skills/hostmetrics-conventions.md) | Code conventions & patterns |
| [CONVENTIONS.md](CONVENTIONS.md) | Quick conventions lookup |
| [TASKS.md](TASKS.md) | Current sprint tasks |

---

## Quick Start

```bash
npm install              # Install dependencies
cp .env.example .env     # Setup environment
# Edit .env with backend URL and Supabase credentials
npm run dev              # Start dev server (localhost:3000)
```

---

## Environment Variables

```
NEXT_PUBLIC_BASE_URL=                        # Backend API URL
NEXT_PUBLIC_SUPABASE_URL=                    # Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=        # Supabase anon key
```

---

## Recent Accomplishments

✅ Complete authentication flow with email verification
✅ Client management CRUD with stats dashboard
✅ **Properties management CRUD with multi-owner support (Nov 2, 2025)**
✅ Property manager layout with sidebar navigation
✅ Service layer architecture with TypeScript types
✅ Zustand state management with persistence
✅ Reusable modal and notification components
✅ Expandable design pattern with owner cards

---

**Next Steps:** Reports dashboard, Analytics, Property details page

**Last Updated:** November 2, 2025
