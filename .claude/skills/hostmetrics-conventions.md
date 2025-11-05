# HostMetrics Frontend Code Conventions

**Last Updated:** November 2, 2025
**Tech Stack:** Next.js 15 + React 19 + TypeScript 5 + Tailwind CSS v4
**Repository:** Frontend (thesmarthost)

---

## Project Structure

```
src/
├── app/                              # Next.js App Router
│   ├── (prelogin)/                  # Public routes group
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   ├── check-email/page.tsx
│   │   ├── error/page.tsx
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── product/page.tsx
│   │   └── layout.tsx               # Prelogin layout (PreNavbar)
│   ├── (user)/                      # Authenticated routes group
│   │   ├── property-manager/        # Manager portal
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── clients/page.tsx
│   │   │   ├── properties/page.tsx
│   │   │   ├── reports/page.tsx     # Future
│   │   │   ├── analytics/page.tsx   # Future
│   │   │   ├── settings/page.tsx    # Future
│   │   │   └── layout.tsx           # Manager layout (Sidebar)
│   │   └── layout.tsx               # User layout (UserNavbar)
│   ├── api/                         # API routes
│   │   └── auth/
│   │       └── confirm/route.ts     # Email verification
│   ├── layout.tsx                   # Root layout (fonts, metadata)
│   ├── page.tsx                     # Landing page
│   └── globals.css                  # Global styles
├── components/                      # React components
│   ├── client/                      # Client feature components
│   │   ├── create/
│   │   │   └── createClientModal.tsx
│   │   ├── update/
│   │   │   └── updateClientModal.tsx
│   │   └── delete/
│   │       └── deleteClientModal.tsx
│   ├── property/                    # Property components (to build)
│   ├── navbar/                      # Navigation components
│   │   ├── PreNavbar.tsx
│   │   ├── UserNavbar.tsx
│   │   └── ManagerSidebar.tsx
│   ├── shared/                      # Reusable components
│   │   ├── modal.tsx
│   │   ├── notification.tsx
│   │   ├── LogoutModal.tsx
│   │   └── TableActionsDropdown.tsx
│   └── footer/
│       └── Footer.tsx
├── services/                        # API service layer
│   ├── apiClient.ts                 # Base fetch wrapper
│   ├── authService.ts               # Auth endpoints
│   ├── clientService.ts             # Client CRUD
│   ├── profileService.ts            # Profile operations
│   ├── propertyService.ts           # Property CRUD (to build)
│   └── types/                       # TypeScript types
│       ├── auth.ts
│       ├── client.ts
│       ├── profile.ts
│       └── property.ts              # To build
├── store/                           # Zustand state management
│   ├── useUserStore.ts              # User profile (persisted)
│   └── useNotificationStore.ts      # Notifications (non-persisted)
└── utils/
    └── supabase/                    # Supabase client factories
        ├── component.ts             # Browser client
        ├── server-props.ts          # SSR client
        ├── static-props.ts
        └── api.ts
```

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| **Components** | PascalCase | `CreateClientModal`, `ManagerSidebar` |
| **Component files** | Match component | `createClientModal.tsx`, `modal.tsx` |
| **Service files** | camelCase + Service | `clientService.ts`, `propertyService.ts` |
| **Type files** | camelCase | `client.ts`, `property.ts` |
| **Functions** | camelCase | `getClients()`, `handleSubmit()` |
| **React hooks** | camelCase with `use` | `useUserStore()`, `useNotificationStore()` |
| **Types/Interfaces** | PascalCase | `Client`, `UserProfile`, `Property` |
| **Constants** | UPPER_SNAKE_CASE | `API_BASE_URL`, `MAX_FILE_SIZE` |
| **CSS classes** | Tailwind utility classes | `bg-blue-600`, `rounded-lg` |
| **Route folders** | lowercase with hyphens | `property-manager/`, `check-email/` |
| **Route groups** | parentheses + lowercase | `(prelogin)/`, `(user)/` |

---

## TypeScript Conventions

### File Extensions
- **Components:** `.tsx` (TSX for JSX)
- **Services/Utils:** `.ts` (TS for non-JSX)
- **API Routes:** `.ts` (Next.js API routes)

