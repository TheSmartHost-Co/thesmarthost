'use client'

import React, { useState, useEffect, useRef } from 'react'
import Modal from '../../shared/modal'
import { updateBooking, formatPlatformName } from '@/services/bookingService'
import { getProperties } from '@/services/propertyService'
import { Booking, UpdateBookingPayload, Platform } from '@/services/types/booking'
import { Property } from '@/services/types/property'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { CalendarDaysIcon } from '@heroicons/react/24/outline'

interface UpdateBookingModalProps {
  isOpen: boolean
  onClose: () => void
  booking: Booking
  onUpdate: (updatedBooking: Booking) => void
}

const UpdateBookingModal: React.FC<UpdateBookingModalProps> = ({
  isOpen,
  onClose,
  booking,
  onUpdate,
}) => {
  // Form state
  const [propertyId, setPropertyId] = useState(booking.propertyId)
  const [reservationCode, setReservationCode] = useState(booking.reservationCode)
  const [guestName, setGuestName] = useState(booking.guestName)
  const [checkInDate, setCheckInDate] = useState(booking.checkInDate)
  const [checkOutDate, setCheckOutDate] = useState(booking.checkOutDate || '')
  const [numNights, setNumNights] = useState(booking.numNights.toString())
  const [platform, setPlatform] = useState<Platform>(booking.platform)

  // Financial fields
  const [nightlyRate, setNightlyRate] = useState(booking.nightlyRate?.toString() || '')
  const [extraGuestFees, setExtraGuestFees] = useState(booking.extraGuestFees?.toString() || '')
  const [cleaningFee, setCleaningFee] = useState(booking.cleaningFee?.toString() || '')
  const [lodgingTax, setLodgingTax] = useState(booking.lodgingTax?.toString() || '')
  const [bedLinenFee, setBedLinenFee] = useState(booking.bedLinenFee?.toString() || '')
  const [gst, setGst] = useState(booking.gst?.toString() || '')
  const [qst, setQst] = useState(booking.qst?.toString() || '')
  const [channelFee, setChannelFee] = useState(booking.channelFee?.toString() || '')
  const [stripeFee, setStripeFee] = useState(booking.stripeFee?.toString() || '')
  const [salesTax, setSalesTax] = useState(booking.salesTax?.toString() || '')
  const [totalPayout, setTotalPayout] = useState(booking.totalPayout?.toString() || '')
  const [mgmtFee, setMgmtFee] = useState(booking.mgmtFee?.toString() || '')
  const [netEarnings, setNetEarnings] = useState(booking.netEarnings?.toString() || '')

  // State
  const [properties, setProperties] = useState<Property[]>([])
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Helper function to format date for HTML date input (YYYY-MM-DD)
  const formatDateForInput = (dateString: string): string => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toISOString().split('T')[0]
  }

  // Initialize form with booking data
  useEffect(() => {
    if (isOpen) {
      setPropertyId(booking.propertyId)
      setReservationCode(booking.reservationCode)
      setGuestName(booking.guestName)
      setCheckInDate(formatDateForInput(booking.checkInDate))
      setCheckOutDate(formatDateForInput(booking.checkOutDate || ''))
      setNumNights(booking.numNights.toString())
      setPlatform(booking.platform)

      // Financial fields
      setNightlyRate(booking.nightlyRate?.toString() || '')
      setExtraGuestFees(booking.extraGuestFees?.toString() || '')
      setCleaningFee(booking.cleaningFee?.toString() || '')
      setLodgingTax(booking.lodgingTax?.toString() || '')
      setBedLinenFee(booking.bedLinenFee?.toString() || '')
      setGst(booking.gst?.toString() || '')
      setQst(booking.qst?.toString() || '')
      setChannelFee(booking.channelFee?.toString() || '')
      setStripeFee(booking.stripeFee?.toString() || '')
      setSalesTax(booking.salesTax?.toString() || '')
      setTotalPayout(booking.totalPayout?.toString() || '')
      setMgmtFee(booking.mgmtFee?.toString() || '')
      setNetEarnings(booking.netEarnings?.toString() || '')
    }
  }, [isOpen, booking])

  // Fetch properties for dropdown
  useEffect(() => {
    const fetchProperties = async () => {
      if (isOpen && profile?.id) {
        try {
          setLoadingProperties(true)
          const response = await getProperties(profile.id)
          setProperties(response.data.filter((p) => p.isActive))
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!profile?.id) {
      showNotification('User profile not found', 'error')
      return
    }

    const trimmedReservationCode = reservationCode.trim()
    const trimmedGuestName = guestName.trim()
    const parsedNumNights = parseInt(numNights)

    // Basic validation
    if (!propertyId || !trimmedReservationCode || !trimmedGuestName || !checkInDate || !numNights || !platform) {
      showNotification('All required fields must be filled', 'error')
      return
    }

    if (isNaN(parsedNumNights) || parsedNumNights <= 0) {
      showNotification('Number of nights must be a positive number', 'error')
      return
    }

    // Validate dates
    const checkIn = new Date(checkInDate)

    if (checkOutDate) {
      const checkOut = new Date(checkOutDate)
      if (checkOut <= checkIn) {
        showNotification('Check-out date must be after check-in date', 'error')
        return
      }
    }

    setIsSubmitting(true)

    try {
      // Helper function to parse currency values
      const parseCurrency = (value: string): number | undefined => {
        if (!value.trim()) return undefined
        const parsed = parseFloat(value)
        return isNaN(parsed) ? undefined : parsed
      }

      const payload: UpdateBookingPayload = {
        user_id: profile.id,
        property_id: propertyId,
        reservation_code: trimmedReservationCode,
        guest_name: trimmedGuestName,
        check_in_date: checkInDate,
        check_out_date: checkOutDate || undefined,
        num_nights: parsedNumNights,
        platform,
        nightly_rate: parseCurrency(nightlyRate),
        extra_guest_fees: parseCurrency(extraGuestFees),
        cleaning_fee: parseCurrency(cleaningFee),
        lodging_tax: parseCurrency(lodgingTax),
        bed_linen_fee: parseCurrency(bedLinenFee),
        gst: parseCurrency(gst),
        qst: parseCurrency(qst),
        channel_fee: parseCurrency(channelFee),
        stripe_fee: parseCurrency(stripeFee),
        sales_tax: parseCurrency(salesTax),
        total_payout: parseCurrency(totalPayout),
        mgmt_fee: parseCurrency(mgmtFee),
        net_earnings: parseCurrency(netEarnings),
      }

      const res = await updateBooking(booking.id, payload)

      if (res.status === 'success') {
        onUpdate(res.data)
        showNotification('Booking updated successfully', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Failed to update booking', 'error')
      }
    } catch (err) {
      console.error('Error updating booking:', err)
      const message = err instanceof Error ? err.message : 'Error updating booking'
      showNotification(message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const platformOptions: Platform[] = ['airbnb', 'booking', 'google', 'direct', 'wechalet', 'monsieurchalets']

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-4xl w-11/12 max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Edit Booking</h2>
          <p className="text-sm text-gray-600">Update booking details and financial information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-black">
        {/* Booking Details Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Booking Details</h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Property */}
            <div>
              <label className="block text-sm font-medium mb-1">Property *</label>
              {loadingProperties ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-500">
                  Loading properties...
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

            {/* Platform */}
            <div>
              <label className="block text-sm font-medium mb-1">Platform *</label>
              <select
                required
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {platformOptions.map((platformOption) => (
                  <option key={platformOption} value={platformOption}>
                    {formatPlatformName(platformOption)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Reservation Code */}
            <div>
              <label className="block text-sm font-medium mb-1">Reservation Code *</label>
              <input
                required
                type="text"
                value={reservationCode}
                onChange={(e) => setReservationCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., HM123456789"
              />
            </div>

            {/* Guest Name */}
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

          <div className="grid grid-cols-3 gap-4">
            {/* Check-in Date */}
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

            {/* Number of Nights */}
            <div>
              <label className="block text-sm font-medium mb-1">Number of Nights *</label>
              <input
                required
                type="number"
                min="1"
                value={numNights}
                onChange={(e) => setNumNights(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Check-out Date (Optional - calculated if not provided) */}
            <div>
              <label className="block text-sm font-medium mb-1">Check-out Date (Optional)</label>
              <input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Will be calculated from check-in date + nights if not provided"
              />
            </div>
          </div>
        </div>

        {/* Financial Information Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Financial Information</h3>

          {/* Revenue Fields */}
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-3">Revenue & Charges</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nightly Rate ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={nightlyRate}
                  onChange={(e) => setNightlyRate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Lodging Tax ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={lodgingTax}
                  onChange={(e) => setLodgingTax(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                />
              </div>
            </div>
          </div>

          {/* Tax Fields */}
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-3">Taxes</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">GST ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={gst}
                  onChange={(e) => setGst(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                />
              </div>
            </div>
          </div>

          {/* Fees Fields */}
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-3">Platform & Processing Fees</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Channel Fee ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={channelFee}
                  onChange={(e) => setChannelFee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                />
              </div>
            </div>
          </div>

          {/* Summary Fields */}
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-3">Financial Summary</h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Total Payout ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={totalPayout}
                  onChange={(e) => setTotalPayout(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || loadingProperties}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Updating...' : 'Update Booking'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default UpdateBookingModal