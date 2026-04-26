import apiClient from './apiClient'
import type {
  CreateExpenseFilterPresetPayload,
  DeleteExpenseFilterPresetResponse,
  ExpenseFilterPresetResponse,
  ExpenseFilterPresetsResponse,
  UpdateExpenseFilterPresetPayload,
} from './types/expenseFilterPreset'

/**
 * Get all saved filter presets for the current user.
 */
export async function getFilterPresets(): Promise<ExpenseFilterPresetsResponse> {
  return apiClient<ExpenseFilterPresetsResponse>('/expense-filter-presets')
}

/**
 * Create a new filter preset.
 */
export async function createFilterPreset(
  payload: CreateExpenseFilterPresetPayload
): Promise<ExpenseFilterPresetResponse> {
  return apiClient<ExpenseFilterPresetResponse, CreateExpenseFilterPresetPayload>(
    '/expense-filter-presets',
    { method: 'POST', body: payload }
  )
}

/**
 * Update an existing preset (rename / overwrite filters / reorder).
 */
export async function updateFilterPreset(
  id: string,
  payload: UpdateExpenseFilterPresetPayload
): Promise<ExpenseFilterPresetResponse> {
  return apiClient<ExpenseFilterPresetResponse, UpdateExpenseFilterPresetPayload>(
    `/expense-filter-presets/${id}`,
    { method: 'PUT', body: payload }
  )
}

/**
 * Delete a preset.
 */
export async function deleteFilterPreset(
  id: string
): Promise<DeleteExpenseFilterPresetResponse> {
  return apiClient<DeleteExpenseFilterPresetResponse>(
    `/expense-filter-presets/${id}`,
    { method: 'DELETE' }
  )
}
