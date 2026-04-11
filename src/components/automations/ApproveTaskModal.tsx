'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowPathIcon, ClipboardDocumentIcon, CheckIcon, XMarkIcon, PlayIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  approveAutomationTask,
  rejectAutomationTask,
  regenerateAutomationTask,
  sendAutomationTask,
} from '@/services/automationService'
import type { AutomationTask } from '@/services/types/automation'

interface ApproveTaskModalProps {
  isOpen: boolean
  task: AutomationTask | null
  onClose: () => void
  onTaskUpdated: () => void
  onProcess?: (task: AutomationTask) => void
}

export default function ApproveTaskModal({ isOpen, task, onClose, onTaskUpdated, onProcess }: ApproveTaskModalProps) {
  const { t } = useTranslation('dashboard')
  const { showNotification } = useNotificationStore()
  const [editedContent, setEditedContent] = useState('')
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [processing, setProcessing] = useState(false)

  // Reset all internal state when switching between tasks
  useEffect(() => {
    setEditedContent('')
    setCopied(false)
    setApproving(false)
    setRejecting(false)
    setRegenerating(false)
    setSending(false)
    setProcessing(false)
  }, [task?.id])

  const content = task?.editedContent || task?.generatedContent || ''

  const handleApprove = async () => {
    if (!task) return
    setApproving(true)
    try {
      const finalContent = editedContent.trim() || undefined
      const res = await approveAutomationTask(task.id, finalContent ? { editedContent: finalContent } : undefined)
      if (res.status === 'success') {
        if (task.type === 'guest_review') {
          // Copy review to clipboard and open Airbnb
          const textToCopy = finalContent || content
          await navigator.clipboard.writeText(textToCopy)
          setCopied(true)
          showNotification(t('automations.reviewCopiedToClipboard'), 'success')
          window.open('https://www.airbnb.com/users/reviews', '_blank')
          onTaskUpdated()
        } else if (task.type === 'review_nudge') {
          // Send nudge via Hostaway channel immediately after approval
          const sendRes = await sendAutomationTask(task.id)
          if (sendRes.status === 'success') {
            showNotification(t('automations.messageSentToGuest', { guest: task.guestName || t('automations.guest'), platform: task.platform || t('automations.bookingChannel') }), 'success')
          } else {
            showNotification(t('automations.approvedButFailedToSend'), 'error')
          }
          onTaskUpdated()
          onClose()
        }
      } else {
        showNotification(res.message || t('automations.failedToApprove'), 'error')
      }
    } catch {
      showNotification(t('automations.failedToApproveTask'), 'error')
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    if (!task) return
    setRejecting(true)
    try {
      const res = await rejectAutomationTask(task.id)
      if (res.status === 'success') {
        showNotification(t('automations.taskRejected'), 'info')
        onTaskUpdated()
        onClose()
      } else {
        showNotification(res.message || t('automations.failedToReject'), 'error')
      }
    } catch {
      showNotification(t('automations.failedToRejectTask'), 'error')
    } finally {
      setRejecting(false)
    }
  }

  const handleRegenerate = async () => {
    if (!task) return
    setRegenerating(true)
    try {
      const res = await regenerateAutomationTask(task.id)
      if (res.status === 'success') {
        showNotification(t('automations.queuedForRegeneration'), 'info')
        onTaskUpdated()
        onClose()
      } else {
        showNotification(res.message || t('automations.failedToRegenerate'), 'error')
      }
    } catch {
      showNotification(t('automations.failedToRegenerate'), 'error')
    } finally {
      setRegenerating(false)
    }
  }

  const handleSend = async () => {
    if (!task) return
    setSending(true)
    try {
      const res = await sendAutomationTask(task.id)
      if (res.status === 'success') {
        showNotification(t('automations.messageSentSuccess'), 'success')
        onTaskUpdated()
        onClose()
      } else {
        showNotification(res.message || t('automations.failedToSend'), 'error')
      }
    } catch {
      showNotification(t('automations.failedToSendMessage'), 'error')
    } finally {
      setSending(false)
    }
  }

  const handleCopy = async () => {
    const textToCopy = editedContent.trim() || content
    await navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    showNotification(t('automations.copiedToClipboard'), 'info')
    setTimeout(() => setCopied(false), 2000)
  }

  if (!task) return null

  const isAwaitingApproval = task.status === 'awaiting_approval'
  const isApproved = task.status === 'approved'
  const typeLabel = task.type === 'guest_review' ? t('automations.guestReview') : t('automations.reviewNudge')

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-2xl">
      <div className="p-6">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-semibold text-gray-900">{typeLabel}</h2>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
              task.type === 'guest_review' ? 'bg-violet-100 text-violet-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {typeLabel}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {task.guestName || t('automations.guest')} {t('automations.at')} {task.listingName || t('automations.property')}
            {task.departureDate && ` — ${t('automations.checkout')} ${new Date(task.departureDate).toLocaleDateString()}`}
          </p>
        </div>

        {/* Externally completed banner */}
        {task.status === 'sent' && task.errorMessage && (task.errorMessage.includes('detected') || task.errorMessage.includes('externally')) && (
          <div className="mb-5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
            <span className="text-emerald-500 text-lg">&#10003;</span>
            <p className="text-sm text-emerald-700">{task.errorMessage}</p>
          </div>
        )}

        {/* AI-Generated Content */}
        {task.status === 'pending' ? (
          <div className="mb-5 px-4 py-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
            <p className="text-sm text-gray-500">{t('automations.taskScheduledNotProcessed')}</p>
            <p className="text-xs text-gray-400 mt-1">
              {t('automations.scheduledFor')} {new Date(task.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        ) : (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                {isAwaitingApproval ? t('automations.reviewAndEdit') : t('automations.content')}
              </label>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                {copied ? <CheckIcon className="w-3.5 h-3.5 text-green-500" /> : <ClipboardDocumentIcon className="w-3.5 h-3.5" />}
                {copied ? t('automations.copied') : t('automations.copy')}
              </button>
            </div>
            {isAwaitingApproval ? (
              <textarea
                value={editedContent || content}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-y"
              />
            ) : (
              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                {task.editedContent || task.generatedContent}
              </div>
            )}
          </div>
        )}

        {/* What happens on approve */}
        {isAwaitingApproval && (
          <p className="text-xs text-gray-400 mb-3 px-1">
            {task.type === 'guest_review'
              ? t('automations.approvingWillCopy')
              : t('automations.approvingWillSend', { guest: task.guestName || t('automations.theGuest'), platform: task.platform === 'airbnb' ? 'Airbnb' : task.platform === 'vrbo' ? 'VRBO' : task.platform === 'booking' ? 'Booking.com' : task.platform || t('automations.thePlatform') })
            }
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          {isAwaitingApproval && (
            <>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckIcon className="w-4 h-4" />
                {approving ? t('automations.approving') : task.type === 'guest_review' ? t('automations.approveAndCopy') : t('automations.approveAndSend')}
              </button>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                {regenerating ? '...' : t('automations.regenerate')}
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting}
                className="flex items-center gap-1.5 px-4 py-2.5 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <XMarkIcon className="w-4 h-4" />
                {rejecting ? '...' : t('automations.reject')}
              </button>
            </>
          )}

          {isApproved && task.type === 'guest_review' && (
            <>
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <ClipboardDocumentIcon className="w-4 h-4" />
                {t('automations.copyToClipboard')}
              </button>
              <a
                href="https://www.airbnb.com/users/reviews"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                {t('automations.openAirbnb')}
              </a>
            </>
          )}

          {isApproved && task.type === 'review_nudge' && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {sending ? t('automations.sending') : t('automations.sendToGuest')}
            </button>
          )}

          {task.status === 'pending' && onProcess && (
            <button
              onClick={async () => {
                setProcessing(true)
                await onProcess(task)
                setProcessing(false)
                onClose()
              }}
              disabled={processing}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {processing ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <PlayIcon className="w-4 h-4" />
              )}
              {processing ? t('automations.processing') : t('automations.processThisTaskNow')}
            </button>
          )}

          {!isAwaitingApproval && !isApproved && !(task.status === 'pending' && onProcess) && (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              {t('automations.close')}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
