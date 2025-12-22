# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **HostMetrics Frontend** - Property management reporting platform built with Next.js, TypeScript, and Tailwind CSS

**Last Updated:** December 14, 2025

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

### Reports Architecture Pattern

**Multi-Format Report Generation:**
```typescript
// 1. Unified preview/generation payload
interface ReportGenerationPayload {
  propertyIds: string[]        // Support single or multiple properties
  startDate: string
  endDate: string
  format: 'pdf' | 'csv' | 'excel'
  logoId?: string
}

// 2. Response handling pattern
const handlePreview = async () => {
  const res = await previewReport(payload)
  if (res.status === 'success') {
    // Handle different response formats
    if (res.data.pdfPreview) {
      // PDF: Base64 content for browser display
      setPreviewData({ pdf: res.data.pdfPreview, ... })
    } else if (res.data.reportData) {
      // CSV/Excel: Structured data for table display
      setPreviewData({ 
        bookings: res.data.reportData.bookings,
        summary: res.data.reportData.summary,
        ...
      })
    }
  }
}
```

**State Management Pattern (No Optimistic Updates):**
```typescript
// ❌ DON'T: Optimistic updates cause duplicate key errors
const handleReportGenerated = (newReport: Report) => {
  setReports([newReport, ...reports])  // Can cause duplicates
}

// ✅ DO: Always refresh from server
const handleReportGenerated = async () => {
  await loadReports()  // Single source of truth
  setShowGenerateModal(false)
}
```

**Enhanced Summary Display Pattern:**
```typescript
// Comprehensive financial breakdown with receipt-style layout
<div className="grid grid-cols-2 gap-x-8 gap-y-3 max-w-2xl">
  <div>
    {/* Left column: Overview, Revenue, Taxes */}
    <div>Room Revenue: <span className="font-semibold">${total.toLocaleString()}</span></div>
    <div className="border-t border-gray-200 pt-1 font-bold">
      Total Revenue: <span className="text-green-600">${total.toLocaleString()}</span>
    </div>
  </div>
  <div>
    {/* Right column: Platform fees, Final amounts */}
    <div className="font-bold">NET EARNINGS: 
      <span className="text-green-600">${earnings.toLocaleString()}</span>
    </div>
  </div>
</div>
```

**Table Totals Pattern:**
```typescript
// Add totals footer to data tables using summary data
<tfoot className="bg-gray-100 border-t-2 border-gray-300">
  <tr className="font-medium">
    <td colSpan={2}>TOTALS</td>
    <td className="font-semibold">{summary.totalNights}</td>
    <td className="font-semibold">${summary.totalChannelFees.toLocaleString()}</td>
    <td className="font-semibold text-green-600">${summary.totalNetEarnings.toLocaleString()}</td>
  </tr>
</tfoot>
```

