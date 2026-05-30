// PMS Listing Mapping Service - API calls for managing Hostaway-listing → property mappings

import apiClient from './apiClient'
import type {
  PmsListingMapping,
  GroupedListingMapping,
  UpsertListingMappingPayload,
  ListingMappingsResponse,
  UpsertListingMappingResponse,
  DeleteListingMappingResponse,
} from './types/pmsListingMapping'

/**
 * Get all listing mappings for a user (one row per platform/channel).
 * @param userId - Property manager user id
 */
export async function getListingMappings(
  userId: string
): Promise<ListingMappingsResponse> {
  return apiClient<ListingMappingsResponse>(`/pms-listing-mappings/${userId}`)
}

/**
 * Reassign a whole Hostaway listing (every channel row) to one property.
 * Covers both editing an existing mapping and creating a brand-new one — the
 * backend inserts a canonical 'hostaway' row when the listing has no rows yet.
 * Always marks the mapping source='manual' so the auto-matcher won't overwrite it.
 */
export async function upsertMappingByListing(
  payload: UpsertListingMappingPayload
): Promise<UpsertListingMappingResponse> {
  return apiClient<UpsertListingMappingResponse, UpsertListingMappingPayload>(
    '/pms-listing-mappings/by-listing',
    { method: 'PUT', body: payload }
  )
}

/**
 * Delete every channel row for a listing (clears the mapping). Future webhooks
 * for that listing fall back to auto-matching (exact/fuzzy/AI).
 */
export async function deleteMappingByListing(
  userId: string,
  externalListingId: string
): Promise<DeleteListingMappingResponse> {
  return apiClient<DeleteListingMappingResponse>(
    `/pms-listing-mappings/by-listing?userId=${encodeURIComponent(
      userId
    )}&externalListingId=${encodeURIComponent(externalListingId)}`,
    { method: 'DELETE' }
  )
}

/**
 * Collapse the flat per-channel rows into one entry per Hostaway listing.
 * A listing is shown as 'manual' if the user has pinned any of its channels.
 * The displayed property is taken from the most recently updated row.
 */
export function groupByListing(
  rows: PmsListingMapping[]
): GroupedListingMapping[] {
  const groups = new Map<string, PmsListingMapping[]>()

  for (const row of rows) {
    const existing = groups.get(row.externalListingId)
    if (existing) {
      existing.push(row)
    } else {
      groups.set(row.externalListingId, [row])
    }
  }

  const result: GroupedListingMapping[] = []

  for (const [externalListingId, listingRows] of groups) {
    // Most recently updated row drives the displayed property/client.
    const newest = [...listingRows].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0]

    result.push({
      externalListingId,
      propertyId: newest.propertyId,
      propertyName: newest.propertyName,
      clientId: newest.clientId,
      clientName: newest.clientName,
      source: listingRows.some((r) => r.source === 'manual') ? 'manual' : 'auto',
      platforms: Array.from(new Set(listingRows.map((r) => r.platform))).sort(),
      updatedAt: newest.updatedAt,
      rows: listingRows,
    })
  }

  // Most recently touched listings first.
  return result.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}
