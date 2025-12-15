'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import CreatePropertyModal from '@/components/property/create/createPropertyModal'
import { getProperties } from '@/services/propertyService'
import { Property } from '@/services/types/property'
import { PropertyMapping, PropertyIdentificationState } from '../types/wizard'
import { parseCsvFile } from '@/utils/csvParser'
import { ChevronRightIcon, ChevronLeftIcon, PlusCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

interface StepProps {
  uploadedFile: any
  uniqueListings?: string[]
  bookingCounts?: Record<string, number>
  propertyMappingState?: PropertyIdentificationState
  propertyMappings?: PropertyMapping[]
  onPropertyMappingComplete: (state: PropertyIdentificationState) => void
  onPropertyMappingsUpdate: (mappings: PropertyMapping[]) => void
  onNext: () => void
  onBack: () => void
  onCancel?: () => void
  canGoNext: boolean
  canGoBack: boolean
}

const PropertyIdentificationStep: React.FC<StepProps> = ({
  uploadedFile,
  uniqueListings: initialUniqueListings,
  bookingCounts: initialBookingCounts,
  propertyMappingState,
  propertyMappings: storedMappings,
  onPropertyMappingComplete,
  onPropertyMappingsUpdate,
  onNext,
  onBack,
  onCancel,
  canGoNext,
  canGoBack,
}) => {
  const user = useUserStore(state => state.profile)
  const showNotification = useNotificationStore(state => state.showNotification)

  // State for CSV analysis and properties
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState<Property[]>([])
  
  // State for CSV analysis
  const [uniqueListings, setUniqueListings] = useState<string[]>(initialUniqueListings || [])
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>(initialBookingCounts || {})
  const [csvData, setCsvData] = useState<any>(null)
  
  // Property mappings state
  const [propertyMappings, setPropertyMappings] = useState<PropertyMapping[]>(
    storedMappings || []
  )

  // Modal states
  const [showCreatePropertyModal, setShowCreatePropertyModal] = useState(false)
  const [currentListingForNewProperty, setCurrentListingForNewProperty] = useState<string | null>(null)

  // Load properties once
  useEffect(() => {
    const loadProperties = async () => {
      if (!user?.id) return

      try {
        const res = await getProperties(user.id)
        if (res.status === 'success') {
          setProperties(res.data || [])
        }
      } catch (error) {
        console.error('Error loading properties:', error)
        showNotification('Failed to load properties', 'error')
      }
    }

    loadProperties()
  }, [user, showNotification])

  // Parse CSV and extract unique listings if not already provided
  useEffect(() => {
    const analyzeCSV = async () => {
      if (!uploadedFile?.file || (initialUniqueListings && initialUniqueListings.length > 0)) {
        setLoading(false)
        return
      }

      try {
        const fileToProcess = uploadedFile.file || uploadedFile
        const data = await parseCsvFile(fileToProcess)
        setCsvData(data)

        // Find listing name column (try multiple variations)
        const listingColumnVariations = ['listing_name', 'listingname', 'property', 'property_name', 'listing']
        let listingColumnIndex = -1
        
        for (const variation of listingColumnVariations) {
          listingColumnIndex = data.headers.findIndex(h => 
            h.name.toLowerCase().replace(/\s+/g, '_') === variation
          )
          if (listingColumnIndex !== -1) break
        }

        if (listingColumnIndex === -1) {
          showNotification('Could not find listing name column in CSV', 'error')
          setLoading(false)
          return
        }

        // Extract unique listings and count bookings
        const listingsMap = new Map<string, number>()
        data.rows.forEach(row => {
          const listing = row[listingColumnIndex]?.trim()
          if (listing) {
            listingsMap.set(listing, (listingsMap.get(listing) || 0) + 1)
          }
        })

        const uniqueListingsList = Array.from(listingsMap.keys()).sort()
        const bookingCountsMap = Object.fromEntries(listingsMap)
        
        setUniqueListings(uniqueListingsList)
        setBookingCounts(bookingCountsMap)

        // Initialize property mappings if not already stored
        if (!storedMappings || storedMappings.length === 0) {
          const initialMappings = uniqueListingsList.map(listing => ({
            listingName: listing,
            propertyId: null,
            bookingCount: bookingCountsMap[listing] || 0,
          }))
          setPropertyMappings(initialMappings)
        }
      } catch (error) {
        console.error('Error analyzing CSV:', error)
        showNotification('Failed to analyze CSV file', 'error')
      } finally {
        setLoading(false)
      }
    }

    analyzeCSV()
  }, [uploadedFile, showNotification, initialUniqueListings, storedMappings])


  // Update property mapping
  const updatePropertyMapping = useCallback((listingName: string, propertyId: string | null) => {
    const newMappings = propertyMappings.map(mapping => 
      mapping.listingName === listingName 
        ? { ...mapping, propertyId, isNewProperty: false }
        : mapping
    )
    setPropertyMappings(newMappings)
    onPropertyMappingsUpdate(newMappings)
  }, [propertyMappings, onPropertyMappingsUpdate])

  // Create new property for listing
  const handleCreatePropertyForListing = (listingName: string) => {
    setCurrentListingForNewProperty(listingName)
    setShowCreatePropertyModal(true)
  }

  // Handle property created
  const handlePropertyCreated = (newProperty: Property) => {
    // Add new property to list
    setProperties(prev => [...prev, newProperty])
    
    // Map the listing to the new property
    if (currentListingForNewProperty) {
      updatePropertyMapping(currentListingForNewProperty, newProperty.id)
    }
    
    setShowCreatePropertyModal(false)
    setCurrentListingForNewProperty(null)
    showNotification('Property created successfully', 'success')
  }

  // Validation state
  const isValid = useMemo(() => {
    return propertyMappings.length > 0 && 
           propertyMappings.every(mapping => mapping.propertyId !== null)
  }, [propertyMappings])

  // Total bookings
  const totalBookings = useMemo(() => {
    return Object.values(bookingCounts).reduce((sum, count) => sum + count, 0)
  }, [bookingCounts])

  // Update parent state
  useEffect(() => {
    const state: PropertyIdentificationState = {
      uniqueListings,
      propertyMappings,
      isValid,
      totalBookings,
      bookingCounts,
    }
    onPropertyMappingComplete(state)
  }, [uniqueListings, propertyMappings, isValid, totalBookings, bookingCounts, onPropertyMappingComplete])

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Analyzing CSV file...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Property Identification</h2>
          <p className="text-gray-600">
            Map each listing in your CSV to a property in the system
          </p>
        </div>

        {/* Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900 mb-1">CSV Summary</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• Found {uniqueListings.length} unique listings</p>
                <p>• Total of {totalBookings.toLocaleString()} bookings</p>
                <p className="mt-2 font-medium">
                  {propertyMappings.filter(m => m.propertyId).length} of {uniqueListings.length} listings mapped
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Property Mappings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Map Listings to Properties</h3>
          
          <div className="space-y-3">
            {propertyMappings.map((mapping) => (
              <div 
                key={mapping.listingName}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{mapping.listingName}</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {mapping.bookingCount} booking{mapping.bookingCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-64 relative">
                      <select
                        value={mapping.propertyId || ''}
                        onChange={(e) => updatePropertyMapping(mapping.listingName, e.target.value || null)}
                        className="
                          appearance-none w-full px-3 py-2 pr-8 
                          border border-gray-300 rounded-lg bg-white
                          text-sm text-gray-900 
                          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                        "
                        required
                      >
                        <option value="">Select a property</option>
                        {properties.map((property) => (
                          <option key={property.id} value={property.id}>
                            {property.listingName} {property.address && `- ${property.address}`}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    
                    <button
                      onClick={() => handleCreatePropertyForListing(mapping.listingName)}
                      className="flex items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Create new property"
                    >
                      <PlusCircleIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={onBack}
            disabled={!canGoBack}
            className={`
              flex items-center px-4 py-2 text-sm font-medium rounded-lg
              ${canGoBack 
                ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50' 
                : 'text-gray-400 bg-gray-100 cursor-not-allowed'
              }
            `}
          >
            <ChevronLeftIcon className="w-4 h-4 mr-1" />
            Back
          </button>

          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            
            <button
              onClick={onNext}
              disabled={!isValid}
              className={`
                cursor-pointer flex items-center px-4 py-2 text-sm font-medium rounded-lg
                ${isValid 
                  ? 'text-white bg-blue-600 hover:bg-blue-700' 
                  : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                }
              `}
            >
              Continue
              <ChevronRightIcon className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Property Modal */}
      {showCreatePropertyModal && (
        <CreatePropertyModal
          isOpen={showCreatePropertyModal}
          onClose={() => {
            setShowCreatePropertyModal(false)
            setCurrentListingForNewProperty(null)
          }}
          onAdd={handlePropertyCreated}
        />
      )}
    </>
  )
}

export default PropertyIdentificationStep