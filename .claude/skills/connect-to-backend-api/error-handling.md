# Error Handling

> **Error handling patterns for API calls in TheSmartHost**

---

## Standard Error Handling Pattern

### In Components (Modal/Page)

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  // 1. Client-side validation
  if (!name.trim() || !address.trim()) {
    showNotification('All required fields must be filled', 'error')
    return
  }

  try {
    // 2. Make API call
    const res = await createResource(payload)

    // 3. Check response status
    if (res.status === 'success') {
      // Success path
      onAdd(res.data)
      showNotification('Resource created successfully', 'success')
      onClose()
    } else {
      // Backend returned error (validation, business logic, etc.)
      showNotification(res.message || 'Failed to create resource', 'error')
    }
  } catch (err) {
    // 4. Handle network errors or exceptions
    console.error('Error creating resource:', err)
    const message = err instanceof Error ? err.message : 'Error creating resource'
    showNotification(message, 'error')
  }
}
```

---

## Error Types

### 1. Client-Side Validation Errors

**When to use:** Before making API call

**Examples:**
- Required fields missing
- Invalid format (email, phone)
- Out of range values
- Type mismatches

```typescript
// Required field
if (!name.trim()) {
  showNotification('Name is required', 'error')
  return
}

// Number validation
const parsedRate = parseFloat(commissionRate)
if (isNaN(parsedRate)) {
  showNotification('Commission rate must be a valid number', 'error')
  return
}

// Range validation
if (parsedRate <= 0 || parsedRate > 100) {
  showNotification('Commission rate must be between 0 and 100', 'error')
  return
}

// Enum validation
if (!['STR', 'LTR'].includes(propertyType)) {
  showNotification('Invalid property type', 'error')
  return
}
```

---

### 2. Backend Validation/Business Logic Errors

**When to use:** Backend returns `status: 'failed'`

**HTTP Status Codes:**
- **400:** Bad request (validation error)
- **404:** Resource not found
- **409:** Conflict (duplicate entry)
- **500:** Server error

**Backend Response:**
```json
{
  "status": "failed",
  "message": "Property name already exists"
}
```

**Handling:**
```typescript
if (res.status === 'success') {
  // Success path
} else {
  // Display backend error message
  showNotification(res.message || 'Operation failed', 'error')
}
```

---

### 3. Network Errors

**When to use:** Fetch throws exception (network down, timeout, CORS)

**Examples:**
- Server unreachable
- Network timeout
- CORS policy blocked request
- Invalid JSON response

**Handling:**
```typescript
catch (err) {
  console.error('Error creating resource:', err)
  const message = err instanceof Error ? err.message : 'Network error occurred'
  showNotification(message, 'error')
}
```

---

## Loading State Pattern

### Track Loading During API Calls

```typescript
const [loading, setLoading] = useState(false)

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  // Validation...

  try {
    setLoading(true)  // Start loading

    const res = await createResource(payload)

    if (res.status === 'success') {
      onAdd(res.data)
      showNotification('Success', 'success')
      onClose()
    } else {
      showNotification(res.message || 'Failed', 'error')
    }
  } catch (err) {
    console.error('Error:', err)
    showNotification('Network error', 'error')
  } finally {
    setLoading(false)  // Stop loading (always)
  }
}

// UI
<button
  type="submit"
  disabled={loading}
  className="... disabled:opacity-50 disabled:cursor-not-allowed"
>
  {loading ? 'Saving...' : 'Save'}
