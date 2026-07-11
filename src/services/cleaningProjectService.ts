import apiClient, { getAuthHeaders } from './apiClient'
import { BackendError } from './backendError'
import type {
  CleaningProject,
  CleaningProjectStatus,
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
  RescheduleProjectPayload,
  // Project checklist items
  ProjectChecklistItem,
  ProjectChecklistResponse,
  ProjectChecklistItemResponse,
  UpdateProjectChecklistItemPayload,
  InitializeChecklistPayload,
  InitializeChecklistResponse,
  ChecklistProgress,
  // Photo gallery
  ProjectPhotosResponse,
  // Walkthrough
  ProjectWalkthroughResponse,
  WalkthroughPhotoUploadResponse,
  WalkthroughPhotoDeleteResponse,
  WalkthroughPhotoBulkDeleteResponse,
  WalkthroughBulkDeleteResult,
  WalkthroughUploadOptions,
  CompleteProjectMissingGroupsError,
  // Sync (backfill)
  SyncPreviewPayload,
  SyncPreviewResponse,
  SyncApplyPayload,
  SyncApplyResponse,
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
 * Get cleaning project photos with pagination (for Photo Gallery)
 */
export function getProjectPhotos(
  userId: string,
  startDate: string,
  endDate: string,
  page: number = 1,
  limit: number = 20
): Promise<ProjectPhotosResponse> {
  const params = new URLSearchParams()
  params.append('userId', userId)
  params.append('startDate', startDate)
  params.append('endDate', endDate)
  params.append('page', String(page))
  params.append('limit', String(limit))
  return apiClient<ProjectPhotosResponse>(`/cleaning-projects/photos?${params}`)
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
 * Cancel a cleaning project (sets status to 'cancelled')
 */
export function cancelCleaningProject(
  id: string,
  userId: string
): Promise<CleaningProjectResponse> {
  return apiClient<CleaningProjectResponse, { userId: string }>(
    `/cleaning-projects/${id}/cancel`,
    {
      method: 'PATCH',
      body: { userId },
    }
  )
}

/**
 * Assign a cleaner to a project
 * Sets status to 'assigned'
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
 * Revert a project from in_progress back to confirmed
 * Clears actual_start timestamp
 */
export function unstartProject(projectId: string): Promise<CleaningProjectResponse> {
  return apiClient<CleaningProjectResponse>(`/cleaning-projects/${projectId}/unstart`, {
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

/**
 * PM hard override: set any target status, bypassing all date/status guards
 */
export function overrideCleaningProject(
  projectId: string,
  userId: string,
  targetStatus: CleaningProjectStatus
): Promise<CleaningProjectResponse> {
  return apiClient<CleaningProjectResponse, { userId: string; targetStatus: CleaningProjectStatus }>(
    `/cleaning-projects/${projectId}/override`,
    {
      method: 'POST',
      body: { userId, targetStatus },
    }
  )
}

/**
 * Remove PM override flag, restoring normal date/status guards
 */
export function removeCleaningProjectOverride(
  projectId: string,
  userId: string
): Promise<CleaningProjectResponse> {
  return apiClient<CleaningProjectResponse, { userId: string }>(
    `/cleaning-projects/${projectId}/remove-override`,
    {
      method: 'POST',
      body: { userId },
    }
  )
}

/**
 * Update a cleaning project's notes via dedicated PATCH endpoint
 * Role is auto-determined by the backend (PM → pmNotes, cleaner → cleanerNotes)
 */
export function updateProjectNotes(
  projectId: string,
  notes: string
): Promise<CleaningProjectResponse> {
  return apiClient<CleaningProjectResponse, { notes: string }>(
    `/cleaning-projects/${projectId}/notes`,
    { method: 'PATCH', body: { notes } }
  )
}

/**
 * Reschedule a cleaning project's date via dedicated PATCH endpoint
 */
export function rescheduleProjectDate(
  id: string,
  data: RescheduleProjectPayload
): Promise<CleaningProjectResponse> {
  return apiClient<CleaningProjectResponse, RescheduleProjectPayload>(
    `/cleaning-projects/${id}/date`,
    {
      method: 'PATCH',
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
 * Returns null if the project can be started, or a block reason object with
 * a translation key and optional interpolation data.
 * Checks status is 'confirmed' AND project date is today (client local date).
 */
export interface StartBlockReason {
  key: string
  data?: Record<string, string>
}

export function getStartBlockReason(project: CleaningProject): StartBlockReason | null {
  if (project.status !== 'confirmed') return { key: 'notConfirmedStatus' }

  // PM override bypasses all date checks
  if (project.pmOverride) return null

  const todayStr = new Date().toLocaleDateString('sv') // YYYY-MM-DD in local time
  const projectDateStr = project.projectDate.split('T')[0]

  if (projectDateStr > todayStr) {
    const [y, m, d] = projectDateStr.split('-').map(Number)
    const formatted = new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    })
    return { key: 'scheduledForFuture', data: { date: formatted } }
  }
  if (projectDateStr < todayStr) {
    return { key: 'datePassedSubmitRequest' }
  }
  return null
}

/**
 * Check if a project can be started (status must be 'confirmed' and date must be today)
 */
export function canStartProject(project: CleaningProject): boolean {
  return getStartBlockReason(project) === null
}

/**
 * Check if a project can be completed (status must be 'in_progress')
 */
export function canCompleteProject(project: CleaningProject): boolean {
  return project.status === 'in_progress'
}

/**
 * Check if a project can be un-started (reverted from in_progress to confirmed)
 */
export function canUnbeginProject(project: CleaningProject): boolean {
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
// PHOTO UPLOAD VALIDATION (shared by checklist + walkthrough flows)
// =============================================

export const ALLOWED_PHOTO_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
] as const

export const MAX_PHOTO_SIZE = 20 * 1024 * 1024
export const MAX_PHOTOS_PER_UPLOAD = 10
const PHOTO_EXT_RE = /\.(jpe?g|png|gif|webp|heic|heif)$/i

// Some iOS versions return empty/incorrect MIME for HEIC files — fall back to extension.
export type PhotoValidationResult = { ok: true } | { ok: false; reason: 'type' | 'size' }

export function isValidPhotoFile(file: File): PhotoValidationResult {
  const typeOk =
    (ALLOWED_PHOTO_TYPES as readonly string[]).includes(file.type) ||
    PHOTO_EXT_RE.test(file.name)
  if (!typeOk) return { ok: false, reason: 'type' }
  if (file.size > MAX_PHOTO_SIZE) return { ok: false, reason: 'size' }
  return { ok: true }
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
export function uploadProjectChecklistItemPhoto(
  projectId: string,
  itemId: string,
  file: File
): Promise<ProjectChecklistItemResponse> {
  const formData = new FormData()
  formData.append('photo', file)
  return apiClient<ProjectChecklistItemResponse, FormData>(
    `/cleaning-projects/${projectId}/checklist/${itemId}/photo`,
    { method: 'POST', body: formData }
  )
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

// ============================================
// Overdue detection utilities
// ============================================

/**
 * Check if a cleaning project is overdue (2+ hours past expected start, not yet started)
 */
export function isProjectOverdue(project: CleaningProject): boolean {
  // Never overdue if already started, completed, or cancelled
  if (['in_progress', 'completed', 'cancelled'].includes(project.status)) return false
  // Safety net: if actualStart is set, never overdue
  if (project.actualStart) return false

  const now = Date.now()
  const dateStr = project.projectDate.split('T')[0]
  const [y, m, d] = dateStr.split('-').map(Number)

  let expectedStart: Date
  if (project.projectStartTime) {
    const [h, min] = project.projectStartTime.split(':').map(Number)
    expectedStart = new Date(y, m - 1, d, h, min)
  } else {
    // No start time: use midnight of projectDate
    expectedStart = new Date(y, m - 1, d, 0, 0)
  }

  const thresholdMs = expectedStart.getTime() + 2 * 60 * 60 * 1000 // +2 hours
  return now > thresholdMs
}

/**
 * Get minutes elapsed past the overdue threshold, or null if not overdue
 */
export function getOverdueMinutes(project: CleaningProject): number | null {
  if (!isProjectOverdue(project)) return null

  const dateStr = project.projectDate.split('T')[0]
  const [y, m, d] = dateStr.split('-').map(Number)

  let expectedStart: Date
  if (project.projectStartTime) {
    const [h, min] = project.projectStartTime.split(':').map(Number)
    expectedStart = new Date(y, m - 1, d, h, min)
  } else {
    expectedStart = new Date(y, m - 1, d, 0, 0)
  }

  const thresholdMs = expectedStart.getTime() + 2 * 60 * 60 * 1000
  return Math.floor((Date.now() - thresholdMs) / 60000)
}

/**
 * Format overdue duration to human-readable string
 */
export function formatOverdueDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m overdue`
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m overdue` : `${h}h overdue`
  }
  const days = Math.floor(minutes / 1440)
  const h = Math.floor((minutes % 1440) / 60)
  return h > 0 ? `${days}d ${h}h overdue` : `${days}d overdue`
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
  const authHeaders = await getAuthHeaders()
  const response = await fetch(url, { headers: authHeaders })
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

// =============================================
// WALKTHROUGH PHOTOS
// =============================================

/**
 * Get the merged walkthrough view for a project: effective template,
 * orphaned groups (photos from a removed/swapped template), and freeform photos.
 */
export function getProjectWalkthrough(projectId: string): Promise<ProjectWalkthroughResponse> {
  return apiClient<ProjectWalkthroughResponse>(`/cleaning-projects/${projectId}/walkthrough`)
}

/**
 * Upload walkthrough photos. Three modes:
 *   - Freeform:    no opts
 *   - Group-level: opts.groupId only
 *   - Item-level:  opts.groupId + opts.itemId (itemId alone is invalid)
 */
export function uploadWalkthroughPhotos(
  projectId: string,
  files: File[],
  opts?: WalkthroughUploadOptions
): Promise<WalkthroughPhotoUploadResponse> {
  if (opts?.itemId && !opts.groupId) {
    throw new Error('uploadWalkthroughPhotos: itemId requires groupId')
  }
  const formData = new FormData()
  files.forEach(f => formData.append('photos', f))
  if (opts?.groupId) formData.append('groupId', opts.groupId)
  if (opts?.itemId) formData.append('itemId', opts.itemId)
  return apiClient<WalkthroughPhotoUploadResponse, FormData>(
    `/cleaning-projects/${projectId}/walkthrough/photos`,
    { method: 'POST', body: formData }
  )
}

/**
 * Extracts the missing group names when the walkthrough completion gate is
 * tripped by POST /cleaning-projects/:id/complete. Returns null if the error
 * is not a missing-groups error.
 */
export function getMissingGroupsFromError(err: unknown): string[] | null {
  if (!(err instanceof BackendError)) return null
  const body = err.body
  if (!body) return null
  const missing = (body as { missingGroups?: unknown }).missingGroups
  if (Array.isArray(missing) && missing.every(m => typeof m === 'string')) {
    return missing as string[]
  }
  return null
}

/**
 * Delete a walkthrough photo
 */
export function deleteWalkthroughPhoto(
  projectId: string,
  photoId: string
): Promise<WalkthroughPhotoDeleteResponse> {
  return apiClient<WalkthroughPhotoDeleteResponse>(
    `/cleaning-projects/${projectId}/walkthrough/photos/${photoId}`,
    { method: 'DELETE' }
  )
}

/**
 * Delete multiple walkthrough photos in one action.
 *
 * Tries the bulk endpoint first. If the backend hasn't deployed that route yet
 * (404), it transparently falls back to looping the existing single-delete
 * endpoint so the feature keeps working during a frontend-ahead-of-backend
 * deploy. Non-404 errors propagate. Returns which ids were deleted vs failed.
 */
export async function bulkDeleteWalkthroughPhotos(
  projectId: string,
  photoIds: string[]
): Promise<WalkthroughBulkDeleteResult> {
  if (photoIds.length === 0) return { deleted: [], failed: [] }

  try {
    const res = await apiClient<WalkthroughPhotoBulkDeleteResponse, { photoIds: string[] }>(
      `/cleaning-projects/${projectId}/walkthrough/photos/bulk-delete`,
      { method: 'POST', body: { photoIds } }
    )
    // Prefer the server's authoritative list of deleted ids; fall back to the
    // requested ids if the payload omits them.
    const deleted = Array.isArray(res.data) && res.data.length > 0 ? res.data : photoIds
    return { deleted, failed: photoIds.filter(id => !deleted.includes(id)) }
  } catch (err) {
    // Bulk route not deployed yet → degrade to per-photo deletes.
    if (err instanceof BackendError && err.status === 404) {
      const results = await Promise.allSettled(
        photoIds.map(id => deleteWalkthroughPhoto(projectId, id))
      )
      const deleted: string[] = []
      const failed: string[] = []
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value.status === 'success') deleted.push(photoIds[i])
        else failed.push(photoIds[i])
      })
      return { deleted, failed }
    }
    throw err
  }
}

/**
 * Download a watermarked walkthrough photo via fetch (handles cross-origin credentials)
 */
export async function downloadWalkthroughPhotoWatermarked(
  projectId: string,
  photoId: string,
  filename?: string
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
  const url = `${baseUrl}/cleaning-projects/${projectId}/walkthrough/photos/${photoId}/download`
  const authHeaders = await getAuthHeaders()
  const response = await fetch(url, { headers: authHeaders })
  if (!response.ok) throw new Error('Failed to download photo')
  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename || 'walkthrough_photo_watermarked.jpg'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}

// =============================================
// SYNC CLEANING (BACKFILL)
// =============================================

/**
 * Preview missing cleaning projects in a date range across local DB + PMS pulls.
 * Returns annotated candidates: each tagged 'new' / 'duplicate' / 'not_managed' / 'unmapped'.
 */
export function previewCleaningSync(payload: SyncPreviewPayload): Promise<SyncPreviewResponse> {
  return apiClient<SyncPreviewResponse, SyncPreviewPayload>(
    '/cleaning-projects/sync/preview',
    { method: 'POST', body: payload }
  )
}

/**
 * Apply a chosen subset of preview candidates — creates cleaning projects with source='backfill'.
 * Per-item failures don't abort the batch; results array reports each candidate's outcome.
 */
export function applyCleaningSync(payload: SyncApplyPayload): Promise<SyncApplyResponse> {
  return apiClient<SyncApplyResponse, SyncApplyPayload>(
    '/cleaning-projects/sync/apply',
    { method: 'POST', body: payload }
  )
}
