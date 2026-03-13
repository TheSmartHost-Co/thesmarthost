'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getNotifications, markNotificationAsRead } from '@/services/notificationCenterService'
import { useNotificationCenterStore } from '@/store/useNotificationCenterStore'
import type { InAppNotification } from '@/services/types/notificationCenter'

/**
 * Fetches issue-category notifications and exposes which issue IDs have
 * unread notifications, plus a function to mark them read.
 *
 * @param enabled - Fetch when true (typically tied to modal isOpen)
 */
export function useUnreadIssueIds(enabled: boolean = true) {
  const [notifications, setNotifications] = useState<InAppNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const markAsReadOptimistic = useNotificationCenterStore((s) => s.markAsReadOptimistic)

  // Track enabled to avoid stale closure in fetch
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    setIsLoading(true)

    getNotifications({ category: 'issues', limit: 100 })
      .then((res) => {
        if (!cancelled && enabledRef.current && res.status === 'success') {
          setNotifications(res.data)
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [enabled])

  // Map issueId → notification IDs (for mark-as-read)
  const issueIdToNotifIds = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const n of notifications) {
      const issueId = n.metadata?.issueId as string | undefined
      if (!issueId) continue
      const existing = map.get(issueId) || []
      existing.push(n.id)
      map.set(issueId, existing)
    }
    return map
  }, [notifications])

  // Set of issue IDs with unread notifications
  const unreadIssueIds = useMemo(() => {
    const set = new Set<string>()
    for (const n of notifications) {
      if (n.isRead) continue
      const issueId = n.metadata?.issueId as string | undefined
      if (issueId) set.add(issueId)
    }
    return set
  }, [notifications])

  const markIssueAsRead = useCallback(
    (issueId: string) => {
      const notifIds = issueIdToNotifIds.get(issueId)
      if (!notifIds?.length) return

      // Optimistic local update
      setNotifications((prev) =>
        prev.map((n) =>
          notifIds.includes(n.id) ? { ...n, isRead: true } : n
        )
      )

      // Update notification center store (no-op if notification not loaded there)
      // + fire-and-forget API calls
      for (const id of notifIds) {
        markAsReadOptimistic(id)
        markNotificationAsRead(id).catch(console.error)
      }
    },
    [issueIdToNotifIds, markAsReadOptimistic]
  )

  return { unreadIssueIds, markIssueAsRead, isLoading }
}
