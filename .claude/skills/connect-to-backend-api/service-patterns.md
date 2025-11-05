# Service Patterns

> **Complete service file examples following TheSmartHost conventions**

---

## Complete Service File Example

**Based on:** `src/services/propertyService.ts` (production code)

```typescript
// Property Service - API calls for property management

import apiClient from './apiClient'
import type {
  Property,
  PropertyDetails,
  CreatePropertyPayload,
  UpdatePropertyPayload,
  PropertyResponse,
  PropertyDetailsResponse,
  PropertiesResponse,
  DeletePropertyResponse,
  PropertyStats,
} from './types/property'

/**
 * Get all properties for a user
 * Returns only active properties by default
 * @param parentId - User ID (property manager)
 * @returns Promise with properties array
 */
export async function getProperties(
  parentId: string
): Promise<PropertiesResponse> {
  return apiClient<PropertiesResponse>(`/properties?parentId=${parentId}`)
}

/**
 * Get single property by ID with full details
 * Includes recent bookings and CSV uploads
 * @param id - Property ID
 * @returns Promise with property details
 */
export async function getPropertyById(
  id: string
): Promise<PropertyDetailsResponse> {
  return apiClient<PropertyDetailsResponse>(`/properties/${id}`)
}

/**
 * Create a new property
 * Initially created with single owner (marked as primary)
 * @param data - Property creation payload
 * @returns Promise with created property
 */
export async function createProperty(
  data: CreatePropertyPayload
): Promise<PropertyResponse> {
  return apiClient<PropertyResponse, CreatePropertyPayload>('/properties', {
    method: 'POST',
    body: data,
  })
}

/**
 * Update an existing property
 * Supports partial updates (only send fields to update)
 * Can update owners array to manage co-ownership
 * @param id - Property ID
 * @param data - Property update payload
 * @returns Promise with updated property
 */
export async function updateProperty(
  id: string,
  data: UpdatePropertyPayload
): Promise<PropertyResponse> {
  return apiClient<PropertyResponse, UpdatePropertyPayload>(
    `/properties/${id}`,
    {
      method: 'PUT',
      body: data,
    }
  )
}

/**
 * Soft delete a property
 * Sets isActive = false, preserves data
 * @param id - Property ID
 * @returns Promise with success message
 */
export async function deleteProperty(
  id: string
): Promise<DeletePropertyResponse> {
  return apiClient<DeletePropertyResponse>(`/properties/${id}`, {
    method: 'DELETE',
  })
}

/**
 * Toggle property active status
 * Can be used to reactivate soft-deleted properties
 * @param id - Property ID
 * @param isActive - New active status
 * @returns Promise with updated property
 */
export async function togglePropertyStatus(
  id: string,
  isActive: boolean
): Promise<PropertyResponse> {
  return apiClient<PropertyResponse, { isActive: boolean }>(
    `/properties/${id}/status`,
    {
      method: 'PATCH',
      body: { isActive },
    }
  )
}

/**
 * Calculate property statistics from properties array
 * Client-side calculation for dashboard
 * @param properties - Array of properties
 * @returns Property statistics object
 */
export function calculatePropertyStats(properties: Property[]): PropertyStats {
  const total = properties.length
  const active = properties.filter((p) => p.isActive).length
  const inactive = total - active

  const totalCommission = properties.reduce(
    (sum, p) => sum + p.commissionRate,
    0
  )
  const averageCommissionRate = total > 0 ? totalCommission / total : 0

  const strCount = properties.filter((p) => p.propertyType === 'STR').length
  const ltrCount = properties.filter((p) => p.propertyType === 'LTR').length

  return {
    total,
    active,
    inactive,
    averageCommissionRate: Math.round(averageCommissionRate * 100) / 100,
    strCount,
    ltrCount,
  }
}

/**
 * Get primary owner from property's owners array
 * @param property - Property object
 * @returns Primary owner or first owner if none marked as primary
 */
export function getPrimaryOwner(property: Property) {
  return (
    property.owners.find((owner) => owner.isPrimary) || property.owners[0]
  )
}

/**
 * Get co-owners count (excluding primary)
 * @param property - Property object
 * @returns Number of co-owners
 */
export function getCoOwnersCount(property: Property): number {
  return Math.max(0, property.owners.length - 1)
}

/**
 * Format owner display text for table
 * e.g., "John Smith" or "John Smith +2"
 * @param property - Property object
 * @returns Formatted owner display string
 */
export function formatOwnerDisplay(property: Property): string {
  const primaryOwner = getPrimaryOwner(property)
  const coOwnersCount = getCoOwnersCount(property)

  if (!primaryOwner) return 'No owner'

  return coOwnersCount > 0
    ? `${primaryOwner.clientName} +${coOwnersCount}`
    : primaryOwner.clientName
}

/**
 * Check if owner has commission rate override
 * @param owner - Property owner object
 * @returns True if override exists and is different from null
 */
export function hasCommissionOverride(owner: {
  commissionRateOverride: number | null
}): boolean {
  return owner.commissionRateOverride !== null
}

/**
 * Get effective commission rate for an owner
 * Returns override if exists, otherwise property default
 * @param owner - Property owner object
 * @param propertyCommissionRate - Property's default commission rate
 * @returns Effective commission rate
 */
export function getEffectiveCommissionRate(
  owner: { commissionRateOverride: number | null },
  propertyCommissionRate: number
): number {
  return owner.commissionRateOverride ?? propertyCommissionRate
}
```

