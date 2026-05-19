'use client'

import { usePathname } from 'next/navigation'
import Notification from '../../components/shared/notification'
import UserNavbar from '../../components/navbar/UserNavbar'
import PatchNotesModal from '@/components/patch-notes/PatchNotesModal'
import { usePatchNotesPopup } from '@/hooks/usePatchNotesPopup'
import { useLanguageSync } from '@/hooks/useLanguageSync'

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isPropertyManagerRoute = pathname?.startsWith('/property-manager')
  const isCleanerRoute = pathname?.startsWith('/cleaner')
  const isClientRoute = pathname?.startsWith('/client')
  
  // Sync i18next language with user's profile preference
  useLanguageSync()

  const {
    showModal: showPatchNotesModal,
    notes: patchNotes,
    loading: patchNotesLoading,
    dismissAll: dismissAllPatchNotes,
    closeForSession: closePatchNotesForSession,
  } = usePatchNotesPopup()

  // Skip rendering navbar/padding for routes with their own layout (property-manager, cleaner)
  const hasOwnLayout = isPropertyManagerRoute || isCleanerRoute || isClientRoute

  return (
    <>
      <Notification />
      {!hasOwnLayout && <UserNavbar />}
      <div className={!hasOwnLayout ? 'pt-16' : ''}>
        {children}
      </div>

      {/* Patch Notes Popup */}
      <PatchNotesModal
        isOpen={showPatchNotesModal}
        notes={patchNotes}
        loading={patchNotesLoading}
        onDismissAll={dismissAllPatchNotes}
        onClose={closePatchNotesForSession}
      />
    </>
  )
}
