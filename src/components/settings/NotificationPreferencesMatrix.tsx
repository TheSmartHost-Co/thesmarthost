'use client'

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDownIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  BellAlertIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import ToggleSwitch from '@/components/ui/ToggleSwitch'
import Modal from '@/components/shared/modal'
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'
import { useNotificationStore } from '@/store/useNotificationStore'
import { useUserStore } from '@/store/useUserStore'
import { useImpersonationStore } from '@/store/useImpersonationStore'
import { NotificationChannel } from '@/services/types/notificationPreferences'

const CHANNELS: NotificationChannel[] = ['email', 'sms', 'in_app']

const CHANNEL_ICON = {
  email: EnvelopeIcon,
  sms: DevicePhoneMobileIcon,
  in_app: BellAlertIcon,
} as const

const CHANNEL_LABEL_KEY: Record<NotificationChannel, string> = {
  email: 'notifChannelEmail',
  sms: 'notifChannelSms',
  in_app: 'notifChannelInApp',
}

// Field workers see "Text"; the PM keeps "SMS", matching the rest of their UI.
// Both screens stay internally consistent with their own master toggle label.
const SIMPLE_CHANNEL_LABEL_KEY: Record<NotificationChannel, string> = {
  ...CHANNEL_LABEL_KEY,
  sms: 'notifChannelText',
}

interface NotificationPreferencesMatrixProps {
  canWrite?: boolean
  /**
   * Simple-first layout for field workers (cleaners, contractors): a
   * plain-language readback and three preset cards up front, with the full grid
   * behind a disclosure. The PM keeps the grid in front.
   *
   * A prop rather than a separate component because a wrapper would need its
   * own useNotificationPreferences() instance — two dirty maps, two save bars,
   * and two ways to disagree about unsaved state.
   */
  simple?: boolean
}

/**
 * The per-event x per-channel preference matrix.
 *
 * ~50 events x 3 channels is 150 controls, so a flat grid is unusable. Instead
 * categories are collapsed by default and each shows a summary chip, so the
 * page opens as a short list and the user expands only what they care about.
 */
