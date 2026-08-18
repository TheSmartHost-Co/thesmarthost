'use client'

import { useState } from 'react'
import ResponsiveSidebar from '@/components/navbar/ResponsiveSidebar'
import UserNavbar from '@/components/navbar/UserNavbar'
import RoleGuard from '@/components/shared/RoleGuard'
import { contractorSidebarItems } from '@/components/navbar/sidebarItems'
import { useSidebarStore } from '@/store/useSidebarStore'
import { useNotificationPolling } from '@/hooks/useNotificationPolling'
import ImpersonationBanner from '@/components/shared/ImpersonationBanner'
import { useImpersonationStore } from '@/store/useImpersonationStore'

export default function ContractorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const isCollapsed = useSidebarStore((s) => s.isCollapsed)
  const isImpersonating = useImpersonationStore((s) => s.isImpersonating)
  useNotificationPolling()

  return (
    <div className="min-h-screen bg-gray-50">
      <ImpersonationBanner />
      <div className={isImpersonating ? 'pt-10' : ''}>
        <UserNavbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          basePath="/contractor"
        />
        <ResponsiveSidebar
          variant="contractor"
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          items={contractorSidebarItems}
        />
        <main className={`pt-20 sm:pt-[4.5rem] px-3 py-4 sm:p-6 md:transition-[margin-left] md:duration-250 md:ease-in-out ${isCollapsed ? 'md:ml-16' : 'md:ml-64'}`}>
          <RoleGuard portal="/contractor">
            {children}
          </RoleGuard>
        </main>
      </div>
    </div>
  )
}
