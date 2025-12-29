import apiClient from './apiClient'
import type {
  AnalyticsRequest,
  AnalyticsResponse,
  AnalyticsBookingsRequest,
  BookingsResponse,
  AIInsightsResponse,
} from './types/analytics'

/**
 * Fetch main analytics data (KPIs, property/channel breakdowns, timeline)
 * POST /api/analytics
 */
export async function getAnalytics(
  request: AnalyticsRequest
): Promise<AnalyticsResponse> {
  return apiClient<AnalyticsResponse, AnalyticsRequest>(
    '/analytics',
    {
      method: 'POST',
      body: request,
    }
  )
}

/**
 * Fetch bookings drill-down data
 * POST /api/analytics/bookings
 */
export async function getAnalyticsBookings(
  request: AnalyticsBookingsRequest
): Promise<BookingsResponse> {
  return apiClient<BookingsResponse, AnalyticsBookingsRequest>(
    '/analytics/bookings',
    {
      method: 'POST',
      body: request,
    }
  )
}

/**
 * Fetch AI-generated weekly insights
 * GET /api/analytics/ai-insights
 */
export async function getAIInsights(): Promise<AIInsightsResponse> {
  return apiClient<AIInsightsResponse>('/analytics/ai-insights')
}

// --- Helper Functions ---

/**
 * Get current month date range
 */
export function getCurrentMonthRange(): { startDate: string; endDate: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0) // Last day of current month

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  }
}

/**
 * Get last month date range
 */
export function getLastMonthRange(): { startDate: string; endDate: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() - 1

  const startDate = new Date(year, month, 1)
  const endDate = new Date(year, month + 1, 0)

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  }
}

/**
 * Get last N days date range
 */
export function getLastNDaysRange(days: number): { startDate: string; endDate: string } {
  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - days + 1)

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(now),
  }
}

/**
 * Get year-to-date range
 */
export function getYearToDateRange(): { startDate: string; endDate: string } {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), 0, 1)

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(now),
  }
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Date range presets for quick selection
 */
export const DATE_PRESETS = [
  { label: 'This Month', getValue: getCurrentMonthRange },
  { label: 'Last Month', getValue: getLastMonthRange },
  { label: 'Last 30 Days', getValue: () => getLastNDaysRange(30) },
  { label: 'Last 90 Days', getValue: () => getLastNDaysRange(90) },
  { label: 'Year to Date', getValue: getYearToDateRange },
] as const

export type DatePreset = typeof DATE_PRESETS[number]['label']
