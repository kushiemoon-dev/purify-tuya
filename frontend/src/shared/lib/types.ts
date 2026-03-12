export type Mode = 'manual' | 'laundry' | 'sleep' | 'purify' | 'auto'

export const DEHUMIDIFIER_MODES: Mode[] = ['manual', 'laundry', 'sleep', 'purify']
export const AIR_PURIFIER_MODES: Mode[] = ['auto', 'sleep', 'manual']
export const MODES: Mode[] = ['manual', 'laundry', 'sleep', 'purify']

export const TIMER_VALUES = [
  'cancel', '1h', '2h', '3h', '4h', '5h', '6h', '7h', '8h',
  '9h', '10h', '11h', '12h', '13h', '14h', '15h', '16h',
  '17h', '18h', '19h', '20h', '21h', '22h', '23h', '24h',
] as const

export type TimerValue = typeof TIMER_VALUES[number]

export type DeviceType = 'dehumidifier' | 'air_purifier' | 'unknown'

export interface DeviceCapabilities {
  readonly metrics: readonly string[]
  readonly modes: readonly string[]
  readonly has_timer: boolean
  readonly has_on_timer: boolean
  readonly has_child_lock: boolean
  readonly has_fault: boolean
  readonly humidity_range: readonly [number, number] | null
  readonly extra: Record<string, unknown>
}

export interface DeviceState {
  readonly device_id: number
  readonly name: string
  readonly device_type?: DeviceType
  readonly switch: boolean
  readonly mode: Mode
  readonly child_lock: boolean
  readonly fault: number
  readonly faults?: Record<string, boolean>
  readonly metrics?: Record<string, number>
  readonly capabilities?: DeviceCapabilities

  // Dehumidifier-specific
  readonly humidity_set: number
  readonly humidity_current: number
  readonly countdown_set: string
  readonly countdown_left: number
  readonly on_timer: string
  readonly tank_full: boolean
  readonly defrosting: boolean

  // Air purifier-specific
  readonly pm25?: number
  readonly fan_speed?: number
  readonly filter_life?: number
  readonly sensor_fault?: boolean
  readonly filter_expired?: boolean
}

export interface HumidityReading {
  readonly t: number
  readonly v: number
}

export interface HistoryPoint {
  readonly t: number
  readonly v: number
  readonly min?: number
  readonly max?: number
}

export interface HistoryResponse {
  readonly device_id: number
  readonly metric: string
  readonly range: string
  readonly data: readonly HistoryPoint[]
}

export type TimeRange = '1h' | '24h' | '7d' | '30d'

export type TriggerType = 'threshold' | 'schedule'

export interface ThresholdTrigger {
  readonly device_id: number
  readonly metric: string
  readonly operator: '>' | '>=' | '<' | '<=' | '=='
  readonly value: number
}

export interface ScheduleTrigger {
  readonly time: string
  readonly days?: readonly number[]
}

export interface DeviceCommandAction {
  readonly device_id: number
  readonly command: string
  readonly args?: Record<string, unknown>
}

export interface AutomationInfo {
  readonly id: number
  readonly name: string
  readonly trigger_type: TriggerType
  readonly trigger_config: ThresholdTrigger | ScheduleTrigger
  readonly action_type: string
  readonly action_config: DeviceCommandAction
  readonly cooldown: number
  readonly enabled: boolean
}

export interface DeviceInfo {
  readonly id: number
  readonly name: string
  readonly device_type: string
  readonly device_id: string
  readonly device_ip: string
  readonly poll_interval: number
  readonly is_mock: boolean
  readonly room_id: number | null
  readonly enabled: boolean
}

export interface RoomInfo {
  readonly id: number
  readonly name: string
  readonly icon: string
  readonly sort_order: number
}

export interface Settings {
  device_id: string
  device_ip: string
  local_key: string
  poll_interval: number
  mock_device: boolean
}
