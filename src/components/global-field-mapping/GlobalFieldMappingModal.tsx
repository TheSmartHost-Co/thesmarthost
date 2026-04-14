'use client'

import { useTranslation } from 'react-i18next'
import React, { useState, useEffect } from 'react'
import Modal from '../shared/modal'
import FieldMappingEditor from '../property-field-mapping/FieldMappingEditor'
import {
  getGlobalFieldMappings,
  createGlobalFieldMapping,
  updateGlobalFieldMapping,
  deleteGlobalFieldMapping,
  setGlobalFieldMappingAsDefault,
  copyGlobalTemplateToProperty
} from '@/services/propertyFieldMappingService'
import type {
  GlobalFieldMappingTemplate,
  CreateGlobalFieldMappingPayload
} from '@/services/types/propertyFieldMapping'
import type { Platform } from '@/services/types/csvMapping'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissions } from '@/hooks/usePermissions'
import {
  PlusIcon,
  TrashIcon,
  StarIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface GlobalFieldMappingModalProps {
  isOpen: boolean
  onClose: () => void
  onTemplateChange?: (template: GlobalFieldMappingTemplate | null) => void
  initialTemplate?: GlobalFieldMappingTemplate | null
  // For copy-to-property feature
  availableProperties?: Array<{ id: string; name: string }>
}

const GlobalFieldMappingModal: React.FC<GlobalFieldMappingModalProps> = ({
  isOpen,
  onClose,
  onTemplateChange,
  initialTemplate,
  availableProperties = []
}) => {
  const [templates, setTemplates] = useState<GlobalFieldMappingTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<GlobalFieldMappingTemplate | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [editingTemplateName, setEditingTemplateName] = useState('')
  const [editingFieldMappings, setEditingFieldMappings] = useState<Record<Platform, Record<string, string>>>({
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
  const [showEditor, setShowEditor] = useState(false)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [copyingTemplate, setCopyingTemplate] = useState<GlobalFieldMappingTemplate | null>(null)
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([])

  const { effectiveUserId } = usePermissions()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Load templates when modal opens
  useEffect(() => {
    if (isOpen && effectiveUserId) {
      loadTemplates()

      // Set initial template if provided
      if (initialTemplate) {
        setSelectedTemplate(initialTemplate)
      }
    }
  }, [isOpen, effectiveUserId, initialTemplate])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplate(null)
      setIsEditing(false)
      setIsCreating(false)
      setShowEditor(false)
      setShowCopyModal(false)
      setCopyingTemplate(null)
      setSelectedPropertyIds([])
    }
  }, [isOpen])

  const loadTemplates = async () => {
    if (!effectiveUserId) return

    try {
      setLoading(true)
      const response = await getGlobalFieldMappings(effectiveUserId)
      if (response.status === 'success') {
        setTemplates(response.data)
      } else {
        showNotification(response.message || 'Failed to load global templates', 'error')
      }
    } catch (error) {
      console.error('Error loading global templates:', error)
      showNotification('Failed to load global field mapping templates', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateNew = () => {
    setSelectedTemplate(null)
    setIsCreating(true)
    setIsEditing(true)
    setEditingTemplateName('')
    setEditingFieldMappings({
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
    setShowEditor(true)
  }

  const handleEdit = (template: GlobalFieldMappingTemplate) => {
    setSelectedTemplate(template)
    setIsCreating(false)
    setIsEditing(true)
    setEditingTemplateName(template.mappingName)
    setEditingFieldMappings(template.fieldMappings)
    setShowEditor(true)
  }

  const handleCopy = (template: GlobalFieldMappingTemplate) => {
    setSelectedTemplate(null)
    setIsCreating(true)
    setIsEditing(true)
    setEditingTemplateName(`${template.mappingName} (Copy)`)
    setEditingFieldMappings(template.fieldMappings)
    setShowEditor(true)
  }

  const handleSave = async () => {
    if (!effectiveUserId) {
      showNotification('User profile not found', 'error')
      return
    }

    if (!editingTemplateName.trim()) {
      showNotification('Template name is required', 'error')
      return
    }

    try {
      setLoading(true)

      if (isCreating) {
        // Create new template
        const payload: CreateGlobalFieldMappingPayload = {
          userId: effectiveUserId,
          mappingName: editingTemplateName.trim(),
          fieldMappings: editingFieldMappings,
          isDefault: templates.length === 0 // Set as default if it's the first template
        }

        const response = await createGlobalFieldMapping(payload)
        if (response.status === 'success') {
          showNotification('Global field mapping template created successfully', 'success')
          setTemplates(prev => [...prev, response.data])
          setSelectedTemplate(response.data)
          onTemplateChange?.(response.data)
        } else {
          showNotification(response.message || 'Failed to create template', 'error')
          return
        }
      } else if (selectedTemplate) {
        // Update existing template
        const response = await updateGlobalFieldMapping(selectedTemplate.id, {
          mappingName: editingTemplateName.trim(),
          fieldMappings: editingFieldMappings
        })

        if (response.status === 'success') {
          showNotification('Global field mapping template updated successfully', 'success')
          setTemplates(prev => prev.map(t =>
            t.id === selectedTemplate.id ? response.data : t
          ))
          setSelectedTemplate(response.data)
          onTemplateChange?.(response.data)
        } else {
          showNotification(response.message || 'Failed to update template', 'error')
          return
        }
      }

      // Reset editing state
      setIsEditing(false)
      setIsCreating(false)
      setShowEditor(false)
    } catch (error) {
      console.error('Error saving template:', error)
      showNotification('Failed to save global field mapping template', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (template: GlobalFieldMappingTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.mappingName}"?`)) {
      return
    }

    try {
      setLoading(true)
      const response = await deleteGlobalFieldMapping(template.id)

      if (response.status === 'success') {
        showNotification('Global field mapping template deleted successfully', 'success')
        setTemplates(prev => prev.filter(t => t.id !== template.id))

        if (selectedTemplate?.id === template.id) {
          setSelectedTemplate(null)
          onTemplateChange?.(null)
        }
      } else {
        showNotification(response.message || 'Failed to delete template', 'error')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      showNotification('Failed to delete global field mapping template', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (template: GlobalFieldMappingTemplate) => {
    try {
      setLoading(true)
      const response = await setGlobalFieldMappingAsDefault(template.id)

      if (response.status === 'success') {
        showNotification('Default global template updated successfully', 'success')

        // Update templates list to reflect new default
        setTemplates(prev => prev.map(t => ({
          ...t,
          isDefault: t.id === template.id
        })))

        const updatedTemplate = { ...template, isDefault: true }
        setSelectedTemplate(updatedTemplate)
        onTemplateChange?.(updatedTemplate)
      } else {
        showNotification(response.message || 'Failed to set default template', 'error')
      }
    } catch (error) {
      console.error('Error setting default template:', error)
      showNotification('Failed to set default template', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (template: GlobalFieldMappingTemplate) => {
    setSelectedTemplate(template)
    onTemplateChange?.(template)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setIsCreating(false)
    setShowEditor(false)
    setSelectedTemplate(templates.find(t => t.id === selectedTemplate?.id) || null)
  }

  // Copy to property handlers
  const handleOpenCopyModal = (template: GlobalFieldMappingTemplate) => {
    setCopyingTemplate(template)
    setSelectedPropertyIds([])
    setShowCopyModal(true)
  }

  const handleCloseCopyModal = () => {
    setShowCopyModal(false)
    setCopyingTemplate(null)
    setSelectedPropertyIds([])
  }

  const handlePropertyToggle = (propertyId: string) => {
    setSelectedPropertyIds(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    )
  }

  const handleCopyToProperties = async () => {
    if (!copyingTemplate || !effectiveUserId || selectedPropertyIds.length === 0) return

    const confirmMessage = `Copy "${copyingTemplate.mappingName}" to ${selectedPropertyIds.length} ${selectedPropertyIds.length === 1 ? 'property' : 'properties'}?`
    if (!confirm(confirmMessage)) return

    try {
      setLoading(true)
      let successCount = 0
      let failCount = 0

      for (const propertyId of selectedPropertyIds) {
        try {
          const response = await copyGlobalTemplateToProperty(copyingTemplate.id, propertyId, effectiveUserId)
          if (response.status === 'success') {
            successCount++
          } else {
            failCount++
          }
        } catch {
          failCount++
        }
      }

      if (successCount > 0) {
        showNotification(`Template copied to ${successCount} ${successCount === 1 ? 'property' : 'properties'}`, 'success')
      }
      if (failCount > 0) {
        showNotification(`Failed to copy to ${failCount} ${failCount === 1 ? 'property' : 'properties'}`, 'error')
      }

      handleCloseCopyModal()
    } catch (error) {
      console.error('Error copying template:', error)
      showNotification('Failed to copy template to properties', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getPlatformCount = (template: GlobalFieldMappingTemplate): number => {
    return Object.keys(template.fieldMappings).filter(platform =>
      Object.keys(template.fieldMappings[platform as Platform]).length > 0
    ).length
  }

  const getMappingCount = (template: GlobalFieldMappingTemplate): number => {
    return Object.values(template.fieldMappings).reduce((total, platformMappings) =>
      total + Object.keys(platformMappings).length, 0
    )
  }

  // Copy to property modal
  if (showCopyModal && copyingTemplate) {
    return (
      <Modal isOpen={isOpen} onClose={handleCloseCopyModal} style="w-full max-w-2xl">
        <div className="p-6">
          <div className="flex items-center space-x-3 mb-6">
            <ArrowDownTrayIcon className="h-6 w-6 text-blue-500" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Copy to Properties</h2>
              <p className="text-sm text-gray-600">
                Copy &quot;{copyingTemplate.mappingName}&quot; to selected properties
              </p>
            </div>
          </div>

          {availableProperties.length === 0 ? (
            <div className="text-center py-8">
              <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No properties available to copy to.</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {selectedPropertyIds.length} of {availableProperties.length} selected
                </span>
                <button
                  onClick={() => {
                    if (selectedPropertyIds.length === availableProperties.length) {
                      setSelectedPropertyIds([])
                    } else {
                      setSelectedPropertyIds(availableProperties.map(p => p.id))
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {selectedPropertyIds.length === availableProperties.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                {availableProperties.map(property => (
                  <label
                    key={property.id}
                    className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPropertyIds.includes(property.id)}
                      onChange={() => handlePropertyToggle(property.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-3 text-sm text-gray-900">{property.name}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={handleCloseCopyModal}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCopyToProperties}
              disabled={loading || selectedPropertyIds.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
              Copy to {selectedPropertyIds.length} {selectedPropertyIds.length === 1 ? 'Property' : 'Properties'}
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  // Editor view
  if (showEditor) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
        <div className="p-6 h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between mb-4 border-b pb-4">
            <div className="flex items-center space-x-3">
              <GlobeAltIcon className="h-6 w-6 text-blue-500" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {isCreating ? 'Create' : 'Edit'} Global Field Mapping Template
                </h2>
                <p className="text-sm text-gray-600">
                  {isCreating ? 'New global template' : selectedTemplate?.mappingName}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !editingTemplateName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                )}
                {isCreating ? 'Create Template' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* Template Name */}
          <div className="mb-6">
            <label className="text-black block text-sm font-medium text-gray-700 mb-2">
              Template Name *
            </label>
            <input
              type="text"
              value={editingTemplateName}
              onChange={(e) => setEditingTemplateName(e.target.value)}
              placeholder="e.g., Standard Template, Hostaway Default"
              className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Editor */}
          <div className="flex-1 min-h-0">
            <FieldMappingEditor
              fieldMappings={editingFieldMappings}
              onChange={setEditingFieldMappings}
              className="h-full"
            />
          </div>
        </div>
      </Modal>
    )
  }

  // List view
  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-4xl">
      <div className="p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <GlobeAltIcon className="h-6 w-6 text-blue-500" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Global Field Mapping Templates</h2>
              <p className="text-sm text-gray-600">
                Manage templates that can be applied to all properties
              </p>
            </div>
          </div>
          <button
            onClick={handleCreateNew}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Template
          </button>
        </div>

        {loading && !showEditor ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading templates...</span>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12">
            <GlobeAltIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Global Templates</h3>
            <p className="text-gray-600 mb-4">
              Create a global template to use the same field mappings across all your properties.
            </p>
            <button
              onClick={handleCreateNew}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create First Template
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`p-4 border rounded-lg transition-all ${
                  selectedTemplate?.id === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <button
                      onClick={() => handleSelect(template)}
                      className={`flex-shrink-0 w-5 h-5 rounded-full border-2 transition-colors ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {selectedTemplate?.id === template.id && (
                        <CheckCircleIcon className="w-5 h-5 text-white" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {template.mappingName}
                        </h4>
                        {template.isDefault && (
                          <StarIconSolid className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                          Global
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <span>{getMappingCount(template)} fields mapped</span>
                        <span>{getPlatformCount(template)} platforms configured</span>
                        <span>
                          Created {new Date(template.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {!template.isDefault && (
                      <button
                        onClick={() => handleSetDefault(template)}
                        disabled={loading}
                        className="p-1 text-gray-400 hover:text-yellow-500 transition-colors disabled:opacity-50"
                        title="Set as default"
                      >
                        <StarIcon className="h-4 w-4" />
                      </button>
                    )}
                    {availableProperties.length > 0 && (
                      <button
                        onClick={() => handleOpenCopyModal(template)}
                        disabled={loading}
                        className="p-1 text-gray-400 hover:text-green-500 transition-colors disabled:opacity-50"
                        title="Copy to properties"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleCopy(template)}
                      disabled={loading}
                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                      title="Duplicate template"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(template)}
                      disabled={loading}
                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                      title="Edit template"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(template)}
                      disabled={loading}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Delete template"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {templates.length > 0 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="text-sm text-gray-600">
              {templates.length} template{templates.length !== 1 ? 's' : ''} • {' '}
              {templates.filter(t => t.isDefault).length} default
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
              {selectedTemplate && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Use Template
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default GlobalFieldMappingModal
