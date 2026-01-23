'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../../shared/modal'
import {
  getReportTemplateById,
  updateReportTemplate,
  createReportSection,
  updateReportSection,
  deleteReportSection,
  reorderSections,
  createReportField,
  updateReportField,
  deleteReportField,
  reorderFields,
  assignTemplateToProperty,
  unassignTemplateFromProperty,
} from '@/services/reportTemplateService'
import type {
  FullReportTemplate,
  ReportSection,
  ReportField,
  ReportFieldFormat,
} from '@/services/types/reportTemplate'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import SectionList from '../shared/SectionList'
import FieldList from '../shared/FieldList'
import PropertyAssignmentSelector from '../shared/PropertyAssignmentSelector'
import {
  XMarkIcon,
  EyeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

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
  const [template, setTemplate] = useState<FullReportTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [assignedPropertyIds, setAssignedPropertyIds] = useState<string[]>([])
  const [assignedPropertyDetails, setAssignedPropertyDetails] = useState<{ propertyId: string; listingName: string }[]>([])
  const [propertyAssignments, setPropertyAssignments] = useState<{ id: string; propertyId: string }[]>([])

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Load template data when modal opens
  useEffect(() => {
    const loadTemplate = async () => {
      if (!isOpen || !templateId) return

      setLoading(true)
      try {
        const res = await getReportTemplateById(templateId)
        if (res.status === 'success') {
          setTemplate(res.data)
          setName(res.data.name)
          setDescription(res.data.description || '')

          // Select first section by default
          if (res.data.sections && res.data.sections.length > 0) {
            setSelectedSectionId(res.data.sections[0].id)
          } else {
            setSelectedSectionId(null)
          }

          // Load property assignments from the response
          if (res.data.assignedProperties && res.data.assignedProperties.length > 0) {
            const propertyIds = res.data.assignedProperties.map(ap => ap.propertyId)
            const details = res.data.assignedProperties.map(ap => ({
              propertyId: ap.propertyId,
              listingName: ap.listingName
            }))
            const assignments = res.data.assignedProperties.map(ap => ({
              id: ap.assignmentId,
              propertyId: ap.propertyId
            }))
            setAssignedPropertyIds(propertyIds)
            setAssignedPropertyDetails(details)
            setPropertyAssignments(assignments)
          } else {
            setAssignedPropertyIds([])
            setAssignedPropertyDetails([])
            setPropertyAssignments([])
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


  const handleSaveBasicInfo = async () => {
    if (!profile?.id || !template) return

    setSaving(true)
    try {
      const res = await updateReportTemplate(template.id, {
        userId: profile.id,
        name: name.trim(),
        description: description.trim() || undefined,
      })

      if (res.status === 'success') {
        setTemplate(res.data)
        showNotification('Template updated', 'success')
        onUpdated()
      } else {
        showNotification(res.message || 'Failed to update template', 'error')
      }
    } catch (error) {
      console.error('Error updating template:', error)
      showNotification('Error updating template', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Section operations
  const handleAddSection = async () => {
    if (!profile?.id || !template) return

    try {
      const res = await createReportSection({
        templateId: template.id,
        name: `Section ${(template.sections?.length || 0) + 1}`,
        userId: profile.id,
      })

      if (res.status === 'success') {
        // Reload template to get updated sections
        const templateRes = await getReportTemplateById(template.id)
        if (templateRes.status === 'success') {
          setTemplate(templateRes.data)
          setSelectedSectionId(res.data.id)
        }
        showNotification('Section added', 'success')
      } else {
        showNotification(res.message || 'Failed to add section', 'error')
      }
    } catch (error) {
      console.error('Error adding section:', error)
      showNotification('Error adding section', 'error')
    }
  }

  const handleEditSection = async (sectionId: string, newName: string) => {
    if (!profile?.id) return

    try {
      const res = await updateReportSection(sectionId, {
        name: newName,
        userId: profile.id,
      })

      if (res.status === 'success') {
        // Update local state
        setTemplate((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            sections: prev.sections.map((s) =>
              s.id === sectionId ? { ...s, name: newName } : s
            ),
          }
        })
      } else {
        showNotification(res.message || 'Failed to update section', 'error')
      }
    } catch (error) {
      console.error('Error updating section:', error)
      showNotification('Error updating section', 'error')
    }
  }

  const handleDeleteSection = async (sectionId: string) => {
    if (!profile?.id || !window.confirm('Delete this section and all its fields?')) return

    try {
      const res = await deleteReportSection(sectionId, profile.id)

      if (res.status === 'success') {
        // Reload template
        const templateRes = await getReportTemplateById(templateId)
        if (templateRes.status === 'success') {
          setTemplate(templateRes.data)
          if (selectedSectionId === sectionId) {
            setSelectedSectionId(
              templateRes.data.sections?.length > 0 ? templateRes.data.sections[0].id : null
            )
          }
        }
        showNotification('Section deleted', 'success')
      } else {
        showNotification(res.message || 'Failed to delete section', 'error')
      }
    } catch (error) {
      console.error('Error deleting section:', error)
      showNotification('Error deleting section', 'error')
    }
  }

  const handleReorderSections = async (newSections: (ReportSection & { fields: ReportField[] })[]) => {
    if (!profile?.id || !template) return

    // Optimistically update local state
    setTemplate((prev) => {
      if (!prev) return prev
      return { ...prev, sections: newSections }
    })

    try {
      const res = await reorderSections(template.id, {
        userId: profile.id,
        sectionIds: newSections.map((s) => s.id),
      })

      if (res.status !== 'success') {
        // Revert on error
        const templateRes = await getReportTemplateById(template.id)
        if (templateRes.status === 'success') {
          setTemplate(templateRes.data)
        }
        showNotification(res.message || 'Failed to reorder sections', 'error')
      }
    } catch (error) {
      console.error('Error reordering sections:', error)
      showNotification('Error reordering sections', 'error')
    }
  }

  // Field operations
  const handleAddField = async () => {
    if (!profile?.id || !selectedSectionId) return

    try {
      const currentSection = template?.sections.find((s) => s.id === selectedSectionId)
      const res = await createReportField({
        sectionId: selectedSectionId,
        name: `Field ${(currentSection?.fields?.length || 0) + 1}`,
        formula: '',
        format: 'currency',
        userId: profile.id,
      })

      if (res.status === 'success') {
        // Reload template to get updated fields
        const templateRes = await getReportTemplateById(templateId)
        if (templateRes.status === 'success') {
          setTemplate(templateRes.data)
        }
        showNotification('Field added', 'success')
      } else {
        showNotification(res.message || 'Failed to add field', 'error')
      }
    } catch (error) {
      console.error('Error adding field:', error)
      showNotification('Error adding field', 'error')
    }
  }

  const handleEditField = async (
    fieldId: string,
    updates: { name?: string; formula?: string; format?: ReportFieldFormat }
  ) => {
    if (!profile?.id) return

    try {
      const currentField = template?.sections
        .flatMap((s) => s.fields)
        .find((f) => f.id === fieldId)

      const res = await updateReportField(fieldId, {
        name: updates.name || currentField?.name || '',
        formula: updates.formula || currentField?.formula || '',
        format: updates.format || currentField?.format,
        userId: profile.id,
      })

      if (res.status === 'success') {
        // Update local state
        setTemplate((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            sections: prev.sections.map((s) => ({
              ...s,
              fields: s.fields.map((f) =>
                f.id === fieldId ? { ...f, ...updates } : f
              ),
            })),
          }
        })
      } else {
        showNotification(res.message || 'Failed to update field', 'error')
      }
    } catch (error) {
      console.error('Error updating field:', error)
      showNotification('Error updating field', 'error')
    }
  }

  const handleDeleteField = async (fieldId: string) => {
    if (!profile?.id || !window.confirm('Delete this field?')) return

    try {
      const res = await deleteReportField(fieldId, profile.id)

      if (res.status === 'success') {
        // Reload template
        const templateRes = await getReportTemplateById(templateId)
        if (templateRes.status === 'success') {
          setTemplate(templateRes.data)
        }
        showNotification('Field deleted', 'success')
      } else {
        showNotification(res.message || 'Failed to delete field', 'error')
      }
    } catch (error) {
      console.error('Error deleting field:', error)
      showNotification('Error deleting field', 'error')
    }
  }

  const handleReorderFields = async (newFields: ReportField[]) => {
    if (!profile?.id || !selectedSectionId) return

    // Optimistically update local state
    setTemplate((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === selectedSectionId ? { ...s, fields: newFields } : s
        ),
      }
    })

    try {
      const res = await reorderFields(selectedSectionId, {
        userId: profile.id,
        fieldIds: newFields.map((f) => f.id),
      })

      if (res.status !== 'success') {
        // Revert on error
        const templateRes = await getReportTemplateById(templateId)
        if (templateRes.status === 'success') {
          setTemplate(templateRes.data)
        }
        showNotification(res.message || 'Failed to reorder fields', 'error')
      }
    } catch (error) {
      console.error('Error reordering fields:', error)
      showNotification('Error reordering fields', 'error')
    }
  }

  // Property assignment operations
  const handleAssignProperty = async (propertyId: string) => {
    if (!profile?.id) return

    try {
      const res = await assignTemplateToProperty({
        propertyId,
        templateId,
        userId: profile.id,
      })

      if (res.status === 'success') {
        setAssignedPropertyIds((prev) => [...prev, propertyId])
        setPropertyAssignments((prev) => [...prev, { id: res.data.id, propertyId }])
      } else {
        showNotification(res.message || 'Failed to assign property', 'error')
      }
    } catch (error) {
      console.error('Error assigning property:', error)
      showNotification('Error assigning property', 'error')
    }
  }

  const handleUnassignProperty = async (propertyId: string) => {
    const assignment = propertyAssignments.find((a) => a.propertyId === propertyId)
    if (!assignment) {
      // Just remove from local state if no assignment ID
      setAssignedPropertyIds((prev) => prev.filter((id) => id !== propertyId))
      return
    }

    try {
      const res = await unassignTemplateFromProperty(assignment.id)

      if (res.status === 'success') {
        setAssignedPropertyIds((prev) => prev.filter((id) => id !== propertyId))
        setPropertyAssignments((prev) => prev.filter((a) => a.propertyId !== propertyId))
      } else {
        showNotification(res.message || 'Failed to unassign property', 'error')
      }
    } catch (error) {
      console.error('Error unassigning property:', error)
      showNotification('Error unassigning property', 'error')
    }
  }

  const selectedSection = template?.sections.find((s) => s.id === selectedSectionId)

  if (loading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} style="p-0 max-w-5xl w-[95vw] h-[85vh]">
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading template...</p>
          </div>
        </div>
      </Modal>
    )
  }

  if (!template) {
    return null
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-0 max-w-5xl w-[95vw] h-[85vh]" closable={false}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleSaveBasicInfo}
                className="text-xl font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1 -ml-1"
                placeholder="Template name"
              />
              {saving && (
                <ArrowPathIcon className="w-4 h-4 text-gray-400 animate-spin" />
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel - Sections */}
          <div className="w-72 border-r border-gray-200 p-4 overflow-y-auto bg-gray-50">
            <SectionList
              sections={template.sections || []}
              selectedSectionId={selectedSectionId}
              onSelectSection={setSelectedSectionId}
              onReorder={handleReorderSections}
              onEditSection={handleEditSection}
              onDeleteSection={handleDeleteSection}
              onAddSection={handleAddSection}
            />

            {/* Property assignments */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <PropertyAssignmentSelector
                assignedPropertyIds={assignedPropertyIds}
                assignedPropertyDetails={assignedPropertyDetails}
                onAssign={handleAssignProperty}
                onUnassign={handleUnassignProperty}
              />
            </div>
          </div>

          {/* Right panel - Fields */}
          <div className="flex-1 p-4 overflow-y-auto">
            {selectedSection ? (
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedSection.name}</h3>
                  <p className="text-sm text-gray-500">
                    Add fields with formulas to calculate values from booking data
                  </p>
                </div>

                <FieldList
                  fields={selectedSection.fields || []}
                  onReorder={handleReorderFields}
                  onEditField={handleEditField}
                  onDeleteField={handleDeleteField}
                  onAddField={handleAddField}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <EyeIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  {template.sections?.length === 0
                    ? 'No sections yet'
                    : 'Select a section'}
                </h3>
                <p className="text-gray-500 text-sm max-w-sm">
                  {template.sections?.length === 0
                    ? 'Add a section to start building your report template.'
                    : 'Click on a section in the left panel to view and edit its fields.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {template.sections?.length || 0} sections,{' '}
            {template.sections?.reduce((acc, s) => acc + (s.fields?.length || 0), 0) || 0} fields
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default EditReportTemplateModal
