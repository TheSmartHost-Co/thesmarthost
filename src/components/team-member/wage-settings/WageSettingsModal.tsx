'use client'

import { notifyError } from '@/utils/notify'
import React, { useEffect, useState } from 'react'
import Modal from '@/components/shared/modal'
import { updateTeamMember, getTeamMember } from '@/services/teamMemberService'
import type { TeamMember } from '@/services/types/teamMember'
import { useNotificationStore } from '@/store/useNotificationStore'

interface WageSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  /** What we know about the member from the team summary row. */
  member: {
    teamMemberId: string
    teamMemberName: string
    hourlyRate: number | null
    weeklyMaxHours: number | null
    currency: string
  } | null
  /** Called with the updated TeamMember from the backend. */
  onSaved: (updated: TeamMember) => void
}

/**
 * Per-member wage settings. Saves via PUT /team-members/:id.
 */
const WageSettingsModal: React.FC<WageSettingsModalProps> = ({
  isOpen, onClose, member, onSaved,
}) => {
  const showNotification = useNotificationStore(s => s.showNotification)

  const [hourlyRate, setHourlyRate] = useState('')
  const [weeklyMaxHours, setWeeklyMaxHours] = useState('')
  const [currency, setCurrency] = useState('CAD')

  const [loading, setLoading] = useState(false)
  const [fullMember, setFullMember] = useState<TeamMember | null>(null)
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (!isOpen || !member) return
    setHourlyRate(member.hourlyRate != null ? String(member.hourlyRate) : '')
    setWeeklyMaxHours(member.weeklyMaxHours != null ? String(member.weeklyMaxHours) : '')
    setCurrency(member.currency || 'CAD')
    setLoading(false)
    setFullMember(null)
    setFetching(true)
    let cancelled = false
    ;(async () => {
      try {
        const memberRes = await getTeamMember(member.teamMemberId)
        if (cancelled) return
        if (memberRes.status === 'success') {
          setFullMember(memberRes.data)
        } else {
          showNotification(memberRes.message || 'Could not load team member.', 'error')
        }
      } catch (err) {
        if (!cancelled) {
          notifyError(err, 'Could not load team member.')
        }
      } finally {
        if (!cancelled) setFetching(false)
      }
    })()
    return () => { cancelled = true }
  }, [isOpen, member, showNotification])

  if (!member) return null

  const parseNum = (v: string): number | null => {
    const t = v.trim()
    if (!t) return null
    const n = Number(t)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullMember) {
      showNotification('Still loading team member — try again in a moment.', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await updateTeamMember(member.teamMemberId, {
        name:              fullMember.name,
        phone:             fullMember.phone ?? null,
        status:            fullMember.status === 'inactive' ? 'inactive' : 'active',
        permissions:       fullMember.permissions,
        hourlyRate:        parseNum(hourlyRate),
        weeklyMaxHours:    parseNum(weeklyMaxHours),
        currency:          currency.trim() || 'CAD',
      })
      if (res.status === 'success') {
        onSaved(res.data)
        showNotification('Wage settings saved.', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Save failed.', 'error')
      }
    } catch (err) {
      notifyError(err, 'Save failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 w-11/12 max-w-md">
      <h2 className="text-xl font-semibold text-gray-900">Wage settings</h2>
      <p className="text-sm text-gray-500 mt-0.5 mb-5">
        For <span className="font-medium text-gray-700">{member.teamMemberName}</span>.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hourly rate</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            className="w-full text-gray-900 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
            placeholder="e.g. 25.00"
          />
          <p className="text-xs text-gray-500 mt-1">
            Future entries snapshot this rate; existing entries keep their original snapshot.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Weekly max hours</label>
          <input
            type="number"
            step="0.5"
            min="0"
            value={weeklyMaxHours}
            onChange={(e) => setWeeklyMaxHours(e.target.value)}
            className="w-full text-gray-900 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
            placeholder="e.g. 20"
          />
          <p className="text-xs text-gray-500 mt-1">
            Shifts that push past this cap need your approval. Leave blank for no cap.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full text-gray-900 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
          >
            <option value="CAD">CAD — Canadian Dollar</option>
            <option value="USD">USD — US Dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British Pound</option>
            <option value="PHP">PHP — Philippine Peso</option>
            <option value="AUD">AUD — Australian Dollar</option>
            <option value="MXN">MXN — Mexican Peso</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || fetching || !fullMember}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving…' : fetching ? 'Loading…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default WageSettingsModal
