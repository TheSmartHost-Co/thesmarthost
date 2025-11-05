# HostMetrics Frontend Project Context

## Project Overview

**Name:** HostMetrics - Property Management Reporting Platform
**Type:** Multi-tenant SaaS web application
**Client:** Luis Torres, TheSmartHost Co. Inc
**Industry:** Short-term rental property management

**The Business Problem:**
Property managers manually compile monthly financial reports for property owners, spending 2-4 hours per client per month on dual-screen data entry from multiple booking platforms (Hostaway, Airbnb) into Excel spreadsheets. This manual process is error-prone, doesn't scale, and produces inconsistent report formats.

**The Solution:**
Automated web platform that accepts CSV exports from property management systems, processes financial data, performs calculations, and generates both interactive dashboards and branded PDF reports for property owners. Additionally provides lightweight CRM features for managing client relationships, prospects, and operational documentation.

**Value Proposition:**
- **For Property Managers:** 90% time reduction (2-4 hours → 10 minutes per client/month) + centralized client management
- **For Property Owners:** 24/7 self-service portal access, standardized professional reports, transparent fee breakdowns
- **For Business Growth:** Scale from 10 to 50+ clients without proportional staff increases

---

## Frontend Tech Stack

### Core Framework
- **Framework:** Next.js 15.5.6 with App Router
- **Language:** TypeScript 5 (strict mode enabled)
- **UI Library:** React 19.1.0

### Styling & UI
- **Styling:** Tailwind CSS v4 (latest version)
- **Animations:** Framer Motion 12.23.24
- **Icons:** @heroicons/react 2.2.0
- **Fonts:** Geist Sans & Geist Mono (Google Fonts)

### State Management & Data
- **Global State:** Zustand 5.0.8 with persist middleware
- **API Client:** Custom fetch wrapper with TypeScript generics
- **Data Fetching:** Manual with useEffect (no React Query/SWR)

### Authentication & Backend Integration
- **Authentication:** Supabase Auth (@supabase/supabase-js 2.76.0)
- **SSR Support:** @supabase/ssr 0.7.0
- **Backend API:** REST API (Node.js/Express backend)

### Development & Build
- **Build Tool:** Turbopack (Next.js 15 built-in)
- **Dev Server:** Next.js dev with Turbopack
- **Package Manager:** npm
- **Path Aliases:** `@/*` → `./src/*`

---

## Timeline & Team

**Duration:** 10 weeks (October 7, 2025 - December 20, 2025)
**Delivery Model:** 1-week sprints, weekly sync meetings (Sundays)
**Project Type:** RIIPEN university internship project

**Team:**
- **Mark Cena (Frontend):** Computer Science student, University of Calgary (graduating 2026)
  - Strengths: React/TypeScript, UI/UX, full-stack development
  - Previous: Power Platform Developer Intern at Intelbyte Corp
  - Location: Calgary, MT

- **Hussein Saab (Backend):** Computer Science student, Toronto Metropolitan University
  - Strengths: Backend development, API design, database
  - Current: Software Engineer Intern at IBM
  - Location: Toronto, ET

**Current Status:** Week 4, Sprint 2 (Infrastructure Setup)

---

## Frontend Architecture

### Route Groups Pattern

**Next.js 15 App Router with route groups for clean separation:**

```
src/app/
├── (prelogin)/          # Public routes - no auth required
│   ├── login/
│   ├── signup/
│   ├── forgot-password/
│   ├── reset-password/
│   ├── check-email/
│   ├── about/
│   ├── contact/
│   └── product/
├── (user)/              # Authenticated routes
│   └── property-manager/  # Manager-specific routes
│       ├── dashboard/
│       ├── clients/
│       ├── properties/
│       ├── reports/      # Future
│       ├── analytics/    # Future
│       └── settings/     # Future
└── api/                 # API routes
    └── auth/
        └── confirm/     # Email verification callback
```

