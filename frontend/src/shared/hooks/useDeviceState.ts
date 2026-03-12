import { useDeviceStore } from '../stores/deviceStore'
import type { DeviceState, HumidityReading } from '../lib/types'

/**
 * Hook to get device state — supports both multi-device and legacy mode.
 * If deviceId is provided, reads from multi-device store.
 * Otherwise, reads from legacy single-device store.
 */
export function useDeviceState(deviceId?: number): {
  state: DeviceState | null
  humidityHistory: readonly HumidityReading[]
} {
  const multiDevice = useDeviceStore((s) =>
    deviceId !== undefined ? s.devices[deviceId] ?? null : null,
  )
  const legacyState = useDeviceStore((s) => s.legacyState)
  const legacyHistory = useDeviceStore((s) => s.legacyHistory)

  if (deviceId !== undefined) {
    return {
      state: multiDevice?.state ?? null,
      humidityHistory: multiDevice?.humidityHistory ?? [],
    }
  }

  return {
    state: legacyState,
    humidityHistory: legacyHistory,
  }
}
