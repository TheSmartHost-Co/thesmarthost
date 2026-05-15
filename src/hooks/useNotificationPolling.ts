'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { getUnreadCount } from '@/services/notificationCenterService'
import { useNotificationCenterStore } from '@/store/useNotificationCenterStore'

// Backstop only — event-driven polls (mount, focus, navigation) handle
// the common case. This catches users who sit on a page for long
// stretches without focus changes or navigation.
const POLL_INTERVAL_MS = 5 * 60_000 // 5 minutes

export function useNotificationPolling() {
  const setUnreadCount = useNotificationCenterStore((s) => s.setUnreadCount)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const pathname = usePathname()

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

  // Re-poll on route changes (event-driven)
  useEffect(() => {
    poll()
  }, [pathname, poll])

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