**Benefits:**
- Route groups don't affect URL structure (parentheses removed)
- Different layouts per group (PreNavbar vs UserNavbar vs ManagerSidebar)
- Clean auth separation
- Easy to add admin/client portals later

### Service Layer Architecture

**Pattern:** Components → Services → Backend API → Zustand Store

```typescript
// Layer 1: Base API Client
services/apiClient.ts
  - Generic fetch wrapper
  - Error handling
  - TypeScript generics for type safety

// Layer 2: Domain Services
services/clientService.ts
services/propertyService.ts
services/authService.ts
services/profileService.ts
  - Domain-specific API calls
  - Request/response transformation
  - Type definitions

// Layer 3: State Management
store/useUserStore.ts         # User profile (persisted)
store/useNotificationStore.ts # Toast notifications (non-persisted)

// Layer 4: Components
components/client/...          # Feature components
components/shared/...          # Reusable components
```

### Component Architecture

**Shared Components (Reusable):**
- `Modal` - Portal-based modal with backdrop, body scroll lock
- `Notification` - Toast with Framer Motion animations, auto-dismiss
- `TableActionsDropdown` - Dropdown for table row actions
- `LogoutModal` - Confirmation dialog

**Navigation Components:**
- `PreNavbar` - Public pages (logo, links, CTA buttons)
- `UserNavbar` - Authenticated pages (logo, settings, logout)
- `ManagerSidebar` - Property manager vertical nav with active states

**Feature Components:**
- Client CRUD modals (Create/Update/Delete)
- Property CRUD modals (to be built)
- Report components (future)

### State Management Strategy

**Zustand Stores:**

1. **useUserStore** (Persisted to localStorage)
   ```typescript
   interface UserProfile {
     id: string
     fullName: string
     role: 'ADMIN' | 'PROPERTY-MANAGER' | 'CLIENT'
     email?: string
   }
   ```
   - Stores authenticated user profile
   - Role-based redirect logic
   - Cleared on logout

2. **useNotificationStore** (Non-persistent)
   ```typescript
   interface NotificationState {
     message: string
     type: 'success' | 'error'
     duration?: number
     isOpen: boolean
   }
   ```
   - Toast notification system
   - Auto-dismiss after duration

**When to use what:**
- `useState` - Component-local state (forms, toggles)
- `useUserStore` - User profile, auth state
- `useNotificationStore` - Toast notifications
- Props - Parent-to-child data flow
- Service functions - API calls, data fetching

---

## Key Architectural Decisions

### 1. App Router over Pages Router
**Decision:** Next.js 15 App Router
**Alternative Rejected:** Pages Router
**Rationale:** App Router is the future of Next.js, supports React Server Components, better layouts, loading/error states, and route groups for clean code organization.

### 2. Route Groups for Auth Separation
**Decision:** Use route groups `(prelogin)` and `(user)`
**Rationale:** Clean URL structure, different layouts per group, no middleware complexity initially.

### 3. Service Layer Pattern
**Decision:** Separate service layer for API calls
**Alternative Rejected:** API calls directly in components
**Rationale:** Reusability, testability, type safety, single source of truth for API endpoints.

### 4. Zustand over React Context
**Decision:** Zustand for global state
**Alternative Rejected:** React Context API
**Rationale:** Simpler API, better performance, built-in persistence, easier testing.

### 5. Manual Data Fetching (No React Query)
**Decision:** useState + useEffect for data fetching
**Alternative Rejected:** React Query, SWR
**Rationale:** Simpler for MVP, fewer dependencies, team is comfortable with manual approach. Can add React Query later if needed.

### 6. Client Components by Default
**Decision:** Use 'use client' directive liberally
**Rationale:** Most components need state, event handlers, or browser APIs. Server Components can be added later for optimization.

### 7. Multi-Owner Property Support
**Decision:** Properties can have multiple owners (co-ownership)
**Backend Support:** Junction table `client_properties` with `is_primary` flag
**Frontend Impact:**
- Display primary owner in tables
- Manage owner list in update modal
- Show all owners in detail view

