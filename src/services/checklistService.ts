import apiClient from './apiClient'
import type {
  Checklist,
  ChecklistItem,
  ChecklistResponse,
  ChecklistsResponse,
  ChecklistItemResponse,
  ChecklistItemsResponse,
  CreateChecklistPayload,
  UpdateChecklistPayload,
  ChecklistItemPayload,
  ReorderItemsPayload,
  DuplicateChecklistPayload,
  DeleteChecklistResponse,
  GetChecklistsParams,
} from './types/checklist'

// =============================================
// PROPERTY CHECKLISTS
// =============================================

/**
 * Get all checklists for a property or user
 * @param params - Either propertyId OR userId required
 */
export function getChecklists(params: GetChecklistsParams): Promise<ChecklistsResponse> {
  const queryParams = new URLSearchParams()
  if (params.propertyId) queryParams.append('propertyId', params.propertyId)
  if (params.userId) queryParams.append('userId', params.userId)

  return apiClient<ChecklistsResponse>(`/checklists?${queryParams.toString()}`)
}

/**
 * Get a single checklist with all its items
 */
export function getChecklistById(id: string): Promise<ChecklistResponse> {
  return apiClient<ChecklistResponse>(`/checklists/${id}`)
}

/**
 * Create a new checklist for a property
 */
export function createChecklist(data: CreateChecklistPayload): Promise<ChecklistResponse> {
  return apiClient<ChecklistResponse, CreateChecklistPayload>('/checklists', {
    method: 'POST',
    body: data,
  })
}

/**
 * Update a checklist
 */
export function updateChecklist(id: string, data: UpdateChecklistPayload): Promise<ChecklistResponse> {
  return apiClient<ChecklistResponse, UpdateChecklistPayload>(`/checklists/${id}`, {
    method: 'PUT',
    body: data,
  })
}

/**
 * Delete a checklist (cascades to items)
 */
export function deleteChecklist(id: string): Promise<DeleteChecklistResponse> {
  return apiClient<DeleteChecklistResponse>(`/checklists/${id}`, {
    method: 'DELETE',
  })
}

/**
 * Duplicate a checklist with all its items
 * Can optionally copy to a different property
 */
export function duplicateChecklist(
  id: string,
  data?: DuplicateChecklistPayload
): Promise<ChecklistResponse> {
  return apiClient<ChecklistResponse, DuplicateChecklistPayload | undefined>(
    `/checklists/${id}/duplicate`,
    {
      method: 'POST',
      body: data,
    }
  )
}

// =============================================
// CHECKLIST ITEMS
// =============================================

/**
 * Add an item to a checklist
 */
export function addChecklistItem(
  checklistId: string,
  data: ChecklistItemPayload
): Promise<ChecklistItemResponse> {
  return apiClient<ChecklistItemResponse, ChecklistItemPayload>(
    `/checklists/${checklistId}/items`,
    {
      method: 'POST',
      body: data,
    }
  )
}

/**
 * Update a checklist item
 */
export function updateChecklistItem(
  checklistId: string,
  itemId: string,
  data: ChecklistItemPayload
): Promise<ChecklistItemResponse> {
  return apiClient<ChecklistItemResponse, ChecklistItemPayload>(
    `/checklists/${checklistId}/items/${itemId}`,
    {
      method: 'PUT',
      body: data,
    }
  )
}

/**
 * Delete a checklist item
 */
export function deleteChecklistItem(
  checklistId: string,
  itemId: string
): Promise<DeleteChecklistResponse> {
  return apiClient<DeleteChecklistResponse>(`/checklists/${checklistId}/items/${itemId}`, {
    method: 'DELETE',
  })
}

/**
 * Reorder items in a checklist
 */
export function reorderChecklistItems(
  checklistId: string,
  data: ReorderItemsPayload
): Promise<ChecklistItemsResponse> {
  return apiClient<ChecklistItemsResponse, ReorderItemsPayload>(
    `/checklists/${checklistId}/items/reorder`,
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
 * Group checklist items by room name
 */
export function groupItemsByRoom(items: ChecklistItem[]): Record<string, ChecklistItem[]> {
  return items.reduce((acc, item) => {
    const room = item.roomName || 'General'
    if (!acc[room]) {
      acc[room] = []
    }
    acc[room].push(item)
    return acc
  }, {} as Record<string, ChecklistItem[]>)
}

/**
 * Get unique room names from a checklist
 */
export function getRoomNames(items: ChecklistItem[]): string[] {
  const rooms = new Set<string>()
  items.forEach(item => {
    if (item.roomName) {
      rooms.add(item.roomName)
    }
  })
  return Array.from(rooms).sort()
}

/**
 * Calculate completion percentage for checklist items
 * Used in project checklist progress tracking
 */
export function calculateCompletionPercentage(
  totalItems: number,
  completedItems: number
): number {
  if (totalItems === 0) return 0
  return Math.round((completedItems / totalItems) * 100)
}

/**
 * Count items requiring photos
 */
export function countPhotoRequired(items: ChecklistItem[]): number {
  return items.filter(item => item.requiresPhoto).length
}

/**
 * Sort items by sortOrder
 */
export function sortItems(items: ChecklistItem[]): ChecklistItem[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder)
}

/**
 * Common room name suggestions for autocomplete
 */
export const COMMON_ROOM_NAMES = [
  'Living Room',
  'Kitchen',
  'Master Bedroom',
  'Bedroom 2',
  'Bedroom 3',
  'Bathroom',
  'Master Bathroom',
  'Bathroom 2',
  'Dining Room',
  'Hallway',
  'Entrance',
  'Laundry Room',
  'Patio/Balcony',
  'Garage',
  'Outdoor Area',
  'Pool Area',
  'General',
] as const
