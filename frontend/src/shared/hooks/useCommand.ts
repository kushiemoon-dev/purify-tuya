import { useCallback } from 'react'
import { useDeviceStore } from '../stores/deviceStore'
import type { DeviceState } from '../lib/types'

export function useCommand(deviceId?: number) {
  const optimisticUpdate = useDeviceStore((s) => s.optimisticUpdate)
  const optimisticUpdateLegacy = useDeviceStore((s) => s.optimisticUpdateLegacy)
  const rollback = useDeviceStore((s) => s.rollback)
  const setPending = useDeviceStore((s) => s.setPending)
  const setError = useDeviceStore((s) => s.setError)
  const pending = useDeviceStore((s) => s.pending)

  const send = useCallback(
    async (key: string, fn: () => Promise<unknown>, patch?: Partial<DeviceState>) => {
      const pendingKey = deviceId !== undefined ? `${deviceId}:${key}` : key
      if (pending[pendingKey]) return
      setPending(pendingKey, true)
      setError(null)
      if (patch) {
        if (deviceId !== undefined) {
          optimisticUpdate(deviceId, patch)
        } else {
          optimisticUpdateLegacy(patch)
        }
      }
      try {
        await fn()
      } catch (e) {
        if (patch) rollback()
        const message = e instanceof Error ? e.message : 'Command failed'
        setError(message)
        setTimeout(() => setError(null), 3000)
      } finally {
        setPending(pendingKey, false)
      }
    },
    [deviceId, pending, setPending, setError, optimisticUpdate, optimisticUpdateLegacy, rollback],
  )

  const isPending = useCallback(
    (key: string) => {
      const pendingKey = deviceId !== undefined ? `${deviceId}:${key}` : key
      return !!pending[pendingKey]
    },
    [deviceId, pending],
  )

  return { send, pending, isPending }
}
