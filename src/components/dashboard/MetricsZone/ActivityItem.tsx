'use client'

import { useRouter } from 'next/navigation'
import {
  DocumentTextIcon,
  CloudArrowUpIcon,
  HomeModernIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import type { DashboardActivity } from '@/services/types/dashboard'
import { TimeAgo } from '../shared/TimeAgo'

interface ActivityItemProps {
  activity: DashboardActivity
  showConnector: boolean
  onViewReport?: (reportId: string) => void
}

export const ActivityItem: React.FC<ActivityItemProps> = ({ activity, showConnector, onViewReport }) => {
  const router = useRouter()

  const getIcon = () => {
    switch (activity.type) {
      case 'report_generated':
        return <DocumentTextIcon className="w-3.5 h-3.5" />
      case 'csv_uploaded':
        return <CloudArrowUpIcon className="w-3.5 h-3.5" />
      case 'property_created':
      case 'property_updated':
        return <HomeModernIcon className="w-3.5 h-3.5" />
      case 'client_created':
      case 'client_updated':
        return <UserCircleIcon className="w-3.5 h-3.5" />
      default:
        return null
    }
  }

  const getIconColor = () => {
    switch (activity.type) {
      case 'report_generated':
        return 'bg-blue-100 text-blue-600'
      case 'csv_uploaded':
        return 'bg-green-100 text-green-600'
      case 'property_created':
      case 'property_updated':
        return 'bg-purple-100 text-purple-600'
      case 'client_created':
      case 'client_updated':
        return 'bg-orange-100 text-orange-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getQuickActions = () => {
    const actions: React.ReactNode[] = []

    if (activity.type === 'report_generated' && activity.metadata.reportId) {
      actions.push(
        <button
          key="view-report"
          onClick={() => onViewReport?.(activity.metadata.reportId!)}
          className="px-2 py-1 text-xs text-blue-700 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
        >
          View
        </button>
      )
    }

    if (activity.type === 'csv_uploaded' && activity.metadata.propertyId) {
      actions.push(
        <button
          key="view-bookings"
          onClick={() => router.push(`/property-manager/bookings?propertyId=${activity.metadata.propertyId}`)}
          className="px-2 py-1 text-xs text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors"
        >
          View
        </button>
      )
    }

    if ((activity.type === 'property_created' || activity.type === 'property_updated') && activity.metadata.propertyId) {
      actions.push(
        <button
          key="view-property"
          onClick={() => router.push(`/property-manager/properties`)}
          className="px-2 py-1 text-xs text-purple-700 bg-purple-100 rounded hover:bg-purple-200 transition-colors"
        >
          View
        </button>
      )
    }

    if ((activity.type === 'client_created' || activity.type === 'client_updated') && activity.metadata.clientId) {
      actions.push(
        <button
          key="view-client"
          onClick={() => router.push(`/property-manager/clients`)}
          className="px-2 py-1 text-xs text-orange-700 bg-orange-100 rounded hover:bg-orange-200 transition-colors"
        >
          View
        </button>
      )
    }

    return actions
  }

  return (
    <div className="relative flex gap-3 group">
      {/* Timeline connector */}
      {showConnector && (
        <div className="absolute left-2.5 top-7 bottom-0 w-0.5 bg-gray-200" />
      )}

      {/* Icon */}
      <div className={`relative z-10 flex-shrink-0 w-5 h-5 rounded-full ${getIconColor()} flex items-center justify-center`}>
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 pb-3">
        <div className="bg-white border border-gray-200 rounded p-2.5 hover:shadow-sm transition-shadow duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {activity.description}
              </p>
              <TimeAgo
                timestamp={activity.timestamp}
                className="text-xs text-gray-500"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {getQuickActions()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
