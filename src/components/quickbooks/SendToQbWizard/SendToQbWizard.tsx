'use client'

import { notifyError } from '@/utils/notify'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Modal from '@/components/shared/modal'
import {
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  bulkSyncPreflight,
  bulkSyncExpensesToQb,
} from '@/services/quickbooksService'
import type {
  BulkSyncItem,
  BulkSyncResult,
  PreflightItem,
  QbDefaults,
  QbStepOverrides,
} from '@/services/types/quickbooks'
import SendToQbStep from './SendToQbStep'
import SendToQbStepProgress from './SendToQbStepProgress'
import SendToQbResults from './SendToQbResults'
import {
  computeInitialStepValue,
  getStepDisabledReason,
} from './qbStepHelpers'
import useSendToQbWizardDraft, {
  type WizardStepEntry,
} from '@/hooks/useSendToQbWizardDraft'

interface SendToQbWizardProps {
  isOpen: boolean
  expenseIds: string[]
  onClose: () => void
  /** Called when at least one expense was successfully synced. */
  onComplete: () => void
}

type WizardPhase = 'loading' | 'wizard' | 'submitting' | 'results'

const expenseLabel = (item: PreflightItem): string => {
  if (!item.expense) return item.expenseId
  const vendor = item.expense.vendorName || 'Unknown vendor'
  const amount = Number(item.expense.amount || 0)
  return `${vendor} · $${amount.toFixed(2)}`
}

/**
 * Bulk QuickBooks send wizard. One step per expense; user reviews/edits the
 * same fields as the single-expense modal, stages each, then submits all
 * staged in one batch via the new /api/expenses/bulk-sync-to-quickbooks
 * endpoint.
 *
 * Lifecycle:
 *   1. Mount → fire preflight (one round-trip: per-row blockers + bundled
 *      qbDefaults). Initialize stepStates, run computeInitialStepValue() for
 *      each non-blocked expense.
 *   2. Show resume prompt if a saved draft exists for these same expenseIds
 *      (matched by set-equality).
 *   3. User navigates step-by-step, edits overrides, clicks "Stage & Next" /
 *      "Skip" → state machine transitions in stepStates[].
 *   4. "Send All" → POST staged items → results view → optional retry of
 *      failures → onComplete() once all are done (or user closes).
 */
