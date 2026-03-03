// Types for Supply Lists (cleaners request missing supplies during cleaning projects)

export type SupplyListStatus = 'pending' | 'fulfilled'

export interface SupplyListItem {
  id: string
  name: string
  quantity: number
  isPurchased: boolean
  pmNotes: string | null
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
  scheduledDate: string
  items: SupplyListItem[]
}

export interface CreateSupplyListPayload {
  submittedBy?: string | null
  items: { name: string; quantity?: number }[]
}

export interface UpdateSupplyListPayload {
  items?: { id: string; isPurchased?: boolean; pmNotes?: string }[]
  newItems?: { name: string; quantity?: number }[]
  removeItemIds?: string[]
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
  fulfilled: { label: 'Fulfilled', color: 'green' },
}
