'use client'

interface MetricCardProps {
  title: string
  value: number
  subtitle: string
  isCurrency?: boolean
  secondaryLine?: string
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  isCurrency = false,
  secondaryLine,
}) => {
  const formatValue = () => {
    if (isCurrency) {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return value.toLocaleString()
  }

  return (
    <div className="min-w-0 px-2.5 py-2 sm:px-4 sm:py-3 border-b border-r border-gray-100 sm:border-b-0 sm:border-r last:border-r-0 max-sm:[&:nth-child(odd):last-child]:col-span-2">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
      <p className="text-lg sm:text-xl font-semibold text-slate-800 mt-0.5">{formatValue()}</p>
      {secondaryLine && (
        <p className="text-xs font-medium text-amber-600 mt-0.5">{secondaryLine}</p>
      )}
      <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">{subtitle}</p>
    </div>
  )
}
