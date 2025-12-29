'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  HomeIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  SignalIcon,
  UserGroupIcon,
  MapPinIcon,
  EyeIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline'
import TableActionsDropdown, { ActionItem } from '@/components/shared/TableActionsDropdown'
import { getProperties, calculatePropertyStats, formatOwnerDisplay } from '@/services/propertyService'
import { getClientsByParentId } from '@/services/clientService'
import { Property } from '@/services/types/property'
import { Client } from '@/services/types/client'
import { useUserStore } from '@/store/useUserStore'
import CreatePropertyModal from '@/components/property/create/createPropertyModal'
import UpdatePropertyModal from '@/components/property/update/updatePropertyModal'
import DeletePropertyModal from '@/components/property/delete/deletePropertyModal'
import PreviewPropertyModal from '@/components/property/preview/previewPropertyModal'
import BulkImportPropertyModal from '@/components/property/import/bulkImportPropertyModal'
import PropertyLicenseModal from '@/components/property-license/propertyLicenseModal'
import PropertyChannelModal from '@/components/property-channel/propertyChannelModal'
import PropertyOwnersModal from '@/components/property-owners/propertyOwnersModal'
import { getChannelIcon } from '@/services/channelUtils'

type ViewMode = 'grid' | 'list'
type FilterType = 'all' | 'STR' | 'LTR'
type FilterStatus = 'all' | 'active' | 'inactive'

