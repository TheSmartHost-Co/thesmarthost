// Walkthrough Template - PM-managed reusable definition of photos to take during a walkthrough

export interface WalkthroughTemplate {
  id: string
  userId: string
  name: string
  description: string | null
  isDefault: boolean
  requiresCompletion: boolean
  createdAt: string
  updatedAt: string
  groups: WalkthroughTemplateGroup[]
  assignedProperties: AssignedProperty[]
}

export interface WalkthroughTemplateGroup {
  id: string
  templateId?: string
  name: string
  sortOrder: number
  items: WalkthroughTemplateItem[]
}

export interface WalkthroughTemplateItem {
  id: string
  groupId?: string
  name: string
  sortOrder: number
}

export interface AssignedProperty {
  assignmentId: string
  propertyId: string
  listingName: string | null
  internalName: string | null
  externalName: string | null
  assignedAt: string
}

// Upsert payload - one endpoint handles create & update
// - Omit `id` to create, include to update
// - Groups/items not in the payload are deleted (deletion-by-omission)
// - `propertyIds` is a full replacement set of assignments
export interface UpsertWalkthroughTemplatePayload {
  userId: string
  id?: string
  name: string
  description?: string | null
  requiresCompletion?: boolean
  groups: UpsertWalkthroughGroupPayload[]
  propertyIds: string[]
}

export interface UpsertWalkthroughGroupPayload {
  id?: string
  name: string
  sortOrder: number
  items: UpsertWalkthroughItemPayload[]
}

export interface UpsertWalkthroughItemPayload {
  id?: string
  name: string
  sortOrder: number
}

export interface CloneWalkthroughTemplatePayload {
  userId: string
  name: string
}

// API response wrappers

export interface WalkthroughTemplateResponse {
  status: 'success' | 'failed'
  data: WalkthroughTemplate
  message?: string
}

export interface WalkthroughTemplatesResponse {
  status: 'success' | 'failed'
  data: WalkthroughTemplate[]
  message?: string
}

export interface DeleteWalkthroughTemplateResponse {
  status: 'success' | 'failed'
  message: string
}
