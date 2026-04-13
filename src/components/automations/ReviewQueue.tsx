'use client'

import { useState, useEffect, useCallback } from 'react'
import { ClipboardDocumentIcon, CheckIcon, ArrowRightIcon, XMarkIcon, ArrowPathIcon, StarIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getAutomationTasks, approveAutomationTask } from '@/services/automationService'
import type { AutomationTask } from '@/services/types/automation'

interface ReviewQueueProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

export default function ReviewQueue({ isOpen, onClose, onComplete }: ReviewQueueProps) {
  const { showNotification } = useNotificationStore()
  const [reviews, setReviews] = useState<AutomationTask[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [editedContent, setEditedContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAutomationTasks({ type: 'guest_review', status: 'awaiting_approval', limit: 50 })
      if (res.status === 'success' && res.data) {
        setReviews(res.data)
        setCurrentIndex(0)
        setEditedContent('')
        setCopied(false)
      }
    } catch {
      showNotification('Failed to load reviews', 'error')
    } finally {
      setLoading(false)
    }
  }, [showNotification])

  useEffect(() => {
    if (isOpen) fetchReviews()
  }, [isOpen, fetchReviews])

  const current = reviews[currentIndex]
  const content = editedContent || current?.editedContent || current?.generatedContent || ''
  const total = reviews.length
  const remaining = total - currentIndex

  const handleCopyAndNext = async () => {
    if (!current) return
    setCopying(true)

    try {
      // Approve the task
      const finalContent = editedContent.trim() || undefined
      await approveAutomationTask(current.id, finalContent ? { editedContent: finalContent } : undefined)

      // Copy to clipboard
      await navigator.clipboard.writeText(finalContent || content)
      setCopied(true)

      // Brief pause to show the checkmark
      await new Promise(r => setTimeout(r, 600))

      // Move to next or finish
      if (currentIndex < total - 1) {
        setCurrentIndex(i => i + 1)
        setEditedContent('')
        setCopied(false)
      } else {
        // All done — open Airbnb and close
        showNotification(`All ${total} reviews copied! Opening Airbnb...`, 'success')
        window.open('https://www.airbnb.com/users/reviews', '_blank')
        onComplete()
        onClose()
      }
    } catch {
      showNotification('Failed to approve review', 'error')
    } finally {
      setCopying(false)
    }
  }

  const handleSkip = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex(i => i + 1)
      setEditedContent('')
      setCopied(false)
    }
  }

  const handleOpenAirbnb = () => {
    window.open('https://www.airbnb.com/users/reviews', '_blank')
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-3xl">
      <div className="p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <StarIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Review Queue</h2>
                <p className="text-sm text-gray-500">
                  {loading ? 'Loading...' : `${remaining} review${remaining !== 1 ? 's' : ''} remaining`}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          {!loading && total > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${((currentIndex + (copied ? 1 : 0)) / total) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-500 flex-shrink-0">
                {currentIndex + (copied ? 1 : 0)}/{total}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <ArrowPathIcon className="w-6 h-6 text-violet-500 animate-spin" />
            </div>
          ) : total === 0 ? (
            <div className="text-center py-16">
              <CheckIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">All caught up!</h3>
              <p className="text-sm text-gray-500">No guest reviews waiting for approval.</p>
            </div>
          ) : current ? (
            <>
              {/* Guest info */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{current.guestName || 'Guest'}</h3>
                  <p className="text-sm text-gray-500">
                    {current.listingName || 'Property'}
                    {current.departureDate && ` — Checkout ${new Date(current.departureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-violet-100 text-violet-700 text-xs font-medium rounded-full">
                  {current.platform || 'airbnb'}
                </span>
              </div>

              {/* Editable review */}
              <textarea
                value={editedContent || content}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-y mb-4"
              />

              {/* CTA Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopyAndNext}
                  disabled={copying}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-violet-200"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="w-5 h-5" />
                      Copied!
                    </>
                  ) : copying ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Copying...
                    </>
                  ) : currentIndex < total - 1 ? (
                    <>
                      <ClipboardDocumentIcon className="w-5 h-5" />
                      Copy & Next
                      <ArrowRightIcon className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="w-5 h-5" />
                      Copy & Finish
                    </>
                  )}
                </button>

                <button
                  onClick={handleOpenAirbnb}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-colors"
                >
                  Open Airbnb
                </button>

                {currentIndex < total - 1 && (
                  <button
                    onClick={handleSkip}
                    className="px-4 py-3 text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
                  >
                    Skip
                  </button>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}
