'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Modal from '@/components/shared/modal'
import {
  MapPinIcon,
  HomeModernIcon,
  WifiIcon,
  KeyIcon,
  ClockIcon,
  LinkIcon,
  HashtagIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  CameraIcon,
} from '@heroicons/react/24/outline'
import { getChannelIcon } from '@/services/channelUtils'
import { getClientPortalBookings, getClientPortalIssues } from '@/services/clientPortalService'
import { getPlatformBadge, formatCurrency } from '@/components/client-portal/shared/platformUtils'
import { parseLocalDate } from '@/utils/dateUtils'
import type { ClientPortalProperty, ClientPortalBooking, ClientPortalIssue } from '@/services/types/clientPortal'

interface PreviewClientPropertyModalProps {
  isOpen: boolean
  onClose: () => void
  property: ClientPortalProperty
}

type TabType = 'details' | 'bookings' | 'issues'

const PreviewClientPropertyModal: React.FC<PreviewClientPropertyModalProps> = ({
  isOpen,
  onClose,
  property,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('details')

  // Bookings state (lazy loaded + cached)
  const [bookings, setBookings] = useState<ClientPortalBooking[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [bookingsLoaded, setBookingsLoaded] = useState(false)

  // Issues state (lazy loaded + cached)
  const [issues, setIssues] = useState<ClientPortalIssue[]>([])
  const [loadingIssues, setLoadingIssues] = useState(false)
  const [issuesLoaded, setIssuesLoaded] = useState(false)

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('details')
      setBookings([])
      setBookingsLoaded(false)
      setIssues([])
      setIssuesLoaded(false)
    }
  }, [isOpen])

  // Lazy load bookings
  useEffect(() => {
    if (activeTab === 'bookings' && !bookingsLoaded) {
      fetchBookings()
    }
  }, [activeTab, bookingsLoaded])

  // Lazy load issues
  useEffect(() => {
    if (activeTab === 'issues' && !issuesLoaded) {
      fetchIssues()
    }
  }, [activeTab, issuesLoaded])

  const fetchBookings = async () => {
    setLoadingBookings(true)
    try {
      const res = await getClientPortalBookings()
      if (res.status === 'success') {
        setBookings(res.data.filter(b => b.propertyId === property.id))
        setBookingsLoaded(true)
      }
    } catch (err) {
      console.error('Error fetching bookings:', err)
    } finally {
      setLoadingBookings(false)
    }
  }

  const fetchIssues = async () => {
    setLoadingIssues(true)
    try {
      const res = await getClientPortalIssues()
      if (res.status === 'success') {
        setIssues(res.data.filter(i => i.propertyId === property.id))
        setIssuesLoaded(true)
      }
    } catch (err) {
      console.error('Error fetching issues:', err)
    } finally {
      setLoadingIssues(false)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return parseLocalDate(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Build parts
  const addressParts: string[] = []
  if (property.address) addressParts.push(property.address)
  if (property.postalCode) addressParts.push(property.postalCode)
  if (property.province) addressParts.push(property.province)
  const fullAddress = addressParts.join(', ')

  const bedBathParts: string[] = []
  if (property.numBedrooms != null) bedBathParts.push(`${property.numBedrooms} bedroom${property.numBedrooms !== 1 ? 's' : ''}`)
  if (property.numBeds != null) bedBathParts.push(`${property.numBeds} bed${property.numBeds !== 1 ? 's' : ''}`)
  if (property.numBathrooms != null) bedBathParts.push(`${property.numBathrooms} bathroom${property.numBathrooms !== 1 ? 's' : ''}`)

  const hasAccessInfo = property.wifiSsid || property.accessCodes || property.defaultCheckinTime || property.defaultCheckoutTime
  const hasChannels = property.channels && property.channels.length > 0
  const hasCommission = property.commissionRate != null || property.commissionRateOverride != null

  // Tab button
  const TabButton = ({ tab, icon: Icon, label }: { tab: TabType; icon: React.ElementType; label: string }) => {
    const count = tab === 'bookings' && bookingsLoaded ? bookings.length
      : tab === 'issues' && issuesLoaded ? issues.length
      : null

    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
          activeTab === tab
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        <Icon className="w-4 h-4" />
        {label}
        {count !== null && (
          <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${activeTab === tab ? 'bg-white/20' : 'bg-gray-200'}`}>
            {count}
          </span>
        )}
      </button>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-0 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-xl bg-emerald-50 p-2.5 shrink-0">
                <HomeModernIcon className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900 truncate">{property.listingName}</h2>
                {fullAddress && <p className="text-sm text-gray-500 truncate mt-0.5">{fullAddress}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {property.propertyType && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  {property.propertyType}
                </span>
              )}
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                property.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${property.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                {property.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-100 pb-4">
          <TabButton tab="details" icon={HomeModernIcon} label="Details" />
          <TabButton tab="bookings" icon={CalendarDaysIcon} label="Bookings" />
          <TabButton tab="issues" icon={ExclamationTriangleIcon} label="Issues" />
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'details' && (
            <motion.div key="details" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {/* Property Information */}
              <div className="mb-6 pb-6 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Property Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  {property.listingId && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <HashtagIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Listing ID</p>
                        <p className="text-sm font-medium text-gray-900 font-mono">{property.listingId}</p>
                      </div>
                    </div>
                  )}
                  {hasCommission && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-bold text-amber-600">%</span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Commission Rate</p>
                        <p className="text-sm font-medium text-gray-900">
                          {property.commissionRateOverride != null
                            ? <>{property.commissionRateOverride}% <span className="text-xs text-emerald-600">(override)</span></>
                            : `${property.commissionRate}%`}
                        </p>
                      </div>
                    </div>
                  )}
                  {property.propertyType && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                        <HomeModernIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Type</p>
                        <p className="text-sm font-medium text-gray-900">{property.propertyType}</p>
                      </div>
                    </div>
                  )}
                  {fullAddress && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                        <MapPinIcon className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Location</p>
                        <p className="text-sm font-medium text-gray-900">{property.address}</p>
                        {(property.postalCode || property.province) && (
                          <p className="text-xs text-gray-500">{[property.postalCode, property.province].filter(Boolean).join(', ')}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Specifications */}
              {bedBathParts.length > 0 && (
                <div className="mb-6 pb-6 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Property Specifications</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {property.numBedrooms != null && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                          <HomeModernIcon className="h-5 w-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Bedrooms</p>
                          <p className="text-sm font-medium text-gray-900">{property.numBedrooms}</p>
                        </div>
                      </div>
                    )}
                    {property.numBeds != null && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-indigo-600">B</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Beds</p>
                          <p className="text-sm font-medium text-gray-900">{property.numBeds}</p>
                        </div>
                      </div>
                    )}
                    {property.numBathrooms != null && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-teal-600">B</span>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Bathrooms</p>
                          <p className="text-sm font-medium text-gray-900">{property.numBathrooms}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* WiFi & Access */}
              {hasAccessInfo && (
                <div className="mb-6 pb-6 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">WiFi & Access</h3>
                  <div className="space-y-4">
                    {(property.wifiSsid || property.wifiPassword) && (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-sky-50 rounded-lg flex items-center justify-center shrink-0">
                          <WifiIcon className="h-5 w-5 text-sky-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">WiFi Credentials</p>
                          <div className="flex items-center gap-4 mt-1 flex-wrap">
                            {property.wifiSsid && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Network:</span>
                                <span className="text-sm font-medium text-gray-900 font-mono">{property.wifiSsid}</span>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(property.wifiSsid || '')}
                                  className="p-1 text-gray-400 hover:text-gray-600 rounded cursor-pointer"
                                  title="Copy network name"
                                >
                                  <ClipboardDocumentIcon className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            {property.wifiPassword && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Password:</span>
                                <span className="text-sm font-medium text-gray-900 font-mono">{property.wifiPassword}</span>
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(property.wifiPassword || '')}
                                  className="p-1 text-gray-400 hover:text-gray-600 rounded cursor-pointer"
                                  title="Copy password"
                                >
                                  <ClipboardDocumentIcon className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {property.accessCodes && (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                          <KeyIcon className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500">Access Codes</p>
                          <pre className="text-sm font-medium text-gray-900 whitespace-pre-wrap mt-1 font-mono bg-gray-50 p-2 rounded-lg">{property.accessCodes}</pre>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(property.accessCodes || '')}
                            className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                          >
                            <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                            Copy all codes
                          </button>
                        </div>
                      </div>
                    )}
                    {(property.defaultCheckinTime || property.defaultCheckoutTime) && (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                          <ClockIcon className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Check-in / Check-out Times</p>
                          <p className="text-sm font-medium text-gray-900">
                            {property.defaultCheckinTime ? `Check-in: ${property.defaultCheckinTime}` : ''}
                            {property.defaultCheckinTime && property.defaultCheckoutTime ? ' \u00B7 ' : ''}
                            {property.defaultCheckoutTime ? `Check-out: ${property.defaultCheckoutTime}` : ''}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Channels */}
              {hasChannels && (
                <div className="mb-6 pb-6 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Distribution Channels</h3>
                  <div className="flex flex-wrap gap-2">
                    {property.channels!.map((ch) => {
                      const pill = (
                        <span
                          key={ch.id}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                            ch.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <span className="w-4 h-4 flex items-center justify-center [&>svg]:w-3.5 [&>svg]:h-3.5">
                            {getChannelIcon(ch.channelName)}
                          </span>
                          {ch.channelName}
                          <span className={`ml-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                            ch.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {ch.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </span>
                      )

                      if (ch.publicUrl) {
                        return (
                          <a key={ch.id} href={ch.publicUrl} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1 hover:opacity-80 transition-opacity">
                            {pill}
                            <LinkIcon className="h-3 w-3 text-gray-400 group-hover:text-emerald-600 transition-colors" />
                          </a>
                        )
                      }
                      return pill
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'bookings' && (
            <motion.div key="bookings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {loadingBookings ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading bookings...</p>
                  </div>
                </div>
              ) : bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <CalendarDaysIcon className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No bookings found</p>
                  <p className="text-sm text-gray-400 mt-1">This property has no bookings yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-2">
                  <table className="w-full min-w-[550px]">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Check-out</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                        <th className="text-right py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Payout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.slice(0, 20).map((booking, idx) => (
                        <motion.tr
                          key={booking.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 px-3 text-sm font-medium text-gray-900">{booking.guestName || '-'}</td>
                          <td className="py-3 px-3 text-sm text-gray-600">{formatDate(booking.checkInDate)}</td>
                          <td className="py-3 px-3 text-sm text-gray-600">{formatDate(booking.checkOutDate)}</td>
                          <td className="py-3 px-3">{booking.platform ? getPlatformBadge(booking.platform) : '-'}</td>
                          <td className="py-3 px-3 text-right text-sm font-medium text-gray-900">{formatCurrency(booking.totalPayout)}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                  {bookings.length > 20 && (
                    <p className="text-center text-sm text-gray-500 mt-4">Showing 20 of {bookings.length} bookings</p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'issues' && (
            <motion.div key="issues" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              {loadingIssues ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">Loading issues...</p>
                  </div>
                </div>
              ) : issues.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-2xl bg-green-50 p-4 mb-3">
                    <CheckCircleIcon className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-gray-500 font-medium">No issues</p>
                  <p className="text-sm text-gray-400 mt-1">This property has no reported issues</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {issues.map((issue, idx) => {
                    const isResolved = issue.status === 'resolved'
                    return (
                      <motion.div
                        key={issue.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                        className={`rounded-lg border px-4 py-3 ${isResolved ? 'border-green-100 bg-green-50/30' : 'border-amber-100 bg-amber-50/30'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 ${isResolved ? 'text-green-500' : 'text-amber-500'}`}>
                            {isResolved ? <CheckCircleIcon className="h-5 w-5" /> : <ExclamationTriangleIcon className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                isResolved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {issue.issueType.replace(/_/g, ' ')}
                              </span>
                              <span className={`text-xs ${isResolved ? 'text-green-600' : 'text-amber-600'}`}>
                                {isResolved ? 'Resolved' : 'Open'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900">{issue.description}</p>
                            {issue.photoUrls && issue.photoUrls.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                                <CameraIcon className="h-3.5 w-3.5" />
                                {issue.photoUrls.length} photo{issue.photoUrls.length !== 1 ? 's' : ''}
                              </div>
                            )}
                            {issue.pmNotes && (
                              <div className="text-xs text-gray-500 bg-white rounded px-2 py-1.5 mt-2">
                                <span className="font-medium text-gray-600">Note:</span> {issue.pmNotes}
                              </div>
                            )}
                            <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-2">
                              {issue.reporterName && <span>Reported by {issue.reporterName}</span>}
                              <span>{formatDate(issue.createdAt)}</span>
                              {issue.resolvedAt && <span className="text-green-600">Resolved {formatDate(issue.resolvedAt)}</span>}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="flex justify-end pt-4 mt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default PreviewClientPropertyModal
