'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { SiQuickbooks } from 'react-icons/si'
import { useNotificationStore } from '@/store/useNotificationStore'
import {
  getConnection,
  setAutoExport as apiSetAutoExport,
  setDefaultEntityType as apiSetDefaultEntityType,
  setDefaultPaymentAccount as apiSetDefaultPaymentAccount,
  getQbPaymentAccounts,
} from '@/services/quickbooksService'
import type { QbConnection, QbEntityType, QbPaymentAccount } from '@/services/types/quickbooks'
import ConnectQuickBooksModal from './ConnectQuickBooksModal'
import DisconnectQuickBooksModal from './DisconnectQuickBooksModal'
import CategoryMappingTable from './CategoryMappingTable'
import PropertyClassMappingTable from './PropertyClassMappingTable'
import TaxCodeMappingTable from './TaxCodeMappingTable'

interface QuickBooksSectionProps {
  canWrite: boolean
}

/**
 * Settings-page section for the QuickBooks Online integration.
 * Mirrors the visual + interaction pattern of the existing PMS connection
 * cards (Hostaway, Guesty, Hospitable) for consistency.
 *
 * URL params: when Intuit redirects back to /property-manager/settings, the
 * URL contains ?qb=connected or ?qb=error. We surface a toast and refresh.
 */
