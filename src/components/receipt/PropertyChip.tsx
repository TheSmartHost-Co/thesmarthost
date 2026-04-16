'use client'

import React from 'react'
import { HomeModernIcon } from '@heroicons/react/24/outline'
import type { UploadedReceipt } from '@/services/types/receipt'

interface LinkedExpenseLike {
  propertyId?: string | null
  propertyName?: string | null
}

interface PropertyChipProps {
  receipt: Pick<UploadedReceipt, 'propertyName' | 'propertyId'>
  linkedExpense?: LinkedExpenseLike | null
  size?: 'sm' | 'md'
  showFromExpenseHint?: boolean
  className?: string
}

type Resolved =
  | { name: string; source: 'own' | 'expense' }
  | { name: null; source: 'unassigned' }

function resolveProperty(
  receipt: PropertyChipProps['receipt'],
  linkedExpense?: LinkedExpenseLike | null,
): Resolved {
  if (receipt.propertyName) return { name: receipt.propertyName, source: 'own' }
  if (linkedExpense?.propertyName) return { name: linkedExpense.propertyName, source: 'expense' }
  return { name: null, source: 'unassigned' }
}

const PropertyChip: React.FC<PropertyChipProps> = ({
  receipt,
  linkedExpense,
  size = 'sm',
  showFromExpenseHint = true,
  className = '',
}) => {
  const resolved = resolveProperty(receipt, linkedExpense)
  const isUnassigned = resolved.source === 'unassigned'

  const sizing =
    size === 'sm'
      ? 'text-xs px-2 py-0.5 gap-1 max-w-[160px]'
      : 'text-sm px-2.5 py-1 gap-1.5 max-w-[260px]'
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'

  const tone = isUnassigned
    ? 'bg-transparent border border-dashed border-gray-300 text-gray-400'
    : 'bg-indigo-50 border border-indigo-100 text-indigo-700'

  const iconTone = isUnassigned ? 'text-gray-300' : 'text-indigo-500'

  const title = resolved.name
    ? resolved.source === 'expense'
      ? `${resolved.name} (from linked expense)`
      : resolved.name
    : 'No property assigned'

  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full font-medium ${sizing} ${tone} ${className}`}
    >
      <HomeModernIcon className={`${iconSize} flex-shrink-0 ${iconTone}`} />
      <span className="truncate">{resolved.name ?? 'Unassigned'}</span>
      {resolved.source === 'expense' && showFromExpenseHint && (
        <span className={`${size === 'sm' ? 'text-[10px]' : 'text-xs'} font-normal text-indigo-400 flex-shrink-0`}>
          (from expense)
        </span>
      )}
    </span>
  )
}

export default PropertyChip
