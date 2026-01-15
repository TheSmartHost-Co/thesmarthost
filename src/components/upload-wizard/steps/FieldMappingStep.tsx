'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { ChevronRightIcon, ChevronLeftIcon, BookmarkIcon, Cog6ToothIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import FieldMappingForm from '@/components/csv-mapping/FieldMappingForm'
import PropertyFieldMappingModal from '@/components/property-field-mapping/propertyFieldMappingModal'
import GlobalFieldMappingModal from '@/components/global-field-mapping/GlobalFieldMappingModal'
import { CsvData, FieldMapping, CompleteFieldMappingState } from '@/services/types/csvMapping'
import { parseCsvFile } from '@/utils/csvParser'
import { getCalculationRules } from '@/services/calculationRuleService'
import { CalculationRule } from '@/services/types/calculationRule'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  getPropertyFieldMappings,
  createPropertyFieldMapping,
  platformFieldMappingsToFieldMappings,
  fieldMappingsToPlatformFieldMappings,
  updatePropertyFieldMapping,
  getGlobalFieldMappings,
  createGlobalFieldMapping,
  updateGlobalFieldMapping
} from '@/services/propertyFieldMappingService'
import type { PropertyFieldMappingTemplate, GlobalFieldMappingTemplate } from '@/services/types/propertyFieldMapping'
import { 
  FieldMappingState, 
  FieldMappingMode, 
  PropertyIdentificationState 
} from '../types/wizard'

interface FieldMappingStepProps {
  onNext?: () => void
  onBack?: () => void
  onCancel?: () => void
  onSaveDraft?: () => void
  canGoNext?: boolean
  canGoBack?: boolean
  config?: any
  uploadedFile?: any
  fieldMappingState?: FieldMappingState
  propertyIdentificationState?: PropertyIdentificationState
  completeFieldMappingState?: CompleteFieldMappingState
  onValidationComplete?: (state: FieldMappingState) => void
  onCompleteStateChange?: (completeState: CompleteFieldMappingState) => void
}

