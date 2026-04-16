'use client'

import { ReceiptPercentIcon } from '@heroicons/react/24/outline'
import type { SupplyList } from '@/services/types/supplyList'

interface NeedsReceiptBadgeProps {
  supplyList: SupplyList
  compact?: boolean
}

/**
 * Returns true if the supply list has no receipts attached.
 */
export function supplyListNeedsReceipt(sl: SupplyList): boolean {
  return (sl.receipts?.length || 0) === 0
}

export default function NeedsReceiptBadge({ supplyList, compact = false }: NeedsReceiptBadgeProps) {
  if (!supplyListNeedsReceipt(supplyList)) return null

  if (compact) {
    return (
      <span
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white shadow-sm ring-1 ring-amber-600/20"
        title="Needs receipt"
        aria-label="Needs receipt"
      >
        <ReceiptPercentIcon className="w-3 h-3" />
      </span>
    )
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500 text-white shadow-sm ring-1 ring-amber-600/20"
      title="This list has purchased items but no receipt attached"
    >
      <ReceiptPercentIcon className="w-3 h-3" />
      Needs receipt
    </span>
  )
}
