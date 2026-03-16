'use client'

import { useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNotificationCenterStore } from '@/store/useNotificationCenterStore'
import type { NotificationFilter } from '@/store/useNotificationCenterStore'
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/services/notificationCenterService'
import NotificationCategoryTabs from './NotificationCategoryTabs'
import NotificationItem from './NotificationItem'
import NotificationEmptyState from './NotificationEmptyState'

interface NotificationPanelProps {
  onFetchFiltered: (filter: NotificationFilter) => void
}

export default function NotificationPanel({ onFetchFiltered }: NotificationPanelProps) {
  const {
    notifications,
    unreadCount,
    urgentUnreadCount,
    activeFilter,
    isLoading,
    setActiveFilter,
    markAsReadOptimistic,
    markAllAsReadOptimistic,
  } = useNotificationCenterStore()

  // Client-side filtering of already-fetched notifications
  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications
    if (activeFilter === 'urgent') return notifications.filter((n) => n.isUrgent)
    return notifications.filter((n) => n.category === activeFilter)
  }, [notifications, activeFilter])

  const handleFilterChange = useCallback(
    (filter: NotificationFilter) => {
      setActiveFilter(filter)
      // Fetch from API for category/urgent filters to get server-filtered results
      if (filter !== 'all') {
        onFetchFiltered(filter)
      }
    },
    [setActiveFilter, onFetchFiltered]
  )

  const handleMarkAsRead = useCallback(
    (id: string) => {
      markAsReadOptimistic(id)
      // Fire-and-forget API call
      markNotificationAsRead(id).catch(console.error)
    },
    [markAsReadOptimistic]
  )

  const handleMarkAllRead = useCallback(() => {
    markAllAsReadOptimistic()
    markAllNotificationsAsRead().catch(console.error)
  }, [markAllAsReadOptimistic])

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-full sm:mt-2 sm:w-96 max-h-[480px] bg-white rounded-2xl shadow-xl border border-gray-200 z-[60] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <NotificationCategoryTabs
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
        urgentUnreadCount={urgentUnreadCount}
      />

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <NotificationEmptyState activeFilter={activeFilter} />
        ) : (
          filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
            />
          ))
        )}
      </div>
    </motion.div>
  )
}