export default function NotificationPreferencesMatrix({
  canWrite = true,
  simple = false,
}: NotificationPreferencesMatrixProps) {
  const { t } = useTranslation('settings')
  const showNotification = useNotificationStore((s) => s.showNotification)
  const {
    data, byCategory, loading, saving, error,
    dirtyCount, isEnabled, setCell, setCategory, save, reset, discard,
    presets, activePreset, applyPreset, setMaster, masterValue,
  } = useNotificationPreferences()

  const channelLabel = (channel: NotificationChannel) =>
    t((simple ? SIMPLE_CHANNEL_LABEL_KEY : CHANNEL_LABEL_KEY)[channel])

  const [expanded, setExpanded] = useState<string[]>([])
  const [confirmingReset, setConfirmingReset] = useState(false)
  // In simple mode the grid starts hidden — that's the whole point.
  const [showGrid, setShowGrid] = useState(!simple)
  const [confirmingGoDark, setConfirmingGoDark] = useState(false)

  const toggleCategory = (category: string) =>
    setExpanded((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
    )

  /**
   * A channel column is dead when the legacy master switch for it is off: no
   * per-event setting can override a global opt-out, so showing live toggles
   * would be a lie.
   *
   * Read from the user store, NOT from the hook's `data.master`. The master
   * toggles live on the settings page above this component and write straight
   * to the store; `data.master` comes from a fetch that only runs on mount, so
   * sourcing it from there left the column stale until a reload.
   *
   * `?? true` matches the backend's `!== false` / COALESCE(..., true)
   * semantics — the flags are undefined until a profile fetch populates them.
   */
  const profile = useUserStore((s) => s.profile)

  // Impersonation makes this view read-only. A PM viewing as a cleaner is
  // diagnosing ("why isn't Maria getting texts?"), not administering — and the
  // app never swaps identity, so any write here would be aimed at the PM's own
  // row. Folded in here rather than left to each parent to remember.
  const isImpersonating = useImpersonationStore((s) => s.isImpersonating)
  const editable = canWrite && !isImpersonating

  // Reflects the pending draft, so dimming, the readback and the go-dark check
  // all respond the moment a master is tapped rather than after it is saved.
  const masterOff = useMemo(
    () => ({
      email: !masterValue('email'),
      sms: !masterValue('sms'),
      in_app: false,
    }),
    [masterValue]
  )

  // Server's answer, not the store's. It COALESCEs cleaners.phone /
  // contractors.phone over profiles.phone_number, so a cleaner whose number
  // lives on their cleaner record has one — reading profile.phoneNumber here
  // would disable their SMS column while the server happily accepted it.
  // Unlike the master switches this cannot change mid-session, so there is no
  // reason to track it locally.
  const hasPhone = data?.master.hasPhone ?? Boolean(profile?.phoneNumber)

  const channelDisabled = (channel: NotificationChannel) =>
    !editable || saving || masterOff[channel] || (channel === 'sms' && !hasPhone)

  /**
   * What a switch shows. isEnabled() is the user's ungated preference; the
   * master gate is applied HERE, at render, rather than baked into the stored
   * value — so turning a master back on immediately re-derives every event
   * instead of leaving them stuck false.
   */
  const displayValue = (eventType: string, channel: NotificationChannel) =>
    masterOff[channel] ? false : isEnabled(eventType, channel)

  /**
   * Categories the user will still be reached on, by channel. Drives the
   * plain-language readback — the answer to "what will still contact me?",
   * which currently requires expanding every category and OR-ing the cells.
   */
  const reachableCategories = useMemo(() => {
    const pick = (channel: NotificationChannel) => {
      // The master switch wins over every per-event setting, so a channel that is
      // switched off entirely contributes nothing to the sentence. isEnabled() is
      // deliberately ungated, which is what lets the sentence recover the moment
      // a master is switched back on.
      if (masterOff[channel]) return []
      return byCategory
        .filter(({ events }) => events.some((e) => isEnabled(e.eventType, channel)))
        .map(({ category }) => t(`notifCategory_${category}`, category))
    }

    return { email: pick('email'), sms: pick('sms') }
  }, [byCategory, isEnabled, masterOff, t])

  /**
   * True when saving would leave the user with no email and no text at all.
   *
   * Computed from UNGATED preferences plus the live master draft. Reading the
   * server's gated `effective` here was what made re-enabling a master fire the
   * destructive all-off warning: every event still read false, so the UI
   * concluded nothing would ever be delivered.
   */
  const wouldGoDark = useMemo(() => {
    if (!data) return false
    const silent = (channel: NotificationChannel) =>
      masterOff[channel] || data.events.every((e) => !isEnabled(e.eventType, channel))
    return silent('email') && silent('sms')
  }, [data, isEnabled, masterOff])

  const handleSave = async () => {
    if (wouldGoDark && !confirmingGoDark) {
      setConfirmingGoDark(true)
      return
    }
    setConfirmingGoDark(false)
    const res = await save()
    if (res.ok) showNotification(t('notifSaved'), 'success')
    else showNotification(res.message || t('failedToUpdateNotifications'), 'error')
  }

  const handleReset = async () => {
    const res = await reset()
    setConfirmingReset(false)
    if (res.ok) showNotification(t('notifResetDone'), 'success')
    else showNotification(res.message || t('failedToUpdateNotifications'), 'error')
  }

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">{error || t('failedToUpdateNotifications')}</p>
      </div>
    )
  }

  /**
   * The answer to "what will still contact me?" in one sentence.
   *
   * Category-level rather than event-level: category names are already short
   * noun phrases that join cleanly in all three languages, whereas the event
   * descriptions are full sentences written from the recipient's point of view.
   */
  const readback = () => {
    const { email, sms } = reachableCategories
    if (email.length === 0 && sms.length === 0) return t('notifReadbackNone')

    const list = (xs: string[]) => xs.join(', ')
    const smsSet = new Set(sms)
    const emailOnly = email.filter((c) => !smsSet.has(c))
    let clause: string

    if (sms.length === 0) {
      clause = t('notifReadbackEmailOnly', { categories: list(email) })
    } else if (email.length === 0) {
      clause = t('notifReadbackTextOnly', { categories: list(sms) })
    } else if (emailOnly.length === 0 && sms.length === email.length) {
      clause = t('notifReadbackBoth', { categories: list(email) })
    } else if (sms.every((c) => email.includes(c))) {
      // The common case: texts are a subset of emails. Saying it this way
      // avoids repeating the shared categories in both halves of the sentence.
      clause = t('notifReadbackBothPlusEmail', { both: list(sms), emailOnly: list(emailOnly) })
    } else {
      clause = t('notifReadbackSplit', { textCategories: list(sms), emailCategories: list(email) })
    }

    // Only promise the app catch-all when something is actually left over.
    const covered = new Set([...email, ...sms])
    const allCovered = byCategory.every(({ category }) =>
      covered.has(t(`notifCategory_${category}`, category))
    )
    return allCovered ? clause : `${clause} ${t('notifReadbackRest')}`
  }

  return (
    <div className="p-6 space-y-4">
      {isImpersonating && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          {t('notifImpersonationReadOnly')}
        </div>
      )}

      {/* Master switches. They live here rather than in the parent page so a
          single Save commits them alongside the per-event rows — previously
          they wrote instantly on tap, so the go-dark warning had no save moment
          to interrupt and the screen had two competing save models. */}
      <div className="space-y-2">
        {(['email', 'sms'] as const).map((channel) => {
          const Icon = CHANNEL_ICON[channel]
          const noPhone = channel === 'sms' && !hasPhone
          return (
            <div key={channel} className="flex items-center justify-between gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 flex-shrink-0 bg-white rounded-xl flex items-center justify-center">
                  <Icon className="h-5 w-5 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900">
                    {t(channel === 'email' ? 'emailNotifications' : (simple ? 'textNotifications' : 'smsNotifications'))}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {noPhone ? t('addPhoneToEnableSms') : t('notifMasterDesc')}
                  </p>
                </div>
              </div>
              <ToggleSwitch
                size="lg"
                color={channel === 'email' ? 'blue' : 'amber'}
                checked={masterValue(channel)}
                disabled={!editable || saving || noPhone}
                onChange={(v) => setMaster(channel, v)}
                ariaLabel={t(channel === 'email' ? 'emailNotifications' : 'smsNotifications')}
              />
            </div>
          )
        })}
      </div>

      {/* What this page does, and the master-switch rule in one line. */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
        <p className="text-sm text-blue-900">{simple ? readback() : t('notifMatrixDesc')}</p>
        {(masterOff.email || masterOff.sms) && (
          <p className="mt-2 text-xs text-blue-800 font-medium">{t('notifMasterOffHint')}</p>
        )}
      </div>

      {/* Preset cards — the simple path. One tap instead of ~26 toggles. */}
      {simple && presets.length > 0 && (
        <div role="radiogroup" aria-label={t('notifPresetsTitle')} className="space-y-2">
          <p className="text-sm font-medium text-gray-900">{t('notifPresetsTitle')}</p>
          {presets.map((preset) => {
            const selected = activePreset === preset.key
            return (
              <button
                key={preset.key}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!editable || saving}
                onClick={() => applyPreset(preset.key)}
                className={`w-full flex items-center gap-4 p-4 border rounded-xl text-left transition-colors min-h-[44px] disabled:opacity-50 ${
                  selected
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <span
                  className={`w-5 h-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center ${
                    selected ? 'border-blue-600' : 'border-gray-300'
                  }`}
                >
                  {selected && <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900">
                    {t(`notifPreset_${preset.key}`)}
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    {t(`notifPresetDesc_${preset.key}`)}
                  </span>
                </span>
              </button>
            )
          })}
          {activePreset === null && dirtyCount === 0 && (
            <p className="text-xs text-gray-500">{t('notifPresetCustom')}</p>
          )}
          {/* Legend for the amber pill further down. Without it the badge reads
              as "locked" rather than "recommended", which is the opposite of
              what it means — nothing here is un-mutable. */}
          <p className="text-xs text-gray-500 flex items-start gap-1.5">
            <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 flex-shrink-0">
              {t('notifUrgentBadge')}
            </span>
            <span>{t('notifUrgentExplain')}</span>
          </p>
        </div>
      )}

      {/* Progressive disclosure — the grid is opt-in for field workers. */}
      {simple && (
        <button
          type="button"
          onClick={() => setShowGrid((v) => !v)}
          aria-expanded={showGrid}
          className="w-full flex items-center justify-between px-4 py-3 min-h-[44px] text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
        >
          {t('notifChooseIndividually')}
          <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${showGrid ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Reset — the affordance that gets an already-tinkered account onto the
          recommended quiet policy in one click. */}
      <div className={`${showGrid ? 'flex' : 'hidden'} items-center justify-between gap-3 flex-wrap`}>
        <p className="text-xs text-gray-500">{t('notifOverriddenHint')}</p>
        {confirmingReset ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700">{t('notifResetConfirm')}</span>
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {t('notifResetDefaults')}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              {t('cancel')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            disabled={!editable || saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            <ArrowPathIcon className="h-3.5 w-3.5" />
            {t('notifResetDefaults')}
          </button>
        )}
      </div>

      {/* Category accordions */}
      <div className={showGrid ? 'space-y-2' : 'hidden'}>
        {byCategory.map(({ category, events }) => {
          const isOpen = expanded.includes(category)
          const emailOn = events.filter((e) => displayValue(e.eventType, 'email')).length

          return (
            <div key={category} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">
                  {t(`notifCategory_${category}`, category)}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {/* Plain language rather than "3 of 6 email" — a ratio reads
                        as a fragment, not a status. */}
                    {emailOn === 0
                      ? t('notifSummaryNone')
                      : emailOn === events.length
                        ? t('notifSummaryAll')
                        : t('notifSummarySome')}
                  </span>
                  <ChevronDownIcon
                    className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    // Same requirement as the save bar below — keyed per
                    // category so collapsing one cannot leave a stuck panel.
                    key={`category-${category}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="divide-y divide-gray-100">
                      {/* Desktop: column header doubling as the per-category
                          bulk row. The mobile equivalent is below — until now
                          the bulk toggles lived only in here, so phone users
                          had no way to set a whole category at once. */}
                      <div className="hidden sm:flex items-center gap-4 px-4 py-2 bg-white">
                        <span className="flex-1 text-xs font-medium text-gray-500 uppercase tracking-wide">
                          {t('notifCategoryAll')}
                        </span>
                        {CHANNELS.map((channel) => {
                          const Icon = CHANNEL_ICON[channel]
                          const allOn = events.every((e) => displayValue(e.eventType, channel))
                          return (
                            <span key={channel} className="w-20 flex flex-col items-center gap-1">
                              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                                <Icon className="h-3.5 w-3.5" />
                                {channelLabel(channel)}
                              </span>
                              <ToggleSwitch
                                size="sm"
                                color="purple"
                                checked={allOn}
                                disabled={channelDisabled(channel)}
                                onChange={(v) => setCategory(category, channel, v)}
                                ariaLabel={`${t('notifCategoryAll')} ${channelLabel(channel)}`}
                              />
                            </span>
                          )
                        })}
                      </div>

                      {/* Mobile bulk row — same three controls, stacked and
                          labelled, since the grid header above is sm:-only. */}
                      <div className="sm:hidden px-4 py-3 bg-gray-50">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                          {t('notifCategoryAll')}
                        </p>
                        <div className="divide-y divide-gray-200">
                          {CHANNELS.map((channel) => {
                            const Icon = CHANNEL_ICON[channel]
                            const allOn = events.every((e) => displayValue(e.eventType, channel))
                            return (
                              <div key={channel} className="flex items-center justify-between py-2 min-h-[44px]">
                                <span className="flex items-center gap-2 text-sm text-gray-700">
                                  <Icon className="h-4 w-4 text-gray-400" />
                                  {channelLabel(channel)}
                                </span>
                                <ToggleSwitch
                                  size="lg"
                                  color="purple"
                                  checked={allOn}
                                  disabled={channelDisabled(channel)}
                                  onChange={(v) => setCategory(category, channel, v)}
                                  ariaLabel={`${t('notifCategoryAll')} ${channelLabel(channel)}`}
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {events.map((event) => (
                        <div
                          key={event.eventType}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 bg-white"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {t(`notifEvent_${event.eventType}`, event.eventType)}
                              {event.level === 'urgent' && (
                                <span
                                  title={t('notifUrgentExplain')}
                                  aria-label={t('notifUrgentExplain')}
                                  className="ml-2 align-middle inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
                                >
                                  {t('notifUrgentBadge')}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {t(`notifEventDesc_${event.eventType}`, '')}
                            </p>
                          </div>

                          {/* Mobile: three labelled rows. Desktop: three columns
                              aligned to the w-20 header cells above. */}
                          <div className="flex flex-col divide-y divide-gray-100 sm:flex-row sm:items-center sm:gap-4 sm:divide-y-0">
                            {CHANNELS.map((channel) => {
                              const Icon = CHANNEL_ICON[channel]
                              return (
                                <span
                                  key={channel}
                                  className="flex items-center justify-between gap-3 py-2 min-h-[44px] w-full sm:w-20 sm:justify-center sm:py-0 sm:min-h-0"
                                >
                                  {/* Label is mobile-only — the desktop grid
                                      header already names the columns. */}
                                  <span className="flex items-center gap-2 text-sm text-gray-600 sm:hidden">
                                    <Icon className="h-4 w-4 text-gray-400" />
                                    {channelLabel(channel)}
                                  </span>
                                  <span className="relative flex items-center gap-2">
                                    <ToggleSwitch
                                      size="lg"
                                      checked={displayValue(event.eventType, channel)}
                                      disabled={channelDisabled(channel)}
                                      onChange={(v) => setCell(event.eventType, channel, v)}
                                      ariaLabel={`${t(`notifEvent_${event.eventType}`, event.eventType)} - ${channelLabel(channel)}`}
                                    />
                                    {event.overridden[channel] && (
                                      <span
                                        className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-amber-500"
                                        title={t('notifOverriddenHint')}
                                      />
                                    )}
                                  </span>
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Go-dark confirmation. A user can legitimately want silence, but they
          should choose it knowingly rather than discover it by missing a job. */}
      {confirmingGoDark && (
        <Modal isOpen onClose={() => setConfirmingGoDark(false)} style="max-w-sm w-11/12 p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-amber-100 flex items-center justify-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900">{t('notifGoDarkTitle')}</h3>
              <p className="text-xs text-gray-600 mt-1">{t(simple ? 'notifGoDarkBody' : 'notifGoDarkBodyPm')}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button
              type="button"
              onClick={() => setConfirmingGoDark(false)}
              className="flex-1 min-h-[44px] px-4 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 min-h-[44px] px-4 py-2.5 text-sm font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {t('notifGoDarkConfirm')}
            </button>
          </div>
        </Modal>
      )}

      {/* Sticky save bar — appears only when there is something to save. */}
      <AnimatePresence>
        {dirtyCount > 0 && (
          <motion.div
            // A stable key is REQUIRED for AnimatePresence to track presence.
            // Without it the exit animation is unreliable: when dirtyCount hits
            // zero the bar could stay mounted, frozen on its last props —
            // showing a stale count and a stale "Saving..." long after the save
            // had finished and the real state was already clean. React had
            // removed it; only the animation had not.
            key="notification-save-bar"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="sticky bottom-4 flex items-center justify-between gap-3 rounded-xl bg-gray-900 px-4 py-3 shadow-lg"
          >
            <span className="text-sm text-white">
              {t('notifUnsavedChanges', { count: dirtyCount })}
            </span>
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={discard}
                disabled={saving}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-50"
              >
                {saving ? t('savingChanges') : t('notifSaveChanges')}
              </button>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
