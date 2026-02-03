import apiClient from './apiClient'
import type {
  Cleaner,
  CleanerResponse,
  CleanersResponse,
  CleanerStats,
  CleanerStatsResponse,
  CreateCleanerPayload,
  UpdateCleanerPayload,
  AssignPropertiesPayload,
  DeleteCleanerResponse,
} from './types/cleaner'

export function getCleaners(userId: string): Promise<CleanersResponse> {
  return apiClient<CleanersResponse>(`/cleaners?userId=${userId}`)
}

export function getCleanerById(id: string): Promise<CleanerResponse> {
  return apiClient<CleanerResponse>(`/cleaners/${id}`)
}

export function getCleanerStats(userId: string): Promise<CleanerStatsResponse> {
  return apiClient<CleanerStatsResponse>(`/cleaners/stats?userId=${userId}`)
}

export function createCleaner(data: CreateCleanerPayload): Promise<CleanerResponse> {
  return apiClient<CleanerResponse, CreateCleanerPayload>('/cleaners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data,
  })
}

export function updateCleaner(id: string, data: UpdateCleanerPayload): Promise<CleanerResponse> {
  return apiClient<CleanerResponse, UpdateCleanerPayload>(`/cleaners/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: data,
  })
}

export function deleteCleaner(id: string): Promise<DeleteCleanerResponse> {
  return apiClient<DeleteCleanerResponse>(`/cleaners/${id}`, {
    method: 'DELETE',
  })
}

export function assignPropertiesToCleaner(
  cleanerId: string,
  data: AssignPropertiesPayload
): Promise<CleanerResponse> {
  return apiClient<CleanerResponse, AssignPropertiesPayload>(
    `/cleaners/${cleanerId}/assign-properties`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data,
    }
  )
}

export function resendCleanerInvite(cleanerId: string): Promise<{ status: 'success' | 'failed'; message: string }> {
  return apiClient<{ status: 'success' | 'failed'; message: string }>(
    `/cleaners/${cleanerId}/resend-invite`,
    {
      method: 'POST',
    }
  )
}

// Helper: Calculate stats from cleaner list (client-side)
export function calculateCleanerStats(cleaners: Cleaner[]): CleanerStats {
  return {
    total: cleaners.length,
    active: cleaners.filter(c => c.isActive).length,
    inactive: cleaners.filter(c => !c.isActive).length,
    withAssignments: cleaners.filter(c => (c.assignedProperties?.length ?? 0) > 0).length,
  }
}
