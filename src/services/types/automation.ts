export type AutomationType = 'guest_review' | 'review_nudge'

export type AutomationStatus =
  | 'pending'
  | 'processing'
  | 'awaiting_approval'
  | 'approved'
  | 'sent'
  | 'rejected'
  | 'failed'
  | 'expired'

export interface AutomationTask {
  id: string
  type: AutomationType
  status: AutomationStatus
  guestName: string | null
  guestEmail: string | null
  listingName: string | null
  platform: string | null
  channelName: string | null
  arrivalDate: string | null
  departureDate: string | null
  generatedContent: string | null
  editedContent: string | null
  scheduledFor: string
  processedAt: string | null
  approvedAt: string | null
  sentAt: string | null
  errorMessage: string | null
  retryCount: number
  createdAt: string
  updatedAt: string
}

export interface AutomationTaskCounts {
  awaitingApproval: number
  upcoming: number
  completed: number
  failed: number
}

export interface AutomationSettings {
  guestReviewEnabled: boolean
  reviewNudgeEnabled: boolean
  reviewNudgeDelayHours: number
  autoSendNudge: boolean
  notifyEmail: boolean
  notifySms: boolean
  customReviewPrompt: string | null
  customNudgePrompt: string | null
}

export interface UpdateSettingsPayload {
  guestReviewEnabled?: boolean
  reviewNudgeEnabled?: boolean
  reviewNudgeDelayHours?: number
  autoSendNudge?: boolean
  notifyEmail?: boolean
  notifySms?: boolean
  customReviewPrompt?: string | null
  customNudgePrompt?: string | null
}

export interface ApproveTaskPayload {
  editedContent?: string
}

// API response wrappers
export interface AutomationTasksResponse {
  status: 'success' | 'failed'
  data?: AutomationTask[]
  message?: string
}

export interface AutomationTaskResponse {
  status: 'success' | 'failed'
  data?: AutomationTask
  message?: string
}

export interface AutomationTaskCountsResponse {
  status: 'success' | 'failed'
  data?: AutomationTaskCounts
  message?: string
}

export interface AutomationSettingsResponse {
  status: 'success' | 'failed'
  data?: AutomationSettings
  message?: string
}
