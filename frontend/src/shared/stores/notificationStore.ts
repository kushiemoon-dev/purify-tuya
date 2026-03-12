import { create } from 'zustand'

export interface NotificationItem {
  readonly id: number
  readonly type: string
  readonly title: string
  readonly message: string
  readonly read: boolean
  readonly device_id: number | null
  readonly created_at: string | null
}

interface NotificationStore {
  readonly notifications: readonly NotificationItem[]
  readonly unreadCount: number
  readonly toast: NotificationItem | null

  setNotifications: (notifications: NotificationItem[], unreadCount: number) => void
  addNotification: (notif: NotificationItem) => void
  markRead: (id: number) => void
  markAllRead: () => void
  dismissToast: () => void
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  toast: null,

  setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),

  addNotification: (notif) => set((prev) => ({
    notifications: [notif, ...prev.notifications],
    unreadCount: prev.unreadCount + 1,
    toast: notif,
  })),

  markRead: (id) => set((prev) => ({
    notifications: prev.notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    ),
    unreadCount: Math.max(0, prev.unreadCount - 1),
  })),

  markAllRead: () => set((prev) => ({
    notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    unreadCount: 0,
  })),

  dismissToast: () => set({ toast: null }),
}))
