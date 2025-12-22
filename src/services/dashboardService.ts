import apiClient from './apiClient'
import type {
  AlertsResponse,
  MetricsResponse,
  InsightsResponse,
  ActivityResponse,
} from './types/dashboard'

/**
 * Get dashboard alerts (missing bookings and reports)
 */
export async function getDashboardAlerts(): Promise<AlertsResponse> {
  return apiClient<AlertsResponse>('/dashboard/alerts')
}

/**
 * Get dashboard metrics (health metrics)
 */
export async function getDashboardMetrics(): Promise<MetricsResponse> {
  return apiClient<MetricsResponse>('/dashboard/metrics')
}

/**
 * Get performance insights
 * @param limit - Number of insights to return (default: 5)
 */
export async function getDashboardInsights(limit: number = 5): Promise<InsightsResponse> {
  return apiClient<InsightsResponse>(`/dashboard/insights?limit=${limit}`)
}

/**
 * Get recent activity feed
 * @param limit - Number of activities to return (default: 20)
 */
export async function getDashboardActivity(limit: number = 20): Promise<ActivityResponse> {
  return apiClient<ActivityResponse>(`/dashboard/activity?limit=${limit}`)
}
