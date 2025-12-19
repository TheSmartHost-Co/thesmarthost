// src/store/useUserStore.ts
  import { create } from 'zustand'
  import { persist } from 'zustand/middleware'

  interface UserProfile {
    id: string
    fullName: string
    role: 'ADMIN' | 'PROPERTY-MANAGER' | 'CLIENT'
    email?: string
    phoneNumber?: string | null
    companyName?: string | null
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