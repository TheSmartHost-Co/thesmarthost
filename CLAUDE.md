# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **HostMetrics Frontend** - Property management reporting platform built with Next.js, TypeScript, and Tailwind CSS

**Last Updated:** November 11, 2025

---

## Quick Reference

### Development Commands

```bash
# Start development server (with Turbopack)
npm run dev
# → Runs on http://localhost:3000

# Build for production (ALWAYS run before pushing)
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
- **Timeline:** Oct 7 - Dec 20, 2025 (10 weeks)
- **Current Sprint:** Sprint 2, Week 4 (Infrastructure Setup - ~90% complete)

**Goal:** Automate monthly financial reports for property owners (reduce from 2-4 hours → 10 minutes per client)

---

## Tech Stack

- **Framework:** Next.js 15 (App Router) with Turbopack
- **Language:** TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS 4
- **State Management:** Zustand (with persist middleware)
- **Authentication:** Supabase Auth
- **Backend API:** Express.js (separate repository: `thesmarthost-backend`)
- **Icons:** Heroicons
- **Animations:** Framer Motion

---

## Architecture Patterns

### 1. Route Groups for Access Control

```
app/
├── (prelogin)/     # Public pages (login, signup, about, contact)
└── (user)/         # Protected pages
    └── property-manager/
        ├── dashboard/
        ├── properties/
        └── clients/
```

**Pattern:** Next.js route groups `(folder)` organize pages by authentication state without affecting URL structure.

**Layout inheritance:**
- `(prelogin)` → uses PreNavbar
- `(user)` → uses UserNavbar
- `property-manager` → adds ManagerSidebar

### 2. Component Organization by Resource + Action

```
components/
├── [resource]/
│   ├── create/
│   │   └── create[Resource]Modal.tsx
│   ├── update/
│   │   └── update[Resource]Modal.tsx
│   ├── delete/
│   │   └── delete[Resource]Modal.tsx
│   └── preview/
│       └── preview[Resource]Modal.tsx
└── shared/
    ├── modal.tsx
    ├── notification.tsx
    └── TableActionsDropdown.tsx
```

**Example:** `components/property/create/createPropertyModal.tsx`

**Rules:**
- Folders use lowercase-hyphenated names (`client-agreement/`)
- Files use PascalCase (`createPropertyModal.tsx`)
- All interactive components must have `'use client'` directive

### 3. Service Layer Architecture

```
services/
├── apiClient.ts              # Fetch wrapper (handles base URL, JSON)
├── [resource]Service.ts      # API functions (GET, POST, PUT, DELETE)
└── types/
    └── [resource].ts         # TypeScript interfaces
```

**Pattern:** Each resource has:
1. Service file with CRUD functions
2. Type file with interfaces for entities, payloads, and responses
3. All use the shared `apiClient` for HTTP calls

**Example:**
```typescript
// services/propertyService.ts
export async function getProperties(parentId: string): Promise<PropertiesResponse> {
  return apiClient<PropertiesResponse>(`/properties?parentId=${parentId}`)
}

// services/types/property.ts
export interface PropertyResponse {
  status: 'success' | 'failed'
  message?: string
  data: Property
}
```

### 4. API Response Contract

All backend endpoints follow this format:

**Success:**
```json
{
  "status": "success",
  "data": { ... }
}
```

**Error:**
```json
{
  "status": "failed",
  "message": "Human-readable error"
}
```

**Frontend handling:**
```typescript
const res = await createResource(payload)
if (res.status === 'success') {
  // Success path
} else {
  // Show res.message to user
}
```

### 5. State Management Strategy

**Zustand Stores:** Global state only
- `useUserStore`: User profile and authentication state (persisted to localStorage)
- `useNotificationStore`: Toast notifications (not persisted)

**Local State (`useState`):** Everything else
- Form inputs
- Modal open/close
- Component UI state
- Fetched data (properties, clients, etc.)

**Why:** Keeps global state minimal, prevents unnecessary re-renders.

### 6. Authentication Flow

```
Login → Supabase Auth → Session Cookie → Backend validates via service role key
```

- Frontend uses Supabase client for auth operations
- Backend receives requests with session cookies
- Backend validates using Supabase service role key
- `apiClient` does NOT manually add Authorization headers (handled via cookies)

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `CreateClientModal` |
| Component files | PascalCase | `modal.tsx`, `Navbar.tsx` |
| Service files | camelCase | `clientService.ts` |
| Functions | camelCase | `getClients()`, `handleSubmit()` |
| Hooks | camelCase with use | `useUserStore()` |
| Types/Interfaces | PascalCase | `Client`, `UserProfile` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL` |

