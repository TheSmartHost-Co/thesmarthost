'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowUturnLeftIcon,
  ClockIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import { makeTaskOffer, acceptTaskOffer, declineTask } from '@/services/maintenanceTaskService'
import type { MaintenanceTask, OfferHistoryEntry, PricingType } from '@/services/types/maintenanceTask'

export interface PriceNegotiationPanelProps {
  task: MaintenanceTask
  onTaskUpdated: (task: MaintenanceTask) => void
}

function formatAmount(amount: number | null | undefined, pricingType: PricingType | null | undefined, hourlySuffix: string): string {
  if (amount == null) return '—'
  const base = `$${Number(amount).toFixed(2)}`
  return pricingType === 'hourly' ? `${base}${hourlySuffix}` : base
}

function formatEntryTime(at: string): string {
  const d = new Date(at)
  if (isNaN(d.getTime())) return at
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function PriceNegotiationPanel({ task, onTaskUpdated }: PriceNegotiationPanelProps) {
  const { t } = useTranslation('turnover')
  const showNotification = useNotificationStore((state) => state.showNotification)

  const [showOfferForm, setShowOfferForm] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerPricingType, setOfferPricingType] = useState<PricingType>('flat')
  const [offerNote, setOfferNote] = useState('')
  const [showDeclineForm, setShowDeclineForm] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const isTerminal = task.status === 'completed' || task.status === 'cancelled'

  const actorLabel = (actor: OfferHistoryEntry['actor']) =>
    actor === 'pm' ? t('actorPm') : task.contractorName || t('actorContractor')

  const actionLabel = (action: OfferHistoryEntry['action']) => {
    switch (action) {
      case 'offer': return t('negotiationActionOffer')
      case 'propose': return t('negotiationActionPropose')
      case 'counter': return t('negotiationActionCounter')
      case 'accept': return t('negotiationActionAccept')
      case 'decline': return t('negotiationActionDecline')
    }
  }

  const resetForms = () => {
    setShowOfferForm(false)
    setOfferAmount('')
    setOfferPricingType('flat')
    setOfferNote('')
    setShowDeclineForm(false)
    setDeclineReason('')
  }

  const handleAccept = async () => {
    if (actionLoading) return
    setActionLoading(true)
    try {
      const res = await acceptTaskOffer(task.id)
      if (res.status === 'success') {
        showNotification(t('offerAccepted'), 'success')
        resetForms()
        onTaskUpdated({ ...task, ...res.data })
      } else {
        showNotification(res.message || t('failedToAcceptOffer'), 'error')
      }
    } catch (err) {
      console.error('Error accepting offer:', err)
      showNotification(err instanceof Error ? err.message : t('failedToAcceptOffer'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSendOffer = async () => {
    if (actionLoading) return
    const amount = parseFloat(offerAmount)
    if (!offerAmount || isNaN(amount) || amount <= 0) {
      showNotification(t('pleaseEnterValidAmount'), 'error')
      return
    }
    setActionLoading(true)
    try {
      const res = await makeTaskOffer(task.id, {
        pricingType: offerPricingType,
        amount,
        ...(offerNote.trim() ? { note: offerNote.trim() } : {}),
      })
      if (res.status === 'success') {
        showNotification(t('offerSent'), 'success')
        resetForms()
        onTaskUpdated({ ...task, ...res.data })
      } else {
        showNotification(res.message || t('failedToSendOffer'), 'error')
      }
    } catch (err) {
      console.error('Error sending offer:', err)
      showNotification(err instanceof Error ? err.message : t('failedToSendOffer'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDecline = async () => {
    if (actionLoading) return
    setActionLoading(true)
    try {
      const res = await declineTask(task.id, declineReason.trim() || undefined)
      if (res.status === 'success') {
        showNotification(t('taskDeclined'), 'success')
        resetForms()
        onTaskUpdated({ ...task, ...res.data })
      } else {
        showNotification(res.message || t('failedToDeclineTask'), 'error')
      }
    } catch (err) {
      console.error('Error declining task:', err)
      showNotification(err instanceof Error ? err.message : t('failedToDeclineTask'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  // ── Current price state line ─────────────────────────────────
  const renderStateLine = () => {
    if (task.priceStatus === 'agreed') {
      return (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
          <span className="text-sm font-medium text-green-800">
            {t('priceAgreedSummary', { amount: formatAmount(task.agreedAmount, task.pricingType, t('perHourSuffix')) })}
          </span>
        </div>
      )
    }
    if (task.priceStatus === 'offered') {
      return (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
          <CurrencyDollarIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-800">
            {t('priceOfferedBy', {
              amount: formatAmount(task.offeredAmount, task.pricingType, t('perHourSuffix')),
              actor: task.pricingLastActor === 'pm' ? t('actorPm') : task.contractorName || t('actorContractor'),
            })}
          </span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
        <ClockIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <span className="text-sm text-gray-600">{t('awaitingProposal')}</span>
      </div>
    )
  }

  // ── Offer mini-form (used for both propose and counter) ──────
  const renderOfferForm = () => (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setOfferPricingType('flat')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                offerPricingType === 'flat' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t('pricingFlat')}
            </button>
            <button
              type="button"
              onClick={() => setOfferPricingType('hourly')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                offerPricingType === 'hourly' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t('pricingHourly')}
            </button>
          </div>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full pl-7 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
        <textarea
          value={offerNote}
          onChange={(e) => setOfferNote(e.target.value)}
          placeholder={t('offerNotePlaceholder')}
          rows={2}
          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={resetForms}
            disabled={actionLoading}
            className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleSendOffer}
            disabled={actionLoading || !offerAmount}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {actionLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <PaperAirplaneIcon className="w-4 h-4" />
            )}
            {t('sendOffer')}
          </button>
        </div>
      </div>
    </motion.div>
  )

  // ── Action row by negotiation state ──────────────────────────
  const renderActions = () => {
    if (isTerminal || !task.contractorId) return null

    if (task.priceStatus === 'agreed') return null

    if (task.priceStatus === 'offered' && task.pricingLastActor === 'contractor') {
      return (
        <div className="space-y-3">
          {!showOfferForm && !showDeclineForm && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAccept}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {actionLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircleIcon className="w-4 h-4" />
                )}
                {t('acceptOffer')}
              </button>
              <button
                type="button"
                onClick={() => { setShowOfferForm(true); setShowDeclineForm(false) }}
                disabled={actionLoading}
                className="px-4 py-2 bg-white border border-blue-300 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                <ArrowUturnLeftIcon className="w-4 h-4" />
                {t('counterOffer')}
              </button>
              <button
                type="button"
                onClick={() => { setShowDeclineForm(true); setShowOfferForm(false) }}
                disabled={actionLoading}
                className="px-4 py-2 bg-white border border-red-300 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                <XCircleIcon className="w-4 h-4" />
                {t('declineTaskButton')}
              </button>
            </div>
          )}
          <AnimatePresence>{showOfferForm && renderOfferForm()}</AnimatePresence>
          <AnimatePresence>
            {showDeclineForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-3">
                  <textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder={t('declineReasonPlaceholder')}
                    rows={2}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={resetForms}
                      disabled={actionLoading}
                      className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={handleDecline}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    >
                      {actionLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <XCircleIcon className="w-4 h-4" />
                      )}
                      {t('confirmDecline')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
    }

    if (task.priceStatus === 'offered' && task.pricingLastActor === 'pm') {
      // PM cannot counter their own standing offer — waiting state only
      return (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <ClockIcon className="w-4 h-4" />
          {t('waitingForContractorResponse')}
        </div>
      )
    }

    if (task.priceStatus === 'awaiting_proposal') {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ClockIcon className="w-4 h-4" />
            {t('waitingForContractorProposal')}
          </div>
          {!showOfferForm && (
            <button
              type="button"
              onClick={() => setShowOfferForm(true)}
              disabled={actionLoading}
              className="px-4 py-2 bg-white border border-blue-300 text-blue-700 text-sm font-semibold rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <CurrencyDollarIcon className="w-4 h-4" />
              {t('makeOffer')}
            </button>
          )}
          <AnimatePresence>{showOfferForm && renderOfferForm()}</AnimatePresence>
        </div>
      )
    }

    return null
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <CurrencyDollarIcon className="w-4 h-4 text-gray-500" />
        <h4 className="text-sm font-medium text-gray-700">{t('priceNegotiation')}</h4>
      </div>

      {/* Current state */}
      {renderStateLine()}

      {/* No contractor yet — nothing to negotiate */}
      {!task.contractorId && (
        <p className="text-sm text-gray-400">{t('assignContractorToNegotiate')}</p>
      )}

      {/* Offer history timeline (chat bubbles) */}
      {task.offerHistory && task.offerHistory.length > 0 && (
        <div className="max-h-[220px] overflow-y-auto space-y-2 px-1">
          {task.offerHistory.map((entry, index) => {
            const isFromPM = entry.actor === 'pm'
            return (
              <div
                key={`${entry.at}-${index}`}
                className={`flex ${isFromPM ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`
                    max-w-[80%] rounded-xl px-3.5 py-2.5
                    ${isFromPM
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-100 border border-gray-200'
                    }
                  `}
                >
                  <div className={`flex items-center gap-2 mb-0.5 ${isFromPM ? 'justify-end' : ''}`}>
                    <span className={`text-xs font-medium ${isFromPM ? 'text-blue-700' : 'text-gray-600'}`}>
                      {actorLabel(entry.actor)} · {actionLabel(entry.action)}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {formatEntryTime(entry.at)}
                    </span>
                  </div>
                  {entry.amount != null && (
                    <p className="text-sm font-semibold text-gray-900">
                      {formatAmount(entry.amount, entry.pricingType, t('perHourSuffix'))}
                    </p>
                  )}
                  {entry.note && (
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                      {entry.note}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Actions */}
      {renderActions()}
    </div>
  )
}
