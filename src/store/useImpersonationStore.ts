import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface ImpersonationTarget {
  type: 'client' | 'cleaner'
  id: string       // DB record ID
  name: string     // Display name for banner
  role: 'CLIENT' | 'CLEANER'
}

interface ImpersonationStore {
  target: ImpersonationTarget | null
  isImpersonating: boolean
  startImpersonation: (target: ImpersonationTarget) => void
  stopImpersonation: () => void
  getImpersonationHeader: () => string | null
}

export const useImpersonationStore = create<ImpersonationStore>()(
  persist(
    (set, get) => ({
      target: null,
      isImpersonating: false,

      startImpersonation: (target: ImpersonationTarget) =>
        set({ target, isImpersonating: true }),

      stopImpersonation: () =>
        set({ target: null, isImpersonating: false }),

      getImpersonationHeader: () => {
        const { target, isImpersonating } = get()
        if (!isImpersonating || !target) return null

        // Only send the header when on the impersonated portal's routes
        if (typeof window !== 'undefined') {
          const path = window.location.pathname
          if (target.type === 'client' && !path.startsWith('/client')) return null
          if (target.type === 'cleaner' && !path.startsWith('/cleaner')) return null
        }

        return `${target.type}:${target.id}`
      }
    }),
    {
      name: 'impersonation-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        target: state.target,
        isImpersonating: state.isImpersonating,
      })
    }
  )
)
