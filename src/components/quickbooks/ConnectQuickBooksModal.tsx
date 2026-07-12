'use client'

import { notifyError } from '@/utils/notify'
import { useState } from 'react'
import Modal from '@/components/shared/modal'
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { getConnectAuthUrl } from '@/services/quickbooksService'
import { useNotificationStore } from '@/store/useNotificationStore'

interface ConnectQuickBooksModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Small modal that lets the user pick sandbox vs production, then redirects
 * them to Intuit's hosted OAuth screen. The actual connection record is
 * created server-side when Intuit redirects back to /api/quickbooks/oauth/callback.
 */
export default function ConnectQuickBooksModal({
  isOpen,
  onClose,
}: ConnectQuickBooksModalProps) {
  const [env, setEnv] = useState<'sandbox' | 'production'>('sandbox')
  const [submitting, setSubmitting] = useState(false)
  const { showNotification } = useNotificationStore()

  const handleConnect = async () => {
    setSubmitting(true)
    try {
      const res = await getConnectAuthUrl(env)
      if (res.status === 'success' && res.data?.authUrl) {
        window.location.href = res.data.authUrl
        return
      }
      showNotification(res.message || 'Failed to start QuickBooks OAuth', 'error')
      setSubmitting(false)
    } catch (err) {
      console.error('QB connect error:', err)
      notifyError(err, 'Failed to start QuickBooks OAuth')
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-11/12 max-w-md">
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Connect QuickBooks</h3>
        <p className="text-sm text-gray-600">
          Choose which QuickBooks environment to connect. Sandbox is recommended
          for testing — no live accounting data is touched.
        </p>

        <div className="space-y-2">
          {(['sandbox', 'production'] as const).map((option) => (
            <label
              key={option}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                env === option
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="qb-env"
                value={option}
                checked={env === option}
                onChange={() => setEnv(option)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-semibold text-gray-900 capitalize">
                  {option}{' '}
                  {option === 'sandbox' && (
                    <span className="ml-1 text-xs font-normal text-gray-500">
                      (recommended for first-time setup)
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {option === 'sandbox'
                    ? "Connects to your QuickBooks sandbox company. Safe to experiment with."
                    : "Connects to your live QuickBooks Online company — real accounting data."}
                </div>
              </div>
            </label>
          ))}
        </div>

        {env === 'production' && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>
              Production sync writes to real books. Make sure your category
              mappings are correct before sending any expenses.
            </span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConnect}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
          >
            <CheckCircleIcon className="w-4 h-4" />
            {submitting ? 'Redirecting…' : `Connect ${env === 'sandbox' ? 'Sandbox' : 'Production'}`}
          </button>
        </div>
      </div>
    </Modal>
  )
}