</button>
```

---

## Fetching Data Pattern

### Load Data on Mount with Error Handling

```typescript
const [resources, setResources] = useState<Resource[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  const fetchData = async () => {
    if (!profile?.id) return

    try {
      setLoading(true)
      setError(null)

      const res = await getResources(profile.id)

      if (res.status === 'success') {
        setResources(res.data)
      } else {
        setError(res.message || 'Failed to load resources')
        showNotification(res.message || 'Failed to load resources', 'error')
      }
    } catch (err) {
      console.error('Error fetching resources:', err)
      const message = err instanceof Error ? err.message : 'Failed to load resources'
      setError(message)
      showNotification(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  fetchData()
}, [profile?.id])

// UI
if (loading) {
  return <div className="p-8">Loading...</div>
}

if (error) {
  return (
    <div className="p-8 text-red-600">
      Error: {error}
      <button onClick={() => window.location.reload()}>Retry</button>
    </div>
  )
}

return <div>{/* Render data */}</div>
```

---

## Error Messages Best Practices

### User-Friendly Messages

**Do:**
```typescript
✅ "All required fields must be filled"
✅ "Commission rate must be between 0 and 100"
✅ "Failed to create property. Please try again."
✅ "Property name already exists"
```

**Don't:**
```typescript
❌ "Validation error at line 45"
❌ "Error: ERR_CONNECTION_REFUSED"
❌ "TypeError: Cannot read property 'name' of undefined"
❌ "SQL error: duplicate key value violates unique constraint"
```

### Message Construction Pattern

```typescript
catch (err) {
  console.error('Error creating resource:', err)  // Log technical details

  // Show user-friendly message
  const message = err instanceof Error
    ? err.message                           // Use error message if meaningful
    : 'Failed to create resource'          // Fallback to generic message

  showNotification(message, 'error')
}
```

---

## Delete Confirmation Pattern

### Two-Step Delete with Error Handling

```typescript
const [isDeleteOpen, setIsDeleteOpen] = useState(false)
const [selectedResource, setSelectedResource] = useState<Resource | null>(null)

const openDeleteModal = (resource: Resource) => {
  setSelectedResource(resource)
  setIsDeleteOpen(true)
}

const handleDelete = async () => {
  if (!selectedResource) return

  try {
    const res = await deleteResource(selectedResource.id)

    if (res.status === 'success') {
      // Remove from list
      setResources(prev => prev.filter(r => r.id !== selectedResource.id))
      showNotification('Resource deleted successfully', 'success')
      setIsDeleteOpen(false)
    } else {
      showNotification(res.message || 'Failed to delete resource', 'error')
    }
  } catch (err) {
    console.error('Error deleting resource:', err)
    const message = err instanceof Error ? err.message : 'Error deleting resource'
    showNotification(message, 'error')
  }
}
```

---

## Optimistic Updates (Optional)

### Update UI Immediately, Rollback on Error

```typescript
const handleToggleStatus = async (resource: Resource) => {
  const newStatus = !resource.isActive

  // Optimistically update UI
  setResources(prev =>
    prev.map(r => r.id === resource.id ? { ...r, isActive: newStatus } : r)
  )

  try {
    const res = await toggleResourceStatus(resource.id, newStatus)

    if (res.status === 'success') {
      showNotification('Status updated', 'success')
    } else {
      // Rollback on error
      setResources(prev =>
        prev.map(r => r.id === resource.id ? { ...r, isActive: !newStatus } : r)
      )
      showNotification(res.message || 'Failed to update status', 'error')
    }
  } catch (err) {
    // Rollback on network error
    setResources(prev =>
      prev.map(r => r.id === resource.id ? { ...r, isActive: !newStatus } : r)
    )
    console.error('Error updating status:', err)
    showNotification('Network error', 'error')
  }
}
```

---

## API Client Error Handling

**Current implementation** in `src/services/apiClient.ts`:

```typescript
const response = await fetch(`${baseURL}${endpoint}`, config)

if (!response.ok) {
  let errorMessage = `HTTP ${response.status}: ${response.statusText}`
  try {
    const errorBody = await response.json()
    errorMessage = errorBody.message || errorMessage
    console.log('API Error:', errorBody)
  } catch {
    console.log('API Error (no JSON):', response.statusText)
  }
  throw new Error(errorMessage)
}

return response.json()
```

**This means:**
- Non-2xx responses throw an error (caught in component's `catch` block)
- Error message is extracted from response body if JSON
- Falls back to HTTP status text if not JSON

---

## Notification Store Usage

### Show Notifications

```typescript
import { useNotificationStore } from '@/store/useNotificationStore'

const showNotification = useNotificationStore((state) => state.showNotification)

// Success notification
showNotification('Property created successfully', 'success')

// Error notification
showNotification('Failed to create property', 'error')

// With custom duration (default is 4000ms)
showNotification('Quick message', 'success', 2000)
```

---

## Complete Error Handling Example

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { getResources, createResource, deleteResource } from '@/services/resourceService'
import type { Resource, CreateResourcePayload } from '@/services/types/resource'

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return

      try {
        setLoading(true)
        const res = await getResources(profile.id)

        if (res.status === 'success') {
          setResources(res.data)
        } else {
          showNotification(res.message || 'Failed to load resources', 'error')
        }
      } catch (err) {
        console.error('Error fetching resources:', err)
        showNotification('Network error. Please check your connection.', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [profile?.id])

  // Create resource
  const handleCreate = async (payload: CreateResourcePayload) => {
    try {
      setSubmitting(true)
      const res = await createResource(payload)

      if (res.status === 'success') {
        setResources(prev => [...prev, res.data])
        showNotification('Resource created successfully', 'success')
        return true
      } else {
        showNotification(res.message || 'Failed to create resource', 'error')
        return false
      }
    } catch (err) {
      console.error('Error creating resource:', err)
      const message = err instanceof Error ? err.message : 'Network error'
      showNotification(message, 'error')
      return false
    } finally {
      setSubmitting(false)
    }
  }

  // Delete resource
  const handleDelete = async (id: string) => {
    try {
      const res = await deleteResource(id)

      if (res.status === 'success') {
        setResources(prev => prev.filter(r => r.id !== id))
        showNotification('Resource deleted successfully', 'success')
      } else {
        showNotification(res.message || 'Failed to delete resource', 'error')
      }
    } catch (err) {
      console.error('Error deleting resource:', err)
      showNotification('Network error', 'error')
    }
  }

  if (loading) {
    return <div className="p-8">Loading resources...</div>
  }

  return (
    <div className="p-8">
      {/* UI */}
    </div>
  )
}
```

---

**Last Updated:** November 4, 2025
