// src/store/useUserStore.ts
  import { create } from 'zustand'
  import { persist } from 'zustand/middleware'

  interface UserProfile {
    id: string
    fullName: string
    role: 'ADMIN' | 'PROPERTY-MANAGER' | 'CLIENT'
    email?: string
  }

  interface UserStore {
    profile: UserProfile | null
    isAuthenticated: boolean
    setProfile: (profile: UserProfile) => void
    clearProfile: () => void
    getRedirectPath: () => string
  }

  export const useUserStore = create<UserStore>()(
    persist(
      (set, get) => ({
        profile: null,
        isAuthenticated: false,

        setProfile: (profile: UserProfile) =>
          set({ profile, isAuthenticated: true }),

        clearProfile: () =>
          set({ profile: null, isAuthenticated: false }),

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
          isAuthenticated: state.isAuthenticated
        })
      }
    )
  )