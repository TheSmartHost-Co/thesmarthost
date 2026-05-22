'use client'

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { PayPeriodStatus } from '@/services/types/payPeriod'

interface Props {
  status: PayPeriodStatus
  hasPending?: boolean
  pendingCount?: number
}

const BADGE: Record<PayPeriodStatus, { cls: string; label: string }> = {
  open: { cls: 'bg-blue-100 text-blue-700',    label: 'Open' },
  paid: { cls: 'bg-emerald-100 text-emerald-700', label: 'Paid' },
}

export default function PayPeriodStatusBadge({ status, hasPending, pendingCount }: Props) {
  const { cls, label } = BADGE[status]
  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${cls}`}>
        {label}
      </span>
      {hasPending && status === 'open' && (
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-700"
          title="Pending entries are included in totals"
        >
          <ExclamationTriangleIcon className="w-3 h-3" />
          {pendingCount != null ? `${pendingCount} pending` : 'pending'}
        </span>
      )}
    </div>
  )
}
