'use client'

import { useTranslation } from 'react-i18next'
import { useState, useEffect } from 'react'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getReportRecipients, sendReport } from '@/services/reportService'
import type { ReportRecipient, ReportFile, ReportProperty, SendReportPayload, SendReportResponse } from '@/services/types/report'
import {
  PaperAirplaneIcon,
  CheckIcon,
  CheckCircleIcon,
  PlusIcon,
  XMarkIcon,
  XCircleIcon,
  EnvelopeIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline'

interface SendReportModalProps {
  isOpen: boolean
  onClose: () => void
  onSent: () => void
  reportId: string
  reportFiles: {
    pdf?: ReportFile
    csv?: ReportFile
    excel?: ReportFile
  }
  reportProperties: ReportProperty[]
  reportDateRange: { startDate: string; endDate: string }
}

interface CustomRecipient {
  email: string
  name: string
}

const SendReportModal: React.FC<SendReportModalProps> = ({
  isOpen,
  onClose,
  onSent,
  reportId,
  reportFiles,
  reportProperties,
  reportDateRange,
}) => {
  const { showNotification } = useNotificationStore()

  // Recipients state
  const [owners, setOwners] = useState<ReportRecipient[]>([])
  const [selectedOwnerIds, setSelectedOwnerIds] = useState<Set<string>>(new Set())
  const [customRecipients, setCustomRecipients] = useState<CustomRecipient[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [showAddEmail, setShowAddEmail] = useState(false)
  const [loadingRecipients, setLoadingRecipients] = useState(false)

  // Format selection
  const availableFormats = Object.keys(reportFiles).filter(
    (f) => reportFiles[f as keyof typeof reportFiles]
  ) as Array<'pdf' | 'csv' | 'excel'>
  const [selectedFormats, setSelectedFormats] = useState<Set<string>>(new Set(availableFormats))

  // Delivery method
  const [sendEmail, setSendEmail] = useState(true)
  const [sendPortal, setSendPortal] = useState(true)

  // Message
  const [message, setMessage] = useState('')

  // Loading + result
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<SendReportResponse['data'] | null>(null)
  const [sentRecipientsList, setSentRecipientsList] = useState<Array<{ email: string; name: string; isClient: boolean }>>([])

  // Load recipients when modal opens
  useEffect(() => {
    if (isOpen && reportId) {
      loadRecipients()
      // Reset all state
      setSelectedFormats(new Set(availableFormats))
      setSendEmail(true)
      setSendPortal(true)
      setMessage('')
      setCustomRecipients([])
      setShowAddEmail(false)
      setNewEmail('')
      setNewName('')
      setSendResult(null)
      setSentRecipientsList([])
    }
  }, [isOpen, reportId])

  const loadRecipients = async () => {
    setLoadingRecipients(true)
    try {
      const res = await getReportRecipients(reportId)
      if (res.status === 'success') {
        setOwners(res.data.recipients)
        // Pre-select all owners
        setSelectedOwnerIds(new Set(res.data.recipients.map((r) => r.clientId)))
      }
    } catch {
      showNotification('Failed to load recipients', 'error')
    } finally {
      setLoadingRecipients(false)
    }
  }

  const toggleOwner = (clientId: string) => {
    setSelectedOwnerIds((prev) => {
      const next = new Set(prev)
      if (next.has(clientId)) {
        next.delete(clientId)
      } else {
        next.add(clientId)
      }
      return next
    })
  }

  const toggleFormat = (format: string) => {
    setSelectedFormats((prev) => {
      const next = new Set(prev)
      if (next.has(format)) {
        next.delete(format)
      } else {
        next.add(format)
      }
      return next
    })
  }

  const addCustomRecipient = () => {
    if (!newEmail.trim()) return
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      showNotification('Please enter a valid email address', 'error')
      return
    }
    // Check for duplicates
    if (
      customRecipients.some((r) => r.email === newEmail.trim()) ||
      owners.some((o) => o.email === newEmail.trim())
    ) {
      showNotification('This email is already in the recipients list', 'error')
      return
    }
    setCustomRecipients((prev) => [...prev, { email: newEmail.trim(), name: newName.trim() || newEmail.trim() }])
    setNewEmail('')
    setNewName('')
    setShowAddEmail(false)
  }

  const removeCustomRecipient = (email: string) => {
    setCustomRecipients((prev) => prev.filter((r) => r.email !== email))
  }

  const totalRecipients =
    owners.filter((o) => selectedOwnerIds.has(o.clientId)).length + customRecipients.length

  const canSend =
    totalRecipients > 0 &&
    selectedFormats.size > 0 &&
    (sendEmail || sendPortal)

  const handleSend = async () => {
    if (!canSend) return
    setSending(true)

    try {
      // Build recipients list
      const recipients: SendReportPayload['recipients'] = [
        ...owners
          .filter((o) => selectedOwnerIds.has(o.clientId))
          .map((o) => ({ clientId: o.clientId, email: o.email, name: o.name })),
        ...customRecipients.map((r) => ({ clientId: null, email: r.email, name: r.name })),
      ]

      // Determine delivery method
      let deliveryMethod: 'portal' | 'email' | 'both' = 'both'
      if (sendEmail && !sendPortal) deliveryMethod = 'email'
      else if (!sendEmail && sendPortal) deliveryMethod = 'portal'

      const payload: SendReportPayload = {
        recipients,
        formats: Array.from(selectedFormats),
        deliveryMethod,
        message: message.trim() || undefined,
      }

      const res = await sendReport(reportId, payload)
      if (res.status === 'success') {
        // Save who we sent to for the success view
        setSentRecipientsList(
          recipients.map((r) => ({
            email: r.email,
            name: r.name,
            isClient: !!r.clientId,
          }))
        )
        setSendResult(res.data)
        onSent()
      } else {
        showNotification(res.message || 'Failed to send report', 'error')
      }
    } catch {
      showNotification('Failed to send report', 'error')
    } finally {
      setSending(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatLabels: Record<string, string> = {
    pdf: 'PDF',
    csv: 'CSV',
    excel: 'Excel',
  }

  // Success view after sending
  if (sendResult) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-lg p-6">
        <div className="text-center py-2">
          <div className="flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full mx-auto mb-4">
            <CheckCircleIcon className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Report Sent</h2>
          <p className="text-sm text-gray-500 mb-5">
            Delivered to {sendResult.recipientCount} recipient{sendResult.recipientCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Delivery results per recipient */}
        <div className="space-y-2 mb-5">
          {sentRecipientsList.map((r) => {
            const emailResult = sendResult.emailResults?.find((e) => e.email === r.email)
            const emailSent = emailResult?.status === 'sent'
            return (
              <div
                key={r.email}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{r.name}</span>
                    {!r.isClient && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-medium">
                        Custom
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{r.email}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {emailResult && (
                    <span className={`flex items-center gap-1 text-xs font-medium ${emailSent ? 'text-emerald-600' : 'text-red-500'}`}>
                      {emailSent ? (
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                      ) : (
                        <XCircleIcon className="w-3.5 h-3.5" />
                      )}
                      {emailSent ? 'Email sent' : 'Email failed'}
                    </span>
                  )}
                  {r.isClient && sendResult.portalNotified > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-600">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      Portal
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end pt-3 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Done
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-lg p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
          <PaperAirplaneIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Send Report</h2>
          <p className="text-sm text-gray-500">
            {reportProperties.length === 1
              ? reportProperties[0].listingName
              : `${reportProperties.length} properties`}{' '}
            &middot; {formatDate(reportDateRange.startDate)} — {formatDate(reportDateRange.endDate)}
          </p>
        </div>
      </div>

      {/* Format Selection */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Formats to Include</label>
        <div className="flex gap-2">
          {(['pdf', 'csv', 'excel'] as const).map((format) => {
            const isAvailable = availableFormats.includes(format)
            const isSelected = selectedFormats.has(format)
            return (
              <button
                key={format}
                onClick={() => isAvailable && toggleFormat(format)}
                disabled={!isAvailable}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  !isAvailable
                    ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                    : isSelected
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {isSelected && isAvailable && <CheckIcon className="w-3.5 h-3.5 inline mr-1" />}
                {formatLabels[format]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Recipients */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>
        {loadingRecipients ? (
          <div className="text-sm text-gray-400 py-3">Loading property owners...</div>
        ) : (
          <div className="space-y-2">
            {/* Property owners */}
            {owners.map((owner) => (
              <label
                key={owner.clientId}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedOwnerIds.has(owner.clientId)}
                  onChange={() => toggleOwner(owner.clientId)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">{owner.name}</span>
                    {owner.isPrimary && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{owner.email}</div>
                </div>
                <div className="text-xs text-gray-400 truncate max-w-[120px]">
                  {owner.properties.length === 1
                    ? owner.properties[0]
                    : `${owner.properties.length} properties`}
                </div>
              </label>
            ))}

            {/* Custom recipients */}
            {customRecipients.map((r) => (
              <div
                key={r.email}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 bg-gray-50"
              >
                <CheckIcon className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{r.name}</div>
                  <div className="text-xs text-gray-500 truncate">{r.email}</div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 font-medium">
                  Email only
                </span>
                <button
                  onClick={() => removeCustomRecipient(r.email)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Add custom email */}
            {showAddEmail ? (
              <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/50 space-y-2">
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomRecipient()}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={addCustomRecipient}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddEmail(false)
                      setNewEmail('')
                      setNewName('')
                    }}
                    className="px-3 py-1.5 text-sm text-gray-600 rounded-md hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddEmail(true)}
                className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 py-1"
              >
                <PlusIcon className="w-4 h-4" />
                Add custom email
              </button>
            )}

            {owners.length === 0 && customRecipients.length === 0 && !loadingRecipients && (
              <p className="text-sm text-gray-400 py-2">
                No property owners found. Add a custom email to send the report.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Delivery Method */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Method</label>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer flex-1 transition-colors">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={(e) => setSendEmail(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <EnvelopeIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">Email</span>
          </label>
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer flex-1 transition-colors">
            <input
              type="checkbox"
              checked={sendPortal}
              onChange={(e) => setSendPortal(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <ComputerDesktopIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">Client Portal</span>
          </label>
        </div>
        {sendPortal && customRecipients.length > 0 && (
          <p className="text-xs text-amber-600 mt-1.5">
            Portal access is only available for registered property owners. Custom emails will receive email only.
          </p>
        )}
        {!sendEmail && !sendPortal && (
          <p className="text-xs text-red-500 mt-1.5">Please select at least one delivery method.</p>
        )}
      </div>

      {/* Message */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a personal note..."
          rows={2}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {totalRecipients} recipient{totalRecipients !== 1 ? 's' : ''} &middot;{' '}
          {selectedFormats.size} format{selectedFormats.size !== 1 ? 's' : ''}
        </span>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend || sending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Sending...
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-4 h-4" />
                Send Report
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default SendReportModal
