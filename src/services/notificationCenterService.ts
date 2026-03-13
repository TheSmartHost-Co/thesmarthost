import apiClient from './apiClient'
import type {
  NotificationsResponse,
  UnreadCountResponse,
  MarkReadResponse,
  NotificationQueryParams,
} from './types/notificationCenter'

/**
 * Build query string from params, omitting undefined values
 */
function buildQueryString(params: NotificationQueryParams): string {
  const searchParams = new URLSearchParams()
  if (params.category) searchParams.set('category', params.category)
  if (params.is_urgent !== undefined) searchParams.set('is_urgent', String(params.is_urgent))
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit))
  if (params.offset !== undefined) searchParams.set('offset', String(params.offset))
  const qs = searchParams.toString()
  return qs ? `?${qs}` : ''
}

/**
 * Get paginated notifications with optional filters
 */
export async function getNotifications(
  params: NotificationQueryParams = {}
): Promise<NotificationsResponse> {
  const query = buildQueryString({ limit: 30, ...params })
  return apiClient<NotificationsResponse>(`/notifications${query}`)
}

/**
 * Get unread notification count (lightweight polling endpoint)
 */
export async function getUnreadCount(): Promise<UnreadCountResponse> {
  return apiClient<UnreadCountResponse>('/notifications/unread-count')
}

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<MarkReadResponse> {
  return apiClient<MarkReadResponse>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  })
}

/**
 * Mark all notifications as read (optionally filtered by category)
 */
export async function markAllNotificationsAsRead(
  category?: string
): Promise<MarkReadResponse> {
  return apiClient<MarkReadResponse, { category?: string }>('/notifications/read-all', {
    method: 'PATCH',
    body: category ? { category } : undefined,
  })
}
