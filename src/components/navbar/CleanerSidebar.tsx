'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  CogIcon,
} from '@heroicons/react/24/outline'

const sidebarItems = [
  {
    name: 'Dashboard',
    href: '/cleaner/dashboard',
    icon: HomeIcon,
  },
  {
    name: 'My Properties',
    href: '/cleaner/properties',
    icon: BuildingOfficeIcon,
  },
  {
    name: 'Tasks',
    href: '/cleaner/tasks',
    icon: ClipboardDocumentListIcon,
  },
  {
    name: 'Schedule',
    href: '/cleaner/schedule',
    icon: CalendarDaysIcon,
  },
  {
    name: 'Settings',
    href: '/cleaner/settings',
    icon: CogIcon,
  },
]

export default function CleanerSidebar() {
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
                  ? 'bg-purple-50 text-purple-700 border-r-2 border-purple-700'
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
