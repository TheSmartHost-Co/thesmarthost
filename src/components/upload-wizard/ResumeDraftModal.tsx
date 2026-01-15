'use client'

import React from 'react'
import Modal from '@/components/shared/modal'
import { DocumentTextIcon, ClockIcon } from '@heroicons/react/24/outline'
import { WizardStep } from './types/wizard'

interface ResumeDraftModalProps {
  isOpen: boolean
  onClose: () => void
  draftInfo: {
    fileName: string
    savedAt: Date
    currentStep: WizardStep
  }
  onResume: () => void
  onDiscard: () => void
}

const stepLabels: Record<WizardStep, string> = {
  [WizardStep.UPLOAD]: 'Upload',
  [WizardStep.PROPERTY_IDENTIFICATION]: 'Property Identification',
  [WizardStep.FIELD_MAPPING]: 'Field Mapping',
  [WizardStep.PREVIEW]: 'Preview',
  [WizardStep.PROCESS]: 'Processing',
  [WizardStep.COMPLETE]: 'Complete',
}

/**
 * Format relative time (e.g., "2 hours ago", "yesterday")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  } else if (diffDays === 1) {
    return 'yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else {
    return date.toLocaleDateString()
  }
}

const ResumeDraftModal: React.FC<ResumeDraftModalProps> = ({
  isOpen,
  onClose,
  draftInfo,
  onResume,
  onDiscard,
}) => {
  const handleResume = () => {
    onResume()
    onClose()
  }

  const handleDiscard = () => {
    onDiscard()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-md w-11/12">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <DocumentTextIcon className="w-6 h-6 text-blue-600" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Resume Previous Upload?
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            You have a saved draft from a previous upload session. Would you like to continue where you left off?
          </p>

          {/* Draft details */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 space-y-2">
            {/* File name */}
            <div className="flex items-center gap-2 text-sm">
              <DocumentTextIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-700 font-medium truncate" title={draftInfo.fileName}>
                {draftInfo.fileName}
              </span>
            </div>

            {/* Time saved */}
            <div className="flex items-center gap-2 text-sm">
              <ClockIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-600">
                Saved {formatRelativeTime(draftInfo.savedAt)}
              </span>
            </div>

            {/* Step progress */}
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
              <span className="text-gray-600">
                Step {draftInfo.currentStep} of 6: {stepLabels[draftInfo.currentStep]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={handleDiscard}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Start Fresh
        </button>
        <button
          type="button"
          onClick={handleResume}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Resume Draft
        </button>
      </div>
    </Modal>
  )
}

export default ResumeDraftModal
