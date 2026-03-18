'use client'

import { ChevronLeftIcon } from '@heroicons/react/24/outline'
import { useSidebarStore } from '@/store/useSidebarStore'

export default function SidebarCollapseToggle() {
  const { isCollapsed, toggleCollapsed } = useSidebarStore()

  return (
    <button
      onClick={toggleCollapsed}
      className="flex items-center justify-center w-full py-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors rounded-md"
      title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <ChevronLeftIcon
        className={`w-5 h-5 transition-transform duration-250 ${isCollapsed ? 'rotate-180' : ''}`}
      />
    </button>
  )
}
