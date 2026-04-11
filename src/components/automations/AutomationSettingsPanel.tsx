'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CogIcon } from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getAutomationSettings, updateAutomationSettings } from '@/services/automationService'
import type { AutomationSettings } from '@/services/types/automation'

const TEMPLATE_VARS = [
  { key: '{{guest_name}}', description: 'Full guest name (e.g. John Smith)' },
  { key: '{{guest_first_name}}', description: 'Guest first name (e.g. John)' },
  { key: '{{property_name}}', description: 'Listing name from Hostaway' },
  { key: '{{check_in}}', description: 'Check-in date' },
  { key: '{{check_out}}', description: 'Check-out date' },
  { key: '{{platform}}', description: 'Booking platform (airbnb, vrbo, booking)' },
  { key: '{{conversation}}', description: 'Full message thread between host and guest' },
]

interface AutomationSettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function AutomationSettingsPanel({ isOpen, onClose }: AutomationSettingsPanelProps) {
  const { t } = useTranslation('dashboard')
  const { showNotification } = useNotificationStore()
  const [settings, setSettings] = useState<AutomationSettings>({
    guestReviewEnabled: false,
    reviewNudgeEnabled: false,
    reviewNudgeDelayHours: 48,
    autoSendNudge: false,
    notifyEmail: true,
    notifySms: true,
    customReviewPrompt: null,
    customNudgePrompt: null,
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    getAutomationSettings()
      .then(res => {
        if (res.status === 'success' && res.data) {
          setSettings(res.data)
        }
      })
      .catch(() => showNotification(t('automations.failedToLoadSettings'), 'error'))
      .finally(() => setLoading(false))
  }, [isOpen, showNotification])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await updateAutomationSettings(settings)
      if (res.status === 'success') {
        showNotification(t('automations.settingsSaved'), 'success')
        onClose()
      } else {
        showNotification(res.message || t('automations.failedToSaveSettings'), 'error')
      }
    } catch {
      showNotification('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CogIcon className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">{t('automations.automationSettings')}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Automation Toggles */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">{t('automations.enabledAutomations')}</h3>
              <div className="space-y-3">
                <Toggle
                  label="Guest Review Writing"
                  description="AI generates host reviews of guests after checkout"
                  checked={settings.guestReviewEnabled}
                  onChange={(v) => setSettings(s => ({ ...s, guestReviewEnabled: v }))}
                />
                <Toggle
                  label="Review Request Nudge"
                  description="AI generates messages encouraging guests to leave reviews"
                  checked={settings.reviewNudgeEnabled}
                  onChange={(v) => setSettings(s => ({ ...s, reviewNudgeEnabled: v }))}
                />
              </div>
            </div>

            {/* Delay Configuration */}
            {settings.reviewNudgeEnabled && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">{t('automations.nudgeDelay')}</h3>
                <p className="text-xs text-gray-500 mb-2">{t('automations.nudgeDelayDescription')}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={336}
                    value={settings.reviewNudgeDelayHours}
                    onChange={(e) => setSettings(s => ({ ...s, reviewNudgeDelayHours: parseInt(e.target.value) || 48 }))}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-600">hours ({Math.round(settings.reviewNudgeDelayHours / 24)} days)</span>
                </div>
              </div>
            )}

            {/* Auto-Send */}
            {settings.reviewNudgeEnabled && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">{t('automations.automationLevel')}</h3>
                <Toggle
                  label="Auto-send review nudges"
                  description="Skip approval and send nudge messages automatically via the guest's booking channel (Airbnb, VRBO, etc.)"
                  checked={settings.autoSendNudge}
                  onChange={(v) => setSettings(s => ({ ...s, autoSendNudge: v }))}
                />
                {settings.autoSendNudge && (
                  <p className="mt-2 ml-12 text-[11px] text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                    {t('automations.autoSendWarning')}
                  </p>
                )}
              </div>
            )}

            {/* Custom Prompts */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">{t('automations.customAiPrompts')}</h3>
              <p className="text-xs text-gray-500 mb-3">{t('automations.customAiPromptsDescription')}</p>

              {settings.guestReviewEnabled && (
                <PromptEditor
                  label="Guest Review Prompt"
                  value={settings.customReviewPrompt || ''}
                  onChange={(v) => setSettings(s => ({ ...s, customReviewPrompt: v || null }))}
                  placeholder="Leave blank for default. Example: Write a warm 3-sentence review for {{guest_name}} who stayed at our place..."
                />
              )}

              {settings.reviewNudgeEnabled && (
                <PromptEditor
                  label="Review Nudge Prompt"
                  value={settings.customNudgePrompt || ''}
                  onChange={(v) => setSettings(s => ({ ...s, customNudgePrompt: v || null }))}
                  placeholder="Leave blank for default. Example: Write a friendly message to {{guest_first_name}} encouraging them to leave a review..."
                />
              )}
            </div>

            {/* Notification Preferences */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">{t('automations.approvalNotifications')}</h3>
              <div className="space-y-3">
                <Toggle
                  label="Email notifications"
                  description="Get notified by email when automations need approval"
                  checked={settings.notifyEmail}
                  onChange={(v) => setSettings(s => ({ ...s, notifyEmail: v }))}
                />
                <Toggle
                  label="SMS notifications"
                  description="Get notified by text when automations need approval"
                  checked={settings.notifySms}
                  onChange={(v) => setSettings(s => ({ ...s, notifySms: v }))}
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? t('automations.saving') : t('automations.saveSettings')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Toggle({ label, description, checked, onChange }: {
  label: string
  description: string
  checked: boolean
  onChange: (val: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors mt-0.5 ${checked ? 'bg-amber-500' : 'bg-gray-300'}`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${checked ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`}
        />
      </button>
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
    </label>
  )
}

function PromptEditor({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (val: string) => void
  placeholder: string
}) {
  const textareaId = `prompt-${label.replace(/\s/g, '-').toLowerCase()}`

  const insertVar = (varKey: string) => {
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null
    if (!textarea) {
      onChange(value + varKey)
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newValue = value.substring(0, start) + varKey + value.substring(end)
    onChange(newValue)
    requestAnimationFrame(() => {
      textarea.focus()
      const pos = start + varKey.length
      textarea.setSelectionRange(pos, pos)
    })
  }

  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <textarea
        id={textareaId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
      />
      <div className="flex flex-wrap gap-1 mt-1.5">
        {TEMPLATE_VARS.map(v => (
          <button
            key={v.key}
            type="button"
            onClick={() => insertVar(v.key)}
            title={v.description}
            className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-mono rounded border border-amber-200 transition-colors"
          >
            + {v.key.replace(/\{\{|\}\}/g, '')}
          </button>
        ))}
      </div>
    </div>
  )
}
