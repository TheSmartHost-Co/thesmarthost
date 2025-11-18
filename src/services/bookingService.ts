// Booking Service - API calls for booking management

import apiClient from './apiClient'
import type {
  Booking,
  BookingResponse,
  BookingsResponse,
  BookingStatsResponse,
  PlatformBreakdownResponse,
  MonthlyBookingSummaryResponse,
  BookingSearchResponse,
  BulkBookingResponse,
  DeleteBookingResponse,
  BulkDeleteBookingResponse,
  CreateBookingPayload,
  UpdateBookingPayload,
  CreateMultipleBookingsPayload,
  BookingFilters,
  Platform,
  BookingStats
} from './types/booking'

/**
 * Get all bookings for a user with optional filters
 * @param filters - Filter options (user_id required, others optional)
 * @returns Promise with bookings array
 */
export async function getBookings(
  filters: BookingFilters
): Promise<BookingsResponse> {
  const params = new URLSearchParams()
  params.append('user_id', filters.user_id)
  
  if (filters.property_id) {
    params.append('property_id', filters.property_id)
  }
  if (filters.csv_upload_id) {
    params.append('csv_upload_id', filters.csv_upload_id)
  }
  if (filters.platform) {
    params.append('platform', filters.platform)
  }

  return apiClient<BookingsResponse>(`/bookings?${params.toString()}`)
}

/**
 * Get single booking by ID
 * @param id - Booking ID
 * @param userId - User ID for ownership validation
 * @returns Promise with booking details
 */
export async function getBookingById(
  id: string,
  userId: string
): Promise<BookingResponse> {
  return apiClient<BookingResponse>(`/bookings/${id}?user_id=${userId}`)
}

/**
 * Create a new booking
 * @param data - Booking creation payload
 * @returns Promise with created booking
 */
export async function createBooking(
  data: CreateBookingPayload
): Promise<BookingResponse> {
  return apiClient<BookingResponse, CreateBookingPayload>('/bookings', {
    method: 'POST',
    body: data,
  })
}

/**
 * Create multiple bookings (bulk insert for CSV uploads)
 * @param data - Bulk booking creation payload
 * @returns Promise with creation summary
 */
export async function createMultipleBookings(
  data: CreateMultipleBookingsPayload
): Promise<BulkBookingResponse> {
  return apiClient<BulkBookingResponse, CreateMultipleBookingsPayload>('/bookings/bulk', {
    method: 'POST',
    body: data,
  })
}

/**
 * Update an existing booking
 * @param id - Booking ID
 * @param data - Booking update payload
 * @returns Promise with updated booking
 */
export async function updateBooking(
  id: string,
  data: UpdateBookingPayload
): Promise<BookingResponse> {
  return apiClient<BookingResponse, UpdateBookingPayload>(
    `/bookings/${id}`,
    {
      method: 'PUT',
      body: data,
    }
  )
}

/**
 * Delete a booking
 * @param id - Booking ID
 * @param userId - User ID for ownership validation
 * @returns Promise with success message
 */
export async function deleteBooking(
  id: string,
  userId: string
): Promise<DeleteBookingResponse> {
  return apiClient<DeleteBookingResponse, { user_id: string }>(`/bookings/${id}`, {
    method: 'DELETE',
    body: { user_id: userId }
  })
}

/**
 * Delete all bookings for a CSV upload
 * @param csvUploadId - CSV upload ID
 * @param userId - User ID for ownership validation
 * @returns Promise with deletion count
 */
export async function deleteBookingsByCsvUpload(
  csvUploadId: string,
  userId: string
): Promise<BulkDeleteBookingResponse> {
  return apiClient<BulkDeleteBookingResponse, { user_id: string }>(`/bookings/csv/${csvUploadId}`, {
    method: 'DELETE',
    body: { user_id: userId }
  })
}

/**
 * Get booking statistics for a user
 * @param userId - User ID
 * @param propertyId - Optional property filter
 * @param csvUploadId - Optional CSV upload filter
 * @returns Promise with booking statistics
 */
export async function getBookingStats(
  userId: string,
  propertyId?: string,
  csvUploadId?: string
): Promise<BookingStatsResponse> {
  const params = new URLSearchParams()
  params.append('user_id', userId)
  
  if (propertyId) {
    params.append('property_id', propertyId)
  }
  if (csvUploadId) {
    params.append('csv_upload_id', csvUploadId)
  }

  return apiClient<BookingStatsResponse>(`/bookings/stats?${params.toString()}`)
}

/**
 * Get platform breakdown for bookings
 * @param userId - User ID
 * @param propertyId - Optional property filter
 * @param csvUploadId - Optional CSV upload filter
 * @returns Promise with platform statistics
 */
export async function getBookingsByPlatform(
  userId: string,
  propertyId?: string,
  csvUploadId?: string
): Promise<PlatformBreakdownResponse> {
  const params = new URLSearchParams()
  params.append('user_id', userId)
  
  if (propertyId) {
    params.append('property_id', propertyId)
  }
  if (csvUploadId) {
    params.append('csv_upload_id', csvUploadId)
  }

  return apiClient<PlatformBreakdownResponse>(`/bookings/platform-breakdown?${params.toString()}`)
}

