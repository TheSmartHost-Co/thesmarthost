'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  previewReport,
  generateReport,
  getLogos,
  uploadLogo
} from '@/services/reportService'
import type { Property } from '@/services/types/property'
import type {
  ReportFormat,
  ReportGenerationPayload,
  Logo,
  BookingData,
  EnhancedReportSummary
} from '@/services/types/report'
import {
  XMarkIcon,
  DocumentIcon,
  DocumentTextIcon,
  TableCellsIcon,
  CloudArrowUpIcon,
  CheckIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  PhotoIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import Modal from '@/components/shared/modal'

interface GenerateReportModalProps {
  isOpen: boolean
  onClose: () => void
  onReportGenerated: () => Promise<void>
  properties: Property[]
  initialPropertyIds?: string[]
}

type WizardStep = 'format' | 'properties' | 'dateRange' | 'logo' | 'preview'

const STEPS: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
  { key: 'format', label: 'Format', icon: <DocumentIcon className="w-4 h-4" /> },
  { key: 'properties', label: 'Properties', icon: <BuildingOffice2Icon className="w-4 h-4" /> },
  { key: 'dateRange', label: 'Date Range', icon: <CalendarDaysIcon className="w-4 h-4" /> },
  { key: 'logo', label: 'Branding', icon: <PhotoIcon className="w-4 h-4" /> },
  { key: 'preview', label: 'Review', icon: <SparklesIcon className="w-4 h-4" /> },
]

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
    label: 'Year to Date',
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
  description: string
  icon: React.ReactNode
  color: string
  multiProperty: boolean
}[] = [
  {
    format: 'pdf',
    label: 'PDF Report',
    description: 'Professional formatted report with charts and branding',
    icon: <DocumentTextIcon className="w-8 h-8" />,
    color: 'from-red-500 to-rose-600',
    multiProperty: false
  },
  {
    format: 'csv',
    label: 'CSV Export',
    description: 'Raw data export for spreadsheet analysis',
    icon: <TableCellsIcon className="w-8 h-8" />,
    color: 'from-emerald-500 to-teal-600',
    multiProperty: true
  },
  {
    format: 'excel',
    label: 'Excel Workbook',
    description: 'Formatted spreadsheet with multiple sheets',
    icon: <TableCellsIcon className="w-8 h-8" />,
    color: 'from-green-500 to-emerald-600',
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

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('format')
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set())

  // Form state
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [selectedLogoId, setSelectedLogoId] = useState<string>('')
  const [propertySearch, setPropertySearch] = useState<string>('')
  const [selectedPreset, setSelectedPreset] = useState<string>('')

  // Data state
  const [logos, setLogos] = useState<Logo[]>([])
  const [loadingLogos, setLoadingLogos] = useState<boolean>(false)

  // Preview state
  const [previewData, setPreviewData] = useState<{
    pdf?: string
    bookings?: (BookingData & { propertyName: string })[]
    summary?: EnhancedReportSummary
    properties?: any[]
  } | null>(null)

  // Loading states
  const [previewing, setPreviewing] = useState<boolean>(false)
  const [generating, setGenerating] = useState<boolean>(false)
  const [uploading, setUploading] = useState<boolean>(false)

  // Drag and drop state
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const logosLoadedRef = useRef<boolean>(false)

  // Load logos when modal opens
  useEffect(() => {
    if (isOpen && !logosLoadedRef.current) {
      logosLoadedRef.current = true
      loadLogos()
    }

    if (isOpen && initialPropertyIds && initialPropertyIds.length > 0) {
      setSelectedPropertyIds(initialPropertyIds)
    }
  }, [isOpen])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm()
      logosLoadedRef.current = false
    }
  }, [isOpen])

  const resetForm = () => {
    setCurrentStep('format')
    setCompletedSteps(new Set())
    setSelectedPropertyIds([])
    setStartDate('')
    setEndDate('')
    setFormat('pdf')
    setSelectedLogoId('')
    setPropertySearch('')
    setSelectedPreset('')
    setPreviewData(null)
  }

  const loadLogos = async () => {
    try {
      setLoadingLogos(true)
      const res = await getLogos()
      if (res.status === 'success') {
        setLogos(res.data || [])
      } else {
        showNotification(res.message || 'Failed to load logos', 'error')
      }
    } catch (err) {
      console.error('Error loading logos:', err)
      showNotification('Failed to load logos', 'error')
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

  const validateStep = (step: WizardStep): boolean => {
    switch (step) {
      case 'format':
        return !!format
      case 'properties':
        if (format === 'pdf') {
          return selectedPropertyIds.length === 1
        }
        return selectedPropertyIds.length > 0
      case 'dateRange':
        if (!startDate || !endDate) return false
        const start = new Date(startDate)
        const end = new Date(endDate)
        return start <= end
      case 'logo':
        return true // Logo is optional
      case 'preview':
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

  const goToStep = (step: WizardStep) => {
    const targetIndex = getStepIndex(step)
    const currentIndex = getStepIndex(currentStep)

    // Can only go back or to completed steps
    if (targetIndex <= currentIndex || completedSteps.has(step)) {
      setCurrentStep(step)
    }
  }

  const buildPayload = (): ReportGenerationPayload => {
    return {
      propertyIds: selectedPropertyIds,
      startDate,
      endDate,
      format,
      logoId: selectedLogoId || undefined,
    }
  }

  const handlePreview = async () => {
    try {
      setPreviewing(true)
      setPreviewData(null)

      const payload = buildPayload()
      const res = await previewReport(payload)

      if (res.status === 'success') {
        if (res.data.pdfPreview) {
          setPreviewData({
            pdf: res.data.pdfPreview,
            bookings: undefined,
            summary: res.data.summary,
            properties: res.data.properties || []
          })
        } else if (res.data.reportData) {
          setPreviewData({
            pdf: undefined,
            bookings: res.data.reportData.bookings || [],
            summary: res.data.reportData.summary,
            properties: res.data.reportData.properties || []
          })
        } else {
          setPreviewData({
            pdf: undefined,
            bookings: [],
            summary: res.data.summary,
            properties: res.data.properties || []
          })
        }
        showNotification('Preview generated', 'success')
      } else {
        showNotification(res.message || 'Failed to generate preview', 'error')
      }
    } catch (err) {
      console.error('Error generating preview:', err)
      showNotification('Failed to generate preview', 'error')
    } finally {
      setPreviewing(false)
    }
  }

  const handleGenerate = async () => {
    try {
      setGenerating(true)

      const payload = buildPayload()
      const res = await generateReport(payload)

      if (res.status === 'success') {
        showNotification('Report generated successfully!', 'success')
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
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleLogoUpload(file)
    }
    e.target.value = ''
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleLogoUpload(file)
    }
  }, [logos])

  const handlePropertyToggle = (propertyId: string) => {
    if (format === 'pdf') {
      setSelectedPropertyIds([propertyId])
    } else {
      setSelectedPropertyIds(prev =>
        prev.includes(propertyId)
          ? prev.filter(id => id !== propertyId)
          : [...prev, propertyId]
      )
    }
  }

  const handleSelectAllProperties = () => {
    if (selectedPropertyIds.length === properties.length) {
      setSelectedPropertyIds([])
    } else {
      setSelectedPropertyIds(properties.map(p => p.id))
    }
  }

  const filteredProperties = properties.filter(p =>
    p.listingName.toLowerCase().includes(propertySearch.toLowerCase()) ||
    p.address.toLowerCase().includes(propertySearch.toLowerCase())
  )

  const getSelectedPropertyNames = () => {
    return properties
      .filter(p => selectedPropertyIds.includes(p.id))
      .map(p => p.listingName)
  }

  const canProceed = validateStep(currentStep)
  const isLastStep = currentStep === 'preview'
  const isFirstStep = currentStep === 'format'

  // Animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-4xl mx-4">
      <div className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 pointer-events-none" />

        {/* Header */}
        <div className="relative border-b border-gray-100 bg-white/80 backdrop-blur-sm">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
                  Generate Report
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Create professional financial reports for your properties
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
                    <button
                      onClick={() => goToStep(step.key)}
                      disabled={!isCompleted && !isPast && !isActive}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                        ${isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                          : isCompleted || isPast
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'text-gray-400 cursor-not-allowed'
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
                    </button>
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
        <div className="relative px-6 py-6 min-h-[400px]">
          <AnimatePresence mode="wait" initial={false}>
            {/* Step 1: Format Selection */}
            {currentStep === 'format' && (
              <motion.div
                key="format"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Choose Report Format</h3>
                  <p className="text-sm text-gray-500">Select the output format for your financial report</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                  {FORMAT_OPTIONS.map((option) => {
                    const isSelected = format === option.format
                    return (
                      <motion.button
                        key={option.format}
                        onClick={() => setFormat(option.format)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`
                          relative p-5 rounded-2xl border-2 text-left transition-all
                          ${isSelected
                            ? 'border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-500/10'
                            : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'
                          }
                        `}
                      >
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2 -right-2"
                          >
                            <CheckCircleIcon className="w-6 h-6 text-blue-500" />
                          </motion.div>
                        )}
                        <div className={`
                          w-14 h-14 rounded-xl bg-gradient-to-br ${option.color}
                          flex items-center justify-center text-white mb-4 shadow-lg
                        `}>
                          {option.icon}
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1">{option.label}</h4>
                        <p className="text-sm text-gray-500">{option.description}</p>
                        {!option.multiProperty && (
                          <span className="inline-block mt-3 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-full">
                            Single property only
                          </span>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 2: Property Selection */}
            {currentStep === 'properties' && (
              <motion.div
                key="properties"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {format === 'pdf' ? 'Select Property' : 'Select Properties'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {format === 'pdf'
                        ? 'Choose one property for your PDF report'
                        : 'Choose one or more properties to include'
                      }
                    </p>
                  </div>
                  {selectedPropertyIds.length > 0 && (
                    <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      {selectedPropertyIds.length} selected
                    </span>
                  )}
                </div>

                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search properties..."
                    value={propertySearch}
                    onChange={(e) => setPropertySearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* Select All (for multi-select) */}
                {format !== 'pdf' && (
                  <button
                    onClick={handleSelectAllProperties}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {selectedPropertyIds.length === properties.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}

                {/* Property Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-1">
                  {filteredProperties.map((property) => {
                    const isSelected = selectedPropertyIds.includes(property.id)
                    return (
                      <motion.button
                        key={property.id}
                        onClick={() => handlePropertyToggle(property.id)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`
                          flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all
                          ${isSelected
                            ? 'border-blue-500 bg-blue-50/50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                          }
                        `}
                      >
                        <div className={`
                          w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                          ${isSelected
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-500'
                          }
                        `}>
                          <BuildingOffice2Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-gray-900 truncate">{property.listingName}</h4>
                          <p className="text-sm text-gray-500 truncate">{property.address}</p>
                        </div>
                        {isSelected && (
                          <CheckCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        )}
                      </motion.button>
                    )
                  })}
                </div>

                {filteredProperties.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No properties match your search
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Date Range */}
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
                  <p className="text-sm text-gray-500">Choose the reporting period</p>
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
                          ? 'bg-blue-600 text-white shadow-md'
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
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {startDate && endDate && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-4 bg-blue-50 rounded-xl"
                  >
                    <CalendarDaysIcon className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      Reporting period: <strong>{new Date(startDate).toLocaleDateString()}</strong> to <strong>{new Date(endDate).toLocaleDateString()}</strong>
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step 4: Logo Selection */}
            {currentStep === 'logo' && (
              <motion.div
                key="logo"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Add Your Branding</h3>
                    <p className="text-sm text-gray-500">Optional: Include your company logo on the report</p>
                  </div>
                  {selectedLogoId && (
                    <button
                      onClick={() => setSelectedLogoId('')}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear selection
                    </button>
                  )}
                </div>

                {/* Upload Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                    ${isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
                    }
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  {uploading ? (
                    <div className="flex flex-col items-center">
                      <ArrowPathIcon className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                      <p className="text-sm text-gray-600">Uploading...</p>
                    </div>
                  ) : (
                    <>
                      <CloudArrowUpIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                    </>
                  )}
                </div>

                {/* Logo Gallery */}
                {loadingLogos ? (
                  <div className="flex justify-center py-8">
                    <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin" />
                  </div>
                ) : logos.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Your Logos</p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                      {logos.map((logo) => {
                        const isSelected = selectedLogoId === logo.id
                        return (
                          <motion.button
                            key={logo.id}
                            onClick={() => setSelectedLogoId(isSelected ? '' : logo.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`
                              relative aspect-square rounded-xl border-2 p-2 transition-all overflow-hidden
                              ${isSelected
                                ? 'border-blue-500 bg-blue-50 shadow-lg'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                              }
                            `}
                          >
                            {isSelected && (
                              <div className="absolute top-1 right-1">
                                <CheckCircleIcon className="w-4 h-4 text-blue-500" />
                              </div>
                            )}
                            <img
                              src={logo.logoUrl}
                              alt={logo.originalName}
                              className="w-full h-full object-contain"
                            />
                          </motion.button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {!selectedLogoId && (
                  <p className="text-sm text-gray-400 text-center py-2">
                    Skip this step to generate a report without a logo
                  </p>
                )}
              </motion.div>
            )}

            {/* Step 5: Preview */}
            {currentStep === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Review & Generate</h3>
                  <p className="text-sm text-gray-500">Confirm your report settings</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Format</p>
                    <p className="font-semibold text-gray-900">{format.toUpperCase()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Properties</p>
                    <p className="font-semibold text-gray-900">{selectedPropertyIds.length}</p>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date Range</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Branding</p>
                    <p className="font-semibold text-gray-900">{selectedLogoId ? 'Custom Logo' : 'None'}</p>
                  </div>
                </div>

                {/* Selected Properties List */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Selected Properties</p>
                  <div className="flex flex-wrap gap-2">
                    {getSelectedPropertyNames().map((name, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-sm text-gray-700 border border-gray-200">
                        <BuildingOffice2Icon className="w-4 h-4 text-gray-400" />
                        {name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Preview Button */}
                {!previewData && (
                  <button
                    onClick={handlePreview}
                    disabled={previewing}
                    className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {previewing ? (
                      <>
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        Generating Preview...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="w-5 h-5" />
                        Generate Preview
                      </>
                    )}
                  </button>
                )}

                {/* Preview Content */}
                {previewData && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Financial Summary */}
                    {previewData.summary && (
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-transparent border-b border-gray-100">
                          <h4 className="font-semibold text-gray-900">Financial Summary</h4>
                        </div>
                        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Total Revenue</p>
                            <p className="text-lg font-bold text-gray-900">
                              ${(previewData.summary.overall?.totalRevenue || previewData.summary.totalRevenue || 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Total Payout</p>
                            <p className="text-lg font-bold text-blue-600">
                              ${(previewData.summary.overall?.totalPayout || previewData.summary.totalPayout || 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Net Earnings</p>
                            <p className="text-lg font-bold text-green-600">
                              ${(previewData.summary.overall?.totalNetEarnings || previewData.summary.totalNetEarnings || 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Total Bookings</p>
                            <p className="text-lg font-bold text-gray-900">
                              {previewData.summary.overall?.totalBookings || previewData.summary.totalBookings || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PDF Preview Action */}
                    {previewData.pdf && (
                      <button
                        onClick={() => {
                          try {
                            const binaryString = atob(previewData.pdf!)
                            const bytes = new Uint8Array(binaryString.length)
                            for (let i = 0; i < binaryString.length; i++) {
                              bytes[i] = binaryString.charCodeAt(i)
                            }
                            const blob = new Blob([bytes], { type: 'application/pdf' })
                            const url = URL.createObjectURL(blob)
                            window.open(url, '_blank')
                            setTimeout(() => URL.revokeObjectURL(url), 1000)
                          } catch (error) {
                            console.error('Error opening PDF:', error)
                            showNotification('Failed to open PDF preview', 'error')
                          }
                        }}
                        className="w-full py-3 px-4 bg-red-50 text-red-700 rounded-xl font-medium hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                      >
                        <DocumentTextIcon className="w-5 h-5" />
                        Open PDF Preview in New Tab
                      </button>
                    )}

                    {/* Data Table Preview (for CSV/Excel) */}
                    {previewData.bookings && previewData.bookings.length > 0 && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto max-h-[200px]">
                          <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium text-gray-500">Property</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-500">Guest</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-500">Check In</th>
                                <th className="px-3 py-2 text-left font-medium text-gray-500">Check Out</th>
                                <th className="px-3 py-2 text-right font-medium text-gray-500">Payout</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                              {previewData.bookings.slice(0, 5).map((booking, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2 text-gray-900">{booking.propertyName}</td>
                                  <td className="px-3 py-2 text-gray-600">{booking.guestName || '-'}</td>
                                  <td className="px-3 py-2 text-gray-600">
                                    {(booking.checkInDate || booking.checkIn) ? new Date(booking.checkInDate || booking.checkIn!).toLocaleDateString() : '-'}
                                  </td>
                                  <td className="px-3 py-2 text-gray-600">
                                    {(booking.checkOutDate || booking.checkOut) ? new Date(booking.checkOutDate || booking.checkOut!).toLocaleDateString() : '-'}
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium text-gray-900">
                                    ${(booking.totalPayout || booking.revenue || 0).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {previewData.bookings.length > 5 && (
                          <div className="px-3 py-2 bg-gray-50 text-xs text-gray-500 text-center border-t">
                            ... and {previewData.bookings.length - 5} more bookings
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
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

              {isLastStep ? (
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
              ) : (
                <button
                  onClick={goToNextStep}
                  disabled={!canProceed}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default GenerateReportModal
