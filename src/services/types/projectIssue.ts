// Types for Project Issues (cleaners report damage, maintenance, etc.)

export type IssueType = 'damage' | 'missing_item' | 'maintenance' | 'other'

export type IssueStatus = 'open' | 'acknowledged' | 'resolved'

export interface ProjectIssue {
  id: string
  projectId: string
  reportedBy: string | null
  issueType: IssueType
  description: string
  photoUrls: string[]
  photoUploadedAt: (string | null)[]
  photoTakenAt: (string | null)[]
  status: IssueStatus
  pmNotes: string | null
  createdAt: string
  resolvedAt: string | null
  // Joined fields
  reporterName: string | null
  reporterEmail: string | null
  userId?: string
  propertyId?: string
  propertyName?: string
  projectDate?: string
}

export interface CreateIssuePayload {
  reportedBy?: string | null
  issueType: IssueType
  description: string
}

export interface UpdateIssuePayload {
  issueType?: IssueType
  description?: string
  status?: IssueStatus
}

export interface IssueCounts {
  total: number
  open: number
  acknowledged: number
  resolved: number
}

// API Response Types
export interface ProjectIssueResponse {
  status: 'success' | 'failed'
  message?: string
  data: ProjectIssue
}

export interface ProjectIssuesResponse {
  status: 'success' | 'failed'
  message?: string
  data: ProjectIssue[]
}

export interface IssueCountsResponse {
  status: 'success' | 'failed'
  message?: string
  data: IssueCounts
}

export interface DeleteIssueResponse {
  status: 'success' | 'failed'
  message?: string
}

// Issue type display information
export const ISSUE_TYPE_INFO: Record<IssueType, { label: string; color: string; icon: string }> = {
  damage: { label: 'Damage', color: 'red', icon: 'exclamation-triangle' },
  missing_item: { label: 'Missing Item', color: 'amber', icon: 'question-mark-circle' },
  maintenance: { label: 'Maintenance', color: 'blue', icon: 'wrench-screwdriver' },
  other: { label: 'Other', color: 'gray', icon: 'document-text' }
}

// Issue status display information
export const ISSUE_STATUS_INFO: Record<IssueStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: 'red' },
  acknowledged: { label: 'Acknowledged', color: 'amber' },
  resolved: { label: 'Resolved', color: 'green' }
}
