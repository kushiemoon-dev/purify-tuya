import { create } from 'zustand'
import type { DeviceState, HumidityReading, DeviceInfo, RoomInfo } from '../lib/types'

interface PerDeviceState {
  readonly state: DeviceState
  readonly humidityHistory: readonly HumidityReading[]
  readonly lastUpdated: number
}

interface DeviceStore {
  // Multi-device state
  readonly devices: Readonly<Record<number, PerDeviceState>>
  readonly deviceList: readonly DeviceInfo[]
  readonly rooms: readonly RoomInfo[]
  readonly connected: boolean
  readonly pending: Readonly<Record<string, boolean>>
  readonly error: string | null

  // Legacy single-device state (for backward compat during Phase 1→3 transition)
  readonly legacyState: DeviceState | null
  readonly legacyHistory: readonly HumidityReading[]
  readonly legacyLastUpdated: number | null
  readonly _rollbackState: DeviceState | null
  readonly _rollbackDeviceId: number | null

  // Actions
  updateDevice: (deviceId: number, data: DeviceState & { humidity_history?: HumidityReading[] }) => void
  updateLegacy: (data: DeviceState & { humidity_history?: HumidityReading[] }) => void
  setDeviceList: (devices: DeviceInfo[]) => void
  setRooms: (rooms: RoomInfo[]) => void
  optimisticUpdate: (deviceId: number, patch: Partial<DeviceState>) => void
  optimisticUpdateLegacy: (patch: Partial<DeviceState>) => void
  rollback: () => void
  setConnected: (connected: boolean) => void
  setPending: (key: string, value: boolean) => void
  setError: (error: string | null) => void
}

const stored = localStorage.getItem('purify_state')
const initialLegacy: DeviceState | null = stored ? JSON.parse(stored) : null

export const useDeviceStore = create<DeviceStore>((set) => ({
  devices: {},
  deviceList: [],
  rooms: [],
  connected: false,
  pending: {},
  error: null,
  legacyState: initialLegacy,
  legacyHistory: [],
  legacyLastUpdated: null,
  _rollbackState: null,
  _rollbackDeviceId: null,

  updateDevice: (deviceId, data) => set((prev) => {
    const { humidity_history, ...stateOnly } = data as DeviceState & { humidity_history?: HumidityReading[] }
    const existing = prev.devices[deviceId]
    const perDevice: PerDeviceState = {
      state: stateOnly as DeviceState,
      humidityHistory: humidity_history ?? existing?.humidityHistory ?? [],
      lastUpdated: Date.now(),
    }
    return {
      devices: { ...prev.devices, [deviceId]: perDevice },
      _rollbackState: null,
      _rollbackDeviceId: null,
    }
  }),

  updateLegacy: (data) => set((prev) => {
    const { humidity_history, ...stateOnly } = data as DeviceState & { humidity_history?: HumidityReading[] }
    localStorage.setItem('purify_state', JSON.stringify(stateOnly))
    return {
      legacyState: stateOnly as DeviceState,
      legacyHistory: humidity_history ?? prev.legacyHistory,
      legacyLastUpdated: Date.now(),
      _rollbackState: null,
      _rollbackDeviceId: null,
    }
  }),

  setDeviceList: (deviceList) => set({ deviceList }),
  setRooms: (rooms) => set({ rooms }),

  optimisticUpdate: (deviceId, patch) => set((prev) => {
    const existing = prev.devices[deviceId]
    if (!existing) return prev
    return {
      _rollbackState: existing.state,
      _rollbackDeviceId: deviceId,
      devices: {
        ...prev.devices,
        [deviceId]: { ...existing, state: { ...existing.state, ...patch } },
      },
    }
  }),

  optimisticUpdateLegacy: (patch) => set((prev) => {
    if (!prev.legacyState) return prev
    return {
      _rollbackState: prev.legacyState,
      _rollbackDeviceId: null,
      legacyState: { ...prev.legacyState, ...patch },
    }
  }),

  rollback: () => set((prev) => {
    if (!prev._rollbackState) return prev
    if (prev._rollbackDeviceId !== null) {
      const existing = prev.devices[prev._rollbackDeviceId]
      if (!existing) return { _rollbackState: null, _rollbackDeviceId: null }
      return {
        devices: {
          ...prev.devices,
          [prev._rollbackDeviceId]: { ...existing, state: prev._rollbackState },
        },
        _rollbackState: null,
        _rollbackDeviceId: null,
      }
    }
    return {
      legacyState: prev._rollbackState,
      _rollbackState: null,
      _rollbackDeviceId: null,
    }
  }),

  setConnected: (connected) => set({ connected }),

  setPending: (key, value) => set((prev) => {
    if (value) {
      return { pending: { ...prev.pending, [key]: true } }
    }
    const { [key]: _removed, ...rest } = prev.pending
    void _removed
    return { pending: rest }
  }),

  setError: (error) => set({ error }),
}))
