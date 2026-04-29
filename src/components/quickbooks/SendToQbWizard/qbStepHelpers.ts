import type { QbDefaults, QbStepOverrides } from '@/services/types/quickbooks'

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

  return {
    qbEntityType: defaults.connectionDefaultEntityType,
    qbAccountId: mappedAccount?.qbAccountId ?? '',
    paymentAccountId: defaults.defaultPaymentAccountId ?? '',
    customerId,
    classId: mappedClass?.qbClassId ?? '',
    isBillable: true,
    description: expense.expenseDescription ?? '',
    includeReceipt: expense.hasReceipt,
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
