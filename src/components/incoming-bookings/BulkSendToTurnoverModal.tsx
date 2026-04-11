'use client'

import { useTranslation } from 'react-i18next'
import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { parseLocalDate } from '@/utils/dateUtils'
import { isReservedName } from '@/utils/bookingUtils'
import {
  XMarkIcon,
  CalendarDaysIcon,
  UserIcon,
  BuildingOfficeIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import type { IncomingBooking, SendToTurnoverItem } from '@/services/types/incomingBooking'
import SearchableSelect from '@/components/shared/SearchableSelect'
import BookingQuickViewModal from './BookingQuickViewModal'

interface BulkSendToTurnoverModalProps {
  isOpen: boolean
  onClose: () => void
  selectedBookings: IncomingBooking[]
  onSend: (items: SendToTurnoverItem[]) => Promise<void>
  isSending: boolean
  properties: Array<{ id: string; listingName: string; address: string }>
}

const BulkSendToTurnoverModal: React.FC<BulkSendToTurnoverModalProps> = ({
  isOpen,
  onClose,
  selectedBookings,
  onSend,
  isSending,
  properties,
}) => {
  const [mounted, setMounted] = useState(false)
  const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(new Set())
  const [propertyOverrides, setPropertyOverrides] = useState<Record<string, string>>({})
  const [quickViewBooking, setQuickViewBooking] = useState<IncomingBooking | null>(null)

  // Initialize local selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalSelectedIds(new Set(selectedBookings.map(b => b.id)))
      setPropertyOverrides({})
    }
  }, [isOpen, selectedBookings])

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

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

  // Determine which selected bookings are ready (have a property assigned or overridden)
  const readyCount = useMemo(() => {
    return selectedBookings
      .filter(b => localSelectedIds.has(b.id))
      .filter(b => b.propertyId || propertyOverrides[b.id])
      .length
  }, [selectedBookings, localSelectedIds, propertyOverrides])

  const selectedCount = useMemo(() => {
    return selectedBookings.filter(b => localSelectedIds.has(b.id)).length
  }, [selectedBookings, localSelectedIds])

  const allReady = selectedCount > 0 && readyCount === selectedCount

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

  const toggleSelectAll = () => {
    const allSelected = selectedBookings.every(b => localSelectedIds.has(b.id))
    if (allSelected) {
      setLocalSelectedIds(new Set())
    } else {
      setLocalSelectedIds(new Set(selectedBookings.map(b => b.id)))
    }
  }

  // Build property options for SearchableSelect
  const propertyOptions = useMemo(() => {
    return properties.map(p => ({
      value: p.id,
      label: p.listingName || p.address,
      secondaryLabel: p.listingName ? p.address : undefined,
    }))
  }, [properties])

  const handlePropertyOverride = (bookingId: string, propertyId: string) => {
    setPropertyOverrides(prev => ({ ...prev, [bookingId]: propertyId }))
  }

  const handleSend = async () => {
    const items: SendToTurnoverItem[] = selectedBookings
      .filter(b => localSelectedIds.has(b.id))
      .filter(b => b.propertyId || propertyOverrides[b.id])
      .map(b => ({
        incomingBookingId: b.id,
        propertyId: propertyOverrides[b.id] || b.propertyId!,
      }))
    if (items.length === 0) return
    await onSend(items)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return parseLocalDate(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
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
            className="relative w-full max-w-5xl max-h-[92vh] min-h-[70vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-cyan-50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/25">
                  <WrenchScrewdriverIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Send to Turnover Calendar</h2>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Create cleaning projects without importing as bookings
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isSending}
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
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                      <CalendarDaysIcon className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Selected</p>
                      <p className="text-lg font-bold text-gray-900">{selectedCount} bookings</p>
                    </div>
                  </div>
                  <div className="h-10 w-px bg-gray-200" />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                      <WrenchScrewdriverIcon className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Ready</p>
                      <p className="text-lg font-bold text-teal-600">{readyCount} of {selectedCount}</p>
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
                    disabled={isSending}
                    className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer disabled:opacity-50"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </span>
                </label>
              </div>
            </div>

            {/* Warning if not all ready */}
            {selectedCount > 0 && !allReady && (
              <div className="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-700">
                  {selectedCount - readyCount} booking{selectedCount - readyCount > 1 ? 's need' : ' needs'} a property assigned before sending
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
                      <th className="w-[160px] text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Guest
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Property
                      </th>
                      <th className="w-[120px] text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Cleaning Date
                      </th>
                      <th className="w-[100px] text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Platform
                      </th>
                      <th className="w-12 py-3 px-4">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedBookings.map((booking, index) => {
                      const isSelected = localSelectedIds.has(booking.id)
                      const hasProperty = !!(booking.propertyId || propertyOverrides[booking.id])
                      const needsPropertySelect = !booking.propertyId

                      return (
                        <motion.tr
                          key={booking.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className={`transition-colors cursor-pointer ${
                            isSelected
                              ? hasProperty
                                ? 'bg-white hover:bg-teal-50/50'
                                : 'bg-amber-50/30 hover:bg-amber-50/50'
                              : 'bg-gray-50/50 hover:bg-gray-100/50'
                          }`}
                          onClick={() => !isSending && toggleBookingSelection(booking.id)}
                        >
                          <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleBookingSelection(booking.id)}
                              disabled={isSending}
                              className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer disabled:opacity-50"
                            />
                          </td>
                          <td className="py-4 px-4 w-[160px]">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isSelected
                                  ? 'bg-gradient-to-br from-teal-500 to-teal-600'
                                  : 'bg-gray-200'
                              }`}>
                                <UserIcon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                              </div>
                              <div className="min-w-0 max-w-[100px]">
                                <p className={`text-sm font-medium truncate ${isSelected ? 'text-gray-900' : 'text-gray-500'}`}>
                                  {isReservedName(booking.guestName) ? '' : (booking.guestName || 'Unknown Guest')}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                            {needsPropertySelect ? (
                              <SearchableSelect
                                options={propertyOptions}
                                value={propertyOverrides[booking.id] || null}
                                onChange={(val) => handlePropertyOverride(booking.id, val || '')}
                                placeholder="Search property..."
                                disabled={isSending}
                                clearable={false}
                                emptyText="No properties found"
                              />
                            ) : (
                              <div className="flex items-center gap-2">
                                <BuildingOfficeIcon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-gray-400' : 'text-gray-300'}`} />
                                <span className={`text-sm truncate max-w-[180px] ${isSelected ? 'text-gray-700' : 'text-gray-400'}`}>
                                  {booking.propertyName || booking.listingName || 'Not assigned'}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 w-[120px]">
                            <div className="flex items-center gap-2">
                              <CalendarDaysIcon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-teal-500' : 'text-gray-300'}`} />
                              <span className={`text-sm whitespace-nowrap ${isSelected ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                                {formatDate(booking.checkOutDate)}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 w-[100px]">
                            <span className={`text-xs px-2 py-1 rounded-lg ${isSelected ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400'}`}>
                              {booking.platform || 'Unknown'}
                            </span>
                          </td>
                          <td className="py-4 px-4 w-12" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setQuickViewBooking(booking)}
                              className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                              title="View details"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                          </td>
                        </motion.tr>
                      )
                    })}
                    {/* Spacer row so property dropdown isn't clipped */}
                    <tr><td colSpan={6} className="h-52" /></tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50/80">
              <button
                onClick={onClose}
                disabled={isSending}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>

              <motion.button
                onClick={handleSend}
                disabled={isSending || readyCount === 0}
                whileHover={{ scale: isSending || readyCount === 0 ? 1 : 1.02 }}
                whileTap={{ scale: isSending || readyCount === 0 ? 1 : 0.98 }}
                className="inline-flex items-center px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded-xl hover:from-teal-600 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/25 transition-all"
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <WrenchScrewdriverIcon className="w-4 h-4 mr-2" />
                    Send {readyCount} to Turnover Calendar
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

export default BulkSendToTurnoverModal
