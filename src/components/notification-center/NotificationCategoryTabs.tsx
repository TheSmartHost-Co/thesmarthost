'use client'

import type { NotificationFilter } from '@/store/useNotificationCenterStore'

interface NotificationCategoryTabsProps {
  activeFilter: NotificationFilter
  onFilterChange: (filter: NotificationFilter) => void
  urgentUnreadCount: number
}

const tabs: { key: NotificationFilter; label: string }[] = [
  { key: 'urgent', label: 'Urgent' },
  { key: 'all', label: 'All' },
  { key: 'cleaning', label: 'Cleaning' },
  { key: 'issues', label: 'Issues' },
  { key: 'supplies', label: 'Supplies' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'automations', label: 'AI' },
]

export default function NotificationCategoryTabs({
  activeFilter,
  onFilterChange,
  urgentUnreadCount,
}: NotificationCategoryTabsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-gray-100">
      {tabs.map(({ key, label }) => {
        const isActive = activeFilter === key
        const isUrgent = key === 'urgent'

        // Urgent tab styling
        if (isUrgent) {
          return (
            <button
              key={key}
              onClick={() => onFilterChange(key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-gray-50 text-gray-600 border border-transparent hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {label}
              {urgentUnreadCount > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                  isActive ? 'bg-red-200 text-red-800' : 'bg-red-100 text-red-700'
                }`}>
                  {urgentUnreadCount}
                </span>
              )}
            </button>
          )
        }

        // Standard tab styling
        return (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              isActive
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 text-gray-600 border border-transparent hover:bg-gray-100'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