### Type Definitions

**Always define interfaces for:**
- Component props
- API request payloads
- API response structures
- Zustand store state
- Function parameters and returns

**Example:**
```typescript
// services/types/client.ts
export interface Client {
  id: string
  fullName: string
  email: string
  phone: string
  commissionRate: number
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: string
  updatedAt: string
}

export interface CreateClientPayload {
  fullName: string
  email: string
  phone: string
  commissionRate: number
  status?: 'ACTIVE' | 'INACTIVE'
}

export interface ClientResponse {
  status: 'success' | 'error'
  data: Client
  message?: string
}

export interface ClientsResponse {
  status: 'success' | 'error'
  data: Client[]
  message?: string
}
```

### Props Interfaces

```typescript
// Component props
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

// Always export if used by parent
export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // ...
}
```

### Generic Types

```typescript
// Use generics for reusable functions
async function apiClient<T, B = unknown>(
  endpoint: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    body?: B
    headers?: Record<string, string>
  }
): Promise<T> {
  // Implementation
}
```

---

## Component Patterns

### 1. Client Components (Default Pattern)

**Always use `'use client'` for:**
- Components with state (`useState`, `useReducer`)
- Components with effects (`useEffect`, `useLayoutEffect`)
- Components with event handlers
- Components using browser APIs (window, document)
- Components using Zustand stores

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useUserStore } from '@/store/useUserStore'

export default function ClientsPage() {
  const { profile } = useUserStore()
  const [clients, setClients] = useState<Client[]>([])

  useEffect(() => {
    // Fetch clients
  }, [])

  return (
    // JSX
  )
}
```

### 2. Server Components

**Use server components (no 'use client') for:**
- Static pages
- Data-fetching pages (future optimization)
- SEO-critical pages

```typescript
// No 'use client' directive = server component
export default function AboutPage() {
  return (
    <div>
      <h1>About Us</h1>
      {/* Static content */}
    </div>
  )
}
```

### 3. Shared Component Pattern (Reusable)

```typescript
// components/shared/modal.tsx
'use client'

import { ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  style?: string
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  style = ''
}: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className={`relative bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto ${style}`}>
        {title && (
          <h2 className="text-2xl font-bold mb-4">{title}</h2>
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}
```

### 4. Feature Component Pattern (CRUD modals)

```typescript
// components/client/create/createClientModal.tsx
'use client'

import { useState } from 'react'
import Modal from '@/components/shared/modal'
import { createClient } from '@/services/clientService'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { CreateClientPayload } from '@/services/types/client'

interface CreateClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateClientModal({
  isOpen,
  onClose,
  onSuccess
}: CreateClientModalProps) {
  const [formData, setFormData] = useState<CreateClientPayload>({
    fullName: '',
    email: '',
    phone: '',
    commissionRate: 15,
  })
  const [isLoading, setIsLoading] = useState(false)
  const { showNotification } = useNotificationStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await createClient(formData)
      showNotification('Client created successfully', 'success')
      onSuccess()
      onClose()
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to create client'
      showNotification(message, 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Client">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Form fields */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create Client'}
        </button>
      </form>
    </Modal>
  )
}
```

---

## Service Layer Pattern

### Base API Client

```typescript
// services/apiClient.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL

interface ApiOptions<B = unknown> {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: B
  headers?: Record<string, string>
}

export async function apiClient<T, B = unknown>(
  endpoint: string,
  options?: ApiOptions<B>
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const response = await fetch(url, {
    method: options?.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'API request failed')
  }

  return response.json()
}
```

### Domain Service Pattern

```typescript
// services/clientService.ts
import { apiClient } from './apiClient'
import type {
  Client,
  CreateClientPayload,
  UpdateClientPayload,
  ClientResponse,
  ClientsResponse,
} from './types/client'

export async function getClients(parentId: string): Promise<ClientsResponse> {
  return apiClient<ClientsResponse>(`/clients?parentId=${parentId}`)
}

export async function getClientById(id: string): Promise<ClientResponse> {
  return apiClient<ClientResponse>(`/clients/${id}`)
}

export async function createClient(
  data: CreateClientPayload
): Promise<ClientResponse> {
  return apiClient<ClientResponse, CreateClientPayload>('/clients', {
    method: 'POST',
    body: data,
  })
}

export async function updateClient(
  id: string,
  data: UpdateClientPayload
): Promise<ClientResponse> {
  return apiClient<ClientResponse, UpdateClientPayload>(`/clients/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export async function deleteClient(id: string): Promise<{ status: string, message: string }> {
  return apiClient<{ status: string, message: string }>(`/clients/${id}`, {
    method: 'DELETE',
  })
}

export async function searchClients(
  parentId: string,
  query: string
): Promise<ClientsResponse> {
  return apiClient<ClientsResponse>(`/clients/search?parentId=${parentId}&q=${query}`)
}
```

---

## State Management (Zustand)

### Store Pattern

```typescript
// store/useUserStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserProfile {
  id: string
  fullName: string
  role: 'ADMIN' | 'PROPERTY-MANAGER' | 'CLIENT'
  email?: string
}

interface UserStore {
  profile: UserProfile | null
  setProfile: (profile: UserProfile) => void
  clearProfile: () => void
  getRedirectPath: () => string
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      profile: null,

      setProfile: (profile: UserProfile) => set({ profile }),

      clearProfile: () => set({ profile: null }),

      getRedirectPath: () => {
        const { profile } = get()
        if (!profile) return '/login'

        switch (profile.role) {
          case 'ADMIN':
            return '/admin/dashboard'
          case 'PROPERTY-MANAGER':
            return '/property-manager/dashboard'
          case 'CLIENT':
            return '/client/dashboard'
          default:
            return '/login'
        }
      },
    }),
    {
      name: 'user-storage', // localStorage key
    }
  )
)
```

### Usage in Components

```typescript
'use client'

import { useUserStore } from '@/store/useUserStore'

export default function Dashboard() {
  const { profile, clearProfile } = useUserStore()

  const handleLogout = () => {
    clearProfile()
    // Redirect to login
  }

  return (
    <div>
      <h1>Welcome, {profile?.fullName}</h1>
      <button onClick={handleLogout}>Logout</button>
    </div>
  )
}
```

---

## Tailwind CSS Patterns

### Common Component Styles

**Buttons:**
```tsx
{/* Primary button */}
<button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
  Click Me
</button>

{/* Secondary button */}
<button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
  Cancel
</button>

{/* Danger button */}
<button className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
  Delete
</button>

{/* Disabled state */}
<button
  disabled
  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
>
  Submit
</button>
```

**Cards:**
```tsx
<div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
  Card Content
</div>
```

**Form Inputs:**
```tsx
{/* Text input */}
<input
  type="text"
  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  placeholder="Enter text"
/>

{/* Select dropdown */}
<select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
  <option>Option 1</option>
  <option>Option 2</option>
</select>

{/* Checkbox */}
<input
  type="checkbox"
  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
/>
```

**Tables:**
```tsx
<div className="overflow-x-auto">
  <table className="w-full">
    <thead className="bg-gray-50 sticky top-0">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Name
        </th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-6 py-4 whitespace-nowrap">
          Data
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

**Badges:**
```tsx
{/* Success badge */}
<span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">
  Active
</span>

{/* Error badge */}
<span className="px-3 py-1 text-sm font-medium bg-red-100 text-red-800 rounded-full">
  Inactive
</span>

{/* Info badge */}
<span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
  STR
</span>
```

---

## Authentication Patterns

### Supabase Client (Browser)

```typescript
import { createClient } from '@/utils/supabase/component'

const supabase = createClient()

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    data: {
      fullName: 'John Doe',
      role: 'PROPERTY-MANAGER',
    },
    emailRedirectTo: `${window.location.origin}/api/auth/confirm`,
  },
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password',
})

// Sign out
await supabase.auth.signOut()

// Get session
const { data: { session } } = await supabase.auth.getSession()
```

### Auth Flow Pattern

```typescript
// After successful login
const supabase = createClient()
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email,
  password,
})

if (authError) {
  // Handle auth error
  return
}

