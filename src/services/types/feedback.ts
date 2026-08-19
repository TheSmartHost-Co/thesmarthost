// FEEDBACK-001 — in-app feedback types.

/** Mirrors the feedback_status_check constraint in migration 043. */
export type FeedbackStatus =
  | 'open'
  | 'in_review'
  | 'planned'
  | 'in_progress'
  | 'done'
  | 'declined'
  | 'cancelled'

/** Board/column order for the backlog and the status filter pills. */
export const FEEDBACK_STATUSES: FeedbackStatus[] = [
  'open',
  'in_review',
  'planned',
  'in_progress',
  'done',
  'declined',
  'cancelled',
]

/** Statuses that stamp resolved_at server-side. */
export const TERMINAL_FEEDBACK_STATUSES: FeedbackStatus[] = ['done', 'declined', 'cancelled']

/**
 * Badge colours only — labels come from the `feedback` i18n namespace, never
 * from here, so the three locales stay authoritative for copy.
 */
export const FEEDBACK_STATUS_COLORS: Record<FeedbackStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_review: 'bg-purple-100 text-purple-800',
  planned: 'bg-indigo-100 text-indigo-800',
  in_progress: 'bg-amber-100 text-amber-800',
  done: 'bg-green-100 text-green-800',
  declined: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export interface FeedbackTag {
  id: string
  name: string
  colorHex: string
  createdBy: string | null
  createdAt?: string
  updatedAt?: string
}

export interface FeedbackImage {
  /** Storage object path — the durable identifier. */
  path: string
  name: string
  mimeType: string
  size: number
  uploadedAt: string
  /**
   * Ephemeral signed URL minted per request by the backend (1-hour TTL).
   * Never construct this client-side; the bucket is private.
   */
  url?: string | null
}

export interface Feedback {
  id: string
  authorId: string
  title: string
  description: string
  status: FeedbackStatus
  /** Route captured automatically at submit time. */
  pagePath: string | null
  images: FeedbackImage[]
  tags: FeedbackTag[]
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  /** Backlog (admin) responses only. */
  authorName?: string
  authorRole?: string
  adminNotes?: string | null
}

/** A tag the user typed that doesn't exist yet, with their chosen colour. */
export interface NewFeedbackTag {
  name: string
  colorHex: string
}

export interface CreateFeedbackPayload {
  title: string
  description: string
  pagePath?: string
  tagIds?: string[]
  newTags?: NewFeedbackTag[]
}

export interface UpdateFeedbackPayload {
  title?: string
  description?: string
  tagIds?: string[]
  newTags?: NewFeedbackTag[]
}

export interface FeedbackAccess {
  canSubmit: boolean
  isAdmin: boolean
}

interface BaseResponse {
  status: 'success' | 'failed'
  message?: string
}

export interface FeedbackResponse extends BaseResponse {
  data: Feedback
}

export interface FeedbackListResponse extends BaseResponse {
  data: Feedback[]
}

export interface FeedbackAccessResponse extends BaseResponse {
  data: FeedbackAccess
}

export interface FeedbackTagResponse extends BaseResponse {
  data: FeedbackTag
}

export interface FeedbackTagsResponse extends BaseResponse {
  data: FeedbackTag[]
}

export type DeleteResponse = BaseResponse
