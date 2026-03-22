'use client'

import { BellSlashIcon } from '@heroicons/react/24/outline'
import type { NotificationFilter } from '@/store/useNotificationCenterStore'

interface NotificationEmptyStateProps {
  activeFilter: NotificationFilter
}

const filterLabels: Record<NotificationFilter, string> = {
  urgent: 'urgent',
  all: '',
  cleaning: 'cleaning',
  issues: 'issue',
  supplies: 'supply',
  schedule: 'schedule',
  bookings: 'booking',
  invoices: 'invoice',
}

export default function NotificationEmptyState({ activeFilter }: NotificationEmptyStateProps) {
  const label = filterLabels[activeFilter]
  const message = label
    ? `No ${label} notifications`
    : 'No notifications yet'

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <BellSlashIcon className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-500">{message}</p>
      <p className="text-xs text-gray-400 mt-1">
        {"You're all caught up!"}
      </p>
    </div>
  )
}
