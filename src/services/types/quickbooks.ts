// QuickBooks Online integration — frontend types.
//
// Mirrors the backend's controllers/quickbooks.controller.js response shapes.

export type QbEntityType = 'purchase' | 'bill'

export interface QbConnection {
  connected: boolean
  id?: string
  isSandbox?: boolean
  companyName?: string | null
  currency?: string | null
  autoExport?: boolean
  defaultQbEntityType?: QbEntityType
  lastSyncAt?: string | null
  status?: 'active' | 'expired' | 'inactive' | string
  accessTokenExpiresAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface QbAccount {
  id: string
  name: string
  accountType: string
  accountSubType?: string
  fullyQualifiedName?: string
}

export interface QbAccountMapping {
  id: string
  expenseCategoryCode: string
  qbAccountId: string
  qbAccountName: string
  qbAccountType?: string | null
  createdAt: string
  updatedAt: string | null
}

// API response wrappers
export interface QbConnectionResponse {
  status: 'success' | 'failed'
  message?: string
  data: QbConnection
}

export interface QbAuthUrlResponse {
  status: 'success' | 'failed'
  message?: string
  data: { authUrl: string }
}

export interface QbAccountsResponse {
  status: 'success' | 'failed'
  message?: string
  data: QbAccount[]
}

export interface QbAccountMappingsResponse {
  status: 'success' | 'failed'
  message?: string
  data: QbAccountMapping[]
}

export interface QbAccountMappingResponse {
  status: 'success' | 'failed'
  message?: string
  data: QbAccountMapping
}

// Sync endpoint payloads + responses
export interface SyncExpensePayload {
  qbEntityType?: QbEntityType
  includeReceipt?: boolean
}

export interface SyncExpenseResult {
  qbEntityId: string
  qbEntityType: QbEntityType
  attached: boolean
  syncedAt: string | null
  alreadySynced: boolean
}

export interface SyncExpenseResponse {
  status: 'success' | 'failed'
  message?: string
  code?: string
  data: SyncExpenseResult
}

export interface BulkSyncPayload {
  expenseIds: string[]
  includeReceipts?: boolean
}

export interface BulkSyncSkipped {
  expenseId: string
  reason:
    | 'already_synced'
    | 'not_owned'
    | 'currency_mismatch'
    | 'category_unmapped'
    | 'no_category'
    | 'enqueue_failed'
    | string
}

export interface BulkSyncResult {
  enqueued: number
  enqueuedIds: string[]
  skipped: BulkSyncSkipped[]
}

export interface BulkSyncResponse {
  status: 'success' | 'failed'
  message?: string
  code?: string
  data: BulkSyncResult
}

// Generic small responses
export interface QbToggleResponse {
  status: 'success' | 'failed'
  message?: string
  data: { autoExport?: boolean; defaultQbEntityType?: QbEntityType }
}

export interface QbDeleteResponse {
  status: 'success' | 'failed'
  message: string
}
