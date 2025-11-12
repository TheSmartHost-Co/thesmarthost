// Property Channel Service - API functions for property channels CRUD

import apiClient from './apiClient'
import {
  PropertyChannel,
  PropertyChannelResponse,
  PropertyChannelsResponse,
  CreatePropertyChannelPayload,
  UpdatePropertyChannelPayload,
  ToggleChannelStatusPayload,
  DeletePropertyChannelResponse,
} from './types/propertyChannel'

/**
 * Get all channels for a specific property
 * @param propertyId - UUID of the property
 * @returns Array of property channels
 */
export async function getChannelsByPropertyId(
  propertyId: string
): Promise<PropertyChannelsResponse> {
  return apiClient<PropertyChannelsResponse>(
    `/property-channels?propertyId=${propertyId}`
  )
}

/**
 * Create a new property channel
 * @param data - Channel creation payload
 * @returns Created property channel
 */
export async function createPropertyChannel(
  data: CreatePropertyChannelPayload
): Promise<PropertyChannelResponse> {
  return apiClient<PropertyChannelResponse, CreatePropertyChannelPayload>(
    '/property-channels',
    {
      method: 'POST',
      body: data,
    }
  )
}

/**
 * Update an existing property channel
 * @param channelId - UUID of the channel to update
 * @param data - Channel update payload
 * @returns Updated property channel
 */
export async function updatePropertyChannel(
  channelId: string,
  data: UpdatePropertyChannelPayload
): Promise<PropertyChannelResponse> {
  return apiClient<PropertyChannelResponse, UpdatePropertyChannelPayload>(
    `/property-channels/${channelId}`,
    {
      method: 'PUT',
      body: data,
    }
  )
}

/**
 * Toggle channel active status
 * @param channelId - UUID of the channel to toggle
 * @param isActive - New active status
 * @returns Updated property channel
 */
export async function toggleChannelStatus(
  channelId: string,
  isActive: boolean
): Promise<PropertyChannelResponse> {
  return apiClient<PropertyChannelResponse, ToggleChannelStatusPayload>(
    `/property-channels/${channelId}/status`,
    {
      method: 'PATCH',
      body: { isActive },
    }
  )
}

/**
 * Delete a property channel
 * @param channelId - UUID of the channel to delete
 * @returns Success message
 */
export async function deletePropertyChannel(
  channelId: string
): Promise<DeletePropertyChannelResponse> {
  return apiClient<DeletePropertyChannelResponse>(
    `/property-channels/${channelId}`,
    {
      method: 'DELETE',
    }
  )
}

/**
 * Validate channel URL matches the selected channel type
 * @param channelName - Name of the channel (e.g., 'airbnb', 'vrbo')
 * @param url - Public URL to validate
 * @returns True if URL matches channel, false otherwise
 */
export function validateChannelUrl(channelName: string, url: string): boolean {
  const urlLower = url.toLowerCase()

  const channelValidations: Record<string, (url: string) => boolean> = {
    airbnb: (url) => url.includes('airbnb.com'),
    vrbo: (url) => url.includes('vrbo.com'),
    booking_com: (url) => url.includes('booking.com'),
    google: (url) =>
      url.includes('google.com') || url.includes('google.ca'),
    expedia: (url) => url.includes('expedia.com'),
    direct: () => true, // Direct bookings can be any URL
    custom: () => true, // Custom channels don't have URL restrictions
  }

  const validator = channelValidations[channelName.toLowerCase()]
  return validator ? validator(urlLower) : true // Default to true for unknown channels
}
