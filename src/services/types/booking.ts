// Booking Types for HostMetrics Frontend

/**
 * Platform enum matching backend
 */
export type Platform = 'airbnb' | 'booking' | 'google' | 'direct' | 'wechalet' | 'monsieurchalets'

/**
 * Main Booking interface
 * Matches backend response structure
 */
export interface Booking {
  id: string
  userId: string
  propertyId: string
  propertyName?: string
  propertyAddress?: string
  csvUploadId: string
  csvFileName?: string
  reservationCode: string
  guestName: string
  checkInDate: string
  checkOutDate?: string
  numNights: number
  platform: Platform
  listingName?: string
  nightlyRate?: number
  extraGuestFees?: number
  cleaningFee?: number
  lodgingTax?: number
  bedLinenFee?: number
  gst?: number
  qst?: number
  channelFee?: number
  stripeFee?: number
  totalPayout?: number
  mgmtFee?: number
  netEarnings?: number
  salesTax?: number
  createdAt: string
}

/**
 * Payload for creating a single booking
 */
export interface CreateBookingPayload {
  user_id: string
  property_id: string
  csv_upload_id?: string
  reservation_code: string
  guest_name: string
  check_in_date: string
  check_out_date?: string
  num_nights: number
  platform: Platform
  listing_name?: string
  nightly_rate?: number
  extra_guest_fees?: number
  cleaning_fee?: number
  lodging_tax?: number
  bed_linen_fee?: number
  gst?: number
  qst?: number
  channel_fee?: number
  stripe_fee?: number
  total_payout?: number
  mgmt_fee?: number
  net_earnings?: number
  sales_tax?: number
}

/**
 * Payload for updating a booking
 */
export interface UpdateBookingPayload {
  user_id: string
  property_id: string
  reservation_code: string
  guest_name: string
  check_in_date: string
  check_out_date?: string
  num_nights: number
  platform: Platform
  listing_name?: string
  nightly_rate?: number
  extra_guest_fees?: number
  cleaning_fee?: number
  lodging_tax?: number
  bed_linen_fee?: number
  gst?: number
  qst?: number
  channel_fee?: number
  stripe_fee?: number
  total_payout?: number
  mgmt_fee?: number
  net_earnings?: number
  sales_tax?: number
}

/**
 * Payload for bulk booking creation (CSV upload)
 */
export interface CreateMultipleBookingsPayload {
  bookings: CreateBookingPayload[]
}

/**
 * Booking statistics interface
 */
export interface BookingStats {
  totalBookings: number
  platformsCount: number
  propertiesCount: number
  totalNights: number
  avgNightlyRate: number
  totalPayoutSum: number
  totalNetEarnings: number
  earliestCheckin?: string
  latestCheckin?: string
}

/**
 * Platform breakdown statistics
 */
export interface PlatformBreakdown {
  platform: Platform
  bookingCount: number
  totalNights: number
  totalPayout: number
  totalNetEarnings: number
  avgNightlyRate: number
}

/**
 * Monthly booking summary
 */
export interface MonthlyBookingSummary {
  month: number
  year: number
  bookingCount: number
  totalNights: number
  totalPayout: number
  totalNetEarnings: number
}

/**
 * Simplified booking for search results
 */
export interface BookingSearchResult {
  id: string
  reservationCode: string
  guestName: string
  checkInDate: string
  checkOutDate?: string
  platform: Platform
  listingName?: string
  propertyName?: string
  totalPayout?: number
  netEarnings?: number
}

/**
 * API response for single booking
 */
export interface BookingResponse {
  status: 'success' | 'failed'
  data: Booking
  message?: string
}

/**
 * API response for multiple bookings
 */
export interface BookingsResponse {
  status: 'success' | 'failed'
  data: Booking[]
  message?: string
}

/**
 * API response for booking statistics
 */
export interface BookingStatsResponse {
  status: 'success' | 'failed'
  data: BookingStats
  message?: string
}

/**
 * API response for platform breakdown
 */
export interface PlatformBreakdownResponse {
  status: 'success' | 'failed'
  data: PlatformBreakdown[]
  message?: string
}

/**
 * API response for monthly summary
 */
export interface MonthlyBookingSummaryResponse {
  status: 'success' | 'failed'
  data: MonthlyBookingSummary[]
  message?: string
}

/**
 * API response for booking search
 */
export interface BookingSearchResponse {
  status: 'success' | 'failed'
  data: BookingSearchResult[]
  message?: string
}

/**
 * API response for bulk booking creation
 */
export interface BulkBookingResponse {
  status: 'success' | 'failed'
  data: {
    count: number
    bookings: Array<{
      id: string
      reservationCode: string
      guestName: string
      checkInDate: string
      platform: Platform
    }>
  }
  message?: string
}

/**
 * API response for deletion operations
 */
export interface DeleteBookingResponse {
  status: 'success' | 'failed'
  message: string
}

/**
 * API response for bulk deletion (by CSV upload)
 */
export interface BulkDeleteBookingResponse {
  status: 'success' | 'failed'
  data: {
    deletedCount: number
  }
  message: string
}

/**
 * Filter options for booking queries
 */
export interface BookingFilters {
  user_id: string
  property_id?: string
  csv_upload_id?: string
  platform?: Platform
}