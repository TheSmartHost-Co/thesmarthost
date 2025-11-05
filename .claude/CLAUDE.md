# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **HostMetrics Frontend** - Property management reporting platform built with Next.js, TypeScript, and Tailwind CSS

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

## Project Architecture

### Tech Stack

- **Framework:** Next.js 15 (App Router) with Turbopack
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 4
- **State Management:** Zustand (with persist middleware)
- **Authentication:** Supabase Auth
- **Backend API:** Express.js (separate repository at `thesmarthost-backend`)
- **Icons:** Heroicons
- **Animations:** Framer Motion

### Key Architectural Patterns

#### 1. **Route Groups for Access Control**

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

#### 2. **Component Organization by Resource + Action**

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

#### 3. **Service Layer Architecture**

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

#### 4. **API Response Contract**

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

#### 5. **State Management Strategy**

**Zustand Stores:** Global state only
- `useUserStore`: User profile and authentication state (persisted)
- `useNotificationStore`: Toast notifications (not persisted)

**Local State (`useState`):** Everything else
- Form inputs
- Modal open/close
- Component UI state
- Fetched data (properties, clients, etc.)

**Why:** Keeps global state minimal, prevents unnecessary re-renders.

#### 6. **Authentication Flow**

```
Login → Supabase Auth → Session Cookie → Backend validates via service role key
```

- Frontend uses Supabase client for auth operations
- Backend receives requests with session cookies
- Backend validates using Supabase service role key
- `apiClient` does NOT manually add Authorization headers (handled via cookies)

---

## Backend Integration

### Backend Repository
Separate repository: `thesmarthost-backend` (Express.js + PostgreSQL)

### Base URL Configuration
```typescript
// .env.local
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

## Code Conventions

### TypeScript

- **Strict mode enabled** - all type errors must be fixed
- **Interface over type** for object shapes
- **Path alias:** `@/*` → `src/*`

```typescript
// ✅ Use this
import { Property } from '@/services/types/property'

// ❌ Not this
import { Property } from '../../../services/types/property'
```

### Component Patterns

**All modals follow this structure:**
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
  showNotification('Network error', 'error')
}
```

### Styling (Tailwind CSS)

- **No CSS modules** - only Tailwind utility classes
- **Common patterns:**
  - Inputs: `w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`
  - Primary button: `px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors`
  - Modal container: `p-6 max-w-2xl w-11/12`
  - Form spacing: `space-y-4`

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

---

## Key Files to Reference

- **API Client:** `src/services/apiClient.ts` - Fetch wrapper
- **User Store:** `src/store/useUserStore.ts` - Auth state pattern
- **Property Service:** `src/services/propertyService.ts` - Complete CRUD example
- **Create Modal Example:** `src/components/property/create/createPropertyModal.tsx`
- **List Page Example:** `src/app/(user)/property-manager/properties/page.tsx`

---

**Project:** HostMetrics for TheSmartHost Co. Inc
**Team:** Mark Cena (Calgary) + Hussein Saab (Toronto)
**Timeline:** Oct 7 - Dec 20, 2025
**Contact:** husseinsaab14@gmail.com, markjpcena@gmail.com

---

**Last Updated:** November 4, 2025