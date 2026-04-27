'use client'

import { useEffect, useState } from 'react'
import Modal from '@/components/shared/modal'
import CategoryMappingTable from '@/components/quickbooks/CategoryMappingTable'
import {
  getConnection,
  getQbPaymentAccounts,
  setAutoExport as apiSetAutoExport,
  setDefaultPaymentAccount as apiSetDefaultPaymentAccount,
} from '@/services/quickbooksService'
import { useNotificationStore } from '@/store/useNotificationStore'
import type { QbConnection, QbPaymentAccount } from '@/services/types/quickbooks'

interface QbIntegrationModalProps {
  isOpen: boolean
  onClose: () => void
  /**
   * False when QB is disconnected or token has expired. The modal still opens,
   * but only renders the "connect first" guidance — connection-level settings
   * and the mapping table both depend on an active connection.
   */
  isConnected: boolean
}

/**
 * QuickBooks Online controls accessible from /expenses without leaving the
 * page. Hosts the persistent category↔account mappings (the original surface)
 * plus two connection-level toggles that previously lived only in
 * Settings → Integrations: auto-export and default payment account. Both call
 * the same backend endpoints used by the Settings page, so this is purely a
 * relocation of the management UI.
 */
export default function QbIntegrationModal({
  isOpen,
  onClose,
  isConnected,
}: QbIntegrationModalProps) {
  const { showNotification } = useNotificationStore()

  const [connection, setConnection] = useState<QbConnection | null>(null)
  const [paymentAccounts, setPaymentAccounts] = useState<QbPaymentAccount[]>([])
  const [loadingConnection, setLoadingConnection] = useState(false)
  const [savingToggle, setSavingToggle] = useState<'autoExport' | 'paymentAccount' | null>(null)

  useEffect(() => {
    if (!isOpen || !isConnected) return
    let cancelled = false
    setLoadingConnection(true)
    Promise.all([getConnection(), getQbPaymentAccounts()])
      .then(([connRes, paymentRes]) => {
        if (cancelled) return
        if (connRes.status === 'success') setConnection(connRes.data)
        if (paymentRes.status === 'success') setPaymentAccounts(paymentRes.data)
      })
      .catch((err) => {
        console.error('Failed to load QB integration settings:', err)
      })
      .finally(() => {
        if (!cancelled) setLoadingConnection(false)
      })
    return () => {
      cancelled = true
    }
  }, [isOpen, isConnected])

  const handleAutoExportToggle = async (next: boolean) => {
    if (!connection?.connected) return
    setSavingToggle('autoExport')
    try {
      const res = await apiSetAutoExport(next)
      if (res.status === 'success') {
        setConnection((prev) =>
          prev ? { ...prev, autoExport: res.data.autoExport ?? next } : prev
        )
        showNotification(next ? 'Auto-export enabled' : 'Auto-export disabled', 'success')
      } else {
        showNotification(res.message || 'Failed to update auto-export', 'error')
      }
    } catch (err) {
      console.error(err)
      showNotification('Failed to update auto-export', 'error')
    } finally {
      setSavingToggle(null)
    }
  }

  const handleDefaultPaymentAccountChange = async (qbAccountId: string) => {
    if (!qbAccountId) return
    setSavingToggle('paymentAccount')
    try {
      const res = await apiSetDefaultPaymentAccount(qbAccountId)
      if (res.status === 'success') {
        setConnection((prev) =>
          prev
            ? {
                ...prev,
                defaultPaymentAccountId: res.data.defaultPaymentAccountId ?? qbAccountId,
                defaultPaymentAccountName:
                  res.data.defaultPaymentAccountName ??
                  paymentAccounts.find((a) => a.id === qbAccountId)?.name ??
                  null,
              }
            : prev
        )
        showNotification('Default payment account updated', 'success')
      } else {
        showNotification(res.message || 'Failed to update payment account', 'error')
      }
    } catch (err) {
      console.error(err)
      showNotification('Failed to update payment account', 'error')
    } finally {
      setSavingToggle(null)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-11/12 max-w-4xl">
      <div className="p-6 space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">QuickBooks Integration</h3>
          <p className="text-sm text-gray-600 mt-1">
            Auto-export rules and account mappings used when sending expenses to QuickBooks Online.
          </p>
        </div>

        {!isConnected ? (
          <CategoryMappingTable isConnected={false} />
        ) : (
          <>
            {/* Connection section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Connection
                </h4>
                {connection?.companyName && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Connected · {connection.companyName}
                  </span>
                )}
              </div>

              <div className="flex items-start justify-between gap-4 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">Auto-export new expenses</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    When on, every newly created expense is queued for QuickBooks sync automatically.
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!connection?.autoExport}
                  onClick={() => handleAutoExportToggle(!connection?.autoExport)}
                  disabled={loadingConnection || savingToggle === 'autoExport'}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                    connection?.autoExport ? 'bg-emerald-600' : 'bg-gray-300'
                  } disabled:opacity-50`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      connection?.autoExport ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-start justify-between gap-4 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                <div className="text-sm flex-1">
                  <div className="font-medium text-gray-900">Default payment account</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Used as &ldquo;Paid from&rdquo; on Purchase entries. You can override per send.
                  </div>
                </div>
                <select
                  value={connection?.defaultPaymentAccountId || ''}
                  onChange={(e) => handleDefaultPaymentAccountChange(e.target.value)}
                  disabled={
                    loadingConnection ||
                    savingToggle === 'paymentAccount' ||
                    paymentAccounts.length === 0
                  }
                  className="min-w-[220px] border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                >
                  <option value="" disabled>
                    {paymentAccounts.length === 0
                      ? 'Loading payment accounts…'
                      : 'Select an account…'}
                  </option>
                  {paymentAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} — {acc.accountType}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mapping section */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Category mappings
              </h4>
              <CategoryMappingTable isConnected={isConnected} />
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
