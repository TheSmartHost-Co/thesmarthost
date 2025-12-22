'use client'

import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  CloudArrowUpIcon,
  DocumentChartBarIcon,
  UserPlusIcon,
  HomeModernIcon,
} from '@heroicons/react/24/outline'

interface ActionBarProps {
  onGenerateReport: () => void
  onNewClient: () => void
  onNewProperty: () => void
}

export const ActionBar: React.FC<ActionBarProps> = ({
  onGenerateReport,
  onNewClient,
  onNewProperty,
}) => {
  const router = useRouter()

  const handleUploadCSV = () => {
    router.push('/property-manager/upload-bookings')
  }

  const actions = [
    {
      label: 'Upload CSV',
      icon: CloudArrowUpIcon,
      onClick: handleUploadCSV,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
      hoverColor: 'hover:bg-blue-100',
    },
    {
      label: 'Generate Report',
      icon: DocumentChartBarIcon,
      onClick: onGenerateReport,
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100',
      hoverColor: 'hover:bg-purple-100',
    },
    {
      label: 'New Client',
      icon: UserPlusIcon,
      onClick: onNewClient,
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100',
      hoverColor: 'hover:bg-green-100',
    },
    {
      label: 'New Property',
      icon: HomeModernIcon,
      onClick: onNewProperty,
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100',
      hoverColor: 'hover:bg-amber-100',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action, index) => (
        <motion.button
          key={action.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={action.onClick}
          className={`${action.bgColor} ${action.hoverColor} border ${action.borderColor} rounded-2xl p-4 transition-all text-left group`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${action.iconBg} rounded-xl flex items-center justify-center group-hover:shadow-md transition-shadow flex-shrink-0`}>
              <action.icon className={`h-5 w-5 ${action.iconColor}`} />
            </div>
            <span className="text-sm font-semibold text-gray-900">{action.label}</span>
          </div>
        </motion.button>
      ))}
    </div>
  )
}
