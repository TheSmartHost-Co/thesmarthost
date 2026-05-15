import type { QbDefaults, QbItem, QbStepOverrides } from '@/services/types/quickbooks'

/**
 * Per-expense context used to compute initial step values.
 * Mirrors what both the single-modal and the wizard-step have on hand.
 */
export interface QbStepExpenseContext {
  hasReceipt: boolean
  expenseDescription?: string
  /** Drives the initial qbAccountId via accountMappings lookup. */
  categoryCode?: string | null
  /** Drives the initial classId via classMappings lookup. */
  propertyId?: string | null
  /** Drives the initial customerId via case-insensitive displayName match. */
  primaryOwnerName?: string | null
}

/**
 * Tokens that identify QBO's "Client billable expense" Item (or its equivalent
 * in non-English / accountant-renamed charts). Specificity-ordered: most
 * specific token first wins on multi-match. Mirrors BILLABLE_ITEM_TOKENS in
 * services/quickbooksSyncService.js — keep both lists in sync.
 */
const BILLABLE_ITEM_TOKENS = [
  'client billable expense',
  'billable expense',
  'reimbursable expense',
] as const

function findBillableItem(items: QbItem[]): QbItem | null {
  for (const token of BILLABLE_ITEM_TOKENS) {
    const match = items.find((i) => i.name.toLowerCase().includes(token))
    if (match) return match
  }
  return null
}

/**
 * Build the initial overrides for a step. Auto-fills:
 * - qbEntityType    ← connection default
 * - qbAccountId     ← accountMappings[categoryCode]
 * - paymentAccountId ← connection.defaultPaymentAccountId
 * - classId         ← classMappings[propertyId]
 * - customerId      ← qbCustomers[case-insensitive match against primaryOwnerName]
 * - isBillable      ← always true (most PM expenses are rebilled)
 * - description     ← expense.description
 * - includeReceipt  ← expense.hasReceipt
 *
 * Anything the user picks afterwards lands on the QbStepOverrides via onChange.
 */
export function computeInitialStepValue(
  expense: QbStepExpenseContext,
  defaults: QbDefaults
): QbStepOverrides {
  const mappedAccount = expense.categoryCode
    ? defaults.accountMappings.find((m) => m.expenseCategoryCode === expense.categoryCode)
    : undefined

  const mappedClass = expense.propertyId
    ? defaults.classMappings.find((m) => m.propertyId === expense.propertyId)
    : undefined

  let customerId = ''
  if (expense.primaryOwnerName) {
    const target = expense.primaryOwnerName.trim().toLowerCase()
    const match = defaults.qbCustomers.find(
      (c) => c.displayName.trim().toLowerCase() === target
    )
    if (match) customerId = match.id
  }

  // Item precedence: connection-level override > name-token match > '' (None).
  // Pre-filled here so the picker opens with the resolved default selected;
  // user can change it per-send via the SearchableSelect in SendToQbStep.
  let qbItemId = ''
  if (defaults.billableItemId) {
    qbItemId = defaults.billableItemId
  } else {
    const itemMatch = findBillableItem(defaults.qbItems)
    if (itemMatch) qbItemId = itemMatch.id
  }

  return {
    qbEntityType: defaults.connectionDefaultEntityType,
    qbAccountId: mappedAccount?.qbAccountId ?? '',
    paymentAccountId: defaults.defaultPaymentAccountId ?? '',
    customerId,
    classId: mappedClass?.qbClassId ?? '',
    isBillable: true,
    description: expense.expenseDescription ?? '',
    includeReceipt: expense.hasReceipt,
    qbItemId,
  }
}

/**
 * First-matching disablement reason for a step's current configuration.
 * Returns null when the step is ready to send.
 *
 * Used by:
 * - SendToQbModal to gate the Send button
 * - SendToQbWizard to gate the Stage & Next button (and to colour the step dot)
 */
export function getStepDisabledReason(
  value: QbStepOverrides,
  defaults: QbDefaults,
  loading: boolean
): string | null {
  if (loading) return null
  if (defaults.connectionStatus === 'expired') {
    return 'Reconnect QuickBooks first'
  }
  if (defaults.qbAccounts.length === 0) {
    return 'No expense categories in your QuickBooks company'
  }
  if (
    value.qbEntityType === 'purchase' &&
    defaults.paymentAccounts.length === 0 &&
    !value.paymentAccountId
  ) {
    return 'No Bank/Credit Card accounts in your QuickBooks company. Switch to Bill or add one.'
  }
  if (!value.qbAccountId) {
    return 'Pick a QuickBooks category or set up a mapping in QB Mappings'
  }
  if (value.qbEntityType === 'purchase' && !value.paymentAccountId) {
    return 'Pick a payment account'
  }
  return null
}
