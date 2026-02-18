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
  bookingId?: string | null
  cleanerId?: string | null
  checklistId?: string | null
  scheduledDate: string          // ISO date string (YYYY-MM-DD)
  checkoutTime?: string | null   // Time string (HH:MM:SS)
  checkinTime?: string | null    // Time string (HH:MM:SS)
  estimatedDurationMinutes?: number | null
  actualStart?: string | null    // ISO timestamp
  actualEnd?: string | null      // ISO timestamp
  guestCount?: number | null
  isSameDayTurnover: boolean
  status: CleaningProjectStatus
  cleanerAccepted?: boolean | null  // null=awaiting, true=accepted, false=declined
  pmNotes?: string | null
  cleanerNotes?: string | null
  source: 'manual' | 'hostaway' | 'ical'
  createdAt: string
  updatedAt?: string | null
  // Joined data from related tables
  propertyName?: string
  propertyAddress?: string
  googleMapsUrl?: string | null  // Google Maps link from backend
  cleanerName?: string
  cleanerEmail?: string
  cleanerPhone?: string
  checklistName?: string
  guestName?: string
  reservationCode?: string
  bookingCheckIn?: string
  bookingCheckOut?: string
  // Checklist progress (included when fetching single project)
  checklistProgress?: ChecklistProgress
  checklistItemsInitialized?: number  // Included on create when checklist auto-initialized
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
  bookingId?: string | null
  cleanerId?: string | null         // If null, auto-assigns default cleaner
  checklistId?: string | null       // If null, auto-assigns default checklist
  scheduledDate: string             // Required: YYYY-MM-DD
  checkoutTime?: string | null
  checkinTime?: string | null
  estimatedDurationMinutes?: number | null
  guestCount?: number | null
  isSameDayTurnover?: boolean
  pmNotes?: string | null
  source?: 'manual' | 'hostaway' | 'ical'
}

// Update payload
export interface UpdateCleaningProjectPayload {
  propertyId?: string | null
  bookingId?: string | null
  cleanerId?: string | null
  checklistId?: string | null
  scheduledDate?: string | null
  checkoutTime?: string | null
  checkinTime?: string | null
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
