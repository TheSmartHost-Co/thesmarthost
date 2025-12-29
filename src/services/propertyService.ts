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
  BulkImportPropertiesPayload,
  BulkImportPropertiesResponse,
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
    (sum, p) => sum + (p.commissionRate ?? 0),
    0
  )
  const averageCommissionRate = total > 0 ? totalCommission / total : 0

  const strCount = properties.filter((p) => p.propertyType === 'STR').length
  const ltrCount = properties.filter((p) => p.propertyType === 'LTR').length

  return {
    total,
    active,
    inactive,
    averageCommissionRate: Math.round(averageCommissionRate * 100) / 100, // Round to 2 decimals
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
 * Returns override if exists, otherwise property default, or 0 if neither set
 * @param owner - Property owner object
 * @param propertyCommissionRate - Property's default commission rate (optional)
 * @returns Effective commission rate
 */
export function getEffectiveCommissionRate(
  owner: { commissionRateOverride: number | null },
  propertyCommissionRate?: number
): number {
  return owner.commissionRateOverride ?? propertyCommissionRate ?? 0
}

/**
 * Bulk import properties with client assignments
 * Creates multiple properties in a single transaction
 * @param data - Bulk import payload with properties array
 * @returns Promise with import results (imported, skipped, summary)
 */
export function bulkImportProperties(
  data: BulkImportPropertiesPayload
): Promise<BulkImportPropertiesResponse> {
  return apiClient<BulkImportPropertiesResponse, BulkImportPropertiesPayload>(
    '/properties/bulk',
    { method: 'POST', body: data }
  )
}