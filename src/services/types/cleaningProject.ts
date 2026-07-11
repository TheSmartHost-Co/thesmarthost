// Checklist progress summary
export interface ChecklistProgress {
  totalItems: number
  completedItems: number
  photoRequired: number
  photosUploaded: number
  completionPercentage: number
}

// Cleaning Project entity - turnover management
export interface CleaningProject {
  id: string
  userId: string
  propertyId: string
  previousBookingId?: string | null
  nextBookingId?: string | null
  cleanerId?: string | null
  checklistId?: string | null
  projectDate: string            // ISO date string (YYYY-MM-DD)
  projectStartTime?: string | null // Time string (HH:MM:SS)
  projectEndTime?: string | null   // Time string (HH:MM:SS)
  estimatedDurationMinutes?: number | null
  actualStart?: string | null    // ISO timestamp
  actualEnd?: string | null      // ISO timestamp
  guestCount?: number | null
  isSameDayTurnover: boolean
  status: CleaningProjectStatus
  pmNotes?: string | null
  cleanerNotes?: string | null
  source: 'manual' | 'hostaway' | 'ical' | 'incoming' | 'webhook'
  icalEventUid?: string | null
  icalSubscriptionId?: string | null
  createdAt: string
  updatedAt?: string | null
  // Joined data from related tables
  propertyName?: string
  propertyAddress?: string
  googleMapsUrl?: string | null  // Google Maps link from backend
  // Property specifications
  propertyNumBeds?: number | null
  propertyNumBedrooms?: number | null
  propertyNumBathrooms?: number | null
  // Property WiFi & Access
  propertyWifiSsid?: string | null
  propertyWifiPassword?: string | null
  propertyAccessCodes?: string | null
  cleanerName?: string
  cleanerEmail?: string
  cleanerPhone?: string
  checklistName?: string
  previousBookingGuestName?: string
  previousBookingCheckIn?: string
  previousBookingCheckOut?: string
  nextBookingGuestName?: string
  nextBookingCheckIn?: string
  nextBookingCheckOut?: string
  // Schedule endpoint fields
  assignmentType?: 'explicit' | 'implicit'
  cleanerAccepted?: boolean
  pmOverride?: boolean
  previousBookingNumGuests?: number | null
  previousBookingHasPets?: boolean | null
  nextBookingNumGuests?: number | null
  nextBookingHasPets?: boolean | null
  // Checklist progress (included when fetching single project)
  checklistProgress?: ChecklistProgress
  checklistItemsInitialized?: number  // Included on create when checklist auto-initialized
  // Returned on update when checklist assignment changes
  checklistAutoInitialized?: number    // Set when items were auto-initialized (null → value)
  checklistChanged?: boolean           // Set when checklist was swapped (A → B)
  previousChecklistId?: string         // The old checklist ID when swapped
  // Embedded walkthrough (returned by GET /cleaning-projects/:id)
  walkthrough?: ProjectWalkthrough | null
}

// Status workflow: pending → assigned → confirmed → in_progress → completed
export type CleaningProjectStatus =
  | 'pending'      // No cleaner assigned
  | 'assigned'     // Cleaner assigned, awaiting acceptance
  | 'confirmed'    // Cleaner accepted
  | 'in_progress'  // Work started
  | 'completed'    // Work done
  | 'cancelled'    // Cancelled

// Create payload
export interface CreateCleaningProjectPayload {
  userId: string
  propertyId: string
  previousBookingId?: string | null
  nextBookingId?: string | null
  cleanerId?: string | null         // If null, auto-assigns default cleaner
  checklistId?: string | null       // If null, auto-assigns default checklist
  projectDate: string               // Required: YYYY-MM-DD
  projectStartTime?: string | null
  projectEndTime?: string | null
  estimatedDurationMinutes?: number | null
  guestCount?: number | null
  isSameDayTurnover?: boolean
  pmNotes?: string | null
  source?: 'manual' | 'hostaway' | 'ical' | 'incoming' | 'webhook'
}

// Update payload
export interface UpdateCleaningProjectPayload {
  propertyId?: string | null
  previousBookingId?: string | null
  nextBookingId?: string | null
  cleanerId?: string | null
  checklistId?: string | null
  projectDate?: string | null
  projectStartTime?: string | null
  projectEndTime?: string | null
  estimatedDurationMinutes?: number | null
  guestCount?: number | null
  isSameDayTurnover?: boolean
  pmNotes?: string | null
  cleanerNotes?: string | null
}

// Assign cleaner payload
export interface AssignCleanerPayload {
  cleanerId: string
}

// Decline project payload (optional reason)
export interface DeclineProjectPayload {
  reason?: string
}

// Complete project payload (optional notes)
export interface CompleteProjectPayload {
  notes?: string
}

// Stats for dashboard/overview
export interface CleaningProjectStats {
  total: number
  pending: number
  assigned: number
  confirmed: number
  inProgress: number
  completed: number
  cancelled: number
  unassigned: number
}

