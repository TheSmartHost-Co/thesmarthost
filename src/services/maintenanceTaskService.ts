import apiClient from './apiClient'
import type {
  MaintenanceTaskResponse,
  MaintenanceTasksResponse,
  MaintenanceTaskOrNullResponse,
  DeleteMaintenanceTaskResponse,
  CreateMaintenanceTaskPayload,
  UpdateMaintenanceTaskPayload,
  AssignContractorPayload,
  MakeOfferPayload,
  MaintenanceTaskFilters,
  BookingOnDateResponse,
  VacantDatesResponse,
  CreateTaskChecklistItemPayload,
  UpdateTaskChecklistItemPayload,
  TaskChecklistResponse,
  TaskChecklistItemResponse,
  DeleteTaskChecklistItemResponse,
} from './types/maintenanceTask'

export function getMaintenanceTasks(filters: MaintenanceTaskFilters): Promise<MaintenanceTasksResponse> {
  const params = new URLSearchParams()
  params.append('userId', filters.userId)
  if (filters.status) params.append('status', filters.status)
  if (filters.contractorId) params.append('contractorId', filters.contractorId)
  if (filters.propertyId) params.append('propertyId', filters.propertyId)
  if (filters.startDate) params.append('startDate', filters.startDate)
  if (filters.endDate) params.append('endDate', filters.endDate)
  return apiClient<MaintenanceTasksResponse>(`/maintenance-tasks?${params.toString()}`)
}

/** Contractor portal: all tasks assigned to the authenticated contractor */
export function getMyMaintenanceTasks(): Promise<MaintenanceTasksResponse> {
  return apiClient<MaintenanceTasksResponse>('/maintenance-tasks/me')
}

/** Month-range read for the turnover calendar task cache */
export function getMaintenanceTasksForCalendar(
  startDate: string,
  endDate: string,
  propertyId?: string
): Promise<MaintenanceTasksResponse> {
  const params = new URLSearchParams({ startDate, endDate })
  if (propertyId) params.append('propertyId', propertyId)
  return apiClient<MaintenanceTasksResponse>(`/maintenance-tasks/calendar?${params.toString()}`)
}

/** The active (non-cancelled) task for an issue, or null */
export function getMaintenanceTaskByIssueId(issueId: string): Promise<MaintenanceTaskOrNullResponse> {
  return apiClient<MaintenanceTaskOrNullResponse>(`/maintenance-tasks/by-issue/${issueId}`)
}

export function getMaintenanceTaskById(id: string): Promise<MaintenanceTaskResponse> {
  return apiClient<MaintenanceTaskResponse>(`/maintenance-tasks/${id}`)
}

export function createMaintenanceTask(data: CreateMaintenanceTaskPayload): Promise<MaintenanceTaskResponse> {
  return apiClient<MaintenanceTaskResponse, CreateMaintenanceTaskPayload>('/maintenance-tasks', {
    method: 'POST',
    body: data,
  })
}

export function updateMaintenanceTask(id: string, data: UpdateMaintenanceTaskPayload): Promise<MaintenanceTaskResponse> {
  return apiClient<MaintenanceTaskResponse, UpdateMaintenanceTaskPayload>(`/maintenance-tasks/${id}`, {
    method: 'PUT',
    body: data,
  })
}

export function deleteMaintenanceTask(id: string): Promise<DeleteMaintenanceTaskResponse> {
  return apiClient<DeleteMaintenanceTaskResponse>(`/maintenance-tasks/${id}`, {
    method: 'DELETE',
  })
}

/** PM assigns (or reassigns) a contractor, optionally with an opening price */
export function assignContractorToTask(id: string, data: AssignContractorPayload): Promise<MaintenanceTaskResponse> {
  return apiClient<MaintenanceTaskResponse, AssignContractorPayload>(`/maintenance-tasks/${id}/assign`, {
    method: 'POST',
    body: data,
  })
}

/** Propose a price (from awaiting_proposal) or counter the other party's offer */
export function makeTaskOffer(id: string, data: MakeOfferPayload): Promise<MaintenanceTaskResponse> {
  return apiClient<MaintenanceTaskResponse, MakeOfferPayload>(`/maintenance-tasks/${id}/offers`, {
    method: 'POST',
    body: data,
  })
}

/** Accept the other party's standing offer — price agreed, task confirmed */
export function acceptTaskOffer(id: string): Promise<MaintenanceTaskResponse> {
  return apiClient<MaintenanceTaskResponse>(`/maintenance-tasks/${id}/offers/accept`, {
    method: 'POST',
    body: {},
  })
}

