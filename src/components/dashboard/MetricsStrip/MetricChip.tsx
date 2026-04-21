'use client'

interface MetricChipProps {
  label: string
  value: string | number
  change?: number
  isActive?: boolean
  isCurrency?: boolean
  onClick?: () => void
}

export default function MetricChip({
  label,
  value,
  change,
  isActive,
  isCurrency,
  onClick,
}: MetricChipProps) {
  const formattedValue = isCurrency
    ? `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : value

  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 snap-start items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
        isActive
          ? 'border-gray-900 bg-gray-900 text-white shadow-sm'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-sm'
      } ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <div className="min-w-0">
        <p className={`text-[10px] font-medium uppercase tracking-wider ${isActive ? 'text-gray-400' : 'text-gray-400'}`}>
          {label}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-sm font-bold tabular-nums ${isActive ? 'text-white' : 'text-gray-900'}`}>
            {formattedValue}
          </span>
          {change !== undefined && change !== 0 && (
            <span
              className={`text-[10px] font-medium tabular-nums ${
                change > 0
                  ? isActive ? 'text-emerald-300' : 'text-emerald-600'
                  : isActive ? 'text-red-300' : 'text-red-500'
              }`}
            >
              {change > 0 ? '\u2191' : '\u2193'}
              {Math.abs(change)}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
