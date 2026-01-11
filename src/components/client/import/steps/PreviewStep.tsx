'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { CsvHeader } from '@/services/types/csvMapping'
import { Client, CreateClientPayload } from '@/services/types/client'
import { ClientStatusCode } from '@/services/types/clientCode'

export interface PreviewRow {
  rowNumber: number
  data: Partial<CreateClientPayload>
  isValid: boolean
  errors: string[]
  isDuplicate: boolean
  isExcluded?: boolean
}

interface PreviewStepProps {
  csvRows: string[][]
  csvHeaders: CsvHeader[]
  fieldMappings: Record<string, string>
  existingClients: Client[]
  statusCodes: ClientStatusCode[]
  onValidatedRows: (rows: PreviewRow[]) => void
}

const PreviewStep: React.FC<PreviewStepProps> = ({
  csvRows,
  csvHeaders,
  fieldMappings,
  existingClients,
  statusCodes,
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

  // Find status ID by label
  const findStatusId = (statusLabel: string): string | undefined => {
    if (!statusLabel) return undefined
    const normalizedLabel = statusLabel.toLowerCase().trim()

    // Check for standard statuses
    if (normalizedLabel === 'active') {
      const activeStatus = statusCodes.find(s => s.label.toLowerCase() === 'active')
      return activeStatus?.id
    }
    if (normalizedLabel === 'inactive') {
      const inactiveStatus = statusCodes.find(s => s.label.toLowerCase() === 'inactive')
      return inactiveStatus?.id
    }

    // Check for custom status codes
    const matchedStatus = statusCodes.find(
      s => s.label.toLowerCase() === normalizedLabel ||
           s.code?.toLowerCase() === normalizedLabel
    )
    return matchedStatus?.id
  }

  // Validate email format (supports comma-separated emails)
  const isValidEmail = (email: string): boolean => {
    if (!email) return true // Empty is valid (not required)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    // Split by comma, trim each, filter empty, validate each
    const emails = email.split(',').map(e => e.trim()).filter(e => e)
    return emails.length > 0 && emails.every(e => emailRegex.test(e))
  }

  // Parse comma-separated emails into array of lowercase emails
  const parseEmails = (email: string): string[] => {
    if (!email) return []
    return email.split(',').map(e => e.trim().toLowerCase()).filter(e => e)
  }

  // Parse and validate all rows
  useEffect(() => {
    // Build set of existing emails (flattened from comma-separated)
    const existingEmails = new Set(
      existingClients
        .filter(c => c.email)
        .flatMap(c => parseEmails(c.email!))
    )

    const parsedRows: PreviewRow[] = csvRows.map((row, index) => {
      const errors: string[] = []

      // Extract values
      const name = extractValue(row, 'name')
      const email = extractValue(row, 'email')
      const phone = extractValue(row, 'phone')
      const status = extractValue(row, 'status')
      const companyName = extractValue(row, 'companyName')
      const billingAddress = extractValue(row, 'billingAddress')
      const pms = extractValue(row, 'pms')

      // Validate required fields
      if (!name) {
        errors.push('Name is required')
      }

      // Validate email format
      if (email && !isValidEmail(email)) {
        errors.push('Invalid email format')
      }

      // Check for duplicate email (any email in comma-separated list)
      const emailList = parseEmails(email)
      const isDuplicate = emailList.some(e => existingEmails.has(e))
      if (isDuplicate) {
        errors.push('Email already exists')
      }

      // Add all emails to set to detect duplicates within the import
      emailList.forEach(e => existingEmails.add(e))

      // Find status ID
      const statusId = findStatusId(status)

      const data: Partial<CreateClientPayload> = {
        name,
        email: email || undefined,
        phone: phone || undefined,
        companyName: companyName || undefined,
        billingAddress: billingAddress || undefined,
        pms: pms || undefined,
        statusId
      }

      return {
        rowNumber: index + 2, // +2 because row 1 is header, and we're 0-indexed
        data,
        isValid: errors.length === 0,
        errors,
        isDuplicate,
        isExcluded: false
      }
    })

    setPreviewRows(parsedRows)
  }, [csvRows, csvHeaders, fieldMappings, existingClients, statusCodes])

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
    const invalid = previewRows.filter(r => !r.isValid && !r.isDuplicate && !r.isExcluded).length
    const duplicates = previewRows.filter(r => r.isDuplicate && !r.isExcluded).length
    return { total: previewRows.length, valid, invalid, duplicates, excluded }
  }, [previewRows])

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
          <p className="text-xs text-gray-500 mt-1">Total Rows</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{summary.valid}</p>
          <p className="text-xs text-green-600 mt-1">Ready to Import</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{summary.duplicates}</p>
          <p className="text-xs text-yellow-600 mt-1">Duplicates (Skip)</p>
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
            Showing {Math.min(previewRows.length, 10)} of {previewRows.length} rows
          </p>
        </div>

        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-20">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Row</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Client Status</th>
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
                      : row.isDuplicate
                      ? 'bg-yellow-50/50 hover:bg-yellow-50'
                      : 'bg-red-50/50 hover:bg-red-50'
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.isExcluded ? (
                      <XCircleIcon className="h-5 w-5 text-gray-400" />
                    ) : row.isValid ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : row.isDuplicate ? (
                      <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-red-500" />
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {row.rowNumber}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${row.isExcluded ? 'bg-gray-200' : 'bg-blue-100'}`}>
                        <UserIcon className={`h-4 w-4 ${row.isExcluded ? 'text-gray-400' : 'text-blue-600'}`} />
                      </div>
                      <span className={`text-sm font-medium ${row.isExcluded ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {row.data.name || <span className="text-red-500 italic">Missing</span>}
                      </span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm ${row.isExcluded ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                    {row.data.email || <span className="text-gray-400">-</span>}
                  </td>
                  <td className={`px-4 py-3 whitespace-nowrap text-sm ${row.isExcluded ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                    {row.data.phone || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.isExcluded ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-gray-200 text-gray-500">
                        Excluded
                      </span>
                    ) : row.data.statusId ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700">
                        Mapped
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                        Default (Active)
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
                            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              row.isDuplicate && error.includes('exists')
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}
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
                      : row.isDuplicate
                      ? 'bg-yellow-50'
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
                      title={row.isExcluded ? 'Include this client' : 'Exclude this client'}
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
          <li><CheckCircleIcon className="h-4 w-4 inline mr-2 text-green-500" />{summary.valid} valid clients will be created</li>
          <li><ExclamationCircleIcon className="h-4 w-4 inline mr-2 text-yellow-500" />{summary.duplicates} duplicate emails will be skipped</li>
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
