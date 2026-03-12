import { useDeviceStore } from '@/shared/stores/deviceStore'

export function StatusBar() {
  const connected = useDeviceStore((s) => s.connected)

  return (
    <header className="status-bar">
      <div className="status-bar__left">
        <svg className="status-bar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
        <span className="app-title">Purify</span>
      </div>
      <div className="status-bar__right">
        <span className={`connection-dot ${connected ? 'online' : 'offline'}`} />
      </div>
    </header>
  )
}
