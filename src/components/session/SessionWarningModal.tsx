'use client'

import { useState } from 'react'
import Modal from '@/components/shared/modal'
import { ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline'

interface SessionWarningModalProps {
  isOpen: boolean
  timeRemaining: number // minutes
  onContinueSession: () => void
  onSignOut: () => void
  onClose: () => void
}

export function SessionWarningModal({ 
  isOpen, 
  timeRemaining, 
  onContinueSession, 
  onSignOut,
  onClose 
}: SessionWarningModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleContinueSession = async () => {
    setIsLoading(true)
    try {
      await onContinueSession()
    } catch (error) {
      // Error handling is done in the hook
    } finally {
      setIsLoading(false)
    }
  }

  const formatTimeRemaining = (minutes: number) => {
    if (minutes <= 1) return 'less than 1 minute'
    return `${minutes} minute${minutes > 1 ? 's' : ''}`
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-auto">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              Session Expiring Soon
            </h3>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center text-sm text-gray-600 mb-3">
            <ClockIcon className="h-4 w-4 mr-2" />
            <span>
              Your session expires in {formatTimeRemaining(timeRemaining)}
            </span>
          </div>
          
          <p className="text-sm text-gray-700">
            To continue working without interruption, please refresh your session now. 
            Otherwise, you'll be automatically signed out when your session expires.
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleContinueSession}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              isLoading
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Refreshing...
              </div>
            ) : (
              'Continue Session'
            )}
          </button>
          
          <button
            onClick={onSignOut}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Sign Out
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            Remind me later
          </button>
        </div>
      </div>
    </Modal>
  )
}