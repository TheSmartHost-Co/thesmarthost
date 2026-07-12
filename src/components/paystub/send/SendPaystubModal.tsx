'use client'

import { notifyError } from '@/utils/notify'
import React, { useEffect, useState } from 'react'
import Modal from '@/components/shared/modal'
import { PaperAirplaneIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { sendPaystub } from '@/services/paystubService'
import type { Paystub } from '@/services/types/paystub'
import { isBackendError } from '@/services/backendError'
import { useNotificationStore } from '@/store/useNotificationStore'

interface SendPaystubModalProps {
  isOpen: boolean
  onClose: () => void
  paystub: Paystub
  pmEmail?: string | null          // PM's own email, for the "cc me" shortcut
  onSent?: () => void              // a new PDF version is created — refresh files
}

const SendPaystubModal: React.FC<SendPaystubModalProps> = ({
  isOpen, onClose, paystub, pmEmail, onSent,
}) => {
  const showNotification = useNotificationStore((s) => s.showNotification)

  const [cc, setCc] = useState('')
  const [ccMe, setCcMe] = useState(false)
  const [sending, setSending] = useState(false)
  // Override flow: set when the backend returns 409 emailDisabled
  const [overridePrompt, setOverridePrompt] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setCc('')
      setCcMe(false)
      setSending(false)
      setOverridePrompt(null)
    }
  }, [isOpen])

  const recipient = paystub.teamMemberEmail
  const effectiveCc = ccMe && pmEmail ? pmEmail : cc.trim()

  const handleSend = async (override: boolean) => {
    setSending(true)
    try {
      const res = await sendPaystub(paystub.id, {
        cc: effectiveCc || undefined,
        override: override || undefined,
      })
      if (res.status === 'success') {
        showNotification(`Paystub sent to ${res.data?.sentTo || recipient || 'team member'}.`, 'success')
        onSent?.()
        onClose()
      } else {
        showNotification(res.message || 'Failed to send paystub.', 'error')
      }
    } catch (err) {
      // 409 → team member has email off (or prefs couldn't be confirmed): offer override.
      if (isBackendError(err) && err.status === 409) {
        const data = (err.body?.data ?? {}) as { emailDisabled?: boolean; teamMemberEmail?: string }
        if (data.emailDisabled) {
          setOverridePrompt(err.message || 'This team member has email notifications turned off.')
          return
        }
      }
      notifyError(err, 'Network error.')
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-0 max-w-md w-11/12" zIndex={80}>
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Send paystub</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Emails {paystub.paystubNumber} as a branded PDF attachment.
        </p>
      </div>

      <div className="px-6 py-5 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">To</label>
          {recipient ? (
            <p className="text-sm text-gray-900 font-medium">{recipient}</p>
          ) : (
            <p className="text-sm text-amber-600">No email on file for this team member.</p>
          )}
        </div>

        <div>
          <label htmlFor="cc" className="block text-sm font-medium text-gray-700 mb-2">
            cc <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="cc"
            type="email"
            value={ccMe && pmEmail ? pmEmail : cc}
            onChange={(e) => setCc(e.target.value)}
            disabled={ccMe}
            placeholder="name@example.com"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-60"
          />
          {pmEmail && (
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={ccMe}
                onChange={(e) => setCcMe(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              cc me ({pmEmail})
            </label>
          )}
        </div>

        {/* Override prompt — TM has email turned off */}
        {overridePrompt && (
          <div className="px-3 py-3 rounded-lg border border-amber-200 bg-amber-50">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                {overridePrompt} Send anyway?
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={sending}
          className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          Cancel
        </button>
        {overridePrompt ? (
          <button
            type="button"
            onClick={() => handleSend(true)}
            disabled={sending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            {sending ? 'Sending…' : 'Send anyway'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSend(false)}
            disabled={sending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            {sending ? 'Sending…' : 'Send'}
          </button>
        )}
      </div>
    </Modal>
  )
}

export default SendPaystubModal
