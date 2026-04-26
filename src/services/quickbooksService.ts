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

export async function bulkSyncExpensesToQb(
  payload: BulkSyncPayload
): Promise<BulkSyncResponse> {
  return apiClient<BulkSyncResponse, BulkSyncPayload>(
    '/expenses/bulk-sync-to-quickbooks',
    { method: 'POST', body: payload }
  )
}
