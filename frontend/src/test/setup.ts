import '@testing-library/jest-dom/vitest'

// Mock localStorage
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  get length() { return Object.keys(store).length },
  key: (index: number) => Object.keys(store)[index] ?? null,
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

// Mock WebSocket
class MockWebSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3
  readonly CONNECTING = 0
  readonly OPEN = 1
  readonly CLOSING = 2
  readonly CLOSED = 3
  readyState = MockWebSocket.OPEN
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  close() { this.readyState = MockWebSocket.CLOSED }
  send() {}
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true }
  url = ''
  protocol = ''
  extensions = ''
  binaryType = 'blob' as BinaryType
  bufferedAmount = 0
}
Object.defineProperty(globalThis, 'WebSocket', { value: MockWebSocket })