// Reschedule payload (PATCH /cleaning-projects/:id/date)
export interface RescheduleProjectPayload {
  projectDate: string              // YYYY-MM-DD
  projectStartTime?: string | null
  projectEndTime?: string | null
}

// Query parameters for list endpoint
export interface GetCleaningProjectsParams {
  userId: string
  startDate?: string   // Optional: YYYY-MM-DD
  endDate?: string     // Optional: YYYY-MM-DD
}

// API Responses
export interface CleaningProjectResponse {
  status: 'success' | 'failed'
  data: CleaningProject
  message?: string
}

export interface CleaningProjectsResponse {
  status: 'success' | 'failed'
  data: CleaningProject[]
  message?: string
}

export interface CleaningProjectStatsResponse {
  status: 'success' | 'failed'
  data: CleaningProjectStats
  message?: string
}

export interface DeleteCleaningProjectResponse {
  status: 'success' | 'failed'
  message: string
}

// =============================================
// PROJECT CHECKLIST ITEMS
// =============================================

// Project checklist item - instance of a checklist item for a specific project
export interface ProjectChecklistItem {
  id: string
  projectId: string
  checklistItemId: string
  isCompleted: boolean
  completedAt?: string | null     // ISO timestamp when completed
  photoUrl?: string | null        // URL to uploaded photo
  photoTakenAt?: string | null    // ISO timestamp from EXIF DateTimeOriginal
  photoUploadedAt?: string | null // ISO timestamp when uploaded to server
  notes?: string | null           // Cleaner notes for this item
  // Joined from checklist_items template
  roomName?: string | null
  taskDescription: string
  requiresPhoto: boolean
  sortOrder: number
}

// Update project checklist item payload
export interface UpdateProjectChecklistItemPayload {
  isCompleted?: boolean
  notes?: string | null
}

// Initialize checklist payload
export interface InitializeChecklistPayload {
  force?: boolean   // If true, delete existing items and re-initialize
}

// Get project checklist response
export interface ProjectChecklistResponse {
  status: 'success' | 'failed'
  data: {
    items: ProjectChecklistItem[]
    progress: ChecklistProgress
  }
  message?: string
}

// Single project checklist item response
export interface ProjectChecklistItemResponse {
  status: 'success' | 'failed'
  data: ProjectChecklistItem
  message?: string
}

// Initialize checklist response
export interface InitializeChecklistResponse {
  status: 'success' | 'failed'
  data: {
    initialized: number
    total: number
  }
  message?: string
}

// =============================================
// PHOTO GALLERY TYPES
// =============================================

export interface ChecklistPhotoItem {
  itemId: string
  roomName: string
  taskDescription: string
  photoUrl: string
  photoTakenAt: string | null
  photoUploadedAt: string | null
}

export interface IssuePhotoItem {
  issueId: string
  issueType: string
  description: string
  status: string
  photoUrls: string[]
  photoUploadedAt: string | null
  photoTakenAt: string | null
}

export interface ProjectWithPhotos {
  projectId: string
  projectDate: string
  projectStartTime: string | null
  projectEndTime: string | null
  status: CleaningProjectStatus
  propertyName: string
  propertyAddress: string
  cleanerName: string
  checklistPhotos: ChecklistPhotoItem[]
  issuePhotos: IssuePhotoItem[]
  walkthroughPhotos: WalkthroughPhotoItem[]
  totalPhotos: number
}

// =============================================
// WALKTHROUGH TYPES
// =============================================

// A single walkthrough photo. Photos can attach at one of three levels:
//   - Item-level:  groupId + itemId both set
//   - Group-level: groupId set, itemId null
//   - Freeform:    both null
// Snapshot fields preserve labels if the PM later deletes the group/item
// or swaps the property's assigned template.
export interface WalkthroughPhoto {
  id: string
  projectId: string
  groupId: string | null
  itemId: string | null
  groupNameSnapshot: string | null
  itemNameSnapshot: string | null
  photoUrl: string
  storagePath: string
  photoTakenAt: string | null
  photoUploadedAt: string
  createdAt: string
}

// An item inside a group in the effective template for a project
export interface ProjectWalkthroughItem {
  id: string
  groupId: string
  name: string
  sortOrder: number
  photos: WalkthroughPhoto[]
}

// A group in the effective template for a project
export interface ProjectWalkthroughGroup {
  id: string
  templateId: string
  name: string
  sortOrder: number
  items: ProjectWalkthroughItem[]
  photos: WalkthroughPhoto[] // group-level photos (no specific item)
}

// The template that applies to a project's property right now
export interface EffectiveWalkthroughTemplate {
  id: string
  name: string
  description: string | null
  source: 'assigned' | 'default'
  requiresCompletion: boolean
  groups: ProjectWalkthroughGroup[]
}

// Photos whose groupId/itemId no longer match the current effective template,
// bucketed by the snapshot name they were uploaded under.
export interface OrphanedGroup {
  groupNameSnapshot: string
  photos: WalkthroughPhoto[]
}

