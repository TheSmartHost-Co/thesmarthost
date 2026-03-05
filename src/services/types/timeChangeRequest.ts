import type { CleaningProject } from './cleaningProject'

// Time Change Request entity
export interface TimeChangeRequest {
  id: string
  projectId: string
  cleanerId: string
  cleanerName?: string
  requestedScheduledDate: string
  requestedCheckoutTime?: string | null
  requestedCheckinTime?: string | null
  currentScheduledDate: string
  currentCheckoutTime?: string | null
  currentCheckinTime?: string | null
  reason?: string | null
  status: 'pending' | 'approved' | 'rejected'
  pmNotes?: string | null
  createdAt: string
  resolvedAt?: string | null
}

// Submit payload (from cleaner)
export interface SubmitTimeChangePayload {
  cleanerId: string
  requestedScheduledDate: string
  requestedCheckoutTime?: string | null
  requestedCheckinTime?: string | null
  reason?: string
}

// Reject payload (from PM)
export interface RejectTimeChangePayload {
  pmNotes?: string
}

// API Responses
export interface PendingTimeChangeResponse {
  status: 'success' | 'failed'
  data: TimeChangeRequest | null
  message?: string
}

export interface TimeChangeRequestResponse {
  status: 'success' | 'failed'
  data: TimeChangeRequest
  message?: string
}

export interface ApproveTimeChangeResponse {
  status: 'success' | 'failed'
  data: {
    request: TimeChangeRequest
    project: CleaningProject
  }
  message?: string
}
