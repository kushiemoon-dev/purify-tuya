import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchDevices, deleteDevice, sendDeviceCommand, fetchNotifications } from '../api'

describe('api client', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function mockFetch(status: number, body: unknown = {}) {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    })
  }

  it('fetchDevices returns parsed JSON on success', async () => {
    const devices = [{ id: 1, name: 'Dev1' }]
    mockFetch(200, devices)
    const result = await fetchDevices()
    expect(result).toEqual(devices)
  })

  it('throws on non-2xx response', async () => {
    mockFetch(404, { detail: 'Not found' })
    await expect(fetchDevices()).rejects.toThrow('Not found')
  })

  it('sendDeviceCommand sends POST with JSON body', async () => {
    mockFetch(200, { ok: true })
    await sendDeviceCommand(1, 'set_power', { on: true })
    const [url, options] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/purify/api/v1/devices/1/command')
    expect(options.method).toBe('POST')
    expect(JSON.parse(options.body)).toEqual({ command: 'set_power', args: { on: true } })
  })

  it('deleteDevice handles 204 response', async () => {
    ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.reject(new Error('no body')),
    })
    const result = await deleteDevice(1)
    expect(result).toBeUndefined()
  })

  it('fetchNotifications includes query params', async () => {
    mockFetch(200, { notifications: [], unread_count: 0 })
    await fetchNotifications(10, true)
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain('limit=10')
    expect(url).toContain('unread_only=true')
  })
})
