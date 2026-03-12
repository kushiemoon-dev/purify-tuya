import { useEffect } from 'react'
import { useNotificationStore } from '@/shared/stores/notificationStore'

export function NotificationToast() {
  const toast = useNotificationStore((s) => s.toast)
  const dismissToast = useNotificationStore((s) => s.dismissToast)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(dismissToast, 4000)
    return () => clearTimeout(timer)
  }, [toast, dismissToast])

  if (!toast) return null

  const typeClass = toast.type === 'alert' ? 'toast--alert' : toast.type === 'warning' ? 'toast--warning' : 'toast--info'

  return (
    <div className={`notification-toast ${typeClass}`} onClick={dismissToast}>
      <div className="notification-toast__title">{toast.title}</div>
      {toast.message && <div className="notification-toast__message">{toast.message}</div>}
    </div>
  )
}
