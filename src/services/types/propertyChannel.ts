// Property Channel Types for HostMetrics Frontend

/**
 * Main PropertyChannel interface
 * Matches backend response from property_channels table
 */
export interface PropertyChannel {
  id: string
  propertyId: string
  channelName: string
  publicUrl: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Local PropertyChannel interface
 * Used for creating channels before property exists (no id/propertyId yet)
 */
export interface LocalPropertyChannel {
  tempId: string // Temporary ID for React keys
  channelName: string
  publicUrl: string
  isActive: boolean
}

/**
 * Predefined channel options for dropdown
 */
export const CHANNEL_OPTIONS = [
  'airbnb',
  'vrbo',
  'booking_com',
  'google',
  'direct',
  'expedia',
  'custom',
] as const

export type ChannelOption = (typeof CHANNEL_OPTIONS)[number]

/**
 * Payload for creating a new property channel
 */
export interface CreatePropertyChannelPayload {
  propertyId: string
  channelName: string
  publicUrl: string
  isActive?: boolean
}

/**
 * Payload for updating a property channel
 * All fields optional for partial updates
 */
export interface UpdatePropertyChannelPayload {
  channelName?: string
  publicUrl?: string
}

/**
 * Payload for toggling channel status
 */
export interface ToggleChannelStatusPayload {
  isActive: boolean
}

/**
 * API response for single property channel
 */
export interface PropertyChannelResponse {
  status: 'success' | 'failed'
  data: PropertyChannel
  message?: string
}

/**
 * API response for multiple property channels
 */
export interface PropertyChannelsResponse {
  status: 'success' | 'failed'
  data: PropertyChannel[]
  message?: string
}

/**
 * API response for delete operation
 */
export interface DeletePropertyChannelResponse {
  status: 'success' | 'failed'
  message: string
}
