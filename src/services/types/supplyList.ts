// Types for Supply Lists (cleaners request missing supplies during cleaning projects)

export type SupplyListStatus = 'pending' | 'in_progress' | 'fulfilled'

export interface SupplyListItem {
  id: string
  name: string
  quantity: number
  isPurchased: boolean
  pmNotes: string | null
  fulfilledBy: string | null
  fulfilledAt: string | null
  createdAt: string
}

export interface SupplyList {
  id: string
  projectId: string
  submittedBy: string | null
  status: SupplyListStatus
  fulfilledAt: string | null
  createdAt: string
  updatedAt: string
  // Joined fields
  submitterName: string | null
  userId: string
  propertyId: string
  propertyName: string | null
  projectDate: string
  items: SupplyListItem[]
  progress?: { totalItems: number; purchasedItems: number; percentage: number }
}

export interface CreateSupplyListPayload {
  submittedBy?: string | null
  items: { name: string; quantity?: number }[]
}

export interface UpdateSupplyListPayload {
  items?: { id: string; isPurchased?: boolean; pmNotes?: string }[]
  newItems?: { name: string; quantity?: number }[]
  removeItemIds?: string[]
  fulfilledBy?: string
}

export interface ToggleItemPayload {
  isPurchased: boolean
  fulfilledBy?: string
}

// API Response Types
export interface SupplyListResponse {
  status: 'success' | 'failed'
  message?: string
  data: SupplyList
}

export interface SupplyListsResponse {
  status: 'success' | 'failed'
  message?: string
  data: SupplyList[]
}

export interface DeleteSupplyListResponse {
  status: 'success' | 'failed'
  message?: string
}

// Status display information
export const SUPPLY_LIST_STATUS_INFO: Record<SupplyListStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'amber' },
  in_progress: { label: 'In Progress', color: 'blue' },
  fulfilled: { label: 'Fulfilled', color: 'green' },
}
