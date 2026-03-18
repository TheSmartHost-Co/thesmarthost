'use client'

import { useEffect } from 'react'
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

  useEffect(() => {
    if (isTeamMember && !canAccess(resource, level)) {
      notify('You don\'t have permission to access this page', 'error')
      router.replace('/property-manager/dashboard')
    }
  }, [isTeamMember, resource, level, canAccess, router, notify])
}
