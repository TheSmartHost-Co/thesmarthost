'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import {
  getLogos,
  uploadLogo,
  previewReport,
  generateReport,
} from '@/services/reportService'
import { getBookingById } from '@/services/bookingService'
import { getReportTemplateById } from '@/services/reportTemplateService'
import type { Property } from '@/services/types/property'
import type {
  ReportFormat,
  Logo,
  DateFilterMode,
  PreviewBookingRow,
  PreviewExpenseRow,
  EnhancedReportSummary,
  ReportGenerationPayload,
} from '@/services/types/report'
import type { BookingSource, Booking } from '@/services/types/booking'
import type { ReportTemplate, FullReportTemplate } from '@/services/types/reportTemplate'
import {
  XMarkIcon,
  DocumentTextIcon,
  TableCellsIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  CloudArrowUpIcon,
  RectangleStackIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import Modal from '@/components/shared/modal'
import PreviewDataStep from './PreviewDataStep'
import UpdateBookingModal from '@/components/booking/update/updateBookingModal'
import ExpenseViewerModal from '@/components/expenses/ExpenseViewerModal'

// Helper function to check if a property is incomplete
const isPropertyIncomplete = (property: Property): boolean => {
  return !property.listingName || !property.listingId || property.owners.length === 0
}

interface GenerateReportModalProps {
  isOpen: boolean
  onClose: () => void
  onReportGenerated: () => Promise<void>
  properties: Property[]
  initialPropertyIds?: string[]
  templates?: FullReportTemplate[]
}

const DATE_PRESETS = [
  {
    label: 'This Month',
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { start, end }
    }
  },
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
    label: 'Last 30 Days',
    getValue: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 30)
      return { start, end }
    }
  },
  {
    label: 'Last 90 Days',
    getValue: () => {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 90)
      return { start, end }
    }
  },
  {
    label: 'YTD',
    getValue: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), 0, 1)
      return { start, end: now }
    }
  },
]

const DATE_FILTER_MODE_OPTIONS: { value: DateFilterMode; label: string; description: string }[] = [
  { value: 'checkIn', label: 'Check-in', description: 'Bookings that start in this period' },
  { value: 'checkOut', label: 'Check-out', description: 'Bookings that end in this period' },
  { value: 'reservationCreated', label: 'Created', description: 'Bookings created in this period' },
  { value: 'calendar', label: 'Calendar', description: 'Any bookings overlapping this period' },
]

const ALL_BOOKING_SOURCES: BookingSource[] = ['csv', 'manual', 'webhook', 'ical']

const SOURCE_FILTER_OPTIONS: { value: BookingSource; label: string }[] = [
  { value: 'csv', label: 'CSV Upload' },
  { value: 'manual', label: 'Manual' },
  { value: 'webhook', label: 'Webhook (PMS)' },
  { value: 'ical', label: 'iCal' },
]

const FORMAT_OPTIONS: {
  format: ReportFormat
  label: string
  shortLabel: string
  icon: React.ReactNode
  color: string
  bgColor: string
  multiProperty: boolean
}[] = [
  {
    format: 'pdf',
    label: 'PDF Report',
    shortLabel: 'PDF',
    icon: <DocumentTextIcon className="w-5 h-5" />,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    multiProperty: false
  },
  {
    format: 'csv',
    label: 'CSV Export',
    shortLabel: 'CSV',
    icon: <TableCellsIcon className="w-5 h-5" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    multiProperty: true
  },
  {
    format: 'excel',
    label: 'Excel Workbook',
    shortLabel: 'Excel',
    icon: <TableCellsIcon className="w-5 h-5" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    multiProperty: true
  },
]

type ModalStep = 'form' | 'preview'

const STEP_LABELS = [
  { key: 'form' as const, label: 'Filters' },
  { key: 'preview' as const, label: 'Preview & Generate' },
]

