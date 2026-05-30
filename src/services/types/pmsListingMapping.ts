// PMS Listing Mapping Types for HostMetrics Frontend
//
// A "listing mapping" links an external PMS listing (identified by the platform
// + external listing id Hostaway sends on webhooks) to a SmartHost property.
// The backend auto-creates these (source='auto') as bookings arrive; users can
// override them here (source='manual'), which the webhook matcher treats as
// authoritative for all future bookings of that listing.

export type ListingMappingSource = 'auto' | 'manual'

/**
 * A single mapping row as returned by the backend (one per platform/channel).
 * Hostaway reuses the same externalListingId across every channel, so one
 * listing can appear as several rows with different `platform` values.
 */
export interface PmsListingMapping {
  id: string
  platform: string
  externalListingId: string
  propertyId: string | null
  clientId: string | null
  source: ListingMappingSource
  createdAt: string
  updatedAt: string
  // Joined display fields (present on list responses, absent on write responses)
  propertyName?: string | null
  clientName?: string | null
}

/**
 * All channel rows for a single Hostaway listing, collapsed into one entry for
 * display. `platforms` lists every channel the listing has been seen on.
 */
export interface GroupedListingMapping {
  externalListingId: string
  propertyId: string | null
  propertyName?: string | null
  clientId: string | null
  clientName?: string | null
  /** 'manual' if ANY underlying row is pinned by the user */
  source: ListingMappingSource
  platforms: string[]
  /** Most recent updatedAt across the underlying rows */
  updatedAt: string
  rows: PmsListingMapping[]
}

/** Payload for reassigning a whole listing (all channels) to one property. */
export interface UpsertListingMappingPayload {
  userId: string
  externalListingId: string
  propertyId: string
  clientId?: string | null
}

export interface ListingMappingsResponse {
  status: 'success' | 'failed'
  message?: string
  data: PmsListingMapping[]
}

export interface UpsertListingMappingResponse {
  status: 'success' | 'failed'
  message?: string
  data: PmsListingMapping[]
}

export interface DeleteListingMappingResponse {
  status: 'success' | 'failed'
  message: string
}
