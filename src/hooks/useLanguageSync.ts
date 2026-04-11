'use client'

import { useEffect } from 'react'
import { useUserStore } from '@/store/useUserStore'
import i18n from '@/i18n'

/**
 * Syncs the i18next language with the user's preferred language from their profile.
 * When the profile loads and has a preferredLanguage, i18next switches to it.
 * When preferredLanguage is null/undefined, browser detection remains active.
 */
export function useLanguageSync() {
  const preferredLanguage = useUserStore((s) => s.profile?.preferredLanguage)

  useEffect(() => {
    if (preferredLanguage && preferredLanguage !== i18n.language) {
      i18n.changeLanguage(preferredLanguage)
    }
  }, [preferredLanguage])
}
