// Field Value Changed Types for HostMetrics Frontend

/**
 * Booking information embedded in field change responses
 */
export interface FieldChangeBookingInfo {
  reservationCode: string
  guestName: string
  checkInDate: string
  propertyId?: string
  propertyName?: string
}

/**
 * Main Field Value Changed interface
 * Matches backend response structure
 */
export interface FieldValueChanged {
  id: string
  bookingId: string
  userId: string
  fieldName: string
  originalValue?: string
  editedValue: string
  changeReason?: string
  changedAt: string
  bookingInfo: FieldChangeBookingInfo
  changedBy?: string
}

/**
 * Payload for creating a new field value change
 */
export interface CreateFieldValueChangePayload {
  bookingId: string
  userId: string
  fieldName: string
  originalValue?: string
  editedValue: string
  changeReason?: string
}

/**
 * Payload for updating a field value change
 */
export interface UpdateFieldValueChangePayload {
  userId: string
  editedValue?: string
  changeReason?: string
}

/**
 * Payload for bulk field value change creation
 */
export interface CreateMultipleFieldChangesPayload {
  fieldChanges: CreateFieldValueChangePayload[]
}

/**
 * Field value change statistics
 */
export interface FieldChangeStats {
  totalChanges: number
  bookingsAffected: number
  fieldsChanged: number
  firstChange?: string
  latestChange?: string
}

/**
 * Most frequently changed field information
 */
export interface MostChangedField {
  fieldName: string
  changeCount: number
  affectedBookings: number
}

/**
 * Filter options for field change queries
 */
export interface FieldChangeFilters {
  bookingId?: string
  userId?: string
  limit?: number
}

/**
 * API response for single field value change
 */
export interface FieldValueChangedResponse {
  status: 'success' | 'failed'
  data: FieldValueChanged
  message?: string
}

/**
 * API response for multiple field value changes
 */
export interface FieldValueChangesResponse {
  status: 'success' | 'failed'
  data: FieldValueChanged[]
  message?: string
}

/**
 * API response for field change statistics
 */
export interface FieldChangeStatsResponse {
  status: 'success' | 'failed'
  data: FieldChangeStats
  message?: string
}

/**
 * API response for most changed fields
 */
export interface MostChangedFieldsResponse {
  status: 'success' | 'failed'
  data: MostChangedField[]
  message?: string
}

/**
 * API response for bulk field change creation
 */
export interface BulkFieldChangeResponse {
  status: 'success' | 'failed'
  data: {
    count: number
    changes: Array<{
      id: string
      bookingId: string
      fieldName: string
      editedValue: string
      changedAt: string
    }>
  }
  message?: string
}

/**
 * API response for delete operations
 */
export interface DeleteFieldChangeResponse {
  status: 'success' | 'failed'
  message: string
}

/**
 * Field edit in preview mode (before saving)
 */
export interface PreviewFieldEdit {
  bookingIndex: number
  fieldName: string
  originalValue: string
  newValue: string
  reason?: string
}