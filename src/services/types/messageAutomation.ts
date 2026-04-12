export type MessageLogStatus =
  | 'pending'
  | 'auto_sent'
  | 'queued'
  | 'pm_approved'
  | 'pm_edited_sent'
  | 'escalated'
  | 'dismissed'
  | 'skipped'
  | 'failed'

export type AIConfidence = 'high' | 'medium' | 'low'

export type ConfidenceThreshold = 'low' | 'medium' | 'high'

export interface ScheduleDay {
  day: number
  enabled: boolean
  startTime: string
  endTime: string
}

export interface MessageAutomationSettings {
  autoReplyMessages: boolean
  autoReplyInquiries: boolean
  autoSendMessages: boolean
  autoSendInquiries: boolean
  schedule: ScheduleDay[]
  timezone: string
  alertEmail: boolean
  alertSms: boolean
  customSystemPrompt: string | null
  confidenceThresholdMessages: ConfidenceThreshold
  confidenceThresholdInquiries: ConfidenceThreshold
}

export interface UpdateMessageAutomationSettingsPayload {
  autoReplyMessages?: boolean
  autoReplyInquiries?: boolean
  autoSendMessages?: boolean
  autoSendInquiries?: boolean
  schedule?: ScheduleDay[]
  timezone?: string
  alertEmail?: boolean
  alertSms?: boolean
  customSystemPrompt?: string | null
  confidenceThresholdMessages?: ConfidenceThreshold
  confidenceThresholdInquiries?: ConfidenceThreshold
}

export interface MessageLogEntry {
  id: string
  hostawayConversationId: string
  hostawayMessageId: string | null
  externalReservationId: string | null
  guestName: string | null
  listingName: string | null
  listingId: string | null
  platform: string | null
  incomingMessage: string
  incomingMessageAt: string
  aiResponse: string | null
  aiConfidence: AIConfidence | null
  aiReasoning: string | null
  aiSuggestedAction: string | null
  aiTopic: string | null
  aiPromptUsed: string | null
  conversationHistory: string | null
  status: MessageLogStatus
  editedContent: string | null
  sentAt: string | null
  escalatedAt: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface MessageLogCounts {
  queued: number
  escalated: number
  autoSent: number
  failed: number
}

export interface MessageAutomationSettingsResponse {
  status: 'success' | 'failed'
  data?: MessageAutomationSettings
  message?: string
}

export interface MessageLogListResponse {
  status: 'success' | 'failed'
  data?: MessageLogEntry[]
  message?: string
}

export interface MessageLogEntryResponse {
  status: 'success' | 'failed'
  data?: MessageLogEntry
  message?: string
}

export interface MessageLogCountsResponse {
  status: 'success' | 'failed'
  data?: MessageLogCounts
  message?: string
}
