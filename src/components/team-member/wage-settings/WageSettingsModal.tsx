'use client'

import React, { useEffect, useState } from 'react'
import Modal from '@/components/shared/modal'
import { updateTeamMember, getTeamMember } from '@/services/teamMemberService'
import { getPayScheduleSettings } from '@/services/payPeriodService'
import type { TeamMember } from '@/services/types/teamMember'
import type { Cadence, PayScheduleSettings } from '@/services/types/payPeriod'
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
 * Per-member wage + schedule settings. Wage fields (hourly rate, cap,
 * currency) save via PUT /team-members/:id. Schedule override fields
 * (cadence/anchor/offset) are optional — null on any field means "inherit
 * from the PM defaults"; the PM defaults are shown as placeholders.
 */
const CADENCE_LABEL: Record<Cadence, string> = {
  weekly: 'Weekly',
  biweekly: 'Biweekly',
  monthly: 'Monthly',
}

const WageSettingsModal: React.FC<WageSettingsModalProps> = ({
  isOpen, onClose, member, onSaved,
}) => {
  const showNotification = useNotificationStore(s => s.showNotification)

  // Wage state (unchanged from before)
  const [hourlyRate, setHourlyRate] = useState('')
  const [weeklyMaxHours, setWeeklyMaxHours] = useState('')
  const [currency, setCurrency] = useState('CAD')

  // Schedule override state. Each is `null` when the user wants to inherit;
  // any non-null value will be sent as an explicit override.
  const [payCadence, setPayCadence] = useState<Cadence | null>(null)
  const [payAnchorDate, setPayAnchorDate] = useState<string | null>(null)
  const [payDateOffsetDays, setPayDateOffsetDays] = useState<number | null>(null)

  // Inherited defaults from the PM-wide schedule (display only).
  const [pmDefaults, setPmDefaults] = useState<PayScheduleSettings | null>(null)

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
        const [memberRes, settingsRes] = await Promise.all([
          getTeamMember(member.teamMemberId),
          getPayScheduleSettings(),
        ])
        if (cancelled) return
        if (memberRes.status === 'success') {
          setFullMember(memberRes.data)
          setPayCadence(memberRes.data.payCadence ?? null)
          setPayAnchorDate(memberRes.data.payAnchorDate ?? null)
          setPayDateOffsetDays(memberRes.data.payDateOffsetDays ?? null)
        } else {
          showNotification(memberRes.message || 'Could not load team member.', 'error')
        }
        if (settingsRes.status === 'success') {
          setPmDefaults(settingsRes.data)
        }
      } catch (err) {
        if (!cancelled) {
          showNotification(err instanceof Error ? err.message : 'Could not load team member.', 'error')
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

  // Display strings for "Inherit (X)" hints
  const inheritCadenceLabel = pmDefaults ? CADENCE_LABEL[pmDefaults.cadence] : '—'
  const inheritAnchorLabel  = pmDefaults?.anchorDate ?? '—'
  const inheritOffsetLabel  = pmDefaults != null ? `${pmDefaults.payDateOffsetDays} days` : '—'

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
        payCadence,
        payAnchorDate,
        payDateOffsetDays,
      })
      if (res.status === 'success') {
        onSaved(res.data)
        showNotification('Wage & schedule settings saved.', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Save failed.', 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : 'Save failed.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 w-11/12 max-w-md">
      <h2 className="text-xl font-semibold text-gray-900">Wage &amp; schedule settings</h2>
      <p className="text-sm text-gray-500 mt-0.5 mb-5">
        For <span className="font-medium text-gray-700">{member.teamMemberName}</span>.
        Pay schedule fields override the team default; leave blank to inherit.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* --- Wage --- */}
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

        {/* --- Pay schedule override --- */}
        <div className="pt-4 border-t border-gray-200">
          <div className="text-sm font-semibold text-gray-700 mb-1">Pay schedule override</div>
          <p className="text-xs text-gray-500 mb-3">
            Each field defaults to inheriting the team setting (shown in italics). Set a value to override.
          </p>

          {/* Cadence */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Cadence</label>
              {payCadence != null && (
                <button
                  type="button"
                  onClick={() => setPayCadence(null)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear (inherit)
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Cadence override">
              {(['weekly', 'biweekly', 'monthly'] as const).map(c => {
                const selected = payCadence === c
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setPayCadence(c)}
                    className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                      selected
                        ? 'bg-blue-100 text-blue-800 border-2 border-blue-500'
                        : 'bg-gray-50 text-gray-700 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    {CADENCE_LABEL[c]}
                  </button>
                )
              })}
            </div>
            {payCadence == null && (
              <p className="text-xs text-gray-400 italic mt-1">Inherits: {inheritCadenceLabel}</p>
            )}
          </div>

          {/* Anchor date */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="ws-anchor" className="text-sm font-medium text-gray-700">Anchor date</label>
              {payAnchorDate != null && (
                <button
                  type="button"
                  onClick={() => setPayAnchorDate(null)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear (inherit)
                </button>
              )}
            </div>
            <input
              id="ws-anchor"
              type="date"
              value={payAnchorDate ?? ''}
              onChange={(e) => setPayAnchorDate(e.target.value || null)}
              className="w-full text-gray-900 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
            />
            {payAnchorDate == null && (
              <p className="text-xs text-gray-400 italic mt-1">Inherits: {inheritAnchorLabel}</p>
            )}
          </div>

          {/* Pay-date offset */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="ws-offset" className="text-sm font-medium text-gray-700">Pay-date offset (days)</label>
              {payDateOffsetDays != null && (
                <button
                  type="button"
                  onClick={() => setPayDateOffsetDays(null)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear (inherit)
                </button>
              )}
            </div>
            <input
              id="ws-offset"
              type="number"
              min={0}
              max={30}
              step={1}
              value={payDateOffsetDays ?? ''}
              onChange={(e) => {
                const v = e.target.value
                if (v === '') { setPayDateOffsetDays(null); return }
                const n = Number(v)
                if (Number.isFinite(n)) setPayDateOffsetDays(Math.max(0, Math.min(30, n)))
              }}
              className="w-32 text-gray-900 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white"
            />
            {payDateOffsetDays == null && (
              <p className="text-xs text-gray-400 italic mt-1">Inherits: {inheritOffsetLabel}</p>
            )}
          </div>
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