---

## Corresponding Type Definitions

**File:** `src/services/types/property.ts`

```typescript
// Main entity
export interface Property {
  id: string
  name: string
  address: string
  province: string
  postalCode: string | null
  description: string | null
  propertyType: 'STR' | 'LTR'
  hostawayListingId: string
  commissionRate: number
  isActive: boolean
  createdAt: string
  updatedAt: string | null
  owners: PropertyOwner[]
}

// Nested entity
export interface PropertyOwner {
  clientId: string
  clientName: string
  clientEmail: string | null
  isPrimary: boolean
  commissionRateOverride: number | null
}

// Extended entity with relations
export interface PropertyDetails extends Property {
  recentBookings: Booking[]
  recentCsvUploads: CsvUpload[]
}

// Request payloads
export interface CreatePropertyPayload {
  clientId: string
  name: string
  address: string
  province: string
  propertyType: 'STR' | 'LTR'
  hostawayListingId: string
  commissionRate: number
  commissionRateOverride?: number
  postalCode?: string
  description?: string
}

export interface UpdatePropertyPayload {
  name?: string
  address?: string
  province?: string
  propertyType?: 'STR' | 'LTR'
  commissionRate?: number
  hostawayListingId?: string
  postalCode?: string
  description?: string
  owners?: Array<{
    clientId: string
    isPrimary: boolean
    commissionRateOverride: number | null
  }>
}

// API responses
export interface PropertyResponse {
  status: 'success' | 'failed'
  message?: string
  data: Property
}

export interface PropertiesResponse {
  status: 'success' | 'failed'
  message?: string
  data: Property[]
}

export interface PropertyDetailsResponse {
  status: 'success' | 'failed'
  message?: string
  data: PropertyDetails
}

export interface DeletePropertyResponse {
  status: 'success' | 'failed'
  message: string
}

// Client-side types
export interface PropertyStats {
  total: number
  active: number
  inactive: number
  averageCommissionRate: number
  strCount: number
  ltrCount: number
}

// Related entities (simplified)
export interface Booking {
  id: string
  reservationCode: string
  guestName: string
  checkInDate: string
  numNights: number
  platform: string
  totalPayout: number
}

export interface CsvUpload {
  id: string
  fileName: string
  uploadDate: string
  reportingPeriod: string
  rowCount: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
}
```

