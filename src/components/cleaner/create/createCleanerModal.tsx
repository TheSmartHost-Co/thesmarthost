'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { createCleaner } from '@/services/cleanerService'
import { CreateCleanerPayload, Cleaner } from '@/services/types/cleaner'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissions } from '@/hooks/usePermissions'

interface CreateCleanerModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (newCleaner: Cleaner) => void
}

const TURNAROUND_OPTIONS = [
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 150, label: '2.5 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
]

const CreateCleanerModal: React.FC<CreateCleanerModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [turnaroundMinutes, setTurnaroundMinutes] = useState(120)
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
      setHourlyRate('')
      setTurnaroundMinutes(120)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()

    if (!trimmedName) {
      showNotification(t('cleanerNameRequired'), 'error')
      return
    }

    if (!trimmedEmail) {
      showNotification(t('emailRequiredForLogin'), 'error')
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
      const payload: CreateCleanerPayload = {
        userId: effectiveUserId,
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone || undefined,
        hourlyRate: rate,
        defaultTurnaroundMinutes: turnaroundMinutes,
      }

      const res = await createCleaner(payload)

      if (res.status === 'success') {
        onAdd(res.data)
        // Show appropriate message based on whether invite was sent
        const inviteSent = (res as { inviteSent?: boolean }).inviteSent !== false
        if (inviteSent) {
          showNotification(t('cleanerCreatedAndInviteSent'), 'success')
        } else {
          showNotification(t('cleanerCreatedNoInvite'), 'info')
        }
        onClose()
      } else {
        showNotification(res.message || t('failedToCreateCleaner'), 'error')
      }
    } catch (err) {
      console.error('Error creating cleaner:', err)
      showNotification(err instanceof Error ? err.message : t('errorCreatingCleaner'), 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-lg w-11/12 max-h-[80vh]">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">{t('createCleanerTitle')}</h2>
      <form onSubmit={handleSubmit} className="space-y-4 text-gray-900">
        {/* Name field */}
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. Maria Garcia"
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
            placeholder="e.g. maria@email.com"
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
            placeholder="e.g. 25.00"
          />
        </div>

        {/* Default Turnaround Time field */}
        <div>
          <label className="block text-sm font-medium mb-1">Default Turnaround Time</label>
          <select
            value={turnaroundMinutes}
            onChange={(e) => setTurnaroundMinutes(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {TURNAROUND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Estimated time to complete a standard cleaning</p>
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
            {isSubmitting ? t('addingCleaner') : t('addCleanerButton')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateCleanerModal
