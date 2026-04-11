'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  CameraIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import TableActionsDropdown, { type ActionItem } from '@/components/shared/TableActionsDropdown'
import type { WalkthroughTemplate } from '@/services/types/walkthroughTemplate'

interface WalkthroughTemplateListProps {
  templates: WalkthroughTemplate[]
  canWrite: boolean
  onEdit: (template: WalkthroughTemplate) => void
  onClone: (template: WalkthroughTemplate) => void
  onDelete: (template: WalkthroughTemplate) => void
  onCreateNew: () => void
}

export default function WalkthroughTemplateList({
  templates,
  canWrite,
  onEdit,
  onClone,
  onDelete,
  onCreateNew,
}: WalkthroughTemplateListProps) {
  const { t } = useTranslation('turnover')
  const [expandedAssignmentIds, setExpandedAssignmentIds] = useState<Set<string>>(new Set())

  const toggleAssignments = (id: string) => {
    setExpandedAssignmentIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getActions = (template: WalkthroughTemplate): ActionItem[] => {
    const actions: ActionItem[] = []
    if (canWrite) {
      actions.push({
        label: 'Edit',
        icon: PencilSquareIcon,
        onClick: () => onEdit(template),
        variant: 'default' as const,
      })
      actions.push({
        label: 'Clone',
        icon: DocumentDuplicateIcon,
        onClick: () => onClone(template),
        variant: 'default' as const,
      })
      if (!template.isDefault) {
        actions.push({
          label: 'Delete',
          icon: TrashIcon,
          onClick: () => onDelete(template),
          variant: 'danger' as const,
        })
      }
    }
    return actions
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CameraIcon className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('noWalkthroughTemplatesYet')}</h3>
        <p className="text-gray-500 max-w-sm mx-auto text-sm">
          {t('createWalkthroughTemplateDescription')}
        </p>
        {canWrite && (
          <button
            onClick={onCreateNew}
            className="mt-4 inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/25 transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-1.5" />
            {t('createTemplate')}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template, index) => {
        const totalItems = template.groups.reduce((acc, g) => acc + g.items.length, 0)
        const groupCount = template.groups.length
        const isExpanded = expandedAssignmentIds.has(template.id)
        const assignments = template.assignedProperties

        return (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * index }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow group flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                  <CameraIcon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                    {template.isDefault && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 flex-shrink-0">
                        DEFAULT
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-xs text-gray-500 truncate">{template.description}</p>
                  )}
                </div>
              </div>
              {getActions(template).length > 0 && (
                <div onClick={(e) => e.stopPropagation()}>
                  <TableActionsDropdown
                    actions={getActions(template)}
                    itemId={template.id}
                  />
                </div>
              )}
            </div>

            {/* Counts */}
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
              <span>
                <span className="font-semibold text-gray-700">{groupCount}</span>{' '}
                {groupCount !== 1 ? t('groupsLabel') : t('groupLabel')}
              </span>
              <span className="text-gray-300">·</span>
              <span>
                <span className="font-semibold text-gray-700">{totalItems}</span>{' '}
                {totalItems !== 1 ? t('itemsLabel') : t('itemLabel')}
              </span>
              {template.requiresCompletion && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                    <ShieldCheckIcon className="w-3.5 h-3.5" />
                    {t('requiredLabel')}
                  </span>
                </>
              )}
            </div>

            {/* Assigned properties */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              {assignments.length === 0 ? (
                <p className="text-[11px] text-gray-400">
                  {template.isDefault
                    ? t('appliedToAllDefault')
                    : t('notAssignedToAnyProperties')}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => toggleAssignments(template.id)}
                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-medium hover:text-blue-800 cursor-pointer"
                >
                  {isExpanded ? (
                    <ChevronDownIcon className="w-3 h-3" />
                  ) : (
                    <ChevronRightIcon className="w-3 h-3" />
                  )}
                  <BuildingOfficeIcon className="w-3 h-3" />
                  {t('assignedToPropertiesCount', { count: assignments.length })}
                </button>
              )}
              {isExpanded && assignments.length > 0 && (
                <ul className="mt-2 space-y-1 pl-4 border-l border-gray-100">
                  {assignments.map(a => (
                    <li key={a.assignmentId} className="text-[11px] text-gray-600">
                      {a.listingName ?? a.internalName ?? a.externalName ?? 'Unnamed'}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
