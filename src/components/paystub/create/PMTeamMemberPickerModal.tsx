'use client'

import { notifyError } from '@/utils/notify'
import React, { useEffect, useState } from 'react'
import Modal from '@/components/shared/modal'
import { getTeamMembers } from '@/services/teamMemberService'
import type { TeamMember } from '@/services/types/teamMember'
import { useNotificationStore } from '@/store/useNotificationStore'
import { UserIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface PMTeamMemberPickerModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string                                      // PM user id (effectiveUserId)
  onPicked: (teamMember: TeamMember) => void
}

const PMTeamMemberPickerModal: React.FC<PMTeamMemberPickerModalProps> = ({
  isOpen, onClose, userId, onPicked,
}) => {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const showNotification = useNotificationStore((s) => s.showNotification)

  useEffect(() => {
    if (!isOpen) return
    setSearch('')
    setLoading(true)
    let cancelled = false
    ;(async () => {
      try {
        const res = await getTeamMembers(userId)
        if (cancelled) return
        if (res.status === 'success') {
          setMembers(res.data.filter(m => m.status !== 'inactive'))
        } else {
          showNotification(res.message || 'Failed to load team members.', 'error')
        }
      } catch (err) {
        if (!cancelled) {
          notifyError(err, 'Network error.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [isOpen, userId, showNotification])

  const filtered = members.filter(m => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-md w-11/12">
      <h2 className="text-xl font-semibold text-gray-900 mb-1">New paystub</h2>
      <p className="text-sm text-gray-500 mb-5">For which team member?</p>

      <div className="relative mb-4">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
        />
      </div>

      <div className="max-h-96 overflow-y-auto -mx-2">
        {loading ? (
          <div className="px-2 py-8 text-center text-sm text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="px-2 py-8 text-center text-sm text-gray-500">
            {search.trim() ? 'No matches.' : 'No active team members.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map(m => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => { onPicked(m); onClose() }}
                  className="w-full flex items-center gap-3 px-2 py-3 hover:bg-blue-50 text-left rounded-lg"
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{m.name}</div>
                    <div className="text-xs text-gray-500 truncate">{m.email}</div>
                  </div>
                  {m.invoicePrefix && (
                    <span className="text-xs text-gray-500 font-mono">{m.invoicePrefix}-…</span>
                  )}
                </button>
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
          Cancel
        </button>
      </div>
    </Modal>
  )
}

export default PMTeamMemberPickerModal
