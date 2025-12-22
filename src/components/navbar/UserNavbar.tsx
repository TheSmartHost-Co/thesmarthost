"use client"

import Link from 'next/link'
import Image from 'next/image'
import {
  CogIcon,
} from '@heroicons/react/24/outline'
import LogoutModal from '@/components/shared/LogoutModal'

export default function UserNavbar() {

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Link href="/property-manager/dashboard">
            <Image
              src="/images/smarthostlogo.png"
              alt="TheSmartHost"
              width={180}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </Link>
        </div>

        {/* Right side - Settings and Logout */}
        <div className="flex items-center space-x-4">
          {/* Settings Link */}
          <Link
            href="/property-manager/settings"
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
          >
            <CogIcon className="w-5 h-5 mr-2" />
            Settings
          </Link>

          {/* Logout Modal */}
          <LogoutModal />
        </div>
      </div>
    </nav>
  )
}