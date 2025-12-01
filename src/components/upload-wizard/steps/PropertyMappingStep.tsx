'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  BuildingOfficeIcon,
  PlusIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { PropertyMapping, PropertyMappingState } from '../types/wizard'
import { Property } from '@/services/types/property'
import { Client } from '@/services/types/client'
import { getProperties } from '@/services/propertyService'
import { getClientsByParentId, createClient } from '@/services/clientService'
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
  propertyMappings?: PropertyMapping[] // Persisted property mappings
  onPropertyMappingsUpdate?: (mappings: PropertyMapping[]) => void // Real-time updates
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
  onPropertyMappingComplete,
  propertyMappings: persistedPropertyMappings,
  onPropertyMappingsUpdate
}) => {
  const [properties, setProperties] = useState<Property[]>([])
  const [loadingProperties, setLoadingProperties] = useState(true)
  const [propertyMappings, setPropertyMappings] = useState<PropertyMapping[]>([])
  const [showNewPropertyForms, setShowNewPropertyForms] = useState<Record<string, boolean>>({})
  
  // Client state
  const [clients, setClients] = useState<Client[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [showNewClientForms, setShowNewClientForms] = useState<Record<string, boolean>>({})
  
  // Track previous props to detect changes
  const prevPropertyMappingsRef = useRef<string | undefined>(undefined)
  const prevUniqueListingsRef = useRef<string | undefined>(undefined)
  const hasInitializedRef = useRef(false)

  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  // Initialize property mappings when component loads
  useEffect(() => {
    // Create unique keys to detect actual changes
    const currentPropertyMappingsKey = persistedPropertyMappings ? JSON.stringify(persistedPropertyMappings) : undefined
    const currentUniqueListingsKey = uniqueListings ? JSON.stringify(uniqueListings) : undefined
    
    // Check if we should restore persisted mappings
    const shouldRestorePropertyMappings = persistedPropertyMappings && 
      persistedPropertyMappings.length > 0 && 
      currentPropertyMappingsKey !== prevPropertyMappingsRef.current && 
      !hasInitializedRef.current
      
    // Check if we should initialize from unique listings
    const shouldInitializeFromListings = uniqueListings.length > 0 && 
      currentUniqueListingsKey !== prevUniqueListingsRef.current && 
      !hasInitializedRef.current && 
      (!persistedPropertyMappings || persistedPropertyMappings.length === 0)
    
    if (shouldRestorePropertyMappings) {
      setPropertyMappings(persistedPropertyMappings)
      
      // Restore form visibility states
      const newPropertyFormsState: Record<string, boolean> = {}
      const newClientFormsState: Record<string, boolean> = {}
      
      persistedPropertyMappings.forEach(mapping => {
        if (mapping.isNewProperty && mapping.newPropertyData) {
          newPropertyFormsState[mapping.listingName] = true
          if (mapping.newPropertyData.clientId === 'new' && mapping.newPropertyData.newClientData) {
            newClientFormsState[mapping.listingName] = true
          }
        }
      })
      
      setShowNewPropertyForms(newPropertyFormsState)
      setShowNewClientForms(newClientFormsState)
      prevPropertyMappingsRef.current = currentPropertyMappingsKey
      hasInitializedRef.current = true
      
      showNotification('Property mappings restored from previous session', 'info')
    } else if (shouldInitializeFromListings) {
      // Initialize with default mappings when unique listings change or first time
      const initialMappings = uniqueListings.map(listingName => ({
        listingName,
        propertyId: null,
        bookingCount: bookingCounts[listingName] || 0
      }))
      setPropertyMappings(initialMappings)
      prevUniqueListingsRef.current = currentUniqueListingsKey
      hasInitializedRef.current = true
    }
  }, [uniqueListings, bookingCounts, persistedPropertyMappings, showNotification])

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
    
    // Update the wizard state with the new mappings for real-time persistence
    if (onPropertyMappingsUpdate) {
      onPropertyMappingsUpdate(propertyMappings)
    }
  }, [propertyMappings, uniqueListings, onPropertyMappingComplete, onPropertyMappingsUpdate])

  const handlePropertySelect = (listingName: string, propertyId: string) => {
    setPropertyMappings(prev => prev.map(mapping => 
      mapping.listingName === listingName 
        ? { ...mapping, propertyId, isNewProperty: false, newPropertyData: undefined }
        : mapping
    ))

    // Hide new property form if it was showing
    setShowNewPropertyForms(prev => ({ ...prev, [listingName]: false }))
  }

  const handleCreateNewProperty = async (listingName: string) => {
    setShowNewPropertyForms(prev => ({ ...prev, [listingName]: true }))
    
    // Load clients when creating new property
    if (clients.length === 0 && profile?.id) {
      try {
        setLoadingClients(true)
        const response = await getClientsByParentId(profile.id)
        if (response.status === 'success') {
          setClients(response.data.filter(c => c.isActive))
        } else {
          showNotification('Failed to load clients', 'error')
        }
      } catch (error) {
        console.error('Error loading clients:', error)
        showNotification('Error loading clients', 'error')
      } finally {
        setLoadingClients(false)
      }
    }
    
    setPropertyMappings(prev => prev.map(mapping => 
      mapping.listingName === listingName 
        ? { 
            ...mapping, 
            propertyId: null, 
            isNewProperty: true,
            newPropertyData: {
              name: listingName, // Default to listing name
              listingId: listingName.toLowerCase().replace(/\s+/g, '-'), // Auto-generate from name
              externalName: '',
              internalName: '',
              address: '',
              postalCode: '',
              province: '',
              propertyType: 'STR',
              commissionRate: 10,
              clientId: '', // Will be selected from dropdown
              newClientData: undefined // For inline client creation
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

  const handleClientSelect = (listingName: string, clientId: string) => {
    setPropertyMappings(prev => prev.map(mapping => 
      mapping.listingName === listingName && mapping.newPropertyData
        ? { 
            ...mapping, 
            newPropertyData: { 
              ...mapping.newPropertyData, 
              clientId,
              newClientData: undefined // Clear new client data when selecting existing
            }
          }
        : mapping
    ))
    // Hide new client form if it was showing
    setShowNewClientForms(prev => ({ ...prev, [listingName]: false }))
  }

  const handleCreateNewClient = (listingName: string) => {
    setShowNewClientForms(prev => ({ ...prev, [listingName]: true }))
    setPropertyMappings(prev => prev.map(mapping => 
      mapping.listingName === listingName && mapping.newPropertyData
        ? { 
            ...mapping, 
            newPropertyData: { 
              ...mapping.newPropertyData, 
              clientId: 'new', // Special value to indicate new client
              newClientData: {
                name: '',
                email: ''
              }
            }
          }
        : mapping
    ))
  }

  const handleNewClientDataChange = (listingName: string, field: string, value: string) => {
    setPropertyMappings(prev => prev.map(mapping => 
      mapping.listingName === listingName && mapping.newPropertyData?.newClientData
        ? { 
            ...mapping, 
            newPropertyData: { 
              ...mapping.newPropertyData, 
              newClientData: { ...mapping.newPropertyData.newClientData, [field]: value }
            }
          }
        : mapping
    ))
  }

  const handleSaveNewClient = async (listingName: string) => {
    const mapping = propertyMappings.find(m => m.listingName === listingName)
    const newClientData = mapping?.newPropertyData?.newClientData
    
    if (!newClientData?.name || !newClientData?.email) {
      showNotification('Client name and email are required', 'error')
      return
    }

    if (!profile?.id) {
      showNotification('User profile not found', 'error')
      return
    }

    try {
      // Create the client immediately
      const clientResult = await createClient({
        parentId: profile.id,
        name: newClientData.name,
        email: newClientData.email
      })

      if (clientResult.status !== 'success') {
        showNotification(clientResult.message || 'Failed to create client', 'error')
        return
      }

      // Add new client to the clients list
      const newClient = clientResult.data
      setClients(prev => [...prev, newClient])

      // Update the property mapping to select the new client
      setPropertyMappings(prev => prev.map(mapping => 
        mapping.listingName === listingName && mapping.newPropertyData
          ? { 
              ...mapping, 
              newPropertyData: { 
                ...mapping.newPropertyData, 
                clientId: newClient.id,
                newClientData: undefined // Clear the form data
              }
            }
          : mapping
      ))

      // Hide the new client form
      setShowNewClientForms(prev => ({ ...prev, [listingName]: false }))
      showNotification('Client created successfully', 'success')
    } catch (error) {
      console.error('Error creating client:', error)
      showNotification('Error creating client', 'error')
    }
  }

  const handleCancelNewClient = (listingName: string) => {
    setShowNewClientForms(prev => ({ ...prev, [listingName]: false }))
    setPropertyMappings(prev => prev.map(mapping => 
      mapping.listingName === listingName && mapping.newPropertyData
        ? { 
            ...mapping, 
            newPropertyData: { 
              ...mapping.newPropertyData, 
              clientId: '',
              newClientData: undefined
            }
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
                  
                  <div className="space-y-3">
                    {/* Listing Name and Listing ID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Listing Name *
                        </label>
                        <input
                          type="text"
                          value={mapping?.newPropertyData?.name || ''}
                          onChange={(e) => handleNewPropertyDataChange(listingName, 'name', e.target.value)}
                          className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Lake Estate"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Listing ID *
                        </label>
                        <input
                          type="text"
                          value={mapping?.newPropertyData?.listingId || ''}
                          onChange={(e) => handleNewPropertyDataChange(listingName, 'listingId', e.target.value)}
                          className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., HOST-123"
                        />
                      </div>
                    </div>

                    {/* External and Internal Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          External Name
                        </label>
                        <input
                          type="text"
                          value={mapping?.newPropertyData?.externalName || ''}
                          onChange={(e) => handleNewPropertyDataChange(listingName, 'externalName', e.target.value)}
                          className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Public-facing name (optional)"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Internal Name
                        </label>
                        <input
                          type="text"
                          value={mapping?.newPropertyData?.internalName || ''}
                          onChange={(e) => handleNewPropertyDataChange(listingName, 'internalName', e.target.value)}
                          className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Internal reference (optional)"
                        />
                      </div>
                    </div>
                    
                    {/* Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address *
                      </label>
                      <input
                        type="text"
                        value={mapping?.newPropertyData?.address || ''}
                        onChange={(e) => handleNewPropertyDataChange(listingName, 'address', e.target.value)}
                        className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 123 Main St, Calgary, AB"
                      />
                    </div>

                    {/* Postal Code and Province */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Postal Code *
                        </label>
                        <input
                          type="text"
                          value={mapping?.newPropertyData?.postalCode || ''}
                          onChange={(e) => handleNewPropertyDataChange(listingName, 'postalCode', e.target.value)}
                          className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., T2P 1A1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Province *
                        </label>
                        <input
                          type="text"
                          value={mapping?.newPropertyData?.province || ''}
                          onChange={(e) => handleNewPropertyDataChange(listingName, 'province', e.target.value)}
                          className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., Alberta"
                        />
                      </div>
                    </div>

                    {/* Property Type and Commission */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Property Type *
                        </label>
                        <select
                          value={mapping?.newPropertyData?.propertyType || 'STR'}
                          onChange={(e) => handleNewPropertyDataChange(listingName, 'propertyType', e.target.value)}
                          className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="STR">STR (Short-Term Rental)</option>
                          <option value="LTR">LTR (Long-Term Rental)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Commission Rate (%) *
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={mapping?.newPropertyData?.commissionRate || 10}
                          onChange={(e) => handleNewPropertyDataChange(listingName, 'commissionRate', parseFloat(e.target.value))}
                          className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g., 15"
                        />
                      </div>
                    </div>

                    {/* Client Selection */}
                    <div className="border-t border-gray-200 pt-3 mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Property Owner (Client) *
                      </label>
                      
                      {!showNewClientForms[listingName] ? (
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 relative">
                            <select
                              value={mapping?.newPropertyData?.clientId || ''}
                              onChange={(e) => handleClientSelect(listingName, e.target.value)}
                              className="text-black w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                              disabled={loadingClients}
                            >
                              <option value="">Select property owner...</option>
                              {clients.map((client) => (
                                <option key={client.id} value={client.id}>
                                  {client.name} {client.email ? `(${client.email})` : ''}
                                </option>
                              ))}
                            </select>
                            <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                          </div>
                          
                          <button
                            onClick={() => handleCreateNewClient(listingName)}
                            className="px-4 py-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center"
                          >
                            <PlusIcon className="h-4 w-4 mr-1" />
                            New Client
                          </button>
                        </div>
                      ) : (
                        /* Inline New Client Form */
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                          <h6 className="font-medium text-blue-900">Create New Client</h6>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-blue-700 mb-1">
                                Client Name *
                              </label>
                              <input
                                type="text"
                                value={mapping?.newPropertyData?.newClientData?.name || ''}
                                onChange={(e) => handleNewClientDataChange(listingName, 'name', e.target.value)}
                                className="text-black w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., John Doe"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-blue-700 mb-1">
                                Email *
                              </label>
                              <input
                                type="email"
                                value={mapping?.newPropertyData?.newClientData?.email || ''}
                                onChange={(e) => handleNewClientDataChange(listingName, 'email', e.target.value)}
                                className="text-black w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="john@example.com"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleCancelNewClient(listingName)}
                              className="px-3 py-2 text-sm text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveNewClient(listingName)}
                              disabled={!mapping?.newPropertyData?.newClientData?.name || !mapping?.newPropertyData?.newClientData?.email}
                              className="px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Save Client
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Selected Client Display */}
                      {mapping?.newPropertyData?.clientId && mapping?.newPropertyData?.clientId !== 'new' && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                          <div className="flex items-center">
                            <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                            <div className="text-sm">
                              <span className="font-medium text-green-900">
                                {clients.find(c => c.id === mapping?.newPropertyData?.clientId)?.name}
                              </span>
                              <span className="text-green-700 ml-2">
                                • {clients.find(c => c.id === mapping?.newPropertyData?.clientId)?.email}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
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
                      disabled={
                        !mapping?.newPropertyData?.name || 
                        !mapping?.newPropertyData?.listingId || 
                        !mapping?.newPropertyData?.address || 
                        !mapping?.newPropertyData?.postalCode || 
                        !mapping?.newPropertyData?.province ||
                        !mapping?.newPropertyData?.clientId ||
                        (mapping?.newPropertyData?.clientId === 'new' && (!mapping?.newPropertyData?.newClientData?.name || !mapping?.newPropertyData?.newClientData?.email))
                      }
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