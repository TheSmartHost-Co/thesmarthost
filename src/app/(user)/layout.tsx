'use client'

import { usePathname } from 'next/navigation'
import Notification from '../../components/shared/notification'
import UserNavbar from '../../components/navbar/UserNavbar'
import { useSessionMonitor } from '@/hooks/useSessionMonitor'
import { SessionWarningModal } from '@/components/session/SessionWarningModal'
import { SessionExpiredModal } from '@/components/session/SessionExpiredModal'

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isPropertyManagerRoute = pathname?.startsWith('/property-manager')
  const isCleanerRoute = pathname?.startsWith('/cleaner')
  const isClientRoute = pathname?.startsWith('/client')
  
  // Session monitoring for all authenticated pages
  const {
    sessionStatus,
    showWarningModal,
    showExpiredModal,
    onRefreshSession,
    onSignOut,
    onLoginRedirect,
    onDismissWarning,
  } = useSessionMonitor()

  // Skip rendering navbar/padding for routes with their own layout (property-manager, cleaner)
  const hasOwnLayout = isPropertyManagerRoute || isCleanerRoute || isClientRoute

  return (
    <>
      <Notification />
      {!hasOwnLayout && <UserNavbar />}
      <div className={!hasOwnLayout ? 'pt-16' : ''}>
        {children}
      </div>
      
      {/* Session Management Modals */}
      <SessionWarningModal
        isOpen={showWarningModal}
        timeRemaining={sessionStatus.timeRemaining}
        onContinueSession={onRefreshSession}
        onSignOut={onSignOut}
        onClose={onDismissWarning}
      />
      
      <SessionExpiredModal
        isOpen={showExpiredModal}
        onSignIn={onLoginRedirect}
      />
    </>
  )
}
