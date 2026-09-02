'use client'

import { useTranslation } from 'react-i18next'
import type { NotificationFilter } from '@/store/useNotificationCenterStore'

interface NotificationCategoryTabsProps {
  activeFilter: NotificationFilter
  onFilterChange: (filter: NotificationFilter) => void
  urgentUnreadCount: number
}

const tabs: { key: NotificationFilter; labelKey: string }[] = [
  { key: 'urgent', labelKey: 'notifUrgent' },
  { key: 'all', labelKey: 'notifAll' },
  { key: 'cleaning', labelKey: 'notifCleaning' },
  { key: 'issues', labelKey: 'notifIssues' },
  { key: 'supplies', labelKey: 'notifSupplies' },
  { key: 'schedule', labelKey: 'notifSchedule' },
  { key: 'bookings', labelKey: 'notifBookings' },
  { key: 'invoices', labelKey: 'notifInvoices' },
  { key: 'maintenance', labelKey: 'notifMaintenance' },
  { key: 'automations', labelKey: 'notifAI' },
  { key: 'time_sheet', labelKey: 'notifTimeSheet' },
  { key: 'reports', labelKey: 'notifReports' },
]

export default function NotificationCategoryTabs({
  activeFilter,
  onFilterChange,
  urgentUnreadCount,
}: NotificationCategoryTabsProps) {
  const { t } = useTranslation('common')
  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-gray-100">
      {tabs.map(({ key, labelKey }) => {
        const label = t(labelKey)
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
