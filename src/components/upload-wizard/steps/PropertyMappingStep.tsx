'use client'

import React, { useState, useEffect } from 'react'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  BuildingOfficeIcon,
  PlusIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { PropertyMapping, PropertyMappingState } from '../types/wizard'
import { Property } from '@/services/types/property'
import { getProperties } from '@/services/propertyService'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'

interface PropertyMappingStepProps {
  onNext?: () => void
  onBack?: () => void
  onCancel?: () => void
  canGoNext?: boolean
  canGoBack?: boolean
  config?: any
  uniqueListings?: string[]
  bookingCounts?: Record<string, number>
  propertyMappingState?: PropertyMappingState
  onPropertyMappingComplete?: (state: PropertyMappingState) => void
}

const PropertyMappingStep: React.FC<PropertyMappingStepProps> = ({
  onNext,
  onBack,
  onCancel,
  canGoNext,
  canGoBack,
  uniqueListings = [],
  bookingCounts = {},
  propertyMappingState,
  onPropertyMappingComplete
}) => {
  const [properties, setProperties] = useState<Property[]>([])
  const [loadingProperties, setLoadingProperties] = useState(true)
  const [propertyMappings, setPropertyMappings] = useState<PropertyMapping[]>([])
  const [showNewPropertyForms, setShowNewPropertyForms] = useState<Record<string, boolean>>({})

  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  // Initialize property mappings when component loads
  useEffect(() => {
    if (uniqueListings.length > 0) {
      const initialMappings = uniqueListings.map(listingName => ({
        listingName,
        propertyId: null,
        bookingCount: bookingCounts[listingName] || 0
      }))
      setPropertyMappings(initialMappings)
    }
  }, [uniqueListings, bookingCounts])

  // Load user's existing properties
  useEffect(() => {
    const loadProperties = async () => {
      if (!profile?.id) return

      try {
        setLoadingProperties(true)
        const response = await getProperties(profile.id)
        if (response.status === 'success') {
          setProperties(response.data)
        } else {
          showNotification(response.message || 'Failed to load properties', 'error')
        }
      } catch (error) {
        console.error('Error loading properties:', error)
        showNotification('Error loading properties', 'error')
      } finally {
        setLoadingProperties(false)
      }
    }

    loadProperties()
  }, [profile?.id, showNotification])

  // Update parent component when mappings change
  useEffect(() => {
    const isValid = propertyMappings.every(mapping => 
      mapping.propertyId !== null || mapping.isNewProperty
    )

    const totalBookings = propertyMappings.reduce((sum, mapping) => 
      sum + (mapping.bookingCount || 0), 0
    )

    const mappingState: PropertyMappingState = {
      uniqueListings,
      propertyMappings,
      isValid,
      totalBookings
    }

    onPropertyMappingComplete?.(mappingState)
  }, [propertyMappings, uniqueListings, onPropertyMappingComplete])

  const handlePropertySelect = (listingName: string, propertyId: string) => {
    setPropertyMappings(prev => prev.map(mapping => 
      mapping.listingName === listingName 
        ? { ...mapping, propertyId, isNewProperty: false, newPropertyData: undefined }
        : mapping
    ))

    // Hide new property form if it was showing
    setShowNewPropertyForms(prev => ({ ...prev, [listingName]: false }))
  }

  const handleCreateNewProperty = (listingName: string) => {
    setShowNewPropertyForms(prev => ({ ...prev, [listingName]: true }))
    
    setPropertyMappings(prev => prev.map(mapping => 
      mapping.listingName === listingName 
        ? { 
            ...mapping, 
            propertyId: null, 
            isNewProperty: true,
            newPropertyData: {
              name: listingName, // Default to listing name
              address: '',
              propertyType: 'STR',
              commissionRate: 10
            }
          }
        : mapping
    ))
  }

  const handleNewPropertyDataChange = (listingName: string, field: string, value: any) => {
    setPropertyMappings(prev => prev.map(mapping => 
      mapping.listingName === listingName && mapping.newPropertyData
        ? { 
            ...mapping, 
            newPropertyData: { ...mapping.newPropertyData, [field]: value }
          }
        : mapping
    ))
  }

  const handleCancelNewProperty = (listingName: string) => {
    setShowNewPropertyForms(prev => ({ ...prev, [listingName]: false }))
    setPropertyMappings(prev => prev.map(mapping => 
      mapping.listingName === listingName 
        ? { ...mapping, propertyId: null, isNewProperty: false, newPropertyData: undefined }
        : mapping
    ))
  }

  const getSelectedProperty = (listingName: string): Property | undefined => {
    const mapping = propertyMappings.find(m => m.listingName === listingName)
    return properties.find(p => p.id === mapping?.propertyId)
  }

  const isMappingComplete = propertyMappings.every(mapping => 
    mapping.propertyId !== null || mapping.isNewProperty
  )

  const totalBookings = propertyMappings.reduce((sum, mapping) => 
    sum + (mapping.bookingCount || 0), 0
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center">
          <BuildingOfficeIcon className="h-6 w-6 mr-2" />
          Map Properties to Listings
        </h2>
        <p className="text-gray-600">
          We found {uniqueListings.length} unique properties in your CSV. 
          Map each listing name to an existing property or create new ones.
        </p>
      </div>

      {/* Summary Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-blue-900">Import Summary</h3>
            <p className="text-sm text-blue-700">
              {uniqueListings.length} unique properties • {totalBookings || 'Multiple'} bookings
            </p>
          </div>
          <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
        </div>
      </div>

      {/* Property Mapping List */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Property Mappings</h3>
        
        {uniqueListings.map((listingName, index) => {
          const mapping = propertyMappings.find(m => m.listingName === listingName)
          const selectedProperty = getSelectedProperty(listingName)
          const showNewForm = showNewPropertyForms[listingName]

          return (
            <div key={listingName} className="bg-white border border-gray-200 rounded-lg p-4">
              {/* Listing Header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">"{listingName}"</h4>
                  <p className="text-sm text-gray-500">
                    {mapping?.bookingCount || 0} bookings
                  </p>
                </div>
                {mapping?.propertyId || mapping?.isNewProperty ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                )}
              </div>

              {/* Property Selection */}
              {!showNewForm ? (
                <div className="space-y-3">
                  {/* Property Dropdown */}
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 relative">
                      <select
                        value={mapping?.propertyId || ''}
                        onChange={(e) => handlePropertySelect(listingName, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-gray-900"
                        disabled={loadingProperties}
                      >
                        <option value="">Select existing property...</option>
                        {properties.map((property) => (
                          <option key={property.id} value={property.id}>
                            {property.listingName} ({property.address})
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                    
                    <button
                      onClick={() => handleCreateNewProperty(listingName)}
                      className="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      New Property
                    </button>
                  </div>

                  {/* Selected Property Display */}
                  {selectedProperty && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                        <div className="text-sm">
                          <span className="font-medium text-green-900">{selectedProperty.listingName}</span>
                          <span className="text-green-700 ml-2">• {selectedProperty.address}</span>
                          <span className="text-green-600 ml-2">• {selectedProperty.propertyType}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* New Property Form */
                <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900">Create New Property</h5>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Property Name
                      </label>
                      <input
                        type="text"
                        value={mapping?.newPropertyData?.name || ''}
                        onChange={(e) => handleNewPropertyDataChange(listingName, 'name', e.target.value)}
                        className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter property name"
                      />
                    </div>
                    
                    <div>
                      <label className="text-black block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        value={mapping?.newPropertyData?.address || ''}
                        onChange={(e) => handleNewPropertyDataChange(listingName, 'address', e.target.value)}
                        className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter property address"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Property Type
                      </label>
                      <select
                        value={mapping?.newPropertyData?.propertyType || 'STR'}
                        onChange={(e) => handleNewPropertyDataChange(listingName, 'propertyType', e.target.value)}
                        className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="STR">Short-term Rental (STR)</option>
                        <option value="LTR">Long-term Rental (LTR)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Commission Rate (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={mapping?.newPropertyData?.commissionRate || 10}
                        onChange={(e) => handleNewPropertyDataChange(listingName, 'commissionRate', parseFloat(e.target.value))}
                        className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      onClick={() => handleCancelNewProperty(listingName)}
                      className="px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setShowNewPropertyForms(prev => ({ ...prev, [listingName]: false }))}
                      disabled={!mapping?.newPropertyData?.name || !mapping?.newPropertyData?.address}
                      className="text-black px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save Property
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onBack}
          disabled={!canGoBack}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Back to Field Mapping
        </button>
        
        <div className="flex items-center space-x-3">
          {isMappingComplete ? (
            <div className="flex items-center text-green-600">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">All properties mapped</span>
            </div>
          ) : (
            <div className="flex items-center text-yellow-600">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Map all properties to continue</span>
            </div>
          )}
          
          <button
            onClick={onNext}
            disabled={!canGoNext || !isMappingComplete}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue to Preview
          </button>
        </div>
      </div>
    </div>
  )
}

export default PropertyMappingStep