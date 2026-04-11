'use client'

import { useEffect, useState } from 'react'
import i18n from '@/i18n'
import { I18nextProvider } from 'react-i18next'

export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(i18n.isInitialized)

  useEffect(() => {
    if (!i18n.isInitialized) {
      const onInit = () => setIsReady(true)
      i18n.on('initialized', onInit)
      return () => { i18n.off('initialized', onInit) }
    }
  }, [])

  useEffect(() => {
    const updateHtmlLang = (lng: string) => {
      document.documentElement.lang = lng
    }
    updateHtmlLang(i18n.language)
    i18n.on('languageChanged', updateHtmlLang)
    return () => { i18n.off('languageChanged', updateHtmlLang) }
  }, [])

  if (!isReady) return null

  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  )
}
