'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { updateProperty } from '@/services/propertyService'
import { getClientsByParentId } from '@/services/clientService'
import {
  createPropertyChannel,
  updatePropertyChannel,
  deletePropertyChannel,
  toggleChannelStatus,
} from '@/services/propertyChannelService'
import { Property, UpdatePropertyPayload, UpdatePropertyOwner } from '@/services/types/property'
import { PropertyChannel } from '@/services/types/propertyChannel'
import { Client } from '@/services/types/client'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import ChannelList from '../channels/channelList'

interface UpdatePropertyModalProps {
  isOpen: boolean
  onClose: () => void
  property: Property
  onUpdate: (updatedProperty: Property) => void
}

const UpdatePropertyModal: React.FC<UpdatePropertyModalProps> = ({
  isOpen,
  onClose,
  property,
  onUpdate,
}) => {
  // Property fields
  const [listingName, setListingName] = useState(property.listingName)
  const [listingId, setListingId] = useState(property.listingId)
  const [externalName, setExternalName] = useState(property.externalName || '')
  const [internalName, setInternalName] = useState(property.internalName || '')
  const [address, setAddress] = useState(property.address)
  const [postalCode, setPostalCode] = useState(property.postalCode)
  const [province, setProvince] = useState(property.province)
  const [propertyType, setPropertyType] = useState<'STR' | 'LTR'>(property.propertyType)
  const [commissionRate, setCommissionRate] = useState(property.commissionRate?.toString() ?? '')

  // Owners management
  const [owners, setOwners] = useState<UpdatePropertyOwner[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)

  // Channels management (immediate save)
  const [channels, setChannels] = useState<PropertyChannel[]>([])

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Initialize form with property data
  useEffect(() => {
    if (isOpen) {
      setListingName(property.listingName)
      setListingId(property.listingId)
      setExternalName(property.externalName || '')
      setInternalName(property.internalName || '')
      setAddress(property.address)
      setPostalCode(property.postalCode)
      setProvince(property.province)
      setPropertyType(property.propertyType)
      setCommissionRate(property.commissionRate?.toString() ?? '')

      // Initialize owners
      setOwners(
        property.owners.map((owner) => ({
          clientId: owner.clientId,
          isPrimary: owner.isPrimary,
          commissionRateOverride: owner.commissionRateOverride,
        }))
      )

      // Initialize channels
      setChannels(property.channels || [])
    }
  }, [isOpen, property])

  // Fetch clients for owner selection
  useEffect(() => {
    const fetchClients = async () => {
      if (isOpen && profile?.id) {
        try {
          setLoadingClients(true)
          const response = await getClientsByParentId(profile.id)
          setClients(response.data.filter((c) => c.isActive))
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

  const handleAddOwner = () => {
    setOwners((prev) => [
      ...prev,
      {
        clientId: '',
        isPrimary: prev.length === 0, // First owner is primary by default
        commissionRateOverride: null,
      },
    ])
  }

  const handleRemoveOwner = (index: number) => {
    setOwners((prev) => {
      const newOwners = prev.filter((_, i) => i !== index)

      // If we removed the primary owner, make the first one primary
      if (prev[index].isPrimary && newOwners.length > 0) {
        newOwners[0].isPrimary = true
      }

      return newOwners
    })
  }

  const handleOwnerChange = (
    index: number,
    field: keyof UpdatePropertyOwner,
    value: string | boolean | number | null
  ) => {
    setOwners((prev) => {
      const newOwners = [...prev]

      // If setting isPrimary to true, unset all others
      if (field === 'isPrimary' && value === true) {
        newOwners.forEach((owner, i) => {
          owner.isPrimary = i === index
        })
      } else {
        // @ts-ignore - we know the types match
        newOwners[index][field] = value
      }

      return newOwners
    })
  }

  // Channel management handlers (IMMEDIATE SAVE - no batch)
  const handleAddChannel = async (channelData: {
    channelName: string
    publicUrl: string
    isActive: boolean
  }) => {
    try {
      const res = await createPropertyChannel({
        propertyId: property.id,
        ...channelData,
      })

      if (res.status === 'success') {
        // Add to local state and update parent
        setChannels((prev) => {
          const updatedChannels = [...prev, res.data]
          // Update parent component with fresh state
          onUpdate({ ...property, channels: updatedChannels })
          return updatedChannels
        })
        showNotification('Channel added successfully', 'success')
      } else {
        showNotification(res.message || 'Failed to add channel', 'error')
      }
    } catch (err) {
      console.error('Error adding channel:', err)
      showNotification('Error adding channel', 'error')
    }
  }

  const handleEditChannel = async (
    channelId: string,
    channelData: { channelName: string; publicUrl: string; isActive: boolean }
  ) => {
    try {
      // Find the current channel to check if isActive changed
      const currentChannel = channels.find((c) => c.id === channelId)

      // Update channel name and URL (PUT request)
      const res = await updatePropertyChannel(channelId, {
        channelName: channelData.channelName,
        publicUrl: channelData.publicUrl,
      })

      if (res.status !== 'success') {
        showNotification(res.message || 'Failed to update channel', 'error')
        return
      }

      // If isActive status changed, update it separately (PATCH request)
      let finalChannel = res.data
      if (currentChannel && currentChannel.isActive !== channelData.isActive) {
        const statusRes = await toggleChannelStatus(channelId, channelData.isActive)
        if (statusRes.status === 'success') {
          // Merge status response with existing channel data
          // (PATCH only returns {id, isActive, updatedAt}, not full channel)
          finalChannel = {
            ...finalChannel,
            isActive: statusRes.data.isActive,
            updatedAt: statusRes.data.updatedAt,
          }
        } else {
          showNotification('Failed to update channel status', 'error')
        }
      }

      // Update local state and parent component
      setChannels((prev) => {
        const updatedChannels = prev.map((c) => (c.id === channelId ? finalChannel : c))
        // Update parent component with fresh state
        onUpdate({
          ...property,
          channels: updatedChannels,
        })
        return updatedChannels
      })
      showNotification('Channel updated successfully', 'success')
    } catch (err) {
      console.error('Error updating channel:', err)
      showNotification('Error updating channel', 'error')
    }
  }

  const handleDeleteChannel = async (channelId: string) => {
    try {
      const res = await deletePropertyChannel(channelId)

      if (res.status === 'success') {
        // Remove from local state and get updated channels
        setChannels((prev) => {
          const updatedChannels = prev.filter((c) => c.id !== channelId)
          // Update parent component with fresh state
          onUpdate({
            ...property,
            channels: updatedChannels,
          })
          return updatedChannels
        })
        showNotification('Channel deleted successfully', 'success')
      } else {
        showNotification(res.message || 'Failed to delete channel', 'error')
      }
    } catch (err) {
      console.error('Error deleting channel:', err)
      showNotification('Error deleting channel', 'error')
    }
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
    const parsedCommissionRate = commissionRate ? parseFloat(commissionRate) : undefined

    // Validation
    if (!trimmedListingName || !trimmedListingId || !trimmedAddress || !trimmedPostalCode || !trimmedProvince) {
      showNotification('All required property fields must be filled', 'error')
      return
    }

    if (!commissionRate || parsedCommissionRate === undefined || isNaN(parsedCommissionRate)) {
      showNotification('Commission rate is required', 'error')
      return
    }

    if (parsedCommissionRate <= 0 || parsedCommissionRate > 100) {
      showNotification('Commission rate must be between 0 and 100', 'error')
      return
    }

    // Validate owners
    if (owners.length === 0) {
      showNotification('Property must have at least one owner', 'error')
      return
    }

    const hasEmptyOwner = owners.some((owner) => !owner.clientId)
    if (hasEmptyOwner) {
      showNotification('Please select a client for all owners', 'error')
      return
    }

    const primaryOwners = owners.filter((owner) => owner.isPrimary)
    if (primaryOwners.length !== 1) {
      showNotification('Exactly one owner must be marked as primary', 'error')
      return
    }

    try {
      // 1. Update property fields
      const payload: UpdatePropertyPayload = {
        listingName: trimmedListingName,
        listingId: trimmedListingId,
        address: trimmedAddress,
        postalCode: trimmedPostalCode,
        province: trimmedProvince,
        propertyType,
        commissionRate: parsedCommissionRate,
        owners: owners.map((owner) => ({
          clientId: owner.clientId,
          isPrimary: owner.isPrimary,
          commissionRateOverride: owner.commissionRateOverride,
        })),
        ...(trimmedExternalName && { externalName: trimmedExternalName }),
        ...(trimmedInternalName && { internalName: trimmedInternalName }),
      }

      const res = await updateProperty(property.id, payload)

      if (res.status !== 'success') {
        showNotification(res.message || 'Failed to update property', 'error')
        return
      }

      // Update parent component with updated property + current channels
      onUpdate({ ...res.data, channels: channels })
      showNotification('Property updated successfully', 'success')
      onClose()
    } catch (err) {
      console.error('Error updating property:', err)
      const message = err instanceof Error ? err.message : 'Error updating property'
      showNotification(message, 'error')
    }
  }

  // Get client name by ID
  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    return client ? `${client.name} (${client.email || 'No email'})` : 'Unknown Client'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-3xl w-11/12 max-h-[90vh] overflow-y-auto">
      <h2 className="text-xl mb-4 text-black">Edit Property</h2>
      <form onSubmit={handleSubmit} className="space-y-6 text-black">
        {/* Property Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Property Details</h3>

          {/* Listing Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Listing Name *</label>
            <input
              required
              type="text"
              value={listingName}
              onChange={(e) => setListingName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            />
          </div>

          {/* Postal Code and Province */}
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
              />
            </div>
          </div>

          {/* Property Type and Commission Rate */}
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
              />
            </div>
          </div>
        </div>

        {/* Channels Management Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Channels</h3>
          <ChannelList
            propertyId={property.id}
            channels={channels}
            onAddChannel={handleAddChannel}
            onEditChannel={handleEditChannel}
            onDeleteChannel={handleDeleteChannel}
          />
        </div>

        {/* Owners Management Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-lg font-semibold text-gray-900">Manage Owners</h3>
            <button
              type="button"
              onClick={handleAddOwner}
              disabled={loadingClients}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <UserPlusIcon className="h-4 w-4" />
              Add Owner
            </button>
          </div>

          {owners.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No owners. Click "Add Owner" to add one.
            </div>
          ) : (
            <div className="space-y-3">
              {owners.map((owner, index) => (
                <div key={index} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start gap-3">
                    {/* Owner Number */}
                    <div className="shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                    </div>

                    <div className="flex-1 space-y-3">
                      {/* Client Selection */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Client *</label>
                        {loadingClients ? (
                          <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-500">
                            Loading clients...
                          </div>
                        ) : (
                          <select
                            required
                            value={owner.clientId}
                            onChange={(e) => handleOwnerChange(index, 'clientId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">Select a client</option>
                            {clients.map((client) => (
                              <option key={client.id} value={client.id}>
                                {client.name} ({client.email || 'No email'})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Primary Owner Radio Button */}
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id={`primary-${index}`}
                          name="primaryOwner"
                          checked={owner.isPrimary}
                          onChange={(e) => handleOwnerChange(index, 'isPrimary', e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor={`primary-${index}`} className="text-sm font-medium text-gray-900">
                          Primary Owner
                        </label>
                      </div>

                      {/* Commission Override Checkbox */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`override-${index}`}
                            checked={owner.commissionRateOverride !== null}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleOwnerChange(index, 'commissionRateOverride', parseFloat(commissionRate) || 0)
                              } else {
                                handleOwnerChange(index, 'commissionRateOverride', null)
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor={`override-${index}`} className="text-sm text-gray-700">
                            Override commission rate for this owner
                          </label>
                        </div>

                        {owner.commissionRateOverride !== null && (
                          <div>
                            <input
                              type="number"
                              step="0.01"
                              value={owner.commissionRateOverride}
                              onChange={(e) => handleOwnerChange(index, 'commissionRateOverride', parseFloat(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder={`Default: ${commissionRate}%`}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Property default: {commissionRate}%
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Remove Button */}
                    {owners.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOwner(index)}
                        className="shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove owner"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500">
            * At least one owner is required. Exactly one owner must be marked as primary.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loadingClients}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Update Property
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default UpdatePropertyModal