import apiClient from './apiClient'
import type {
  CleaningProject,
  CleaningProjectResponse,
  CleaningProjectsResponse,
  CleaningProjectStatsResponse,
  CreateCleaningProjectPayload,
  UpdateCleaningProjectPayload,
  AssignCleanerPayload,
  DeclineProjectPayload,
  CompleteProjectPayload,
  DeleteCleaningProjectResponse,
  GetCleaningProjectsParams,
  // Project checklist items
  ProjectChecklistItem,
  ProjectChecklistResponse,
  ProjectChecklistItemResponse,
  UpdateProjectChecklistItemPayload,
  InitializeChecklistPayload,
  InitializeChecklistResponse,
  ChecklistProgress,
} from './types/cleaningProject'

/**
 * Get all cleaning projects for a user with optional date filtering
 * @param params - userId (required), startDate and endDate (optional, YYYY-MM-DD)
 */
export function getCleaningProjects(params: GetCleaningProjectsParams): Promise<CleaningProjectsResponse> {
  const queryParams = new URLSearchParams()
  queryParams.append('userId', params.userId)
  if (params.startDate) queryParams.append('startDate', params.startDate)
  if (params.endDate) queryParams.append('endDate', params.endDate)

  return apiClient<CleaningProjectsResponse>(`/cleaning-projects?${queryParams.toString()}`)
}

/**
 * Get cleaning project statistics for a user with optional date filtering
 */
export function getCleaningProjectStats(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<CleaningProjectStatsResponse> {
  const queryParams = new URLSearchParams()
  queryParams.append('userId', userId)
  if (startDate) queryParams.append('startDate', startDate)
  if (endDate) queryParams.append('endDate', endDate)

  return apiClient<CleaningProjectStatsResponse>(`/cleaning-projects/stats?${queryParams.toString()}`)
}

/**
 * Get a single cleaning project by ID with full details
 */
export function getCleaningProjectById(id: string): Promise<CleaningProjectResponse> {
  return apiClient<CleaningProjectResponse>(`/cleaning-projects/${id}`)
}

/**
 * Create a new cleaning project
 * Auto-assigns default cleaner and checklist if not provided
 */
export function createCleaningProject(data: CreateCleaningProjectPayload): Promise<CleaningProjectResponse> {
  return apiClient<CleaningProjectResponse, CreateCleaningProjectPayload>('/cleaning-projects', {
    method: 'POST',
    body: data,
  })
}

/**
 * Update a cleaning project
 */
export function updateCleaningProject(
  id: string,
  data: UpdateCleaningProjectPayload
): Promise<CleaningProjectResponse> {
  return apiClient<CleaningProjectResponse, UpdateCleaningProjectPayload>(`/cleaning-projects/${id}`, {
    method: 'PUT',
    body: data,
  })
}

/**
 * Delete a cleaning project
 */
export function deleteCleaningProject(id: string): Promise<DeleteCleaningProjectResponse> {
  return apiClient<DeleteCleaningProjectResponse>(`/cleaning-projects/${id}`, {
    method: 'DELETE',
  })
}

/**
 * Assign a cleaner to a project
 * Sets status to 'assigned' and cleaner_accepted to null (awaiting)
 */
export function assignCleanerToProject(
  projectId: string,
  data: AssignCleanerPayload
): Promise<CleaningProjectResponse> {
  return apiClient<CleaningProjectResponse, AssignCleanerPayload>(
    `/cleaning-projects/${projectId}/assign`,
    {
      method: 'POST',
      body: data,
    }
  )
}

/**
 * Cleaner accepts the assignment
 * Transitions: assigned → confirmed
 */
export function acceptProject(projectId: string): Promise<CleaningProjectResponse> {
  return apiClient<CleaningProjectResponse>(`/cleaning-projects/${projectId}/accept`, {
    method: 'POST',
  })
}

/**
 * Cleaner declines the assignment
 * Transitions: assigned → pending (cleaner unassigned)
 */
export function declineProject(
  projectId: string,
  data?: DeclineProjectPayload
): Promise<CleaningProjectResponse> {
  return apiClient<CleaningProjectResponse, DeclineProjectPayload | undefined>(
    `/cleaning-projects/${projectId}/decline`,
    {
      method: 'POST',
      body: data,
    }
  )
}

/**
 * Cleaner starts work on the project
 * Transitions: confirmed → in_progress
 * Sets actual_start timestamp
 */
export function startProject(projectId: string): Promise<CleaningProjectResponse> {
  return apiClient<CleaningProjectResponse>(`/cleaning-projects/${projectId}/start`, {
    method: 'POST',
  })
}

/**
 * Cleaner completes the project
 * Transitions: in_progress → completed
 * Sets actual_end timestamp
 */
export function completeProject(
  projectId: string,
  data?: CompleteProjectPayload
): Promise<CleaningProjectResponse> {
  return apiClient<CleaningProjectResponse, CompleteProjectPayload | undefined>(
    `/cleaning-projects/${projectId}/complete`,
    {
      method: 'POST',
      body: data,
    }
  )
}

// ============================================
// Helper functions for client-side operations
// ============================================

/**
 * Get status display information (label and color)
 */
export function getStatusDisplay(status: CleaningProject['status']): { label: string; color: string } {
  const statusMap: Record<CleaningProject['status'], { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'yellow' },
    assigned: { label: 'Assigned', color: 'blue' },
    confirmed: { label: 'Confirmed', color: 'indigo' },
    in_progress: { label: 'In Progress', color: 'purple' },
    completed: { label: 'Completed', color: 'green' },
    cancelled: { label: 'Cancelled', color: 'gray' },
  }
  return statusMap[status] || { label: status, color: 'gray' }
}

