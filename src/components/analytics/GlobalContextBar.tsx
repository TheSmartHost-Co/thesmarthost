'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarIcon,
  BuildingOffice2Icon,
  SignalIcon,
  ArrowPathIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useAnalyticsStore } from '@/store/useAnalyticsStore'
import { useUserStore } from '@/store/useUserStore'
import { getProperties } from '@/services/propertyService'
import type { Property } from '@/services/types/property'

interface GlobalContextBarProps {
  onFiltersChange: () => void
}

const CHANNEL_OPTIONS = [
  { value: 'airbnb', label: 'Airbnb', color: 'bg-red-100 text-red-700' },
  { value: 'vrbo', label: 'VRBO', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'booking', label: 'Booking.com', color: 'bg-blue-100 text-blue-700' },
  { value: 'google', label: 'Google', color: 'bg-green-100 text-green-700' },
  { value: 'direct', label: 'Direct', color: 'bg-gray-100 text-gray-700' },
  { value: 'expedia', label: 'Expedia', color: 'bg-yellow-100 text-yellow-700' }
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
    <div className="py-5 space-y-5">
      {/* First Row - Date Range and Granularity */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Date Range */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <CalendarIcon className="h-4 w-4 text-gray-400" />
            <span>Date Range</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm transition-all"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm transition-all"
            />
          </div>
          <span className="text-xs text-gray-400 hidden sm:inline">(by check-in)</span>
        </div>

        {/* Granularity Toggle */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setGranularity('daily')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              granularity === 'daily'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setGranularity('weekly')}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              granularity === 'weekly'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Weekly
          </button>
        </div>

        {/* Reset Button */}
        <motion.button
          onClick={handleResetFilters}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
        >
          <ArrowPathIcon className="h-4 w-4" />
          Reset
        </motion.button>
      </div>

      {/* Second Row - Properties and Channels (Scrollable Lists) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Properties List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BuildingOffice2Icon className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Properties</span>
              {filters.propertyIds.length > 0 && filters.propertyIds.length < properties.length && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                  {filters.propertyIds.length}
                </span>
              )}
            </div>
            <button
              onClick={handleSelectAllProperties}
              disabled={isLoadingProperties || properties.length === 0}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400"
            >
              {filters.propertyIds.length === properties.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {isLoadingProperties ? (
            <div className="h-32 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center">
              <span className="text-sm text-gray-500">Loading properties...</span>
            </div>
          ) : properties.length === 0 ? (
            <div className="h-32 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center">
              <span className="text-sm text-gray-500">No properties available</span>
            </div>
          ) : (
            <div className="max-h-32 overflow-y-auto bg-gray-50 border border-gray-200 rounded-xl p-2 space-y-1">
              {properties.map((property) => (
                <label
                  key={property.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer transition-colors"
                >
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={filters.propertyIds.includes(property.id)}
                      onChange={(e) => handlePropertyChange(property.id, e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                      filters.propertyIds.includes(property.id)
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}>
                      {filters.propertyIds.includes(property.id) && (
                        <CheckIcon className="h-2.5 w-2.5 text-white" />
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-700 truncate">{property.listingName}</span>
                </label>
              ))}
            </div>
          )}

          {filters.propertyIds.length === 0 && properties.length > 0 && (
            <p className="text-xs text-gray-400">
              No properties selected - showing all {properties.length} properties
            </p>
          )}
        </div>

        {/* Channels List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SignalIcon className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Channels</span>
              {filters.platforms.length > 0 && filters.platforms.length < CHANNEL_OPTIONS.length && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-green-600 rounded-full">
                  {filters.platforms.length}
                </span>
              )}
            </div>
            <button
              onClick={handleSelectAllChannels}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              {filters.platforms.length === CHANNEL_OPTIONS.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="max-h-32 overflow-y-auto bg-gray-50 border border-gray-200 rounded-xl p-2 space-y-1">
            {CHANNEL_OPTIONS.map((channel) => (
              <label
                key={channel.value}
                className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer transition-colors"
              >
                <div className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={filters.platforms.includes(channel.value)}
                    onChange={(e) => handleChannelChange(channel.value, e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                    filters.platforms.includes(channel.value)
                      ? 'bg-green-600 border-green-600'
                      : 'border-gray-300 hover:border-green-400'
                  }`}>
                    {filters.platforms.includes(channel.value) && (
                      <CheckIcon className="h-2.5 w-2.5 text-white" />
                    )}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${channel.color}`}>
                  {channel.label}
                </span>
              </label>
            ))}
          </div>

          {filters.platforms.length === 0 && (
            <p className="text-xs text-gray-400">
              No channels selected - showing all {CHANNEL_OPTIONS.length} channels
            </p>
          )}
        </div>
      </div>

      {/* Active Filters Summary */}
      {(filters.propertyIds.length > 0 || filters.platforms.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100"
        >
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Filters:</span>

          {filters.propertyIds.length > 0 && filters.propertyIds.length < properties.length && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700">
              <BuildingOffice2Icon className="h-3.5 w-3.5" />
              {filters.propertyIds.length} {filters.propertyIds.length === 1 ? 'property' : 'properties'}
            </span>
          )}

          {filters.platforms.length > 0 && filters.platforms.length < CHANNEL_OPTIONS.length && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-700">
              <SignalIcon className="h-3.5 w-3.5" />
              {filters.platforms.length} {filters.platforms.length === 1 ? 'channel' : 'channels'}
            </span>
          )}
        </motion.div>
      )}
    </div>
  )
}
