import { useTranslation } from 'react-i18next'
import { useDeviceState } from '@/shared/hooks/useDeviceState'
import { useCommand } from '@/shared/hooks/useCommand'
import { setMode, sendDeviceCommand } from '@/shared/lib/api'
import { MODES } from '@/shared/lib/types'
import type { Mode } from '@/shared/lib/types'

const MODE_ICONS: Record<string, string> = {
  manual: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
  laundry: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H6V4h12v16zm-6-2c3.31 0 6-2.69 6-6s-2.69-6-6-6-6 2.69-6 6 2.69 6 6 6z',
  sleep: 'M12.34 2.02C6.59 1.82 2 6.42 2 12c0 5.52 4.48 10 10 10 3.71 0 6.93-2.02 8.66-5.02-7.51-.25-12.09-8.43-8.32-14.96z',
  purify: 'M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z',
  auto: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
}

export function ModeGrid({ deviceId }: { deviceId?: number }) {
  const { t } = useTranslation()
  const { state } = useDeviceState(deviceId)
  const { send, isPending } = useCommand(deviceId)

  const current = state?.mode ?? 'manual'

  // Use capabilities modes if available, otherwise fall back to defaults
  const modes: string[] = state?.capabilities?.modes
    ? [...state.capabilities.modes]
    : [...MODES]

  function handleMode(mode: string) {
    const fn = deviceId !== undefined
      ? () => sendDeviceCommand(deviceId, 'set_mode', { mode })
      : () => setMode(mode)
    send('mode', fn, { mode: mode as Mode })
  }

  return (
    <div className={`card ${isPending('mode') ? 'is-pending' : ''}`}>
      <div className="card-header">
        <span className="card-label">{t('mode.label')}</span>
      </div>
      <div className="mode-grid" style={{ gridTemplateColumns: `repeat(${Math.min(modes.length, 4)}, 1fr)` }}>
        {modes.map((mode) => (
          <button
            key={mode}
            className={`mode-btn ${current === mode ? 'active' : ''}`}
            onClick={() => handleMode(mode)}
            disabled={!state || isPending('mode')}
          >
            <svg className="mode-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d={MODE_ICONS[mode] ?? MODE_ICONS.manual} />
            </svg>
            {t(`mode.${mode}`, mode)}
          </button>
        ))}
      </div>
    </div>
  )
}