---

## Current Sprint Status

**Sprint 2: Infrastructure Setup (Oct 28 - Nov 3, 2025)**

**Focus:** Frontend features + Backend API integration

**Completed:**
- ✅ Authentication system (signup/login/logout/password reset)
- ✅ Email verification flow
- ✅ Client management CRUD (full implementation)
- ✅ Layout system with route groups
- ✅ Navigation components (PreNavbar, UserNavbar, ManagerSidebar)
- ✅ Shared components (Modal, Notification, TableActionsDropdown)
- ✅ Service layer architecture
- ✅ Zustand state management
- ✅ Property manager dashboard (placeholder stats)

**In Progress:**
- 🔄 Properties management page (backend API ready, building frontend)

**Remaining:**
- Reports dashboard
- Analytics dashboard
- Settings pages
- Property details page
- Admin portal (future)
- Client portal (future)

---

## User Roles & Routing

**3 User Roles (from backend):**

1. **ADMIN**
   - Route: `/admin/dashboard` (not implemented yet)
   - Access: Full system access, manage all users
   - UI: Admin-specific layout (future)

2. **PROPERTY-MANAGER**
   - Route: `/property-manager/*`
   - Access: Manage clients, properties, reports
   - UI: Sidebar navigation with dashboard, clients, properties, reports, analytics, settings
   - **Current primary focus**

3. **CLIENT** (Property Owner)
   - Route: `/client/dashboard` (future feature)
   - Access: View own properties and reports
   - UI: Simplified dashboard (future)

**Role-based redirect logic** in `useUserStore`:
```typescript
getRedirectPath(role: string) {
  if (role === 'ADMIN') return '/admin/dashboard'
  if (role === 'PROPERTY-MANAGER') return '/property-manager/dashboard'
  if (role === 'CLIENT') return '/client/dashboard'
  return '/login'
}
```

---

## Backend API Contract

### Available Endpoints (from backend team)

**Authentication:**
- Supabase Auth for signup/login/logout
- Email verification via `/api/auth/confirm`

**Clients API - COMPLETE**
- `GET /api/clients?parentId={userId}` - List clients
- `GET /api/clients/:id` - Client details
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

**Properties API - COMPLETE (Nov 2, 2025)**
- `GET /api/properties` - List all active properties with owners
- `GET /api/properties/:id` - Property details + bookings + uploads
- `POST /api/properties` - Create property + link to client
- `PUT /api/properties/:id` - Update property + manage owners
- `DELETE /api/properties/:id` - Soft delete property
- `PATCH /api/properties/:id/status` - Toggle active/inactive

**Profiles API:**
- `GET /api/profiles/:userId` - Get user profile
- `PUT /api/profiles/:userId` - Update profile
- `DELETE /api/profiles/:userId` - Delete profile

**Future Endpoints:**
- Bookings, Reports, Analytics, Settings

### Response Format (Standardized)

**Success:**
```json
{
  "status": "success",
  "data": { /* ... */ },
  "message": "Optional success message"
}
```

**Error:**
```json
{
  "status": "failed",
  "message": "Human-readable error message"
}
```

**HTTP Status Codes:**
- `200` - Success (GET, PUT, DELETE, PATCH)
- `201` - Created (POST)
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `409` - Conflict (unique constraint)
- `500` - Internal Server Error

---

## Important Context & Constraints

**Client Status:**
- Luis (TheSmartHost owner) hasn't onboarded any clients yet
- Greenfield project - no legacy data migration
- Focus on MVP features, build for future scale

**Recent Changes:**
- Oct 30, 2025: Major requirements evolution
  - Added CRM features (status codes, notes, agreements, credentials)
  - Changed to many-to-many client-property relationship
  - Commission rates moved to properties table
