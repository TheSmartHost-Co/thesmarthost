'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getProperties } from '@/services/propertyService'
import {
  getAllSupplyLists,
  fulfillSupplyList,
  deleteSupplyList,
  formatSupplyListAge,
} from '@/services/supplyListService'
import type { Property } from '@/services/types/property'
import type { SupplyList, SupplyListStatus } from '@/services/types/supplyList'
import { SUPPLY_LIST_STATUS_INFO } from '@/services/types/supplyList'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CalendarDaysIcon,
  ShoppingCartIcon,
  ClockIcon,
  CheckCircleIcon,
  CubeIcon,
  RectangleStackIcon,
  EyeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import TableActionsDropdown, { ActionItem } from '@/components/shared/TableActionsDropdown'
import ViewSupplyListsModal from '@/components/turnover/supply-lists/ViewSupplyListsModal'

export default function SupplyListsPage() {
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  // Data state
  const [supplyLists, setSupplyLists] = useState<SupplyList[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<SupplyListStatus | ''>('')
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const filterPopoverRef = useRef<HTMLDivElement>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Modal state
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedProjectName, setSelectedProjectName] = useState('')

  // Load initial data
  useEffect(() => {
    if (profile?.id) {
      loadData()
    }
  }, [profile?.id])

  // Close filter popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setShowFilterPopover(false)
      }
    }

    if (showFilterPopover) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilterPopover])

  const loadData = async () => {
    if (!profile?.id) return

    setLoading(true)
    setError(null)

    try {
      const [propertiesRes, supplyListsRes] = await Promise.all([
        getProperties(profile.id),
        getAllSupplyLists(profile.id),
      ])

      if (propertiesRes.status === 'success') {
        setProperties(propertiesRes.data || [])
      }

      if (supplyListsRes.status === 'success') {
        setSupplyLists(supplyListsRes.data || [])
      } else {
        setError(supplyListsRes.message || 'Failed to load supply lists')
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const reloadSupplyLists = async () => {
    if (!profile?.id) return

    try {
      const statusFilter = filterStatus || undefined
      const res = await getAllSupplyLists(profile.id, statusFilter)
      if (res.status === 'success') {
        setSupplyLists(res.data || [])
        setCurrentPage(1)
      } else {
        showNotification(res.message || 'Failed to load supply lists', 'error')
      }
    } catch (err) {
      console.error('Error reloading supply lists:', err)
      showNotification('Failed to reload supply lists', 'error')
    }
  }

  // Reload when status filter changes (server-side filter)
  useEffect(() => {
    if (profile?.id && !loading) {
      reloadSupplyLists()
    }
  }, [filterStatus])

  const handleFulfill = async (supplyListId: string) => {
    try {
      const res = await fulfillSupplyList(supplyListId)
      if (res.status === 'success') {
        setSupplyLists(prev => prev.map(sl => sl.id === supplyListId ? res.data : sl))
        showNotification('Supply list marked as fulfilled', 'success')
      } else {
        showNotification(res.message || 'Failed to fulfill supply list', 'error')
      }
    } catch (err) {
      console.error('Error fulfilling supply list:', err)
      showNotification('Error fulfilling supply list', 'error')
    }
  }

  const handleDelete = async (supplyListId: string) => {
    try {
      const res = await deleteSupplyList(supplyListId)
      if (res.status === 'success') {
        setSupplyLists(prev => prev.filter(sl => sl.id !== supplyListId))
        showNotification('Supply list deleted', 'success')
      } else {
        showNotification(res.message || 'Failed to delete supply list', 'error')
      }
    } catch (err) {
      console.error('Error deleting supply list:', err)
      showNotification('Error deleting supply list', 'error')
    }
  }

  const handleViewDetails = (sl: SupplyList) => {
    setSelectedProjectId(sl.projectId)
    setSelectedProjectName(sl.propertyName || 'Supply List')
    setShowViewModal(true)
  }

  const getSupplyListActions = (sl: SupplyList): ActionItem[] => {
    const actions: ActionItem[] = [
      {
        label: 'View Details',
        icon: EyeIcon,
        onClick: () => handleViewDetails(sl),
        variant: 'default',
      },
    ]

    if (sl.status === 'pending' || sl.status === 'in_progress') {
      actions.push({
        label: 'Fulfill',
        icon: CheckCircleIcon,
        onClick: () => handleFulfill(sl.id),
        variant: 'default',
      })
    }

    actions.push({
      label: 'Delete',
      icon: TrashIcon,
      onClick: () => handleDelete(sl.id),
      variant: 'danger',
    })

    return actions
  }

  const clearFilters = () => {
    setFilterStatus('')
    setSelectedPropertyId('')
    setFilterStartDate('')
    setFilterEndDate('')
    setCurrentPage(1)
  }

  // Client-side filtering (search, property, date range)
  const filteredLists = supplyLists.filter(sl => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const itemNames = sl.items.map(i => i.name.toLowerCase()).join(' ')
      if (
        !sl.propertyName?.toLowerCase().includes(searchLower) &&
        !sl.submitterName?.toLowerCase().includes(searchLower) &&
        !itemNames.includes(searchLower)
      ) {
        return false
      }
    }

    // Property filter
    if (selectedPropertyId && sl.propertyId !== selectedPropertyId) {
      return false
    }

    // Date range filter
    if (filterStartDate) {
      const slDate = sl.createdAt.split('T')[0]
      if (slDate < filterStartDate) return false
    }
    if (filterEndDate) {
      const slDate = sl.createdAt.split('T')[0]
      if (slDate > filterEndDate) return false
    }

    return true
  })

  // Pagination
  const totalItems = filteredLists.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLists = filteredLists.slice(startIndex, endIndex)

  // Active filters count
  const activeFiltersCount = [
    filterStatus !== '',
    selectedPropertyId !== '',
    filterStartDate !== '',
    filterEndDate !== '',
  ].filter(Boolean).length

  // Stats
  const pendingCount = supplyLists.filter(sl => sl.status === 'pending').length
  const inProgressCount = supplyLists.filter(sl => sl.status === 'in_progress').length
  const fulfilledCount = supplyLists.filter(sl => sl.status === 'fulfilled').length
  const totalItemsCount = supplyLists.reduce((sum, sl) => sum + sl.items.length, 0)

  const statCards = [
    {
      label: 'Pending',
      value: pendingCount,
      subValue: 'Awaiting fulfillment',
      icon: ClockIcon,
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100',
    },
    {
      label: 'In Progress',
      value: inProgressCount,
      subValue: 'Partially fulfilled',
      icon: RectangleStackIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
    },
    {
      label: 'Fulfilled',
      value: fulfilledCount,
      subValue: 'Completed requests',
      icon: CheckCircleIcon,
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100',
    },
    {
      label: 'Total Items',
      value: totalItemsCount,
      subValue: 'Across all lists',
      icon: CubeIcon,
      bgColor: 'bg-teal-50',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      borderColor: 'border-teal-100',
    },
  ]

  const getStatusBadge = (status: SupplyListStatus) => {
    const info = SUPPLY_LIST_STATUS_INFO[status]
    const colors: Record<string, string> = {
      amber: 'bg-amber-100 text-amber-700',
      blue: 'bg-blue-100 text-blue-700',
      green: 'bg-green-100 text-green-700',
    }
    return colors[info.color] || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supply Lists</h1>
          <p className="text-gray-500 mt-1">Track supply requests from cleaners</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading supply lists...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supply Lists</h1>
          <p className="text-gray-500 mt-1">Track supply requests from cleaners</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XMarkIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Error loading supply lists</h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Supply Lists</h1>
        <p className="text-gray-500 mt-1">Track supply requests from cleaners</p>
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
                <p className="text-xs text-gray-500 mt-0.5">{stat.subValue}</p>
              </div>
              <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search, Filters & Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* Search and Filters */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                placeholder="Search by property, cleaner, or item..."
              />
            </div>

            {/* Filter Button with Popover */}
            <div className="relative" ref={filterPopoverRef}>
              <motion.button
                onClick={() => setShowFilterPopover(!showFilterPopover)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-blue-600 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </motion.button>

              {showFilterPopover && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-gray-900">Filters</h3>
                      <button
                        onClick={() => setShowFilterPopover(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Status Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                        <select
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value as SupplyListStatus | '')}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        >
                          <option value="">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="fulfilled">Fulfilled</option>
                        </select>
                      </div>

                      {/* Property Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Property</label>
                        <select
                          value={selectedPropertyId}
                          onChange={(e) => { setSelectedPropertyId(e.target.value); setCurrentPage(1) }}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        >
                          <option value="">All Properties</option>
                          {properties.map((property) => (
                            <option key={property.id} value={property.id}>
                              {property.listingName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Date Range */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                          <div className="relative">
                            <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="date"
                              value={filterStartDate}
                              onChange={(e) => { setFilterStartDate(e.target.value); setCurrentPage(1) }}
                              className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                          <div className="relative">
                            <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                              type="date"
                              value={filterEndDate}
                              onChange={(e) => { setFilterEndDate(e.target.value); setCurrentPage(1) }}
                              className="w-full pl-10 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Clear Filters */}
                    {activeFiltersCount > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <button
                          onClick={clearFilters}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Clear all filters
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[180px]">
                  Property
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">
                  Submitter
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">
                  Items
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Date
                </th>
                <th className="sticky right-0 bg-gray-50/95 backdrop-blur-sm px-6 py-4 min-w-[60px] shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedLists.map((sl, index) => {
                const itemPreview = sl.items.slice(0, 3).map(i => i.name).join(', ')
                const remaining = sl.items.length - 3

                return (
                  <motion.tr
                    key={sl.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                    onClick={() => handleViewDetails(sl)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{sl.propertyName || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">{sl.submitterName || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{sl.items.length} item{sl.items.length !== 1 ? 's' : ''}</span>
                          {sl.status !== 'fulfilled' && sl.items.some(i => i.isPurchased) && (
                            <span className="text-xs text-teal-600 font-medium">
                              {sl.items.filter(i => i.isPurchased).length}/{sl.items.length} purchased
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate max-w-[180px]">
                          {itemPreview}{remaining > 0 ? `, +${remaining} more` : ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(sl.status)}`}>
                        {SUPPLY_LIST_STATUS_INFO[sl.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{formatSupplyListAge(sl.createdAt)}</span>
                    </td>
                    <td
                      className="sticky right-0 bg-white group-hover:bg-blue-50/95 backdrop-blur-sm px-6 py-4 whitespace-nowrap text-right shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TableActionsDropdown
                        actions={getSupplyListActions(sl)}
                        itemId={sl.id}
                      />
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>

          {/* Empty State */}
          {filteredLists.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShoppingCartIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No supply lists found</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                {searchTerm || activeFiltersCount > 0
                  ? 'Try adjusting your search or filter criteria.'
                  : 'When cleaners submit supply requests, they will appear here.'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredLists.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-500">
                  Showing <span className="font-medium text-gray-700">{startIndex + 1}</span> to{' '}
                  <span className="font-medium text-gray-700">{Math.min(endIndex, totalItems)}</span> of{' '}
                  <span className="font-medium text-gray-700">{totalItems}</span> supply lists
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Per page:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {/* Page Numbers */}
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* View Supply Lists Modal */}
      <ViewSupplyListsModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        projectId={selectedProjectId}
        projectName={selectedProjectName}
        onSupplyListsChanged={reloadSupplyLists}
        fulfilledBy={profile?.id}
      />
    </div>
  )
}