export default function QuickBooksSection({ canWrite }: QuickBooksSectionProps) {
  const { showNotification } = useNotificationStore()

  const [connection, setConnection] = useState<QbConnection | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)
  const [savingToggle, setSavingToggle] = useState<
    'autoExport' | 'defaultType' | 'paymentAccount' | null
  >(null)
  const [paymentAccounts, setPaymentAccounts] = useState<QbPaymentAccount[]>([])

  const fetchConnection = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getConnection()
      if (res.status === 'success') {
        setConnection(res.data)
      } else {
        setConnection(null)
      }
    } catch (err) {
      console.error('Failed to fetch QB connection:', err)
      setConnection(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConnection()
  }, [fetchConnection])

  // Fetch the user's QBO payment-source accounts whenever the connection
  // becomes active. Used by the "Default payment account" picker below.
  useEffect(() => {
    if (!connection?.connected || connection.status === 'expired') {
      setPaymentAccounts([])
      return
    }
    let cancelled = false
    getQbPaymentAccounts()
      .then((res) => {
        if (cancelled) return
        if (res.status === 'success') setPaymentAccounts(res.data)
      })
      .catch(() => { /* leave list empty; the picker will render the auto-pick fallback hint */ })
    return () => { cancelled = true }
  }, [connection?.connected, connection?.status])

  // Pick up ?qb=connected / ?qb=error from the OAuth round trip.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const qb = params.get('qb')
    const reason = params.get('reason')
    if (!qb) return

    if (qb === 'connected') {
      showNotification('QuickBooks connected', 'success')
    } else if (qb === 'error') {
      showNotification(`QuickBooks connection failed${reason ? ': ' + reason : ''}`, 'error')
    }
    // Clear params so a refresh doesn't re-toast.
    params.delete('qb')
    params.delete('reason')
    params.delete('env')
    const newSearch = params.toString()
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '')
    window.history.replaceState({}, '', newUrl)

    fetchConnection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAutoExportToggle = async (next: boolean) => {
    if (!connection?.connected) return
    setSavingToggle('autoExport')
    try {
      const res = await apiSetAutoExport(next)
      if (res.status === 'success') {
        setConnection((prev) =>
          prev ? { ...prev, autoExport: res.data.autoExport ?? next } : prev
        )
        showNotification(
          next ? 'Auto-export enabled' : 'Auto-export disabled',
          'success'
        )
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

  const handleDefaultEntityTypeChange = async (next: QbEntityType) => {
    setSavingToggle('defaultType')
    try {
      const res = await apiSetDefaultEntityType(next)
      if (res.status === 'success') {
        setConnection((prev) =>
          prev ? { ...prev, defaultQbEntityType: res.data.defaultQbEntityType ?? next } : prev
        )
      } else {
        showNotification(res.message || 'Failed to update default type', 'error')
      }
    } catch (err) {
      console.error(err)
      showNotification('Failed to update default type', 'error')
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

  const isConnected = !!connection?.connected
  const isExpired = connection?.status === 'expired'

  return (
    <div className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md text-white">
            <SiQuickbooks className="w-8 h-8" aria-label="QuickBooks logo" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">QuickBooks</h4>
            <p className="text-sm text-gray-500">
              Send expenses directly to your QuickBooks chart of accounts.
            </p>
            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {loading ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600">
                  <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Loading...
                </span>
              ) : isConnected ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    Connected
                  </span>
                  {connection?.isSandbox && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                      Sandbox
                    </span>
                  )}
                  {isExpired && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200">
                      <ExclamationTriangleIcon className="w-3 h-3" />
                      Reconnect required
                    </span>
                  )}
                </>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
                  <XCircleIcon className="w-3.5 h-3.5" />
                  Not connected
                </span>
              )}
            </div>
          </div>
        </div>

        {canWrite && (
          isConnected ? (
            <motion.button
              onClick={() => setShowDisconnectModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-4 py-2.5 border border-red-200 rounded-xl text-sm font-medium text-red-600 bg-white hover:bg-red-50 transition-colors"
            >
              Disconnect
            </motion.button>
          ) : (
            <motion.button
              onClick={() => setShowConnectModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Connect
            </motion.button>
          )
        )}
      </div>

      {isConnected && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-gray-50 rounded-xl p-4">
            <div>
              <span className="text-gray-500 block mb-1">Company</span>
              <span className="font-medium text-gray-900">{connection?.companyName || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Currency</span>
              <span className="font-medium text-gray-900">{connection?.currency || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Last sync</span>
              <span className="font-medium text-gray-900">
                {connection?.lastSyncAt
                  ? new Date(connection.lastSyncAt).toLocaleString()
                  : 'Never'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block mb-1">Default entity</span>
              <select
                value={connection?.defaultQbEntityType || 'purchase'}
                onChange={(e) => handleDefaultEntityTypeChange(e.target.value as QbEntityType)}
                disabled={!canWrite || savingToggle !== null}
                className="text-sm font-medium text-gray-900 bg-transparent focus:outline-none disabled:opacity-50"
              >
                <option value="purchase">Purchase</option>
                <option value="bill">Bill</option>
              </select>
            </div>
          </div>

          {canWrite && (
            <>
              <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl">
                <div className="text-sm">
                  <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                    <ArrowPathIcon className="w-4 h-4 text-emerald-600" />
                    Auto-export new expenses
                  </div>
                  <div className="text-xs text-gray-500">
                    Every newly created expense gets queued for QuickBooks sync.
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!connection?.autoExport}
                  onClick={() => handleAutoExportToggle(!connection?.autoExport)}
                  disabled={savingToggle === 'autoExport'}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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

              {/*
                Default payment account picker. Required for Purchase entities
                (their top-level AccountRef must be Bank/CreditCard/Cash). If
                left unset, the sync service auto-picks the first Bank account
                and writes it back here as the new default.
              */}
              <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">
                    Default payment account
                  </div>
                  {connection?.defaultPaymentAccountName && (
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                      {connection.defaultPaymentAccountName}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  The Bank, Credit Card, or Cash account QuickBooks attributes
                  Purchase expenses to. Leave it auto-picked or pick explicitly.
                </div>
                <select
                  value={connection?.defaultPaymentAccountId || ''}
                  onChange={(e) => handleDefaultPaymentAccountChange(e.target.value)}
                  disabled={savingToggle === 'paymentAccount' || paymentAccounts.length === 0}
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
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
            </>
          )}

          <div>
            <h5 className="text-sm font-semibold text-gray-900 mb-2">Category mappings</h5>
            <CategoryMappingTable isConnected={isConnected && !isExpired} />
          </div>

          <div>
            <h5 className="text-sm font-semibold text-gray-900 mb-2">Property → QuickBooks Class</h5>
            <p className="text-xs text-gray-500 mb-2">
              Tag QuickBooks expenses by property using QBO Classes. SendToQuickBooks auto-fills the
              Class field from the expense&apos;s property.
            </p>
            <PropertyClassMappingTable isConnected={isConnected && !isExpired} />
          </div>

          <div>
            <h5 className="text-sm font-semibold text-gray-900 mb-2">Tax to QuickBooks Tax Code</h5>
            <p className="text-xs text-gray-500 mb-2">
              Map our GST / PST / HST columns to QuickBooks tax codes so the line tax detail is set
              correctly on synced expenses.
            </p>
            <TaxCodeMappingTable isConnected={isConnected && !isExpired} />
          </div>
        </div>
      )}

      <ConnectQuickBooksModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />
      <DisconnectQuickBooksModal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onDisconnected={() => {
          setConnection(null)
          fetchConnection()
        }}
      />
    </div>
  )
}
