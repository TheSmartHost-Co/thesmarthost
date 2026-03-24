'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getPendingSupplyLists } from '@/services/supplyListService'
import { useSidebarStore } from '@/store/useSidebarStore'
import { useUserStore } from '@/store/useUserStore'

const POLL_INTERVAL_MS = 60_000 // 60 seconds

export function usePendingSupplyCount() {
  const setPendingSupplyCount = useSidebarStore((s) => s.setPendingSupplyCount)
  const profile = useUserStore((s) => s.profile)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const poll = useCallback(async () => {
    if (!profile?.id) return
    try {
      const res = await getPendingSupplyLists()
      if (res.status === 'success') {
        setPendingSupplyCount(res.data.length)
      }
    } catch {
      // Silently ignore polling errors
    }
  }, [profile?.id, setPendingSupplyCount])

  useEffect(() => {
    if (!profile?.id) return

    // Initial poll
    poll()

    // Start interval
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS)

    // Pause/resume on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        poll()
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(poll, POLL_INTERVAL_MS)
      } else {
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
  }, [poll, profile?.id])
}
