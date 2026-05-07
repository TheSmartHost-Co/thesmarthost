'use client'

import { useEffect, useMemo, useState } from 'react'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import SearchableSelect, {
  type SearchableSelectOption,
} from '@/components/shared/SearchableSelect'
import { TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import {
  getTaxCodeMappings,
  upsertTaxCodeMapping,
  deleteTaxCodeMapping,
  getQbTaxCodes,
} from '@/services/quickbooksService'
import type { QbTaxCode, TaxCodeMapping, HmTaxKind } from '@/services/types/quickbooks'

interface TaxCodeMappingTableProps {
  isConnected: boolean
}

/**
 * Four-row UI: HostMetrics tax kinds (gst / pst / hst / qst) ↔ QBO TaxCode
 * entities.
 *
 * Unlike the property→class table, this table has a fixed list of rows (the HM
 * tax columns we currently track on expenses). When the user maps a tax kind,
 * syncExpense's `buildTaxDetail` uses that code as the line's TaxCodeRef when
 * the expense has a non-zero amount of that kind. Total tax always goes to
 * TxnTaxDetail.TotalTax regardless of mapping.
 */
const HM_TAX_KINDS: { kind: HmTaxKind; label: string; description: string }[] = [
  { kind: 'gst', label: 'GST', description: 'Goods and Services Tax (federal, Canada-wide)' },
  { kind: 'pst', label: 'PST', description: 'Provincial Sales Tax (BC, MB, SK)' },
  { kind: 'hst', label: 'HST', description: 'Harmonized Sales Tax (ON, NB, NL, NS, PE)' },
  { kind: 'qst', label: 'QST', description: 'Quebec Sales Tax (Taxe de vente du Québec, 9.975%)' },
]

export default function TaxCodeMappingTable({ isConnected }: TaxCodeMappingTableProps) {
  const { profile } = useUserStore()
  const { showNotification } = useNotificationStore()

  const [taxCodes, setTaxCodes] = useState<QbTaxCode[]>([])
  const [mappings, setMappings] = useState<TaxCodeMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [savingKind, setSavingKind] = useState<string | null>(null)

  const userId = profile?.id

  const taxCodeOptions: SearchableSelectOption<string>[] = useMemo(
    () =>
      taxCodes.map((t) => {
        // Composite codes (rates.length > 1) bundle multiple rates — e.g.
        // "GST/QST QC" → "Composite • GST 5%, QST 9.975%". Sync auto-promotes
        // multi-tax expenses to a composite, so flagging them here helps users
        // recognize one when picking.
        const rateNames = (t.rates ?? [])
          .map((r) => r.name)
          .filter((n): n is string => Boolean(n))
        const isComposite = rateNames.length > 1
        const rateSuffix = isComposite
          ? `Composite • ${rateNames.join(', ')}`
          : rateNames[0] ?? null
        const secondaryLabel = [t.description, rateSuffix]
          .filter(Boolean)
          .join(' — ') || undefined
        return {
          value: t.id,
          label: t.name,
          secondaryLabel,
        }
      }),
    [taxCodes]
  )

  const mappingByKind = useMemo(() => {
    const m = new Map<string, TaxCodeMapping>()
    mappings.forEach((row) => m.set(row.hmTaxKind, row))
    return m
  }, [mappings])

  useEffect(() => {
    if (!isConnected || !userId) return

    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [codesRes, mappingsRes] = await Promise.all([
          getQbTaxCodes(),
          getTaxCodeMappings(),
        ])
        if (cancelled) return
        if (codesRes.status === 'success') setTaxCodes(codesRes.data)
        if (mappingsRes.status === 'success') setMappings(mappingsRes.data)
      } catch (err) {
        console.error('Failed to load tax-code mappings:', err)
        showNotification(
          err instanceof Error ? err.message : 'Failed to load tax-code mappings',
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

  const handleSelect = async (
    kind: HmTaxKind,
    qbTaxCodeId: string | null
  ) => {
    if (!qbTaxCodeId) return
    setSavingKind(kind)
    try {
      const res = await upsertTaxCodeMapping(kind, qbTaxCodeId)
      if (res.status === 'success') {
        setMappings((prev) => {
          const existing = prev.findIndex((m) => m.hmTaxKind === kind)
          if (existing >= 0) {
            const copy = [...prev]
            copy[existing] = res.data
            return copy
          }
          return [...prev, res.data]
        })
        showNotification(`${kind.toUpperCase()} tax mapping saved`, 'success')
      } else {
        showNotification(res.message || 'Failed to save tax mapping', 'error')
      }
    } catch (err) {
      console.error('Failed to save tax mapping:', err)
      showNotification(
        err instanceof Error ? err.message : 'Failed to save tax mapping',
        'error'
      )
    } finally {
      setSavingKind(null)
    }
  }

  const handleDelete = async (id: string, kind: string) => {
    setSavingKind(kind)
    try {
      const res = await deleteTaxCodeMapping(id)
      if (res.status === 'success') {
        setMappings((prev) => prev.filter((m) => m.id !== id))
        showNotification('Tax mapping removed', 'success')
      } else {
        showNotification(res.message || 'Failed to remove tax mapping', 'error')
      }
    } catch (err) {
      console.error('Failed to delete tax mapping:', err)
      showNotification(
        err instanceof Error ? err.message : 'Failed to remove tax mapping',
        'error'
      )
    } finally {
      setSavingKind(null)
    }
  }

  if (!isConnected) {
    return (
      <div className="text-sm text-gray-500 italic">
        Connect QuickBooks to map your tax kinds (GST / PST / HST / QST) to QuickBooks tax codes.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {!loading && taxCodes.length === 0 && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-sm">
          <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            No tax codes found in QuickBooks. Set up sales tax in QuickBooks
            (<span className="font-medium">Taxes → Sales tax</span>) so codes are available
            here. Until then, expenses sync to QuickBooks with their total tax amount but no
            per-rate code.
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">HostMetrics tax kind</th>
              <th className="px-4 py-2.5 text-left font-semibold">QuickBooks tax code</th>
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
              HM_TAX_KINDS.map(({ kind, label, description }) => {
                const mapping = mappingByKind.get(kind)
                return (
                  <tr key={kind} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-900">{label}</div>
                      <div className="text-xs text-gray-500">{description}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="max-w-md">
                        <SearchableSelect<string>
                          options={taxCodeOptions}
                          value={mapping?.qbTaxCodeId ?? null}
                          onChange={(val) => handleSelect(kind, val)}
                          placeholder="Select a QuickBooks tax code…"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      {mapping && (
                        <button
                          type="button"
                          onClick={() => handleDelete(mapping.id, kind)}
                          disabled={savingKind === kind}
                          title="Remove tax mapping"
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