/**
 * Check if a project can be started (status must be 'confirmed')
 */
export function canStartProject(project: CleaningProject): boolean {
  return project.status === 'confirmed'
}

/**
 * Check if a project can be completed (status must be 'in_progress')
 */
export function canCompleteProject(project: CleaningProject): boolean {
  return project.status === 'in_progress'
}

/**
 * Check if a project can be accepted/declined (status must be 'assigned')
 */
export function canRespondToAssignment(project: CleaningProject): boolean {
  return project.status === 'assigned' && project.cleanerId !== null
}

/**
 * Format duration in minutes to human readable string
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '-'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins}m`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

/**
 * Calculate actual duration from start and end timestamps
 */
export function calculateActualDuration(
  actualStart: string | null | undefined,
  actualEnd: string | null | undefined
): number | null {
  if (!actualStart || !actualEnd) return null
  const start = new Date(actualStart)
  const end = new Date(actualEnd)
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60)) // minutes
}

// =============================================
// PROJECT CHECKLIST ITEMS
// =============================================

/**
 * Get all checklist items for a project with progress summary
 */
export function getProjectChecklist(projectId: string): Promise<ProjectChecklistResponse> {
  return apiClient<ProjectChecklistResponse>(`/cleaning-projects/${projectId}/checklist`)
}

/**
 * Initialize checklist items from the project's checklist template
 * Usually auto-done on project creation, but can be triggered manually
 * @param force - If true, delete existing items and re-initialize
 */
export function initializeProjectChecklist(
  projectId: string,
  data?: InitializeChecklistPayload
): Promise<InitializeChecklistResponse> {
  return apiClient<InitializeChecklistResponse, InitializeChecklistPayload | undefined>(
    `/cleaning-projects/${projectId}/checklist/initialize`,
    {
      method: 'POST',
      body: data,
    }
  )
}

/**
 * Update a project checklist item (mark complete, add notes)
 */
export function updateProjectChecklistItem(
  projectId: string,
  itemId: string,
  data: UpdateProjectChecklistItemPayload
): Promise<ProjectChecklistItemResponse> {
  return apiClient<ProjectChecklistItemResponse, UpdateProjectChecklistItemPayload>(
    `/cleaning-projects/${projectId}/checklist/${itemId}`,
    {
      method: 'PUT',
      body: data,
    }
  )
}

