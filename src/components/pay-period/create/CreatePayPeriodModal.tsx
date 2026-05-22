'use client'

import { useEffect, useState } from 'react'
import { PlusCircleIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import { useNotificationStore } from '@/store/useNotificationStore'
import { usePermissions } from '@/hooks/usePermissions'
import { createPayPeriod } from '@/services/payPeriodService'
import { getTeamMembers } from '@/services/teamMemberService'
import type { PayPeriod } from '@/services/types/payPeriod'
import type { TeamMember } from '@/services/types/teamMember'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated: (period: PayPeriod) => void
  /** Pre-select a team member (used when opening from a member-scoped context). */
  defaultTeamMemberId?: string
}

export default function CreatePayPeriodModal({ isOpen, onClose, onCreated, defaultTeamMemberId }: Props) {
  const showNotification = useNotificationStore(s => s.showNotification)
  const { effectiveUserId } = usePermissions()

  const [members, setMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [teamMemberId, setTeamMemberId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [payDate, setPayDate] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setTeamMemberId(defaultTeamMemberId ?? '')
    setStartDate('')
    setEndDate('')
    setPayDate('')
    setNotes('')
    setSubmitting(false)
  }, [isOpen, defaultTeamMemberId])

  // Load active team members for the picker on open.
  useEffect(() => {
    if (!isOpen || !effectiveUserId) return
    let cancelled = false
    setLoadingMembers(true)
    ;(async () => {
      try {
        const res = await getTeamMembers(effectiveUserId)
        if (cancelled) return
        if (res.status === 'success') {
          setMembers(res.data.filter(m => m.status !== 'inactive'))
        }
      } catch {
        // Non-fatal — picker just stays empty
      } finally {
        if (!cancelled) setLoadingMembers(false)
      }
    })()
    return () => { cancelled = true }
  }, [isOpen, effectiveUserId])

  const datesValid = startDate && endDate && endDate >= startDate
  const canSubmit = !!teamMemberId && datesValid && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      const res = await createPayPeriod({
        teamMemberId,
        startDate,
        endDate,
        payDate: payDate || undefined,
        notes: notes.trim() || undefined,
      })
      if (res.status === 'success') {
        showNotification(
          `Period #${String(res.data.periodNumber).padStart(2, '0')} created for ${res.data.teamMemberName ?? 'member'}.`,
          'success',
        )
        onCreated(res.data)
        onClose()
      } else {
        showNotification(res.message || 'Failed to create period.', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Network error', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-md w-11/12">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <PlusCircleIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Create pay period</h2>
          <p className="text-sm text-gray-500">Manual periods are useful for backfills or one-off runs.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="cp-member">Team member</label>
          <select
            id="cp-member"
            value={teamMemberId}
            onChange={(e) => setTeamMemberId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loadingMembers}
          >
            <option value="">{loadingMembers ? 'Loading…' : 'Select a team member'}</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="cp-start">Start date</label>
            <input
              id="cp-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="cp-end">End date</label>
            <input
              id="cp-end"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="cp-pay">
            Pay date <span className="text-xs font-normal text-gray-500">(optional)</span>
          </label>
          <input
            id="cp-pay"
            type="date"
            value={payDate}
            min={endDate || undefined}
            onChange={(e) => setPayDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Leave blank to use the member&apos;s effective offset.</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="cp-notes">
            Notes <span className="text-xs font-normal text-gray-500">(optional)</span>
          </label>
          <textarea
            id="cp-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="E.g. Backfilled period before scheduled rollout"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          {submitting ? 'Creating…' : 'Create period'}
        </button>
      </div>
    </Modal>
  )
}
