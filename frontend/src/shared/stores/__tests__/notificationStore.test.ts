import { describe, it, expect, beforeEach } from 'vitest'
import { useNotificationStore } from '../notificationStore'
import type { NotificationItem } from '../notificationStore'

const makeNotif = (overrides: Partial<NotificationItem> = {}): NotificationItem => ({
  id: 1,
  type: 'info',
  title: 'Test notification',
  message: 'Details',
  read: false,
  device_id: null,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
})

describe('notificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      toast: null,
    })
  })

  describe('setNotifications', () => {
    it('sets notifications and unread count', () => {
      const notifs = [makeNotif({ id: 1 }), makeNotif({ id: 2 })]
      useNotificationStore.getState().setNotifications(notifs, 2)
      expect(useNotificationStore.getState().notifications).toHaveLength(2)
      expect(useNotificationStore.getState().unreadCount).toBe(2)
    })
  })

  describe('addNotification', () => {
    it('prepends notification and sets toast', () => {
      useNotificationStore.getState().setNotifications([makeNotif({ id: 1 })], 1)
      const newNotif = makeNotif({ id: 2, title: 'New' })
      useNotificationStore.getState().addNotification(newNotif)
      const store = useNotificationStore.getState()
      expect(store.notifications[0].id).toBe(2)
      expect(store.notifications).toHaveLength(2)
      expect(store.unreadCount).toBe(2)
      expect(store.toast?.id).toBe(2)
    })
  })

  describe('markRead', () => {
    it('marks specific notification as read', () => {
      useNotificationStore.getState().setNotifications(
        [makeNotif({ id: 1 }), makeNotif({ id: 2 })],
        2,
      )
      useNotificationStore.getState().markRead(1)
      const store = useNotificationStore.getState()
      expect(store.notifications.find(n => n.id === 1)?.read).toBe(true)
      expect(store.notifications.find(n => n.id === 2)?.read).toBe(false)
      expect(store.unreadCount).toBe(1)
    })

    it('does not go below zero', () => {
      useNotificationStore.getState().setNotifications([makeNotif({ id: 1 })], 0)
      useNotificationStore.getState().markRead(1)
      expect(useNotificationStore.getState().unreadCount).toBe(0)
    })
  })

  describe('markAllRead', () => {
    it('marks all as read and resets count', () => {
      useNotificationStore.getState().setNotifications(
        [makeNotif({ id: 1 }), makeNotif({ id: 2 })],
        2,
      )
      useNotificationStore.getState().markAllRead()
      const store = useNotificationStore.getState()
      expect(store.notifications.every(n => n.read)).toBe(true)
      expect(store.unreadCount).toBe(0)
    })
  })

  describe('dismissToast', () => {
    it('clears toast', () => {
      useNotificationStore.getState().addNotification(makeNotif())
      expect(useNotificationStore.getState().toast).not.toBeNull()
      useNotificationStore.getState().dismissToast()
      expect(useNotificationStore.getState().toast).toBeNull()
    })
  })
})
