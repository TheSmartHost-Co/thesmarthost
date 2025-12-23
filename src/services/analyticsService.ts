import apiClient from './apiClient'
import type {
  AnalyticsFilters,
  AnalyticsSummaryData,
  AnalyticsTimeseriesData,
  AnalyticsBookingsData
} from '../store/useAnalyticsStore'

interface AnalyticsSummaryPayload extends AnalyticsFilters {}

interface AnalyticsTimeseriesPayload extends AnalyticsFilters {
  granularity: 'daily' | 'weekly' | 'monthly'
}

interface AnalyticsBookingsPayload extends AnalyticsFilters {
  page: number
  limit: number
}

// Standard backend response format (status/data pattern)
interface BackendResponse<T> {
  status: 'success' | 'failed'
  message?: string
  data: T
}

export async function getAnalyticsSummary(
  payload: AnalyticsSummaryPayload
): Promise<BackendResponse<AnalyticsSummaryData>> {
  return apiClient<BackendResponse<AnalyticsSummaryData>, AnalyticsSummaryPayload>(
    '/analytics/summary',
    {
      method: 'POST',
      body: payload,
    }
  )
}

export async function getAnalyticsTimeseries(
  payload: AnalyticsTimeseriesPayload
): Promise<BackendResponse<AnalyticsTimeseriesData>> {
  return apiClient<BackendResponse<AnalyticsTimeseriesData>, AnalyticsTimeseriesPayload>(
    '/analytics/timeseries',
    {
      method: 'POST',
      body: payload,
    }
  )
}

export async function getAnalyticsBookings(
  payload: AnalyticsBookingsPayload
): Promise<BackendResponse<AnalyticsBookingsData>> {
  return apiClient<BackendResponse<AnalyticsBookingsData>, AnalyticsBookingsPayload>(
    '/analytics/bookings',
    {
      method: 'POST',
      body: payload,
    }
  )
}