'use client'

import { useEffect, useMemo, useState } from 'react'
import Modal from '@/components/shared/modal'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import {
  syncExpenseToQb,
  getQbAccounts,
  getQbPaymentAccounts,
  getAccountMappings,
  getConnection,
  getQbCustomers,
  getQbClasses,
  getPropertyClassMappings,
  upsertPropertyClassMapping,
  getTaxCodeMappings,
  getQbItems,
} from '@/services/quickbooksService'
import { useNotificationStore } from '@/store/useNotificationStore'
import type {
  QbEntityType,
  SyncExpensePayload,
  QbDefaults,
  QbStepOverrides,
} from '@/services/types/quickbooks'
import SendToQbStep from './SendToQbWizard/SendToQbStep'
import {
  computeInitialStepValue,
  getStepDisabledReason,
} from './SendToQbWizard/qbStepHelpers'

interface SendToQbModalProps {
  isOpen: boolean
  onClose: () => void
  expenseId: string
  /** Vendor name shown in the confirmation header. Optional — only for clarity. */
  vendorName?: string | null
  /** Whether the expense has a receipt attached. Drives the default of the checkbox. */
  hasReceipt: boolean
  /** Connection-level default; pre-fills the dropdown so the user can override per-call. */
  connectionDefaultEntityType: QbEntityType
  /** Expense category code; drives the default of the line-level expense-category picker. */
  categoryCode?: string | null
  /** Expense amount; populates the resolution summary. */
  expenseAmount?: number
  /** Property the expense belongs to; resolves the default Class via property→class mapping. */
  propertyId?: string | null
  /** Primary owner client name; auto-fills Customer when a QBO customer's displayName matches case-insensitively. */
  primaryOwnerName?: string | null
  /** Per-tax-kind amounts; powers the tax breakdown panel + mapping warnings. */
  taxBreakdown?: { gst: number; pst: number; hst: number; qst: number }
  /** Initial Description value (pre-filled from expense.description, editable per-send). */
  expenseDescription?: string
  onSynced: (result: { qbEntityId: string; qbEntityType: QbEntityType; attached: boolean }) => void
}

/** Default skeleton used before the QB defaults Promise.all resolves. */
const EMPTY_DEFAULTS: QbDefaults = {
  qbAccounts: [],
  paymentAccounts: [],
  qbCustomers: [],
  qbClasses: [],
  qbItems: [],
  accountMappings: [],
  classMappings: [],
  taxMappings: [],
  connectionStatus: null,
  connectionDefaultEntityType: 'purchase',
  defaultPaymentAccountId: null,
  defaultPaymentAccountName: null,
  billableItemId: null,
  billableItemName: null,
}

