'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { UserIcon, HomeIcon } from '@heroicons/react/24/outline'
import { CsvHeader } from '@/services/types/csvMapping'
import { Client } from '@/services/types/client'
import SearchableSelect, { SearchableSelectOption } from '@/components/shared/SearchableSelect'

export interface PropertyRowData {
  rowNumber: number
  listingName: string
  listingId: string
  address: string
  province: string
  propertyType: string
  commissionRate: string
  postalCode: string
  externalName: string
  internalName: string
  description: string
}

export interface ClientAssignment {
  rowNumber: number
  clientId: string
}

interface AssignClientsStepProps {
  csvRows: string[][]
  csvHeaders: CsvHeader[]
  fieldMappings: Record<string, string>
  clients: Client[]
  initialAssignments: ClientAssignment[]
  onAssignmentsChange: (assignments: ClientAssignment[]) => void
  onValidationChange: (isValid: boolean) => void
}

const AssignClientsStep: React.FC<AssignClientsStepProps> = ({
  csvRows,
  csvHeaders,
  fieldMappings,
  clients,
  initialAssignments,
  onAssignmentsChange,
  onValidationChange
}) => {
  const [assignments, setAssignments] = useState<ClientAssignment[]>(initialAssignments)
  const [bulkClientId, setBulkClientId] = useState<string | null>(null)

  // Convert clients to SearchableSelect options
  const clientOptions: SearchableSelectOption<string>[] = useMemo(() => {
    return clients.map(client => ({
      value: client.id,
      label: client.name,
      secondaryLabel: client.companyName || client.email || undefined,
    }))
  }, [clients])

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

  // Parse property rows from CSV
  const propertyRows: PropertyRowData[] = useMemo(() => {
    return csvRows.map((row, index) => ({
      rowNumber: index + 2, // +2 because row 1 is header, and we're 0-indexed
      listingName: extractValue(row, 'listingName'),
      listingId: extractValue(row, 'listingId'),
      address: extractValue(row, 'address'),
      province: extractValue(row, 'province'),
      propertyType: extractValue(row, 'propertyType'),
      commissionRate: extractValue(row, 'commissionRate'),
      postalCode: extractValue(row, 'postalCode'),
      externalName: extractValue(row, 'externalName'),
      internalName: extractValue(row, 'internalName'),
      description: extractValue(row, 'description')
    }))
  }, [csvRows, csvHeaders, fieldMappings])

  // Initialize assignments if not already set
  useEffect(() => {
    if (initialAssignments.length === 0) {
      const defaultAssignments = propertyRows.map(row => ({
        rowNumber: row.rowNumber,
        clientId: ''
      }))
      setAssignments(defaultAssignments)
    }
  }, [propertyRows, initialAssignments])

  // Client assignment is now optional - always valid
  useEffect(() => {
    // Always valid - properties without clients will be marked as incomplete
    onValidationChange(true)
    onAssignmentsChange(assignments)
  }, [assignments])

  const handleClientChange = (rowNumber: number, clientId: string) => {
    setAssignments(prev => {
      const updated = prev.map(a =>
        a.rowNumber === rowNumber ? { ...a, clientId } : a
      )
      return updated
    })
  }

  const handleBulkAssign = () => {
    if (!bulkClientId) return
    setAssignments(prev =>
      prev.map(a => ({ ...a, clientId: bulkClientId }))
    )
    setBulkClientId(null)
  }

  const getClientById = (clientId: string): Client | undefined => {
    return clients.find(c => c.id === clientId)
  }

  // Count assigned rows
  const assignedCount = assignments.filter(a => a.clientId !== '').length
  const totalCount = assignments.length

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Client Assignment Progress <span className="text-gray-400 font-normal">(Optional)</span></h3>
          <p className="text-sm text-gray-500 mt-1">
            {assignedCount} of {totalCount} properties assigned
            {assignedCount < totalCount && (
              <span className="text-amber-600 ml-1">
                ({totalCount - assignedCount} will be incomplete)
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-2xl font-bold ${assignedCount === totalCount ? 'text-green-600' : 'text-blue-600'}`}>
            {Math.round((assignedCount / totalCount) * 100)}%
          </div>
        </div>
      </div>

      {/* Bulk Assign */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-3">Bulk Assign Client</h4>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <SearchableSelect
              options={clientOptions}
              value={bulkClientId}
              onChange={setBulkClientId}
              placeholder="Select a client to assign to all..."
              emptyText="No clients found"
              clearable={true}
            />
          </div>
          <button
            type="button"
            onClick={handleBulkAssign}
            disabled={!bulkClientId}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              bulkClientId
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Apply to All
          </button>
        </div>
      </div>

      {/* Assignment Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Assign Owner to Each Property</h3>
          <p className="text-xs text-gray-500 mt-1">
            Optionally assign a primary owner (client) to each property. Properties without an owner will be marked as incomplete.
          </p>
        </div>

        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Row</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Property</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Listing ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-72 bg-gray-50">Assign Client</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {propertyRows.map((row) => {
                const assignment = assignments.find(a => a.rowNumber === row.rowNumber)
                const assignedClient = assignment?.clientId ? getClientById(assignment.clientId) : null
                const isAssigned = !!assignment?.clientId

                return (
                  <tr
                    key={row.rowNumber}
                    className={`${isAssigned ? 'bg-green-50/50' : 'bg-white'} hover:bg-gray-50`}
                  >
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
                            {row.listingName || <span className="text-red-500 italic">Missing</span>}
                          </span>
                          <span className="text-xs text-gray-500">{row.address}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {row.listingId || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <SearchableSelect
                            options={clientOptions}
                            value={assignment?.clientId || null}
                            onChange={(value) => handleClientChange(row.rowNumber, value || '')}
                            placeholder="Select client (optional)..."
                            emptyText="No clients found"
                            clearable={true}
                          />
                        </div>
                        {isAssigned && (
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <UserIcon className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Message */}
      {assignedCount < totalCount && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-700">
            {totalCount - assignedCount} {totalCount - assignedCount === 1 ? 'property' : 'properties'} without a client will be imported as incomplete. You can assign clients later from the property edit screen.
          </p>
        </div>
      )}
    </div>
  )
}

export default AssignClientsStep
