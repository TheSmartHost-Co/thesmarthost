"use client"

import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon, KeyIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { getClientsByParentId } from '@/services/clientService'
import { getStatusCodesByUserId } from '@/services/clientCodeService'
import { Client } from '@/services/types/client'
import { ClientStatusCode } from '@/services/types/clientCode'
import { useUserStore } from '@/store/useUserStore'
import CreateClientModal from '@/components/client/create/createClientModal'
import UpdateClientModal from '@/components/client/update/updateClientModal'
import DeleteClientModal from '@/components/client/delete/deleteClientModal'
import StatusCodeManagementModal from '@/components/status/statusCodeManagementModal'
import PMSCredentialModal from '@/components/pms-credential/pmsCredentialModal'
import ClientAgreementModal from '@/components/client-agreement/clientAgreementModal'
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
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [statusCodes, setStatusCodes] = useState<ClientStatusCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { profile } = useUserStore()

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.id) return
      
      try {
        setLoading(true)
        
        // Fetch both clients and status codes in parallel
        const [clientsResponse, statusCodesResponse] = await Promise.all([
          getClientsByParentId(profile.id),
          getStatusCodesByUserId(profile.id)
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
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
        console.error('Error fetching data:', err)
        setStatusCodes([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [profile?.id])


  const handleAddClient = (newClient: Client) => {
    setClients(prev => [...prev, newClient])
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

  const handleClientDeleted = (clientId: string) => {
    setClients(prev => prev.filter(c => c.id !== clientId))
  }

  const handleClientUpdated = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c))
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
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
          style={{ 
            backgroundColor: client.statusInfo.colorHex + '20',
            color: client.statusInfo.colorHex
          }}
        >
          {client.statusInfo.label}
        </span>
      )
    }
    
    // Fallback to simple active/inactive display
    if (client.isActive) {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600">Manage your Clients</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600">Manage your Clients</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading clients: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Manage your Clients</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
            </div>
            <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Clients</p>
              <p className="text-2xl font-bold text-gray-900">{clients.filter(c => c.isActive).length}</p>
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
              <p className="text-sm font-medium text-gray-600">Companies</p>
              <p className="text-2xl font-bold text-gray-900">{clients.filter(c => c.companyName).length}</p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inactive Clients</p>
              <p className="text-2xl font-bold text-gray-900">{clients.filter(c => !c.isActive).length}</p>
            </div>
            <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
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
                  placeholder="Search clients..."
                />
              </div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-black border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
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
              <button
                onClick={() => setShowStatusModal(true)}
                className="text-sm cursor-pointer items-center px-3 py-1 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Manage Status
              </button>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex cursor-pointer items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Client
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-150">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                  PMS Credentials
                </th>
                <th className="relative px-6 py-3 bg-gray-50">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{client.name}</div>
                      <div className="text-sm text-gray-500">Added {formatDate(client.createdAt)}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{client.email || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{client.phone || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{client.companyName || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(client)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {client.pmsCredentials ? (
                      <button
                        onClick={() => handlePMSCredentials(client.id)}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors cursor-pointer"
                      >
                        <KeyIcon className="w-3 h-3 mr-1" />
                        Configured
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePMSCredentials(client.id)}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors cursor-pointer"
                      >
                        <KeyIcon className="w-3 h-3 mr-1" />
                        Not Set
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <TableActionsDropdown
                      actions={getClientActions(client)}
                      itemId={client.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredClients.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating your first client.'}
              </p>
            </div>
          )}
        </div>
      </div>

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
    </div>
  )
}