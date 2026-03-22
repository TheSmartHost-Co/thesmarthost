"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  BuildingOfficeIcon,
  ClockIcon,
  EyeIcon,
  EnvelopeIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'
import { getCleaners, calculateCleanerStats, resendCleanerInvite } from '@/services/cleanerService'
import { useNotificationStore } from '@/store/useNotificationStore'
import { Cleaner, CleanerStats } from '@/services/types/cleaner'
import { useUserStore } from '@/store/useUserStore'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import TableActionsDropdown, { ActionItem } from '@/components/shared/TableActionsDropdown'
import CreateCleanerModal from '@/components/cleaner/create/createCleanerModal'
import UpdateCleanerModal from '@/components/cleaner/update/updateCleanerModal'
import DeleteCleanerModal from '@/components/cleaner/delete/deleteCleanerModal'
import PreviewCleanerModal from '@/components/cleaner/preview/previewCleanerModal'
import AssignPropertiesModal from '@/components/cleaner/AssignPropertiesModal'

export default function PropertyManagerCleanersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'invited'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedCleaner, setSelectedCleaner] = useState<Cleaner | null>(null)
  const [cleaners, setCleaners] = useState<Cleaner[]>([])
  const [stats, setStats] = useState<CleanerStats>({ total: 0, active: 0, inactive: 0, invited: 0, withAssignments: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)
  usePermissionGuard('cleaners')
  const { effectiveUserId, canWrite } = usePermissions()

  useEffect(() => {
    const fetchData = async () => {
      if (!effectiveUserId) return

      try {
        setLoading(true)
        const response = await getCleaners(effectiveUserId)

        if (response.status === 'success') {
          setCleaners(response.data)
          setStats(calculateCleanerStats(response.data))
        } else {
          setError(response.message || 'Failed to fetch cleaners')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch cleaners')
        console.error('Error fetching cleaners:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [effectiveUserId])

  const handleAddCleaner = (newCleaner: Cleaner) => {
    setCleaners(prev => [...prev, newCleaner])
    setStats(calculateCleanerStats([...cleaners, newCleaner]))
  }

  const handleViewCleaner = (cleanerId: string) => {
    const cleaner = cleaners.find(c => c.id === cleanerId)
    if (cleaner) {
      setSelectedCleaner(cleaner)
      setShowPreviewModal(true)
    }
  }

  const handleEditCleaner = (cleanerId: string) => {
    const cleaner = cleaners.find(c => c.id === cleanerId)
    if (cleaner) {
      setSelectedCleaner(cleaner)
      setShowUpdateModal(true)
    }
  }

  const handleDeleteCleaner = (cleanerId: string) => {
    const cleaner = cleaners.find(c => c.id === cleanerId)
    if (cleaner) {
      setSelectedCleaner(cleaner)
      setShowDeleteModal(true)
    }
  }

  const handleAssignProperties = (cleanerId: string) => {
    const cleaner = cleaners.find(c => c.id === cleanerId)
    if (cleaner) {
      setSelectedCleaner(cleaner)
      setShowAssignModal(true)
    }
  }

  const handleCleanerDeleted = (cleanerId: string) => {
    const updatedCleaners = cleaners.filter(c => c.id !== cleanerId)
    setCleaners(updatedCleaners)
    setStats(calculateCleanerStats(updatedCleaners))
  }

  const handleCleanerUpdated = (updatedCleaner: Cleaner) => {
    const updatedCleaners = cleaners.map(c => c.id === updatedCleaner.id ? updatedCleaner : c)
    setCleaners(updatedCleaners)
    setStats(calculateCleanerStats(updatedCleaners))
  }

  const handleResendInvite = async (cleanerId: string) => {
    const cleaner = cleaners.find(c => c.id === cleanerId)
    if (!cleaner) return

    if (!cleaner.email) {
      showNotification('Cleaner does not have an email address', 'error')
      return
    }

    try {
      const res = await resendCleanerInvite(cleanerId)
      if (res.status === 'success') {
        showNotification(`Invite email sent to ${cleaner.email}`, 'success')
      } else {
        showNotification(res.message || 'Failed to send invite', 'error')
      }
    } catch (err) {
      console.error('Error resending invite:', err)
      showNotification('Error sending invite email', 'error')
    }
  }

  const getCleanerActions = (cleaner: Cleaner): ActionItem[] => {
    const actions: ActionItem[] = [
      {
        label: 'View Details',
        icon: EyeIcon,
        onClick: () => handleViewCleaner(cleaner.id),
        variant: 'default'
      },
    ]

    if (canWrite('cleaners')) {
      actions.push({
        label: 'Edit Cleaner',
        icon: PencilIcon,
        onClick: () => handleEditCleaner(cleaner.id),
        variant: 'default'
      })

      // Only show Resend Invite if cleaner has an email and auth account
      if (cleaner.email && cleaner.authUserId) {
        actions.push({
          label: 'Resend Invite',
          icon: EnvelopeIcon,
          onClick: () => handleResendInvite(cleaner.id),
          variant: 'default'
        })
      }

      actions.push(
        {
          label: 'Assign Properties',
          icon: BuildingOfficeIcon,
          onClick: () => handleAssignProperties(cleaner.id),
          variant: 'default'
        },
        {
          label: 'Delete Cleaner',
          icon: TrashIcon,
          onClick: () => handleDeleteCleaner(cleaner.id),
          variant: 'danger'
        }
      )
    }

    return actions
  }

  const formatTurnaroundTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Filter and sort cleaners
  const filteredCleaners = cleaners
    .filter(cleaner => {
      const matchesSearch =
        cleaner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cleaner.email && cleaner.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (cleaner.phone && cleaner.phone.includes(searchTerm))

      const matchesStatus =
        statusFilter === 'all' || cleaner.status === statusFilter

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      // Active first, then invited, then inactive
      const statusOrder = { active: 0, invited: 1, inactive: 2 }
      const orderDiff = statusOrder[a.status] - statusOrder[b.status]
      if (orderDiff !== 0) return orderDiff
      // Then by name
      return a.name.localeCompare(b.name)
    })

  const getStatusBadge = (status: 'invited' | 'active' | 'inactive') => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Active
          </span>
        )
      case 'invited':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Invited
          </span>
        )
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            Inactive
          </span>
        )
    }
  }

  const statCards = [
    {
      label: 'Total Cleaners',
      value: stats.total,
      icon: UserCircleIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100'
    },
    {
      label: 'Active Cleaners',
      value: stats.active,
      icon: CheckCircleIcon,
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100'
    },
    {
      label: 'With Assignments',
      value: stats.withAssignments,
      icon: BuildingOfficeIcon,
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100'
    },
    {
      label: 'Invited',
      value: stats.invited,
      icon: EnvelopeIcon,
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100'
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cleaners</h1>
            <p className="text-gray-500 mt-1">Manage your cleaning staff</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading cleaners...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Cleaners</h1>
            <p className="text-gray-500 mt-1">Manage your cleaning staff</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircleIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Error loading cleaners</h3>
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
          <h1 className="text-2xl font-bold text-gray-900">Cleaners</h1>
          <p className="text-gray-500 mt-1">Manage your cleaning staff</p>
        </div>
        <div className="flex items-center gap-3">
          {canWrite('cleaners') && (
            <motion.button
              onClick={() => setShowCreateModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="cursor-pointer inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Cleaner
            </motion.button>
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
                placeholder="Search by name, email, or phone..."
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-500">
                <FunnelIcon className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">Filter:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive' | 'invited')}
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="invited">Invited</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">
                  Cleaner
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">
                  Turnaround Time
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">
                  Properties Assigned
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Rates
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Status
                </th>
                <th className="sticky right-0 bg-gray-50/95 backdrop-blur-sm px-6 py-4 min-w-[60px] shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCleaners.map((cleaner, index) => (
                <motion.tr
                  key={cleaner.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                  onClick={() => handleViewCleaner(cleaner.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow flex-shrink-0">
                        <span className="text-white font-semibold text-sm">
                          {cleaner.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900">{cleaner.name}</div>
                        <div className="text-sm text-gray-500">Added {formatDate(cleaner.createdAt)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-700">{cleaner.email || '—'}</div>
                      <div className="text-gray-500">{cleaner.phone || '—'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-sm text-gray-700">
                      <ClockIcon className="h-4 w-4 text-gray-400" />
                      {formatTurnaroundTime(cleaner.defaultTurnaroundMinutes)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleAssignProperties(cleaner.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors cursor-pointer"
                    >
                      <BuildingOfficeIcon className="h-3.5 w-3.5" />
                      {cleaner.assignedProperties?.length || 0} Properties
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {(() => {
                      const total = cleaner.assignedProperties?.length || 0
                      const withRates = cleaner.assignedProperties?.filter(p => p.rateType != null).length || 0
                      if (total === 0) return <span className="text-xs text-gray-400">—</span>
                      return (
                        <button
                          onClick={() => handleAssignProperties(cleaner.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors cursor-pointer"
                        >
                          <CurrencyDollarIcon className="h-3.5 w-3.5" />
                          {withRates} of {total} set
                        </button>
                      )
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(cleaner.status)}
                  </td>
                  <td className="sticky right-0 bg-white group-hover:bg-blue-50/95 backdrop-blur-sm px-6 py-4 whitespace-nowrap text-right shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]" onClick={(e) => e.stopPropagation()}>
                    <TableActionsDropdown
                      actions={getCleanerActions(cleaner)}
                      itemId={cleaner.id}
                    />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {filteredCleaners.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserCircleIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No cleaners found</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by adding your first cleaner.'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <motion.button
                  onClick={() => setShowCreateModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Your First Cleaner
                </motion.button>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        {filteredCleaners.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{filteredCleaners.length}</span> of{' '}
              <span className="font-medium text-gray-700">{cleaners.length}</span> cleaners
            </p>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <CreateCleanerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAdd={handleAddCleaner}
      />

      {selectedCleaner && (
        <UpdateCleanerModal
          isOpen={showUpdateModal}
          onClose={() => {
            setShowUpdateModal(false)
            setSelectedCleaner(null)
          }}
          cleaner={selectedCleaner}
          onUpdate={handleCleanerUpdated}
        />
      )}

      {selectedCleaner && (
        <DeleteCleanerModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setSelectedCleaner(null)
          }}
          cleaner={selectedCleaner}
          onDeleted={handleCleanerDeleted}
        />
      )}

      {selectedCleaner && (
        <PreviewCleanerModal
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false)
            setSelectedCleaner(null)
          }}
          cleaner={selectedCleaner}
          onEditCleaner={canWrite('cleaners') ? () => {
            setShowPreviewModal(false)
            setShowUpdateModal(true)
          } : undefined}
          onAssignProperties={canWrite('cleaners') ? () => {
            setShowPreviewModal(false)
            setShowAssignModal(true)
          } : undefined}
          onResendInvite={canWrite('cleaners') ? () => handleResendInvite(selectedCleaner.id) : undefined}
          onUpdate={canWrite('cleaners') ? (updatedCleaner: Cleaner) => {
            handleCleanerUpdated(updatedCleaner)
            setSelectedCleaner(updatedCleaner)
          } : undefined}
        />
      )}

      {selectedCleaner && (
        <AssignPropertiesModal
          isOpen={showAssignModal}
          onClose={() => {
            setShowAssignModal(false)
            setSelectedCleaner(null)
          }}
          cleaner={selectedCleaner}
          onUpdate={handleCleanerUpdated}
        />
      )}
    </div>
  )
}
