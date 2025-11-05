# Code Conventions - Quick Reference

**For complete conventions, see:** `skills/hostmetrics-conventions.md`

**Last Updated:** November 2, 2025

---

## Stack (Actual)

- **Framework:** Next.js 15 + React 19 + TypeScript 5
- **Auth:** Supabase Auth (@supabase/ssr)
- **State:** Zustand with persist middleware
- **Styling:** Tailwind CSS v4
- **Pattern:** Service layer → API → Backend

---

## File Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (prelogin)/        # Public routes
│   ├── (user)/            # Authenticated routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── shared/           # Reusable components
│   ├── navbar/           # Navigation
│   └── [feature]/        # Feature-specific
├── services/             # API layer
│   ├── apiClient.ts      # Base fetch wrapper
│   └── [domain]Service.ts # Domain services
├── store/                # Zustand stores
├── utils/                # Utilities
│   └── supabase/        # Supabase clients
└── types/                # TypeScript types
```

---

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Components | PascalCase | `CreateClientModal` |
| Files (components) | PascalCase | `modal.tsx`, `Navbar.tsx` |
| Files (services) | camelCase | `clientService.ts` |
| Functions | camelCase | `getClients()`, `handleSubmit()` |
| Hooks | camelCase with use | `useUserStore()` |
| Types/Interfaces | PascalCase | `Client`, `UserProfile` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL` |

---

## Component Pattern

```typescript
// components/shared/modal.tsx
'use client'

import { ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg p-6">
        {children}
      </div>
    </div>
  )
}
```

---

## Service Layer Pattern

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

// services/clientService.ts - Domain service
export async function getClients(parentId: string): Promise<ClientsResponse> {
  return apiClient<ClientsResponse>(`/clients?parentId=${parentId}`)
}

export async function createClient(
  data: CreateClientPayload
): Promise<ClientResponse> {
  return apiClient<ClientResponse>('/clients', {
    method: 'POST',
    body: data,
  })
}
```

---

## State Management (Zustand)

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
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
      clearProfile: () => set({ profile: null }),
    }),
    {
      name: 'user-storage',
    }
  )
)
```

---

## TypeScript Types

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
}

export interface ClientsResponse {
  status: 'success' | 'error'
  data: Client[]
  message?: string
}
```

---

## Tailwind CSS Patterns

**Buttons:**
```tsx
<button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
  Click Me
</button>
```

**Cards:**
```tsx
<div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
  Card Content
</div>
```

**Forms:**
```tsx
<input
  type="text"
  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
```

---

## Authentication Pattern

```typescript
// Supabase client (browser)
import { createClient } from '@/utils/supabase/component'

const supabase = createClient()

// Sign up
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: { fullName, role },
    emailRedirectTo: `${origin}/api/auth/confirm`,
  },
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})

// Sign out
await supabase.auth.signOut()
```

---

## Error Handling

```typescript
// In components
try {
  const result = await createClient(data)
  showNotification('Client created successfully', 'success')
} catch (error) {
  const message = error instanceof Error ? error.message : 'An error occurred'
  showNotification(message, 'error')
}
```

---

## Route Groups

**Pattern:**
```
app/
├── (prelogin)/           # Public routes (parentheses removed from URL)
│   ├── login/
│   └── signup/
└── (user)/               # Authenticated routes
    └── property-manager/
        ├── dashboard/
        └── clients/
```

**Layout inheritance:**
- `(prelogin)` → uses PreNavbar
- `(user)` → uses UserNavbar
- `property-manager` → adds ManagerSidebar

---

## Client Components

Always use `'use client'` directive for:
- Components with state (`useState`, `useEffect`)
- Components with event handlers
- Components using browser APIs
- Components using Zustand stores

```typescript
'use client'

import { useState } from 'react'

export default function MyComponent() {
  const [count, setCount] = useState(0)
  // ...
}
```

---

*See `skills/hostmetrics-conventions.md` for complete patterns, TypeScript guidelines, component architecture, and more.*