'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { updateProperty } from '@/services/propertyService'
import { Property, UpdatePropertyPayload } from '@/services/types/property'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  HomeIcon,
  BuildingOfficeIcon,
  EyeIcon,
  EyeSlashIcon,
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
  const [listingName, setListingName] = useState(property.listingName || '')
  const [listingId, setListingId] = useState(property.listingId || '')
  const [externalName, setExternalName] = useState(property.externalName || '')
  const [internalName, setInternalName] = useState(property.internalName || '')
  const [address, setAddress] = useState(property.address)
  const [postalCode, setPostalCode] = useState(property.postalCode || '')
  const [province, setProvince] = useState(property.province || '')
  const [propertyType, setPropertyType] = useState<'STR' | 'LTR'>(property.propertyType)
  const [commissionRate, setCommissionRate] = useState(property.commissionRate?.toString() ?? '')
  const [registrationNumber, setRegistrationNumber] = useState(property.registrationNumber || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Property specifications
  const [numBeds, setNumBeds] = useState(property.numBeds?.toString() ?? '')
  const [numBedrooms, setNumBedrooms] = useState(property.numBedrooms?.toString() ?? '')
  const [numBathrooms, setNumBathrooms] = useState(property.numBathrooms?.toString() ?? '')
  // WiFi & Access
  const [wifiSsid, setWifiSsid] = useState(property.wifiSsid || '')
  const [wifiPassword, setWifiPassword] = useState(property.wifiPassword || '')
  const [accessCodes, setAccessCodes] = useState(property.accessCodes || '')
  const [showWifiPassword, setShowWifiPassword] = useState(false)
  // Default times
  const [defaultCheckoutTime, setDefaultCheckoutTime] = useState(property.defaultCheckoutTime || '')
  const [defaultCheckinTime, setDefaultCheckinTime] = useState(property.defaultCheckinTime || '')
  // Cleaning management
  const [cleaningManaged, setCleaningManaged] = useState(property.cleaningManaged ?? true)
  // Default cleaning duration (split into hours + minutes for UX)
  const [cleaningDurationHours, setCleaningDurationHours] = useState(
    property.defaultCleaningDurationMinutes ? Math.floor(property.defaultCleaningDurationMinutes / 60).toString() : ''
  )
  const [cleaningDurationMins, setCleaningDurationMins] = useState(
    property.defaultCleaningDurationMinutes ? (property.defaultCleaningDurationMinutes % 60).toString() : ''
  )

  // Helper to check if province is Quebec
  const isQuebecProperty = () => {
    const normalizedProvince = province.toLowerCase().trim()
    return normalizedProvince === 'quebec' || normalizedProvince === 'qc' || normalizedProvince === 'québec'
  }

  const showNotification = useNotificationStore((state) => state.showNotification)

  // Initialize form with property data
  useEffect(() => {
    if (isOpen) {
      setListingName(property.listingName || '')
      setListingId(property.listingId || '')
      setExternalName(property.externalName || '')
      setInternalName(property.internalName || '')
      setAddress(property.address)
      setPostalCode(property.postalCode || '')
      setProvince(property.province || '')
      setPropertyType(property.propertyType)
      setCommissionRate(property.commissionRate?.toString() ?? '')
      setRegistrationNumber(property.registrationNumber || '')
      // Reset new fields
      setNumBeds(property.numBeds?.toString() ?? '')
      setNumBedrooms(property.numBedrooms?.toString() ?? '')
      setNumBathrooms(property.numBathrooms?.toString() ?? '')
      setWifiSsid(property.wifiSsid || '')
      setWifiPassword(property.wifiPassword || '')
      setAccessCodes(property.accessCodes || '')
      setShowWifiPassword(false)
      setDefaultCheckoutTime(property.defaultCheckoutTime || '')
      setDefaultCheckinTime(property.defaultCheckinTime || '')
      setCleaningManaged(property.cleaningManaged ?? true)
      setCleaningDurationHours(property.defaultCleaningDurationMinutes ? Math.floor(property.defaultCleaningDurationMinutes / 60).toString() : '')
      setCleaningDurationMins(property.defaultCleaningDurationMinutes ? (property.defaultCleaningDurationMinutes % 60).toString() : '')
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
    const trimmedRegistrationNumber = registrationNumber.trim()
    const parsedCommissionRate = commissionRate ? parseFloat(commissionRate) : undefined

    // Validation - only address is strictly required
    if (!trimmedAddress) {
      showNotification('Address is required', 'error')
      return
    }

    // Validate commission rate only if provided
    if (commissionRate && parsedCommissionRate !== undefined && !isNaN(parsedCommissionRate)) {
      if (parsedCommissionRate <= 0 || parsedCommissionRate > 100) {
        showNotification('Commission rate must be between 0 and 100', 'error')
        return
      }
    }

    setIsSubmitting(true)

    try {
      // Parse numeric fields
      const parsedNumBeds = numBeds ? parseInt(numBeds, 10) : null
      const parsedNumBedrooms = numBedrooms ? parseInt(numBedrooms, 10) : null
      const parsedNumBathrooms = numBathrooms ? parseFloat(numBathrooms) : null

      const payload: UpdatePropertyPayload = {
        address: trimmedAddress,
        propertyType,
        // Send null to clear fields, value to update
        commissionRate: commissionRate && parsedCommissionRate !== undefined && !isNaN(parsedCommissionRate) ? parsedCommissionRate : null,
        listingName: trimmedListingName || null,
        listingId: trimmedListingId || null,
        postalCode: trimmedPostalCode || null,
        province: trimmedProvince || null,
        externalName: trimmedExternalName || null,
        internalName: trimmedInternalName || null,
        registrationNumber: trimmedRegistrationNumber || null,
        // Property specifications
        numBeds: parsedNumBeds !== null && !isNaN(parsedNumBeds) ? parsedNumBeds : null,
        numBedrooms: parsedNumBedrooms !== null && !isNaN(parsedNumBedrooms) ? parsedNumBedrooms : null,
        numBathrooms: parsedNumBathrooms !== null && !isNaN(parsedNumBathrooms) ? parsedNumBathrooms : null,
        // WiFi & Access
        wifiSsid: wifiSsid.trim() || null,
        wifiPassword: wifiPassword.trim() || null,
        accessCodes: accessCodes.trim() || null,
        // Default times
        defaultCheckoutTime: defaultCheckoutTime || null,
        defaultCheckinTime: defaultCheckinTime || null,
        // Cleaning management
        cleaningManaged,
        // Default cleaning duration (combine hours + minutes)
        defaultCleaningDurationMinutes: (cleaningDurationHours || cleaningDurationMins)
          ? (parseInt(cleaningDurationHours || '0', 10) * 60) + parseInt(cleaningDurationMins || '0', 10)
          : null,
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Listing Name</label>
              <input
                type="text"
                value={listingName}
                onChange={(e) => setListingName(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="e.g., Lake Estate (optional)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Listing ID</label>
              <input
                type="text"
                value={listingId}
                onChange={(e) => setListingId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="e.g., HOST-123 (optional)"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="T2P 1A1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
              <input
                type="text"
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="Alberta"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commission</label>
              <div className="relative">
                <input
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

          {/* Quebec Registration Number - Only shown for Quebec properties */}
          {isQuebecProperty() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CITQ Registration Number
                <span className="text-gray-500 font-normal ml-1">(Quebec requirement)</span>
              </label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="e.g., 123456"
              />
              <p className="text-xs text-gray-500 mt-1">
                Required for Quebec short-term rentals. Issued by Corporation de l&apos;industrie touristique du Québec.
              </p>
            </div>
          )}

          {/* Property Specifications Section */}
          <div className="pt-4 border-t border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Property Specifications</label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beds</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={numBeds}
                  onChange={(e) => setNumBeds(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  placeholder="e.g. 3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={numBedrooms}
                  onChange={(e) => setNumBedrooms(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  placeholder="e.g. 2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={numBathrooms}
                  onChange={(e) => setNumBathrooms(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  placeholder="e.g. 1.5"
                />
              </div>
            </div>
          </div>

          {/* WiFi & Access Section */}
          <div className="pt-4 border-t border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-3">WiFi & Access</label>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WiFi Network Name</label>
                  <input
                    type="text"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    placeholder="e.g. MyWiFi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WiFi Password</label>
                  <div className="relative">
                    <input
                      type={showWifiPassword ? 'text' : 'password'}
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      placeholder="WiFi password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWifiPassword(!showWifiPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showWifiPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Access Codes</label>
                <textarea
                  value={accessCodes}
                  onChange={(e) => setAccessCodes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none"
                  placeholder="e.g. Door code: 1234&#10;Gate code: 5678&#10;Lockbox: ABC123"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter door codes, gate codes, lockbox combinations, etc. One per line.
                </p>
              </div>
            </div>
          </div>

          {/* Default Times Section */}
          <div className="pt-4 border-t border-gray-200">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Default Times</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Time</label>
                <input
                  type="time"
                  value={defaultCheckoutTime}
                  onChange={(e) => setDefaultCheckoutTime(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
                <p className="text-xs text-gray-500 mt-1">When guests check out (default: 11:00 AM)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Time</label>
                <input
                  type="time"
                  value={defaultCheckinTime}
                  onChange={(e) => setDefaultCheckinTime(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
                <p className="text-xs text-gray-500 mt-1">When guests check in (default: 3:00 PM)</p>
              </div>
            </div>
            {/* Default Cleaning Duration */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Cleaning Duration</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    step="1"
                    value={cleaningDurationHours}
                    onChange={(e) => setCleaningDurationHours(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">hr</span>
                </div>
                <span className="text-gray-400 font-medium">:</span>
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    step="1"
                    value={cleaningDurationMins}
                    onChange={(e) => setCleaningDurationMins(e.target.value)}
                    className="w-full px-3 py-2.5 pr-12 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    placeholder="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">min</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                If set, invoices will use this as the standard cleaning time instead of actual clock-in/out times.
              </p>
            </div>
          </div>

          {/* Cleaning Management Section */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold text-gray-700">Cleaning Management</label>
                <p className="text-xs text-gray-500 mt-0.5">
                  {cleaningManaged
                    ? 'This property appears on the turnover calendar and receives auto-created cleaning projects.'
                    : 'This property is excluded from the turnover calendar and will not receive cleaning projects.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCleaningManaged(!cleaningManaged)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  cleaningManaged ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    cleaningManaged ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Incomplete Property Notice */}
          {(!listingName.trim() || !listingId.trim() || property.owners.length === 0) && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <p className="text-sm text-amber-700">
                <span className="font-medium">Incomplete property:</span> This property is missing{' '}
                {[
                  !listingName.trim() && 'listing name',
                  !listingId.trim() && 'listing ID',
                  property.owners.length === 0 && 'client assignment'
                ].filter(Boolean).join(', ')}.
              </p>
            </div>
          )}

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
