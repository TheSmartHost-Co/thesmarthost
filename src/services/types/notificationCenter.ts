// Notification Center Types

// Must stay in step with CATEGORIES in the backend's
// services/notificationDefaults.js — that file is the source of truth.
export type NotificationCategory =
  | 'cleaning'
  | 'issues'
  | 'supplies'
  | 'schedule'
  | 'bookings'
  | 'invoices'
  | 'maintenance'
  | 'automations'
  | 'time_sheet'
  | 'reports'

export type NotificationEventType =
  | 'cleaner_assigned'
  | 'project_accepted'
  | 'project_completed'
  | 'auto_created_project'
  | 'project_declined'
  | 'project_cancelled'
  | 'cleaner_removed'
  | 'unassigned_projects_alert'
  | 'alert_same_day_turnover_unassigned'
  | 'alert_project_unaccepted'
  | 'alert_project_not_started'
  | 'alert_project_not_completed'
  | 'project_rescheduled'
  | 'project_auto_rescheduled'
  | 'time_change_submitted'
  | 'time_change_approved'
  | 'time_change_rejected'
  | 'issue_reported'
  | 'issue_note_cleaner'
  | 'issue_note_pm'
  | 'supply_list_submitted'
  | 'supply_list_fulfilled'
  | 'incoming_booking'
  | 'invoice_submitted'
  | 'invoice_rejected'
  | 'invoice_approved'
  | 'invoice_paid'
  | 'contractor_invoice_submitted'
  | 'contractor_invoice_rejected'
  | 'contractor_invoice_approved'
  | 'contractor_invoice_paid'
  | 'paystub_submitted'
  | 'paystub_approved'
  | 'paystub_rejected'
  | 'paystub_paid'
  | 'paystub_issued'
  | 'task_assigned'
  | 'task_cancelled'
  | 'task_offer_made'
  | 'task_offer_countered'
  | 'task_declined'
  | 'task_price_agreed'
  | 'task_completed'
  | 'automation_awaiting_approval'
  | 'message_escalation'
  | 'automation_sent'
  | 'message_auto_sent'
  | 'time_entry_pending_approval'
  | 'time_entry_rejected'
  | 'time_entry_approved'
  | 'time_entry_log_reminder'
  | 'report_shared'

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
