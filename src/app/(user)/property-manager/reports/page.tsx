'use client'

import { useState, useEffect } from 'react'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getProperties } from '@/services/propertyService'
import { getReports, deleteReport } from '@/services/reportService'
import type { Property } from '@/services/types/property'
import type { Report, ReportFormat } from '@/services/types/report'
import { PlusIcon, TrashIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import GenerateReportModal from '@/components/report/generate/generateReportModal'

export default function ReportsPage() {
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  // Data state
  const [reports, setReports] = useState<Report[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loadingReports, setLoadingReports] = useState<boolean>(true)
  const [loadingProperties, setLoadingProperties] = useState<boolean>(true)

  // Filter state
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('')
  const [filterStartDate, setFilterStartDate] = useState<string>('')
  const [filterEndDate, setFilterEndDate] = useState<string>('')

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [itemsPerPage, setItemsPerPage] = useState<number>(10)

  // UI state
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false)
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null)

  // Load data on mount
  useEffect(() => {
    if (profile?.id) {
      loadProperties()
      loadReports()
    }
  }, [profile])

  // Load reports when filters change
  useEffect(() => {
    if (profile?.id) {
      loadReports()
    }
  }, [selectedPropertyId, filterStartDate, filterEndDate])

  const loadProperties = async () => {
    try {
      setLoadingProperties(true)
      const res = await getProperties(profile!.id)
      if (res.status === 'success') {
        setProperties(res.data || [])
      } else {
        showNotification(res.message || 'Failed to load properties', 'error')
      }
    } catch (err) {
      console.error('Error loading properties:', err)
      showNotification('Failed to load properties', 'error')
    } finally {
      setLoadingProperties(false)
    }
  }

  const loadReports = async () => {
    try {
      setLoadingReports(true)
      const filters: any = {}
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
    } finally {
      setLoadingReports(false)
    }
  }

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return

    try {
      setDeletingReportId(reportId)
      const res = await deleteReport(reportId)
      if (res.status === 'success') {
        showNotification('Report deleted successfully', 'success')
        await loadReports() // Refresh from server instead of manual filter
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
    await loadReports() // Refresh from server instead of optimistic update
    setShowGenerateModal(false)
  }

  // Pagination logic
  const totalItems = reports.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedReports = reports.slice(startIndex, endIndex)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <PlusIcon className="w-5 h-5 mr-2" />
            Generate Report
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Property Filter */}
            <div>
              <label htmlFor="propertyFilter" className="block text-sm font-medium text-gray-700 mb-2">
                Property
              </label>
              {loadingProperties ? (
                <div className="w-64 px-3 py-2 border border-gray-300 rounded-lg bg-gray-100">
                  Loading properties...
                </div>
              ) : (
                <select
                  id="propertyFilter"
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Properties</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.listingName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Start Date Filter */}
            <div>
              <label htmlFor="startDateFilter" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                id="startDateFilter"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label htmlFor="endDateFilter" className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                id="endDateFilter"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Clear Filters */}
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loadingReports ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No reports found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Property
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Range
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Formats Available
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedReports.map((report) => (
                      <tr key={report.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {(() => {
                                // Handle multi-property reports
                                if (report.propertyNames && report.propertyNames.length > 1) {
                                  if (report.propertyNames.length === 2) {
                                    return `${report.propertyNames[0]}, ${report.propertyNames[1]}`
                                  }
                                  const remaining = report.propertyNames.length - 2
                                  return `${report.propertyNames[0]}, ${report.propertyNames[1]}, ... ${remaining} more`
                                }
                                // Handle single property reports
                                return report.propertyName
                              })()}
                            </div>
                            <div className="text-sm text-gray-500">
                              {(() => {
                                // Handle multi-property addresses
                                if (report.propertyAddresses && report.propertyAddresses.length > 1) {
                                  const remaining = report.propertyAddresses.length - 1
                                  return `${report.propertyAddresses[0]}, ... ${remaining} more`
                                }
                                // Handle single property address
                                return report.propertyAddress
                              })()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(report.startDate).toLocaleDateString()} - {new Date(report.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            {report.files.pdf && (
                              <button
                                onClick={() => handleDownload(report.files.pdf!.downloadUrl)}
                                className="px-3 py-1 text-xs text-red-700 bg-red-100 rounded-full hover:bg-red-200 transition-colors flex items-center"
                              >
                                <DocumentArrowDownIcon className="w-3 h-3 mr-1" />
                                PDF
                              </button>
                            )}
                            {report.files.csv && (
                              <button
                                onClick={() => handleDownload(report.files.csv!.downloadUrl)}
                                className="px-3 py-1 text-xs text-green-700 bg-green-100 rounded-full hover:bg-green-200 transition-colors flex items-center"
                              >
                                <DocumentArrowDownIcon className="w-3 h-3 mr-1" />
                                CSV
                              </button>
                            )}
                            {report.files.excel && (
                              <button
                                onClick={() => handleDownload(report.files.excel!.downloadUrl)}
                                className="px-3 py-1 text-xs text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors flex items-center"
                              >
                                <DocumentArrowDownIcon className="w-3 h-3 mr-1" />
                                Excel
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            disabled={deletingReportId === report.id}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deletingReportId === report.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                            ) : (
                              <TrashIcon className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-700 mr-4">
                      Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} results
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-700">Items per page:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setItemsPerPage(Number(e.target.value))
                          setCurrentPage(1)
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => handlePageChange(i + 1)}
                        className={`px-3 py-1 border border-gray-300 rounded text-sm ${
                          currentPage === i + 1
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Generate Report Modal */}
      <GenerateReportModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onReportGenerated={handleReportGenerated}
        properties={properties}
      />
    </div>
  )
}