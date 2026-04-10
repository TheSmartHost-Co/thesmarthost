import apiClient from './apiClient'
import type {
  WalkthroughTemplatesResponse,
  WalkthroughTemplateResponse,
  DeleteWalkthroughTemplateResponse,
  UpsertWalkthroughTemplatePayload,
  CloneWalkthroughTemplatePayload,
} from './types/walkthroughTemplate'

/**
 * List all walkthrough templates owned by a PM. The backend lazily creates
 * a "Default Walkthrough" template the first time this is called for a PM
 * who has none.
 */
export function getWalkthroughTemplates(userId: string): Promise<WalkthroughTemplatesResponse> {
  return apiClient<WalkthroughTemplatesResponse>(
    `/walkthrough-templates?userId=${encodeURIComponent(userId)}`
  )
}

/**
 * Create OR update a walkthrough template. The backend distinguishes by the
 * presence of `id` in the payload. Groups/items whose `id` is omitted are
 * deleted (deletion-by-omission), and `propertyIds` is treated as a full
 * replacement set of assignments.
 */
export function upsertWalkthroughTemplate(
  payload: UpsertWalkthroughTemplatePayload
): Promise<WalkthroughTemplateResponse> {
  return apiClient<WalkthroughTemplateResponse, UpsertWalkthroughTemplatePayload>(
    '/walkthrough-templates',
    { method: 'POST', body: payload }
  )
}

/**
 * Deep-copy a walkthrough template (groups + items). Clones always have
 * isDefault=false and no property assignments.
 */
export function cloneWalkthroughTemplate(
  templateId: string,
  payload: CloneWalkthroughTemplatePayload
): Promise<WalkthroughTemplateResponse> {
  return apiClient<WalkthroughTemplateResponse, CloneWalkthroughTemplatePayload>(
    `/walkthrough-templates/${templateId}/clone`,
    { method: 'POST', body: payload }
  )
}

/**
 * Delete a walkthrough template. The default template cannot be deleted
 * (backend returns 403).
 */
export function deleteWalkthroughTemplate(
  templateId: string,
  userId: string
): Promise<DeleteWalkthroughTemplateResponse> {
  return apiClient<DeleteWalkthroughTemplateResponse>(
    `/walkthrough-templates/${templateId}?userId=${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  )
}
