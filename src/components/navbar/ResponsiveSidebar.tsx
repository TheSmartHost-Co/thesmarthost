'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SidebarItem, SidebarNavConfig, ADMIN_USER_IDS } from './sidebarItems'
import { MegaphoneIcon } from '@heroicons/react/24/outline'
import { useUserStore } from '@/store/useUserStore'
import { useSidebarStore } from '@/store/useSidebarStore'
import SidebarGroupSection from './SidebarGroupSection'
import SidebarCollapseToggle from './SidebarCollapseToggle'
import SidebarTooltip from './SidebarTooltip'

function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/')
}

interface ResponsiveSidebarProps {
  variant: 'manager' | 'cleaner' | 'client'
  isOpen: boolean
  onClose: () => void
  items: SidebarItem[]
  navConfig?: SidebarNavConfig
}

export default function ResponsiveSidebar({
  variant,
  isOpen,
  onClose,
  items,
  navConfig,
}: ResponsiveSidebarProps) {
  const pathname = usePathname()
  const prevPathnameRef = useRef(pathname)
  const isCollapsed = useSidebarStore((s) => s.isCollapsed)
  const setCollapsed = useSidebarStore((s) => s.setCollapsed)
  const profile = useUserStore((s) => s.profile)
  const isAdminUser = profile?.id && ADMIN_USER_IDS.includes(profile.id)

  // Auto-close sidebar on route change (mobile only)
  useEffect(() => {
    if (prevPathnameRef.current !== pathname && isOpen) {
      onClose()
    }
    prevPathnameRef.current = pathname
  }, [pathname, isOpen, onClose])

  // Handle Escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  const accentColors = {
    manager: {
      active: 'bg-blue-50 text-blue-700 border-r-2 border-blue-700',
      hover: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
    },
    cleaner: {
      active: 'bg-purple-50 text-purple-700 border-r-2 border-purple-700',
      hover: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
    },
    client: {
      active: 'bg-emerald-50 text-emerald-700 border-r-2 border-emerald-700',
      hover: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
    },
  }

  const colors = accentColors[variant]

  // Render a single nav link item
  const renderNavLink = (item: SidebarItem, collapsed: boolean, closeOnClick?: boolean) => {
    const isActive = isRouteActive(pathname, item.href)
    const Icon = item.icon

    if (collapsed) {
      return (
        <SidebarTooltip key={item.href} label={item.name}>
          <button
            onClick={() => setCollapsed(false)}
            className={`
              flex items-center justify-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors
              ${isActive ? colors.active : colors.hover}
            `}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
          </button>
        </SidebarTooltip>
      )
    }

    return (
      <div key={item.href}>
        <Link
          href={item.href}
          onClick={closeOnClick ? onClose : undefined}
          className={`
            flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
            ${isActive ? colors.active : colors.hover}
          `}
        >
          <Icon className="w-5 h-5 flex-shrink-0 mr-3" />
          {item.name}
        </Link>
      </div>
    )
  }

  // Render grouped nav content (when navConfig is provided)
  const renderGroupedNav = (collapsed: boolean, closeOnClick?: boolean) => (
    <div className="flex flex-col h-full">
      <nav className={`flex-1 px-2 py-4 space-y-1 ${collapsed ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {navConfig!.top.map((entry, idx) => {
          if (entry.type === 'item') {
            return renderNavLink(entry.item, collapsed, closeOnClick)
          }
          return (
            <SidebarGroupSection
              key={entry.group.label + idx}
              group={entry.group}
              isCollapsed={collapsed}
              colors={colors}
              onLinkClick={closeOnClick ? onClose : undefined}
            />
          )
        })}
      </nav>

      {/* Bottom-pinned items (Settings) + collapse toggle */}
      <div className="border-t border-gray-200 px-2 py-2 space-y-1">
        {navConfig!.bottom.map((item) => renderNavLink(item, collapsed, closeOnClick))}
        {isAdminUser && variant === 'manager' && renderNavLink(
          { name: 'Patch Notes', href: '/property-manager/patch-notes', icon: MegaphoneIcon },
          collapsed,
          closeOnClick
        )}
        <div className="hidden md:block">
          <SidebarCollapseToggle />
        </div>
      </div>
    </div>
  )

  // Render flat nav content (when no navConfig, e.g., cleaner sidebar)
  const renderFlatNav = (collapsed: boolean, closeOnClick?: boolean) => {
    const mainItems = items.filter((item) => item.name !== 'Settings')
    const settingsItem = items.find((item) => item.name === 'Settings')

    return (
      <div className="flex flex-col h-full">
        <nav className={`flex-1 px-2 py-4 space-y-1 ${collapsed ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          {mainItems.map((item) => renderNavLink(item, collapsed, closeOnClick))}
        </nav>
        <div className="border-t border-gray-200 px-2 py-2 space-y-1">
          {settingsItem && renderNavLink(settingsItem, collapsed, closeOnClick)}
          <div className="hidden md:block">
            <SidebarCollapseToggle />
          </div>
        </div>
      </div>
    )
  }

  const renderContent = (collapsed: boolean, closeOnClick?: boolean) =>
    navConfig
      ? renderGroupedNav(collapsed, closeOnClick)
      : renderFlatNav(collapsed, closeOnClick)

  return (
    <>
      {/* Desktop Sidebar - Animated width */}
      <motion.div
        animate={{ width: isCollapsed ? 64 : 256 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="hidden md:flex fixed top-16 left-0 z-40 flex-col bg-white h-[calc(100vh-4rem)] border-r border-gray-200"
      >
        {renderContent(isCollapsed)}
      </motion.div>

      {/* Mobile Drawer - Always full width, unchanged behavior */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              aria-hidden="true"
            />

            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-16 left-0 bottom-0 z-50 w-64 bg-white shadow-xl md:hidden border-r border-gray-200"
            >
              {renderContent(false, true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
