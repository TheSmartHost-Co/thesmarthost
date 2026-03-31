'use client'

import { useState } from 'react'
import ResponsiveSidebar from '@/components/navbar/ResponsiveSidebar'
import UserNavbar from '@/components/navbar/UserNavbar'
import RoleGuard from '@/components/shared/RoleGuard'
import { clientSidebarItems } from '@/components/navbar/sidebarItems'
import { useSidebarStore } from '@/store/useSidebarStore'
import ImpersonationBanner from '@/components/shared/ImpersonationBanner'
import { useImpersonationStore } from '@/store/useImpersonationStore'

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const isCollapsed = useSidebarStore((s) => s.isCollapsed)
  const isImpersonating = useImpersonationStore((s) => s.isImpersonating)

  return (
    <div className="min-h-screen bg-gray-50">
      <ImpersonationBanner />
      <div className={isImpersonating ? 'pt-10' : ''}>
        <UserNavbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          basePath="/client"
        />
        <ResponsiveSidebar
          variant="client"
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          items={clientSidebarItems}
        />
        <main className={`pt-20 px-3 py-4 sm:p-6 md:transition-[margin-left] md:duration-250 md:ease-in-out ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
          <RoleGuard portal="/client">
            {children}
          </RoleGuard>
        </main>
      </div>
    </div>
  )
}
