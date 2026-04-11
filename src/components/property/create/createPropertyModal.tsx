'use client'

import { useTranslation } from 'react-i18next'
import React, { useState, useEffect, useMemo } from 'react'
import { PlusIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import DualModalContainer from '../../shared/DualModalContainer'
import SearchableSelect, { SearchableSelectOption } from '@/components/shared/SearchableSelect'
import QuickCreateClientModal from '@/components/client/quick-create/QuickCreateClientModal'
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
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [clientId, setClientId] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false)
  // Property specifications
  const [numBeds, setNumBeds] = useState('')
  const [numBedrooms, setNumBedrooms] = useState('')
  const [numBathrooms, setNumBathrooms] = useState('')
  // WiFi & Access
  const [wifiSsid, setWifiSsid] = useState('')
  const [wifiPassword, setWifiPassword] = useState('')
  const [accessCodes, setAccessCodes] = useState('')
  const [showWifiPassword, setShowWifiPassword] = useState(false)
  // Default times
  const [defaultCheckoutTime, setDefaultCheckoutTime] = useState('')
  const [defaultCheckinTime, setDefaultCheckinTime] = useState('')

  // Helper to check if province is Quebec
  const isQuebecProperty = () => {
    const normalizedProvince = province.toLowerCase().trim()
    return normalizedProvince === 'quebec' || normalizedProvince === 'qc' || normalizedProvince === 'québec'
  }

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Convert clients to SearchableSelect options
  const clientOptions: SearchableSelectOption<string>[] = useMemo(() => {
    return clients.map(client => ({
      value: client.id,
      label: client.name,
      secondaryLabel: client.email || undefined,
    }))
  }, [clients])

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
      setRegistrationNumber('')
      setClientId('')
      setIsQuickCreateOpen(false)
      // Reset new fields
      setNumBeds('')
      setNumBedrooms('')
      setNumBathrooms('')
      setWifiSsid('')
      setWifiPassword('')
      setAccessCodes('')
      setShowWifiPassword(false)
      setDefaultCheckoutTime('')
      setDefaultCheckinTime('')
    }
  }, [isOpen])

  // Handle quick create success - add new client and auto-select
  const handleQuickCreateSuccess = (newClient: Client) => {
    setClients(prev => [...prev, newClient])
    setClientId(newClient.id)
    setIsQuickCreateOpen(false)
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
    const trimmedRegistrationNumber = registrationNumber.trim()
    const parsedCommissionRate = parseFloat(commissionRate)

    // Validation - only address is strictly required, others make property "incomplete"
    if (!trimmedAddress) {
      showNotification('Address is required', 'error')
      return
    }

    // Validate commission rate only if provided
    if (commissionRate && !isNaN(parsedCommissionRate)) {
      if (parsedCommissionRate <= 0 || parsedCommissionRate > 100) {
        showNotification('Commission rate must be between 0 and 100', 'error')
        return
      }
    }

    setIsSubmitting(true)

    try {
      // Parse numeric fields
      const parsedNumBeds = numBeds ? parseInt(numBeds, 10) : undefined
      const parsedNumBedrooms = numBedrooms ? parseInt(numBedrooms, 10) : undefined
      const parsedNumBathrooms = numBathrooms ? parseInt(numBathrooms, 10) : undefined

      const payload: CreatePropertyPayload = {
        address: trimmedAddress,
        propertyType,
        ...(commissionRate && !isNaN(parsedCommissionRate) && { commissionRate: parsedCommissionRate }),
        ...(clientId && { clientId }),
        ...(trimmedListingName && { listingName: trimmedListingName }),
        ...(trimmedListingId && { listingId: trimmedListingId }),
        ...(trimmedPostalCode && { postalCode: trimmedPostalCode }),
        ...(trimmedProvince && { province: trimmedProvince }),
        ...(trimmedExternalName && { externalName: trimmedExternalName }),
        ...(trimmedInternalName && { internalName: trimmedInternalName }),
        ...(trimmedRegistrationNumber && { registrationNumber: trimmedRegistrationNumber }),
        // Property specifications
        ...(parsedNumBeds !== undefined && !isNaN(parsedNumBeds) && { numBeds: parsedNumBeds }),
        ...(parsedNumBedrooms !== undefined && !isNaN(parsedNumBedrooms) && { numBedrooms: parsedNumBedrooms }),
        ...(parsedNumBathrooms !== undefined && !isNaN(parsedNumBathrooms) && { numBathrooms: parsedNumBathrooms }),
        // WiFi & Access
        ...(wifiSsid.trim() && { wifiSsid: wifiSsid.trim() }),
        ...(wifiPassword.trim() && { wifiPassword: wifiPassword.trim() }),
        ...(accessCodes.trim() && { accessCodes: accessCodes.trim() }),
        // Default times
        ...(defaultCheckoutTime && { defaultCheckoutTime }),
        ...(defaultCheckinTime && { defaultCheckinTime }),
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

  const propertyFormContent = (
    <>
      <h2 className="text-xl mb-4 text-black">Create New Property</h2>
      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 text-black">
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
          <label className="block text-sm font-medium mb-1">Listing Name</label>
          <input
            type="text"
            value={listingName}
            onChange={(e) => setListingName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. Lake Estate (optional)"
          />
        </div>

        {/* Listing ID */}
        <div>
          <label className="block text-sm font-medium mb-1">Listing ID</label>
          <input
            type="text"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            autoComplete="off"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. HOST-123 (optional)"
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
            <label className="block text-sm font-medium mb-1">Postal Code</label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="T2P 1A1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Province</label>
            <input
              type="text"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Alberta"
            />
          </div>
        </div>

        {/* Quebec Registration Number - Only shown for Quebec properties */}
        {isQuebecProperty() && (
          <div>
            <label className="block text-sm font-medium mb-1">
              CITQ Registration Number
              <span className="text-gray-500 font-normal ml-1">(Quebec requirement)</span>
            </label>
            <input
              type="text"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 123456"
            />
            <p className="text-xs text-gray-500 mt-1">
              Required for Quebec short-term rentals. Issued by Corporation de l&apos;industrie touristique du Québec.
            </p>
          </div>
        )}

        {/* Commission Rate */}
        <div>
          <label className="block text-sm font-medium mb-1">Commission Rate (%)</label>
          <input
            type="number"
            step="0.01"
            value={commissionRate}
            onChange={(e) => setCommissionRate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. 15 (optional)"
          />
        </div>

        {/* Property Specifications Section */}
        <div className="pt-4 border-t border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Property Specifications</label>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Beds</label>
              <input
                type="number"
                min="0"
                step="1"
                value={numBeds}
                onChange={(e) => setNumBeds(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. 3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bedrooms</label>
              <input
                type="number"
                min="0"
                step="1"
                value={numBedrooms}
                onChange={(e) => setNumBedrooms(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. 2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bathrooms</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={numBathrooms}
                onChange={(e) => setNumBathrooms(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                <label className="block text-sm font-medium mb-1">WiFi Network Name</label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. MyWiFi"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">WiFi Password</label>
                <div className="relative">
                  <input
                    type={showWifiPassword ? 'text' : 'password'}
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="WiFi password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWifiPassword(!showWifiPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
              <label className="block text-sm font-medium mb-1">Access Codes</label>
              <textarea
                value={accessCodes}
                onChange={(e) => setAccessCodes(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. Door code: 1234&#10;Gate code: 5678&#10;Lockbox: ABC123"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter door codes, gate codes, lockbox combinations, etc. One per line.
              </p>
            </div>
          </div>
        </div>

        {/* Default Times */}
        <div className="pt-4 border-t border-gray-200">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Default Times</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Check-out Time</label>
              <input
                type="time"
                value={defaultCheckoutTime}
                onChange={(e) => setDefaultCheckoutTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">When guests check out (default: 11:00 AM)</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Check-in Time</label>
              <input
                type="time"
                value={defaultCheckinTime}
                onChange={(e) => setDefaultCheckinTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">When guests check in (default: 3:00 PM)</p>
            </div>
          </div>
        </div>

        {/* Property Owner */}
        <div>
          <label className="block text-sm font-medium mb-1">Property Owner</label>
          <div className="flex gap-2">
            <div className="flex-1">
              {clients.length === 0 && !loadingClients ? (
                <div className="w-full px-3 py-2 border border-amber-200 rounded-lg bg-amber-50 text-amber-700 text-sm">
                  No active clients available. Create one or assign later.
                </div>
              ) : (
                <SearchableSelect
                  options={clientOptions}
                  value={clientId || null}
                  onChange={(value) => setClientId(value || '')}
                  placeholder="Select a client (optional)"
                  loading={loadingClients}
                  loadingText="Loading clients..."
                  emptyText="No clients found"
                  clearable={true}
                  headerAction={{
                    label: 'Create New Client',
                    icon: <PlusIcon className="w-4 h-4" />,
                    onClick: () => setIsQuickCreateOpen(true),
                  }}
                />
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsQuickCreateOpen(true)}
              className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg border border-amber-200 transition-colors flex-shrink-0"
              title="Create new client"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            This client will be the primary owner. You can assign or change owners later.
          </p>
        </div>

        {/* Incomplete Property Notice */}
        {(!listingName.trim() || !listingId.trim() || !clientId) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-700">
              <span className="font-medium">Note:</span> Properties without a listing name, listing ID, or client will be marked as <span className="font-medium">incomplete</span> and can be completed later.
            </p>
          </div>
        )}

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
            disabled={loadingClients || isSubmitting || isQuickCreateOpen}
            className="px-4 py-2 cursor-pointer bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating...' : 'Create Property'}
          </button>
        </div>
      </form>
    </>
  )

  const quickCreateContent = (
    <QuickCreateClientModal
      onCancel={() => setIsQuickCreateOpen(false)}
      onCreate={handleQuickCreateSuccess}
    />
  )

  return (
    <DualModalContainer
      isOpen={isOpen}
      onClose={onClose}
      primaryModal={propertyFormContent}
      secondaryModal={quickCreateContent}
      isSecondaryOpen={isQuickCreateOpen}
      onSecondaryClose={() => setIsQuickCreateOpen(false)}
      primaryStyle="p-6 max-w-lg w-[28rem] max-h-[90vh]"
      secondaryStyle="p-5 w-80 max-h-[85vh]"
    />
  )
}

export default CreatePropertyModal