export default function SendToQbWizard({
  isOpen,
  expenseIds,
  onClose,
  onComplete,
}: SendToQbWizardProps) {
  const { showNotification } = useNotificationStore()
  const { saveDraft, loadDraft, clearDraft } = useSendToQbWizardDraft()

  const [phase, setPhase] = useState<WizardPhase>('loading')
  const [defaults, setDefaults] = useState<QbDefaults | null>(null)
  const [preflightItems, setPreflightItems] = useState<PreflightItem[]>([])
  const [stepStates, setStepStates] = useState<WizardStepEntry[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [results, setResults] = useState<BulkSyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showResumePrompt, setShowResumePrompt] = useState(false)

  // ─── Preflight on open ────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    if (expenseIds.length === 0) return

    let cancelled = false
    setPhase('loading')
    setError(null)
    setResults(null)

    bulkSyncPreflight({ expenseIds })
      .then((res) => {
        if (cancelled) return
        if (res.status !== 'success') {
          setError(
            res.code === 'connection_inactive'
              ? 'Connect QuickBooks first (Settings → Integrations).'
              : res.message || 'Failed to load preflight'
          )
          return
        }

        const items = res.data.items
        const def = res.data.qbDefaults

        // Initialize step states. Blocked rows that are already_synced get
        // filtered out entirely (per Q3 of the architect open questions —
        // we silently exclude them from the wizard since they're a fait
        // accompli; surface a toast so the user knows).
        const filtered = items.filter(
          (it) => !it.blockers.includes('already_synced')
        )
        const alreadySyncedCount = items.length - filtered.length

        const initialStates: WizardStepEntry[] = filtered.map((it) => {
          const isBlocked = it.blockers.length > 0
          const overrides =
            !isBlocked && it.expense
              ? computeInitialStepValue(
                  {
                    hasReceipt: !!(it.expense.receiptPath || it.expense.receiptId),
                    expenseDescription: it.expense.description,
                    categoryCode: it.expense.category,
                    propertyId: it.expense.propertyId,
                    primaryOwnerName: it.expense.primaryOwnerName,
                    taxBreakdown: {
                      gst: Number(it.expense.taxGst || 0),
                      pst: Number(it.expense.taxPst || 0),
                      hst: Number(it.expense.taxHst || 0),
                      qst: Number(it.expense.taxQst || 0),
                    },
                  },
                  def
                )
              : null
          return {
            expenseId: it.expenseId,
            stepStatus: isBlocked ? 'blocked' : 'pending-config',
            overrides,
            blockers: it.blockers,
          }
        })

        setPreflightItems(filtered)
        setDefaults(def)
        setStepStates(initialStates)
        setCurrentIndex(0)
        setPhase('wizard')

        if (alreadySyncedCount > 0) {
          showNotification(
            `${alreadySyncedCount} already in QuickBooks — skipped.`,
            'info'
          )
        }

        // Resume prompt if a draft exists for the same set of expenses.
        const draft = loadDraft()
        if (draft) {
          const draftSet = new Set(draft.expenseIds)
          const sameSet =
            draft.expenseIds.length === expenseIds.length &&
            expenseIds.every((id) => draftSet.has(id))
          if (sameSet) setShowResumePrompt(true)
          else clearDraft() // different selection → drop stale draft
        }
      })
      .catch((err) => {
        if (cancelled) return
        console.error('preflight failed', err)
        setError(err instanceof Error ? err.message : 'Failed to load preflight')
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, JSON.stringify(expenseIds)])

  // ─── Resume / discard draft ───────────────────────────────────────
  const resumeDraft = useCallback(() => {
    const draft = loadDraft()
    if (!draft || !defaults) return

    // Validate each step's saved overrides against fresh qbDefaults — if a
    // referenced account/customer/class is gone, clear that field and revert
    // the step to pending-config so the user re-picks (Q6 from architect).
    const accountIds = new Set(defaults.qbAccounts.map((a) => a.id))
    const paymentIds = new Set(defaults.paymentAccounts.map((a) => a.id))
    const customerIds = new Set(defaults.qbCustomers.map((c) => c.id))
    const classIds = new Set(defaults.qbClasses.map((c) => c.id))
    const itemIds = new Set(defaults.qbItems.map((i) => i.id))
    const taxCodeIds = new Set(defaults.qbTaxCodes.map((t) => t.id))

    let staleAny = false
    const restored = draft.stepStates.map((s) => {
      if (!s.overrides) return s
      let ov = s.overrides
      let changed = false
      if (ov.qbAccountId && !accountIds.has(ov.qbAccountId)) {
        ov = { ...ov, qbAccountId: '' }
        changed = true
      }
      if (ov.paymentAccountId && !paymentIds.has(ov.paymentAccountId)) {
        ov = { ...ov, paymentAccountId: '' }
        changed = true
      }
      if (ov.customerId && !customerIds.has(ov.customerId)) {
        ov = { ...ov, customerId: '' }
        changed = true
      }
      if (ov.classId && !classIds.has(ov.classId)) {
        ov = { ...ov, classId: '' }
        changed = true
      }
      if (ov.qbItemId && !itemIds.has(ov.qbItemId)) {
        ov = { ...ov, qbItemId: '' }
        changed = true
      }
      if (ov.qbTaxCodeId && !taxCodeIds.has(ov.qbTaxCodeId)) {
        ov = { ...ov, qbTaxCodeId: '' }
        changed = true
      }
      if (changed) {
        staleAny = true
        // Revert staged steps with stale fields back to pending-config so
        // the user re-picks before staging.
        return {
          ...s,
          overrides: ov,
          stepStatus:
            s.stepStatus === 'staged' ? 'pending-config' : s.stepStatus,
        } as WizardStepEntry
      }
      return s
    })

    setStepStates(restored)
    setCurrentIndex(Math.min(draft.currentStepIndex, restored.length - 1))
    setShowResumePrompt(false)
    if (staleAny) {
      showNotification(
        'Some saved selections are no longer available — please re-pick where flagged.',
        'info'
      )
    }
  }, [loadDraft, defaults, showNotification])

  const discardDraftAndContinue = useCallback(() => {
    clearDraft()
    setShowResumePrompt(false)
  }, [clearDraft])

  // ─── Step state mutations ──────────────────────────────────────────
  const currentStep = stepStates[currentIndex]
  const currentItem = preflightItems[currentIndex]

  const updateCurrentOverrides = useCallback(
    (next: QbStepOverrides) => {
      setStepStates((prev) => {
        const copy = [...prev]
        const cur = copy[currentIndex]
        if (!cur) return prev
        // Touching a previously staged step → demote to configured (user is
        // now editing). Stage button re-promotes.
        const newStatus =
          cur.stepStatus === 'staged' ? 'configured' : cur.stepStatus
        copy[currentIndex] = {
          ...cur,
          overrides: next,
          stepStatus: cur.blockers.length > 0 ? 'blocked' : newStatus === 'pending-config' ? 'configured' : newStatus,
        }
        return copy
      })
    },
    [currentIndex]
  )

  const persistDraft = useCallback(
    (statesOverride?: WizardStepEntry[], indexOverride?: number) => {
      saveDraft({
        savedAt: new Date().toISOString(),
        userId: '', // hook fills this in
        expenseIds,
        currentStepIndex: indexOverride ?? currentIndex,
        stepStates: statesOverride ?? stepStates,
      })
    },
    [saveDraft, expenseIds, currentIndex, stepStates]
  )

  const stageAndNext = useCallback(() => {
    setStepStates((prev) => {
      const copy = [...prev]
      const cur = copy[currentIndex]
      if (!cur) return prev
      copy[currentIndex] = { ...cur, stepStatus: 'staged' }
      // Save draft synchronously so the user's progress survives a tab close.
      persistDraft(copy, Math.min(currentIndex + 1, prev.length - 1))
      return copy
    })
    setCurrentIndex((i) => Math.min(i + 1, stepStates.length - 1))
  }, [currentIndex, stepStates.length, persistDraft])

  const skipStep = useCallback(() => {
    setStepStates((prev) => {
      const copy = [...prev]
      const cur = copy[currentIndex]
      if (!cur) return prev
      copy[currentIndex] = { ...cur, stepStatus: 'skipped' }
      persistDraft(copy, Math.min(currentIndex + 1, prev.length - 1))
      return copy
    })
    setCurrentIndex((i) => Math.min(i + 1, stepStates.length - 1))
  }, [currentIndex, stepStates.length, persistDraft])

  const navigateToStep = useCallback((i: number) => {
    setCurrentIndex(i)
  }, [])

  // ─── Submit ───────────────────────────────────────────────────────
  const submit = useCallback(
    async (filterToIds?: string[]) => {
      if (!defaults) return
      const stagedItems: BulkSyncItem[] = stepStates
        .filter(
          (s) =>
            s.stepStatus === 'staged' &&
            s.overrides &&
            (!filterToIds || filterToIds.includes(s.expenseId))
        )
        .map((s) => {
          const ov = s.overrides!
          return {
            expenseId: s.expenseId,
            qbEntityType: ov.qbEntityType,
            qbAccountId: ov.qbAccountId,
            paymentAccountId:
              ov.qbEntityType === 'purchase' ? ov.paymentAccountId || null : null,
            customerId: ov.customerId || null,
            classId: ov.classId || null,
            isBillable: ov.isBillable,
            description: ov.description,
            includeReceipt: ov.includeReceipt,
            // qbItemId: send only when billable (the picker is hidden when not).
            // '' = explicit None → backend skips the Item for this line.
            // '<id>' = use that Item. The wizard never sends `undefined`.
            qbItemId: ov.isBillable ? ov.qbItemId || '' : '',
            // qbTaxCodeId: '' = explicit None → no TaxCodeRef on the line.
            // '<id>' = use that TaxCode. The wizard never sends `undefined`.
            qbTaxCodeId: ov.qbTaxCodeId || '',
          }
        })

      if (stagedItems.length === 0) {
        showNotification('Nothing to send — stage at least one expense', 'info')
        return
      }

      setPhase('submitting')
      try {
        const res = await bulkSyncExpensesToQb({ items: stagedItems })
        if (res.status !== 'success') {
          if (res.code === 'QB_RECONNECT_REQUIRED') {
            showNotification('Reconnect QuickBooks to continue', 'error')
          } else {
            showNotification(res.message || 'Bulk send failed', 'error')
          }
          setPhase('wizard')
          return
        }
        setResults(res.data)
        setPhase('results')
        if (res.data.failed.length === 0) {
          // Full success — clear draft, parent refresh.
          clearDraft()
          onComplete()
        }
      } catch (err) {
        console.error('bulk send error', err)
        notifyError(err, 'Bulk send failed')
        setPhase('wizard')
      }
    },
    [defaults, stepStates, showNotification, clearDraft, onComplete]
  )

  const retryFailed = useCallback(
    (failedIds: string[]) => {
      submit(failedIds)
    },
    [submit]
  )

  // ─── Derived UI state ──────────────────────────────────────────────
  const stagedCount = stepStates.filter((s) => s.stepStatus === 'staged').length
  const expenseLabels = useMemo(
    () =>
      new Map(preflightItems.map((it) => [it.expenseId, expenseLabel(it)] as const)),
    [preflightItems]
  )

  const stepDisabledReason = useMemo(() => {
    if (!currentStep || !currentStep.overrides || !defaults) return null
    return getStepDisabledReason(currentStep.overrides, defaults, false)
  }, [currentStep, defaults])

  const canStage =
    currentStep?.stepStatus !== 'blocked' &&
    !!currentStep?.overrides &&
    !stepDisabledReason

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-11/12 max-w-3xl">
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Send {expenseIds.length} expense
              {expenseIds.length === 1 ? '' : 's'} to QuickBooks
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Review each expense, stage what you want to send, then submit all at once.
            </p>
          </div>
        </div>

        {/* ── Loading state ──────────────────────────────────── */}
        {phase === 'loading' && (
          <div className="py-12 text-center text-sm text-gray-500">
            Checking expenses against your QuickBooks setup…
          </div>
        )}

        {/* ── Error state ───────────────────────────────────── */}
        {error && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* ── Resume prompt ────────────────────────────────── */}
        {showResumePrompt && phase === 'wizard' && (
          <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-900 flex items-start justify-between gap-3">
            <div>
              <div className="font-medium">Resume your saved draft?</div>
              <div className="text-xs mt-0.5">
                You have an in-progress configuration for these expenses.
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={discardDraftAndContinue}
                className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50"
              >
                Start fresh
              </button>
              <button
                type="button"
                onClick={resumeDraft}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded"
              >
                Resume
              </button>
            </div>
          </div>
        )}

        {/* ── Wizard body ──────────────────────────────────── */}
        {phase === 'wizard' && currentStep && currentItem && currentItem.expense && defaults && (
          <>
            <SendToQbStepProgress
              steps={stepStates}
              currentIndex={currentIndex}
              onNavigate={navigateToStep}
            />

            {currentStep.stepStatus === 'blocked' && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-900">
                <div className="font-medium">This expense can&apos;t be sent right now</div>
                <ul className="mt-1 list-disc list-inside text-xs">
                  {currentStep.blockers.map((b) => (
                    <li key={b}>
                      {b === 'currency_mismatch' &&
                        "Currency doesn't match your QuickBooks connection"}
                      {b === 'category_unmapped' &&
                        'Category is not mapped to a QuickBooks account'}
                      {b === 'no_category' && 'Expense has no category set'}
                      {!['currency_mismatch', 'category_unmapped', 'no_category'].includes(b) && b}
                    </li>
                  ))}
                </ul>
                <div className="text-xs mt-1.5">Skip this step to continue.</div>
              </div>
            )}

            {currentStep.overrides && (
              <SendToQbStep
                expense={{
                  vendorName: currentItem.expense.vendorName,
                  hasReceipt: !!(
                    currentItem.expense.receiptPath || currentItem.expense.receiptId
                  ),
                  expenseAmount: Number(currentItem.expense.amount || 0),
                  propertyId: currentItem.expense.propertyId,
                  primaryOwnerName: currentItem.expense.primaryOwnerName,
                  taxBreakdown: {
                    gst: Number(currentItem.expense.taxGst || 0),
                    pst: Number(currentItem.expense.taxPst || 0),
                    hst: Number(currentItem.expense.taxHst || 0),
                    qst: Number(currentItem.expense.taxQst || 0),
                  },
                }}
                defaults={defaults}
                value={currentStep.overrides}
                onChange={updateCurrentOverrides}
                disabledReason={stepDisabledReason}
              />
            )}

            {/* ── Step actions ─────────────────────────────── */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
              >
                <ChevronLeftIcon className="w-4 h-4" /> Back
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={skipStep}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded"
                >
                  Skip
                </button>
                {currentIndex < stepStates.length - 1 ? (
                  <button
                    type="button"
                    onClick={stageAndNext}
                    disabled={!canStage}
                    title={!canStage && stepDisabledReason ? stepDisabledReason : undefined}
                    className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Stage &amp; Next <ChevronRightIcon className="w-4 h-4" />
                  </button>
                ) : (
                  // Last step: Stage stays available, but the prominent action
                  // here is "Send All" since we're at the end of the queue.
                  <>
                    <button
                      type="button"
                      onClick={stageAndNext}
                      disabled={!canStage || currentStep.stepStatus === 'staged'}
                      className="px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 rounded disabled:opacity-50"
                    >
                      Stage
                    </button>
                    <button
                      type="button"
                      onClick={() => submit()}
                      disabled={stagedCount === 0}
                      className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded disabled:opacity-50"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      Send {stagedCount} to QuickBooks
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Floating "Send All" reminder once user has staged at least one
                and isn't on the last step — easy escape hatch. */}
            {currentIndex < stepStates.length - 1 && stagedCount > 0 && (
              <div className="text-xs text-gray-500 text-right">
                {stagedCount} staged.{' '}
                <button
                  type="button"
                  onClick={() => submit()}
                  className="text-emerald-700 font-medium hover:underline"
                >
                  Send {stagedCount} now
                </button>
                {' '}or keep configuring.
              </div>
            )}
          </>
        )}

        {/* ── Submitting state ─────────────────────────────── */}
        {phase === 'submitting' && (
          <div className="py-12 text-center">
            <div className="text-sm font-medium text-gray-900">
              Sending to QuickBooks…
            </div>
            <div className="text-xs text-gray-500 mt-1">
              This may take up to 30 seconds for larger batches.
            </div>
          </div>
        )}

        {/* ── Results state ────────────────────────────────── */}
        {phase === 'results' && results && (
          <SendToQbResults
            synced={results.synced}
            failed={results.failed}
            steps={stepStates}
            expenseLabels={expenseLabels}
            onRetry={retryFailed}
            onClose={() => {
              if (results.synced.length > 0) onComplete()
              onClose()
            }}
            submitting={false}
          />
        )}
      </div>
    </Modal>
  )
}
