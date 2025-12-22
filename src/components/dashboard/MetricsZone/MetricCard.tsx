'use client'

interface MetricCardProps {
  title: string
  value: number
  subtitle: string
  gradient: string
  icon?: React.ReactNode
  isCurrency?: boolean
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  gradient,
  icon,
  isCurrency = false,
}) => {
  const formatValue = () => {
    if (isCurrency) {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return value.toLocaleString()
  }

  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wide">
          {title}
        </h3>
        {icon && <div className="text-gray-500">{icon}</div>}
      </div>
      <div className="space-y-0.5">
        <p className="text-3xl font-bold text-gray-900">
          {formatValue()}
        </p>
        <p className="text-xs text-gray-600">
          {subtitle}
        </p>
      </div>
    </div>
  )
}
