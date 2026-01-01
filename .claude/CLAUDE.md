# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **HostMetrics Frontend** - Property management reporting platform built with Next.js, TypeScript, and Tailwind CSS

**Last Updated:** December 30, 2025

---

## Quick Reference

### Development Commands

```bash
# Start development server (with Turbopack)
npm run dev
# → Runs on http://localhost:3000

# Build for production (run before pushing)
npm run build

# Start production server
npm start
```

**Important:** Always run `npm run build` after changes before pushing to verify no TypeScript or build errors.

---

## Project Context

### What is HostMetrics?

Property management reporting platform for short-term rental managers.

- **Client:** TheSmartHost Co. Inc (Luis Torres)
- **Team:** Mark Cena (Calgary) + Hussein Saab (Toronto)
- **Status:** Feature Complete - All core features implemented

**Goal:** Automate monthly financial reports for property owners (reduce from 2-4 hours → 10 minutes per client)

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.0 | App Router with Turbopack |
| React | 19.2.3 | UI Framework |
| TypeScript | 5.x | Type Safety (strict mode) |
| Tailwind CSS | 4.x | Styling |
| Zustand | 5.0.8 | State Management |
| Recharts | 3.6.0 | Analytics Charts |
| Framer Motion | 12.x | Animations |
| Supabase SSR | 0.7.0 | Authentication |
| Heroicons | 2.2.0 | Icons |
| React Markdown | 10.1.0 | AI Insights Rendering |

**Backend:** Express.js + PostgreSQL (separate repository: `thesmarthost-backend`)

---

## Architecture Patterns

### 1. Route Groups for Access Control

```
app/
├── (prelogin)/     # Public pages (login, signup, about, contact)
├── (user)/         # Protected pages
│   └── property-manager/
│       ├── analytics/
│       ├── bookings/
│       ├── clients/
│       ├── dashboard/
│       ├── expenses/
│       ├── incoming-bookings/
│       ├── properties/
│       ├── reports/
│       ├── settings/
│       └── upload-bookings/
├── api/auth/       # Auth callback routes
├── forbidden/      # Access denied page
├── error.tsx       # Error boundary
└── not-found.tsx   # 404 page
```

**Layout inheritance:**
- `(prelogin)` → uses PreNavbar
- `(user)` → uses UserNavbar
- `property-manager` → adds ManagerSidebar

### 2. Component Organization by Resource + Action

```
components/
├── [resource]/
│   ├── create/create[Resource]Modal.tsx
│   ├── update/update[Resource]Modal.tsx
│   ├── delete/delete[Resource]Modal.tsx
│   ├── preview/preview[Resource]Modal.tsx
│   └── import/bulk[Resource]Modal.tsx
└── shared/
    ├── modal.tsx
    ├── notification.tsx
    ├── TableActionsDropdown.tsx
    ├── FloatingActionButton.tsx
    └── LogoutModal.tsx
```

**Rules:**
- Folders: lowercase-hyphenated (`client-agreement/`)
- Files: PascalCase (`createPropertyModal.tsx`)
- All interactive components: `'use client'` directive

### 3. Service Layer Architecture

```
services/
├── apiClient.ts              # Fetch wrapper with credentials
├── [resource]Service.ts      # API functions (GET, POST, PUT, DELETE)
└── types/
    └── [resource].ts         # TypeScript interfaces
```

### 4. API Response Contract

```typescript
// Success
{ status: 'success', data: { ... } }

// Error
{ status: 'failed', message: 'Human-readable error' }

// Frontend handling
const res = await createResource(payload)
if (res.status === 'success') {
  showNotification('Success', 'success')
} else {
  showNotification(res.message || 'Failed', 'error')
}
```

### 5. State Management Strategy

**Zustand Stores (3 total):**
- `useUserStore` - User profile and auth state (persisted to localStorage)
- `useNotificationStore` - Toast notifications (not persisted)
- `useAnalyticsStore` - Analytics filters and data (not persisted)

**Local State (`useState`):** Form inputs, modals, fetched data

---

## Component Inventory (85+ components)

### By Feature Area

| Area | Components | Key Files |
|------|------------|-----------|
| Analytics | 8 | `AnalyticsWidget.tsx`, `KPIGrid.tsx`, `TimelineChart.tsx` |
| Booking | 4 | CRUD modals |
| Client | 9 | CRUD + bulk import + notes + agreements |
| Dashboard | 13 | `ActionBar`, `AlertsZone`, `MetricsZone`, shared utilities |
| Expense | 3 | CRUD + categories |
| Property | 14 | CRUD + channels + licenses + owners + import |
| Report | 2 | Generate + View modals |
| Session | 2 | Warning + Expired modals |
| Upload Wizard | 14 | 8 steps + shared components |
| Connection | 2 | Hostaway + Guesty modals |
| Shared | 5 | Modal, notification, dropdowns |

