import apiClient from './apiClient'
import type {
  ProjectIssue,
  ProjectIssueResponse,
  ProjectIssuesResponse,
  CreateIssuePayload,
  UpdateIssuePayload,
  IssueCountsResponse,
  DeleteIssueResponse,
  IssueType,
  IssueStatus
} from './types/projectIssue'

// =============================================
// ISSUE CRUD OPERATIONS
// =============================================

/**
 * Get all issues for a cleaning project
 */
export function getIssuesByProject(projectId: string): Promise<ProjectIssuesResponse> {
  return apiClient<ProjectIssuesResponse>(`/cleaning-projects/${projectId}/issues`)
}

/**
 * Get a single issue by ID
 */
export function getIssueById(issueId: string): Promise<ProjectIssueResponse> {
  return apiClient<ProjectIssueResponse>(`/project-issues/${issueId}`)
}

/**
 * Create a new issue for a project
 */
export function createIssue(
  projectId: string,
  data: CreateIssuePayload
): Promise<ProjectIssueResponse> {
  return apiClient<ProjectIssueResponse, CreateIssuePayload>(
    `/cleaning-projects/${projectId}/issues`,
    {
      method: 'POST',
      body: data
    }
  )
}

/**
 * Update an issue (PM can change status, add notes)
 */
export function updateIssue(
  issueId: string,
  data: UpdateIssuePayload
): Promise<ProjectIssueResponse> {
  return apiClient<ProjectIssueResponse, UpdateIssuePayload>(
    `/project-issues/${issueId}`,
    {
      method: 'PUT',
      body: data
    }
  )
}

/**
 * Delete an issue
 */
export function deleteIssue(issueId: string): Promise<DeleteIssueResponse> {
  return apiClient<DeleteIssueResponse>(`/project-issues/${issueId}`, {
    method: 'DELETE'
  })
}

// =============================================
// ISSUE WORKFLOW ACTIONS
// =============================================

/**
 * PM acknowledges an issue
 */
export function acknowledgeIssue(
  issueId: string
): Promise<ProjectIssueResponse> {
  return apiClient<ProjectIssueResponse>(
    `/project-issues/${issueId}/acknowledge`,
    {
      method: 'POST'
    }
  )
}

/**
 * Mark an issue as resolved
 */
export function resolveIssue(
  issueId: string
): Promise<ProjectIssueResponse> {
  return apiClient<ProjectIssueResponse>(
    `/project-issues/${issueId}/resolve`,
    {
      method: 'POST'
    }
  )
}

// =============================================
// PHOTO MANAGEMENT
// =============================================

/**
 * Upload photos to an issue (supports multiple files)
 * @param issueId - The issue ID
 * @param files - Array of photo files to upload (max 5)
 */
export async function uploadIssuePhotos(
  issueId: string,
  files: File[]
): Promise<ProjectIssueResponse> {
  const formData = new FormData()
  files.forEach(file => {
    formData.append('photos', file)
  })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
  const response = await fetch(`${baseUrl}/project-issues/${issueId}/photos`, {
    method: 'POST',
    body: formData,
    credentials: 'include'
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }))
    throw new Error(error.message || 'Failed to upload photos')
  }

  return response.json()
}

/**
 * Delete a specific photo from an issue
 * @param issueId - The issue ID
 * @param photoIndex - The index of the photo in the photoUrls array
 */
export function deleteIssuePhoto(
  issueId: string,
  photoIndex: number
): Promise<ProjectIssueResponse> {
  return apiClient<ProjectIssueResponse>(
    `/project-issues/${issueId}/photos/${photoIndex}`,
    {
      method: 'DELETE'
    }
  )
}

// =============================================
// DASHBOARD QUERIES
// =============================================

/**
 * Get all open issues for a PM (dashboard view)
 */