/**
 * Upload a photo for a project checklist item
 * @param projectId - The cleaning project ID
 * @param itemId - The project checklist item ID
 * @param file - The photo file to upload
 */
export async function uploadProjectChecklistItemPhoto(
  projectId: string,
  itemId: string,
  file: File
): Promise<ProjectChecklistItemResponse> {
  const formData = new FormData()
  formData.append('photo', file)

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
  const response = await fetch(
    `${baseUrl}/cleaning-projects/${projectId}/checklist/${itemId}/photo`,
    {
      method: 'POST',
      body: formData,
      credentials: 'include',
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }))
    throw new Error(error.message || 'Failed to upload photo')
  }

  return response.json()
}

/**
 * Delete the photo for a project checklist item
 */
export function deleteProjectChecklistItemPhoto(
  projectId: string,
  itemId: string
): Promise<DeleteCleaningProjectResponse> {
  return apiClient<DeleteCleaningProjectResponse>(
    `/cleaning-projects/${projectId}/checklist/${itemId}/photo`,
    {
      method: 'DELETE',
    }
  )
}

// =============================================
// PROJECT CHECKLIST HELPER FUNCTIONS
// =============================================

/**
 * Group checklist items by room name
 */
export function groupChecklistItemsByRoom(
  items: ProjectChecklistItem[]
): Record<string, ProjectChecklistItem[]> {
  return items.reduce((acc, item) => {
    const room = item.roomName || 'General'
    if (!acc[room]) {
      acc[room] = []
    }
    acc[room].push(item)
    return acc
  }, {} as Record<string, ProjectChecklistItem[]>)
}

/**
 * Get unique room names from checklist items
 */
export function getChecklistRoomNames(items: ProjectChecklistItem[]): string[] {
  const rooms = new Set<string>()
  items.forEach(item => {
    rooms.add(item.roomName || 'General')
  })
  return Array.from(rooms).sort()
}

/**
 * Calculate completion percentage from progress
 */
export function getCompletionPercentage(progress: ChecklistProgress): number {
  if (progress.totalItems === 0) return 0
  return Math.round((progress.completedItems / progress.totalItems) * 100)
}

/**
 * Check if all required photos are uploaded
 */
export function areAllPhotosUploaded(progress: ChecklistProgress): boolean {
  return progress.photoRequired === 0 || progress.photosUploaded >= progress.photoRequired
}

/**
 * Get items that still need photos
 */
export function getItemsNeedingPhotos(items: ProjectChecklistItem[]): ProjectChecklistItem[] {
  return items.filter(item => item.requiresPhoto && !item.photoUrl)
}

/**
 * Get incomplete items
 */
export function getIncompleteItems(items: ProjectChecklistItem[]): ProjectChecklistItem[] {
  return items.filter(item => !item.isCompleted)
}

/**
 * Format a time string (HH:MM:SS or HH:MM) to 12-hour format with AM/PM
 * @param time - Time string in 24-hour format (e.g., "14:30:00" or "14:30")
 * @returns Formatted time string (e.g., "2:30 PM") or null if no time provided
 */
export function formatTime(time: string | null | undefined): string | null {
  if (!time) return null
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

/**
 * Get the URL for downloading a checklist item photo with a baked-in timestamp watermark
 */
export function getChecklistPhotoDownloadUrl(projectId: string, itemId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
  return `${baseUrl}/cleaning-projects/${projectId}/checklist/${itemId}/photo/download`
}

/**
 * Download a watermarked checklist photo via fetch (handles cross-origin credentials)
 */
export async function downloadChecklistPhotoWatermarked(projectId: string, itemId: string, filename?: string): Promise<void> {
  const url = getChecklistPhotoDownloadUrl(projectId, itemId)
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) throw new Error('Failed to download photo')
  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename || 'photo_watermarked.jpg'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}
