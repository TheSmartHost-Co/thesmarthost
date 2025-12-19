// Property Webhook Mapping Types for HostMetrics Frontend

/**
 * Platform enum for webhook mappings
 */
export type Platform = 'airbnb' | 'booking' | 'google' | 'direct' | 'wechalet' | 'monsieurchalets' | 'direct-etransfer' | 'ALL' | 'vrbo' | 'hostaway'



/**
 * Field mappings object - maps booking field names to webhook data paths
 * Example: { "guestName": "data.guestName", "nightlyRate": "financeField.find(f => f.name === \"baseRate\").total" }
 */
export interface WebhookFieldMappings {
  [bookingField: string]: string
}

/**
 * Main Property Webhook Mapping interface
 * Matches backend response structure
 */
export interface PropertyWebhookMapping {
  id: string
  propertyId: string
  platform: Platform
  fieldMappings: WebhookFieldMappings
  isActive: boolean
  createdAt: string
}

/**
 * Payload for creating a new property webhook mapping
 */
export interface CreatePropertyWebhookMappingPayload {
  propertyId: string
  platform: Platform
  fieldMappings: WebhookFieldMappings
  isActive?: boolean // Defaults to true
}

/**
 * Payload for updating an existing property webhook mapping
 * All fields optional for partial updates
 */
export interface UpdatePropertyWebhookMappingPayload {
  fieldMappings?: WebhookFieldMappings
  isActive?: boolean
}

/**
 * API response for single property webhook mapping
 */
export interface PropertyWebhookMappingResponse {
  status: 'success' | 'failed'
  data: PropertyWebhookMapping
  message?: string
}

/**
 * API response for multiple property webhook mappings
 */
export interface PropertyWebhookMappingsResponse {
  status: 'success' | 'failed'
  data: PropertyWebhookMapping[]
  message?: string
}

/**
 * API response for delete operation
 */
export interface DeletePropertyWebhookMappingResponse {
  status: 'success' | 'failed'
  message: string
}

/**
 * Mapping statistics for analytics/dashboard
 */
export interface MappingStats {
  totalMappings: number
  mappingsByPlatform: Record<Platform, number>
  activeMappings: number
  inactiveMappings: number
}

/**
 * Template mapping for auto-suggestions
 * Used when creating mappings for similar properties or platforms
 */
export interface MappingTemplate {
  platform: Platform
  fieldMappings: WebhookFieldMappings
  description: string
  isRecommended: boolean
}