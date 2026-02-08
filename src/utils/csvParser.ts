// CSV Parser Utility Functions

import { CsvData, CsvHeader } from '@/services/types/csvMapping'

/**
 * Parse CSV file and extract headers with sample data
 */
export function parseCsvFile(file: File): Promise<CsvData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const csvData = parseCsvText(text)
        resolve(csvData)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

/**
 * Detect delimiter from first line of text (tab vs comma)
 * Returns '\t' if more tabs than commas, otherwise ','
 */
function detectDelimiter(text: string): string {
  const firstLine = text.split('\n')[0] || ''
  const tabCount = (firstLine.match(/\t/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  return tabCount > commaCount ? '\t' : ','
}

/**
 * Parse CSV/TSV text content using a state-machine approach
 * Properly handles RFC 4180: quoted fields with embedded newlines and escaped quotes
 * Auto-detects delimiter (comma or tab) based on first line
 */
export function parseCsvText(csvText: string): CsvData {
  // Normalize line endings (Windows \r\n and old Mac \r to Unix \n)
  const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Auto-detect delimiter from first line
  const delimiter = detectDelimiter(normalizedText)

  // Parse using state machine - handles quoted fields with embedded newlines
  const allRows: string[][] = []
  let currentRow: string[] = []
  let currentField = ''
  let inQuotes = false

  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i]
    const nextChar = normalizedText[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote ("" -> ")
        currentField += '"'
        i++
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field (only if not inside quotes)
      currentRow.push(currentField.trim())
      currentField = ''
    } else if (char === '\n' && !inQuotes) {
      // End of row (only if not inside quotes)
      currentRow.push(currentField.trim())
      // Only add rows that have at least one non-empty field
      if (currentRow.some(field => field.length > 0)) {
        allRows.push(currentRow)
      }
      currentRow = []
      currentField = ''
    } else {
      // Regular character - includes newlines inside quoted fields
      // For embedded newlines in quoted fields, replace with space for cleaner data
      if (char === '\n' && inQuotes) {
        currentField += ' '
      } else {
        currentField += char
      }
    }
  }

  // Handle the last field/row (file may not end with newline)
  currentRow.push(currentField.trim())
  if (currentRow.some(field => field.length > 0)) {
    allRows.push(currentRow)
  }

  if (allRows.length === 0) {
    throw new Error('CSV file is empty')
  }

  // First row is headers
  const headerNames = allRows[0]
  const dataRows = allRows.slice(1)

  // Create headers with sample data from first data row
  const headers: CsvHeader[] = headerNames.map((name, index) => {
    let sampleValue = ''
    if (dataRows.length > 0) {
      sampleValue = dataRows[0][index] || ''
    }

    return {
      index,
      name: name.trim(),
      sampleValue: sampleValue.trim()
    }
  })

  return {
    headers,
    rows: dataRows,
    totalRows: dataRows.length
  }
}


/**
 * Auto-suggest mappings based on header names
 */
export function suggestMappings(headers: CsvHeader[]): Record<string, string> {
  const suggestions: Record<string, string> = {}
  
  // Only auto-suggest required fields - optional fields stay empty until user explicitly maps them
  const mappingRules = [
    { field: 'reservation_code', patterns: ['reservation id', 'confirmation', 'booking id', 'reference'] },
    { field: 'guest_name', patterns: ['guest', 'name', 'customer'] },
    { field: 'check_in_date', patterns: ['check-in', 'checkin', 'arrival', 'start date'] },
    { field: 'num_nights', patterns: ['nights', 'duration', 'stay'] },
    { field: 'platform', patterns: ['channel', 'platform', 'source'] },
    { field: 'listing_name', patterns: ['listing', 'property', 'accommodation'] }
    // Removed optional field auto-suggestions:
    // total_price, accommodation_fee, cleaning_fee, lodging_tax, airbnb_sales_tax, payment_fees, channel_fee
  ]
  
  headers.forEach(header => {
    const headerLower = header.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    mappingRules.forEach(rule => {
      rule.patterns.forEach(pattern => {
        const patternNormalized = pattern.replace(/[^a-z0-9]/g, '')
        if (headerLower.includes(patternNormalized) || patternNormalized.includes(headerLower)) {
          suggestions[rule.field] = header.name
        }
      })
    })
  })
  
  return suggestions
}

/**
 * Validate required field mappings
 */
export function validateMappings(mappings: Record<string, string>, requiredFields: string[]): string[] {
  const errors: string[] = []
  
  requiredFields.forEach(field => {
    if (!mappings[field] || mappings[field].trim() === '') {
      errors.push(`${field} is required and must be mapped`)
    }
  })
  
  return errors
}