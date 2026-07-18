// Section ids + prop-group interfaces for the decomposed project-detail modal.
// State, fetches and handlers stay in ProjectDetailModal; each section receives
// a typed slice of them declared here.

import type { CleaningProject, ProjectChecklistItem } from '@/services/types/cleaningProject'
import type { TimeChangeRequest } from '@/services/types/timeChangeRequest'
import type { IssueCounts } from '@/services/types/projectIssue'
import type { Cleaner } from '@/services/types/cleaner'

export type { WalkthroughUploadTarget, OptimisticPhoto } from '@/components/walkthrough/WalkthroughAccordion'

// Order here is the render + nav order.
export const SECTION_IDS = [
  'bookings',
  'checklist',
  'photos',
  'supplies',
  'issues',
  'audit',
] as const

export type SectionId = (typeof SECTION_IDS)[number]

export interface StatusHeaderProps {
  project: CleaningProject
  statusLabel: string
  statusColor: string
  overdue: boolean
  overdueLabel: string | null
}

export interface TimeChangeRequestBannerProps {
  request: TimeChangeRequest
  hasWrite: boolean
  isResolving: boolean
  rejectionNotes: string
  onRejectionNotesChange: (notes: string) => void
  onApprove: () => void
  onReject: () => void
}

export interface PropertyCardProps {
  project: CleaningProject
}

export interface CleanerCardProps {
  project: CleaningProject
  cleaners: Cleaner[]
  hasWrite: boolean
  selectedCleanerId: string
  onSelectedCleanerIdChange: (id: string) => void
  isAssigning: boolean
  onAssign: () => void
}

export interface RelatedBookingsProps {
  project: CleaningProject
  loadingBookingId: string | null
  onViewBooking: (bookingId: string) => void
}

export interface NotesSectionProps {
  variant: 'pm' | 'cleaner'
  text: string
}

export interface ChecklistSectionProps {
  items: ProjectChecklistItem[]
  isLoading: boolean
  /** Whether the project has a checklist template linked (project.checklistId). */
  hasTemplate: boolean
  updatingItemId: string | null
  onToggleItem: (item: ProjectChecklistItem) => void
}

export interface SupplyListsSectionProps {
  count: number
  onView: () => void
}

export interface IssuesSectionProps {
  counts: IssueCounts | null
  onView: () => void
}

export interface FooterActionsProps {
  project: CleaningProject
  hasWrite: boolean
  /** Absent → the corresponding button is hidden (mirrors optional onDelete/onCancel). */
  onDeleteClick?: () => void
  onCancelClick?: () => void
  onUnbeginClick: () => void
  onOverrideClick: () => void
  onRemoveOverride: () => void
  onEditClick: () => void
  onClose: () => void
}

export interface ConfirmDialogProps {
  isOpen: boolean
  propertyName?: string | null
  busy: boolean
  onClose: () => void
  onConfirm: () => void
}

export interface OverrideConfirmProps extends ConfirmDialogProps {
  target: string
  onTargetChange: (target: string) => void
}
