'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../shared/modal'
import { updateProperty } from '@/services/propertyService'
import { getClientsByParentId } from '@/services/clientService'
import type { Property, PropertyOwner, UpdatePropertyOwner } from '@/services/types/property'
import type { Client } from '@/services/types/client'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import {
  PlusIcon,
  TrashIcon,
  StarIcon,
  UserGroupIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface PropertyOwnersModalProps {
  isOpen: boolean
  onClose: () => void
  property: Property
  onRefreshProperties?: () => Promise<void>
}

const PropertyOwnersModal: React.FC<PropertyOwnersModalProps> = ({
  isOpen,
  onClose,
  property,
  onRefreshProperties,
}) => {
  const [owners, setOwners] = useState<PropertyOwner[]>([])
  const [availableClients, setAvailableClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [newOwnerCommissionOverride, setNewOwnerCommissionOverride] = useState<string>('')
  const [hasChanges, setHasChanges] = useState(false)

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  useEffect(() => {
    if (isOpen && property) {
      setOwners([...property.owners])
      fetchClients()
      setIsAdding(false)
      setHasChanges(false)
    }
  }, [isOpen, property])

  const fetchClients = async () => {
    if (!profile?.id) return

    setLoading(true)
    try {
      const response = await getClientsByParentId(profile.id)
      if (response.status === 'success') {
        // Filter to only active clients
        setAvailableClients(response.data.filter(c => c.isActive))
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get clients not already owners
  const clientsNotOwners = availableClients.filter(
    client => !owners.some(owner => owner.clientId === client.id)
  )

  const handleAddOwner = () => {
    if (!selectedClientId) {
      showNotification('Please select a client', 'error')
      return
    }

    const client = availableClients.find(c => c.id === selectedClientId)
    if (!client) return

    const commissionOverride = newOwnerCommissionOverride.trim()
      ? parseFloat(newOwnerCommissionOverride)
      : null

    const newOwner: PropertyOwner = {
      clientId: client.id,
      clientName: client.name,
      isPrimary: owners.length === 0, // First owner becomes primary
      commissionRateOverride: commissionOverride
    }

    setOwners([...owners, newOwner])
    setSelectedClientId('')
    setNewOwnerCommissionOverride('')
    setIsAdding(false)
    setHasChanges(true)
  }

  const handleRemoveOwner = (clientId: string) => {
    const owner = owners.find(o => o.clientId === clientId)
    if (owner?.isPrimary && owners.length > 1) {
      showNotification('Please set another owner as primary before removing this one', 'error')
      return
    }

    if (owners.length === 1) {
      showNotification('A property must have at least one owner', 'error')
      return
    }

    setOwners(owners.filter(o => o.clientId !== clientId))
    setHasChanges(true)
  }

  const handleSetPrimary = (clientId: string) => {
    setOwners(owners.map(owner => ({
      ...owner,
      isPrimary: owner.clientId === clientId
    })))
    setHasChanges(true)
  }

  const handleCommissionChange = (clientId: string, value: string) => {
    const numValue = value.trim() ? parseFloat(value) : null
    setOwners(owners.map(owner =>
      owner.clientId === clientId
        ? { ...owner, commissionRateOverride: numValue }
        : owner
    ))
    setHasChanges(true)
  }

  const handleSave = async () => {
    // Validate exactly one primary owner
    const primaryCount = owners.filter(o => o.isPrimary).length
    if (primaryCount !== 1) {
      showNotification('There must be exactly one primary owner', 'error')
      return
    }

    setSaving(true)
    try {
      const updateOwners: UpdatePropertyOwner[] = owners.map(owner => ({
        clientId: owner.clientId,
        isPrimary: owner.isPrimary,
        commissionRateOverride: owner.commissionRateOverride
      }))

      const response = await updateProperty(property.id, { owners: updateOwners })

      if (response.status === 'success') {
        showNotification('Owners updated successfully', 'success')
        // Refresh all properties in parent
        await onRefreshProperties?.()
        setHasChanges(false)
        onClose()
      } else {
        showNotification(response.message || 'Failed to update owners', 'error')
      }
    } catch (error) {
      console.error('Error updating owners:', error)
      showNotification('Error updating owners', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (hasChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return
      }
    }
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} style="p-6 max-w-2xl w-11/12">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">{property.listingName}</h2>
        <p className="text-sm text-gray-500">Manage property owners and commission rates</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-700">
                Property Owners ({owners.length})
              </h3>
              <p className="text-xs text-gray-500">
                Default commission: {property.commissionRate || 0}%
              </p>
            </div>
            {!isAdding && clientsNotOwners.length > 0 && (
              <button
                onClick={() => setIsAdding(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add Owner
              </button>
            )}
          </div>

          {/* Owners List */}
          <div className="space-y-3">
            {owners.map((owner) => (
              <div
                key={owner.clientId}
                className={`flex items-center justify-between p-4 border rounded-xl transition-colors ${
                  owner.isPrimary
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    owner.isPrimary ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <UserGroupIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{owner.clientName}</p>
                      {owner.isPrimary && (
                        <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <label className="text-xs text-gray-500">Commission override:</label>
                      <input
                        type="number"
                        step="0.01"
                        value={owner.commissionRateOverride ?? ''}
                        onChange={(e) => handleCommissionChange(owner.clientId, e.target.value)}
                        placeholder={`${property.commissionRate || 0}%`}
                        className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-400">%</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-3">
                  {!owner.isPrimary && (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(owner.clientId)}
                      className="p-2 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Set as primary owner"
                    >
                      <StarIcon className="w-4 h-4" />
                    </button>
                  )}
                  {owner.isPrimary && (
                    <div className="p-2 text-amber-500">
                      <StarIconSolid className="w-4 h-4" />
                    </div>
                  )}
                  {owners.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOwner(owner.clientId)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove owner"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Owner Form */}
          {isAdding && (
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Add New Owner</h4>
                <button
                  onClick={() => setIsAdding(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Client
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose a client...</option>
                    {clientsNotOwners.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.email ? `(${client.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Commission Override (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={newOwnerCommissionOverride}
                      onChange={(e) => setNewOwnerCommissionOverride(e.target.value)}
                      placeholder={`Default: ${property.commissionRate || 0}`}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to use property's default commission rate
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddOwner}
                    disabled={!selectedClientId}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    Add Owner
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* No Clients Available */}
          {clientsNotOwners.length === 0 && !isAdding && (
            <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-lg">
              All available clients are already owners of this property.
            </div>
          )}
        </div>
      )}

      {/* Modal Footer */}
      <div className="flex justify-between pt-6 border-t border-gray-200 mt-6">
        <button
          onClick={handleClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </Modal>
  )
}

export default PropertyOwnersModal
