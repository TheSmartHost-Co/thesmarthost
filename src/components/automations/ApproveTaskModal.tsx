'use client'

import { useState } from 'react'
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
  const { showNotification } = useNotificationStore()
  const [editedContent, setEditedContent] = useState('')
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [processing, setProcessing] = useState(false)

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
          showNotification('Review copied to clipboard — paste it on Airbnb', 'success')
          window.open('https://www.airbnb.com/users/reviews', '_blank')
          onTaskUpdated()
        } else if (task.type === 'review_nudge') {
          // Send nudge via Hostaway channel immediately after approval
          const sendRes = await sendAutomationTask(task.id)
          if (sendRes.status === 'success') {
            showNotification(`Message sent to ${task.guestName || 'guest'} via ${task.platform || 'booking channel'}`, 'success')
          } else {
            showNotification('Approved but failed to send — you can retry from the dashboard', 'error')
          }
          onTaskUpdated()
          onClose()
        }
      } else {
        showNotification(res.message || 'Failed to approve', 'error')
      }
    } catch {
      showNotification('Failed to approve task', 'error')
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
        showNotification('Task rejected', 'info')
        onTaskUpdated()
        onClose()
      } else {
        showNotification(res.message || 'Failed to reject', 'error')
      }
    } catch {
      showNotification('Failed to reject task', 'error')
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
        showNotification('Queued for regeneration — check back shortly', 'info')
        onTaskUpdated()
        onClose()
      } else {
        showNotification(res.message || 'Failed to regenerate', 'error')
      }
    } catch {
      showNotification('Failed to regenerate', 'error')
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
        showNotification('Message sent to guest', 'success')
        onTaskUpdated()
        onClose()
      } else {
        showNotification(res.message || 'Failed to send', 'error')
      }
    } catch {
      showNotification('Failed to send message', 'error')
    } finally {
      setSending(false)
    }
  }

  const handleCopy = async () => {
    const textToCopy = editedContent.trim() || content
    await navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    showNotification('Copied to clipboard', 'info')
    setTimeout(() => setCopied(false), 2000)
  }

  if (!task) return null

  const isAwaitingApproval = task.status === 'awaiting_approval'
  const isApproved = task.status === 'approved'
  const typeLabel = task.type === 'guest_review' ? 'Guest Review' : 'Review Nudge'

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
            {task.guestName || 'Guest'} at {task.listingName || 'Property'}
            {task.departureDate && ` — Checkout ${new Date(task.departureDate).toLocaleDateString()}`}
          </p>
        </div>

        {/* AI-Generated Content */}
        {task.status === 'pending' ? (
          <div className="mb-5 px-4 py-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
            <p className="text-sm text-gray-500">This task is scheduled and hasn&apos;t been processed yet.</p>
            <p className="text-xs text-gray-400 mt-1">
              Scheduled for {new Date(task.scheduledFor).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        ) : (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                {isAwaitingApproval ? 'Review & Edit' : 'Content'}
              </label>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                {copied ? <CheckIcon className="w-3.5 h-3.5 text-green-500" /> : <ClipboardDocumentIcon className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
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
              ? 'Approving will copy the review to your clipboard and open Airbnb so you can paste it.'
              : `Approving will send this message to ${task.guestName || 'the guest'} via their booking channel (${task.platform === 'airbnb' ? 'Airbnb' : task.platform === 'vrbo' ? 'VRBO' : task.platform === 'booking' ? 'Booking.com' : task.platform || 'the platform'} inbox).`
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
                {approving ? 'Approving...' : task.type === 'guest_review' ? 'Approve & Copy' : 'Approve & Send'}
              </button>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                {regenerating ? '...' : 'Regenerate'}
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting}
                className="flex items-center gap-1.5 px-4 py-2.5 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <XMarkIcon className="w-4 h-4" />
                {rejecting ? '...' : 'Reject'}
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
                Copy to Clipboard
              </button>
              <a
                href="https://www.airbnb.com/users/reviews"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                Open Airbnb
              </a>
            </>
          )}

          {isApproved && task.type === 'review_nudge' && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send to Guest'}
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
              {processing ? 'Processing...' : 'Process This Task Now'}
            </button>
          )}

          {!isAwaitingApproval && !isApproved && !(task.status === 'pending' && onProcess) && (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
