'use client'

import Modal from '@/components/shared/modal'
import { LockClosedIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'

interface SessionExpiredModalProps {
  isOpen: boolean
  onSignIn: () => void
}

export function SessionExpiredModal({ 
  isOpen, 
  onSignIn 
}: SessionExpiredModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={() => {}} closable={false}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-auto">
        <div className="flex items-center mb-4">
          <div className="flex-shrink-0">
            <LockClosedIcon className="h-6 w-6 text-red-600" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900">
              Session Expired
            </h3>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-700 mb-4">
            Your session has expired for security reasons. Please sign in again to continue 
            working with HostMetrics.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center text-sm text-gray-600">
              <LockClosedIcon className="h-4 w-4 mr-2 text-gray-400" />
              <span>Your data is secure and will be available after signing in</span>
            </div>
          </div>
        </div>

        <button
          onClick={onSignIn}
          className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
          Sign In Again
        </button>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Sessions automatically expire after 1 hour for your security
          </p>
        </div>
      </div>
    </Modal>
  )
}