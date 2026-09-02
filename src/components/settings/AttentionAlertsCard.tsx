'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ExclamationTriangleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useImpersonationStore } from '@/store/useImpersonationStore'
import {
  getAlertSettings,
  updateAlertSettings,
} from '@/services/notificationPreferencesService'
import { AlertSettings } from '@/services/types/notificationPreferences'

/**
 * One alert row: an on/off switch plus its threshold.
 *
 * `value === null` means "use the backend default", which is shown as the
 * input's placeholder rather than written in — so retuning the product default
 * later reaches everyone who never set an explicit number.
 */
interface AlertRow {
  key: string
  enabledField: keyof AlertSettings
  valueField?: keyof AlertSettings
  defaultValue?: number
  unitKey?: string
  min?: number
  max?: number
}

const ROWS: AlertRow[] = [
  {
    key: 'unassigned',
    enabledField: 'unassignedEnabled',
    valueField: 'unassignedLeadDays',
    defaultValue: 3,
    unitKey: 'alertUnitDays',
    min: 1,
    max: 14,
  },
  { key: 'sameDay', enabledField: 'sameDayUnassignedEnabled' },
  {
    key: 'unaccepted',
    enabledField: 'unacceptedEnabled',
    valueField: 'unacceptedHours',
    defaultValue: 24,
    unitKey: 'alertUnitHours',
    min: 1,
    max: 72,
  },
  {
    key: 'notStarted',
    enabledField: 'notStartedEnabled',
    valueField: 'notStartedMinutes',
    defaultValue: 60,
    unitKey: 'alertUnitMinutes',
    min: 15,
    max: 1440,
  },
  {
    key: 'notCompleted',
    enabledField: 'notCompletedEnabled',
    valueField: 'notCompletedMinutes',
    defaultValue: 120,
    unitKey: 'alertUnitMinutes',
    min: 15,
    max: 1440,
  },
]

interface AttentionAlertsCardProps {
  canWrite?: boolean
  delay?: number
}

export default function AttentionAlertsCard({ canWrite = true, delay = 0.25 }: AttentionAlertsCardProps) {
  const { t } = useTranslation('settings')
  const showNotification = useNotificationStore((s) => s.showNotification)
  // Read-only while impersonating — see NotificationPreferencesMatrix.
  const isImpersonating = useImpersonationStore((s) => s.isImpersonating)
  const editable = canWrite && !isImpersonating

  const [settings, setSettings] = useState<AlertSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  /** row.key -> user-facing message, for rows currently out of range */
  const [errors, setErrors] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAlertSettings()
      if (res.status === 'success' && res.data) setSettings(res.data)
    } catch {
      // A failed load leaves the card in its empty state; the save path
      // surfaces errors where the user can act on them.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  /**
   * Validate a threshold against the row's declared min/max.
   *
   * The server validates too, but without this the user can save an
   * out-of-range value, eat a round-trip, and get back a message naming the
   * raw API field ("unassignedLeadDays must be...") instead of the label they
   * actually see on screen.
   *
   * null is valid — it means "use the backend default" and shows as a placeholder.
   */
  const validate = (row: AlertRow, value: number | null): string | null => {
    if (value === null) return null
    if (!Number.isInteger(value) || value < row.min! || value > row.max!) {
      return t('alertRangeError', { label: t(`alert_${row.key}`), min: row.min, max: row.max })
    }
    return null
  }

  const update = (field: keyof AlertSettings, value: boolean | number | null) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : prev))
    setDirty(true)
  }

  const updateThreshold = (row: AlertRow, value: number | null) => {
    update(row.valueField!, value)
    const message = validate(row, value)
    setErrors((prev) => {
      const next = { ...prev }
      if (message) next[row.key] = message
      else delete next[row.key]
      return next
    })
  }

  const hasErrors = Object.keys(errors).length > 0

  const handleSave = async () => {
    if (!settings || hasErrors) return
    setSaving(true)
    try {
      const res = await updateAlertSettings(settings)
      if (res.status === 'success' && res.data) {
        setSettings(res.data)
        setDirty(false)
        showNotification(t('alertsSaved'), 'success')
      } else {
        showNotification(res.message || t('alertsSaveFailed'), 'error')
      }
    } catch (err) {
      showNotification(err instanceof Error ? err.message : t('alertsSaveFailed'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      id="settings-alerts"
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-36"
    >
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
            <ExclamationTriangleIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('alertsTitle')}</h3>
            <p className="text-sm text-gray-500">{t('alertsDesc')}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-3">
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && settings && (
          <>
            {ROWS.map((row) => {
              const enabled = settings[row.enabledField] as boolean
              const value = row.valueField ? (settings[row.valueField] as number | null) : null
              const rowError = errors[row.key]

              return (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{t(`alert_${row.key}`)}</h4>
                    <p className="text-xs text-gray-500">{t(`alertDesc_${row.key}`)}</p>
                    {rowError && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <ExclamationCircleIcon className="w-3 h-3 flex-shrink-0" />
                        {rowError}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {row.valueField && (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={row.min}
                          max={row.max}
                          value={value ?? ''}
                          placeholder={String(row.defaultValue)}
                          disabled={!editable || !enabled || saving}
                          aria-invalid={Boolean(rowError)}
                          onChange={(e) => {
                            const raw = e.target.value
                            updateThreshold(row, raw === '' ? null : parseInt(raw, 10))
                          }}
                          className={`w-16 px-2 py-1 text-sm text-center border rounded-lg focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:text-gray-400 ${
                            rowError
                              ? 'border-red-300 focus:ring-red-500'
                              : 'border-gray-200 focus:ring-blue-500'
                          }`}
                        />
                        <span className="text-xs text-gray-500 w-12">{t(row.unitKey!)}</span>
                      </div>
                    )}
                    <ToggleSwitch
                      color="amber"
                      checked={enabled}
                      disabled={!editable || saving}
                      onChange={(v) => update(row.enabledField, v)}
                      ariaLabel={t(`alert_${row.key}`)}
                    />
                  </div>
                </div>
              )
            })}

            {dirty && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !canWrite || hasErrors}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? t('savingChanges') : t('saveChanges')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  )
}
