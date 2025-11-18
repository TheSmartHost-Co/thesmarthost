'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import { createBooking } from '@/services/bookingService'
import { getProperties } from '@/services/propertyService'
import { CreateBookingPayload, Platform } from '@/services/types/booking'
import { Property } from '@/services/types/property'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'

interface CreateBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (newBooking: any) => void
  csvUploadId?: string // Optional - if creating from CSV upload context
}

const CreateBookingModal: React.FC<CreateBookingModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  csvUploadId,
}) => {
  // Basic booking fields
  const [propertyId, setPropertyId] = useState('')
  const [reservationCode, setReservationCode] = useState('')
  const [guestName, setGuestName] = useState('')
  const [checkInDate, setCheckInDate] = useState('')
  const [checkOutDate, setCheckOutDate] = useState('')
  const [numNights, setNumNights] = useState('')
  const [platform, setPlatform] = useState<Platform>('direct')
  const [listingName, setListingName] = useState('')

  // Financial fields
  const [nightlyRate, setNightlyRate] = useState('')
  const [extraGuestFees, setExtraGuestFees] = useState('')
  const [cleaningFee, setCleaningFee] = useState('')
  const [lodgingTax, setLodgingTax] = useState('')
  const [bedLinenFee, setBedLinenFee] = useState('')
  const [gst, setGst] = useState('')
  const [qst, setQst] = useState('')
  const [channelFee, setChannelFee] = useState('')
  const [stripeFee, setStripeFee] = useState('')
  const [totalPayout, setTotalPayout] = useState('')
  const [mgmtFee, setMgmtFee] = useState('')
  const [netEarnings, setNetEarnings] = useState('')
  const [salesTax, setSalesTax] = useState('')

  // Properties data
  const [properties, setProperties] = useState<Property[]>([])
  const [loadingProperties, setLoadingProperties] = useState(false)

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Platform options
  const platformOptions: { value: Platform; label: string }[] = [
    { value: 'airbnb', label: 'Airbnb' },
    { value: 'booking', label: 'Booking.com' },
    { value: 'google', label: 'Google Travel' },
    { value: 'direct', label: 'Direct Booking' },
    { value: 'wechalet', label: 'We Chalet' },
    { value: 'monsieurchalets', label: 'Monsieur Chalets' },
  ]

  // Fetch properties when modal opens
  useEffect(() => {
    const fetchProperties = async () => {
      if (isOpen && profile?.id) {
        try {
          setLoadingProperties(true)
          const response = await getProperties(profile.id)
          if (response.status === 'success') {
            setProperties(response.data.filter(p => p.isActive))
          } else {
            showNotification('Failed to load properties', 'error')
          }
        } catch (err) {
          console.error('Error fetching properties:', err)
          showNotification('Failed to load properties', 'error')
        } finally {
          setLoadingProperties(false)
        }
      }
    }

    fetchProperties()
  }, [isOpen, profile?.id])

  // Auto-calculate number of nights when dates change
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const checkIn = new Date(checkInDate)
      const checkOut = new Date(checkOutDate)
      const diffTime = checkOut.getTime() - checkIn.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays > 0) {
        setNumNights(diffDays.toString())
      } else {
        setNumNights('')
      }
    }
  }, [checkInDate, checkOutDate])

  // Auto-calculate check-out date when check-in date and number of nights change
  useEffect(() => {
    if (checkInDate && numNights && !isNaN(parseInt(numNights))) {
      const checkIn = new Date(checkInDate)
      const nights = parseInt(numNights)
      
      if (nights > 0) {
        const checkOut = new Date(checkIn)
        checkOut.setDate(checkIn.getDate() + nights)
        
        // Format date as YYYY-MM-DD for input field
        const formattedDate = checkOut.toISOString().split('T')[0]
        setCheckOutDate(formattedDate)
      }
    }
  }, [checkInDate, numNights])

  // Reset form fields whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setPropertyId('')
      setReservationCode('')
      setGuestName('')
      setCheckInDate('')
      setCheckOutDate('')
      setNumNights('')
      setPlatform('direct')
      setListingName('')
      setNightlyRate('')
      setExtraGuestFees('')
      setCleaningFee('')
      setLodgingTax('')
      setBedLinenFee('')
      setGst('')
      setQst('')
      setChannelFee('')
      setStripeFee('')
      setTotalPayout('')
      setMgmtFee('')
      setNetEarnings('')
      setSalesTax('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedReservationCode = reservationCode.trim()
    const trimmedGuestName = guestName.trim()
    const trimmedListingName = listingName.trim()
    const parsedNumNights = parseInt(numNights)

    // Basic validation
    if (!propertyId) {
      showNotification('Please select a property', 'error')
      return
    }

    if (!trimmedReservationCode) {
      showNotification('Reservation code is required', 'error')
      return
    }

    if (!trimmedGuestName) {
      showNotification('Guest name is required', 'error')
      return
    }

    if (!checkInDate) {
      showNotification('Check-in date is required', 'error')
      return
    }

    if (!numNights || isNaN(parsedNumNights) || parsedNumNights <= 0) {
      showNotification('Valid number of nights is required', 'error')
      return
    }

    if (!profile?.id) {
      showNotification('User profile not found', 'error')
      return
    }

    // Parse financial fields (allow null for optional fields)
    const parseOptionalNumber = (value: string): number | undefined => {
      const trimmed = value.trim()
      if (!trimmed) return undefined
      const parsed = parseFloat(trimmed)
      return isNaN(parsed) ? undefined : parsed
    }

    try {
      const payload: CreateBookingPayload = {
        user_id: profile.id,
        property_id: propertyId,
        reservation_code: trimmedReservationCode,
        guest_name: trimmedGuestName,
        check_in_date: checkInDate,
        check_out_date: checkOutDate || undefined,
        num_nights: parsedNumNights,
        platform,
        listing_name: trimmedListingName || undefined,
        nightly_rate: parseOptionalNumber(nightlyRate),
        extra_guest_fees: parseOptionalNumber(extraGuestFees),
        cleaning_fee: parseOptionalNumber(cleaningFee),
        lodging_tax: parseOptionalNumber(lodgingTax),
        bed_linen_fee: parseOptionalNumber(bedLinenFee),
        gst: parseOptionalNumber(gst),
        qst: parseOptionalNumber(qst),
        channel_fee: parseOptionalNumber(channelFee),
        stripe_fee: parseOptionalNumber(stripeFee),
        total_payout: parseOptionalNumber(totalPayout),
        mgmt_fee: parseOptionalNumber(mgmtFee),
        net_earnings: parseOptionalNumber(netEarnings),
        sales_tax: parseOptionalNumber(salesTax),
        ...(csvUploadId && { csv_upload_id: csvUploadId }),
      }

      const res = await createBooking(payload)

      if (res.status === 'success') {
        showNotification('Booking created successfully', 'success')
        onAdd(res.data)
        onClose()
      } else {
        showNotification(res.message || 'Failed to create booking', 'error')
      }
    } catch (err) {
      console.error('Error creating booking:', err)
      const message = err instanceof Error ? err.message : 'Error creating booking'
      showNotification(message, 'error')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-4xl w-11/12 max-h-[90vh] overflow-y-auto">
      <h2 className="text-xl mb-4 text-black">Create New Booking</h2>
      <form onSubmit={handleSubmit} className="space-y-6 text-black">
        
        {/* Basic Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
            Basic Information
          </h3>
          
          {/* Property Selection */}
          <div>
            <label className="block text-sm font-medium mb-1">Property *</label>
            {loadingProperties ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                Loading properties...
              </div>
            ) : properties.length === 0 ? (
              <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                No active properties available. Please create a property first.
              </div>
            ) : (
              <select
                required
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a property</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.listingName} - {property.address}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Reservation Code and Guest Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Reservation Code *</label>
              <input
                required
                type="text"
                value={reservationCode}
                onChange={(e) => setReservationCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., HMFW123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Guest Name *</label>
              <input
                required
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., John Smith"
              />
            </div>
          </div>

          {/* Dates and Nights */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Check-in Date *</label>
              <input
                required
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Check-out Date</label>
              <input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Number of Nights *</label>
              <input
                required
                type="number"
                min="1"
                value={numNights}
                onChange={(e) => setNumNights(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 3"
              />
            </div>
          </div>

          {/* Platform and Listing Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Platform *</label>
              <select
                required
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {platformOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Listing Name</label>
              <input
                type="text"
                value={listingName}
                onChange={(e) => setListingName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Downtown Condo"
              />
            </div>
          </div>
        </div>

        {/* Financial Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
            Financial Information (Optional)
          </h3>

          {/* Row 1: Base rates */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nightly Rate ($)</label>
              <input
                type="number"
                step="0.01"
                value={nightlyRate}
                onChange={(e) => setNightlyRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Extra Guest Fees ($)</label>
              <input
                type="number"
                step="0.01"
                value={extraGuestFees}
                onChange={(e) => setExtraGuestFees(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Cleaning Fee ($)</label>
              <input
                type="number"
                step="0.01"
                value={cleaningFee}
                onChange={(e) => setCleaningFee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Row 2: Taxes and fees */}
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Lodging Tax ($)</label>
              <input
                type="number"
                step="0.01"
                value={lodgingTax}
                onChange={(e) => setLodgingTax(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Bed Linen Fee ($)</label>
              <input
                type="number"
                step="0.01"
                value={bedLinenFee}
                onChange={(e) => setBedLinenFee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">GST ($)</label>
              <input
                type="number"
                step="0.01"
                value={gst}
                onChange={(e) => setGst(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">QST ($)</label>
              <input
                type="number"
                step="0.01"
                value={qst}
                onChange={(e) => setQst(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Row 3: Platform and processing fees */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Channel Fee ($)</label>
              <input
                type="number"
                step="0.01"
                value={channelFee}
                onChange={(e) => setChannelFee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Stripe Fee ($)</label>
              <input
                type="number"
                step="0.01"
                value={stripeFee}
                onChange={(e) => setStripeFee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sales Tax ($)</label>
              <input
                type="number"
                step="0.01"
                value={salesTax}
                onChange={(e) => setSalesTax(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Row 4: Totals */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Total Payout ($)</label>
              <input
                type="number"
                step="0.01"
                value={totalPayout}
                onChange={(e) => setTotalPayout(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Management Fee ($)</label>
              <input
                type="number"
                step="0.01"
                value={mgmtFee}
                onChange={(e) => setMgmtFee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Net Earnings ($)</label>
              <input
                type="number"
                step="0.01"
                value={netEarnings}
                onChange={(e) => setNetEarnings(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loadingProperties || properties.length === 0}
            className="cursor-pointer px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Create Booking
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateBookingModal