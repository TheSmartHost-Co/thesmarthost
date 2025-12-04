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
  ReportPreviewPDFResponse,
  ReportPreviewDataResponse,
  Logo,
  BookingData,
  ReportSummary
} from '@/services/types/report'
import { XMarkIcon, DocumentIcon, CloudArrowUpIcon, EyeIcon, CogIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'

interface GenerateReportModalProps {
  isOpen: boolean
  onClose: () => void
  onReportGenerated: (report: Report) => void
  properties: Property[]
}

const GenerateReportModal: React.FC<GenerateReportModalProps> = ({
  isOpen,
  onClose,
  onReportGenerated,
  properties
}) => {
  const { showNotification } = useNotificationStore()

  // Form state
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [selectedLogoId, setSelectedLogoId] = useState<string>('')

  // Data state
  const [logos, setLogos] = useState<Logo[]>([])
  const [loadingLogos, setLoadingLogos] = useState<boolean>(false)

  // Preview state
  const [previewData, setPreviewData] = useState<{
    pdf?: string
    bookings?: BookingData[]
    summary?: ReportSummary
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
    }
  }, [isOpen])

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen])

  const resetForm = () => {
    setSelectedPropertyId('')
    setStartDate('')
    setEndDate('')
    setFormat('pdf')
    setSelectedLogoId('')
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
    if (!selectedPropertyId) {
      showNotification('Please select a property', 'error')
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
      property_id: selectedPropertyId,
      start_date: startDate,
      end_date: endDate,
      format,
      logo_id: selectedLogoId || undefined,
    }
  }

  const handlePreview = async () => {
    if (!validateForm()) return

    try {
      setPreviewing(true)
      setPreviewData(null)
      
      const payload = buildPayload()
      const res = await previewReport(payload)
      
      if (res.status === 'success') {
        if (res.data.format === 'pdf') {
          const pdfRes = res as ReportPreviewPDFResponse
          setPreviewData({
            pdf: pdfRes.data.pdfPreview,
            summary: pdfRes.data.summary
          })
        } else {
          const dataRes = res as ReportPreviewDataResponse
          setPreviewData({
            bookings: dataRes.data.bookings,
            summary: dataRes.data.summary
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
        onReportGenerated(res.data)
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

  const isFormValid = selectedPropertyId && startDate && endDate && format

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
            {/* Property Selection */}
            <div>
              <label htmlFor="property" className="block text-sm font-medium text-gray-700 mb-2">
                Property *
              </label>
              <select
                id="property"
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
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

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Format *
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setFormat('pdf')}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    format === 'pdf'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <DocumentIcon className="w-6 h-6 mx-auto mb-1" />
                  <div className="text-sm font-medium">PDF</div>
                </button>
                <button
                  onClick={() => setFormat('csv')}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    format === 'csv'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <DocumentIcon className="w-6 h-6 mx-auto mb-1" />
                  <div className="text-sm font-medium">CSV</div>
                </button>
                <button
                  onClick={() => setFormat('excel')}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    format === 'excel'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <DocumentIcon className="w-6 h-6 mx-auto mb-1" />
                  <div className="text-sm font-medium">Excel</div>
                </button>
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

            {/* Summary */}
            {previewData?.summary && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Report Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Revenue:</span>
                    <span className="block font-medium">${(previewData.summary.totalRevenue || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Bookings:</span>
                    <span className="block font-medium">{previewData.summary.totalBookings || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total Nights:</span>
                    <span className="block font-medium">{previewData.summary.totalNights || 0}</span>
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
                      const blob = new Blob([Uint8Array.from(atob(previewData.pdf!), c => c.charCodeAt(0))], { type: 'application/pdf' })
                      const url = URL.createObjectURL(blob)
                      window.open(url, '_blank')
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