'use client'

import React from 'react'
import Modal from '../../shared/modal'
import { Contractor } from '@/services/types/contractor'
import { useTranslation } from 'react-i18next'
import {
  EnvelopeIcon,
  PhoneIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
  PencilIcon,
  PaperAirplaneIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface PreviewContractorModalProps {
  isOpen: boolean
  onClose: () => void
  contractor: Contractor
  onEditContractor?: () => void
  onResendInvite?: () => void
  embedded?: boolean
}

const PreviewContractorModal: React.FC<PreviewContractorModalProps> = ({
  isOpen,
  onClose,
  contractor,
  onEditContractor,
  onResendInvite,
  embedded = false,
}) => {
  const { t } = useTranslation('turnover')

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStatusBadge = () => {
    switch (contractor.status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-100 text-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            {t('active')}
          </span>
        )
      case 'invited':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            {t('invited')}
          </span>
        )
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            {t('inactive')}
          </span>
        )
    }
  }

  const inner = (
    <>
      {embedded && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer z-10"
          aria-label="Close"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      )}
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="shrink-0 h-14 w-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-xl font-bold text-white">
              {contractor.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{contractor.name}</h2>
            <div className="flex items-center gap-3 mt-2">
              {getStatusBadge()}
              <span className="text-sm text-gray-500">Added {formatDate(contractor.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          {t('contactInformation')}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <EnvelopeIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">
                {contractor.email || <span className="text-gray-400">{t('notProvided')}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <PhoneIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className="text-sm font-medium text-gray-900">
                {contractor.phone || <span className="text-gray-400">{t('notProvided')}</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Work Details */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          {t('workDetails')}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <WrenchScrewdriverIcon className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('tradeLabel')}</p>
              <p className="text-sm font-medium text-gray-900">
                {contractor.trade || <span className="text-gray-400">{t('notSet')}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <CurrencyDollarIcon className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('hourlyRateLabel')}</p>
              <p className="text-sm font-medium text-gray-900">
                {contractor.hourlyRate ? `$${contractor.hourlyRate.toFixed(2)}/hr` : <span className="text-gray-400">{t('notSet')}</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {(onEditContractor || onResendInvite) && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            {t('quickActions')}
          </h3>
          <div className="grid gap-3 grid-cols-2">
            {onEditContractor && (
              <button
                onClick={onEditContractor}
                className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <PencilIcon className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">{t('editDetails')}</span>
              </button>
            )}
            {contractor.email && contractor.authUserId && onResendInvite && (
              <button
                onClick={onResendInvite}
                className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-green-300 hover:bg-green-50 transition-all"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <PaperAirplaneIcon className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">{t('resendInvite')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-between gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
        {onEditContractor && (
          <button
            type="button"
            onClick={onEditContractor}
            className="inline-flex items-center px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit Contractor
          </button>
        )}
      </div>
    </>
  )

  if (embedded) {
    return <div className="relative p-6">{inner}</div>
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-2xl w-11/12">
      {inner}
    </Modal>
  )
}

export default PreviewContractorModal