### Key Component Files
```
components/
├── analytics/
│   ├── AnalyticsWidget.tsx      # Main reusable widget
│   ├── DrillDownModal.tsx       # Booking list modal
│   └── shared/                  # KPICard, KPIGrid, TimelineChart, etc.
├── dashboard/
│   ├── ActionBar/               # Sticky quick actions
│   ├── AlertsZone/              # Alerts and All Clear state
│   ├── MetricsZone/             # Metrics, insights, activity
│   └── shared/                  # Sparkline, TimeAgo, TrendIndicator
├── upload-wizard/
│   ├── UploadWizard.tsx         # Main container
│   ├── steps/                   # 8 wizard steps
│   └── shared/                  # StepIndicator, ColumnMapper
└── property/
    ├── channels/                # Channel management
    └── import/                  # Bulk import steps
```

---

## Service Inventory (26 services)

### Core Services
| Service | Purpose |
|---------|---------|
| `apiClient.ts` | HTTP fetch wrapper with credentials |
| `authService.ts` | Login, signup, password reset |
| `profileService.ts` | User profile CRUD |

### Resource Services
| Service | Purpose |
|---------|---------|
| `clientService.ts` | Client CRUD + bulk import |
| `propertyService.ts` | Property CRUD + search + stats |
| `bookingService.ts` | Booking CRUD + search |
| `reportService.ts` | Report generation + file management |
| `expenseService.ts` | Expense CRUD |

### Specialized Services
| Service | Purpose |
|---------|---------|
| `analyticsService.ts` | Analytics API + date helpers |
| `dashboardService.ts` | Dashboard metrics + activity |
| `csvUploadService.ts` | Multi-property CSV import |
| `hostawayConnectionService.ts` | Hostaway PMS integration |
| `guestyConnectionService.ts` | Guesty PMS integration |
| `incomingBookingService.ts` | Webhook booking processing |

---

## Type Definitions (24 files)

All in `services/types/`:
- `analytics.ts` - AnalyticsData, PortfolioData, TimelinePoint
- `booking.ts` - Booking, BookingPayload
- `client.ts` - Client, ClientPayload
- `property.ts` - Property, PropertyPayload, Owner
- `report.ts` - Report, ReportFile, ReportPayload
- `dashboard.ts` - DashboardMetrics, DashboardActivity
- Plus 18 more for all resources...

---

## State Management (3 Stores)

```typescript
// useUserStore - Persisted
interface UserState {
  user: UserProfile | null
  setUser: (user: UserProfile | null) => void
  clearUser: () => void
}

// useNotificationStore - Not persisted
interface NotificationState {
  notifications: Notification[]
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void
}

// useAnalyticsStore - Not persisted
interface AnalyticsState {
  filters: AnalyticsFilters
  granularity: 'daily' | 'weekly' | 'monthly'
  analyticsData: AnalyticsData | null
  // ...
}
```

---

## Backend API Routes (All Complete)

### Core Resources
| Resource | Endpoints |
|----------|-----------|
| Properties | GET, GET/:id, GET/search, GET/stats, POST, PUT, DELETE |
| Property Owners | GET/:propertyId, POST, PUT/:id, DELETE/:id |
| Property Channels | GET/:propertyId, POST, PUT/:id, DELETE/:id |
| Property Licenses | GET/:propertyId, POST, PUT/:id, DELETE/:id |
| Clients | GET, POST, PUT, DELETE |
| Client Status Codes | GET, POST, PUT, DELETE |
| Profiles | GET, POST, PUT |

### Bookings & Reports
| Resource | Endpoints |
|----------|-----------|
| Bookings | GET, GET/:id, POST, PUT, DELETE |
| Reports | GET, GET/:id, POST, DELETE, POST /preview, POST /generate |
| Report Files | DELETE /files/:fileId |
| Logos | GET, POST /upload-logo |

### Analytics & Dashboard
| Resource | Endpoints |
|----------|-----------|
| Analytics | POST / (main data), POST /bookings (drill-down), GET /ai-insights |
| Dashboard | GET /alerts, GET /metrics, GET /insights, GET /activity |

### CSV & Integrations
| Resource | Endpoints |
|----------|-----------|
| CSV Upload | POST /upload, POST /process |
| Calculation Rules | GET, POST, PUT, DELETE |
| Incoming Bookings | GET, POST /review, POST /import |
| Hostaway/Guesty | GET, POST, PUT, DELETE |
| Expenses | GET, POST, PUT, DELETE |

---

## Implemented Features (Complete)

### Authentication
- Signup/Login/Logout with Supabase
- Email verification, Password reset
- Session monitoring (warning + expiry modals)

