'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, EyeIcon, UserIcon, ArrowPathIcon, PencilIcon } from '@heroicons/react/24/outline'
import { parseCsvFile } from '@/utils/csvParser'
import { CsvData } from '@/services/types/csvMapping'
import { CreateBookingPayload } from '@/services/types/booking'
import { useUserStore } from '@/store/useUserStore'
import EditFieldModal from '@/components/field-value-changed/EditFieldModal'
import { PreviewFieldEdit } from '@/services/types/fieldValueChanged'
import { isFinancialField, formatFieldName } from '@/services/fieldValuesChangedService'

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
  propertyMappingState?: any
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
  propertyMappingState,
  onPreviewComplete
}) => {
  const [csvData, setCsvData] = useState<CsvData | null>(null)
  const [bookingPreviews, setBookingPreviews] = useState<BookingPreview[]>([])
  const [groupedBookings, setGroupedBookings] = useState<Record<string, BookingPreview[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewCount, setPreviewCount] = useState(5) // Show first 5 bookings by default
  const [propertyDisplayCounts, setPropertyDisplayCounts] = useState<Record<string, number>>({})
  const [isConfirming, setIsConfirming] = useState(false)
  const [confirmedPayloads, setConfirmedPayloads] = useState<CreateBookingPayload[] | null>(null)
  
  // Field editing state
  const [fieldEdits, setFieldEdits] = useState<PreviewFieldEdit[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingField, setEditingField] = useState<{
    bookingIndex: number
    fieldName: string
    originalValue: string
    currentValue?: string
    bookingInfo: {
      reservationCode: string
      guestName: string
      checkInDate: string
    }
  } | null>(null)

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
        
        // Group bookings by property for multi-property display
        const grouped = groupBookingsByProperty(previews)
        setGroupedBookings(grouped)

        console.log('Total booking previews:', previews.length)
        console.log('Unique listing names found:', Object.keys(grouped))
        console.log('Grouped bookings:', grouped)
        console.log('Property mapping state:', propertyMappingState)
        
        // Notify parent component
        onPreviewComplete?.({
          csvData: data,
          bookingPreviews: previews,
          groupedBookings: grouped,
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

  // Group bookings by their listing name for multi-property display
  const groupBookingsByProperty = (bookings: BookingPreview[]): Record<string, BookingPreview[]> => {
    const groups: Record<string, BookingPreview[]> = {}
    
    bookings.forEach(booking => {
      const listingName = booking.listing_name || booking.propertyName || 'Unknown Property'
      if (!groups[listingName]) {
        groups[listingName] = []
      }
      groups[listingName].push(booking)
    })
    
    return groups
  }

  // Get property mapping info for a listing name
  const getPropertyMapping = (listingName: string) => {
    return propertyMappingState?.propertyMappings?.find(
      (mapping: any) => mapping.listingName === listingName
    )
  }

  // Formula evaluator function
  const evaluateFormula = (formula: string, csvRow: string[], csvHeaders: any[]): number | string => {
    try {
      // Removed excessive logging
      
      // Create a lowercase mapping for all columns
      const valueMap = new Map<string, string>()
      csvHeaders.forEach((header, index) => {
        const columnValue = csvRow[index] || '0'
        
        // Special handling for date fields and listing names - keep original text format
        const headerLower = header.name.toLowerCase()
        if (headerLower.includes('date') || headerLower.includes('check-in') || headerLower.includes('checkin')) {
          valueMap.set(headerLower, columnValue)
          return
        }
        
        const numValue = parseFloat(columnValue)
        // For numeric calculations, use numbers. For text, keep original text
        const valueToUse = isNaN(numValue) ? columnValue : numValue.toString()
        valueMap.set(headerLower, valueToUse)
      })
      
      // Check if it's a simple column reference first
      const simpleValue = valueMap.get(formula.toLowerCase())
      if (simpleValue !== undefined) {
        // Simple column mapping found
        
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

      
      // Replace each mapped column with its value
      valueMap.forEach((value, key) => {
        // Use word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${escapeRegExp(key)}\\b`, 'g')
        const beforeReplace = expression
        expression = expression.replace(regex, value)
        
      })

      // Evaluate the mathematical expression safely
      if (!/^[0-9+\-*/.() ]+$/.test(expression)) {
        console.warn(`Invalid formula expression: ${expression}`)
        console.warn('Expression contains non-numeric/operator characters')
        return formula // Return original formula if invalid
      }

      // Use Function constructor for safe evaluation
      const result = new Function(`return ${expression}`)()
      const finalResult = isNaN(result) ? 0 : parseFloat(result.toFixed(2))
      
      return finalResult
    } catch (error) {
      console.error(`Formula evaluation error for "${formula}":`, error)
      return formula // Return original formula if evaluation fails
    }
  }

  // Helper function to determine the platform for a specific booking row
  const determineBookingPlatform = (row: string[], fieldMappings: any[], csvHeaders: any[]): string => {
    // Find the platform field mapping
    const platformMapping = fieldMappings.find(m => 
      (m.bookingField === 'platform' || m.bookingField === 'Platform') && 
      m.csvFormula && 
      m.csvFormula.trim()
    )
    
    if (!platformMapping) {
      return 'ALL' // Default to ALL if no platform mapping exists
    }
    
    // Extract platform value from the row
    let platformValue = ''
    
    // Check if it's a simple column reference
    const isSimpleColumn = csvHeaders.some(h => h.name.toLowerCase() === platformMapping.csvFormula.toLowerCase())
    
    if (isSimpleColumn) {
      const columnIndex = csvHeaders.findIndex(h => h.name.toLowerCase() === platformMapping.csvFormula.toLowerCase())
      if (columnIndex !== -1) {
        platformValue = (row[columnIndex] || '').trim().toLowerCase()
      }
    } else {
      // For formula-based platform determination, evaluate the formula
      try {
        const result = evaluateFormula(platformMapping.csvFormula, row, csvHeaders)
        platformValue = String(result || '').trim().toLowerCase()
      } catch (error) {
        console.warn('Error evaluating platform formula:', error)
        platformValue = ''
      }
    }
    
    // Handle platform override (PLATFORM:airbnb format)
    if (platformValue.startsWith('platform:')) {
      platformValue = platformValue.replace('platform:', '')
    }
    
    // Map platform value to supported platform names
    if (platformValue.includes('airbnb')) return 'airbnb'
    if (platformValue.includes('booking')) return 'booking'
    if (platformValue.includes('google')) return 'google'
    if (platformValue.includes('vrbo')) return 'vrbo'
    if (platformValue.includes('hostaway')) return 'hostaway'
    if (platformValue.includes('wechalet') || platformValue.includes('we chalet')) return 'wechalet'
    if (platformValue.includes('monsieur') || platformValue.includes('chalets')) return 'monsieurchalets'
    if (platformValue.includes('direct-etransfer')) return 'direct-etransfer'
    if (platformValue.includes('direct')) return 'direct'
    
    return 'ALL' // Default fallback
  }
  
  // Helper function to get applicable mappings for a specific platform
  const getApplicableMappings = (allMappings: any[], bookingPlatform: string): any[] => {
    // Get base mappings (ALL platform)
    const baseMappings = allMappings.filter(m => m.platform === 'ALL' || !m.platform)
    
    // Get platform-specific overrides
    const platformOverrides = allMappings.filter(m => 
      m.platform === bookingPlatform && m.isOverride === true
    )
    
    // Debug logging
    if (bookingPlatform === 'airbnb' || bookingPlatform === 'vrbo') {
      console.log(`getApplicableMappings for ${bookingPlatform}:`)
      console.log('Base mappings:', baseMappings.length)
      console.log('Platform overrides found:', platformOverrides)
      console.log('All mappings passed in:', allMappings.filter(m => m.platform === bookingPlatform))
      console.log('Available platform values:', [...new Set(allMappings.map(m => m.platform))])
    }
    
    // Create result array starting with base mappings
    const applicableMappings = [...baseMappings]
    
    // Apply platform overrides (replace base mappings for same fields)
    platformOverrides.forEach(override => {
      const baseIndex = applicableMappings.findIndex(m => m.bookingField === override.bookingField)
      if (baseIndex >= 0) {
        // Replace base mapping with platform override
        applicableMappings[baseIndex] = override
      } else {
        // Add new platform-specific field
        applicableMappings.push(override)
      }
    })
    
    return applicableMappings
  }

  const generateBookingPreviews = (csvData: CsvData, fieldMappings: any[]): BookingPreview[] => {
    const previews: BookingPreview[] = []
    
    // Take all rows for multi-property flow (we need to see all properties)
    const rowsToPreview = csvData.rows.length
    
    for (let i = 0; i < rowsToPreview; i++) {
      const row = csvData.rows[i]
      const booking: BookingPreview = {
        rowIndex: i + 1
      }
      
      // Step 1: Determine the platform for this booking row
      const bookingPlatform = determineBookingPlatform(row, fieldMappings, csvData.headers)
      
      // Debug logging for all rows to see platform detection
      if (i < 8) { // Check all 8 rows in your CSV
        console.log(`Row ${i + 1}: Detected platform = "${bookingPlatform}"`)
        // Debug the actual platform value in CSV
        const platformMapping = fieldMappings.find(m => m.bookingField === 'platform')
        if (platformMapping) {
          const columnIndex = csvData.headers.findIndex(h => h.name.toLowerCase() === platformMapping.csvFormula.toLowerCase())
          if (columnIndex !== -1) {
            const rawValue = row[columnIndex]
            const processedValue = (rawValue || '').trim().toLowerCase()
            console.log(`Row ${i + 1}: Raw CSV platform value = "${rawValue}" -> processed = "${processedValue}"`)
            
            // Additional debug for mapping logic
            if (processedValue.includes('airbnb')) console.log(`Row ${i + 1}: Should map to airbnb`)
            if (processedValue.includes('vrbo')) console.log(`Row ${i + 1}: Should map to vrbo`) 
          } else {
            console.log(`Row ${i + 1}: Platform formula = "${platformMapping.csvFormula}"`)
          }
        } else {
          console.log(`Row ${i + 1}: No platform mapping found`)
        }
      }
      
      // Step 2: Get applicable mappings (ALL + platform-specific overrides)
      const applicableMappings = getApplicableMappings(fieldMappings, bookingPlatform)
      
      // Debug logging for platform override usage
      if (i < 3) {
        const overrideCount = applicableMappings.filter(m => m.platform === bookingPlatform && m.isOverride).length
        const baseCount = applicableMappings.filter(m => m.platform === 'ALL' || !m.platform).length
        console.log(`Row ${i + 1}: Using ${baseCount} base mappings + ${overrideCount} ${bookingPlatform} overrides`)
      }
      
      // Sort mappings to handle dependencies (process CSV columns first, then calculated fields)
      const sortedMappings = [...applicableMappings].sort((a, b) => {
        // CSV column references should be processed first
        const aIsDirect = csvData.headers.some(h => h.name.toLowerCase() === a.csvFormula.toLowerCase())
        const bIsDirect = csvData.headers.some(h => h.name.toLowerCase() === b.csvFormula.toLowerCase())
        
        if (aIsDirect && !bIsDirect) return -1
        if (!aIsDirect && bIsDirect) return 1
        return 0
      })
      
      // Step 3: Apply platform-aware field mappings to create booking object
      sortedMappings.forEach(mapping => {
        if (mapping.csvFormula && mapping.csvFormula.trim()) {
          // Check if this is a simple CSV column reference
          const isSimpleColumn = csvData.headers.some(h => h.name.toLowerCase() === mapping.csvFormula.toLowerCase())
          
          if (isSimpleColumn) {
            // For listing names, use direct CSV extraction to avoid parseFloat truncation
            if (mapping.bookingField === 'listing_name' || mapping.bookingField === 'listingName') {
              const columnIndex = csvData.headers.findIndex(h => h.name.toLowerCase() === mapping.csvFormula.toLowerCase())
              booking[mapping.bookingField] = columnIndex !== -1 ? (row[columnIndex] || '').trim() : ''
            } else {
              // For other simple column mappings, use formula evaluation
              const result = evaluateFormula(mapping.csvFormula, row, csvData.headers)
              booking[mapping.bookingField] = result
            }
            
            // Debug logging for date fields
            if (mapping.bookingField.includes('date')) {
              // Mapped booking field
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
              // Complex formula mapped
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
    
    const allMappings = validationState.fieldMappings
      .filter((mapping: any) => mapping.csvFormula && mapping.csvFormula.trim())
    
    console.log('Raw field mappings received:', allMappings)
    console.log('Platform-specific mappings:', allMappings.filter((m: any) => m.platform !== 'ALL' && m.platform && m.isOverride))
    console.log('ALL platform mappings:', allMappings.filter((m: any) => m.platform === 'ALL' || !m.platform))
    
    const uniqueFields = new Map<string, any>()
    
    // First, add base (ALL) mappings
    allMappings
      .filter((m: any) => m.platform === 'ALL' || !m.platform)
      .forEach((m: any) => {
        if (!uniqueFields.has(m.bookingField)) {
          uniqueFields.set(m.bookingField, {
            field: m.bookingField,
            source: m.csvFormula,
            platform: 'ALL',
            isOverride: false,
            hasOverride: false,
            overridePlatforms: new Set<string>()
          })
        }
      })
    
    // Then mark which fields have platform overrides
    allMappings
      .filter((m: any) => m.platform && m.platform !== 'ALL' && m.isOverride)
      .forEach((m: any) => {
        const existing = uniqueFields.get(m.bookingField)
        if (existing) {
          existing.hasOverride = true
          existing.overridePlatforms.add(m.platform)
        } else {
          // Field exists only as platform override, no ALL mapping
          uniqueFields.set(m.bookingField, {
            field: m.bookingField,
            source: m.csvFormula,
            platform: m.platform,
            isOverride: true,
            hasOverride: true,
            overridePlatforms: new Set([m.platform])
          })
        }
      })
    
    // Convert Sets to arrays for rendering
    const result = Array.from(uniqueFields.values()).map(f => ({
      ...f,
      overridePlatforms: Array.from(f.overridePlatforms || [])
    }))
    
    console.log('Field mappings for display (with override info):', result)
    
    return result
  }

  const getRequiredFieldsMissing = () => {
    const mappedFields = getMappedFields().map((f: any) => f.field)
    const requiredFields = ['reservation_code', 'guest_name', 'check_in_date', 'num_nights', 'platform', 'listing_name']
    return requiredFields.filter((field: string) => !mappedFields.includes(field))
  }

  // Field editing helper functions
  const handleEditField = (bookingIndex: number, fieldName: string, originalValue: string) => {
    const booking = bookingPreviews[bookingIndex]
    if (!booking) return

    // Get current edited value if it exists
    const existingEdit = fieldEdits.find(edit => 
      edit.bookingIndex === bookingIndex && edit.fieldName === fieldName
    )

    setEditingField({
      bookingIndex,
      fieldName,
      originalValue,
      currentValue: existingEdit?.newValue,
      bookingInfo: {
        reservationCode: booking.reservation_code || booking.reservationId || `Row ${bookingIndex + 1}`,
        guestName: booking.guest_name || booking.guestName || 'Unknown Guest',
        checkInDate: booking.check_in_date || booking.checkInDate || ''
      }
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = (edit: PreviewFieldEdit) => {
    setFieldEdits(prev => {
      // Remove any existing edit for this booking/field combination
      const filtered = prev.filter(e => 
        !(e.bookingIndex === edit.bookingIndex && e.fieldName === edit.fieldName)
      )
      // Add the new edit
      return [...filtered, edit]
    })
    
    // Update the booking preview with the new value
    setBookingPreviews(prev => prev.map((booking, index) => {
      if (index === edit.bookingIndex) {
        return {
          ...booking,
          [edit.fieldName]: edit.newValue
        }
      }
      return booking
    }))
  }

  const getFieldValue = (booking: BookingPreview, fieldName: string): string => {
    return String(booking[fieldName] || '')
  }

  const isFieldEdited = (bookingIndex: number, fieldName: string): boolean => {
    return fieldEdits.some(edit => 
      edit.bookingIndex === bookingIndex && edit.fieldName === fieldName
    )
  }

  const getEditableFields = (): string[] => {
    // Financial fields that can be edited
    return [
      'nightly_rate', 'cleaning_fee', 'total_payout', 'net_earnings', 
      'sales_tax', 'mgmt_fee', 'extra_guest_fees', 'lodging_tax', 
      'qst', 'gst', 'channel_fee', 'stripe_fee', 'bed_linen_fee'
    ]
  }

  // Generate booking payloads from preview data (moved from ProcessStep)
  const generateBookingPayloads = (): CreateBookingPayload[] => {
    if (!bookingPreviews || !profile) {
      throw new Error('Missing required data for booking generation')
    }

    // Multi-property flow requires property mappings
    if (!propertyMappingState?.propertyMappings) {
      throw new Error('No property mappings found')
    }

    return bookingPreviews.map((preview, index) => {
      // Convert preview booking to CreateBookingPayload format
      const payload: CreateBookingPayload = {
        userId: profile.id,
        propertyId: 'TEMP', // Will be updated in ProcessStep with correct property ID
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
        fieldEdits: fieldEdits,
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

      {/* Summary Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-blue-900">Summary</h3>
            <p className="text-sm text-blue-700">
              {csvData?.totalRows} total bookings • {mappedFields.length} fields mapped • {Object.keys(groupedBookings).length} properties
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
          {validationState?.fieldMappings?.filter((mapping: any) => mapping.csvFormula && mapping.csvFormula.trim()).map((mapping: any, index: number) => (
            <div key={index} className="text-xs bg-white border rounded px-2 py-1">
              <span className="font-medium text-gray-900">{mapping.bookingField}</span>
              <span className="text-gray-500"> ← </span>
              <span className="text-gray-600">{mapping.csvFormula}</span>
              {mapping.platform !== 'ALL' && (
                <span className="ml-1 text-blue-600">({mapping.platform})</span>
              )}
            </div>
          ))}
        </div>
        
        {/* Platform Override Legend */}
        {mappedFields.some((f: any) => f.platform !== 'ALL' && f.isOverride) && (
          <div className="mt-3 pt-3 border-t border-gray-300">
            <h5 className="text-xs font-medium text-gray-700 mb-2">Legend:</h5>
            <div className="flex flex-wrap gap-3 text-xs text-gray-600">
              <div className="flex items-center">
                <div className="w-4 h-3 bg-blue-50 border rounded mr-2"></div>
                <span>Platform-specific override applied</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-3 bg-yellow-50 border rounded mr-2"></div>
                <span>Manually edited value</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Property Booking Previews */}
      <div className="space-y-6">
        <h4 className="text-lg font-medium text-gray-900">Property Booking Previews</h4>
        
        {Object.entries(groupedBookings).map(([listingName, bookings]) => {
          const propertyMapping = getPropertyMapping(listingName)
          const displayCount = propertyDisplayCounts[listingName] || Math.min(bookings.length, 3) // Show first 3 per property
          
          return (
            <div key={listingName} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Property Header */}
              <div className="px-4 py-3 bg-blue-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-medium text-blue-900">{listingName}</h5>
                    <p className="text-xs text-blue-700">
                      {bookings.length} bookings • {propertyMapping?.isNewProperty ? 'New Property' : 'Existing Property'}
                    </p>
                  </div>
                  <div className="text-xs text-blue-600">
                    {propertyMapping?.isNewProperty ? '🏠 Creating New' : '✓ Mapped'}
                  </div>
                </div>
              </div>
              
              {/* Bookings Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      {mappedFields.map((field: any, fieldIndex: number) => (
                        <th key={`${field.field}-${fieldIndex}`} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {field.field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookings.slice(0, displayCount).map((booking, index) => {
                      const globalIndex = bookingPreviews.findIndex(b => b.rowIndex === booking.rowIndex)
                      
                      return (
                        <tr key={booking.rowIndex} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm text-gray-500">
                            {booking.rowIndex}
                          </td>
                          {mappedFields.map((field: any, fieldIndex: number) => {
                            const value = booking[field.field]
                            const isDateField = field.field.includes('date') || field.field === 'check_in_date' || field.field === 'check_out_date'
                            const isEditable = getEditableFields().includes(field.field)
                            const hasBeenEdited = isFieldEdited(globalIndex, field.field)
                            
                            // Determine if THIS specific booking is using a platform override
                            const bookingPlatform = csvData ? determineBookingPlatform(
                              csvData.rows[booking.rowIndex - 1], // Convert 1-based to 0-based index
                              validationState.fieldMappings,
                              csvData.headers
                            ) : 'ALL'
                            
                            // Check if this specific booking is using a platform-specific override for this field
                            const platformSpecificMapping = validationState.fieldMappings.find((m: any) => 
                              m.bookingField === field.field && 
                              m.platform === bookingPlatform && 
                              m.isOverride === true
                            )
                            
                            const isUsingPlatformOverride = platformSpecificMapping !== undefined
                            
                            return (
                              <td key={`${booking.rowIndex}-${field.field}-${fieldIndex}`} className={`px-3 py-2 text-sm text-gray-900 ${isEditable ? 'group relative' : ''}`}>
                                <div className={`${isDateField ? 'min-w-24' : 'max-w-32'} truncate`}>
                                  <div 
                                    className={`${hasBeenEdited ? 'bg-yellow-50 px-1 rounded' : isUsingPlatformOverride ? 'bg-blue-50 px-1 rounded' : ''}`}
                                    title={`${value}${isUsingPlatformOverride ? ` (${bookingPlatform} override)` : ''}`}
                                  >
                                    {value || <span className="text-gray-400">—</span>}
                                    {hasBeenEdited && (
                                      <span className="ml-1 text-xs text-yellow-600">*</span>
                                    )}
                                    {isUsingPlatformOverride && (
                                      <span 
                                        className="ml-1 text-xs text-white bg-blue-600 px-1 rounded"
                                        title={`Platform-specific override for ${bookingPlatform}`}
                                      >
                                        {bookingPlatform[0].toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {isEditable && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEditField(globalIndex, field.field, getFieldValue(booking, field.field))
                                    }}
                                    className="cursor-pointer absolute right-1 top-1/2 -translate-y-1/2 p-1 text-blue-600 hover:bg-blue-50 rounded transition-all duration-200 opacity-0 group-hover:opacity-100"
                                    title={`Edit ${formatFieldName(field.field)}`}
                                  >
                                    <PencilIcon className="h-3 w-3" />
                                  </button>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Show More for This Property */}
              {bookings.length > displayCount && (
                <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
                  <button 
                    onClick={() => setPropertyDisplayCounts(prev => ({
                      ...prev,
                      [listingName]: bookings.length
                    }))}
                    className="cursor-pointer text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View all {bookings.length} bookings for {listingName}
                  </button>
                </div>
              )}
            </div>
          )
        })}
        
        {Object.keys(groupedBookings).length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No bookings to preview. Please check your field mappings.
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

      {/* Edit Field Modal */}
      {editingField && (
        <EditFieldModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingField(null)
          }}
          fieldName={editingField.fieldName}
          originalValue={editingField.originalValue}
          currentValue={editingField.currentValue}
          bookingIndex={editingField.bookingIndex}
          bookingInfo={editingField.bookingInfo}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  )
}

export default PreviewStep