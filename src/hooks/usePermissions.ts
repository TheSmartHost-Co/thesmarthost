'use client'

import { useUserStore } from '@/store/useUserStore'
import { meetsPermissionLevel } from '@/constants/permissionTemplates'
import type { PermissionKey, PermissionLevel } from '@/constants/permissionTemplates'

export function usePermissions() {
  const profile = useUserStore(s => s.profile)

  const isPM = profile?.role === 'PROPERTY-MANAGER' || profile?.role === 'ADMIN'
  const isTeamMember = profile?.role === 'TEAM_MEMBER'

  // PMs always have full access; team members check their permissions JSONB
  const canAccess = (resource: PermissionKey, level: PermissionLevel = 'read'): boolean => {
    if (isPM) return true
    if (!isTeamMember || !profile?.permissions) return false
    return meetsPermissionLevel(profile.permissions[resource], level)
  }

  const canRead = (resource: PermissionKey): boolean => canAccess(resource, 'read')
  const canWrite = (resource: PermissionKey): boolean => canAccess(resource, 'read-write')

  // For API calls: returns PM's userId for team members, own ID for PMs
  const effectiveUserId = isTeamMember ? (profile?.pmUserId ?? profile?.id) : profile?.id

  return { canRead, canWrite, canAccess, isPM, isTeamMember, effectiveUserId }
}
