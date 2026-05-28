'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Modal from '@/components/shared/modal'
import SignedFilePreview from '@/components/client-portal/shared/SignedFilePreview'
import { getClientPortalExpenseById } from '@/services/clientPortalService'
import { parseLocalDate } from '@/utils/dateUtils'
import type {
  ClientPortalExpenseDetail,
  ClientPortalExpensePaymentStatus,
  ClientPortalReceiptStatus,
} from '@/services/types/clientPortal'
import {
  CalendarDaysIcon,
  CurrencyDollarIcon,
  BuildingOffice2Icon,
  CreditCardIcon,
  TagIcon,
  LinkIcon,
  ArrowPathRoundedSquareIcon,
  CheckBadgeIcon,
  ArrowTopRightOnSquareIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline'

interface PreviewClientExpenseModalProps {
  expenseId: string
  isOpen: boolean
  onClose: () => void
  onOpenReceipt?: (receiptId: string) => void
  zIndex?: number
}

const PAYMENT_STATUS_COLORS: Record<ClientPortalExpensePaymentStatus, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  reimbursed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-700',
}

const RECEIPT_STATUS_COLORS: Record<ClientPortalReceiptStatus, string> = {
  applied: 'bg-green-100 text-green-700',
  matched: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  archived: 'bg-gray-100 text-gray-700',
}

