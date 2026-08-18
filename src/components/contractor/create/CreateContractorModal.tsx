'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { createContractor } from '@/services/contractorService'
import { CreateContractorPayload, Contractor } from '@/services/types/contractor'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissions } from '@/hooks/usePermissions'

interface CreateContractorModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (newContractor: Contractor) => void
}

const CreateContractorModal: React.FC<CreateContractorModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [trade, setTrade] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { t } = useTranslation('turnover')
  const { effectiveUserId } = usePermissions()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Reset form fields whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setEmail('')
      setPhone('')
      setTrade('')
      setHourlyRate('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    const trimmedTrade = trade.trim()

    if (!trimmedName) {
      showNotification(t('contractorNameRequired'), 'error')
      return
    }

    if (!trimmedEmail) {
      showNotification(t('emailRequiredForContractorLogin'), 'error')
      return
    }

    if (!effectiveUserId) {
      showNotification(t('userProfileNotFound'), 'error')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      showNotification(t('pleaseEnterValidEmail'), 'error')
      return
    }

    // Validate hourly rate if provided
    const rate = hourlyRate ? parseFloat(hourlyRate) : undefined
    if (hourlyRate && (isNaN(rate!) || rate! < 0)) {
      showNotification(t('pleaseEnterValidRate'), 'error')
      return
    }

    setIsSubmitting(true)

    try {
      const payload: CreateContractorPayload = {
        userId: effectiveUserId,
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone || undefined,
        trade: trimmedTrade || undefined,
        hourlyRate: rate,
      }

      const res = await createContractor(payload)

      if (res.status === 'success') {
        onAdd(res.data)
        // Show appropriate message based on whether invite was sent
        const inviteSent = (res as { inviteSent?: boolean }).inviteSent !== false
        if (inviteSent) {
          showNotification(t('contractorCreatedAndInviteSent'), 'success')
        } else {
          showNotification(t('contractorCreatedNoInvite'), 'info')
        }
        onClose()
      } else {
        showNotification(res.message || t('failedToCreateContractor'), 'error')
      }
    } catch (err) {
      console.error('Error creating contractor:', err)
      showNotification(err instanceof Error ? err.message : t('errorCreatingContractor'), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-lg w-11/12 max-h-[80vh]">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">{t('createContractorTitle')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4 text-gray-900">
        {/* Name field */}
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. John Smith"
          />
        </div>

        {/* Email field */}
        <div>
          <label className="block text-sm font-medium mb-1">Email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. john@email.com"
          />
          <p className="text-xs text-gray-500 mt-1">An invite email will be sent so they can set up their account</p>
        </div>

        {/* Phone field */}
        <div>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. (555) 123-4567"
          />
          <p className="text-xs text-gray-500 mt-1">Used for SMS notifications</p>
        </div>

        {/* Trade field */}
        <div>
          <label className="block text-sm font-medium mb-1">Trade / Specialty</label>
          <input
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. Plumbing, Lawn care"
          />
          <p className="text-xs text-gray-500 mt-1">What type of work this contractor performs</p>
        </div>

        {/* Hourly Rate field */}
        <div>
          <label className="block text-sm font-medium mb-1">Hourly Rate ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. 45.00"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 cursor-pointer py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 cursor-pointer bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? t('addingContractor') : t('addContractorButton')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateContractorModal
