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
 * Parse CSV text content
 */
export function parseCsvText(csvText: string): CsvData {
  // Split by lines and filter out empty lines
  const lines = csvText.split('\n').filter(line => line.trim().length > 0)
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty')
  }
  
  // Parse header row
  const headerRow = lines[0]
  const headerNames = parseCsvRow(headerRow)
  
  // Create headers with sample data from first row
  const headers: CsvHeader[] = headerNames.map((name, index) => {
    let sampleValue = ''
    if (lines.length > 1) {
      const firstDataRow = parseCsvRow(lines[1])
      sampleValue = firstDataRow[index] || ''
    }
    
    return {
      index,
      name: name.trim(),
      sampleValue: sampleValue.trim()
    }
  })
  
  // Parse all data rows
  const rows: string[][] = lines.slice(1).map(line => parseCsvRow(line))
  
  return {
    headers,
    rows,
    totalRows: rows.length
  }
}

/**
 * Parse a single CSV row, handling quotes and commas
 */
function parseCsvRow(row: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0
  
  while (i < row.length) {
    const char = row[i]
    const nextChar = row[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i += 2
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
        i++
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current)
      current = ''
      i++
    } else {
      // Regular character
      current += char
      i++
    }
  }
  
  // Add the last field
  result.push(current)
  
  return result
}

/**
 * Auto-suggest mappings based on header names
 */
export function suggestMappings(headers: CsvHeader[]): Record<string, string> {
  const suggestions: Record<string, string> = {}
  
  const mappingRules = [
    { field: 'reservation_code', patterns: ['reservation id', 'confirmation', 'booking id', 'reference'] },
    { field: 'guest_name', patterns: ['guest', 'name', 'customer'] },
    { field: 'check_in_date', patterns: ['check-in', 'checkin', 'arrival', 'start date'] },
    { field: 'num_nights', patterns: ['nights', 'duration', 'stay'] },
    { field: 'platform', patterns: ['channel', 'platform', 'source'] },
    { field: 'listing_name', patterns: ['listing', 'property', 'accommodation'] },
    { field: 'total_price', patterns: ['total price', 'totalprice', 'amount', 'revenue'] },
    { field: 'accommodation_fee', patterns: ['accommodation', 'base rate', 'room'] },
    { field: 'cleaning_fee', patterns: ['cleaning', 'totalcleaning'] },
    { field: 'lodging_tax', patterns: ['lodging', 'lodgingtx', 'tax'] },
    { field: 'airbnb_sales_tax', patterns: ['airbnbsalestax', 'sales tax'] },
    { field: 'payment_fees', patterns: ['payment', 'paymentfees', 'processing'] },
    { field: 'channel_fee', patterns: ['channel fee', 'commission', 'hostsidechannelfee'] }
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