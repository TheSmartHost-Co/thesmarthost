'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../shared/modal'
import FieldMappingEditor from './FieldMappingEditor'
import { 
  getPropertyFieldMappings, 
  createPropertyFieldMapping,
  updatePropertyFieldMapping,
  deletePropertyFieldMapping,
  setPropertyFieldMappingAsDefault 
} from '@/services/propertyFieldMappingService'
import type { 
  PropertyFieldMappingTemplate,
  CreatePropertyFieldMappingPayload 
} from '@/services/types/propertyFieldMapping'
import type { Platform } from '@/services/types/csvMapping'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { 
  PlusIcon, 
  TrashIcon, 
  StarIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface PropertyFieldMappingModalProps {
  isOpen: boolean
  onClose: () => void
  propertyId: string
  propertyName?: string
  onTemplateChange?: (template: PropertyFieldMappingTemplate | null) => void
  initialTemplate?: PropertyFieldMappingTemplate | null
}

const PropertyFieldMappingModal: React.FC<PropertyFieldMappingModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  propertyName = 'Property',
  onTemplateChange,
  initialTemplate
}) => {
  const [templates, setTemplates] = useState<PropertyFieldMappingTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<PropertyFieldMappingTemplate | null>(null)
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

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Load templates when modal opens
  useEffect(() => {
    if (isOpen && propertyId) {
      loadTemplates()
      
      // Set initial template if provided
      if (initialTemplate) {
        setSelectedTemplate(initialTemplate)
      }
    }
  }, [isOpen, propertyId, initialTemplate])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplate(null)
      setIsEditing(false)
      setIsCreating(false)
      setShowEditor(false)
    }
  }, [isOpen])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await getPropertyFieldMappings(propertyId)
      if (response.status === 'success') {
        setTemplates(response.data)
      } else {
        showNotification(response.message || 'Failed to load templates', 'error')
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      showNotification('Failed to load field mapping templates', 'error')
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

  const handleEdit = (template: PropertyFieldMappingTemplate) => {
    setSelectedTemplate(template)
    setIsCreating(false)
    setIsEditing(true)
    setEditingTemplateName(template.mappingName)
    setEditingFieldMappings(template.fieldMappings)
    setShowEditor(true)
  }

  const handleCopy = (template: PropertyFieldMappingTemplate) => {
    setSelectedTemplate(null)
    setIsCreating(true)
    setIsEditing(true)
    setEditingTemplateName(`${template.mappingName} (Copy)`)
    setEditingFieldMappings(template.fieldMappings)
    setShowEditor(true)
  }

  const handleSave = async () => {
    if (!profile?.id) {
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
        const payload: CreatePropertyFieldMappingPayload = {
          propertyId,
          userId: profile.id,
          mappingName: editingTemplateName.trim(),
          fieldMappings: editingFieldMappings,
          isDefault: templates.length === 0 // Set as default if it's the first template
        }

        const response = await createPropertyFieldMapping(payload)
        if (response.status === 'success') {
          showNotification('Field mapping template created successfully', 'success')
          setTemplates(prev => [...prev, response.data])
          setSelectedTemplate(response.data)
          onTemplateChange?.(response.data)
        } else {
          showNotification(response.message || 'Failed to create template', 'error')
          return
        }
      } else if (selectedTemplate) {
        // Update existing template
        const response = await updatePropertyFieldMapping(selectedTemplate.id, {
          mappingName: editingTemplateName.trim(),
          fieldMappings: editingFieldMappings
        })
        
        if (response.status === 'success') {
          showNotification('Field mapping template updated successfully', 'success')
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
      showNotification('Failed to save field mapping template', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (template: PropertyFieldMappingTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.mappingName}"?`)) {
      return
    }

    try {
      setLoading(true)
      const response = await deletePropertyFieldMapping(template.id)
      
      if (response.status === 'success') {
        showNotification('Field mapping template deleted successfully', 'success')
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
      showNotification('Failed to delete field mapping template', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSetDefault = async (template: PropertyFieldMappingTemplate) => {
    try {
      setLoading(true)
      const response = await setPropertyFieldMappingAsDefault(template.id)
      
      if (response.status === 'success') {
        showNotification('Default template updated successfully', 'success')
        
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

  const handleSelect = (template: PropertyFieldMappingTemplate) => {
    setSelectedTemplate(template)
    onTemplateChange?.(template)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setIsCreating(false)
    setShowEditor(false)
    setSelectedTemplate(templates.find(t => t.id === selectedTemplate?.id) || null)
  }

  const getPlatformCount = (template: PropertyFieldMappingTemplate): number => {
    return Object.keys(template.fieldMappings).filter(platform => 
      Object.keys(template.fieldMappings[platform as Platform]).length > 0
    ).length
  }

  const getMappingCount = (template: PropertyFieldMappingTemplate): number => {
    return Object.values(template.fieldMappings).reduce((total, platformMappings) => 
      total + Object.keys(platformMappings).length, 0
    )
  }

  if (showEditor) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
        <div className="p-6 h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center justify-between mb-4 border-b pb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isCreating ? 'Create' : 'Edit'} Field Mapping Template
              </h2>
              <p className="text-sm text-gray-600">
                {propertyName} " {isCreating ? 'New template' : selectedTemplate?.mappingName}
              </p>
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
              placeholder="e.g., Hostaway Template, Airbnb Export"
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-4xl">
      <div className="p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Field Mapping Templates</h2>
            <p className="text-sm text-gray-600">
              Manage CSV field mapping templates for {propertyName}
            </p>
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
            <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Found</h3>
            <p className="text-gray-600 mb-4">
              Create your first field mapping template to save time on future CSV uploads.
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
                    <button
                      onClick={() => handleCopy(template)}
                      disabled={loading}
                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                      title="Copy template"
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
              {templates.length} template{templates.length !== 1 ? 's' : ''} "{' '}
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

export default PropertyFieldMappingModal