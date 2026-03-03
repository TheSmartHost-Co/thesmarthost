'use client'

import React from 'react'
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline'

interface SupplyListBadgeProps {
  count: number
  onClick?: () => void
  size?: 'sm' | 'md'
}

const SupplyListBadge: React.FC<SupplyListBadgeProps> = ({
  count,
  onClick,
  size = 'sm',
}) => {
  if (count === 0) return null

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
  }

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
  }

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium border
        bg-teal-100 text-teal-700 border-teal-200
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
      `}
      onClick={onClick}
    >
      <ClipboardDocumentListIcon className={iconSizes[size]} />
      <span>{count} supply</span>
    </span>
  )
}

export default SupplyListBadge
