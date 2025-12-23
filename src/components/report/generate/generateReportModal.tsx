'use client'

import { useState, useEffect } from 'react'
import { useNotificationStore } from '@/store/useNotificationStore'
import { 
  previewReport, 
  generateReport, 
  getLogos, 
  uploadLogo 
} from '@/services/reportService'
import type { 
  Property 
} from '@/services/types/property'
import type { 
  Report, 
  ReportFormat, 
  ReportGenerationPayload,
  ReportPreviewResponse,
  ReportGenerationResponse,
  Logo,
  BookingData,
  EnhancedReportSummary
} from '@/services/types/report'
import { XMarkIcon, DocumentIcon, CloudArrowUpIcon, EyeIcon, CogIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'

interface GenerateReportModalProps {
  isOpen: boolean
  onClose: () => void
  onReportGenerated: () => Promise<void>
  properties: Property[]
  initialPropertyIds?: string[]
}

const GenerateReportModal: React.FC<GenerateReportModalProps> = ({
  isOpen,
  onClose,
  onReportGenerated,
  properties,
  initialPropertyIds = []
}) => {
  const { showNotification } = useNotificationStore()

  // Form state
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [selectedLogoId, setSelectedLogoId] = useState<string>('')
  const [selectAllProperties, setSelectAllProperties] = useState<boolean>(false)

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
  const [showPreview, setShowPreview] = useState<boolean>(false)

  // Loading states
  const [previewing, setPreviewing] = useState<boolean>(false)
  const [generating, setGenerating] = useState<boolean>(false)
  const [uploading, setUploading] = useState<boolean>(false)

  // Load logos when modal opens
  useEffect(() => {
    if (isOpen) {
      loadLogos()
      // Set initial property IDs if provided
      if (initialPropertyIds.length > 0) {
        setSelectedPropertyIds(initialPropertyIds)
      }
    }
  }, [isOpen, initialPropertyIds])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setSelectedPropertyIds([])
    setStartDate('')
    setEndDate('')
    setFormat('pdf')
    setSelectedLogoId('')
    setSelectAllProperties(false)
    setPreviewData(null)
    setShowPreview(false)
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

  const validateForm = (): boolean => {
    if (!selectedPropertyIds.length) {
      showNotification('Please select at least one property', 'error')
      return false
    }
    if (format === 'pdf' && selectedPropertyIds.length > 1) {
      showNotification('PDF format only supports one property at a time', 'error')
      return false
    }
    if (!startDate) {
      showNotification('Start date is required', 'error')
      return false
    }
    if (!endDate) {
      showNotification('End date is required', 'error')
      return false
    }
    if (!format) {
      showNotification('Please select a format', 'error')
      return false
    }

    // Date validation
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (start > end) {
      showNotification('Start date must be before end date', 'error')
      return false
    }

    // Max 1 year range
    const oneYearLater = new Date(start)
    oneYearLater.setFullYear(start.getFullYear() + 1)
    
    if (end > oneYearLater) {
      showNotification('Date range cannot exceed 1 year', 'error')
      return false
    }

    return true
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
    if (!validateForm()) return

    console.log('Generating preview with format:', format)

    try {
      setPreviewing(true)
      setPreviewData(null)
      
      const payload = buildPayload()
      const res = await previewReport(payload)
      
      if (res.status === 'success') {
        // Handle different response formats
        if (res.data.pdfPreview) {
          // PDF format - contains base64 PDF
          setPreviewData({
            pdf: res.data.pdfPreview,
            bookings: undefined,
            summary: res.data.summary,
            properties: res.data.properties || []
          })
        } else if (res.data.reportData) {
          // CSV/Excel format - contains structured data
          setPreviewData({
            pdf: undefined,
            bookings: res.data.reportData.bookings || [],
            summary: res.data.reportData.summary,
            properties: res.data.reportData.properties || []
          })
        } else {
          // Fallback for other formats
          setPreviewData({
            pdf: undefined,
            bookings: [],
            summary: res.data.summary,
            properties: res.data.properties || []
          })
        }
        setShowPreview(true)
        showNotification('Preview generated successfully', 'success')
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
    if (!validateForm()) return

    try {
      setGenerating(true)
      
      const payload = buildPayload()
      const res = await generateReport(payload)
      
      if (res.status === 'success') {
        showNotification('Report generated successfully!', 'success')
        
        await onReportGenerated() // Refresh reports list from server
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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
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
    
    // Reset input
    event.target.value = ''
  }

  // Format change handler
  const handleFormatChange = (newFormat: ReportFormat) => {
    setFormat(newFormat)
    // Clear property selection when switching formats
    setSelectedPropertyIds([])
    setSelectAllProperties(false)
  }

  // Property selection handlers
  const handlePropertyToggle = (propertyId: string) => {
    if (format === 'pdf') {
      // PDF only allows single selection
      setSelectedPropertyIds([propertyId])
    } else {
      // CSV/Excel allow multiple selection
      setSelectedPropertyIds(prev => 
        prev.includes(propertyId)
          ? prev.filter(id => id !== propertyId)
          : [...prev, propertyId]
      )
    }
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectAllProperties(checked)
    if (checked) {
      setSelectedPropertyIds(properties.map(p => p.id))
    } else {
      setSelectedPropertyIds([])
    }
  }

  const isFormValid = selectedPropertyIds.length > 0 && startDate && endDate && format

  return (
    <Modal isOpen={isOpen} onClose={onClose} style={`w-full ${showPreview ? 'max-w-7xl' : 'max-w-4xl'} mx-4`}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Generate Report</h2>
        </div>

        {!showPreview ? (
          // Form View
          <div className="space-y-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Format *
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="format"
                    value="pdf"
                    checked={format === 'pdf'}
                    onChange={(e) => handleFormatChange(e.target.value as ReportFormat)}
                    className="mr-2"
                  />
                  <span className="text-sm">PDF</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={format === 'csv'}
                    onChange={(e) => handleFormatChange(e.target.value as ReportFormat)}
                    className="mr-2"
                  />
                  <span className="text-sm">CSV</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="format"
                    value="excel"
                    checked={format === 'excel'}
                    onChange={(e) => handleFormatChange(e.target.value as ReportFormat)}
                    className="mr-2"
                  />
                  <span className="text-sm">Excel</span>
                </label>
              </div>
            </div>

            {/* Property Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {format === 'pdf' ? 'Property *' : 'Properties *'}
              </label>
              
              {format === 'pdf' ? (
                // Single select dropdown for PDF
                <select
                  value={selectedPropertyIds[0] || ''}
                  onChange={(e) => handlePropertyToggle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={properties.length === 0}
                >
                  <option value="">Select a property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.listingName} ({property.address})
                    </option>
                  ))}
                </select>
              ) : (
                // Multi-select checkboxes for CSV/Excel
                <div className="space-y-3">
                  {/* Select All */}
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectAllProperties}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium">Select All Properties</span>
                  </label>
                  
                  {/* Property List */}
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                    {properties.map((property) => (
                      <label key={property.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedPropertyIds.includes(property.id)}
                          onChange={() => handlePropertyToggle(property.id)}
                          className="mr-2"
                        />
                        <span className="text-sm">
                          {property.listingName} ({property.address})
                        </span>
                      </label>
                    ))}
                  </div>
                  
                  {selectedPropertyIds.length > 0 && (
                    <p className="text-sm text-gray-600">
                      {selectedPropertyIds.length} {selectedPropertyIds.length === 1 ? 'property' : 'properties'} selected
                    </p>
                  )}
                </div>
              )}
              
              {properties.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">No properties available</p>
              )}
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>


            {/* Logo Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Logo (Optional)
              </label>
              
              {loadingLogos ? (
                <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2 text-center">Loading logos...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Logo Grid */}
                  <div className="grid grid-cols-4 gap-3 max-h-32 overflow-y-auto">
                    {logos.map((logo) => (
                      <button
                        key={logo.id}
                        onClick={() => setSelectedLogoId(logo.id)}
                        className={`p-2 border rounded-lg hover:border-gray-400 transition-colors ${
                          selectedLogoId === logo.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300'
                        }`}
                      >
                        <img
                          src={logo.logoUrl}
                          alt={logo.originalName}
                          className="w-full h-12 object-contain"
                        />
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {logo.originalName}
                        </p>
                      </button>
                    ))}
                  </div>
                  
                  {/* Upload Button */}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                    <button
                      disabled={uploading}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:border-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {uploading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                          Uploading...
                        </div>
                      ) : (
                        <>
                          <CloudArrowUpIcon className="w-5 h-5 mr-2" />
                          Upload New Logo
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Clear Selection */}
                  {selectedLogoId && (
                    <button
                      onClick={() => setSelectedLogoId('')}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePreview}
                disabled={!isFormValid || previewing}
                className="px-4 py-2 text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {previewing ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                    Previewing...
                  </div>
                ) : (
                  <>
                    <EyeIcon className="w-4 h-4 mr-2" />
                    Preview
                  </>
                )}
              </button>
              <button
                onClick={handleGenerate}
                disabled={!isFormValid || generating}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {generating ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </div>
                ) : (
                  <>
                    <CogIcon className="w-4 h-4 mr-2" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          // Preview View
          <div className="space-y-6">
            {/* Preview Header */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Report Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                ← Back to Form
              </button>
            </div>

            {/* Summary - Compact Left-Aligned */}
            {previewData?.summary && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm font-mono max-w-2xl">
                <div className="border-b border-gray-200 pb-2 mb-3">
                  <h4 className="font-bold text-gray-900">FINANCIAL SUMMARY</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {/* Left Column */}
                  <div className="space-y-3">
                    {/* Key Metrics */}
                    <div>
                      <div className="text-xs font-bold text-gray-700 mb-1">OVERVIEW</div>
                      <div className="space-y-1">
                        <div>Total Bookings: <span className="font-semibold">{previewData.summary.overall?.totalBookings || previewData.summary.totalBookings || 0}</span></div>
                        <div>Total Nights: <span className="font-semibold">{previewData.summary.overall?.totalNights || previewData.summary.totalNights || 0}</span></div>
                        <div>Avg Rate/Night: <span className="font-semibold">${(previewData.summary.averageNightlyRate || 0).toFixed(2)}</span></div>
                      </div>
                    </div>

                    {/* Revenue */}
                    <div>
                      <div className="text-xs font-bold text-gray-700 mb-1">REVENUE</div>
                      <div className="space-y-1">
                        <div>Room Revenue: <span className="font-semibold">${(previewData.summary.overall?.totalRoomRevenue || previewData.summary.totalRoomRevenue || 0).toLocaleString()}</span></div>
                        <div>Extra Guest Fees: <span className="font-semibold">${(previewData.summary.overall?.totalExtraGuestFees || previewData.summary.totalExtraGuestFees || 0).toLocaleString()}</span></div>
                        <div>Cleaning Fees: <span className="font-semibold">${(previewData.summary.overall?.totalCleaningFees || previewData.summary.totalCleaningFees || 0).toLocaleString()}</span></div>
                        <div className="border-t border-gray-200 pt-1 font-bold">Total Revenue: <span className="text-green-600">${(previewData.summary.overall?.totalRevenue || previewData.summary.totalRevenue || 0).toLocaleString()}</span></div>
                      </div>
                    </div>

                    {/* Taxes */}
                    <div>
                      <div className="text-xs font-bold text-gray-700 mb-1">TAXES</div>
                      <div className="space-y-1">
                        <div>Lodging Tax: <span className="font-semibold">${(previewData.summary.overall?.totalLodgingTax || previewData.summary.totalLodgingTax || 0).toLocaleString()}</span></div>
                        <div>GST: <span className="font-semibold">${(previewData.summary.overall?.totalGst || previewData.summary.totalGst || 0).toLocaleString()}</span></div>
                        <div>QST: <span className="font-semibold">${(previewData.summary.overall?.totalQst || previewData.summary.totalQst || 0).toLocaleString()}</span></div>
                        <div className="border-t border-gray-200 pt-1 font-bold">Total Tax: <span className="font-semibold">${(previewData.summary.overall?.totalSalesTax || previewData.summary.totalSalesTax || 0).toLocaleString()}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-3">
                    {/* Platform Fees */}
                    <div>
                      <div className="text-xs font-bold text-gray-700 mb-1">PLATFORM FEES</div>
                      <div className="space-y-1">
                        <div>Channel Fees: <span className="font-semibold">${(previewData.summary.overall?.totalChannelFees || previewData.summary.totalChannelFees || 0).toLocaleString()}</span></div>
                        <div>Stripe Fees: <span className="font-semibold">${(previewData.summary.overall?.totalStripeFees || previewData.summary.totalStripeFees || 0).toLocaleString()}</span></div>
                        <div>Management Fee: <span className="font-semibold">${(previewData.summary.overall?.totalMgmtFee || previewData.summary.totalMgmtFee || 0).toLocaleString()}</span></div>
                      </div>
                    </div>

                    {/* Final Totals */}
                    <div>
                      <div className="text-xs font-bold text-gray-700 mb-1">FINAL AMOUNTS</div>
                      <div className="space-y-1">
                        <div className="font-bold">TOTAL PAYOUT: <span className="text-blue-600">${(previewData.summary.overall?.totalPayout || previewData.summary.totalPayout || 0).toLocaleString()}</span></div>
                        <div className="font-bold">NET EARNINGS: <span className="text-green-600">${(previewData.summary.overall?.totalNetEarnings || previewData.summary.totalNetEarnings || 0).toLocaleString()}</span></div>
                        {previewData.summary.rentCollected && (
                          <div>Rent Collected: <span className="font-semibold">${previewData.summary.rentCollected}</span></div>
                        )}
                      </div>
                    </div>

                    {/* Property Breakdown */}
                    {previewData.summary.byProperty && previewData.summary.byProperty.length > 1 && (
                      <div>
                        <div className="text-xs font-bold text-gray-700 mb-1">BY PROPERTY</div>
                        <div className="space-y-1">
                          {previewData.summary.byProperty.map((property) => (
                            <div key={property.propertyId} className="text-xs">
                              <div className="font-semibold">{property.propertyName}</div>
                              <div className="ml-2">
                                <div>Revenue: ${property.totalRevenue.toLocaleString()}</div>
                                <div>Net: <span className="text-green-600">${property.totalNetEarnings.toLocaleString()}</span></div>
                                <div>Bookings: {property.totalBookings} | Nights: {property.totalNights}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Preview Content */}
            <div className="border rounded-lg overflow-hidden">
              {previewData?.pdf ? (
                // PDF Preview
                <div className="p-8 text-center">
                  <div className="flex items-center justify-center mb-6">
                    <DocumentIcon className="w-16 h-16 text-red-500" />
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">PDF Report Ready</h4>
                  <p className="text-gray-600 mb-6">Your PDF report has been generated successfully. Click the button below to view it in a new tab.</p>
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
                    className="px-6 py-3 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center mx-auto"
                  >
                    <DocumentIcon className="w-5 h-5 mr-2" />
                    Open PDF in New Tab
                  </button>
                </div>
              ) : previewData?.bookings ? (
                // Data Table Preview
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Property</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Reservation</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Guest Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Check In</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Check Out</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Nights</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Platform</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Nightly Rate</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Extra Fees</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Cleaning Fee</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Lodging Tax</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Bed Linen</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">GST</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">QST</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Channel Fee</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Stripe Fee</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Total Payout</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Mgmt Fee</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Net Earnings</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {previewData.bookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{booking.propertyName || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{booking.reservationCode || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{booking.guestName || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {(booking.checkInDate || booking.checkIn) ? new Date(booking.checkInDate || booking.checkIn!).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {(booking.checkOutDate || booking.checkOut) ? new Date(booking.checkOutDate || booking.checkOut!).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{booking.numNights || booking.nights || 0}</td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{booking.platform || booking.channel || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {booking.nightlyRate ? `$${booking.nightlyRate.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {booking.extraGuestFees ? `$${booking.extraGuestFees.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {booking.cleaningFee ? `$${booking.cleaningFee.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {booking.lodgingTax ? `$${booking.lodgingTax.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {booking.bedLinenFee ? `$${booking.bedLinenFee.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {booking.gst ? `$${booking.gst.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {booking.qst ? `$${booking.qst.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {booking.channelFee ? `$${booking.channelFee.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {booking.stripeFee ? `$${booking.stripeFee.toLocaleString()}` : '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {booking.totalPayout ? `$${booking.totalPayout.toLocaleString()}` : (booking.revenue ? `$${booking.revenue.toLocaleString()}` : '-')}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {booking.mgmtFee ? `$${booking.mgmtFee.toLocaleString()}` : (booking.commission ? `$${booking.commission.toLocaleString()}` : '-')}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">
                            {booking.netEarnings ? `$${booking.netEarnings.toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Totals Row */}
                    <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                      <tr className="font-medium">
                        <td className="px-3 py-3 text-sm text-gray-900 font-semibold" colSpan={2}>TOTALS</td>
                        <td className="px-3 py-3 text-sm text-gray-900">-</td>
                        <td className="px-3 py-3 text-sm text-gray-900">-</td>
                        <td className="px-3 py-3 text-sm text-gray-900">-</td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-semibold">
                          {previewData.summary?.overall?.totalNights || previewData.summary?.totalNights || 0}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900">-</td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-semibold">
                          ${(previewData.summary?.overall?.totalNightlyRate || previewData.summary?.totalNightlyRate || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-semibold">
                          ${(previewData.summary?.overall?.totalExtraGuestFees || previewData.summary?.totalExtraGuestFees || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-semibold">
                          ${(previewData.summary?.overall?.totalCleaningFees || previewData.summary?.totalCleaningFees || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-semibold">
                          ${(previewData.summary?.overall?.totalLodgingTax || previewData.summary?.totalLodgingTax || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-semibold">
                          ${(previewData.summary?.overall?.totalBedLinenFees || previewData.summary?.totalBedLinenFees || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-semibold">
                          ${(previewData.summary?.overall?.totalGst || previewData.summary?.totalGst || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-semibold">
                          ${(previewData.summary?.overall?.totalQst || previewData.summary?.totalQst || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-semibold">
                          ${(previewData.summary?.overall?.totalChannelFees || previewData.summary?.totalChannelFees || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-semibold">
                          ${(previewData.summary?.overall?.totalStripeFees || previewData.summary?.totalStripeFees || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-semibold text-blue-600">
                          ${(previewData.summary?.overall?.totalPayout || previewData.summary?.totalPayout || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-semibold">
                          ${(previewData.summary?.overall?.totalMgmtFee || previewData.summary?.totalMgmtFee || 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-sm text-gray-900 font-semibold text-green-600">
                          ${(previewData.summary?.overall?.totalNetEarnings || previewData.summary?.totalNetEarnings || 0).toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : null}
            </div>

            {/* Preview Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {generating ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </div>
                ) : (
                  <>
                    <CogIcon className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default GenerateReportModal