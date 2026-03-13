'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getUnreadCount } from '@/services/notificationCenterService'
import { useNotificationCenterStore } from '@/store/useNotificationCenterStore'

const POLL_INTERVAL_MS = 30_000 // 30 seconds

export function useNotificationPolling() {
  const setUnreadCount = useNotificationCenterStore((s) => s.setUnreadCount)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const poll = useCallback(async () => {
    try {
      const res = await getUnreadCount()
      if (res.status === 'success') {
        setUnreadCount(res.data.unreadCount, res.data.urgentUnreadCount)
      }
    } catch {
      // Silently ignore polling errors — session monitor handles auth issues
    }
  }, [setUnreadCount])

  useEffect(() => {
    // Initial poll
    poll()

    // Start interval
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS)

    // Pause/resume on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Immediate poll on refocus
        poll()
        // Restart interval
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(poll, POLL_INTERVAL_MS)
      } else {
        // Pause when hidden
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [poll])
}
