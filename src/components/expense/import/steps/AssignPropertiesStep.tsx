'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { CurrencyDollarIcon, HomeIcon } from '@heroicons/react/24/outline'
import { CsvHeader } from '@/services/types/csvMapping'
import { Property } from '@/services/types/property'
import SearchableSelect, { SearchableSelectOption } from '@/components/shared/SearchableSelect'

export interface ExpenseRowData {
  rowNumber: number
  expenseDate: string
  amount: string
  category: string
  vendorName: string
  description: string
}

export interface PropertyAssignment {
  rowNumber: number
  propertyId: string
}

interface AssignPropertiesStepProps {
  csvRows: string[][]
  csvHeaders: CsvHeader[]
  fieldMappings: Record<string, string>
  properties: Property[]
  initialAssignments: PropertyAssignment[]
  onAssignmentsChange: (assignments: PropertyAssignment[]) => void
  onValidationChange: (isValid: boolean) => void
}

const AssignPropertiesStep: React.FC<AssignPropertiesStepProps> = ({
  csvRows,
  csvHeaders,
  fieldMappings,
  properties,
  initialAssignments,
  onAssignmentsChange,
  onValidationChange
}) => {
  const [assignments, setAssignments] = useState<PropertyAssignment[]>(initialAssignments)
  const [bulkPropertyId, setBulkPropertyId] = useState<string | null>(null)

  // Convert properties to SearchableSelect options
  const propertyOptions: SearchableSelectOption<string>[] = useMemo(() => {
    return [
      { value: '', label: 'None (General Expense)', secondaryLabel: 'No property assigned' },
      ...properties.map(property => ({
        value: property.id,
        label: property.listingName || property.address || 'Unnamed Property',
        secondaryLabel: property.address || undefined,
      }))
    ]
  }, [properties])

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

  // Parse expense rows from CSV
  const expenseRows: ExpenseRowData[] = useMemo(() => {
    return csvRows.map((row, index) => ({
      rowNumber: index + 2, // +2 because row 1 is header, and we're 0-indexed
      expenseDate: extractValue(row, 'expenseDate'),
      amount: extractValue(row, 'amount'),
      category: extractValue(row, 'category'),
      vendorName: extractValue(row, 'vendorName'),
      description: extractValue(row, 'description')
    }))
  }, [csvRows, csvHeaders, fieldMappings])

  // Initialize assignments if not already set
  useEffect(() => {
    if (initialAssignments.length === 0) {
      const defaultAssignments = expenseRows.map(row => ({
        rowNumber: row.rowNumber,
        propertyId: ''
      }))
      setAssignments(defaultAssignments)
    }
  }, [expenseRows, initialAssignments])

  // Property assignment is optional - always valid
  useEffect(() => {
    onValidationChange(true)
    onAssignmentsChange(assignments)
  }, [assignments])

  const handlePropertyChange = (rowNumber: number, propertyId: string) => {
    setAssignments(prev => {
      const updated = prev.map(a =>
        a.rowNumber === rowNumber ? { ...a, propertyId } : a
      )
      return updated
    })
  }

  const handleBulkAssign = () => {
    if (bulkPropertyId === null) return
    setAssignments(prev =>
      prev.map(a => ({ ...a, propertyId: bulkPropertyId }))
    )
    setBulkPropertyId(null)
  }

  const getPropertyById = (propertyId: string): Property | undefined => {
    return properties.find(p => p.id === propertyId)
  }

  // Count assigned rows
  const assignedCount = assignments.filter(a => a.propertyId !== '').length
  const totalCount = assignments.length

  // Format amount for display
  const formatAmount = (amount: string): string => {
    if (!amount) return '-'
    const num = parseFloat(amount.replace(/[,$]/g, ''))
    if (isNaN(num)) return amount
    return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(num)
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Property Assignment Progress <span className="text-gray-400 font-normal">(Optional)</span></h3>
          <p className="text-sm text-gray-500 mt-1">
            {assignedCount} of {totalCount} expenses assigned to properties
            {assignedCount < totalCount && (
              <span className="text-gray-400 ml-1">
                ({totalCount - assignedCount} will be general expenses)
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
        <h4 className="text-sm font-medium text-blue-900 mb-3">Bulk Assign Property</h4>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <SearchableSelect
              options={propertyOptions}
              value={bulkPropertyId}
              onChange={setBulkPropertyId}
              placeholder="Select a property to assign to all..."
              emptyText="No properties found"
              clearable={true}
            />
          </div>
          <button
            type="button"
            onClick={handleBulkAssign}
            disabled={bulkPropertyId === null}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              bulkPropertyId !== null
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
          <h3 className="text-sm font-medium text-gray-900">Assign Property to Each Expense</h3>
          <p className="text-xs text-gray-500 mt-1">
            Optionally assign a property to each expense. Expenses without a property will be imported as general expenses.
          </p>
        </div>

        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Row</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Expense</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase bg-gray-50">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-72 bg-gray-50">Assign Property</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenseRows.map((row) => {
                const assignment = assignments.find(a => a.rowNumber === row.rowNumber)
                const assignedProperty = assignment?.propertyId ? getPropertyById(assignment.propertyId) : null
                const isAssigned = !!assignment?.propertyId

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
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <CurrencyDollarIcon className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900 block">
                            {row.vendorName || row.category || <span className="text-gray-400 italic">Unnamed</span>}
                          </span>
                          <span className="text-xs text-gray-500">{row.expenseDate}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatAmount(row.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <SearchableSelect
                            options={propertyOptions}
                            value={assignment?.propertyId || null}
                            onChange={(value) => handlePropertyChange(row.rowNumber, value || '')}
                            placeholder="Select property (optional)..."
                            emptyText="No properties found"
                            clearable={true}
                          />
                        </div>
                        {isAssigned && (
                          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <HomeIcon className="h-3 w-3 text-white" />
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
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-700">
          {totalCount - assignedCount} {totalCount - assignedCount === 1 ? 'expense' : 'expenses'} without a property will be imported as general expenses. You can assign properties later from the expense edit screen.
        </p>
      </div>
    </div>
  )
}

export default AssignPropertiesStep
