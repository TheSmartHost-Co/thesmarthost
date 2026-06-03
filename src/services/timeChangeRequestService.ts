import apiClient from './apiClient'
import type {
  SubmitTimeChangePayload,
  RejectTimeChangePayload,
  PendingTimeChangeResponse,
  TimeChangeRequestResponse,
  TimeChangeRequestListResponse,
  ApproveTimeChangeResponse,
} from './types/timeChangeRequest'

export type TimeChangeStatusFilter = 'pending' | 'approved' | 'rejected'

/**
 * Submit a time change request for a cleaning project
 */
export function submitTimeChangeRequest(
  projectId: string,
  payload: SubmitTimeChangePayload
): Promise<TimeChangeRequestResponse> {
  return apiClient<TimeChangeRequestResponse, SubmitTimeChangePayload>(
    `/cleaning-projects/${projectId}/time-change-requests`,
    {
      method: 'POST',
      body: payload,
    }
  )
}

/**
 * Get the pending time change request for a project (if any)
 */
export function getPendingTimeChangeRequest(
  projectId: string
): Promise<PendingTimeChangeResponse> {
  return apiClient<PendingTimeChangeResponse>(
    `/cleaning-projects/${projectId}/time-change-requests/pending`
  )
}

/**
 * List all time change requests across a manager's projects.
 * Omit `status` to fetch every status (pending + approved + rejected).
 */
export function listTimeChangeRequests(
  userId: string,
  status?: TimeChangeStatusFilter
): Promise<TimeChangeRequestListResponse> {
  const params = new URLSearchParams({ userId })
  if (status) params.set('status', status)
  return apiClient<TimeChangeRequestListResponse>(
    `/cleaning-projects/time-change-requests?${params.toString()}`
  )
}

/**
 * PM approves a time change request — applies new times to the project
 */
export function approveTimeChangeRequest(
  projectId: string,
  requestId: string
): Promise<ApproveTimeChangeResponse> {
  return apiClient<ApproveTimeChangeResponse>(
    `/cleaning-projects/${projectId}/time-change-requests/${requestId}/approve`,
    {
      method: 'POST',
    }
  )
}

/**
 * PM rejects a time change request
 */
export function rejectTimeChangeRequest(
  projectId: string,
  requestId: string,
  payload?: RejectTimeChangePayload
): Promise<TimeChangeRequestResponse> {
  return apiClient<TimeChangeRequestResponse, RejectTimeChangePayload | undefined>(
    `/cleaning-projects/${projectId}/time-change-requests/${requestId}/reject`,
    {
      method: 'POST',
      body: payload,
    }
  )
}
