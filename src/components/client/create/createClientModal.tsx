'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { createClient } from '@/services/clientService'
import { getStatusCodesByUserId } from '@/services/clientCodeService'
import { CreateClientPayload } from '@/services/types/client'
import { ClientStatusCode } from '@/services/types/clientCode'
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
  const [companyName, setCompanyName] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [pms, setPms] = useState('')
  const [statusCodes, setStatusCodes] = useState<ClientStatusCode[]>([])
  const [selectedStatus, setSelectedStatus] = useState('active') // Default to 'active'
  const [selectedStatusId, setSelectedStatusId] = useState<string | undefined>(undefined)

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Fetch status codes when modal opens
  useEffect(() => {
    const fetchStatusCodes = async () => {
      if (isOpen && profile?.id) {
        try {
          const response = await getStatusCodesByUserId(profile.id)
          if (response.status === 'success') {
            setStatusCodes(response.data)
            // Set default status to the default status code if available
            const defaultStatus = response.data.find(status => status.isDefault)
            if (defaultStatus) {
              setSelectedStatus('custom')
              setSelectedStatusId(defaultStatus.id)
            } else {
              setSelectedStatus('active')
              setSelectedStatusId(undefined)
            }
          }
        } catch (error) {
          console.error('Error fetching status codes:', error)
          // Fall back to simple active status
          setSelectedStatus('active')
          setSelectedStatusId(undefined)
        }
      }
    }

    fetchStatusCodes()
  }, [isOpen, profile?.id])

  // Reset form fields whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setEmail('')
      setPhone('')
      setCompanyName('')
      setBillingAddress('')
      setPms('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    const trimmedCompanyName = companyName.trim()
    const trimmedBillingAddress = billingAddress.trim()
    const trimmedPms = pms.trim()

    if (!trimmedName) {
      showNotification('Client name is required', 'error')
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
        companyName: trimmedCompanyName || undefined,
        billingAddress: trimmedBillingAddress || undefined,
        pms: trimmedPms || undefined,
        statusId: selectedStatus === 'custom' ? selectedStatusId : undefined,
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
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-lg w-11/12 max-h-[80vh]">
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

        {/* Company Name field */}
        <div>
          <label className="block text-sm font-medium mb-1">Company Name</label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. Smith Properties LLC"
          />
        </div>

        {/* Billing Address field */}
        <div>
          <label className="block text-sm font-medium mb-1">Billing Address</label>
          <textarea
            value={billingAddress}
            onChange={(e) => setBillingAddress(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. 123 Main St, City, State 12345"
            rows={2}
          />
        </div>

        {/* PMS field */}
        <div>
          <label className="block text-sm font-medium mb-1">Property Management System</label>
          <input
            value={pms}
            onChange={(e) => setPms(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. Hostaway"
          />
        </div>

        {/* Status field */}
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <div className="space-y-2">
            {/* Simple Active/Inactive options */}
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="active"
                  checked={selectedStatus === 'active'}
                  onChange={() => {
                    setSelectedStatus('active')
                    setSelectedStatusId(undefined)
                  }}
                  className="mr-2"
                />
                <span className="text-sm">Active</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="inactive"
                  checked={selectedStatus === 'inactive'}
                  onChange={() => {
                    setSelectedStatus('inactive')
                    setSelectedStatusId(undefined)
                  }}
                  className="mr-2"
                />
                <span className="text-sm">Inactive</span>
              </label>
            </div>
            
            {/* Custom status codes if available */}
            {statusCodes.length > 0 && (
              <div>
                <label className="flex items-center mb-2">
                  <input
                    type="radio"
                    value="custom"
                    checked={selectedStatus === 'custom'}
                    onChange={() => setSelectedStatus('custom')}
                    className="mr-2"
                  />
                  <span className="text-sm">Custom Status</span>
                </label>
                {selectedStatus === 'custom' && (
                  <select
                    value={selectedStatusId || ''}
                    onChange={(e) => setSelectedStatusId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="">Select a status</option>
                    {statusCodes.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.label} ({status.code})
                        {status.isDefault ? ' - Default' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">Choose the initial status for this client</p>
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