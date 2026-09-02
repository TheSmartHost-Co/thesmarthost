'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getNotificationPreferences,
  resetNotificationPreferences,
  updateNotificationPreferences,
} from '@/services/notificationPreferencesService'
import { useUserStore } from '@/store/useUserStore'
import {
  NotificationChannel,
  NotificationPreferencesData,
  NotificationPresetKey,
  PreferenceUpdateEntry,
} from '@/services/types/notificationPreferences'

/**
 * Loads the preference matrix and accumulates edits into a dirty map until the
 * user saves.
 *
 * Deliberately batched rather than save-per-toggle (the pattern the rest of the
 * settings page uses): the matrix has ~150 cells, and a bulk or reset action
 * changes dozens at once. Per-toggle saving would fire dozens of sequential
 * PUTs and leave the user with a half-saved page if one failed.
 *
 * No Zustand store: this data is page-local, non-persisted, and read by exactly
 * one component tree.
 */
export function useNotificationPreferences() {
  const profile = useUserStore((s) => s.profile)
  const setProfile = useUserStore((s) => s.setProfile)

  const [data, setData] = useState<NotificationPreferencesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** `eventType:channel` -> desired value, for cells changed since the last save. */
  const [dirty, setDirty] = useState<Record<string, boolean>>({})
  /**
   * The preset the user just tapped, before it has been saved.
   *
   * Tracked separately from `dirty` because applying a preset necessarily makes
   * the form dirty — so deriving the highlight from dirtiness alone made every
   * preset clear its own highlight the moment it was chosen.
   */
  const [pendingPreset, setPendingPreset] = useState<NotificationPresetKey | null>(null)
  /**
   * Pending changes to the two account-wide master switches.
   *
   * These used to write immediately on tap, which meant there was no save
   * moment to interrupt — so the "you'll go dark" warning could never fire, and
   * one screen had two different save models. They now join the same batch as
   * everything else. null = unchanged.
   */
  const [masterDraft, setMasterDraft] = useState<{ email: boolean | null; sms: boolean | null }>({
    email: null,
    sms: null,
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getNotificationPreferences()
      if (res.status === 'success' && res.data) {
        setData(res.data)
        setDirty({})
        setPendingPreset(null)
      } else {
        setError(res.message || 'Failed to load notification preferences')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const cellKey = (eventType: string, channel: NotificationChannel) => `${eventType}:${channel}`

  /**
   * The user's SAVED preference for a cell, with the master switch NOT applied.
   *
   * Deliberately not `event.effective`, which the server has already gated by
   * the master switch. `effective` conflates two separate facts — "what the user
   * chose" and "is the channel switched on at all" — so with a master off it
   * reads false for every event. Re-enabling that master in-session then had
   * nothing to re-derive from: the readback still claimed nothing would be
   * delivered, and saving fired the destructive all-off warning even though the
   * user's stored preferences were all true.
   */
  const savedValue = useCallback(
    (eventType: string, channel: NotificationChannel): boolean => {
      const event = data?.events.find((e) => e.eventType === eventType)
      if (!event) return false
      return event.overridden[channel]
        ? Boolean(data?.overrides?.[cellKey(eventType, channel)])
        : event.isDefault[channel]
    },
    [data]
  )

  /**
   * What the cell is set to: the pending edit if any, else the saved preference.
   * UNGATED — callers apply the master switch themselves, at render time.
   */
  const isEnabled = useCallback(
    (eventType: string, channel: NotificationChannel): boolean => {
      const key = cellKey(eventType, channel)
      if (key in dirty) return dirty[key]
      return savedValue(eventType, channel)
    },
    [dirty, savedValue]
  )

  /**
   * Record one cell edit into the dirty map, or REMOVE it if the value now
   * matches what the server last gave us.
   *
   * Tracking net change rather than "was touched" is what makes toggling a
   * switch off and back on correctly report zero unsaved changes — and stops
   * the category bulk row from manufacturing a dozen phantom changes when you
   * set a whole column on and then off again.
   */
  const applyEdit = useCallback(
    (
      draft: Record<string, boolean>,
      eventType: string,
      channel: NotificationChannel,
      value: boolean
    ) => {
      const key = cellKey(eventType, channel)
      // Compare against the UNGATED saved value, or net-change tracking breaks
      // whenever a master is off: every cell would look "changed".
      const saved = savedValue(eventType, channel)

      if (saved === value) delete draft[key]
      else draft[key] = value
    },
    [savedValue]
  )

  const setCell = useCallback(
    (eventType: string, channel: NotificationChannel, value: boolean) => {
      // A hand-edit means the state is no longer "a preset" — a preset is a
      // shortcut, not a mode.
      setPendingPreset(null)
      setDirty((prev) => {
        const next = { ...prev }
        applyEdit(next, eventType, channel, value)
        return next
      })
    },
    [applyEdit]
  )

  /** Set one channel across every event in a category (the per-category bulk row). */
  const setCategory = useCallback(
    (category: string, channel: NotificationChannel, value: boolean) => {
      if (!data) return
      setPendingPreset(null)
      setDirty((prev) => {
        const next = { ...prev }
        for (const event of data.events) {
          if (event.category === category) applyEdit(next, event.eventType, channel, value)
        }
        return next
      })
    },
    [data, applyEdit]
  )

  /**
   * Stage a whole preset into the dirty map.
   *
   * Goes through the same edit path as a manual toggle — so it respects
   * net-change tracking (choosing the preset you're already on marks nothing
   * dirty), and it saves through the normal Save button rather than writing
   * behind the user's back.
   */
  const applyPreset = useCallback(
    (key: NotificationPresetKey) => {
      const preset = data?.presets?.find((p) => p.key === key)
      if (!preset) return

      setPendingPreset(key)
      setDirty((prev) => {
        const next = { ...prev }
        for (const row of preset.rows) applyEdit(next, row.eventType, row.channel, row.enabled)
        return next
      })
    },
    [data, applyEdit]
  )

  /**
   * What the UI highlights: the preset staged locally if there is one, else the
   * server's answer for the saved state. Null means "custom".
   */
  const activePreset = useMemo<NotificationPresetKey | null>(
    () => pendingPreset ?? (Object.keys(dirty).length > 0 ? null : data?.activePreset ?? null),
    [data, dirty, pendingPreset]
  )

  const setMaster = useCallback((channel: 'email' | 'sms', value: boolean) => {
    setMasterDraft((prev) => ({
      ...prev,
      // Back to the saved value means no longer dirty, matching how cells work.
      [channel]: data?.master[channel === 'email' ? 'emailEnabled' : 'smsEnabled'] === value ? null : value,
    }))
  }, [data])

  /** Master value to render: the pending edit if any, else what the server holds. */
  const masterValue = useCallback(
    (channel: 'email' | 'sms'): boolean => {
      const pending = masterDraft[channel]
      if (pending !== null) return pending
      return data ? data.master[channel === 'email' ? 'emailEnabled' : 'smsEnabled'] : true
    },
    [data, masterDraft]
  )

  const masterDirtyCount = useMemo(
    () => (masterDraft.email !== null ? 1 : 0) + (masterDraft.sms !== null ? 1 : 0),
    [masterDraft]
  )

  const dirtyCount = useMemo(
    () => Object.keys(dirty).length + masterDirtyCount,
    [dirty, masterDirtyCount]
  )

  const discard = useCallback(() => {
    setDirty({})
    setPendingPreset(null)
    setMasterDraft({ email: null, sms: null })
  }, [])

  const save = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
    if (!data) return { ok: true }
    const hasMasterChange = masterDraft.email !== null || masterDraft.sms !== null
    if (Object.keys(dirty).length === 0 && !hasMasterChange) return { ok: true }

    const preferences: PreferenceUpdateEntry[] = Object.entries(dirty).map(([key, enabled]) => {
      // Split on the LAST colon: channels contain no colon, but event types
      // are free-form strings, so this is the safe direction to split.
      const index = key.lastIndexOf(':')
      return {
        eventType: key.slice(0, index),
        channel: key.slice(index + 1) as NotificationChannel,
        enabled,
      }
    })

    setSaving(true)
    try {
      // ONE request. The masters live on `profiles` and the per-event rows in
      // `notification_preferences`, but the endpoint writes both in a single
      // transaction — previously this was two sequential PUTs behind one Save
      // button, so the second failing left the user half-saved with no signal.
      const master = hasMasterChange
        ? {
            ...(masterDraft.email !== null ? { emailEnabled: masterDraft.email } : {}),
            ...(masterDraft.sms !== null ? { smsEnabled: masterDraft.sms } : {}),
          }
        : undefined

      const res = await updateNotificationPreferences(preferences, master)
      if (res.status !== 'success' || !res.data) {
        return { ok: false, message: res.message || 'Failed to save notification preferences' }
      }

      setData(res.data)
      setDirty({})
      setPendingPreset(null)
      setMasterDraft({ email: null, sms: null })

      // Keep the store in step — the matrix reads master state from it, and the
      // server is authoritative on what actually landed (e.g. SMS coerced off
      // when there is no phone).
      if (hasMasterChange && profile) {
        setProfile({
          ...profile,
          emailNotificationsEnabled: res.data.master.emailEnabled,
          smsNotificationsEnabled: res.data.master.smsEnabled,
        })
      }

      return { ok: true }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Network error' }
    } finally {
      setSaving(false)
    }
    // `load` is deliberately absent: save() no longer refetches — the PUT
    // response is now the single source of the post-save state.
  }, [data, dirty, masterDraft, profile, setProfile])

  const reset = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
    setSaving(true)
    try {
      const res = await resetNotificationPreferences()
      if (res.status === 'success' && res.data) {
        setData(res.data)
        setDirty({})
        setPendingPreset(null)
        return { ok: true }
      }
      return { ok: false, message: res.message || 'Failed to reset notification preferences' }
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Network error' }
    } finally {
      setSaving(false)
    }
  }, [])

  /** Events grouped by category, preserving the backend's ordering. */
  const byCategory = useMemo(() => {
    const groups: { category: string; events: NotificationPreferencesData['events'] }[] = []
    for (const event of data?.events ?? []) {
      const existing = groups.find((g) => g.category === event.category)
      if (existing) existing.events.push(event)
      else groups.push({ category: event.category, events: [event] })
    }
    return groups
  }, [data])

  return {
    data,
    byCategory,
    loading,
    saving,
    error,
    dirty,
    dirtyCount,
    isEnabled,
    savedValue,
    setCell,
    setCategory,
    save,
    reset,
    discard,
    reload: load,
    presets: data?.presets ?? [],
    activePreset,
    applyPreset,
    setMaster,
    masterValue,
  }
}
