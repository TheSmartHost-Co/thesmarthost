'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '../../shared/modal'
import {
  batchSaveTemplate,
  getDataSourceColumns,
  getHeaderVariables,
} from '@/services/reportTemplateService'
import type {
  FullReportTemplate,
  ReportSection,
  ReportField,
  ReportFieldFormat,
  SectionFieldReference,
  BatchSaveTemplatePayload,
  BatchUpdateSectionPayload,
  SectionMode,
  DataSource,
  DataSourceColumn,
  HeaderVariableCategory,
} from '@/services/types/reportTemplate'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissions } from '@/hooks/usePermissions'
import { validateTemplateBatch } from '@/utils/formulaValidator'
import type { FieldValidationError } from '@/utils/formulaValidator'
import ValidationSummaryPanel from '../shared/ValidationSummaryPanel'
import SectionList from '../shared/SectionList'
import FieldList from '../shared/FieldList'
import TableColumnList from '../shared/TableColumnList'
import HeaderFieldList from '../shared/HeaderFieldList'
import SectionTypeSelector from '../shared/SectionTypeSelector'
import DataSourceSelector from '../shared/DataSourceSelector'
import PropertyAssignmentSelector from '../shared/PropertyAssignmentSelector'
import {
  XMarkIcon,
  EyeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

// Helper function to convert display name to logical name
const toLogicalName = (displayName: string): string => {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

// Generate temporary ID for new items
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

// Change tracking types
export interface ChangeInfo {
  type: 'added' | 'modified' | 'deleted'
  field?: string  // Which field changed (name, logicalName, formula, format)
  previousValue?: string
  currentValue?: string
}

export interface SectionChangeInfo {
  change: ChangeInfo
  fields: { [fieldId: string]: ChangeInfo }
}

export interface ChangeSummary {
  templateName?: ChangeInfo
  templateDescription?: ChangeInfo
  sections: { [sectionId: string]: SectionChangeInfo }
  properties: {
    added: string[]
    removed: string[]
  }
}

interface EditReportTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
  template: FullReportTemplate
}

const EditReportTemplateModal: React.FC<EditReportTemplateModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
  template,
}) => {
  // Original template from API (for comparison)
  const [originalTemplate, setOriginalTemplate] = useState<FullReportTemplate | null>(null)

  // Local state for all edits
  const [localTemplate, setLocalTemplate] = useState<FullReportTemplate | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)

  // Property assignments - managed locally
  const [assignedPropertyIds, setAssignedPropertyIds] = useState<string[]>([])
  const [assignedPropertyDetails, setAssignedPropertyDetails] = useState<{ propertyId: string; listingName: string }[]>([])
  const [originalPropertyIds, setOriginalPropertyIds] = useState<string[]>([])

  // Cached columns from API for validation
  const [availableColumnsCache, setAvailableColumnsCache] = useState<{
    booking: DataSourceColumn[]
    expense: DataSourceColumn[]
  }>({ booking: [], expense: [] })

  // Header variables from API
  const [headerVariables, setHeaderVariables] = useState<HeaderVariableCategory[]>([])
  const [headerVariablesLoading, setHeaderVariablesLoading] = useState(false)
  const [headerVariablesError, setHeaderVariablesError] = useState<string | null>(null)

  // Batch validation state
  const [batchErrors, setBatchErrors] = useState<FieldValidationError[]>([])
  const [batchWarnings, setBatchWarnings] = useState<FieldValidationError[]>([])
  const [showValidationSummary, setShowValidationSummary] = useState(false)
  const [legacyWarnings, setLegacyWarnings] = useState<FieldValidationError[]>([])
  const [showLegacyWarnings, setShowLegacyWarnings] = useState(true)

  const { effectiveUserId } = usePermissions()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!localTemplate || !originalTemplate) return false

    // Check template name/description
    if (localTemplate.name !== originalTemplate.name) return true
    if ((localTemplate.description || '') !== (originalTemplate.description || '')) return true

    // Check property assignments
    const sortedLocal = [...assignedPropertyIds].sort()
    const sortedOriginal = [...originalPropertyIds].sort()
    if (JSON.stringify(sortedLocal) !== JSON.stringify(sortedOriginal)) return true

    // Check sections
    if (JSON.stringify(localTemplate.sections) !== JSON.stringify(originalTemplate.sections)) return true

    return false
  }, [localTemplate, originalTemplate, assignedPropertyIds, originalPropertyIds])

  // Build fieldErrorsMap from batch validation errors
  const fieldErrorsMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const e of batchErrors) {
      if (e.fieldId) {
        map[e.fieldId] = e.errors.join('; ')
      }
    }
    return map
  }, [batchErrors])

  // Extract all valid header variable keys
  const allHeaderVariableKeys = useMemo(() => {
    const keys: string[] = ['logo'] // logo is frontend-injected
    for (const category of headerVariables) {
      for (const v of category.variables) {
        keys.push(v.key)
      }
    }
    return keys
  }, [headerVariables])

  // Compute detailed change summary
  const changeSummary = useMemo<ChangeSummary | null>(() => {
    if (!localTemplate || !originalTemplate) return null

    const summary: ChangeSummary = {
      sections: {},
      properties: { added: [], removed: [] }
    }

    // Check template name
    if (localTemplate.name !== originalTemplate.name) {
      summary.templateName = {
        type: 'modified',
        field: 'name',
        previousValue: originalTemplate.name,
        currentValue: localTemplate.name
      }
    }

    // Check template description
    if ((localTemplate.description || '') !== (originalTemplate.description || '')) {
      summary.templateDescription = {
        type: 'modified',
        field: 'description',
        previousValue: originalTemplate.description || '',
        currentValue: localTemplate.description || ''
      }
    }

    // Build maps for section comparison
    const originalSections = new Map(originalTemplate.sections.map(s => [s.id, s]))
    const localSections = new Map(localTemplate.sections.map(s => [s.id, s]))

    // Find added/modified sections
    for (const [id, section] of localSections) {
      const original = originalSections.get(id)

      if (!original) {
        // New section (temp ID)
        summary.sections[id] = {
          change: { type: 'added' },
          fields: {}
        }
        // All fields in a new section are also new
        for (const field of section.fields || []) {
          summary.sections[id].fields[field.id] = { type: 'added' }
        }
      } else {
        // Check for modifications to the section itself
        const sectionChanges: string[] = []
        if (section.name !== original.name) sectionChanges.push('name')
        if ((section.logicalName || '') !== (original.logicalName || '')) sectionChanges.push('logicalName')
        if ((section.sectionMode || 'field') !== (original.sectionMode || 'field')) sectionChanges.push('mode')

        // Build field maps for comparison
        const originalFields = new Map((original.fields || []).map(f => [f.id, f]))
        const localFields = new Map((section.fields || []).map(f => [f.id, f]))

        const fieldChanges: { [fieldId: string]: ChangeInfo } = {}

        // Find added/modified fields
        for (const [fieldId, field] of localFields) {
          const origField = originalFields.get(fieldId)

          if (!origField) {
            // New field
            fieldChanges[fieldId] = { type: 'added' }
          } else {
            // Check for modifications
            const changedFields: string[] = []
            if (field.name !== origField.name) changedFields.push('name')
            if ((field.logicalName || '') !== (origField.logicalName || '')) changedFields.push('logicalName')
            if (field.formula !== origField.formula) changedFields.push('formula')
            if (field.format !== origField.format) changedFields.push('format')
            // Table mode properties
            if ((field.fieldMode || 'field') !== (origField.fieldMode || 'field')) changedFields.push('fieldMode')
            if (field.columnType !== origField.columnType) changedFields.push('columnType')
            if (field.totalsFunction !== origField.totalsFunction) changedFields.push('totalsFunction')

            if (changedFields.length > 0) {
              fieldChanges[fieldId] = {
                type: 'modified',
                field: changedFields.join(', '),
                previousValue: changedFields.includes('name') ? origField.name :
                              changedFields.includes('formula') ? origField.formula :
                              changedFields.includes('format') ? origField.format :
                              origField.logicalName || ''
              }
            }
          }
        }

        // Find deleted fields
        for (const [fieldId, origField] of originalFields) {
          if (!localFields.has(fieldId)) {
            fieldChanges[fieldId] = {
              type: 'deleted',
              previousValue: origField.name
            }
          }
        }

        // Only record section if it or its fields changed
        if (sectionChanges.length > 0 || Object.keys(fieldChanges).length > 0) {
          summary.sections[id] = {
            change: sectionChanges.length > 0
              ? {
                  type: 'modified',
                  field: sectionChanges.join(', '),
                  previousValue: sectionChanges.includes('name') ? original.name : original.logicalName || ''
                }
              : { type: 'modified', field: 'fields' }, // Section modified via fields
            fields: fieldChanges
          }
        }
      }
    }

    // Find deleted sections
    for (const [id, section] of originalSections) {
      if (!localSections.has(id)) {
        summary.sections[id] = {
          change: { type: 'deleted', previousValue: section.name },
          fields: {}
        }
      }
    }

    // Check property assignments
    summary.properties.added = assignedPropertyIds.filter(id => !originalPropertyIds.includes(id))
    summary.properties.removed = originalPropertyIds.filter(id => !assignedPropertyIds.includes(id))

    return summary
  }, [localTemplate, originalTemplate, assignedPropertyIds, originalPropertyIds])

  // Count changes for footer summary
  const changeCount = useMemo(() => {
    if (!changeSummary) return { sections: 0, fields: 0, properties: 0, total: 0 }

    let sections = 0
    let fields = 0

    for (const sectionChange of Object.values(changeSummary.sections)) {
      // Count the section if it's added, deleted, or has its own changes (not just field changes)
      if (sectionChange.change.type === 'added' ||
          sectionChange.change.type === 'deleted' ||
          (sectionChange.change.field && sectionChange.change.field !== 'fields')) {
        sections++
      }
      fields += Object.keys(sectionChange.fields).length
    }

    const properties = changeSummary.properties.added.length + changeSummary.properties.removed.length

    return {
      sections,
      fields,
      properties,
      total: sections + fields + properties +
             (changeSummary.templateName ? 1 : 0) +
             (changeSummary.templateDescription ? 1 : 0)
    }
  }, [changeSummary])

  // Build section references for formula builder
  const sectionReferences: SectionFieldReference[] = useMemo(() => {
    if (!localTemplate?.sections) return []
    return localTemplate.sections.map(section => ({
      sectionId: section.id,
      sectionName: section.name,
      sectionLogicalName: section.logicalName || toLogicalName(section.name),
      fields: (section.fields || []).map(f => ({
        id: f.id,
        name: f.name,
        logicalName: f.logicalName || toLogicalName(f.name),
      }))
    }))
  }, [localTemplate?.sections])

  // Build sections for aggregate field validation (table + field-mode sections)
  // Used by FieldList to validate {sectionName.fieldName} references
  const tableSectionsForValidation = useMemo(() => {
    if (!localTemplate?.sections) return []
    return localTemplate.sections
      .filter(section => section.sectionMode === 'table' || section.sectionMode === 'field')
      .map(section => ({
        name: section.name,
        logicalName: section.logicalName || toLogicalName(section.name),
        columns: (section.fields || []).map(f => f.logicalName || toLogicalName(f.name)),
      }))
  }, [localTemplate?.sections])

  // Fetch columns and header variables from API when modal opens
  useEffect(() => {
    if (!isOpen) return
    const loadColumns = async () => {
      setHeaderVariablesLoading(true)
      setHeaderVariablesError(null)
      const [bookingRes, expenseRes, headerVarsRes] = await Promise.all([
        getDataSourceColumns('booking'),
        getDataSourceColumns('expense'),
        getHeaderVariables(),
      ])
      setAvailableColumnsCache({
        booking: bookingRes.status === 'success' ? bookingRes.data.columns : [],
        expense: expenseRes.status === 'success' ? expenseRes.data.columns : [],
      })
      if (headerVarsRes.status === 'success') {
        setHeaderVariables(headerVarsRes.data)
      } else {
        setHeaderVariablesError(headerVarsRes.message || 'Failed to load header variables')
      }
      setHeaderVariablesLoading(false)

      // Check for legacy warnings on the original template
      if (template) {
        const columnsCache = {
          booking: bookingRes.status === 'success' ? bookingRes.data.columns : [],
          expense: expenseRes.status === 'success' ? expenseRes.data.columns : [],
        }
        const headerKeys = ['logo']
        if (headerVarsRes.status === 'success') {
          for (const cat of headerVarsRes.data) {
            for (const v of cat.variables) headerKeys.push(v.key)
          }
        }
        const legacyResult = validateTemplateBatch(template, columnsCache, headerKeys)
        if (legacyResult.warnings.length > 0) {
          setLegacyWarnings(legacyResult.warnings)
          setShowLegacyWarnings(true)
        }
      }
    }
    loadColumns()
  }, [isOpen, template])

  // Initialize local state when modal opens or template changes
  useEffect(() => {
    if (!isOpen || !template) return

    // Ensure all sections and fields have required properties
    const templateWithLogicalNames: FullReportTemplate = {
      ...template,
      sections: template.sections.map(section => ({
        ...section,
        logicalName: section.logicalName || toLogicalName(section.name),
        sectionMode: section.sectionMode || 'field',
        fields: (section.fields || []).map(field => ({
          ...field,
          logicalName: field.logicalName || toLogicalName(field.name),
          fieldMode: field.fieldMode || 'field',
        }))
      }))
    }

    setOriginalTemplate(JSON.parse(JSON.stringify(templateWithLogicalNames)))
    setLocalTemplate(templateWithLogicalNames)

    // Select first section by default
    if (templateWithLogicalNames.sections?.length > 0) {
      setSelectedSectionId(templateWithLogicalNames.sections[0].id)
    } else {
      setSelectedSectionId(null)
    }

    // Load property assignments from template
    const assignments = template.assignedProperties
    if (assignments && assignments.length > 0) {
      const propertyIds = assignments.map(ap => ap.propertyId)
      const details = assignments.map(ap => ({
        propertyId: ap.propertyId,
        listingName: ap.listingName
      }))
      setAssignedPropertyIds(propertyIds)
      setAssignedPropertyDetails(details)
      setOriginalPropertyIds([...propertyIds])
    } else {
      setAssignedPropertyIds([])
      setAssignedPropertyDetails([])
      setOriginalPropertyIds([])
    }
  }, [isOpen, template])

  // Handle close with unsaved changes check
  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Discard them?')) {
        return
      }
    }
    onClose()
  }

  // Save all changes via batch API
  const handleSave = async () => {
    if (!effectiveUserId || !localTemplate) return

    // Pre-save validation gate
    const validationResult = validateTemplateBatch(
      localTemplate,
      availableColumnsCache,
      allHeaderVariableKeys
    )
    if (!validationResult.valid) {
      setBatchErrors(validationResult.errors)
      setBatchWarnings(validationResult.warnings)
      setShowValidationSummary(true)
      showNotification('Please fix validation errors before saving', 'error')
      return
    }
    // Clear any previous errors on successful validation
    setBatchErrors([])
    setBatchWarnings([])
    setShowValidationSummary(false)

    setSaving(true)
    try {
      const payload: BatchSaveTemplatePayload = {
        userId: effectiveUserId!,
        id: localTemplate.id,
        name: localTemplate.name,
        description: localTemplate.description || undefined,
        sections: localTemplate.sections.map((section, sIndex) => {
          const sectionPayload: BatchUpdateSectionPayload = {
            name: section.name,
            logicalName: section.logicalName || toLogicalName(section.name),
            displayOrder: sIndex,
            sectionMode: section.sectionMode || 'field',
            // Only include id if it's a real UUID (not temp_)
            id: section.id && !section.id.startsWith('temp_') ? section.id : undefined,
            // Include dataSource for table sections
            dataSource: section.sectionMode === 'table' ? section.dataSource : undefined,
            fields: (section.fields || []).map((field, fIndex) => ({
              name: field.name,
              logicalName: field.logicalName || toLogicalName(field.name),
              formula: field.formula,
              format: field.format,
              displayOrder: fIndex,
              fieldMode: field.fieldMode,
              columnType: field.columnType,
              totalsFunction: field.totalsFunction,
              // Only include id if it's a real UUID (not temp_)
              id: field.id && !field.id.startsWith('temp_') ? field.id : undefined,
            })),
          }

          return sectionPayload
        }),
        propertyIds: assignedPropertyIds,
      }

      const res = await batchSaveTemplate(payload)
      if (res.status === 'success') {
        // Update original state to match saved state
        const savedTemplate: FullReportTemplate = {
          ...res.data,
          sections: res.data.sections.map(section => ({
            ...section,
            logicalName: section.logicalName || toLogicalName(section.name),
            sectionMode: section.sectionMode || 'field',
            fields: (section.fields || []).map(field => ({
              ...field,
              logicalName: field.logicalName || toLogicalName(field.name),
              fieldMode: field.fieldMode || 'field',
            }))
          }))
        }
        setOriginalTemplate(JSON.parse(JSON.stringify(savedTemplate)))
        setLocalTemplate(savedTemplate)

        // Map selectedSectionId from old (possibly temp) ID to new real ID
        if (selectedSectionId && localTemplate) {
          const oldIndex = localTemplate.sections.findIndex(s => s.id === selectedSectionId)
          if (oldIndex >= 0 && oldIndex < savedTemplate.sections.length) {
            setSelectedSectionId(savedTemplate.sections[oldIndex].id)
          } else if (savedTemplate.sections.length > 0) {
            setSelectedSectionId(savedTemplate.sections[0].id)
          } else {
            setSelectedSectionId(null)
          }
        }

        // Update property assignments from response
        if (res.data.assignedProperties && res.data.assignedProperties.length > 0) {
          const propertyIds = res.data.assignedProperties.map(ap => ap.propertyId)
          const details = res.data.assignedProperties.map(ap => ({
            propertyId: ap.propertyId,
            listingName: ap.listingName
          }))
          setAssignedPropertyIds(propertyIds)
          setAssignedPropertyDetails(details)
          setOriginalPropertyIds([...propertyIds])
        } else {
          setAssignedPropertyIds([])
          setAssignedPropertyDetails([])
          setOriginalPropertyIds([])
        }

        showNotification('Template saved', 'success')
        onUpdated()
      } else {
        showNotification(res.message || 'Failed to save template', 'error')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      showNotification('Error saving template', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Template name change (local)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalTemplate(prev => prev ? { ...prev, name: e.target.value } : prev)
  }

  // Section operations (all local)
  const handleAddSection = () => {
    if (!localTemplate) return

    const newSection: ReportSection & { fields: ReportField[] } = {
      id: generateTempId(),
      templateId: localTemplate.id,
      name: `Section ${(localTemplate.sections?.length || 0) + 1}`,
      logicalName: toLogicalName(`Section ${(localTemplate.sections?.length || 0) + 1}`),
      displayOrder: (localTemplate.sections?.length || 0),
      sectionMode: 'field',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      fields: [],
    }

    setLocalTemplate(prev => {
      if (!prev) return prev
      return {
        ...prev,
        sections: [...prev.sections, newSection]
      }
    })
    setSelectedSectionId(newSection.id)
  }

  const handleEditSection = (sectionId: string, name: string, logicalName: string) => {
    setLocalTemplate(prev => {
      if (!prev) return prev
      return {
        ...prev,
        sections: prev.sections.map(s =>
          s.id === sectionId ? { ...s, name, logicalName } : s
        )
      }
    })
  }

  const handleSectionModeChange = (sectionId: string, mode: SectionMode) => {
    const section = localTemplate?.sections.find(s => s.id === sectionId)
    if (!section) return

    // Warn user if there are fields that will be cleared
    const hasFields = section.fields && section.fields.length > 0
    if (hasFields) {
      const confirmMessage = mode === 'header'
        ? 'Switching to Header mode will clear all existing fields. Continue?'
        : mode === 'table'
        ? 'Switching to Table mode will convert fields to table columns. Continue?'
        : 'Switching to Field mode will clear table-specific properties. Continue?'

      if (!window.confirm(confirmMessage)) {
        return
      }
    }

    setLocalTemplate(prev => {
      if (!prev) return prev
      return {
        ...prev,
        sections: prev.sections.map(s => {
          if (s.id !== sectionId) return s

          // Handle mode-specific field conversions
          let convertedFields = s.fields || []

          if (mode === 'header') {
            // For header mode, clear all fields (header fields are simpler)
            convertedFields = []
          } else if (mode === 'table') {
            // Convert to table columns
            convertedFields = convertedFields.map(field => ({
              ...field,
              fieldMode: 'table_column' as const,
              columnType: field.columnType || 'text',
              totalsFunction: field.totalsFunction || 'NONE',
            }))
          } else {
            // Convert to regular fields
            convertedFields = convertedFields.map(field => ({
              ...field,
              fieldMode: 'field' as const,
              columnType: undefined,
              totalsFunction: undefined,
            }))
          }

          return {
            ...s,
            sectionMode: mode,
            // Set default dataSource for table sections
            dataSource: mode === 'table' ? (s.dataSource || 'booking') : undefined,
            fields: convertedFields,
          }
        })
      }
    })
  }

  const handleDataSourceChange = (sectionId: string, dataSource: DataSource) => {
    setLocalTemplate(prev => {
      if (!prev) return prev
      return {
        ...prev,
        sections: prev.sections.map(s =>
          s.id === sectionId ? { ...s, dataSource } : s
        )
      }
    })
  }

  const handleDeleteSection = (sectionId: string) => {
    if (!window.confirm('Delete this section and all its fields?')) return

    setLocalTemplate(prev => {
      if (!prev) return prev
      const newSections = prev.sections.filter(s => s.id !== sectionId)
      return { ...prev, sections: newSections }
    })

    if (selectedSectionId === sectionId) {
      setSelectedSectionId(
        localTemplate?.sections?.filter(s => s.id !== sectionId)[0]?.id || null
      )
    }
  }

  const handleReorderSections = (newSections: (ReportSection & { fields: ReportField[] })[]) => {
    setLocalTemplate(prev => {
      if (!prev) return prev
      return { ...prev, sections: newSections }
    })
  }

  // Field operations (all local)
  const handleAddField = (data: Partial<ReportField>) => {
    if (!selectedSectionId) return
    if (!data.name || !data.logicalName) return

    const section = localTemplate?.sections.find(s => s.id === selectedSectionId)
    const isTableMode = section?.sectionMode === 'table'

    const newField: ReportField = {
      id: generateTempId(),
      sectionId: selectedSectionId,
      name: data.name,
      logicalName: data.logicalName,
      formula: data.sourceColumn || data.formula || '',
      format: data.format || 'text',
      displayOrder: section?.fields?.length || 0,
      // Table mode properties
      fieldMode: isTableMode ? 'table_column' : 'field',
      columnType: data.columnType,
      totalsFunction: data.totalsFunction,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setLocalTemplate(prev => {
      if (!prev) return prev
      return {
        ...prev,
        sections: prev.sections.map(s =>
          s.id === selectedSectionId
            ? { ...s, fields: [...(s.fields || []), newField] }
            : s
        )
      }
    })
  }

  const handleEditField = (
    fieldId: string,
    updates: Partial<ReportField>
  ) => {
    setLocalTemplate(prev => {
      if (!prev) return prev
      return {
        ...prev,
        sections: prev.sections.map(s => ({
          ...s,
          fields: s.fields.map(f =>
            f.id === fieldId ? { ...f, ...updates } : f
          )
        }))
      }
    })
  }

  const handleDeleteField = (fieldId: string) => {
    if (!window.confirm('Delete this field?')) return

    setLocalTemplate(prev => {
      if (!prev) return prev
      return {
        ...prev,
        sections: prev.sections.map(s => ({
          ...s,
          fields: s.fields.filter(f => f.id !== fieldId)
        }))
      }
    })
  }

  const handleReorderFields = (newFields: ReportField[]) => {
    if (!selectedSectionId) return

    setLocalTemplate(prev => {
      if (!prev) return prev
      return {
        ...prev,
        sections: prev.sections.map(s =>
          s.id === selectedSectionId ? { ...s, fields: newFields } : s
        )
      }
    })
  }

  // Property assignment operations (local state only)
  const handleAssignProperty = (propertyId: string) => {
    setAssignedPropertyIds(prev => [...prev, propertyId])
  }

  const handleUnassignProperty = (propertyId: string) => {
    setAssignedPropertyIds(prev => prev.filter(id => id !== propertyId))
  }

  const selectedSection = localTemplate?.sections.find(s => s.id === selectedSectionId)

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} style="p-0 max-w-5xl w-[95vw] h-[85vh]">
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading template...</p>
          </div>
        </div>
      </Modal>
    )
  }

  if (!localTemplate) {
    return null
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} style="p-0 max-w-5xl w-[95vw] h-[85vh] !max-h-[85vh]" closable={false}>
      <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-gray-200/80 shadow-sm">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={localTemplate.name}
                onChange={handleNameChange}
                className="w-full max-w-md text-xl font-semibold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none py-1 transition-colors"
                placeholder="Template name"
              />
              {hasUnsavedChanges && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                  Unsaved
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">Edit sections, fields, and property assignments</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all flex-shrink-0"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel - Sections and Property Assignments */}
          <div className="w-80 border-r border-gray-200/80 flex flex-col bg-white/60 backdrop-blur-sm">
            <div className="flex-1 p-5 overflow-y-auto">
              <div className="space-y-6">
                {/* Sections */}
                <SectionList
                  sections={localTemplate.sections || []}
                  selectedSectionId={selectedSectionId}
                  onSelectSection={setSelectedSectionId}
                  onReorder={handleReorderSections}
                  onEditSection={handleEditSection}
                  onDeleteSection={handleDeleteSection}
                  onAddSection={handleAddSection}
                  changeStatus={changeSummary?.sections}
                />

                {/* Property Assignments */}
                <div className="pt-5 border-t border-gray-200/80">
                  <PropertyAssignmentSelector
                    assignedPropertyIds={assignedPropertyIds}
                    assignedPropertyDetails={assignedPropertyDetails}
                    onAssign={handleAssignProperty}
                    onUnassign={handleUnassignProperty}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right panel - Fields */}
          <div className="flex-1 p-6 overflow-y-auto relative">
            {/* Legacy warnings banner */}
            {legacyWarnings.length > 0 && showLegacyWarnings && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      This template contains {legacyWarnings.length} formula{legacyWarnings.length !== 1 ? 's' : ''} that may need updating
                    </p>
                    <ul className="mt-1 text-xs text-amber-700 space-y-0.5">
                      {legacyWarnings.slice(0, 3).map((w, i) => (
                        <li key={i}>{w.fieldName}: {w.warnings.join('; ')}</li>
                      ))}
                      {legacyWarnings.length > 3 && (
                        <li>...and {legacyWarnings.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLegacyWarnings(false)}
                  className="text-amber-600 hover:text-amber-800 shrink-0"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}

            {selectedSection ? (
              <div className="h-full">
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 break-words">{selectedSection.name}</h3>
                    {selectedSection.logicalName && (
                      <span className="text-sm text-gray-400 font-mono">({selectedSection.logicalName})</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedSection.sectionMode === 'header'
                      ? 'Display metadata like property name, report period, and logo'
                      : selectedSection.sectionMode === 'table'
                        ? 'Configure table columns to display booking or expense data in rows'
                        : 'Add fields with formulas to calculate aggregate values from table sections'}
                  </p>
                </div>

                <SectionTypeSelector
                  mode={selectedSection.sectionMode || 'field'}
                  onChange={(mode) => handleSectionModeChange(selectedSection.id, mode)}
                />

                {selectedSection.sectionMode === 'table' && (
                  <DataSourceSelector
                    dataSource={selectedSection.dataSource || 'booking'}
                    onChange={(ds) => handleDataSourceChange(selectedSection.id, ds)}
                  />
                )}

                {selectedSection.sectionMode === 'header' ? (
                  <HeaderFieldList
                    fields={selectedSection.fields || []}
                    onReorder={handleReorderFields}
                    onEditField={handleEditField}
                    onDeleteField={handleDeleteField}
                    onAddField={handleAddField}
                    changeStatus={changeSummary?.sections[selectedSectionId!]?.fields}
                    headerVariables={headerVariables}
                    headerVariablesLoading={headerVariablesLoading}
                    headerVariablesError={headerVariablesError}
                    fieldErrors={fieldErrorsMap}
                  />
                ) : selectedSection.sectionMode === 'table' ? (
                  <TableColumnList
                    fields={selectedSection.fields || []}
                    allSections={sectionReferences}
                    currentSectionId={selectedSectionId!}
                    onReorder={handleReorderFields}
                    onEditField={handleEditField}
                    onDeleteField={handleDeleteField}
                    onAddField={handleAddField}
                    changeStatus={changeSummary?.sections[selectedSectionId!]?.fields}
                    dataSource={selectedSection.dataSource || 'booking'}
                    dataSourceColumns={availableColumnsCache[selectedSection.dataSource || 'booking']}
                    fieldErrors={fieldErrorsMap}
                  />
                ) : (
                  <FieldList
                    fields={selectedSection.fields || []}
                    allSections={sectionReferences}
                    currentSectionId={selectedSectionId!}
                    onReorder={handleReorderFields}
                    onEditField={handleEditField}
                    onDeleteField={handleDeleteField}
                    onAddField={handleAddField}
                    changeStatus={changeSummary?.sections[selectedSectionId!]?.fields}
                    tableSections={tableSectionsForValidation}
                    availableColumnsCache={availableColumnsCache}
                    fieldErrors={fieldErrorsMap}
                  />
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-5 shadow-inner">
                  <EyeIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {localTemplate.sections?.length === 0
                    ? 'No sections yet'
                    : 'Select a section'}
                </h3>
                <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                  {localTemplate.sections?.length === 0
                    ? 'Add a section to start building your report template.'
                    : 'Click on a section in the left panel to view and edit its fields.'}
                </p>
              </div>
            )}

            {/* Validation Summary Panel */}
            {showValidationSummary && batchErrors.length > 0 && (
              <ValidationSummaryPanel
                errors={batchErrors}
                warnings={batchWarnings}
                onDismiss={() => setShowValidationSummary(false)}
                onNavigateToSection={(sectionId) => setSelectedSectionId(sectionId)}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200/80 bg-white">
          <div className="text-sm text-gray-500 flex flex-col gap-1">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                {localTemplate.sections?.length || 0} sections
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                {localTemplate.sections?.reduce((acc, s) => acc + (s.fields?.length || 0), 0) || 0} fields
              </span>
              {hasUnsavedChanges && (
                <span className="inline-flex items-center gap-1.5 text-amber-600 font-medium">
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  {changeCount.total} unsaved change{changeCount.total !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {hasUnsavedChanges && changeCount.total > 0 && (
              <div className="text-xs text-amber-600/80 ml-0.5">
                {[
                  changeSummary?.templateName && 'name',
                  changeCount.sections > 0 && `${changeCount.sections} section${changeCount.sections !== 1 ? 's' : ''}`,
                  changeCount.fields > 0 && `${changeCount.fields} field${changeCount.fields !== 1 ? 's' : ''}`,
                  changeSummary?.properties.added.length ? `+${changeSummary.properties.added.length} properties` : null,
                  changeSummary?.properties.removed.length ? `-${changeSummary.properties.removed.length} properties` : null,
                ].filter(Boolean).join(' • ')}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {hasUnsavedChanges ? 'Discard' : 'Close'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default EditReportTemplateModal
