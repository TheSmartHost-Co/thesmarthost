// Notification Center Types

export type NotificationCategory = 'cleaning' | 'issues' | 'supplies' | 'schedule' | 'bookings' | 'invoices'

export type NotificationEventType =
  | 'cleaner_assigned'
  | 'project_accepted'
  | 'project_declined'
  | 'project_completed'
  | 'auto_created_project'
  | 'unassigned_projects_alert'
  | 'issue_reported'
  | 'issue_note_pm'
  | 'issue_note_cleaner'
  | 'supply_list_submitted'
  | 'supply_list_fulfilled'
  | 'time_change_submitted'
  | 'time_change_approved'
  | 'time_change_rejected'
  | 'incoming_booking'
  | 'invoice_submitted'
  | 'invoice_approved'
  | 'invoice_rejected'
  | 'invoice_paid'

export interface InAppNotification {
  id: string
  userId: string
  eventType: NotificationEventType
  category: NotificationCategory
  isUrgent: boolean
  title: string
  description: string | null
  linkUrl: string | null
  metadata: Record<string, unknown>
  isRead: boolean
  createdAt: string
}

// API Responses

export interface NotificationsResponse {
  status: 'success' | 'failed'
  message?: string
  data: InAppNotification[]
}

export interface UnreadCountResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    unreadCount: number
    urgentUnreadCount: number
    latestTimestamp: string | null
  }
}

export interface MarkReadResponse {
  status: 'success' | 'failed'
  message?: string
}

// Query params for GET /notifications
export interface NotificationQueryParams {
  category?: NotificationCategory
  is_urgent?: boolean
  limit?: number
  offset?: number
}
