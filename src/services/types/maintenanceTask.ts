// Maintenance task - work at a property born from an issue, assigned to a
// contractor, with a price-negotiation layer.

export type MaintenanceTaskStatus =
  | 'pending'
  | 'assigned'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type PricingType = 'flat' | 'hourly'

// Negotiation resting states. Declines/counters are events in offerHistory,
// not resting states: a decline resets the task to pending + awaiting_proposal.
export type PriceStatus = 'awaiting_proposal' | 'offered' | 'agreed'

export type NegotiationActor = 'pm' | 'contractor'

export interface OfferHistoryEntry {
  actor: NegotiationActor
  action: 'offer' | 'propose' | 'counter' | 'accept' | 'decline'
  amount: number | null
  pricingType: PricingType | null
  note: string | null
  at: string
}

// Booking context when the task is scheduled during an active reservation
export interface TaskDuringBooking {
  id: string
  guestName?: string | null
  checkInDate?: string
  checkOutDate?: string
  reservationCode?: string | null
}

export interface MaintenanceTask {
  id: string
  userId: string
  propertyId: string
  issueId: string
  contractorId: string | null
  title: string
  description?: string | null
  scheduledDate?: string | null
  scheduledStartTime?: string | null
  scheduledEndTime?: string | null
  estimatedDurationMinutes?: number | null
  duringBookingId?: string | null
  status: MaintenanceTaskStatus
  contractorAccepted?: boolean | null
  pricingType?: PricingType | null
  offeredAmount?: number | null
  agreedAmount?: number | null
  priceStatus: PriceStatus
  pricingLastActor?: NegotiationActor | null
  offerHistory: OfferHistoryEntry[]
  actualStart?: string | null
  actualEnd?: string | null
  pmNotes?: string | null
  contractorNotes?: string | null
  createdAt: string
  updatedAt?: string | null
  // Joined fields
  propertyName?: string
  propertyAddress?: string | null
  contractorName?: string | null
  contractorEmail?: string | null
  contractorPhone?: string | null
  contractorTrade?: string | null
  issueType?: string | null
  issueDescription?: string | null
  issueStatus?: string | null
  duringBooking?: TaskDuringBooking | null
}

// A compact task summary embedded on issues (linked task display)
export interface MaintenanceTaskSummary {
  id: string
  status: MaintenanceTaskStatus
  contractorId: string | null
  contractorName?: string | null
}

// PM-authored bullet item on a task; the contractor checks it off and can
// attach one photo. is_required gates task completion; photo_required gates
// completion for items that are required or checked off.
export interface TaskChecklistItem {
  id: string
  taskId: string
  description: string
  isRequired: boolean
  photoRequired: boolean
  sortOrder: number
  isCompleted: boolean
  completedAt?: string | null
  photoUrl?: string | null
  photoTakenAt?: string | null
  photoUploadedAt?: string | null
  createdAt: string
}

export interface TaskChecklistProgress {
  totalItems: number
  completedItems: number
  requiredItems: number
  requiredCompleted: number
  photosRequired: number
  photosUploaded: number
}

export interface CreateTaskChecklistItemPayload {
  description: string
  isRequired?: boolean
  photoRequired?: boolean
  sortOrder?: number
}

export interface UpdateTaskChecklistItemPayload {
  // PM authoring fields (blocked once the task is completed/cancelled)
  description?: string
  isRequired?: boolean
  photoRequired?: boolean
  sortOrder?: number
  // Completion toggle (contractor or PM, while the task is in progress)
  isCompleted?: boolean
}

export interface TaskChecklistResponse {
  status: 'success' | 'failed'
  data: {
    items: TaskChecklistItem[]
    progress: TaskChecklistProgress
  }
  message?: string
}

export interface TaskChecklistItemResponse {
  status: 'success' | 'failed'
  data: TaskChecklistItem
  message?: string
}

export interface DeleteTaskChecklistItemResponse {
  status: 'success' | 'failed'
  message: string
}

export interface CreateMaintenanceTaskPayload {
  issueId: string
  title: string
  description?: string
  scheduledDate?: string
  scheduledStartTime?: string
  scheduledEndTime?: string
  estimatedDurationMinutes?: number
  contractorId?: string
  pricingType?: PricingType
  offeredAmount?: number
  pmNotes?: string
  checklistItems?: CreateTaskChecklistItemPayload[]
}

export interface UpdateMaintenanceTaskPayload {
  title?: string
  description?: string
  scheduledDate?: string
  scheduledStartTime?: string
  scheduledEndTime?: string
  estimatedDurationMinutes?: number
  pmNotes?: string
}

export interface AssignContractorPayload {
  contractorId: string
  pricingType?: PricingType
  offeredAmount?: number
}

export interface MakeOfferPayload {
  pricingType: PricingType
  amount: number
  note?: string
}

export interface MaintenanceTaskFilters {
  userId: string
  status?: MaintenanceTaskStatus
  contractorId?: string | 'unassigned'
  propertyId?: string
  startDate?: string
  endDate?: string
}

// API responses
export interface MaintenanceTaskResponse {
  status: 'success' | 'failed'
  data: MaintenanceTask
  message?: string
}

export interface MaintenanceTasksResponse {
  status: 'success' | 'failed'
  data: MaintenanceTask[]
  message?: string
}

export interface MaintenanceTaskOrNullResponse {
  status: 'success' | 'failed'
  data: MaintenanceTask | null
  message?: string
}

export interface DeleteMaintenanceTaskResponse {
  status: 'success' | 'failed'
  message: string
}

export interface BookingOnDateResponse {
  status: 'success' | 'failed'
  data: {
    id: string
    guestName?: string | null
    checkInDate: string
    checkOutDate: string
    reservationCode?: string | null
    numGuests?: number | null
  } | null
  message?: string
}

export interface VacantDatesResponse {
  status: 'success' | 'failed'
  data: string[]
  message?: string
}
