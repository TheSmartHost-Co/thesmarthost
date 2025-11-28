'use client'

import React, { useState, useEffect, useRef } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, ArrowPathIcon, DocumentCheckIcon } from '@heroicons/react/24/outline'
import { uploadCsvFile } from '@/services/csvUploadService'
import { createMultipleBookings } from '@/services/bookingService'
import { CreateBookingPayload } from '@/services/types/booking'
import { createProperty } from '@/services/propertyService'
import { createClient } from '@/services/clientService'
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
  propertyMappingState?: any
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
  propertyMappingState,
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
  const [createdProperties, setCreatedProperties] = useState<Record<string, string>>({}) // listingName -> propertyId
  const hasStartedProcessing = useRef(false)

  const { profile } = useUserStore()

  useEffect(() => {
    if (!previewState || !propertyMappingState?.propertyMappings || !uploadedFile?.file || !profile?.id || hasStartedProcessing.current) return
    
    hasStartedProcessing.current = true
    startProcessing()
  }, [previewState, propertyMappingState, uploadedFile, profile])

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
      // Step 1: Create new properties if needed (10-30%)
      updateProgress(ProcessingStatus.UPLOADING, 10, 'Creating new properties...')
      
      const propertyMappings = propertyMappingState?.propertyMappings || []
      const newPropertiesToCreate = propertyMappings.filter((mapping: any) => mapping.isNewProperty)
      const existingPropertyMappings = propertyMappings.filter((mapping: any) => !mapping.isNewProperty && mapping.propertyId)
      const propertyIdMap: Record<string, string> = {}
      
      // Add existing property mappings to the map first
      existingPropertyMappings.forEach((mapping: any) => {
        propertyIdMap[mapping.listingName] = mapping.propertyId
      })
      
      if (newPropertiesToCreate.length > 0) {
        updateProgress(ProcessingStatus.PARSING, 15, `Creating ${newPropertiesToCreate.length} new properties...`)
        
        for (const mapping of newPropertiesToCreate) {
          if (!mapping.newPropertyData) {
            throw new Error(`Missing property data for ${mapping.listingName}`)
          }
          
          const clientId = mapping.newPropertyData.clientId
          
          if (!clientId) {
            throw new Error(`No valid client ID for property "${mapping.listingName}"`)
          }
          
          const propertyResult = await createProperty({
            clientId,
            listingName: mapping.newPropertyData.name,
            listingId: mapping.newPropertyData.listingId,
            externalName: mapping.newPropertyData.externalName || '',
            internalName: mapping.newPropertyData.internalName || '',
            address: mapping.newPropertyData.address,
            postalCode: mapping.newPropertyData.postalCode,
            province: mapping.newPropertyData.province,
            propertyType: mapping.newPropertyData.propertyType,
            commissionRate: mapping.newPropertyData.commissionRate
          })
          
          if (propertyResult.status !== 'success') {
            throw new Error(`Failed to create property "${mapping.listingName}": ${propertyResult.message}`)
          }
          
          propertyIdMap[mapping.listingName] = propertyResult.data.id
          console.log(`Created property: ${mapping.listingName} -> ${propertyResult.data.id}`)
        }
        
        setCreatedProperties(propertyIdMap)
        updateProgress(ProcessingStatus.PARSING, 25, 'New properties created', `${newPropertiesToCreate.length} properties created`)
      } else {
        updateProgress(ProcessingStatus.PARSING, 25, 'Using existing properties', 'Property mappings prepared')
      }

      // Step 2: Upload CSV file and create record (30-40%)
      updateProgress(ProcessingStatus.UPLOADING, 30, 'Uploading CSV file...')
      
      if (!uploadedFile?.file) {
        throw new Error('No file uploaded. Please go back and upload a CSV file.')
      }

      // For multi-property, use the first created/mapped property ID
      const firstPropertyId = Object.values(propertyIdMap)[0]
      
      if (!firstPropertyId) {
        throw new Error('No property mappings found. Cannot create CSV upload record.')
      }
      
      const csvUploadResult = await uploadCsvFile({
        file: uploadedFile.file,
        user_id: profile!.id,
        property_id: firstPropertyId
      })

      if (csvUploadResult.status !== 'success') {
        throw new Error(csvUploadResult.message || 'Failed to create CSV upload record')
      }

      setCsvUploadId(csvUploadResult.data.id)
      updateProgress(ProcessingStatus.PARSING, 40, 'Processing multi-property booking data...', 'CSV file uploaded successfully')

      // Step 3: Prepare booking payloads with correct property IDs (40-60%)
      updateProgress(ProcessingStatus.VALIDATING, 50, 'Mapping bookings to properties...')
      
      const confirmedPayloads = previewState?.confirmedPayloads
      if (!confirmedPayloads || confirmedPayloads.length === 0) {
        throw new Error('No confirmed booking data received from preview step')
      }
      
      // Update each booking payload with the correct property ID
      const bookingPayloads = confirmedPayloads.map((payload: CreateBookingPayload) => {
        const listingName = payload.listingName || 'Unknown Property'
        const propertyId = propertyIdMap[listingName]
        
        if (!propertyId) {
          throw new Error(`No property mapping found for listing: ${listingName}`)
        }
        
        return {
          ...payload,
          propertyId,
          csvUploadId: csvUploadResult.data.id
        }
      })

      console.log('Multi-property booking payloads:', bookingPayloads)
      updateProgress(ProcessingStatus.VALIDATING, 60, 'Property mapping completed', 'All bookings mapped to properties')

      // Step 4: Create multiple bookings across all properties (60-80%)
      updateProgress(ProcessingStatus.SAVING_TO_DATABASE, 70, 'Saving bookings to database...')

      const bulkResult = await createMultipleBookings({
        bookings: bookingPayloads
      })

      if (bulkResult.status !== 'success') {
        throw new Error(bulkResult.message || 'Failed to save bookings')
      }

      const createdBookings = Array.isArray(bulkResult.data) 
        ? bulkResult.data 
        : (bulkResult.data.bookings || [])
      
      console.log('Multi-property bookings created:', createdBookings)
      updateProgress(ProcessingStatus.SAVING_TO_DATABASE, 80, 'Multi-property bookings saved', `${createdBookings.length} bookings created`)

      // Step 5: Save field value changes if any edits were made (80-90%)
      if (previewState?.fieldEdits && previewState.fieldEdits.length > 0) {
        updateProgress(ProcessingStatus.SAVING_TO_DATABASE, 85, 'Saving field change history...')
        
        try {
          const fieldChangesToSave = previewState.fieldEdits.map((edit: PreviewFieldEdit) => {
            const originalBookingPayload = bookingPayloads[edit.bookingIndex]
            if (!originalBookingPayload) return null
            
            const createdBooking = createdBookings.find((booking: any) => {
              const bookingCode = String(booking.reservationCode || booking.reservation_code || '').trim()
              const payloadCode = String(originalBookingPayload.reservationCode || '').trim()
              return bookingCode === payloadCode
            })
            
            if (!createdBooking) return null
            
            return {
              bookingId: createdBooking.id,
              userId: profile!.id,
              fieldName: edit.fieldName,
              originalValue: edit.originalValue,
              editedValue: edit.newValue,
              changeReason: edit.reason || null
            }
          }).filter(Boolean)
          
          if (fieldChangesToSave.length > 0) {
            const fieldChangeResult = await createMultipleFieldChanges({
              fieldChanges: fieldChangesToSave
            })
            
            if (fieldChangeResult.status === 'success') {
              updateProgress(ProcessingStatus.SAVING_TO_DATABASE, 90, 'Field changes saved', `${fieldChangesToSave.length} field edits recorded`)
            }
          }
        } catch (error) {
          console.error('Error saving field changes:', error)
        }
      }

      // Step 6: Generate completion stats (90-100%)
      updateProgress(ProcessingStatus.CALCULATING_METRICS, 95, 'Calculating multi-property statistics...')
      
      const fieldEditCount = previewState?.fieldEdits?.length || 0
      const stats = generateMultiPropertyImportStats(bookingPayloads, createdBookings, propertyIdMap, fieldEditCount)
      setImportStats(stats)

      updateProgress(ProcessingStatus.COMPLETE, 100, 'Multi-property import completed successfully!', 'Statistics calculated')

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
        automatedActions: [
          `${createdBookings.length} bookings imported`, 
          `${newPropertiesToCreate.length} properties created`,
          'Multi-property statistics updated'
        ]
      })

    } catch (err) {
      console.error('Multi-property processing error:', err)
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

  // Multi-property import statistics
  const generateMultiPropertyImportStats = (bookingPayloads: CreateBookingPayload[], createdBookings: any[], propertyIdMap: Record<string, string>, fieldEditCount: number = 0) => {
    const totalBookings = bookingPayloads.length
    const totalRevenue = bookingPayloads.reduce((sum, booking) => 
      sum + (booking.totalPayout || 0), 0)
    
    const platformBreakdown = bookingPayloads.reduce((acc, booking) => {
      acc[booking.platform] = (acc[booking.platform] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Property breakdown
    const propertyBreakdown = bookingPayloads.reduce((acc, booking) => {
      const propertyName = booking.listingName || 'Unknown Property'
      acc[propertyName] = (acc[propertyName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const dates = bookingPayloads
      .map(b => b.checkInDate)
      .filter(date => date)
      .sort()

    return {
      bookingsImported: totalBookings,
      propertiesUpdated: Object.keys(propertyIdMap).length,
      propertiesCreated: Object.keys(createdProperties).length,
      totalRevenue,
      calculationStatus: '100%',
      dateRange: {
        start: dates[0] || new Date().toISOString().split('T')[0],
        end: dates[dates.length - 1] || new Date().toISOString().split('T')[0]
      },
      platformBreakdown,
      propertyBreakdown,
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