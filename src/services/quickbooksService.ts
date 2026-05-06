// QuickBooks Online integration — frontend service.
//
// Notes:
// - `getConnectAuthUrl(env)` returns the Intuit OAuth URL as JSON; the caller
//   is responsible for `window.location.href = url`. We do this rather than
//   redirect-from-server-side because the connect endpoint is itself an
//   authenticated API call (bearer token) — full-page navigation can't
//   include the bearer header.
// - `setAutoExport` and `setDefaultEntityType` mutate global account state;
//   keep them on the QB service rather than spreading across other services.

import apiClient from './apiClient'
import type {
  QbConnectionResponse,
  QbAuthUrlResponse,
  QbAccountsResponse,
  QbAccountMappingsResponse,
  QbAccountMappingResponse,
  QbToggleResponse,
  QbDeleteResponse,
  QbEntityType,
  SyncExpensePayload,
  SyncExpenseResponse,
  BulkSyncPayload,
  BulkSyncResponse,
  QbCustomersResponse,
  QbClassesResponse,
  QbTaxCodesResponse,
  PropertyClassMappingsResponse,
  PropertyClassMappingResponse,
  TaxCodeMappingsResponse,
  TaxCodeMappingResponse,
  HmTaxKind,
  BulkSyncPreflightPayload,
  BulkSyncPreflightResponse,
} from './types/quickbooks'

// Payment-accounts list shares the QbAccountsResponse shape (id/name/type rows).
type QbPaymentAccountsResponse = QbAccountsResponse

// ─────────────────────────────────────────────────────────────────────────
// Connection lifecycle
// ─────────────────────────────────────────────────────────────────────────

export async function getConnection(): Promise<QbConnectionResponse> {
  return apiClient<QbConnectionResponse>('/quickbooks/connection')
}

export async function getConnectAuthUrl(env: 'sandbox' | 'production'): Promise<QbAuthUrlResponse> {
  return apiClient<QbAuthUrlResponse>(`/quickbooks/connect?env=${env}`)
}

export async function disconnect(): Promise<QbDeleteResponse> {
  return apiClient<QbDeleteResponse>('/quickbooks/disconnect', { method: 'POST' })
}

// ─────────────────────────────────────────────────────────────────────────
// Settings toggles
// ─────────────────────────────────────────────────────────────────────────

export async function setAutoExport(autoExport: boolean): Promise<QbToggleResponse> {
  return apiClient<QbToggleResponse, { autoExport: boolean }>('/quickbooks/auto-export', {
    method: 'POST',
    body: { autoExport },
  })
}

export async function setDefaultEntityType(
  defaultQbEntityType: QbEntityType
): Promise<QbToggleResponse> {
  return apiClient<QbToggleResponse, { defaultQbEntityType: QbEntityType }>(
    '/quickbooks/default-entity-type',
    { method: 'POST', body: { defaultQbEntityType } }
  )
}

/**
 * Set the user's default payment-source account (Bank/CreditCard/Cash).
 * Used as the top-level AccountRef when creating Purchase entities.
 */
export async function setDefaultPaymentAccount(
  qbAccountId: string
): Promise<QbToggleResponse> {
  return apiClient<QbToggleResponse, { qbAccountId: string }>(
    '/quickbooks/default-payment-account',
    { method: 'POST', body: { qbAccountId } }
  )
}

// ─────────────────────────────────────────────────────────────────────────
// QBO accounts (chart of accounts)
// ─────────────────────────────────────────────────────────────────────────

export async function getQbAccounts(): Promise<QbAccountsResponse> {
  return apiClient<QbAccountsResponse>('/quickbooks/qb-accounts')
}

/**
 * List Bank / CreditCard / OtherCurrentAsset accounts — the valid choices
 * for the top-level AccountRef of a Purchase entity.
 */
export async function getQbPaymentAccounts(): Promise<QbPaymentAccountsResponse> {
  return apiClient<QbPaymentAccountsResponse>('/quickbooks/qb-payment-accounts')
}

/**
 * List active QBO Customers. Used by SendToQbModal's customer picker.
 * Cached server-side for 5 minutes; safe to call on every modal open.
 */
export async function getQbCustomers(): Promise<QbCustomersResponse> {
  return apiClient<QbCustomersResponse>('/quickbooks/qb-customers')
}

/**
 * List active QBO Classes (cost-center dimension). Used by the property→class
 * mapping table in settings AND by SendToQbModal's per-send class picker.
 */
export async function getQbClasses(): Promise<QbClassesResponse> {
  return apiClient<QbClassesResponse>('/quickbooks/qb-classes')
}

/**
 * List active QBO TaxCodes. Used by the gst/pst/hst → tax-code mapping table.
 */
export async function getQbTaxCodes(): Promise<QbTaxCodesResponse> {
  return apiClient<QbTaxCodesResponse>('/quickbooks/qb-tax-codes')
}

// ─────────────────────────────────────────────────────────────────────────
// Category → account mappings
// ─────────────────────────────────────────────────────────────────────────

