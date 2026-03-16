'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  CogIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'
import LogoutModal from '@/components/shared/LogoutModal'
import NotificationBell from '@/components/notification-center/NotificationBell'

interface UserNavbarProps {
  onToggleSidebar?: () => void
  basePath?: string
}

export default function UserNavbar({
  onToggleSidebar,
  basePath = '/property-manager'
}: UserNavbarProps) {

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200 px-3 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        {/* Left side - Hamburger + Logo */}
        <div className="flex items-center">
          {/* Hamburger Button - Mobile Only */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 -ml-2 mr-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Toggle sidebar menu"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          )}

          {/* Logo */}
          <div>
            <Link href={`${basePath}/dashboard`}>
              <Image
                src="/images/smarthostlogo.png"
                alt="TheSmartHost"
                width={180}
                height={40}
                className="h-8 sm:h-10 w-auto"
                priority
              />
            </Link>
          </div>
        </div>

        {/* Right side - Notifications, Settings, Logout */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Notification Center */}
          <NotificationBell />

          {/* Settings Link - Hide text on mobile */}
          <Link
            href={`${basePath}/settings`}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
          >
            <CogIcon className="w-5 h-5 md:mr-2" />
            <span className="hidden md:inline">Settings</span>
          </Link>

          {/* Logout Modal */}
          <LogoutModal />
        </div>
      </div>
    </nav>
  )
}
