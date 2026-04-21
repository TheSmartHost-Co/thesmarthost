'use client'

import { useState, useMemo, useCallback } from 'react'
import { getReceiptMatchSuggestions } from '@/services/receiptService'
import type {
  ReceiptLineItem,
  ReceiptMatchSuggestion,
  ScanReceiptMatch,
  ConfirmedMapping,
} from '@/services/types/receipt'

export interface ReviewRow {
  receiptLineItemId: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  assignedItemId: string | null
  isNew: boolean
  matchScore: number
  matchType: 'exact' | 'fuzzy' | 'new' | 'none'
  isDeleted: boolean
}

/**
 * Normalize /match API suggestion into ReviewRow
 */
function fromApiSuggestion(
  s: ReceiptMatchSuggestion,
  lineItems: ReceiptLineItem[]
): ReviewRow {
  const li = lineItems.find((l) => l.id === s.receiptLineItemId)
  return {
    receiptLineItemId: s.receiptLineItemId,
    name: li?.name || s.receiptLineItemName,
    quantity: li?.quantity ?? 1,
    unitPrice: li?.unitPrice ?? 0,
    totalPrice: li?.totalPrice ?? 0,
    assignedItemId: s.suggestedSupplyListItemId,
    isNew: s.matchType === 'new',
    matchScore: s.matchScore,
    matchType: s.matchType,
    isDeleted: false,
  }
}

/**
 * Normalize upload response matchSuggestion (ScanReceiptMatch) into ReviewRow.
 * Correlates by lineItemName since this shape lacks receiptLineItemId.
 */
function fromScanMatch(
  s: ScanReceiptMatch,
  lineItems: ReceiptLineItem[],
  usedIds: Set<string>
): ReviewRow {
  // Find matching line item by name, preferring unused ones
  const li = lineItems.find(
    (l) => l.name.toLowerCase().trim() === s.lineItemName.toLowerCase().trim() && !usedIds.has(l.id)
  ) || lineItems.find(
    (l) => l.name.toLowerCase().trim() === s.lineItemName.toLowerCase().trim()
  )

  const id = li?.id || `scan-${s.lineItemName}-${Math.random().toString(36).slice(2, 7)}`
  if (li) usedIds.add(li.id)

  return {
    receiptLineItemId: id,
    name: li?.name || s.lineItemName,
    quantity: li?.quantity ?? s.lineItemQuantity,
    unitPrice: li?.unitPrice ?? s.lineItemUnitPrice,
    totalPrice: li?.totalPrice ?? s.lineItemTotalPrice,
    assignedItemId: s.matchedItemId,
    isNew: s.matchType === 'none' && !s.matchedItemId,
    matchScore: s.matchScore,
    matchType: s.matchType === 'none' ? 'none' : s.matchType,
    isDeleted: false,
  }
}