- Nov 2, 2025: Backend Properties API completed
  - Multi-owner support fully implemented
  - Frontend unblocked to build properties management

**Development Philosophy:**
- Ship working MVP first, optimize later
- Document everything for portfolio showcase
- Prioritize features that provide 80% of value with 20% of effort
- Test with realistic data
- Maintain design consistency across pages

---

## Features Implemented (Detailed)

### 1. Landing Page
- Hero section with value proposition
- Feature cards (3 main benefits)
- CTA buttons (Get Started, Learn More)
- Responsive design

### 2. Authentication System
- **Signup:** Email, full name, role, password with email verification
- **Login:** Email/password with role-based redirect
- **Password Reset:** Forgot password + reset password flow
- **Email Verification:** Check email page with resend option
- **Error Handling:** Unconfirmed email, invalid credentials

### 3. Client Management (Full CRUD)
- **List View:**
  - Data table with columns: name, email, phone, commission, status
  - Search functionality (by name, email, phone)
  - Status filter (All/Active/Inactive)
  - Active clients sorted to top
  - Action dropdown (Edit/Delete)
- **Stats Dashboard:**
  - Total clients count
  - Active clients count
  - Average commission rate
  - Inactive clients count
- **Create Modal:**
  - Form validation
  - Success/error notifications
- **Update Modal:**
  - Pre-filled form
  - Partial updates
- **Delete Modal:**
  - Confirmation dialog
  - Soft delete support

### 4. Property Manager Dashboard
- Welcome message with user name
- Stats cards (placeholder data):
  - Total users
  - Active properties
  - Reports generated
  - Time saved
- Recent activity feed (placeholder)

### 5. Navigation System
- **PreNavbar:** Logo, navigation links, Login/Signup CTAs
- **UserNavbar:** Logo, Settings, Logout
- **ManagerSidebar:** Dashboard, Clients, Properties, Reports, Analytics, Settings (with active state)

---

## Project Goals

**Primary Goal:** Deliver functional MVP by December 20, 2025

**Success Criteria (Frontend MVP):**
- Property managers can manage clients and properties
- Responsive design works on mobile/tablet/desktop
- Authentication flow is secure and user-friendly
- UI is consistent and professional
- Error handling provides clear user feedback
- Loading states prevent confusion during async operations

**Secondary Goals:**
- Portfolio-quality React/TypeScript code
- Component reusability and clean architecture
- Comprehensive TypeScript types
- Clean, maintainable codebase

**Post-MVP Potential:**
- Dark mode support
- Mobile app (React Native)
- Real-time updates (WebSockets)
- Advanced analytics visualizations
- PDF viewer for reports

---

## Communication & Collaboration

**Weekly Sync:** Sundays (Mark in Calgary MT, Hussein in Toronto ET)
**Communication:** Email primary, Slack if set up
**Client Check-ins:** Luis Torres (TheSmartHost owner) as needed
**Code Repository:** GitHub organization (hostmetrics)
**Documentation:** Living project context document (updated weekly)

---

## Key Terms & Definitions

**PMS:** Property Management System (e.g., Hostaway, Guesty, Airbnb)
**STR:** Short-Term Rental (e.g., Airbnb, VRBO)
**LTR:** Long-Term Rental (traditional leases)
**App Router:** Next.js 15 routing system (vs Pages Router)
**Route Group:** Next.js directory pattern `(name)` for layout organization
**Server Component:** React component rendered on server (default in App Router)
**Client Component:** React component with `'use client'` directive
**Junction Table:** Many-to-many relationship table (e.g., `client_properties`)
**Primary Owner:** Client designated as main contact
**Co-Owner:** Additional client linked to property
**Commission Override:** Client-specific rate that supersedes property default
**Soft Delete:** Setting `isActive = false` instead of deleting from database

---

*This skill provides persistent context for all HostMetrics frontend development conversations. For code conventions, see `hostmetrics-conventions.md` skill. This is the FRONTEND repository.*