**Single Report View & File Management Pattern:**
```typescript
// 1. Detailed report modal with file management
interface ViewReportModalProps {
  isOpen: boolean
  onClose: () => void
  reportId: string
  onReportUpdated?: () => void
}

// 2. File download with proper behavior
const handleDownload = async (file: ReportFile) => {
  try {
    const response = await fetch(file.downloadUrl)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    // Create download link and trigger
  } catch (error) {
    // Fallback to direct link with new tab
  }
}

// 3. File deletion with confirmation
const handleDeleteFile = async (fileId: string) => {
  const res = await deleteReportFile(fileId)
  if (res.status === 'success') {
    await loadReport() // Refresh report data
    onReportUpdated?.() // Refresh parent list
  }
}

// 4. Expandable file sections by format
{Object.entries(report.filesByFormat).map(([format, files]) => (
  <div key={format}>
    <button onClick={() => toggleSection(format)}>
      {format.toUpperCase()} Files ({files.length} versions)
    </button>
    {expandedSections[format] && (
      <div>
        {files.map(file => (
          <FileVersionRow 
            key={file.id} 
            file={file} 
            onDownload={handleDownload}
            onDelete={handleDeleteFile}
          />
        ))}
      </div>
    )}
  </div>
))}
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
| Reports | GET, GET/:id, POST, DELETE, /preview, /generate, /logos, /upload-logo | ✅ Complete |
| Report Files | DELETE /files/:fileId | ✅ Complete |

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

**Reports Management:**
- **Report Generation System:**
  - Multi-format support (PDF, CSV, Excel)
  - Single and multi-property reports
  - Date range filtering
  - Custom logo upload and selection
  - Report preview before generation
- **Report Dashboard:**
  - Reports list with filtering by property and date range
  - Pagination support (10/25/50 items per page)
  - Download links for generated reports
  - Delete functionality with confirmation
  - Real-time status updates
- **Advanced Preview Features:**
  - PDF preview with base64 display in new tab
  - CSV/Excel data table preview with scrollable interface
  - Comprehensive financial summary with receipt-style layout
  - Column totals in data tables
  - Multi-property breakdowns
- **Financial Data Display:**
  - Revenue breakdown (room revenue, extra fees, cleaning fees)
  - Tax calculations (GST, QST, lodging tax, sales tax)
  - Platform fees (channel fees, Stripe fees, management fees)
  - Final amounts (total payout, net earnings, rent collected)
  - Average nightly rate calculations
  - Property-by-property summaries
- **Single Report View & File Management (NEW - Dec 14, 2025):**
  - Detailed report view modal with comprehensive metadata display
  - File version history with expandable sections by format
  - Individual file download with proper download behavior
  - File deletion with confirmation and auto-refresh
  - Current vs. previous version indicators
  - Clickable report names in reports table for easy access

**CSV Upload Wizard (Multi-Property):**
- ✅ Property identification step (map CSV listings to properties)
- ✅ Field mapping step (global and per-property modes)
- ✅ Preview step with property-specific field mappings
- ✅ Process step for multi-property imports
- ✅ Fixed duplicate column display issue
- ✅ Property creation inline during identification

### 🚧 PRIORITY: Property Field Mapping System

**CRITICAL NEXT TASKS** - These must be implemented to complete the CSV upload workflow:

#### 1. Database Schema Updates
**File:** Backend database migration
**Table:** `property_field_mappings`
```sql
CREATE TABLE property_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mapping_name VARCHAR(255) NOT NULL, -- e.g., "Hostaway Template", "Airbnb Template"
  field_mappings JSONB NOT NULL, -- Array of FieldMapping objects
  platform VARCHAR(50), -- 'ALL', 'airbnb', 'booking', etc.
  is_default BOOLEAN DEFAULT false, -- Whether this is the default template for this property
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(property_id, mapping_name, platform)
);
```

#### 2. Backend API Routes
**Files:** Backend routes and controllers
```typescript
// GET /api/property-field-mappings/:propertyId - Get all templates for a property
// POST /api/property-field-mappings - Save a new template
// PUT /api/property-field-mappings/:id - Update a template
// DELETE /api/property-field-mappings/:id - Delete a template
// POST /api/property-field-mappings/:id/set-default - Set as default template
```

#### 3. Frontend Service Integration
**File:** `src/services/propertyFieldMappingService.ts`
```typescript
export interface PropertyFieldMappingTemplate {
  id: string
  propertyId: string
  userId: string
  mappingName: string
  fieldMappings: FieldMapping[]
  platform: Platform
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// API functions:
// getPropertyFieldMappings(propertyId: string)
// savePropertyFieldMapping(template: CreatePropertyFieldMappingPayload)
// updatePropertyFieldMapping(id: string, updates: UpdatePropertyFieldMappingPayload)
// deletePropertyFieldMapping(id: string)
// setDefaultTemplate(id: string)
```

#### 4. Auto-Loading System in Field Mapping Step
**File:** `src/components/upload-wizard/steps/FieldMappingStep.tsx`

**Requirements:**
- When user switches to per-property mode and selects a property tab, auto-load saved templates for that property
- Show a dropdown/selector for available templates: "Hostaway Template", "Airbnb Template", "Custom", etc.
- If property has a default template, auto-load it immediately
- Add "Save as Template" button to save current mappings as a reusable template
- Template selector should show: Template name, platform, created date
- Templates should be property-specific (each property has its own set of templates)

#### 5. Template Management Modal
**File:** `src/components/property-field-mapping/PropertyFieldMappingModal.tsx`

**Features:**
- Accessible from Property Management page and Field Mapping Step
- List all saved templates for a property
- Create/Edit/Delete templates
- Set default template
- Preview template mappings
- Import template from another property (copy functionality)
- Template validation (ensure all required fields are mapped)

#### 6. Integration Points

**Property Management Integration:**
- Add "Field Mapping Templates" button/tab in property details
- Show template count in property list: "3 templates configured"
- Quick access to manage templates per property

**Field Mapping Step Integration:**
- Template dropdown in per-property mode
- Auto-load default template when switching properties
- "Save Current Mappings" button
- Template indicator: "Using: Hostaway Template (default)"
- Ability to modify loaded template and save as new or update existing

#### 7. User Experience Flow
```
1. User uploads CSV and identifies properties
2. User switches to per-property mode in Field Mapping Step
3. For each property tab:
   a. If property has default template → Auto-load it
   b. If no default → Show template selector dropdown
   c. User can select existing template or create new mappings
   d. User can save current mappings as new template
   e. User can modify loaded template and update it
4. Templates persist for future CSV uploads
5. Property managers can pre-configure templates for common platforms
```

### ⏳ Other Upcoming Features

**Later Sprints:**
- Bookings management
- Analytics charts
- Settings pages
- Report scheduling and automation

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

- **API Client:** [src/services/apiClient.ts](src/services/apiClient.ts) - Fetch wrapper with comprehensive logging
- **User Store:** [src/store/useUserStore.ts](src/store/useUserStore.ts) - Auth state pattern
- **Property Service:** [src/services/propertyService.ts](src/services/propertyService.ts) - Complete CRUD example
- **Create Modal Example:** [src/components/property/create/createPropertyModal.tsx](src/components/property/create/createPropertyModal.tsx)
- **List Page Example:** [src/app/(user)/property-manager/properties/page.tsx](src/app/(user)/property-manager/properties/page.tsx)
- **Report Service:** [src/services/reportService.ts](src/services/reportService.ts) - Multi-format report generation with file management
- **Report Types:** [src/services/types/report.ts](src/services/types/report.ts) - Comprehensive financial data and file management interfaces
- **Reports Page:** [src/app/(user)/property-manager/reports/page.tsx](src/app/(user)/property-manager/reports/page.tsx) - Full reports dashboard with filtering
- **Generate Modal:** [src/components/report/generate/generateReportModal.tsx](src/components/report/generate/generateReportModal.tsx) - Multi-format generation with preview
- **View Report Modal:** [src/components/report/view/viewReportModal.tsx](src/components/report/view/viewReportModal.tsx) - Single report details with file management

---

**Project:** HostMetrics for TheSmartHost Co. Inc
**Team:** Mark Cena (Calgary) + Hussein Saab (Toronto)
**Timeline:** Oct 7 - Dec 20, 2025
**Contact:** husseinsaab14@gmail.com, markjpcena@gmail.com

---

**Last Updated:** December 14, 2025
