'use client'

import { useTranslation } from 'react-i18next'
import { XCircleIcon, ArrowPathIcon, BoltIcon } from '@heroicons/react/24/outline'
import Modal from '@/components/shared/modal'
import type { ConfirmDialogProps, OverrideConfirmProps } from '../types'

const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500'

/** Confirmation before cancelling a project. */
export function CancelProjectConfirm({ isOpen, propertyName, busy, onClose, onConfirm }: ConfirmDialogProps) {
  const { t } = useTranslation('turnover')
  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-md w-full">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 mb-4">
          <XCircleIcon className="h-6 w-6 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('cancelProject')}</h3>
        <p className="text-sm text-gray-600 mb-6">
          {t('confirmCancelProject', { property: propertyName })}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer ${focusRing}`}
          >
            {t('keepProject')}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer ${focusRing}`}
          >
            {busy ? t('cancellingProject') : t('cancelProject')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** Confirmation before reverting an in-progress project to confirmed. */
export function UnbeginProjectConfirm({ isOpen, propertyName, busy, onClose, onConfirm }: ConfirmDialogProps) {
  const { t } = useTranslation('turnover')
  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-md w-full">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
          <ArrowPathIcon className="h-6 w-6 text-indigo-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('unbeginProjectTitle')}</h3>
        <p className="text-sm text-gray-600 mb-6">
          {t('unbeginProjectDescription', { property: propertyName })}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer ${focusRing}`}
          >
            {t('keepInProgress')}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer ${focusRing}`}
          >
            {busy ? t('revertingProject') : t('unbeginProjectTitle')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** Status-override picker + confirmation. */
export function OverrideProjectConfirm({ isOpen, propertyName, busy, target, onTargetChange, onClose, onConfirm }: OverrideConfirmProps) {
  const { t } = useTranslation('turnover')
  return (
    <Modal isOpen={isOpen} onClose={onClose} style="p-6 max-w-md w-full">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-orange-100">
            <BoltIcon className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('overrideProjectStatus')}</h3>
            <p className="text-xs text-gray-500">{propertyName}</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          {t('overrideProjectDescription')}
        </p>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('setStatusTo')}</label>
        <select
          value={target}
          onChange={e => onTargetChange(e.target.value)}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
        >
          <option value="pending">{t('overrideOptionPending')}</option>
          <option value="assigned">{t('overrideOptionAssigned')}</option>
          <option value="confirmed">{t('overrideOptionConfirmed')}</option>
          <option value="in_progress">{t('overrideOptionInProgress')}</option>
        </select>
        <div className="flex gap-3 justify-end mt-5">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer ${focusRing}`}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 cursor-pointer ${focusRing}`}
          >
            {busy ? t('overridingProject') : t('overrideProject')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
