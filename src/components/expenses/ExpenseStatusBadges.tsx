'use client'

import React from 'react'
import type { PaymentStatus, QbSyncStatus } from '@/services/types/expense'

const PAYMENT_BADGE: Record<PaymentStatus, { label: string; cls: string }> = {
  paid:       { label: 'Paid',       cls: 'bg-green-100 text-green-700' },
  pending:    { label: 'Pending',    cls: 'bg-yellow-100 text-yellow-700' },
  reimbursed: { label: 'Reimbursed', cls: 'bg-blue-100 text-blue-700' },
  cancelled:  { label: 'Cancelled',  cls: 'bg-gray-100 text-gray-500' },
}

const QB_BADGE: Record<QbSyncStatus, { label: string; cls: string }> = {
  pending: { label: 'QB: pending', cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
  synced:  { label: 'QB: synced',  cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  failed:  { label: 'QB: failed',  cls: 'bg-red-100 text-red-700 border border-red-200' },
}

interface ExpenseStatusBadgesProps {
  paymentStatus: PaymentStatus
  qbSyncStatus?: QbSyncStatus | null
  /** Stack vertically (table cells) or inline (detail panes) */
  layout?: 'stacked' | 'inline'
}

/**
 * Renders payment_status + qb_sync_status as two visually-distinct chips.
 * Replaces the scattered inline color logic that used to live on the expenses page.
 */
export default function ExpenseStatusBadges({
  paymentStatus,
  qbSyncStatus,
  layout = 'stacked',
}: ExpenseStatusBadgesProps) {
  const pay = PAYMENT_BADGE[paymentStatus] || PAYMENT_BADGE.pending
  const qb = qbSyncStatus ? QB_BADGE[qbSyncStatus] : null
  const wrapClass = layout === 'stacked'
    ? 'flex flex-col gap-1 items-start'
    : 'flex flex-row gap-1.5 items-center flex-wrap'

  return (
    <div className={wrapClass}>
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pay.cls}`}>
        {pay.label}
      </span>
      {qb && (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${qb.cls}`}>
          {qb.label}
        </span>
      )}
    </div>
  )
}
