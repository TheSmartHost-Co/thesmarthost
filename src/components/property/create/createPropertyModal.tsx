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
  const [listingName, setListingName] = useState('')
  const [listingId, setListingId] = useState('')
  const [externalName, setExternalName] = useState('')
  const [internalName, setInternalName] = useState('')
  const [address, setAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [province, setProvince] = useState('')
  const [propertyType, setPropertyType] = useState<'STR' | 'LTR'>('STR')
  const [commissionRate, setCommissionRate] = useState('')
  const [clientId, setClientId] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      setListingName('')
      setListingId('')
      setExternalName('')
      setInternalName('')
      setAddress('')
      setPostalCode('')
      setProvince('')
      setPropertyType('STR')
      setCommissionRate('')
      setClientId('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedListingName = listingName.trim()
    const trimmedListingId = listingId.trim()
    const trimmedExternalName = externalName.trim()
    const trimmedInternalName = internalName.trim()
    const trimmedAddress = address.trim()
    const trimmedPostalCode = postalCode.trim()
    const trimmedProvince = province.trim()
    const parsedCommissionRate = parseFloat(commissionRate)

    // Validation
    if (!trimmedListingName || !trimmedListingId || !trimmedAddress || !trimmedPostalCode || !trimmedProvince || !clientId) {
      showNotification('All required fields must be filled', 'error')
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

    setIsSubmitting(true)

    try {
      const payload: CreatePropertyPayload = {
        clientId,
        listingName: trimmedListingName,
        listingId: trimmedListingId,
        address: trimmedAddress,
        postalCode: trimmedPostalCode,
        province: trimmedProvince,
        propertyType,
        commissionRate: parsedCommissionRate,
        ...(trimmedExternalName && { externalName: trimmedExternalName }),
        ...(trimmedInternalName && { internalName: trimmedInternalName }),
      }

      const res = await createProperty(payload)

      if (res.status === 'success') {
        showNotification('Property created successfully', 'success')
        onAdd(res.data)
        onClose()
      } else {
        showNotification(res.message || 'Failed to create property', 'error')
      }
    } catch (err) {
      console.error('Error creating property:', err)
      const message = err instanceof Error ? err.message : 'Error creating property'
      showNotification(message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-lg w-11/12 max-h-[90vh]">
      <h2 className="text-xl mb-4 text-black">Create New Property</h2>
      <form onSubmit={handleSubmit} className="space-y-4 text-black">
        {/* Property Type */}
        <div>
          <label className="block text-sm font-medium mb-1">Property Type *</label>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value as 'STR' | 'LTR')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="STR">Short-Term Rental (STR)</option>
            <option value="LTR">Long-Term Rental (LTR)</option>
          </select>
        </div>

        {/* Listing Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Listing Name *</label>
          <input
            required
            type="text"
            value={listingName}
            onChange={(e) => setListingName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. Lake Estate"
          />
        </div>

        {/* Listing ID */}
        <div>
          <label className="block text-sm font-medium mb-1">Listing ID *</label>
          <input
            required
            type="text"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. HOST-123"
          />
        </div>

        {/* External Name */}
        <div>
          <label className="block text-sm font-medium mb-1">External Name</label>
          <input
            type="text"
            value={externalName}
            onChange={(e) => setExternalName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Public-facing name (optional)"
          />
        </div>

        {/* Internal Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Internal Name</label>
          <input
            type="text"
            value={internalName}
            onChange={(e) => setInternalName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Internal reference (optional)"
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
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. 123 Main St, Calgary, AB"
          />
        </div>

        {/* Postal Code & Province */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Postal Code *</label>
            <input
              required
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="T2P 1A1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Province *</label>
            <input
              required
              type="text"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Alberta"
            />
          </div>
        </div>

        {/* Commission Rate */}
        <div>
          <label className="block text-sm font-medium mb-1">Commission Rate (%) *</label>
          <input
            required
            type="number"
            step="0.01"
            value={commissionRate}
            onChange={(e) => setCommissionRate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. 15"
          />
        </div>

        {/* Property Owner */}
        <div>
          <label className="block text-sm font-medium mb-1">Property Owner *</label>
          {loadingClients ? (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Loading clients...
            </div>
          ) : clients.length === 0 ? (
            <div className="w-full px-3 py-2 border border-amber-200 rounded-lg bg-amber-50 text-amber-700 text-sm">
              No active clients available. Please create a client first.
            </div>
          ) : (
            <select
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} {client.email ? `(${client.email})` : ''}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-gray-500 mt-1">
            This client will be the primary owner. Add co-owners after creation.
          </p>
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
            disabled={loadingClients || clients.length === 0 || isSubmitting}
            className="px-4 py-2 cursor-pointer bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Property'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CreatePropertyModal
