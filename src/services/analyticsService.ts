import apiClient from './apiClient'
import type { 
  AnalyticsFilters, 
  AnalyticsSummaryData, 
  AnalyticsTimeseriesData, 
  AnalyticsBookingsData 
} from '../store/useAnalyticsStore'

interface AnalyticsSummaryPayload extends AnalyticsFilters {}

interface AnalyticsTimeseriesPayload extends AnalyticsFilters {
  granularity: 'daily' | 'weekly'
}

interface AnalyticsBookingsPayload extends AnalyticsFilters {
  page: number
  limit: number
}

interface AnalyticsResponse<T> {
  success: boolean
  data: T
}

export async function getAnalyticsSummary(
  payload: AnalyticsSummaryPayload
): Promise<AnalyticsResponse<AnalyticsSummaryData>> {
  return apiClient<AnalyticsResponse<AnalyticsSummaryData>, AnalyticsSummaryPayload>(
    '/analytics/summary',
    {
      method: 'POST',
      body: payload,
    }
  )
}

export async function getAnalyticsTimeseries(
  payload: AnalyticsTimeseriesPayload
): Promise<AnalyticsResponse<AnalyticsTimeseriesData>> {
  return apiClient<AnalyticsResponse<AnalyticsTimeseriesData>, AnalyticsTimeseriesPayload>(
    '/analytics/timeseries',
    {
      method: 'POST',
      body: payload,
    }
  )
}

export async function getAnalyticsBookings(
  payload: AnalyticsBookingsPayload
): Promise<AnalyticsResponse<AnalyticsBookingsData>> {
  return apiClient<AnalyticsResponse<AnalyticsBookingsData>, AnalyticsBookingsPayload>(
    '/analytics/bookings',
    {
      method: 'POST',
      body: payload,
    }
  )
}