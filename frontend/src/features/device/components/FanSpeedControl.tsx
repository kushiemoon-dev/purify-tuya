import { useTranslation } from 'react-i18next'
import { useDeviceState } from '@/shared/hooks/useDeviceState'
import { useCommand } from '@/shared/hooks/useCommand'
import { sendDeviceCommand } from '@/shared/lib/api'

const SPEEDS = [1, 2, 3, 4, 5] as const

export function FanSpeedControl({ deviceId }: { deviceId?: number }) {
  const { t } = useTranslation()
  const { state } = useDeviceState(deviceId)
  const { send, isPending } = useCommand(deviceId)

  const currentSpeed = state?.fan_speed ?? 1

  function handleSpeed(speed: number) {
    if (deviceId === undefined) return
    send('fan_speed', () => sendDeviceCommand(deviceId, 'set_fan_speed', { speed }), { fan_speed: speed })
  }

  return (
    <div className={`card ${isPending('fan_speed') ? 'is-pending' : ''}`}>
      <div className="card-header">
        <span className="card-label">{t('airPurifier.fanSpeed')}</span>
        <span className="card-value">{currentSpeed}</span>
      </div>
      <div className="fan-speed-grid">
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            className={`pill ${currentSpeed === speed ? 'active' : ''}`}
            onClick={() => handleSpeed(speed)}
            disabled={!state || isPending('fan_speed')}
          >
            {speed}
          </button>
        ))}
      </div>
    </div>
  )
}
