/**
 * Utilities for processing webhook field mappings and extracting values
 */

export interface WebhookFieldMapping {
  [bookingField: string]: string // Maps booking field names to webhook data paths
}

/**
 * Extracts a value from webhook data using a dot-notation path
 * Supports array indexing and special financeField lookups for Hostaway
 */
export function extractWebhookValue(webhookData: any, path: string): any {
  if (!path || !webhookData) return undefined
  
  try {
    // Handle special financeField array lookups for Hostaway
    if (path.includes('financeField.find')) {
      return handleFinanceFieldLookup(webhookData, path)
    }
    
    // Handle regular dot notation paths with array support
    return path.split('.').reduce((obj, key) => {
      if (obj === null || obj === undefined) return undefined
      
      // Handle array indexing like data.listingCustomFields[0].value
      if (key.includes('[') && key.includes(']')) {
        const arrayKey = key.substring(0, key.indexOf('['))
        const indexStr = key.substring(key.indexOf('[') + 1, key.indexOf(']'))
        
        if (arrayKey && obj[arrayKey] && Array.isArray(obj[arrayKey])) {
          const index = parseInt(indexStr, 10)
          if (!isNaN(index)) {
            return obj[arrayKey][index]
          }
        }
        return undefined
      }
      
      return obj[key]
    }, webhookData)
    
  } catch (error) {
    console.warn(`Failed to extract value from path "${path}":`, error)
    return undefined
  }
}

/**
 * Handles special financeField array lookups for Hostaway webhooks
 * Supports paths like: data.financeField.find(f => f.name === "baseRate")?.total
 */
function handleFinanceFieldLookup(webhookData: any, path: string): any {
  const financeFieldMatch = path.match(/financeField\.find\(f => f\.(\w+) === ["']([^"']+)["']\)\.?(\w+)?/)
  
  if (financeFieldMatch && webhookData?.data?.financeField) {
    const [, searchProperty, searchValue, returnProperty] = financeFieldMatch
    
    const financeField = webhookData.data.financeField.find((field: any) => 
      field[searchProperty] === searchValue
    )
    
    if (financeField) {
      return returnProperty ? financeField[returnProperty] : financeField
    }
  }
  
  return undefined
}

/**
 * Applies field mappings to webhook data to extract booking information
 */
export function applyWebhookFieldMappings(
  webhookData: any, 
  fieldMappings: WebhookFieldMapping
): Record<string, any> {
  const result: Record<string, any> = {}
  
  Object.entries(fieldMappings).forEach(([bookingField, webhookPath]) => {
    if (webhookPath && webhookPath.trim()) {
      const value = extractWebhookValue(webhookData, webhookPath)
      
      // Process the value based on the booking field type
      result[bookingField] = processFieldValue(bookingField, value)
    }
  })
  
  return result
}

/**
 * Processes field values based on their expected types
 */
function processFieldValue(fieldName: string, value: any): any {
  if (value === null || value === undefined) return null
  
  // Financial fields should be numbers
  const financialFields = [
    'nightlyRate', 'cleaningFee', 'lodgingTax', 'salesTax', 
    'gst', 'qst', 'channelFee', 'stripeFee', 'totalPayout', 
    'mgmtFee', 'netEarnings', 'extraGuestFees', 'bedLinenFee',
    'totalAmount'
  ]
  
  if (financialFields.includes(fieldName)) {
    const parsed = parseFloat(String(value))
    return isNaN(parsed) ? null : parsed
  }
  
  // Number fields
  if (fieldName === 'numNights') {
    const parsed = parseInt(String(value), 10)
    return isNaN(parsed) ? null : parsed
  }
  
  // Date fields should be in YYYY-MM-DD format
  const dateFields = ['checkInDate', 'checkOutDate']
  if (dateFields.includes(fieldName)) {
    return formatDateValue(value)
  }
  
  // String fields
  return String(value).trim()
}

/**
 * Formats date values to YYYY-MM-DD format
 */
function formatDateValue(dateValue: any): string | null {
  if (!dateValue) return null
  
  try {
    const date = new Date(dateValue)
    if (isNaN(date.getTime())) return null
    
    return date.toISOString().split('T')[0]
  } catch (error) {
    console.warn('Failed to format date value:', dateValue)
    return null
  }
}

