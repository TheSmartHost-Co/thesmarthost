'use client'

import { useMemo } from 'react'
import { usePermissions } from './usePermissions'
import { SIDEBAR_PERMISSION_MAP } from '@/constants/routePermissionMap'
import type { SidebarItem, SidebarNavConfig, SidebarNavEntry } from '@/components/navbar/sidebarItems'

/**
 * Filters the sidebar navigation config based on team member permissions.
 * - PMs see the full sidebar.
 * - Team members see only items they have at least 'read' access to.
 * - "Team Members" page is only visible to PMs (not team members).
 */
export function useFilteredNavConfig(
  navConfig: SidebarNavConfig,
  flatItems: SidebarItem[]
): { filteredNavConfig: SidebarNavConfig; filteredItems: SidebarItem[] } {
  const { canRead, isPM, isTeamMember } = usePermissions()

  return useMemo(() => {
    if (isPM) return { filteredNavConfig: navConfig, filteredItems: flatItems }

    const isItemAllowed = (item: SidebarItem): boolean => {
      // Team Members page is PM-only
      if (item.href === '/property-manager/team') return false

      const permKey = SIDEBAR_PERMISSION_MAP[item.href]
      if (!permKey) return true // If no permission mapping, allow (safety)
      return canRead(permKey)
    }

    // Filter grouped nav config
    const filteredTop: SidebarNavEntry[] = navConfig.top
      .map((entry) => {
        if (entry.type === 'item') {
          return isItemAllowed(entry.item) ? entry : null
        }
        // Group: filter items within the group
        const filteredGroupItems = entry.group.items.filter(isItemAllowed)
        if (filteredGroupItems.length === 0) return null
        return {
          type: 'group' as const,
          group: { ...entry.group, items: filteredGroupItems },
        }
      })
      .filter((entry): entry is SidebarNavEntry => entry !== null)

    const filteredBottom = navConfig.bottom.filter(isItemAllowed)

    const filteredNavConfig: SidebarNavConfig = {
      top: filteredTop,
      bottom: filteredBottom,
    }

    const filteredItems = flatItems.filter(isItemAllowed)

    return { filteredNavConfig, filteredItems }
  }, [navConfig, flatItems, isPM, isTeamMember, canRead])
}
