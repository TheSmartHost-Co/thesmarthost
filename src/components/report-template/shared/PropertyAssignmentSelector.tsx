'use client'

import React, { useState, useEffect, useRef } from 'react'
import { getProperties } from '@/services/propertyService'
import type { Property } from '@/services/types/property'
import { useUserStore } from '@/store/useUserStore'
import {
  BuildingOfficeIcon,
  XMarkIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'

// Minimal property info passed from parent (from template response)
interface AssignedPropertyInfo {
  propertyId: string
  listingName: string
}

interface PropertyAssignmentSelectorProps {
  assignedPropertyIds: string[]
  assignedPropertyDetails?: AssignedPropertyInfo[] // Property details from template response
  onAssign: (propertyId: string) => void
  onUnassign: (propertyId: string) => void
  disabled?: boolean
}

const PropertyAssignmentSelector: React.FC<PropertyAssignmentSelectorProps> = ({
  assignedPropertyIds,
  assignedPropertyDetails = [],
  onAssign,
  onUnassign,
  disabled = false,
}) => {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(false)
  const [propertiesLoaded, setPropertiesLoaded] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { profile } = useUserStore()

  // Load properties lazily - only when dropdown is opened for the first time
  const loadPropertiesIfNeeded = async () => {
    if (propertiesLoaded || loading || !profile?.id) return

    setLoading(true)
    try {
      const res = await getProperties(profile.id)
      if (res.status === 'success') {
        setProperties(res.data || [])
        setPropertiesLoaded(true)
      }
    } catch (error) {
      console.error('Error loading properties:', error)
    } finally {
      setLoading(false)
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown])

  // Handle dropdown toggle - load properties when opening
  const handleDropdownToggle = () => {
    if (disabled) return

    const newState = !showDropdown
    setShowDropdown(newState)

    if (newState) {
      loadPropertiesIfNeeded()
    }
  }

  // Filter properties by search term (exclude properties with no name)
  const filteredProperties = properties.filter((property) => {
    if (!property.listingName) return false
    const searchLower = searchTerm.toLowerCase()
    return (
      property.listingName.toLowerCase().includes(searchLower) ||
      (property.address && property.address.toLowerCase().includes(searchLower))
    )
  })

  const handleToggleProperty = (propertyId: string) => {
    if (assignedPropertyIds.includes(propertyId)) {
      onUnassign(propertyId)
    } else {
      onAssign(propertyId)
    }
  }

  // Get display name for an assigned property
  const getPropertyDisplayName = (propertyId: string): string => {
    // First try to get from passed-in details
    const detail = assignedPropertyDetails.find(d => d.propertyId === propertyId)
    if (detail?.listingName) return detail.listingName

    // Fall back to loaded properties if available
    const property = properties.find(p => p.id === propertyId)
    if (property?.listingName) return property.listingName

    return 'Unknown Property'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Assigned Properties
        </h3>
        <span className="text-xs text-gray-500">
          {assignedPropertyIds.length} {propertiesLoaded ? `of ${properties.length}` : ''} properties
        </span>
      </div>

      {/* Assigned properties badges */}
      {assignedPropertyIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assignedPropertyIds.map((propertyId) => (
            <div
              key={propertyId}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg"
            >
              <BuildingOfficeIcon className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800 font-medium truncate max-w-[150px]">
                {getPropertyDisplayName(propertyId)}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onUnassign(propertyId)}
                  className="p-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded"
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Property selector dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={handleDropdownToggle}
          disabled={disabled}
          className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-left hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          <span className="text-gray-500 text-sm">
            Select properties to assign...
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          />
        </button>

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-72 overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search properties..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Property list */}
            <div className="max-h-52 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Loading properties...
                  </div>
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchTerm ? 'No properties found' : 'No properties available'}
                </div>
              ) : (
                <div className="p-1">
                  {filteredProperties.map((property) => {
                    const isAssigned = assignedPropertyIds.includes(property.id)
                    return (
                      <button
                        key={property.id}
                        type="button"
                        onClick={() => handleToggleProperty(property.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          isAssigned
                            ? 'bg-blue-50 hover:bg-blue-100'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                            isAssigned
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300'
                          }`}
                        >
                          {isAssigned && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {property.listingName}
                          </div>
                          {property.address && (
                            <div className="text-xs text-gray-500 truncate">{property.address}</div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Quick actions */}
            {propertiesLoaded && properties.length > 0 && (
              <div className="p-2 border-t border-gray-100 flex justify-between">
                <button
                  type="button"
                  onClick={() => {
                    properties.forEach((p) => {
                      if (!assignedPropertyIds.includes(p.id)) {
                        onAssign(p.id)
                      }
                    })
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => {
                    assignedPropertyIds.forEach((id) => onUnassign(id))
                  }}
                  className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {assignedPropertyIds.length === 0 && (
        <p className="text-xs text-gray-500">
          Assign this template to properties so it appears when generating reports for them.
        </p>
      )}
    </div>
  )
}

export default PropertyAssignmentSelector
