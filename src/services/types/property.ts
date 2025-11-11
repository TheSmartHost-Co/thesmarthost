// Property Types for HostMetrics Frontend

/**
 * Property owner information from client_properties junction table
 */
export interface PropertyOwner {
  clientId: string
  clientName: string
  isPrimary: boolean
  commissionRateOverride: number | null
}

/**
 * Main Property interface
 * Matches backend response with embedded owners array
 */
export interface Property {
  id: string
  listingName: string
  listingId: string
  externalName: string | null
  internalName: string | null
  address: string
  province: string
  propertyType: 'STR' | 'LTR'
  commissionRate: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  owners: PropertyOwner[]
  channels?: any[]
}

/**
 * Property with additional details (for detail page)
 * Includes recent bookings and CSV uploads
 */
export interface PropertyDetails extends Property {
  recentBookings?: Booking[]
  csvUploads?: CsvUpload[]
}

/**
 * Booking interface (simplified for now)
 */
export interface Booking {
  id: string
  checkIn: string
  checkOut: string
  guestName: string
  totalPayout: number
  createdAt: string
}

/**
 * CSV Upload interface (simplified for now)
 */
export interface CsvUpload {
  id: string
  fileName: string
  uploadedAt: string
  status: string
}

/**
 * Payload for creating a new property
 * Single client owner initially, co-owners added via update
 */
export interface CreatePropertyPayload {
  clientId: string // First owner (will be marked as primary)
  listingName: string
  listingId: string
  externalName?: string
  internalName?: string
  address: string
  province: string
  propertyType: 'STR' | 'LTR'
  commissionRate: number
  commissionRateOverride?: number // Optional override for first owner
}

/**
 * Payload for updating a property
 * All fields optional for partial updates
 */
export interface UpdatePropertyPayload {
  listingName?: string
  listingId?: string
  externalName?: string
  internalName?: string
  address?: string
  province?: string
  propertyType?: 'STR' | 'LTR'
  commissionRate?: number
  owners?: UpdatePropertyOwner[] // Replace all owners
}

/**
 * Owner information for updating property
 */
export interface UpdatePropertyOwner {
  clientId: string
  isPrimary: boolean
  commissionRateOverride?: number | null
}

/**
 * API response for single property
 */
export interface PropertyResponse {
  status: 'success' | 'error'
  data: Property
  message?: string
}

/**
 * API response for property details
 */
export interface PropertyDetailsResponse {
  status: 'success' | 'error'
  data: PropertyDetails
  message?: string
}

/**
 * API response for multiple properties
 */
export interface PropertiesResponse {
  status: 'success' | 'error'
  data: Property[]
  message?: string
}

/**
 * API response for delete operation
 */
export interface DeletePropertyResponse {
  status: 'success' | 'error'
  message: string
}

/**
 * Property statistics for dashboard
 */
export interface PropertyStats {
  total: number
  active: number
  inactive: number
  averageCommissionRate: number
  strCount: number
  ltrCount: number
}