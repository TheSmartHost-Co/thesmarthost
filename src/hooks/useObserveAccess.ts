'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { getObserveAccess } from '@/services/observeService'
import type { ObserveAccess } from '@/services/types/observe'
import { useUserStore } from '@/store/useUserStore'

/**
 * Observe console — resolves whether the current user is a platform admin.
 * Used by ObserveShell (to gate the console) and the sidebar (to show the link).
 *
 * The in-flight promise is cached at module scope so those consumers share one
 * request per page load. A failed request is NOT cached: it resolves as "not
 * admin" for that render and the next mount retries.
 *
 * The server is authoritative — every /observe endpoint re-checks and 403s.
 */

const DENIED: ObserveAccess = { isPlatformAdmin: false }
let accessPromise: Promise<ObserveAccess> | null = null

function fetchAccess(): Promise<ObserveAccess> {
  if (!accessPromise) {
    accessPromise = getObserveAccess().catch(() => {
      accessPromise = null
      return DENIED
    })
  }
  return accessPromise
}

/** Call on logout so the next user doesn't inherit admin access. */
export function resetObserveAccessCache() {
  accessPromise = null
}

const subscribeHydration = (cb: () => void) => useUserStore.persist.onFinishHydration(cb)
const getHydrated = () => useUserStore.persist.hasHydrated()
const getHydratedServer = () => false

export function useObserveAccess(): ObserveAccess & { loading: boolean } {
  const profile = useUserStore((s) => s.profile)
  const hydrated = useSyncExternalStore(subscribeHydration, getHydrated, getHydratedServer)
  // Tagged with the user it was resolved for, so a user switch reads as loading.
  const [result, setResult] = useState<{ userId: string; access: ObserveAccess } | null>(null)
  const userId = profile?.id ?? null

  useEffect(() => {
    if (!userId) return
    let active = true
    fetchAccess().then((access) => {
      if (active) setResult({ userId, access })
    })
    return () => {
      active = false
    }
  }, [userId])

  // Store hydrated but nobody signed in: deny instead of spinning forever.
  if (!userId) return { ...DENIED, loading: !hydrated }
  if (result?.userId !== userId) return { ...DENIED, loading: true }
  return { ...result.access, loading: false }
}
