'use client'

import { useState, useEffect, useRef } from 'react'

interface MetricCardProps {
  title: string
  value: number
  subtitle: string
  isCurrency?: boolean
  secondaryLine?: string
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  isCurrency = false,
  secondaryLine,
}) => {
  const [displayValue, setDisplayValue] = useState(0)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current || value === 0) {
      setDisplayValue(value)
      return
    }
    hasAnimated.current = true

    const duration = 400
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      setDisplayValue(Math.round(easeOut(progress) * value * 100) / 100)
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [value])

  const formatValue = () => {
    const v = displayValue
    if (isCurrency) {
      return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return Math.round(v).toLocaleString()
  }

  return (
    <div className="min-w-0 px-2.5 py-2 sm:px-3 sm:py-2.5 border-r border-stone-200 last:border-r-0 max-sm:border-b max-sm:border-stone-200 max-sm:[&:nth-child(odd):last-child]:col-span-2">
      <p className="text-[10px] font-medium text-stone-500 uppercase tracking-wider">{title}</p>
      <p className="text-base sm:text-lg font-bold text-stone-900 tabular-nums mt-0.5">{formatValue()}</p>
      {secondaryLine && (
        <p className="text-[10px] font-medium text-amber-600 mt-0.5">{secondaryLine}</p>
      )}
      <p className="text-[10px] text-stone-400 mt-0.5">{subtitle}</p>
    </div>
  )
}
