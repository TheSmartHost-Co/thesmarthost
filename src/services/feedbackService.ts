// FEEDBACK-001 — API layer for in-app feedback.

import apiClient from './apiClient'
import type {
  CreateFeedbackPayload,
  DeleteResponse,
  Feedback,
  FeedbackAccessResponse,
  FeedbackListResponse,
  FeedbackResponse,
  FeedbackStatus,
  FeedbackTagResponse,
  FeedbackTagsResponse,
  UpdateFeedbackPayload,
} from './types/feedback'

// ─── Access ────────────────────────────────────────────────

/** Whether the current user may submit, and whether they can triage. */
export async function getFeedbackAccess(): Promise<FeedbackAccessResponse> {
  return apiClient<FeedbackAccessResponse>('/feedback/access')
}

// ─── Reads ─────────────────────────────────────────────────

/** The caller's own submissions. Server-scoped — never pass a user id. */
export async function getMyFeedback(): Promise<FeedbackListResponse> {
  return apiClient<FeedbackListResponse>('/feedback/mine')
}

/** Admin backlog. Optional status filter; unknown values are ignored server-side. */
export async function getFeedbackBacklog(status?: FeedbackStatus): Promise<FeedbackListResponse> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiClient<FeedbackListResponse>(`/feedback/backlog${query}`)
}

export async function getFeedbackById(id: string): Promise<FeedbackResponse> {
  return apiClient<FeedbackResponse>(`/feedback/${id}`)
}

// ─── Writes ────────────────────────────────────────────────

export async function createFeedback(data: CreateFeedbackPayload): Promise<FeedbackResponse> {
  return apiClient<FeedbackResponse, CreateFeedbackPayload>('/feedback', {
    method: 'POST',
    body: data,
  })
}

export async function updateFeedback(
  id: string,
  data: UpdateFeedbackPayload
): Promise<FeedbackResponse> {
  return apiClient<FeedbackResponse, UpdateFeedbackPayload>(`/feedback/${id}`, {
    method: 'PATCH',
    body: data,
  })
}

/** Admin-only. */
export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
  adminNotes?: string | null
): Promise<FeedbackResponse> {
  return apiClient<FeedbackResponse, { status: FeedbackStatus; adminNotes?: string | null }>(
    `/feedback/${id}/status`,
    { method: 'PATCH', body: { status, adminNotes } }
  )
}

export async function deleteFeedback(id: string): Promise<DeleteResponse> {
  return apiClient<DeleteResponse>(`/feedback/${id}`, { method: 'DELETE' })
}

// ─── Images ────────────────────────────────────────────────

/**
 * Upload images for an existing feedback item.
 *
 * One request with the field name repeated per file, matching the backend's
 * `upload.array('photos', 5)`. apiClient detects FormData and drops
 * Content-Type so the browser sets the multipart boundary itself.
 */
export async function uploadFeedbackImages(
  id: string,
  files: File[]
): Promise<FeedbackResponse> {
  const formData = new FormData()
  files.forEach((file) => formData.append('photos', file))

  return apiClient<FeedbackResponse>(`/feedback/${id}/images`, {
    method: 'POST',
    body: formData as unknown as FeedbackResponse,
  })
}

/** Removal is by storage path, not array index — index would race. */
export async function deleteFeedbackImage(id: string, path: string): Promise<FeedbackResponse> {
  return apiClient<FeedbackResponse, { path: string }>(`/feedback/${id}/images`, {
    method: 'DELETE',
    body: { path },
  })
}

// ─── Tags ──────────────────────────────────────────────────

/** The global tag vocabulary. */
export async function getFeedbackTags(): Promise<FeedbackTagsResponse> {
  return apiClient<FeedbackTagsResponse>('/feedback-tags')
}

/**
 * Create a tag, or get back the existing one when the name already exists
 * (case-insensitive). An existing tag keeps its original colour.
 */
export async function createFeedbackTag(
  name: string,
  colorHex: string
): Promise<FeedbackTagResponse> {
  return apiClient<FeedbackTagResponse, { name: string; colorHex: string }>('/feedback-tags', {
    method: 'POST',
    body: { name, colorHex },
  })
}

// ─── Helpers ───────────────────────────────────────────────

/** Compact relative age, matching the client issues page's presentation. */
export function formatFeedbackAge(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

/** Distinct tags across a set of items, for building filter controls. */
export function collectFeedbackTags(items: Feedback[]) {
  const byId = new Map<string, { id: string; name: string; colorHex: string }>()
  for (const item of items) {
    for (const tag of item.tags) {
      if (!byId.has(tag.id)) {
        byId.set(tag.id, { id: tag.id, name: tag.name, colorHex: tag.colorHex })
      }
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
}
