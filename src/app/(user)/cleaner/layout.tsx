'use client'

import { useState } from 'react'
import ResponsiveSidebar from '@/components/navbar/ResponsiveSidebar'
import UserNavbar from '@/components/navbar/UserNavbar'
import { cleanerSidebarItems } from '@/components/navbar/sidebarItems'

export default function CleanerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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
      <main className="md:ml-64 pt-20 p-6">
        {children}
      </main>
    </div>
  )
}
