'use client'

import React, { useState, useEffect, useRef } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, ArrowPathIcon, DocumentCheckIcon } from '@heroicons/react/24/outline'
import { uploadCsvFile } from '@/services/csvUploadService'
import { createMultipleBookings } from '@/services/bookingService'
import { CreateBookingPayload } from '@/services/types/booking'
import { useUserStore } from '@/store/useUserStore'
import { ProcessingStatus } from '../types/wizard'
import { createMultipleFieldChanges } from '@/services/fieldValuesChangedService'
import { PreviewFieldEdit } from '@/services/types/fieldValueChanged'

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

      // Step 2: Use pre-confirmed booking payloads from PreviewStep (40%)
      updateProgress(ProcessingStatus.PARSING, 40, 'Preparing confirmed booking data...')
      
      // Get confirmed payloads from PreviewStep (no recalculation needed!)
      const confirmedPayloads = previewState?.confirmedPayloads
      if (!confirmedPayloads || confirmedPayloads.length === 0) {
        throw new Error('No confirmed booking data received from preview step')
      }
      
      // Set the CSV upload ID for each payload (now that we have it)
      const bookingPayloads = confirmedPayloads.map((payload:CreateBookingPayload)=> ({
        ...payload,
        csvUploadId: csvUploadResult.data.id
      }))

      updateProgress(ProcessingStatus.VALIDATING, 60, 'Validating booking data...', 'Confirmed data prepared')

      // Step 3: Create multiple bookings (80%)
      updateProgress(ProcessingStatus.SAVING_TO_DATABASE, 80, 'Saving bookings to database...')

      const bulkResult = await createMultipleBookings({
        bookings: bookingPayloads
      })

      if (bulkResult.status !== 'success') {
        throw new Error(bulkResult.message || 'Failed to save bookings')
      }

      console.log('Bulk bookings result:', bulkResult)

      // First check what structure bulkResult.data has
      console.log('bulkResult.data structure:', bulkResult.data)
      console.log('Is bulkResult.data an array?', Array.isArray(bulkResult.data))
      
      // Get the bookings array - it might be bulkResult.data.bookings or bulkResult.data directly
      const createdBookings = Array.isArray(bulkResult.data) 
        ? bulkResult.data 
        : (bulkResult.data.bookings || [])
      
      console.log('Created bookings array:', createdBookings)

      // Step 3.5: Save field value changes if any edits were made
      if (previewState?.fieldEdits && previewState.fieldEdits.length > 0) {
        console.log('Field edits detected:', previewState.fieldEdits)
        updateProgress(ProcessingStatus.SAVING_TO_DATABASE, 85, 'Saving field change history...')
        
        try {
          
          // Map field edits to include actual booking IDs from the created bookings
          const fieldChangesToSave = previewState.fieldEdits.map((edit: PreviewFieldEdit) => {
            // Get the original booking payload to find reservation code
            const originalBookingPayload = bookingPayloads[edit.bookingIndex]
            if (!originalBookingPayload) {
              console.warn(`Could not find original booking payload at index ${edit.bookingIndex}`)
              return null
            }
            
            console.log(`Looking for booking with index ${edit.bookingIndex}, reservation code: "${originalBookingPayload.reservationCode}"`)
            
            // Find the corresponding created booking by matching reservation code
            // Convert both to strings and trim to handle any type/whitespace issues
            const createdBooking = createdBookings.find((booking: any) => {
              const bookingCode = String(booking.reservationCode || booking.reservation_code || '').trim()
              const payloadCode = String(originalBookingPayload.reservationCode || '').trim()
              const match = bookingCode === payloadCode
              if (!match && edit.bookingIndex === 0) {
                // Debug first mismatch
                console.log(`Comparing: "${bookingCode}" vs "${payloadCode}" - Match: ${match}`)
              }
              return match
            })
            
            if (!createdBooking) {
              console.warn(`Could not find created booking for reservation code "${originalBookingPayload.reservationCode}" at index ${edit.bookingIndex}`)
              console.warn('Original payload:', originalBookingPayload)
              console.warn('Available bookings:', createdBookings.map((b: any, i: number) => ({
                index: i,
                reservationCode: b.reservationCode || b.reservation_code,
                id: b.id
              })))
              return null
            }
            
            console.log(`Mapping field edit: ${edit.fieldName} for booking ${createdBooking.id} (${createdBooking.reservationCode})`)
            
            return {
              bookingId: createdBooking.id,
              userId: profile!.id,
              fieldName: edit.fieldName,
              originalValue: edit.originalValue,
              editedValue: edit.newValue,
              changeReason: edit.reason || null
            }
          }).filter(Boolean) // Remove any null entries
          
          console.log('Field changes to save:', fieldChangesToSave)
          
          if (fieldChangesToSave.length > 0) {
            const fieldChangeResult = await createMultipleFieldChanges({
              fieldChanges: fieldChangesToSave
            })
            
            console.log('Field change save result:', fieldChangeResult)
            
            if (fieldChangeResult.status === 'success') {
              updateProgress(ProcessingStatus.SAVING_TO_DATABASE, 90, 'Field changes saved', `${fieldChangesToSave.length} field edits recorded`)
            } else {
              // Log error but don't fail the whole import
              console.error('Failed to save field changes:', fieldChangeResult.message)
            }
          }
        } catch (error) {
          // Log error but don't fail the whole import since bookings were created successfully
          console.error('Error saving field changes:', error)
        }
      } else {
        updateProgress(ProcessingStatus.CALCULATING_METRICS, 90, 'Calculating import statistics...', 'Bookings saved to database')
      }

      // Step 4: Generate completion stats (100%)
      const fieldEditCount = previewState?.fieldEdits?.length || 0
      const stats = generateImportStats(bookingPayloads, createdBookings, fieldEditCount)
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

  // All booking conversion logic moved to PreviewStep!
  // ProcessStep now only handles the upload process

  const generateImportStats = (bookingPayloads: CreateBookingPayload[], bulkResult: any, fieldEditCount: number = 0) => {
    const totalBookings = bookingPayloads.length
    const totalRevenue = bookingPayloads.reduce((sum, booking) => 
      sum + (booking.totalPayout || 0), 0)
    
    const platformBreakdown = bookingPayloads.reduce((acc, booking) => {
      acc[booking.platform] = (acc[booking.platform] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const dates = bookingPayloads
      .map(b => b.checkInDate)
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
      platformBreakdown,
      fieldEditsApplied: fieldEditCount
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
            {importStats.fieldEditsApplied > 0 && (
              <div>
                <span className="text-green-700">Field Edits:</span>
                <div className="font-semibold text-green-900">
                  {importStats.fieldEditsApplied}
                </div>
              </div>
            )}
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