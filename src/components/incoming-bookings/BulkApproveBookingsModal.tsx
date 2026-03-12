'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { parseLocalDate } from '@/utils/dateUtils'
import {
  XMarkIcon,
  CheckIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  UserIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import type { IncomingBooking } from '@/services/types/incomingBooking'
import BookingQuickViewModal from './BookingQuickViewModal'

interface BulkApproveBookingsModalProps {
  isOpen: boolean
  onClose: () => void
  selectedBookings: IncomingBooking[]
  onApprove: (bookingIds: string[]) => Promise<void>
  isApproving: boolean
}

const BulkApproveBookingsModal: React.FC<BulkApproveBookingsModalProps> = ({
  isOpen,
  onClose,
  selectedBookings,
  onApprove,
  isApproving,
}) => {
  const [mounted, setMounted] = useState(false)
  // Local selection state - starts with all bookings selected
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(new Set())
  // Quick view modal state
  const [quickViewBooking, setQuickViewBooking] = useState<IncomingBooking | null>(null)

  // Initialize local selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSelectedIds(new Set(selectedBookings.map(b => b.id)))
    }
  }, [isOpen, selectedBookings])

  // Client-side mount check for portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  // Calculate summary stats from locally selected bookings
  const summaryStats = useMemo(() => {
    const selected = selectedBookings.filter(b => localSelectedIds.has(b.id))
    const totalPayout = selected.reduce((sum, b) => {
      const amount = b.totalAmount ? parseFloat(b.totalAmount) : (b.totalPayout || 0)
      return sum + (isNaN(amount) ? 0 : amount)
    }, 0)
    return {
      count: selected.length,
      totalPayout,
    }
  }, [selectedBookings, localSelectedIds])

  // Toggle individual booking selection
  const toggleBookingSelection = (bookingId: string) => {
    setLocalSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId)
      } else {
        newSet.add(bookingId)
      }
      return newSet
    })
  }

  // Toggle all bookings
  const toggleSelectAll = () => {
    const allSelected = selectedBookings.every(b => localSelectedIds.has(b.id))
    if (allSelected) {
      setLocalSelectedIds(new Set())
    } else {
      setLocalSelectedIds(new Set(selectedBookings.map(b => b.id)))
    }
  }

  // Handle approve action
  const handleApprove = async () => {
    const bookingIds = Array.from(localSelectedIds)
    if (bookingIds.length === 0) return
    await onApprove(bookingIds)
  }

  // Format helpers
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return parseLocalDate(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: string | number | null) => {
    if (!amount) return '$0'
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  if (!isOpen || !mounted) return null

  const allSelected = selectedBookings.every(b => localSelectedIds.has(b.id))
  const someSelected = localSelectedIds.size > 0 && !allSelected

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-500/25">
                  <CheckCircleIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Review & Approve Bookings</h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Review selected bookings before bulk approval
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isApproving}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-xl transition-colors disabled:opacity-50"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Summary Bar */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CalendarDaysIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Selected</p>
                      <p className="text-lg font-bold text-gray-900">{summaryStats.count} bookings</p>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-gray-200" />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <CurrencyDollarIcon className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Total Payout</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(summaryStats.totalPayout)}</p>
                    </div>
                  </div>
                </div>

                {/* Select All Toggle */}
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={input => {
                      if (input) input.indeterminate = someSelected
                    }}
                    onChange={toggleSelectAll}
                    disabled={isApproving}
                    className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer disabled:opacity-50"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </span>
                </label>
              </div>
            </div>

            {/* Warning if some deselected */}
            {localSelectedIds.size < selectedBookings.length && localSelectedIds.size > 0 && (
              <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-700">
                  {selectedBookings.length - localSelectedIds.size} booking{selectedBookings.length - localSelectedIds.size > 1 ? 's' : ''} will not be approved
                </p>
              </div>
            )}

            {/* Bookings List */}
            <div className="flex-1 overflow-auto">
              {selectedBookings.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500">No bookings selected</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="w-12 py-3 px-4">
                        <span className="sr-only">Select</span>
                      </th>
                      <th className="w-[180px] text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Guest
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Property
                      </th>
                      <th className="w-[200px] text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Dates
                      </th>
                      <th className="w-[100px] text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="w-12 py-3 px-4">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedBookings.map((booking, index) => {
                      const isSelected = localSelectedIds.has(booking.id)

                      return (
                        <motion.tr
                          key={booking.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className={`transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-white hover:bg-green-50/50'
                              : 'bg-gray-50/50 hover:bg-gray-100/50'
                          }`}
                          onClick={() => !isApproving && toggleBookingSelection(booking.id)}
                        >
                          <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleBookingSelection(booking.id)}
                              disabled={isApproving}
                              className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer disabled:opacity-50"
                            />
                          </td>
                          <td className="py-4 px-4 w-[180px]">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                                  : 'bg-gray-200'
                              }`}>
                                <UserIcon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                              </div>
                              <div className="min-w-0 max-w-[120px]">
                                <p className={`text-sm font-medium truncate ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                                  {booking.guestName || 'Unknown Guest'}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                  {booking.guestEmail || 'No email'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <BuildingOfficeIcon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-gray-400' : 'text-gray-300'}`} />
                              <span className={`text-sm truncate max-w-[180px] ${isSelected ? 'text-gray-700' : 'text-gray-400'}`}>
                                {booking.propertyName || booking.listingName || 'Not assigned'}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 w-[200px]">
                            <div className="flex items-center gap-2">
                              <CalendarDaysIcon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-gray-400' : 'text-gray-300'}`} />
                              <span className={`text-sm whitespace-nowrap ${isSelected ? 'text-gray-700' : 'text-gray-400'}`}>
                                {formatDate(booking.checkInDate)}
                              </span>
                              <span className="text-gray-300">→</span>
                              <span className={`text-sm whitespace-nowrap ${isSelected ? 'text-gray-500' : 'text-gray-400'}`}>
                                {formatDate(booking.checkOutDate)}
                              </span>
                              {booking.numNights && (
                                <span className={`text-xs px-1.5 py-0.5 rounded whitespace-nowrap ${
                                  isSelected ? 'bg-gray-100 text-gray-600' : 'bg-gray-100 text-gray-400'
                                }`}>
                                  {booking.numNights}n
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right w-[100px]">
                            <span className={`text-sm font-semibold whitespace-nowrap ${isSelected ? 'text-green-600' : 'text-gray-400'}`}>
                              {formatCurrency(booking.totalAmount || booking.totalPayout)}
                            </span>
                          </td>
                          <td className="py-4 px-4 w-12" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setQuickViewBooking(booking)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View details"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50/80">
              <button
                onClick={onClose}
                disabled={isApproving}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>

              <motion.button
                onClick={handleApprove}
                disabled={isApproving || localSelectedIds.size === 0}
                whileHover={{ scale: isApproving || localSelectedIds.size === 0 ? 1 : 1.02 }}
                whileTap={{ scale: isApproving || localSelectedIds.size === 0 ? 1 : 0.98 }}
                className="inline-flex items-center px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/25 transition-all"
              >
                {isApproving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4 mr-2" />
                    Approve {localSelectedIds.size} Booking{localSelectedIds.size !== 1 ? 's' : ''}
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <>
      {createPortal(modalContent, document.body)}
      <BookingQuickViewModal
        isOpen={!!quickViewBooking}
        onClose={() => setQuickViewBooking(null)}
        booking={quickViewBooking}
      />
    </>
  )
}

export default BulkApproveBookingsModal
