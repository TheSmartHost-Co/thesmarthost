'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { updateClient } from '@/services/clientService'
import { UpdateClientPayload } from '@/services/types/client'
import { useNotificationStore } from '@/store/useNotificationStore'
import { Client } from '@/services/types/client'

interface UpdateClientModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client
  onUpdate: (updated: Client) => void
}

const UpdateClientModal: React.FC<UpdateClientModalProps> = ({ 
  isOpen, 
  onClose, 
  client, 
  onUpdate 
}) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [commissionRate, setCommissionRate] = useState('')
  const [isActive, setIsActive] = useState(true)

  const showNotification = useNotificationStore((state) => state.showNotification)

  // Populate form fields when modal opens or client changes
  useEffect(() => {
    if (isOpen && client) {
      setName(client.name || '')
      setEmail(client.email || '')
      setPhone(client.phone || '')
      setCommissionRate(client.commissionRate || '')
      setIsActive(client.isActive ?? true)
    }
  }, [isOpen, client])

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

    // Validate email format if provided
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      showNotification('Please enter a valid email address', 'error')
      return
    }

    try {
      const updateData: UpdateClientPayload = {
        name: trimmedName,
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined,
        commissionRate: commissionRate,
        isActive: isActive
      }

      const res = await updateClient(client.id, updateData)

      if (res.status === 'success') {
        onUpdate(res.data)
        showNotification('Client updated successfully', 'success')
        onClose()
      } else {
        showNotification('Failed to update client', 'error')
      }
    } catch (err) {
      console.error('Error updating client:', err)
      showNotification('Error updating client', 'error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-lg w-11/12">
      <h2 className="text-xl mb-4 text-black">Edit Client</h2>
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
          <p className="text-xs text-gray-500 mt-1">Optional - for sending reports and notifications</p>
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
          <p className="text-xs text-gray-500 mt-1">Optional - for contact purposes</p>
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

        {/* Active Status field */}
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="true"
                checked={isActive === true}
                onChange={() => setIsActive(true)}
                className="mr-2"
              />
              <span className="text-sm">Active</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="false"
                checked={isActive === false}
                onChange={() => setIsActive(false)}
                className="mr-2"
              />
              <span className="text-sm">Inactive</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">Set to inactive to temporarily disable this client</p>
        </div>

        {/* Buttons */}
        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default UpdateClientModal