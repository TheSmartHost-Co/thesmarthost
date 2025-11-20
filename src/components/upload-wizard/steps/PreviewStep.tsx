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