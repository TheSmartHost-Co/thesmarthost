"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  FunnelIcon,
  EyeIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import { getTeamMembers, calculateTeamMemberStats, resendTeamMemberInvite } from '@/services/teamMemberService'
import { useNotificationStore } from '@/store/useNotificationStore'
import { TeamMember, TeamMemberStats } from '@/services/types/teamMember'
import { useUserStore } from '@/store/useUserStore'
import { usePermissions } from '@/hooks/usePermissions'
import { PERMISSION_TEMPLATES } from '@/constants/permissionTemplates'
import { PERMISSION_KEYS } from '@/constants/permissionTemplates'
import TableActionsDropdown, { ActionItem } from '@/components/shared/TableActionsDropdown'
import CreateTeamMemberModal from '@/components/team-member/create/CreateTeamMemberModal'
import UpdateTeamMemberModal from '@/components/team-member/update/UpdateTeamMemberModal'
import DeleteTeamMemberModal from '@/components/team-member/delete/DeleteTeamMemberModal'
import PreviewTeamMemberModal from '@/components/team-member/preview/PreviewTeamMemberModal'

export default function TeamMembersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'invited'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [stats, setStats] = useState<TeamMemberStats>({ total: 0, active: 0, inactive: 0, invited: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { profile } = useUserStore()
  const showNotification = useNotificationStore((state) => state.showNotification)
  const { effectiveUserId, isPM } = usePermissions()

  // Only PMs can access this page
  useEffect(() => {
    if (profile && !isPM) {
      showNotification('Only property managers can manage team members', 'error')
      window.location.href = '/property-manager/dashboard'
    }
  }, [profile, isPM, showNotification])

  useEffect(() => {
    const fetchData = async () => {
      if (!effectiveUserId) return

      try {
        setLoading(true)
        const response = await getTeamMembers(effectiveUserId)

        if (response.status === 'success') {
          setMembers(response.data)
          setStats(calculateTeamMemberStats(response.data))
        } else {
          setError(response.message || 'Failed to fetch team members')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch team members')
        console.error('Error fetching team members:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [effectiveUserId])

  const handleAddMember = (newMember: TeamMember) => {
    setMembers(prev => [...prev, newMember])
    setStats(calculateTeamMemberStats([...members, newMember]))
  }

  const handleViewMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    if (member) {
      setSelectedMember(member)
      setShowPreviewModal(true)
    }
  }

  const handleEditMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    if (member) {
      setSelectedMember(member)
      setShowUpdateModal(true)
    }
  }

  const handleDeleteMember = (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    if (member) {
      setSelectedMember(member)
      setShowDeleteModal(true)
    }
  }

  const handleMemberDeleted = (memberId: string) => {
    const updatedMembers = members.filter(m => m.id !== memberId)
    setMembers(updatedMembers)
    setStats(calculateTeamMemberStats(updatedMembers))
  }

  const handleMemberUpdated = (updatedMember: TeamMember) => {
    const updatedMembers = members.map(m => m.id === updatedMember.id ? updatedMember : m)
    setMembers(updatedMembers)
    setStats(calculateTeamMemberStats(updatedMembers))
  }

  const handleResendInvite = async (memberId: string) => {
    const member = members.find(m => m.id === memberId)
    if (!member) return

    try {
      const res = await resendTeamMemberInvite(memberId)
      if (res.status === 'success') {
        showNotification(`Invite email sent to ${member.email}`, 'success')
      } else {
        showNotification(res.message || 'Failed to send invite', 'error')
      }
    } catch (err) {
      console.error('Error resending invite:', err)
      showNotification('Error sending invite email', 'error')
    }
  }

  const getMemberActions = (member: TeamMember): ActionItem[] => {
    const actions: ActionItem[] = [
      {
        label: 'View Details',
        icon: EyeIcon,
        onClick: () => handleViewMember(member.id),
        variant: 'default'
      },
      {
        label: 'Edit Member',
        icon: PencilIcon,
        onClick: () => handleEditMember(member.id),
        variant: 'default'
      },
    ]

    // Only show Resend Invite for invited members
    if (member.status === 'invited' && member.email) {
      actions.push({
        label: 'Resend Invite',
        icon: EnvelopeIcon,
        onClick: () => handleResendInvite(member.id),
        variant: 'default'
      })
    }

    actions.push({
      label: 'Delete Member',
      icon: TrashIcon,
      onClick: () => handleDeleteMember(member.id),
      variant: 'danger'
    })

    return actions
  }

  // Detect which permission template a member matches
  const getPermissionTemplateName = (member: TeamMember): string => {
    const templateEntries = Object.entries(PERMISSION_TEMPLATES)
    for (const [key, template] of templateEntries) {
      if (key === 'custom') continue
      const match = PERMISSION_KEYS.every(
        (pk) => member.permissions[pk] === template.permissions[pk]
      )
      if (match) return template.label
    }
    return 'Custom'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Filter and sort members
  const filteredMembers = members
    .filter(member => {
      const matchesSearch =
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.phone && member.phone.includes(searchTerm))

      const matchesStatus =
        statusFilter === 'all' || member.status === statusFilter

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      const statusOrder = { active: 0, invited: 1, inactive: 2 }
      const orderDiff = statusOrder[a.status] - statusOrder[b.status]
      if (orderDiff !== 0) return orderDiff
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
      label: 'Total Members',
      value: stats.total,
      icon: UsersIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100'
    },
    {
      label: 'Active',
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
            <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
            <p className="text-gray-500 mt-1">Manage your team and their permissions</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading team members...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
            <p className="text-gray-500 mt-1">Manage your team and their permissions</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircleIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Error loading team members</h3>
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
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="text-gray-500 mt-1">Manage your team and their permissions</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setShowCreateModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="cursor-pointer inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Invite Team Member
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
                  Team Member
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">
                  Permissions
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">
                  Last Active
                </th>
                <th className="sticky right-0 bg-gray-50/95 backdrop-blur-sm px-6 py-4 min-w-[60px] shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMembers.map((member, index) => (
                <motion.tr
                  key={member.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                  onClick={() => handleViewMember(member.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow flex-shrink-0">
                        <span className="text-white font-semibold text-sm">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500">Joined {formatDate(member.createdAt)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700">{member.email}</div>
                    {member.phone && (
                      <div className="text-sm text-gray-500">{member.phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(member.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700">
                      {getPermissionTemplateName(member)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(member.lastActiveAt)}
                  </td>
                  <td className="sticky right-0 bg-white group-hover:bg-blue-50/95 backdrop-blur-sm px-6 py-4 whitespace-nowrap text-right shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]" onClick={(e) => e.stopPropagation()}>
                    <TableActionsDropdown
                      actions={getMemberActions(member)}
                      itemId={member.id}
                    />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          {/* Empty State */}
          {filteredMembers.length === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <UsersIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No team members found</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by inviting your first team member.'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <motion.button
                  onClick={() => setShowCreateModal(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Invite Your First Team Member
                </motion.button>
              )}
            </div>
          )}
        </div>

        {/* Results count */}
        {filteredMembers.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium text-gray-700">{filteredMembers.length}</span> of{' '}
              <span className="font-medium text-gray-700">{members.length}</span> team members
            </p>
          </div>
        )}
      </motion.div>

      {/* Modals */}
      <CreateTeamMemberModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAdd={handleAddMember}
      />

      {selectedMember && (
        <UpdateTeamMemberModal
          isOpen={showUpdateModal}
          onClose={() => {
            setShowUpdateModal(false)
            setSelectedMember(null)
          }}
          member={selectedMember}
          onUpdate={handleMemberUpdated}
        />
      )}

      {selectedMember && (
        <DeleteTeamMemberModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false)
            setSelectedMember(null)
          }}
          member={selectedMember}
          onDelete={handleMemberDeleted}
        />
      )}

      {selectedMember && (
        <PreviewTeamMemberModal
          isOpen={showPreviewModal}
          onClose={() => {
            setShowPreviewModal(false)
            setSelectedMember(null)
          }}
          member={selectedMember}
        />
      )}
    </div>
  )
}
