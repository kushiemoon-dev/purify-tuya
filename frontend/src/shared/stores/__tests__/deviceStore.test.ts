import { describe, it, expect, beforeEach } from 'vitest'
import { useDeviceStore } from '../deviceStore'
import type { DeviceState } from '../../lib/types'

const makeState = (overrides: Partial<DeviceState> = {}): DeviceState => ({
  device_id: 1,
  name: 'Test',
  switch: false,
  mode: 'manual',
  child_lock: false,
  fault: 0,
  humidity_set: 50,
  humidity_current: 60,
  countdown_set: 'cancel',
  countdown_left: 0,
  on_timer: 'cancel',
  tank_full: false,
  defrosting: false,
  ...overrides,
})

describe('deviceStore', () => {
  beforeEach(() => {
    useDeviceStore.setState({
      devices: {},
      deviceList: [],
      rooms: [],
      connected: false,
      pending: {},
      error: null,
      legacyState: null,
      legacyHistory: [],
      legacyLastUpdated: null,
      _rollbackState: null,
      _rollbackDeviceId: null,
    })
    localStorage.clear()
  })

  describe('updateDevice', () => {
    it('adds a new device state', () => {
      const state = makeState()
      useDeviceStore.getState().updateDevice(1, state)
      const stored = useDeviceStore.getState().devices[1]
      expect(stored).toBeDefined()
      expect(stored.state.switch).toBe(false)
      expect(stored.lastUpdated).toBeGreaterThan(0)
    })

    it('updates existing device state', () => {
      useDeviceStore.getState().updateDevice(1, makeState())
      useDeviceStore.getState().updateDevice(1, makeState({ switch: true }))
      expect(useDeviceStore.getState().devices[1].state.switch).toBe(true)
    })

    it('preserves humidity_history from data', () => {
      const data = { ...makeState(), humidity_history: [{ t: 1, v: 50 }] }
      useDeviceStore.getState().updateDevice(1, data)
      expect(useDeviceStore.getState().devices[1].humidityHistory).toEqual([{ t: 1, v: 50 }])
    })

    it('clears rollback state', () => {
      useDeviceStore.setState({ _rollbackState: makeState(), _rollbackDeviceId: 1 })
      useDeviceStore.getState().updateDevice(1, makeState())
      expect(useDeviceStore.getState()._rollbackState).toBeNull()
    })
  })

  describe('updateLegacy', () => {
    it('sets legacy state and persists to localStorage', () => {
      useDeviceStore.getState().updateLegacy(makeState({ switch: true }))
      expect(useDeviceStore.getState().legacyState?.switch).toBe(true)
      expect(localStorage.getItem('purify_state')).toBeTruthy()
    })

    it('sets legacy history from data', () => {
      const data = { ...makeState(), humidity_history: [{ t: 1, v: 55 }] }
      useDeviceStore.getState().updateLegacy(data)
      expect(useDeviceStore.getState().legacyHistory).toEqual([{ t: 1, v: 55 }])
    })
  })

  describe('optimisticUpdate', () => {
    it('applies patch and saves rollback', () => {
      useDeviceStore.getState().updateDevice(1, makeState({ switch: false }))
      useDeviceStore.getState().optimisticUpdate(1, { switch: true })
      const store = useDeviceStore.getState()
      expect(store.devices[1].state.switch).toBe(true)
      expect(store._rollbackState?.switch).toBe(false)
      expect(store._rollbackDeviceId).toBe(1)
    })

    it('is a no-op for nonexistent device', () => {
      const before = useDeviceStore.getState()
      useDeviceStore.getState().optimisticUpdate(99, { switch: true })
      expect(useDeviceStore.getState().devices).toEqual(before.devices)
    })
  })

  describe('rollback', () => {
    it('restores device state from rollback', () => {
      useDeviceStore.getState().updateDevice(1, makeState({ switch: false }))
      useDeviceStore.getState().optimisticUpdate(1, { switch: true })
      useDeviceStore.getState().rollback()
      expect(useDeviceStore.getState().devices[1].state.switch).toBe(false)
      expect(useDeviceStore.getState()._rollbackState).toBeNull()
    })

    it('restores legacy state from rollback', () => {
      useDeviceStore.getState().updateLegacy(makeState({ switch: false }))
      useDeviceStore.getState().optimisticUpdateLegacy({ switch: true })
      useDeviceStore.getState().rollback()
      expect(useDeviceStore.getState().legacyState?.switch).toBe(false)
    })

    it('is a no-op when no rollback state', () => {
      const before = useDeviceStore.getState()
      useDeviceStore.getState().rollback()
      expect(useDeviceStore.getState()._rollbackState).toEqual(before._rollbackState)
    })
  })

  describe('setPending', () => {
    it('sets pending key to true', () => {
      useDeviceStore.getState().setPending('1:power', true)
      expect(useDeviceStore.getState().pending['1:power']).toBe(true)
    })

    it('removes pending key when set to false', () => {
      useDeviceStore.getState().setPending('1:power', true)
      useDeviceStore.getState().setPending('1:power', false)
      expect(useDeviceStore.getState().pending['1:power']).toBeUndefined()
    })
  })

  describe('setConnected', () => {
    it('updates connected flag', () => {
      useDeviceStore.getState().setConnected(true)
      expect(useDeviceStore.getState().connected).toBe(true)
    })
  })

  describe('setError', () => {
    it('sets and clears error', () => {
      useDeviceStore.getState().setError('oops')
      expect(useDeviceStore.getState().error).toBe('oops')
      useDeviceStore.getState().setError(null)
      expect(useDeviceStore.getState().error).toBeNull()
    })
  })

  describe('setDeviceList / setRooms', () => {
    it('sets device list', () => {
      const list = [{ id: 1, name: 'D1', device_type: 'dehumidifier', device_id: '', device_ip: '', poll_interval: 5, is_mock: true, room_id: null, enabled: true }]
      useDeviceStore.getState().setDeviceList(list)
      expect(useDeviceStore.getState().deviceList).toEqual(list)
    })

    it('sets rooms', () => {
      const rooms = [{ id: 1, name: 'Living Room', icon: 'home', sort_order: 0 }]
      useDeviceStore.getState().setRooms(rooms)
      expect(useDeviceStore.getState().rooms).toEqual(rooms)
    })
  })
})
