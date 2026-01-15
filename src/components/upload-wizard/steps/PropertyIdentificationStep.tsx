'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import CreatePropertyModal from '@/components/property/create/createPropertyModal'
import SearchableSelect, { SearchableSelectOption } from '@/components/shared/SearchableSelect'
import { getProperties } from '@/services/propertyService'
import { Property } from '@/services/types/property'
import { PropertyMapping, PropertyIdentificationState } from '../types/wizard'
import { parseCsvFile } from '@/utils/csvParser'
import { ChevronRightIcon, ChevronLeftIcon, ChevronDownIcon, PlusCircleIcon, XCircleIcon, BookmarkIcon } from '@heroicons/react/24/outline'

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
  onSaveDraft?: () => void
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
  onSaveDraft,
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

  // Toggle exclude listing
  const toggleExcludeListing = useCallback((listingName: string) => {
    const newMappings = propertyMappings.map(mapping =>
      mapping.listingName === listingName
        ? { ...mapping, isExcluded: !mapping.isExcluded }
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

  // Validation state - only check non-excluded listings
  const isValid = useMemo(() => {
    const activeMappings = propertyMappings.filter(m => !m.isExcluded)
    return activeMappings.length > 0 &&
           activeMappings.every(mapping => mapping.propertyId !== null)
  }, [propertyMappings])

  // Total bookings
  const totalBookings = useMemo(() => {
    return Object.values(bookingCounts).reduce((sum, count) => sum + count, 0)
  }, [bookingCounts])

  // Convert properties to SearchableSelect options
  const propertyOptions: SearchableSelectOption<string>[] = useMemo(() => {
    return properties.map(property => ({
      value: property.id,
      label: property.listingName || property.address,
      secondaryLabel: property.listingName ? property.address : undefined,
    }))
  }, [properties])

  // Filter out excluded listings for parent state
  const activeMappings = useMemo(() => {
    return propertyMappings.filter(m => !m.isExcluded)
  }, [propertyMappings])

  const activeBookingsCount = useMemo(() => {
    return activeMappings.reduce((sum, m) => sum + (m.bookingCount || 0), 0)
  }, [activeMappings])

  // Update parent state - only pass non-excluded listings
  useEffect(() => {
    const state: PropertyIdentificationState = {
      uniqueListings: activeMappings.map(m => m.listingName),
      propertyMappings: activeMappings,
      isValid,
      totalBookings: activeBookingsCount,
      bookingCounts: Object.fromEntries(
        activeMappings.map(m => [m.listingName, m.bookingCount || 0])
      ),
    }
    onPropertyMappingComplete(state)
  }, [activeMappings, isValid, activeBookingsCount, onPropertyMappingComplete])

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
      <div className="flex flex-col h-full">
        {/* Scrollable Content - with bottom padding for fixed footer */}
        <div className="flex-1 overflow-auto p-8 pb-24">
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
                  {activeMappings.filter(m => m.propertyId).length} of {activeMappings.length} listings mapped
                  {propertyMappings.some(m => m.isExcluded) && (
                    <span className="text-gray-500 font-normal ml-1">
                      ({propertyMappings.filter(m => m.isExcluded).length} excluded)
                    </span>
                  )}
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
                className={`
                  bg-white border rounded-lg p-4 transition-all
                  ${mapping.isExcluded
                    ? 'border-gray-200 bg-gray-50 opacity-60'
                    : 'border-gray-200'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className={`text-sm font-medium ${mapping.isExcluded ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {mapping.listingName}
                    </h4>
                    <p className={`text-sm mt-1 ${mapping.isExcluded ? 'text-gray-400' : 'text-gray-500'}`}>
                      {mapping.bookingCount} booking{mapping.bookingCount !== 1 ? 's' : ''}
                      {mapping.isExcluded && <span className="ml-2 text-red-400">(Excluded)</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!mapping.isExcluded && (
                      <>
                        <div className="w-72">
                          <SearchableSelect
                            options={propertyOptions}
                            value={mapping.propertyId}
                            onChange={(value) => updatePropertyMapping(mapping.listingName, value)}
                            placeholder="Select a property..."
                            emptyText="No properties found"
                          />
                        </div>

                        <button
                          onClick={() => handleCreatePropertyForListing(mapping.listingName)}
                          className="flex items-center px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Create new property"
                        >
                          <PlusCircleIcon className="w-5 h-5" />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => toggleExcludeListing(mapping.listingName)}
                      className={`
                        flex items-center px-2 py-2 text-sm rounded-lg transition-colors cursor-pointer
                        ${mapping.isExcluded
                          ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                          : 'text-red-500 hover:text-red-600 hover:bg-red-50'
                        }
                      `}
                      title={mapping.isExcluded ? 'Include this listing' : 'Exclude this listing'}
                    >
                      <XCircleIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        </div>

        {/* Fixed Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-8 py-4 z-50">
          <div className="flex justify-between">
            <div className="flex gap-2">
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

              {onSaveDraft && (
                <button
                  onClick={onSaveDraft}
                  className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <BookmarkIcon className="w-4 h-4 mr-1.5" />
                  Save Draft
                </button>
              )}
            </div>

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