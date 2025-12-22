'use client'

import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'

interface TrendIndicatorProps {
  direction: 'up' | 'down'
  percentChange: number
  className?: string
  showIcon?: boolean
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  direction,
  percentChange,
  className = '',
  showIcon = true,
}) => {
  const isPositive = direction === 'up'
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600'
  const bgClass = isPositive ? 'bg-green-50' : 'bg-red-50'

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${bgClass} ${colorClass} ${className}`}>
      {showIcon && (
        isPositive ? (
          <ArrowTrendingUpIcon className="w-3 h-3" />
        ) : (
          <ArrowTrendingDownIcon className="w-3 h-3" />
        )
      )}
      <span className="text-xs font-medium">
        {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
      </span>
    </div>
  )
}
