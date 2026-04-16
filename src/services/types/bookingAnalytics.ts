// ============================================================================
// Booking Analytics API Types
// Matches POST /api/analytics/bookings and /api/analytics/bookings/drilldown
// ============================================================================

import type { DateRange, MetricDelta, DrilldownPagination } from './expenseAnalytics'

export type { DateRange, MetricDelta, DrilldownPagination }

export type BookingGranularity = 'daily' | 'weekly' | 'monthly'

// --- Main Analytics Request ---

export interface BookingAnalyticsRequest {
  dateRange: DateRange
  propertyIds?: string[]
  channels?: string[]
  clientIds?: string[]
  sources?: string[]
  financialReadiness?: string[]
  bookingStatus?: string[]
  comparison?: boolean
  granularity?: BookingGranularity
}

// --- Main Analytics Response ---

export interface MetricDescription {
  label: string
  description: string
  formula: string
}

export interface BookingAnalyticsMeta {
  dateRange: DateRange
  comparisonPeriod: DateRange | null
  filters: {
    propertyIds: string[] | null
    channels: string[] | null
    clientIds: string[] | null
    sources: string[] | null
    financialReadiness: string[] | null
    bookingStatus: string[] | null
  }
  granularity: BookingGranularity
  generatedAt: string
  cached: boolean
  metricDescriptions: Record<string, MetricDescription>
}

export interface BookingPortfolioMetrics {
  booking_count: number
  total_nights: number
  total_payout: number
  net_earnings: number
  total_mgmt_fee: number
  avg_nightly_rate: number
  total_channel_fee: number
  total_stripe_fee: number
  total_cohost_fee: number
  total_cleaning_fee: number
  rent_collected: number
  taxes_collected: number
  total_gst: number
  total_qst: number
  total_lodging_tax: number
  total_sales_tax: number
  total_extra_guest_fees: number
  total_bed_linen_fee: number
  occupancy_rate: number
}

export interface BookingPortfolioDelta {
  booking_count: MetricDelta
  total_nights: MetricDelta
  total_payout: MetricDelta
  net_earnings: MetricDelta
  total_mgmt_fee: MetricDelta
  avg_nightly_rate: MetricDelta
  total_channel_fee: MetricDelta
  total_stripe_fee: MetricDelta
  total_cohost_fee: MetricDelta
  total_cleaning_fee: MetricDelta
  rent_collected: MetricDelta
  taxes_collected: MetricDelta
  total_gst: MetricDelta
  total_qst: MetricDelta
  total_lodging_tax: MetricDelta
  total_sales_tax: MetricDelta
  total_extra_guest_fees: MetricDelta
  total_bed_linen_fee: MetricDelta
  occupancy_rate: MetricDelta
}

export interface BookingPortfolioData {
  current: BookingPortfolioMetrics
  previous: BookingPortfolioMetrics | null
  delta: BookingPortfolioDelta | null
}

// --- Breakdowns ---

export interface BookingPropertyBreakdown {
  propertyId: string
  propertyName: string
  current: BookingPortfolioMetrics & { contribution_pct: number }
  previous: (BookingPortfolioMetrics & { contribution_pct: number }) | null
  delta: Partial<BookingPortfolioDelta> | null
}

export interface BookingChannelBreakdown {
  channel: string
  current: BookingPortfolioMetrics & { payout_share_pct: number }
  previous: (BookingPortfolioMetrics & { payout_share_pct: number }) | null
  delta: Partial<BookingPortfolioDelta> | null
}

export interface BookingSourceBreakdown {
  source: string
  current: BookingPortfolioMetrics & { payout_share_pct?: number }
  previous: (BookingPortfolioMetrics & { payout_share_pct?: number }) | null
  delta: Partial<BookingPortfolioDelta> | null
}

export interface BookingClientBreakdown {
  clientId: string
  clientName: string
  current: BookingPortfolioMetrics & { payout_share_pct?: number }
  previous: (BookingPortfolioMetrics & { payout_share_pct?: number }) | null
  delta: Partial<BookingPortfolioDelta> | null
}

// --- Timeline ---

export interface BookingTimelinePoint {
  date: string
  booking_count: number
  total_nights: number
  total_payout: number
  net_earnings: number
  avg_nightly_rate: number
}

// --- Full Response ---

export interface BookingAnalyticsData {
  meta: BookingAnalyticsMeta
  portfolio: BookingPortfolioData
  byProperty: BookingPropertyBreakdown[]
  byChannel: BookingChannelBreakdown[]
  bySource: BookingSourceBreakdown[]
  byClient: BookingClientBreakdown[]
  timeline: BookingTimelinePoint[]
}

export interface BookingAnalyticsResponse {
  status: 'success' | 'failed'
  data: BookingAnalyticsData
  message?: string
}

// --- Drilldown Request ---

export interface BookingDrilldownRequest {
  dateRange: DateRange
  propertyIds?: string[]
  channels?: string[]
  clientIds?: string[]
  sources?: string[]
  financialReadiness?: string[]
  bookingStatus?: string[]
  page?: number
  limit?: number
}

// --- Drilldown Response ---

export interface DrilldownBooking {
  id: string
  propertyId: string
  propertyName: string
  reservationCode: string
  guestName: string
  checkInDate: string
  checkOutDate: string
  numNights: number
  numGuests: number
  platform: string
  source: string
  bookingStatus: string
  financialReadiness: string
  nightlyRate: number
  extraGuestFees: number
  cleaningFee: number
  lodgingTax: number
  bedLinenFee: number
  gst: number
  qst: number
  channelFee: number
  stripeFee: number
  totalPayout: number
  mgmtFee: number
  netEarnings: number
  salesTax: number
  cohostFee: number
  rentCollected: number
  taxesCollected: number
  createdAt: string
}

export interface BookingDrilldownData {
  meta: {
    dateRange: DateRange
    filters: {
      propertyIds: string[] | null
      channels: string[] | null
      clientIds: string[] | null
      sources: string[] | null
      financialReadiness: string[] | null
      bookingStatus: string[] | null
    }
    generatedAt: string
  }
  bookings: DrilldownBooking[]
  pagination: DrilldownPagination
}

export interface BookingDrilldownResponse {
  status: 'success' | 'failed'
  data: BookingDrilldownData
  message?: string
}

// --- Transformed Chart Data ---

export interface BookingChartDataPoint {
  date: string
  label: string
  total_payout: number
  net_earnings: number
  booking_count: number
  total_nights: number
  avg_nightly_rate: number
}
