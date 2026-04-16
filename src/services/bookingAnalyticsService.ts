import apiClient from './apiClient'
import type {
  BookingAnalyticsRequest,
  BookingAnalyticsResponse,
  BookingDrilldownRequest,
  BookingDrilldownResponse,
} from './types/bookingAnalytics'

/**
 * Fetch booking analytics data (portfolio, breakdowns, timeline)
 * POST /api/analytics/bookings
 */
export async function getBookingAnalytics(
  request: BookingAnalyticsRequest
): Promise<BookingAnalyticsResponse> {
  return apiClient<BookingAnalyticsResponse, BookingAnalyticsRequest>(
    '/analytics/bookings',
    {
      method: 'POST',
      body: request,
    }
  )
}

/**
 * Fetch booking drilldown data (paginated booking rows)
 * POST /api/analytics/bookings/drilldown
 */
export async function getBookingDrilldown(
  request: BookingDrilldownRequest
): Promise<BookingDrilldownResponse> {
  return apiClient<BookingDrilldownResponse, BookingDrilldownRequest>(
    '/analytics/bookings/drilldown',
    {
      method: 'POST',
      body: request,
    }
  )
}
