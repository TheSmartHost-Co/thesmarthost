'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  generateReport,
  getLogos,
  uploadLogo
} from '@/services/reportService'
import type { Property } from '@/services/types/property'
import type {
  ReportFormat,
  ReportGenerationPayload,
  Logo
} from '@/services/types/report'
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
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import Modal from '@/components/shared/modal'

// Helper function to check if a property is incomplete
const isPropertyIncomplete = (property: Property): boolean => {
  return !property.listingName || !property.listingId || property.owners.length === 0
}

// Type for modal step
type ModalStep = 'form' | 'preview'

// Generated report data type
interface GeneratedReportData {
  reportId: string
  fileId: string
  downloadUrl: string
  filename: string
  format: ReportFormat
}

interface GenerateReportModalProps {
  isOpen: boolean
  onClose: () => void
  onReportGenerated: () => Promise<void>
  properties: Property[]
  initialPropertyIds?: string[]
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

const GenerateReportModal: React.FC<GenerateReportModalProps> = ({
  isOpen,
  onClose,
  onReportGenerated,
  properties,
  initialPropertyIds = []
}) => {
  const { showNotification } = useNotificationStore()

  // Form state
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [selectedLogoId, setSelectedLogoId] = useState<string>('')

  // UI state
  const [propertySearch, setPropertySearch] = useState<string>('')
  const [isPropertyDropdownOpen, setIsPropertyDropdownOpen] = useState<boolean>(false)
  const [isLogoDropdownOpen, setIsLogoDropdownOpen] = useState<boolean>(false)

  // Data state
  const [logos, setLogos] = useState<Logo[]>([])
  const [loadingLogos, setLoadingLogos] = useState<boolean>(false)

  // Modal step state (form or preview)
  const [step, setStep] = useState<ModalStep>('form')
  const [generatedReport, setGeneratedReport] = useState<GeneratedReportData | null>(null)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState<boolean>(false)

  // Loading states
  const [generating, setGenerating] = useState<boolean>(false)
  const [uploading, setUploading] = useState<boolean>(false)

  // Refs
  const propertyDropdownRef = useRef<HTMLDivElement>(null)
  const logoDropdownRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logosLoadedRef = useRef<boolean>(false)

  // Filter out incomplete properties
  const completeProperties = useMemo(() =>
    properties.filter(p => !isPropertyIncomplete(p)), [properties])
  const incompleteCount = properties.length - completeProperties.length

  // Filter properties by search
  const filteredProperties = useMemo(() =>
    completeProperties.filter(p =>
      (p.listingName ?? '').toLowerCase().includes(propertySearch.toLowerCase()) ||
      (p.address ?? '').toLowerCase().includes(propertySearch.toLowerCase())
    ), [completeProperties, propertySearch])

  // Get selected property objects
  const selectedProperties = useMemo(() =>
    properties.filter(p => selectedPropertyIds.includes(p.id)), [properties, selectedPropertyIds])

  // Get selected property for PDF preview
  const selectedProperty = useMemo(() => {
    if (format === 'pdf' && selectedPropertyIds.length === 1) {
      return properties.find(p => p.id === selectedPropertyIds[0]) || null
    }
    return null
  }, [format, selectedPropertyIds, properties])

  // Validation for generate button
  const canGenerate = useMemo(() => {
    if (!startDate || !endDate) return false
    if (format === 'pdf' && selectedPropertyIds.length !== 1) return false
    if (format !== 'pdf' && selectedPropertyIds.length === 0) return false
    return new Date(startDate) <= new Date(endDate)
  }, [format, selectedPropertyIds, startDate, endDate])

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
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const resetForm = () => {
    setFormat('pdf')
    setSelectedPropertyIds([])
    setStartDate('')
    setEndDate('')
    setSelectedPreset('')
    setSelectedLogoId('')
    setPropertySearch('')
    setIsPropertyDropdownOpen(false)
    setIsLogoDropdownOpen(false)
    // Reset preview state
    setStep('form')
    setGeneratedReport(null)
    setPdfPreviewUrl(null)
    setPreviewLoading(false)
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
    // If switching to PDF and multiple properties selected, keep only first
    if (newFormat === 'pdf' && selectedPropertyIds.length > 1) {
      setSelectedPropertyIds([selectedPropertyIds[0]])
    }
    // Clear logo if switching away from PDF
    if (newFormat !== 'pdf') {
      setSelectedLogoId('')
    }
  }

  const handlePropertyToggle = (propertyId: string) => {
    if (format === 'pdf') {
      // Single select for PDF
      setSelectedPropertyIds([propertyId])
      setIsPropertyDropdownOpen(false)
    } else {
      // Multi-select for CSV/Excel
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
    if (file) {
      handleLogoUpload(file)
    }
    e.target.value = ''
  }

  const handleGenerate = async () => {
    try {
      setGenerating(true)

      const payload: ReportGenerationPayload = {
        propertyIds: selectedPropertyIds,
        startDate,
        endDate,
        format,
        logoId: selectedLogoId || undefined,
      }

      const res = await generateReport(payload)

      if (res.status === 'success') {
        if (format === 'pdf') {
          // Store generated report data and show preview
          setGeneratedReport({
            reportId: res.data.reportId,
            fileId: res.data.fileId,
            downloadUrl: res.data.downloadUrl,
            filename: res.data.filename || `report-${startDate}-${endDate}.pdf`,
            format: res.data.format,
          })
          setPdfPreviewUrl(res.data.downloadUrl)
          setPreviewLoading(true)
          setStep('preview')
          showNotification('Report generated successfully!', 'success')
        } else {
          // CSV/Excel: download immediately and close
          showNotification('Report generated successfully!', 'success')
          triggerDownload(res.data.downloadUrl, res.data.filename)
          await onReportGenerated()
          onClose()
        }
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

  const handleDownload = () => {
    if (generatedReport) {
      triggerDownload(generatedReport.downloadUrl, generatedReport.filename)
    }
  }

  const handleClosePreview = async () => {
    await onReportGenerated()
    resetForm()
    onClose()
  }

  const selectedLogo = logos.find(l => l.id === selectedLogoId)

  // Show preview panel when in preview step with PDF
  const showPreviewPanel = step === 'preview' && format === 'pdf'

  return (
    <Modal isOpen={isOpen} onClose={onClose} style={`w-full ${showPreviewPanel ? 'max-w-5xl' : 'max-w-xl'} mx-4 transition-all duration-300`}>
      <div className="relative overflow-hidden bg-white rounded-2xl flex">
        {/* Form Panel */}
        <div className={`flex-shrink-0 ${showPreviewPanel ? 'w-[400px]' : 'w-full'} flex flex-col`}>
          {/* Header */}
          <div className="border-b border-gray-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Generate Report</h2>
                <p className="text-sm text-gray-500 mt-0.5">Create financial reports for your properties</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 px-6 py-5 overflow-y-auto max-h-[60vh]">
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

                {/* Property Dropdown */}
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

                  {/* Dropdown */}
                  <AnimatePresence>
                    {isPropertyDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                      >
                        {/* Search */}
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

                        {/* Options */}
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

                        {/* Incomplete warning */}
                        {incompleteCount > 0 && (
                          <div className="px-3 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
                            {incompleteCount} incomplete {incompleteCount === 1 ? 'property' : 'properties'} hidden
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Selected Property Tags */}
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

                {/* Validation message */}
                {format === 'pdf' && selectedPropertyIds.length > 1 && (
                  <p className="mt-2 text-xs text-red-600">PDF reports support only one property</p>
                )}
              </div>

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

                    {/* Logo Dropdown */}
                    <AnimatePresence>
                      {isLogoDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                        >
                          {/* Upload option */}
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

                          {/* No logo option */}
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

                          {/* Logo list */}
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

          {/* Footer */}
          <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50">
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleGenerate}
                disabled={!canGenerate || generating}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-medium rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* PDF Preview Panel (shown after generation) */}
        <AnimatePresence>
          {showPreviewPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="flex-1 border-l border-gray-200 flex flex-col min-w-0 overflow-hidden"
            >
              <div className="w-[500px] h-full flex flex-col">
                {/* Preview Header */}
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-rose-600" />
                    <h3 className="font-semibold text-gray-700">PDF Preview</h3>
                  </div>
                  {previewLoading && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  )}
                </div>

                {/* iframe Preview */}
                <div className="flex-1 bg-gray-100 p-4 overflow-hidden">
                  <div className="bg-white rounded-lg shadow-lg h-full overflow-hidden">
                    {pdfPreviewUrl ? (
                      <iframe
                        src={pdfPreviewUrl}
                        className="w-full h-full"
                        title="PDF Preview"
                        onLoad={() => setPreviewLoading(false)}
                        onError={() => {
                          setPreviewLoading(false)
                          showNotification('Could not load PDF preview', 'info')
                        }}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="flex items-center gap-2 text-gray-500">
                          <ArrowPathIcon className="w-5 h-5 animate-spin" />
                          <span>Loading preview...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview Footer with Actions */}
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                  <button
                    onClick={handleClosePreview}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-xl shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 transition-all"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Download PDF
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  )
}

export default GenerateReportModal
