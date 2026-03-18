'use client'

import { useState } from 'react'
import ResponsiveSidebar from '@/components/navbar/ResponsiveSidebar'
import UserNavbar from '@/components/navbar/UserNavbar'
import { cleanerSidebarItems } from '@/components/navbar/sidebarItems'
import { useSidebarStore } from '@/store/useSidebarStore'
import { useNotificationPolling } from '@/hooks/useNotificationPolling'

export default function CleanerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const isCollapsed = useSidebarStore((s) => s.isCollapsed)
  useNotificationPolling()

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        basePath="/cleaner"
      />
      <ResponsiveSidebar
        variant="cleaner"
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        items={cleanerSidebarItems}
      />
      <main className={`pt-20 p-6 md:transition-[margin-left] md:duration-250 md:ease-in-out ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
        {children}
      </main>
    </div>
  )
}
