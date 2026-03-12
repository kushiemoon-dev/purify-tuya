import { useTranslation } from 'react-i18next'
import { useDeviceState } from '@/shared/hooks/useDeviceState'
import { useCommand } from '@/shared/hooks/useCommand'
import { setTimer, setOnTimer, sendDeviceCommand } from '@/shared/lib/api'
import { TIMER_VALUES } from '@/shared/lib/types'

function TimerGroup({
  label,
  badge,
  current,
  commandKey,
  onSelect,
  disabled,
}: {
  label: string
  badge?: string
  current: string
  commandKey: string
  onSelect: (hours: string) => void
  disabled: boolean
}) {
  return (
    <div className="timer-group">
      <div className="card-header">
        <span className="card-label">{label}</span>
        {badge && <span className="timer-badge">{badge}</span>}
      </div>
      <div className="pill-scroll">
        {TIMER_VALUES.map((val) => (
          <button
            key={`${commandKey}-${val}`}
            className={`pill ${current === val ? 'active' : ''}`}
            onClick={() => onSelect(val)}
            disabled={disabled}
          >
            {val === 'cancel' ? 'Off' : val}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TimerCard({ deviceId }: { deviceId?: number }) {
  const { t } = useTranslation()
  const { state } = useDeviceState(deviceId)
  const { send, isPending } = useCommand(deviceId)

  const countdownSet = state?.countdown_set ?? 'cancel'
  const countdownLeft = state?.countdown_left ?? 0
  const onTimerSet = state?.on_timer ?? 'cancel'
  const disabled = !state || isPending('timer') || isPending('on_timer')

  function formatCountdown(seconds: number): string {
    if (seconds <= 0) return ''
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return h > 0 ? `${h}h${m > 0 ? `${m}m` : ''}` : `${m}m`
  }

  function handleTimer(hours: string) {
    const fn = deviceId !== undefined
      ? () => sendDeviceCommand(deviceId, 'set_countdown', { hours })
      : () => setTimer(hours)
    send('timer', fn, { countdown_set: hours })
  }

  function handleOnTimer(hours: string) {
    const fn = deviceId !== undefined
      ? () => sendDeviceCommand(deviceId, 'set_on_timer', { hours })
      : () => setOnTimer(hours)
    send('on_timer', fn, { on_timer: hours })
  }

  return (
    <div className={`card timers-card ${isPending('timer') || isPending('on_timer') ? 'is-pending' : ''}`}>
      <TimerGroup
        label={t('timer.off')}
        badge={countdownLeft > 0 ? formatCountdown(countdownLeft) : undefined}
        current={countdownSet}
        commandKey="timer"
        onSelect={handleTimer}
        disabled={disabled}
      />
      <div className="timer-divider" />
      <TimerGroup
        label={t('timer.on')}
        current={onTimerSet}
        commandKey="on_timer"
        onSelect={handleOnTimer}
        disabled={disabled}
      />
    </div>
  )
}