// The merged project walkthrough view returned by GET /cleaning-projects/:id/walkthrough
// and embedded in GET /cleaning-projects/:id and GET /client-portal/cleaning-projects/:id
export interface ProjectWalkthrough {
  effectiveTemplate: EffectiveWalkthroughTemplate
  orphanedGroups: OrphanedGroup[]
  freeformPhotos: WalkthroughPhoto[]
  isComplete: boolean
}

export interface ProjectWalkthroughResponse {
  status: 'success' | 'failed'
  data: ProjectWalkthrough
  message?: string
}

// Optional upload targeting for POST /.../walkthrough/photos
// - Omit both → freeform
// - groupId only → group-level
// - groupId + itemId → item-level (itemId alone is invalid)
export interface WalkthroughUploadOptions {
  groupId?: string
  itemId?: string
}

export interface WalkthroughPhotoUploadResponse {
  status: 'success' | 'failed'
  data: WalkthroughPhoto[]
  message?: string
}

export interface WalkthroughPhotoDeleteResponse {
  status: 'success' | 'failed'
  message: string
}

// Returned by POST /cleaning-projects/:id/walkthrough/photos/bulk-delete.
// `data` is the list of deleted photo ids.
export interface WalkthroughPhotoBulkDeleteResponse {
  status: 'success' | 'failed'
  message: string
  data: string[]
}

// Aggregate outcome of a bulk delete, normalized across the bulk endpoint and
// the per-photo fallback path (used when the backend lacks the bulk route).
export interface WalkthroughBulkDeleteResult {
  deleted: string[]
  failed: string[]
}

// Returned by POST /cleaning-projects/:id/complete with 400 when the
// walkthrough gate is tripped. `missingGroups` is a list of group NAMES,
// not IDs — match back via effectiveTemplate.groups.
export interface CompleteProjectMissingGroupsError {
  status: 'failed'
  message: string
  missingGroups: string[]
}

// Used by the aggregated photo gallery endpoint
export interface WalkthroughPhotoItem {
  id: string
  projectId: string
  groupId: string | null
  itemId: string | null
  groupNameSnapshot: string | null
  itemNameSnapshot: string | null
  photoUrl: string
  photoTakenAt: string | null
  photoUploadedAt: string | null
  createdAt: string
}

export interface ProjectPhotosResponse {
  status: 'success' | 'failed'
  data: {
    projects: ProjectWithPhotos[]
    pagination: {
      page: number
      limit: number
      totalProjects: number
      totalPages: number
    }
  }
  message?: string
}

// =============================================
// SYNC CLEANING (BACKFILL)
// =============================================

export type SyncDateField = 'checkin' | 'checkout'
export type SyncSource = 'local' | 'pms'
export type SyncCandidateStatus = 'new' | 'duplicate' | 'not_managed' | 'unmapped'
export type SyncOutcome = 'created' | 'skipped' | 'failed'

export interface SyncCandidate {
  key: string
  propertyId: string | null
  propertyName: string | null
  projectDate: string            // YYYY-MM-DD
  checkInDate: string | null
  checkOutDate: string | null
  guestName: string | null
  reservationCode: string | null
  guestCount: number | null
  checkoutTime: string | null
  source: SyncSource
  pmsProvider: 'hostaway' | 'hospitable' | string | null
  externalListingId?: string | null
  previousBookingId: string | null
  rawWebhookData: { data: Record<string, unknown> } | null
  status: SyncCandidateStatus
  existingProjectId: string | null
  existingProjectStatus: string | null
  existingCleanerName?: string | null
  existingBookingId?: string | null
  // Client-side flag; when true and status==='duplicate', the apply step will
  // soft-cancel the existing record(s) before creating fresh ones.
  override?: boolean
}

export interface SyncStats {
  new: number
  duplicate: number
  notManaged: number
  unmapped: number
}

export interface SyncPreviewPayload {
  userId: string
  startDate: string  // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
  dateField: SyncDateField
  propertyIds?: string[]
  sources: SyncSource[]
}

export interface SyncPreviewResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    stats: SyncStats
    candidates: SyncCandidate[]
    warnings: string[]
    dateRange: { startDate: string; endDate: string; dateField: SyncDateField }
    sources: SyncSource[]
  }
}

export interface SyncApplyPayload {
  userId: string
  candidates: SyncCandidate[]
  createBookings?: boolean   // When true, also creates bookings for Hostaway PMS candidates
}

export interface SyncApplyResultItem {
  key: string
  outcome: SyncOutcome
  projectId?: string | null
  bookingId?: string | null
  reason?: string
  existingProjectId?: string | null
  overrode?: boolean
}

export interface SyncApplyResponse {
  status: 'success' | 'failed'
  message?: string
  data: {
    results: SyncApplyResultItem[]
    summary: { created: number; skipped: number; failed: number; total: number }
  }
}