/** Walk away from the assignment (either party): contractor cleared, price reset */
export function declineTask(id: string, reason?: string): Promise<MaintenanceTaskResponse> {
  return apiClient<MaintenanceTaskResponse, { reason?: string }>(`/maintenance-tasks/${id}/decline`, {
    method: 'POST',
    body: reason ? { reason } : {},
  })
}

export function startTask(id: string): Promise<MaintenanceTaskResponse> {
  return apiClient<MaintenanceTaskResponse>(`/maintenance-tasks/${id}/start`, {
    method: 'POST',
    body: {},
  })
}

export function completeTask(id: string, contractorNotes?: string): Promise<MaintenanceTaskResponse> {
  return apiClient<MaintenanceTaskResponse, { contractorNotes?: string }>(`/maintenance-tasks/${id}/complete`, {
    method: 'POST',
    body: contractorNotes ? { contractorNotes } : {},
  })
}

/** PM cancels a non-terminal task; the linked issue reopens */
export function cancelTask(id: string, reason?: string): Promise<MaintenanceTaskResponse> {
  return apiClient<MaintenanceTaskResponse, { reason?: string }>(`/maintenance-tasks/${id}/cancel`, {
    method: 'POST',
    body: reason ? { reason } : {},
  })
}

/** Reservation-awareness preview: the booking covering a property+date, or null */
export function getBookingOnDate(propertyId: string, date: string): Promise<BookingOnDateResponse> {
  return apiClient<BookingOnDateResponse>(
    `/maintenance-tasks/properties/${propertyId}/booking-on-date?date=${encodeURIComponent(date)}`
  )
}

/** Next dates with no active reservation for a property, on/after a start date */
export function getNextVacantDates(propertyId: string, from?: string, count?: number): Promise<VacantDatesResponse> {
  const params = new URLSearchParams()
  if (from) params.append('from', from)
  if (count) params.append('count', String(count))
  const qs = params.toString()
  return apiClient<VacantDatesResponse>(
    `/maintenance-tasks/properties/${propertyId}/next-vacant-dates${qs ? `?${qs}` : ''}`
  )
}

// =============================================
// TASK CHECKLIST ITEMS
// =============================================

/** All checklist items + progress for a task */
export function getTaskChecklist(taskId: string): Promise<TaskChecklistResponse> {
  return apiClient<TaskChecklistResponse>(`/maintenance-tasks/${taskId}/checklist`)
}

/** PM: add a checklist item to a task (blocked once terminal) */
export function addTaskChecklistItem(
  taskId: string,
  data: CreateTaskChecklistItemPayload
): Promise<TaskChecklistItemResponse> {
  return apiClient<TaskChecklistItemResponse, CreateTaskChecklistItemPayload>(
    `/maintenance-tasks/${taskId}/checklist`,
    { method: 'POST', body: data }
  )
}

/**
 * Update a checklist item. PM authoring fields (description/flags/sort) are
 * blocked once the task is terminal; isCompleted toggling is allowed for the
 * assigned contractor or PM while the task is in progress.
 */
export function updateTaskChecklistItem(
  taskId: string,
  itemId: string,
  data: UpdateTaskChecklistItemPayload
): Promise<TaskChecklistItemResponse> {
  return apiClient<TaskChecklistItemResponse, UpdateTaskChecklistItemPayload>(
    `/maintenance-tasks/${taskId}/checklist/${itemId}`,
    { method: 'PUT', body: data }
  )
}

/** PM: delete a checklist item (blocked once terminal) */
export function deleteTaskChecklistItem(
  taskId: string,
  itemId: string
): Promise<DeleteTaskChecklistItemResponse> {
  return apiClient<DeleteTaskChecklistItemResponse>(
    `/maintenance-tasks/${taskId}/checklist/${itemId}`,
    { method: 'DELETE' }
  )
}

/** Upload (or replace) the photo on a checklist item — task must be in progress */
export function uploadTaskChecklistItemPhoto(
  taskId: string,
  itemId: string,
  file: File
): Promise<TaskChecklistItemResponse> {
  const formData = new FormData()
  formData.append('photo', file)
  return apiClient<TaskChecklistItemResponse, FormData>(
    `/maintenance-tasks/${taskId}/checklist/${itemId}/photo`,
    { method: 'POST', body: formData }
  )
}

/** Remove the photo from a checklist item — task must be in progress */
export function deleteTaskChecklistItemPhoto(
  taskId: string,
  itemId: string
): Promise<TaskChecklistItemResponse> {
  return apiClient<TaskChecklistItemResponse>(
    `/maintenance-tasks/${taskId}/checklist/${itemId}/photo`,
    { method: 'DELETE' }
  )
}
