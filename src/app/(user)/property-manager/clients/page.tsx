"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  CheckCircleIcon,
  BuildingOfficeIcon,
  XCircleIcon,
  FunnelIcon,
  Cog6ToothIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline'
import { getClientsByParentId } from '@/services/clientService'
import { getStatusCodesByUserId } from '@/services/clientCodeService'
import { getNoteCountsByUserId } from '@/services/clientNoteService'
import { Client } from '@/services/types/client'
import { ClientStatusCode } from '@/services/types/clientCode'
import { NoteCountsByClient } from '@/services/types/clientNote'
import { useUserStore } from '@/store/useUserStore'
import CreateClientModal from '@/components/client/create/createClientModal'
import UpdateClientModal from '@/components/client/update/updateClientModal'
import DeleteClientModal from '@/components/client/delete/deleteClientModal'
import StatusCodeManagementModal from '@/components/status/statusCodeManagementModal'
import PMSCredentialModal from '@/components/pms-credential/pmsCredentialModal'
import ClientAgreementModal from '@/components/client-agreement/clientAgreementModal'
import ClientNoteModal from '@/components/client-note/clientNoteModal'
import BulkImportClientModal from '@/components/client/import/bulkImportClientModal'
import PreviewClientModal from '@/components/client/preview/previewClientModal'
import TableActionsDropdown, { ActionItem } from '@/components/shared/TableActionsDropdown'

