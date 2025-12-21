// Property Webhook Mapping Service - API calls for webhook field mapping management

import apiClient from './apiClient'
import type {
  Platform,
  PropertyWebhookMapping,
  CreatePropertyWebhookMappingPayload,
  UpdatePropertyWebhookMappingPayload,
  PropertyWebhookMappingResponse,
  PropertyWebhookMappingsResponse,
  DeletePropertyWebhookMappingResponse,
  MappingStats,
  WebhookFieldMappings,
} from './types/propertyWebhookMapping'

/**
 * Get all webhook mappings for a property
 * Returns mappings for all platforms (active and inactive)
 * @param propertyId - Property ID
 * @returns Promise with mappings array
 */
export async function getPropertyWebhookMappings(
  propertyId: string
): Promise<PropertyWebhookMappingsResponse> {
  return apiClient<PropertyWebhookMappingsResponse>(
    `/property-webhook-mappings/property/${propertyId}`
  )
}

/**
 * Get active webhook mapping for a specific property and platform
 * Returns the most recent active mapping for the combination
 * @param propertyId - Property ID
 * @param platform - Platform name (hostaway, airbnb, booking, etc.)
 * @returns Promise with mapping object
 */
export async function getPropertyWebhookMappingByPlatform(
  propertyId: string,
  platform: Platform
): Promise<PropertyWebhookMappingResponse> {
  return apiClient<PropertyWebhookMappingResponse>(
    `/property-webhook-mappings/property/${propertyId}/platform/${platform}`
  )
}

/**
 * Get single webhook mapping by ID
 * @param id - Mapping ID
 * @returns Promise with mapping details
 */
export async function getPropertyWebhookMappingById(
  id: string
): Promise<PropertyWebhookMappingResponse> {
  return apiClient<PropertyWebhookMappingResponse>(
    `/property-webhook-mappings/${id}`
  )
}

/**
 * Create a new webhook mapping for a property
 * Auto-deactivates previous mappings for same property/platform if isActive=true
 * @param data - Webhook mapping creation payload
 * @returns Promise with created mapping
 */
export async function createPropertyWebhookMapping(
  data: CreatePropertyWebhookMappingPayload
): Promise<PropertyWebhookMappingResponse> {
  return apiClient<PropertyWebhookMappingResponse, CreatePropertyWebhookMappingPayload>(
    '/property-webhook-mappings',
    {
      method: 'POST',
      body: data,
    }
  )
}

/**
 * Update an existing webhook mapping
 * Supports partial updates (only send fields to update)
 * @param id - Mapping ID
 * @param data - Webhook mapping update payload
 * @returns Promise with updated mapping
 */
export async function updatePropertyWebhookMapping(
  id: string,
  data: UpdatePropertyWebhookMappingPayload
): Promise<PropertyWebhookMappingResponse> {
  return apiClient<PropertyWebhookMappingResponse, UpdatePropertyWebhookMappingPayload>(
    `/property-webhook-mappings/${id}`,
    {
      method: 'PUT',
      body: data,
    }
  )
}

/**
 * Delete a webhook mapping
 * Permanently removes the mapping from the database
 * @param id - Mapping ID
 * @returns Promise with success message
 */
export async function deletePropertyWebhookMapping(
  id: string
): Promise<DeletePropertyWebhookMappingResponse> {
  return apiClient<DeletePropertyWebhookMappingResponse>(
    `/property-webhook-mappings/${id}`,
    {
      method: 'DELETE',
    }
  )
}


/**
 * Calculate mapping statistics from mappings array
 * Client-side calculation for analytics
 * @param mappings - Array of webhook mappings
 * @returns Mapping statistics object
 */
export function calculateMappingStats(
  mappings: PropertyWebhookMapping[]
): MappingStats {
  const totalMappings = mappings.length
  const activeMappings = mappings.filter((m) => m.isActive).length
  const inactiveMappings = totalMappings - activeMappings

  const mappingsByPlatform = mappings.reduce(
    (acc, mapping) => {
      acc[mapping.platform] = (acc[mapping.platform] || 0) + 1
      return acc
    },
    {} as Record<Platform, number>
  )

  return {
    totalMappings,
    mappingsByPlatform,
    activeMappings,
    inactiveMappings,
  }
}

/**
 * Check if a mapping has required fields configured
 * @param fieldMappings - Field mappings object
 * @param requiredFields - Array of required field names
 * @returns True if all required fields are mapped
 */
export function validateRequiredMappings(
  fieldMappings: WebhookFieldMappings,
  requiredFields: string[]
): boolean {
  return requiredFields.every(
    (field) => fieldMappings[field] && fieldMappings[field].trim() !== ''
  )
}

/**
 * Get missing required fields from mapping
 * @param fieldMappings - Field mappings object
 * @param requiredFields - Array of required field names
 * @returns Array of missing field names
 */
export function getMissingRequiredFields(
  fieldMappings: WebhookFieldMappings,
  requiredFields: string[]
): string[] {
  return requiredFields.filter(
    (field) => !fieldMappings[field] || fieldMappings[field].trim() === ''
  )
}

/**
 * Count mapped fields in mapping configuration
 * @param fieldMappings - Field mappings object
 * @returns Number of fields that have mappings
 */
export function countMappedFields(fieldMappings: WebhookFieldMappings): number {
  return Object.values(fieldMappings).filter(
    (path) => path && path.trim() !== ''
  ).length
}

/**
 * Check if mapping is complete for a platform
 * @param mapping - Webhook mapping object
 * @param requiredFields - Array of required field names for the platform
 * @returns True if mapping has all required fields
 */
export function isMappingComplete(
  mapping: PropertyWebhookMapping,
  requiredFields: string[]
): boolean {
  return (
    mapping.isActive &&
    validateRequiredMappings(mapping.fieldMappings, requiredFields)
  )
}

/**
 * Format mapping display text for lists
 * e.g., "Hostaway (15 fields)" or "Airbnb (incomplete)"
 * @param mapping - Webhook mapping object
 * @param requiredFields - Array of required field names
 * @returns Formatted display string
 */
export function formatMappingDisplay(
  mapping: PropertyWebhookMapping,
  requiredFields: string[] = []
): string {
  const platform = mapping.platform.charAt(0).toUpperCase() + mapping.platform.slice(1)
  const mappedCount = countMappedFields(mapping.fieldMappings)
  
  if (!mapping.isActive) {
    return `${platform} (inactive)`
  }
  
  const isComplete = isMappingComplete(mapping, requiredFields)
  return isComplete 
    ? `${platform} (${mappedCount} fields)`
    : `${platform} (incomplete)`
}

/**
 * Get the most recent mapping for each platform
 * Useful when displaying current mappings per platform
 * @param mappings - Array of all mappings
 * @returns Object with latest mapping per platform
 */
export function getLatestMappingsByPlatform(
  mappings: PropertyWebhookMapping[]
): Record<Platform, PropertyWebhookMapping> {
  const latest: Record<string, PropertyWebhookMapping> = {}
  
  mappings
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .forEach((mapping) => {
      if (!latest[mapping.platform]) {
        latest[mapping.platform] = mapping
      }
    })
  
  return latest as Record<Platform, PropertyWebhookMapping>
}