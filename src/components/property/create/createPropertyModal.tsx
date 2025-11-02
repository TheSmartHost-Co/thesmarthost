'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { createProperty } from '@/services/propertyService'
import { getClientsByParentId } from '@/services/clientService'
import { CreatePropertyPayload } from '@/services/types/property'
import { Client } from '@/services/types/client'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'

interface CreatePropertyModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (newProperty: any) => void
}

const CreatePropertyModal: React.FC<CreatePropertyModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [province, setProvince] = useState('')
  const [propertyType, setPropertyType] = useState<'STR' | 'LTR'>('STR')
  const [commissionRate, setCommissionRate] = useState('')
  const [hostawayListingId, setHostawayListingId] = useState('')
  const [clientId, setClientId] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Fetch clients when modal opens
  useEffect(() => {
    const fetchClients = async () => {
      if (isOpen && profile?.id) {
        try {
          setLoadingClients(true)
          const response = await getClientsByParentId(profile.id)
          setClients(response.data.filter(c => c.isActive))
        } catch (err) {
          console.error('Error fetching clients:', err)
          showNotification('Failed to load clients', 'error')
        } finally {
          setLoadingClients(false)
        }
      }
    }

    fetchClients()
  }, [isOpen, profile?.id])

  // Reset form fields whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setAddress('')
      setProvince('')
      setPropertyType('STR')
      setCommissionRate('')
      setHostawayListingId('')
      setClientId('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedAddress = address.trim()
    const trimmedProvince = province.trim()
    const trimmedHostawayId = hostawayListingId.trim()
    const parsedCommissionRate = parseFloat(commissionRate)

    // Validation
    if (!trimmedName || !trimmedAddress || !trimmedProvince || !trimmedHostawayId || !clientId) {
      showNotification('All fields except commission rate override are required', 'error')
      return
    }

    if (!commissionRate || isNaN(parsedCommissionRate)) {
      showNotification('Commission rate is required', 'error')
      return
    }

    if (parsedCommissionRate <= 0 || parsedCommissionRate > 100) {
      showNotification('Commission rate must be between 0 and 100', 'error')
      return
    }

    try {
      const payload: CreatePropertyPayload = {
        clientId,
        name: trimmedName,
        address: trimmedAddress,
        province: trimmedProvince,
        propertyType,
        commissionRate: parsedCommissionRate,
        hostawayListingId: trimmedHostawayId,
      }

      const res = await createProperty(payload)

      if (res.status === 'success') {
        onAdd(res.data)
        showNotification('Property created successfully', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Failed to create property', 'error')
      }
    } catch (err) {
      console.error('Error creating property:', err)
      const message = err instanceof Error ? err.message : 'Error creating property'
      showNotification(message, 'error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-2xl w-11/12">
      <h2 className="text-xl mb-4 text-black">Create New Property</h2>
      <form onSubmit={handleSubmit} className="space-y-4 text-black">
        {/* Property Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Property Name *</label>
          <input
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Lake Estate"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium mb-1">Address *</label>
          <input
            required
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 123 Main St, Calgary, AB"
          />
        </div>

        {/* Province */}
        <div>
          <label className="block text-sm font-medium mb-1">Province *</label>
          <input
            required
            type="text"
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Alberta"
          />
        </div>

        {/* Property Type and Commission Rate - Side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Property Type *</label>
            <select
              required
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value as 'STR' | 'LTR')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="STR">STR (Short-Term Rental)</option>
              <option value="LTR">LTR (Long-Term Rental)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Commission Rate (%) *</label>
            <input
              required
              type="number"
              step="0.01"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., 15"
            />
          </div>
        </div>

        {/* Hostaway Listing ID */}
        <div>
          <label className="block text-sm font-medium mb-1">Hostaway Listing ID *</label>
          <input
            required
            type="text"
            value={hostawayListingId}
            onChange={(e) => setHostawayListingId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., HOST-123"
          />
        </div>

        {/* Client Owner Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-1">Property Owner (Client) *</label>
          {loadingClients ? (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
              Loading clients...
            </div>
          ) : clients.length === 0 ? (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
              No active clients available. Please create a client first.
            </div>
          ) : (
            <select
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.email || 'No email'})
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-gray-500 mt-1">
            This client will be set as the primary owner. You can add co-owners after creating the property.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loadingClients || clients.length === 0}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create Property
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CreatePropertyModal