---

## Code Patterns

### Component Pattern (Modal)

```typescript
'use client'

interface Create[Resource]ModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (new[Resource]: [Resource]) => void
}

const Create[Resource]Modal: React.FC<Create[Resource]ModalProps> = ({ ... }) => {
  // 1. Form state (useState)
  // 2. Global state (Zustand stores)
  // 3. useEffect to reset form on open
  // 4. handleSubmit with validation → API call → notification
  // 5. Return Modal wrapper with form
}
```

**See `.claude/skills/add-frontend-feature/component-patterns.md` for complete examples**

### Service Layer Pattern

```typescript
// services/apiClient.ts - Base client
async function apiClient<T, B = unknown>(
  endpoint: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: B
    headers?: Record<string, string>
  }
): Promise<T> {
  const url = `${process.env.NEXT_PUBLIC_BASE_URL}${endpoint}`
  // ... fetch logic
}

// services/clientService.ts - Domain service
export async function getClients(parentId: string): Promise<ClientsResponse> {
  return apiClient<ClientsResponse>(`/client?parentId=${parentId}`)
}

export async function createClient(
  data: CreateClientPayload
): Promise<ClientResponse> {
  return apiClient<ClientResponse, CreateClientPayload>('/client', {
    method: 'POST',
    body: data,
  })
}
```

### Error Handling Pattern

```typescript
try {
  const res = await apiCall(data)
  if (res.status === 'success') {
    showNotification('Success message', 'success')
    onClose()
  } else {
    showNotification(res.message || 'Failed', 'error')
  }
} catch (err) {
  console.error('Error:', err)
  const message = err instanceof Error ? err.message : 'Network error'
  showNotification(message, 'error')
}
```

### Form Validation Pattern

**Client-side first (before API call):**
```typescript
// Required fields
if (!name.trim()) {
  showNotification('Name is required', 'error')
  return
}

// Number validation
const parsed = parseFloat(value)
if (isNaN(parsed) || parsed <= 0) {
  showNotification('Must be a positive number', 'error')
  return
}

// Enum validation
if (!['STR', 'LTR'].includes(propertyType)) {
  showNotification('Invalid property type', 'error')
  return
}
```

### Tailwind CSS Patterns

**Buttons:**
```tsx
{/* Primary button */}
<button className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
  Click Me
</button>

{/* Secondary button */}
<button className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
  Cancel
</button>
```

**Forms:**
```tsx
<input
  type="text"
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
```

**Cards:**
```tsx
<div className="bg-white rounded-lg shadow p-6">
  Content
</div>
```

---

## Backend Integration

### Backend Repository
Separate repository: `thesmarthost-backend` (Express.js + PostgreSQL)

### Base URL Configuration
```bash
# .env.local
NEXT_PUBLIC_BASE_URL=http://localhost:4000  # Development
```

### Available API Routes

| Resource | Endpoints | Status |
|----------|-----------|--------|
| Properties | GET, GET/:id, POST, PUT, DELETE, PATCH/:id/status | ✅ Complete |
| Clients | GET, POST, PUT, DELETE | ✅ Complete |
| Profiles | GET, POST, PUT, DELETE | ✅ Complete |
| Client Status Codes | GET, POST, PUT, DELETE | ✅ Complete |
| PMS Credentials | GET, POST, PUT, DELETE | ✅ Complete |
| Client Agreements | GET, POST, PUT, DELETE | ✅ Complete |
| Bookings | - | ⏳ Not implemented |
| Reports | - | ⏳ Not implemented |

**See `.claude/skills/thesmarthost-context/SKILL.md` for detailed API documentation**

---

## Data Model (Key Entities)

### Properties ↔ Clients (Many-to-Many)