/**
 * Get monthly booking summary
 * @param userId - User ID
 * @param propertyId - Optional property filter
 * @param year - Optional year filter
 * @returns Promise with monthly summaries
 */
export async function getMonthlyBookingSummary(
  userId: string,
  propertyId?: string,
  year?: number
): Promise<MonthlyBookingSummaryResponse> {
  const params = new URLSearchParams()
  params.append('user_id', userId)
  
  if (propertyId) {
    params.append('property_id', propertyId)
  }
  if (year) {
    params.append('year', year.toString())
  }

  return apiClient<MonthlyBookingSummaryResponse>(`/bookings/monthly-summary?${params.toString()}`)
}

/**
 * Search bookings by guest name, reservation code, or listing name
 * @param userId - User ID
 * @param query - Search query string
 * @returns Promise with search results
 */
export async function searchBookings(
  userId: string,
  query: string
): Promise<BookingSearchResponse> {
  const params = new URLSearchParams()
  params.append('user_id', userId)
  params.append('query', query)

  return apiClient<BookingSearchResponse>(`/bookings/search?${params.toString()}`)
}

/**
 * Calculate booking statistics from bookings array (client-side)
 * Useful for dashboard when you already have bookings data
 * @param bookings - Array of bookings
 * @returns Booking statistics object
 */
export function calculateBookingStats(bookings: Booking[]): BookingStats {
  const totalBookings = bookings.length
  
  if (totalBookings === 0) {
    return {
      totalBookings: 0,
      platformsCount: 0,
      propertiesCount: 0,
      totalNights: 0,
      avgNightlyRate: 0,
      totalPayoutSum: 0,
      totalNetEarnings: 0
    }
  }

  const platforms = new Set(bookings.map(b => b.platform))
  const properties = new Set(bookings.map(b => b.propertyId))
  
  const totalNights = bookings.reduce((sum, b) => sum + Number(b.numNights), 0)
  const totalPayoutSum = bookings.reduce((sum, b) => sum + (b.totalPayout || 0), 0)
  const totalNetEarnings = bookings.reduce((sum, b) => sum + (b.netEarnings || 0), 0)
  
  const nightlyRates = bookings.filter(b => b.nightlyRate && b.nightlyRate > 0).map(b => b.nightlyRate!)
  const avgNightlyRate = nightlyRates.length > 0 
    ? nightlyRates.reduce((sum, rate) => sum + rate, 0) / nightlyRates.length
    : 0

  const dates = bookings.map(b => b.checkInDate).filter(Boolean).sort()
  const earliestCheckin = dates[0] || undefined
  const latestCheckin = dates[dates.length - 1] || undefined

  return {
    totalBookings,
    platformsCount: platforms.size,
    propertiesCount: properties.size,
    totalNights,
    avgNightlyRate: Math.round(avgNightlyRate * 100) / 100, // Round to 2 decimals
    totalPayoutSum: Math.round(totalPayoutSum * 100) / 100,
    totalNetEarnings: Math.round(totalNetEarnings * 100) / 100,
    earliestCheckin,
    latestCheckin
  }
}

/**
 * Filter bookings by platform (client-side)
 * @param bookings - Array of bookings
 * @param platform - Platform to filter by
 * @returns Filtered bookings array
 */
export function filterBookingsByPlatform(bookings: Booking[], platform: Platform): Booking[] {
  return bookings.filter(booking => booking.platform === platform)
}

/**
 * Filter bookings by date range (client-side)
 * @param bookings - Array of bookings
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Filtered bookings array
 */
export function filterBookingsByDateRange(
  bookings: Booking[], 
  startDate: string, 
  endDate: string
): Booking[] {
  return bookings.filter(booking => {
    const checkIn = new Date(booking.checkInDate)
    const start = new Date(startDate)
    const end = new Date(endDate)
    return checkIn >= start && checkIn <= end
  })
}

/**
 * Sort bookings by check-in date (client-side)
 * @param bookings - Array of bookings
 * @param descending - Sort descending (newest first)
 * @returns Sorted bookings array
 */
export function sortBookingsByDate(bookings: Booking[], descending = true): Booking[] {
  return [...bookings].sort((a, b) => {
    const dateA = new Date(a.checkInDate)
    const dateB = new Date(b.checkInDate)
    return descending ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime()
  })
}

/**
 * Format currency values for display
 * @param amount - Amount to format
 * @param currency - Currency code (default: 'CAD')
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | null | undefined, currency = 'CAD'): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '-'
  }
  
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format platform name for display
 * @param platform - Platform enum value
 * @returns Formatted platform name
 */
export function formatPlatformName(platform: Platform): string {
  const platformNames: Record<Platform, string> = {
    airbnb: 'Airbnb',
    booking: 'Booking.com',
    google: 'Google Travel',
    direct: 'Direct Booking',
    wechalet: 'We Chalet',
    monsieurchalets: 'Monsieur Chalets'
  }
  
  return platformNames[platform] || platform
}