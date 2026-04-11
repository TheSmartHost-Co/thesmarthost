'use client'

import { useState, useEffect } from 'react'
import { CogIcon } from '@heroicons/react/24/outline'
import { useNotificationStore } from '@/store/useNotificationStore'
import { getMessageAutomationSettings, updateMessageAutomationSettings } from '@/services/messageAutomationService'
import type { MessageAutomationSettings, ScheduleDay, ConfidenceThreshold } from '@/services/types/messageAutomation'

interface MessageAutomationSettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const defaultSchedule: ScheduleDay[] = DAY_NAMES.map((_, i) => ({
  day: i,
  enabled: false,
  startTime: '18:00',
  endTime: '09:00',
}))

const TIMEZONES = [
  'America/Toronto',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Vancouver',
  'America/Edmonton',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
  'Asia/Tokyo',
]

export default function MessageAutomationSettingsPanel({ isOpen, onClose }: MessageAutomationSettingsPanelProps) {
  const { showNotification } = useNotificationStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form fields as individual local state (all held locally until Save)
  const [autoReplyMessages, setAutoReplyMessages] = useState(false)
  const [autoReplyInquiries, setAutoReplyInquiries] = useState(false)
  const [autoSendWhenConfident, setAutoSendWhenConfident] = useState(false)
  const [schedule, setSchedule] = useState<ScheduleDay[]>(defaultSchedule)
  const [timezone, setTimezone] = useState('America/Toronto')
  const [alertEmail, setAlertEmail] = useState(true)
  const [alertSms, setAlertSms] = useState(true)
  const [customSystemPrompt, setCustomSystemPrompt] = useState('')
  const [confidenceThreshold, setConfidenceThreshold] = useState<ConfidenceThreshold>('medium')

  // Load settings every time the panel opens
  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    getMessageAutomationSettings()
      .then((res) => {
        if (res.status === 'success' && res.data) {
          const s: MessageAutomationSettings = res.data
          setAutoReplyMessages(s.autoReplyMessages)
          setAutoReplyInquiries(s.autoReplyInquiries)
          setAutoSendWhenConfident(s.autoSendWhenConfident)
          setSchedule(s.schedule.length > 0 ? s.schedule : defaultSchedule)
          setTimezone(s.timezone)
          setAlertEmail(s.alertEmail)
          setAlertSms(s.alertSms)
          setCustomSystemPrompt(s.customSystemPrompt ?? '')
          setConfidenceThreshold(s.confidenceThreshold)
        }
      })
      .catch(() => showNotification('Failed to load message automation settings', 'error'))
      .finally(() => setLoading(false))
  }, [isOpen, showNotification])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await updateMessageAutomationSettings({
        autoReplyMessages,
        autoReplyInquiries,
        autoSendWhenConfident,
        schedule,
        timezone,
        alertEmail,
        alertSms,
        customSystemPrompt: customSystemPrompt || null,
        confidenceThreshold,
      })
      if (res.status === 'success') {
        showNotification('Settings saved', 'success')
        onClose()
      } else {
        showNotification(res.message || 'Failed to save settings', 'error')
      }
    } catch {
      showNotification('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Schedule helpers
  const applyPreset = (preset: 'nights' | '24_7' | 'weekends') => {
    setSchedule(
      DAY_NAMES.map((_, i) => {
        if (preset === 'nights') {
          return { day: i, enabled: true, startTime: '18:00', endTime: '09:00' }
        }
        if (preset === '24_7') {
          return { day: i, enabled: true, startTime: '00:00', endTime: '23:59' }
        }
        // weekends: Saturday=6, Sunday=0
        const isWeekend = i === 0 || i === 6
        return { day: i, enabled: isWeekend, startTime: '00:00', endTime: '23:59' }
      })
    )
  }

  const updateDayEnabled = (dayIndex: number, enabled: boolean) => {
    setSchedule((prev) =>
      prev.map((d) => (d.day === dayIndex ? { ...d, enabled } : d))
    )
  }

  const updateDayTime = (dayIndex: number, field: 'startTime' | 'endTime', value: string) => {
    setSchedule((prev) =>
      prev.map((d) => (d.day === dayIndex ? { ...d, [field]: value } : d))
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto">
        {/* Sticky header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <CogIcon className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Message Automation Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-6">

            {/* 1. Disclosure banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-800 leading-relaxed">
              <span className="font-semibold">Property context</span> is automatically fetched from your Hostaway
              listing details including description, house rules, amenities, and check-in instructions. Ensure your
              Hostaway listings are up to date for the best AI responses.
            </div>

            {/* 2. Master toggles */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Reply Automation</h3>
              <div className="space-y-3">
                <Toggle
                  label="Auto-reply to Guest Messages"
                  description="AI will generate and queue replies for incoming guest messages."
                  checked={autoReplyMessages}
                  onChange={setAutoReplyMessages}
                />
                <Toggle
                  label="Auto-reply to Inquiries"
                  description="AI will generate replies to booking inquiries from guests."
                  checked={autoReplyInquiries}
                  onChange={setAutoReplyInquiries}
                />
              </div>
            </div>

            {/* 3. Send behavior */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Send Behavior</h3>
              <div className="space-y-3">
                <Toggle
                  label="Auto-send when confident"
                  description="Skip your review and send automatically when the AI is confident in its response."
                  checked={autoSendWhenConfident}
                  onChange={setAutoSendWhenConfident}
                />
                {autoSendWhenConfident && (
                  <p className="ml-14 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                    Messages will be sent automatically to guests without your review when the AI is confident.
                  </p>
                )}

                {/* Confidence threshold */}
                <div className="flex items-start gap-3">
                  <div className="w-11 flex-shrink-0" /> {/* spacer to align with toggles */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Confidence Threshold
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Minimum confidence level required for auto-send to trigger.
                    </p>
                    <select
                      value={confidenceThreshold}
                      onChange={(e) => setConfidenceThreshold(e.target.value as ConfidenceThreshold)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="high">Conservative (only high confidence)</option>
                      <option value="medium">Balanced (medium or higher)</option>
                      <option value="low">Permissive (anything above low)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Schedule */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">Active Schedule</h3>
              <p className="text-xs text-gray-500 mb-3">
                AI will only reply during the time windows you configure below.
              </p>

              {/* Timezone */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              {/* Quick preset buttons */}
              <div className="flex gap-2 flex-wrap mb-4">
                <button
                  type="button"
                  onClick={() => applyPreset('nights')}
                  className="px-3 py-1 text-xs font-medium border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Nights Only (6PM–9AM)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('24_7')}
                  className="px-3 py-1 text-xs font-medium border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  24/7
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('weekends')}
                  className="px-3 py-1 text-xs font-medium border border-gray-300 rounded-full text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Weekends Only
                </button>
              </div>

              {/* Day rows */}
              <div className="space-y-2">
                {schedule.map((dayEntry) => (
                  <div key={dayEntry.day} className="flex items-center gap-2">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      id={`day-${dayEntry.day}`}
                      checked={dayEntry.enabled}
                      onChange={(e) => updateDayEnabled(dayEntry.day, e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 accent-amber-500 cursor-pointer flex-shrink-0"
                    />
                    {/* Day name */}
                    <label
                      htmlFor={`day-${dayEntry.day}`}
                      className={`w-20 text-sm cursor-pointer select-none ${
                        dayEntry.enabled ? 'text-gray-900 font-medium' : 'text-gray-400'
                      }`}
                    >
                      {DAY_NAMES[dayEntry.day]}
                    </label>
                    {/* Time inputs */}
                    <input
                      type="time"
                      value={dayEntry.startTime}
                      disabled={!dayEntry.enabled}
                      onChange={(e) => updateDayTime(dayEntry.day, 'startTime', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                    <span className="text-xs text-gray-400">to</span>
                    <input
                      type="time"
                      value={dayEntry.endTime}
                      disabled={!dayEntry.enabled}
                      onChange={(e) => updateDayTime(dayEntry.day, 'endTime', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 5. AI Customization */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">AI Customization</h3>
              <p className="text-xs text-gray-500 mb-3">
                Provide additional instructions to shape the AI's tone, style, or specific details to include.
              </p>
              <label className="block text-xs font-medium text-gray-700 mb-1">Custom Instructions</label>
              <textarea
                value={customSystemPrompt}
                onChange={(e) => setCustomSystemPrompt(e.target.value)}
                rows={4}
                placeholder="Add any special instructions for the AI (e.g., 'Always mention the parking is free', 'Be brief and casual')..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y placeholder-gray-400"
              />
            </div>

            {/* 6. Alert preferences */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Alert Preferences</h3>
              <div className="space-y-3">
                <Toggle
                  label="Email alerts"
                  description="Receive email notifications when messages need your review."
                  checked={alertEmail}
                  onChange={setAlertEmail}
                />
                <Toggle
                  label="SMS alerts"
                  description="Receive text message notifications when messages need your review."
                  checked={alertSms}
                  onChange={setAlertSms}
                />
              </div>
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Reusable toggle switch — same pattern as AutomationSettingsPanel
function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
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
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors mt-0.5 ${
          checked ? 'bg-amber-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
            checked ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
          }`}
        />
      </button>
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
    </label>
  )
}
