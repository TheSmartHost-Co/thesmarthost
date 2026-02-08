'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { CsvHeader } from '@/services/types/csvMapping'
import { Property } from '@/services/types/property'
import { PropertyAssignment } from './AssignPropertiesStep'
import { BulkExpensePayload } from '@/services/types/expense'

export interface PreviewRow {
  rowNumber: number
  data: BulkExpensePayload
  isValid: boolean
  errors: string[]
  isExcluded?: boolean
}

interface PreviewStepProps {
  csvRows: string[][]
  csvHeaders: CsvHeader[]
  fieldMappings: Record<string, string>
  propertyAssignments: PropertyAssignment[]
  properties: Property[]
  onValidatedRows: (rows: PreviewRow[]) => void
}

const PreviewStep: React.FC<PreviewStepProps> = ({
  csvRows,
  csvHeaders,
  fieldMappings,
  propertyAssignments,
  properties,
  onValidatedRows
}) => {
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])

  // Get the index of a column by its name
  const getColumnIndex = (columnName: string): number => {
    return csvHeaders.findIndex(h => h.name === columnName)
  }

  // Extract value from a CSV row using the mapping
  const extractValue = (row: string[], field: string): string => {
    const csvColumn = fieldMappings[field]
    if (!csvColumn || csvColumn === '__ignore__') return ''
    const index = getColumnIndex(csvColumn)
    if (index === -1) return ''
    return row[index]?.trim() || ''
  }

  // Parse amount - handle various formats like "$1,234.56", "1234.56", etc.
  const parseAmount = (amountStr: string): number | null => {
    if (!amountStr) return null
    const cleaned = amountStr.replace(/[,$\s]/g, '')
    const num = parseFloat(cleaned)
    if (isNaN(num)) return null
    return num
  }

  // Parse date - accepts various formats, returns YYYY-MM-DD
  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null

    // Try parsing as-is first (for YYYY-MM-DD format)
    let date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }

    // Try MM/DD/YYYY format
    const mmddyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (mmddyyyy) {
      date = new Date(parseInt(mmddyyyy[3]), parseInt(mmddyyyy[1]) - 1, parseInt(mmddyyyy[2]))
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }

    // Try DD/MM/YYYY format (if day > 12, it's clearly DD/MM/YYYY)
    const ddmmyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (ddmmyyyy && parseInt(ddmmyyyy[1]) > 12) {
      date = new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]))
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }

    return null
  }

  // Parse boolean values
  const parseBoolean = (value: string): boolean | undefined => {
    if (!value) return undefined
    const lower = value.toLowerCase().trim()
    if (['true', 'yes', '1', 'y'].includes(lower)) return true
    if (['false', 'no', '0', 'n'].includes(lower)) return false
    return undefined
  }

  // Parse and validate all rows
  useEffect(() => {
    const parsedRows: PreviewRow[] = csvRows.map((row, index) => {
      const rowNumber = index + 2 // +2 because row 1 is header, and we're 0-indexed
      const errors: string[] = []

      // Extract values
      const expenseDateStr = extractValue(row, 'expenseDate')
      const amountStr = extractValue(row, 'amount')
      const currency = extractValue(row, 'currency')
      const category = extractValue(row, 'category')
      const vendorName = extractValue(row, 'vendorName')
      const description = extractValue(row, 'description')
      const isReimbursableStr = extractValue(row, 'isReimbursable')
      const isTaxDeductibleStr = extractValue(row, 'isTaxDeductible')
      const paymentMethod = extractValue(row, 'paymentMethod')
      const paymentStatus = extractValue(row, 'paymentStatus')
      const subtotalStr = extractValue(row, 'subtotal')
      const taxGstStr = extractValue(row, 'taxGst')
      const taxPstStr = extractValue(row, 'taxPst')
      const taxHstStr = extractValue(row, 'taxHst')
      const taxTotalStr = extractValue(row, 'taxTotal')

      // Parse date
      const expenseDate = parseDate(expenseDateStr)
      if (!expenseDate) {
        errors.push('Invalid date format')
      }

      // Parse amount
      const amount = parseAmount(amountStr)
      if (amount === null) {
        errors.push('Invalid amount')
      } else if (amount <= 0) {
        errors.push('Amount must be positive')
      }

      // Get property assignment
      const assignment = propertyAssignments.find(a => a.rowNumber === rowNumber)
      const propertyId = assignment?.propertyId || undefined

      const data: BulkExpensePayload = {
        propertyId: propertyId || null,
        expenseDate: expenseDate || '',
        amount: amount || 0,
        currency: currency || undefined,
        category: category || undefined,
        vendorName: vendorName || undefined,
        description: description || undefined,
        isReimbursable: parseBoolean(isReimbursableStr),
        isTaxDeductible: parseBoolean(isTaxDeductibleStr),
        paymentMethod: paymentMethod || undefined,
        paymentStatus: paymentStatus || undefined,
        subtotal: subtotalStr ? parseAmount(subtotalStr) || undefined : undefined,
        taxGst: taxGstStr ? parseAmount(taxGstStr) || undefined : undefined,
        taxPst: taxPstStr ? parseAmount(taxPstStr) || undefined : undefined,
        taxHst: taxHstStr ? parseAmount(taxHstStr) || undefined : undefined,
        taxTotal: taxTotalStr ? parseAmount(taxTotalStr) || undefined : undefined,
      }

      return {
        rowNumber,
        data,
        isValid: errors.length === 0,
        errors,
        isExcluded: false
      }
    })

    setPreviewRows(parsedRows)
  }, [csvRows, csvHeaders, fieldMappings, propertyAssignments])

  // Notify parent of validated rows (excluding manually excluded ones)
  useEffect(() => {
    const activeRows = previewRows.map(row => ({
      ...row,
      // Mark excluded rows as invalid so they won't be imported
      isValid: row.isExcluded ? false : row.isValid
    }))
    onValidatedRows(activeRows)
  }, [previewRows, onValidatedRows])

  // Toggle exclude for a specific row
  const toggleExcludeRow = (rowNumber: number) => {
    setPreviewRows(prev => prev.map(row =>
      row.rowNumber === rowNumber
        ? { ...row, isExcluded: !row.isExcluded }
        : row
    ))
  }

  // Calculate summary (excluding manually excluded rows from valid count)
  const summary = useMemo(() => {
    const excluded = previewRows.filter(r => r.isExcluded).length
    const valid = previewRows.filter(r => r.isValid && !r.isExcluded).length
    const invalid = previewRows.filter(r => !r.isValid && !r.isExcluded).length
    return { total: previewRows.length, valid, invalid, excluded }
  }, [previewRows])

  // Get property name by ID
  const getPropertyName = (propertyId: string | null | undefined): string => {
    if (!propertyId) return 'General'
    const property = properties.find(p => p.id === propertyId)
    return property?.listingName || property?.address || 'Unknown'
  }

  // Format amount for display
  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount)
  }

  // Format date for display
  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
          <p className="text-xs text-gray-500 mt-1">Total Rows</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{summary.valid}</p>
          <p className="text-xs text-green-600 mt-1">Ready to Import</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{summary.invalid}</p>
          <p className="text-xs text-red-600 mt-1">Invalid (Skip)</p>
        </div>
        <div className="bg-gray-50 border border-gray-300 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-500">{summary.excluded}</p>
          <p className="text-xs text-gray-500 mt-1">Excluded</p>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Preview Data</h3>
          <p className="text-xs text-gray-500 mt-1">
            Showing {Math.min(previewRows.length, 50)} of {previewRows.length} rows
          </p>
        </div>

        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-20">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Row</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Property</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Issues</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase sticky right-0 z-30 bg-gray-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {previewRows.slice(0, 50).map((row, index) => (
                <motion.tr
                  key={row.rowNumber}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className={`${
                    row.isExcluded
                      ? 'bg-gray-100 opacity-60'
                      : row.isValid
                      ? 'bg-green-50/50 hover:bg-green-50'
                      : 'bg-red-50/50 hover:bg-red-50'
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.isExcluded ? (
                      <XCircleIcon className="h-5 w-5 text-gray-400" />
                    ) : row.isValid ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-red-500" />
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {row.rowNumber}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm ${row.isExcluded ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                    {formatDate(row.data.expenseDate)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${row.isExcluded ? 'bg-gray-200' : 'bg-blue-100'}`}>
                        <CurrencyDollarIcon className={`h-4 w-4 ${row.isExcluded ? 'text-gray-400' : 'text-blue-600'}`} />
                      </div>
                      <span className={`text-sm font-medium ${row.isExcluded ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {formatAmount(row.data.amount)}
                      </span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm ${row.isExcluded ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                    {row.data.category || <span className="text-gray-400">-</span>}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm ${row.isExcluded ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                    {row.data.vendorName || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.isExcluded ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-gray-200 text-gray-500">
                        Excluded
                      </span>
                    ) : row.data.propertyId ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-700 truncate max-w-[150px]">
                        {getPropertyName(row.data.propertyId)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                        General
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.isExcluded ? (
                      <span className="text-xs text-gray-400">Manually excluded</span>
                    ) : row.errors.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {row.errors.map((error, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700"
                          >
                            {error}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </td>
                  <td className={`px-4 py-3 text-center sticky right-0 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] ${
                    row.isExcluded
                      ? 'bg-gray-100'
                      : row.isValid
                      ? 'bg-green-50'
                      : 'bg-red-50'
                  }`}>
                    <button
                      onClick={() => toggleExcludeRow(row.rowNumber)}
                      className={`
                        p-1.5 rounded-lg transition-colors cursor-pointer
                        ${row.isExcluded
                          ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                          : 'text-red-500 hover:text-red-600 hover:bg-red-50'
                        }
                      `}
                      title={row.isExcluded ? 'Include this expense' : 'Exclude this expense'}
                    >
                      <XCircleIcon className="h-5 w-5" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {previewRows.length > 50 && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Showing first 50 rows. {previewRows.length - 50} more rows will be processed.
            </p>
          </div>
        )}
      </div>

      {/* Import Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">What happens when you import?</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li><CheckCircleIcon className="h-4 w-4 inline mr-2 text-green-500" />{summary.valid} valid expenses will be created</li>
          <li><XCircleIcon className="h-4 w-4 inline mr-2 text-red-500" />{summary.invalid} invalid rows will be skipped</li>
          {summary.excluded > 0 && (
            <li><XCircleIcon className="h-4 w-4 inline mr-2 text-gray-400" />{summary.excluded} manually excluded rows will be skipped</li>
          )}
        </ul>
      </div>
    </div>
  )
}

export default PreviewStep
