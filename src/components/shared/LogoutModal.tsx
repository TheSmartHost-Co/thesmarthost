"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { createClient } from '@/utils/supabase/component'
import Modal from './modal'

const LogoutModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const showNotification = useNotificationStore((state) => state.showNotification)
  const clearProfile = useUserStore((state) => state.clearProfile)

  // Function to open modal
  const openModal = () => setIsModalOpen(true)

  // Function to close modal
  const closeModal = () => setIsModalOpen(false)

  // Handle logout logic
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        showNotification('Logout failed. Please try again.', 'error')
      } else {
        clearProfile() // Clear Zustand store
        closeModal()
        showNotification('Signed out successfully', 'success')
        router.push('/')
      }
    } catch (error) {
      console.error('Logout failed:', error)
      showNotification('Logout failed. Please try again.', 'error')
    }
  }

  return (
    <div>
      <button 
        className="cursor-pointer flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-gray-50 rounded-md transition-colors w-full"
        onClick={openModal}  
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
        <span>Logout</span>
      </button>

      {/* Logout confirmation modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} style="p-9">
        <h2 className="text-lg mb-4 text-black p-3">
          Are you sure you want to log out?
        </h2>
        <div className="flex justify-between space-x-4">
          <button 
            onClick={closeModal} 
            className="px-4 py-2 text-white bg-cyan-600 rounded-md cursor-pointer hover:bg-cyan-700 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleLogout} 
            className="px-4 py-2 bg-red-500 text-white rounded-md cursor-pointer hover:bg-red-600 transition-colors"
          >
            Confirm Logout
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default LogoutModal