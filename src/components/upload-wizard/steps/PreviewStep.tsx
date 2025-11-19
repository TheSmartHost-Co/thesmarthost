'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, EyeIcon, UserIcon } from '@heroicons/react/24/outline'
import { parseCsvFile } from '@/utils/csvParser'
import { CsvData } from '@/services/types/csvMapping'

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

  // Formula evaluator function
  const evaluateFormula = (formula: string, csvRow: string[], csvHeaders: any[]): number | string => {
    try {
      // Check if it's a simple column reference first
      const simpleColumnIndex = csvHeaders.findIndex(h => h.name === formula)
      if (simpleColumnIndex !== -1) {
        const value = csvRow[simpleColumnIndex]
        const numValue = parseFloat(value)
        return isNaN(numValue) ? value : numValue
      }

      // For complex formulas, replace column names with values
      let expression = formula
      csvHeaders.forEach((header, index) => {
        const columnName = header.name
        const columnValue = csvRow[index] || '0'
        const numValue = parseFloat(columnValue)
        const valueToUse = isNaN(numValue) ? '0' : numValue.toString()
        
        // Replace column name with value (use word boundaries to avoid partial matches)
        const regex = new RegExp(`\\b${columnName}\\b`, 'g')
        expression = expression.replace(regex, valueToUse)
      })

      // Evaluate the mathematical expression safely
      // Only allow numbers, operators, parentheses, and decimal points
      if (!/^[0-9+\-*/.() ]+$/.test(expression)) {
        console.warn(`Invalid formula expression: ${expression}`)
        return formula // Return original formula if invalid
      }

      // Use Function constructor for safe evaluation
      const result = new Function(`return ${expression}`)()
      return isNaN(result) ? 0 : parseFloat(result.toFixed(2))
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
      
      // Apply field mappings to create booking object
      fieldMappings.forEach(mapping => {
        if (mapping.csvFormula && mapping.csvFormula.trim()) {
          // Evaluate the formula (handles both simple mappings and complex calculations)
          const result = evaluateFormula(mapping.csvFormula, row, csvData.headers)
          booking[mapping.bookingField] = result
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
                  {mappedFields.map((field: any) => (
                    <td key={field.field} className="px-3 py-2 text-sm text-gray-900">
                      <div className="max-w-32 truncate" title={booking[field.field]}>
                        {booking[field.field] || <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                  ))}
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
          disabled={!canGoBack}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Back to Field Mapping
        </button>
        
        <button
          onClick={onNext}
          disabled={!canGoNext || !hasValidMappings}
          className="cursor-pointer px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {hasValidMappings ? 'Continue to Import' : 'Fix Required Fields First'}
        </button>
      </div>
    </div>
  )
}

export default PreviewStep