// Property Checklist - reusable template for a property
export interface Checklist {
  id: string
  propertyId: string
  name: string
  isDefault: boolean
  templateId?: string | null
  createdAt: string
  updatedAt?: string | null
  // Joined fields
  propertyName?: string
  propertyAddress?: string
  templateName?: string | null
  itemCount?: number
  // Items (when fetching single checklist)
  items?: ChecklistItem[]
}

// Checklist Item - task within a checklist
export interface ChecklistItem {
  id: string
  checklistId: string
  roomName?: string | null        // e.g., "Living Room", "Master Bedroom"
  taskDescription: string         // e.g., "Vacuum floor", "Change linens"
  requiresPhoto: boolean          // Whether cleaner must upload photo
  sortOrder: number               // Display order
  createdAt: string
}

// Create checklist payload
export interface CreateChecklistPayload {
  propertyId: string
  name: string
  isDefault?: boolean
}

// Update checklist payload
export interface UpdateChecklistPayload {
  name?: string
  isDefault?: boolean
}

// Create/update item payload
export interface ChecklistItemPayload {
  roomName?: string | null
  taskDescription: string
  requiresPhoto?: boolean
  sortOrder?: number
}

// Reorder items payload
export interface ReorderItemsPayload {
  items: { id: string; sortOrder: number }[]
}

// Duplicate checklist payload
export interface DuplicateChecklistPayload {
  name?: string                   // Optional new name (defaults to "X (Copy)")
  targetPropertyId?: string       // Optional: copy to different property
}

// Query parameters for list endpoint
export interface GetChecklistsParams {
  propertyId?: string
  userId?: string
}

// API Responses
export interface ChecklistResponse {
  status: 'success' | 'failed'
  data: Checklist
  message?: string
}

export interface ChecklistsResponse {
  status: 'success' | 'failed'
  data: Checklist[]
  message?: string
}

export interface ChecklistItemResponse {
  status: 'success' | 'failed'
  data: ChecklistItem
  message?: string
}

export interface ChecklistItemsResponse {
  status: 'success' | 'failed'
  data: ChecklistItem[]
  message?: string
}

export interface DeleteChecklistResponse {
  status: 'success' | 'failed'
  message: string
}
