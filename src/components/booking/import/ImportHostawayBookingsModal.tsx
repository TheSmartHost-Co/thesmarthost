'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import {
  XMarkIcon,
  CalendarDaysIcon,
  ArrowDownTrayIcon,
  CheckIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
  BuildingOffice2Icon,
  CloudArrowDownIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid'
import Modal from '@/components/shared/modal'
import { fetchReservations } from '@/services/hostawayConnectionService'
import { bulkImportBookings } from '@/services/bookingService'
import type { HostawayReservation, HostawayConnection } from '@/services/types/hostawayConnection'
import type { Property } from '@/services/types/property'
import type { BulkImportBookingPayload, Platform } from '@/services/types/booking'

interface ImportHostawayBookingsModalProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
  connection: HostawayConnection
  properties: Property[]
}

type WizardStep = 'dateRange' | 'selectBookings' | 'mapProperties' | 'import'

const STEPS: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
  { key: 'dateRange', label: 'Date Range', icon: <CalendarDaysIcon className="w-4 h-4" /> },
  { key: 'selectBookings', label: 'Select', icon: <CheckIcon className="w-4 h-4" /> },
  { key: 'mapProperties', label: 'Map', icon: <BuildingOffice2Icon className="w-4 h-4" /> },
  { key: 'import', label: 'Import', icon: <ArrowDownTrayIcon className="w-4 h-4" /> },
]

const DATE_PRESETS = [
  {
    label: 'Last Month',
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start, end }
    }
  },
  {
    label: 'Last 3 Months',
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 3, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start, end }
    }
  },
  {
    label: 'Last 6 Months',
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth() - 6, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start, end }
    }
  },
  {
    label: 'This Year',
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), 0, 1)
      return { start, end: now }
    }
  },
]

// Transform Hostaway reservation to our booking format
interface TransformedReservation {
  id: string
  reservationCode: string
  guestName: string
  guestEmail: string
  checkInDate: string
  checkOutDate: string
  numNights: number
  platform: Platform
  listingName: string
  // Financial fields (from API direct fields)
  nightlyRate: number | null
  cleaningFee: number | null
  lodgingTax: number | null
  channelFee: number | null
  totalPayout: number
  // Mapping fields
  hostawayListingId: number
  propertyId: string | null
  isDuplicate: boolean
}

// Extract financial data from Hostaway reservation
// API response has direct fields (financeField is often empty)
// Uses Airbnb-specific fields when available, falls back to generic fields
interface ExtractedFinanceData {
  nightlyRate: number | null
  cleaningFee: number | null
  lodgingTax: number | null
  channelFee: number | null
  totalPayout: number
}

const extractFinanceData = (reservation: HostawayReservation): ExtractedFinanceData => {
  // Calculate nightly rate from base price / nights
  const basePrice = reservation.airbnbListingBasePrice
  const nightlyRate = basePrice && reservation.nights > 0
    ? Math.round((basePrice / reservation.nights) * 100) / 100
    : null

  // Cleaning fee: prefer Airbnb-specific, fallback to direct field
  const cleaningFee = reservation.airbnbListingCleaningFee ?? reservation.cleaningFee ?? null

  // Lodging tax: use Airbnb occupancy tax or generic taxAmount
  const lodgingTax = reservation.airbnbTransientOccupancyTaxPaidAmount ?? reservation.taxAmount ?? null

  // Channel fee: Airbnb host fee
  const channelFee = reservation.airbnbListingHostFee ?? null

  // Total payout: prefer expected payout, then total paid, then totalPrice
  const totalPayout = reservation.airbnbExpectedPayoutAmount
    ?? reservation.airbnbTotalPaidAmount
    ?? reservation.totalPrice
    ?? 0

  return {
    nightlyRate,
    cleaningFee,
    lodgingTax,
    channelFee,
    totalPayout
  }
}

