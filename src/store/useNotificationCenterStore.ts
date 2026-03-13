import { create } from 'zustand'
import type { InAppNotification, NotificationCategory } from '@/services/types/notificationCenter'

export type NotificationFilter = 'urgent' | 'all' | NotificationCategory

interface NotificationCenterState {
  // Data
  notifications: InAppNotification[]
  unreadCount: number
  urgentUnreadCount: number

  // UI state
  isPanelOpen: boolean
  activeFilter: NotificationFilter
  isLoading: boolean

  // Actions
  setNotifications: (notifications: InAppNotification[]) => void
  setUnreadCount: (unreadCount: number, urgentUnreadCount: number) => void
  togglePanel: () => void
  closePanel: () => void
  setActiveFilter: (filter: NotificationFilter) => void
  setLoading: (loading: boolean) => void
  markAsReadOptimistic: (notificationId: string) => void
  markAllAsReadOptimistic: () => void
  reset: () => void
}

export const useNotificationCenterStore = create<NotificationCenterState>()((set) => ({
  notifications: [],
  unreadCount: 0,
  urgentUnreadCount: 0,
  isPanelOpen: false,
  activeFilter: 'all',
  isLoading: false,

  setNotifications: (notifications) => set({ notifications }),

  setUnreadCount: (unreadCount, urgentUnreadCount) =>
    set({ unreadCount, urgentUnreadCount }),

  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

  closePanel: () => set({ isPanelOpen: false }),

  setActiveFilter: (filter) => set({ activeFilter: filter }),

  setLoading: (loading) => set({ isLoading: loading }),

  markAsReadOptimistic: (notificationId) =>
    set((state) => {
      const notification = state.notifications.find((n) => n.id === notificationId)
      if (!notification || notification.isRead) return state

      const wasUrgent = notification.isUrgent
      return {
        notifications: state.notifications.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
        urgentUnreadCount: wasUrgent
          ? Math.max(0, state.urgentUnreadCount - 1)
          : state.urgentUnreadCount,
      }
    }),

  markAllAsReadOptimistic: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
      urgentUnreadCount: 0,
    })),

  reset: () =>
    set({
      notifications: [],
      unreadCount: 0,
      urgentUnreadCount: 0,
      isPanelOpen: false,
      activeFilter: 'all',
      isLoading: false,
    }),
}))
