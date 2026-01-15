'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ChevronDownIcon, CheckIcon, PlusIcon, FolderIcon } from '@heroicons/react/24/outline'
import { 
  CsvData, 
  Platform, 
  FieldMapping, 
  CompleteFieldMappingState,
  REQUIRED_BOOKING_FIELDS, 
  OPTIONAL_BOOKING_FIELDS,
  PLATFORM_OPTIONS 
} from '@/services/types/csvMapping'
import { CalculationRule } from '@/services/types/calculationRule'
import { suggestMappings, validateMappings } from '@/utils/csvParser'
import { getTemplateRulesByName } from '@/services/calculationRuleService'
import CalculationRuleModal from '@/components/calculation-rules/calculationRuleModal'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'

interface FieldMappingFormProps {
  csvData: CsvData
  onMappingsChange: (mappings: FieldMapping[]) => void
  onValidationChange: (isValid: boolean) => void
  calculationRules?: CalculationRule[]
  selectedProperty?: any
  onRefreshRules?: () => Promise<void>
  initialFieldMappings?: FieldMapping[]
  initialCompleteState?: CompleteFieldMappingState
  onCompleteStateChange?: (completeState: CompleteFieldMappingState) => void
}

const FieldMappingForm: React.FC<FieldMappingFormProps> = ({
  csvData,
  onMappingsChange,
  onValidationChange,
  calculationRules = [],
  selectedProperty,
  onRefreshRules,
  initialFieldMappings,
  initialCompleteState,
  onCompleteStateChange
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>('ALL')
  
  // Initialize platform mappings with initial data instead of empty state
  const [platformMappings, setPlatformMappings] = useState<Record<Platform, Record<string, string>>>(() => {
    // If we have initial field mappings, use them to initialize the state
    if (initialFieldMappings && initialFieldMappings.length > 0) {
      const initialMappings: Record<Platform, Record<string, string>> = {
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
      }

      initialFieldMappings.forEach(mapping => {
        const platform = mapping.platform || 'ALL'
        initialMappings[platform][mapping.bookingField] = mapping.csvFormula
      })

      return initialMappings
    }

    // If we have complete state, use its platform mappings
    if (initialCompleteState) {
      return initialCompleteState.platformMappings
    }

    // Default empty state
    return {
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
    }
  })
  const [hasBaseMappings, setHasBaseMappings] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  
  // Track input mode for each field per platform
  // Initialize from initialCompleteState if available (for draft restore)
  const [fieldInputModes, setFieldInputModes] = useState<Record<string, 'dropdown' | 'formula'>>(
    initialCompleteState?.fieldInputModes || {}
  )
  
  // Custom fields modal state
  const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false)
  const [loadedCalculationRules, setLoadedCalculationRules] = useState<CalculationRule[]>([])

  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()
  
  // Platform override state
  const [platformOverride, setPlatformOverride] = useState<string>('')
  const [isPlatformOverrideActive, setIsPlatformOverrideActive] = useState(false)
  
  // Track previous props to detect changes
  const prevCompleteStateRef = useRef<string | undefined>(undefined)
  const prevFieldMappingsRef = useRef<string | undefined>(undefined)
  // Set hasRestoredRef to true if we initialized with data
  const hasRestoredRef = useRef(
    (initialFieldMappings && initialFieldMappings.length > 0) || !!initialCompleteState
  )
  // Track the last emitted complete state to prevent duplicate emissions
  const lastEmittedStateRef = useRef<string | undefined>(undefined)
  // Track whether current platformMappings came from auto-suggestions (not user edits)
  const isAutoSuggestedRef = useRef(false)

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

  // Simplified initialization effect - only handle auto-suggestions for truly empty forms
  useEffect(() => {
    // Only auto-suggest if we have no initial data and haven't already restored
    const shouldInitialize = !initialCompleteState &&
      (!initialFieldMappings || initialFieldMappings.length === 0) &&
      !hasRestoredRef.current

    if (shouldInitialize && csvData?.headers) {
      // First time initialization - auto-suggest mappings
      const suggestions = suggestMappings(csvData.headers)

      setPlatformMappings(prev => ({
        ...prev,
        'ALL': suggestions
      }))
      hasRestoredRef.current = true
      isAutoSuggestedRef.current = true  // Mark as auto-suggested
    }
  }, [csvData, initialFieldMappings, initialCompleteState])

  // Reinitialize platformMappings when initialFieldMappings prop changes (template loading)
  // This fixes the race condition where form mounts before template finishes loading
  useEffect(() => {
    // Skip if no initial field mappings
    if (!initialFieldMappings || initialFieldMappings.length === 0) return

    // Skip if we have complete state (draft restore takes priority)
    if (initialCompleteState?.platformMappings) {
      const hasCompleteStateMappings = Object.keys(initialCompleteState.platformMappings.ALL || {}).length > 0
      if (hasCompleteStateMappings) return
    }

    // Only skip if we have user-edited values (not auto-suggestions)
    // Auto-suggestions should be overwritten by template values
    const currentAllMappings = platformMappings['ALL']
    const hasExistingValues = Object.keys(currentAllMappings).length > 0
    if (hasExistingValues && !isAutoSuggestedRef.current) return

    // Rebuild platformMappings from initialFieldMappings
    const newPlatformMappings: Record<Platform, Record<string, string>> = {
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
    }

    initialFieldMappings.forEach(mapping => {
      const platform = mapping.platform || 'ALL'
      newPlatformMappings[platform][mapping.bookingField] = mapping.csvFormula
    })

    setPlatformMappings(newPlatformMappings)
    hasRestoredRef.current = true
    isAutoSuggestedRef.current = false  // Template values are not auto-suggested
  }, [initialFieldMappings, initialCompleteState])

  // Detect formulas from initial field mappings (template load)
  // A value is a formula if it doesn't match any CSV header name
  // This runs whenever initialFieldMappings changes (template loaded)
  // NOTE: We always detect formulas from initialFieldMappings, don't skip based on completeState
  // because completeState may have stale fieldInputModes from wizard state
  useEffect(() => {
    if (!initialFieldMappings || initialFieldMappings.length === 0) return
    if (!csvData?.headers || csvData.headers.length === 0) return

    const headerNames = csvData.headers.map(h => h.name.toLowerCase())
    const newModes: Record<string, 'dropdown' | 'formula'> = {}

    initialFieldMappings.forEach(mapping => {
      if (mapping.csvFormula && mapping.csvFormula.trim()) {
        const key = `${mapping.bookingField}_${mapping.platform}`
        const isSimpleColumn = headerNames.includes(mapping.csvFormula.toLowerCase())
        newModes[key] = isSimpleColumn ? 'dropdown' : 'formula'
      }
    })

    if (Object.keys(newModes).length > 0) {
      // Always set modes based on actual data - this ensures formula fields show correct toggle
      setFieldInputModes(newModes)
    }
  }, [initialFieldMappings, csvData])

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
    // Check if platformMappings are empty (this indicates a reset)
    const allPlatformsEmpty = Object.values(platformMappings).every(platform => 
      Object.keys(platform).length === 0
    )
    
    // Only emit changes after we've finished initial setup
    if (!hasRestoredRef.current) {
      return
    }

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

  // Emit complete state changes for persistence (with deduplication and debouncing)
  useEffect(() => {
    if (onCompleteStateChange && hasRestoredRef.current) {
      // Only start emitting after we've finished restoring
      const timer = setTimeout(() => {
        const fieldMappings: FieldMapping[] = []
        
        // Convert platform mappings to field mappings
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

        const completeState: CompleteFieldMappingState = {
          fieldMappings,
          platformMappings,
          fieldInputModes,
          selectedPlatform,
          platformOverride,
          isPlatformOverrideActive,
          hasBaseMappings
        }
        
        // Only emit if the state has actually changed
        const currentStateKey = JSON.stringify(completeState)
        if (currentStateKey !== lastEmittedStateRef.current) {
          onCompleteStateChange(completeState)
          lastEmittedStateRef.current = currentStateKey
        }
      }, 50) // 50ms debounce

      return () => clearTimeout(timer)
    }
  }, [platformMappings, fieldInputModes, selectedPlatform, platformOverride, isPlatformOverrideActive, hasBaseMappings, onCompleteStateChange])

  // Load mappings when calculation rules change
  useEffect(() => {
    if (calculationRules && calculationRules.length > 0) {
      loadMappingsFromRules()
    }
  }, [calculationRules])

  const handleMappingChange = (bookingField: string, csvFormula: string) => {
    // User is editing, no longer auto-suggested (preserve user edits over template loads)
    isAutoSuggestedRef.current = false

    // Check if the selected value is a custom field (calculation rule) from both sources
    const allRules = [...calculationRules, ...loadedCalculationRules]
    const customField = allRules.find(rule => 
      rule.bookingField === csvFormula && rule.isActive
    )
    
    if (customField) {
      
      // Auto-fill the formula from the calculation rule
      setPlatformMappings(prev => {
        const newMappings = {
          ...prev,
          [selectedPlatform]: {
            ...prev[selectedPlatform],
            [bookingField]: customField.csvFormula // Use the actual formula, not the field name
          }
        }
        
        return newMappings
      })
      
      // Switch to formula mode since this is a calculated field
      setFieldInputMode(bookingField, 'formula')
    } else {
      
      // Regular CSV column mapping
      setPlatformMappings(prev => {
        const newMappings = {
          ...prev,
          [selectedPlatform]: {
            ...prev[selectedPlatform],
            [bookingField]: csvFormula
          }
        }
        
        return newMappings
      })
    }
  }

  const handlePlatformOverride = (platform: string) => {
    setPlatformOverride(platform)
    setIsPlatformOverrideActive(true)
    
    // Set the platform mapping to the override value
    setPlatformMappings(prev => ({
      ...prev,
      [selectedPlatform]: {
        ...prev[selectedPlatform],
        'platform': `PLATFORM:${platform}`
      }
    }))
  }

  const clearPlatformOverride = () => {
    setIsPlatformOverrideActive(false)
    setPlatformOverride('')
    
    // Clear the platform mapping
    setPlatformMappings(prev => ({
      ...prev,
      [selectedPlatform]: {
        ...prev[selectedPlatform],
        'platform': ''
      }
    }))
  }

  // Load mappings from calculation rules
  const loadMappingsFromRules = () => {
    if (!calculationRules || calculationRules.length === 0) {
      return
    }

    const activeRules = calculationRules.filter(rule => rule.isActive === true)
    
    if (activeRules.length === 0) {
      return
    }

    // Do NOT push rules into platformMappings.
    // Let them appear only as "custom fields" that the user can select.

    setFieldInputModes(prev => {
      const next = { ...prev }
      const headerNames = csvData.headers.map(h => h.name.toLowerCase())

      activeRules.forEach(rule => {
        const key = `${rule.bookingField}_${rule.platform}`
        const isSimpleColumn = headerNames.includes(rule.csvFormula.toLowerCase())
        next[key] = isSimpleColumn ? 'dropdown' : 'formula'
      })

      return next
    })
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

  // Load rules from a specific template (called from CalculationRuleModal)
  const handleLoadTemplateRules = async (templateName: string) => {
    if (!profile?.id) {
      showNotification('User not found', 'error')
      return
    }

    try {
      const response = await getTemplateRulesByName(profile.id, templateName)
      if (response.status === 'success') {
        setLoadedCalculationRules(response.data)
        showNotification(`Loaded ${response.data.length} rules from template "${templateName}"`, 'success')
      } else {
        showNotification(response.message || 'Failed to load template rules', 'error')
      }
    } catch (error) {
      console.error('Error loading template rules:', error)
      showNotification('Error loading template rules', 'error')
    }
  }

  const getHeaderOptions = (): Array<{ value: string; label: string; disabled?: boolean }> => {
    const csvOptions = csvData.headers.map(header => ({
      value: header.name,
      label: `${header.name}${header.sampleValue ? ` (e.g., "${header.sampleValue}")` : ''}`,
      disabled: false
    }))

    // Get active custom fields for the current platform (from both props and loaded rules)
    const allRules = [...calculationRules, ...loadedCalculationRules]
    const customFieldsForPlatform = allRules.filter(rule => 
      rule.isActive && (rule.platform === selectedPlatform || rule.platform === 'ALL')
    )

    const customFieldOptions = customFieldsForPlatform.map(rule => ({
      value: rule.bookingField,
      label: `${rule.bookingField} (${rule.templateName || 'custom field'})`,
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

    const getFilteredCsvHeaders = (formulaValue: string) => {
      // Extract the last segment being typed (after the last operator)
      const operators = ['+', '-', '*', '/']
      let searchTerm = formulaValue.trim()

      // Find the last operator and get text after it
      let lastOperatorIndex = -1
      for (const op of operators) {
        const idx = formulaValue.lastIndexOf(op)
        if (idx > lastOperatorIndex) {
          lastOperatorIndex = idx
        }
      }

      if (lastOperatorIndex !== -1) {
        searchTerm = formulaValue.substring(lastOperatorIndex + 1).trim()
      }

      // Filter headers based on search term (case-insensitive)
      const filteredHeaders = csvData.headers.filter(header => {
        if (!searchTerm) return true // Show all if no search term
        return header.name.toLowerCase().includes(searchTerm.toLowerCase())
      })

      // Limit results to prevent UI overflow
      return filteredHeaders.slice(0, 12)
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
                {field.field === 'platform' && isPlatformOverrideActive && platformOverride && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                    🎯 Overridden: {PLATFORM_OPTIONS.find(opt => opt.value === platformOverride)?.label}
                  </span>
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
                
                {/* Quick Insert Buttons - CSV columns filtered by typing */}
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-gray-500 mr-2">
                    {currentValue ? 'Matching columns:' : 'Available columns:'}
                  </span>
                  {getFilteredCsvHeaders(currentValue).length > 0 ? (
                    getFilteredCsvHeaders(currentValue).map(header => (
                      <button
                        key={header.name}
                        type="button"
                        onClick={() => {
                          // Replace the search term with the selected column name
                          const operators = ['+', '-', '*', '/']
                          let lastOperatorIndex = -1
                          for (const op of operators) {
                            const idx = currentValue.lastIndexOf(op)
                            if (idx > lastOperatorIndex) {
                              lastOperatorIndex = idx
                            }
                          }

                          let newValue: string
                          if (lastOperatorIndex !== -1) {
                            // Replace text after the last operator
                            newValue = currentValue.substring(0, lastOperatorIndex + 1) + ' ' + header.name
                          } else {
                            // Replace entire value
                            newValue = header.name
                          }
                          handleMappingChange(field.field, newValue)
                        }}
                        className="cursor-pointer text-black px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded border"
                        title={`Insert ${header.name}${header.sampleValue ? ` (e.g. ${header.sampleValue})` : ''}`}
                      >
                        {header.name}
                      </button>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">No matching columns</span>
                  )}
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
                
                {/* Platform Override Button - Show only for platform field */}
                {field.field === 'platform' && (
                  <div className="ml-2">
                    {!isPlatformOverrideActive ? (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsPlatformOverrideActive(true)}
                          className="px-3 py-2 text-xs bg-orange-100 text-orange-700 border border-orange-300 rounded-lg hover:bg-orange-200 transition-colors flex items-center"
                          title="Override platform - useful when CSV doesn't have a platform column"
                        >
                          🎯 Override
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <select
                          value={platformOverride}
                          onChange={(e) => handlePlatformOverride(e.target.value)}
                          className="text-black px-2 py-1 text-xs border border-orange-300 rounded bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">Select Platform...</option>
                          {PLATFORM_OPTIONS.filter(opt => opt.value !== 'ALL').map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={clearPlatformOverride}
                          className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                          title="Clear platform override"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
            
              <button
                type="button"
                onClick={() => setIsCustomFieldsModalOpen(true)}
                className="cursor-pointer flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Custom Fields
              </button>
            
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
        userId={profile?.id}
        onTemplateSelect={handleLoadTemplateRules}
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