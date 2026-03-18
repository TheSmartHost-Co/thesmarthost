import apiClient from './apiClient'
import type {
  ChecklistTemplate,
  ChecklistTemplateItem,
  ChecklistTemplateResponse,
  ChecklistTemplatesResponse,
  ChecklistTemplateItemResponse,
  ChecklistTemplateItemsResponse,
  CreateChecklistTemplatePayload,
  UpdateChecklistTemplatePayload,
  ChecklistTemplateItemPayload,
  ReorderTemplateItemsPayload,
  DuplicateTemplatePayload,
  ApplyTemplatePayload,
  DeleteChecklistTemplateResponse,
} from './types/checklistTemplate'
import type { ChecklistResponse } from './types/checklist'

// =============================================
// CHECKLIST TEMPLATES
// =============================================

/**
 * Get all templates for a user
 */
export function getChecklistTemplates(userId: string): Promise<ChecklistTemplatesResponse> {
  return apiClient<ChecklistTemplatesResponse>(`/checklist-templates?userId=${userId}`)
}

/**
 * Get a single template with all its items
 */
export function getChecklistTemplateById(id: string): Promise<ChecklistTemplateResponse> {
  return apiClient<ChecklistTemplateResponse>(`/checklist-templates/${id}`)
}

/**
 * Create a new template (with optional inline items)
 */
export function createChecklistTemplate(
  data: CreateChecklistTemplatePayload
): Promise<ChecklistTemplateResponse> {
  return apiClient<ChecklistTemplateResponse, CreateChecklistTemplatePayload>(
    '/checklist-templates',
    {
      method: 'POST',
      body: data,
    }
  )
}

/**
 * Update template metadata
 */
export function updateChecklistTemplate(
  id: string,
  data: UpdateChecklistTemplatePayload
): Promise<ChecklistTemplateResponse> {
  return apiClient<ChecklistTemplateResponse, UpdateChecklistTemplatePayload>(
    `/checklist-templates/${id}`,
    {
      method: 'PUT',
      body: data,
    }
  )
}

/**
 * Delete a template
 */
export function deleteChecklistTemplate(
  id: string
): Promise<DeleteChecklistTemplateResponse> {
  return apiClient<DeleteChecklistTemplateResponse>(`/checklist-templates/${id}`, {
    method: 'DELETE',
  })
}

/**
 * Duplicate a template with all its items
 */
export function duplicateChecklistTemplate(
  id: string,
  data?: DuplicateTemplatePayload
): Promise<ChecklistTemplateResponse> {
  return apiClient<ChecklistTemplateResponse, DuplicateTemplatePayload | undefined>(
    `/checklist-templates/${id}/duplicate`,
    {
      method: 'POST',
      body: data,
    }
  )
}

/**
 * Apply template to a property (creates a property checklist)
 */
export function applyChecklistTemplate(
  id: string,
  data: ApplyTemplatePayload
): Promise<ChecklistResponse> {
  return apiClient<ChecklistResponse, ApplyTemplatePayload>(
    `/checklist-templates/${id}/apply`,
    {
      method: 'POST',
      body: data,
    }
  )
}

// =============================================
// CHECKLIST TEMPLATE ITEMS
// =============================================

/**
 * Add an item to a template
 */
export function addChecklistTemplateItem(
  templateId: string,
  data: ChecklistTemplateItemPayload
): Promise<ChecklistTemplateItemResponse> {
  return apiClient<ChecklistTemplateItemResponse, ChecklistTemplateItemPayload>(
    `/checklist-templates/${templateId}/items`,
    {
      method: 'POST',
      body: data,
    }
  )
}

/**
 * Update a template item
 */
export function updateChecklistTemplateItem(
  templateId: string,
  itemId: string,
  data: ChecklistTemplateItemPayload
): Promise<ChecklistTemplateItemResponse> {
  return apiClient<ChecklistTemplateItemResponse, ChecklistTemplateItemPayload>(
    `/checklist-templates/${templateId}/items/${itemId}`,
    {
      method: 'PUT',
      body: data,
    }
  )
}

/**
 * Delete a template item
 */
export function deleteChecklistTemplateItem(
  templateId: string,
  itemId: string
): Promise<DeleteChecklistTemplateResponse> {
  return apiClient<DeleteChecklistTemplateResponse>(
    `/checklist-templates/${templateId}/items/${itemId}`,
    {
      method: 'DELETE',
    }
  )
}

/**
 * Reorder items in a template
 */
export function reorderChecklistTemplateItems(
  templateId: string,
  data: ReorderTemplateItemsPayload
): Promise<ChecklistTemplateItemsResponse> {
  return apiClient<ChecklistTemplateItemsResponse, ReorderTemplateItemsPayload>(
    `/checklist-templates/${templateId}/items/reorder`,
    {
      method: 'PUT',
      body: data,
    }
  )
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Group template items by room name
 */
export function groupTemplateItemsByRoom(
  items: ChecklistTemplateItem[]
): Record<string, ChecklistTemplateItem[]> {
  return items.reduce(
    (acc, item) => {
      const room = item.roomName || 'General'
      if (!acc[room]) {
        acc[room] = []
      }
      acc[room].push(item)
      return acc
    },
    {} as Record<string, ChecklistTemplateItem[]>
  )
}

/**
 * Get all unique tags from a list of templates
 */
export function getAllTags(templates: ChecklistTemplate[]): string[] {
  const tagSet = new Set<string>()
  templates.forEach((t) => {
    if (t.tags) {
      t.tags.forEach((tag) => tagSet.add(tag))
    }
  })
  return Array.from(tagSet).sort()
}
