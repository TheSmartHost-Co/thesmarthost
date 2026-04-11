'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('errors')
  const [isLoading, setIsLoading] = useState(false)
  // Live countdown: track remaining seconds internally
  const [displaySeconds, setDisplaySeconds] = useState(Math.round(timeRemaining * 60))
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Reset countdown when modal opens or timeRemaining changes
  useEffect(() => {
    if (isOpen) {
      setDisplaySeconds(Math.round(timeRemaining * 60))

      // Start countdown timer
      timerRef.current = setInterval(() => {
        setDisplaySeconds(prev => Math.max(0, prev - 1))
      }, 1000)

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }
    }
  }, [isOpen, timeRemaining])

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

  // Format seconds into human-readable time (e.g., "4:32" or "less than 1 minute")
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'expiring now'
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`

    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60

    if (mins < 5) {
      // Show minutes:seconds format for last 5 minutes
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return `${mins} minute${mins !== 1 ? 's' : ''}`
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
              {t('sessionExpiringSoon')}
            </h3>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center text-sm text-gray-600 mb-3">
            <ClockIcon className="h-4 w-4 mr-2" />
            <span>
              {t('sessionExpiresIn')} <span className="font-mono font-medium text-gray-900">{formatTimeRemaining(displaySeconds)}</span>
            </span>
          </div>
          
          <p className="text-sm text-gray-700">
            {t('sessionWarningDescription')}
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
                {t('refreshing')}
              </div>
            ) : (
              t('continueSession')
            )}
          </button>
          
          <button
            onClick={onSignOut}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {t('signOut')}
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            {t('remindMeLater')}
          </button>
        </div>
      </div>
    </Modal>
  )
}