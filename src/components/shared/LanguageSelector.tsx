'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { GlobeAltIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, LANGUAGE_NAMES, type SupportedLanguage } from '@/i18n'
import { useUserStore } from '@/store/useUserStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { updateUserProfile } from '@/services/profileService'
import i18n from '@/i18n'

interface LanguageSelectorProps {
  delay?: number
}

export default function LanguageSelector({ delay = 0.05 }: LanguageSelectorProps) {
  const { t } = useTranslation('settings')
  const profile = useUserStore((s) => s.profile)
  const setProfile = useUserStore((s) => s.setProfile)
  const showNotification = useNotificationStore((s) => s.showNotification)
  const [saving, setSaving] = useState(false)

  const currentLanguage = (i18n.language?.substring(0, 2) as SupportedLanguage) || 'en'

  const handleLanguageChange = async (lang: SupportedLanguage) => {
    if (lang === currentLanguage || !profile) return

    i18n.changeLanguage(lang)
    setSaving(true)

    try {
      const res = await updateUserProfile(profile.id, {
        fullName: profile.fullName,
        role: profile.role,
        preferredLanguage: lang,
      })
      if (res.status === 'success' && res.data) {
        setProfile({
          ...profile,
          preferredLanguage: res.data.preferredLanguage,
        })
        showNotification(t('languageUpdated'), 'success')
      } else {
        showNotification(res.message || t('error'), 'error')
      }
    } catch (err) {
      console.error('Failed to save language:', err)
      showNotification(err instanceof Error ? err.message : 'Network error', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <GlobeAltIcon className="h-5 w-5 text-emerald-600" />
        <h2 className="text-base font-semibold text-gray-900">{t('language')}</h2>
      </div>
      <div className="p-5">
        <p className="text-sm text-gray-500 mb-4">{t('languageSubtitle')}</p>
        <div className="space-y-2">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              disabled={saving}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
                currentLanguage === lang
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="text-sm font-medium">{LANGUAGE_NAMES[lang]}</span>
              {currentLanguage === lang && (
                <CheckIcon className="h-4 w-4 text-emerald-600" />
              )}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
