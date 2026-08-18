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
  WrenchScrewdriverIcon,
  EyeIcon,
  EnvelopeIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'
import { getContractors, calculateContractorStats, resendContractorInvite } from '@/services/contractorService'
import { useNotificationStore } from '@/store/useNotificationStore'
import { Contractor, ContractorStats } from '@/services/types/contractor'
import { useTranslation } from 'react-i18next'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import TableActionsDropdown, { ActionItem } from '@/components/shared/TableActionsDropdown'
import CreateContractorModal from '@/components/contractor/create/CreateContractorModal'
import UpdateContractorModal from '@/components/contractor/update/UpdateContractorModal'
import DeleteContractorModal from '@/components/contractor/delete/DeleteContractorModal'
import PreviewContractorModal from '@/components/contractor/preview/PreviewContractorModal'
import { useImpersonationStore } from '@/store/useImpersonationStore'
import { useRouter } from 'next/navigation'

export default function PropertyManagerContractorsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'invited'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null)
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [stats, setStats] = useState<ContractorStats>({ total: 0, active: 0, inactive: 0, invited: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const showNotification = useNotificationStore((state) => state.showNotification)
  const { t } = useTranslation('turnover')
  usePermissionGuard('contractors')
  const { effectiveUserId, canWrite } = usePermissions()
  const { startImpersonation } = useImpersonationStore()
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      if (!effectiveUserId) return

      try {
        setLoading(true)
        const response = await getContractors(effectiveUserId)

        if (response.status === 'success') {
          setContractors(response.data)
          setStats(calculateContractorStats(response.data))
        } else {
          setError(response.message || 'Failed to fetch contractors')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch contractors')
        console.error('Error fetching contractors:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [effectiveUserId])

  const handleAddContractor = (newContractor: Contractor) => {
    setContractors(prev => [...prev, newContractor])
    setStats(calculateContractorStats([...contractors, newContractor]))
  }

  const handleViewContractor = (contractorId: string) => {
    const contractor = contractors.find(c => c.id === contractorId)
    if (contractor) {
      setSelectedContractor(contractor)
      setShowPreviewModal(true)
    }
  }

  const handleEditContractor = (contractorId: string) => {
    const contractor = contractors.find(c => c.id === contractorId)
    if (contractor) {
      setSelectedContractor(contractor)
      setShowUpdateModal(true)
    }
  }

  const handleDeleteContractor = (contractorId: string) => {
    const contractor = contractors.find(c => c.id === contractorId)
    if (contractor) {
      setSelectedContractor(contractor)
      setShowDeleteModal(true)
    }
  }

  const handleContractorDeleted = (contractorId: string) => {
    const updatedContractors = contractors.filter(c => c.id !== contractorId)
    setContractors(updatedContractors)
    setStats(calculateContractorStats(updatedContractors))
  }

  const handleContractorUpdated = (updatedContractor: Contractor) => {
    const updatedContractors = contractors.map(c => c.id === updatedContractor.id ? updatedContractor : c)
    setContractors(updatedContractors)
    setStats(calculateContractorStats(updatedContractors))
  }

  const handleResendInvite = async (contractorId: string) => {
    const contractor = contractors.find(c => c.id === contractorId)
    if (!contractor) return

    if (!contractor.email) {
      showNotification('Contractor does not have an email address', 'error')
      return
    }

    try {
      const res = await resendContractorInvite(contractorId)
      if (res.status === 'success') {
        showNotification(`Invite email sent to ${contractor.email}`, 'success')
      } else {
        showNotification(res.message || 'Failed to send invite', 'error')
      }
    } catch (err) {
      console.error('Error resending invite:', err)
      showNotification('Error sending invite email', 'error')
    }
  }

  const handleViewAsContractor = (contractor: Contractor) => {
    startImpersonation({
      type: 'contractor',
      id: contractor.id,
      name: contractor.name,
      role: 'CONTRACTOR',
    })
    router.push('/contractor/dashboard')
  }

  const getContractorActions = (contractor: Contractor): ActionItem[] => {
    const actions: ActionItem[] = [
      {
        label: t('viewDetails', { ns: 'common' }),
        icon: EyeIcon,
        onClick: () => handleViewContractor(contractor.id),
        variant: 'default'
      },
    ]

    if (contractor.status === 'active' && contractor.authUserId) {
      actions.push({
        label: `View as ${contractor.name}`,
        icon: EyeIcon,
        onClick: () => handleViewAsContractor(contractor),
        variant: 'highlight'
      })
    }

    if (canWrite('contractors')) {
      actions.push({
        label: t('editContractor', { ns: 'common' }),
        icon: PencilIcon,
        onClick: () => handleEditContractor(contractor.id),
        variant: 'default'
      })

      // Only show Resend Invite if contractor has an email and auth account
      if (contractor.email && contractor.authUserId) {
        actions.push({
          label: t('resendInvite'),
          icon: EnvelopeIcon,
          onClick: () => handleResendInvite(contractor.id),
          variant: 'default'
        })
      }

      actions.push({
        label: t('deleteContractor', { ns: 'common' }),
        icon: TrashIcon,
        onClick: () => handleDeleteContractor(contractor.id),
        variant: 'danger'
      })
    }

    return actions
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Filter and sort contractors
  const filteredContractors = contractors
    .filter(contractor => {
      const matchesSearch =
        contractor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contractor.email && contractor.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (contractor.phone && contractor.phone.includes(searchTerm)) ||
        (contractor.trade && contractor.trade.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus =
        statusFilter === 'all' || contractor.status === statusFilter

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
      label: t('totalContractors'),
      value: stats.total,
      icon: UserCircleIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100'
    },
    {
      label: t('activeContractors'),
      value: stats.active,
      icon: CheckCircleIcon,
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100'
    },
    {
      label: 'Invited',
      value: stats.invited,
      icon: EnvelopeIcon,
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100'
    },
    {
      label: 'Inactive',
      value: stats.inactive,
      icon: XCircleIcon,
      bgColor: 'bg-gray-50',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-500',
      borderColor: 'border-gray-200'
    }
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('contractorsTitle')}</h1>
            <p className="text-gray-500 mt-1">{t('contractorsSubtitle')}</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">{t('loadingContractors')}</p>
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
            <h1 className="text-2xl font-bold text-gray-900">{t('contractorsTitle')}</h1>
            <p className="text-gray-500 mt-1">{t('contractorsSubtitle')}</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircleIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">{t('errorLoadingContractors')}</h3>
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
          <h1 className="text-2xl font-bold text-gray-900">{t('contractorsTitle')}</h1>
          <p className="text-gray-500 mt-1">{t('contractorsSubtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {canWrite('contractors') && (
            <motion.button
              onClick={() => setShowCreateModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="cursor-pointer inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Contractor
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
                placeholder={t('searchContractors')}
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
                  Contractor
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">
                  Trade / Specialty
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Hourly Rate
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
              {filteredContractors.map((contractor, index) => (
                <motion.tr
                  key={contractor.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                  onClick={() => handleViewContractor(contractor.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow flex-shrink-0">
                        <span className="text-white font-semibold text-sm">
                          {contractor.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900">{contractor.name}</div>
                        <div className="text-sm text-gray-500">{contractor.email || `Added ${formatDate(contractor.createdAt)}`}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700">{contractor.phone || '—'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contractor.trade ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700">
                        <WrenchScrewdriverIcon className="h-3.5 w-3.5" />
                        {contractor.trade}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {contractor.hourlyRate != null ? (
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                        ${contractor.hourlyRate.toFixed(2)}/hr
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(contractor.status)}
                  </td>
                  <td className="sticky right-0 bg-white group-hover:bg-blue-50/95 backdrop-blur-sm px-6 py-4 whitespace-nowrap text-right shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]" onClick={(e) => e.stopPropagation()}>
                    <TableActionsDropdown
                      actions={getContractorActions(contractor)}
                      itemId={contractor.id}
                    />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {filteredContractors.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserCircleIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('noContractorsFound')}</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'all'
                  ? t('tryAdjustingFilters', { ns: 'common' })
                  : t('getStartedContractors')}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <motion.button
                  onClick={() => setShowCreateModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Your First Contractor
                </motion.button>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        {filteredContractors.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{filteredContractors.length}</span> of{' '}
              <span className="font-medium text-gray-700">{contractors.length}</span> contractors
            </p>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <CreateContractorModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAdd={handleAddContractor}
      />

      {selectedContractor && (
        <UpdateContractorModal
          isOpen={showUpdateModal}
          onClose={() => {
            setShowUpdateModal(false)
            setSelectedContractor(null)
          }}
          contractor={selectedContractor}
          onUpdate={handleContractorUpdated}
        />
      )}

      {selectedContractor && (
        <DeleteContractorModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setSelectedContractor(null)
          }}
          contractor={selectedContractor}
          onDeleted={handleContractorDeleted}
        />
      )}

      {selectedContractor && (
        <PreviewContractorModal
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false)
            setSelectedContractor(null)
          }}
          contractor={selectedContractor}
          onEditContractor={canWrite('contractors') ? () => {
            setShowPreviewModal(false)
            setShowUpdateModal(true)
          } : undefined}
          onResendInvite={canWrite('contractors') ? () => handleResendInvite(selectedContractor.id) : undefined}
        />
      )}
    </div>
  )
}
