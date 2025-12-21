// Field Values Changed Service - API calls for field value change management

import apiClient from './apiClient'
import type {
  FieldValueChanged,
  FieldValueChangedResponse,
  FieldValueChangesResponse,
  FieldChangeStatsResponse,
  MostChangedFieldsResponse,
  BulkFieldChangeResponse,
  DeleteFieldChangeResponse,
  CreateFieldValueChangePayload,
  UpdateFieldValueChangePayload,
  CreateMultipleFieldChangesPayload,
  FieldChangeFilters,
  FieldChangeStats,
  MostChangedField
} from './types/fieldValueChanged'

/**
 * Get all field changes for a booking with optional filters
 * @param filters - Filter options (bookingId or userId, limit optional)
 * @returns Promise with field changes array
 */
export async function getFieldChangesByBooking(
  filters: FieldChangeFilters
): Promise<FieldValueChangesResponse> {
  const params = new URLSearchParams()
  
  if (filters.bookingId) {
    params.append('bookingId', filters.bookingId)
  }
  if (filters.userId) {
    params.append('userId', filters.userId)
  }

  return apiClient<FieldValueChangesResponse>(`/field-values-changed?${params.toString()}`)
}

/**
 * Get all field changes by user ID
 * @param userId - User ID
 * @param limit - Optional limit (default 100)
 * @returns Promise with field changes array
 */
export async function getFieldChangesByUser(
  userId: string,
  limit = 100
): Promise<FieldValueChangesResponse> {
  return apiClient<FieldValueChangesResponse>(`/field-values-changed/user/${userId}?limit=${limit}`)
}

/**
 * Get single field change by ID
 * @param id - Field change ID
 * @returns Promise with field change details
 */
export async function getFieldChangeById(
  id: string
): Promise<FieldValueChangedResponse> {
  return apiClient<FieldValueChangedResponse>(`/field-values-changed/${id}`)
}

/**
 * Create a new field value change
 * @param data - Field change creation payload
 * @returns Promise with created field change
 */
export async function createFieldChange(
  data: CreateFieldValueChangePayload
): Promise<FieldValueChangedResponse> {
  return apiClient<FieldValueChangedResponse, CreateFieldValueChangePayload>('/field-values-changed', {
    method: 'POST',
    body: data,
  })
}

/**
 * Create multiple field changes (bulk insert during CSV processing)
 * @param data - Bulk field change creation payload
 * @returns Promise with creation summary
 */
export async function createMultipleFieldChanges(
  data: CreateMultipleFieldChangesPayload
): Promise<BulkFieldChangeResponse> {
  console.log('createMultipleFieldChanges called with:', data)
  return apiClient<BulkFieldChangeResponse, CreateMultipleFieldChangesPayload>('/field-values-changed/bulk', {
    method: 'POST',
    body: data,
  })
}

/**
 * Update an existing field change
 * @param id - Field change ID
 * @param data - Field change update payload
 * @returns Promise with updated field change
 */
export async function updateFieldChange(
  id: string,
  data: UpdateFieldValueChangePayload
): Promise<FieldValueChangedResponse> {
  return apiClient<FieldValueChangedResponse, UpdateFieldValueChangePayload>(
    `/field-values-changed/${id}`,
    {
      method: 'PUT',
      body: data,
    }
  )
}

/**
 * Delete a field change
 * @param id - Field change ID
 * @param userId - User ID for ownership validation
 * @returns Promise with success message
 */
export async function deleteFieldChange(
  id: string,
  userId: string
): Promise<DeleteFieldChangeResponse> {
  return apiClient<DeleteFieldChangeResponse, { userId: string }>(`/field-values-changed/${id}`, {
    method: 'DELETE',
    body: { userId }
  })
}

/**
 * Get field change statistics for a user
 * @param userId - User ID
 * @param bookingId - Optional booking filter
 * @returns Promise with field change statistics
 */
export async function getFieldChangeStats(
  userId: string,
  bookingId?: string
): Promise<FieldChangeStatsResponse> {
  const params = new URLSearchParams()
  params.append('userId', userId)
  
  if (bookingId) {
    params.append('bookingId', bookingId)
  }

  return apiClient<FieldChangeStatsResponse>(`/field-values-changed/stats?${params.toString()}`)
}

/**
 * Get most frequently changed fields for a user
 * @param userId - User ID
 * @returns Promise with most changed fields statistics
 */
export async function getMostChangedFields(
  userId: string
): Promise<MostChangedFieldsResponse> {
  return apiClient<MostChangedFieldsResponse>(`/field-values-changed/most-changed?userId=${userId}`)
}

/**
 * Calculate field change statistics from field changes array (client-side)
 * Useful for dashboard when you already have field changes data
 * @param changes - Array of field changes
 * @returns Field change statistics object
 */
