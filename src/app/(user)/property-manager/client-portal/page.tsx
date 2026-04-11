'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  EnvelopeIcon,
  FunnelIcon,
  ArrowPathIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline'
import {
  getClientsByParentId,
  inviteClientToPortal,
  resendClientPortalInvite,
  revokeClientPortalAccess,
  restoreClientPortalAccess,
} from '@/services/clientService'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useTranslation } from 'react-i18next'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { Client } from '@/services/types/client'
import TableActionsDropdown, { ActionItem } from '@/components/shared/TableActionsDropdown'

type PortalStatusFilter = 'all' | 'active' | 'invited' | 'not_invited' | 'inactive'

interface PortalStats {
  total: number
  portalActive: number
  portalInvited: number
  notInvited: number
}

function calculatePortalStats(clients: Client[]): PortalStats {
  return {
    total: clients.length,
    portalActive: clients.filter(c => c.portalStatus === 'active').length,
    portalInvited: clients.filter(c => c.portalStatus === 'invited').length,
    notInvited: clients.filter(c => !c.portalStatus || c.portalStatus === 'not_invited').length,
  }
}

export default function ClientPortalPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<PortalStatusFilter>('all')
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState<PortalStats>({ total: 0, portalActive: 0, portalInvited: 0, notInvited: 0 })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const showNotification = useNotificationStore((state) => state.showNotification)
  const { effectiveUserId } = usePermissions()
  const { t } = useTranslation('clientPortal')
  usePermissionGuard('client_portal')

  const fetchClients = useCallback(async () => {
    if (!effectiveUserId) return
    try {
      setLoading(true)
      const response = await getClientsByParentId(effectiveUserId)
      if (response.status === 'success') {
        setClients(response.data)
        setStats(calculatePortalStats(response.data))
      }
    } catch (err) {
      console.error('Error fetching clients:', err)
    } finally {
      setLoading(false)
    }
  }, [effectiveUserId])

  useEffect(() => { fetchClients() }, [fetchClients])

  const handleInvite = async (client: Client) => {
    setActionLoading(client.id)
    try {
      const res = await inviteClientToPortal(client.id)
      if (res.status === 'success') {
        showNotification(`Invitation sent to ${client.name}`, 'success')
        await fetchClients()
      } else {
        showNotification(res.message || 'Failed to send invitation', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to send invitation', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResendInvite = async (client: Client) => {
    setActionLoading(client.id)
    try {
      const res = await resendClientPortalInvite(client.id)
      if (res.status === 'success') {
        showNotification(`Invitation resent to ${client.name}`, 'success')
      } else {
        showNotification(res.message || 'Failed to resend invitation', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to resend invitation', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRevoke = async (client: Client) => {
    setActionLoading(client.id)
    try {
      const res = await revokeClientPortalAccess(client.id)
      if (res.status === 'success') {
        showNotification(`Portal access revoked for ${client.name}`, 'success')
        await fetchClients()
      } else {
        showNotification(res.message || 'Failed to revoke access', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to revoke access', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRestore = async (client: Client) => {
    setActionLoading(client.id)
    try {
      const res = await restoreClientPortalAccess(client.id)
      if (res.status === 'success') {
        showNotification(`Portal access restored for ${client.name}`, 'success')
        await fetchClients()
      } else {
        showNotification(res.message || 'Failed to restore access', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Failed to restore access', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const getActions = (client: Client): ActionItem[] => {
    const portalStatus = client.portalStatus || 'not_invited'
    const actions: ActionItem[] = []

    if (portalStatus === 'not_invited' && client.email) {
      actions.push({
        label: t('inviteToPortal'),
        icon: EnvelopeIcon,
        onClick: () => handleInvite(client),
      })
    }
    if (portalStatus === 'invited') {
      actions.push({
        label: t('resendInvitation'),
        icon: ArrowPathIcon,
        onClick: () => handleResendInvite(client),
      })
    }
    if (portalStatus === 'active') {
      actions.push({
        label: t('revokeAccess'),
        icon: ShieldExclamationIcon,
        onClick: () => handleRevoke(client),
        variant: 'danger' as const,
      })
    }
    if (portalStatus === 'inactive') {
      actions.push({
        label: t('restoreAccess'),
        icon: CheckCircleIcon,
        onClick: () => handleRestore(client),
      })
    }

    return actions
  }

  const portalStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><CheckCircleIcon className="w-3 h-3" />Active</span>
      case 'invited':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><ClockIcon className="w-3 h-3" />Invited</span>
      case 'inactive':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircleIcon className="w-3 h-3" />Revoked</span>
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Not Invited</span>
    }
  }

  const filteredClients = clients
    .filter(c => {
      if (statusFilter === 'all') return true
      const ps = c.portalStatus || 'not_invited'
      return ps === statusFilter
    })
    .filter(c => {
      if (!searchTerm) return true
      const term = searchTerm.toLowerCase()
      return (
        c.name.toLowerCase().includes(term) ||
        (c.email?.toLowerCase().includes(term)) ||
        (c.companyName?.toLowerCase().includes(term))
      )
    })

  const statCards = [
    { label: 'Total Clients', value: stats.total, icon: UserGroupIcon, color: 'bg-gray-100 text-gray-600' },
    { label: 'Portal Active', value: stats.portalActive, icon: CheckCircleIcon, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Invited', value: stats.portalInvited, icon: ClockIcon, color: 'bg-amber-100 text-amber-600' },
    { label: 'Not Invited', value: stats.notInvited, icon: EnvelopeIcon, color: 'bg-gray-100 text-gray-500' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-2 text-gray-500">
          <svg className="animate-spin h-5 w-5 text-emerald-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading client portal data...
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-4"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchClients')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-gray-900"
          />
        </div>
        <div className="relative">
          <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PortalStatusFilter)}
            className="pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white text-gray-900 appearance-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="not_invited">Not Invited</option>
            <option value="inactive">Revoked</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Company</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Portal Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-500 text-sm">
                    {searchTerm || statusFilter !== 'all'
                      ? 'No clients match your filters'
                      : 'No clients found. Add clients from the Clients page first.'}
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-500 sm:hidden">{client.email || 'No email'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-sm text-gray-600">{client.email || <span className="text-gray-400 italic">No email</span>}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-gray-600">{client.companyName || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {portalStatusBadge(client.portalStatus)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {actionLoading === client.id ? (
                        <svg className="animate-spin h-4 w-4 text-emerald-600 inline-block" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : (
                        <TableActionsDropdown actions={getActions(client)} itemId={client.id} />
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
