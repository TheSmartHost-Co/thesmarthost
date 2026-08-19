import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
// Language detection is handled client-side by useLanguageSync hook after hydration

// Import all translation files directly so they're bundled and available immediately
import enCommon from '../../public/locales/en/common.json'
import enNav from '../../public/locales/en/nav.json'
import enSettings from '../../public/locales/en/settings.json'
import enDashboard from '../../public/locales/en/dashboard.json'
import enProperties from '../../public/locales/en/properties.json'
import enClients from '../../public/locales/en/clients.json'
import enBookings from '../../public/locales/en/bookings.json'
import enReports from '../../public/locales/en/reports.json'
import enAnalytics from '../../public/locales/en/analytics.json'
import enExpenses from '../../public/locales/en/expenses.json'
import enTurnover from '../../public/locales/en/turnover.json'
import enCleanerPortal from '../../public/locales/en/cleanerPortal.json'
import enContractorPortal from '../../public/locales/en/contractorPortal.json'
import enClientPortal from '../../public/locales/en/clientPortal.json'
import enAuth from '../../public/locales/en/auth.json'
import enErrors from '../../public/locales/en/errors.json'
import enAudit from '../../public/locales/en/audit.json'
import enFeedback from '../../public/locales/en/feedback.json'

import frCommon from '../../public/locales/fr/common.json'
import frNav from '../../public/locales/fr/nav.json'
import frSettings from '../../public/locales/fr/settings.json'
import frDashboard from '../../public/locales/fr/dashboard.json'
import frProperties from '../../public/locales/fr/properties.json'
import frClients from '../../public/locales/fr/clients.json'
import frBookings from '../../public/locales/fr/bookings.json'
import frReports from '../../public/locales/fr/reports.json'
import frAnalytics from '../../public/locales/fr/analytics.json'
import frExpenses from '../../public/locales/fr/expenses.json'
import frTurnover from '../../public/locales/fr/turnover.json'
import frCleanerPortal from '../../public/locales/fr/cleanerPortal.json'
import frContractorPortal from '../../public/locales/fr/contractorPortal.json'
import frClientPortal from '../../public/locales/fr/clientPortal.json'
import frAuth from '../../public/locales/fr/auth.json'
import frErrors from '../../public/locales/fr/errors.json'
import frAudit from '../../public/locales/fr/audit.json'
import frFeedback from '../../public/locales/fr/feedback.json'

import esCommon from '../../public/locales/es/common.json'
import esNav from '../../public/locales/es/nav.json'
import esSettings from '../../public/locales/es/settings.json'
import esDashboard from '../../public/locales/es/dashboard.json'
import esProperties from '../../public/locales/es/properties.json'
import esClients from '../../public/locales/es/clients.json'
import esBookings from '../../public/locales/es/bookings.json'
import esReports from '../../public/locales/es/reports.json'
import esAnalytics from '../../public/locales/es/analytics.json'
import esExpenses from '../../public/locales/es/expenses.json'
import esTurnover from '../../public/locales/es/turnover.json'
import esCleanerPortal from '../../public/locales/es/cleanerPortal.json'
import esContractorPortal from '../../public/locales/es/contractorPortal.json'
import esClientPortal from '../../public/locales/es/clientPortal.json'
import esAuth from '../../public/locales/es/auth.json'
import esErrors from '../../public/locales/es/errors.json'
import esAudit from '../../public/locales/es/audit.json'
import esFeedback from '../../public/locales/es/feedback.json'

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'es'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
}

i18n
  .use(initReactI18next)
  .init({
    // Start with English to match server-rendered HTML and avoid hydration mismatch.
    // Client-side language switch happens in useLanguageSync after hydration.
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LANGUAGES],
    debug: process.env.NODE_ENV === 'development',

    ns: [
      'common', 'nav', 'settings', 'dashboard', 'properties', 'clients',
      'bookings', 'reports', 'analytics', 'expenses', 'turnover',
      'cleanerPortal', 'contractorPortal', 'clientPortal', 'auth', 'errors', 'audit',
      'cleanerPortal', 'clientPortal', 'auth', 'errors', 'audit', 'feedback',
    ],
    defaultNS: 'common',

    resources: {
      en: {
        common: enCommon, nav: enNav, settings: enSettings, dashboard: enDashboard,
        properties: enProperties, clients: enClients, bookings: enBookings,
        reports: enReports, analytics: enAnalytics, expenses: enExpenses,
        turnover: enTurnover, cleanerPortal: enCleanerPortal, contractorPortal: enContractorPortal, clientPortal: enClientPortal,
        auth: enAuth, errors: enErrors, audit: enAudit,
        feedback: enFeedback,
      },
      fr: {
        common: frCommon, nav: frNav, settings: frSettings, dashboard: frDashboard,
        properties: frProperties, clients: frClients, bookings: frBookings,
        reports: frReports, analytics: frAnalytics, expenses: frExpenses,
        turnover: frTurnover, cleanerPortal: frCleanerPortal, contractorPortal: frContractorPortal, clientPortal: frClientPortal,
        auth: frAuth, errors: frErrors, audit: frAudit,
        feedback: frFeedback,
      },
      es: {
        common: esCommon, nav: esNav, settings: esSettings, dashboard: esDashboard,
        properties: esProperties, clients: esClients, bookings: esBookings,
        reports: esReports, analytics: esAnalytics, expenses: esExpenses,
        turnover: esTurnover, cleanerPortal: esCleanerPortal, contractorPortal: esContractorPortal, clientPortal: esClientPortal,
        auth: esAuth, errors: esErrors, audit: esAudit,
        feedback: esFeedback,
      },
    },

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },

  })

export default i18n
