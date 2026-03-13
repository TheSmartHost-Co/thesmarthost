'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Modal from '../../shared/modal'
import { Property } from '@/services/types/property'
import { useUserStore } from '@/store/useUserStore'
import { parseLocalDate } from '@/utils/dateUtils'
import { getBookings } from '@/services/bookingService'
import { getReports } from '@/services/reportService'
import type { Booking } from '@/services/types/booking'
import type { Report } from '@/services/types/report'
import {
  HomeIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  UserGroupIcon,
  SignalIcon,
  DocumentTextIcon,
  PencilIcon,
  HashtagIcon,
  TagIcon,
  InformationCircleIcon,
  CalendarDaysIcon,
  DocumentChartBarIcon,
  WifiIcon,
  KeyIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  PhotoIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline'
import { getIssuesByProperty, formatIssueAge, getIssueTypeDisplay, getIssueStatusDisplay } from '@/services/projectIssueService'
import type { ProjectIssue, IssueType, IssueStatus } from '@/services/types/projectIssue'
import IssueDetailPanel from '@/components/turnover/issues/IssueDetailPanel'
import { useUnreadIssueIds } from '@/hooks/useUnreadIssueIds'

interface PreviewPropertyModalProps {
  isOpen: boolean
  onClose: () => void
  property: Property
  onEditProperty: () => void
  onManageLicenses?: () => void
  onManageChannels?: () => void
  onManageOwners?: () => void
  onManageICal?: () => void
}

type TabType = 'details' | 'bookings' | 'reports' | 'issues'

const PreviewPropertyModal: React.FC<PreviewPropertyModalProps> = ({
  isOpen,
  onClose,
  property,
  onEditProperty,
  onManageLicenses,
  onManageChannels,
  onManageOwners,
  onManageICal,
}) => {
  // Zustand store
  const { profile } = useUserStore()

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('details')

  // Bookings state (lazy loaded + cached)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [bookingsLoaded, setBookingsLoaded] = useState(false)

  // Reports state (lazy loaded + cached)
  const [reports, setReports] = useState<Report[]>([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [reportsLoaded, setReportsLoaded] = useState(false)

  // Issues state (lazy loaded + cached)
  const [issues, setIssues] = useState<ProjectIssue[]>([])
  const [loadingIssues, setLoadingIssues] = useState(false)
  const [issuesLoaded, setIssuesLoaded] = useState(false)
  const [selectedIssue, setSelectedIssue] = useState<ProjectIssue | null>(null)
  const [issueFilterStatus, setIssueFilterStatus] = useState<IssueStatus | 'all'>('all')
  const { unreadIssueIds, markIssueAsRead } = useUnreadIssueIds(isOpen && activeTab === 'issues')

  // Use stored license count from property data
  const licenseCount = property.licenses?.length || 0
  const channelCount = property.channels?.length || 0

  // Get primary owner name
  const primaryOwner = property.owners.find(o => o.isPrimary)

  // Helper to check if province is Quebec
  const isQuebecProperty = () => {
    const normalizedProvince = property.province?.toLowerCase().trim() || ''
    return normalizedProvince === 'quebec' || normalizedProvince === 'qc' || normalizedProvince === 'québec'
  }

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('details')
      setBookings([])
      setBookingsLoaded(false)
      setReports([])
      setReportsLoaded(false)
      setIssues([])
      setIssuesLoaded(false)
      setSelectedIssue(null)
      setIssueFilterStatus('all')
    }
  }, [isOpen])

  // Lazy load bookings when tab is clicked
  useEffect(() => {
    console.log('Bookings useEffect triggered:', { activeTab, bookingsLoaded, profileId: profile?.id, propertyId: property.id })
    if (activeTab === 'bookings' && !bookingsLoaded && profile?.id) {
      console.log('Fetching bookings...')
      fetchBookings()
    }
  }, [activeTab, bookingsLoaded, profile?.id, property.id])

  // Lazy load reports when tab is clicked
  useEffect(() => {
    if (activeTab === 'reports' && !reportsLoaded) {
      fetchReports()
    }
  }, [activeTab, reportsLoaded])

  // Lazy load issues when tab is clicked
  useEffect(() => {
    if (activeTab === 'issues' && !issuesLoaded && profile?.id) {
      fetchIssues()
    }
  }, [activeTab, issuesLoaded, profile?.id, property.id])

  const fetchBookings = async () => {
    console.log('fetchBookings called, profile:', profile?.id)
    if (!profile?.id) return
    setLoadingBookings(true)
    try {
      console.log('Calling getBookings API with:', { userId: profile.id, propertyId: property.id })
      const res = await getBookings({ userId: profile.id, propertyId: property.id })
      console.log('getBookings response:', res)
      if (res.status === 'success') {
        setBookings(res.data)
        setBookingsLoaded(true)
      }
    } catch (err) {
      console.error('Error fetching bookings:', err)
    } finally {
      setLoadingBookings(false)
    }
  }

  const fetchReports = async () => {
    setLoadingReports(true)
    try {
      const res = await getReports({ propertyId: property.id })
      if (res.status === 'success') {
        setReports(res.data)
        setReportsLoaded(true)
      }
    } catch (err) {
      console.error('Error fetching reports:', err)
    } finally {
      setLoadingReports(false)
    }
  }

  const fetchIssues = async () => {
    if (!profile?.id) return
    setLoadingIssues(true)
    try {
      const res = await getIssuesByProperty(property.id, profile.id)
      if (res.status === 'success') {
        setIssues(res.data)
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
    const date = parseLocalDate(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatShortDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = parseLocalDate(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '-'
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const getStatusBadge = () => {
    if (property.isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          Active
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
        Inactive
      </span>
    )
  }

  const getPlatformBadgeColor = (platform: string) => {
    const colors: Record<string, string> = {
      airbnb: 'bg-red-50 text-red-700',
      vrbo: 'bg-blue-50 text-blue-700',
      booking: 'bg-blue-50 text-blue-700',
      direct: 'bg-green-50 text-green-700',
      google: 'bg-yellow-50 text-yellow-700',
      hostaway: 'bg-purple-50 text-purple-700',
    }
    return colors[platform.toLowerCase()] || 'bg-gray-50 text-gray-700'
  }

  // Tab button component
  const TabButton = ({ tab, icon: Icon, label }: { tab: TabType; icon: React.ElementType; label: string }) => {
    const count = tab === 'bookings' && bookingsLoaded ? bookings.length
                : tab === 'reports' && reportsLoaded ? reports.length
                : tab === 'issues' && issuesLoaded ? issues.length
                : null

    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          transition-all duration-200
          ${activeTab === tab
            ? 'bg-gray-900 text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }
        `}
      >
        <Icon className="w-4 h-4" />
        {label}
        {count !== null && (
          <span className={`ml-1 px-1.5 py-0.5 rounded text-xs ${
            activeTab === tab ? 'bg-white/20' : 'bg-gray-200'
          }`}>
            {count}
          </span>
        )}
      </button>
    )
  }

  // Details tab content
  const DetailsTabContent = () => (
    <>
      {/* Property Information */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Property Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <HashtagIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Listing ID</p>
              <p className="text-sm font-medium text-gray-900 font-mono">{property.listingId}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-amber-600">%</span>
            </div>
            <div>
              <p className="text-xs text-gray-500">Commission Rate</p>
              <p className="text-sm font-medium text-gray-900">{property.commissionRate}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Primary Owner</p>
              <p className="text-sm font-medium text-gray-900">
                {primaryOwner?.clientName || <span className="text-gray-400">No owner</span>}
              </p>
              {property.owners.length > 1 && (
                <p className="text-xs text-gray-500">
                  +{property.owners.length - 1} co-owner{property.owners.length > 2 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <MapPinIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-sm font-medium text-gray-900">{property.address}</p>
              <p className="text-xs text-gray-500">{property.postalCode}, {property.province}</p>
            </div>
          </div>
          {/* Quebec Registration Number */}
          {isQuebecProperty() && property.registrationNumber && (
            <div className="flex items-center gap-3 col-span-2">
              <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center">
                <DocumentTextIcon className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">CITQ Registration Number</p>
                <p className="text-sm font-medium text-gray-900 font-mono">{property.registrationNumber}</p>
                <p className="text-xs text-gray-500">Quebec short-term rental registration</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Listing Names */}
      {(property.externalName || property.internalName) && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Listing Names
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {property.externalName && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TagIcon className="h-5 w-5 text-cyan-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">External Name (Public)</p>
                  <p className="text-sm font-medium text-gray-900 break-words">{property.externalName}</p>
                </div>
              </div>
            )}
            {property.internalName && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TagIcon className="h-5 w-5 text-slate-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">Internal Name (Private)</p>
                  <p className="text-sm font-medium text-gray-900 break-words">{property.internalName}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Property Specifications */}
      {(property.numBeds || property.numBedrooms || property.numBathrooms) && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Property Specifications
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {property.numBeds !== null && property.numBeds !== undefined && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Beds</p>
                  <p className="text-sm font-medium text-gray-900">{property.numBeds}</p>
                </div>
              </div>
            )}
            {property.numBedrooms !== null && property.numBedrooms !== undefined && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center">
                  <HomeIcon className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Bedrooms</p>
                  <p className="text-sm font-medium text-gray-900">{property.numBedrooms}</p>
                </div>
              </div>
            )}
            {property.numBathrooms !== null && property.numBathrooms !== undefined && (
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
      {(property.wifiSsid || property.wifiPassword || property.accessCodes) && (
        <div className="mb-6 pb-6 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            WiFi & Access
          </h3>
          <div className="space-y-4">
            {(property.wifiSsid || property.wifiPassword) && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-sky-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <WifiIcon className="h-5 w-5 text-sky-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">WiFi Credentials</p>
                  <div className="flex items-center gap-4 mt-1">
                    {property.wifiSsid && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Network:</span>
                        <span className="text-sm font-medium text-gray-900 font-mono">{property.wifiSsid}</span>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard.writeText(property.wifiSsid || '')}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
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
                          className="p-1 text-gray-400 hover:text-gray-600 rounded"
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
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <KeyIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">Access Codes</p>
                  <pre className="text-sm font-medium text-gray-900 whitespace-pre-wrap mt-1 font-mono bg-gray-50 p-2 rounded-lg">
                    {property.accessCodes}
                  </pre>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(property.accessCodes || '')}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                    Copy all codes
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={onManageLicenses}
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition-all"
          >
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <DocumentTextIcon className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Licenses</span>
            <span className="text-xs text-gray-500">{licenseCount} document{licenseCount !== 1 ? 's' : ''}</span>
          </button>
          <button
            onClick={onManageChannels}
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <SignalIcon className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Channels</span>
            <span className="text-xs text-gray-500">{channelCount} connected</span>
          </button>
          <button
            onClick={onManageOwners}
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Owners</span>
            <span className="text-xs text-gray-500">{property.owners.length} owner{property.owners.length !== 1 ? 's' : ''}</span>
          </button>
          <button
            onClick={onManageICal}
            className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-cyan-300 hover:bg-cyan-50 transition-all"
          >
            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
              <CalendarDaysIcon className="h-5 w-5 text-cyan-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">iCal Feeds</span>
          </button>
        </div>
      </div>
    </>
  )

  // Bookings tab content
  const BookingsTabContent = () => {
    if (loadingBookings) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading bookings...</p>
          </div>
        </div>
      )
    }

    if (bookings.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <CalendarDaysIcon className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No bookings found</p>
          <p className="text-sm text-gray-400 mt-1">This property has no bookings yet</p>
        </div>
      )
    }

    return (
      <div className="overflow-x-auto -mx-2">
        <table className="w-full min-w-[500px]">
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
            {bookings.slice(0, 20).map((booking, index) => (
              <motion.tr
                key={booking.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.3) }}
                className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
              >
                <td className="py-3 px-3 text-sm font-medium text-gray-900">{booking.guestName}</td>
                <td className="py-3 px-3 text-sm text-gray-600">{formatShortDate(booking.checkInDate)}</td>
                <td className="py-3 px-3 text-sm text-gray-600">{formatShortDate(booking.checkOutDate || '')}</td>
                <td className="py-3 px-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium capitalize ${getPlatformBadgeColor(booking.platform)}`}>
                    {booking.platform}
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-sm font-medium text-gray-900">
                  {formatCurrency(booking.totalPayout)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {bookings.length > 20 && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Showing 20 of {bookings.length} bookings
          </p>
        )}
      </div>
    )
  }

  // Reports tab content
  const ReportsTabContent = () => {
    if (loadingReports) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading reports...</p>
          </div>
        </div>
      )
    }

    if (reports.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <DocumentChartBarIcon className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No reports found</p>
          <p className="text-sm text-gray-400 mt-1">No reports have been generated for this property</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {reports.map((report, index) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.05, 0.3) }}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DocumentChartBarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {formatShortDate(report.startDate)} - {formatShortDate(report.endDate)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {report.availableFormats.map(format => (
                    <span
                      key={format}
                      className="px-1.5 py-0.5 bg-white rounded text-xs font-medium text-gray-600 uppercase"
                    >
                      {format}
                    </span>
                  ))}
                  {report.isMultiProperty && (
                    <span className="px-1.5 py-0.5 bg-purple-100 rounded text-xs font-medium text-purple-600">
                      Multi-property
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {formatShortDate(report.createdAt)}
            </p>
          </motion.div>
        ))}
      </div>
    )
  }

  // Issue type icons for list rendering
  const ISSUE_TYPE_ICONS: Record<IssueType, React.ElementType> = {
    damage: ExclamationTriangleIcon,
    missing_item: DocumentTextIcon,
    maintenance: DocumentTextIcon,
    other: DocumentTextIcon,
  }

  const ISSUE_STATUS_COLORS: Record<IssueStatus, { bg: string; text: string }> = {
    open: { bg: 'bg-red-100', text: 'text-red-700' },
    acknowledged: { bg: 'bg-amber-100', text: 'text-amber-700' },
    resolved: { bg: 'bg-green-100', text: 'text-green-700' },
  }

  // Issues tab content
  const IssuesTabContent = () => {
    if (loadingIssues) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading issues...</p>
          </div>
        </div>
      )
    }

    if (issues.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <ExclamationTriangleIcon className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No issues found</p>
          <p className="text-sm text-gray-400 mt-1">No issues have been reported for this property</p>
        </div>
      )
    }

    // Selected issue detail view
    if (selectedIssue) {
      return (
        <div>
          <button
            onClick={() => setSelectedIssue(null)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Back to issues
          </button>
          <IssueDetailPanel
            issue={selectedIssue}
            isPM
            onIssueUpdated={(updated) => {
              setIssues(prev => prev.map(i => i.id === updated.id ? updated : i))
              setSelectedIssue(updated)
            }}
            onIssueDeleted={(issueId) => {
              setIssues(prev => prev.filter(i => i.id !== issueId))
              setSelectedIssue(null)
            }}
            onViewed={() => markIssueAsRead(selectedIssue.id)}
          />
        </div>
      )
    }

    const filteredIssues = issueFilterStatus === 'all'
      ? issues
      : issues.filter(i => i.status === issueFilterStatus)

    const statusCounts = {
      all: issues.length,
      open: issues.filter(i => i.status === 'open').length,
      acknowledged: issues.filter(i => i.status === 'acknowledged').length,
      resolved: issues.filter(i => i.status === 'resolved').length,
    }

    return (
      <div>
        {/* Filter tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200 pb-3">
          {(['all', 'open', 'acknowledged', 'resolved'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setIssueFilterStatus(status)}
              className={`
                px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${issueFilterStatus === status
                  ? status === 'open' ? 'bg-red-100 text-red-700'
                  : status === 'acknowledged' ? 'bg-amber-100 text-amber-700'
                  : status === 'resolved' ? 'bg-green-100 text-green-700'
                  : 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              {status === 'all' ? 'All' : getIssueStatusDisplay(status).label}
              <span className="ml-1.5 text-xs opacity-60">
                ({statusCounts[status]})
              </span>
            </button>
          ))}
        </div>

        {filteredIssues.length === 0 ? (
          <div className="text-center py-8">
            <ExclamationTriangleIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No {issueFilterStatus === 'all' ? '' : issueFilterStatus} issues</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredIssues.map((issue, index) => {
              const typeInfo = getIssueTypeDisplay(issue.issueType)
              const statusColors = ISSUE_STATUS_COLORS[issue.status]
              const Icon = ISSUE_TYPE_ICONS[issue.issueType]

              return (
                <motion.button
                  key={issue.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.3) }}
                  onClick={() => setSelectedIssue(issue)}
                  className="w-full text-left p-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className={`
                      p-1.5 rounded-lg
                      ${typeInfo.color === 'red' ? 'bg-red-100 text-red-600' : ''}
                      ${typeInfo.color === 'amber' ? 'bg-amber-100 text-amber-600' : ''}
                      ${typeInfo.color === 'blue' ? 'bg-blue-100 text-blue-600' : ''}
                      ${typeInfo.color === 'purple' ? 'bg-purple-100 text-purple-600' : ''}
                      ${typeInfo.color === 'gray' ? 'bg-gray-100 text-gray-600' : ''}
                    `}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">{typeInfo.label}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors.bg} ${statusColors.text}`}>
                          {getIssueStatusDisplay(issue.status).label}
                        </span>
                        {unreadIssueIds.has(issue.id) && (
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-1">{issue.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span>{formatIssueAge(issue.createdAt)}</span>
                        {issue.reporterName && <span>by {issue.reporterName}</span>}
                        {issue.photoUrls.length > 0 && (
                          <span className="flex items-center gap-1">
                            <PhotoIcon className="w-3.5 h-3.5" />
                            {issue.photoUrls.length}
                          </span>
                        )}
                        {issue.projectDate && (
                          <span className="text-gray-400">
                            Project: {new Date(issue.projectDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-3xl w-11/12">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className={`shrink-0 h-14 w-14 rounded-xl flex items-center justify-center shadow-lg ${
            property.propertyType === 'STR'
              ? 'bg-gradient-to-br from-blue-500 to-blue-600'
              : 'bg-gradient-to-br from-purple-500 to-purple-600'
          }`}>
            {property.propertyType === 'STR' ? (
              <HomeIcon className="h-7 w-7 text-white" />
            ) : (
              <BuildingOfficeIcon className="h-7 w-7 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{property.listingName}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                property.propertyType === 'STR'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {property.propertyType === 'STR' ? 'Short-Term Rental' : 'Long-Term Rental'}
              </span>
              {getStatusBadge()}
              {property.cleaningManaged === false && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-200 text-gray-600">
                  <NoSymbolIcon className="w-3 h-3" />
                  No Cleaning
                </span>
              )}
              <span className="text-sm text-gray-500">
                Added {formatDate(property.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 pb-4 border-b border-gray-200">
        <TabButton tab="details" icon={InformationCircleIcon} label="Details" />
        <TabButton tab="bookings" icon={CalendarDaysIcon} label="Bookings" />
        <TabButton tab="reports" icon={DocumentChartBarIcon} label="Reports" />
        <TabButton tab="issues" icon={ExclamationTriangleIcon} label="Issues" />
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'details' && <DetailsTabContent />}
            {activeTab === 'bookings' && <BookingsTabContent />}
            {activeTab === 'reports' && <ReportsTabContent />}
            {activeTab === 'issues' && <IssuesTabContent />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex justify-between gap-3 pt-4 mt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onEditProperty}
          className="inline-flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PencilIcon className="h-4 w-4 mr-2" />
          Edit Property
        </button>
      </div>
    </Modal>
  )
}

export default PreviewPropertyModal