export default function PropertyManagerPropertiesPage() {
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<FilterType>('all')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showFilters, setShowFilters] = useState(false)

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showBulkImportModal, setShowBulkImportModal] = useState(false)
  const [showLicenseModal, setShowLicenseModal] = useState(false)
  const [showChannelModal, setShowChannelModal] = useState(false)
  const [showOwnersModal, setShowOwnersModal] = useState(false)

  // Data state - properties store all aggregated data
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openedFromPreview, setOpenedFromPreview] = useState(false)

  const { profile } = useUserStore()

  // Refresh all properties from server
  const refreshProperties = useCallback(async () => {
    if (!profile?.id) return

    try {
      const propertiesRes = await getProperties(profile.id)
      setProperties(propertiesRes.data)
      // Also update selectedProperty if it exists
      if (selectedProperty) {
        const updated = propertiesRes.data.find(p => p.id === selectedProperty.id)
        if (updated) {
          setSelectedProperty(updated)
        }
      }
    } catch (err) {
      console.error('Error refreshing properties:', err)
    }
  }, [profile?.id, selectedProperty])

  // Fetch all data on mount - properties already include owners, channels, licenses
  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return

      try {
        setLoading(true)
        const [propertiesRes, clientsRes] = await Promise.all([
          getProperties(profile.id),
          getClientsByParentId(profile.id)
        ])
        setProperties(propertiesRes.data)
        setClients(clientsRes.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [profile?.id])

  // Update a property in the local state (used by modals after changes)
  const updatePropertyInState = useCallback((updatedProperty: Property) => {
    setProperties(prev => prev.map(p =>
      p.id === updatedProperty.id ? updatedProperty : p
    ))
    if (selectedProperty?.id === updatedProperty.id) {
      setSelectedProperty(updatedProperty)
    }
  }, [selectedProperty?.id])

  // Handlers for property CRUD
  const handleAddProperty = (newProperty: Property) => {
    setProperties(prev => [...prev, newProperty])
  }

  const handleBulkImportComplete = (importedProperties: Property[]) => {
    setProperties(prev => [...prev, ...importedProperties])
  }

  const handleEditProperty = (property: Property) => {
    setSelectedProperty(property)
    setShowUpdateModal(true)
  }

  const handleDeleteProperty = (property: Property) => {
    setSelectedProperty(property)
    setShowDeleteModal(true)
  }

  const handleViewProperty = (property: Property) => {
    setSelectedProperty(property)
    setShowPreviewModal(true)
  }

  const handlePropertyDeleted = (propertyId: string) => {
    setProperties(prev => prev.filter(p => p.id !== propertyId))
  }

  const handlePropertyUpdated = (updatedProperty: Property) => {
    updatePropertyInState(updatedProperty)
  }

  // Modal handlers for licenses, channels, owners (from preview modal)
  const handleManageLicenses = () => {
    setOpenedFromPreview(true)
    setShowPreviewModal(false)
    setShowLicenseModal(true)
  }

  const handleManageChannels = () => {
    setOpenedFromPreview(true)
    setShowPreviewModal(false)
    setShowChannelModal(true)
  }

  const handleManageOwners = () => {
    setOpenedFromPreview(true)
    setShowPreviewModal(false)
    setShowOwnersModal(true)
  }

  // Direct handlers for opening modals from card actions
  const handleOpenLicenses = (property: Property) => {
    setOpenedFromPreview(false)
    setSelectedProperty(property)
    setShowLicenseModal(true)
  }

  const handleOpenChannels = (property: Property) => {
    setOpenedFromPreview(false)
    setSelectedProperty(property)
    setShowChannelModal(true)
  }

  const handleOpenOwners = (property: Property) => {
    setOpenedFromPreview(false)
    setSelectedProperty(property)
    setShowOwnersModal(true)
  }

  // Unified close handlers
  const handleLicenseModalClose = () => {
    setShowLicenseModal(false)
    if (openedFromPreview) {
      setShowPreviewModal(true)
    } else {
      setSelectedProperty(null)
    }
    setOpenedFromPreview(false)
  }

  const handleChannelModalClose = () => {
    setShowChannelModal(false)
    if (openedFromPreview) {
      setShowPreviewModal(true)
    } else {
      setSelectedProperty(null)
    }
    setOpenedFromPreview(false)
  }

  const handleOwnersModalClose = () => {
    setShowOwnersModal(false)
    if (openedFromPreview) {
      setShowPreviewModal(true)
    } else {
      setSelectedProperty(null)
    }
    setOpenedFromPreview(false)
  }

  // Generate actions for table dropdown
  const getPropertyActions = (property: Property): ActionItem[] => [
    {
      label: 'Edit Property',
      icon: PencilIcon,
      onClick: () => handleEditProperty(property),
      variant: 'default'
    },
    {
      label: 'Property Licenses',
      icon: DocumentTextIcon,
      onClick: () => handleOpenLicenses(property),
      variant: 'default'
    },
    {
      label: 'Property Channels',
      icon: SignalIcon,
      onClick: () => handleOpenChannels(property),
      variant: 'default'
    },
    {
      label: 'Property Owners',
      icon: UserGroupIcon,
      onClick: () => handleOpenOwners(property),
      variant: 'default'
    },
    {
      label: 'Delete Property',
      icon: TrashIcon,
      onClick: () => handleDeleteProperty(property),
      variant: 'danger'
    }
  ]

  // Filter and sort properties
  const filteredProperties = properties
    .filter(property => {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        property.listingName.toLowerCase().includes(searchLower) ||
        property.address.toLowerCase().includes(searchLower) ||
        property.listingId.toLowerCase().includes(searchLower) ||
        (property.externalName && property.externalName.toLowerCase().includes(searchLower))
      const matchesType = typeFilter === 'all' || property.propertyType === typeFilter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && property.isActive) ||
        (statusFilter === 'inactive' && !property.isActive)
      return matchesSearch && matchesType && matchesStatus
    })
    .sort((a, b) => {
      if (a.isActive && !b.isActive) return -1
      if (!a.isActive && b.isActive) return 1
      return 0
    })

  // Calculate stats
  const stats = calculatePropertyStats(filteredProperties)

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-slate-200 rounded-full" />
            <div className="absolute inset-0 border-4 border-amber-500 rounded-full border-t-transparent animate-spin" />
          </div>
          <p className="text-slate-500 font-medium">Loading your portfolio...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XMarkIcon className="w-7 h-7 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Properties</h3>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // Stat cards configuration
  const statCards = [
    {
      label: 'Total Properties',
      value: stats.total,
      icon: HomeIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100'
    },
    {
      label: 'Active Properties',
      value: stats.active,
      icon: CheckCircleIcon,
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100'
    },
    {
      label: 'Short-Term Rentals',
      value: stats.strCount,
      icon: HomeIcon,
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100'
    },
    {
      label: 'Avg Commission',
      value: `${stats.averageCommissionRate.toFixed(1)}%`,
      icon: ChartBarIcon,
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-500 mt-1">Manage your property portfolio</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setShowBulkImportModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="cursor-pointer inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
            Import CSV
          </motion.button>
          <motion.button
            onClick={() => setShowCreateModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="cursor-pointer inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Property
          </motion.button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${stat.bgColor} border ${stat.borderColor} rounded-2xl p-5 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search and Filters Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4"
      >
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-0 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white transition-all"
              placeholder="Search by name, address, or listing ID..."
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                showFilters
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
              Filters
              {(typeFilter !== 'all' || statusFilter !== 'all') && (
                <span className="w-2 h-2 bg-amber-500 rounded-full" />
              )}
            </button>

            {/* View Toggle */}
            <div className="hidden md:flex items-center bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-sm text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Grid view"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-white shadow-sm text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="List view"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-3 pt-4 mt-4 border-t border-slate-100">
                <span className="text-sm text-slate-500">Type:</span>
                <div className="flex gap-2">
                  {(['all', 'STR', 'LTR'] as FilterType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        typeFilter === type
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {type === 'all' ? 'All Types' : type}
                    </button>
                  ))}
                </div>

                <div className="w-px h-6 bg-slate-200 mx-2 hidden sm:block" />

                <span className="text-sm text-slate-500">Status:</span>
                <div className="flex gap-2">
                  {(['all', 'active', 'inactive'] as FilterStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        statusFilter === status
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>

                {(typeFilter !== 'all' || statusFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setTypeFilter('all')
                      setStatusFilter('all')
                    }}
                    className="ml-auto text-sm text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Properties Grid/List */}
      {filteredProperties.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center"
        >
          <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <HomeIcon className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No properties found</h3>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
              : 'Get started by adding your first property to the portfolio.'}
          </p>
          {!searchTerm && typeFilter === 'all' && statusFilter === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/25 transition-all"
            >
              <PlusIcon className="h-5 w-5" />
              Add Your First Property
            </button>
          )}
        </motion.div>
      ) : viewMode === 'grid' ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {filteredProperties.map((property, index) => (
            <PropertyCard
              key={property.id}
              property={property}
              index={index}
              onView={() => handleViewProperty(property)}
              onEdit={() => handleEditProperty(property)}
              onDelete={() => handleDeleteProperty(property)}
              onManageLicenses={() => handleOpenLicenses(property)}
              onManageChannels={() => handleOpenChannels(property)}
              onManageOwners={() => handleOpenOwners(property)}
            />
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Listing ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Channels
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Licenses
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Owners
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="sticky right-0 bg-slate-50/95 backdrop-blur-sm px-6 py-4 min-w-[60px] shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProperties.map((property, index) => (
                  <motion.tr
                    key={property.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                    onClick={() => handleViewProperty(property)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          property.propertyType === 'STR'
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                            : 'bg-gradient-to-br from-purple-500 to-purple-600'
                        }`}>
                          <HomeIcon className="w-6 h-6 text-white" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate max-w-[200px]">
                            {property.listingName}
                          </p>
                          <p className="text-sm text-slate-500 truncate max-w-[200px]">
                            {property.address}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                        {property.listingId}
                      </span>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {property.channels?.slice(0, 3).map((channel, i) => (
                          <a
                            key={i}
                            href={channel.publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
                            title={`${channel.channelName} - ${channel.publicUrl}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {getChannelIcon(channel.channelName)}
                          </a>
                        ))}
                        {(property.channels?.length || 0) > 3 && (
                          <span className="text-xs text-slate-500 ml-1">
                            +{property.channels!.length - 3}
                          </span>
                        )}
                        {(!property.channels || property.channels.length === 0) && (
                          <span className="text-sm text-slate-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenLicenses(property)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          property.licenses && property.licenses.length > 0
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        <DocumentTextIcon className="w-3.5 h-3.5" />
                        {property.licenses && property.licenses.length > 0 ? (
                          <span>{property.licenses.length} {property.licenses.length === 1 ? 'license' : 'licenses'}</span>
                        ) : (
                          <span>None</span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-700">{formatOwnerDisplay(property)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        property.propertyType === 'STR'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {property.propertyType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                        property.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${property.isActive ? 'bg-green-500' : 'bg-slate-400'}`} />
                        {property.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td
                      className="sticky right-0 bg-white group-hover:bg-slate-50/95 backdrop-blur-sm px-6 py-4 whitespace-nowrap text-right shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TableActionsDropdown
                        actions={getPropertyActions(property)}
                        itemId={property.id}
                      />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Results Count */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <p className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-700">{filteredProperties.length}</span> of{' '}
              <span className="font-semibold text-slate-700">{properties.length}</span> properties
            </p>
          </div>
        </motion.div>
      )}

      {/* Results count for grid view */}
      {viewMode === 'grid' && filteredProperties.length > 0 && (
        <div className="text-center">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-700">{filteredProperties.length}</span> of{' '}
            <span className="font-semibold text-slate-700">{properties.length}</span> properties
          </p>
        </div>
      )}

      {/* Modals */}
      <CreatePropertyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAdd={handleAddProperty}
      />

      {selectedProperty && (
        <>
          <UpdatePropertyModal
            isOpen={showUpdateModal}
            onClose={() => {
              setShowUpdateModal(false)
              setSelectedProperty(null)
            }}
            property={selectedProperty}
            onUpdate={handlePropertyUpdated}
          />

          <DeletePropertyModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false)
              setSelectedProperty(null)
            }}
            property={selectedProperty}
            onDeleted={handlePropertyDeleted}
          />

          <PreviewPropertyModal
            isOpen={showPreviewModal}
            onClose={() => {
              setShowPreviewModal(false)
              setSelectedProperty(null)
            }}
            property={selectedProperty}
            onEditProperty={() => {
              setShowPreviewModal(false)
              setShowUpdateModal(true)
            }}
            onManageLicenses={handleManageLicenses}
            onManageChannels={handleManageChannels}
            onManageOwners={handleManageOwners}
          />

          <PropertyLicenseModal
            isOpen={showLicenseModal}
            onClose={handleLicenseModalClose}
            propertyId={selectedProperty.id}
            propertyName={selectedProperty.listingName}
            initialLicenses={selectedProperty.licenses}
            onRefreshProperties={refreshProperties}
          />

          <PropertyChannelModal
            isOpen={showChannelModal}
            onClose={handleChannelModalClose}
            propertyId={selectedProperty.id}
            propertyName={selectedProperty.listingName}
            initialChannels={selectedProperty.channels}
            onRefreshProperties={refreshProperties}
          />

          <PropertyOwnersModal
            isOpen={showOwnersModal}
            onClose={handleOwnersModalClose}
            property={selectedProperty}
            onRefreshProperties={refreshProperties}
          />
        </>
      )}

      <BulkImportPropertyModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onImportComplete={handleBulkImportComplete}
        existingProperties={properties}
        clients={clients}
      />
    </div>
  )
}

// Property Card Component
interface PropertyCardProps {
  property: Property
  index: number
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onManageLicenses: () => void
  onManageChannels: () => void
  onManageOwners: () => void
}

function PropertyCard({
  property,
  index,
  onView,
  onEdit,
  onDelete,
  onManageLicenses,
  onManageChannels,
  onManageOwners
}: PropertyCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const primaryOwner = property.owners.find(o => o.isPrimary)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onView}
      className={`group relative bg-white rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer ${
        property.isActive
          ? 'border-slate-200 hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50'
          : 'border-slate-200 bg-slate-50/50'
      }`}
    >
      {/* Top Section with Gradient */}
      <div className={`relative h-32 ${
        property.propertyType === 'STR'
          ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700'
          : 'bg-gradient-to-br from-purple-500 via-purple-600 to-violet-700'
      }`}>
        {/* Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`grid-${property.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#grid-${property.id})`} />
          </svg>
        </div>

        {/* Status Badge */}
        <div className="absolute top-4 left-4">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
            property.isActive
              ? 'bg-white/20 text-white'
              : 'bg-black/20 text-white/80'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${property.isActive ? 'bg-emerald-400' : 'bg-slate-400'}`} />
            {property.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Type Badge */}
        <div className="absolute top-4 right-4">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm">
            {property.propertyType}
          </span>
        </div>

        {/* Property Icon */}
        <div className="absolute -bottom-8 left-6">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-lg shadow-slate-200/50 flex items-center justify-center">
            <HomeIcon className={`w-8 h-8 ${
              property.propertyType === 'STR' ? 'text-blue-600' : 'text-purple-600'
            }`} />
          </div>
        </div>

        {/* Hover Actions */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center gap-2"
            >
              <button
                onClick={(e) => { e.stopPropagation(); onView(); }}
                className="p-3 bg-white rounded-xl hover:bg-slate-50 transition-colors shadow-lg"
                title="View Details"
              >
                <EyeIcon className="w-5 h-5 text-slate-700" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="p-3 bg-white rounded-xl hover:bg-slate-50 transition-colors shadow-lg"
                title="Edit"
              >
                <PencilIcon className="w-5 h-5 text-slate-700" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="p-3 bg-white rounded-xl hover:bg-red-50 transition-colors shadow-lg"
                title="Delete"
              >
                <TrashIcon className="w-5 h-5 text-red-600" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content Section */}
      <div className="p-6 pt-12">
        {/* Title and Address */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900 truncate mb-1" title={property.listingName}>
            {property.listingName}
          </h3>
          <div className="flex items-center gap-1.5 text-slate-500">
            <MapPinIcon className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm truncate" title={property.address}>
              {property.address}
            </span>
          </div>
        </div>

        {/* Listing ID */}
        <div className="mb-4">
          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
            #{property.listingId}
          </span>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={(e) => { e.stopPropagation(); onManageChannels(); }}
            className="flex flex-col items-center p-3 rounded-xl bg-slate-50 hover:bg-blue-50 transition-colors group/btn"
          >
            <SignalIcon className="w-5 h-5 text-slate-400 group-hover/btn:text-blue-600 mb-1" />
            <span className="text-xs font-semibold text-slate-900">{property.channels?.length || 0}</span>
            <span className="text-xs text-slate-500">Channels</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onManageLicenses(); }}
            className="flex flex-col items-center p-3 rounded-xl bg-slate-50 hover:bg-amber-50 transition-colors group/btn"
          >
            <DocumentTextIcon className="w-5 h-5 text-slate-400 group-hover/btn:text-amber-600 mb-1" />
            <span className="text-xs font-semibold text-slate-900">{property.licenses?.length || 0}</span>
            <span className="text-xs text-slate-500">Licenses</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onManageOwners(); }}
            className="flex flex-col items-center p-3 rounded-xl bg-slate-50 hover:bg-purple-50 transition-colors group/btn"
          >
            <UserGroupIcon className="w-5 h-5 text-slate-400 group-hover/btn:text-purple-600 mb-1" />
            <span className="text-xs font-semibold text-slate-900">{property.owners.length}</span>
            <span className="text-xs text-slate-500">Owners</span>
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-slate-600">
                {primaryOwner?.clientName?.charAt(0) || '?'}
              </span>
            </div>
            <span className="text-sm text-slate-600 truncate">
              {primaryOwner?.clientName || 'No owner'}
            </span>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-lg font-bold text-slate-900">{property.commissionRate || 0}%</span>
            <span className="text-xs text-slate-400 block">Commission</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
