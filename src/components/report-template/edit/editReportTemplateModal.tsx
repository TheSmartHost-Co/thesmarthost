'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Modal from '../../shared/modal'
import {
  getReportTemplateById,
  batchSaveTemplate,
} from '@/services/reportTemplateService'
import type {
  FullReportTemplate,
  ReportSection,
  ReportField,
  ReportFieldFormat,
  SectionFieldReference,
  BatchSaveTemplatePayload,
} from '@/services/types/reportTemplate'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import SectionList from '../shared/SectionList'
import FieldList from '../shared/FieldList'
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
  templateId: string
}

const EditReportTemplateModal: React.FC<EditReportTemplateModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
  templateId,
}) => {
  // Original template from API (for comparison)
  const [originalTemplate, setOriginalTemplate] = useState<FullReportTemplate | null>(null)

  // Local state for all edits
  const [localTemplate, setLocalTemplate] = useState<FullReportTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)

  // Property assignments - managed locally
  const [assignedPropertyIds, setAssignedPropertyIds] = useState<string[]>([])
  const [assignedPropertyDetails, setAssignedPropertyDetails] = useState<{ propertyId: string; listingName: string }[]>([])
  const [originalPropertyIds, setOriginalPropertyIds] = useState<string[]>([])

  const { profile } = useUserStore()
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

  // Load template data when modal opens
  useEffect(() => {
    const loadTemplate = async () => {
      if (!isOpen || !templateId) return

      setLoading(true)
      try {
        const res = await getReportTemplateById(templateId)
        if (res.status === 'success') {
          // Ensure all sections and fields have logicalName
          const templateWithLogicalNames: FullReportTemplate = {
            ...res.data,
            sections: res.data.sections.map(section => ({
              ...section,
              logicalName: section.logicalName || toLogicalName(section.name),
              fields: (section.fields || []).map(field => ({
                ...field,
                logicalName: field.logicalName || toLogicalName(field.name),
              }))
            }))
          }

          setOriginalTemplate(JSON.parse(JSON.stringify(templateWithLogicalNames)))
          setLocalTemplate(templateWithLogicalNames)

          // Select first section by default
          if (templateWithLogicalNames.sections && templateWithLogicalNames.sections.length > 0) {
            setSelectedSectionId(templateWithLogicalNames.sections[0].id)
          } else {
            setSelectedSectionId(null)
          }

          // Load property assignments
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
        } else {
          showNotification(res.message || 'Failed to load template', 'error')
          onClose()
        }
      } catch (error) {
        console.error('Error loading template:', error)
        showNotification('Error loading template', 'error')
        onClose()
      } finally {
        setLoading(false)
      }
    }

    loadTemplate()
  }, [isOpen, templateId])

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
    if (!profile?.id || !localTemplate) return

    setSaving(true)
    try {
      const payload: BatchSaveTemplatePayload = {
        userId: profile.id,
        id: localTemplate.id,
        name: localTemplate.name,
        description: localTemplate.description || undefined,
        sections: localTemplate.sections.map((section, sIndex) => ({
          id: section.id.startsWith('temp_') ? undefined : section.id,
          name: section.name,
          logicalName: section.logicalName || toLogicalName(section.name),
          displayOrder: sIndex,
          fields: (section.fields || []).map((field, fIndex) => ({
            id: field.id.startsWith('temp_') ? undefined : field.id,
            name: field.name,
            logicalName: field.logicalName || toLogicalName(field.name),
            formula: field.formula,
            format: field.format,
            displayOrder: fIndex,
          }))
        })),
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
            fields: (section.fields || []).map(field => ({
              ...field,
              logicalName: field.logicalName || toLogicalName(field.name),
            }))
          }))
        }
        setOriginalTemplate(JSON.parse(JSON.stringify(savedTemplate)))
        setLocalTemplate(savedTemplate)

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
  const handleAddField = (data: { name: string; logicalName: string; formula: string; format: ReportFieldFormat }) => {
    if (!selectedSectionId) return

    const newField: ReportField = {
      id: generateTempId(),
      sectionId: selectedSectionId,
      name: data.name,
      logicalName: data.logicalName,
      formula: data.formula,
      format: data.format,
      displayOrder: localTemplate?.sections.find(s => s.id === selectedSectionId)?.fields?.length || 0,
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
    updates: { name?: string; logicalName?: string; formula?: string; format?: ReportFieldFormat }
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
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedSection ? (
              <div className="h-full">
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 break-words">{selectedSection.name}</h3>
                    {selectedSection.logicalName && (
                      <span className="text-sm text-gray-400 font-mono">({selectedSection.logicalName})</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Add fields with formulas to calculate values from booking data
                  </p>
                </div>

                <FieldList
                  fields={selectedSection.fields || []}
                  allSections={sectionReferences}
                  currentSectionId={selectedSectionId!}
                  onReorder={handleReorderFields}
                  onEditField={handleEditField}
                  onDeleteField={handleDeleteField}
                  onAddField={handleAddField}
                  changeStatus={changeSummary?.sections[selectedSectionId!]?.fields}
                />
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
