'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  getChecklistTemplates,
  getChecklistTemplateById,
  duplicateChecklistTemplate,
  getAllTags,
} from '@/services/checklistTemplateService'
import { getChecklists } from '@/services/checklistService'
import { getProperties } from '@/services/propertyService'
import type { ChecklistTemplate } from '@/services/types/checklistTemplate'
import type { Checklist } from '@/services/types/checklist'
import type { Property } from '@/services/types/property'
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  ClipboardDocumentCheckIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArrowRightIcon,
  EyeIcon,
  XMarkIcon,
  TagIcon,
} from '@heroicons/react/24/outline'
import TableActionsDropdown, { type ActionItem } from '@/components/shared/TableActionsDropdown'
import CreateChecklistTemplateModal from '@/components/checklist-template/create/CreateChecklistTemplateModal'
import UpdateChecklistTemplateModal from '@/components/checklist-template/update/UpdateChecklistTemplateModal'
import DeleteChecklistTemplateModal from '@/components/checklist-template/delete/DeleteChecklistTemplateModal'
import PreviewChecklistTemplateModal from '@/components/checklist-template/preview/PreviewChecklistTemplateModal'
import ApplyTemplateModal from '@/components/checklist-template/apply/ApplyTemplateModal'
import EditPropertyChecklistModal from '@/components/checklist/edit/EditPropertyChecklistModal'
import CreateChecklistModal from '@/components/checklist/create/CreateChecklistModal'

type Tab = 'templates' | 'property-checklists'

