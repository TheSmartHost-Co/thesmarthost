import apiClient from './apiClient'
import type {
  AutomationSettingsResponse,
  AutomationTasksResponse,
  AutomationTaskResponse,
  AutomationTaskCountsResponse,
  UpdateSettingsPayload,
  ApproveTaskPayload,
} from './types/automation'

// Settings
export function getAutomationSettings(): Promise<AutomationSettingsResponse> {
  return apiClient<AutomationSettingsResponse>('/automations/settings')
}

export function updateAutomationSettings(data: UpdateSettingsPayload): Promise<AutomationSettingsResponse> {
  return apiClient<AutomationSettingsResponse>('/automations/settings', {
    method: 'PUT',
    body: data,
  })
}

// Tasks
export function getAutomationTasks(params?: {
  status?: string
  type?: string
  limit?: number
  offset?: number
}): Promise<AutomationTasksResponse> {
  const searchParams = new URLSearchParams()
  if (params?.status) searchParams.set('status', params.status)
  if (params?.type) searchParams.set('type', params.type)
  if (params?.limit) searchParams.set('limit', params.limit.toString())
  if (params?.offset) searchParams.set('offset', params.offset.toString())
  const qs = searchParams.toString()
  return apiClient<AutomationTasksResponse>(`/automations/tasks${qs ? `?${qs}` : ''}`)
}

export function getAutomationTaskCounts(type?: string): Promise<AutomationTaskCountsResponse> {
  const qs = type ? `?type=${type}` : ''
  return apiClient<AutomationTaskCountsResponse>(`/automations/tasks/counts${qs}`)
}

export function getAutomationTaskById(taskId: string): Promise<AutomationTaskResponse> {
  return apiClient<AutomationTaskResponse>(`/automations/tasks/${taskId}`)
}

export function approveAutomationTask(taskId: string, data?: ApproveTaskPayload): Promise<AutomationTaskResponse> {
  return apiClient<AutomationTaskResponse>(`/automations/tasks/${taskId}/approve`, {
    method: 'PATCH',
    body: data || {},
  })
}

export function rejectAutomationTask(taskId: string): Promise<AutomationTaskResponse> {
  return apiClient<AutomationTaskResponse>(`/automations/tasks/${taskId}/reject`, {
    method: 'PATCH',
  })
}

export function regenerateAutomationTask(taskId: string): Promise<{ status: string; message: string }> {
  return apiClient<{ status: string; message: string }>(`/automations/tasks/${taskId}/regenerate`, {
    method: 'POST',
  })
}

export function sendAutomationTask(taskId: string): Promise<{ status: string; message: string }> {
  return apiClient<{ status: string; message: string }>(`/automations/tasks/${taskId}/send`, {
    method: 'POST',
  })
}

export function retryAutomationTask(taskId: string): Promise<{ status: string; message: string }> {
  return apiClient<{ status: string; message: string }>(`/automations/tasks/${taskId}/retry`, {
    method: 'POST',
  })
}

export function processOneAutomationTask(taskId: string): Promise<{ status: string; message: string }> {
  return apiClient<{ status: string; message: string }>(`/automations/tasks/${taskId}/process`, {
    method: 'POST',
  })
}

// Manual triggers
export function triggerAutomationScan(params?: { startDate?: string; endDate?: string; types?: string[] }): Promise<{ status: string; message: string; data?: { created: number; skipped: number; errors: number; expired: number } }> {
  const body: Record<string, unknown> = {}
  if (params?.startDate && params?.endDate) {
    body.startDate = params.startDate
    body.endDate = params.endDate
  }
  if (params?.types && params.types.length > 0) {
    body.types = params.types
  }
  return apiClient('/automations/trigger/scan', { method: 'POST', body: Object.keys(body).length > 0 ? body : undefined })
}

export function triggerAutomationProcess(): Promise<{ status: string; message: string; data?: { processed: number; failed: number } }> {
  return apiClient('/automations/trigger/process', { method: 'POST' })
}
