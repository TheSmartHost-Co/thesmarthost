import type { CleaningProject } from './cleaningProject'

// Time Change Request entity
export interface TimeChangeRequest {
  id: string
  projectId: string
  cleanerId: string
  cleanerName?: string
  requestedProjectDate: string
  requestedProjectStartTime?: string | null
  requestedProjectEndTime?: string | null
  currentProjectDate: string
  currentProjectStartTime?: string | null
  currentProjectEndTime?: string | null
  reason?: string | null
  status: 'pending' | 'approved' | 'rejected'
  pmNotes?: string | null
  createdAt: string
  resolvedAt?: string | null
}

// List item — a request enriched with the project's property context,
// used by the manager-facing "Schedule Requests" queue.
export interface TimeChangeRequestListItem extends TimeChangeRequest {
  propertyId: string
  propertyName?: string | null
  propertyAddress?: string | null
  projectStatus?: string | null
}

// Submit payload (from cleaner)
export interface SubmitTimeChangePayload {
  cleanerId: string
  requestedProjectDate: string
  requestedProjectStartTime?: string | null
  requestedProjectEndTime?: string | null
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

export interface TimeChangeRequestListResponse {
  status: 'success' | 'failed'
  data: TimeChangeRequestListItem[]
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
