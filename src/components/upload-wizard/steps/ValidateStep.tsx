'use client'

import React, { useState, useEffect } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import FieldMappingForm from '@/components/csv-mapping/FieldMappingForm'
import { CsvData, FieldMapping } from '@/services/types/csvMapping'
import { parseCsvFile } from '@/utils/csvParser'
import { getCalculationRules } from '@/services/calculationRuleService'
import { CalculationRule } from '@/services/types/calculationRule'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'

interface ValidateStepProps {
  onNext?: () => void
  onBack?: () => void
  onCancel?: () => void
  canGoNext?: boolean
  canGoBack?: boolean
  config?: any
  uploadedFile?: any
  validationState?: any
  onValidationComplete?: (state: any) => void
  selectedProperty?: any
}

const ValidateStep: React.FC<ValidateStepProps> = ({
  onNext,
  onBack,
  onCancel,
  canGoNext,
  canGoBack,
  uploadedFile,
  validationState,
  onValidationComplete,
  selectedProperty
}) => {
  const [csvData, setCsvData] = useState<CsvData | null>(null)
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const [isValidMappings, setIsValidMappings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calculationRules, setCalculationRules] = useState<CalculationRule[]>([])
  const [loadingRules, setLoadingRules] = useState(false)

  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  // Load CSV data from uploaded file
  useEffect(() => {
    const loadCsvData = async () => {
      if (!uploadedFile) {
        setError('No file uploaded')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await parseCsvFile(uploadedFile)
        setCsvData(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV')
        console.error('Error parsing CSV:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCsvData()
  }, [uploadedFile])

  // Update validation state when mappings change
  useEffect(() => {
    if (onValidationComplete) {
      onValidationComplete({
        fieldMappings,
        isValid: isValidMappings,
        csvData
      })
    }
  }, [fieldMappings, isValidMappings, csvData, onValidationComplete])

  const handleMappingsChange = (mappings: FieldMapping[]) => {
    setFieldMappings(mappings)
  }

  const handleValidationChange = (isValid: boolean) => {
    setIsValidMappings(isValid)
  }

  // Load calculation rules for the selected property
  const loadCalculationRules = async () => {
    if (!selectedProperty?.id) {
      showNotification('No property selected', 'error')
      return
    }

    try {
      setLoadingRules(true)
      const response = await getCalculationRules(selectedProperty.id)
      if (response.status === 'success') {
        setCalculationRules(response.data)
        showNotification(`Loaded ${response.data.length} existing field mappings`, 'success')
      } else {
        showNotification(response.message || 'Failed to load calculation rules', 'error')
      }
    } catch (error) {
      console.error('Error loading calculation rules:', error)
      showNotification('Error loading calculation rules', 'error')
    } finally {
      setLoadingRules(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Parsing CSV file...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">Error Parsing File</h3>
          <p className="text-red-700">{error}</p>
          {canGoBack && (
            <button
              onClick={onBack}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!csvData) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">No CSV data available</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Field Mapping</h2>
        <p className="text-gray-600">
          Map your CSV columns to booking fields. Required fields must be mapped to proceed.
        </p>
      </div>

      {/* Property & File Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            {selectedProperty && (
              <div>
                <h3 className="text-sm font-medium text-blue-900">Property</h3>
                <p className="text-sm text-blue-700">
                  {selectedProperty.listingName} ({selectedProperty.address})
                </p>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-blue-900">File Information</h3>
              <p className="text-sm text-blue-700">
                {uploadedFile?.name} - {csvData.totalRows} data rows, {csvData.headers.length} columns
              </p>
            </div>
          </div>
          <CheckCircleIcon className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      {/* Load Previous Configuration */}
      {selectedProperty && (
        <div className="flex justify-center">
          <button
            onClick={loadCalculationRules}
            disabled={loadingRules}
            className="cursor-pointer flex items-center px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${loadingRules ? 'animate-spin' : ''}`} />
            {loadingRules ? 'Loading...' : 'Load Previous Configuration'}
          </button>
        </div>
      )}

      {/* Field Mapping Form */}
      <FieldMappingForm
        csvData={csvData}
        onMappingsChange={handleMappingsChange}
        onValidationChange={handleValidationChange}
        calculationRules={calculationRules}
        selectedProperty={selectedProperty}
      />

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onBack}
          disabled={!canGoBack}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Back
        </button>
        
        <div className="flex items-center space-x-3">
          {isValidMappings ? (
            <div className="flex items-center text-green-600">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">All required fields mapped</span>
            </div>
          ) : (
            <div className="flex items-center text-yellow-600">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Map required fields to continue</span>
            </div>
          )}
          
          <button
            onClick={onNext}
            disabled={!canGoNext || !isValidMappings}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}

export default ValidateStep