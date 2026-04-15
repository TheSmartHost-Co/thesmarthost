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
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <ClockIcon className="w-5 h-5 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <ClockIcon className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-medium text-slate-700">Recent Activity</h3>
        <span className="text-xs text-slate-400">{activities.length}</span>
      </div>

      <div className="p-3 max-h-[400px] overflow-y-auto">
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
    </div>
  )
}
