import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarStore {
  isCollapsed: boolean
  expandedGroups: Record<string, boolean>
  pendingSupplyCount: number
  toggleCollapsed: () => void
  setCollapsed: (collapsed: boolean) => void
  toggleGroup: (label: string) => void
  setGroupExpanded: (label: string, expanded: boolean) => void
  setPendingSupplyCount: (n: number) => void
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isCollapsed: false,
      expandedGroups: {},
      pendingSupplyCount: 0,
      toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
      toggleGroup: (label) =>
        set((state) => ({
          expandedGroups: {
            ...state.expandedGroups,
            [label]: !(state.expandedGroups[label] ?? true),
          },
        })),
      setGroupExpanded: (label, expanded) =>
        set((state) => ({
          expandedGroups: {
            ...state.expandedGroups,
            [label]: expanded,
          },
        })),
      setPendingSupplyCount: (n) => set({ pendingSupplyCount: n }),
    }),
    {
      name: 'sidebar-storage',
    }
  )
)
