"use client"

import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon, HomeIcon } from '@heroicons/react/24/outline'
import { getProperties, calculatePropertyStats, formatOwnerDisplay } from '@/services/propertyService'
import { Property } from '@/services/types/property'
import { useUserStore } from '@/store/useUserStore'
import TableActionsDropdown, { ActionItem } from '@/components/shared/TableActionsDropdown'
import CreatePropertyModal from '@/components/property/create/createPropertyModal'
import UpdatePropertyModal from '@/components/property/update/updatePropertyModal'
import DeletePropertyModal from '@/components/property/delete/deletePropertyModal'
import PreviewPropertyModal from '@/components/property/preview/previewPropertyModal'

export default function PropertyManagerPropertiesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { profile } = useUserStore()

  useEffect(() => {
    const fetchProperties = async () => {
      if (!profile?.id) return

      try {
        setLoading(true)
        const response = await getProperties(profile.id)
        setProperties(response.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch properties')
        console.error('Error fetching properties:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProperties()
  }, [profile?.id])

  const handleAddProperty = (newProperty: Property) => {
    setProperties(prev => [...prev, newProperty])
  }

  const handleEditProperty = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId)
    if (property) {
      setSelectedProperty(property)
      setShowUpdateModal(true)
    }
  }

  const handleDeleteProperty = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId)
    if (property) {
      setSelectedProperty(property)
      setShowDeleteModal(true)
    }
  }

  const handleViewProperty = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId)
    if (property) {
      setSelectedProperty(property)
      setShowPreviewModal(true)
    }
  }

  const handlePropertyDeleted = (propertyId: string) => {
    setProperties(prev => prev.filter(p => p.id !== propertyId))
  }

  const handlePropertyUpdated = (updatedProperty: Property) => {
    setProperties(prev => prev.map(p => p.id === updatedProperty.id ? updatedProperty : p))
  }

  const getPropertyActions = (property: Property): ActionItem[] => [
    {
      label: 'Edit Property',
      icon: PencilIcon,
      onClick: () => handleEditProperty(property.id),
      variant: 'default'
    },
    {
      label: 'Delete Property',
      icon: TrashIcon,
      onClick: () => handleDeleteProperty(property.id),
      variant: 'danger'
    }
  ]

  // Filter and sort properties - inactive at bottom
  const filteredProperties = properties
    .filter(property => {
      const matchesSearch = property.listingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        property.address.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = typeFilter === 'All Types' ||
        (typeFilter === 'STR' && property.propertyType === 'STR') ||
        (typeFilter === 'LTR' && property.propertyType === 'LTR')
      const matchesStatus = statusFilter === 'All Status' ||
        (statusFilter === 'Active' && property.isActive) ||
        (statusFilter === 'Inactive' && !property.isActive)
      return matchesSearch && matchesType && matchesStatus
    })
    .sort((a, b) => {
      // Active properties first, inactive at bottom
      if (a.isActive && !b.isActive) return -1
      if (!a.isActive && b.isActive) return 1
      return 0
    })

  const getTypeBadge = (type: 'STR' | 'LTR') => {
    if (type === 'STR') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          STR
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        LTR
      </span>
    )
  }

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Active
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        Inactive
      </span>
    )
  }

  // Calculate stats
  const stats = calculatePropertyStats(filteredProperties)

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
            <p className="text-gray-600">Manage your properties</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
            <p className="text-gray-600">Manage your properties</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading properties: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
          <p className="text-gray-600">Manage your properties</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Properties</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <HomeIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Properties</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Commission</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageCommissionRate.toFixed(1)}%</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">By Type</p>
              <p className="text-lg font-bold text-gray-900">{stats.strCount} STR / {stats.ltrCount} LTR</p>
            </div>
            <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-black block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search properties..."
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-black border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option>All Types</option>
                <option>STR</option>
                <option>LTR</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-black border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex cursor-pointer items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Property
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-150">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Owners
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Commission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Status
                </th>
                <th className="relative px-6 py-3 bg-gray-50">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProperties.map((property) => (
                <tr
                  key={property.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleViewProperty(property.id)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="shrink-0 h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <HomeIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{property.listingName}</div>
                        <div className="text-sm text-gray-500">{property.address}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatOwnerDisplay(property)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTypeBadge(property.propertyType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{property.commissionRate}%</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(property.isActive)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    <TableActionsDropdown
                      actions={getPropertyActions(property)}
                      itemId={property.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProperties.length === 0 && (
            <div className="text-center py-12">
              <HomeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No properties found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating your first property.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Property Modal */}
      <CreatePropertyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAdd={handleAddProperty}
      />

      {/* Update Property Modal */}
      {selectedProperty && (
        <UpdatePropertyModal
          isOpen={showUpdateModal}
          onClose={() => {
            setShowUpdateModal(false)
            setSelectedProperty(null)
          }}
          property={selectedProperty}
          onUpdate={handlePropertyUpdated}
        />
      )}

      {/* Delete Property Modal */}
      {selectedProperty && (
        <DeletePropertyModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setSelectedProperty(null)
          }}
          property={selectedProperty}
          onDeleted={handlePropertyDeleted}
        />
      )}

      {/* Preview Property Modal */}
      {selectedProperty && (
        <PreviewPropertyModal
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false)
            setSelectedProperty(null)
          }}
          property={selectedProperty}
          onAddCoOwner={() => {
            setShowPreviewModal(false)
            setShowUpdateModal(true)
          }}
        />
      )}
    </div>
  )
}