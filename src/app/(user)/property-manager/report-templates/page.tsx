'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import { getReportTemplates, deleteReportTemplate, cloneReportTemplate } from '@/services/reportTemplateService'
import type { FullReportTemplate } from '@/services/types/reportTemplate'
import {
  PlusIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  PencilSquareIcon,
  XMarkIcon,
  DocumentTextIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import TableActionsDropdown, { ActionItem } from '@/components/shared/TableActionsDropdown'
import CreateReportTemplateModal from '@/components/report-template/create/createReportTemplateModal'
import DeleteReportTemplateModal from '@/components/report-template/delete/deleteReportTemplateModal'
import EditReportTemplateModal from '@/components/report-template/edit/editReportTemplateModal'

export default function ReportTemplatesPage() {
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()
  usePermissionGuard('report_templates')
  const { effectiveUserId, canWrite } = usePermissions()

  // Data state
  const [templates, setTemplates] = useState<FullReportTemplate[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Search state
  const [searchTerm, setSearchTerm] = useState('')

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [showEditModal, setShowEditModal] = useState<boolean>(false)
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false)
  const [selectedTemplate, setSelectedTemplate] = useState<FullReportTemplate | null>(null)

  // Action state
  const [cloningTemplateId, setCloningTemplateId] = useState<string | null>(null)

  // Load data on mount
  useEffect(() => {
    if (profile?.id) {
      loadTemplates()
    }
  }, [profile])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      setError(null)

      const res = await getReportTemplates(effectiveUserId!)

      if (res.status === 'success') {
        setTemplates(res.data || [])
      } else {
        setError(res.message || 'Failed to load templates')
      }
    } catch (err) {
      console.error('Error loading templates:', err)
      setError('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleCloneTemplate = async (template: FullReportTemplate) => {
    try {
      setCloningTemplateId(template.id)
      const res = await cloneReportTemplate(template.id, {
        userId: effectiveUserId!,
        name: `${template.name} (Copy)`,
      })

      if (res.status === 'success') {
        showNotification('Template cloned successfully', 'success')
        await loadTemplates()
        // Open edit modal for the new template
        setSelectedTemplate(res.data)
        setShowEditModal(true)
      } else {
        showNotification(res.message || 'Failed to clone template', 'error')
      }
    } catch (err) {
      console.error('Error cloning template:', err)
      showNotification('Failed to clone template', 'error')
    } finally {
      setCloningTemplateId(null)
    }
  }

  const handleEditTemplate = (template: FullReportTemplate) => {
    setSelectedTemplate(template)
    setShowEditModal(true)
  }

  const handleDeleteTemplate = (template: FullReportTemplate) => {
    setSelectedTemplate(template)
    setShowDeleteModal(true)
  }

  const handleTemplateCreated = (newTemplate: FullReportTemplate) => {
    setShowCreateModal(false)
    loadTemplates()
    // Open edit modal for the newly created template
    setSelectedTemplate(newTemplate)
    setShowEditModal(true)
  }

  const handleTemplateDeleted = () => {
    setShowDeleteModal(false)
    setSelectedTemplate(null)
    loadTemplates()
  }

  const handleTemplateUpdated = () => {
    loadTemplates()
  }

  // Get template actions for dropdown
  const getTemplateActions = (template: FullReportTemplate): ActionItem[] => {
    const actions: ActionItem[] = []

    if (canWrite('report_templates')) {
      actions.push(
        {
          label: 'Edit',
          icon: PencilSquareIcon,
          onClick: () => handleEditTemplate(template),
          variant: 'default',
        },
        {
          label: 'Clone',
          icon: DocumentDuplicateIcon,
          onClick: () => handleCloneTemplate(template),
          variant: 'default',
        },
      )

      // Only allow delete for non-system templates
      if (!template.isSystemTemplate) {
        actions.push({
          label: 'Delete',
          icon: TrashIcon,
          onClick: () => handleDeleteTemplate(template),
          variant: 'danger',
        })
      }
    }

    return actions
  }

  // Filter templates by search term
  const filteredTemplates = templates.filter((template) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      template.name.toLowerCase().includes(searchLower) ||
      (template.description && template.description.toLowerCase().includes(searchLower))
    )
  })

  // Separate system and user templates
  const systemTemplates = filteredTemplates.filter((t) => t.isSystemTemplate)
  const userTemplates = filteredTemplates.filter((t) => !t.isSystemTemplate)

  // Calculate stats
  const stats = {
    total: templates.length,
    system: templates.filter((t) => t.isSystemTemplate).length,
    user: templates.filter((t) => !t.isSystemTemplate).length,
    default: templates.filter((t) => t.isSystemDefault).length,
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const statCards = [
    {
      label: 'Total Templates',
      value: stats.total,
      icon: DocumentTextIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
    },
    {
      label: 'System Templates',
      value: stats.system,
      icon: SparklesIcon,
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100',
    },
    {
      label: 'Custom Templates',
      value: stats.user,
      icon: PencilSquareIcon,
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100',
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Report Templates</h1>
            <p className="text-gray-500 mt-1">Create and manage report calculation templates</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Loading templates...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Report Templates</h1>
            <p className="text-gray-500 mt-1">Create and manage report calculation templates</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XMarkIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Error loading templates</h3>
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
          <h1 className="text-2xl font-bold text-gray-900">Report Templates</h1>
          <p className="text-gray-500 mt-1">Create and manage report calculation templates</p>
        </div>
        {canWrite('report_templates') && (
          <motion.button
            onClick={() => setShowCreateModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Template
          </motion.button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
      >
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            placeholder="Search templates..."
          />
        </div>
      </motion.div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <DocumentTextIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No templates found</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              {searchTerm
                ? 'Try adjusting your search criteria.'
                : 'Get started by creating your first report template.'}
            </p>
            {!searchTerm && (
              <motion.button
                onClick={() => setShowCreateModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Your First Template
              </motion.button>
            )}
          </div>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {/* System Templates */}
          {systemTemplates.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-purple-600" />
                System Templates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {systemTemplates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                          <DocumentTextIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              System
                            </span>
                            {template.isSystemDefault && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                Default
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        {cloningTemplateId === template.id ? (
                          <div className="w-8 h-8 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : (
                          <TableActionsDropdown
                            actions={getTemplateActions(template)}
                            itemId={template.id}
                          />
                        )}
                      </div>
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-500 mt-3 line-clamp-2">{template.description}</p>
                    )}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-400">Created {formatDate(template.createdAt)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* User Templates */}
          {userTemplates.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PencilSquareIcon className="w-5 h-5 text-green-600" />
                Custom Templates
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userTemplates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => handleEditTemplate(template)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                          <DocumentTextIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                            {template.name}
                          </h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 mt-1">
                            Custom
                          </span>
                        </div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        {cloningTemplateId === template.id ? (
                          <div className="w-8 h-8 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : (
                          <TableActionsDropdown
                            actions={getTemplateActions(template)}
                            itemId={template.id}
                          />
                        )}
                      </div>
                    </div>
                    {template.description && (
                      <p className="text-sm text-gray-500 mt-3 line-clamp-2">{template.description}</p>
                    )}
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <p className="text-xs text-gray-400">Created {formatDate(template.createdAt)}</p>
                      <p className="text-xs text-gray-400">Updated {formatDate(template.updatedAt)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateReportTemplateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleTemplateCreated}
      />

      <DeleteReportTemplateModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedTemplate(null)
        }}
        onDeleted={handleTemplateDeleted}
        template={selectedTemplate}
      />

      {selectedTemplate && (
        <EditReportTemplateModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedTemplate(null)
          }}
          onUpdated={handleTemplateUpdated}
          template={selectedTemplate}
        />
      )}
    </div>
  )
}
