'use client'

import { useState } from 'react'
import ResponsiveSidebar from '@/components/navbar/ResponsiveSidebar'
import UserNavbar from '@/components/navbar/UserNavbar'
import { managerSidebarItems } from '@/components/navbar/sidebarItems'
import { useNotificationPolling } from '@/hooks/useNotificationPolling'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  useNotificationPolling()

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
        items={managerSidebarItems}
      />
      <main className="md:ml-64 pt-20 p-6">
        {children}
      </main>
    </div>
  )
}
