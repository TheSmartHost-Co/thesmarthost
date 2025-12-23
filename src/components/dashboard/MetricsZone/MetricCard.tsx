'use client'

import { motion } from 'framer-motion'

interface MetricCardProps {
  title: string
  value: number
  subtitle: string
  bgColor: string
  iconBg: string
  iconColor: string
  borderColor: string
  icon: React.ElementType
  isCurrency?: boolean
  index?: number
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  bgColor,
  iconBg,
  iconColor,
  borderColor,
  icon: Icon,
  isCurrency = false,
  index = 0,
}) => {
  const formatValue = () => {
    if (isCurrency) {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
    return value.toLocaleString()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`${bgColor} border ${borderColor} rounded-lg p-3 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-600">{title}</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{formatValue()}</p>
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <div className={`w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </motion.div>
  )
}
