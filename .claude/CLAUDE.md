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

## Schema
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid,
  csv_upload_id uuid,
  reservation_code text,
  guest_name text NOT NULL,
  check_in_date date NOT NULL,
  num_nights bigint NOT NULL,
  platform text NOT NULL,
  nightly_rate double precision,
  extra_guest_fees double precision,
  cleaning_fee double precision,
  lodging_tax double precision,
  bed_linen_fee double precision,
  gst double precision,
  qst double precision,
  channel_fee double precision,
  stripe_fee double precision,
  total_payout double precision,
  mgmt_fee double precision,
  net_earnings double precision,
  sales_tax double precision,
  created_at timestamp with time zone DEFAULT now(),
  listing_name text,
  check_out_date date,
  user_id uuid,
  CONSTRAINT bookings_pkey PRIMARY KEY (id),
  CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT bookings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT bookings_csv_upload_id_fkey FOREIGN KEY (csv_upload_id) REFERENCES public.csv_uploads(id)
);
CREATE TABLE public.calculation_rule_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text,
  description text,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT calculation_rule_templates_pkey PRIMARY KEY (id),
  CONSTRAINT calculation_rule_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.calculation_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  platform USER-DEFINED NOT NULL,
  booking_field text NOT NULL,
  csv_formula text NOT NULL,
  priority bigint,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  is_active boolean DEFAULT true,
  template_id uuid,
  CONSTRAINT calculation_rules_pkey PRIMARY KEY (id),
  CONSTRAINT calculation_rules_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT calculation_rules_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.calculation_rule_templates(id)
);
CREATE TABLE public.client_agreements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid,
  file_path text,
  version text,
  uploaded_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  agreement_title text,
  default boolean,
  CONSTRAINT client_agreements_pkey PRIMARY KEY (id),
  CONSTRAINT client_agreements_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT client_agreements_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.client_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid,
  author_id uuid,
  note_title text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT client_notes_pkey PRIMARY KEY (id),
  CONSTRAINT client_notes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT client_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.client_pms_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid,
  pms text,
  username text,
  password text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT client_pms_credentials_pkey PRIMARY KEY (id),
  CONSTRAINT client_pms_credentials_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);
CREATE TABLE public.client_properties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid,
  property_id uuid,
  is_primary boolean,
  commission_rate_override double precision,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  CONSTRAINT client_properties_pkey PRIMARY KEY (id),
  CONSTRAINT client_properties_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT client_properties_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);
CREATE TABLE public.client_status_codes (
  user_id uuid NOT NULL,
  code text NOT NULL,
  label text,
  color_hex text,
  is_default boolean,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  CONSTRAINT client_status_codes_pkey PRIMARY KEY (id),
  CONSTRAINT client_status_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL,
  name text,
  email text,
  phone text,
  status text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  company_name text,
  billing_address text,
  pms text,
  agreement_file_path text,
  status_id uuid,
  pms_credentials boolean,
  CONSTRAINT clients_pkey PRIMARY KEY (id),
  CONSTRAINT clients_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.profiles(id),
  CONSTRAINT clients_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.client_status_codes(id)
);
CREATE TABLE public.csv_uploads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid,
  file_name character varying,
  file_path text,
  upload_date timestamp without time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT csv_uploads_pkey PRIMARY KEY (id),
  CONSTRAINT csv_uploads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT csv_uploads_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);
