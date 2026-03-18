import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarStore {
  isCollapsed: boolean
  expandedGroups: Record<string, boolean>
  toggleCollapsed: () => void
  setCollapsed: (collapsed: boolean) => void
  toggleGroup: (label: string) => void
  setGroupExpanded: (label: string, expanded: boolean) => void
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      isCollapsed: false,
      expandedGroups: {},
      toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
      toggleGroup: (label) =>
        set((state) => ({
          expandedGroups: {
            ...state.expandedGroups,
            [label]: !state.expandedGroups[label],
          },
        })),
      setGroupExpanded: (label, expanded) =>
        set((state) => ({
          expandedGroups: {
            ...state.expandedGroups,
            [label]: expanded,
          },
        })),
    }),
    {
      name: 'sidebar-storage',
    }
  )
)
