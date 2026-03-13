'use client'

import { useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BellIcon } from '@heroicons/react/24/outline'
import { useNotificationCenterStore } from '@/store/useNotificationCenterStore'
import type { NotificationFilter } from '@/store/useNotificationCenterStore'
import { getNotifications } from '@/services/notificationCenterService'
import NotificationPanel from './NotificationPanel'

export default function NotificationBell() {
  const {
    unreadCount,
    urgentUnreadCount,
    isPanelOpen,
    togglePanel,
    closePanel,
    setNotifications,
    setLoading,
  } = useNotificationCenterStore()

  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch notifications when panel opens
  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getNotifications({ limit: 30 })
      if (res.status === 'success') {
        setNotifications(res.data)
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [setNotifications, setLoading])

  // Fetch filtered notifications (from panel tab change)
  const fetchFiltered = useCallback(
    async (filter: NotificationFilter) => {
      setLoading(true)
      try {
        const params =
          filter === 'urgent'
            ? { is_urgent: true, limit: 30 }
            : filter === 'all'
              ? { limit: 30 }
              : { category: filter as Exclude<NotificationFilter, 'urgent' | 'all'>, limit: 30 }
        const res = await getNotifications(params)
        if (res.status === 'success') {
          setNotifications(res.data)
        }
      } catch (err) {
        console.error('Failed to fetch filtered notifications:', err)
      } finally {
        setLoading(false)
      }
    },
    [setNotifications, setLoading]
  )

  const handleToggle = useCallback(() => {
    const willOpen = !isPanelOpen
    togglePanel()
    if (willOpen) {
      fetchNotifications()
    }
  }, [isPanelOpen, togglePanel, fetchNotifications])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closePanel()
      }
    }

    if (isPanelOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isPanelOpen, closePanel])

  // Close on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closePanel()
      }
    }

    if (isPanelOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isPanelOpen, closePanel])

  const displayCount = unreadCount > 99 ? '99+' : unreadCount
  const hasUrgent = urgentUnreadCount > 0

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={handleToggle}
        className="relative flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <BellIcon className="w-5 h-5" />

        {/* Badge */}
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            className={`absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white ${
              hasUrgent ? 'bg-red-500' : 'bg-blue-500'
            }`}
          >
            {displayCount}
          </motion.span>
        )}
      </button>

      {/* Panel dropdown */}
      <AnimatePresence>
        {isPanelOpen && <NotificationPanel onFetchFiltered={fetchFiltered} />}
      </AnimatePresence>
    </div>
  )
}
