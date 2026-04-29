'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { usePermissions } from './usePermissions'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { PermissionKey, PermissionLevel } from '@/constants/permissionTemplates'

/**
 * Page-level permission guard. Call at top of each PM page.
 * If team member lacks required permission, redirects to dashboard with error notification.
 * PMs always pass through.
 */
export function usePermissionGuard(resource: PermissionKey, level: PermissionLevel = 'read') {
  const { canAccess, isTeamMember } = usePermissions()
  const router = useRouter()
  const notify = useNotificationStore(s => s.showNotification)
  // canAccess is a fresh reference each render; collapse to a primitive so the
  // effect's dep array compares by value, not identity.
  const denied = isTeamMember && !canAccess(resource, level)
  const firedRef = useRef(false)

  useEffect(() => {
    if (denied && !firedRef.current) {
      firedRef.current = true
      notify("You don't have permission to access this page", 'error')
      router.replace('/property-manager/dashboard')
    }
  }, [denied, notify, router])
}
