'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { approveMessageLog, dismissMessageLog } from '@/services/messageAutomationService'
import type { MessageLogEntry } from '@/services/types/messageAutomation'

interface MessageDetailModalProps {
  isOpen: boolean
  log: MessageLogEntry | null
  onClose: () => void
  onUpdated: () => void
}

function getStatusBadge(status: MessageLogEntry['status']) {
  const map: Record<MessageLogEntry['status'], { label: string; className: string }> = {
    queued:         { label: 'Queued',        className: 'bg-amber-100 text-amber-700' },
    escalated:      { label: 'Escalated',     className: 'bg-red-100 text-red-700' },
    auto_sent:      { label: 'Auto Sent',     className: 'bg-emerald-100 text-emerald-700' },
    pm_approved:    { label: 'PM Approved',   className: 'bg-blue-100 text-blue-700' },
    pm_edited_sent: { label: 'PM Edited',     className: 'bg-blue-100 text-blue-700' },
    dismissed:      { label: 'Dismissed',     className: 'bg-gray-100 text-gray-500' },
    skipped:        { label: 'Skipped',       className: 'bg-gray-100 text-gray-500' },
    failed:         { label: 'Failed',        className: 'bg-red-100 text-red-600' },
    pending:        { label: 'Pending',       className: 'bg-yellow-100 text-yellow-700' },
  }
  const { label, className } = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-500' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${className}`}>
      {label}
    </span>
  )
}

function getConfidenceBadge(confidence: MessageLogEntry['aiConfidence']) {
  if (!confidence) return null
  const map: Record<NonNullable<MessageLogEntry['aiConfidence']>, { label: string; dotClass: string }> = {
    high:   { label: 'High confidence',   dotClass: 'bg-emerald-500' },
    medium: { label: 'Medium confidence', dotClass: 'bg-amber-500' },
    low:    { label: 'Low confidence',    dotClass: 'bg-red-500' },
  }
  const { label, dotClass } = map[confidence]
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
      <span className={`w-2 h-2 rounded-full ${dotClass}`} />
      {label}
    </span>
  )
}

function getPlatformBadge(platform: string | null) {
  if (!platform) return null
  const label =
    platform === 'airbnb' ? 'Airbnb' :
    platform === 'vrbo' ? 'VRBO' :
    platform === 'booking' ? 'Booking.com' :
    platform.charAt(0).toUpperCase() + platform.slice(1)
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700">
      {label}
    </span>
  )
}

/**
 * Parses the raw "[Guest - 2026-04-12 19:41:00]: message text" format
 * into structured message objects for rendering as chat bubbles.
 */
function parseConversationHistory(raw: string): { sender: string; isGuest: boolean; time: string; body: string }[] {
  const lines = raw.split('\n')
  const messages: { sender: string; isGuest: boolean; time: string; body: string }[] = []
  const lineRegex = /^\[(Guest|Host)\s*[-–—]\s*(.+?)\]:\s*(.*)$/

  let current: { sender: string; isGuest: boolean; time: string; body: string } | null = null

  for (const line of lines) {
    const match = line.match(lineRegex)
    if (match) {
      // Save previous message
      if (current) messages.push(current)
      const sender = match[1]
      const rawTime = match[2].trim()
      // Format the timestamp nicely
      let time = rawTime
      try {
        const d = new Date(rawTime)
        if (!isNaN(d.getTime())) {
          time = d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        }
      } catch { /* keep raw */ }

      current = { sender, isGuest: sender === 'Guest', time, body: match[3].trim() }
    } else if (current && line.trim()) {
      // Continuation line — append to current message body
      current.body += '\n' + line.trim()
    }
  }
  if (current) messages.push(current)

  return messages
}

