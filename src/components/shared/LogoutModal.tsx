"use client"

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import { resetFeedbackAccessCache } from '@/hooks/useFeedbackAccess'
import { useUserStore } from '@/store/useUserStore'
import { createClient } from '@/utils/supabase/component'
import { markIntentionalLogout } from '@/utils/logoutState'
import Modal from './modal'

const LogoutModal = () => {
  const { t } = useTranslation('common')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()
  // Memoize supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])
  const showNotification = useNotificationStore((state) => state.showNotification)
  const clearProfile = useUserStore((state) => state.clearProfile)

  // Function to open modal
  const openModal = () => setIsModalOpen(true)

  // Function to close modal
  const closeModal = () => setIsModalOpen(false)

  // Handle logout logic
  const handleLogout = async () => {
    try {
      // Mark as intentional logout BEFORE signOut to prevent session monitor interference
      markIntentionalLogout()

      const { error } = await supabase.auth.signOut()

      if (error) {
        showNotification(t('logoutFailed'), 'error')
      } else {
        clearProfile() // Clear Zustand store
        // Feedback capabilities are cached at module scope for the page's
        // lifetime; without this the next user to sign in in this tab would
        // inherit the previous user's access flags.
        resetFeedbackAccessCache()
        closeModal()
        showNotification(t('signedOutSuccessfully'), 'success')
        router.push('/')
      }
    } catch (error) {
      console.error('Logout failed:', error)
      showNotification(t('logoutFailed'), 'error')
    }
  }

  return (
    <div>
      <button 
        className="cursor-pointer flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50 rounded-md transition-colors w-full"
        onClick={openModal}  
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5 sm:mr-2" />
        <span className="hidden sm:inline">{t('logout')}</span>
      </button>

      {/* Logout confirmation modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} style="p-9 max-w-sm w-11/12">
        <h2 className="text-lg mb-4 text-black p-3">
          {t('confirmLogout')}
        </h2>
        <div className="flex justify-between space-x-4">
          <button 
            onClick={closeModal} 
            className="px-4 py-2 text-white bg-cyan-600 rounded-md cursor-pointer hover:bg-cyan-700 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-md cursor-pointer hover:bg-red-600 transition-colors"
          >
            {t('confirmLogoutButton')}
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default LogoutModal