'use client'

import React from 'react'
import { HomeModernIcon } from '@heroicons/react/24/outline'
import type { UploadedReceipt } from '@/services/types/receipt'
import type { Property } from '@/services/types/property'

interface LinkedExpenseLike {
  propertyId?: string | null
  propertyName?: string | null
}

interface PropertyChipProps {
  receipt: Pick<UploadedReceipt, 'propertyName' | 'propertyId'>
  linkedExpense?: LinkedExpenseLike | null
  properties?: Property[]
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
  properties?: Property[],
): Resolved {
  // Prefer address lookup from properties array
  if (properties?.length) {
    const receiptPropId = receipt.propertyId
    const expensePropId = linkedExpense?.propertyId
    if (receiptPropId) {
      const p = properties.find((prop) => prop.id === receiptPropId)
      if (p && (p.address || p.listingName)) return { name: p.address || p.listingName!, source: 'own' }
    }
    if (expensePropId) {
      const p = properties.find((prop) => prop.id === expensePropId)
      if (p && (p.address || p.listingName)) return { name: p.address || p.listingName!, source: 'expense' }
    }
  }
  // Fall back to denormalized propertyName
  if (receipt.propertyName) return { name: receipt.propertyName, source: 'own' }
  if (linkedExpense?.propertyName) return { name: linkedExpense.propertyName, source: 'expense' }
  return { name: null, source: 'unassigned' }
}

const PropertyChip: React.FC<PropertyChipProps> = ({
  receipt,
  linkedExpense,
  properties,
  size = 'sm',
  showFromExpenseHint = true,
  className = '',
}) => {
  const resolved = resolveProperty(receipt, linkedExpense, properties)
  const isUnassigned = resolved.source === 'unassigned'

  const sizing =
    size === 'sm'
      ? 'text-xs px-2 py-0.5 gap-1'
      : 'text-sm px-2.5 py-1 gap-1.5'
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
      <span>{resolved.name ?? 'Unassigned'}</span>
      {resolved.source === 'expense' && showFromExpenseHint && (
        <span className={`${size === 'sm' ? 'text-[10px]' : 'text-xs'} font-normal text-indigo-400 flex-shrink-0`}>
          (from expense)
        </span>
      )}
    </span>
  )
}

export default PropertyChip
