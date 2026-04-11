'use client'

import { useTranslation } from 'react-i18next'
import { BellSlashIcon } from '@heroicons/react/24/outline'
import type { NotificationFilter } from '@/store/useNotificationCenterStore'

interface NotificationEmptyStateProps {
  activeFilter: NotificationFilter
}

const filterLabelKeys: Record<NotificationFilter, string> = {
  urgent: 'notifEmptyUrgent',
  all: '',
  cleaning: 'notifEmptyCleaning',
  issues: 'notifEmptyIssue',
  supplies: 'notifEmptySupply',
  schedule: 'notifEmptySchedule',
  bookings: 'notifEmptyBooking',
  invoices: 'notifEmptyInvoice',
  automations: 'notifEmptyAutomation',
}

export default function NotificationEmptyState({ activeFilter }: NotificationEmptyStateProps) {
  const { t } = useTranslation('common')
  const labelKey = filterLabelKeys[activeFilter]
  const message = labelKey
    ? t(labelKey)
    : t('noNotificationsYet')

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <BellSlashIcon className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-500">{message}</p>
      <p className="text-xs text-gray-400 mt-1">
        {t('allCaughtUp')}
      </p>
    </div>
  )
}
