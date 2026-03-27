'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { getProperties } from '@/services/propertyService'
import {
  getAllSupplyLists,
  getSupplyListSummary,
  getSupplyListReceipts,
  fulfillSupplyList,
  deleteSupplyList,
} from '@/services/supplyListService'
import { exportToCsv } from '@/utils/csvExport'
import type { Property } from '@/services/types/property'
import type { SupplyList, SupplyListStatus, SupplyListSummary } from '@/services/types/supplyList'

import SupplyHubTableView from '@/components/supply-hub/SupplyHubTableView'
import SupplyHubListView from '@/components/supply-hub/SupplyHubListView'
import SupplyHubPropertyView from '@/components/supply-hub/SupplyHubPropertyView'
import SupplyHubItemView from '@/components/supply-hub/SupplyHubItemView'
import ScanSupplyReceiptModal from '@/components/supply-hub/ScanSupplyReceiptModal'
import UnappliedReceiptsModal from '@/components/supply-hub/UnappliedReceiptsModal'
import CreateSupplyListModal from '@/components/supply-hub/CreateSupplyListModal'
import ViewSupplyListsModal from '@/components/turnover/supply-lists/ViewSupplyListsModal'

import {
  ArrowDownTrayIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  BarsArrowDownIcon,
  BarsArrowUpIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  PlusIcon,
  DocumentTextIcon,
  CameraIcon,
} from '@heroicons/react/24/outline'

// ── Types ──

type ViewMode = 'table' | 'cards' | 'property' | 'item'
type DatePreset = 'all' | 'this_week' | 'this_month' | 'last_30' | 'custom'
type SortField = 'propertyName' | 'status' | 'createdAt' | 'itemCount'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  direction: SortDirection
}

// ── Constants ──

const SORT_OPTIONS: { field: SortField; label: string; ascLabel: string; descLabel: string }[] = [
  { field: 'propertyName', label: 'Property Name', ascLabel: 'A → Z', descLabel: 'Z → A' },
  { field: 'status', label: 'Status', ascLabel: 'Pending first', descLabel: 'Fulfilled first' },
  { field: 'createdAt', label: 'Date Created', ascLabel: 'Oldest first', descLabel: 'Newest first' },
  { field: 'itemCount', label: 'Item Count', ascLabel: 'Fewest first', descLabel: 'Most first' },
]

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'all', label: 'All Time' },
  { key: 'this_week', label: 'This Week' },
  { key: 'this_month', label: 'This Month' },
  { key: 'last_30', label: 'Last 30 Days' },
  { key: 'custom', label: 'Custom' },
]

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: 'table', label: 'Table' },
  { key: 'cards', label: 'Cards' },
  { key: 'property', label: 'Property' },
  { key: 'item', label: 'Items' },
]

const STATUS_ORDER: Record<string, number> = { pending: 0, in_progress: 1, fulfilled: 2 }

function getDateRange(preset: DatePreset, customStart: string, customEnd: string): { startDate?: string; endDate?: string } {
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  switch (preset) {
    case 'this_week': {
      const day = now.getDay()
      const start = new Date(now)
      start.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
      return { startDate: fmt(start), endDate: fmt(now) }
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { startDate: fmt(start), endDate: fmt(now) }
    }
    case 'last_30': {
      const start = new Date(now)
      start.setDate(now.getDate() - 30)
      return { startDate: fmt(start), endDate: fmt(now) }
    }
    case 'custom':
      return { startDate: customStart || undefined, endDate: customEnd || undefined }
    case 'all':
    default:
      return {}
  }
}

// ── Page ──

