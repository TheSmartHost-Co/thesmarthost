'use client'

import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import type {
  BulkSyncFailedItem,
  BulkSyncSyncedItem,
} from '@/services/types/quickbooks'
import type { WizardStepEntry } from '@/hooks/useSendToQbWizardDraft'

interface SendToQbResultsProps {
  synced: BulkSyncSyncedItem[]
  failed: BulkSyncFailedItem[]
  /** Used to look up vendor/amount for the result rows. */
  steps: WizardStepEntry[]
  /** Map: expenseId → display label (vendor + amount). */
  expenseLabels: Map<string, string>
  /** Re-submit just the failed expenseIds. */
  onRetry: (failedIds: string[]) => void
  onClose: () => void
  submitting: boolean
}

/**
 * Translate a backend reason string into a user-facing message + retry
 * eligibility. The wizard never auto-retries — user clicks the button.
 *
 * Reason format from the backend:
 *   plain:   'not_owned' | 'already_synced' | 'currency_mismatch' | ...
 *   prefix:  'qbo_validation:<code>:<msg>'
 *            'qbo_batch_error:<msg>'
 *            'db_write_failed:<msg>'
 *            'vendor_resolution_failed'
 */
function describeReason(reason: string): { message: string; retryable: boolean } {
  if (reason === 'not_owned') return { message: 'Expense not found', retryable: false }
  if (reason === 'already_synced') return { message: 'Already in QuickBooks', retryable: false }
  if (reason === 'currency_mismatch')
    return { message: "Currency doesn't match your QuickBooks connection", retryable: false }
  if (reason === 'category_unmapped')
    return {
      message: 'Map this category in Settings → QuickBooks',
      retryable: false,
    }
  if (reason === 'no_category')
    return { message: 'Expense has no category set', retryable: false }
  if (reason === 'missing_qb_account')
    return { message: 'No QuickBooks category was selected', retryable: false }
  if (reason === 'missing_payment_account')
    return { message: 'Purchase needs a payment account', retryable: false }
  if (reason === 'vendor_resolution_failed')
    return { message: 'Could not create or find the vendor in QuickBooks', retryable: true }
  if (reason === 'qbo_no_entity_returned')
    return { message: 'QuickBooks accepted the request but returned no entity', retryable: true }
  if (reason.startsWith('qbo_validation:')) {
    const parts = reason.split(':')
    const msg = parts.slice(2).join(':') || 'Validation error'
    return { message: `QuickBooks: ${msg}`, retryable: true }
  }
  if (reason.startsWith('qbo_batch_error:')) {
    const msg = reason.slice('qbo_batch_error:'.length)
    return { message: `QuickBooks batch error: ${msg}`, retryable: true }
  }
  if (reason.startsWith('db_write_failed:')) {
    return {
      message:
        'Saved in QuickBooks but local save failed — contact support to reconcile',
      retryable: false,
    }
  }
  return { message: reason, retryable: false }
}

export default function SendToQbResults({
  synced,
  failed,
  expenseLabels,
  onRetry,
  onClose,
  submitting,
}: SendToQbResultsProps) {
  const retryableFailed = failed.filter((f) => describeReason(f.reason).retryable)

  return (
    <div className="space-y-5">
      {/* ── Summary ───────────────────────────────────────────── */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50">
        <div className="flex-1">
          <div className="text-base font-semibold text-gray-900">
            {failed.length === 0
              ? `Sent ${synced.length} expense${synced.length === 1 ? '' : 's'} to QuickBooks`
              : `Sent ${synced.length} of ${synced.length + failed.length} expenses`}
          </div>
          <div className="text-xs text-gray-600 mt-1">
            {synced.filter((s) => s.attached).length} receipt
            {synced.filter((s) => s.attached).length === 1 ? '' : 's'} attached
            {failed.length > 0 && ` · ${failed.length} failed`}
          </div>
        </div>
      </div>

      {/* ── Synced rows ───────────────────────────────────────── */}
      {synced.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Synced
          </div>
          <ul className="space-y-1.5 text-sm">
            {synced.map((item) => (
              <li
                key={item.expenseId}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-900"
              >
                <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate">
                  {expenseLabels.get(item.expenseId) || item.expenseId}
                </span>
                <span className="text-xs text-emerald-700 capitalize">{item.qbEntityType}</span>
                {item.attached && (
                  <span className="text-[10px] uppercase font-semibold tracking-wide text-emerald-700">
                    + receipt
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Failed rows ───────────────────────────────────────── */}
      {failed.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">
            Failed
          </div>
          <ul className="space-y-1.5 text-sm">
            {failed.map((item) => {
              const desc = describeReason(item.reason)
              return (
                <li
                  key={item.expenseId}
                  className="flex items-start gap-2 px-3 py-2 rounded-md bg-red-50 border border-red-100 text-red-900"
                >
                  <XCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate">
                      {expenseLabels.get(item.expenseId) || item.expenseId}
                    </div>
                    <div className="text-xs text-red-700 mt-0.5">{desc.message}</div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* ── Footer actions ────────────────────────────────────── */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          Done
        </button>
        {retryableFailed.length > 0 && (
          <button
            type="button"
            onClick={() => onRetry(retryableFailed.map((f) => f.expenseId))}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
          >
            <ArrowPathIcon className="w-4 h-4" />
            {submitting
              ? 'Retrying…'
              : `Retry ${retryableFailed.length} failed`}
          </button>
        )}
      </div>
    </div>
  )
}
