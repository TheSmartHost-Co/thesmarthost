'use client'

import { useEffect, useMemo, useState } from 'react'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import SearchableSelect, {
  type SearchableSelectOption,
} from '@/components/shared/SearchableSelect'
import { TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { getProperties } from '@/services/propertyService'
import {
  getPropertyClassMappings,
  upsertPropertyClassMapping,
  deletePropertyClassMapping,
  getQbClasses,
} from '@/services/quickbooksService'
import type { QbClass, PropertyClassMapping } from '@/services/types/quickbooks'
import type { Property } from '@/services/types/property'

interface PropertyClassMappingTableProps {
  isConnected: boolean
}

interface PropertyRow {
  id: string
  name: string
}

/**
 * Two-column UI: HostMetrics properties ↔ QBO Class entities.
 *
 * Mirrors CategoryMappingTable. The mapping is per-user, persistent, and
 * is auto-applied at sync time so SendToQbModal can pre-fill the Class
 * field from the expense's property without an extra click. Inline-saves on
 * selection. Banner if any property is unmapped — those expenses go to QBO
 * without a ClassRef (still valid, just untagged).
 */
export default function PropertyClassMappingTable({ isConnected }: PropertyClassMappingTableProps) {
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  const [properties, setProperties] = useState<PropertyRow[]>([])
  const [qbClasses, setQbClasses] = useState<QbClass[]>([])
  const [mappings, setMappings] = useState<PropertyClassMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [savingPropertyId, setSavingPropertyId] = useState<string | null>(null)

  const userId = profile?.id

  const classOptions: SearchableSelectOption<string>[] = useMemo(
    () =>
      qbClasses.map((c) => ({
        value: c.id,
        label: c.name,
        secondaryLabel: c.fullyQualifiedName !== c.name ? c.fullyQualifiedName : undefined,
      })),
    [qbClasses]
  )

  const mappingByProperty = useMemo(() => {
    const m = new Map<string, PropertyClassMapping>()
    mappings.forEach((row) => m.set(row.propertyId, row))
    return m
  }, [mappings])

  const unmappedCount = useMemo(
    () => properties.filter((p) => !mappingByProperty.has(p.id)).length,
    [properties, mappingByProperty]
  )

  useEffect(() => {
    if (!isConnected || !userId) return

    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [propsRes, classesRes, mappingsRes] = await Promise.all([
          getProperties(userId),
          getQbClasses(),
          getPropertyClassMappings(),
        ])
        if (cancelled) return

        if (propsRes.status === 'success') {
          // Property listing service returns full Property objects; pick just
          // the fields we need so the dropdown stays narrow + sortable.
          const rows: PropertyRow[] = propsRes.data
            .map((p: Property) => ({
              id: p.id,
              name: p.listingName || p.address || p.id,
            }))
            .sort((a, b) => a.name.localeCompare(b.name))
          setProperties(rows)
        }

        if (classesRes.status === 'success') setQbClasses(classesRes.data)
        if (mappingsRes.status === 'success') setMappings(mappingsRes.data)
      } catch (err) {
        console.error('Failed to load property→class mappings:', err)
        showNotification(
          err instanceof Error ? err.message : 'Failed to load property→class mappings',
          'error'
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, userId])

  const handleSelect = async (propertyId: string, qbClassId: string | null) => {
    if (!qbClassId) return
    setSavingPropertyId(propertyId)
    try {
      const res = await upsertPropertyClassMapping(propertyId, qbClassId)
      if (res.status === 'success') {
        setMappings((prev) => {
          const existing = prev.findIndex((m) => m.propertyId === propertyId)
          if (existing >= 0) {
            const copy = [...prev]
            copy[existing] = res.data
            return copy
          }
          return [...prev, res.data]
        })
        showNotification('Class mapping saved', 'success')
      } else {
        showNotification(res.message || 'Failed to save class mapping', 'error')
      }
    } catch (err) {
      console.error('Failed to save class mapping:', err)
      showNotification(
        err instanceof Error ? err.message : 'Failed to save class mapping',
        'error'
      )
    } finally {
      setSavingPropertyId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setSavingPropertyId(id)
    try {
      const res = await deletePropertyClassMapping(id)
      if (res.status === 'success') {
        setMappings((prev) => prev.filter((m) => m.id !== id))
        showNotification('Class mapping removed', 'success')
      } else {
        showNotification(res.message || 'Failed to remove class mapping', 'error')
      }
    } catch (err) {
      console.error('Failed to delete class mapping:', err)
      showNotification(
        err instanceof Error ? err.message : 'Failed to remove class mapping',
        'error'
      )
    } finally {
      setSavingPropertyId(null)
    }
  }

  if (!isConnected) {
    return (
      <div className="text-sm text-gray-500 italic">
        Connect QuickBooks to map your properties to QuickBooks classes.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {!loading && qbClasses.length === 0 && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-sm">
          <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            No classes found in QuickBooks. Add them in QuickBooks
            (<span className="font-medium">Settings → Account and settings → Advanced → Categories → Track classes</span>),
            then return to map them here.
          </div>
        </div>
      )}
      {!loading && qbClasses.length > 0 && unmappedCount > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
          <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">{unmappedCount}</span>{' '}
            propert{unmappedCount === 1 ? 'y has' : 'ies have'} no class mapping. Expenses for
            those properties will sync to QuickBooks without a Class tag (still valid, just
            uncategorized for cost-center reporting).
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">Property</th>
              <th className="px-4 py-2.5 text-left font-semibold">QuickBooks class</th>
              <th className="px-4 py-2.5 w-12" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && properties.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500 text-sm italic">
                  No properties yet. Add a property first to map it to a class.
                </td>
              </tr>
            )}
            {!loading &&
              properties.map((p) => {
                const mapping = mappingByProperty.get(p.id)
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-900">{p.name}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="max-w-md">
                        <SearchableSelect<string>
                          options={classOptions}
                          value={mapping?.qbClassId ?? null}
                          onChange={(val) => handleSelect(p.id, val)}
                          placeholder="Select a QuickBooks class…"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      {mapping && (
                        <button
                          type="button"
                          onClick={() => handleDelete(mapping.id)}
                          disabled={savingPropertyId === mapping.id}
                          title="Remove class mapping"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