export default function SupplyListsPage() {
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()
  usePermissionGuard('supply_lists')
  const { effectiveUserId, canWrite } = usePermissions()

  // Data
  const [supplyLists, setSupplyLists] = useState<SupplyList[]>([])
  const [summary, setSummary] = useState<SupplyListSummary | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // View + Sort
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'createdAt', direction: 'desc' })
  const [showSortPopover, setShowSortPopover] = useState(false)
  const [showFilterPopover, setShowFilterPopover] = useState(false)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [statusFilter, setStatusFilter] = useState<SupplyListStatus | ''>('')
  const [propertyFilter, setPropertyFilter] = useState('')

  // Modals
  const [showViewModal, setShowViewModal] = useState(false)
  const [selectedSupplyListForDetail, setSelectedSupplyListForDetail] = useState<SupplyList | null>(null)
  const [showScanModal, setShowScanModal] = useState(false)
  const [selectedSupplyListId, setSelectedSupplyListId] = useState('')
  const [selectedSupplyList, setSelectedSupplyList] = useState<SupplyList | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showReceiptFirstScanModal, setShowReceiptFirstScanModal] = useState(false)
  const [showUnappliedModal, setShowUnappliedModal] = useState(false)
  const [unappliedCount, setUnappliedCount] = useState(0)

  // Refs for click-outside
  const filterPopoverRef = useRef<HTMLDivElement>(null)
  const sortPopoverRef = useRef<HTMLDivElement>(null)

  // Load initial data
  useEffect(() => {
    if (effectiveUserId) loadData()
  }, [effectiveUserId])

  const loadData = async () => {
    if (!effectiveUserId) return
    setLoading(true)
    setError(null)

    try {
      const [propertiesRes, supplyListsRes, summaryRes] = await Promise.all([
        getProperties(effectiveUserId),
        getAllSupplyLists(),
        getSupplyListSummary(),
      ])

      if (propertiesRes.status === 'success') setProperties(propertiesRes.data || [])
      if (supplyListsRes.status === 'success') setSupplyLists(supplyListsRes.data || [])
      else setError(supplyListsRes.message || 'Failed to load supply lists')
      if (summaryRes.status === 'success') setSummary(summaryRes.data)
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Count unapplied receipts after supply lists load
  useEffect(() => {
    if (supplyLists.length === 0) {
      setUnappliedCount(0)
      return
    }
    const countUnapplied = async () => {
      try {
        const results = await Promise.all(
          supplyLists.map(sl => getSupplyListReceipts(sl.id).then(res => res.status === 'success' ? res.data : []))
        )
        const count = results.flat().filter(r => r.status === 'matched').length
        setUnappliedCount(count)
      } catch {
        setUnappliedCount(0)
      }
    }
    countUnapplied()
  }, [supplyLists])

  // Reload when status filter changes (server-side)
  useEffect(() => {
    if (effectiveUserId && !loading) reloadSupplyLists()
  }, [statusFilter])

  const reloadSupplyLists = async () => {
    if (!effectiveUserId) return
    try {
      const status = statusFilter || undefined
      const [res, summaryRes] = await Promise.all([
        getAllSupplyLists(status),
        getSupplyListSummary(),
      ])
      if (res.status === 'success') setSupplyLists(res.data || [])
      if (summaryRes.status === 'success') setSummary(summaryRes.data)
    } catch (err) {
      console.error('Error reloading:', err)
    }
  }

  const refetchAll = async () => {
    await reloadSupplyLists()
  }

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setShowFilterPopover(false)
      }
      if (sortPopoverRef.current && !sortPopoverRef.current.contains(event.target as Node)) {
        setShowSortPopover(false)
      }
    }

    if (showFilterPopover || showSortPopover) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFilterPopover, showSortPopover])

  // Client-side filtering + sorting
  const filteredLists = useMemo(() => {
    const { startDate, endDate } = getDateRange(datePreset, customStartDate, customEndDate)

    const filtered = supplyLists.filter(sl => {
      // Search
      if (searchTerm) {
        const q = searchTerm.toLowerCase()
        const itemNames = sl.items.map(i => i.name.toLowerCase()).join(' ')
        if (
          !sl.propertyName?.toLowerCase().includes(q) &&
          !sl.submitterName?.toLowerCase().includes(q) &&
          !itemNames.includes(q)
        ) return false
      }
      // Property
      if (propertyFilter && sl.propertyId !== propertyFilter) return false
      // Date range
      if (startDate) {
        const slDate = sl.createdAt.split('T')[0]
        if (slDate < startDate) return false
      }
      if (endDate) {
        const slDate = sl.createdAt.split('T')[0]
        if (slDate > endDate) return false
      }
      return true
    })

    // Sort
    return filtered.sort((a, b) => {
      const { field, direction } = sortConfig
      const multiplier = direction === 'asc' ? 1 : -1

      switch (field) {
        case 'propertyName':
          return multiplier * (a.propertyName || '').localeCompare(b.propertyName || '')
        case 'status':
          return multiplier * ((STATUS_ORDER[a.status] ?? 1) - (STATUS_ORDER[b.status] ?? 1))
        case 'createdAt':
          return multiplier * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        case 'itemCount':
          return multiplier * (a.items.length - b.items.length)
        default:
          return 0
      }
    })
  }, [supplyLists, searchTerm, propertyFilter, datePreset, customStartDate, customEndDate, sortConfig])

  // Handlers
  const handleViewDetails = (sl: SupplyList) => {
    setSelectedSupplyListForDetail(sl)
    setShowViewModal(true)
  }

  const handleFulfill = async (id: string) => {
    try {
      const res = await fulfillSupplyList(id)
      if (res.status === 'success') {
        setSupplyLists(prev => prev.map(sl => sl.id === id ? res.data : sl))
        showNotification('Supply list marked as fulfilled', 'success')
        refetchAll()
      } else {
        showNotification(res.message || 'Failed to fulfill', 'error')
      }
    } catch {
      showNotification('Error fulfilling supply list', 'error')
    }
  }

  const handleDeleteRequest = (id: string) => {
    setDeleteTargetId(id)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      const res = await deleteSupplyList(deleteTargetId)
      if (res.status === 'success') {
        setSupplyLists(prev => prev.filter(sl => sl.id !== deleteTargetId))
        showNotification('Supply list deleted', 'success')
        refetchAll()
      } else {
        showNotification(res.message || 'Failed to delete', 'error')
      }
    } catch {
      showNotification('Error deleting supply list', 'error')
    } finally {
      setShowDeleteConfirm(false)
      setDeleteTargetId('')
    }
  }

  const handleScanReceipt = (sl: SupplyList) => {
    setSelectedSupplyListId(sl.id)
    setSelectedSupplyList(sl)
    setShowScanModal(true)
  }

  // CSV Export
  const handleExport = () => {
    if (viewMode === 'item') {
      const map = new Map<string, { name: string; qty: number; purchased: number; lists: number; properties: string }>()
      for (const sl of filteredLists) {
        for (const item of sl.items) {
          const key = item.name.toLowerCase().trim()
          if (!map.has(key)) map.set(key, { name: item.name, qty: 0, purchased: 0, lists: 0, properties: '' })
          const agg = map.get(key)!
          agg.qty += item.quantity
          agg.lists += 1
          if (item.isPurchased) agg.purchased += 1
          if (sl.propertyName && !agg.properties.includes(sl.propertyName)) {
            agg.properties = agg.properties ? `${agg.properties}, ${sl.propertyName}` : sl.propertyName
          }
        }
      }
      exportToCsv(
        Array.from(map.values()),
        [
          { key: 'name', header: 'Item Name' },
          { key: 'qty', header: 'Total Quantity' },
          { key: 'purchased', header: 'Purchased Count' },
          { key: 'lists', header: 'List Count' },
          { key: 'properties', header: 'Properties' },
        ],
        'supply-items'
      )
    } else {
      const rows = filteredLists.map(sl => ({
        property: sl.propertyName || '',
        submitter: sl.submitterName || '',
        status: sl.status,
        items: sl.items.length,
        purchased: sl.items.filter(i => i.isPurchased).length,
        itemNames: sl.items.map(i => i.name).join('; '),
        createdAt: sl.createdAt.split('T')[0],
      }))
      exportToCsv(
        rows,
        [
          { key: 'property', header: 'Property' },
          { key: 'submitter', header: 'Submitter' },
          { key: 'status', header: 'Status' },
          { key: 'items', header: 'Items' },
          { key: 'purchased', header: 'Purchased' },
          { key: 'itemNames', header: 'Item Names' },
          { key: 'createdAt', header: 'Date' },
        ],
        'supply-lists'
      )
    }
  }

  const writePermission = canWrite('supply_lists')

  // Active filter count for badge
  const activeFiltersCount = [
    statusFilter !== '',
    propertyFilter !== '',
    datePreset !== 'all',
  ].filter(Boolean).length

  const clearAllFilters = () => {
    setStatusFilter('')
    setPropertyFilter('')
    setDatePreset('all')
    setCustomStartDate('')
    setCustomEndDate('')
  }

  const getCurrentSortLabel = () => {
    const option = SORT_OPTIONS.find(o => o.field === sortConfig.field)
    if (!option) return 'Sort'
    const directionLabel = sortConfig.direction === 'asc' ? option.ascLabel : option.descLabel
    return `${option.label}: ${directionLabel}`
  }

  // Stats from summary
  const t = summary?.totals
  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const statCards = [
    {
      label: 'Total Lists',
      value: t?.totalLists ?? 0,
      icon: ClipboardDocumentListIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
    },
    {
      label: 'Pending',
      value: t?.pendingLists ?? 0,
      icon: ClockIcon,
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100',
    },
    {
      label: 'Items',
      value: t?.totalItems ?? 0,
      sub: `${t?.purchasedItems ?? 0} purchased`,
      icon: ShoppingCartIcon,
      bgColor: 'bg-teal-50',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      borderColor: 'border-teal-100',
    },
    {
      label: 'Total Spend',
      value: fmt(t?.totalCost ?? 0),
      icon: CurrencyDollarIcon,
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100',
    },
  ]

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Supply Lists</h1>
            <p className="text-gray-500 mt-1">Manage supply requests from cleaners</p>
          </div>
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

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Supply Lists</h1>
            <p className="text-gray-500 mt-1">Manage supply requests from cleaners</p>
          </div>
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
            className="mt-3 px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors cursor-pointer"
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supply Lists</h1>
          <p className="text-gray-500 mt-1">Manage supply requests from cleaners</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={handleExport}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export CSV
          </motion.button>
          {unappliedCount > 0 && (
            <motion.button
              onClick={() => setShowUnappliedModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="relative inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 shadow-sm transition-colors"
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Review Receipts
              <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-amber-500 rounded-full">
                {unappliedCount}
              </span>
            </motion.button>
          )}
          {writePermission && (
            <>
              <motion.button
                onClick={() => setShowReceiptFirstScanModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-teal-700 bg-teal-50 border border-teal-200 hover:bg-teal-100 shadow-sm transition-colors"
              >
                <CameraIcon className="h-5 w-5 mr-2" />
                Scan Receipt
              </motion.button>
              <motion.button
                onClick={() => setShowCreateModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                New Supply List
              </motion.button>
            </>
          )}
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
                {'sub' in stat && stat.sub && (
                  <p className="text-xs text-gray-500 mt-0.5">{stat.sub}</p>
                )}
              </div>
              <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search, Filters & Content */}
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
                placeholder="Search by property, submitter, or item..."
              />
            </div>

            {/* Sort Button with Popover */}
            <div className="relative" ref={sortPopoverRef}>
              <motion.button
                onClick={() => setShowSortPopover(!showSortPopover)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                {sortConfig.direction === 'desc' ? (
                  <BarsArrowDownIcon className="h-4 w-4 mr-2" />
                ) : (
                  <BarsArrowUpIcon className="h-4 w-4 mr-2" />
                )}
                <span className="hidden sm:inline">{getCurrentSortLabel()}</span>
                <span className="sm:hidden">Sort</span>
              </motion.button>

              {showSortPopover && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-gray-900">Sort by</h3>
                      <button
                        onClick={() => setShowSortPopover(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      {SORT_OPTIONS.map((option) => {
                        const isSelected = sortConfig.field === option.field
                        return (
                          <div key={option.field} className="space-y-1">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2 pt-2">
                              {option.label}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSortConfig({ field: option.field, direction: 'asc' })
                                  setShowSortPopover(false)
                                }}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                  isSelected && sortConfig.direction === 'asc'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {option.ascLabel}
                              </button>
                              <button
                                onClick={() => {
                                  setSortConfig({ field: option.field, direction: 'desc' })
                                  setShowSortPopover(false)
                                }}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                  isSelected && sortConfig.direction === 'desc'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {option.descLabel}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
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
                  className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50"
                >
                  <div className="p-4 max-h-[80vh] overflow-y-auto">
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
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as SupplyListStatus | '')}
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
                          value={propertyFilter}
                          onChange={(e) => setPropertyFilter(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        >
                          <option value="">All Properties</option>
                          {properties.map(p => (
                            <option key={p.id} value={p.id}>{p.listingName}</option>
                          ))}
                        </select>
                      </div>

                      {/* Date Preset */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                        <select
                          value={datePreset}
                          onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                        >
                          {DATE_PRESETS.map(({ key, label }) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                        {datePreset === 'custom' && (
                          <div className="flex gap-2 mt-2">
                            <input
                              type="date"
                              value={customStartDate}
                              onChange={(e) => setCustomStartDate(e.target.value)}
                              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="date"
                              value={customEndDate}
                              onChange={(e) => setCustomEndDate(e.target.value)}
                              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Filter Actions */}
                    {activeFiltersCount > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <button
                          onClick={clearAllFilters}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                        >
                          Clear all filters
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Reset Filters Chip */}
            {(activeFiltersCount > 0 || searchTerm) && (
              <button
                onClick={() => { clearAllFilters(); setSearchTerm('') }}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
                Clear filters
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="inline-flex bg-gray-50 border border-gray-200 rounded-xl p-1">
              {VIEW_MODES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    viewMode === key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === 'table' && (
          <SupplyHubTableView
            supplyLists={filteredLists}
            onViewDetails={handleViewDetails}
            onFulfill={handleFulfill}
            onDelete={handleDeleteRequest}
            onScanReceipt={handleScanReceipt}
            canWrite={writePermission}
          />
        )}
        {viewMode === 'cards' && (
          <SupplyHubListView
            supplyLists={filteredLists}
            onViewDetails={handleViewDetails}
            onFulfill={handleFulfill}
            onDelete={handleDeleteRequest}
            onScanReceipt={handleScanReceipt}
            canWrite={writePermission}
          />
        )}
        {viewMode === 'property' && (
          <SupplyHubPropertyView
            supplyLists={filteredLists}
            summary={summary}
            onViewDetails={handleViewDetails}
            onFulfill={handleFulfill}
            onDelete={handleDeleteRequest}
            onScanReceipt={handleScanReceipt}
            canWrite={writePermission}
          />
        )}
        {viewMode === 'item' && (
          <SupplyHubItemView supplyLists={filteredLists} />
        )}

        {/* Results count */}
        {filteredLists.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{filteredLists.length}</span> of{' '}
              <span className="font-medium text-gray-700">{supplyLists.length}</span> supply lists
            </p>
          </div>
        )}
      </motion.div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/10" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm w-[calc(100%-2rem)] z-10">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Delete supply list?</h3>
            <p className="text-xs text-gray-500 mb-4">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 py-2 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ViewSupplyListsModal
        isOpen={showViewModal}
        onClose={() => { setShowViewModal(false); setSelectedSupplyListForDetail(null) }}
        projectId={selectedSupplyListForDetail?.projectId || ''}
        projectName={selectedSupplyListForDetail?.propertyName || 'Supply List'}
        initialSupplyList={selectedSupplyListForDetail}
        onSupplyListsChanged={refetchAll}
        fulfilledBy={profile?.id}
        onScanReceipt={(sl) => {
          setShowViewModal(false)
          setSelectedSupplyListForDetail(null)
          setSelectedSupplyListId(sl.id)
          setSelectedSupplyList(sl)
          setShowScanModal(true)
        }}
      />

      <ScanSupplyReceiptModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        supplyListId={selectedSupplyListId}
        supplyList={selectedSupplyList}
        onReceiptApplied={refetchAll}
      />

      <ScanSupplyReceiptModal
        isOpen={showReceiptFirstScanModal}
        onClose={() => setShowReceiptFirstScanModal(false)}
        properties={properties.map(p => ({ id: p.id, listingName: p.listingName || '' }))}
        onReceiptApplied={refetchAll}
      />

      <UnappliedReceiptsModal
        isOpen={showUnappliedModal}
        onClose={() => setShowUnappliedModal(false)}
        onReceiptApplied={refetchAll}
      />

      <CreateSupplyListModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={refetchAll}
        properties={properties}
        onScanReceipt={() => { setShowCreateModal(false); setShowReceiptFirstScanModal(true) }}
      />
    </div>
  )
}