export function calculateFieldChangeStats(changes: FieldValueChanged[]): FieldChangeStats {
  const totalChanges = changes.length
  
  if (totalChanges === 0) {
    return {
      totalChanges: 0,
      bookingsAffected: 0,
      fieldsChanged: 0
    }
  }

  const uniqueBookings = new Set(changes.map(c => c.bookingId))
  const uniqueFields = new Set(changes.map(c => c.fieldName))
  
  const dates = changes.map(c => c.changedAt).filter(Boolean).sort()
  const firstChange = dates[0] || undefined
  const latestChange = dates[dates.length - 1] || undefined

  return {
    totalChanges,
    bookingsAffected: uniqueBookings.size,
    fieldsChanged: uniqueFields.size,
    firstChange,
    latestChange
  }
}

/**
 * Group field changes by booking ID (client-side)
 * @param changes - Array of field changes
 * @returns Map of booking ID to field changes array
 */
export function groupChangesByBooking(changes: FieldValueChanged[]): Map<string, FieldValueChanged[]> {
  const grouped = new Map<string, FieldValueChanged[]>()
  
  changes.forEach(change => {
    const existing = grouped.get(change.bookingId) || []
    existing.push(change)
    grouped.set(change.bookingId, existing)
  })
  
  return grouped
}

/**
 * Group field changes by field name (client-side)
 * @param changes - Array of field changes
 * @returns Map of field name to field changes array
 */
export function groupChangesByField(changes: FieldValueChanged[]): Map<string, FieldValueChanged[]> {
  const grouped = new Map<string, FieldValueChanged[]>()
  
  changes.forEach(change => {
    const existing = grouped.get(change.fieldName) || []
    existing.push(change)
    grouped.set(change.fieldName, existing)
  })
  
  return grouped
}

/**
 * Calculate most changed fields from field changes array (client-side)
 * @param changes - Array of field changes
 * @returns Array of most changed field statistics
 */
export function calculateMostChangedFields(changes: FieldValueChanged[]): MostChangedField[] {
  const fieldStats = new Map<string, { count: number; bookings: Set<string> }>()
  
  changes.forEach(change => {
    const existing = fieldStats.get(change.fieldName) || { count: 0, bookings: new Set() }
    existing.count++
    existing.bookings.add(change.bookingId)
    fieldStats.set(change.fieldName, existing)
  })
  
  return Array.from(fieldStats.entries())
    .map(([fieldName, stats]) => ({
      fieldName,
      changeCount: stats.count,
      affectedBookings: stats.bookings.size
    }))
    .sort((a, b) => b.changeCount - a.changeCount)
}

/**
 * Filter field changes by date range (client-side)
 * @param changes - Array of field changes
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Filtered field changes array
 */
export function filterChangesByDateRange(
  changes: FieldValueChanged[], 
  startDate: string, 
  endDate: string
): FieldValueChanged[] {
  return changes.filter(change => {
    const changeDate = new Date(change.changedAt)
    const start = new Date(startDate)
    const end = new Date(endDate)
    return changeDate >= start && changeDate <= end
  })
}

/**
 * Sort field changes by changed date (client-side)
 * @param changes - Array of field changes
 * @param descending - Sort descending (newest first)
 * @returns Sorted field changes array
 */
export function sortChangesByDate(changes: FieldValueChanged[], descending = true): FieldValueChanged[] {
  return [...changes].sort((a, b) => {
    const dateA = new Date(a.changedAt)
    const dateB = new Date(b.changedAt)
    return descending ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime()
  })
}

/**
 * Format field name for display (convert snake_case to readable)
 * @param fieldName - Field name in snake_case
 * @returns Formatted field name
 */
export function formatFieldName(fieldName: string): string {
  const fieldNames: Record<string, string> = {
    nightly_rate: 'Nightly Rate',
    cleaning_fee: 'Cleaning Fee',
    total_payout: 'Total Payout',
    net_earnings: 'Net Earnings',
    sales_tax: 'Sales Tax',
    mgmt_fee: 'Management Fee',
    extra_guest_fees: 'Extra Guest Fees',
    lodging_tax: 'Lodging Tax',
    qst: 'QST',
    gst: 'GST',
    channel_fee: 'Channel Fee',
    stripe_fee: 'Stripe Fee',
    bed_linen_fee: 'Bed Linen Fee',
    reservation_code: 'Reservation Code',
    guest_name: 'Guest Name',
    check_in_date: 'Check-in Date',
    check_out_date: 'Check-out Date',
    num_nights: 'Number of Nights',
    platform: 'Platform',
    listing_name: 'Listing Name'
  }
  
  return fieldNames[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

/**
 * Check if a field name is a financial field (should be displayed with currency)
 * @param fieldName - Field name to check
 * @returns True if field is financial
 */
export function isFinancialField(fieldName: string): boolean {
  const financialFields = [
    'nightly_rate', 'cleaning_fee', 'total_payout', 'net_earnings', 
    'sales_tax', 'mgmt_fee', 'extra_guest_fees', 'lodging_tax', 
    'qst', 'gst', 'channel_fee', 'stripe_fee', 'bed_linen_fee'
  ]
  
  return financialFields.includes(fieldName)
}