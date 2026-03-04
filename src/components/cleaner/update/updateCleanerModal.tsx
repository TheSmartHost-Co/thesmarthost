'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { updateCleaner } from '@/services/cleanerService'
import { UpdateCleanerPayload, Cleaner } from '@/services/types/cleaner'
import { useNotificationStore } from '@/store/useNotificationStore'

interface UpdateCleanerModalProps {
  isOpen: boolean
  onClose: () => void
  cleaner: Cleaner
  onUpdate: (updatedCleaner: Cleaner) => void
}

const TURNAROUND_OPTIONS = [
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 150, label: '2.5 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
]

const UpdateCleanerModal: React.FC<UpdateCleanerModalProps> = ({
  isOpen,
  onClose,
  cleaner,
  onUpdate,
}) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [turnaroundMinutes, setTurnaroundMinutes] = useState(120)
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const showNotification = useNotificationStore((state) => state.showNotification)

  // Reset form fields whenever the modal opens or cleaner changes
  useEffect(() => {
    if (isOpen && cleaner) {
      setName(cleaner.name)
      setEmail(cleaner.email || '')
      setPhone(cleaner.phone || '')
      setHourlyRate(cleaner.hourlyRate?.toString() || '')
      setTurnaroundMinutes(cleaner.defaultTurnaroundMinutes)
      setStatus(cleaner.status === 'inactive' ? 'inactive' : 'active')
    }
  }, [isOpen, cleaner])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()

    if (!trimmedName) {
      showNotification('Cleaner name is required', 'error')
      return
    }

    // Validate email format if provided
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(trimmedEmail)) {
        showNotification('Please enter a valid email address', 'error')
        return
      }
    }

    // Validate hourly rate if provided
    const rate = hourlyRate ? parseFloat(hourlyRate) : null
    if (hourlyRate && (isNaN(rate!) || rate! < 0)) {
      showNotification('Please enter a valid hourly rate', 'error')
      return
    }

    setIsSubmitting(true)

    try {
      const payload: UpdateCleanerPayload = {
        name: trimmedName,
        email: trimmedEmail || null,
        phone: trimmedPhone || null,
        hourlyRate: rate,
        defaultTurnaroundMinutes: turnaroundMinutes,
        status,
      }

      const res = await updateCleaner(cleaner.id, payload)

      if (res.status === 'success') {
        onUpdate(res.data)
        showNotification('Cleaner updated successfully', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Failed to update cleaner', 'error')
      }
    } catch (err) {
      console.error('Error updating cleaner:', err)
      showNotification('Error updating cleaner', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-lg w-11/12 max-h-[80vh]">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">Edit Cleaner</h2>
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
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. maria@email.com"
          />
          <p className="text-xs text-gray-500 mt-1">Used for login and notifications</p>
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

        {/* Status Toggle */}
        <div>
          <label className="block text-sm font-medium mb-2">Status</label>
          <div className="flex items-center space-x-4">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                checked={status === 'active'}
                onChange={() => setStatus('active')}
                className="mr-2"
              />
              <span className="text-sm">Active</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                checked={status === 'inactive'}
                onChange={() => setStatus('inactive')}
                className="mr-2"
              />
              <span className="text-sm">Inactive</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">Inactive cleaners won&apos;t receive new assignments</p>
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
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default UpdateCleanerModal
