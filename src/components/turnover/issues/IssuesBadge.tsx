'use client'

import React from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { IssueCounts } from '@/services/types/projectIssue'

interface IssuesBadgeProps {
  counts: IssueCounts
  onClick?: () => void
  size?: 'sm' | 'md'
}

/**
 * Badge showing issue counts for a project
 * Shows open/acknowledged count with different colors based on severity
 */
const IssuesBadge: React.FC<IssuesBadgeProps> = ({
  counts,
  onClick,
  size = 'sm'
}) => {
  const openCount = counts.open + counts.acknowledged

  if (counts.total === 0) {
    return null
  }

  const hasOpenIssues = openCount > 0

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5'
  }

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4'
  }

  const bgColor = hasOpenIssues
    ? counts.open > 0
      ? 'bg-red-100 text-red-700 border-red-200'
      : 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-green-100 text-green-700 border-green-200'

  const content = (
    <span
      className={`
        inline-flex items-center rounded-full font-medium border
        ${sizeClasses[size]}
        ${bgColor}
        ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
      `}
      onClick={onClick}
    >
      <ExclamationTriangleIcon className={iconSizes[size]} />
      {hasOpenIssues ? (
        <span>{openCount} open</span>
      ) : (
        <span>{counts.resolved} resolved</span>
      )}
    </span>
  )

  return content
}

export default IssuesBadge
