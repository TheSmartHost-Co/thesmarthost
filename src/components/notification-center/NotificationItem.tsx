'use client'

import { useRouter, usePathname } from 'next/navigation'
import {
  SparklesIcon,
  ExclamationTriangleIcon,
  ShoppingCartIcon,
  ClockIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import { TimeAgo } from '@/components/dashboard/shared/TimeAgo'
import { useNotificationCenterStore } from '@/store/useNotificationCenterStore'
import type { InAppNotification, NotificationCategory } from '@/services/types/notificationCenter'

interface NotificationItemProps {
  notification: InAppNotification
  onMarkAsRead: (id: string) => void
}

const categoryConfig: Record<
  NotificationCategory,
  { icon: React.ElementType; iconColor: string }
> = {
  cleaning: { icon: SparklesIcon, iconColor: 'bg-purple-100 text-purple-600' },
  issues: { icon: ExclamationTriangleIcon, iconColor: 'bg-red-100 text-red-600' },
  supplies: { icon: ShoppingCartIcon, iconColor: 'bg-amber-100 text-amber-600' },
  schedule: { icon: ClockIcon, iconColor: 'bg-blue-100 text-blue-600' },
  bookings: { icon: CalendarDaysIcon, iconColor: 'bg-green-100 text-green-600' },
}

export default function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const router = useRouter()
  const pathname = usePathname()
  const closePanel = useNotificationCenterStore((s) => s.closePanel)
  const { icon: Icon, iconColor } = categoryConfig[notification.category]

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification.id)
    }
    closePanel()
    if (notification.linkUrl) {
      // Extract the path portion (before ?) to check if we're already on it
      const linkPath = notification.linkUrl.split('?')[0]
      if (pathname === linkPath) {
        // Same page — use window.location to force full reload with deep-link params
        window.location.href = notification.linkUrl
      } else {
        router.push(notification.linkUrl)
      }
    }
  }

  // Visual states: urgent > unread > read
  let rowClasses = 'bg-white hover:bg-gray-50'
  if (notification.isUrgent && !notification.isRead) {
    rowClasses = 'bg-red-50 border-l-4 border-l-red-400 hover:bg-red-100/70'
  } else if (!notification.isRead) {
    rowClasses = 'bg-blue-50 hover:bg-blue-100/50'
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer border-b border-gray-100 last:border-b-0 ${rowClasses}`}
    >
      {/* Category icon */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm leading-snug ${!notification.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
            {notification.title}
          </p>

          {/* Unread dot */}
          {!notification.isRead && (
            <span
              className={`flex-shrink-0 mt-1.5 w-2 h-2 rounded-full ${
                notification.isUrgent ? 'bg-red-500' : 'bg-blue-500'
              }`}
            />
          )}
        </div>

        {notification.description && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {notification.description}
          </p>
        )}

        <TimeAgo
          timestamp={notification.createdAt}
          className="text-xs text-gray-400 mt-1 block"
        />
      </div>
    </button>
  )
}
