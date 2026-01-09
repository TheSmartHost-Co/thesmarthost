'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  HomeIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { CsvHeader } from '@/services/types/csvMapping'
import { Property, BulkImportPropertyPayload } from '@/services/types/property'
import { Client } from '@/services/types/client'
import { ClientAssignment } from './AssignClientsStep'

export interface PreviewRow {
  rowNumber: number
  data: Partial<BulkImportPropertyPayload>
  clientName: string
  isValid: boolean
  isIncomplete: boolean
  incompleteReasons: string[]
  errors: string[]
  isDuplicate: boolean
}

interface PreviewStepProps {
  csvRows: string[][]
  csvHeaders: CsvHeader[]
  fieldMappings: Record<string, string>
  clientAssignments: ClientAssignment[]
  existingProperties: Property[]
  clients: Client[]
  onValidatedRows: (rows: PreviewRow[]) => void
}

const PreviewStep: React.FC<PreviewStepProps> = ({
  csvRows,
  csvHeaders,
  fieldMappings,
  clientAssignments,
  existingProperties,
  clients,
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

  // Get client by ID
  const getClientById = (clientId: string): Client | undefined => {
    return clients.find(c => c.id === clientId)
  }

  // Normalize property type
  const normalizePropertyType = (value: string): 'STR' | 'LTR' => {
    const normalized = value.toUpperCase().trim()
    if (normalized === 'LTR' || normalized === 'LONG TERM' || normalized === 'LONG-TERM') {
      return 'LTR'
    }
    return 'STR' // Default to STR
  }

  // Parse commission rate
  const parseCommissionRate = (value: string): number | undefined => {
    if (!value) return undefined
    const cleaned = value.replace(/[%$,]/g, '').trim()
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? undefined : parsed
  }

  // Parse and validate all rows
  useEffect(() => {
    const existingListingIds = new Set(
      existingProperties
        .filter(p => p.listingId)
        .map(p => p.listingId!.toLowerCase())
    )

    const parsedRows: PreviewRow[] = csvRows.map((row, index) => {
      const errors: string[] = []
      const incompleteReasons: string[] = []
      const rowNumber = index + 2 // +2 because row 1 is header, and we're 0-indexed

      // Extract values
      const listingName = extractValue(row, 'listingName')
      const listingId = extractValue(row, 'listingId')
      const address = extractValue(row, 'address')
      const province = extractValue(row, 'province')
      const propertyTypeRaw = extractValue(row, 'propertyType')
      const commissionRateRaw = extractValue(row, 'commissionRate')
      const postalCode = extractValue(row, 'postalCode')
      const externalName = extractValue(row, 'externalName')
      const internalName = extractValue(row, 'internalName')
      const description = extractValue(row, 'description')

      // Get client assignment
      const assignment = clientAssignments.find(a => a.rowNumber === rowNumber)
      const clientId = assignment?.clientId || ''
      const client = clientId ? getClientById(clientId) : undefined

      // Only address is truly required - others make the property "incomplete"
      if (!address) {
        errors.push('Address required')
      }

      // Track incomplete reasons (not blocking errors)
      if (!listingName) {
        incompleteReasons.push('No listing name')
      }
      if (!listingId) {
        incompleteReasons.push('No listing ID')
      }
      if (!clientId) {
        incompleteReasons.push('No client assigned')
      }

      // Check for duplicate listing ID (only if listing ID is provided)
      const isDuplicate = listingId ? existingListingIds.has(listingId.toLowerCase()) : false
      if (isDuplicate) {
        errors.push('Listing ID exists')
      }

      // Add listing ID to set to detect duplicates within the import (only if provided)
      if (listingId) {
        existingListingIds.add(listingId.toLowerCase())
      }

      // Parse values
      const propertyType = normalizePropertyType(propertyTypeRaw)
      const commissionRate = parseCommissionRate(commissionRateRaw)

      const data: Partial<BulkImportPropertyPayload> = {
        clientId: clientId || undefined,
        listingName: listingName || undefined,
        listingId: listingId || undefined,
        address,
        province,
        propertyType,
        commissionRate,
        postalCode: postalCode || undefined,
        externalName: externalName || undefined,
        internalName: internalName || undefined,
        description: description || undefined
      }

      const isIncomplete = incompleteReasons.length > 0

      return {
        rowNumber,
        data,
        clientName: client?.name || 'Unassigned',
        isValid: errors.length === 0,
        isIncomplete,
        incompleteReasons,
        errors,
        isDuplicate
      }
    })

    setPreviewRows(parsedRows)
    onValidatedRows(parsedRows)
  }, [csvRows, csvHeaders, fieldMappings, clientAssignments, existingProperties, clients])

  // Calculate summary
  const summary = useMemo(() => {
    const total = previewRows.length
    const valid = previewRows.filter(r => r.isValid && !r.isIncomplete).length
    const incomplete = previewRows.filter(r => r.isValid && r.isIncomplete).length
    const invalid = previewRows.filter(r => !r.isValid && !r.isDuplicate).length
    const duplicates = previewRows.filter(r => r.isDuplicate).length
    const readyToImport = valid + incomplete // All valid rows can be imported
    return { total, valid, incomplete, invalid, duplicates, readyToImport }
  }, [previewRows])

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
          <p className="text-xs text-gray-500 mt-1">Total Rows</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{summary.valid}</p>
          <p className="text-xs text-green-600 mt-1">Complete</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{summary.incomplete}</p>
          <p className="text-xs text-amber-600 mt-1">Incomplete</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{summary.duplicates}</p>
          <p className="text-xs text-yellow-600 mt-1">Duplicates (Skip)</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{summary.invalid}</p>
          <p className="text-xs text-red-600 mt-1">Invalid (Skip)</p>
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
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Row</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Property</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Listing ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Issues</th>
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
                    row.isValid && !row.isIncomplete
                      ? 'bg-green-50/50 hover:bg-green-50'
                      : row.isValid && row.isIncomplete
                      ? 'bg-amber-50/50 hover:bg-amber-50'
                      : row.isDuplicate
                      ? 'bg-yellow-50/50 hover:bg-yellow-50'
                      : 'bg-red-50/50 hover:bg-red-50'
                  }`}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.isValid && !row.isIncomplete ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : row.isValid && row.isIncomplete ? (
                      <ExclamationCircleIcon className="h-5 w-5 text-amber-500" />
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
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <HomeIcon className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900 block">
                          {row.data.listingName || <span className="text-amber-500 italic">No name</span>}
                        </span>
                        <span className="text-xs text-gray-500">
                          {row.data.address || <span className="text-red-500 italic">Missing address</span>}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                    {row.data.listingId || <span className="text-amber-500 italic">No ID</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${
                      row.data.propertyType === 'STR'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {row.data.propertyType || 'STR'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        row.clientName === 'Unassigned' ? 'bg-red-100' : 'bg-green-100'
                      }`}>
                        <UserIcon className={`h-3 w-3 ${
                          row.clientName === 'Unassigned' ? 'text-red-600' : 'text-green-600'
                        }`} />
                      </div>
                      <span className={`text-sm ${
                        row.clientName === 'Unassigned' ? 'text-red-600 italic' : 'text-gray-900'
                      }`}>
                        {row.clientName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {/* Show errors first (red) */}
                      {row.errors.map((error, i) => (
                        <span
                          key={`error-${i}`}
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                            row.isDuplicate && error.includes('exists')
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {error}
                        </span>
                      ))}
                      {/* Show incomplete reasons (amber) - only if row is valid */}
                      {row.isValid && row.incompleteReasons.map((reason, i) => (
                        <span
                          key={`incomplete-${i}`}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
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
          <li><CheckCircleIcon className="h-4 w-4 inline mr-2 text-green-500" />{summary.valid} complete properties will be created</li>
          <li><ExclamationCircleIcon className="h-4 w-4 inline mr-2 text-amber-500" />{summary.incomplete} incomplete properties will be created (missing name, ID, or client - can be completed later)</li>
          <li><ExclamationCircleIcon className="h-4 w-4 inline mr-2 text-yellow-500" />{summary.duplicates} duplicate listing IDs will be skipped</li>
          <li><XCircleIcon className="h-4 w-4 inline mr-2 text-red-500" />{summary.invalid} invalid rows will be skipped (missing address)</li>
        </ul>
      </div>
    </div>
  )
}

export default PreviewStep
