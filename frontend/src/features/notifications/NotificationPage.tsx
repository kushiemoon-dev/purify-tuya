import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from '@/shared/lib/api'
import { useNotificationStore, type NotificationItem } from '@/shared/stores/notificationStore'

export function NotificationPage() {
  const { t } = useTranslation()
  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const setNotifications = useNotificationStore((s) => s.setNotifications)
  const markRead = useNotificationStore((s) => s.markRead)
  const markAllRead = useNotificationStore((s) => s.markAllRead)

  const load = useCallback(async () => {
    try {
      const res = await fetchNotifications()
      setNotifications(res.notifications as NotificationItem[], res.unread_count)
    } catch {
      // ignore
    }
  }, [setNotifications])

  useEffect(() => {
    load()
  }, [load])

  const handleMarkRead = async (id: number) => {
    markRead(id)
    await markNotificationRead(id)
  }

  const handleMarkAllRead = async () => {
    markAllRead()
    await markAllNotificationsRead()
  }

  const formatTime = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="controls">
      <div className="card-header">
        <h2 className="page-title">{t('notification.title')}</h2>
        {unreadCount > 0 && (
          <button className="pill active" onClick={handleMarkAllRead}>
            {t('notification.markAllRead')}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card">
          <p className="settings-list__empty">{t('notification.empty')}</p>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`card notification-item ${!notif.read ? 'notification-item--unread' : ''}`}
              onClick={() => !notif.read && handleMarkRead(notif.id)}
            >
              <div className="notification-item__header">
                <span className={`notification-item__type notification-item__type--${notif.type}`}>
                  {notif.type}
                </span>
                <span className="notification-item__time">{formatTime(notif.created_at)}</span>
              </div>
              <div className="notification-item__title">{notif.title}</div>
              {notif.message && <div className="notification-item__message">{notif.message}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