CREATE TABLE public.expense_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  label text NOT NULL,
  color_hex text,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expense_categories_pkey PRIMARY KEY (id),
  CONSTRAINT expense_categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  property_id uuid,
  booking_id uuid,
  expense_date date,
  amount double precision,
  currency text DEFAULT 'CAD'::text,
  category text,
  vendor_name text,
  description text,
  receipt_path text,
  receipt_original_name text,
  receipt_mime_type text,
  is_reimbursable boolean DEFAULT false,
  is_tax_deductible boolean DEFAULT true,
  payment_method text,
  payment_status text,
  is_recurring boolean DEFAULT false,
  recurring_frequency text,
  recurring_end_date date,
  parent_expense_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT expenses_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT expenses_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT expenses_parent_expense_id_fkey FOREIGN KEY (parent_expense_id) REFERENCES public.expenses(id),
  CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.field_values_changed (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  booking_id uuid,
  user_id uuid,
  field_name text,
  original_value text,
  edited_value text,
  change_reason text,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT field_values_changed_pkey PRIMARY KEY (id),
  CONSTRAINT field_values_changed_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id),
  CONSTRAINT field_values_changed_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.guesty_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  guesty_client_id text,
  guesty_client_secret text,
  access_token text,
  access_token_expires_at timestamp with time zone,
  webhook_id text,
  webhook_url text,
  auto_import boolean DEFAULT false,
  status text,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT guesty_connections_pkey PRIMARY KEY (id),
  CONSTRAINT guesty_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.hostaway_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  hostaway_account_id text,
  api_key text,
  access_token text,
  access_token_expires_at timestamp with time zone,
  webhook_id text,
  webhook_url text,
  auto_import boolean DEFAULT false,
  status text,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT hostaway_connections_pkey PRIMARY KEY (id),
  CONSTRAINT hostaway_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.incoming_bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  platform USER-DEFINED,
  pms_connection_id uuid,
  external_reservation_id text,
  external_listing_id text,
  raw_webhook_data jsonb,
  booking_data jsonb,
  status text,
  property_id uuid,
  client_id uuid,
  field_mappings jsonb,
  guest_name text,
  guest_email text,
  check_in_date date,
  check_out_date date,
  total_amount text,
  booking_status text,
  webhook_received_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  imported_at timestamp with time zone,
  imported_booking_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone,
  listing_name text,
  num_nights bigint,
  nightly_rate double precision,
  extra_guest_fees double precision,
  cleaning_fee double precision,
  lodging_tax double precision,
  bed_linen_fee double precision,
  gst double precision,
  qst double precision,
  channel_fee double precision,
  stripe_fee double precision,
  total_payout double precision,
  mgmt_fee double precision,
  net_earnings double precision,
  sales_tax double precision,
  CONSTRAINT incoming_bookings_pkey PRIMARY KEY (id),
  CONSTRAINT incoming_bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT incoming_bookings_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id),
  CONSTRAINT incoming_bookings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT incoming_bookings_pms_connection_id_fkey FOREIGN KEY (pms_connection_id) REFERENCES public.hostaway_connections(id)
);
CREATE TABLE public.logos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  file_path text NOT NULL,
  original_name text NOT NULL,
  file_size bigint,
  mime_type text,
  uploaded_at timestamp without time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT logos_pkey PRIMARY KEY (id),
  CONSTRAINT logos_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  role USER-DEFINED,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  phone_number text,
  company_name text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.properties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_name text NOT NULL,
  address text NOT NULL,
  province text,
  property_type USER-DEFINED NOT NULL,
  listing_id text NOT NULL,
  is_active boolean NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone,
  commission_rate double precision,
  postal_code text,
  description text,
  external_name text DEFAULT '1'::text,
  internal_name text DEFAULT '1'::text,
  user_id uuid,
  CONSTRAINT properties_pkey PRIMARY KEY (id),
  CONSTRAINT properties_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.property_channels (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  channel_name text NOT NULL,
  public_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT property_channels_pkey PRIMARY KEY (id),
  CONSTRAINT property_channels_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);
CREATE TABLE public.property_field_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid,
  user_id uuid,
  mapping_name text,
  field_mappings jsonb,
  is_default boolean,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT property_field_mappings_pkey PRIMARY KEY (id),
  CONSTRAINT property_field_mappings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id),
  CONSTRAINT property_field_mappings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.property_licenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  file_path text,
  license_title text,
  notes text,
  uploaded_by uuid
);
CREATE TABLE public.property_webhook_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  property_id uuid,
  platform USER-DEFINED,
  field_mappings jsonb,
  is_active boolean,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT property_webhook_mappings_pkey PRIMARY KEY (id),
  CONSTRAINT property_webhook_mappings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);
CREATE TABLE public.report_files (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL,
  format text NOT NULL,
  file_path text NOT NULL,
  version_number bigint NOT NULL,
  is_current boolean NOT NULL,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  CONSTRAINT report_files_pkey PRIMARY KEY (id),
  CONSTRAINT report_files_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id)
);
CREATE TABLE public.report_properties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  report_id uuid,
  property_id uuid,
  CONSTRAINT report_properties_pkey PRIMARY KEY (id),
  CONSTRAINT report_properties_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(id),
  CONSTRAINT report_properties_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id)
);
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  start_date date NOT NULL,
  end_date date NOT NULL,
  updated_at timestamp with time zone,
  CONSTRAINT reports_pkey PRIMARY KEY (id)
);

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