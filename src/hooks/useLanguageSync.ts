'use client'

import { useEffect } from 'react'
import { useUserStore } from '@/store/useUserStore'
import i18n, { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n'

/**
 * Syncs the i18next language with the user's preferred language from their profile.
 * Runs client-side after hydration to avoid SSR mismatch.
 *
 * Priority:
 * 1. Profile's preferredLanguage (if set) — backend is the source of truth
 * 2. Browser language detection (for first-time users before they choose)
 * 3. English fallback
 */
export function useLanguageSync() {
  const preferredLanguage = useUserStore((s) => s.profile?.preferredLanguage)
  const isAuthenticated = useUserStore((s) => s.isAuthenticated)

  useEffect(() => {
    if (preferredLanguage && preferredLanguage !== i18n.language) {
      i18n.changeLanguage(preferredLanguage)
      return
    }

    // For authenticated users without a preference, detect from browser
    if (isAuthenticated && !preferredLanguage) {
      const browserLang = navigator.language?.substring(0, 2) as SupportedLanguage
      if (browserLang && SUPPORTED_LANGUAGES.includes(browserLang) && browserLang !== i18n.language) {
        i18n.changeLanguage(browserLang)
      }
    }
  }, [preferredLanguage, isAuthenticated])
}
