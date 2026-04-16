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
  unitCost: number | null
  totalCost: number | null
  createdAt: string
}

// Receipt summary nested in supply list response
export interface SupplyListReceipt {
  id: string
  vendorName: string | null
  total: number | null
  status: string
  appliedAt: string | null
  createdAt: string
  originalName: string
  expenseDate: string | null
}

export interface SupplyList {
  id: string
  projectId: string | null
  submittedBy: string | null
  status: SupplyListStatus
  notes: string | null
  fulfilledAt: string | null
  createdAt: string
  updatedAt: string
  // Joined fields
  submitterName: string | null
  userId: string
  propertyId: string
  propertyName: string | null
  projectDate: string | null
  items: SupplyListItem[]
  receipts?: SupplyListReceipt[]
  progress?: { totalItems: number; purchasedItems: number; percentage: number; totalCost: number }
}

export interface CreateSupplyListPayload {
  items: { name: string; quantity?: number }[]
  notes?: string
}

export interface UpdateSupplyListPayload {
  items?: { id: string; name?: string; quantity?: number; isPurchased?: boolean; pmNotes?: string }[]
  newItems?: { name: string; quantity?: number }[]
  removeItemIds?: string[]
  fulfilledBy?: string
  notes?: string
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

export interface AssignProjectResponse {
  status: 'success' | 'failed'
  message?: string
  data: SupplyList
}

export interface SupplyListSummary {
  totals: {
    totalLists: number
    pendingLists: number
    inProgressLists: number
    fulfilledLists: number
    totalItems: number
    purchasedItems: number
    totalCost: number
    totalExpensesCreated: number
    totalExpenseAmount: number
  }
  byProperty: {
    propertyId: string
    propertyName: string
    listCount: number
    itemCount: number
    totalCost: number
  }[]
}

export interface SupplyListSummaryResponse {
  status: 'success' | 'failed'
  message?: string
  data: SupplyListSummary
}

export interface AggregatedItem {
  name: string
  displayName: string
  totalQuantity: number
  totalCost: number
  listCount: number
  purchasedCount: number
  properties: string[]
}

// Status display information
export const SUPPLY_LIST_STATUS_INFO: Record<SupplyListStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'amber' },
  in_progress: { label: 'In Progress', color: 'blue' },
  fulfilled: { label: 'Fulfilled', color: 'green' },
}
