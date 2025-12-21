'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../shared/modal'
import { 
  getCalculationRules,
  getUserTemplates,
  createCalculationRule, 
  updateCalculationRule, 
  deleteCalculationRule,
  deleteTemplate,
  createTemplate,
  getUserCustomFields
} from '@/services/calculationRuleService'
import { 
  CalculationRule,
  CalculationRuleTemplate,
  CreateCalculationRulePayload, 
  UpdateCalculationRulePayload,
  CreateTemplatePayload,
  Platform,
  UserCustomField
} from '@/services/types/calculationRule'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { 
  PencilIcon, 
  TrashIcon, 
  PlusIcon, 
  CalculatorIcon,
  XMarkIcon,
  ChevronDownIcon,
  SparklesIcon,
  FolderIcon,
  DocumentDuplicateIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface CalculationRuleModalProps {
  isOpen: boolean
  onClose: () => void
  userId?: string
  onRulesUpdate?: (rules: CalculationRule[]) => void
  onTemplateSelect?: (templateName: string) => void
}

type ModalMode = 'list' | 'create' | 'edit' | 'createTemplate'
type ViewMode = 'templates' | 'rules'

const PLATFORM_OPTIONS = [
  { value: 'ALL' as Platform, label: 'All Platforms' },
  { value: 'airbnb' as Platform, label: 'Airbnb' },
  { value: 'booking' as Platform, label: 'Booking.com' },
  { value: 'google' as Platform, label: 'Google Travel' },
  { value: 'direct' as Platform, label: 'Direct Booking' },
  { value: 'vrbo' as Platform, label: 'VRBO' },
  { value: 'hostaway' as Platform, label: 'Hostaway' },
  { value: 'wechalet' as Platform, label: 'WeChalet' },
  { value: 'monsieurchalets' as Platform, label: 'Monsieur Chalets' },
  { value: 'direct-etransfer' as Platform, label: 'Direct E-Transfer' }
]

const CalculationRuleModal: React.FC<CalculationRuleModalProps> = ({
  isOpen,
  onClose,
  userId,
  onRulesUpdate,
  onTemplateSelect
}) => {
  const [templates, setTemplates] = useState<CalculationRuleTemplate[]>([])
  const [rules, setRules] = useState<CalculationRule[]>([])
  const [userCustomFields, setUserCustomFields] = useState<UserCustomField[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ModalMode>('list')
  const [viewMode, setViewMode] = useState<ViewMode>('templates')
  const [selectedRule, setSelectedRule] = useState<CalculationRule | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  
  // Form state
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['ALL'])
  const [bookingField, setBookingField] = useState('')
  const [csvFormula, setCsvFormula] = useState('')
  const [priority, setPriority] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [templateName, setTemplateName] = useState('')
  const [templateDescription, setTemplateDescription] = useState('')
  const [isTemplateDefault, setIsTemplateDefault] = useState(false)
  const [copyFromTemplateId, setCopyFromTemplateId] = useState('')

  const { showNotification } = useNotificationStore()
  const { profile } = useUserStore()
  const effectiveUserId = userId || profile?.id

  // Load data when modal opens
  useEffect(() => {
    if (isOpen && effectiveUserId) {
      loadTemplates()
      loadAllRules()
      loadUserCustomFields()
    }
  }, [isOpen, effectiveUserId])

  // Reset form when mode changes
  useEffect(() => {
    if (mode === 'create') {
      setSelectedPlatforms(['ALL'])
      setBookingField('')
      setCsvFormula('')
      setPriority('')
      setNotes('')
      setIsActive(true)
    } else if (mode === 'edit' && selectedRule) {
      setSelectedPlatforms([selectedRule.platform])
      setBookingField(selectedRule.bookingField)
      setCsvFormula(selectedRule.csvFormula)
      setPriority(selectedRule.priority?.toString() || '')
      setNotes(selectedRule.notes || '')
      setIsActive(selectedRule.isActive)
    } else if (mode === 'createTemplate') {
      setTemplateName('')
      setTemplateDescription('')
      setIsTemplateDefault(false)
      setCopyFromTemplateId('')
    }
  }, [mode, selectedRule])

  const loadTemplates = async () => {
    if (!effectiveUserId) return
    
    try {
      setLoading(true)
      const response = await getUserTemplates(effectiveUserId)
      if (response.status === 'success') {
        setTemplates(response.data)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      showNotification('Error loading templates', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadAllRules = async () => {
    if (!effectiveUserId) return
    
    try {
      setLoading(true)
      const response = await getCalculationRules(effectiveUserId)
      if (response.status === 'success') {
        setRules(response.data)
      }
    } catch (error) {
      console.error('Error loading calculation rules:', error)
      showNotification('Error loading calculation rules', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadTemplateRules = async (templateId: string, templateName: string) => {
    if (!effectiveUserId) return
    
    try {
      setLoading(true)
      const response = await getCalculationRules(effectiveUserId, undefined, templateId)
      if (response.status === 'success') {
        setRules(response.data)
        setSelectedTemplate(templateName)
        setSelectedTemplateId(templateId)
        setViewMode('rules')
      }
    } catch (error) {
      console.error('Error loading template rules:', error)
      showNotification('Error loading template rules', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadUserCustomFields = async () => {
    if (!effectiveUserId) return
    
    try {
      const response = await getUserCustomFields(effectiveUserId)
      if (response.status === 'success') {
        setUserCustomFields(response.data)
      }
    } catch (error) {
      console.error('Error loading user custom fields:', error)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!effectiveUserId) {
      showNotification('User ID is required', 'error')
      return
    }

    if (!bookingField.trim()) {
      showNotification('Booking field name is required', 'error')
      return
    }

    if (!csvFormula.trim()) {
      showNotification('CSV formula is required', 'error')
      return
    }

    if (selectedPlatforms.length === 0) {
      showNotification('At least one platform must be selected', 'error')
      return
    }

    try {
      const createdRules: CalculationRule[] = []
      
      // Create rules for each selected platform
      for (const platform of selectedPlatforms) {
        const payload: CreateCalculationRulePayload = {
          userId: effectiveUserId,
          templateId: selectedTemplateId || undefined,
          platform,
          bookingField: bookingField.trim(),
          csvFormula: csvFormula.trim(),
          priority: priority ? parseInt(priority) : undefined,
          notes: notes.trim() || undefined
        }

        const response = await createCalculationRule(payload)
        if (response.status === 'success') {
          createdRules.push(response.data)
        } else {
          showNotification(`Failed to create rule for ${platform}: ${response.message}`, 'error')
          return
        }
      }

      setRules(prev => [...prev, ...createdRules])
      setMode('list')
      
      // Reload templates to update rule counts
      await loadTemplates()
      
      const platformNames = selectedPlatforms.map(p => 
        PLATFORM_OPTIONS.find(opt => opt.value === p)?.label || p
      ).join(', ')
      
      showNotification(
        `Created custom field "${bookingField}" for ${platformNames}`, 
        'success'
      )
      onRulesUpdate?.([...rules, ...createdRules])
      
    } catch (error) {
      console.error('Error creating calculation rules:', error)
      showNotification('Error creating calculation rules', 'error')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedRule) return

    if (!bookingField.trim()) {
      showNotification('Booking field name is required', 'error')
      return
    }

    if (!csvFormula.trim()) {
      showNotification('CSV formula is required', 'error')
      return
    }

    try {
      const payload: UpdateCalculationRulePayload = {
        platform: selectedPlatforms[0],
        bookingField: bookingField.trim(),
        csvFormula: csvFormula.trim(),
        priority: priority ? parseInt(priority) : undefined,
        isActive,
        notes: notes.trim() || undefined
      }

      const response = await updateCalculationRule(selectedRule.id, payload)
      if (response.status === 'success') {
        setRules(prev => prev.map(rule => 
          rule.id === selectedRule.id ? response.data : rule
        ))
        setMode('list')
        setSelectedRule(null)
        showNotification('Calculation rule updated successfully', 'success')
        onRulesUpdate?.(rules)
      } else {
        showNotification(response.message || 'Failed to update calculation rule', 'error')
      }
    } catch (error) {
      console.error('Error updating calculation rule:', error)
      showNotification('Error updating calculation rule', 'error')
    }
  }

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this calculation rule?')) return

    try {
      const response = await deleteCalculationRule(ruleId)
      if (response.status === 'success') {
        setRules(prev => prev.filter(rule => rule.id !== ruleId))
        // Reload templates to update rule counts
        await loadTemplates()
        showNotification('Calculation rule deleted successfully', 'success')
        onRulesUpdate?.(rules)
      } else {
        showNotification(response.message || 'Failed to delete calculation rule', 'error')
      }
    } catch (error) {
      console.error('Error deleting calculation rule:', error)
      showNotification('Error deleting calculation rule', 'error')
    }
  }

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete the template "${templateName}" and all its rules?`)) return
    if (!effectiveUserId) return

    try {
      const response = await deleteTemplate(templateId, effectiveUserId)
      if (response.status === 'success') {
        await loadTemplates()
        showNotification(response.message, 'success')
        if (selectedTemplateId === templateId) {
          setSelectedTemplate(null)
          setSelectedTemplateId(null)
          setViewMode('templates')
        }
      } else {
        showNotification(response.message || 'Failed to delete template', 'error')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      showNotification('Error deleting template', 'error')
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!effectiveUserId) {
      showNotification('User ID is required', 'error')
      return
    }

    if (!templateName.trim()) {
      showNotification('Template name is required', 'error')
      return
    }

    try {
      const payload: CreateTemplatePayload = {
        userId: effectiveUserId,
        templateName: templateName.trim(),
        templateDescription: templateDescription.trim() || undefined,
        isTemplateDefault,
        copyFromTemplateId: copyFromTemplateId || undefined
      }

      const response = await createTemplate(payload)
      if (response.status === 'success') {
        await loadTemplates()
        setMode('list')
        showNotification(response.message, 'success')
      } else {
        showNotification(response.message || 'Failed to create template', 'error')
      }
    } catch (error) {
      console.error('Error creating template:', error)
      showNotification('Error creating template', 'error')
    }
  }

  const handleCustomFieldSelect = (customField: UserCustomField) => {
    setBookingField(customField.bookingField)
    setCsvFormula(customField.csvFormula)
  }

  const handlePlatformToggle = (platform: Platform) => {
    setSelectedPlatforms(prev => {
      if (platform === 'ALL') {
        return ['ALL']
      }
      
      const withoutAll = prev.filter(p => p !== 'ALL')
      
      if (prev.includes(platform)) {
        const newSelection = withoutAll.filter(p => p !== platform)
        return newSelection.length === 0 ? ['ALL'] : newSelection
      } else {
        return [...withoutAll, platform]
      }
    })
  }

  const renderTemplatesView = () => (
    <div className="space-y-6 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <FolderIcon className="h-6 w-6 mr-2" />
            Rule Templates
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage calculation rule templates
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setMode('createTemplate')}
            className="cursor-pointer flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FolderIcon className="h-4 w-4 mr-2" />
            Create Template
          </button>
          <button
            onClick={() => {
              setSelectedTemplate(null)
              setSelectedTemplateId(null)
              setViewMode('rules')
              loadAllRules()
            }}
            className="cursor-pointer flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <CalculatorIcon className="h-4 w-4 mr-2" />
            View All Rules
          </button>
        </div>
      </div>

      {/* Templates List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <FolderIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No templates found</p>
            <p className="text-sm text-gray-500 mt-1">Create your first template to organize rules</p>
          </div>
        ) : (
          templates.map(template => (
            <div key={template.templateName} className="p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">{template.templateName}</span>
                    {template.isTemplateDefault && (
                      <StarIconSolid className="h-4 w-4 text-yellow-500" title="Default template" />
                    )}
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                      {template.ruleCount} rules
                    </span>
                  </div>
                  {template.templateDescription && (
                    <p className="text-sm text-gray-600">{template.templateDescription}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Created: {new Date(template.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {onTemplateSelect && (
                    <button
                      onClick={() => onTemplateSelect(template.templateName)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Load
                    </button>
                  )}
                  <button
                    onClick={() => loadTemplateRules(template.templateId, template.templateName)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                    title="View rules"
                  >
                    <CalculatorIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.templateId, template.templateName)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Delete template"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  const renderRulesView = () => (
    <div className="space-y-6 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <CalculatorIcon className="h-6 w-6 mr-2" />
            Custom Fields
            {selectedTemplate && (
              <span className="ml-2 text-sm font-normal text-gray-600">
                Template: {selectedTemplate}
              </span>
            )}
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setMode('create')
            }}
            className="cursor-pointer flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Custom Field
          </button>
          <button
            onClick={() => {
              setViewMode('templates')
              setSelectedTemplate(null)
              setSelectedTemplateId(null)
            }}
            className="cursor-pointer px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Back to Templates
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading custom fields...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <CalculatorIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No custom fields found</p>
            <p className="text-sm text-gray-500 mt-1">Add your first custom field to get started</p>
          </div>
        ) : (
          rules.map(rule => (
            <div key={rule.id} className={`p-4 border rounded-lg ${rule.isActive ? 'bg-white' : 'bg-gray-50 opacity-75'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900">{rule.bookingField}</span>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      {PLATFORM_OPTIONS.find(p => p.value === rule.platform)?.label}
                    </span>
                    {!rule.isActive && (
                      <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                        Inactive
                      </span>
                    )}
                    {rule.templateName && !selectedTemplate && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                        {rule.templateName}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 font-mono">{rule.csvFormula}</p>
                  {rule.notes && (
                    <p className="text-xs text-gray-500 mt-1">{rule.notes}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedRule(rule)
                      setMode('edit')
                    }}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  const renderCreateTemplateMode = () => (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Create Template</h2>
        <button
          onClick={() => setMode('list')}
          className="cursor-pointer p-2 text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> To create a template, you need to create at least one calculation rule. 
          You can either copy from an existing template or create a new rule.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleCreateTemplate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Template Name
          </label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Standard Commission, Airbnb Rules"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            rows={3}
            className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe what this template is for..."
          />
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Template Rules</h3>
          
          {/* Show radio options for creating template */}
          <div className="space-y-3">
            {templates.length > 0 && (
              <label className="flex items-start space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="templateOption"
                  value="copy"
                  checked={!!copyFromTemplateId}
                  onChange={() => {
                    if (!copyFromTemplateId && templates.length > 0) {
                      setCopyFromTemplateId(templates[0].templateId)
                    }
                  }}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-700">Copy from existing template</div>
                  {copyFromTemplateId && (
                    <select
                      value={copyFromTemplateId}
                      onChange={(e) => setCopyFromTemplateId(e.target.value)}
                      className="mt-2 text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select template...</option>
                      {templates.map(template => (
                        <option key={template.templateId} value={template.templateId}>
                          {template.templateName} ({template.ruleCount} rules)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </label>
            )}
            
            <label className="flex items-start space-x-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="templateOption"
                value="new"
                checked={!copyFromTemplateId}
                onChange={() => setCopyFromTemplateId('')}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-700">Create template with new rules</div>
                <p className="text-sm text-gray-500">You'll add the first rule after creating the template</p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="isTemplateDefault"
            checked={isTemplateDefault}
            onChange={(e) => setIsTemplateDefault(e.target.checked)}
            className="text-black h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="isTemplateDefault" className="ml-2 text-sm text-gray-700">
            Set as default template
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => setMode('list')}
            className="cursor-pointer px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="cursor-pointer px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Create Template
          </button>
        </div>
      </form>
    </div>
  )

  const renderFormMode = () => (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          {mode === 'create' ? 'Add' : 'Edit'} Custom Field
          {selectedTemplate && (
            <span className="ml-2 text-sm font-normal text-gray-600">
              in {selectedTemplate}
            </span>
          )}
        </h2>
        <button
          onClick={() => {
            setMode('list')
            setSelectedRule(null)
          }}
          className="cursor-pointer p-2 text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Custom Fields Suggestions */}
      {mode === 'create' && userCustomFields.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
            <SparklesIcon className="h-4 w-4 mr-1" />
            Your Recent Custom Fields
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {userCustomFields.slice(0, 3).map(field => (
              <button
                key={`${field.bookingField}-${field.csvFormula}`}
                onClick={() => handleCustomFieldSelect(field)}
                className="text-left p-2 bg-white border border-blue-200 rounded hover:bg-blue-50 transition-colors"
              >
                <div className="text-sm font-medium text-blue-900">{field.bookingField}</div>
                <div className="text-xs text-blue-700 font-mono">{field.csvFormula}</div>
                <div className="text-xs text-blue-600">
                  Used {field.usageCount} times
                  {field.usedInTemplates && (
                    <span className="ml-1">in: {field.usedInTemplates}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={mode === 'create' ? handleCreate : handleUpdate} className="space-y-4">
        {/* Platform Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {mode === 'create' ? 'Platforms (select one or more)' : 'Platform'}
          </label>
          {mode === 'create' ? (
            <div className="grid grid-cols-2 gap-3">
              {PLATFORM_OPTIONS.map(option => (
                <label
                  key={option.value}
                  className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(option.value)}
                    onChange={() => handlePlatformToggle(option.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                  />
                  <span className="text-sm text-gray-900">{option.label}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
              {PLATFORM_OPTIONS.find(opt => opt.value === selectedPlatforms[0])?.label}
            </div>
          )}
          {mode === 'create' && selectedPlatforms.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Selected: {selectedPlatforms.map(p => 
                PLATFORM_OPTIONS.find(opt => opt.value === p)?.label
              ).join(', ')}
            </p>
          )}
        </div>

        {/* Booking Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Field Name
          </label>
          <input
            type="text"
            value={bookingField}
            onChange={(e) => setBookingField(e.target.value)}
            className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., bed_linen_fee, cleaning_fee, custom_tax"
            required
          />
        </div>

        {/* CSV Formula */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CSV Formula
          </label>
          <input
            type="text"
            value={csvFormula}
            onChange={(e) => setCsvFormula(e.target.value)}
            className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            placeholder="e.g., Column Name or cleaning_fee + service_fee"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Use column names or formulas like: cleaning_fee + service_fee * 0.1
          </p>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority (Optional)
          </label>
          <input
            type="number"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="1"
            min="1"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Add any notes about this custom field..."
          />
        </div>

        {/* Active Toggle (only for edit mode) */}
        {mode === 'edit' && (
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="text-black h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
              Active field
            </label>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => {
              setMode('list')
              setSelectedRule(null)
            }}
            className="cursor-pointer px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {mode === 'create' ? 'Create Field' : 'Update Field'}
          </button>
        </div>
      </form>
    </div>
  )

  const renderContent = () => {
    if (mode === 'create' || mode === 'edit') {
      return renderFormMode()
    }
    if (mode === 'createTemplate') {
      return renderCreateTemplateMode()
    }
    if (viewMode === 'templates') {
      return renderTemplatesView()
    }
    return renderRulesView()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-4xl w-11/12 max-h-[90vh] overflow-y-auto">
      {renderContent()}
    </Modal>
  )
}

export default CalculationRuleModal