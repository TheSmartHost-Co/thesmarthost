'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardDocumentListIcon,
  ClipboardDocumentIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CameraIcon,
  HomeModernIcon,
} from '@heroicons/react/24/outline'
import {
  getClientPortalChecklists,
  getClientPortalChecklistById,
} from '@/services/clientPortalService'
import type {
  ClientPortalChecklist,
  ClientPortalChecklistItem,
} from '@/services/types/clientPortal'

interface ExpandedChecklist extends ClientPortalChecklist {
  loadedItems?: ClientPortalChecklistItem[]
  itemsLoading?: boolean
}

export default function ClientChecklistsPage() {
  const { t } = useTranslation('clientPortal')
  const [checklists, setChecklists] = useState<ExpandedChecklist[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await getClientPortalChecklists()
        if (res.status === 'success') {
          setChecklists(res.data.map((c) => ({ ...c })))
        }
      } catch (err) {
        console.error('Failed to load checklists:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggleExpand = useCallback(
    async (id: string) => {
      if (expandedId === id) {
        setExpandedId(null)
        return
      }
      setExpandedId(id)

      // Load items if not already loaded
      const existing = checklists.find((c) => c.id === id)
      if (existing?.loadedItems) return

      // Mark loading
      setChecklists((prev) =>
        prev.map((c) => (c.id === id ? { ...c, itemsLoading: true } : c))
      )

      try {
        const res = await getClientPortalChecklistById(id)
        if (res.status === 'success' && res.data.items) {
          setChecklists((prev) =>
            prev.map((c) =>
              c.id === id
                ? { ...c, loadedItems: res.data.items, itemsLoading: false }
                : c
            )
          )
        } else {
          setChecklists((prev) =>
            prev.map((c) => (c.id === id ? { ...c, itemsLoading: false } : c))
          )
        }
      } catch (err) {
        console.error('Failed to load checklist items:', err)
        setChecklists((prev) =>
          prev.map((c) => (c.id === id ? { ...c, itemsLoading: false } : c))
        )
      }
    },
    [expandedId, checklists]
  )

  // Group checklists by property
  const groupedByProperty = useMemo(() => {
    return checklists.reduce<Record<string, ExpandedChecklist[]>>((acc, c) => {
      const key = c.propertyName || 'Unknown Property'
      if (!acc[key]) acc[key] = []
      acc[key].push(c)
      return acc
    }, {})
  }, [checklists])

  const propertyNames = useMemo(() => Object.keys(groupedByProperty).sort(), [groupedByProperty])

  // Group loaded items by roomName
  const groupItemsByRoom = (items: ClientPortalChecklistItem[]) => {
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder)
    const groups: Record<string, ClientPortalChecklistItem[]> = {}
    for (const item of sorted) {
      const room = item.roomName || 'General'
      if (!groups[room]) groups[room] = []
      groups[room].push(item)
    }
    return groups
  }

  // Count photo-required items from cached loaded items
  const getPhotoCount = (cl: ExpandedChecklist): number | null => {
    if (!cl.loadedItems) return null
    return cl.loadedItems.filter((item) => item.requiresPhoto).length
  }

  // Flatten index counter for stagger animation across all property groups
  let cardIndex = 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-5 w-5 text-emerald-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('checklistsTitle')}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {checklists.length} checklist{checklists.length !== 1 ? 's' : ''} across your properties
        </p>
      </div>

      {propertyNames.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center rounded-full bg-gray-100 p-4 mb-4">
            <ClipboardDocumentIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">{t('noChecklistsFound')}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {t('checklistsWillAppear')}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {propertyNames.map((propName) => (
            <div key={propName}>
              {/* Property Section Header */}
              <div className="flex items-center gap-2 mb-3">
                <HomeModernIcon className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  {propName}
                </h2>
              </div>

              {/* Checklist Cards */}
              <div className="grid gap-3">
                {groupedByProperty[propName].map((cl) => {
                  const isExpanded = expandedId === cl.id
                  const photoCount = getPhotoCount(cl)
                  const currentIndex = cardIndex++

                  return (
                    <motion.div
                      key={cl.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: currentIndex * 0.03 }}
                      className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden"
                    >
                      {/* Collapsed Summary */}
                      <button
                        onClick={() => toggleExpand(cl.id)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="rounded-lg bg-emerald-50 p-2.5 shrink-0">
                            <ClipboardDocumentListIcon className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {cl.name}
                              </p>
                              {cl.isDefault && (
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-0.5">
                              <span className="text-xs text-gray-500">
                                {cl.itemCount} item{cl.itemCount !== 1 ? 's' : ''}
                              </span>
                              {photoCount !== null && photoCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                  <CameraIcon className="h-3 w-3" />
                                  {photoCount} require{photoCount !== 1 ? '' : 's'} photo{photoCount !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 ml-4">
                          {isExpanded ? (
                            <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Items */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                              {cl.itemsLoading ? (
                                <div className="flex items-center justify-center py-6">
                                  <svg className="animate-spin h-5 w-5 text-emerald-600" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                </div>
                              ) : !cl.loadedItems || cl.loadedItems.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-4">
                                  No items in this checklist
                                </p>
                              ) : (
                                <div className="space-y-5">
                                  {Object.entries(groupItemsByRoom(cl.loadedItems)).map(
                                    ([roomName, items]) => (
                                      <div key={roomName}>
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                          {roomName}
                                        </h4>
                                        <ul className="space-y-1.5">
                                          {items.map((item) => (
                                            <li
                                              key={item.id}
                                              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700"
                                            >
                                              <span className="h-1.5 w-1.5 rounded-full bg-gray-300 shrink-0" />
                                              <span className="flex-1">{item.taskDescription}</span>
                                              {item.requiresPhoto && (
                                                <CameraIcon className="h-4 w-4 text-amber-500 shrink-0" />
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
