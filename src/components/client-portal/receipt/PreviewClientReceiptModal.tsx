'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import SignedFilePreview from '@/components/client-portal/shared/SignedFilePreview'
import { getClientPortalReceiptById } from '@/services/clientPortalService'
import { parseLocalDate } from '@/utils/dateUtils'
import type {
  ClientPortalReceiptDetail,
  ClientPortalReceiptStatus,
} from '@/services/types/clientPortal'
import {
  CalendarDaysIcon,
  BuildingOffice2Icon,
  CreditCardIcon,
  TagIcon,
  LinkIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'

interface PreviewClientReceiptModalProps {
  receiptId: string
  isOpen: boolean
  onClose: () => void
  onOpenExpense?: (expenseId: string) => void
  zIndex?: number
}

const RECEIPT_STATUS_COLORS: Record<ClientPortalReceiptStatus, string> = {
  applied: 'bg-green-100 text-green-700',
  matched: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  archived: 'bg-gray-100 text-gray-700',
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  reimbursed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-700',
}

const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(value)
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '—'
  return parseLocalDate(dateString).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export default function PreviewClientReceiptModal({
  receiptId,
  isOpen,
  onClose,
  onOpenExpense,
  zIndex,
}: PreviewClientReceiptModalProps) {
  const { t } = useTranslation('clientPortal')
  const [receipt, setReceipt] = useState<ClientPortalReceiptDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getClientPortalReceiptById(receiptId, { includeArchived: true })
      if (res.status === 'success') {
        setReceipt(res.data)
      } else {
        setError(res.message || t('failedToLoadReceipt'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToLoadReceipt'))
    } finally {
      setLoading(false)
    }
  }, [receiptId, t])

  useEffect(() => {
    if (!isOpen) return
    load()
  }, [isOpen, load])

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-3xl p-6" zIndex={zIndex}>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">{t('loadingReceipt')}</p>
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={load}
            className="px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100"
          >
            {t('tryAgain')}
          </button>
        </div>
      ) : receipt ? (
        <>
          <div className="mb-5">
            <div className="flex items-start justify-between gap-3 pr-10">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {receipt.vendorName || t('unknownVendor')}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">{formatDate(receipt.expenseDate)}</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                  RECEIPT_STATUS_COLORS[receipt.status] || 'bg-gray-100 text-gray-700'
                }`}
              >
                {titleCase(receipt.status)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50">
              <BuildingOffice2Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-gray-500">{t('propertyColumn')}</div>
                <div className="text-sm text-gray-900 truncate">{receipt.propertyName || '—'}</div>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50">
              <CalendarDaysIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-gray-500">{t('total')}</div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatCurrency(receipt.total)}
                </div>
              </div>
            </div>
            {receipt.paymentMethod && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50">
                <CreditCardIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">{t('paymentMethod')}</div>
                  <div className="text-sm text-gray-900">{receipt.paymentMethod}</div>
                </div>
              </div>
            )}
            {receipt.description && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50">
                <TagIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">{t('description')}</div>
                  <div className="text-sm text-gray-900">{receipt.description}</div>
                </div>
              </div>
            )}
          </div>

          {(receipt.subtotal != null ||
            receipt.taxTotal != null ||
            receipt.taxGst != null ||
            receipt.taxPst != null ||
            receipt.taxHst != null ||
            receipt.taxQst != null) && (
            <div className="mb-5">
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t('taxBreakdown')}</h3>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {receipt.subtotal != null && (
                      <tr>
                        <td className="px-4 py-2 text-gray-600">{t('subtotal')}</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {formatCurrency(receipt.subtotal)}
                        </td>
                      </tr>
                    )}
                    {receipt.taxGst != null && (
                      <tr>
                        <td className="px-4 py-2 text-gray-600">GST</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {formatCurrency(receipt.taxGst)}
                        </td>
                      </tr>
                    )}
                    {receipt.taxPst != null && (
                      <tr>
                        <td className="px-4 py-2 text-gray-600">PST</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {formatCurrency(receipt.taxPst)}
                        </td>
                      </tr>
                    )}
                    {receipt.taxHst != null && (
                      <tr>
                        <td className="px-4 py-2 text-gray-600">HST</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {formatCurrency(receipt.taxHst)}
                        </td>
                      </tr>
                    )}
                    {receipt.taxQst != null && (
                      <tr>
                        <td className="px-4 py-2 text-gray-600">QST</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {formatCurrency(receipt.taxQst)}
                        </td>
                      </tr>
                    )}
                    {receipt.taxTotal != null && (
                      <tr className="bg-gray-50">
                        <td className="px-4 py-2 text-gray-700 font-medium">{t('taxTotal')}</td>
                        <td className="px-4 py-2 text-right text-gray-900 font-medium">
                          {formatCurrency(receipt.taxTotal)}
                        </td>
                      </tr>
                    )}
                    {receipt.total != null && (
                      <tr className="bg-emerald-50">
                        <td className="px-4 py-2 text-emerald-900 font-semibold">{t('total')}</td>
                        <td className="px-4 py-2 text-right text-emerald-900 font-semibold">
                          {formatCurrency(receipt.total)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {receipt.lineItems.length > 0 && (
            <div className="mb-5">
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t('lineItems')}</h3>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                        {t('itemName')}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">
                        {t('quantity')}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">
                        {t('unitPrice')}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">
                        {t('totalColumn')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {receipt.lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-gray-900">{item.name}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{item.quantity}</td>
                        <td className="px-4 py-2 text-right text-gray-600">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-900 font-medium">
                          {formatCurrency(item.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {receipt.expense && (
            <div className="mb-5">
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t('linkedExpense')}</h3>
              <button
                onClick={() => onOpenExpense?.(receipt.expense!.id)}
                disabled={!onOpenExpense}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-blue-100 bg-blue-50 text-left hover:bg-blue-100 transition-colors disabled:cursor-default disabled:hover:bg-blue-50"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <LinkIcon className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-blue-900">
                      {receipt.expense.category
                        ? titleCase(receipt.expense.category.replace(/_/g, ' '))
                        : t('linkedExpense')}{' '}
                      · {formatCurrency(receipt.expense.amount)}
                    </div>
                    <div className="text-xs text-blue-700 mt-0.5 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          PAYMENT_STATUS_COLORS[receipt.expense.paymentStatus] ||
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {titleCase(receipt.expense.paymentStatus)}
                      </span>
                      <span>{formatDate(receipt.expense.expenseDate)}</span>
                    </div>
                  </div>
                </div>
                {onOpenExpense && (
                  <ArrowTopRightOnSquareIcon className="w-4 h-4 text-blue-500 shrink-0" />
                )}
              </button>
            </div>
          )}

          <div className="mb-5">
            <h3 className="text-sm font-medium text-gray-700 mb-2">{t('receiptFile')}</h3>
            <SignedFilePreview
              signedUrl={receipt.signedUrl}
              mimeType={receipt.mimeType}
              fileName={receipt.originalName}
              onRefresh={load}
            />
          </div>

          <div className="flex justify-end pt-4 mt-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {t('close')}
            </button>
          </div>
        </>
      ) : null}
    </Modal>
  )
}
