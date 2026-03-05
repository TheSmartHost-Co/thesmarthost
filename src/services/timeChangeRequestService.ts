import apiClient from './apiClient'
import type {
  SubmitTimeChangePayload,
  RejectTimeChangePayload,
  PendingTimeChangeResponse,
  TimeChangeRequestResponse,
  ApproveTimeChangeResponse,
} from './types/timeChangeRequest'

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