const ImportHostawayBookingsModal: React.FC<ImportHostawayBookingsModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  connection,
  properties
}) => {
  const { showNotification } = useNotificationStore()
  const { profile } = useUserStore()

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('dateRange')
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set())

  // Date range state
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedPreset, setSelectedPreset] = useState<string>('')

  // Reservations state
  const [reservations, setReservations] = useState<TransformedReservation[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Property mapping state
  const [propertyMappings, setPropertyMappings] = useState<Record<string, string>>({})

  // Loading states
  const [fetching, setFetching] = useState<boolean>(false)
  const [importing, setImporting] = useState<boolean>(false)
  const [importResults, setImportResults] = useState<{
    imported: number
    skipped: number
    duplicates: Array<{ reservationCode: string; guestName: string; checkInDate: string }>
  } | null>(null)

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setCurrentStep('dateRange')
    setCompletedSteps(new Set())
    setStartDate('')
    setEndDate('')
    setSelectedPreset('')
    setReservations([])
    setSelectedIds(new Set())
    setSearchQuery('')
    setPropertyMappings({})
    setImportResults(null)
  }

  const formatDateForInput = (date: Date): string => {
    return date.toISOString().split('T')[0]
  }

  const handlePresetSelect = (presetLabel: string) => {
    const preset = DATE_PRESETS.find(p => p.label === presetLabel)
    if (preset) {
      const { start, end } = preset.getValue()
      setStartDate(formatDateForInput(start))
      setEndDate(formatDateForInput(end))
      setSelectedPreset(presetLabel)
    }
  }

  // Map Hostaway channel name to our platform format
  const mapChannelToPlatform = (channelName: string): Platform => {
    const channelMap: Record<string, Platform> = {
      'airbnb': 'airbnb',
      'booking.com': 'booking',
      'vrbo': 'vrbo',
      'expedia': 'vrbo', // Expedia-owned
      'homeaway': 'vrbo', // HomeAway = VRBO
      'direct': 'direct',
      'google': 'google',
      'hostaway': 'hostaway'
    }
    const normalized = channelName.toLowerCase()
    return channelMap[normalized] || 'hostaway'
  }

  const handleFetchReservations = async () => {
    if (!startDate || !endDate) {
      showNotification('Please select a date range', 'error')
      return
    }

    try {
      setFetching(true)
      const res = await fetchReservations(connection.id, startDate, endDate)

      if (res.status === 'success' && res.data) {
        // Transform reservations using direct API fields
        const transformed: TransformedReservation[] = res.data.reservations.map((r: HostawayReservation) => {
          // Extract financial data from direct API fields
          const financeData = extractFinanceData(r)

          return {
            id: String(r.id),
            // Use confirmationCode (e.g., "HMNPHTP3DB") or fall back to hostawayReservationId
            reservationCode: r.confirmationCode || r.hostawayReservationId || String(r.id),
            guestName: r.guestName || `${r.guestFirstName || ''} ${r.guestLastName || ''}`.trim() || 'Unknown Guest',
            guestEmail: r.guestEmail || '',
            checkInDate: r.arrivalDate,
            checkOutDate: r.departureDate,
            numNights: r.nights || 1,
            platform: mapChannelToPlatform(r.channelName || 'hostaway'),
            listingName: r.listingName || r.externalListingName || '',
            // Financial fields from direct API fields
            nightlyRate: financeData.nightlyRate,
            cleaningFee: financeData.cleaningFee,
            lodgingTax: financeData.lodgingTax,
            channelFee: financeData.channelFee,
            totalPayout: financeData.totalPayout,
            // Mapping fields
            hostawayListingId: r.listingMapId,
            propertyId: null,
            isDuplicate: false
          }
        })

        setReservations(transformed)
        // Pre-select all non-duplicate reservations
        const allIds = new Set(transformed.map(r => r.id))
        setSelectedIds(allIds)

        showNotification(`Found ${transformed.length} reservations`, 'success')

        // Move to next step
        setCompletedSteps(prev => new Set([...prev, 'dateRange']))
        setCurrentStep('selectBookings')
      } else {
        showNotification(res.message || 'Failed to fetch reservations', 'error')
      }
    } catch (err) {
      console.error('Error fetching reservations:', err)
      showNotification('Failed to fetch reservations from Hostaway', 'error')
    } finally {
      setFetching(false)
    }
  }

  // Filter reservations based on search query
  const filteredReservations = useMemo(() => {
    if (!searchQuery.trim()) return reservations
    const query = searchQuery.toLowerCase()
    return reservations.filter(r =>
      r.guestName.toLowerCase().includes(query) ||
      r.reservationCode.toLowerCase().includes(query) ||
      r.listingName.toLowerCase().includes(query)
    )
  }, [reservations, searchQuery])

  // Selected reservations (filtered for mapping)
  const selectedReservations = useMemo(() => {
    return reservations.filter(r => selectedIds.has(r.id))
  }, [reservations, selectedIds])

  // Get unique listing names from selected reservations
  const uniqueListings = useMemo(() => {
    const listingMap = new Map<number | string, TransformedReservation>()
    selectedReservations.forEach(r => {
      const key = r.hostawayListingId || r.listingName
      if (!listingMap.has(key)) {
        listingMap.set(key, r)
      }
    })
    return Array.from(listingMap.values())
  }, [selectedReservations])

  // Check if all unique listings are mapped
  const allListingsMapped = useMemo(() => {
    return uniqueListings.every(r => {
      const key = String(r.hostawayListingId || r.listingName)
      return propertyMappings[key] && propertyMappings[key] !== ''
    })
  }, [uniqueListings, propertyMappings])

  const handleToggleReservation = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleToggleAll = () => {
    if (selectedIds.size === filteredReservations.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredReservations.map(r => r.id)))
    }
  }

  const handlePropertyMapping = (listingKey: string, propertyId: string) => {
    setPropertyMappings(prev => ({
      ...prev,
      [listingKey]: propertyId
    }))
  }

  const handleImport = async () => {
    if (!profile?.id) {
      showNotification('User not authenticated', 'error')
      return
    }

    // Build payloads with financial fields from API
    const bookingsToImport: BulkImportBookingPayload[] = selectedReservations.map(r => {
      const listingKey = String(r.hostawayListingId || r.listingName)
      const propertyId = propertyMappings[listingKey]

      return {
        propertyId,
        reservationCode: r.reservationCode,
        guestName: r.guestName,
        checkInDate: r.checkInDate,
        checkOutDate: r.checkOutDate,
        numNights: r.numNights,
        platform: r.platform,
        listingName: r.listingName,
        // Financial fields from direct API fields
        nightlyRate: r.nightlyRate ?? undefined,
        cleaningFee: r.cleaningFee ?? undefined,
        lodgingTax: r.lodgingTax ?? undefined,
        channelFee: r.channelFee ?? undefined,
        totalPayout: r.totalPayout,
      }
    })

    try {
      setImporting(true)
      const res = await bulkImportBookings(profile!.id, bookingsToImport)

      if (res.status === 'success' && res.data) {
        setImportResults({
          imported: res.data.imported,
          skipped: res.data.skipped,
          duplicates: res.data.duplicates
        })
        showNotification(res.message || 'Bookings imported successfully', 'success')
        setCompletedSteps(prev => new Set([...prev, 'mapProperties', 'import']))
      } else {
        showNotification(res.message || 'Failed to import bookings', 'error')
      }
    } catch (err) {
      console.error('Error importing bookings:', err)
      showNotification('Failed to import bookings', 'error')
    } finally {
      setImporting(false)
    }
  }

  const validateStep = (step: WizardStep): boolean => {
    switch (step) {
      case 'dateRange':
        if (!startDate || !endDate) return false
        const start = new Date(startDate)
        const end = new Date(endDate)
        return start <= end
      case 'selectBookings':
        return selectedIds.size > 0
      case 'mapProperties':
        return allListingsMapped
      case 'import':
        return true
      default:
        return false
    }
  }

  const getStepIndex = (step: WizardStep): number => {
    return STEPS.findIndex(s => s.key === step)
  }

  const goToNextStep = () => {
    const currentIndex = getStepIndex(currentStep)
    if (currentIndex < STEPS.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      setCurrentStep(STEPS[currentIndex + 1].key)
    }
  }

  const goToPrevStep = () => {
    const currentIndex = getStepIndex(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].key)
    }
  }

  const canProceed = validateStep(currentStep)
  const isLastStep = currentStep === 'import'
  const isFirstStep = currentStep === 'dateRange'

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-4xl mx-4">
      <div className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 pointer-events-none" />

        {/* Header */}
        <div className="relative border-b border-gray-100 bg-white/80 backdrop-blur-sm">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
                  Import from Hostaway
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Fetch and import historical bookings from your Hostaway account
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-1 mt-6 overflow-x-auto pb-1">
              {STEPS.map((step, index) => {
                const isActive = step.key === currentStep
                const isCompleted = completedSteps.has(step.key)
                const isPast = getStepIndex(step.key) < getStepIndex(currentStep)

                return (
                  <div key={step.key} className="flex items-center">
                    <div
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                        ${isActive
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                          : isCompleted || isPast
                            ? 'bg-gray-100 text-gray-700'
                            : 'text-gray-400'
                        }
                      `}
                    >
                      <span className={`
                        flex items-center justify-center w-5 h-5 rounded-full text-xs
                        ${isActive
                          ? 'bg-white/20'
                          : isCompleted
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200'
                        }
                      `}>
                        {isCompleted ? (
                          <CheckIcon className="w-3 h-3" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="hidden sm:inline">{step.label}</span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <ChevronRightIcon className="w-4 h-4 text-gray-300 mx-1 flex-shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative px-6 py-6 min-h-[400px] max-h-[60vh] overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            {/* Step 1: Date Range */}
            {currentStep === 'dateRange' && (
              <motion.div
                key="dateRange"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Select Date Range</h3>
                  <p className="text-sm text-gray-500">Choose the arrival date range for reservations to fetch</p>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2">
                  {DATE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handlePresetSelect(preset.label)}
                      className={`
                        px-4 py-2 rounded-lg text-sm font-medium transition-all
                        ${selectedPreset === preset.label
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                      `}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Custom Date Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value)
                        setSelectedPreset('')
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value)
                        setSelectedPreset('')
                      }}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {startDate && endDate && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-4 bg-emerald-50 rounded-xl"
                  >
                    <CalendarDaysIcon className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm text-emerald-800">
                      Fetching reservations with arrivals from <strong>{new Date(startDate).toLocaleDateString()}</strong> to <strong>{new Date(endDate).toLocaleDateString()}</strong>
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 2: Select Bookings */}
            {currentStep === 'selectBookings' && (
              <motion.div
                key="selectBookings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Select Reservations</h3>
                    <p className="text-sm text-gray-500">Choose which reservations to import</p>
                  </div>
                  {selectedIds.size > 0 && (
                    <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                      {selectedIds.size} selected
                    </span>
                  )}
                </div>

                {/* Search & Select All */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by guest, code, or listing..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <button
                    onClick={handleToggleAll}
                    className="text-sm font-medium text-emerald-600 hover:text-emerald-700 whitespace-nowrap"
                  >
                    {selectedIds.size === filteredReservations.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {/* Reservations Table */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-[300px]">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-3 w-10"></th>
                          <th className="px-3 py-3 text-left font-medium text-gray-500">Guest</th>
                          <th className="px-3 py-3 text-left font-medium text-gray-500">Code</th>
                          <th className="px-3 py-3 text-left font-medium text-gray-500">Listing</th>
                          <th className="px-3 py-3 text-left font-medium text-gray-500">Check In</th>
                          <th className="px-3 py-3 text-left font-medium text-gray-500">Nights</th>
                          <th className="px-3 py-3 text-right font-medium text-gray-500">Payout</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {filteredReservations.map((r) => {
                          const isSelected = selectedIds.has(r.id)
                          return (
                            <tr
                              key={r.id}
                              onClick={() => handleToggleReservation(r.id)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'
                              } ${r.isDuplicate ? 'opacity-50' : ''}`}
                            >
                              <td className="px-3 py-3 text-center">
                                <div className={`
                                  w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                                  ${isSelected
                                    ? 'bg-emerald-600 border-emerald-600'
                                    : 'border-gray-300 bg-white'
                                  }
                                `}>
                                  {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                                </div>
                              </td>
                              <td className="px-3 py-3 font-medium text-gray-900">{r.guestName}</td>
                              <td className="px-3 py-3 text-gray-600 font-mono text-xs">{r.reservationCode}</td>
                              <td className="px-3 py-3 text-gray-600 max-w-[150px] truncate">{r.listingName}</td>
                              <td className="px-3 py-3 text-gray-600">{new Date(r.checkInDate).toLocaleDateString()}</td>
                              <td className="px-3 py-3 text-gray-600">{r.numNights}</td>
                              <td className="px-3 py-3 text-right font-medium text-gray-900">
                                ${r.totalPayout.toLocaleString()}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  {filteredReservations.length === 0 && (
                    <div className="py-8 text-center text-gray-500">
                      {reservations.length === 0 ? 'No reservations found for this date range' : 'No reservations match your search'}
                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {/* Step 3: Map Properties */}
            {currentStep === 'mapProperties' && (
              <motion.div
                key="mapProperties"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Map to Properties</h3>
                  <p className="text-sm text-gray-500">Match Hostaway listings to your properties</p>
                </div>

                <div className="space-y-3">
                  {uniqueListings.map((listing) => {
                    const key = String(listing.hostawayListingId || listing.listingName)
                    const mappedPropertyId = propertyMappings[key] || ''
                    const bookingsCount = selectedReservations.filter(r =>
                      String(r.hostawayListingId || r.listingName) === key
                    ).length

                    return (
                      <div
                        key={key}
                        className={`p-4 border rounded-xl transition-all ${
                          mappedPropertyId ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <CloudArrowDownIcon className="w-5 h-5 text-gray-400" />
                              <span className="font-medium text-gray-900 truncate">{listing.listingName}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{bookingsCount} booking{bookingsCount !== 1 ? 's' : ''}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <select
                              value={mappedPropertyId}
                              onChange={(e) => handlePropertyMapping(key, e.target.value)}
                              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                                mappedPropertyId ? 'border-emerald-300 bg-white' : 'border-gray-300 bg-white'
                              }`}
                            >
                              <option value="">Select property...</option>
                              {properties.map((p) => (
                                <option key={p.id} value={p.id}>{p.listingName}</option>
                              ))}
                            </select>
                          </div>

                          {mappedPropertyId && (
                            <CheckCircleSolidIcon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {!allListingsMapped && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      Please map all listings to properties before continuing.
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Import */}
            {currentStep === 'import' && (
              <motion.div
                key="import"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {!importResults ? (
                  <>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-1">Review & Import</h3>
                      <p className="text-sm text-gray-500">Confirm the import details</p>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Reservations</p>
                        <p className="text-2xl font-bold text-gray-900">{selectedIds.size}</p>
                      </div>
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Properties</p>
                        <p className="text-2xl font-bold text-gray-900">{uniqueListings.length}</p>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4">
                        <p className="text-xs text-emerald-600 uppercase tracking-wide mb-1">Total Payout</p>
                        <p className="text-2xl font-bold text-emerald-700">
                          ${selectedReservations.reduce((sum, r) => sum + r.totalPayout, 0).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Property Mapping Summary */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Property Mappings</p>
                      <div className="space-y-2">
                        {uniqueListings.map((listing) => {
                          const key = String(listing.hostawayListingId || listing.listingName)
                          const propertyId = propertyMappings[key]
                          const property = properties.find(p => p.id === propertyId)
                          const count = selectedReservations.filter(r =>
                            String(r.hostawayListingId || r.listingName) === key
                          ).length

                          return (
                            <div key={key} className="flex items-center gap-2 text-sm">
                              <span className="text-gray-600 truncate flex-1">{listing.listingName}</span>
                              <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900 truncate flex-1">{property?.listingName}</span>
                              <span className="text-gray-500">({count})</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  // Import Results
                  <div className="text-center py-8">
                    <CheckCircleSolidIcon className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Import Complete!</h3>
                    <p className="text-gray-600 mb-6">
                      Successfully imported {importResults.imported} bookings
                      {importResults.skipped > 0 && ` (${importResults.skipped} duplicates skipped)`}
                    </p>

                    {importResults.duplicates.length > 0 && (
                      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                        <div className="flex items-center gap-2 mb-2">
                          <DocumentDuplicateIcon className="w-5 h-5 text-amber-600" />
                          <span className="font-medium text-amber-800">Skipped Duplicates</span>
                        </div>
                        <div className="space-y-1 text-sm text-amber-700 max-h-[150px] overflow-y-auto">
                          {importResults.duplicates.map((d, i) => (
                            <div key={i}>
                              {d.guestName} - {d.reservationCode} ({new Date(d.checkInDate).toLocaleDateString()})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        onImportComplete()
                        onClose()
                      }}
                      className="mt-6 px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-all"
                    >
                      Done
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {!importResults && (
          <div className="relative border-t border-gray-100 bg-white/80 backdrop-blur-sm px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                {!isFirstStep && (
                  <button
                    onClick={goToPrevStep}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                    Back
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Cancel
                </button>

                {currentStep === 'dateRange' ? (
                  <button
                    onClick={handleFetchReservations}
                    disabled={!canProceed || fetching}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {fetching ? (
                      <>
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <CloudArrowDownIcon className="w-5 h-5" />
                        Fetch Reservations
                      </>
                    )}
                  </button>
                ) : isLastStep ? (
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? (
                      <>
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        Import Bookings
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={goToNextStep}
                    disabled={!canProceed}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ImportHostawayBookingsModal