const formatCurrency = (value: number | null | undefined, currency = 'CAD') => {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(value)
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

export default function PreviewClientExpenseModal({
  expenseId,
  isOpen,
  onClose,
  onOpenReceipt,
  zIndex,
}: PreviewClientExpenseModalProps) {
  const { t } = useTranslation('clientPortal')
  const [expense, setExpense] = useState<ClientPortalExpenseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getClientPortalExpenseById(expenseId, { includeArchived: true })
      if (res.status === 'success') {
        setExpense(res.data)
      } else {
        setError(res.message || t('failedToLoadExpense'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToLoadExpense'))
    } finally {
      setLoading(false)
    }
  }, [expenseId, t])

  useEffect(() => {
    if (!isOpen) return
    load()
  }, [isOpen, load])

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="w-full max-w-3xl p-6" zIndex={zIndex}>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">{t('loadingExpense')}</p>
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
      ) : expense ? (
        <>
          <div className="mb-5">
            <div className="flex items-start justify-between gap-3 pr-10">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {expense.vendorName || t('unknownVendor')}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">{formatDate(expense.expenseDate)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {expense.isRecurring && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-700 px-2.5 py-1 text-xs font-medium">
                    <ArrowPathRoundedSquareIcon className="w-3 h-3" />
                    {t('recurring')}
                  </span>
                )}
                {expense.isTaxDeductible && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 text-xs font-medium">
                    <CheckBadgeIcon className="w-3 h-3" />
                    {t('taxDeductible')}
                  </span>
                )}
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    PAYMENT_STATUS_COLORS[expense.paymentStatus] || 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {titleCase(expense.paymentStatus)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50">
              <BuildingOffice2Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-gray-500">{t('propertyColumn')}</div>
                <div className="text-sm text-gray-900 truncate">
                  {expense.propertyName || '—'}
                </div>
                {expense.propertyAddress && (
                  <div className="text-xs text-gray-500 truncate">{expense.propertyAddress}</div>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50">
              <CurrencyDollarIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-gray-500">{t('amount')}</div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatCurrency(expense.amount, expense.currency)}
                </div>
              </div>
            </div>
            {expense.category && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50">
                <TagIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">{t('category')}</div>
                  <div className="text-sm text-gray-900">
                    {titleCase(expense.category.replace(/_/g, ' '))}
                  </div>
                </div>
              </div>
            )}
            {expense.paymentMethod && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50">
                <CreditCardIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">{t('paymentMethod')}</div>
                  <div className="text-sm text-gray-900">{expense.paymentMethod}</div>
                </div>
              </div>
            )}
            {expense.description && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50 md:col-span-2">
                <TagIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">{t('description')}</div>
                  <div className="text-sm text-gray-900">{expense.description}</div>
                </div>
              </div>
            )}
            {expense.isRecurring && expense.recurringFrequency && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50">
                <ArrowPathRoundedSquareIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">{t('recurringFrequency')}</div>
                  <div className="text-sm text-gray-900">
                    {titleCase(expense.recurringFrequency)}
                    {expense.recurringEndDate && (
                      <span className="text-gray-500">
                        {' '}
                        · {t('until')} {formatDate(expense.recurringEndDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            {expense.bookingId && (expense.bookingGuestName || expense.bookingReservationCode) && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-gray-50 md:col-span-2">
                <CalendarDaysIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500">{t('linkedBooking')}</div>
                  <div className="text-sm text-gray-900">
                    {expense.bookingGuestName || '—'}
                    {expense.bookingReservationCode && (
                      <span className="ml-2 text-xs text-gray-400 font-mono">
                        {expense.bookingReservationCode}
                      </span>
                    )}
                    {expense.bookingCheckInDate && (
                      <span className="ml-2 text-xs text-gray-500">
                        · {formatDate(expense.bookingCheckInDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {(expense.subtotal != null ||
            expense.taxTotal != null ||
            expense.taxGst != null ||
            expense.taxPst != null ||
            expense.taxHst != null ||
            expense.taxQst != null) && (
            <div className="mb-5">
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t('taxBreakdown')}</h3>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {expense.subtotal != null && (
                      <tr>
                        <td className="px-4 py-2 text-gray-600">{t('subtotal')}</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {formatCurrency(expense.subtotal, expense.currency)}
                        </td>
                      </tr>
                    )}
                    {expense.taxGst != null && (
                      <tr>
                        <td className="px-4 py-2 text-gray-600">GST</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {formatCurrency(expense.taxGst, expense.currency)}
                        </td>
                      </tr>
                    )}
                    {expense.taxPst != null && (
                      <tr>
                        <td className="px-4 py-2 text-gray-600">PST</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {formatCurrency(expense.taxPst, expense.currency)}
                        </td>
                      </tr>
                    )}
                    {expense.taxHst != null && (
                      <tr>
                        <td className="px-4 py-2 text-gray-600">HST</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {formatCurrency(expense.taxHst, expense.currency)}
                        </td>
                      </tr>
                    )}
                    {expense.taxQst != null && (
                      <tr>
                        <td className="px-4 py-2 text-gray-600">QST</td>
                        <td className="px-4 py-2 text-right text-gray-900">
                          {formatCurrency(expense.taxQst, expense.currency)}
                        </td>
                      </tr>
                    )}
                    {expense.taxTotal != null && (
                      <tr className="bg-gray-50">
                        <td className="px-4 py-2 text-gray-700 font-medium">{t('taxTotal')}</td>
                        <td className="px-4 py-2 text-right text-gray-900 font-medium">
                          {formatCurrency(expense.taxTotal, expense.currency)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-emerald-50">
                      <td className="px-4 py-2 text-emerald-900 font-semibold">{t('amount')}</td>
                      <td className="px-4 py-2 text-right text-emerald-900 font-semibold">
                        {formatCurrency(expense.amount, expense.currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {expense.lineItems.length > 0 && (
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
                    {expense.lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 text-gray-900">{item.description}</td>
                        <td className="px-4 py-2 text-right text-gray-600">
                          {item.quantity ?? '—'}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-600">
                          {formatCurrency(item.unitCost, expense.currency)}
                        </td>
                        <td className="px-4 py-2 text-right text-gray-900 font-medium">
                          {formatCurrency(item.totalCost, expense.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {expense.receipt && (
            <>
              <div className="mb-5">
                <h3 className="text-sm font-medium text-gray-700 mb-2">{t('linkedReceipt')}</h3>
                <button
                  onClick={() => onOpenReceipt?.(expense.receipt!.id)}
                  disabled={!onOpenReceipt}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border border-blue-100 bg-blue-50 text-left hover:bg-blue-100 transition-colors disabled:cursor-default disabled:hover:bg-blue-50"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <LinkIcon className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-blue-900 truncate">
                        {expense.receipt.vendorName || expense.receipt.originalName}
                      </div>
                      <div className="text-xs text-blue-700 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            RECEIPT_STATUS_COLORS[expense.receipt.status] ||
                            'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {titleCase(expense.receipt.status)}
                        </span>
                        {expense.receipt.expenseDate && (
                          <span>{formatDate(expense.receipt.expenseDate)}</span>
                        )}
                        {expense.receipt.total != null && (
                          <span>{formatCurrency(expense.receipt.total, expense.currency)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {onOpenReceipt && (
                    <ArrowTopRightOnSquareIcon className="w-4 h-4 text-blue-500 shrink-0" />
                  )}
                </button>
              </div>

              <div className="mb-5">
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <PaperClipIcon className="w-4 h-4 text-gray-400" />
                  {t('receiptFile')}
                </h3>
                <SignedFilePreview
                  signedUrl={expense.receipt.signedUrl}
                  mimeType={expense.receipt.mimeType}
                  fileName={expense.receipt.originalName}
                  onRefresh={load}
                />
              </div>
            </>
          )}

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
