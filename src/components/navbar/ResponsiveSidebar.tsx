'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SidebarItem } from './sidebarItems'

interface ResponsiveSidebarProps {
  variant: 'manager' | 'cleaner'
  isOpen: boolean
  onClose: () => void
  items: SidebarItem[]
}

export default function ResponsiveSidebar({
  variant,
  isOpen,
  onClose,
  items,
}: ResponsiveSidebarProps) {
  const pathname = usePathname()
  const prevPathnameRef = useRef(pathname)

  // Auto-close sidebar on route change (mobile only)
  useEffect(() => {
    // Only close if pathname actually changed (not on initial render or isOpen change)
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

  // Accent colors based on variant
  const accentColors = {
    manager: {
      active: 'bg-blue-50 text-blue-700 border-r-2 border-blue-700',
      hover: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
    },
    cleaner: {
      active: 'bg-purple-50 text-purple-700 border-r-2 border-purple-700',
      hover: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
    },
  }

  const colors = accentColors[variant]

  const renderNavItems = (closeOnClick?: boolean) => (
    <nav className="flex-1 px-2 py-6 space-y-2 overflow-y-auto">
      {items.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon

        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={closeOnClick ? onClose : undefined}
            className={`
              flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
              ${isActive ? colors.active : colors.hover}
            `}
          >
            <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile, always visible on md+ */}
      <div className="hidden md:flex fixed top-16 left-0 z-40 flex-col w-64 bg-white h-[calc(100vh-4rem)] border-r border-gray-200">
        {renderNavItems()}
      </div>

      {/* Mobile Drawer - Visible only when isOpen on mobile */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop - Dims the content behind */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              aria-hidden="true"
            />

            {/* Sidebar Panel - Slides in from left */}
            <motion.div
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-16 left-0 bottom-0 z-50 w-64 bg-white shadow-xl md:hidden border-r border-gray-200"
            >
              {renderNavItems(true)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