// Fetch user profile from backend
const userId = authData.user.id
const profileResponse = await getUserProfile(userId)

// Store in Zustand
setProfile(profileResponse.data)

// Redirect based on role
const redirectPath = getRedirectPath()
router.push(redirectPath)
```

---

## Error Handling Patterns

### API Error Handling

```typescript
try {
  const response = await createClient(formData)
  showNotification('Client created successfully', 'success')
  onSuccess()
} catch (error) {
  const message = error instanceof Error
    ? error.message
    : 'An unexpected error occurred'
  showNotification(message, 'error')
}
```

### Form Validation

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  // Client-side validation
  if (!formData.fullName.trim()) {
    showNotification('Full name is required', 'error')
    return
  }

  if (!formData.email.includes('@')) {
    showNotification('Invalid email address', 'error')
    return
  }

  if (formData.commissionRate <= 0) {
    showNotification('Commission rate must be positive', 'error')
    return
  }

  // Proceed with API call
  try {
    // ...
  } catch (error) {
    // ...
  }
}
```

---

## Loading States Pattern

```typescript
const [isLoading, setIsLoading] = useState(false)

const handleSubmit = async () => {
  setIsLoading(true)
  try {
    await apiCall()
  } catch (error) {
    // Handle error
  } finally {
    setIsLoading(false)
  }
}

return (
  <button disabled={isLoading}>
    {isLoading ? 'Loading...' : 'Submit'}
  </button>
)
```

**Loading Spinner Component:**
```tsx
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )
}
```

---

## Route Groups & Layouts

### Route Group Pattern

```
app/
├── (prelogin)/
│   ├── layout.tsx       # PreNavbar layout
│   └── login/page.tsx
└── (user)/
    ├── layout.tsx       # UserNavbar layout
    └── property-manager/
        ├── layout.tsx   # ManagerSidebar layout
        └── dashboard/page.tsx
```

### Layout Composition

```typescript
// app/(user)/property-manager/layout.tsx
import ManagerSidebar from '@/components/navbar/ManagerSidebar'

export default function PropertyManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <ManagerSidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  )
}
```

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_BASE_URL=http://localhost:4000        # Backend API URL
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co  # Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxx          # Supabase anon key
```

**Usage:**
```typescript
const apiUrl = process.env.NEXT_PUBLIC_BASE_URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
```

**Note:** All environment variables exposed to the browser must be prefixed with `NEXT_PUBLIC_`

---

## Import Patterns

### Import Order

```typescript
// 1. React & Next.js imports
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 2. Third-party libraries
import { motion } from 'framer-motion'

// 3. Services
import { getClients } from '@/services/clientService'

// 4. Components
import Modal from '@/components/shared/modal'
import ClientTable from '@/components/client/ClientTable'

// 5. Store
import { useUserStore } from '@/store/useUserStore'

// 6. Types
import type { Client } from '@/services/types/client'

// 7. Utilities & constants
import { formatCurrency } from '@/utils/formatters'
```

### Path Aliases

Always use `@/*` aliases:
```typescript
// ✅ Good
import { getClients } from '@/services/clientService'
import Modal from '@/components/shared/modal'

// ❌ Bad
import { getClients } from '../../../services/clientService'
import Modal from '../../components/shared/modal'
```

---

## Code Quality Guidelines

### DRY Principle
- Extract reusable components to `components/shared/`
- Extract reusable utilities to `utils/`
- Don't duplicate API calls - use service layer

### Component Size
- Keep components under 200 lines
- Extract complex logic into custom hooks
- Split large components into smaller sub-components

### TypeScript
- Enable strict mode in `tsconfig.json`
- Avoid `any` type - use `unknown` if needed
- Define interfaces for all props and API responses
- Use type inference where possible

### Naming
- Be descriptive: `handleCreateClient` not `handleSubmit`
- Use boolean prefixes: `isLoading`, `hasError`, `canDelete`
- Use verb prefixes for functions: `get`, `create`, `update`, `delete`, `handle`

---

*This skill provides comprehensive code conventions for the HostMetrics frontend. Follow these patterns for consistency across the codebase.*