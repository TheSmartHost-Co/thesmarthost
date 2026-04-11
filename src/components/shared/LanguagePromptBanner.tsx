'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlobeAltIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES, type SupportedLanguage } from '@/i18n'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { updateUserProfile } from '@/services/profileService'
import i18n from '@/i18n'

const PROMPT_DISMISSED_KEY = 'i18n-prompt-shown'

export default function LanguagePromptBanner() {
  const profile = useUserStore((s) => s.profile)
  const setProfile = useUserStore((s) => s.setProfile)
  const showNotification = useNotificationStore((s) => s.showNotification)
  const [visible, setVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [detectedLang, setDetectedLang] = useState<SupportedLanguage | null>(null)

  useEffect(() => {
    if (!profile) return
    if (profile.preferredLanguage) return
    if (typeof window !== 'undefined' && localStorage.getItem(PROMPT_DISMISSED_KEY)) return

    const browserLang = navigator.language?.substring(0, 2) as SupportedLanguage
    if (browserLang && browserLang !== 'en' && SUPPORTED_LANGUAGES.includes(browserLang)) {
      setDetectedLang(browserLang)
      setVisible(true)
    }
  }, [profile])

  const saveLanguage = async (lang: SupportedLanguage) => {
    if (!profile) return
    setSaving(true)

    i18n.changeLanguage(lang)
    localStorage.setItem(PROMPT_DISMISSED_KEY, 'true')

    try {
      const res = await updateUserProfile(profile.id, {
        fullName: profile.fullName,
        role: profile.role,
        preferredLanguage: lang,
      })
      if (res.status === 'success' && res.data) {
        setProfile({ ...profile, preferredLanguage: res.data.preferredLanguage })
      }
    } catch (err) {
      console.error('Failed to save language preference:', err)
      showNotification('Failed to save language preference', 'error')
    } finally {
      setSaving(false)
      setVisible(false)
    }
  }

  if (!visible || !detectedLang) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="rounded-xl bg-blue-50 border border-blue-200 p-4 mb-6"
      >
        <div className="flex items-start gap-3">
          <GlobeAltIcon className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              It looks like your browser is set to {LANGUAGE_NAMES[detectedLang]}. Would you like to use {LANGUAGE_NAMES[detectedLang]} for TheSmartHost?
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => saveLanguage(detectedLang)}
                disabled={saving}
                className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {saving ? 'Saving...' : `Yes, switch to ${LANGUAGE_NAMES[detectedLang]}`}
              </button>
              <button
                onClick={() => saveLanguage('en')}
                disabled={saving}
                className="inline-flex items-center rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Keep English
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.setItem(PROMPT_DISMISSED_KEY, 'true')
              setVisible(false)
            }}
            className="text-blue-400 hover:text-blue-600 cursor-pointer"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