---

## Simple Service Example

**For resources without helper functions:**

```typescript
// Client Service - API calls for client management

import apiClient from './apiClient'
import type {
  Client,
  CreateClientPayload,
  UpdateClientPayload,
  ClientResponse,
  ClientsResponse,
  DeleteClientResponse,
} from './types/client'

/**
 * Get all clients for a user
 * @param parentId - User ID (property manager)
 * @returns Promise with clients array
 */
export async function getClientsByParentId(
  parentId: string
): Promise<ClientsResponse> {
  return apiClient<ClientsResponse>(`/client?parentId=${parentId}`)
}

/**
 * Create a new client
 * @param data - Client creation payload
 * @returns Promise with created client
 */
export async function createClient(
  data: CreateClientPayload
): Promise<ClientResponse> {
  return apiClient<ClientResponse, CreateClientPayload>('/client', {
    method: 'POST',
    body: data,
  })
}

/**
 * Update an existing client
 * @param id - Client ID
 * @param data - Client update payload
 * @returns Promise with updated client
 */
export async function updateClient(
  id: string,
  data: UpdateClientPayload
): Promise<ClientResponse> {
  return apiClient<ClientResponse, UpdateClientPayload>(`/client/${id}`, {
    method: 'PUT',
    body: data,
  })
}

/**
 * Delete a client (soft delete)
 * @param id - Client ID
 * @returns Promise with success message
 */
export async function deleteClient(
  id: string
): Promise<DeleteClientResponse> {
  return apiClient<DeleteClientResponse>(`/client/${id}`, {
    method: 'DELETE',
  })
}
```

---

## Service with Filters

**When endpoint supports multiple query parameters:**

```typescript
/**
 * Get filtered resources
 * @param parentId - User ID
 * @param filters - Optional filter parameters
 * @returns Promise with resources array
 */
export async function getResources(
  parentId: string,
  filters?: {
    status?: 'active' | 'inactive'
    type?: 'STR' | 'LTR'
    limit?: number
  }
): Promise<ResourcesResponse> {
  const params = new URLSearchParams({ parentId })

  if (filters?.status) {
    params.append('status', filters.status)
  }

  if (filters?.type) {
    params.append('type', filters.type)
  }

  if (filters?.limit) {
    params.append('limit', filters.limit.toString())
  }

  return apiClient<ResourcesResponse>(`/resources?${params.toString()}`)
}
```

---

## Service with File Upload

**For endpoints that accept file uploads:**

```typescript
/**
 * Upload a CSV file
 * @param propertyId - Property ID
 * @param file - File to upload
 * @returns Promise with upload result
 */
export async function uploadCsv(
  propertyId: string,
  file: File
): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('propertyId', propertyId)

  // Note: Don't use apiClient for file uploads, use fetch directly
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/csv-uploads`, {
    method: 'POST',
    body: formData,
    // Don't set Content-Type header - browser will set it with boundary
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`)
  }

  return response.json()
}
```

---

## Service Function Naming Conventions

| Operation | Naming Pattern | Example |
|-----------|---------------|---------|
| Get all | `get[Resources]` | `getProperties` |
| Get by ID | `get[Resource]ById` | `getPropertyById` |
| Get with filter | `get[Resources]By[Filter]` | `getClientsByParentId` |
| Create | `create[Resource]` | `createProperty` |
| Update | `update[Resource]` | `updateProperty` |
| Delete | `delete[Resource]` | `deleteProperty` |
| Partial update | `toggle[Resource][Field]` | `togglePropertyStatus` |
| Calculate | `calculate[Resource][Thing]` | `calculatePropertyStats` |
| Format | `format[Resource][Thing]` | `formatOwnerDisplay` |
| Check/Validate | `has[Thing]` or `is[Thing]` | `hasCommissionOverride` |
| Get derived | `get[Thing]` | `getPrimaryOwner` |

---

**Last Updated:** November 4, 2025