const GenerateReportModal: React.FC<GenerateReportModalProps> = ({
  isOpen,
  onClose,
  onReportGenerated,
  properties,
  initialPropertyIds = [],
  templates: prefetchedTemplates
}) => {
  const { showNotification } = useNotificationStore()
  const { profile } = useUserStore()

  // ─── Step state ───
  const [step, setStep] = useState<ModalStep>('form')

  // ─── Form state ───
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [selectedLogoId, setSelectedLogoId] = useState<string>('')
  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('checkIn')
  const [sourcesFilter, setSourcesFilter] = useState<BookingSource[]>(['webhook'])

  // ─── UI state ───
  const [propertySearch, setPropertySearch] = useState<string>('')
  const [isPropertyDropdownOpen, setIsPropertyDropdownOpen] = useState<boolean>(false)
  const [isLogoDropdownOpen, setIsLogoDropdownOpen] = useState<boolean>(false)

  // ─── Data state ───
  const [logos, setLogos] = useState<Logo[]>([])
  const [loadingLogos, setLoadingLogos] = useState<boolean>(false)

  // ─── Template state ───
  const [hydratedTemplates, setHydratedTemplates] = useState<FullReportTemplate[]>([])
  const [hydrating, setHydrating] = useState<boolean>(false)
  const [availableTemplates, setAvailableTemplates] = useState<ReportTemplate[]>([])
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([])
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState<boolean>(false)
  const loadingTemplates = hydrating

  // ─── Preview state ───
  const [previewBookings, setPreviewBookings] = useState<PreviewBookingRow[]>([])
  const [previewExpenses, setPreviewExpenses] = useState<PreviewExpenseRow[]>([])
  const [previewSummary, setPreviewSummary] = useState<EnhancedReportSummary | null>(null)
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false)
  const [refreshingPreview, setRefreshingPreview] = useState<boolean>(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)

  // ─── Loading states ───
  const [generating, setGenerating] = useState<boolean>(false)
  const [uploading, setUploading] = useState<boolean>(false)

  // ─── Refs ───
  const propertyDropdownRef = useRef<HTMLDivElement>(null)
  const logoDropdownRef = useRef<HTMLDivElement>(null)
  const templateDropdownRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logosLoadedRef = useRef<boolean>(false)

  // ─── Computed values ───
  const completeProperties = useMemo(() =>
    properties.filter(p => !isPropertyIncomplete(p)), [properties])
  const incompleteCount = properties.length - completeProperties.length

  const filteredProperties = useMemo(() =>
    completeProperties.filter(p =>
      (p.listingName ?? '').toLowerCase().includes(propertySearch.toLowerCase()) ||
      (p.address ?? '').toLowerCase().includes(propertySearch.toLowerCase())
    ), [completeProperties, propertySearch])

  const selectedProperties = useMemo(() =>
    properties.filter(p => selectedPropertyIds.includes(p.id)), [properties, selectedPropertyIds])

  const canGenerate = useMemo(() => {
    if (!startDate || !endDate) return false
    if (format === 'pdf' && selectedPropertyIds.length !== 1) return false
    if (format !== 'pdf' && selectedPropertyIds.length === 0) return false
    if (sourcesFilter.length === 0) return false
    return new Date(startDate) <= new Date(endDate)
  }, [format, selectedPropertyIds, startDate, endDate, sourcesFilter])

  const isMultiSelectTemplates = format === 'excel' || format === 'csv'

  const modalWidth = step === 'form' ? 'max-w-2xl' : 'max-w-6xl'

  // ─── Effects ───

  // Load logos when modal opens
  useEffect(() => {
    if (isOpen && !logosLoadedRef.current) {
      logosLoadedRef.current = true
      loadLogos()
    }
    if (isOpen && initialPropertyIds && initialPropertyIds.length > 0) {
      setSelectedPropertyIds(initialPropertyIds)
    }
  }, [isOpen, initialPropertyIds])

  // Hydrate prefetched templates
  useEffect(() => {
    if (!isOpen || !prefetchedTemplates || prefetchedTemplates.length === 0) {
      setHydratedTemplates([])
      return
    }
    const needsHydration = prefetchedTemplates.some(t => t.assignedProperties === undefined)
    if (!needsHydration) {
      setHydratedTemplates(prefetchedTemplates)
      return
    }
    let cancelled = false
    const hydrate = async () => {
      setHydrating(true)
      try {
        const hydrated = await Promise.all(
          prefetchedTemplates.map(async (template) => {
            if (template.assignedProperties !== undefined) return template
            try {
              const res = await getReportTemplateById(template.id)
              return res.status === 'success' ? res.data : template
            } catch {
              return template
            }
          })
        )
        if (!cancelled) setHydratedTemplates(hydrated)
      } catch (error) {
        console.error('Error hydrating templates:', error)
        if (!cancelled) setHydratedTemplates(prefetchedTemplates)
      } finally {
        if (!cancelled) setHydrating(false)
      }
    }
    hydrate()
    return () => { cancelled = true }
  }, [isOpen, prefetchedTemplates])

  // Client-side template matching
  useEffect(() => {
    if (!isOpen || hydratedTemplates.length === 0) {
      if (selectedPropertyIds.length === 0) {
        setAvailableTemplates([])
        setSelectedTemplateIds([])
      }
      return
    }
    if (selectedPropertyIds.length === 0) {
      setAvailableTemplates([])
      setSelectedTemplateIds([])
      return
    }
    if (format === 'pdf' && selectedPropertyIds.length === 1) {
      const propertyId = selectedPropertyIds[0]
      const assigned = hydratedTemplates.filter(t =>
        t.assignedProperties?.some(ap => ap.propertyId === propertyId)
      )
      const templatesForPdf = assigned.length > 0 ? assigned : hydratedTemplates
      setAvailableTemplates(templatesForPdf)
      const systemDefault = templatesForPdf.find(t => t.isSystemDefault)
      if (systemDefault) {
        setSelectedTemplateIds([systemDefault.id])
      } else if (templatesForPdf.length > 0) {
        setSelectedTemplateIds([templatesForPdf[0].id])
      } else {
        setSelectedTemplateIds([])
      }
    } else if ((format === 'csv' || format === 'excel') && selectedPropertyIds.length >= 1) {
      setAvailableTemplates(hydratedTemplates)
      const matchingIds = hydratedTemplates
        .filter(t => t.assignedProperties?.some(
          ap => selectedPropertyIds.includes(ap.propertyId)
        ))
        .map(t => t.id)
      setSelectedTemplateIds(matchingIds)
    }
  }, [isOpen, selectedPropertyIds, format, hydratedTemplates])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm()
      logosLoadedRef.current = false
    }
  }, [isOpen])

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (propertyDropdownRef.current && !propertyDropdownRef.current.contains(event.target as Node)) {
        setIsPropertyDropdownOpen(false)
      }
      if (logoDropdownRef.current && !logoDropdownRef.current.contains(event.target as Node)) {
        setIsLogoDropdownOpen(false)
      }
      if (templateDropdownRef.current && !templateDropdownRef.current.contains(event.target as Node)) {
        setIsTemplateDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ─── Handlers ───

  const resetForm = () => {
    setFormat('pdf')
    setSelectedPropertyIds([])
    setStartDate('')
    setEndDate('')
    setSelectedPreset('')
    setSelectedLogoId('')
    setDateFilterMode('checkIn')
    setSourcesFilter(['webhook'])
    setPropertySearch('')
    setIsPropertyDropdownOpen(false)
    setIsLogoDropdownOpen(false)
    setSelectedTemplateIds([])
    setAvailableTemplates([])
    setIsTemplateDropdownOpen(false)
    setHydrating(false)
    // Reset preview state
    setStep('form')
    setPreviewBookings([])
    setPreviewExpenses([])
    setPreviewSummary(null)
    setLoadingPreview(false)
    setRefreshingPreview(false)
    setEditingBooking(null)
    setEditingExpenseId(null)
    setGenerating(false)
  }

  const loadLogos = async () => {
    try {
      setLoadingLogos(true)
      const res = await getLogos()
      if (res.status === 'success') {
        setLogos(res.data || [])
      }
    } catch (err) {
      console.error('Error loading logos:', err)
    } finally {
      setLoadingLogos(false)
    }
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

  const handleFormatChange = (newFormat: ReportFormat) => {
    setFormat(newFormat)
    if (newFormat === 'pdf' && selectedPropertyIds.length > 1) {
      setSelectedPropertyIds([selectedPropertyIds[0]])
    }
    if (newFormat !== 'pdf') {
      setSelectedLogoId('')
    }
  }

  const handlePropertyToggle = (propertyId: string) => {
    if (format === 'pdf') {
      setSelectedPropertyIds([propertyId])
      setIsPropertyDropdownOpen(false)
    } else {
      setSelectedPropertyIds(prev =>
        prev.includes(propertyId)
          ? prev.filter(id => id !== propertyId)
          : [...prev, propertyId]
      )
    }
  }

  const handleRemoveProperty = (propertyId: string) => {
    setSelectedPropertyIds(prev => prev.filter(id => id !== propertyId))
  }

  const handleSelectAllProperties = () => {
    if (selectedPropertyIds.length === completeProperties.length) {
      setSelectedPropertyIds([])
    } else {
      setSelectedPropertyIds(completeProperties.map(p => p.id))
    }
  }

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showNotification('Please select an image file', 'error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification('File size must be less than 5MB', 'error')
      return
    }
    try {
      setUploading(true)
      const res = await uploadLogo(file)
      if (res.status === 'success') {
        setLogos([res.data, ...logos])
        setSelectedLogoId(res.data.id)
        showNotification('Logo uploaded successfully', 'success')
      } else {
        showNotification(res.message || 'Failed to upload logo', 'error')
      }
    } catch (err) {
      console.error('Error uploading logo:', err)
      showNotification('Failed to upload logo', 'error')
    } finally {
      setUploading(false)
      setIsLogoDropdownOpen(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleLogoUpload(file)
    e.target.value = ''
  }

  const handleTemplateToggle = (templateId: string) => {
    if (isMultiSelectTemplates) {
      setSelectedTemplateIds(prev =>
        prev.includes(templateId)
          ? prev.filter(id => id !== templateId)
          : [...prev, templateId]
      )
    } else {
      setSelectedTemplateIds(prev =>
        prev.includes(templateId) ? [] : [templateId]
      )
      setIsTemplateDropdownOpen(false)
    }
  }

  const handleSelectAllTemplates = () => {
    if (selectedTemplateIds.length === availableTemplates.length) {
      setSelectedTemplateIds([])
    } else {
      setSelectedTemplateIds(availableTemplates.map(t => t.id))
    }
  }

  // ─── Step transition handlers ───

  // ─── Preview helpers ───

  const fetchPreview = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshingPreview(true)
      else setLoadingPreview(true)

      const res = await previewReport({
        propertyIds: selectedPropertyIds,
        startDate,
        endDate,
        dateFilterMode,
        sourcesFilter,
      })

      if (res.status === 'success') {
        setPreviewBookings(res.data.bookings || [])
        setPreviewExpenses(res.data.expenses || [])
        setPreviewSummary(res.data.summary || null)
        if (!isRefresh) setStep('preview')
      } else {
        showNotification(res.message || 'Failed to load preview data', 'error')
      }
    } catch (err) {
      console.error('Error loading preview:', err)
      showNotification('Failed to load preview data', 'error')
    } finally {
      setLoadingPreview(false)
      setRefreshingPreview(false)
    }
  }

  const handleFormNext = () => fetchPreview(false)
  const handleRefreshPreview = () => fetchPreview(true)

  const handleGenerate = async () => {
    try {
      setGenerating(true)

      const payload: ReportGenerationPayload = {
        propertyIds: selectedPropertyIds,
        startDate,
        endDate,
        format,
        logoId: selectedLogoId || undefined,
        templateIds: selectedTemplateIds.length > 0 ? selectedTemplateIds : [],
        dateFilterMode,
        sourcesFilter,
      }

      const res = await generateReport(payload)

      if (res.status === 'success') {
        showNotification('Report generated successfully!', 'success')
        triggerDownload(res.data.downloadUrl, res.data.filename)
        await onReportGenerated()
        onClose()
      } else {
        showNotification(res.message || 'Failed to generate report', 'error')
      }
    } catch (err) {
      console.error('Error generating report:', err)
      showNotification('Failed to generate report', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const triggerDownload = (url: string, filename?: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'report'
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleBack = () => {
    setPreviewBookings([])
    setPreviewExpenses([])
    setPreviewSummary(null)
    setStep('form')
  }

  const handleEditBooking = async (bookingId: string) => {
    if (!profile?.id) return
    try {
      const res = await getBookingById(bookingId, profile.id)
      if (res.status === 'success') {
        setEditingBooking(res.data)
      } else {
        showNotification('Failed to load booking', 'error')
      }
    } catch {
      showNotification('Failed to load booking', 'error')
    }
  }

  const handleBookingUpdated = (_updatedBooking: Booking) => {
    setEditingBooking(null)
    fetchPreview(true)
  }

  const handleExpenseUpdated = () => {
    setEditingExpenseId(null)
    fetchPreview(true)
  }

  const selectedLogo = logos.find(l => l.id === selectedLogoId)

  // ─── Step indicator ───

  const renderStepIndicator = () => {
    const currentIdx = STEP_LABELS.findIndex(s => s.key === step)
    return (
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((s, i) => {
          const isCompleted = i < currentIdx
          const isCurrent = i === currentIdx
          return (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && <div className={`w-8 h-px ${isCompleted ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
              <div className="flex items-center gap-1.5">
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold
                  ${isCompleted ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}
                `}>
                  {isCompleted ? <CheckIcon className="w-3.5 h-3.5" /> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:inline ${isCurrent ? 'text-gray-900' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ─── Render ───

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closable={!generating}
      style={`w-full ${modalWidth} mx-4 transition-all duration-300 !max-h-[90vh] !overflow-hidden`}
    >
      <div className="relative bg-white rounded-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Header */}
        <div className="border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Generate Report</h2>
              <div className="mt-2">
                {renderStepIndicator()}
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={generating}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {step === 'form' && (
            <div>
              <div className="px-6 py-5">
                <div className="space-y-6">
                  {/* Format Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Format
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {FORMAT_OPTIONS.map((option) => {
                        const isSelected = format === option.format
                        return (
                          <button
                            key={option.format}
                            onClick={() => handleFormatChange(option.format)}
                            className={`
                              relative p-3 rounded-xl border-2 text-left transition-all
                              ${isSelected
                                ? 'border-blue-500 bg-blue-50/50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                              }
                            `}
                          >
                            {isSelected && (
                              <CheckCircleIcon className="absolute -top-1.5 -right-1.5 w-5 h-5 text-blue-500" />
                            )}
                            <div className={`w-9 h-9 rounded-lg ${option.bgColor} ${option.color} flex items-center justify-center mb-2`}>
                              {option.icon}
                            </div>
                            <div className="font-medium text-gray-900 text-sm">{option.shortLabel}</div>
                            {!option.multiProperty && (
                              <div className="text-xs text-amber-600 mt-1">Single property</div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Date Range */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Date Range
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {DATE_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => handlePresetSelect(preset.label)}
                          className={`
                            px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                            ${selectedPreset === preset.label
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }
                          `}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">Start</label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value)
                            setSelectedPreset('')
                          }}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1.5">End</label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            setEndDate(e.target.value)
                            setSelectedPreset('')
                          }}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Date Filter Mode */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Filter Bookings By
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DATE_FILTER_MODE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setDateFilterMode(option.value)}
                          title={option.description}
                          className={`
                            px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                            ${dateFilterMode === option.value
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }
                          `}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500">
                      {DATE_FILTER_MODE_OPTIONS.find(o => o.value === dateFilterMode)?.description}
                    </p>
                  </div>

                  {/* Booking Source Filter */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Booking Sources
                      </label>
                      <button
                        onClick={() => {
                          if (sourcesFilter.length === ALL_BOOKING_SOURCES.length) {
                            setSourcesFilter([])
                          } else {
                            setSourcesFilter([...ALL_BOOKING_SOURCES])
                          }
                        }}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        {sourcesFilter.length === ALL_BOOKING_SOURCES.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SOURCE_FILTER_OPTIONS.map((option) => {
                        const isSelected = sourcesFilter.includes(option.value)
                        return (
                          <button
                            key={option.value}
                            onClick={() => {
                              if (isSelected) {
                                setSourcesFilter(prev => prev.filter(s => s !== option.value))
                              } else {
                                setSourcesFilter(prev => [...prev, option.value])
                              }
                            }}
                            className={`
                              px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5
                              ${isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }
                            `}
                          >
                            {isSelected && <CheckIcon className="w-3.5 h-3.5" />}
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                    {sourcesFilter.length === 0 && (
                      <p className="mt-1.5 text-xs text-red-500">Select at least one booking source</p>
                    )}
                    {sourcesFilter.length > 0 && sourcesFilter.length < ALL_BOOKING_SOURCES.length && (
                      <p className="mt-1.5 text-xs text-gray-500">
                        Only {sourcesFilter.map(s => SOURCE_FILTER_OPTIONS.find(o => o.value === s)?.label).join(', ')} bookings will be included
                      </p>
                    )}
                  </div>

                  {/* Properties */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {format === 'pdf' ? 'Property' : 'Properties'}
                      </label>
                      {format !== 'pdf' && completeProperties.length > 0 && (
                        <button
                          onClick={handleSelectAllProperties}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          {selectedPropertyIds.length === completeProperties.length ? 'Deselect All' : 'Select All'}
                        </button>
                      )}
                    </div>

                    <div ref={propertyDropdownRef} className="relative">
                      <button
                        onClick={() => setIsPropertyDropdownOpen(!isPropertyDropdownOpen)}
                        className={`
                          w-full px-3 py-2.5 border rounded-lg text-left flex items-center justify-between transition-all text-sm
                          ${isPropertyDropdownOpen
                            ? 'border-blue-500 ring-2 ring-blue-500/20'
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <span className={selectedPropertyIds.length > 0 ? 'text-gray-900' : 'text-gray-400'}>
                          {selectedPropertyIds.length > 0
                            ? `${selectedPropertyIds.length} ${selectedPropertyIds.length === 1 ? 'property' : 'properties'} selected`
                            : 'Select properties...'}
                        </span>
                        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isPropertyDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {isPropertyDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                          >
                            <div className="p-2 border-b border-gray-100">
                              <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="Search properties..."
                                  value={propertySearch}
                                  onChange={(e) => setPropertySearch(e.target.value)}
                                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                                />
                              </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto py-1">
                              {filteredProperties.length === 0 ? (
                                <div className="px-3 py-6 text-center text-sm text-gray-500">
                                  {completeProperties.length === 0
                                    ? 'No complete properties available'
                                    : 'No properties match your search'}
                                </div>
                              ) : (
                                filteredProperties.map((property) => {
                                  const isSelected = selectedPropertyIds.includes(property.id)
                                  return (
                                    <button
                                      key={property.id}
                                      onClick={() => handlePropertyToggle(property.id)}
                                      className={`
                                        w-full px-3 py-2.5 flex items-center justify-between text-left transition-colors
                                        ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                                      `}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className={`text-sm font-medium truncate ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                                          {property.listingName}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">{property.address}</div>
                                      </div>
                                      {isSelected && (
                                        <CheckIcon className="w-4 h-4 text-blue-600 flex-shrink-0 ml-2" />
                                      )}
                                    </button>
                                  )
                                })
                              )}
                            </div>
                            {incompleteCount > 0 && (
                              <div className="px-3 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
                                {incompleteCount} incomplete {incompleteCount === 1 ? 'property' : 'properties'} hidden
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {selectedPropertyIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selectedProperties.map((property) => (
                          <span
                            key={property.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full text-sm border border-amber-200"
                          >
                            <BuildingOffice2Icon className="w-3.5 h-3.5" />
                            <span className="max-w-[120px] truncate">{property.listingName}</span>
                            <button
                              onClick={() => handleRemoveProperty(property.id)}
                              className="p-0.5 hover:bg-amber-200 rounded-full transition-colors"
                            >
                              <XMarkIcon className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {format === 'pdf' && selectedPropertyIds.length > 1 && (
                      <p className="mt-2 text-xs text-red-600">PDF reports support only one property</p>
                    )}
                  </div>

                  {/* Report Template Selector */}
                  {selectedPropertyIds.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          <RectangleStackIcon className="w-4 h-4 inline-block mr-1" />
                          {isMultiSelectTemplates ? 'Report Templates' : 'Report Template'} <span className="font-normal text-gray-400">(Optional)</span>
                        </label>
                        {isMultiSelectTemplates && availableTemplates.length > 0 && !isTemplateDropdownOpen && (
                          <button
                            onClick={handleSelectAllTemplates}
                            className="text-xs font-medium text-blue-600 hover:text-blue-700"
                          >
                            {selectedTemplateIds.length === availableTemplates.length ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                      </div>

                      <div ref={templateDropdownRef} className="relative">
                        <button
                          onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                          disabled={loadingTemplates}
                          className={`
                            w-full px-3 py-2.5 border rounded-lg text-left flex items-center justify-between transition-all text-sm
                            ${isTemplateDropdownOpen
                              ? 'border-blue-500 ring-2 ring-blue-500/20'
                              : 'border-gray-200 hover:border-gray-300'
                            }
                            ${loadingTemplates ? 'opacity-50 cursor-wait' : ''}
                          `}
                        >
                          <span className={selectedTemplateIds.length > 0 ? 'text-gray-900' : 'text-gray-400'}>
                            {loadingTemplates
                              ? 'Loading templates...'
                              : selectedTemplateIds.length > 0
                                ? isMultiSelectTemplates
                                  ? `${selectedTemplateIds.length} template${selectedTemplateIds.length > 1 ? 's' : ''} selected`
                                  : availableTemplates.find(t => t.id === selectedTemplateIds[0])?.name || 'Select template...'
                                : 'Default (no custom template)'}
                          </span>
                          {loadingTemplates ? (
                            <ArrowPathIcon className="w-4 h-4 text-gray-400 animate-spin" />
                          ) : (
                            <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isTemplateDropdownOpen ? 'rotate-180' : ''}`} />
                          )}
                        </button>

                        <AnimatePresence>
                          {isTemplateDropdownOpen && !loadingTemplates && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.15 }}
                              className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                            >
                              {isMultiSelectTemplates && availableTemplates.length > 0 && (
                                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                                  <button
                                    onClick={handleSelectAllTemplates}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                  >
                                    {selectedTemplateIds.length === availableTemplates.length ? 'Deselect All' : 'Select All'}
                                  </button>
                                  <span className="text-xs text-gray-500">
                                    {selectedTemplateIds.length} of {availableTemplates.length} selected
                                  </span>
                                </div>
                              )}

                              <button
                                onClick={() => {
                                  setSelectedTemplateIds([])
                                  if (!isMultiSelectTemplates) setIsTemplateDropdownOpen(false)
                                }}
                                className={`
                                  w-full px-3 py-2.5 flex items-center justify-between text-left transition-colors border-b border-gray-100
                                  ${selectedTemplateIds.length === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}
                                `}
                              >
                                <div>
                                  <span className={`text-sm ${selectedTemplateIds.length === 0 ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                                    Default (no custom template)
                                  </span>
                                  <p className="text-xs text-gray-500 mt-0.5">Use standard report format</p>
                                </div>
                                {selectedTemplateIds.length === 0 && <CheckIcon className="w-4 h-4 text-blue-600" />}
                              </button>

                              <div className="max-h-48 overflow-y-auto">
                                {availableTemplates.length === 0 ? (
                                  <div className="px-3 py-4 text-center text-sm text-gray-500">
                                    No templates available
                                  </div>
                                ) : (
                                  <>
                                    {availableTemplates.filter(t => t.isSystemTemplate).length > 0 && (
                                      <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        System Templates
                                      </div>
                                    )}
                                    {availableTemplates
                                      .filter(t => t.isSystemTemplate)
                                      .map((template) => {
                                        const isSelected = selectedTemplateIds.includes(template.id)
                                        return (
                                          <button
                                            key={template.id}
                                            onClick={() => handleTemplateToggle(template.id)}
                                            className={`
                                              w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors
                                              ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                                            `}
                                          >
                                            {isMultiSelectTemplates && (
                                              <div className={`
                                                w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                                                ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}
                                              `}>
                                                {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                                              </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                              <div className="flex items-center gap-2">
                                                <span className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                                                  {template.name}
                                                </span>
                                                {template.isSystemDefault && (
                                                  <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Default</span>
                                                )}
                                              </div>
                                              {template.description && (
                                                <p className="text-xs text-gray-500 mt-0.5 truncate">{template.description}</p>
                                              )}
                                            </div>
                                            {!isMultiSelectTemplates && isSelected && (
                                              <CheckIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                            )}
                                          </button>
                                        )
                                      })}

                                    {availableTemplates.filter(t => !t.isSystemTemplate).length > 0 && (
                                      <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Custom Templates
                                      </div>
                                    )}
                                    {availableTemplates
                                      .filter(t => !t.isSystemTemplate)
                                      .map((template) => {
                                        const isSelected = selectedTemplateIds.includes(template.id)
                                        return (
                                          <button
                                            key={template.id}
                                            onClick={() => handleTemplateToggle(template.id)}
                                            className={`
                                              w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors
                                              ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                                            `}
                                          >
                                            {isMultiSelectTemplates && (
                                              <div className={`
                                                w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                                                ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}
                                              `}>
                                                {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                                              </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                              <span className={`text-sm font-medium ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                                                {template.name}
                                              </span>
                                              {template.description && (
                                                <p className="text-xs text-gray-500 mt-0.5 truncate">{template.description}</p>
                                              )}
                                            </div>
                                            {!isMultiSelectTemplates && isSelected && (
                                              <CheckIcon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                            )}
                                          </button>
                                        )
                                      })}
                                  </>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {isMultiSelectTemplates && selectedTemplateIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {selectedTemplateIds.map((templateId) => {
                            const template = availableTemplates.find(t => t.id === templateId)
                            if (!template) return null
                            return (
                              <span
                                key={templateId}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 rounded-full text-sm border border-blue-200"
                              >
                                <RectangleStackIcon className="w-3.5 h-3.5" />
                                <span className="max-w-[120px] truncate">{template.name}</span>
                                <button
                                  onClick={() => handleTemplateToggle(templateId)}
                                  className="p-0.5 hover:bg-blue-200 rounded-full transition-colors"
                                >
                                  <XMarkIcon className="w-3 h-3" />
                                </button>
                              </span>
                            )
                          })}
                        </div>
                      )}

                      {selectedTemplateIds.length > 0 && (
                        <p className="mt-2 text-xs text-gray-500">
                          {isMultiSelectTemplates
                            ? `Report will use custom calculations from ${selectedTemplateIds.length} selected template${selectedTemplateIds.length > 1 ? 's' : ''}`
                            : 'Report will use custom calculations from the selected template'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Logo (PDF only) */}
                  {format === 'pdf' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Branding <span className="font-normal text-gray-400">(Optional)</span>
                      </label>

                      <div ref={logoDropdownRef} className="relative">
                        <button
                          onClick={() => setIsLogoDropdownOpen(!isLogoDropdownOpen)}
                          className={`
                            w-full px-3 py-2.5 border rounded-lg text-left flex items-center justify-between transition-all
                            ${isLogoDropdownOpen
                              ? 'border-blue-500 ring-2 ring-blue-500/20'
                              : 'border-gray-200 hover:border-gray-300'
                            }
                          `}
                        >
                          {selectedLogo ? (
                            <div className="flex items-center gap-2">
                              <img src={selectedLogo.logoUrl} alt="" className="w-6 h-6 object-contain rounded" />
                              <span className="text-gray-900 text-sm truncate max-w-[200px]">{selectedLogo.originalName}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No logo selected</span>
                          )}
                          <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isLogoDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {isLogoDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.15 }}
                              className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                            >
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="w-full px-3 py-2.5 flex items-center gap-2 text-amber-600 hover:bg-amber-50 border-b border-gray-100 transition-colors"
                              >
                                {uploading ? (
                                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                ) : (
                                  <CloudArrowUpIcon className="w-4 h-4" />
                                )}
                                <span className="text-sm font-medium">
                                  {uploading ? 'Uploading...' : 'Upload new logo'}
                                </span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedLogoId('')
                                  setIsLogoDropdownOpen(false)
                                }}
                                className={`
                                  w-full px-3 py-2.5 flex items-center justify-between text-left transition-colors
                                  ${!selectedLogoId ? 'bg-blue-50' : 'hover:bg-gray-50'}
                                `}
                              >
                                <span className={`text-sm ${!selectedLogoId ? 'text-blue-700 font-medium' : 'text-gray-600'}`}>
                                  No logo
                                </span>
                                {!selectedLogoId && <CheckIcon className="w-4 h-4 text-blue-600" />}
                              </button>

                              {loadingLogos ? (
                                <div className="px-3 py-4 flex justify-center">
                                  <ArrowPathIcon className="w-5 h-5 text-gray-400 animate-spin" />
                                </div>
                              ) : (
                                <div className="max-h-40 overflow-y-auto">
                                  {logos.map((logo) => {
                                    const isSelected = selectedLogoId === logo.id
                                    return (
                                      <button
                                        key={logo.id}
                                        onClick={() => {
                                          setSelectedLogoId(logo.id)
                                          setIsLogoDropdownOpen(false)
                                        }}
                                        className={`
                                          w-full px-3 py-2.5 flex items-center justify-between text-left transition-colors
                                          ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                                        `}
                                      >
                                        <div className="flex items-center gap-2">
                                          <img src={logo.logoUrl} alt="" className="w-8 h-8 object-contain rounded border border-gray-200" />
                                          <span className={`text-sm truncate max-w-[180px] ${isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                                            {logo.originalName}
                                          </span>
                                        </div>
                                        {isSelected && <CheckIcon className="w-4 h-4 text-blue-600" />}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileInputChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {step === 'preview' && previewSummary && (
            <div className="h-full px-6 py-5 flex flex-col overflow-hidden">
              <PreviewDataStep
                bookings={previewBookings}
                expenses={previewExpenses}
                summary={previewSummary}
                generating={generating}
                onGenerate={handleGenerate}
                onRefresh={handleRefreshPreview}
                refreshing={refreshingPreview}
                onBack={handleBack}
                onEditBooking={handleEditBooking}
                onEditExpense={(id) => setEditingExpenseId(id)}
              />
            </div>
          )}
        </div>

        {/* Form Footer - outside scroll area */}
        {step === 'form' && (
          <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50 shrink-0">
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFormNext}
                disabled={!canGenerate || loadingPreview}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingPreview ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Loading Data...
                  </>
                ) : (
                  <>
                    Next
                    <SparklesIcon className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Booking Update Modal */}
      {editingBooking && (
        <UpdateBookingModal
          isOpen={true}
          onClose={() => setEditingBooking(null)}
          booking={editingBooking}
          onUpdate={handleBookingUpdated}
        />
      )}

      {/* Expense Viewer Modal */}
      {editingExpenseId && (
        <ExpenseViewerModal
          isOpen={true}
          onClose={() => setEditingExpenseId(null)}
          expenseId={editingExpenseId}
          onExpenseUpdated={handleExpenseUpdated}
          onExpenseDeleted={() => {
            setEditingExpenseId(null)
            fetchPreview(true)
          }}
        />
      )}
    </Modal>
  )
}

export default GenerateReportModal
