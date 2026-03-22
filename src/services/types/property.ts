// Property Types for HostMetrics Frontend

import { PropertyChannel } from './propertyChannel'
import { PropertyLicense } from './propertyLicense'

/**
 * Property owner information from client_properties junction table
 */
export interface PropertyOwner {
  clientId: string
  clientName: string
  clientEmail?: string
  isPrimary: boolean
  commissionRateOverride: number | null
}

/**
 * Main Property interface
 * Matches backend response with embedded owners array and channels
 */
export interface Property {
  id: string
  listingName?: string // Can be null/empty for incomplete properties
  listingId?: string // Can be null/empty for incomplete properties
  externalName?: string // NEW: Public-facing name
  internalName?: string // NEW: Internal reference name
  address: string
  postalCode: string // NEW: Required postal code
  province: string
  propertyType: 'STR' | 'LTR'
  commissionRate?: number // Optional - can be null
  registrationNumber?: string // Quebec CITQ registration number (required for QC properties)
  isActive: boolean
  createdAt: string
  updatedAt: string
  owners: PropertyOwner[]
  channels: PropertyChannel[]
  licenses: PropertyLicense[]
  // Property specifications
  numBeds?: number | null
  numBedrooms?: number | null
  numBathrooms?: number | null
  // WiFi & Access
  wifiSsid?: string | null
  wifiPassword?: string | null
  accessCodes?: string | null
  // Default times
  defaultCheckoutTime?: string | null
  defaultCheckinTime?: string | null
  // Cleaning management
  cleaningManaged: boolean
  // Default cleaning duration (minutes) for invoice calculations
  defaultCleaningDurationMinutes?: number | null
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
 * Only address is required - properties without listingName, listingId, or clientId
 * will be created as "incomplete" and can be completed later
 */
export interface CreatePropertyPayload {
  clientId?: string // Optional - first owner (will be marked as primary)
  listingName?: string // Optional - incomplete if missing
  listingId?: string // Optional - incomplete if missing
  externalName?: string // Optional public-facing name
  internalName?: string // Optional internal reference name
  address: string // Required
  postalCode?: string // Optional postal code
  province?: string // Optional province
  propertyType: 'STR' | 'LTR'
  commissionRate?: number // Optional commission rate
  registrationNumber?: string // Quebec CITQ registration number
  commissionRateOverride?: number // Optional override for first owner
  // Property specifications
  numBeds?: number
  numBedrooms?: number
  numBathrooms?: number
  // WiFi & Access
  wifiSsid?: string
  wifiPassword?: string
  accessCodes?: string
  // Default times
  defaultCheckoutTime?: string
  defaultCheckinTime?: string
  // Cleaning management
  cleaningManaged?: boolean
  // Default cleaning duration (minutes) for invoice calculations
  defaultCleaningDurationMinutes?: number
}

/**
 * Payload for updating a property
 * All fields optional for partial updates
 * Use null to clear a field, undefined to keep existing value
 */
export interface UpdatePropertyPayload {
  listingName?: string | null // null to clear, undefined keeps existing
  listingId?: string | null
  externalName?: string | null
  internalName?: string | null
  address?: string
  postalCode?: string | null
  province?: string | null
  propertyType?: 'STR' | 'LTR'
  commissionRate?: number | null
  registrationNumber?: string | null // Quebec CITQ registration number
  owners?: UpdatePropertyOwner[]
  // Property specifications
  numBeds?: number | null
  numBedrooms?: number | null
  numBathrooms?: number | null
  // WiFi & Access
  wifiSsid?: string | null
  wifiPassword?: string | null
  accessCodes?: string | null
  // Default times
  defaultCheckoutTime?: string | null
  defaultCheckinTime?: string | null
  // Cleaning management
  cleaningManaged?: boolean
  // Default cleaning duration (minutes) for invoice calculations
  defaultCleaningDurationMinutes?: number | null
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
 * API response for permanent delete operation
 * Includes counts of all deleted associated records
 */
export interface PermanentDeletePropertyResponse {
  status: 'success' | 'error'
  message: string
  data?: {
    propertyId: string
    deletedCounts: {
      fieldValuesChanged: number
      expenses: number
      incomingBookings: number
      propertyLicenses: number
      propertyFieldMappings: number
      propertyWebhookMappings: number
      propertyChannels: number
      csvUploads: number
      bookings: number
      reportProperties: number
      propertyReportTemplates: number
      clientProperties: number
    }
  }
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

// ===================================
// BULK IMPORT TYPES
// ===================================

/**
 * Payload for a single property in bulk import
 * Only address is required - properties without listingName, listingId, or clientId
 * will be imported as "incomplete" and can be completed later via the edit modal
 */
export interface BulkImportPropertyPayload {
  listingName?: string // Optional - incomplete if missing
  listingId?: string // Optional - incomplete if missing
  address: string // Required
  clientId?: string // Optional - incomplete if missing (no primary owner)
  province?: string // Optional
  propertyType?: 'STR' | 'LTR' // Defaults to STR
  externalName?: string
  internalName?: string
  postalCode?: string
  commissionRate?: number
  registrationNumber?: string // Quebec CITQ registration number
  description?: string
  // Property specifications
  numBeds?: number
  numBedrooms?: number
  numBathrooms?: number
  // WiFi & Access
  wifiSsid?: string
  wifiPassword?: string
  accessCodes?: string
}

/**
 * Payload for bulk import API call
 */
export interface BulkImportPropertiesPayload {
  properties: BulkImportPropertyPayload[]
  skipDuplicates?: boolean
}

/**
 * Skipped property during import
 */
export interface BulkImportSkippedProperty {
  listingId: string
  listingName: string
  reason: string
}

/**
 * Summary of bulk import operation
 */
export interface BulkImportPropertySummary {
  total: number
  imported: number
  skipped: number
}

/**
 * API response for bulk import
 */
export interface BulkImportPropertiesResponse {
  status: 'success' | 'failed'
  message?: string
  data?: {
    imported: Property[]
    skipped: BulkImportSkippedProperty[]
    summary: BulkImportPropertySummary
  }
}