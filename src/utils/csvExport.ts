// CSV Export Utility Functions

/**
 * Escape a CSV field value to handle special characters
 * - Wraps in quotes if contains comma, quote, or newline
 * - Escapes internal quotes by doubling them
 */
function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }

  const stringValue = String(value)

  // Check if the value needs quoting
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
    // Escape internal quotes by doubling them, then wrap in quotes
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/**
 * Convert an array of objects to CSV text
 * @param data Array of objects to convert
 * @param columns Column definitions with key (object property) and header (CSV header name)
 */
export function generateCsvText<T>(
  data: T[],
  columns: { key: keyof T | string; header: string }[]
): string {
  // Create header row
  const headerRow = columns.map(col => escapeCsvField(col.header)).join(',')

  // Create data rows
  const dataRows = data.map(item => {
    return columns.map(col => {
      // Use type assertion to access property by key
      const value = (item as Record<string, unknown>)[col.key as string]
      return escapeCsvField(value as string | number | boolean | null | undefined)
    }).join(',')
  })

  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n')
}

/**
 * Trigger a CSV file download in the browser
 * @param csvText The CSV content as a string
 * @param fileName The name for the downloaded file
 */
export function downloadCsv(csvText: string, fileName: string): void {
  // Create blob with UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvText], { type: 'text/csv;charset=utf-8;' })

  // Create download link
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'

  // Trigger download
  document.body.appendChild(link)
  link.click()

  // Cleanup
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * Generate a dated filename for exports
 * @param prefix The prefix for the filename (e.g., 'clients', 'properties')
 * @returns Filename like 'clients-export-2026-01-22.csv'
 */
export function generateExportFileName(prefix: string): string {
  const today = new Date()
  const dateStr = today.toISOString().split('T')[0] // YYYY-MM-DD format
  return `${prefix}-export-${dateStr}.csv`
}

/**
 * Convenience function to export data as CSV
 * Combines generateCsvText and downloadCsv
 */
export function exportToCsv<T>(
  data: T[],
  columns: { key: keyof T | string; header: string }[],
  fileNamePrefix: string
): void {
  const csvText = generateCsvText(data, columns)
  const fileName = generateExportFileName(fileNamePrefix)
  downloadCsv(csvText, fileName)
}
