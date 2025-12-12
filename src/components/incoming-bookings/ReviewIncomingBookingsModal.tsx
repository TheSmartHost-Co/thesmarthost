'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { updateIncomingBookingMapping, updateIncomingBookingStatus } from '@/services/incomingBookingService'
import { getProperties } from '@/services/propertyService'
import { getClientsByParentId } from '@/services/clientService'
import type { IncomingBooking, UpdateIncomingBookingMappingPayload } from '@/services/types/incomingBooking'
import type { Property } from '@/services/types/property'
import type { Client } from '@/services/types/client'
import { 
  XMarkIcon, 
  ChevronDownIcon, 
  ChevronRightIcon,
  EyeIcon,
  MapIcon,
  CurrencyDollarIcon,
  CheckIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'

interface ReviewIncomingBookingsModalProps {
  isOpen: boolean
  onClose: () => void
  booking: IncomingBooking | null
  onUpdate: () => void
}

const ReviewIncomingBookingsModal: React.FC<ReviewIncomingBookingsModalProps> = ({ 
  isOpen, 
  onClose, 
  booking,
  onUpdate
}) => {
  const [properties, setProperties] = useState<Property[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [showFieldMapping, setShowFieldMapping] = useState(false)
  const [showRawData, setShowRawData] = useState(false)
  
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'; // Prevent background scrolling when modal is open
      if (profile?.id) {
        fetchPropertiesAndClients()
      }
    } else {
      document.body.style.overflow = 'auto';   // Restore scrolling when modal is closed
    }

    return () => {
      document.body.style.overflow = 'auto';   // Clean up on unmount
    };
  }, [isOpen, profile?.id])

  useEffect(() => {
    if (booking) {
      setSelectedPropertyId(booking.propertyId || '')
      setSelectedClientId(booking.clientId || '')
      setFieldMappings(booking.fieldMappings || {})
    }
  }, [booking])

  const fetchPropertiesAndClients = async () => {
    if (!profile?.id) return

    try {
      const [propertiesRes, clientsRes] = await Promise.all([
        getProperties(profile.id),
        getClientsByParentId(profile.id)
      ])

      if (propertiesRes.status === 'success') {
        setProperties(propertiesRes.data)
      }
      if (clientsRes.status === 'success') {
        setClients(clientsRes.data)
      }
    } catch (error) {
      console.error('Error fetching properties and clients:', error)
      showNotification('Failed to load properties and clients', 'error')
    }
  }

  const handleSaveMapping = async () => {
    if (!booking?.id || !selectedPropertyId) {
      showNotification('Please select a property', 'error')
      return
    }

    try {
      setLoading(true)
      const mappingData: UpdateIncomingBookingMappingPayload = {
        propertyId: selectedPropertyId,
        fieldMappings
      }
      
      // Only include clientId if explicitly selected
      if (selectedClientId) {
        mappingData.clientId = selectedClientId
      }
      
      const response = await updateIncomingBookingMapping(booking.id, mappingData)

      if (response.status === 'success') {
        showNotification('Mapping saved successfully', 'success')
        onUpdate()
        onClose()
      } else {
        showNotification(response.message || 'Failed to save mapping', 'error')
      }
    } catch (error) {
      console.error('Error saving mapping:', error)
      showNotification('Failed to save mapping', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAndApprove = async () => {
    if (!booking?.id || !selectedPropertyId) {
      showNotification('Please select a property', 'error')
      return
    }

    try {
      setLoading(true)
      
      // First save the mapping
      const mappingData: UpdateIncomingBookingMappingPayload = {
        propertyId: selectedPropertyId,
        fieldMappings
      }
      
      // Only include clientId if explicitly selected
      if (selectedClientId) {
        mappingData.clientId = selectedClientId
      }
      
      const mappingResponse = await updateIncomingBookingMapping(booking.id, mappingData)

      if (mappingResponse.status !== 'success') {
        showNotification(mappingResponse.message || 'Failed to save mapping', 'error')
        return
      }

      // Then approve the booking
      const approveResponse = await updateIncomingBookingStatus(booking.id, { status: 'approved' })

      if (approveResponse.status === 'success') {
        showNotification('Booking approved and imported successfully', 'success')
        onUpdate()
        onClose()
      } else {
        showNotification(approveResponse.message || 'Failed to approve booking', 'error')
      }
    } catch (error) {
      console.error('Error saving and approving:', error)
      const message = error instanceof Error ? error.message : 'Failed to approve booking'
      showNotification(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return 'N/A'
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return `$${num.toLocaleString()}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  if (!booking) return null

  const selectedProperty = properties.find(p => p.id === selectedPropertyId)

  if (!isOpen) return null

  // Check if we're in browser environment for createPortal
  if (typeof window === 'undefined') return null

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black opacity-10" 
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 flex flex-col max-h-[70vh] z-10">
          
          {/* Fixed Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-medium text-gray-900">
                {booking?.status === 'imported' ? 'View Imported Booking' : 'Review Incoming Booking'}
              </h3>
              {booking?.status === 'imported' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckIcon className="h-3 w-3 mr-1" />
                  Imported
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="cursor-pointer text-gray-400 hover:text-gray-500 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 flex-1 overflow-y-auto">
          {/* Imported Booking Link */}
          {booking?.status === 'imported' && booking?.importedBookingId && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckIcon className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-800">This booking has been imported</p>
                    <p className="text-xs text-green-600 mt-1">
                      All booking data has been transferred to the main bookings system.
                    </p>
                  </div>
                </div>
                <a 
                  href={`/property-manager/bookings?id=${booking.importedBookingId}`}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200 transition-colors"
                >
                  View Full Booking
                  <EyeIcon className="ml-2 h-4 w-4" />
                </a>
              </div>
            </div>
          )}
          
          {/* Booking Overview */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Booking Overview</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-black text-xs text-gray-500">Guest</p>
                <p className="font-medium text-black">{booking.guestName || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-black text-xs text-gray-500">Dates</p>
                <p className="font-medium text-black">{formatDate(booking.checkInDate)} - {formatDate(booking.checkOutDate)}</p>
              </div>
              <div>
                <p className="text-black text-xs text-gray-500">Nights</p>
                <p className="font-medium text-black">{booking.numNights || 'N/A'}</p>
              </div>
              <div>
                <p className="text-black text-xs text-gray-500">Total Amount</p>
                <p className="font-medium text-black">{formatCurrency(booking.totalAmount)}</p>
              </div>
            </div>
          </div>

          {/* Property/Client Mapping */}
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                Property Mapping
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property
                  </label>
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Property</option>
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.listingName} - {property.address}
                      </option>
                    ))}
                  </select>
                  {booking.listingName && (
                    <p className="text-xs text-gray-500 mt-1">
                      From webhook: {booking.listingName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Client (Property Owner) - Optional
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Auto-select primary owner</option>
                    {selectedProperty?.owners.map((owner) => (
                      <option key={owner.clientId} value={owner.clientId}>
                        {owner.clientName} {owner.isPrimary ? '(Primary)' : ''}
                      </option>
                    )) || clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                Financial Breakdown
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Nightly Rate</p>
                  <p className="text-black font-medium">{formatCurrency(booking.nightlyRate)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Cleaning Fee</p>
                  <p className="text-black font-medium">{formatCurrency(booking.cleaningFee)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Lodging Tax</p>
                  <p className="text-black font-medium">{formatCurrency(booking.lodgingTax)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Sales Tax</p>
                  <p className="text-black font-medium">{formatCurrency(booking.salesTax)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">GST</p>
                  <p className="text-black font-medium">{formatCurrency(booking.gst)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Total Payout</p>
                  <p className="text-black font-medium">{formatCurrency(booking.totalPayout)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Platform</p>
                  <p className="text-black font-medium">{booking.platform || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Status</p>
                  <p className="text-black font-medium">{booking.bookingStatus || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Field Mapping Section */}
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => setShowFieldMapping(!showFieldMapping)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <span className="flex items-center">
                  <MapIcon className="h-5 w-5 mr-2" />
                  Field Mapping (Optional)
                </span>
                {showFieldMapping ? (
                  <ChevronDownIcon className="h-5 w-5" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5" />
                )}
              </button>
              {showFieldMapping && (
                <div className="px-4 pb-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-3 pt-3">
                    Configure how webhook fields map to your booking system
                  </p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Guest Name Field
                        </label>
                        <input
                          type="text"
                          value={fieldMappings.guestName || 'guestName'}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, guestName: e.target.value }))}
                          className="text-black w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Total Amount Field
                        </label>
                        <input
                          type="text"
                          value={fieldMappings.totalAmount || 'totalPrice'}
                          onChange={(e) => setFieldMappings(prev => ({ ...prev, totalAmount: e.target.value }))}
                          className="text-black w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Raw Data Section */}
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => setShowRawData(!showRawData)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <span className="flex items-center">
                  <EyeIcon className="h-5 w-5 mr-2" />
                  Raw Webhook Data
                </span>
                {showRawData ? (
                  <ChevronDownIcon className="h-5 w-5" />
                ) : (
                  <ChevronRightIcon className="h-5 w-5" />
                )}
              </button>
              {showRawData && (
                <div className="px-4 pb-4 border-t border-gray-200">
                  <pre className="text-black text-xs bg-gray-100 p-3 rounded overflow-auto max-h-60">
                    {JSON.stringify(booking.rawWebhookData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Fixed Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 flex-shrink-0 bg-gray-50">
            <button
              onClick={onClose}
              disabled={loading}
              className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveMapping}
              disabled={loading || !selectedPropertyId}
              className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Mapping'}
            </button>
            {booking?.status !== 'imported' && (
              <button
                onClick={handleSaveAndApprove}
                disabled={loading || !selectedPropertyId}
                className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Save & Approve'}
              </button>
            )}
          </div>
        </div>
      </div>
  )

  return createPortal(modalContent, document.body)
}

export default ReviewIncomingBookingsModal