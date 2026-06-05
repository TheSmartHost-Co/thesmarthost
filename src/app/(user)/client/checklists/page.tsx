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
  EyeIcon,
} from '@heroicons/react/24/outline'
import {
  getClientPortalChecklists,
  getClientPortalChecklistById,
  getClientPortalProperties,
  getClientPortalPropertyWalkthroughTemplate,
} from '@/services/clientPortalService'
import type {
  ClientPortalChecklist,
  ClientPortalChecklistItem,
  ClientPortalProperty,
  ClientPortalEffectiveTemplate,
} from '@/services/types/clientPortal'

/* ═══════════════════════════ Shared bits ═══════════════════════════ */

function Spinner({ className = 'h-5 w-5 text-emerald-600' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

type TabKey = 'checklists' | 'walkthroughs'

/* ═══════════════════════════ Page ═══════════════════════════ */

export default function ClientChecklistsPage() {
  const { t } = useTranslation('clientPortal')
  const [tab, setTab] = useState<TabKey>('checklists')

  // Both list endpoints are lightweight; fetch them up front so the tab
  // switcher can show live counts and each tab renders instantly on toggle.
  const [checklists, setChecklists] = useState<ClientPortalChecklist[]>([])
  const [checklistsLoading, setChecklistsLoading] = useState(true)
  const [properties, setProperties] = useState<ClientPortalProperty[]>([])
  const [propertiesLoading, setPropertiesLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [cl, props] = await Promise.all([
          getClientPortalChecklists(),
          getClientPortalProperties(),
        ])
        if (!active) return
        if (cl.status === 'success') setChecklists(cl.data)
        if (props.status === 'success') setProperties(props.data)
      } catch (err) {
        console.error('Failed to load checklist page data:', err)
      } finally {
        if (active) {
          setChecklistsLoading(false)
          setPropertiesLoading(false)
        }
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const tabs = useMemo(
    () => [
      {
        key: 'checklists' as const,
        label: t('tabChecklists'),
        icon: ClipboardDocumentListIcon,
        count: checklistsLoading ? undefined : checklists.length,
      },
      {
        key: 'walkthroughs' as const,
        label: t('tabWalkthroughs'),
        icon: EyeIcon,
        count: propertiesLoading ? undefined : properties.length,
      },
    ],
    [t, checklists.length, properties.length, checklistsLoading, propertiesLoading]
  )

  const onTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setTab('walkthroughs')
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setTab('checklists')
    }
  }, [])

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('checklistsTitle')}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {tab === 'checklists'
            ? t('checklistCount', { count: checklists.length })
            : t('walkthroughCount', { count: properties.length })}
        </p>
      </div>

      {/* Segmented tab switcher */}
      <div
        role="tablist"
        aria-label={t('checklistsTitle')}
        onKeyDown={onTabKeyDown}
        className="inline-flex rounded-lg bg-gray-100 p-1"
      >
        {tabs.map((tb) => {
          const active = tab === tb.key
          const Icon = tb.icon
          return (
            <button
              key={tb.key}
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(tb.key)}
              className="relative inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors cursor-pointer"
            >
              {active && (
                <motion.span
                  layoutId="checklistsActiveTab"
                  className="absolute inset-0 rounded-md bg-white shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className={`relative h-4 w-4 ${active ? 'text-emerald-600' : 'text-gray-400'}`} />
              <span
                className={`relative ${active ? 'font-semibold text-emerald-700' : 'font-medium text-gray-500'}`}
              >
                {tb.label}
              </span>
              {tb.count != null && (
                <span
                  className={`relative inline-flex items-center justify-center min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-xs font-medium ${
                    active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {tb.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Active tab */}
      {tab === 'checklists' ? (
        <ChecklistsTab checklists={checklists} loading={checklistsLoading} />
      ) : (
        <WalkthroughsTab properties={properties} loading={propertiesLoading} />
      )}
    </div>
  )
}

/* ═══════════════════════════ Checklists tab ═══════════════════════════ */

interface ChecklistRow extends ClientPortalChecklist {
  loadedItems?: ClientPortalChecklistItem[]
  itemsLoading?: boolean
}

function groupChecklistItemsByRoom(items: ClientPortalChecklistItem[]) {
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder)
  const groups: Record<string, ClientPortalChecklistItem[]> = {}
  for (const item of sorted) {
    const room = item.roomName || 'General'
    if (!groups[room]) groups[room] = []
    groups[room].push(item)
  }
  return groups
}

function ChecklistsTab({
  checklists,
  loading,
}: {
  checklists: ClientPortalChecklist[]
  loading: boolean
}) {
  const { t } = useTranslation('clientPortal')
  const [rows, setRows] = useState<ChecklistRow[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setRows(checklists.map((c) => ({ ...c })))
  }, [checklists])

  const toggleExpand = useCallback(
    async (id: string) => {
      if (expandedId === id) {
        setExpandedId(null)
        return
      }
      setExpandedId(id)

      const existing = rows.find((c) => c.id === id)
      if (existing?.loadedItems) return

      setRows((prev) => prev.map((c) => (c.id === id ? { ...c, itemsLoading: true } : c)))

      try {
        const res = await getClientPortalChecklistById(id)
        if (res.status === 'success' && res.data.items) {
          setRows((prev) =>
            prev.map((c) =>
              c.id === id ? { ...c, loadedItems: res.data.items, itemsLoading: false } : c
            )
          )
        } else {
          setRows((prev) => prev.map((c) => (c.id === id ? { ...c, itemsLoading: false } : c)))
        }
      } catch (err) {
        console.error('Failed to load checklist items:', err)
        setRows((prev) => prev.map((c) => (c.id === id ? { ...c, itemsLoading: false } : c)))
      }
    },
    [expandedId, rows]
  )

  const groupedByProperty = useMemo(() => {
    return rows.reduce<Record<string, ChecklistRow[]>>((acc, c) => {
      const key = c.propertyName || 'Unknown Property'
      if (!acc[key]) acc[key] = []
      acc[key].push(c)
      return acc
    }, {})
  }, [rows])

  const propertyNames = useMemo(() => Object.keys(groupedByProperty).sort(), [groupedByProperty])

  const getPhotoCount = (cl: ChecklistRow): number | null => {
    if (!cl.loadedItems) return null
    return cl.loadedItems.filter((item) => item.requiresPhoto).length
  }

  let cardIndex = 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    )
  }

  if (propertyNames.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center rounded-full bg-gray-100 p-4 mb-4">
          <ClipboardDocumentIcon className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{t('noChecklistsFound')}</h3>
        <p className="text-sm text-gray-500 mt-1">{t('checklistsWillAppear')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {propertyNames.map((propName) => (
        <div key={propName}>
          <div className="flex items-center gap-2 mb-3">
            <HomeModernIcon className="h-4 w-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">{propName}</h2>
          </div>

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
                          <p className="text-sm font-semibold text-gray-900 truncate">{cl.name}</p>
                          {cl.isDefault && (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              {t('templateDefault')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-500">
                            {t('itemCount', { count: cl.itemCount })}
                          </span>
                          {photoCount !== null && photoCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                              <CameraIcon className="h-3 w-3" />
                              {t('requiresPhoto', { count: photoCount })}
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
                              <Spinner />
                            </div>
                          ) : !cl.loadedItems || cl.loadedItems.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">
                              {t('noItemsInChecklist')}
                            </p>
                          ) : (
                            <div className="space-y-5">
                              {Object.entries(groupChecklistItemsByRoom(cl.loadedItems)).map(
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
  )
}

/* ═══════════════════════════ Walkthroughs tab ═══════════════════════════ */

interface PropertyRow extends ClientPortalProperty {
  template?: ClientPortalEffectiveTemplate
  templateLoading?: boolean
  templateError?: boolean
  templateLoaded?: boolean
}

function propertyLabel(p: ClientPortalProperty): string {
  return p.listingName || p.internalName || p.externalName || p.address || 'Property'
}

function WalkthroughsTab({
  properties,
  loading,
}: {
  properties: ClientPortalProperty[]
  loading: boolean
}) {
  const { t } = useTranslation('clientPortal')
  const [rows, setRows] = useState<PropertyRow[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    setRows(properties.map((p) => ({ ...p })))
  }, [properties])

  const toggleExpand = useCallback(
    async (id: string) => {
      if (expandedId === id) {
        setExpandedId(null)
        return
      }
      setExpandedId(id)

      const existing = rows.find((p) => p.id === id)
      if (existing?.templateLoaded) return

      setRows((prev) =>
        prev.map((p) => (p.id === id ? { ...p, templateLoading: true, templateError: false } : p))
      )

      try {
        const res = await getClientPortalPropertyWalkthroughTemplate(id)
        if (res.status === 'success') {
          setRows((prev) =>
            prev.map((p) =>
              p.id === id
                ? { ...p, template: res.data, templateLoading: false, templateLoaded: true }
                : p
            )
          )
        } else {
          setRows((prev) =>
            prev.map((p) =>
              p.id === id
                ? { ...p, templateLoading: false, templateLoaded: true, templateError: true }
                : p
            )
          )
        }
      } catch (err) {
        console.error('Failed to load walkthrough template:', err)
        setRows((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, templateLoading: false, templateLoaded: true, templateError: true }
              : p
          )
        )
      }
    },
    [expandedId, rows]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center rounded-full bg-gray-100 p-4 mb-4">
          <EyeIcon className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{t('noWalkthroughTemplatesFound')}</h3>
        <p className="text-sm text-gray-500 mt-1">{t('walkthroughsWillAppear')}</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {rows.map((p, index) => {
        const isExpanded = expandedId === p.id
        const tmpl = p.template
        const groupCount = tmpl ? tmpl.groups.length : null

        return (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden"
          >
            <button
              onClick={() => toggleExpand(p.id)}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="rounded-lg bg-emerald-50 p-2.5 shrink-0">
                  <EyeIcon className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{propertyLabel(p)}</p>
                    {tmpl && (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          tmpl.source === 'assigned'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {tmpl.source === 'assigned' ? t('templateAssigned') : t('templateDefault')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {tmpl ? (
                      <>
                        <span className="text-xs text-gray-500 truncate">{tmpl.name}</span>
                        {groupCount !== null && groupCount > 0 && (
                          <span className="text-xs text-gray-400">
                            {t('groupCount', { count: groupCount })}
                          </span>
                        )}
                      </>
                    ) : (
                      p.address && <span className="text-xs text-gray-500 truncate">{p.address}</span>
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
                    {p.templateLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Spinner />
                      </div>
                    ) : p.templateError || !tmpl ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        {t('noWalkthroughForProperty')}
                      </p>
                    ) : (
                      <div className="space-y-5">
                        {tmpl.requiresCompletion && (
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                            <CameraIcon className="h-3.5 w-3.5" />
                            {t('requiresPhotosNote')}
                          </div>
                        )}

                        {tmpl.groups.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">
                            {t('noWalkthroughForProperty')}
                          </p>
                        ) : (
                          [...tmpl.groups]
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map((group) => {
                              const items = [...group.items].sort((a, b) => a.sortOrder - b.sortOrder)
                              return (
                                <div key={group.id}>
                                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                    {group.name}
                                  </h4>
                                  {items.length === 0 ? (
                                    <p className="text-sm text-gray-400 px-3 py-1.5">
                                      {t('noItemsInGroup')}
                                    </p>
                                  ) : (
                                    <ul className="space-y-1.5">
                                      {items.map((item) => (
                                        <li
                                          key={item.id}
                                          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700"
                                        >
                                          <span className="h-1.5 w-1.5 rounded-full bg-gray-300 shrink-0" />
                                          <span className="flex-1">{item.name}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )
                            })
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
  )
}
