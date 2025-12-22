'use client'

import { ClockIcon } from '@heroicons/react/24/outline'
import type { DashboardActivity } from '@/services/types/dashboard'
import { ActivityItem } from './ActivityItem'

interface ActivityFeedProps {
  activities: DashboardActivity[]
  onViewReport?: (reportId: string) => void
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, onViewReport }) => {
  if (activities.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No recent activity</p>
        <p className="text-sm text-gray-500 mt-2">
          Upload a CSV or generate a report to get started
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
        <p className="text-xs text-gray-600 mt-0.5">Last {activities.length} actions</p>
      </div>

      <div className="space-y-0">
        {activities.map((activity, index) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            showConnector={index < activities.length - 1}
            onViewReport={onViewReport}
          />
        ))}
      </div>
    </div>
  )
}
