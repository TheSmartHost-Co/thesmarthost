// src/store/useUserStore.ts
  import { create } from 'zustand'
  import { persist } from 'zustand/middleware'
  import type { Permissions } from '@/constants/permissionTemplates'

  interface UserProfile {
    id: string
    fullName: string
    role: 'ADMIN' | 'PROPERTY-MANAGER' | 'CLIENT' | 'CLEANER' | 'TEAM_MEMBER'
    email?: string
    phoneNumber?: string | null
    companyName?: string | null
    // PM branding (rendered on paystub/report PDFs)
    companyAddress?: string | null
    companyPhone?: string | null
    companyEmail?: string | null
    smsNotificationsEnabled?: boolean
    emailNotificationsEnabled?: boolean
    autoImport?: boolean | null
    preferredLanguage?: 'en' | 'fr' | 'es' | null
    pmUserId?: string | null       // PM's userId (for team members, used in API calls)
    permissions?: Permissions | null // Page-level permissions (for team members)
    timezone?: string | null       // PM's IANA timezone (e.g. 'America/Toronto'). Inherited by team members.
  }

  interface UserStore {
    profile: UserProfile | null
    isAuthenticated: boolean
    accessToken: string | null // Deprecated: Use Supabase session instead
    lastSessionCheck: number | null
    setProfile: (profile: UserProfile) => void
    setAccessToken: (token: string) => void // Deprecated: Use Supabase session instead
    clearProfile: () => void
    getRedirectPath: () => string
    updateSessionCheck: () => void
    isSessionStale: () => boolean
  }

  export const useUserStore = create<UserStore>()(
    persist(
      (set, get) => ({
        profile: null,
        isAuthenticated: false,
        accessToken: null, // Deprecated: Use Supabase session instead
        lastSessionCheck: null,

        setProfile: (profile: UserProfile) =>
          set({ profile, isAuthenticated: true, lastSessionCheck: Date.now() }),

        setAccessToken: (token: string) =>
          set({ accessToken: token }), // Deprecated: Use Supabase session instead

        clearProfile: () =>
          set({ 
            profile: null, 
            isAuthenticated: false, 
            accessToken: null,
            lastSessionCheck: null
          }),

        updateSessionCheck: () =>
          set({ lastSessionCheck: Date.now() }),

        isSessionStale: () => {
          const { lastSessionCheck } = get()
          if (!lastSessionCheck) return true
          
          // Consider session stale if last check was more than 5 minutes ago
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
          return lastSessionCheck < fiveMinutesAgo
        },

        getRedirectPath: () => {
          const { profile } = get()
          if (!profile) return '/login'

          switch (profile.role) {
            case 'ADMIN':
              return '/admin/dashboard'
            case 'PROPERTY-MANAGER':
              return '/property-manager/dashboard'
            case 'CLIENT':
              return '/client/dashboard'
            case 'CLEANER':
              return '/cleaner/dashboard'
            case 'TEAM_MEMBER':
              return '/property-manager/dashboard'
            default:
              return '/dashboard'
          }
        }
      }),
      {
        name: 'user-storage',
        partialize: (state) => ({
          profile: state.profile,
          isAuthenticated: state.isAuthenticated,
          accessToken: state.accessToken, // Deprecated but kept for backward compatibility
          lastSessionCheck: state.lastSessionCheck
        })
      }
    )
  )