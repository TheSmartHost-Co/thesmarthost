'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardDocumentListIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  CameraIcon,
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
  const groupedByProperty = checklists.reduce<Record<string, ExpandedChecklist[]>>((acc, c) => {
    const key = c.propertyName || 'Unknown Property'
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

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

  const propertyNames = Object.keys(groupedByProperty).sort()

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Checklists</h1>
        <p className="text-sm text-gray-500 mt-1">Cleaning checklists for your properties</p>
      </div>

      {propertyNames.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400">No checklists found</div>
      ) : (
        <div className="space-y-8">
          {propertyNames.map((propName) => (
            <div key={propName}>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {propName}
              </h2>
              <div className="grid gap-3">
                {groupedByProperty[propName].map((cl, i) => {
                  const isExpanded = expandedId === cl.id
                  return (
                    <motion.div
                      key={cl.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden"
                    >
                      {/* Summary */}
                      <button
                        onClick={() => toggleExpand(cl.id)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="rounded-lg bg-emerald-50 p-2.5 shrink-0">
                            <ClipboardDocumentListIcon className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-900 truncate">{cl.name}</p>
                              {cl.isDefault && (
                                <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{cl.itemCount} item{cl.itemCount !== 1 ? 's' : ''}</p>
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
                                <p className="text-sm text-gray-400 text-center py-4">No items in this checklist</p>
                              ) : (
                                <ul className="space-y-2">
                                  {cl.loadedItems
                                    .sort((a, b) => a.sortOrder - b.sortOrder)
                                    .map((item) => (
                                      <li
                                        key={item.id}
                                        className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-3"
                                      >
                                        <CheckCircleIcon className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium text-gray-900">{item.taskDescription}</p>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-xs text-gray-400">{item.roomName}</span>
                                            {item.requiresPhoto && (
                                              <span className="inline-flex items-center gap-0.5 text-xs text-amber-600">
                                                <CameraIcon className="h-3 w-3" />
                                                Photo required
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </li>
                                    ))}
                                </ul>
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