export async function getAccountMappings(): Promise<QbAccountMappingsResponse> {
  return apiClient<QbAccountMappingsResponse>('/quickbooks/account-mappings')
}

export async function upsertAccountMapping(
  expenseCategoryCode: string,
  qbAccountId: string
): Promise<QbAccountMappingResponse> {
  return apiClient<
    QbAccountMappingResponse,
    { expenseCategoryCode: string; qbAccountId: string }
  >('/quickbooks/account-mappings', {
    method: 'POST',
    body: { expenseCategoryCode, qbAccountId },
  })
}

export async function deleteAccountMapping(id: string): Promise<QbDeleteResponse> {
  return apiClient<QbDeleteResponse>(`/quickbooks/account-mappings/${id}`, {
    method: 'DELETE',
  })
}

// ─────────────────────────────────────────────────────────────────────────
// Property → QBO Class mappings (settings table; auto-fills SendToQbModal)
// ─────────────────────────────────────────────────────────────────────────

export async function getPropertyClassMappings(): Promise<PropertyClassMappingsResponse> {
  return apiClient<PropertyClassMappingsResponse>('/quickbooks/property-class-mappings')
}

export async function upsertPropertyClassMapping(
  propertyId: string,
  qbClassId: string
): Promise<PropertyClassMappingResponse> {
  return apiClient<PropertyClassMappingResponse, { propertyId: string; qbClassId: string }>(
    '/quickbooks/property-class-mappings',
    { method: 'POST', body: { propertyId, qbClassId } }
  )
}

export async function deletePropertyClassMapping(id: string): Promise<QbDeleteResponse> {
  return apiClient<QbDeleteResponse>(`/quickbooks/property-class-mappings/${id}`, {
    method: 'DELETE',
  })
}

// ─────────────────────────────────────────────────────────────────────────
// HM tax kind (gst/pst/hst) → QBO TaxCode mappings
// ─────────────────────────────────────────────────────────────────────────

export async function getTaxCodeMappings(): Promise<TaxCodeMappingsResponse> {
  return apiClient<TaxCodeMappingsResponse>('/quickbooks/tax-code-mappings')
}

export async function upsertTaxCodeMapping(
  hmTaxKind: HmTaxKind,
  qbTaxCodeId: string
): Promise<TaxCodeMappingResponse> {
  return apiClient<TaxCodeMappingResponse, { hmTaxKind: HmTaxKind; qbTaxCodeId: string }>(
    '/quickbooks/tax-code-mappings',
    { method: 'POST', body: { hmTaxKind, qbTaxCodeId } }
  )
}

export async function deleteTaxCodeMapping(id: string): Promise<QbDeleteResponse> {
  return apiClient<QbDeleteResponse>(`/quickbooks/tax-code-mappings/${id}`, {
    method: 'DELETE',
  })
}

// ─────────────────────────────────────────────────────────────────────────
// Expense sync (proxies to /api/expenses; living here keeps the QB UX in one
// service file even though the endpoint URLs are under /expenses).
// ─────────────────────────────────────────────────────────────────────────

export async function syncExpenseToQb(
  expenseId: string,
  payload: SyncExpensePayload = {}
): Promise<SyncExpenseResponse> {
  return apiClient<SyncExpenseResponse, SyncExpensePayload>(
    `/expenses/${expenseId}/sync-to-quickbooks`,
    { method: 'POST', body: payload }
  )
}

/**
 * Clears the qb_entity_id link on an already-synced expense so it can be
 * re-sent. Used when the user has deleted the Bill/Purchase in QBO directly
 * and needs to re-create it from this app. After this resolves, the regular
 * `syncExpenseToQb` flow will create a fresh QBO entity.
 */
export async function resetQbSyncForExpense(
  expenseId: string
): Promise<{ status: 'success'; data: { expenseId: string; qbSyncStatus: string } } | { status: 'failed'; message: string; code?: string }> {
  return apiClient(`/expenses/${expenseId}/reset-qb-sync`, { method: 'POST' })
}

export async function bulkSyncExpensesToQb(
  payload: BulkSyncPayload
): Promise<BulkSyncResponse> {
  return apiClient<BulkSyncResponse, BulkSyncPayload>(
    '/expenses/bulk-sync-to-quickbooks',
    { method: 'POST', body: payload }
  )
}

/**
 * One-shot preflight for the bulk SendToQbWizard. Returns per-row blockers
 * (already_synced, currency_mismatch, etc.) AND the bundled QB defaults
 * (accounts, customers, classes, mappings, connection state) the wizard's
 * per-step form needs. Replaces 8+ separate fetches with one round-trip.
 */
export async function bulkSyncPreflight(
  payload: BulkSyncPreflightPayload
): Promise<BulkSyncPreflightResponse> {
  return apiClient<BulkSyncPreflightResponse, BulkSyncPreflightPayload>(
    '/expenses/bulk-sync-preflight',
    { method: 'POST', body: payload }
  )
}
