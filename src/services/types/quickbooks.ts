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
  /**
   * Line-level ItemRef used on billable expense lines so the Product/Service
   * column propagates to the Invoice line when the expense is added from
   * QBO's billable-expense panel. When null, the sync service auto-detects
   * by name token ("Client billable expense" / "Billable expense").
   */
  billableItemId?: string | null
  billableItemName?: string | null
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
 * QBO Item entity (Product or Service). Used on billable expense lines as
 * the line-level ItemRef so the Product/Service column propagates to the
 * Invoice line when added from QBO's billable-expense panel.
 *
 * Backend filters out Items of Type 'Category' (parent groupings — not
 * pickable on a transaction line) and 'Inventory' (would trigger
 * inventory-asset bookkeeping on a Purchase, wrong for passthrough billable
 * expenses). `expenseAccountId/Name` come back so the settings UI can warn
 * when the Item's GL posting account differs from the user's mapped
 * category account.
 */
export interface QbItem {
  id: string
  name: string
  type: 'Service' | 'NonInventory'
  fullyQualifiedName?: string
  expenseAccountId?: string | null
  expenseAccountName?: string | null
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
  // Underlying TaxRate breakdown from the code's PurchaseTaxRateList. Composite
  // codes (e.g. "GST/QST QC") have rates.length > 1 — surface this in the UI so
  // users can pick a code that covers all the kinds on a multi-tax receipt.
  // `rateValue` is the numeric percent per component (e.g. 9.975), joined from
  // the TaxRate entity; null when QBO didn't return it.
  rates?: Array<{ id: string; name: string | null; rateValue?: number | null }>
  // Total purchase rate as a percent (sum of component rateValues, e.g. 14.975
  // for GST/QST QC). 0 for zero-rated/exempt/out-of-scope; null when unknown.
  rate?: number | null
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
export interface QbItemsResponse     { status: 'success' | 'failed'; message?: string; data: QbItem[] }

// Property → Class mapping responses
export interface PropertyClassMappingsResponse { status: 'success' | 'failed'; message?: string; data: PropertyClassMapping[] }
export interface PropertyClassMappingResponse  { status: 'success' | 'failed'; message?: string; data: PropertyClassMapping }

// Tax-code mapping responses
export interface TaxCodeMappingsResponse { status: 'success' | 'failed'; message?: string; data: TaxCodeMapping[] }
export interface TaxCodeMappingResponse  { status: 'success' | 'failed'; message?: string; data: TaxCodeMapping }

// ─── Shared QB step types ────────────────────────────────────────
// Used by both the single-expense SendToQbModal and the bulk SendToQbWizard.
// The step component is purely controlled — it renders the form and emits
// QbStepOverrides via onChange. Both flows compute the initial value via
// computeInitialStepValue() so auto-fill behaviour stays consistent.

/**
 * Per-expense overrides collected by SendToQbStep.
 * No expenseId here — the caller threads that externally (the wizard's stepStates,
 * the modal's expenseId prop). Transient values: never written back to mappings or
 * connection.
 */
export interface QbStepOverrides {
  qbEntityType: QbEntityType
  qbAccountId: string
  /** '' when entity = 'bill' */
  paymentAccountId: string
  /** '' = no customer ref */
  customerId: string
  /** '' = no class ref */
  classId: string
  isBillable: boolean
  description: string
  includeReceipt: boolean
  /**
   * Line-level ItemRef for the QBO Product/Service column. Pre-filled by
   * computeInitialStepValue from the connection-level override or a token
   * match against defaults.qbItems. '' = explicit "None — don't attach
   * a Product/Service" (line falls back to AccountBasedExpenseLineDetail).
   */
  qbItemId: string
  /**
   * Line-level sales-tax TaxCodeRef. Pre-filled by computeInitialStepValue by
   * matching the receipt's detected taxes against defaults.qbTaxCodes (a QC
   * receipt → "GST/QST QC", an ON receipt → "HST ON"). '' = explicit "None" —
   * no TaxCodeRef on the line (correct for zero-tax expenses). QBO computes the
   * tax from this code under GlobalTaxCalculation: "TaxExcluded".
   */
  qbTaxCodeId: string
}

/**
 * Shared QB data SendToQbStep needs to render. Same data drives every step in
 * a wizard run — fetched once at wizard-open (or modal-open for the single flow)
 * and passed in as a prop. The single-modal flow assembles this from its 8-call
 * Promise.all; the wizard gets it from the bulk-sync-preflight response.
 */
export interface QbDefaults {
  qbAccounts: QbAccount[]
  paymentAccounts: QbPaymentAccount[]
  qbCustomers: QbCustomer[]
  qbClasses: QbClass[]
  /** List of Service/NonInventory items, used by the per-expense Product/Service picker. */
  qbItems: QbItem[]
  /** Raw QBO TaxCode list, used by the per-expense Sales tax picker. */
  qbTaxCodes: QbTaxCode[]
  accountMappings: QbAccountMapping[]
  classMappings: PropertyClassMapping[]
  taxMappings: TaxCodeMapping[]
  connectionStatus: string | null
  connectionDefaultEntityType: QbEntityType
  defaultPaymentAccountId: string | null
  defaultPaymentAccountName: string | null
  /** Connection-level billable Item override from Settings (Phase 1). */
  billableItemId: string | null
  billableItemName: string | null
}

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
  /**
   * Per-send override for the line-level Product/Service ItemRef. Three states:
   *   undefined (field absent) → backend auto-resolves via resolveBillableItemId
   *   '' (empty string)        → explicit "None" — line falls back to AccountBased
   *   '<item id>'              → use that QBO Item ID
   */
  qbItemId?: string | null
  /**
   * Per-send override for the line-level sales-tax TaxCodeRef. Three states:
   *   undefined (field absent) → backend derives the default from the receipt
   *   '' (empty string)        → explicit "None" — no TaxCodeRef on the line
   *   '<tax code id>'          → use that QBO TaxCode ID
   */
  qbTaxCodeId?: string | null
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

// ─── Bulk-sync preflight (powers SendToQbWizard) ─────────────────
// One round-trip that returns:
//   - per-expense blockers (already_synced, currency_mismatch, etc.)
//   - the full bundled QB defaults the wizard's per-step form needs
// Replaces what would otherwise be 8+ separate fetches per wizard open.
import type { Expense } from './expense'

export type PreflightBlocker =
  | 'not_owned'
  | 'already_synced'
  | 'currency_mismatch'
  | 'category_unmapped'
  | 'no_category'

export interface PreflightItem {
  expenseId: string
  ok: boolean
  blockers: PreflightBlocker[]
  /** Null when blocker = 'not_owned' (the row didn't belong to the user). */
  expense: Expense | null
}

export interface BulkSyncPreflightPayload {
  expenseIds: string[]
}

export interface BulkSyncPreflightData {
  items: PreflightItem[]
  qbDefaults: QbDefaults
}

export interface BulkSyncPreflightResponse {
  status: 'success' | 'failed'
  message?: string
  code?: string
  data: BulkSyncPreflightData
}

// ─── Bulk-sync (wizard) ──────────────────────────────────────────
// Each wizard-staged item lands on the wire as one entry in items[].
// The shape mirrors SyncExpensePayload but adds expenseId so the backend can
// associate per-row overrides → expenses. The backend translates each item
// into a QBO Batch API entry (max 30 per call), then runs a multipart-attach
// phase for items with includeReceipt=true.

export interface BulkSyncItem {
  expenseId: string
  qbEntityType: QbEntityType
  qbAccountId: string
  /** Required for Purchase, ignored for Bill. */
  paymentAccountId: string | null
  /** Empty/null = no Customer ref on the line. */
  customerId: string | null
  /** Empty/null = no Class ref on the line. */
  classId: string | null
  isBillable: boolean
  description: string
  includeReceipt: boolean
  /** Empty/null = no Product/Service ref on the line (falls back to AccountBased). */
  qbItemId: string | null
  /** Empty/null = no sales-tax TaxCodeRef on the line. '<id>' = use that TaxCode. */
  qbTaxCodeId: string | null
}

export interface BulkSyncPayload {
  items: BulkSyncItem[]
}

export interface BulkSyncSyncedItem {
  expenseId: string
  qbEntityId: string
  qbEntityType: QbEntityType
  attached: boolean
}

export interface BulkSyncFailedItem {
  expenseId: string
  /**
   * Failure reason. Plain codes for our own pre-validation:
   *   'not_owned' | 'already_synced' | 'currency_mismatch'
   *   'missing_qb_account' | 'missing_payment_account' | 'vendor_resolution_failed'
   * Prefix-coded reasons from QBO + DB:
   *   'qbo_validation:<code>:<msg>' — per-row QBO Fault (rendered verbatim)
   *   'qbo_batch_error:<msg>'       — whole batch call failed
   *   'db_write_failed:<msg>'       — entity created in QBO but DB persist failed
   */
  reason: string
}

export interface BulkSyncResult {
  summary: { total: number; synced: number; failed: number }
  synced: BulkSyncSyncedItem[]
  failed: BulkSyncFailedItem[]
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
    billableItemId?: string | null
    billableItemName?: string | null
  }
}

export interface QbDeleteResponse {
  status: 'success' | 'failed'
  message: string
}
