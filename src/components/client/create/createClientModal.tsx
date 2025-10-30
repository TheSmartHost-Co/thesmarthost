'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { createClient } from '@/services/clientService'
import { CreateClientPayload } from '@/services/types/client'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'

interface CreateClientModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (newClient: any) => void
}

const CreateClientModal: React.FC<CreateClientModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [commissionRate, setCommissionRate] = useState('')

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Reset form fields whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setEmail('')
      setPhone('')
      setCommissionRate('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    const parsedCommissionRate = parseFloat(commissionRate)

    if (!trimmedName || !commissionRate || isNaN(parsedCommissionRate)) {
      showNotification('Client name and commission rate are required', 'error')
      return
    }

    if (parsedCommissionRate <= 0 || parsedCommissionRate > 100) {
      showNotification('Commission rate must be between 0 and 100', 'error')
      return
    }

    if (!profile?.id) {
      showNotification('User profile not found', 'error')
      return
    }

    // Validate email format if provided
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showNotification('Please enter a valid email address', 'error')
      return
    }

    try {
      const payload: CreateClientPayload = {
        parentId: profile.id,
        name: trimmedName,
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined,
        commissionRate: commissionRate,
      }

      const res = await createClient(payload)

      if (res.status === 'success') {
        onAdd(res.data)
        showNotification('Client created successfully', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Failed to create client', 'error')
      }
    } catch (err) {
      console.error('Error creating client:', err)
      showNotification('Error creating client', 'error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-lg w-11/12">
      <h2 className="text-xl mb-4 text-black">Create New Client</h2>
      <form onSubmit={handleSubmit} className="space-y-4 text-black">
        {/* Name field */}
        <div>
          <label className="block text-sm font-medium mb-1">Client Name *</label>
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
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. john.smith@email.com"
          />
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
        </div>

        {/* Commission Rate field */}
        <div>
          <label className="block text-sm font-medium mb-1">Commission Rate (%) *</label>
          <input
            type="number"
            required
            value={commissionRate}
            onChange={(e) => setCommissionRate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. 15"
            min="0"
            max="100"
            step="0.01"
          />
          <p className="text-xs text-gray-500 mt-1">Percentage of revenue this client will pay you</p>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 cursor-pointer py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 cursor-pointer bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Client
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateClientModal