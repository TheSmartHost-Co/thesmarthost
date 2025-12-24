'use client'

import React, { useState, useEffect } from 'react'
import { CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { CsvHeader } from '@/services/types/csvMapping'

// Client fields that can be mapped
const CLIENT_FIELDS = [
  { field: 'name', label: 'Client Name', required: true },
  { field: 'email', label: 'Email Address', required: false },
  { field: 'phone', label: 'Phone Number', required: false },
  { field: 'status', label: 'Status', required: false },
  { field: 'companyName', label: 'Company Name', required: false },
  { field: 'billingAddress', label: 'Billing Address', required: false },
  { field: 'pms', label: 'PMS', required: false }
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
      const suggestions = suggestClientMappings(csvHeaders)
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

  const suggestClientMappings = (headers: CsvHeader[]): Record<string, string> => {
    const suggestions: Record<string, string> = {}

    const mappingRules = [
      { field: 'name', patterns: ['owner', 'name', 'client', 'contact'] },
      { field: 'email', patterns: ['email', 'e-mail', 'mail'] },
      { field: 'phone', patterns: ['phone', 'tel', 'mobile', 'cell'] },
      { field: 'status', patterns: ['status', 'state', 'active'] },
      { field: 'companyName', patterns: ['company', 'business', 'organization', 'org'] },
      { field: 'billingAddress', patterns: ['address', 'billing', 'location'] },
      { field: 'pms', patterns: ['pms', 'property management'] }
    ]

    headers.forEach(header => {
      const headerLower = header.name.toLowerCase().replace(/[^a-z0-9]/g, '')

      mappingRules.forEach(rule => {
        if (!suggestions[rule.field]) {
          rule.patterns.forEach(pattern => {
            const patternNormalized = pattern.replace(/[^a-z0-9]/g, '')
            if (headerLower.includes(patternNormalized) || patternNormalized.includes(headerLower)) {
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
    const requiredFields = CLIENT_FIELDS.filter(f => f.required)
    return requiredFields.every(field =>
      currentMappings[field.field] && currentMappings[field.field].trim() !== ''
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
        <h3 className="text-sm font-medium text-blue-900 mb-2">Map CSV Columns to Client Fields</h3>
        <p className="text-sm text-blue-700">
          Match each CSV column to the corresponding client field. Required fields are marked with *.
        </p>
      </div>

      {/* Mapping Form */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <span className="text-xs font-semibold text-gray-500 uppercase">Client Field</span>
            <span className="text-xs font-semibold text-gray-500 uppercase">CSV Column</span>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {CLIENT_FIELDS.map(field => {
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
            Please map the required field (Client Name) before continuing.
          </p>
        </div>
      )}
    </div>
  )
}

export default MapFieldsStep
