'use client'

import { useState, useMemo } from 'react'
import type { SupplyList, AggregatedItem } from '@/services/types/supplyList'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

type SortField = 'name' | 'totalQuantity' | 'purchasedCount' | 'listCount'

interface SupplyHubItemViewProps {
  supplyLists: SupplyList[]
}

export default function SupplyHubItemView({ supplyLists }: SupplyHubItemViewProps) {
  const [sortField, setSortField] = useState<SortField>('listCount')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const aggregated = useMemo<AggregatedItem[]>(() => {
    const map = new Map<string, AggregatedItem>()

    for (const sl of supplyLists) {
      for (const item of sl.items) {
        const key = item.name.toLowerCase().trim()
        if (!map.has(key)) {
          map.set(key, {
            name: key,
            displayName: item.name,
            totalQuantity: 0,
            totalCost: 0,
            listCount: 0,
            purchasedCount: 0,
            properties: [],
          })
        }
        const agg = map.get(key)!
        agg.totalQuantity += item.quantity
        agg.listCount += 1
        if (item.isPurchased) agg.purchasedCount += 1
        if (sl.propertyName && !agg.properties.includes(sl.propertyName)) {
          agg.properties.push(sl.propertyName)
        }
      }
    }

    return Array.from(map.values())
  }, [supplyLists])

  const sortedItems = useMemo(() => {
    const multiplier = sortDir === 'asc' ? 1 : -1
    return [...aggregated].sort((a, b) => {
      switch (sortField) {
        case 'name':
          return multiplier * a.displayName.localeCompare(b.displayName)
        case 'totalQuantity':
          return multiplier * (a.totalQuantity - b.totalQuantity)
        case 'purchasedCount':
          return multiplier * (a.purchasedCount - b.purchasedCount)
        case 'listCount':
          return multiplier * (a.listCount - b.listCount)
        default:
          return 0
      }
    })
  }, [aggregated, sortField, sortDir])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUpIcon className="w-3 h-3 text-gray-300 ml-1" />
    return sortDir === 'asc'
      ? <ChevronUpIcon className="w-3 h-3 text-blue-600 ml-1" />
      : <ChevronDownIcon className="w-3 h-3 text-blue-600 ml-1" />
  }

  if (aggregated.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-900 mb-1">No items found</p>
        <p className="text-sm text-gray-500">Try adjusting your filters.</p>
      </div>
    )
  }

  const columns: { field: SortField; label: string; align: 'left' | 'right' }[] = [
    { field: 'name', label: 'Item Name', align: 'left' },
    { field: 'totalQuantity', label: 'Qty', align: 'right' },
    { field: 'purchasedCount', label: 'Purchased', align: 'right' },
    { field: 'listCount', label: 'Lists', align: 'right' },
  ]

  return (
    <div className="p-5">
      {/* Desktop table */}
      <div className="hidden sm:block">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              {columns.map(col => (
                <th key={col.field} className={`${col.align === 'right' ? 'text-right' : 'text-left'} px-6 py-4`}>
                  <button
                    onClick={() => handleSort(col.field)}
                    className={`inline-flex items-center text-xs font-semibold uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors ${
                      sortField === col.field ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {col.label}
                    <SortIcon field={col.field} />
                  </button>
                </th>
              ))}
              <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Properties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedItems.map(item => (
              <tr key={item.name} className="hover:bg-blue-50/50 transition-colors">
                <td className="py-3 px-6 font-medium text-gray-900">{item.displayName}</td>
                <td className="py-3 px-6 text-right text-gray-700 tabular-nums">{item.totalQuantity}</td>
                <td className="py-3 px-6 text-right tabular-nums">
                  <span className={item.purchasedCount > 0 ? 'text-teal-600' : 'text-gray-400'}>
                    {item.purchasedCount}
                  </span>
                </td>
                <td className="py-3 px-6 text-right text-gray-700 tabular-nums">{item.listCount}</td>
                <td className="py-3 px-6 text-gray-500 truncate max-w-[200px]">
                  {item.properties.join(', ') || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {sortedItems.map(item => (
          <div key={item.name} className="border border-gray-200 rounded-lg p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-900">{item.displayName}</span>
              <span className="text-[10px] text-gray-400 tabular-nums">{item.listCount} list{item.listCount !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-gray-500 tabular-nums">
              <span>Qty: {item.totalQuantity}</span>
              <span className={item.purchasedCount > 0 ? 'text-teal-600' : ''}>
                {item.purchasedCount} purchased
              </span>
            </div>
            {item.properties.length > 0 && (
              <p className="text-[10px] text-gray-400 mt-1 truncate">{item.properties.join(', ')}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
