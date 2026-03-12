import { useEffect, useRef } from 'react'
import { useDeviceStore } from '../stores/deviceStore'
import { useNotificationStore } from '../stores/notificationStore'

export function useWebSocket() {
  const updateDevice = useDeviceStore((s) => s.updateDevice)
  const updateLegacy = useDeviceStore((s) => s.updateLegacy)
  const setConnected = useDeviceStore((s) => s.setConnected)
  const addNotification = useNotificationStore((s) => s.addNotification)
  const retryDelay = useRef(1000)

  useEffect(() => {
    let ws: WebSocket | null = null
    let disposed = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (disposed) return

      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
      const url = `${protocol}//${location.host}/purify/ws`
      ws = new WebSocket(url)

      ws.onopen = () => {
        retryDelay.current = 1000
        setConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === 'notification') {
            // Real-time notification
            addNotification(data)
          } else if (data.type === 'device_update' && typeof data.device_id === 'number') {
            // Multi-device message
            updateDevice(data.device_id, data)
          } else {
            // Legacy single-device message (no type field)
            updateLegacy(data)
          }
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        setConnected(false)
        if (!disposed) {
          retryTimer = setTimeout(connect, retryDelay.current)
          retryDelay.current = Math.min(retryDelay.current * 2, 30000)
        }
      }

      ws.onerror = () => {
        ws?.close()
      }
    }

    connect()

    return () => {
      disposed = true
      if (retryTimer) clearTimeout(retryTimer)
      ws?.close()
    }
  }, [updateDevice, updateLegacy, setConnected, addNotification])
}
