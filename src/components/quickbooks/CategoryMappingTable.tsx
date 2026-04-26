'use client'

import { useEffect, useMemo, useState } from 'react'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import SearchableSelect, {
  type SearchableSelectOption,
} from '@/components/shared/SearchableSelect'
import { TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { getCategoriesByUserId } from '@/services/expenseCategoriesService'
import {
  getAccountMappings,
  upsertAccountMapping,
  deleteAccountMapping,
  getQbAccounts,
} from '@/services/quickbooksService'
import type { QbAccount, QbAccountMapping } from '@/services/types/quickbooks'

interface CategoryMappingTableProps {
  isConnected: boolean
}

interface CategoryRow {
  code: string
  label: string
}

/**
 * Two-column UI: expense categories ↔ QBO chart-of-accounts entries.
 * Inline-saves on selection. Banner if any category is unmapped.
 */
export default function CategoryMappingTable({ isConnected }: CategoryMappingTableProps) {
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [qbAccounts, setQbAccounts] = useState<QbAccount[]>([])
  const [mappings, setMappings] = useState<QbAccountMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [savingCategoryCode, setSavingCategoryCode] = useState<string | null>(null)

  const userId = profile?.id

  const accountOptions: SearchableSelectOption<string>[] = useMemo(
    () =>
      qbAccounts.map((a) => ({
        value: a.id,
        label: a.name,
        secondaryLabel: a.accountType,
      })),
    [qbAccounts]
  )

  const mappingByCategory = useMemo(() => {
    const m = new Map<string, QbAccountMapping>()
    mappings.forEach((row) => m.set(row.expenseCategoryCode, row))
    return m
  }, [mappings])

  const unmappedCount = useMemo(
    () => categories.filter((c) => !mappingByCategory.has(c.code)).length,
    [categories, mappingByCategory]
  )

  useEffect(() => {
    if (!isConnected || !userId) return

    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [catsRes, accountsRes, mappingsRes] = await Promise.all([
          getCategoriesByUserId(userId),
          getQbAccounts(),
          getAccountMappings(),
        ])
        if (cancelled) return

        // Backend lazy-seeds canonical defaults into expense_categories on
        // first read, so this list contains them automatically alongside
        // any user-created custom categories.
        const userCats: CategoryRow[] =
          catsRes.status === 'success'
            ? catsRes.data.map((c) => ({ code: c.code, label: c.label }))
            : []
        setCategories(userCats.sort((a, b) => a.label.localeCompare(b.label)))

        if (accountsRes.status === 'success') setQbAccounts(accountsRes.data)
        if (mappingsRes.status === 'success') setMappings(mappingsRes.data)
      } catch (err) {
        console.error('Failed to load category mappings:', err)
        showNotification(
          err instanceof Error ? err.message : 'Failed to load category mappings',
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

  const handleSelect = async (code: string, qbAccountId: string | null) => {
    if (!qbAccountId) return
    setSavingCategoryCode(code)
    try {
      const res = await upsertAccountMapping(code, qbAccountId)
      if (res.status === 'success') {
        setMappings((prev) => {
          const existing = prev.findIndex((m) => m.expenseCategoryCode === code)
          if (existing >= 0) {
            const copy = [...prev]
            copy[existing] = res.data
            return copy
          }
          return [...prev, res.data]
        })
        showNotification('Mapping saved', 'success')
      } else {
        showNotification(res.message || 'Failed to save mapping', 'error')
      }
    } catch (err) {
      console.error('Failed to save mapping:', err)
      showNotification(err instanceof Error ? err.message : 'Failed to save mapping', 'error')
    } finally {
      setSavingCategoryCode(null)
    }
  }

  const handleDelete = async (id: string) => {
    setSavingCategoryCode(id)
    try {
      const res = await deleteAccountMapping(id)
      if (res.status === 'success') {
        setMappings((prev) => prev.filter((m) => m.id !== id))
        showNotification('Mapping removed', 'success')
      } else {
        showNotification(res.message || 'Failed to remove mapping', 'error')
      }
    } catch (err) {
      console.error('Failed to delete mapping:', err)
      showNotification(err instanceof Error ? err.message : 'Failed to remove mapping', 'error')
    } finally {
      setSavingCategoryCode(null)
    }
  }

  if (!isConnected) {
    return (
      <div className="text-sm text-gray-500 italic">
        Connect QuickBooks to map your expense categories to accounts.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {!loading && unmappedCount > 0 && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
          <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">{unmappedCount}</span> categor
            {unmappedCount === 1 ? 'y is' : 'ies are'} not mapped. Expenses in
            unmapped categories cannot be sent to QuickBooks.
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">Expense category</th>
              <th className="px-4 py-2.5 text-left font-semibold">QuickBooks account</th>
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
            {!loading &&
              categories.map((cat) => {
                const mapping = mappingByCategory.get(cat.code)
                return (
                  <tr key={cat.code} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-900">{cat.label}</div>
                      <div className="text-xs text-gray-500 font-mono">{cat.code}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="max-w-md">
                        <SearchableSelect<string>
                          options={accountOptions}
                          value={mapping?.qbAccountId ?? null}
                          onChange={(val) => handleSelect(cat.code, val)}
                          placeholder="Select a QuickBooks account…"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      {mapping && (
                        <button
                          type="button"
                          onClick={() => handleDelete(mapping.id)}
                          disabled={savingCategoryCode === mapping.id}
                          title="Remove mapping"
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
