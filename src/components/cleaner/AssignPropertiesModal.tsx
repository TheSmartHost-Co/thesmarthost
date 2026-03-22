'use client'

import React, { useState, useEffect } from 'react'
import Modal from '../shared/modal'
import { assignPropertiesToCleaner } from '@/services/cleanerService'
import { getProperties } from '@/services/propertyService'
import { Cleaner, AssignPropertiesPayload } from '@/services/types/cleaner'
import { Property } from '@/services/types/property'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import {
  BuildingOfficeIcon,
  CheckIcon,
  StarIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

interface AssignPropertiesModalProps {
  isOpen: boolean
  onClose: () => void
  cleaner: Cleaner
  onUpdate: (updatedCleaner: Cleaner) => void
}

interface PropertyAssignment {
  propertyId: string
  isAssigned: boolean
  isDefault: boolean
  priority: number
  rateType: 'flat' | 'hourly' | null
  rateAmount: number | null
  cleaningDurationMinutes: number | null
}

const AssignPropertiesModal: React.FC<AssignPropertiesModalProps> = ({
  isOpen,
  onClose,
  cleaner,
  onUpdate,
}) => {
  const [properties, setProperties] = useState<Property[]>([])
  const [assignments, setAssignments] = useState<Map<string, PropertyAssignment>>(new Map())
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)

  // Fetch properties and initialize assignments when modal opens
  useEffect(() => {
    const fetchProperties = async () => {
      if (!isOpen || !profile?.id) return

      setLoading(true)
      try {
        const response = await getProperties(profile.id)
        if (response.status === 'success') {
          setProperties(response.data)

          // Initialize assignments map from cleaner's existing assignments
          const assignmentMap = new Map<string, PropertyAssignment>()
          response.data.forEach((property) => {
            const existingAssignment = cleaner.assignedProperties?.find(
              (ap) => ap.propertyId === property.id
            )
            assignmentMap.set(property.id, {
              propertyId: property.id,
              isAssigned: !!existingAssignment,
              isDefault: existingAssignment?.isDefault || false,
              priority: existingAssignment?.priority || 1,
              rateType: existingAssignment?.rateType || null,
              rateAmount: existingAssignment?.rateAmount ?? null,
              cleaningDurationMinutes: existingAssignment?.cleaningDurationMinutes ?? null,
            })
          })
          setAssignments(assignmentMap)
        }
      } catch (err) {
        console.error('Error fetching properties:', err)
        showNotification('Failed to load properties', 'error')
      } finally {
        setLoading(false)
      }
    }

    fetchProperties()
  }, [isOpen, profile?.id, cleaner.assignedProperties, showNotification])

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
    }
  }, [isOpen])

  const toggleAssignment = (propertyId: string) => {
    setAssignments((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(propertyId)
      if (current) {
        const newAssignment = {
          ...current,
          isAssigned: !current.isAssigned,
          // Reset default and rate when unassigning
          isDefault: !current.isAssigned ? current.isDefault : false,
          rateType: !current.isAssigned ? current.rateType : null as 'flat' | 'hourly' | null,
          rateAmount: !current.isAssigned ? current.rateAmount : null,
          cleaningDurationMinutes: !current.isAssigned ? current.cleaningDurationMinutes : null,
        }
        newMap.set(propertyId, newAssignment)
      }
      return newMap
    })
  }

  const toggleDefault = (propertyId: string) => {
    setAssignments((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(propertyId)
      if (current && current.isAssigned) {
        newMap.set(propertyId, { ...current, isDefault: !current.isDefault })
      }
      return newMap
    })
  }

  const handleRateTypeChange = (propertyId: string, newType: 'flat' | 'hourly' | null) => {
    setAssignments((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(propertyId)
      if (current && current.isAssigned) {
        newMap.set(propertyId, {
          ...current,
          rateType: newType,
          rateAmount: newType === null ? null : current.rateAmount,
        })
      }
      return newMap
    })
  }

  const handleDurationHoursChange = (propertyId: string, value: string) => {
    setAssignments((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(propertyId)
      if (current && current.isAssigned) {
        const hours = value.trim() ? parseInt(value, 10) : 0
        const existingMins = (current.cleaningDurationMinutes || 0) % 60
        const total = hours * 60 + existingMins
        newMap.set(propertyId, {
          ...current,
          cleaningDurationMinutes: total > 0 ? total : null,
        })
      }
      return newMap
    })
  }

  const handleDurationMinsChange = (propertyId: string, value: string) => {
    setAssignments((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(propertyId)
      if (current && current.isAssigned) {
        const mins = value.trim() ? parseInt(value, 10) : 0
        const existingHours = Math.floor((current.cleaningDurationMinutes || 0) / 60)
        const total = existingHours * 60 + mins
        newMap.set(propertyId, {
          ...current,
          cleaningDurationMinutes: total > 0 ? total : null,
        })
      }
      return newMap
    })
  }

  const handleRateAmountChange = (propertyId: string, value: string) => {
    setAssignments((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(propertyId)
      if (current && current.isAssigned) {
        const numValue = value.trim() ? parseFloat(value) : null
        newMap.set(propertyId, {
          ...current,
          rateAmount: numValue,
          // Auto-set to 'flat' if user starts typing but hasn't chosen a type
          rateType: numValue !== null && !current.rateType ? 'flat' : current.rateType,
        })
      }
      return newMap
    })
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      // Build assignments array from map
      const assignmentList = Array.from(assignments.values())
        .filter((a) => a.isAssigned)
        .map((a) => ({
          propertyId: a.propertyId,
          isDefault: a.isDefault,
          priority: a.priority,
          rateType: a.rateType,
          rateAmount: a.rateAmount,
          cleaningDurationMinutes: a.cleaningDurationMinutes,
        }))

      const payload: AssignPropertiesPayload = {
        assignments: assignmentList,
      }

      const res = await assignPropertiesToCleaner(cleaner.id, payload)

      if (res.status === 'success') {
        onUpdate(res.data)
        showNotification('Property assignments updated', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Failed to update assignments', 'error')
      }
    } catch (err) {
      console.error('Error updating assignments:', err)
      showNotification('Error updating assignments', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter properties by search term
  const filteredProperties = properties.filter((property) => {
    const displayName = property.listingName || property.address
    return (
      displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.address.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  // Count assigned properties
  const assignedCount = Array.from(assignments.values()).filter((a) => a.isAssigned).length

  const getPropertyDisplayName = (property: Property) => {
    return property.listingName || property.address
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-2xl w-11/12 max-h-[80vh]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Assign Properties</h2>
          <p className="text-sm text-gray-500 mt-1">
            Select properties for <strong>{cleaner.name}</strong>
          </p>
        </div>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
          {assignedCount} assigned
        </span>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
          placeholder="Search properties..."
        />
      </div>

      {/* Properties List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading properties...</p>
          </div>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">
            {searchTerm ? 'No properties match your search' : 'No properties found'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredProperties.map((property) => {
            const assignment = assignments.get(property.id)
            const isAssigned = assignment?.isAssigned || false
            const isDefault = assignment?.isDefault || false

            return (
              <div
                key={property.id}
                className={`p-4 rounded-xl border transition-all ${
                  isAssigned
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleAssignment(property.id)}
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isAssigned
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-gray-300 hover:border-purple-400'
                      }`}
                    >
                      {isAssigned && <CheckIcon className="h-4 w-4 text-white" />}
                    </button>

                    {/* Property Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BuildingOfficeIcon className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {getPropertyDisplayName(property)}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{property.address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Default Toggle */}
                  {isAssigned && (
                    <button
                      onClick={() => toggleDefault(property.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        isDefault
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      title={isDefault ? 'Remove as default cleaner' : 'Set as default cleaner'}
                    >
                      {isDefault ? (
                        <>
                          <StarIconSolid className="h-4 w-4" />
                          Default
                        </>
                      ) : (
                        <>
                          <StarIcon className="h-4 w-4" />
                          Set Default
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Rate & Duration Configuration - shown when assigned */}
                {isAssigned && (
                  <>
                    <div className="flex items-center gap-2 mt-3 ml-9">
                      {/* Rate Type Toggle */}
                      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                        <button
                          onClick={() => handleRateTypeChange(property.id, null)}
                          className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                            assignment?.rateType === null
                              ? 'bg-gray-600 text-white'
                              : 'bg-white text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          Global
                        </button>
                        <button
                          onClick={() => handleRateTypeChange(property.id, 'flat')}
                          className={`px-2.5 py-1 text-xs font-medium border-l border-gray-200 transition-colors ${
                            assignment?.rateType === 'flat'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          Flat
                        </button>
                        <button
                          onClick={() => handleRateTypeChange(property.id, 'hourly')}
                          className={`px-2.5 py-1 text-xs font-medium border-l border-gray-200 transition-colors ${
                            assignment?.rateType === 'hourly'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          Hourly
                        </button>
                      </div>

                      {/* Amount Input - only when not using global rate */}
                      {assignment?.rateType !== null && (
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={assignment?.rateAmount ?? ''}
                            onChange={(e) => handleRateAmountChange(property.id, e.target.value)}
                            placeholder="0.00"
                            className="w-20 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <span className="text-xs text-gray-400">
                            {assignment?.rateType === 'flat' ? '/cleaning' : '/hr'}
                          </span>
                        </div>
                      )}

                      {/* Fallback info when using global rate */}
                      {assignment?.rateType === null && (
                        <span className="text-xs text-gray-400">
                          {cleaner.hourlyRate
                            ? `$${cleaner.hourlyRate.toFixed(2)}/hr`
                            : 'No global rate set'}
                        </span>
                      )}
                    </div>

                    {/* Cleaning Duration Override */}
                    <div className="flex items-center gap-2 mt-2 ml-9">
                      <span className="text-xs text-gray-500">Duration:</span>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        step="1"
                        value={assignment?.cleaningDurationMinutes ? Math.floor(assignment.cleaningDurationMinutes / 60) || '' : ''}
                        onChange={(e) => handleDurationHoursChange(property.id, e.target.value)}
                        placeholder={property.defaultCleaningDurationMinutes ? `${Math.floor(property.defaultCleaningDurationMinutes / 60)}` : '0'}
                        className="w-12 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                      />
                      <span className="text-xs text-gray-400">hr</span>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        step="1"
                        value={assignment?.cleaningDurationMinutes ? (assignment.cleaningDurationMinutes % 60) || '' : ''}
                        onChange={(e) => handleDurationMinsChange(property.id, e.target.value)}
                        placeholder={property.defaultCleaningDurationMinutes ? `${property.defaultCleaningDurationMinutes % 60}` : '0'}
                        className="w-12 px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                      />
                      <span className="text-xs text-gray-400">min</span>
                      {!assignment?.cleaningDurationMinutes && property.defaultCleaningDurationMinutes && (
                        <span className="text-xs text-gray-400">(property default)</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Default cleaner</strong> will be automatically assigned when a new cleaning
          project is created for that property. Property-specific rates override the
          cleaner&apos;s global hourly rate.
        </p>
      </div>

      {/* Footer */}
      <div className="flex justify-end space-x-4 mt-6 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || loading}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : 'Save Assignments'}
        </button>
      </div>
    </Modal>
  )
}

export default AssignPropertiesModal
