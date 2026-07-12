'use client'

import { notifyError } from '@/utils/notify'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  LinkIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  getListingMappings,
  groupByListing,
} from '@/services/pmsListingMappingService'
import type { GroupedListingMapping } from '@/services/types/pmsListingMapping'
import type { Property } from '@/services/types/property'
import EditListingMappingModal from './EditListingMappingModal'
import CreateListingMappingModal from './CreateListingMappingModal'
import DeleteListingMappingModal from './DeleteListingMappingModal'

interface ListingMappingsSectionProps {
  userId: string
  properties: Property[]
  loadingProperties: boolean
  canWrite: boolean
}

// Channel badge colors, consistent with the iCal subscriptions section.
const PLATFORM_COLORS: Record<string, { bg: string; text: string }> = {
  airbnb: { bg: 'bg-rose-100', text: 'text-rose-700' },
  booking: { bg: 'bg-blue-100', text: 'text-blue-700' },
  vrbo: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  google: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  direct: { bg: 'bg-gray-100', text: 'text-gray-700' },
  hostaway: { bg: 'bg-orange-100', text: 'text-orange-700' },
}

function platformBadgeClass(platform: string): string {
  const c = PLATFORM_COLORS[platform] ?? { bg: 'bg-gray-100', text: 'text-gray-700' }
  return `${c.bg} ${c.text}`
}

const ListingMappingsSection: React.FC<ListingMappingsSectionProps> = ({
  userId,
  properties,
  loadingProperties,
  canWrite,
}) => {
  const { showNotification } = useNotificationStore()
  const [mappings, setMappings] = useState<GroupedListingMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const [editing, setEditing] = useState<GroupedListingMapping | null>(null)
  const [deleting, setDeleting] = useState<GroupedListingMapping | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const fetchMappings = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await getListingMappings(userId)
      if (res.status === 'success') {
        setMappings(groupByListing(res.data))
      } else {
        showNotification(res.message || 'Failed to load listing mappings', 'error')
      }
    } catch (err) {
      console.error('Error loading listing mappings:', err)
      notifyError(err, 'Failed to load listing mappings')
    } finally {
      setLoading(false)
    }
  }, [userId, showNotification])

  useEffect(() => {
    fetchMappings()
  }, [fetchMappings])

  // Fall back to the property list for a display name when the join is absent.
  const propertyNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of properties) map.set(p.id, p.listingName || p.address)
    return map
  }, [properties])

  const displayPropertyName = useCallback(
    (m: GroupedListingMapping): string | null => {
      if (m.propertyName) return m.propertyName
      if (m.propertyId) return propertyNameById.get(m.propertyId) ?? null
      return null
    },
    [propertyNameById]
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return mappings
    return mappings.filter((m) => {
      const name = displayPropertyName(m)?.toLowerCase() ?? ''
      return (
        m.externalListingId.toLowerCase().includes(q) ||
        name.includes(q) ||
        (m.clientName?.toLowerCase().includes(q) ?? false) ||
        m.platforms.some((p) => p.toLowerCase().includes(q))
      )
    })
  }, [mappings, search, displayPropertyName])

  const existingListingIds = useMemo(
    () => mappings.map((m) => m.externalListingId),
    [mappings]
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center">
              <LinkIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Property mappings</h3>
              <p className="text-sm text-gray-500">
                Control which property each Hostaway listing&apos;s bookings are
                assigned to when webhooks arrive.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchMappings}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {canWrite && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4" />
                Add mapping
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Search */}
        {mappings.length > 0 && (
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by listing ID, property, client, or channel..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* States */}
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500">
            Loading listing mappings...
          </div>
        ) : mappings.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <LinkIcon className="h-6 w-6 text-gray-400" />
            </div>
            <h4 className="text-sm font-semibold text-gray-900">No listing mappings yet</h4>
            <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
              Mappings are created automatically as bookings come in. You can also
              add one manually to pre-assign a listing to a property.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-500">
            No mappings match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="py-3 pr-4">Listing</th>
                  <th className="py-3 pr-4">Mapped property</th>
                  <th className="py-3 pr-4">Channels</th>
                  <th className="py-3 pr-4">Source</th>
                  {canWrite && <th className="py-3 pr-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const propName = displayPropertyName(m)
                  return (
                    <tr
                      key={m.externalListingId}
                      onClick={canWrite ? () => setEditing(m) : undefined}
                      className={`border-b border-gray-50 ${
                        canWrite
                          ? 'cursor-pointer hover:bg-blue-50/50'
                          : 'hover:bg-gray-50/60'
                      }`}
                    >
                      <td className="py-3 pr-4">
                        <div className="font-mono text-gray-900">
                          {m.externalListingId}
                        </div>
                        {m.clientName && (
                          <div className="text-xs text-gray-400">{m.clientName}</div>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {propName ? (
                          <span className="text-gray-900">{propName}</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                            Unmapped
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {m.platforms.map((p) => (
                            <span
                              key={p}
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${platformBadgeClass(
                                p
                              )}`}
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            m.source === 'manual'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {m.source === 'manual' ? 'Pinned' : 'Auto'}
                        </span>
                      </td>
                      {canWrite && (
                        <td className="py-3 pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditing(m)
                              }}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                              aria-label="Edit mapping"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleting(m)
                              }}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600"
                              aria-label="Delete mapping"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <EditListingMappingModal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        userId={userId}
        mapping={editing}
        properties={properties}
        onSaved={fetchMappings}
      />
      <CreateListingMappingModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        userId={userId}
        properties={properties}
        existingListingIds={existingListingIds}
        onSaved={fetchMappings}
      />
      <DeleteListingMappingModal
        isOpen={deleting !== null}
        onClose={() => setDeleting(null)}
        userId={userId}
        mapping={deleting}
        onDeleted={fetchMappings}
      />

      {loadingProperties && (
        <div className="px-6 pb-4 text-xs text-gray-400">Loading properties…</div>
      )}
    </motion.div>
  )
}

export default ListingMappingsSection
