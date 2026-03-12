import { useTranslation } from 'react-i18next'
import { useDeviceState } from '@/shared/hooks/useDeviceState'

const RADIUS = 90
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function HumidityGauge({ deviceId }: { deviceId?: number }) {
  const { t } = useTranslation()
  const { state } = useDeviceState(deviceId)

  const humidity = state?.humidity_current ?? 0
  const offset = CIRCUMFERENCE - (humidity / 100) * CIRCUMFERENCE

  const color =
    humidity > 70 ? 'var(--danger)' :
    humidity > 55 ? 'var(--warning)' :
    'var(--primary)'

  return (
    <div className="humidity-ring">
      <svg viewBox="0 0 200 200">
        <circle
          cx="100" cy="100" r={RADIUS}
          className="humidity-ring__track"
        />
        <circle
          cx="100" cy="100" r={RADIUS}
          className="humidity-ring__fill"
          stroke={color}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="humidity-ring__center">
        <span className="humidity-ring__value">{humidity}%</span>
        <span className="humidity-ring__label">{t('gauge.label')}</span>
      </div>
    </div>
  )
}
