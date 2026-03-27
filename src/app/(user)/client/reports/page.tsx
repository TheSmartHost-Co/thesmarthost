'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  DocumentTextIcon,
  DocumentChartBarIcon,
  TableCellsIcon,
  FunnelIcon,
  XMarkIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import { getClientPortalReports } from '@/services/clientPortalService'
import ViewClientReportModal from '@/components/client-portal/report/ViewClientReportModal'
import type { ClientPortalReport } from '@/services/types/clientPortal'

export default function ClientReportsPage() {
  const [reports, setReports] = useState<ClientPortalReport[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Filter state
  const [propertyFilter, setPropertyFilter] = useState('All')
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const filterPopoverRef = useRef<HTMLDivElement>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Preview modal state
  const [selectedReport, setSelectedReport] = useState<ClientPortalReport | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const filters: { startDate?: string; endDate?: string } = {}
        if (startDate) filters.startDate = startDate
        if (endDate) filters.endDate = endDate
        const res = await getClientPortalReports(filters)
        if (res.status === 'success') {
          setReports(res.data)
        }
      } catch (err) {
        console.error('Failed to load reports:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [startDate, endDate])

  // Close popover on outside click
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

  // Unique properties from reports for filter dropdown
  const properties = useMemo(() => {
    const map = new Map<string, string>()
    reports.forEach((r) =>
      r.properties.forEach((p) => {
        if (!map.has(p.id)) map.set(p.id, p.listingName)
      })
    )
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [reports])

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // Property filter
      if (propertyFilter !== 'All' && !r.properties.some((p) => p.id === propertyFilter)) return false
      // Search
      if (search) {
        const q = search.toLowerCase()
        const matchProperty = r.properties.some(
          (p) => p.listingName.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q)
        )
        const matchSentBy = r.sentBy?.toLowerCase().includes(q)
        if (!matchProperty && !matchSentBy) return false
      }
      return true
    })
  }, [reports, propertyFilter, search])

  // Pagination
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage)
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Stats
  const stats = useMemo(() => {
    const allFormats = reports.flatMap((r) => r.files.map((f) => f.format))
    return {
      total: reports.length,
      pdf: allFormats.filter((f) => f === 'pdf').length,
      csv: allFormats.filter((f) => f === 'csv').length,
      excel: allFormats.filter((f) => f === 'excel').length,
    }
  }, [reports])

  const activeFiltersCount = [propertyFilter !== 'All', startDate !== '', endDate !== ''].filter(Boolean).length

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })

  const getPropertyDisplay = (report: ClientPortalReport) => {
    if (report.properties.length === 1) return report.properties[0].listingName
    if (report.properties.length === 2) return `${report.properties[0].listingName}, ${report.properties[1].listingName}`
    return `${report.properties[0].listingName}, +${report.properties.length - 1} more`
  }

  const handleDownload = (url: string) => {
    window.open(url, '_blank')
  }

  const statCards = [
    { label: 'Total Reports', value: stats.total, icon: DocumentTextIcon, color: 'text-blue-600 bg-blue-50' },
    { label: 'PDF', value: stats.pdf, icon: DocumentTextIcon, color: 'text-red-600 bg-red-50' },
    { label: 'CSV', value: stats.csv, icon: TableCellsIcon, color: 'text-green-600 bg-green-50' },
    { label: 'Excel', value: stats.excel, icon: DocumentChartBarIcon, color: 'text-emerald-600 bg-emerald-50' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Financial reports shared by your property manager</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {statCards.map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-gray-500">{stat.label}</div>
                <div className="text-lg font-semibold text-gray-900">{stat.value}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by property or sender..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Date range */}
        <div className="flex gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Filter button */}
        <div className="relative" ref={filterPopoverRef}>
          <button
            onClick={() => setShowFilterPopover(!showFilterPopover)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
              activeFiltersCount > 0
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <FunnelIcon className="w-4 h-4" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-emerald-600 text-white rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {showFilterPopover && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Filters</span>
                <button
                  onClick={() => {
                    setPropertyFilter('All')
                    setStartDate('')
                    setEndDate('')
                  }}
                  className="text-xs text-emerald-600 hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Property</label>
                <select
                  value={propertyFilter}
                  onChange={(e) => { setPropertyFilter(e.target.value); setCurrentPage(1) }}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="All">All Properties</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading reports...</p>
            </div>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <DocumentTextIcon className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm font-medium">
              {reports.length === 0 ? 'No reports shared yet' : 'No reports match your filters'}
            </p>
            <p className="text-xs mt-1">
              {reports.length === 0
                ? 'Your property manager will share reports here when they are ready.'
                : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date Range
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Formats
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shared By
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shared Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedReports.map((report) => (
                    <motion.tr
                      key={report.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-emerald-50/50 cursor-pointer transition-colors group"
                      onClick={() => {
                        setSelectedReport(report)
                        setShowPreviewModal(true)
                      }}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{getPropertyDisplay(report)}</div>
                        {report.properties.length === 1 && report.properties[0].address && (
                          <div className="text-xs text-gray-400 truncate max-w-[200px]">
                            {report.properties[0].address}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <CalendarDaysIcon className="w-3.5 h-3.5 text-gray-400" />
                          {formatDate(report.startDate)} — {formatDate(report.endDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {report.files.map((file) => {
                            const colorMap: Record<string, string> = {
                              pdf: 'bg-red-100 text-red-700 hover:bg-red-200',
                              csv: 'bg-green-100 text-green-700 hover:bg-green-200',
                              excel: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
                            }
                            return (
                              <button
                                key={file.format}
                                onClick={() => handleDownload(file.downloadUrl)}
                                title={`Download ${file.format.toUpperCase()}`}
                                className={`px-2 py-0.5 text-xs font-medium rounded transition-colors ${
                                  colorMap[file.format] || 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {file.format.toUpperCase()}
                              </button>
                            )
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{report.sentBy}</td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{formatDate(report.sentAt)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1}–
                  {Math.min(currentPage * itemsPerPage, filteredReports.length)} of{' '}
                  {filteredReports.length}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2 py-1 text-xs text-gray-600 rounded hover:bg-gray-100 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-2.5 py-1 text-xs rounded ${
                        page === currentPage
                          ? 'bg-emerald-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 text-xs text-gray-600 rounded hover:bg-gray-100 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value))
                    setCurrentPage(1)
                  }}
                  className="px-2 py-1 text-xs border border-gray-200 rounded"
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* View Report Modal */}
      <ViewClientReportModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false)
          setSelectedReport(null)
        }}
        report={selectedReport}
      />
    </div>
  )
}
