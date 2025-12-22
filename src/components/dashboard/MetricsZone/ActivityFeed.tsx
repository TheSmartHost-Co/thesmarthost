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
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ClockIcon className="w-8 h-8 text-gray-400" />
        </div>
        <p className="font-semibold text-gray-900">No recent activity</p>
        <p className="text-sm text-gray-500 mt-2">
          Upload a CSV or generate a report to get started
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
          <ClockIcon className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
          <p className="text-xs text-gray-600">Last {activities.length} actions</p>
        </div>
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
