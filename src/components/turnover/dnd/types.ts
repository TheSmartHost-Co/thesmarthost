import type { CleaningProject } from '@/services/types/cleaningProject'
import type { Booking } from '@/services/types/booking'

export type DragItemType = 'project' | 'booking'

export interface ProjectDragData {
  type: 'project'
  project: CleaningProject
  previousBookingCheckOut?: string | null
  nextBookingCheckIn?: string | null
}

export interface BookingDragData {
  type: 'booking'
  booking: Booking
  numNights: number
}

export type DragItem = ProjectDragData | BookingDragData

export interface PendingDrop {
  item: DragItem
  targetDate: string
  targetCleanerId?: string | null  // only for cleaner reassign
  targetCleanerName?: string | null
  sourceDate: string
  sourceCleanerId?: string | null
}

export interface InvalidDropInfo {
  itemName: string
  targetDate: string
  reason: 'before_checkout' | 'after_checkin' | 'past_date' | 'booking_overlap' | 'date_change_not_allowed'
  boundaryDate: string
  conflictingBookingName?: string
}