### Client Management
- Full CRUD + Bulk import
- Status codes, Agreements, Notes
- PMS credentials storage

### Property Management
- Full CRUD with multi-owner support
- Channels (Airbnb, VRBO, Booking.com, etc.)
- Licenses management
- Field mapping templates

### Reports
- Multi-format (PDF, CSV, Excel)
- Custom logo upload
- Preview before generation
- File version management

### CSV Upload Wizard (8 Steps)
1. Upload → 2. Property Identification → 3. Field Mapping
4. Property Mapping → 5. Validate → 6. Preview
7. Process → 8. Complete

### Dashboard
- Action Bar (sticky quick actions)
- Alerts Zone (missing bookings/reports)
- Metrics Zone (6 health metrics)
- Performance Insights (sparklines)
- Activity Feed (timeline)

### Analytics
- KPI Grid (7 metrics)
- Timeline Chart (line/area/bar)
- Breakdowns (property/channel)
- Drill-down modal
- AI Insights (weekly summary)

### Bookings
- Full CRUD
- Field edit history
- Incoming webhooks
- Review/import workflow

### Expenses
- Full CRUD
- Categories
- Receipt upload

### PMS Integrations
- Hostaway connection
- Guesty connection
- Webhook setup
- Auto-import

---

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| profiles | User accounts |
| clients | Property owners |
| client_properties | Many-to-many: owners ↔ properties |
| properties | Rental properties |
| property_channels | Distribution channels |
| property_licenses | License files |
| property_field_mappings | CSV field mapping templates |
| bookings | Individual reservations |
| reports | Report metadata |
| report_files | Generated report files |
| expenses | Property expenses |
| incoming_bookings | Webhook bookings pending review |
| hostaway_connections | Hostaway API credentials |
| guesty_connections | Guesty API credentials |

---

## Code Patterns

### Modal Component
```typescript
'use client'

interface CreateResourceModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (newResource: Resource) => void
}

const CreateResourceModal: React.FC<CreateResourceModalProps> = ({ ... }) => {
  // 1. Form state (useState)
  // 2. Global state (Zustand stores)
  // 3. useEffect to reset form on open
  // 4. handleSubmit: validation → API call → notification
  // 5. Return Modal wrapper with form
}
```

### Service Function
```typescript
export async function getResources(userId: string): Promise<ResourcesResponse> {
  return apiClient<ResourcesResponse>(`/resources?userId=${userId}`)
}

export async function createResource(data: CreatePayload): Promise<ResourceResponse> {
  return apiClient<ResourceResponse, CreatePayload>('/resources', {
    method: 'POST',
    body: data,
  })
}
```

### Error Handling
```typescript
try {
  const res = await apiCall(data)
  if (res.status === 'success') {
    showNotification('Success', 'success')
    onClose()
  } else {
    showNotification(res.message || 'Failed', 'error')
  }
} catch (err) {
  console.error('Error:', err)
  showNotification(err instanceof Error ? err.message : 'Network error', 'error')
}
```

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `CreateClientModal` |
| Component files | PascalCase | `createPropertyModal.tsx` |
| Folders | lowercase-hyphenated | `client-agreement/` |
| Service files | camelCase | `clientService.ts` |
| Functions | camelCase | `getClients()` |
| Hooks | camelCase with use | `useUserStore()` |
| Types/Interfaces | PascalCase | `Client`, `UserProfile` |

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_BASE_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Key Files to Reference

### Services
- `src/services/apiClient.ts` - HTTP client
- `src/services/propertyService.ts` - CRUD example
- `src/services/analyticsService.ts` - Analytics API

### Components
- `src/components/property/create/createPropertyModal.tsx` - Modal pattern
- `src/components/analytics/AnalyticsWidget.tsx` - Composite widget
- `src/components/upload-wizard/UploadWizard.tsx` - Multi-step wizard

### Pages
- `src/app/(user)/property-manager/properties/page.tsx` - List page
- `src/app/(user)/property-manager/analytics/page.tsx` - Analytics
- `src/app/(user)/property-manager/dashboard/page.tsx` - Dashboard

### State
- `src/store/useUserStore.ts` - Auth state
- `src/store/useAnalyticsStore.ts` - Analytics state

---

## Claude Code Skills

Custom skills in `.claude/skills/`:

1. **`thesmarthost-context`** - Business context and backend API reference
2. **`add-frontend-feature`** - UI component patterns and styling
3. **`connect-to-backend-api`** - Service layer patterns

---

**Project:** HostMetrics for TheSmartHost Co. Inc
**Team:** Mark Cena (Calgary) + Hussein Saab (Toronto)
**Contact:** husseinsaab14@gmail.com, markjpcena@gmail.com

---

**Last Updated:** December 30, 2025
