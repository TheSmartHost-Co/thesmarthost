'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { createProperty, getPropertyById } from '@/services/propertyService'
import { getClientsByParentId } from '@/services/clientService'
import { createPropertyChannel } from '@/services/propertyChannelService'
import { CreatePropertyPayload } from '@/services/types/property'
import { LocalPropertyChannel } from '@/services/types/propertyChannel'
import { Client } from '@/services/types/client'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import ChannelList from '../channels/channelList'

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

  // Channels management (local only, saved after property creation)
  const [channels, setChannels] = useState<LocalPropertyChannel[]>([])

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
      setChannels([]) // Reset channels array
    }
  }, [isOpen])

  // Channel handlers (local mode - no API calls yet)
  const handleAddChannel = (channelData: {
    channelName: string
    publicUrl: string
    isActive: boolean
  }) => {
    const newChannel: LocalPropertyChannel = {
      tempId: `temp-${Date.now()}`,
      ...channelData,
    }
    setChannels((prev) => [...prev, newChannel])
  }

  const handleEditChannel = (
    tempId: string,
    channelData: { channelName: string; publicUrl: string; isActive: boolean }
  ) => {
    setChannels((prev) =>
      prev.map((c) => (c.tempId === tempId ? { ...c, ...channelData } : c))
    )
  }

  const handleDeleteChannel = (tempId: string) => {
    setChannels((prev) => prev.filter((c) => c.tempId !== tempId))
  }

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
        const newPropertyId = res.data.id

        // Create channels if any were added
        if (channels.length > 0) {
          const channelResults = []
          for (const channel of channels) {
            const channelRes = await createPropertyChannel({
              propertyId: newPropertyId,
              channelName: channel.channelName,
              publicUrl: channel.publicUrl,
              isActive: channel.isActive,
            })
            channelResults.push({
              channel,
              success: channelRes.status === 'success',
              error: channelRes.message,
            })
          }

          // Check if any channels failed
          const failedChannels = channelResults.filter((r) => !r.success)

          if (failedChannels.length === 0) {
            showNotification('Property and all channels created successfully', 'success')
          } else if (failedChannels.length === channels.length) {
            showNotification('Property created, but all channels failed to create', 'error')
          } else {
            showNotification(
              `Property created, but ${failedChannels.length} of ${channels.length} channel(s) failed`,
              'error'
            )
          }

          // Refetch the property with channels to get complete data
          try {
            const updatedPropertyRes = await getPropertyById(newPropertyId)
            if (updatedPropertyRes.status === 'success') {
              onAdd(updatedPropertyRes.data)
            } else {
              // Fallback to original data if refetch fails
              onAdd(res.data)
            }
          } catch (err) {
            console.error('Error refetching property:', err)
            // Fallback to original data if refetch fails
            onAdd(res.data)
          }
        } else {
          showNotification('Property created successfully', 'success')
          onAdd(res.data)
        }

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
        {/* Listing Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Listing Name *</label>
          <input
            required
            type="text"
            value={listingName}
            onChange={(e) => setListingName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Lake Estate"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., HOST-123"
          />
        </div>

        {/* External Name (Optional) */}
        <div>
          <label className="block text-sm font-medium mb-1">External Name</label>
          <input
            type="text"
            value={externalName}
            onChange={(e) => setExternalName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Public-facing name (optional)"
          />
        </div>

        {/* Internal Name (Optional) */}
        <div>
          <label className="block text-sm font-medium mb-1">Internal Name</label>
          <input
            type="text"
            value={internalName}
            onChange={(e) => setInternalName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., 123 Main St, Calgary, AB"
          />
        </div>

        {/* Postal Code and Province - Side by side */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Postal Code *</label>
            <input
              required
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., T2P 1A1"
            />
          </div>

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

        {/* Channels Section */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Channels (Optional)</h3>
          <ChannelList
            channels={channels}
            onAddChannel={handleAddChannel}
            onEditChannel={handleEditChannel}
            onDeleteChannel={handleDeleteChannel}
          />
        </div>

        {/* Client Owner Dropdown */}
        <div className="pt-4 border-t border-gray-200">
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