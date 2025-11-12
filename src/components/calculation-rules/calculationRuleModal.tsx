'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../shared/modal'
import { 
  getCalculationRules,
  createCalculationRule, 
  updateCalculationRule, 
  deleteCalculationRule,
  getUserCustomFields
} from '@/services/calculationRuleService'
import { 
  CalculationRule, 
  CreateCalculationRulePayload, 
  UpdateCalculationRulePayload,
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
  SparklesIcon
} from '@heroicons/react/24/outline'

interface CalculationRuleModalProps {
  isOpen: boolean
  onClose: () => void
  propertyId?: string
  propertyName?: string
  onRulesUpdate?: (rules: CalculationRule[]) => void
}

type ModalMode = 'list' | 'create' | 'edit'

const PLATFORM_OPTIONS = [
  { value: 'ALL' as Platform, label: 'All Platforms' },
  { value: 'airbnb' as Platform, label: 'Airbnb' },
  { value: 'vrbo' as Platform, label: 'VRBO' },
  { value: 'direct' as Platform, label: 'Direct Booking' },
  { value: 'hostaway' as Platform, label: 'Hostaway' }
]

const CalculationRuleModal: React.FC<CalculationRuleModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  propertyName,
  onRulesUpdate,
}) => {
  const [rules, setRules] = useState<CalculationRule[]>([])
  const [userCustomFields, setUserCustomFields] = useState<UserCustomField[]>([])
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ModalMode>('list')
  const [selectedRule, setSelectedRule] = useState<CalculationRule | null>(null)
  
  // Form state
  const [platform, setPlatform] = useState<Platform>('ALL')
  const [bookingField, setBookingField] = useState('')
  const [csvFormula, setCsvFormula] = useState('')
  const [priority, setPriority] = useState('')
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)

  const { showNotification } = useNotificationStore()
  const { profile } = useUserStore()

  // Load rules when modal opens
  useEffect(() => {
    if (isOpen && propertyId) {
      loadRules()
      loadUserCustomFields()
    }
  }, [isOpen, propertyId])

  // Reset form when mode changes
  useEffect(() => {
    if (mode === 'create') {
      setPlatform('ALL')
      setBookingField('')
      setCsvFormula('')
      setPriority('')
      setNotes('')
      setIsActive(true)
    } else if (mode === 'edit' && selectedRule) {
      setPlatform(selectedRule.platform)
      setBookingField(selectedRule.bookingField)
      setCsvFormula(selectedRule.csvFormula)
      setPriority(selectedRule.priority?.toString() || '')
      setNotes(selectedRule.notes || '')
      setIsActive(selectedRule.isActive)
    }
  }, [mode, selectedRule])

  const loadRules = async () => {
    if (!propertyId) return
    
    try {
      setLoading(true)
      const response = await getCalculationRules(propertyId)
      if (response.status === 'success') {
        setRules(response.data)
      } else {
        showNotification(response.message || 'Failed to load calculation rules', 'error')
      }
    } catch (error) {
      console.error('Error loading calculation rules:', error)
      showNotification('Error loading calculation rules', 'error')
    } finally {
      setLoading(false)
    }
  }

  const loadUserCustomFields = async () => {
    if (!profile?.id) return
    
    try {
      const response = await getUserCustomFields(profile.id)
      if (response.status === 'success') {
        setUserCustomFields(response.data)
      }
    } catch (error) {
      console.error('Error loading user custom fields:', error)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!propertyId) {
      showNotification('Property ID is required', 'error')
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

    try {
      const payload: CreateCalculationRulePayload = {
        propertyId,
        userId: profile?.id,
        platform,
        bookingField: bookingField.trim(),
        csvFormula: csvFormula.trim(),
        priority: priority ? parseInt(priority) : undefined,
        notes: notes.trim() || undefined
      }

      const response = await createCalculationRule(payload)
      if (response.status === 'success') {
        setRules(prev => [...prev, response.data])
        setMode('list')
        showNotification('Calculation rule created successfully', 'success')
        onRulesUpdate?.(rules)
      } else {
        showNotification(response.message || 'Failed to create calculation rule', 'error')
      }
    } catch (error) {
      console.error('Error creating calculation rule:', error)
      showNotification('Error creating calculation rule', 'error')
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
        platform,
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

  const handleCustomFieldSelect = (customField: UserCustomField) => {
    setBookingField(customField.bookingField)
    setCsvFormula(customField.csvFormula)
  }

  const renderListMode = () => (
    <div className="space-y-6 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center">
            <CalculatorIcon className="h-6 w-6 mr-2" />
            Custom Fields
          </h2>
          {propertyName && (
            <p className="text-sm text-gray-600 mt-1">
              Property: {propertyName}
            </p>
          )}
        </div>
        <button
          onClick={() => setMode('create')}
          className="cursor-pointer flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Custom Field
        </button>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
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

  const renderFormMode = () => (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          {mode === 'create' ? 'Add' : 'Edit'} Custom Field
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
                <div className="text-xs text-blue-600">Used {field.usageCount} times</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={mode === 'create' ? handleCreate : handleUpdate} className="space-y-4">
        {/* Platform */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Platform
          </label>
          <div className="relative">
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-black"
              required
            >
              {PLATFORM_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-4xl w-11/12 max-h-[90vh] overflow-y-auto">
      {mode === 'list' ? renderListMode() : renderFormMode()}
    </Modal>
  )
}

export default CalculationRuleModal