export default function ChecklistsPage() {
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  // Data state
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [propertyChecklists, setPropertyChecklists] = useState<Checklist[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('templates')

  // Search & filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [propertyFilter, setPropertyFilter] = useState<string>('')

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showApplyModal, setShowApplyModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ChecklistTemplate | null>(null)

  // Property checklist modal state
  const [showPropertyChecklistModal, setShowPropertyChecklistModal] = useState(false)
  const [selectedChecklistId, setSelectedChecklistId] = useState<string | null>(null)
  const [showCreateChecklistModal, setShowCreateChecklistModal] = useState(false)

  // Action state
  const [cloningTemplateId, setCloningTemplateId] = useState<string | null>(null)

  // Load data
  useEffect(() => {
    if (profile?.id) {
      loadData()
    }
  }, [profile])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [templatesRes, checklistsRes, propertiesRes] = await Promise.all([
        getChecklistTemplates(profile!.id),
        getChecklists({ userId: profile!.id }),
        getProperties(profile!.id),
      ])

      if (templatesRes.status === 'success') {
        setTemplates(templatesRes.data || [])
      }
      if (checklistsRes.status === 'success') {
        setPropertyChecklists(checklistsRes.data || [])
      }
      if (propertiesRes.status === 'success') {
        setProperties(propertiesRes.data || [])
      }
    } catch (err) {
      console.error('Error loading checklists data:', err)
      setError('Failed to load checklists data')
    } finally {
      setLoading(false)
    }
  }

  // Derived data
  const allTags = useMemo(() => getAllTags(templates), [templates])

  const uniqueProperties = useMemo(() => {
    const map = new Map<string, string>()
    propertyChecklists.forEach((c) => {
      if (c.propertyId && c.propertyName) {
        map.set(c.propertyId, c.propertyName)
      }
    })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [propertyChecklists])

  // Filtered data
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch =
        !searchTerm ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => t.tags?.includes(tag))

      return matchesSearch && matchesTags
    })
  }, [templates, searchTerm, selectedTags])

  const filteredPropertyChecklists = useMemo(() => {
    return propertyChecklists.filter((c) => {
      const matchesSearch =
        !searchTerm ||
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.propertyName?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesProperty = !propertyFilter || c.propertyId === propertyFilter

      return matchesSearch && matchesProperty
    })
  }, [propertyChecklists, searchTerm, propertyFilter])

  // Stats
  const stats = {
    templates: templates.length,
    propertyChecklists: propertyChecklists.length,
    propertiesCovered: new Set(propertyChecklists.map((c) => c.propertyId)).size,
  }

  // Template actions
  const handleEditTemplate = async (template: ChecklistTemplate) => {
    try {
      const res = await getChecklistTemplateById(template.id)
      if (res.status === 'success') {
        setSelectedTemplate(res.data)
        setShowEditModal(true)
      }
    } catch (err) {
      console.error('Error fetching template:', err)
      showNotification('Failed to load template details', 'error')
    }
  }

  const handlePreviewTemplate = async (template: ChecklistTemplate) => {
    try {
      const res = await getChecklistTemplateById(template.id)
      if (res.status === 'success') {
        setSelectedTemplate(res.data)
        setShowPreviewModal(true)
      }
    } catch (err) {
      console.error('Error fetching template:', err)
      showNotification('Failed to load template details', 'error')
    }
  }

  const handleApplyTemplate = async (template: ChecklistTemplate) => {
    try {
      const res = await getChecklistTemplateById(template.id)
      if (res.status === 'success') {
        setSelectedTemplate(res.data)
        setShowApplyModal(true)
      }
    } catch (err) {
      console.error('Error fetching template:', err)
      showNotification('Failed to load template details', 'error')
    }
  }

  const handleDeleteTemplate = (template: ChecklistTemplate) => {
    setSelectedTemplate(template)
    setShowDeleteModal(true)
  }

  const handleCloneTemplate = async (template: ChecklistTemplate) => {
    try {
      setCloningTemplateId(template.id)
      const res = await duplicateChecklistTemplate(template.id, {
        name: `${template.name} (Copy)`,
      })
      if (res.status === 'success') {
        showNotification('Template duplicated', 'success')
        await loadData()
      } else {
        showNotification(res.message || 'Failed to duplicate', 'error')
      }
    } catch (err) {
      console.error('Error cloning template:', err)
      showNotification('Failed to duplicate template', 'error')
    } finally {
      setCloningTemplateId(null)
    }
  }

  const getTemplateActions = (template: ChecklistTemplate): ActionItem[] => [
    {
      label: 'Preview',
      icon: EyeIcon,
      onClick: () => handlePreviewTemplate(template),
      variant: 'default' as const,
    },
    {
      label: 'Edit',
      icon: PencilSquareIcon,
      onClick: () => handleEditTemplate(template),
      variant: 'default' as const,
    },
    {
      label: 'Apply to Property',
      icon: ArrowRightIcon,
      onClick: () => handleApplyTemplate(template),
      variant: 'default' as const,
    },
    {
      label: 'Duplicate',
      icon: DocumentDuplicateIcon,
      onClick: () => handleCloneTemplate(template),
      variant: 'default' as const,
    },
    {
      label: 'Delete',
      icon: TrashIcon,
      onClick: () => handleDeleteTemplate(template),
      variant: 'danger' as const,
    },
  ]

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  // Stat cards config
  const statCards = [
    {
      label: 'Templates',
      value: stats.templates,
      icon: ClipboardDocumentListIcon,
      bgColor: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-100',
    },
    {
      label: 'Property Checklists',
      value: stats.propertyChecklists,
      icon: ClipboardDocumentCheckIcon,
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
    },
    {
      label: 'Properties Covered',
      value: stats.propertiesCovered,
      icon: BuildingOfficeIcon,
      bgColor: 'bg-teal-50',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600',
      borderColor: 'border-teal-100',
    },
  ]

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklists</h1>
          <p className="text-gray-500 mt-1">Manage checklist templates and property checklists</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading checklists...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklists</h1>
          <p className="text-gray-500 mt-1">Manage checklist templates and property checklists</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <XMarkIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Error loading data</h3>
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
          <h1 className="text-2xl font-bold text-gray-900">Checklists</h1>
          <p className="text-gray-500 mt-1">Manage checklist templates and property checklists</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => setShowCreateChecklistModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Checklist
          </motion.button>
          <motion.button
            onClick={() => setShowCreateModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Template
          </motion.button>
        </div>
      </div>

      {/* Stats */}
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

      {/* Tab Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => {
              setActiveTab('templates')
              setSearchTerm('')
              setPropertyFilter('')
            }}
            className={`flex-1 px-6 py-3.5 text-sm font-medium transition-colors relative ${
              activeTab === 'templates'
                ? 'text-emerald-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <ClipboardDocumentListIcon className="w-4 h-4" />
              Templates
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {templates.length}
              </span>
            </span>
            {activeTab === 'templates' && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600"
              />
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('property-checklists')
              setSearchTerm('')
              setSelectedTags([])
            }}
            className={`flex-1 px-6 py-3.5 text-sm font-medium transition-colors relative ${
              activeTab === 'property-checklists'
                ? 'text-blue-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <ClipboardDocumentCheckIcon className="w-4 h-4" />
              Property Checklists
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {propertyChecklists.length}
              </span>
            </span>
            {activeTab === 'property-checklists' && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
              />
            )}
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition-all"
                placeholder={
                  activeTab === 'templates'
                    ? 'Search templates...'
                    : 'Search checklists or properties...'
                }
              />
            </div>

            {/* Tag filter for templates tab */}
            {activeTab === 'templates' && allTags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <TagIcon className="w-4 h-4 text-gray-400" />
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {/* Property filter for property checklists tab */}
            {activeTab === 'property-checklists' && uniqueProperties.length > 0 && (
              <select
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              >
                <option value="">All Properties</option>
                {uniqueProperties.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {activeTab === 'templates' ? (
            // Templates Grid
            filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ClipboardDocumentListIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {searchTerm || selectedTags.length > 0
                    ? 'No templates found'
                    : 'No templates yet'}
                </h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  {searchTerm || selectedTags.length > 0
                    ? 'Try adjusting your search or filters.'
                    : 'Create your first checklist template to get started.'}
                </p>
                {!searchTerm && selectedTags.length === 0 && (
                  <motion.button
                    onClick={() => setShowCreateModal(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Create Your First Template
                  </motion.button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => handlePreviewTemplate(template)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                          <ClipboardDocumentListIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
                            {template.name}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {template.itemCount || 0} tasks
                          </span>
                        </div>
                      </div>
                      <div onClick={(e) => e.stopPropagation()}>
                        {cloningTemplateId === template.id ? (
                          <div className="w-8 h-8 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
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
                      <p className="text-sm text-gray-500 mt-3 line-clamp-2">
                        {template.description}
                      </p>
                    )}

                    {template.tags && template.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {template.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-400">
                        Created {formatDate(template.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            // Property Checklists Table
            filteredPropertyChecklists.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ClipboardDocumentCheckIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {searchTerm || propertyFilter
                    ? 'No checklists found'
                    : 'No property checklists yet'}
                </h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  {searchTerm || propertyFilter
                    ? 'Try adjusting your search or filter.'
                    : 'Create a template and apply it to a property, or create checklists from the Calendar page.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="pb-3 pr-4">Checklist</th>
                      <th className="pb-3 pr-4">Property</th>
                      <th className="pb-3 pr-4">Based On</th>
                      <th className="pb-3 pr-4 text-center">Tasks</th>
                      <th className="pb-3 pr-4 text-center">Default</th>
                      <th className="pb-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPropertyChecklists.map((checklist) => (
                      <tr
                        key={checklist.id}
                        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedChecklistId(checklist.id)
                          setShowPropertyChecklistModal(true)
                        }}
                      >
                        <td className="py-3.5 pr-4">
                          <span className="text-sm font-medium text-gray-900">
                            {checklist.name}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="text-sm text-gray-600">
                            {checklist.propertyName || 'Unknown'}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4">
                          {checklist.templateId ? (
                            checklist.templateName ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                {checklist.templateName}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                Template removed
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              Custom
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 pr-4 text-center">
                          <span className="text-sm text-gray-600">
                            {checklist.itemCount || 0}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 text-center">
                          {checklist.isDefault && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                              DEFAULT
                            </span>
                          )}
                        </td>
                        <td className="py-3.5" onClick={(e) => e.stopPropagation()}>
                          <TableActionsDropdown
                            actions={[
                              {
                                label: 'View / Edit',
                                icon: PencilSquareIcon,
                                onClick: () => {
                                  setSelectedChecklistId(checklist.id)
                                  setShowPropertyChecklistModal(true)
                                },
                                variant: 'default',
                              },
                            ]}
                            itemId={checklist.id}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateChecklistTemplateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onAdd={() => {
          setShowCreateModal(false)
          loadData()
        }}
      />

      <UpdateChecklistTemplateModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedTemplate(null)
        }}
        onUpdated={() => {
          setShowEditModal(false)
          setSelectedTemplate(null)
          loadData()
        }}
        template={selectedTemplate}
      />

      <DeleteChecklistTemplateModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedTemplate(null)
        }}
        onDeleted={() => {
          setShowDeleteModal(false)
          setSelectedTemplate(null)
          loadData()
        }}
        template={selectedTemplate}
      />

      <PreviewChecklistTemplateModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false)
          setSelectedTemplate(null)
        }}
        template={selectedTemplate}
      />

      <ApplyTemplateModal
        isOpen={showApplyModal}
        onClose={() => {
          setShowApplyModal(false)
          setSelectedTemplate(null)
        }}
        onApplied={() => {
          setShowApplyModal(false)
          setSelectedTemplate(null)
          loadData()
        }}
        template={selectedTemplate}
      />

      <CreateChecklistModal
        isOpen={showCreateChecklistModal}
        onClose={() => setShowCreateChecklistModal(false)}
        onAdd={() => {
          setShowCreateChecklistModal(false)
          loadData()
        }}
        properties={properties}
      />

      <EditPropertyChecklistModal
        isOpen={showPropertyChecklistModal}
        onClose={() => {
          setShowPropertyChecklistModal(false)
          setSelectedChecklistId(null)
        }}
        onUpdated={() => {
          loadData()
        }}
        checklistId={selectedChecklistId}
      />
    </div>
  )
}
