'use client'

import { useState } from 'react'
import ResponsiveSidebar from '@/components/navbar/ResponsiveSidebar'
import UserNavbar from '@/components/navbar/UserNavbar'
import RoleGuard from '@/components/shared/RoleGuard'
import { managerSidebarItems, managerNavConfig } from '@/components/navbar/sidebarItems'
import { useSidebarStore } from '@/store/useSidebarStore'
import { useNotificationPolling } from '@/hooks/useNotificationPolling'
import { useFilteredNavConfig } from '@/hooks/useFilteredNavConfig'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const isCollapsed = useSidebarStore((s) => s.isCollapsed)
  useNotificationPolling()
  const { filteredNavConfig, filteredItems } = useFilteredNavConfig(managerNavConfig, managerSidebarItems)

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        basePath="/property-manager"
      />
      <ResponsiveSidebar
        variant="manager"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        items={filteredItems}
        navConfig={filteredNavConfig}
      />
      <main className={`pt-16 p-3 sm:pt-20 sm:p-6 md:transition-[margin-left] md:duration-250 md:ease-in-out ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        <RoleGuard portal="/property-manager">
          {children}
        </RoleGuard>
      </main>
    </div>
  )
}
