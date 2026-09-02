'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { usePermissions } from '@/hooks/usePermissions'
import { useNotificationStore } from '@/store/useNotificationStore'
import { ROUTE_PERMISSION_MAP } from '@/constants/routePermissionMap'

/**
 * Stops a page a team member cannot access from rendering AT ALL.
 *
 * `usePermissionGuard` denies inside a useEffect, which means the page renders
 * fully first and only then redirects — a several-second flash of content the
 * user is not allowed to see (the settings shell exposed the section inventory
 * and the PM's integration list this way). A guard that renders and then
 * retracts is not a guard.
 *
 * This sits in the layout, above `children`, so a denied page never mounts.
 * The permission comes from ROUTE_PERMISSION_MAP — the same map the sidebar
 * filter and the per-page guard use, so there is no second source of truth.
 *
 * Routes absent from the map fall through as allowed, matching the sidebar's
 * existing default. Their per-page `usePermissionGuard` still applies; they
 * just keep the old render-then-redirect behaviour until they are mapped.
 */
export default function RoutePermissionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { canAccess, isTeamMember } = usePermissions()
  const notify = useNotificationStore((s) => s.showNotification)

  const resource = pathname ? ROUTE_PERMISSION_MAP[pathname] : undefined
  const denied = Boolean(isTeamMember && resource && !canAccess(resource, 'read'))

  // Fire the toast + redirect once per denial, not once per render.
  const firedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!denied) {
      firedFor.current = null
      return
    }
    if (firedFor.current === pathname) return
    firedFor.current = pathname
    notify("You don't have permission to access this page", 'error')
    router.replace('/property-manager/dashboard')
  }, [denied, pathname, notify, router])

  // Render nothing while the redirect is in flight. Deliberately not an
  // explanatory card: the toast already says why, and a card would itself be a
  // flash of UI on a page they are being moved away from.
  if (denied) return null

  return <>{children}</>
}
