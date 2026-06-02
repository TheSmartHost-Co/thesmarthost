'use client'

import React, { useEffect, useState } from 'react'
import Modal from '@/components/shared/modal'
import { getAvailablePaystubExpenses, addPaystubExpense } from '@/services/paystubService'
import type { AvailablePaystubExpense, PaystubItem } from '@/services/types/paystub'
import { useNotificationStore } from '@/store/useNotificationStore'
import { BanknotesIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { formatMoney } from '@/lib/format'

interface AddExistingExpenseModalProps {
  isOpen: boolean
  onClose: () => void
  paystubId: string
  teamMemberId: string
  onAdded: (item: PaystubItem) => void
}

const AddExistingExpenseModal: React.FC<AddExistingExpenseModalProps> = ({
  isOpen, onClose, paystubId, teamMemberId, onAdded,
}) => {
  const showNotification = useNotificationStore((s) => s.showNotification)

  const [expenses, setExpenses] = useState<AvailablePaystubExpense[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [attaching, setAttaching] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      return
    }
    setLoading(true)
    let cancelled = false
    ;(async () => {
      try {
        const res = await getAvailablePaystubExpenses(teamMemberId)
        if (cancelled) return
        if (res.status === 'success') setExpenses(res.data)
        else showNotification(res.message || 'Failed to load expenses.', 'error')
      } catch (err) {
        if (!cancelled) showNotification(err instanceof Error ? err.message : 'Network error.', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [isOpen, teamMemberId, showNotification])

  const handleAttach = async (expenseId: string) => {
    setAttaching(expenseId)
    try {
      const res = await addPaystubExpense(paystubId, expenseId)
      if (res.status === 'success') {
        showNotification('Expense added to paystub.', 'success')
        onAdded(res.data)
        setExpenses(list => list.filter(e => e.id !== expenseId))
      } else {
        showNotification(res.message || 'Failed to attach expense.', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Error attaching expense.', 'error')
    } finally {
      setAttaching(null)
    }
  }

  const filtered = expenses.filter(e => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      e.vendorName.toLowerCase().includes(q) ||
      (e.description?.toLowerCase().includes(q) ?? false) ||
      (e.propertyName?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-xl w-11/12" zIndex={80}>
      <div className="flex items-center gap-2 mb-4 pr-8">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
          <BanknotesIcon className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Add existing expense</h2>
          <p className="text-[11px] text-gray-500">Pick from expenses you&rsquo;ve already filed.</p>
        </div>
      </div>

      <div className="relative mb-3">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendor, description, property…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="max-h-96 overflow-y-auto -mx-2">
        {loading ? (
          <div className="px-2 py-8 text-center text-sm text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-2 py-8 text-center text-sm text-gray-500">
            {search.trim() ? 'No matches.' : 'No available expenses to add.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map(e => (
              <li key={e.id} className="px-2 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{e.vendorName}</div>
                  {e.description && (
                    <div className="text-xs text-gray-600 truncate">{e.description}</div>
                  )}
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {e.expenseDate}
                    {e.propertyName && <> · {e.propertyName}</>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-gray-900 tabular-nums">{formatMoney(e.amount, 'CAD')}</div>
                  <button
                    type="button"
                    onClick={() => handleAttach(e.id)}
                    disabled={attaching === e.id}
                    className="mt-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    {attaching === e.id ? 'Adding…' : 'Add to paystub'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex justify-end pt-4 mt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Done
        </button>
      </div>
    </Modal>
  )
}

export default AddExistingExpenseModal
