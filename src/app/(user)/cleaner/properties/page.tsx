'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BuildingOfficeIcon,
  MapPinIcon,
  StarIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { useUserStore } from '@/store/useUserStore'
import { getCleanerByAuthUserId } from '@/services/cleanerService'
import type { Cleaner, CleanerProperty } from '@/services/types/cleaner'

export default function CleanerPropertiesPage() {
  const { profile } = useUserStore()

  // State
  const [cleaner, setCleaner] = useState<Cleaner | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch cleaner data on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return

      setLoading(true)
      setError(null)

      try {
        const cleanerRes = await getCleanerByAuthUserId(profile.id)
        if (cleanerRes.status === 'success' && cleanerRes.data) {
          setCleaner(cleanerRes.data)
        } else {
          setError(cleanerRes.message || 'Could not find your cleaner profile')
        }
      } catch (err) {
        console.error('Error fetching cleaner data:', err)
        setError('Failed to load your properties')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [profile?.id])

  // Filter properties by search term
  const filteredProperties = (cleaner?.assignedProperties || []).filter(property => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      property.propertyName?.toLowerCase().includes(searchLower) ||
      property.propertyAddress?.toLowerCase().includes(searchLower)
    )
  })

  // Sort: default (primary) properties first, then by priority
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    // Primary (default) properties first
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1
    // Then by priority (lower number = higher priority)
    return a.priority - b.priority
  })

  const totalProperties = cleaner?.assignedProperties?.length || 0
  const primaryProperties = cleaner?.assignedProperties?.filter(p => p.isDefault).length || 0

  // Loading state
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-5 w-64 bg-gray-100 rounded-lg animate-pulse mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 h-48 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Properties</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1">Properties assigned to you for cleaning</p>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-2xl p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ExclamationCircleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Error loading properties</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-5 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Properties</h1>
        <p className="text-sm sm:text-base text-gray-500 mt-0.5 sm:mt-1">Properties assigned to you for cleaning</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-5 sm:mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <BuildingOfficeIcon className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Total Properties</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{totalProperties}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <StarIconSolid className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Primary Cleaner</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{primaryProperties}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search */}
      {totalProperties > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-5 sm:mb-6"
        >
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 min-h-[44px] bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="Search properties..."
            />
          </div>
        </motion.div>
      )}

      {/* Properties Grid */}
      {sortedProperties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {sortedProperties.map((property, index) => (
            <PropertyCard
              key={property.id}
              property={property}
              index={index}
              cleanerHourlyRate={cleaner?.hourlyRate}
            />
          ))}
        </div>
      ) : totalProperties > 0 ? (
        // Search returned no results
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No properties found</h3>
          <p className="text-gray-500">Try adjusting your search term</p>
        </motion.div>
      ) : (
        // No properties assigned
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center"
        >
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BuildingOfficeIcon className="w-8 h-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No properties assigned</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            Your property manager will assign properties to you. Check back later or contact them for assignments.
          </p>
        </motion.div>
      )}
    </div>
  )
}

// Property Card Component
function PropertyCard({
  property,
  index,
  cleanerHourlyRate,
}: {
  property: CleanerProperty
  index: number
  cleanerHourlyRate?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + index * 0.05 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-5 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <BuildingOfficeIcon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-white truncate">
                {property.propertyName || 'Unnamed Property'}
              </h3>
            </div>
          </div>
          {property.isDefault && (
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-400 rounded-lg">
              <StarIconSolid className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-semibold text-white">Primary</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Address */}
        {property.propertyAddress && (
          <div className="flex items-start gap-2 text-sm text-gray-600 mb-4">
            <MapPinIcon className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2">{property.propertyAddress}</span>
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`
            inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold
            ${property.isDefault
              ? 'bg-amber-100 text-amber-700'
              : 'bg-gray-100 text-gray-600'
            }
          `}>
            {property.isDefault ? (
              <>
                <StarIconSolid className="w-3.5 h-3.5" />
                Primary Cleaner
              </>
            ) : (
              <>
                <StarIcon className="w-3.5 h-3.5" />
                Backup Cleaner
              </>
            )}
          </span>

          {/* Rate Badge */}
          {property.rateType === 'flat' && property.rateAmount != null ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700">
              <CurrencyDollarIcon className="w-3.5 h-3.5" />
              ${property.rateAmount.toFixed(2)} / cleaning
            </span>
          ) : property.rateType === 'hourly' && property.rateAmount != null ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700">
              <CurrencyDollarIcon className="w-3.5 h-3.5" />
              ${property.rateAmount.toFixed(2)} / hr
            </span>
          ) : cleanerHourlyRate ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600">
              <CurrencyDollarIcon className="w-3.5 h-3.5" />
              ${cleanerHourlyRate.toFixed(2)} / hr (default)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-600">
              <CurrencyDollarIcon className="w-3.5 h-3.5" />
              Rate not set
            </span>
          )}
        </div>

        {/* Info text */}
        <p className="text-xs text-gray-400 mt-3">
          {property.isDefault
            ? 'You are the primary cleaner for this property'
            : 'You are a backup cleaner for this property'
          }
        </p>
      </div>
    </motion.div>
  )
}
