'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { updateProperty } from '@/services/propertyService'
import { Property, UpdatePropertyPayload } from '@/services/types/property'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  HomeIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline'

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
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    }
  }, [isOpen, property])

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
      showNotification('All required fields must be filled', 'error')
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

    setIsSubmitting(true)

    try {
      const payload: UpdatePropertyPayload = {
        listingName: trimmedListingName,
        listingId: trimmedListingId,
        address: trimmedAddress,
        postalCode: trimmedPostalCode,
        province: trimmedProvince,
        propertyType,
        commissionRate: parsedCommissionRate,
        ...(trimmedExternalName ? { externalName: trimmedExternalName } : { externalName: '' }),
        ...(trimmedInternalName ? { internalName: trimmedInternalName } : { internalName: '' }),
      }

      const res = await updateProperty(property.id, payload)

      if (res.status === 'success') {
        // Preserve channels and owners from original property
        onUpdate({
          ...res.data,
          channels: property.channels,
          owners: property.owners,
        })
        showNotification('Property updated successfully', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Failed to update property', 'error')
      }
    } catch (err) {
      console.error('Error updating property:', err)
      const message = err instanceof Error ? err.message : 'Error updating property'
      showNotification(message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-0 max-w-2xl w-11/12 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-gray-800 to-gray-900">
        <div className="flex items-center gap-4">
          <div className="shrink-0 h-11 w-11 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
            {property.propertyType === 'STR' ? (
              <HomeIcon className="h-5 w-5 text-white" />
            ) : (
              <BuildingOfficeIcon className="h-5 w-5 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Edit Property</h2>
            <p className="text-white/60 text-sm">Update basic property information</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="space-y-5">
          {/* Property Type Selection - Visual Cards */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Property Type *</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPropertyType('STR')}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                  propertyType === 'STR'
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${
                  propertyType === 'STR' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  <HomeIcon className="w-5 h-5" />
                </div>
                <p className={`font-medium text-sm ${propertyType === 'STR' ? 'text-blue-900' : 'text-gray-900'}`}>
                  Short-Term Rental
                </p>
                {propertyType === 'STR' && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPropertyType('LTR')}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                  propertyType === 'LTR'
                    ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${
                  propertyType === 'LTR' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  <BuildingOfficeIcon className="w-5 h-5" />
                </div>
                <p className={`font-medium text-sm ${propertyType === 'LTR' ? 'text-purple-900' : 'text-gray-900'}`}>
                  Long-Term Rental
                </p>
                {propertyType === 'LTR' && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Listing Name & ID */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Listing Name *</label>
              <input
                required
                type="text"
                value={listingName}
                onChange={(e) => setListingName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="e.g., Lake Estate"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Listing ID *</label>
              <input
                required
                type="text"
                value={listingId}
                onChange={(e) => setListingId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="e.g., HOST-123"
              />
            </div>
          </div>

          {/* External & Internal Names */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">External Name</label>
              <input
                type="text"
                value={externalName}
                onChange={(e) => setExternalName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="Public-facing name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Internal Name</label>
              <input
                type="text"
                value={internalName}
                onChange={(e) => setInternalName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="Internal reference"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
            <input
              required
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              placeholder="e.g., 123 Main St, Calgary, AB"
            />
          </div>

          {/* Postal Code, Province, Commission */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
              <input
                required
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="T2P 1A1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province *</label>
              <input
                required
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="Alberta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commission *</label>
              <div className="relative">
                <input
                  required
                  type="number"
                  step="0.01"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-full px-3 py-2.5 pr-8 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  placeholder="15"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              </div>
            </div>
          </div>

          {/* Info note */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-sm text-gray-600">
              To manage <span className="font-medium">channels</span>, <span className="font-medium">licenses</span>, or <span className="font-medium">owners</span>,
              use the dedicated sections in the property details view.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between gap-3 pt-6 mt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-white bg-gray-900 rounded-xl hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default UpdatePropertyModal