export default function PropertyManagerClientsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showPMSCredentialModal, setShowPMSCredentialModal] = useState(false)
  const [showAgreementsModal, setShowAgreementsModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [statusCodes, setStatusCodes] = useState<ClientStatusCode[]>([])
  const [noteCounts, setNoteCounts] = useState<NoteCountsByClient>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { profile } = useUserStore()

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return

      try {
        setLoading(true)

        // Fetch clients, status codes, and note counts in parallel
        const [clientsResponse, statusCodesResponse, noteCountsResponse] = await Promise.all([
          getClientsByParentId(profile.id),
          getStatusCodesByUserId(profile.id),
          getNoteCountsByUserId(profile.id)
        ])

        setClients(clientsResponse.data)

        if (statusCodesResponse.status === 'success') {
          setStatusCodes(statusCodesResponse.data)

          // Set default status filter to the default status code if available
          const defaultStatus = statusCodesResponse.data.find(status => status.isDefault)
          if (defaultStatus) {
            setStatusFilter(defaultStatus.id)
          }
        } else {
          setStatusCodes([])
        }

        if (noteCountsResponse.status === 'success') {
          setNoteCounts(noteCountsResponse.data)
        } else {
          setNoteCounts({})
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
        console.error('Error fetching data:', err)
        setStatusCodes([])
        setNoteCounts({})
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [profile?.id])


  const handleAddClient = (newClient: Client) => {
    setClients(prev => [...prev, newClient])
  }

  const handleViewClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    if (client) {
      setSelectedClient(client)
      setShowPreviewModal(true)
    }
  }

  const handleEditClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    if (client) {
      setSelectedClient(client)
      setShowUpdateModal(true)
    }
  }

  const handleDeleteClient = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    if (client) {
      setSelectedClient(client)
      setShowDeleteModal(true)
    }
  }

  const handlePMSCredentials = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    if (client) {
      setSelectedClient(client)
      setShowPMSCredentialModal(true)
    }
  }

  const handleAgreements = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    if (client) {
      setSelectedClient(client)
      setShowAgreementsModal(true)
    }
  }

  const handleNotes = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    if (client) {
      setSelectedClient(client)
      setShowNotesModal(true)
    }
  }

  const handleClientDeleted = (clientId: string) => {
    setClients(prev => prev.filter(c => c.id !== clientId))
  }

  const handleClientUpdated = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c))
  }

  const handleNotesUpdated = async () => {
    // Refresh note counts when notes are added/edited/deleted
    if (profile?.id) {
      try {
        const noteCountsResponse = await getNoteCountsByUserId(profile.id)
        if (noteCountsResponse.status === 'success') {
          setNoteCounts(noteCountsResponse.data)
        }
      } catch (error) {
        console.error('Error refreshing note counts:', error)
      }
    }
  }

  const handlePMSCredentialUpdate = () => {
    // Refresh clients data to get updated pms_credentials field
    if (profile?.id) {
      getClientsByParentId(profile.id).then(response => {
        setClients(response.data)
      }).catch(err => {
        console.error('Error refreshing clients:', err)
      })
    }
  }

  const handleBulkImportComplete = (importedClients: Client[]) => {
    // Add imported clients to the list
    setClients(prev => [...importedClients, ...prev])
  }

  const getClientActions = (client: Client): ActionItem[] => [
    {
      label: 'Edit Client',
      icon: PencilIcon,
      onClick: () => handleEditClient(client.id),
      variant: 'default'
    },
    {
      label: 'PMS Credentials',
      icon: KeyIcon,
      onClick: () => handlePMSCredentials(client.id),
      variant: 'default'
    },
    {
      label: 'Agreements',
      icon: DocumentTextIcon,
      onClick: () => handleAgreements(client.id),
      variant: 'default'
    },
    {
      label: 'Delete Client',
      icon: TrashIcon,
      onClick: () => handleDeleteClient(client.id),
      variant: 'danger'
    }
  ]

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Filter and sort clients - inactive at bottom
  const filteredClients = clients
    .filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.companyName && client.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesStatus = statusFilter === 'All Status' ||
        (statusFilter === 'Active' && client.isActive) ||
        (statusFilter === 'Inactive' && !client.isActive) ||
        (client.statusId === statusFilter) // Match custom status codes by ID
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      // Active clients first, inactive at bottom
      if (a.isActive && !b.isActive) return -1
      if (!a.isActive && b.isActive) return 1

      // Within each status group, sort by last updated (most recent first)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

  const getStatusBadge = (client: Client) => {
    // If client has custom status info, use that
    if (client.statusInfo) {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
          style={{
            backgroundColor: client.statusInfo.colorHex + '20',
            color: client.statusInfo.colorHex
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: client.statusInfo.colorHex }}
          ></span>
          {client.statusInfo.label}
        </span>
      )
    }

    // Fallback to simple active/inactive display
    if (client.isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          Active
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
        Inactive
      </span>
    )
  }

  // Calculate stats
  const stats = {
    total: clients.length,
    active: clients.filter(c => c.isActive).length,
    companies: clients.filter(c => c.companyName).length,
    inactive: clients.filter(c => !c.isActive).length
  }

  const statCards = [
    {
      label: 'Total Clients',
      value: stats.total,
      icon: UserGroupIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100'
    },
    {
      label: 'Active Clients',
      value: stats.active,
      icon: CheckCircleIcon,
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100'
    },
    {
      label: 'Companies',
      value: stats.companies,
      icon: BuildingOfficeIcon,
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100'
    },
    {
      label: 'Inactive Clients',
      value: stats.inactive,
      icon: XCircleIcon,
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
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-500 mt-1">Manage your client relationships</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading clients...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-500 mt-1">Manage your client relationships</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircleIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Error loading clients</h3>
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
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 mt-1">Manage your client relationships</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setShowImportModal(true)}
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
            Add Client
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
                placeholder="Search clients..."
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-500">
                <FunnelIcon className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">Filters:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
              >
                <option value="All Status">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                {statusCodes.length > 0 && <option disabled>──────────</option>}
                {statusCodes.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.label} ({status.code})
                    {status.isDefault ? ' - Default' : ''}
                  </option>
                ))}
              </select>
              <motion.button
                onClick={() => setShowStatusModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-colors"
              >
                <Cog6ToothIcon className="h-4 w-4 mr-2" />
                Manage Status
              </motion.button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">
                  Client
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[180px]">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">
                  Phone
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[160px]">
                  Company
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[130px]">
                  PMS Credentials
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Notes
                </th>
                <th className="sticky right-0 bg-gray-50/95 backdrop-blur-sm px-6 py-4 min-w-[60px] shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.map((client, index) => (
                <motion.tr
                  key={client.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                  onClick={() => handleViewClient(client.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow flex-shrink-0">
                        <span className="text-white font-semibold text-sm">
                          {client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-500">Added {formatDate(client.createdAt)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700">{client.email || '—'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700">{client.phone || '—'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-700">{client.companyName || '—'}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(client)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {client.pmsCredentials ? (
                      <button
                        onClick={() => handlePMSCredentials(client.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition-colors cursor-pointer"
                      >
                        <KeyIcon className="w-3.5 h-3.5" />
                        Configured
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePMSCredentials(client.id)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors cursor-pointer"
                      >
                        <KeyIcon className="w-3.5 h-3.5" />
                        Not Set
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleNotes(client.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors cursor-pointer"
                    >
                      <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                      {noteCounts[client.id] > 0 && (
                        <span>{noteCounts[client.id]}</span>
                      )}
                      {noteCounts[client.id] > 0 ? '' : 'Notes'}
                    </button>
                  </td>
                  <td className="sticky right-0 bg-white group-hover:bg-blue-50/95 backdrop-blur-sm px-6 py-4 whitespace-nowrap text-right shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]" onClick={(e) => e.stopPropagation()}>
                    <TableActionsDropdown
                      actions={getClientActions(client)}
                      itemId={client.id}
                    />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {filteredClients.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UserGroupIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No clients found</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'All Status'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by adding your first client.'}
              </p>
              {!searchTerm && statusFilter === 'All Status' && (
                <motion.button
                  onClick={() => setShowCreateModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Your First Client
                </motion.button>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        {filteredClients.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{filteredClients.length}</span> of{' '}
              <span className="font-medium text-gray-700">{clients.length}</span> clients
            </p>
          </div>
        )}
      </motion.div>

      {/* Create Client Modal */}
      <CreateClientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAdd={handleAddClient}
      />

      {/* Update Client Modal */}
      {selectedClient && (
        <UpdateClientModal
          isOpen={showUpdateModal}
          onClose={() => {
            setShowUpdateModal(false)
            setSelectedClient(null)
          }}
          client={selectedClient}
          onUpdate={handleClientUpdated}
        />
      )}

      {/* Delete Client Modal */}
      {selectedClient && (
        <DeleteClientModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setSelectedClient(null)
          }}
          client={selectedClient}
          onDeleted={handleClientDeleted}
        />
      )}

      {/* Status Code Management Modal */}
      <StatusCodeManagementModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onStatusUpdate={async () => {
          // Refresh status codes when they're updated
          if (profile?.id) {
            try {
              const response = await getStatusCodesByUserId(profile.id)
              if (response.status === 'success') {
                setStatusCodes(response.data)
              }
            } catch (error) {
              console.error('Error refreshing status codes:', error)
            }
          }
        }}
      />

      {/* PMS Credential Modal */}
      {selectedClient && (
        <PMSCredentialModal
          isOpen={showPMSCredentialModal}
          onClose={() => {
            setShowPMSCredentialModal(false)
            setSelectedClient(null)
          }}
          clientId={selectedClient.id}
          clientName={selectedClient.name}
          onCredentialUpdate={handlePMSCredentialUpdate}
        />
      )}

      {/* Client Agreement Modal */}
      {selectedClient && (
        <ClientAgreementModal
          isOpen={showAgreementsModal}
          onClose={() => {
            setShowAgreementsModal(false)
            setSelectedClient(null)
          }}
          clientId={selectedClient.id}
          clientName={selectedClient.name}
          onAgreementUpdate={() => {
            // Could refresh clients data if needed for agreement counts
            console.log('Agreement updated for client:', selectedClient.id)
          }}
        />
      )}

      {/* Client Notes Modal */}
      {selectedClient && (
        <ClientNoteModal
          isOpen={showNotesModal}
          onClose={() => {
            setShowNotesModal(false)
            setSelectedClient(null)
          }}
          clientId={selectedClient.id}
          clientName={selectedClient.name}
          onNoteUpdate={handleNotesUpdated}
        />
      )}

      {/* Bulk Import Client Modal */}
      <BulkImportClientModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={handleBulkImportComplete}
        existingClients={clients}
        statusCodes={statusCodes}
      />

      {/* Preview Client Modal */}
      {selectedClient && (
        <PreviewClientModal
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false)
            setSelectedClient(null)
          }}
          client={selectedClient}
          onEditClient={() => {
            setShowPreviewModal(false)
            setShowUpdateModal(true)
          }}
          onManagePMS={() => {
            setShowPreviewModal(false)
            setShowPMSCredentialModal(true)
          }}
          onManageAgreements={() => {
            setShowPreviewModal(false)
            setShowAgreementsModal(true)
          }}
          onManageNotes={() => {
            setShowPreviewModal(false)
            setShowNotesModal(true)
          }}
          noteCount={noteCounts[selectedClient.id] || 0}
        />
      )}
    </div>
  )
}
