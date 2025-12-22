// Expense Categories Service - API calls for expense category management

import apiClient from './apiClient'
import type {
  ExpenseCategoryResponse,
  ExpenseCategoriesResponse,
  DeleteExpenseCategoryResponse,
  CreateExpenseCategoryPayload,
  UpdateExpenseCategoryPayload
} from './types/expenseCategories'

/**
 * Get all expense categories for a user
 * @param userId - User ID
 * @returns Promise with expense categories array
 */
export function getCategoriesByUserId(userId: string): Promise<ExpenseCategoriesResponse> {
  return apiClient<ExpenseCategoriesResponse>(`/expense-categories/${userId}`)
}

/**
 * Get the default expense category for a user
 * @param userId - User ID
 * @returns Promise with default category
 */
export function getDefaultCategory(userId: string): Promise<ExpenseCategoryResponse> {
  return apiClient<ExpenseCategoryResponse>(`/expense-categories/default/${userId}`)
}

/**
 * Get a specific expense category by ID
 * @param id - Category ID
 * @returns Promise with category details
 */
export function getCategoryById(id: string): Promise<ExpenseCategoryResponse> {
  return apiClient<ExpenseCategoryResponse>(`/expense-categories/detail/${id}`)
}

/**
 * Create a new expense category
 * @param categoryData - Category creation payload
 * @returns Promise with created category
 */
export function createCategory(categoryData: CreateExpenseCategoryPayload): Promise<ExpenseCategoryResponse> {
  return apiClient<ExpenseCategoryResponse>('/expense-categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: categoryData,
  })
}

/**
 * Update an existing expense category
 * @param id - Category ID
 * @param updateData - Category update payload
 * @returns Promise with updated category
 */
export function updateCategory(id: string, updateData: UpdateExpenseCategoryPayload): Promise<ExpenseCategoryResponse> {
  return apiClient<ExpenseCategoryResponse>(`/expense-categories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: updateData,
  })
}

/**
 * Delete an expense category
 * @param id - Category ID
 * @returns Promise with deletion result
 */
export function deleteCategory(id: string): Promise<DeleteExpenseCategoryResponse> {
  return apiClient<DeleteExpenseCategoryResponse>(`/expense-categories/${id}`, {
    method: 'DELETE',
  })
}
