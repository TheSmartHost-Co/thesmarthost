import { create } from 'zustand'
import type { CleanerEarningsData } from '@/services/types/cleanerEarnings'

interface CleanerEarningsState {
  data: CleanerEarningsData | null
  isLoading: boolean
  error: string | null

  setData: (data: CleanerEarningsData | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useCleanerEarningsStore = create<CleanerEarningsState>((set) => ({
  data: null,
  isLoading: false,
  error: null,

  setData: (data) => set({ data, error: null }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () => set({ data: null, isLoading: false, error: null }),
}))