const FieldMappingStep: React.FC<FieldMappingStepProps> = ({
  onNext,
  onBack,
  onCancel,
  onSaveDraft,
  canGoNext,
  canGoBack,
  uploadedFile,
  fieldMappingState,
  propertyIdentificationState,
  completeFieldMappingState,
  onValidationComplete,
  onCompleteStateChange
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

  // Template management state (per-property)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [templateModalPropertyId, setTemplateModalPropertyId] = useState<string>('')
  const [templateModalPropertyName, setTemplateModalPropertyName] = useState<string>('')
  const [loadingTemplate, setLoadingTemplate] = useState(false)
  const [availableTemplates, setAvailableTemplates] = useState<PropertyFieldMappingTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<PropertyFieldMappingTemplate | null>(null)
  const [selectedTemplatesByProperty, setSelectedTemplatesByProperty] = useState<Record<string, PropertyFieldMappingTemplate | null>>({})

  // Global template management state
  const [showGlobalTemplateModal, setShowGlobalTemplateModal] = useState(false)
  const [loadingGlobalTemplate, setLoadingGlobalTemplate] = useState(false)
  const [availableGlobalTemplates, setAvailableGlobalTemplates] = useState<GlobalFieldMappingTemplate[]>([])
  const [selectedGlobalTemplate, setSelectedGlobalTemplate] = useState<GlobalFieldMappingTemplate | null>(null)
  const hasLoadedGlobalDefault = useRef(false)

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

  // Update selected template when switching properties
  useEffect(() => {
    if (activePropertyTab) {
      const propertyTemplate = selectedTemplatesByProperty[activePropertyTab] || null
      setSelectedTemplate(propertyTemplate)
    }
  }, [activePropertyTab, selectedTemplatesByProperty])

  // Load templates for active property
  useEffect(() => {
    const loadTemplatesForProperty = async () => {
      if (mappingMode === 'per-property' && activePropertyTab) {
        try {
          setLoadingTemplate(true)
          const response = await getPropertyFieldMappings(activePropertyTab)
          if (response.status === 'success') {
            setAvailableTemplates(response.data)
            
            // Check if there's a default template and auto-load it
            const defaultTemplate = response.data.find(t => t.isDefault)
            const existingMappings = propertyMappings[activePropertyTab]
                  
            if (defaultTemplate && (!propertyMappings[activePropertyTab] || propertyMappings[activePropertyTab].length === 0)) {
              loadTemplateToProperty(defaultTemplate, activePropertyTab)
            }
          }
        } catch (error) {
          console.error('Error loading templates for property:', error)
        } finally {
          setLoadingTemplate(false)
        }
      }
    }

    loadTemplatesForProperty()
  }, [mappingMode, activePropertyTab])

  // Load global templates and auto-load default when in global mode
  useEffect(() => {
    const loadGlobalTemplates = async () => {
      if (mappingMode === 'global' && user?.id) {
        try {
          setLoadingGlobalTemplate(true)
          const response = await getGlobalFieldMappings(user.id)
          if (response.status === 'success') {
            setAvailableGlobalTemplates(response.data)

            // Auto-load default global template if exists and no mappings yet
            const defaultTemplate = response.data.find(t => t.isDefault)
            if (defaultTemplate && globalMappings.length === 0 && !hasLoadedGlobalDefault.current) {
              hasLoadedGlobalDefault.current = true
              loadGlobalTemplate(defaultTemplate)
            }
          }
        } catch (error) {
          console.error('Error loading global templates:', error)
        } finally {
          setLoadingGlobalTemplate(false)
        }
      }
    }

    loadGlobalTemplates()
  }, [mappingMode, user?.id])

  // Load a global template into the global mappings
  const loadGlobalTemplate = useCallback((template: GlobalFieldMappingTemplate, showConfirm = false) => {
    // Show confirmation if there are existing mappings and showConfirm is true
    if (showConfirm && globalMappings.length > 0) {
      const confirmMessage = `Loading template "${template.mappingName}" will replace your current field mappings. Continue?`
      if (!confirm(confirmMessage)) {
        return
      }
    }

    try {
      const fieldMappings = platformFieldMappingsToFieldMappings(template.fieldMappings)
      setGlobalMappings(fieldMappings)
      setSelectedGlobalTemplate(template)
      showNotification(`Loaded global template: ${template.mappingName}`, 'success')
    } catch (error) {
      console.error('Error loading global template:', error)
      showNotification('Failed to load global template', 'error')
    }
  }, [globalMappings.length, showNotification])

  // Auto-load default template for property
  const loadTemplateToProperty = useCallback((template: PropertyFieldMappingTemplate, propertyId: string) => {
    
    try {
      const fieldMappings = platformFieldMappingsToFieldMappings(template.fieldMappings)
      
      
      // Update both states synchronously using functional updates to ensure consistency
      setPropertyMappings(prev => {
        const newMappings = {
          ...prev,
          [propertyId]: fieldMappings
        }
        
        return newMappings
      })
      
      // Track selected template per property
      setSelectedTemplatesByProperty(prev => {
        const newTemplatesByProperty = {
          ...prev,
          [propertyId]: template
        }
        
        return newTemplatesByProperty
      })
      
      // Update current selected template if this is the active property
      if (propertyId === activePropertyTab) {
        
        setSelectedTemplate(template)
      }
      
      showNotification(`Loaded template: ${template.mappingName}`, 'success')
    } catch (error) {
      console.error('Error loading template:', error)
      showNotification('Failed to load template', 'error')
    }
  }, [showNotification, activePropertyTab])

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
      setPropertyMappings(prev => {
        const newMappings = {
          ...prev,
          [activePropertyTab]: mappings
        }
        
        return newMappings
      })
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

  // Template management handlers
  const handleOpenTemplateModal = useCallback((propertyId: string) => {
    const property = properties.find(p => p.id === propertyId)
    setTemplateModalPropertyId(propertyId)
    setTemplateModalPropertyName(property?.name || 'Property')
    setShowTemplateModal(true)
  }, [properties])

  const handleTemplateSelect = useCallback((template: PropertyFieldMappingTemplate | null) => {
    if (template && templateModalPropertyId) {
      loadTemplateToProperty(template, templateModalPropertyId)
    }
    setShowTemplateModal(false)
  }, [templateModalPropertyId, loadTemplateToProperty])

  const handleSaveAsTemplate = useCallback(async (propertyId: string) => {
    if (!user?.id) {
      showNotification('User profile not found', 'error')
      return
    }

    const currentMappings = propertyMappings[propertyId] || []
    if (currentMappings.length === 0) {
      showNotification('No field mappings to save', 'error')
      return
    }

    const templateName = prompt('Enter a name for this template:')
    if (!templateName?.trim()) {
      return
    }

    try {
      setLoadingTemplate(true)
      const platformMappings = fieldMappingsToPlatformFieldMappings(currentMappings)
      
      const response = await createPropertyFieldMapping({
        propertyId,
        userId: user.id,
        mappingName: templateName.trim(),
        fieldMappings: platformMappings,
        isDefault: availableTemplates.length === 0 // Set as default if it's the first template
      })

      if (response.status === 'success') {
        showNotification(`Template "${templateName}" saved successfully`, 'success')
        setAvailableTemplates(prev => [...prev, response.data])
        // Update selected template to the newly created one
        setSelectedTemplatesByProperty(prev => ({
          ...prev,
          [propertyId]: response.data
        }))
        setSelectedTemplate(response.data)
      } else {
        showNotification(response.message || 'Failed to save template', 'error')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      showNotification('Failed to save template', 'error')
    } finally {
      setLoadingTemplate(false)
    }
  }, [user, propertyMappings, availableTemplates, showNotification])

  const handleUpdateTemplate = useCallback(async (propertyId: string, template: PropertyFieldMappingTemplate) => {
    if (!user?.id) {
      showNotification('User profile not found', 'error')
      return
    }

    const currentMappings = propertyMappings[propertyId] || []
    if (currentMappings.length === 0) {
      showNotification('No field mappings to update', 'error')
      return
    }

    const confirmMessage = `Update template "${template.mappingName}" with current field mappings?`
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      setLoadingTemplate(true)
      const platformMappings = fieldMappingsToPlatformFieldMappings(currentMappings)
      
      const response = await updatePropertyFieldMapping(template.id, {
        fieldMappings: platformMappings
      })

      if (response.status === 'success') {
        showNotification(`Template "${template.mappingName}" updated successfully`, 'success')
        
        // Update the available templates list
        setAvailableTemplates(prev => prev.map(t => 
          t.id === template.id ? response.data : t
        ))
        
        // Update the selected template
        setSelectedTemplatesByProperty(prev => ({
          ...prev,
          [propertyId]: response.data
        }))
        setSelectedTemplate(response.data)
      } else {
        showNotification(response.message || 'Failed to update template', 'error')
      }
    } catch (error) {
      console.error('Error updating template:', error)
      showNotification('Failed to update template', 'error')
    } finally {
      setLoadingTemplate(false)
    }
  }, [user, propertyMappings, showNotification])

  const handleLoadTemplate = useCallback((template: PropertyFieldMappingTemplate, propertyId: string) => {
    loadTemplateToProperty(template, propertyId)
  }, [loadTemplateToProperty])

  // Global template handlers
  const handleOpenGlobalTemplateModal = useCallback(() => {
    setShowGlobalTemplateModal(true)
  }, [])

  const handleGlobalTemplateChange = useCallback((template: GlobalFieldMappingTemplate | null) => {
    if (template) {
      loadGlobalTemplate(template, true) // Show confirmation before overwriting
    }
    setShowGlobalTemplateModal(false)
  }, [loadGlobalTemplate])

  const handleSaveAsGlobalTemplate = useCallback(async () => {
    if (!user?.id) {
      showNotification('User profile not found', 'error')
      return
    }

    if (globalMappings.length === 0) {
      showNotification('No field mappings to save', 'error')
      return
    }

    const templateName = prompt('Enter a name for this global template:')
    if (!templateName?.trim()) {
      return
    }

    try {
      setLoadingGlobalTemplate(true)
      const platformMappings = fieldMappingsToPlatformFieldMappings(globalMappings)

      const response = await createGlobalFieldMapping({
        userId: user.id,
        mappingName: templateName.trim(),
        fieldMappings: platformMappings,
        isDefault: availableGlobalTemplates.length === 0 // Set as default if it's the first template
      })

      if (response.status === 'success') {
        showNotification(`Global template "${templateName}" saved successfully`, 'success')
        setAvailableGlobalTemplates(prev => [...prev, response.data])
        setSelectedGlobalTemplate(response.data)
      } else {
        showNotification(response.message || 'Failed to save global template', 'error')
      }
    } catch (error) {
      console.error('Error saving global template:', error)
      showNotification('Failed to save global template', 'error')
    } finally {
      setLoadingGlobalTemplate(false)
    }
  }, [user, globalMappings, availableGlobalTemplates, showNotification])

  const handleUpdateGlobalTemplate = useCallback(async () => {
    if (!user?.id || !selectedGlobalTemplate) {
      showNotification('No template selected to update', 'error')
      return
    }

    if (globalMappings.length === 0) {
      showNotification('No field mappings to save', 'error')
      return
    }

    const confirmMessage = `Update template "${selectedGlobalTemplate.mappingName}" with current field mappings?`
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      setLoadingGlobalTemplate(true)
      const platformMappings = fieldMappingsToPlatformFieldMappings(globalMappings)

      const response = await updateGlobalFieldMapping(selectedGlobalTemplate.id, {
        fieldMappings: platformMappings
      })

      if (response.status === 'success') {
        showNotification(`Global template "${selectedGlobalTemplate.mappingName}" updated successfully`, 'success')
        setAvailableGlobalTemplates(prev => prev.map(t =>
          t.id === selectedGlobalTemplate.id ? response.data : t
        ))
        setSelectedGlobalTemplate(response.data)
      } else {
        showNotification(response.message || 'Failed to update global template', 'error')
      }
    } catch (error) {
      console.error('Error updating global template:', error)
      showNotification('Failed to update global template', 'error')
    } finally {
      setLoadingGlobalTemplate(false)
    }
  }, [user, globalMappings, selectedGlobalTemplate, showNotification])

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
    <>
      <div className="flex flex-col h-full">
        {/* Scrollable Content - with bottom padding for fixed footer */}
        <div className="flex-1 overflow-auto p-8 pb-24">
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

      {/* Global Template Management (Global Mode) */}
      {mappingMode === 'global' && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <GlobeAltIcon className="h-5 w-5 text-blue-600" />
              <h4 className="text-sm font-medium text-gray-900">Global Field Mapping Templates</h4>

              {loadingGlobalTemplate ? (
                <div className="flex items-center text-sm text-gray-600">
                  <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                  Loading templates...
                </div>
              ) : availableGlobalTemplates.length > 0 ? (
                <div className="text-sm text-gray-600">
                  {availableGlobalTemplates.length} template{availableGlobalTemplates.length !== 1 ? 's' : ''} available
                  {selectedGlobalTemplate && (
                    <span className="ml-2 text-blue-600">
                      • Using: {selectedGlobalTemplate.mappingName}
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No global templates yet</div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {availableGlobalTemplates.length > 0 && (
                <select
                  value={selectedGlobalTemplate?.id || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const template = availableGlobalTemplates.find(t => t.id === e.target.value)
                      if (template) {
                        loadGlobalTemplate(template, true)
                      }
                    }
                  }}
                  className="text-black text-sm border border-gray-300 rounded px-3 py-1"
                  disabled={loadingGlobalTemplate}
                >
                  <option value="">Select template...</option>
                  {availableGlobalTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.mappingName} {template.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              )}

              {selectedGlobalTemplate && (
                <button
                  onClick={handleUpdateGlobalTemplate}
                  disabled={loadingGlobalTemplate || globalMappings.length === 0}
                  className="cursor-pointer text-sm text-green-600 hover:text-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <BookmarkIcon className="h-4 w-4 mr-1" />
                  Update Template
                </button>
              )}

              <button
                onClick={handleSaveAsGlobalTemplate}
                disabled={loadingGlobalTemplate || globalMappings.length === 0}
                className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <BookmarkIcon className="h-4 w-4 mr-1" />
                Save as New Template
              </button>

              <button
                onClick={handleOpenGlobalTemplateModal}
                disabled={loadingGlobalTemplate}
                className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Cog6ToothIcon className="h-4 w-4 mr-1" />
                Manage Templates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Property Tabs (Per-Property Mode) */}
      {mappingMode === 'per-property' && (
        <div className="mb-6">
          {/* Property Tabs */}
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

          {/* Template Actions for Active Property */}
          {activePropertyTab && (
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h4 className="text-sm font-medium text-gray-900">Field Mapping Templates</h4>
                  
                  {loadingTemplate ? (
                    <div className="flex items-center text-sm text-gray-600">
                      <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                      Loading templates...
                    </div>
                  ) : availableTemplates.length > 0 ? (
                    <div className="text-sm text-gray-600">
                      {availableTemplates.length} template{availableTemplates.length !== 1 ? 's' : ''} available
                      {selectedTemplate && (
                        <span className="ml-2 text-blue-600">
                          • Using: {selectedTemplate.mappingName}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No templates yet</div>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  {availableTemplates.length > 0 && (
                    <select
                      value={selectedTemplate?.id || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const template = availableTemplates.find(t => t.id === e.target.value)
                          if (template) {
                            handleLoadTemplate(template, activePropertyTab)
                          }
                        }
                      }}
                      className="text-black text-sm border border-gray-300 rounded px-3 py-1"
                      disabled={loadingTemplate}
                    >
                      <option value="">Select template...</option>
                      {availableTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.mappingName} {template.isDefault ? '(Default)' : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  
                  {selectedTemplate ? (
                    <button
                      onClick={() => handleUpdateTemplate(activePropertyTab, selectedTemplate)}
                      disabled={loadingTemplate || (propertyMappings[activePropertyTab]?.length || 0) === 0}
                      className="cursor-pointer text-sm text-green-600 hover:text-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <BookmarkIcon className="h-4 w-4 mr-1" />
                      Update Template
                    </button>
                  ) : null}
                  
                  <button
                    onClick={() => handleSaveAsTemplate(activePropertyTab)}
                    disabled={loadingTemplate || (propertyMappings[activePropertyTab]?.length || 0) === 0}
                    className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <BookmarkIcon className="h-4 w-4 mr-1" />
                    Save as New Template
                  </button>
                  
                  <button
                    onClick={() => handleOpenTemplateModal(activePropertyTab)}
                    disabled={loadingTemplate}
                    className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Cog6ToothIcon className="h-4 w-4 mr-1" />
                    Manage Templates
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Field Mapping Form */}
      <div className="mb-8">
        <FieldMappingForm
          key={mappingMode === 'per-property'
            ? `property-${activePropertyTab}-${selectedTemplate?.id || 'no-template'}`
            : `global-${selectedGlobalTemplate?.id || 'no-template'}`}
          csvData={csvData}
          initialFieldMappings={getCurrentMappings()}
          initialCompleteState={completeFieldMappingState}
          onMappingsChange={handleFieldMappingsUpdate}
          onValidationChange={(valid) => {}} // Handle validation if needed
          onCompleteStateChange={onCompleteStateChange}
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
        </div>

        {/* Fixed Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-8 py-4 z-50">
          <div className="flex justify-between">
            <div className="flex gap-2">
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

              {onSaveDraft && (
                <button
                  onClick={onSaveDraft}
                  className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <BookmarkIcon className="w-4 h-4 mr-1.5" />
                  Save Draft
                </button>
              )}
            </div>

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
      </div>

      {/* Template Management Modal (Per-Property) */}
      <PropertyFieldMappingModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        propertyId={templateModalPropertyId}
        propertyName={templateModalPropertyName}
        onTemplateChange={handleTemplateSelect}
        initialTemplate={selectedTemplate}
      />

      {/* Global Template Management Modal */}
      <GlobalFieldMappingModal
        isOpen={showGlobalTemplateModal}
        onClose={() => setShowGlobalTemplateModal(false)}
        onTemplateChange={handleGlobalTemplateChange}
        initialTemplate={selectedGlobalTemplate}
        availableProperties={properties}
      />
    </>
  )
}

export default FieldMappingStep