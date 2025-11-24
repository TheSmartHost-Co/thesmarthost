'use client'

import React, { useState, useEffect } from 'react'
import { ChevronDownIcon, CheckIcon, PlusIcon } from '@heroicons/react/24/outline'
import { 
  CsvData, 
  Platform, 
  FieldMapping, 
  REQUIRED_BOOKING_FIELDS, 
  OPTIONAL_BOOKING_FIELDS,
  PLATFORM_OPTIONS 
} from '@/services/types/csvMapping'
import { CalculationRule } from '@/services/types/calculationRule'
import { suggestMappings, validateMappings } from '@/utils/csvParser'
import CalculationRuleModal from '@/components/calculation-rules/calculationRuleModal'

interface FieldMappingFormProps {
  csvData: CsvData
  onMappingsChange: (mappings: FieldMapping[]) => void
  onValidationChange: (isValid: boolean) => void
  calculationRules?: CalculationRule[]
  selectedProperty?: any
  onRefreshRules?: () => Promise<void>
}

const FieldMappingForm: React.FC<FieldMappingFormProps> = ({
  csvData,
  onMappingsChange,
  onValidationChange,
  calculationRules = [],
  selectedProperty,
  onRefreshRules
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('ALL')
  const [platformMappings, setPlatformMappings] = useState<Record<Platform, Record<string, string>>>({
    'ALL': {},
    'airbnb': {},
    'booking': {},
    'google': {},
    'direct': {},
    'wechalet': {},
    'monsieurchalets': {},
    'direct-etransfer': {},
    'vrbo': {},
    'hostaway': {}
  })
  const [hasBaseMappings, setHasBaseMappings] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  
  // Track input mode for each field per platform
  const [fieldInputModes, setFieldInputModes] = useState<Record<string, 'dropdown' | 'formula'>>({})
  
  // Custom fields modal state
  const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false)
  
  const getFieldInputMode = (fieldName: string): 'dropdown' | 'formula' => {
    const key = `${fieldName}_${selectedPlatform}`
    return fieldInputModes[key] || 'dropdown'
  }
  
  const setFieldInputMode = (fieldName: string, mode: 'dropdown' | 'formula') => {
    const key = `${fieldName}_${selectedPlatform}`
    setFieldInputModes(prev => ({
      ...prev,
      [key]: mode
    }))
  }

  // Auto-suggest mappings for ALL platform when CSV data changes
  useEffect(() => {
    const suggestions = suggestMappings(csvData.headers)
    setPlatformMappings(prev => ({
      ...prev,
      'ALL': suggestions
    }))
  }, [csvData])

  // Validate ALL platform mappings
  useEffect(() => {
    const requiredFields = REQUIRED_BOOKING_FIELDS.map(field => field.field)
    const allMappings = platformMappings['ALL']
    const errors = validateMappings(allMappings, requiredFields)
    setValidationErrors(errors)
    
    const allIsValid = errors.length === 0
    setHasBaseMappings(allIsValid)
    onValidationChange(allIsValid)
  }, [platformMappings])

  // Convert platform mappings to FieldMapping array
  useEffect(() => {
    const fieldMappings: FieldMapping[] = []
    
    // Add ALL platform mappings
    Object.entries(platformMappings['ALL'])
      .filter(([_, csvFormula]) => csvFormula.trim() !== '')
      .forEach(([bookingField, csvFormula]) => {
        fieldMappings.push({
          bookingField,
          csvFormula,
          platform: 'ALL',
          isOverride: false
        })
      })
    
    // Add platform-specific overrides
    Object.entries(platformMappings).forEach(([platform, mappings]) => {
      if (platform !== 'ALL') {
        Object.entries(mappings)
          .filter(([_, csvFormula]) => csvFormula.trim() !== '')
          .forEach(([bookingField, csvFormula]) => {
            fieldMappings.push({
              bookingField,
              csvFormula,
              platform: platform as Platform,
              isOverride: true
            })
          })
      }
    })
    
    onMappingsChange(fieldMappings)
  }, [platformMappings])

  // Load mappings when calculation rules change
  useEffect(() => {
    if (calculationRules && calculationRules.length > 0) {
      loadMappingsFromRules()
    }
  }, [calculationRules])

  const handleMappingChange = (bookingField: string, csvFormula: string) => {
    setPlatformMappings(prev => ({
      ...prev,
      [selectedPlatform]: {
        ...prev[selectedPlatform],
        [bookingField]: csvFormula
      }
    }))
  }

  // Load mappings from calculation rules
  const loadMappingsFromRules = () => {
    if (!calculationRules || calculationRules.length === 0) {
      return
    }

    // Merge calculation rules with existing mappings (preserve algorithmic suggestions)
    setPlatformMappings(prev => {
      const updatedMappings = { ...prev }
      
      // Group rules by platform and merge with existing mappings
      calculationRules.forEach(rule => {
        const platform = rule.platform as Platform
        if (platform in updatedMappings) {
          // Only override if the field isn't already mapped or if it's empty
          const existingValue = updatedMappings[platform][rule.bookingField]
          if (!existingValue || existingValue.trim() === '') {
            updatedMappings[platform] = {
              ...updatedMappings[platform],
              [rule.bookingField]: rule.csvFormula
            }
          }
        }
      })

      return updatedMappings
    })

    // Set input modes for formula fields
    const newFieldInputModes: Record<string, 'dropdown' | 'formula'> = {}
    calculationRules.forEach(rule => {
      const key = `${rule.bookingField}_${rule.platform}`
      // If the formula is not a simple column name, it's a formula
      const headerNames = csvData.headers.map(h => h.name)
      if (!headerNames.includes(rule.csvFormula)) {
        newFieldInputModes[key] = 'formula'
      } else {
        newFieldInputModes[key] = 'dropdown'
      }
    })
    setFieldInputModes(newFieldInputModes)
  }

  const handleSaveBaseMappings = () => {
    if (hasBaseMappings) {
      // Mark base mappings as saved and enable platform selection
      setSelectedPlatform('ALL') // Keep on ALL for now, user can switch
    }
  }

  const getCurrentFieldValue = (fieldName: string): string => {
    return platformMappings[selectedPlatform][fieldName] || 
           platformMappings['ALL'][fieldName] || 
           ''
  }

  const isFieldOverridden = (fieldName: string): boolean => {
    return selectedPlatform !== 'ALL' && 
           platformMappings[selectedPlatform][fieldName] !== undefined
  }

  const isFieldInherited = (fieldName: string): boolean => {
    return selectedPlatform !== 'ALL' && 
           platformMappings[selectedPlatform][fieldName] === undefined &&
           platformMappings['ALL'][fieldName] !== undefined
  }

  const getHeaderOptions = (): Array<{ value: string; label: string; disabled?: boolean }> => {
    const csvOptions = csvData.headers.map(header => ({
      value: header.name,
      label: `${header.name}${header.sampleValue ? ` (e.g., "${header.sampleValue}")` : ''}`,
      disabled: false
    }))

    // Get active custom fields for the current platform
    const customFieldsForPlatform = calculationRules.filter(rule => 
      rule.isActive && (rule.platform === selectedPlatform || rule.platform === 'ALL')
    )

    const customFieldOptions = customFieldsForPlatform.map(rule => ({
      value: rule.bookingField,
      label: `${rule.bookingField} (custom field)`,
      disabled: false
    }))

    const options: Array<{ value: string; label: string; disabled?: boolean }> = [
      { value: '', label: 'Select CSV Column...', disabled: false },
      ...csvOptions
    ]

    if (customFieldOptions.length > 0) {
      options.push(
        { value: 'separator', label: '──────── Custom Fields ────────', disabled: true },
        ...customFieldOptions
      )
    }

    return options
  }

  const renderMappingRow = (field: { field: string; label: string; required: boolean }) => {
    const currentValue = getCurrentFieldValue(field.field)
    const isRequired = field.required
    const isMapped = currentValue.trim() !== ''
    const isOverridden = isFieldOverridden(field.field)
    const isInherited = isFieldInherited(field.field)
    
    // Required fields are ALWAYS locked for platform overrides (only inherited)
    // Optional fields can be overridden per platform
    const isLocked = selectedPlatform !== 'ALL' && isRequired
    const canEdit = !isLocked

    // Get current input mode for this field
    const inputMode = getFieldInputMode(field.field)
    
    const getAvailableColumns = () => {
      const allMappings = platformMappings['ALL']
      const columns = [
        ...csvData.headers.map(h => h.name),
        ...Object.keys(allMappings).filter(key => allMappings[key]) // Add mapped booking fields
      ]
      return [...new Set(columns)] // Remove duplicates
    }

    const getMappedOptionalFields = () => {
      // Get optional booking fields that are already mapped on ALL platform
      const allMappings = platformMappings['ALL']
      const mappedOptionalFields = OPTIONAL_BOOKING_FIELDS.filter(field => {
        const isMapped = allMappings[field.field] && allMappings[field.field].trim() !== ''
        const isNumeric = ['number'].includes(field.type) || 
                         ['nightly_rate', 'cleaning_fee', 'sales_tax', 'lodging_tax', 'extra_guest_fees', 
                          'channel_fee', 'stripe_fee', 'total_payout', 'net_earnings', 'mgmt_fee', 
                          'bed_linen_fee', 'gst', 'qst'].includes(field.field)
        return isMapped && isNumeric
      })
      
      return mappedOptionalFields.map(field => field.field)
    }
    
    return (
      <div key={field.field} className="py-3 px-4 border-b border-gray-100">
        {/* Field Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {isMapped ? (
                <CheckIcon className={`h-5 w-5 ${isOverridden ? 'text-green-500' : 'text-blue-500'}`} />
              ) : (
                <div className={`h-5 w-5 rounded-full border-2 ${isRequired ? 'border-red-300' : 'border-gray-300'}`} />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">
                  {field.label}
                </span>
                {isRequired && selectedPlatform === 'ALL' && (
                  <span className="text-xs text-red-500">Required</span>
                )}
                {isRequired && selectedPlatform !== 'ALL' && (
                  <span className="text-xs text-gray-500">🔒 Required (Inherited)</span>
                )}
                {isOverridden && (
                  <span className="text-xs text-green-600 font-medium">✏️ Override</span>
                )}
              </div>
              <span className="text-xs text-gray-500">{field.field}</span>
            </div>
          </div>

          {/* Input Mode Toggle (only for optional fields) */}
          {canEdit && !isRequired && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setFieldInputMode(field.field, 'dropdown')}
                className={`px-2 py-1 text-xs rounded ${
                  inputMode === 'dropdown'
                    ? 'cursor-pointer bg-blue-100 text-blue-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📋 Column
              </button>
              <button
                type="button"
                onClick={() => {
                  setFieldInputMode(field.field, 'formula')
                  // Clear existing dropdown value when switching to formula mode
                  if (inputMode === 'dropdown' && currentValue) {
                    handleMappingChange(field.field, '')
                  }
                }}
                className={`cursor-pointer px-2 py-1 text-xs rounded ${
                  inputMode === 'formula'
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🧮 Formula
              </button>
            </div>
          )}
        </div>

        {/* Input Field */}
        <div className="flex items-center space-x-3">
          <span className="text-gray-400">→</span>
          <div className="flex-1">
            {isLocked ? (
              // Locked field (required fields on platform overrides)
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={currentValue}
                  disabled={true}
                  className="text-black bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm cursor-not-allowed text-gray-500 min-w-[250px]"
                />
                <span className="text-xs text-gray-500">Inherited from ALL platform</span>
              </div>
            ) : (!isRequired && inputMode === 'formula') ? (
              // Formula Mode (only for optional fields)
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={currentValue}
                    onChange={(e) => handleMappingChange(field.field, e.target.value)}
                    placeholder="Enter formula like [Accommodation Fee] or [Total Price] * 0.15 + [Cleaning Fee]"
                    className={`text-black bg-white border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[400px] ${
                      isOverridden 
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300'
                    }`}
                  />
                </div>
                
                {/* Quick Insert Buttons - Mapped optional booking fields */}
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-gray-500 mr-2">Quick insert:</span>
                  {getMappedOptionalFields().slice(0, 6).map(fieldName => (
                    <button
                      key={fieldName}
                      type="button"
                      onClick={() => {
                        const newValue = currentValue + `[${fieldName}]`
                        handleMappingChange(field.field, newValue)
                      }}
                      className="cursor-pointer text-black px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
                    >
                      [{fieldName}]
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const newValue = currentValue + ' + '
                      handleMappingChange(field.field, newValue)
                    }}
                    className="cursor-pointer text-black px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded border"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newValue = currentValue + ' - '
                      handleMappingChange(field.field, newValue)
                    }}
                    className="cursor-pointer text-black px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded border"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newValue = currentValue + ' * 0.15'
                      handleMappingChange(field.field, newValue)
                    }}
                    className="cursor-pointer text-black px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded border"
                  >
                    * 0.15
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const newValue = currentValue + ' / '
                      handleMappingChange(field.field, newValue)
                    }}
                    className="cursor-pointer text-black px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded border"
                  >
                    /
                  </button>
                </div>
              </div>
            ) : (
              // Dropdown Mode (default for all fields, only mode for required fields)
              <div className="flex items-center space-x-2">
                <select
                  value={currentValue}
                  onChange={(e) => {
                    if (e.target.value !== 'separator') {
                      handleMappingChange(field.field, e.target.value)
                    }
                  }}
                  className={`text-black appearance-none bg-white border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8 min-w-[250px] ${
                    isOverridden 
                      ? 'border-green-300 bg-green-50'
                      : isRequired && !isMapped && selectedPlatform === 'ALL'
                        ? 'border-red-300' 
                        : 'border-gray-300'
                  }`}
                >
                  {getHeaderOptions().map(option => (
                    <option 
                      key={option.value} 
                      value={option.value}
                      disabled={option.disabled}
                      style={option.disabled ? { 
                        backgroundColor: '#f3f4f6', 
                        color: '#6b7280',
                        fontStyle: 'italic'
                      } : {}}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="h-4 w-4 text-gray-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Platform Selection */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-blue-900">
              Configure Field Mappings
              {selectedPlatform === 'ALL' && !hasBaseMappings && ' - Base Configuration'}
              {selectedPlatform === 'ALL' && hasBaseMappings && ' ✅ Base Configuration Saved'}
              {selectedPlatform !== 'ALL' && ' - Platform Overrides'}
            </h3>
            <p className="text-xs text-blue-700 mt-1">
              {selectedPlatform === 'ALL' 
                ? 'Configure base mappings that apply to all platforms (required first)'
                : `Override specific fields for ${PLATFORM_OPTIONS.find(p => p.value === selectedPlatform)?.label} platform`
              }
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-blue-900">
              Applies to platform:
            </label>
            <div className="relative">
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value as Platform)}
                disabled={selectedPlatform === 'ALL' && !hasBaseMappings}
                className={`text-black appearance-none bg-white border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8 ${
                  selectedPlatform === 'ALL' && !hasBaseMappings ? 'cursor-not-allowed opacity-75' : ''
                }`}
              >
                <option value="ALL">
                  {hasBaseMappings ? '✅ ALL (Base)' : 'ALL (Base - Complete First)'}
                </option>
                {hasBaseMappings && PLATFORM_OPTIONS.slice(1).map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="h-4 w-4 text-gray-400 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" />
            </div>
            
            {/* Custom Fields Button */}
            {selectedProperty && (
              <button
                type="button"
                onClick={() => setIsCustomFieldsModalOpen(true)}
                className="cursor-pointer flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Custom Fields
              </button>
            )}
          </div>
        </div>
        
        {/* Platform Status Summary */}
        {hasBaseMappings && (
          <div className="mt-4 pt-3 border-t border-blue-200">
            <h4 className="text-xs font-medium text-blue-900 mb-2">Configuration Status:</h4>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                selectedPlatform === 'ALL' 
                  ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300' 
                  : 'bg-green-100 text-green-800'
              }`}>
                ✅ ALL (Base)
                {selectedPlatform === 'ALL' && <span className="ml-1">← Current</span>}
              </span>
              {['airbnbOfficial', 'vrbo', 'direct', 'hostaway'].map(platform => {
                const hasOverrides = Object.keys(platformMappings[platform as Platform] || {}).length > 0
                const platformLabel = PLATFORM_OPTIONS.find(p => p.value === platform)?.label || platform
                const isCurrentPlatform = selectedPlatform === platform
                return (
                  <span 
                    key={platform}
                    className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                      isCurrentPlatform
                        ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300'
                        : hasOverrides 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {hasOverrides ? '✅' : '⚪'} {platformLabel}
                    {hasOverrides && (
                      <span className="ml-1 text-xs">
                        ({Object.keys(platformMappings[platform as Platform]).length} overrides)
                      </span>
                    )}
                    {isCurrentPlatform && <span className="ml-1">← Current</span>}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-900 mb-2">Required Fields Missing</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="flex items-center">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2" />
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Field Mappings */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
        {/* Required Fields */}
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 sticky top-0 z-10">
          <h4 className="text-sm font-medium text-gray-900">Required Fields</h4>
          <p className="text-xs text-gray-600">These fields must be mapped to proceed</p>
        </div>
        {REQUIRED_BOOKING_FIELDS.map(field => renderMappingRow(field))}
        
        {/* Optional Fields */}
        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 sticky top-0 z-10">
          <h4 className="text-sm font-medium text-gray-900">Optional Fields</h4>
          <p className="text-xs text-gray-600">Map these fields for additional data capture</p>
        </div>
        {OPTIONAL_BOOKING_FIELDS.map(field => renderMappingRow(field))}
      </div>

      {/* CSV Preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">CSV Headers Preview</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {csvData.headers.map(header => (
            <div key={header.index} className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="text-sm font-medium text-gray-900">{header.name}</div>
              {header.sampleValue && (
                <div className="text-xs text-gray-500 mt-1 truncate">
                  e.g., "{header.sampleValue}"
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Custom Fields Modal */}
      <CalculationRuleModal
        isOpen={isCustomFieldsModalOpen}
        onClose={() => setIsCustomFieldsModalOpen(false)}
        propertyId={selectedProperty?.id}
        propertyName={selectedProperty?.listingName}
        onRulesUpdate={(updatedRules) => {
          // Refresh calculation rules when new rules are created
          console.log('Custom fields updated:', updatedRules)
          if (onRefreshRules) {
            onRefreshRules()
          }
        }}
      />
    </div>
  )
}

export default FieldMappingForm