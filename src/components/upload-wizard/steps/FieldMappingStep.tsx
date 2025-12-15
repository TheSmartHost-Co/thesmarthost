'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/outline'
import FieldMappingForm from '@/components/csv-mapping/FieldMappingForm'
import { CsvData, FieldMapping } from '@/services/types/csvMapping'
import { parseCsvFile } from '@/utils/csvParser'
import { getCalculationRules } from '@/services/calculationRuleService'
import { CalculationRule } from '@/services/types/calculationRule'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { 
  FieldMappingState, 
  FieldMappingMode, 
  PropertyIdentificationState 
} from '../types/wizard'

interface FieldMappingStepProps {
  onNext?: () => void
  onBack?: () => void
  onCancel?: () => void
  canGoNext?: boolean
  canGoBack?: boolean
  config?: any
  uploadedFile?: any
  fieldMappingState?: FieldMappingState
  propertyIdentificationState?: PropertyIdentificationState
  onValidationComplete?: (state: FieldMappingState) => void
}

const FieldMappingStep: React.FC<FieldMappingStepProps> = ({
  onNext,
  onBack,
  onCancel,
  canGoNext,
  canGoBack,
  uploadedFile,
  fieldMappingState,
  propertyIdentificationState,
  onValidationComplete
}) => {
  const user = useUserStore(state => state.profile)
  const showNotification = useNotificationStore(state => state.showNotification)

  // Core state
  const [csvData, setCsvData] = useState<CsvData | null>(null)
  const [calculationRules, setCalculationRules] = useState<CalculationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Mapping mode state
  const [mappingMode, setMappingMode] = useState<FieldMappingMode>(
    fieldMappingState?.mappingMode || 'global'
  )
  const [activePropertyTab, setActivePropertyTab] = useState<string | null>(null)

  // Field mappings state - separated by mode
  const [globalMappings, setGlobalMappings] = useState<FieldMapping[]>(
    fieldMappingState?.globalMappings || []
  )
  const [propertyMappings, setPropertyMappings] = useState<Record<string, FieldMapping[]>>(
    fieldMappingState?.propertyMappings ? 
      Object.fromEntries(
        Object.entries(fieldMappingState.propertyMappings).map(([id, config]) => [
          id, config.fieldMappings
        ])
      ) : {}
  )

  // Get list of properties from property identification state
  const properties = useMemo(() => {
    return propertyIdentificationState?.propertyMappings.map(pm => ({
      id: pm.propertyId!,
      name: pm.listingName,
      bookingCount: pm.bookingCount || 0
    })).filter(p => p.id) || []
  }, [propertyIdentificationState])

  // Set initial active tab
  useEffect(() => {
    if (mappingMode === 'per-property' && properties.length > 0 && !activePropertyTab) {
      setActivePropertyTab(properties[0].id)
    }
  }, [mappingMode, properties, activePropertyTab])

  // Load CSV data
  useEffect(() => {
    const loadCsvData = async () => {
      if (!uploadedFile?.file) {
        setLoading(false)
        return
      }

      try {
        const fileToProcess = uploadedFile.file || uploadedFile
        const data = await parseCsvFile(fileToProcess)
        setCsvData(data)
      } catch (err) {
        console.error('Error parsing CSV:', err)
        setError('Failed to parse CSV file')
        showNotification('Failed to parse CSV file', 'error')
      } finally {
        setLoading(false)
      }
    }

    loadCsvData()
  }, [uploadedFile, showNotification])

  // Load calculation rules
  useEffect(() => {
    const loadCalculationRules = async () => {
      if (!user?.id) return

      try {
        const rulesRes = await getCalculationRules(user.id)
        if (rulesRes.status === 'success') {
          setCalculationRules(rulesRes.data || [])
        }
      } catch (err) {
        console.error('Error loading calculation rules:', err)
      }
    }

    loadCalculationRules()
  }, [user])

  // Get current field mappings based on mode
  const getCurrentMappings = useCallback((): FieldMapping[] => {
    if (mappingMode === 'global') {
      return globalMappings
    }
    
    if (activePropertyTab && propertyMappings[activePropertyTab]) {
      return propertyMappings[activePropertyTab]
    }
    
    return []
  }, [mappingMode, globalMappings, propertyMappings, activePropertyTab])

  // Update field mappings
  const handleFieldMappingsUpdate = useCallback((mappings: FieldMapping[]) => {
    if (mappingMode === 'global') {
      setGlobalMappings(mappings)
    } else if (activePropertyTab) {
      setPropertyMappings(prev => ({
        ...prev,
        [activePropertyTab]: mappings
      }))
    }
  }, [mappingMode, activePropertyTab])

  // Copy mappings to property
  const copyMappingsToProperty = useCallback((fromPropertyId: string, toPropertyId: string) => {
    const fromMappings = propertyMappings[fromPropertyId] || globalMappings
    setPropertyMappings(prev => ({
      ...prev,
      [toPropertyId]: [...fromMappings]
    }))
    showNotification('Mappings copied successfully', 'success')
  }, [propertyMappings, globalMappings, showNotification])

  // Copy global mappings to all properties
  const copyGlobalToAll = useCallback(() => {
    const newPropertyMappings: Record<string, FieldMapping[]> = {}
    properties.forEach(property => {
      newPropertyMappings[property.id] = [...globalMappings]
    })
    setPropertyMappings(newPropertyMappings)
    showNotification('Global mappings applied to all properties', 'success')
  }, [properties, globalMappings, showNotification])

  // Validation
  const isValid = useMemo(() => {
    if (mappingMode === 'global') {
      return globalMappings.some(mapping => 
        mapping.csvFormula && mapping.csvFormula.length > 0
      )
    }
    
    // For per-property mode, check that all properties have at least some mappings
    return properties.every(property => {
      const mappings = propertyMappings[property.id] || []
      return mappings.some(mapping => 
        mapping.csvFormula && mapping.csvFormula.length > 0
      )
    })
  }, [mappingMode, globalMappings, properties, propertyMappings])

  // Update parent state
  useEffect(() => {
    const state: FieldMappingState = {
      mappingMode,
      globalMappings: mappingMode === 'global' ? globalMappings : undefined,
      propertyMappings: mappingMode === 'per-property' 
        ? Object.fromEntries(
            Object.entries(propertyMappings).map(([propertyId, mappings]) => [
              propertyId,
              { fieldMappings: mappings }
            ])
          )
        : undefined,
      isValid,
      csvData,
      uniqueListings: propertyIdentificationState?.uniqueListings,
    }
    onValidationComplete?.(state)
  }, [
    mappingMode, 
    globalMappings, 
    propertyMappings, 
    isValid, 
    csvData, 
    propertyIdentificationState,
    onValidationComplete
  ])

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <ArrowPathIcon className="w-6 h-6 animate-spin text-blue-500 mr-3" />
          <span className="text-gray-500">Loading CSV data...</span>
        </div>
      </div>
    )
  }

  if (error || !csvData) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-500 mr-3" />
          <span className="text-red-500">{error || 'Failed to load CSV data'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Field Mapping</h2>
        <p className="text-gray-600">
          Map CSV columns to booking fields and configure calculation formulas
        </p>
      </div>

      {/* Mapping Mode Selector */}
      <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Mapping Mode</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="mappingMode"
                  value="global"
                  checked={mappingMode === 'global'}
                  onChange={() => setMappingMode('global')}
                  className="mr-3 text-blue-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Apply same mappings to all properties
                  </span>
                  <p className="text-xs text-gray-500">
                    Use the same field mappings and formulas for all {properties.length} properties
                  </p>
                </div>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="mappingMode"
                  value="per-property"
                  checked={mappingMode === 'per-property'}
                  onChange={() => setMappingMode('per-property')}
                  className="mr-3 text-blue-600"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    Configure mappings per property
                  </span>
                  <p className="text-xs text-gray-500">
                    Set different field mappings and formulas for each property
                  </p>
                </div>
              </label>
            </div>
          </div>
          
          {mappingMode === 'per-property' && properties.length > 0 && (
            <div className="text-right">
              <button
                onClick={copyGlobalToAll}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Copy global to all →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Property Tabs (Per-Property Mode) */}
      {mappingMode === 'per-property' && (
        <div className="mb-6">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex space-x-8 min-w-max">
              {properties.map((property) => (
                <button
                  key={property.id}
                  onClick={() => setActivePropertyTab(property.id)}
                  className={`
                    pb-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0
                    ${activePropertyTab === property.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  {property.name}
                  <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {property.bookingCount}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Field Mapping Form */}
      <div className="mb-8">
        <FieldMappingForm
          key={mappingMode === 'per-property' ? `property-${activePropertyTab}` : 'global'}
          csvData={csvData}
          initialFieldMappings={getCurrentMappings()}
          onMappingsChange={handleFieldMappingsUpdate}
          onValidationChange={(valid) => {}} // Handle validation if needed
          calculationRules={calculationRules}
        />
      </div>

      {/* Per-Property Actions */}
      {mappingMode === 'per-property' && activePropertyTab && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Property Actions</h4>
          <div className="overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {properties
                .filter(p => p.id !== activePropertyTab)
                .map((property) => (
                  <button
                    key={property.id}
                    onClick={() => copyMappingsToProperty(activePropertyTab, property.id)}
                    className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1 rounded bg-white border border-blue-200 flex-shrink-0 whitespace-nowrap"
                  >
                    Copy to {property.name}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Validation Status */}
      <div className="mb-8">
        {isValid ? (
          <div className="flex items-center text-green-600">
            <CheckCircleIcon className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Field mappings are valid</span>
          </div>
        ) : (
          <div className="flex items-center text-red-600">
            <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">
              {mappingMode === 'global' 
                ? 'Please map at least one field'
                : 'Please ensure all properties have field mappings'
              }
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={!canGoBack}
          className={`
            flex items-center px-4 py-2 text-sm font-medium rounded-lg
            ${canGoBack 
              ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50' 
              : 'text-gray-400 bg-gray-100 cursor-not-allowed'
            }
          `}
        >
          <ChevronLeftIcon className="w-4 h-4 mr-1" />
          Back
        </button>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          
          <button
            onClick={onNext}
            disabled={!isValid}
            className={`
              flex items-center px-4 py-2 text-sm font-medium rounded-lg
              ${isValid 
                ? 'text-white bg-blue-600 hover:bg-blue-700' 
                : 'text-gray-400 bg-gray-100 cursor-not-allowed'
              }
            `}
          >
            Continue
            <ChevronRightIcon className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default FieldMappingStep