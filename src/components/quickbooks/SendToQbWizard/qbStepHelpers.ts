import type {
  HmTaxKind,
  QbDefaults,
  QbItem,
  QbStepOverrides,
  QbTaxCode,
  TaxCodeMapping,
} from '@/services/types/quickbooks'

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
  /** Receipt's detected taxes — drives the initial qbTaxCodeId (receipt-matched default). */
  taxBreakdown?: { gst: number; pst: number; hst: number; qst: number }
}

/**
 * Stable substrings that identify each tax kind's rate in a QBO TaxCode name.
 * Company files vary ("GST 5%", "TPS 5%", "TVQ 9.975%"…), so we match on
 * substrings. Mirrors RATE_TOKENS in services/quickbooksSyncService.js —
 * keep both lists in sync.
 */
const RATE_TOKENS: Record<HmTaxKind, string[]> = {
  gst: ['gst', 'tps'],
  pst: ['pst', 'rst'],
  hst: ['hst'],
  qst: ['qst', 'tvq'],
}

/**
 * Resolve the *default* QBO TaxCode for an expense from the receipt's own
 * detected taxes — the receipt implies the province (QST ⇒ "GST/QST QC",
 * HST ⇒ "HST ON"). Mirrors resolveDefaultTaxCodeId in the backend:
 *   1. Composite-first — for multi-kind receipts, pick a TaxCode whose rates[]
 *      cover every non-zero kind (e.g. "GST/QST QC").
 *   2. Otherwise the largest-amount taxMappings entry.
 * Returns '' (the picker's "None" value) when the receipt has no tax. The user
 * can override per-send via the Sales tax picker.
 */
function resolveDefaultTaxCodeId(
  taxBreakdown: { gst: number; pst: number; hst: number; qst: number } | undefined,
  qbTaxCodes: QbTaxCode[],
  taxMappings: TaxCodeMapping[]
): string {
  const amounts = {
    gst: Number(taxBreakdown?.gst || 0),
    pst: Number(taxBreakdown?.pst || 0),
    hst: Number(taxBreakdown?.hst || 0),
    qst: Number(taxBreakdown?.qst || 0),
  }
  const kinds: HmTaxKind[] = ['gst', 'pst', 'hst', 'qst']
  const nonZeroKinds = kinds.filter((k) => amounts[k] > 0)
  if (nonZeroKinds.length === 0) return ''

  // Composite-first: a single code covering every non-zero kind.
  if (nonZeroKinds.length > 1 && qbTaxCodes.length > 0) {
    const requiredTokens = nonZeroKinds.map((k) => RATE_TOKENS[k])
    const composite = qbTaxCodes.find((tc) =>
      requiredTokens.every((tokens) =>
        (tc.rates || []).some((r) => {
          const name = (r.name || '').toLowerCase()
          return tokens.some((t) => name.includes(t))
        })
      )
    )
    if (composite) return composite.id
  }

  // Fallback: largest-amount mapped kind.
  const mappingByKind = new Map(taxMappings.map((m) => [m.hmTaxKind, m.qbTaxCodeId]))
  const best = (['hst', 'gst', 'qst', 'pst'] as HmTaxKind[])
    .map((k) => ({ amount: amounts[k], code: mappingByKind.get(k) }))
    .filter((c) => c.amount > 0 && c.code)
    .sort((a, b) => b.amount - a.amount)[0]
  return best?.code || ''
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

  // Tax precedence: receipt-matched default ('' when the receipt has no tax).
  // User can override per-send via the Sales tax picker in SendToQbStep.
  const qbTaxCodeId = resolveDefaultTaxCodeId(
    expense.taxBreakdown,
    defaults.qbTaxCodes,
    defaults.taxMappings
  )

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
    qbTaxCodeId,
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
