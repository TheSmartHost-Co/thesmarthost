'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { CsvHeader } from '@/services/types/csvMapping'

// Expense fields that can be mapped
const EXPENSE_FIELDS = [
  { field: 'expenseDate', label: 'Expense Date', required: true },
  { field: 'amount', label: 'Amount', required: true },
  { field: 'currency', label: 'Currency', required: false },
  { field: 'category', label: 'Category', required: false },
  { field: 'vendorName', label: 'Vendor Name', required: false },
  { field: 'description', label: 'Description', required: false },
  { field: 'isReimbursable', label: 'Reimbursable', required: false },
  { field: 'isTaxDeductible', label: 'Tax Deductible', required: false },
  { field: 'paymentMethod', label: 'Payment Method', required: false },
  { field: 'paymentStatus', label: 'Payment Status', required: false },
  { field: 'subtotal', label: 'Subtotal', required: false },
  { field: 'taxGst', label: 'GST', required: false },
  { field: 'taxPst', label: 'PST', required: false },
  { field: 'taxHst', label: 'HST', required: false },
  { field: 'taxTotal', label: 'Tax Total', required: false },
]

interface MapFieldsStepProps {
  csvHeaders: CsvHeader[]
  initialMappings: Record<string, string>
  onMappingsChange: (mappings: Record<string, string>) => void
  onValidationChange: (isValid: boolean) => void
}

const MapFieldsStep: React.FC<MapFieldsStepProps> = ({
  csvHeaders,
  initialMappings,
  onMappingsChange,
  onValidationChange
}) => {
  const [mappings, setMappings] = useState<Record<string, string>>(initialMappings)

  // Auto-suggest mappings on mount
  useEffect(() => {
    if (Object.keys(initialMappings).length === 0) {
      const suggestions = suggestExpenseMappings(csvHeaders)
      setMappings(suggestions)
      onMappingsChange(suggestions)
    }
  }, [csvHeaders])

  // Validate mappings whenever they change
  useEffect(() => {
    const isValid = validateMappings(mappings)
    onValidationChange(isValid)
    onMappingsChange(mappings)
  }, [mappings])

  const handleMappingChange = (field: string, csvColumn: string) => {
    setMappings(prev => ({
      ...prev,
      [field]: csvColumn
    }))
  }

  const suggestExpenseMappings = (headers: CsvHeader[]): Record<string, string> => {
    const suggestions: Record<string, string> = {}

    const mappingRules = [
      { field: 'expenseDate', patterns: ['date', 'expense_date', 'transaction_date', 'expense date', 'transaction date'] },
      { field: 'amount', patterns: ['amount', 'total', 'price', 'cost', 'value'] },
      { field: 'currency', patterns: ['currency', 'curr', 'ccy'] },
      { field: 'category', patterns: ['category', 'type', 'expense_type', 'expense type'] },
      { field: 'vendorName', patterns: ['vendor', 'merchant', 'supplier', 'payee', 'vendor name', 'merchant name'] },
      { field: 'description', patterns: ['description', 'desc', 'notes', 'memo', 'details'] },
      { field: 'isReimbursable', patterns: ['reimbursable', 'reimburse', 'reimbursement'] },
      { field: 'isTaxDeductible', patterns: ['tax deductible', 'deductible', 'tax_deductible'] },
      { field: 'paymentMethod', patterns: ['payment method', 'payment_method', 'method', 'pay method'] },
      { field: 'paymentStatus', patterns: ['payment status', 'payment_status', 'status', 'paid'] },
      { field: 'subtotal', patterns: ['subtotal', 'sub_total', 'sub total', 'net'] },
      { field: 'taxGst', patterns: ['gst', 'gst_tax', 'gst tax'] },
      { field: 'taxPst', patterns: ['pst', 'pst_tax', 'pst tax'] },
      { field: 'taxHst', patterns: ['hst', 'hst_tax', 'hst tax'] },
      { field: 'taxTotal', patterns: ['tax', 'tax_total', 'tax total', 'total tax', 'taxes'] },
    ]

    headers.forEach(header => {
      const headerLower = header.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()

      mappingRules.forEach(rule => {
        if (!suggestions[rule.field]) {
          rule.patterns.forEach(pattern => {
            const patternNormalized = pattern.replace(/[^a-z0-9\s]/g, '').trim()
            if (headerLower === patternNormalized || headerLower.includes(patternNormalized)) {
              suggestions[rule.field] = header.name
            }
          })
        }
      })
    })

    return suggestions
  }

  const validateMappings = (currentMappings: Record<string, string>): boolean => {
    // Check required fields
    const requiredFields = EXPENSE_FIELDS.filter(f => f.required)
    return requiredFields.every(field =>
      currentMappings[field.field] && currentMappings[field.field].trim() !== '' && currentMappings[field.field] !== '__ignore__'
    )
  }

  const getHeaderOptions = (): Array<{ value: string; label: string }> => {
    const options = [
      { value: '', label: 'Select CSV Column...' },
      { value: '__ignore__', label: '-- Ignore this field --' }
    ]

    csvHeaders.forEach(header => {
      options.push({
        value: header.name,
        label: `${header.name}${header.sampleValue ? ` (e.g., "${header.sampleValue}")` : ''}`
      })
    })

    return options
  }

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Map CSV Columns to Expense Fields</h3>
        <p className="text-sm text-blue-700">
          Match each CSV column to the corresponding expense field. Required fields are marked with *.
        </p>
      </div>

      {/* Mapping Form */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <span className="text-xs font-semibold text-gray-500 uppercase">Expense Field</span>
            <span className="text-xs font-semibold text-gray-500 uppercase">CSV Column</span>
          </div>
        </div>

        <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
          {EXPENSE_FIELDS.map(field => {
            const currentValue = mappings[field.field] || ''
            const isMapped = currentValue.trim() !== '' && currentValue !== '__ignore__'

            return (
              <div key={field.field} className="px-4 py-4">
                <div className="grid grid-cols-2 gap-4 items-center">
                  {/* Field Label */}
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {isMapped ? (
                        <CheckIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <div className={`h-5 w-5 rounded-full border-2 ${field.required ? 'border-red-300' : 'border-gray-300'}`} />
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </span>
                      <span className="block text-xs text-gray-500">{field.field}</span>
                    </div>
                  </div>

                  {/* Column Selector */}
                  <div className="relative">
                    <select
                      value={currentValue}
                      onChange={(e) => handleMappingChange(field.field, e.target.value)}
                      className={`w-full appearance-none bg-white border rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        field.required && !isMapped
                          ? 'border-red-300 text-gray-900'
                          : isMapped
                          ? 'border-green-300 bg-green-50 text-gray-900'
                          : 'border-gray-300 text-gray-900'
                      }`}
                    >
                      {getHeaderOptions().map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* CSV Headers Preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Available CSV Columns</h4>
        <div className="flex flex-wrap gap-2">
          {csvHeaders.map(header => (
            <span
              key={header.index}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-700"
            >
              {header.name}
              {header.sampleValue && (
                <span className="ml-2 text-gray-400 truncate max-w-[100px]">
                  e.g., {header.sampleValue}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Validation Message */}
      {!validateMappings(mappings) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-yellow-700">
            Please map the required fields (Expense Date and Amount) before continuing.
          </p>
        </div>
      )}
    </div>
  )
}

export default MapFieldsStep
