'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissionGuard } from '@/hooks/usePermissionGuard'
import { usePermissions } from '@/hooks/usePermissions'
import {
  getChecklistTemplates,
  getChecklistTemplateById,
  duplicateChecklistTemplate,
  getAllTags,
} from '@/services/checklistTemplateService'
import { getChecklists } from '@/services/checklistService'
import { getProperties } from '@/services/propertyService'
import { getWalkthroughTemplates } from '@/services/walkthroughTemplateService'
import type { ChecklistTemplate } from '@/services/types/checklistTemplate'
import type { Checklist } from '@/services/types/checklist'
import type { Property } from '@/services/types/property'
import type { WalkthroughTemplate } from '@/services/types/walkthroughTemplate'
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
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import TableActionsDropdown, { type ActionItem } from '@/components/shared/TableActionsDropdown'
import CreateChecklistTemplateModal from '@/components/checklist-template/create/CreateChecklistTemplateModal'
import UpdateChecklistTemplateModal from '@/components/checklist-template/update/UpdateChecklistTemplateModal'
import DeleteChecklistTemplateModal from '@/components/checklist-template/delete/DeleteChecklistTemplateModal'
import PreviewChecklistTemplateModal from '@/components/checklist-template/preview/PreviewChecklistTemplateModal'
import ApplyTemplateModal from '@/components/checklist-template/apply/ApplyTemplateModal'
import EditPropertyChecklistModal from '@/components/checklist/edit/EditPropertyChecklistModal'
import DeleteChecklistModal from '@/components/checklist/delete/DeleteChecklistModal'
import CreateChecklistModal from '@/components/checklist/create/CreateChecklistModal'
import CopyChecklistToPropertyModal from '@/components/checklist/copy/CopyChecklistToPropertyModal'
import WalkthroughTemplateList from '@/components/walkthrough-template/list/WalkthroughTemplateList'
import WalkthroughTemplateEditorModal from '@/components/walkthrough-template/editor/WalkthroughTemplateEditorModal'
import DeleteWalkthroughTemplateModal from '@/components/walkthrough-template/delete/DeleteWalkthroughTemplateModal'
import CloneWalkthroughTemplateModal from '@/components/walkthrough-template/clone/CloneWalkthroughTemplateModal'

type ChecklistViewMode = 'grid' | 'table'
type MainTab = 'checklists' | 'walkthrough-templates'

