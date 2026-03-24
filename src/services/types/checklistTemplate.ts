// Checklist Template - global reusable template not tied to a property
export interface ChecklistTemplate {
  id: string
  userId: string
  name: string
  description?: string | null
  tags: string[]
  requiresWalkthrough?: boolean
  createdAt: string
  updatedAt: string
  // Aggregate field
  itemCount?: number
  // Items (when fetching single template)
  items?: ChecklistTemplateItem[]
}

// Checklist Template Item - task within a template
export interface ChecklistTemplateItem {
  id: string
  templateId: string
  roomName?: string | null
  taskDescription: string
  requiresPhoto: boolean
  sortOrder: number
  createdAt: string
}

// Create template payload (supports inline items)
export interface CreateChecklistTemplatePayload {
  userId: string
  name: string
  description?: string | null
  tags?: string[]
  requiresWalkthrough?: boolean
  items?: {
    roomName?: string | null
    taskDescription: string
    requiresPhoto?: boolean
    sortOrder?: number
  }[]
}

// Update template payload
export interface UpdateChecklistTemplatePayload {
  name?: string
  description?: string | null
  tags?: string[]
  requiresWalkthrough?: boolean
}

// Template item payload
export interface ChecklistTemplateItemPayload {
  roomName?: string | null
  taskDescription: string
  requiresPhoto?: boolean
  sortOrder?: number
}

// Reorder items payload
export interface ReorderTemplateItemsPayload {
  items: { id: string; sortOrder: number }[]
}

// Duplicate template payload
export interface DuplicateTemplatePayload {
  name?: string
}

// Apply template to property payload
export interface ApplyTemplatePayload {
  propertyId: string
  name?: string
  isDefault?: boolean
}

// API Responses
export interface ChecklistTemplateResponse {
  status: 'success' | 'failed'
  data: ChecklistTemplate
  message?: string
}

export interface ChecklistTemplatesResponse {
  status: 'success' | 'failed'
  data: ChecklistTemplate[]
  message?: string
}

export interface ChecklistTemplateItemResponse {
  status: 'success' | 'failed'
  data: ChecklistTemplateItem
  message?: string
}

export interface ChecklistTemplateItemsResponse {
  status: 'success' | 'failed'
  data: ChecklistTemplateItem[]
  message?: string
}

export interface DeleteChecklistTemplateResponse {
  status: 'success' | 'failed'
  message: string
}
