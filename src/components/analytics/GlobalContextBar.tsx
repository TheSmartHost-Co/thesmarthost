'use client'

import { useEffect, useState } from 'react'
import { useAnalyticsStore } from '@/store/useAnalyticsStore'
import { useUserStore } from '@/store/useUserStore'
import { getProperties } from '@/services/propertyService'
import type { Property } from '@/services/types/property'

interface GlobalContextBarProps {
  onFiltersChange: () => void
}

const CHANNEL_OPTIONS = [
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'vrbo', label: 'VRBO' },
  { value: 'booking', label: 'Booking.com' },
  { value: 'google', label: 'Google' },
  { value: 'direct', label: 'Direct' },
  { value: 'expedia', label: 'Expedia' }
]

export function GlobalContextBar({ onFiltersChange }: GlobalContextBarProps) {
  const { profile: userProfile } = useUserStore()
  const { 
    filters, 
    granularity,
    setFilters, 
    setGranularity 
  } = useAnalyticsStore()
  
  const [properties, setProperties] = useState<Property[]>([])
  const [isLoadingProperties, setIsLoadingProperties] = useState(false)

  useEffect(() => {
    const loadProperties = async () => {
      if (!userProfile?.id) return

      setIsLoadingProperties(true)
      try {
        const res = await getProperties(userProfile.id)
        if (res.status === 'success') {
          setProperties(res.data)
        }
      } catch (error) {
        console.error('Failed to load properties:', error)
      } finally {
        setIsLoadingProperties(false)
      }
    }

    loadProperties()
  }, [userProfile?.id])

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setFilters({ [field]: value })
  }

  const handlePropertyChange = (propertyId: string, isChecked: boolean) => {
    const newPropertyIds = isChecked
      ? [...filters.propertyIds, propertyId]
      : filters.propertyIds.filter(id => id !== propertyId)
    
    setFilters({ propertyIds: newPropertyIds })
  }

  const handleChannelChange = (platform: string, isChecked: boolean) => {
    const newPlatforms = isChecked
      ? [...filters.platforms, platform]
      : filters.platforms.filter(p => p !== platform)
    
    setFilters({ platforms: newPlatforms })
  }

  const handleSelectAllProperties = () => {
    const allSelected = filters.propertyIds.length === properties.length
    setFilters({ 
      propertyIds: allSelected ? [] : properties.map(p => p.id) 
    })
  }

  const handleSelectAllChannels = () => {
    const allSelected = filters.platforms.length === CHANNEL_OPTIONS.length
    setFilters({ 
      platforms: allSelected ? [] : CHANNEL_OPTIONS.map(c => c.value) 
    })
  }

  const handleResetFilters = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const currentMonth = {
      startDate: `${year}-${month}-01`,
      endDate: new Date(year, now.getMonth() + 1, 0).toISOString().split('T')[0]
    }
    
    setFilters({
      ...currentMonth,
      propertyIds: [],
      platforms: []
    })
  }

  return (
    <div className="py-4 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        
        {/* Date Range */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Date Range:</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleDateChange('startDate', e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleDateChange('endDate', e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <span className="text-xs text-gray-500 ml-1">(check-in date)</span>
        </div>

        {/* Granularity Toggle */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">View:</label>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as 'daily' | 'weekly')}
            className="px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>

        {/* Reset Button */}
        <button
          onClick={handleResetFilters}
          className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Reset Filters
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Properties */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Properties:</label>
            <button
              onClick={handleSelectAllProperties}
              className="text-xs text-blue-600 hover:text-blue-700"
              disabled={isLoadingProperties || properties.length === 0}
            >
              {filters.propertyIds.length === properties.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          {isLoadingProperties ? (
            <div className="text-sm text-gray-500">Loading properties...</div>
          ) : properties.length === 0 ? (
            <div className="text-sm text-gray-500">No properties available</div>
          ) : (
            <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
              {properties.map((property) => (
                <label key={property.id} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.propertyIds.includes(property.id)}
                    onChange={(e) => handlePropertyChange(property.id, e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">{property.listingName}</span>
                </label>
              ))}
            </div>
          )}
          
          {filters.propertyIds.length === 0 && properties.length > 0 && (
            <div className="text-xs text-gray-500">
              No properties selected - showing all properties
            </div>
          )}
        </div>

        {/* Channels */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Channels:</label>
            <button
              onClick={handleSelectAllChannels}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              {filters.platforms.length === CHANNEL_OPTIONS.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          
          <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
            {CHANNEL_OPTIONS.map((channel) => (
              <label key={channel.value} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.platforms.includes(channel.value)}
                  onChange={(e) => handleChannelChange(channel.value, e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">{channel.label}</span>
              </label>
            ))}
          </div>
          
          {filters.platforms.length === 0 && (
            <div className="text-xs text-gray-500">
              No channels selected - showing all channels
            </div>
          )}
        </div>
      </div>

      {/* Active Filters Summary */}
      {(filters.propertyIds.length > 0 || filters.platforms.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          <span className="text-xs font-medium text-gray-600">Active filters:</span>
          
          {filters.propertyIds.length > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              {filters.propertyIds.length} {filters.propertyIds.length === 1 ? 'property' : 'properties'}
            </span>
          )}
          
          {filters.platforms.length > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              {filters.platforms.length} {filters.platforms.length === 1 ? 'channel' : 'channels'}
            </span>
          )}
        </div>
      )}
    </div>
  )
}