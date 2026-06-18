import { useDeviceStore } from '../stores/deviceStore'
import type { DeviceState, HumidityReading } from '../lib/types'

export function useDeviceState(deviceId: number): {
  state: DeviceState | null
  humidityHistory: readonly HumidityReading[]
} {
  const device = useDeviceStore((s) => s.devices[deviceId] ?? null)
  return {
    state: device?.state ?? null,
    humidityHistory: device?.humidityHistory ?? [],
  }
}
