// Checklist Template - global reusable template not tied to a property
export interface ChecklistTemplate {
  id: string
  userId: string
  name: string
  description?: string | null
  tags: string[]
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

// Linked property (property checklist linked to a template)
export interface LinkedProperty {
  checklistId: string
  propertyId: string
  checklistName: string
  isDefault: boolean
  propertyName: string
  propertyAddress: string
}

export interface LinkedPropertiesResponse {
  status: 'success' | 'failed'
  data: LinkedProperty[]
  message?: string
}

// Unlink property payload
export interface UnlinkPropertyPayload {
  checklistId: string
  action: 'unlink' | 'delete'
}

export interface UnlinkPropertyResponse {
  status: 'success' | 'failed'
  message?: string
}

// Batch apply template payload
export interface ApplyTemplateBatchPayload {
  properties: {
    propertyId: string
    name?: string
    isDefault?: boolean
  }[]
}

export interface ApplyTemplateBatchResponse {
  status: 'success' | 'failed'
  data: {
    id: string
    propertyId: string
    name: string
    isDefault: boolean
    templateId: string
    itemCount: number
  }[]
  message?: string
}

// Propagate template changes payload
export interface PropagateTemplatePayload {
  checklistIds: string[]
}

export interface PropagateTemplateResponse {
  status: 'success' | 'failed'
  data?: { updatedCount: number }
  message?: string
}
