import apiClient from './apiClient'
import type {
  CleanerEarningsResponse,
  CleanerEarningsParams,
} from './types/cleanerEarnings'

/**
 * Get cleaner earnings analytics data
 * @param params - Optional filters: startDate, endDate, cleanerId, forceRefresh
 */
export async function getCleanerEarnings(
  params: CleanerEarningsParams = {}
): Promise<CleanerEarningsResponse> {
  const searchParams = new URLSearchParams()

  if (params.startDate) searchParams.set('startDate', params.startDate)
  if (params.endDate) searchParams.set('endDate', params.endDate)
  if (params.cleanerId) searchParams.set('cleanerId', params.cleanerId)
  if (params.forceRefresh) searchParams.set('forceRefresh', 'true')

  const query = searchParams.toString()
  return apiClient<CleanerEarningsResponse>(
    `/dashboard/cleaner-earnings${query ? `?${query}` : ''}`
  )
}