export default function SendToQbModal({
  isOpen,
  onClose,
  expenseId,
  vendorName,
  hasReceipt,
  connectionDefaultEntityType,
  categoryCode,
  expenseAmount,
  propertyId,
  primaryOwnerName,
  taxBreakdown,
  expenseDescription,
  onSynced,
}: SendToQbModalProps) {
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [defaults, setDefaults] = useState<QbDefaults>(EMPTY_DEFAULTS)
  const [value, setValue] = useState<QbStepOverrides>({
    qbEntityType: connectionDefaultEntityType,
    qbAccountId: '',
    paymentAccountId: '',
    customerId: '',
    classId: '',
    isBillable: true,
    description: expenseDescription || '',
    includeReceipt: hasReceipt,
    qbItemId: '',
  })
  const { showNotification } = useNotificationStore()

  // Fetch all QB defaults in parallel on open. Note: customers/classes/tax-codes
  // can legitimately be empty if the user hasn't set them up in QBO yet —
  // the UI degrades gracefully (pickers show "no options found").
  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    setLoading(true)
    Promise.all([
      getQbAccounts(),
      getQbPaymentAccounts(),
      getAccountMappings(),
      getConnection(),
      getQbCustomers(),
      getQbClasses(),
      getPropertyClassMappings(),
      getTaxCodeMappings(),
      getQbItems(),
    ])
      .then(
        ([
          accountsRes,
          paymentRes,
          mappingsRes,
          connRes,
          customersRes,
          classesRes,
          classMapsRes,
          taxMapsRes,
          itemsRes,
        ]) => {
          if (cancelled) return
          const conn = connRes.status === 'success' ? connRes.data : null
          const nextDefaults: QbDefaults = {
            qbAccounts: accountsRes.status === 'success' ? accountsRes.data : [],
            paymentAccounts: paymentRes.status === 'success' ? paymentRes.data : [],
            qbCustomers: customersRes.status === 'success' ? customersRes.data : [],
            qbClasses: classesRes.status === 'success' ? classesRes.data : [],
            qbItems: itemsRes.status === 'success' ? itemsRes.data : [],
            accountMappings: mappingsRes.status === 'success' ? mappingsRes.data : [],
            classMappings: classMapsRes.status === 'success' ? classMapsRes.data : [],
            taxMappings: taxMapsRes.status === 'success' ? taxMapsRes.data : [],
            connectionStatus: conn?.status ?? null,
            connectionDefaultEntityType:
              (conn?.defaultQbEntityType as QbEntityType) || connectionDefaultEntityType,
            defaultPaymentAccountId: conn?.defaultPaymentAccountId ?? null,
            defaultPaymentAccountName: conn?.defaultPaymentAccountName ?? null,
            billableItemId: conn?.billableItemId ?? null,
            billableItemName: conn?.billableItemName ?? null,
          }
          setDefaults(nextDefaults)
          // Re-derive the initial value once defaults arrive — mappings drive
          // the initial qbAccountId/classId/customerId picks.
          setValue(
            computeInitialStepValue(
              {
                hasReceipt,
                expenseDescription,
                categoryCode,
                propertyId,
                primaryOwnerName,
              },
              nextDefaults
            )
          )
        }
      )
      .catch((err) => {
        console.error('Failed to load QB defaults:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    categoryCode,
    connectionDefaultEntityType,
    hasReceipt,
    propertyId,
    primaryOwnerName,
    expenseDescription,
  ])

  const disabledReason = useMemo(
    () => getStepDisabledReason(value, defaults, loading),
    [value, defaults, loading]
  )
  const sendDisabled = submitting || loading || disabledReason !== null

  const handleSend = async () => {
    setSubmitting(true)
    try {
      const payload: SyncExpensePayload = {
        qbEntityType: value.qbEntityType,
        includeReceipt: value.includeReceipt,
        qbAccountId: value.qbAccountId,
        // Always send isBillable + description so the backend has the most
        // recent value the user picked. customerId / classId only sent when
        // set — null/empty omits them in the payload.
        isBillable: value.isBillable,
        description: value.description,
        // qbItemId: send the picker's value only when billable (the ItemRef
        // doesn't fire on non-billable lines anyway). Sending '' = explicit
        // None; sending '<id>' = use that Item; omitting entirely = backend
        // auto-resolves (the path programmatic/legacy callers go down).
        qbItemId: value.isBillable ? value.qbItemId : '',
      }
      if (value.qbEntityType === 'purchase') {
        payload.paymentAccountId = value.paymentAccountId
      }
      if (value.customerId) payload.customerId = value.customerId
      if (value.classId) payload.classId = value.classId

      const res = await syncExpenseToQb(expenseId, payload)
      if (res.status === 'success') {
        // Learn-on-first-use: if the user picked a Class for an expense whose
        // property has no saved class mapping yet, persist it silently so
        // future sends auto-fill the same value. Existing mapping = leave
        // alone — settings page is the source of truth for explicit edits.
        if (propertyId && value.classId) {
          const existing = defaults.classMappings.find((m) => m.propertyId === propertyId)
          if (!existing) {
            upsertPropertyClassMapping(propertyId, value.classId).catch((err) => {
              console.error('Failed to learn property→class mapping:', err)
            })
          }
        }

        onSynced({
          qbEntityId: res.data.qbEntityId,
          qbEntityType: res.data.qbEntityType,
          attached: res.data.attached,
        })
        showNotification(
          res.data.alreadySynced
            ? 'Already in QuickBooks'
            : `Sent to QuickBooks${res.data.attached ? ' with receipt' : ''}`,
          'success'
        )
        onClose()
      } else {
        if (res.code === 'QB_RECONNECT_REQUIRED') {
          showNotification('Reconnect QuickBooks to continue', 'error')
        } else {
          showNotification(res.message || 'Failed to send to QuickBooks', 'error')
        }
      }
    } catch (err) {
      console.error('QB sync error:', err)
      showNotification(
        err instanceof Error ? err.message : 'Failed to send to QuickBooks',
        'error'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-11/12 max-w-2xl">
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Send to QuickBooks</h3>

        <SendToQbStep
          expense={{
            vendorName,
            hasReceipt,
            expenseAmount,
            propertyId,
            primaryOwnerName,
            taxBreakdown,
          }}
          defaults={defaults}
          value={value}
          onChange={setValue}
          loading={loading}
          disabledReason={disabledReason}
        />

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sendDisabled}
            title={sendDisabled && disabledReason ? disabledReason : undefined}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircleIcon className="w-4 h-4" />
            {submitting ? 'Sending…' : 'Send to QuickBooks'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
