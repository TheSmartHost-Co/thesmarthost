'use client'

import { useEffect, useState } from 'react'
import { getFeedbackAccess } from '@/services/feedbackService'
import type { FeedbackAccess } from '@/services/types/feedback'
import { useUserStore } from '@/store/useUserStore'
import { ADMIN_USER_IDS } from '@/components/navbar/sidebarItems'

/**
 * FEEDBACK-001 — resolves whether the current user may submit feedback and
 * whether they can see the triage backlog.
 *
 * The navbar button, both sidebars and both pages all need this, so the
 * in-flight promise is cached at module scope: one request per page load rather
 * than one per consumer.
 *
 * The server is always authoritative — this only drives UI affordances, and
 * every endpoint re-checks in middleware/feedbackAccess.js.
 */

let accessPromise: Promise<FeedbackAccess> | null = null

function fetchAccess(): Promise<FeedbackAccess> {
  if (!accessPromise) {
    accessPromise = getFeedbackAccess()
      .then((res) =>
        res.status === 'success' ? res.data : { canSubmit: false, isAdmin: false }
      )
      .catch(() => ({ canSubmit: false, isAdmin: false }))
  }
  return accessPromise
}

/** Call on logout so the next user doesn't inherit these capabilities. */
export function resetFeedbackAccessCache() {
  accessPromise = null
}

export function useFeedbackAccess(): FeedbackAccess & { loading: boolean } {
  const profile = useUserStore((s) => s.profile)

  // profile.id is the real auth user id for every role (it comes from the
  // Supabase session), so the allowlist check is valid client-side. Used only
  // as an optimistic default so admins don't see the button flicker in.
  const optimisticAdmin = ADMIN_USER_IDS.includes(profile?.id || '')

  const [access, setAccess] = useState<FeedbackAccess>({
    canSubmit: optimisticAdmin,
    isAdmin: optimisticAdmin,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    // Wait for the profile so we don't fire before the session is hydrated.
    if (!profile) return

    fetchAccess().then((result) => {
      if (!active) return
      setAccess(result)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [profile])

  return { ...access, loading }
}