export function getOpenIssues(userId: string): Promise<ProjectIssuesResponse> {
  return apiClient<ProjectIssuesResponse>(`/project-issues/open?userId=${userId}`)
}

/**
 * Get ALL issues for a PM (global issues modal - includes resolved)
 */
export function getAllIssues(userId: string): Promise<ProjectIssuesResponse> {
  return apiClient<ProjectIssuesResponse>(`/project-issues/all?userId=${userId}`)
}

/**
 * Get all issues for a specific property
 */
export function getIssuesByProperty(propertyId: string, userId: string): Promise<ProjectIssuesResponse> {
  return apiClient<ProjectIssuesResponse>(`/properties/${propertyId}/issues?userId=${userId}`)
}

/**
 * Get issue counts by status for a project
 */
export function getIssueCounts(projectId: string): Promise<IssueCountsResponse> {
  return apiClient<IssueCountsResponse>(`/cleaning-projects/${projectId}/issues/counts`)
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Get display information for an issue type
 */
export function getIssueTypeDisplay(issueType: IssueType): { label: string; color: string } {
  const typeMap: Record<IssueType, { label: string; color: string }> = {
    damage: { label: 'Damage', color: 'red' },
    missing_item: { label: 'Missing Item', color: 'amber' },
    maintenance: { label: 'Maintenance', color: 'blue' },
    other: { label: 'Other', color: 'gray' }
  }
  return typeMap[issueType] || { label: issueType, color: 'gray' }
}

/**
 * Get display information for an issue status
 */
export function getIssueStatusDisplay(status: IssueStatus): { label: string; color: string } {
  const statusMap: Record<IssueStatus, { label: string; color: string }> = {
    open: { label: 'Open', color: 'red' },
    acknowledged: { label: 'Acknowledged', color: 'amber' },
    resolved: { label: 'Resolved', color: 'green' }
  }
  return statusMap[status] || { label: status, color: 'gray' }
}

/**
 * Check if an issue can be acknowledged (must be 'open')
 */
export function canAcknowledgeIssue(issue: ProjectIssue): boolean {
  return issue.status === 'open'
}

/**
 * Check if an issue can be resolved (must be 'open' or 'acknowledged')
 */
export function canResolveIssue(issue: ProjectIssue): boolean {
  return issue.status === 'open' || issue.status === 'acknowledged'
}

/**
 * Format issue created date as relative time
 */
export function formatIssueAge(createdAt: string): string {
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) {
    return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  } else if (diffDays < 7) {
    return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`
  } else {
    return created.toLocaleDateString()
  }
}

/**
 * Get the Supabase public URL for a photo
 * @param photoPath - The storage path (e.g., "userId/projectId/issues/...")
 */
export function getPhotoPublicUrl(photoPath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const bucketName = 'turnover-photos'

  // If it's already a full URL, return as-is
  if (photoPath.startsWith('http')) {
    return photoPath
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${photoPath}`
}

/**
 * Get the URL for downloading an issue photo with a baked-in timestamp watermark
 */
export function getIssuePhotoDownloadUrl(issueId: string, photoIndex: number): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
  return `${baseUrl}/project-issues/${issueId}/photos/${photoIndex}/download`
}

/**
 * Download a watermarked issue photo via fetch (handles cross-origin credentials)
 */
export async function downloadIssuePhotoWatermarked(issueId: string, photoIndex: number, filename?: string): Promise<void> {
  const url = getIssuePhotoDownloadUrl(issueId, photoIndex)
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) throw new Error('Failed to download photo')
  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename || 'issue_photo_watermarked.jpg'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}

/**
 * Get all issue type options for select dropdowns
 */
export function getIssueTypeOptions(): Array<{ value: IssueType; label: string }> {
  return [
    { value: 'damage', label: 'Damage' },
    { value: 'missing_item', label: 'Missing Item' },
    { value: 'maintenance', label: 'Maintenance Needed' },
    { value: 'other', label: 'Other' }
  ]
}
