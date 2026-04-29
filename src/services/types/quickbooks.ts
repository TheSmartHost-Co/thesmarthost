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
  /** Top-level AccountRef for Purchase entities (Bank/CreditCard/Cash). */
  defaultPaymentAccountId?: string | null
  defaultPaymentAccountName?: string | null
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

/**
 * QbPaymentAccount has the same shape as QbAccount but is sourced from
 * different AccountTypes (Bank / Credit Card / Other Current Asset). Kept as
 * a separate type alias for readability where the distinction matters.
 */
export type QbPaymentAccount = QbAccount

export interface QbAccountMapping {
  id: string
  expenseCategoryCode: string
  qbAccountId: string
  qbAccountName: string
  qbAccountType?: string | null
  createdAt: string
  updatedAt: string | null
}

/**
 * QBO Customer entity. Used by SendToQbModal to fill the Customer picker.
 * Auto-resolution from a property's primary owner client matches by
 * `displayName` (case-insensitive). If accountants need email/fuzzy matching
 * later, extend `resolveCustomerId` in services/quickbooksSyncService.js.
 */
export interface QbCustomer {
  id: string
  displayName: string
  primaryEmailAddr?: string | null
  fullyQualifiedName?: string
}

/**
 * QBO Class entity — cost-center dimension. We map one-to-one to a property
 * via property_qb_class_mappings (per-user) so SendToQbModal can auto-fill
 * the Class field from the expense's property.
 */
export interface QbClass {
  id: string
  name: string
  fullyQualifiedName?: string
}

/**
 * QBO TaxCode entity. We map our gst/pst/hst columns to TaxCodes per-user
 * (qb_tax_code_mappings). At sync time the line's TaxCodeRef = the code
 * mapped to the kind with the largest amount.
 */
export interface QbTaxCode {
  id: string
  name: string
  description?: string
  taxable?: boolean
}

/**
 * Persistent property → QBO Class mapping. Keyed by (user_id, property_id).
 * Frontend fetches via getPropertyClassMappings() and renders in a settings
 * table parallel to CategoryMappingTable.
 */
export interface PropertyClassMapping {
  id: string
  propertyId: string
  propertyName?: string | null
  propertyAddress?: string | null
  qbClassId: string
  qbClassName: string
  createdAt: string
  updatedAt: string | null
}

/**
 * Persistent HM-tax-kind → QBO-TaxCode mapping. Keyed by (user_id, hmTaxKind).
 * Four kinds: 'gst', 'pst', 'hst', 'qst'.
 */
export type HmTaxKind = 'gst' | 'pst' | 'hst' | 'qst'

export interface TaxCodeMapping {
  id: string
  hmTaxKind: HmTaxKind
  qbTaxCodeId: string
  qbTaxCodeName: string
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

// QBO list responses — same envelope shape as QbAccountsResponse.
export interface QbCustomersResponse { status: 'success' | 'failed'; message?: string; data: QbCustomer[] }
export interface QbClassesResponse   { status: 'success' | 'failed'; message?: string; data: QbClass[] }
export interface QbTaxCodesResponse  { status: 'success' | 'failed'; message?: string; data: QbTaxCode[] }

// Property → Class mapping responses
export interface PropertyClassMappingsResponse { status: 'success' | 'failed'; message?: string; data: PropertyClassMapping[] }
export interface PropertyClassMappingResponse  { status: 'success' | 'failed'; message?: string; data: PropertyClassMapping }

// Tax-code mapping responses
export interface TaxCodeMappingsResponse { status: 'success' | 'failed'; message?: string; data: TaxCodeMapping[] }
export interface TaxCodeMappingResponse  { status: 'success' | 'failed'; message?: string; data: TaxCodeMapping }

// Sync endpoint payloads + responses
export interface SyncExpensePayload {
  qbEntityType?: QbEntityType
  includeReceipt?: boolean
  /** Per-send override for the line-level expense AccountRef. Transient — does not update saved category mappings. */
  qbAccountId?: string
  /** Per-send override for the top-level Purchase AccountRef. Ignored for Bills. Transient — does not update connection default. */
  paymentAccountId?: string
  /** Per-send override for QBO Customer (line-level CustomerRef). Transient — null/empty omits the ref. */
  customerId?: string | null
  /** Per-send override for QBO Class (line-level ClassRef). Transient — null/empty omits the ref. */
  classId?: string | null
  /** Per-send override for the line's BillableStatus. true → 'Billable', false → 'NotBillable'. */
  isBillable?: boolean
  /** Per-send override for the line description / PrivateNote prefix. Transient. */
  description?: string
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
  data: {
    autoExport?: boolean
    defaultQbEntityType?: QbEntityType
    defaultPaymentAccountId?: string | null
    defaultPaymentAccountName?: string | null
  }
}

export interface QbDeleteResponse {
  status: 'success' | 'failed'
  message: string
}