export default function ChecklistsPage() {
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()
  usePermissionGuard('checklists')
  const { effectiveUserId, canWrite } = usePermissions()

  // Data state
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])
  const [propertyChecklists, setPropertyChecklists] = useState<Checklist[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [walkthroughTemplates, setWalkthroughTemplates] = useState<WalkthroughTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Top-level tab switcher: checklists vs walkthrough templates
  const [mainTab, setMainTab] = useState<MainTab>('checklists')

  // Walkthrough template modal state
  const [showWalkthroughEditor, setShowWalkthroughEditor] = useState(false)
  const [showWalkthroughDelete, setShowWalkthroughDelete] = useState(false)
  const [showWalkthroughClone, setShowWalkthroughClone] = useState(false)
  const [selectedWalkthroughTemplate, setSelectedWalkthroughTemplate] = useState<WalkthroughTemplate | null>(null)

  // View state
  const [checklistViewMode, setChecklistViewMode] = useState<ChecklistViewMode>('grid')

  // Search & filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [propertyFilter, setPropertyFilter] = useState<string>('')

  // Template scroll state
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

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
  const [showDeleteChecklistModal, setShowDeleteChecklistModal] = useState(false)
  const [showCopyChecklistModal, setShowCopyChecklistModal] = useState(false)
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null)

  // Action state
  const [cloningTemplateId, setCloningTemplateId] = useState<string | null>(null)

  // Load data
  useEffect(() => {
    if (effectiveUserId) {
      loadData()
    }
  }, [effectiveUserId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [templatesRes, checklistsRes, propertiesRes, walkthroughTemplatesRes] = await Promise.all([
        getChecklistTemplates(effectiveUserId!),
        getChecklists({ userId: effectiveUserId! }),
        getProperties(effectiveUserId!),
        getWalkthroughTemplates(effectiveUserId!),
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
      if (walkthroughTemplatesRes.status === 'success') {
        setWalkthroughTemplates(walkthroughTemplatesRes.data || [])
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

  // Count how many property checklists were created from each template
  const templateUsageMap = useMemo(() => {
    const map = new Map<string, number>()
    propertyChecklists.forEach((c) => {
      if (c.templateId) {
        map.set(c.templateId, (map.get(c.templateId) || 0) + 1)
      }
    })
    return map
  }, [propertyChecklists])

  const uniqueProperties = useMemo(() => {
    const map = new Map<string, string>()
    propertyChecklists.forEach((c) => {
      if (c.propertyId && c.propertyName) {
        map.set(c.propertyId, c.propertyName)
      }
    })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [propertyChecklists])

  // Filtered data — templates filter by tags only
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => t.tags?.includes(tag))
      return matchesTags
    })
  }, [templates, selectedTags])

  // Checklists filter by search + property
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

  // Scroll helpers
  const checkScrollability = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  const scrollTemplates = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' })
  }

  // Defer scroll measurement to after paint so the browser has computed final scrollWidth
  useEffect(() => {
    const id = setTimeout(checkScrollability, 0)
    return () => clearTimeout(id)
  }, [filteredTemplates, checkScrollability])

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

  // Walkthrough template handlers
  const handleWalkthroughTemplateSaved = (saved: WalkthroughTemplate) => {
    setWalkthroughTemplates(prev => {
      const idx = prev.findIndex(t => t.id === saved.id)
      if (idx === -1) return [...prev, saved]
      const next = [...prev]
      next[idx] = saved
      return next
    })
  }

  const handleWalkthroughTemplateDeleted = () => {
    if (selectedWalkthroughTemplate) {
      setWalkthroughTemplates(prev =>
        prev.filter(t => t.id !== selectedWalkthroughTemplate.id)
      )
    }
    setSelectedWalkthroughTemplate(null)
  }

  const handleOpenCreateWalkthroughTemplate = () => {
    setSelectedWalkthroughTemplate(null)
    setShowWalkthroughEditor(true)
  }

  const handleEditWalkthroughTemplate = (template: WalkthroughTemplate) => {
    setSelectedWalkthroughTemplate(template)
    setShowWalkthroughEditor(true)
  }

  const handleCloneWalkthroughTemplate = (template: WalkthroughTemplate) => {
    setSelectedWalkthroughTemplate(template)
    setShowWalkthroughClone(true)
  }

  const handleDeleteWalkthroughTemplate = (template: WalkthroughTemplate) => {
    setSelectedWalkthroughTemplate(template)
    setShowWalkthroughDelete(true)
  }

  const handleWalkthroughCloned = (cloned: WalkthroughTemplate) => {
    setWalkthroughTemplates(prev => [...prev, cloned])
    // Immediately open the editor on the new clone so the PM can tweak it
    setSelectedWalkthroughTemplate(cloned)
    setShowWalkthroughClone(false)
    setShowWalkthroughEditor(true)
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

  const getTemplateActions = (template: ChecklistTemplate): ActionItem[] => {
    const actions: ActionItem[] = [
      {
        label: 'Preview',
        icon: EyeIcon,
        onClick: () => handlePreviewTemplate(template),
        variant: 'default' as const,
      },
    ]

    if (canWrite('checklists')) {
      actions.push(
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
      )
    }

    return actions
  }

  const getChecklistActions = (checklist: Checklist): ActionItem[] => {
    const actions: ActionItem[] = [
      {
        label: 'View / Edit',
        icon: PencilSquareIcon,
        onClick: () => {
          setSelectedChecklistId(checklist.id)
          setShowPropertyChecklistModal(true)
        },
        variant: 'default' as const,
      },
    ]

    if (canWrite('checklists')) {
      actions.push(
        {
          label: 'Copy to Property',
          icon: DocumentDuplicateIcon,
          onClick: () => {
            setSelectedChecklist(checklist)
            setShowCopyChecklistModal(true)
          },
          variant: 'default' as const,
        },
        {
          label: 'Delete',
          icon: TrashIcon,
          onClick: () => {
            setSelectedChecklist(checklist)
            setShowDeleteChecklistModal(true)
          },
          variant: 'danger' as const,
        },
      )
    }

    return actions
  }

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <XMarkIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-800">Error loading data</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
            <button
              onClick={loadData}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-xl transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Checklists</h1>
        <p className="text-gray-500 mt-1">Manage checklist templates and property checklists</p>
      </div>

      {/* ─── Compact Stats Row ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`${stat.bgColor} border ${stat.borderColor} rounded-xl px-4 py-2.5 flex items-center gap-3`}
          >
            <div className={`w-8 h-8 ${stat.iconBg} rounded-lg flex items-center justify-center`}>
              <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 leading-tight">{stat.value}</p>
              <p className="text-[11px] font-medium text-gray-500">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ─── Main Tab Switcher ─── */}
      <div className="flex items-center gap-1 p-0.5 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setMainTab('checklists')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
            mainTab === 'checklists'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Checklists
        </button>
        <button
          onClick={() => setMainTab('walkthrough-templates')}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${
            mainTab === 'walkthrough-templates'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Walkthrough Templates
          <span className="ml-1.5 text-[10px] font-semibold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">
            {walkthroughTemplates.length}
          </span>
        </button>
      </div>

      {mainTab === 'walkthrough-templates' ? (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-900">Walkthrough Templates</h2>
              <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {walkthroughTemplates.length}
              </span>
            </div>
            {canWrite('checklists') && (
              <motion.button
                onClick={handleOpenCreateWalkthroughTemplate}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/25 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1.5" />
                Create Walkthrough Template
              </motion.button>
            )}
          </div>
          <WalkthroughTemplateList
            templates={walkthroughTemplates}
            canWrite={canWrite('checklists')}
            onEdit={handleEditWalkthroughTemplate}
            onClone={handleCloneWalkthroughTemplate}
            onDelete={handleDeleteWalkthroughTemplate}
            onCreateNew={handleOpenCreateWalkthroughTemplate}
          />
        </div>
      ) : (
      <>
      {/* ─── Templates Section ─── */}
      <div>
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">Templates</h2>
            <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              {templates.length}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Inline tag filter pills */}
            {allTags.length > 0 && (
              <div className="hidden sm:flex items-center gap-1.5">
                <TagIcon className="w-3.5 h-3.5 text-gray-400" />
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-0.5 text-[11px] rounded-lg transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {selectedTags.length > 0 && (
                  <button
                    onClick={() => setSelectedTags([])}
                    className="text-[11px] text-gray-400 hover:text-gray-600 ml-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
            {canWrite('checklists') && (
              <motion.button
                onClick={() => setShowCreateModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1.5" />
                Create Template
              </motion.button>
            )}
          </div>
        </div>

        {/* Mobile tag filter (visible only on small screens) */}
        {allTags.length > 0 && (
          <div className="flex sm:hidden items-center gap-1.5 flex-wrap mt-3">
            <TagIcon className="w-3.5 h-3.5 text-gray-400" />
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2 py-0.5 text-[11px] rounded-lg transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-[11px] text-gray-400 hover:text-gray-600 ml-1"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* Horizontal scroll container */}
        {filteredTemplates.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-center">
            <div>
              <ClipboardDocumentListIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {selectedTags.length > 0
                  ? 'No templates match the selected tags.'
                  : 'No templates yet.'}
              </p>
              {selectedTags.length === 0 && canWrite('checklists') && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 mt-1"
                >
                  Create your first template
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="relative group/scroll mt-4">
            {/* Left scroll arrow */}
            {canScrollLeft && (
              <button
                onClick={() => scrollTemplates('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-white transition-colors -ml-3"
              >
                <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
              </button>
            )}

            {/* Scrollable row */}
            <div
              ref={scrollContainerRef}
              onScroll={checkScrollability}
              className="flex gap-4 overflow-x-auto pb-2 -mb-2 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none' }}
            >
              {filteredTemplates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.03 * index }}
                  className="flex-shrink-0 w-[260px] bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow cursor-pointer group flex flex-col"
                  onClick={() => handlePreviewTemplate(template)}
                >
                  {/* Header: icon + name + actions */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                        <ClipboardDocumentListIcon className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
                          {template.name}
                        </h3>
                        <p className="text-[11px] text-gray-400">
                          {template.itemCount || 0} tasks &middot; {formatDate(template.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      {cloningTemplateId === template.id ? (
                        <div className="w-7 h-7 flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : (
                        <TableActionsDropdown
                          actions={getTemplateActions(template)}
                          itemId={template.id}
                        />
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {template.description && (
                    <p className="text-xs text-gray-500 mt-2.5 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  {/* Tags */}
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {template.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer: usage badge — mt-auto pins to bottom of flex column */}
                  <div className="mt-auto pt-2.5 border-t border-gray-100">
                    {(templateUsageMap.get(template.id) || 0) > 0 ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePreviewTemplate(template)
                        }}
                        className="text-[11px] text-blue-600 font-medium hover:text-blue-800 hover:underline transition-colors"
                      >
                        Applied to {templateUsageMap.get(template.id)}{' '}
                        {templateUsageMap.get(template.id) === 1 ? 'property' : 'properties'}
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400">Not yet applied</span>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* "+" Add new template card */}
              {canWrite('checklists') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => setShowCreateModal(true)}
                  className="flex-shrink-0 w-[260px] min-h-[200px] rounded-2xl border-2 border-dashed border-gray-200 hover:border-emerald-300 flex flex-col items-center justify-center cursor-pointer transition-colors group/add"
                >
                  <div className="w-10 h-10 bg-gray-100 group-hover/add:bg-emerald-100 rounded-xl flex items-center justify-center transition-colors">
                    <PlusIcon className="h-5 w-5 text-gray-400 group-hover/add:text-emerald-600 transition-colors" />
                  </div>
                  <p className="text-sm font-medium text-gray-400 group-hover/add:text-emerald-600 mt-2 transition-colors">
                    New Template
                  </p>
                </motion.div>
              )}
            </div>

            {/* Right scroll arrow */}
            {canScrollRight && (
              <button
                onClick={() => scrollTemplates('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/90 border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-white transition-colors -mr-3"
              >
                <ChevronRightIcon className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── Property Checklists Section ─── */}
      <div>
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">Property Checklists</h2>
            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {propertyChecklists.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="hidden md:flex items-center bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setChecklistViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  checklistViewMode === 'grid'
                    ? 'bg-white shadow-sm text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Grid view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setChecklistViewMode('table')}
                className={`p-2 rounded-lg transition-all ${
                  checklistViewMode === 'table'
                    ? 'bg-white shadow-sm text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Table view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            {canWrite('checklists') && (
              <motion.button
                onClick={() => setShowCreateChecklistModal(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-1.5" />
                Create Checklist
              </motion.button>
            )}
          </div>
        </div>

        {/* Search + property filter */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
              placeholder="Search checklists or properties..."
            />
          </div>
          {uniqueProperties.length > 0 && (
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

        {/* Checklists content */}
        <div className="mt-4">
          {filteredPropertyChecklists.length === 0 ? (
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
          ) : checklistViewMode === 'grid' ? (
            /* ─── Card Grid View ─── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPropertyChecklists.map((checklist, index) => (
                <motion.div
                  key={checklist.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * index }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => {
                    setSelectedChecklistId(checklist.id)
                    setShowPropertyChecklistModal(true)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                        <ClipboardDocumentCheckIcon className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                          {checklist.name}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          {checklist.propertyName || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <TableActionsDropdown
                        actions={getChecklistActions(checklist)}
                        itemId={checklist.id}
                      />
                    </div>
                  </div>

                  {checklist.propertyAddress &&
                    checklist.propertyAddress !== checklist.propertyName && (
                      <p className="text-xs text-gray-400 truncate mt-1 ml-[52px]">
                        {checklist.propertyAddress}
                      </p>
                    )}

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {checklist.templateId ? (
                      checklist.templateName ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">
                          Based on: {checklist.templateName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-500">
                          Template removed
                        </span>
                      )
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                        Custom
                      </span>
                    )}
                    {checklist.isDefault && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                        DEFAULT
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {checklist.itemCount || 0} tasks
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            /* ─── Table View ─── */
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="pb-3 pt-4 pr-4 pl-5">Checklist</th>
                      <th className="pb-3 pt-4 pr-4">Property</th>
                      <th className="pb-3 pt-4 pr-4">Based On</th>
                      <th className="pb-3 pt-4 pr-4 text-center">Tasks</th>
                      <th className="pb-3 pt-4 pr-4 text-center">Status</th>
                      <th className="pb-3 pt-4 w-12 sticky right-0 bg-white" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPropertyChecklists.map((checklist) => (
                      <tr
                        key={checklist.id}
                        className="group hover:bg-blue-50/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedChecklistId(checklist.id)
                          setShowPropertyChecklistModal(true)
                        }}
                      >
                        <td className="py-3.5 pr-4 pl-5">
                          <span className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                            {checklist.name}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <div>
                            <span className="text-sm text-gray-700">
                              {checklist.propertyName || 'Unknown'}
                            </span>
                            {checklist.propertyAddress &&
                              checklist.propertyAddress !== checklist.propertyName && (
                                <p className="text-xs text-gray-400 truncate max-w-[200px]">
                                  {checklist.propertyAddress}
                                </p>
                              )}
                          </div>
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
                          <span className="text-sm font-medium text-gray-700">
                            {checklist.itemCount || 0}
                          </span>
                        </td>
                        <td className="py-3.5 pr-4 text-center">
                          {checklist.isDefault ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
                              DEFAULT
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">&mdash;</span>
                          )}
                        </td>
                        <td
                          className="py-3.5 sticky right-0 bg-white group-hover:bg-blue-50/95 backdrop-blur-sm transition-colors shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.05)]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TableActionsDropdown
                            actions={getChecklistActions(checklist)}
                            itemId={checklist.id}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      </>
      )}

      {/* ─── Modals ─── */}
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
        onEdit={(tmpl) => {
          setShowPreviewModal(false)
          handleEditTemplate(tmpl)
        }}
        onApply={(tmpl) => {
          setShowPreviewModal(false)
          handleApplyTemplate(tmpl)
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

      <DeleteChecklistModal
        isOpen={showDeleteChecklistModal}
        onClose={() => {
          setShowDeleteChecklistModal(false)
          setSelectedChecklist(null)
        }}
        onDeleted={() => {
          setShowDeleteChecklistModal(false)
          setSelectedChecklist(null)
          loadData()
        }}
        checklist={selectedChecklist}
      />

      <CopyChecklistToPropertyModal
        isOpen={showCopyChecklistModal}
        onClose={() => {
          setShowCopyChecklistModal(false)
          setSelectedChecklist(null)
        }}
        onCopied={() => {
          setShowCopyChecklistModal(false)
          setSelectedChecklist(null)
          loadData()
        }}
        checklist={selectedChecklist}
        properties={properties}
      />

      {/* Walkthrough Template Modals */}
      <WalkthroughTemplateEditorModal
        isOpen={showWalkthroughEditor}
        onClose={() => {
          setShowWalkthroughEditor(false)
          setSelectedWalkthroughTemplate(null)
        }}
        onSaved={handleWalkthroughTemplateSaved}
        template={selectedWalkthroughTemplate}
      />

      <DeleteWalkthroughTemplateModal
        isOpen={showWalkthroughDelete}
        onClose={() => {
          setShowWalkthroughDelete(false)
          setSelectedWalkthroughTemplate(null)
        }}
        onDeleted={handleWalkthroughTemplateDeleted}
        template={selectedWalkthroughTemplate}
      />

      <CloneWalkthroughTemplateModal
        isOpen={showWalkthroughClone}
        onClose={() => {
          setShowWalkthroughClone(false)
        }}
        onCloned={handleWalkthroughCloned}
        source={selectedWalkthroughTemplate}
      />
    </div>
  )
}
