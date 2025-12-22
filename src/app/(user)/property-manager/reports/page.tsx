'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getProperties } from '@/services/propertyService'
import { getReports, deleteReport } from '@/services/reportService'
import type { Property } from '@/services/types/property'
import type { Report } from '@/services/types/report'
import {
  PlusIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  DocumentChartBarIcon,
  DocumentTextIcon,
  TableCellsIcon,
  CalendarDaysIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import GenerateReportModal from '@/components/report/generate/generateReportModal'
import ViewReportModal from '@/components/report/view/viewReportModal'
import TableActionsDropdown, { ActionItem } from '@/components/shared/TableActionsDropdown'

export default function ReportsPage() {
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  // Data state
  const [reports, setReports] = useState<Report[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [filterStartDate, setFilterStartDate] = useState<string>('')
  const [filterEndDate, setFilterEndDate] = useState<string>('')
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const filterPopoverRef = useRef<HTMLDivElement>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(10)

  // UI state
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false)
  const [showViewModal, setShowViewModal] = useState<boolean>(false)
  const [selectedReportId, setSelectedReportId] = useState<string>('')
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null)

  // Load data on mount
  useEffect(() => {
    if (profile?.id) {
      loadData()
    }
  }, [profile])

  // Load reports when filters change
  useEffect(() => {
    if (profile?.id) {
      loadReports()
    }
  }, [selectedPropertyId, filterStartDate, filterEndDate])

  // Close filter popover when clicking outside
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
    try {
      setLoading(true)
      setError(null)

      const [propertiesRes, reportsRes] = await Promise.all([
        getProperties(profile!.id),
        getReports({})
      ])

      if (propertiesRes.status === 'success') {
        setProperties(propertiesRes.data || [])
      }

      if (reportsRes.status === 'success') {
        setReports(reportsRes.data || [])
      } else {
        setError(reportsRes.message || 'Failed to load reports')
      }
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadReports = async () => {
    try {
      const filters: Record<string, string> = {}
      if (selectedPropertyId) filters.propertyId = selectedPropertyId
      if (filterStartDate) filters.startDate = filterStartDate
      if (filterEndDate) filters.endDate = filterEndDate

      const res = await getReports(filters)
      if (res.status === 'success') {
        setReports(res.data || [])
      } else {
        showNotification(res.message || 'Failed to load reports', 'error')
      }
    } catch (err) {
      console.error('Error loading reports:', err)
      showNotification('Failed to load reports', 'error')
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return

    try {
      setDeletingReportId(reportId)
      const res = await deleteReport(reportId)
      if (res.status === 'success') {
        showNotification('Report deleted successfully', 'success')
        await loadReports()
      } else {
        showNotification(res.message || 'Failed to delete report', 'error')
      }
    } catch (err) {
      console.error('Error deleting report:', err)
      showNotification('Failed to delete report', 'error')
    } finally {
      setDeletingReportId(null)
    }
  }

  const handleDownload = (downloadUrl: string) => {
    window.open(downloadUrl, '_blank')
  }

  const clearFilters = () => {
    setSelectedPropertyId('')
    setFilterStartDate('')
    setFilterEndDate('')
    setCurrentPage(1)
  }

  const handleReportGenerated = async () => {
    await loadReports()
    setShowGenerateModal(false)
  }

  const handleViewReport = (reportId: string) => {
    setSelectedReportId(reportId)
    setShowViewModal(true)
  }

  const handleReportUpdated = async () => {
    await loadReports()
  }

  // Get report actions for dropdown
  const getReportActions = (report: Report): ActionItem[] => [
    {
      label: 'View Details',
      icon: EyeIcon,
      onClick: () => handleViewReport(report.id),
      variant: 'default'
    },
    {
      label: 'Delete Report',
      icon: TrashIcon,
      onClick: () => handleDeleteReport(report.id),
      variant: 'danger'
    }
  ]

  // Filter reports by search term
  const filteredReports = reports.filter(report => {
    const searchLower = searchTerm.toLowerCase()
    const propertyName = report.isMultiProperty && report.properties?.length > 1
      ? report.properties.map(p => p.listingName).join(' ')
      : report.propertyName || ''

    return propertyName.toLowerCase().includes(searchLower) ||
      (report.propertyAddress && report.propertyAddress.toLowerCase().includes(searchLower))
  })

  // Pagination logic
  const totalItems = filteredReports.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedReports = filteredReports.slice(startIndex, endIndex)

  // Calculate stats
  const stats = {
    total: reports.length,
    pdfCount: reports.filter(r => r.files.pdf).length,
    csvCount: reports.filter(r => r.files.csv).length,
    excelCount: reports.filter(r => r.files.excel).length
  }

  // Count active filters
  const activeFiltersCount = [
    selectedPropertyId !== '',
    filterStartDate !== '',
    filterEndDate !== ''
  ].filter(Boolean).length

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getPropertyDisplay = (report: Report) => {
    if (report.isMultiProperty && report.properties?.length > 1) {
      if (report.properties.length === 2) {
        return `${report.properties[0].listingName}, ${report.properties[1].listingName}`
      } else {
        const remaining = report.properties.length - 2
        return `${report.properties[0].listingName}, ${report.properties[1].listingName}, +${remaining} more`
      }
    }
    return report.propertyName
  }

  const getAddressDisplay = (report: Report) => {
    if (report.isMultiProperty && report.properties?.length > 1) {
      const remaining = report.properties.length - 1
      return `${report.properties[0].address}, +${remaining} more`
    }
    return report.propertyAddress
  }

  const statCards = [
    {
      label: 'Total Reports',
      value: stats.total,
      icon: DocumentChartBarIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100'
    },
    {
      label: 'PDF Reports',
      value: stats.pdfCount,
      icon: DocumentTextIcon,
      bgColor: 'bg-red-50',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      borderColor: 'border-red-100'
    },
    {
      label: 'CSV Reports',
      value: stats.csvCount,
      icon: TableCellsIcon,
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100'
    },
    {
      label: 'Excel Reports',
      value: stats.excelCount,
      icon: TableCellsIcon,
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100'
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-500 mt-1">Generate and manage financial reports</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading reports...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-500 mt-1">Generate and manage financial reports</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XMarkIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Error loading reports</h3>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">Generate and manage financial reports</p>
        </div>
        <motion.button
          onClick={() => setShowGenerateModal(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Generate Report
        </motion.button>
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                placeholder="Search by property name or address..."
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
                      {/* Property Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Property
                        </label>
                        <select
                          value={selectedPropertyId}
                          onChange={(e) => setSelectedPropertyId(e.target.value)}
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

                      {/* Start Date Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Start Date
                        </label>
                        <div className="relative">
                          <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="date"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                          />
                        </div>
                      </div>

                      {/* End Date Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          End Date
                        </label>
                        <div className="relative">
                          <CalendarDaysIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="date"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Filter Actions */}
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
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[280px]">
                  Property
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[180px]">
                  Date Range
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">
                  Available Formats
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">
                  Created
                </th>
                <th className="sticky right-0 bg-gray-50/95 backdrop-blur-sm px-6 py-4 min-w-[60px] shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedReports.map((report, index) => (
                <motion.tr
                  key={report.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                  onClick={() => handleViewReport(report.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow flex-shrink-0">
                        <DocumentChartBarIcon className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate max-w-[200px]">
                          {getPropertyDisplay(report)}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-[200px]">
                          {getAddressDisplay(report)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatDate(report.startDate)}
                    </div>
                    <div className="text-sm text-gray-500">
                      to {formatDate(report.endDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-2">
                      {report.files.pdf && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(report.files.pdf!.downloadUrl)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                        >
                          <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                          PDF
                        </button>
                      )}
                      {report.files.csv && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(report.files.csv!.downloadUrl)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                        >
                          <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                          CSV
                        </button>
                      )}
                      {report.files.excel && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownload(report.files.excel!.downloadUrl)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                        >
                          <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                          Excel
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700">{formatDate(report.createdAt)}</span>
                  </td>
                  <td
                    className="sticky right-0 bg-white group-hover:bg-blue-50/95 backdrop-blur-sm px-6 py-4 whitespace-nowrap text-right shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {deletingReportId === report.id ? (
                      <div className="flex justify-center">
                        <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    ) : (
                      <TableActionsDropdown
                        actions={getReportActions(report)}
                        itemId={report.id}
                      />
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {filteredReports.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <DocumentChartBarIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No reports found</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                {searchTerm || activeFiltersCount > 0
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by generating your first financial report.'}
              </p>
              {!searchTerm && activeFiltersCount === 0 && (
                <motion.button
                  onClick={() => setShowGenerateModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Generate Your First Report
                </motion.button>
              )}
            </div>
          )}
        </div>

        {/* Results count and pagination */}
        {filteredReports.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-500">
                  Showing <span className="font-medium text-gray-700">{startIndex + 1}</span> to{' '}
                  <span className="font-medium text-gray-700">{Math.min(endIndex, totalItems)}</span> of{' '}
                  <span className="font-medium text-gray-700">{totalItems}</span> reports
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

              {/* Pagination */}
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

      {/* Generate Report Modal */}
      <GenerateReportModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onReportGenerated={handleReportGenerated}
        properties={properties}
      />

      {/* View Report Modal */}
      <ViewReportModal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        reportId={selectedReportId}
        onReportUpdated={handleReportUpdated}
      />
    </div>
  )
}
