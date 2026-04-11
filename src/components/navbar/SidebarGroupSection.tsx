'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { SidebarGroup } from './sidebarItems'
import { useSidebarStore } from '@/store/useSidebarStore'
import SidebarTooltip from './SidebarTooltip'

function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}

function isGroupActive(pathname: string, group: SidebarGroup): boolean {
  return group.items.some((item) => isRouteActive(pathname, item.href))
}

interface SidebarGroupSectionProps {
  group: SidebarGroup
  isCollapsed: boolean
  colors: {
    active: string
    hover: string
  }
  onLinkClick?: () => void
}

export default function SidebarGroupSection({
  group,
  isCollapsed,
  colors,
  onLinkClick,
}: SidebarGroupSectionProps) {
  const { t } = useTranslation('nav')
  const pathname = usePathname()
  const groupActive = isGroupActive(pathname, group)
  const [showFlyout, setShowFlyout] = useState(false)
  const flyoutTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Persisted expanded state from store
  const expandedGroups = useSidebarStore((s) => s.expandedGroups)
  const toggleGroup = useSidebarStore((s) => s.toggleGroup)
  const setGroupExpanded = useSidebarStore((s) => s.setGroupExpanded)
  const setCollapsed = useSidebarStore((s) => s.setCollapsed)
  const pendingSupplyCount = useSidebarStore((s) => s.pendingSupplyCount)

  // Default all groups to expanded; user collapses are persisted to localStorage
  const isExpanded = expandedGroups[group.label] ?? true

  // Auto-expand group when navigating to a route inside it
  useEffect(() => {
    if (groupActive && !isExpanded) {
      setGroupExpanded(group.label, true)
    }
  }, [groupActive]) // eslint-disable-line react-hooks/exhaustive-deps

  const GroupIcon = group.icon

  const handleMouseEnter = () => {
    if (!isCollapsed) return
    if (flyoutTimeoutRef.current) clearTimeout(flyoutTimeoutRef.current)
    setShowFlyout(true)
  }

  const handleMouseLeave = () => {
    if (!isCollapsed) return
    flyoutTimeoutRef.current = setTimeout(() => setShowFlyout(false), 150)
  }

  // Collapsed mode: icon + flyout popover on hover
  if (isCollapsed) {
    return (
      <div
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <SidebarTooltip label={t(group.label)}>
          <button
            onClick={() => {
              setCollapsed(false)
              setGroupExpanded(group.label, true)
            }}
            className={`
              flex items-center justify-center w-full px-3 py-2 rounded-md transition-colors
              ${groupActive ? 'text-gray-900 bg-gray-100' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}
            `}
          >
            <GroupIcon className="w-5 h-5 flex-shrink-0" />
          </button>
        </SidebarTooltip>

        {/* Flyout popover */}
        <AnimatePresence>
          {showFlyout && (
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-full top-0 ml-2 z-50 min-w-[180px] rounded-lg bg-white border border-gray-200 shadow-lg py-1"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {t(group.label)}
              </div>
              {group.items.map((item) => {
                const isActive = isRouteActive(pathname, item.href)
                const Icon = item.icon
                const isSupplyLists = item.href === '/property-manager/supply-lists'
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onLinkClick}
                    className={`
                      flex items-center px-3 py-2 text-sm font-medium transition-colors
                      ${isActive ? colors.active : colors.hover}
                    `}
                  >
                    <Icon className="w-4 h-4 mr-2.5 flex-shrink-0" />
                    {t(item.name)}
                    {isSupplyLists && pendingSupplyCount > 0 && (
                      <span className="ml-auto min-w-[16px] h-[16px] text-[9px] bg-amber-500 text-white rounded-full flex items-center justify-center font-semibold px-1 tabular-nums">
                        {pendingSupplyCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Expanded mode: collapsible group with animation
  return (
    <div>
      {/* Group header */}
      <button
        onClick={() => toggleGroup(group.label)}
        className={`
          flex items-center w-full px-3 py-2 rounded-md transition-colors
          ${groupActive ? 'text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
        `}
      >
        <GroupIcon className="w-5 h-5 mr-3 flex-shrink-0" />
        <span className="text-[11px] font-semibold uppercase tracking-wider flex-1 text-left">
          {t(group.label)}
        </span>
        <ChevronRightIcon
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Animated children */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="ml-2 space-y-0.5 py-0.5">
              {group.items.map((item) => {
                const isActive = isRouteActive(pathname, item.href)
                const Icon = item.icon
                const isSupplyLists = item.href === '/property-manager/supply-lists'
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onLinkClick}
                    className={`
                      flex items-center pl-7 pr-3 py-2 text-sm font-medium rounded-md transition-colors
                      ${isActive ? colors.active : colors.hover}
                    `}
                  >
                    <Icon className="w-4 h-4 mr-2.5 flex-shrink-0" />
                    {t(item.name)}
                    {isSupplyLists && pendingSupplyCount > 0 && (
                      <span className="ml-auto min-w-[16px] h-[16px] text-[9px] bg-amber-500 text-white rounded-full flex items-center justify-center font-semibold px-1 tabular-nums">
                        {pendingSupplyCount}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
