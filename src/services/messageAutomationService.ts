import apiClient from './apiClient'
import type {
  MessageAutomationSettingsResponse,
  MessageLogListResponse,
  MessageLogEntryResponse,
  MessageLogCountsResponse,
  UpdateMessageAutomationSettingsPayload,
} from './types/messageAutomation'

// Settings
export function getMessageAutomationSettings(): Promise<MessageAutomationSettingsResponse> {
  return apiClient<MessageAutomationSettingsResponse>('/message-automation/settings')
}

export function updateMessageAutomationSettings(
  data: UpdateMessageAutomationSettingsPayload
): Promise<MessageAutomationSettingsResponse> {
  return apiClient<MessageAutomationSettingsResponse>('/message-automation/settings', {
    method: 'PUT',
    body: data,
  })
}

// Log
export function getMessageLog(params?: {
  status?: string
  limit?: number
  offset?: number
}): Promise<MessageLogListResponse> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())
  const qs = searchParams.toString()
  return apiClient<MessageLogListResponse>(`/message-automation/log${qs ? `?${qs}` : ''}`)
}

export function getMessageLogCounts(): Promise<MessageLogCountsResponse> {
  return apiClient<MessageLogCountsResponse>('/message-automation/log/counts')
}

export function getMessageLogEntry(logId: string): Promise<MessageLogEntryResponse> {
  return apiClient<MessageLogEntryResponse>(`/message-automation/log/${logId}`)
}

export function approveMessageLog(
  logId: string,
  data?: { editedContent?: string }
): Promise<{ status: string; message: string }> {
  return apiClient(`/message-automation/log/${logId}/approve`, {
    method: 'PATCH',
    body: data || {},
  })
}

export function dismissMessageLog(
  logId: string
): Promise<{ status: string; message: string }> {
  return apiClient(`/message-automation/log/${logId}/dismiss`, {
    method: 'PATCH',
  })
}
