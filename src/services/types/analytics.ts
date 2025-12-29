// ============================================================================
// Analytics API Types - Matches new unified backend API
// ============================================================================

// --- Request Types ---

export interface AnalyticsDateRange {
  startDate: string  // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
}

export interface AnalyticsRequest {
  dateRange: AnalyticsDateRange
  propertyIds?: string[]   // Empty = all properties
  channels?: string[]      // Empty = all channels
  comparison?: boolean     // Include previous period (default: true)
  granularity?: 'daily' | 'weekly' | 'monthly'  // Default: 'daily'
}

export interface AnalyticsBookingsRequest {
  dateRange: AnalyticsDateRange
  propertyIds?: string[]
  channels?: string[]
  page?: number      // Default: 1
  limit?: number     // Default: 50, max: 200
}

// --- Response Meta Types ---

export interface AnalyticsMeta {
  dateRange: AnalyticsDateRange
  comparisonPeriod: AnalyticsDateRange | null
  filters: {
    propertyIds: string[] | null
    channels: string[] | null
  }
  granularity: 'daily' | 'weekly' | 'monthly'
  generatedAt: string
  cached: boolean
}

// --- Portfolio Metrics ---

export interface PortfolioMetrics {
  bookingCount: number
  totalNights: number
  totalPayout: number
  netEarnings: number
  totalMgmtFee: number
  avgNightlyRate: number
  occupancyRate: number
}

export interface MetricDelta {
  absolute: number
  percentage: number
}

export interface PortfolioDelta {
  bookingCount: MetricDelta
  totalNights: MetricDelta
  totalPayout: MetricDelta
  netEarnings: MetricDelta
  totalMgmtFee: MetricDelta
  avgNightlyRate: MetricDelta
  occupancyRate: MetricDelta
}

export interface PortfolioData {
  current: PortfolioMetrics
  previous: PortfolioMetrics | null
  delta: PortfolioDelta | null
}

// --- Property Breakdown ---

export interface PropertyMetrics {
  bookingCount: number
  totalNights: number
  totalPayout: number
  netEarnings: number
  totalMgmtFee: number
  avgNightlyRate: number
  contributionPct: number  // Percentage of portfolio total
}

export interface PropertyBreakdown {
  propertyId: string
  propertyName: string
  current: PropertyMetrics
  previous: PropertyMetrics | null
  delta: PortfolioDelta | null
}

// --- Channel Breakdown ---

export interface ChannelMetrics {
  bookingCount: number
  totalNights: number
  totalPayout: number
  netEarnings: number
  totalMgmtFee: number
  avgNightlyRate: number
  payoutSharePct: number  // Percentage of total payout
}

export interface ChannelBreakdown {
  channel: string
  current: ChannelMetrics
  previous: ChannelMetrics | null
  delta: PortfolioDelta | null
}

// --- Timeline Data ---

export interface TimelinePoint {
  date: string  // YYYY-MM-DD or week/month label
  bookingCount: number
  totalNights: number
  totalPayout: number
  netEarnings: number
  totalMgmtFee: number
  avgNightlyRate: number
}

// --- Main Analytics Response ---

export interface AnalyticsData {
  meta: AnalyticsMeta
  portfolio: PortfolioData
  byProperty: PropertyBreakdown[]
  byChannel: ChannelBreakdown[]
  timeline: TimelinePoint[]
}

export interface AnalyticsResponse {
  status: 'success' | 'failed'
  message?: string
  data: AnalyticsData
}

// --- Bookings Drill-Down Types ---

export interface BookingDetail {
  id: string
  propertyId: string
  reservationCode: string
  guestName: string
  checkInDate: string
  checkOutDate: string
  numNights: number
  platform: string
  listingName: string
  nightlyRate: number
  cleaningFee: number
  totalPayout: number
  mgmtFee: number
  netEarnings: number
}

export interface BookingsPagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface BookingsData {
  meta: {
    dateRange: AnalyticsDateRange
    filters: {
      propertyIds: string[] | null
      channels: string[] | null
    }
    generatedAt: string
  }
  bookings: BookingDetail[]
  pagination: BookingsPagination
}

export interface BookingsResponse {
  status: 'success' | 'failed'
  message?: string
  data: BookingsData
}

// --- AI Insights Types ---

export interface AIInsightsPeriod {
  startDate: string
  endDate: string
  label: string  // e.g., "Week of Dec 16, 2025"
}

export interface AIInsightsAvailable {
  available: true
  markdown: string
  period: AIInsightsPeriod
  meta: {
    propertyCount: number
    generatedAt: string
  }
}

export interface AIInsightsUnavailable {
  available: false
  message: string
}

export type AIInsightsData = AIInsightsAvailable | AIInsightsUnavailable

export interface AIInsightsResponse {
  status: 'success' | 'failed'
  message?: string
  data: AIInsightsData
}

// --- Error Response ---

export interface AnalyticsError {
  status: 'failed'
  message: string
  errors?: Array<{
    field: string
    message: string
  }>
}

// --- Utility Types ---

export type Granularity = 'daily' | 'weekly' | 'monthly'

export type MetricKey = keyof PortfolioMetrics

export const METRIC_LABELS: Record<MetricKey, string> = {
  bookingCount: 'Bookings',
  totalNights: 'Total Nights',
  totalPayout: 'Total Payout',
  netEarnings: 'Net Earnings',
  totalMgmtFee: 'Management Fee',
  avgNightlyRate: 'Avg Nightly Rate',
  occupancyRate: 'Occupancy Rate',
}

export const METRIC_FORMATS: Record<MetricKey, 'currency' | 'number' | 'percent'> = {
  bookingCount: 'number',
  totalNights: 'number',
  totalPayout: 'currency',
  netEarnings: 'currency',
  totalMgmtFee: 'currency',
  avgNightlyRate: 'currency',
  occupancyRate: 'percent',
}