export default function MessageDetailModal({ isOpen, log, onClose, onUpdated }: MessageDetailModalProps) {
  const { showNotification } = useNotificationStore()
  const [editedContent, setEditedContent] = useState('')
  const [approving, setApproving] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const convoRef = useRef<HTMLDivElement>(null)

  // Reset state when switching between logs
  useEffect(() => {
    setEditedContent('')
    setApproving(false)
    setDismissing(false)
  }, [log?.id])

  // Auto-scroll conversation history to bottom (most recent messages)
  useEffect(() => {
    if (convoRef.current) {
      convoRef.current.scrollTop = convoRef.current.scrollHeight
    }
  }, [log?.id, log?.conversationHistory])

  const handleApproveAndSend = async () => {
    if (!log) return
    setApproving(true)
    try {
      const finalContent = editedContent.trim() || undefined
      const res = await approveMessageLog(log.id, finalContent ? { editedContent: finalContent } : undefined)
      if (res.status === 'success') {
        showNotification(`Reply sent to ${log.guestName || 'guest'} via ${log.platform || 'booking channel'}`, 'success')
        onUpdated()
        onClose()
      } else {
        showNotification(res.message || 'Failed to send', 'error')
      }
    } catch {
      showNotification('Failed to send reply', 'error')
    } finally {
      setApproving(false)
    }
  }

  const handleDismiss = async () => {
    if (!log) return
    setDismissing(true)
    try {
      const res = await dismissMessageLog(log.id)
      if (res.status === 'success') {
        showNotification('Message dismissed', 'info')
        onUpdated()
        onClose()
      } else {
        showNotification(res.message || 'Failed to dismiss', 'error')
      }
    } catch {
      showNotification('Failed to dismiss', 'error')
    } finally {
      setDismissing(false)
    }
  }

  if (!log) return null

  const isQueued = log.status === 'queued'
  const isEscalated = log.status === 'escalated'
  const isActionable = isQueued || isEscalated

  // The reply text to display/edit
  const replyText = log.aiResponse || log.aiSuggestedAction || ''

  // Statuses where we show a read-only view of what was sent
  const isReadOnly = ['auto_sent', 'pm_approved', 'pm_edited_sent', 'failed', 'skipped', 'dismissed'].includes(log.status)

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-2xl">
      <div className="p-6">

        {/* Header */}
        <div className="mb-5 pr-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h2 className="text-lg font-semibold text-gray-900">
              {log.guestName || 'Guest'}
            </h2>
            {getPlatformBadge(log.platform)}
            {getStatusBadge(log.status)}
          </div>
          <p className="text-sm text-gray-500">
            {log.listingName || 'Property'}
            {log.incomingMessageAt && (
              <>
                {' '}—{' '}
                {new Date(log.incomingMessageAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </>
            )}
          </p>
        </div>

        {/* Incoming guest message */}
        <div className="mb-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
            Guest&apos;s Message
          </p>
          <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {log.incomingMessage}
          </div>
        </div>

        {/* Conversation History — chat bubbles */}
        {log.conversationHistory && (
          <div className="mb-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
              Conversation History
            </p>
            <div ref={convoRef} className="px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl max-h-64 overflow-y-auto space-y-2">
              {parseConversationHistory(log.conversationHistory).reverse().map((msg, i) => (
                <div key={i} className={`flex ${msg.isGuest ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                    msg.isGuest
                      ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                      : 'bg-blue-500 text-white rounded-br-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                    <p className={`text-[10px] mt-1 ${msg.isGuest ? 'text-gray-400' : 'text-blue-200'}`}>
                      {msg.sender} · {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Confidence section */}
        {log.aiConfidence && (
          <div className="mb-5 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {getConfidenceBadge(log.aiConfidence)}
              {log.aiTopic && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                  {log.aiTopic}
                </span>
              )}
            </div>
            {log.aiReasoning && (
              <p className="text-xs italic text-gray-400 leading-relaxed">
                {log.aiReasoning}
              </p>
            )}
          </div>
        )}

        {/* AI suggested action — escalated only */}
        {isEscalated && log.aiSuggestedAction && (
          <div className="mb-5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-medium text-amber-700 mb-1">AI Suggested Action</p>
            <p className="text-sm text-amber-800 leading-relaxed">{log.aiSuggestedAction}</p>
          </div>
        )}

        {/* Reply content */}
        {replyText && (
          <div className="mb-5">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
              {isActionable ? 'Review & Edit Reply' : 'Reply Sent'}
            </label>
            {isActionable ? (
              <textarea
                value={editedContent || replyText}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-y"
              />
            ) : (
              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                {log.editedContent || replyText}
              </div>
            )}
          </div>
        )}

        {/* Error message for failed status */}
        {log.status === 'failed' && log.errorMessage && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-xs font-medium text-red-600 mb-1">Error</p>
            <p className="text-sm text-red-700">{log.errorMessage}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
          {isQueued && (
            <>
              <button
                onClick={handleApproveAndSend}
                disabled={approving || dismissing}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckIcon className="w-4 h-4" />
                {approving ? 'Sending…' : 'Approve & Send'}
              </button>
              <button
                onClick={handleDismiss}
                disabled={approving || dismissing}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <XMarkIcon className="w-4 h-4" />
                {dismissing ? '…' : 'Dismiss'}
              </button>
            </>
          )}

          {isEscalated && (
            <>
              <button
                onClick={handleApproveAndSend}
                disabled={approving || dismissing}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <CheckIcon className="w-4 h-4" />
                {approving ? 'Sending…' : 'Send Reply'}
              </button>
              <button
                onClick={handleDismiss}
                disabled={approving || dismissing}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <XMarkIcon className="w-4 h-4" />
                {dismissing ? '…' : 'Dismiss'}
              </button>
            </>
          )}

          {isReadOnly && (
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
