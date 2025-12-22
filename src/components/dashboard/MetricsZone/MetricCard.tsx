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
      className={`${bgColor} border ${borderColor} rounded-2xl p-5 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatValue()}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
      </div>
    </motion.div>
  )
}
