// Booking Types for HostMetrics Frontend

/**
 * Platform enum matching backend
 */
export type Platform = 'ALL' | 'airbnb' | 'booking' | 'google' | 'direct' | 'wechalet' | 'monsieurchalets' | 'hostaway' | 'vrbo' | 'direct-etransfer'

export type FinancialReadiness = 'scheduling_only' | 'report_ready'
export type BookingSource = 'csv' | 'manual' | 'webhook' | 'ical'

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
  rentCollected?: number
  taxesCollected?: number
  cohostFee?: number
  financialReadiness?: FinancialReadiness
  source?: BookingSource
  icalEventUid?: string
  isAutoImported?: boolean
  defaultCheckinTime?: string   // e.g. "15:00" — from property defaults
  defaultCheckoutTime?: string  // e.g. "11:00" — from property defaults
  createdAt: string
}

/**
 * Payload for creating a single booking
 */
export interface CreateBookingPayload {
  userId: string
  propertyId: string
  csvUploadId?: string
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
  rentCollected?: number
  taxesCollected?: number
  cohostFee?: number
}

/**
 * Payload for updating a booking
 */
export interface UpdateBookingPayload {
  userId: string
  propertyId: string
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
  rentCollected?: number
  taxesCollected?: number
  cohostFee?: number
  financialReadiness?: FinancialReadiness
}

/**
 * Payload for bulk booking creation (CSV upload)
 */
export interface CreateMultipleBookingsPayload {
  bookings: CreateBookingPayload[]
}

/**
 * Reschedule payload (PATCH /bookings/:id/dates)
 */
export interface RescheduleBookingPayload {
  userId: string
  checkInDate: string    // YYYY-MM-DD
  numNights: number
  checkOutDate?: string  // YYYY-MM-DD (optional, backend can compute)
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
  financialReadiness?: FinancialReadiness
  source?: BookingSource
  isAutoImported?: boolean
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
    inserted: number
    enriched: number
    duplicates: number
    cleaningProjectsCreated: number
    bookings: Array<{
      id: string
      reservationCode: string
      guestName: string
      checkInDate: string
      platform: Platform
    }>
    enrichedBookings?: DuplicateBookingInfo[]
    duplicateBookings?: DuplicateBookingInfo[]
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
  userId: string
  propertyId?: string
  csvUploadId?: string
  platform?: Platform
  startDate?: string  // YYYY-MM-DD
  endDate?: string    // YYYY-MM-DD
  financialReadiness?: FinancialReadiness
}

/**
 * Payload for bulk importing bookings (from Hostaway/Guesty)
 * Similar to CreateBookingPayload but without csvUploadId requirement
 */
export interface BulkImportBookingPayload {
  propertyId: string
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
  rentCollected?: number
  taxesCollected?: number
  cohostFee?: number
}

/**
 * Duplicate booking info returned from bulk import
 */
export interface DuplicateBookingInfo {
  reservationCode: string
  guestName: string
  checkInDate: string
}

/**
 * API response for bulk import
 */
export interface BulkImportResponse {
  status: 'success' | 'failed'
  message: string
  data?: {
    imported: number
    skipped: number
    duplicates: DuplicateBookingInfo[]
    bookings?: Array<{
      id: string
      reservationCode: string
      guestName: string
      checkInDate: string
      platform: Platform
    }>
  }
}