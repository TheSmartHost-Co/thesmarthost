"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  CloudArrowUpIcon,
  CalendarDaysIcon,
  InboxArrowDownIcon,
} from '@heroicons/react/24/outline'

const sidebarItems = [
  {
    name: 'Dashboard',
    href: '/property-manager/dashboard',
    icon: HomeIcon,
  },
  {
    name: 'Clients',
    href: '/property-manager/clients',
    icon: UserGroupIcon,
  },
  {
    name: 'Properties',
    href: '/property-manager/properties',
    icon: BuildingOfficeIcon,
  },
  {
    name: 'Bookings',
    href: '/property-manager/bookings',
    icon: CalendarDaysIcon,
  },
  {
    name: 'Incoming Bookings',
    href: '/property-manager/incoming-bookings',
    icon: InboxArrowDownIcon,
  },
  {
    name: 'Upload Bookings',
    href: '/property-manager/upload-bookings',
    icon: CloudArrowUpIcon,
  },
  {
    name: 'Reports',
    href: '/property-manager/reports',
    icon: DocumentTextIcon,
  },
  {
    name: 'Analytics',
    href: '/property-manager/analytics',
    icon: ChartBarIcon,
  },
  {
    name: 'Settings',
    href: '/property-manager/settings',
    icon: CogIcon,
  },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <div className="fixed top-16 left-0 z-40 flex flex-col w-64 bg-white h-full border-r border-gray-200">
      <nav className="flex-1 px-2 py-6 space-y-2">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                ${isActive 
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }
              `}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}