import apiClient from './apiClient'
import type {
  CleanerAnalyticsRequest,
  CleanerAnalyticsResponse,
  CleanerLineItemsRequest,
  CleanerLineItemsResponse,
} from './types/cleanerAnalytics'

/**
 * Fetch cleaner analytics data (portfolio, breakdowns, timeline).
 * POST /api/analytics/cleaners
 */
export async function getCleanerAnalytics(
  request: CleanerAnalyticsRequest
): Promise<CleanerAnalyticsResponse> {
  return apiClient<CleanerAnalyticsResponse, CleanerAnalyticsRequest>(
    '/analytics/cleaners',
    {
      method: 'POST',
      body: request,
    }
  )
}

/**
 * Fetch cleaner line items for drill-down.
 * POST /api/analytics/cleaners/line-items
 */
export async function getCleanerLineItems(
  request: CleanerLineItemsRequest
): Promise<CleanerLineItemsResponse> {
  return apiClient<CleanerLineItemsResponse, CleanerLineItemsRequest>(
    '/analytics/cleaners/line-items',
    {
      method: 'POST',
      body: request,
    }
  )
}