export function useReceiptMatchReview(
  receiptLineItems: ReceiptLineItem[],
  initialSuggestions?: ScanReceiptMatch[] | null
) {
  const [rows, setRows] = useState<ReviewRow[]>(() => {
    if (initialSuggestions && initialSuggestions.length > 0) {
      const usedIds = new Set<string>()
      return initialSuggestions.map((s) => fromScanMatch(s, receiptLineItems, usedIds))
    }
    // Default: one row per line item, unmatched
    return receiptLineItems.map((li) => ({
      receiptLineItemId: li.id,
      name: li.name,
      quantity: li.quantity,
      unitPrice: li.unitPrice,
      totalPrice: li.totalPrice,
      assignedItemId: null,
      isNew: false,
      matchScore: 0,
      matchType: 'none' as const,
      isDeleted: false,
    }))
  })
  const [loading, setLoading] = useState(false)

  const fetchSuggestions = useCallback(
    async (receiptId: string, supplyListId: string) => {
      setLoading(true)
      try {
        const res = await getReceiptMatchSuggestions(receiptId, supplyListId)
        if (res.status === 'success' && res.data.matches) {
          const suggestions = res.data.matches
          // Merge suggestions with line items
          const suggestionMap = new Map(
            suggestions.map((s) => [s.receiptLineItemId, s])
          )
          setRows(
            receiptLineItems.map((li) => {
              const s = suggestionMap.get(li.id)
              if (s) return fromApiSuggestion(s, receiptLineItems)
              return {
                receiptLineItemId: li.id,
                name: li.name,
                quantity: li.quantity,
                unitPrice: li.unitPrice,
                totalPrice: li.totalPrice,
                assignedItemId: null,
                isNew: false,
                matchScore: 0,
                matchType: 'none' as const,
                isDeleted: false,
              }
            })
          )
        }
      } finally {
        setLoading(false)
      }
    },
    [receiptLineItems]
  )

  const duplicateIds = useMemo(() => {
    const seen = new Map<string, string[]>()
    for (const row of rows) {
      if (row.isDeleted || row.isNew || !row.assignedItemId) continue
      const existing = seen.get(row.assignedItemId) || []
      seen.set(row.assignedItemId, [...existing, row.receiptLineItemId])
    }
    const dupes = new Set<string>()
    for (const ids of seen.values()) {
      if (ids.length > 1) ids.forEach((id) => dupes.add(id))
    }
    return dupes
  }, [rows])

  const setRowMatch = useCallback(
    (receiptLineItemId: string, supplyListItemId: string | null) => {
      setRows((prev) =>
        prev.map((r) =>
          r.receiptLineItemId === receiptLineItemId
            ? { ...r, assignedItemId: supplyListItemId, isNew: false }
            : r
        )
      )
    },
    []
  )

  const setRowNew = useCallback((receiptLineItemId: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.receiptLineItemId === receiptLineItemId
          ? { ...r, isNew: true, assignedItemId: null }
          : r
      )
    )
  }, [])

  const updateRowField = useCallback(
    (id: string, field: string, value: string | number) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.receiptLineItemId !== id) return r
          const updated = { ...r, [field]: value }
          // Auto-calculate totalPrice when qty or unitPrice changes
          if (field === 'quantity' || field === 'unitPrice') {
            updated.totalPrice = Number(updated.quantity) * Number(updated.unitPrice)
          }
          return updated
        })
      )
    },
    []
  )

  const deleteRow = useCallback((id: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.receiptLineItemId === id ? { ...r, isDeleted: true } : r
      )
    )
  }, [])

  const undeleteRow = useCallback((id: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.receiptLineItemId === id ? { ...r, isDeleted: false } : r
      )
    )
  }, [])

  const buildMapping = useCallback((): ConfirmedMapping[] => {
    return rows
      .filter((r) => !r.isDeleted)
      .map((r) => ({
        receiptLineItemId: r.receiptLineItemId,
        supplyListItemId: r.isNew ? null : r.assignedItemId,
        action: r.isNew ? ('new' as const) : ('existing' as const),
      }))
  }, [rows])

  const deletedLineItemIds = useMemo(
    () =>
      rows
        .filter((r) => r.isDeleted && !r.receiptLineItemId.startsWith('scan-'))
        .map((r) => r.receiptLineItemId),
    [rows]
  )

  const reset = useCallback(() => {
    setRows(
      receiptLineItems.map((li) => ({
        receiptLineItemId: li.id,
        name: li.name,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        totalPrice: li.totalPrice,
        assignedItemId: null,
        isNew: false,
        matchScore: 0,
        matchType: 'none' as const,
        isDeleted: false,
      }))
    )
    setLoading(false)
  }, [receiptLineItems])

  return {
    rows,
    loading,
    duplicateIds,
    fetchSuggestions,
    setRowMatch,
    setRowNew,
    updateRowField,
    deleteRow,
    undeleteRow,
    buildMapping,
    deletedLineItemIds,
    reset,
  }
}