**Critical:** Properties can have multiple owners (co-ownership).

**Database:** `client_properties` junction table with:
- `is_primary`: Exactly one owner must be primary
- `commission_rate_override`: Per-owner commission override

**API Payload (Create):**
```typescript
{
  clientId: string,        // Initial owner (becomes primary)
  name: string,
  address: string,
  propertyType: 'STR' | 'LTR',
  commissionRate: number,  // Property default
  // ... other fields
}
```

**API Response:**
```typescript
{
  id: string,
  owners: Array<{
    clientId: string,
    clientName: string,
    isPrimary: boolean,
    commissionRateOverride: number | null
  }>,
  // ... other fields
}
```

**See `.claude/skills/thesmarthost-context/database-schema.md` for full schema**

---

## Current Progress

### ✅ Completed Features

**Authentication System:**
- Complete auth flow (signup/login/logout)
- Email verification with Supabase
- Password reset functionality
- Role-based redirects

**Client Management:**
- Client CRUD (Create/Read/Update/Delete)
- Client list table with search and filter
- Stats dashboard
- Active clients sorted to top

**Properties Management:**
- Property CRUD with multi-owner support
- Properties list with stats dashboard
- Create/Update/Delete/Preview modals
- Owner management (add/remove co-owners)
- Commission rate override per owner
- **Channels Management (NEW):**
  - Add/Edit/Delete channels for each property
  - Support for multiple distribution channels (Airbnb, VRBO, Booking.com, Google, Direct, Expedia)
  - Channel icons and display names
  - Active/Inactive status toggle
  - Immediate save (no batch operations)
  - Real-time table updates

**Layout & Navigation:**
- Route groups architecture
- PreNavbar, UserNavbar, ManagerSidebar
- Responsive design

**Service Layer:**
- apiClient, clientService, propertyService
- authService, profileService
- Full TypeScript typing

**State Management:**
- useUserStore with localStorage persistence
- useNotificationStore for toasts

### ⏳ Upcoming Features

**Next Sprint:**
- Bookings management
- Reports dashboard
- Analytics charts
- Settings pages

---

## Development Workflow

### Adding a New Resource (e.g., Bookings)

1. **Backend first:** Ensure backend route exists
2. **Create types:** `src/services/types/booking.ts`
3. **Create service:** `src/services/bookingService.ts`
4. **Create components:**
   - `components/booking/create/createBookingModal.tsx`
   - `components/booking/update/updateBookingModal.tsx`
   - `components/booking/delete/deleteBookingModal.tsx`
5. **Create page:** `app/(user)/property-manager/bookings/page.tsx`
6. **Test:** Verify create, read, update, delete operations
7. **Build:** Run `npm run build` to catch any TypeScript errors

---

## Environment Variables

Required in `.env.local`:

```bash
# Backend API
NEXT_PUBLIC_BASE_URL=http://localhost:4000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Claude Code Skills

This repository has custom skills configured for Claude Code:

1. **`thesmarthost-context`** - Auto-loads business context and backend API reference
2. **`add-frontend-feature`** - Instructions for building new UI features
3. **`connect-to-backend-api`** - Instructions for creating service files and API integration

**Location:** `.claude/skills/`

These skills provide detailed patterns and examples following this project's conventions.

---

## Key Files to Reference

- **API Client:** [src/services/apiClient.ts](src/services/apiClient.ts) - Fetch wrapper
- **User Store:** [src/store/useUserStore.ts](src/store/useUserStore.ts) - Auth state pattern
- **Property Service:** [src/services/propertyService.ts](src/services/propertyService.ts) - Complete CRUD example
- **Create Modal Example:** [src/components/property/create/createPropertyModal.tsx](src/components/property/create/createPropertyModal.tsx)
- **List Page Example:** [src/app/(user)/property-manager/properties/page.tsx](src/app/(user)/property-manager/properties/page.tsx)

---

**Project:** HostMetrics for TheSmartHost Co. Inc
**Team:** Mark Cena (Calgary) + Hussein Saab (Toronto)
**Timeline:** Oct 7 - Dec 20, 2025
**Contact:** husseinsaab14@gmail.com, markjpcena@gmail.com

---

**Last Updated:** November 4, 2025
