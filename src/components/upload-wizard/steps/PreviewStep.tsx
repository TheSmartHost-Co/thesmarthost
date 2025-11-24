'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, EyeIcon, UserIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { parseCsvFile } from '@/utils/csvParser'
import { CsvData } from '@/services/types/csvMapping'
import { CreateBookingPayload } from '@/services/types/booking'
import { useUserStore } from '@/store/useUserStore'

interface PreviewStepProps {
  onNext?: () => void
  onBack?: () => void
  onCancel?: () => void
  canGoNext?: boolean
  canGoBack?: boolean
  config?: any
  uploadedFile?: any
  previewState?: any
  validationState?: any
  selectedProperty?: any
  onPreviewComplete?: (state: any) => void
}

interface BookingPreview {
  rowIndex: number
  [key: string]: any
}

const PreviewStep: React.FC<PreviewStepProps> = ({
  onNext,
  onBack,
  onCancel,
  canGoNext,
  canGoBack,
  uploadedFile,
  validationState,
  selectedProperty,
  onPreviewComplete
}) => {
  const [csvData, setCsvData] = useState<CsvData | null>(null)
  const [bookingPreviews, setBookingPreviews] = useState<BookingPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewCount, setPreviewCount] = useState(5) // Show first 5 bookings by default
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmedPayloads, setConfirmedPayloads] = useState<CreateBookingPayload[] | null>(null)

  const { profile } = useUserStore()

  // Load CSV data and generate booking previews
  useEffect(() => {
    const loadPreviewData = async () => {
      if (!uploadedFile) {
        setError('No file uploaded')
        setLoading(false)
        return
      }

      if (!validationState?.fieldMappings) {
        setError('No field mappings found')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        // Extract the actual File object from the UploadedFile structure
        const fileToProcess = uploadedFile.file || uploadedFile
        const data = await parseCsvFile(fileToProcess)
        setCsvData(data)
        
        // Generate booking previews
        const previews = generateBookingPreviews(data, validationState.fieldMappings)
        setBookingPreviews(previews)
        
        // Notify parent component
        onPreviewComplete?.({
          csvData: data,
          bookingPreviews: previews,
          totalBookings: data.totalRows
        })
        
        setError(null)
      } catch (err) {
        console.error('Error loading preview data:', err)
        setError('Failed to generate booking preview')
      } finally {
        setLoading(false)
      }
    }

    loadPreviewData()
  }, [uploadedFile, validationState])

  // Helper function to escape special regex characters
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  // Formula evaluator function
  const evaluateFormula = (formula: string, csvRow: string[], csvHeaders: any[]): number | string => {
    try {
      console.log('=== Formula Evaluation Debug ===')
      console.log('Formula:', formula)
      console.log('CSV Headers:', csvHeaders.map(h => h.name))
      console.log('CSV Row:', csvRow)
      
      // Create a lowercase mapping for all columns
      const valueMap = new Map<string, string>()
      csvHeaders.forEach((header, index) => {
        const columnValue = csvRow[index] || '0'
        
        // Special handling for date fields - keep original text format
        const headerLower = header.name.toLowerCase()
        if (headerLower.includes('date') || headerLower.includes('check-in') || headerLower.includes('checkin')) {
          valueMap.set(headerLower, columnValue)
          console.log(`Mapped "${header.name}" (${headerLower}) → "${columnValue}" [raw: "${columnValue}"] (DATE)`)
          return
        }
        
        const numValue = parseFloat(columnValue)
        // For numeric calculations, use numbers. For text, keep original text
        const valueToUse = isNaN(numValue) ? columnValue : numValue.toString()
        valueMap.set(headerLower, valueToUse)
        console.log(`Mapped "${header.name}" (${headerLower}) → "${valueToUse}" [raw: "${columnValue}"]`)
      })
      
      // Check if it's a simple column reference first
      const simpleValue = valueMap.get(formula.toLowerCase())
      if (simpleValue !== undefined) {
        console.log('Simple column mapping:', formula, '→', simpleValue)
        
        // For date-related formulas, always return the original string value
        const formulaLower = formula.toLowerCase()
        if (formulaLower.includes('date') || formulaLower.includes('check-in') || formulaLower.includes('checkin')) {
          return simpleValue
        }
        
        // For non-date fields, try to parse as number
        const numValue = parseFloat(simpleValue)
        return isNaN(numValue) ? simpleValue : numValue
      }

      // For complex formulas, split by operators and replace each term
      let expression = formula.toLowerCase() // Convert entire formula to lowercase
      console.log('Starting expression (lowercase):', expression)
      
      // Replace each mapped column with its value
      valueMap.forEach((value, key) => {
        // Use word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${escapeRegExp(key)}\\b`, 'g')
        const beforeReplace = expression
        expression = expression.replace(regex, value)
        
        if (expression !== beforeReplace) {
          console.log(`  Replaced "${key}" with "${value}"`)
          console.log(`  Expression: ${beforeReplace} → ${expression}`)
        }
      })

      console.log('Final expression:', expression)

      // Evaluate the mathematical expression safely
      if (!/^[0-9+\-*/.() ]+$/.test(expression)) {
        console.warn(`Invalid formula expression: ${expression}`)
        console.warn('Expression contains non-numeric/operator characters')
        return formula // Return original formula if invalid
      }

      // Use Function constructor for safe evaluation
      const result = new Function(`return ${expression}`)()
      const finalResult = isNaN(result) ? 0 : parseFloat(result.toFixed(2))
      console.log('Final result:', finalResult)
      console.log('=== End Debug ===')
      
      return finalResult
    } catch (error) {
      console.error(`Formula evaluation error for "${formula}":`, error)
      return formula // Return original formula if evaluation fails
    }
  }

  const generateBookingPreviews = (csvData: CsvData, fieldMappings: any[]): BookingPreview[] => {
    const previews: BookingPreview[] = []
    
    // Take only the first few rows for preview
    const rowsToPreview = Math.min(csvData.rows.length, 10)
    
    for (let i = 0; i < rowsToPreview; i++) {
      const row = csvData.rows[i]
      const booking: BookingPreview = {
        rowIndex: i + 1
      }
      
      // Sort mappings to handle dependencies (process CSV columns first, then calculated fields)
      const sortedMappings = [...fieldMappings].sort((a, b) => {
        // CSV column references should be processed first
        const aIsDirect = csvData.headers.some(h => h.name.toLowerCase() === a.csvFormula.toLowerCase())
        const bIsDirect = csvData.headers.some(h => h.name.toLowerCase() === b.csvFormula.toLowerCase())
        
        if (aIsDirect && !bIsDirect) return -1
        if (!aIsDirect && bIsDirect) return 1
        return 0
      })
      
      // Apply field mappings to create booking object
      sortedMappings.forEach(mapping => {
        if (mapping.csvFormula && mapping.csvFormula.trim()) {
          // Check if this is a simple CSV column reference
          const isSimpleColumn = csvData.headers.some(h => h.name.toLowerCase() === mapping.csvFormula.toLowerCase())
          
          if (isSimpleColumn) {
            // For simple column mappings, use original CSV data only
            const result = evaluateFormula(mapping.csvFormula, row, csvData.headers)
            booking[mapping.bookingField] = result
            
            // Debug logging for date fields
            if (mapping.bookingField.includes('date')) {
              console.log(`BOOKING PREVIEW: ${mapping.bookingField} = ${result} (simple mapping)`)
            }
          } else {
            // For complex formulas, create extended headers that include both CSV columns and already calculated booking fields
            const extendedHeaders = [
              ...csvData.headers,
              ...Object.keys(booking).map((field, index) => ({
                name: field,
                index: csvData.headers.length + index
              }))
            ]
            
            // Create extended row that includes both CSV values and calculated values
            // Be careful with date fields - preserve original format
            const extendedRow = [
              ...row,
              ...Object.keys(booking).map(field => {
                const value = booking[field]
                // For date-related fields, if we have a value that looks like just a year, 
                // try to find the original date in the CSV
                if ((field.includes('date') || field.includes('check')) && 
                    value && String(value).match(/^\d{4}$/)) {
                  // Look for the original date value in CSV
                  const originalDateIndex = csvData.headers.findIndex(h => 
                    h.name.toLowerCase().includes('date') || 
                    h.name.toLowerCase().includes('check')
                  )
                  if (originalDateIndex !== -1 && row[originalDateIndex]) {
                    return row[originalDateIndex]
                  }
                }
                return String(value || '0')
              })
            ]
            
            // Evaluate the formula (handles complex calculations with references to other fields)
            const result = evaluateFormula(mapping.csvFormula, extendedRow, extendedHeaders)
            booking[mapping.bookingField] = result
            
            // Debug logging for date fields
            if (mapping.bookingField.includes('date')) {
              console.log(`BOOKING PREVIEW: ${mapping.bookingField} = ${result} (complex formula)`)
            }
          }
        }
      })
      
      previews.push(booking)
    }
    
    return previews
  }

  const getMappedFields = () => {
    if (!validationState?.fieldMappings) return []
    
    return validationState.fieldMappings
      .filter((mapping: any) => mapping.csvFormula && mapping.csvFormula.trim())
      .map((mapping: any) => ({
        field: mapping.bookingField,
        source: mapping.csvFormula,
        platform: mapping.platform
      }))
  }

  const getRequiredFieldsMissing = () => {
    const mappedFields = getMappedFields().map((f: any) => f.field)
    const requiredFields = ['reservation_code', 'guest_name', 'check_in_date', 'num_nights', 'platform', 'listing_name']
    return requiredFields.filter((field: string) => !mappedFields.includes(field))
  }

  // Generate booking payloads from preview data (moved from ProcessStep)
  const generateBookingPayloads = (): CreateBookingPayload[] => {
    if (!bookingPreviews || !selectedProperty || !profile) {
      throw new Error('Missing required data for booking generation')
    }

    return bookingPreviews.map((preview, index) => {
      // Convert preview booking to CreateBookingPayload format
      console.log("hussein" + preview)
      const payload: CreateBookingPayload = {
        userId: profile.id,
        propertyId: selectedProperty.id,
        csvUploadId: '', // Will be set by ProcessStep when CSV upload record is created
        reservationCode: preview.reservation_code || preview.reservationId || `AUTO-${Date.now()}-${index}`,
        guestName: preview.guest_name || preview.guestName || 'Unknown Guest',
        checkInDate: formatDate(preview.check_in_date || preview.checkInDate),
        checkOutDate: preview.check_out_date || preview.checkOutDate ? formatDate(preview.check_out_date || preview.checkOutDate) : undefined,
        numNights: parseInt(String(preview.num_nights || preview.nights)) || 1,
        platform: mapPlatformName(String(preview.platform || 'direct')),
        listingName: preview.listing_name || preview.propertyName,
        // Financial fields - use the exact values from preview (already calculated)
        nightlyRate: parseFloat(String(preview.nightly_rate || preview.nightlyRate || 0)) || undefined,
        extraGuestFees: parseFloat(String(preview.extra_guest_fees || preview.extraGuestFees || 0)) || undefined,
        cleaningFee: parseFloat(String(preview.cleaning_fee || preview.cleaningFee || 0)) || undefined,
        lodgingTax: parseFloat(String(preview.lodging_tax || preview.lodgingTax || 0)) || undefined,
        bedLinenFee: parseFloat(String(preview.bed_linen_fee || preview.bedLinenFee || 0)) || undefined,
        gst: parseFloat(String(preview.gst || 0)) || undefined,
        qst: parseFloat(String(preview.qst || 0)) || undefined,
        channelFee: parseFloat(String(preview.channel_fee || preview.channelFee || 0)) || undefined,
        stripeFee: parseFloat(String(preview.stripe_fee || preview.stripeFee || 0)) || undefined,
        salesTax: parseFloat(String(preview.sales_tax || preview.salesTax || 0)) || undefined,
        totalPayout: parseFloat(String(preview.total_payout || preview.totalAmount || preview.totalPayout || 0)) || undefined,
        mgmtFee: parseFloat(String(preview.mgmt_fee || preview.mgmtFee || 0)) || undefined,
        netEarnings: parseFloat(String(preview.net_earnings || preview.netAmount || preview.netEarnings || 0)) || undefined,
      }

      return payload
    })
  }

  const formatDate = (dateString: string): string => {
    if (!dateString) return new Date().toISOString().split('T')[0]
    
    // If it's already in YYYY-MM-DD format, keep it
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: ${dateString}, using today`)
        return new Date().toISOString().split('T')[0]
      }
      return date.toISOString().split('T')[0]
    } catch (error) {
      console.warn(`Error parsing date: ${dateString}`, error)
      return new Date().toISOString().split('T')[0]
    }
  }

  const mapPlatformName = (platform: string): 'airbnb' | 'booking' | 'google' | 'direct' | 'wechalet' | 'monsieurchalets' | 'vrbo' | 'hostaway' => {
    const platformLower = platform.toLowerCase()
    
    if (platformLower.includes('airbnb')) return 'airbnb'
    if (platformLower.includes('booking')) return 'booking'
    if (platformLower.includes('google')) return 'google'
    if (platformLower.includes('vrbo')) return 'vrbo'
    if (platformLower.includes('hostaway')) return 'hostaway'
    if (platformLower.includes('wechalet') || platformLower.includes('we chalet')) return 'wechalet'
    if (platformLower.includes('monsieur') || platformLower.includes('chalets')) return 'monsieurchalets'
    
    return 'direct'
  }

  // Handle "Confirm Values" button click
  const handleConfirmValues = async () => {
    try {
      setIsConfirming(true)
      
      // Generate booking payloads from current preview data
      const payloads = generateBookingPayloads()
      setConfirmedPayloads(payloads)
      
      // Update parent component with confirmed data
      onPreviewComplete?.({
        csvData,
        bookingPreviews,
        confirmedPayloads: payloads,
        totalBookings: csvData?.totalRows || 0,
        isConfirmed: true
      })
      
      // Proceed to next step (ProcessStep)
      onNext?.()
      
    } catch (error) {
      console.error('Error confirming values:', error)
      setError('Failed to confirm booking values. Please try again.')
    } finally {
      setIsConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Generating booking preview...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">Preview Error</h3>
          <p className="text-red-700">{error}</p>
          {canGoBack && (
            <button
              onClick={onBack}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    )
  }

  const mappedFields = getMappedFields()
  const missingRequired = getRequiredFieldsMissing()
  const hasValidMappings = missingRequired.length === 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center">
          <EyeIcon className="h-6 w-6 mr-2" />
          Booking Preview
        </h2>
        <p className="text-gray-600">
          Review your bookings before processing. Showing {Math.min(previewCount, bookingPreviews.length)} of {csvData?.totalRows} bookings.
        </p>
      </div>

      {/* Property & Summary Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            {selectedProperty && (
              <>
                <h3 className="text-sm font-medium text-blue-900">Property</h3>
                <p className="text-sm text-blue-700 mb-2">
                  {selectedProperty.listingName} ({selectedProperty.address})
                </p>
              </>
            )}
            <h3 className="text-sm font-medium text-blue-900">Summary</h3>
            <p className="text-sm text-blue-700">
              {csvData?.totalRows} total bookings • {mappedFields.length} fields mapped
            </p>
          </div>
          <CheckCircleIcon className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      {/* Validation Status */}
      {missingRequired.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">
            ⚠️ Missing Required Fields
          </h4>
          <div className="text-sm text-yellow-700">
            The following required fields are not mapped: {missingRequired.join(', ')}
          </div>
        </div>
      )}

      {/* Field Mappings Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Field Mappings</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {mappedFields.map((field: any, index: number) => (
            <div key={index} className="text-xs bg-white border rounded px-2 py-1">
              <span className="font-medium text-gray-900">{field.field}</span>
              <span className="text-gray-500"> ← </span>
              <span className="text-gray-600">{field.source}</span>
              {field.platform !== 'ALL' && (
                <span className="ml-1 text-blue-600">({field.platform})</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Booking Previews */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h4 className="text-sm font-medium text-gray-900">Booking Previews</h4>
          <p className="text-xs text-gray-600 mt-1">
            Preview of how your bookings will look after import
          </p>
        </div>
        
        <div className="overflow-x-auto max-h-96">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                {mappedFields.map((field: any) => (
                  <th key={field.field} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    {field.field}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookingPreviews.slice(0, previewCount).map((booking, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {booking.rowIndex}
                  </td>
                  {mappedFields.map((field: any) => {
                    const value = booking[field.field]
                    const isDateField = field.field.includes('date') || field.field === 'check_in_date' || field.field === 'check_out_date'
                    
                    return (
                      <td key={field.field} className="px-3 py-2 text-sm text-gray-900">
                        <div className={`${isDateField ? 'min-w-24' : 'max-w-32'} truncate`} title={value}>
                          {value || <span className="text-gray-400">—</span>}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Show More Button */}
        {bookingPreviews.length > previewCount && (
          <div className="p-4 border-t border-gray-200 text-center">
            <button
              onClick={() => setPreviewCount(prev => Math.min(prev + 5, bookingPreviews.length))}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Show More Bookings ({previewCount} of {bookingPreviews.length} shown)
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onBack}
          disabled={!canGoBack || isConfirming}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Back to Field Mapping
        </button>
        
        <div className="flex items-center space-x-3">
          {hasValidMappings && (
            <div className="text-sm text-gray-600">
              Ready to import {bookingPreviews.length} bookings
            </div>
          )}
          
          <button
            onClick={handleConfirmValues}
            disabled={!canGoNext || !hasValidMappings || isConfirming}
            className="cursor-pointer px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isConfirming ? (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                Confirming...
              </>
            ) : hasValidMappings ? (
              <>
                <CheckCircleIcon className="h-4 w-4 mr-2" />
                Confirm & Import
              </>
            ) : (
              'Fix Required Fields First'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PreviewStep