import apiClient from './apiClient'
import type {
  SupplyList,
  SupplyListStatus,
  SupplyListResponse,
  SupplyListsResponse,
  CreateSupplyListPayload,
  UpdateSupplyListPayload,
  DeleteSupplyListResponse,
} from './types/supplyList'

// =============================================
// SUPPLY LIST CRUD OPERATIONS
// =============================================

/**
 * Get all supply lists for a cleaning project
 */
export function getSupplyListsByProject(projectId: string): Promise<SupplyListsResponse> {
  return apiClient<SupplyListsResponse>(`/cleaning-projects/${projectId}/supply-lists`)
}

/**
 * Get all pending supply lists for a PM (dashboard view)
 */
export function getPendingSupplyLists(userId: string): Promise<SupplyListsResponse> {
  return apiClient<SupplyListsResponse>(`/supply-lists/pending?userId=${userId}`)
}

/**
 * Get all supply lists for a user (overview page - supports optional status filter)
 */
export function getAllSupplyLists(userId: string, status?: SupplyListStatus): Promise<SupplyListsResponse> {
  const params = new URLSearchParams({ userId })
  if (status) params.append('status', status)
  return apiClient<SupplyListsResponse>(`/supply-lists?${params.toString()}`)
}

/**
 * Get a single supply list by ID
 */
export function getSupplyListById(supplyListId: string): Promise<SupplyListResponse> {
  return apiClient<SupplyListResponse>(`/supply-lists/${supplyListId}`)
}

/**
 * Create a new supply list for a project
 */
export function createSupplyList(
  projectId: string,
  data: CreateSupplyListPayload
): Promise<SupplyListResponse> {
  return apiClient<SupplyListResponse, CreateSupplyListPayload>(
    `/cleaning-projects/${projectId}/supply-lists`,
    {
      method: 'POST',
      body: data,
    }
  )
}

/**
 * Update a supply list (toggle purchased, add PM notes, add/remove items)
 */
export function updateSupplyList(
  supplyListId: string,
  data: UpdateSupplyListPayload
): Promise<SupplyListResponse> {
  return apiClient<SupplyListResponse, UpdateSupplyListPayload>(
    `/supply-lists/${supplyListId}`,
    {
      method: 'PUT',
      body: data,
    }
  )
}

/**
 * Delete a supply list
 */
export function deleteSupplyList(supplyListId: string): Promise<DeleteSupplyListResponse> {
  return apiClient<DeleteSupplyListResponse>(`/supply-lists/${supplyListId}`, {
    method: 'DELETE',
  })
}

/**
 * Mark a supply list as fulfilled (notifies cleaner)
 */
export function fulfillSupplyList(supplyListId: string): Promise<SupplyListResponse> {
  return apiClient<SupplyListResponse>(`/supply-lists/${supplyListId}/fulfill`, {
    method: 'POST',
  })
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Format supply list created date as relative time
 */
export function formatSupplyListAge(createdAt: string): string {
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 60) {
    return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  } else if (diffDays < 7) {
    return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`
  } else {
    return created.toLocaleDateString()
  }
}
