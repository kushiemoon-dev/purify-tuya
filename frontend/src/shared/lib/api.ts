import type { AutomationInfo, DeviceInfo, HistoryResponse, RoomInfo, TimeRange } from './types'

const V1_BASE = '/purify/api/v1'

async function request<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options)
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error((error as { detail?: string }).detail || 'Request failed')
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function post<T = unknown>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function patch<T = unknown>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function del(url: string): Promise<void> {
  return request<void>(url, { method: 'DELETE' })
}

// ── v1 Multi-device API ──

export function fetchDevices(): Promise<DeviceInfo[]> {
  return request<DeviceInfo[]>(`${V1_BASE}/devices`)
}

export function createDevice(data: Partial<DeviceInfo> & { name: string }): Promise<DeviceInfo> {
  return post<DeviceInfo>(`${V1_BASE}/devices`, data)
}

export function updateDevice(id: number, data: Partial<DeviceInfo>): Promise<DeviceInfo> {
  return patch<DeviceInfo>(`${V1_BASE}/devices/${id}`, data)
}

export function deleteDevice(id: number): Promise<void> {
  return del(`${V1_BASE}/devices/${id}`)
}

export function sendDeviceCommand(deviceId: number, command: string, args: Record<string, unknown> = {}): Promise<void> {
  return post(`${V1_BASE}/devices/${deviceId}/command`, { command, args })
}

// ── Rooms API ──

export function fetchRooms(): Promise<RoomInfo[]> {
  return request<RoomInfo[]>(`${V1_BASE}/rooms`)
}

export function createRoom(data: { name: string; icon?: string; sort_order?: number }): Promise<RoomInfo> {
  return post<RoomInfo>(`${V1_BASE}/rooms`, data)
}

export function updateRoom(id: number, data: Partial<RoomInfo>): Promise<RoomInfo> {
  return patch<RoomInfo>(`${V1_BASE}/rooms/${id}`, data)
}

export function deleteRoom(id: number): Promise<void> {
  return del(`${V1_BASE}/rooms/${id}`)
}

// ── History API ──

// ── Automations API ──

export function fetchAutomations(): Promise<AutomationInfo[]> {
  return request<AutomationInfo[]>(`${V1_BASE}/automations`)
}

export function createAutomation(data: Omit<AutomationInfo, 'id'>): Promise<AutomationInfo> {
  return post<AutomationInfo>(`${V1_BASE}/automations`, data)
}

export function updateAutomation(id: number, data: Partial<Omit<AutomationInfo, 'id'>>): Promise<AutomationInfo> {
  return patch<AutomationInfo>(`${V1_BASE}/automations/${id}`, data)
}

export function deleteAutomation(id: number): Promise<void> {
  return del(`${V1_BASE}/automations/${id}`)
}

// ── Notifications API ──

export function fetchNotifications(limit = 50, unreadOnly = false): Promise<{ notifications: unknown[]; unread_count: number }> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (unreadOnly) params.set('unread_only', 'true')
  return request(`${V1_BASE}/notifications?${params}`)
}

export function markNotificationRead(id: number): Promise<{ ok: boolean }> {
  return post(`${V1_BASE}/notifications/${id}/read`, {})
}

export function markAllNotificationsRead(): Promise<{ marked: number }> {
  return post(`${V1_BASE}/notifications/read-all`, {})
}

// ── History API ──

export function fetchDeviceHistory(
  deviceId: number,
  metric: string = 'humidity_current',
  range: TimeRange = '24h',
  resolution?: string,
): Promise<HistoryResponse> {
  const params = new URLSearchParams({ metric, range })
  if (resolution) params.set('resolution', resolution)
  return request<HistoryResponse>(`${V1_BASE}/devices/${deviceId}/history?${params}`)
}
