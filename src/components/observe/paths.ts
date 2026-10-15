'use client'
// Observe console — route helpers. The console lives inside the PM portal so it
// inherits the PM layout, sidebar and RoleGuard. Every link carries the current
// ?window= so a copied URL reopens the same view.
import { useMemo } from 'react'
import { useObserveStore } from '@/store/useObserveStore'
import type { WindowKey } from '@/services/types/observe'

const BASE = '/property-manager/observe'

export function observeLinks(window: WindowKey) {
  const w = `?window=${window}`
  return {
    overview: `${BASE}${w}`,
    activity: `${BASE}/activity${w}`,
    users: `${BASE}/users${w}`,
    user: (id: string) => `${BASE}/users/${encodeURIComponent(id)}${w}`,
    features: `${BASE}/features${w}`,
    errors: `${BASE}/errors${w}`,
    errorGroup: (fingerprint: string) => `${BASE}/errors/${encodeURIComponent(fingerprint)}${w}`,
  }
}

/** Link helpers bound to the currently selected window. */
export function useObserveLinks() {
  const window = useObserveStore((s) => s.window)
  return useMemo(() => observeLinks(window), [window])
}

/** Section roots (no query) for matching the active tab against the pathname. */
export const observeSections = {
  overview: BASE,
  activity: `${BASE}/activity`,
  users: `${BASE}/users`,
  features: `${BASE}/features`,
  errors: `${BASE}/errors`,
}