/**
 * Validates that all required webhook field mappings are present and valid
 */
export function validateWebhookFieldMappings(
  webhookData: any,
  fieldMappings: WebhookFieldMapping,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[]; errors: string[] } {
  const missingFields: string[] = []
  const errors: string[] = []
  
  requiredFields.forEach(field => {
    const mapping = fieldMappings[field]
    
    if (!mapping || !mapping.trim()) {
      missingFields.push(field)
      return
    }
    
    // Test if the mapping can extract a valid value
    try {
      const value = extractWebhookValue(webhookData, mapping)
      if (value === undefined || value === null || value === '') {
        errors.push(`Field "${field}" mapping "${mapping}" produces no value`)
      }
    } catch (error) {
      errors.push(`Field "${field}" mapping "${mapping}" is invalid: ${error}`)
    }
  })
  
  return {
    isValid: missingFields.length === 0 && errors.length === 0,
    missingFields,
    errors
  }
}

/**
 * Suggests field mappings for common webhook structures
 */
export function suggestWebhookMappings(webhookData: any): WebhookFieldMapping {
  const suggestions: WebhookFieldMapping = {}
  
  // Hostaway webhook structure
  if (webhookData?.data && webhookData?.object === 'reservation') {
    return {
      guestName: 'data.guestName',
      guestEmail: 'data.guestEmail',
      checkInDate: 'data.arrivalDate',
      checkOutDate: 'data.departureDate',
      numNights: 'data.nights',
      listingName: 'data.listingName',
      platform: 'data.channelName',
      totalAmount: 'data.totalPrice',
      cleaningFee: 'data.cleaningFee',
      nightlyRate: 'data.financeField.find(f => f.name === "baseRate").total',
      lodgingTax: 'data.financeField.find(f => f.name === "lodgingTax").total',
      salesTax: 'data.financeField.find(f => f.name === "salesTax").total',
      gst: 'data.financeField.find(f => f.name === "vat").total',
    }
  }
  
  // Generic webhook structure detection
  const data = webhookData.data || webhookData
  
  // Try to detect common field patterns
  if (data.guest_name || data.guestName) {
    suggestions.guestName = data.guest_name ? 'data.guest_name' : 'data.guestName'
  }
  
  if (data.guest_email || data.guestEmail) {
    suggestions.guestEmail = data.guest_email ? 'data.guest_email' : 'data.guestEmail'
  }
  
  if (data.check_in || data.checkin || data.arrival_date || data.arrivalDate) {
    if (data.check_in) suggestions.checkInDate = 'data.check_in'
    else if (data.checkin) suggestions.checkInDate = 'data.checkin'  
    else if (data.arrival_date) suggestions.checkInDate = 'data.arrival_date'
    else suggestions.checkInDate = 'data.arrivalDate'
  }
  
  if (data.check_out || data.checkout || data.departure_date || data.departureDate) {
    if (data.check_out) suggestions.checkOutDate = 'data.check_out'
    else if (data.checkout) suggestions.checkOutDate = 'data.checkout'
    else if (data.departure_date) suggestions.checkOutDate = 'data.departure_date'
    else suggestions.checkOutDate = 'data.departureDate'
  }
  
  return suggestions
}

/**
 * Gets a preview of what values would be extracted with the current mappings
 */
export function getFieldMappingPreview(
  webhookData: any,
  fieldMappings: WebhookFieldMapping,
  maxPreviewLength = 50
): Record<string, { value: any; preview: string }> {
  const preview: Record<string, { value: any; preview: string }> = {}
  
  Object.entries(fieldMappings).forEach(([field, path]) => {
    const value = extractWebhookValue(webhookData, path)
    const processedValue = processFieldValue(field, value)
    
    let previewText = 'No value'
    if (processedValue !== null && processedValue !== undefined) {
      const stringValue = String(processedValue)
      previewText = stringValue.length > maxPreviewLength 
        ? `${stringValue.slice(0, maxPreviewLength)}...`
        : stringValue
    }
    
    preview[field] = {
      value: processedValue,
      preview: previewText
    }
  })
  
  return preview
}