'use client'

import React, { useState, useEffect, useRef } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, ArrowPathIcon, DocumentCheckIcon } from '@heroicons/react/24/outline'
import { uploadCsvFile } from '@/services/csvUploadService'
import { createMultipleBookings } from '@/services/bookingService'
import { CreateBookingPayload } from '@/services/types/booking'
import { useUserStore } from '@/store/useUserStore'
import { ProcessingStatus } from '../types/wizard'

interface ProcessStepProps {
  onNext?: () => void
  onBack?: () => void
  onCancel?: () => void
  canGoNext?: boolean
  canGoBack?: boolean
  config?: any
  validationState?: any
  previewState?: any
  selectedProperty?: any
  uploadedFile?: any
  processingState?: any
  onProcessingUpdate?: (state: any) => void
  onProcessingComplete?: (state: any) => void
}

const ProcessStep: React.FC<ProcessStepProps> = ({
  onNext,
  onBack,
  onCancel,
  validationState,
  previewState,
  selectedProperty,
  uploadedFile,
  processingState,
  onProcessingUpdate,
  onProcessingComplete
}) => {
  const [currentStatus, setCurrentStatus] = useState<ProcessingStatus>(ProcessingStatus.UPLOADING)
  const [progress, setProgress] = useState(0)
  const [currentTask, setCurrentTask] = useState('Initializing upload...')
  const [completedTasks, setCompletedTasks] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [csvUploadId, setCsvUploadId] = useState<string | null>(null)
  const [importStats, setImportStats] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const hasStartedProcessing = useRef(false)

  const { profile } = useUserStore()

  useEffect(() => {
    if (!previewState || !selectedProperty || !uploadedFile?.file || !profile?.id || hasStartedProcessing.current) return
    
    hasStartedProcessing.current = true
    startProcessing()
  }, [previewState, selectedProperty, uploadedFile, profile])

  const updateProgress = (status: ProcessingStatus, progress: number, task: string, completed?: string) => {
    console.log('ProcessStep updateProgress called with:', { status, progress, task, completed })
    setCurrentStatus(status)
    setProgress(progress)
    setCurrentTask(task)
    
    if (completed) {
      setCompletedTasks(prev => [...prev, completed])
    }

    const updatePayload = {
      status,
      progress,
      currentTask: task,
      completedTasks: completed ? [...completedTasks, completed] : completedTasks
    }
    
    console.log('ProcessStep sending update payload:', updatePayload)
    onProcessingUpdate?.(updatePayload)
  }

  const startProcessing = async () => {
    setIsProcessing(true)
    try {
      // Step 1: Upload CSV file and create record (10%)
      updateProgress(ProcessingStatus.UPLOADING, 10, 'Uploading CSV file...')
      
      if (!selectedProperty?.id) {
        throw new Error('No property selected. Please go back and select a property.')
      }

      if (!uploadedFile?.file) {
        throw new Error('No file uploaded. Please go back and upload a CSV file.')
      }


      const csvUploadResult = await uploadCsvFile({
        file: uploadedFile.file,
        user_id: profile!.id,
        property_id: selectedProperty.id
      })

      if (csvUploadResult.status !== 'success') {
        throw new Error(csvUploadResult.message || 'Failed to create CSV upload record')
      }

      setCsvUploadId(csvUploadResult.data.id)
      updateProgress(ProcessingStatus.PARSING, 25, 'Processing booking data...', 'CSV file uploaded successfully')

      // Step 2: Convert preview data to booking payloads (40%)
      updateProgress(ProcessingStatus.PARSING, 40, 'Converting booking data...')
      
      const bookingPayloads = convertPreviewToBookings(
        previewState?.bookingPreviews || [],
        csvUploadResult.data.id,
        selectedProperty.id
      )

      updateProgress(ProcessingStatus.VALIDATING, 60, 'Validating booking data...', 'Booking data converted')

      // Step 3: Create multiple bookings (80%)
      updateProgress(ProcessingStatus.SAVING_TO_DATABASE, 80, 'Saving bookings to database...')

      const bulkResult = await createMultipleBookings({
        bookings: bookingPayloads
      })

      if (bulkResult.status !== 'success') {
        throw new Error(bulkResult.message || 'Failed to save bookings')
      }

      updateProgress(ProcessingStatus.CALCULATING_METRICS, 90, 'Calculating import statistics...', 'Bookings saved to database')

      // Step 4: Generate completion stats (100%)
      const stats = generateImportStats(bookingPayloads, bulkResult.data)
      setImportStats(stats)

      updateProgress(ProcessingStatus.COMPLETE, 100, 'Import completed successfully!', 'Statistics calculated')

      // Notify completion
      onProcessingComplete?.({
        isSuccess: true,
        stats,
        csvUploadId: csvUploadResult.data.id,
        totalBookings: bookingPayloads.length,
        nextActions: {
          viewDashboard: true,
          uploadAnother: true,
          generateReports: true
        },
        automatedActions: ['Bookings imported', 'Statistics updated']
      })

      // Don't auto-navigate, let user click "View Results" button

    } catch (err) {
      console.error('Processing error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setCurrentStatus(ProcessingStatus.ERROR)
      updateProgress(ProcessingStatus.ERROR, progress, `Error: ${errorMessage}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const convertPreviewToBookings = (
    bookingPreviews: any[],
    csvUploadId: string,
    propertyId: string
  ): CreateBookingPayload[] => {
    return bookingPreviews.map((preview, index) => {
      // Convert preview booking to CreateBookingPayload format
      const payload: CreateBookingPayload = {
        user_id: profile!.id,
        property_id: propertyId,
        csv_upload_id: csvUploadId,
        reservation_code: preview.reservation_code || preview.reservationId || `AUTO-${Date.now()}-${index}`,
        guest_name: preview.guest_name || preview.guestName || 'Unknown Guest',
        check_in_date: formatDate(preview.check_in_date || preview.checkInDate),
        check_out_date: (preview.check_out_date || preview.checkOutDate) ? formatDate(preview.check_out_date || preview.checkOutDate) : undefined,
        num_nights: parseInt(preview.num_nights || preview.nights) || 1,
        platform: mapPlatformName(preview.platform || 'direct'),
        listing_name: preview.listing_name || preview.propertyName,
        // Financial fields
        nightly_rate: parseFloat(preview.nightly_rate || preview.nightlyRate) || undefined,
        extra_guest_fees: parseFloat(preview.extra_guest_fees || preview.extraGuestFees) || undefined,
        cleaning_fee: parseFloat(preview.cleaning_fee || preview.cleaningFee) || undefined,
        lodging_tax: parseFloat(preview.lodging_tax || preview.lodgingTax) || undefined,
        bed_linen_fee: parseFloat(preview.bed_linen_fee || preview.bedLinenFee) || undefined,
        gst: parseFloat(preview.gst) || undefined,
        qst: parseFloat(preview.qst) || undefined,
        channel_fee: parseFloat(preview.channel_fee || preview.channelFee) || undefined,
        stripe_fee: parseFloat(preview.stripe_fee || preview.stripeFee) || undefined,
        sales_tax: parseFloat(preview.sales_tax || preview.salesTax) || undefined,
        total_payout: parseFloat(preview.total_payout || preview.totalAmount || preview.totalPayout) || undefined,
        mgmt_fee: parseFloat(preview.mgmt_fee || preview.mgmtFee) || undefined,
        net_earnings: parseFloat(preview.net_earnings || preview.netAmount || preview.netEarnings) || undefined,
      }

      return payload
    })
  }

  const formatDate = (dateString: string): string => {
    if (!dateString) return new Date().toISOString().split('T')[0]
    
    try {
      const date = new Date(dateString)
      return date.toISOString().split('T')[0]
    } catch {
      return new Date().toISOString().split('T')[0]
    }
  }

  const mapPlatformName = (platform: string): 'airbnb' | 'booking' | 'google' | 'direct' | 'wechalet' | 'monsieurchalets' => {
    const platformLower = platform.toLowerCase()
    
    if (platformLower.includes('airbnb')) return 'airbnb'
    if (platformLower.includes('booking')) return 'booking'
    if (platformLower.includes('google')) return 'google'
    if (platformLower.includes('wechalet') || platformLower.includes('we chalet')) return 'wechalet'
    if (platformLower.includes('monsieur') || platformLower.includes('chalets')) return 'monsieurchalets'
    
    return 'direct'
  }

  const generateImportStats = (bookingPayloads: CreateBookingPayload[], bulkResult: any) => {
    const totalBookings = bookingPayloads.length
    const totalRevenue = bookingPayloads.reduce((sum, booking) => 
      sum + (booking.total_payout || 0), 0)
    
    const platformBreakdown = bookingPayloads.reduce((acc, booking) => {
      acc[booking.platform] = (acc[booking.platform] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const dates = bookingPayloads
      .map(b => b.check_in_date)
      .filter(date => date)
      .sort()

    return {
      bookingsImported: totalBookings,
      propertiesUpdated: 1,
      totalRevenue,
      calculationStatus: '100%',
      dateRange: {
        start: dates[0] || new Date().toISOString().split('T')[0],
        end: dates[dates.length - 1] || new Date().toISOString().split('T')[0]
      },
      platformBreakdown
    }
  }

  const getStatusIcon = () => {
    if (error) return <ExclamationTriangleIcon className="h-12 w-12 text-red-600" />
    if (currentStatus === ProcessingStatus.COMPLETE) return <CheckCircleIcon className="h-12 w-12 text-green-600" />
    return <ArrowPathIcon className="h-12 w-12 text-blue-600 animate-spin" />
  }

  const getStatusColor = () => {
    if (error) return 'text-red-600'
    if (currentStatus === ProcessingStatus.COMPLETE) return 'text-green-600'
    return 'text-blue-600'
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center">
          <DocumentCheckIcon className="h-6 w-6 mr-2" />
          Processing Bookings
        </h2>
        <p className="text-gray-600">
          {error ? 'An error occurred during processing' : 'Importing your bookings into the system...'}
        </p>
      </div>

      {/* Status Display */}
      <div className="text-center">
        {getStatusIcon()}
        <h3 className={`text-xl font-semibold mt-4 ${getStatusColor()}`}>
          {error ? 'Processing Failed' : currentStatus === ProcessingStatus.COMPLETE ? 'Import Complete!' : currentTask}
        </h3>
      </div>

      {/* Progress Bar */}
      {!error && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              currentStatus === ProcessingStatus.COMPLETE ? 'bg-green-600' : 'bg-blue-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Progress Details */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">
          {error ? 'Error Details' : 'Processing Steps'}
        </h4>
        
        {error ? (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
            {error}
          </div>
        ) : (
          <div className="space-y-2">
            {completedTasks.map((task, index) => (
              <div key={index} className="flex items-center text-sm">
                <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-gray-700">{task}</span>
              </div>
            ))}
            {currentStatus !== ProcessingStatus.COMPLETE && (
              <div className="flex items-center text-sm">
                <ArrowPathIcon className="h-4 w-4 text-blue-600 mr-2 animate-spin" />
                <span className="text-gray-700">{currentTask}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import Statistics */}
      {importStats && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-green-900 mb-3">Import Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-green-700">Bookings:</span>
              <div className="font-semibold text-green-900">{importStats.bookingsImported}</div>
            </div>
            <div>
              <span className="text-green-700">Revenue:</span>
              <div className="font-semibold text-green-900">
                ${importStats.totalRevenue.toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-green-700">Date Range:</span>
              <div className="font-semibold text-green-900">
                {importStats.dateRange.start} to {importStats.dateRange.end}
              </div>
            </div>
            <div>
              <span className="text-green-700">Platforms:</span>
              <div className="font-semibold text-green-900">
                {Object.keys(importStats.platformBreakdown).length}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onCancel}
          disabled={currentStatus === ProcessingStatus.COMPLETE}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {error ? 'Back to Dashboard' : 'Cancel Import'}
        </button>
        
        {(currentStatus === ProcessingStatus.COMPLETE || error) && (
          <button
            onClick={onNext}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {error ? 'Try Again' : 'View Results'}
          </button>
        )}
      </div>
    </div>
  )
}

export default ProcessStep