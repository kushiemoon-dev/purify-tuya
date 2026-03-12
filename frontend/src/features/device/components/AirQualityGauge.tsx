import { useTranslation } from 'react-i18next'
import { useDeviceState } from '@/shared/hooks/useDeviceState'

const RADIUS = 90
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function pmToPercent(pm25: number): number {
  // WHO scale: 0-15 good, 15-35 moderate, 35-75 unhealthy, 75+ very unhealthy
  return Math.min(100, (pm25 / 150) * 100)
}

function pmColor(pm25: number): string {
  if (pm25 <= 15) return 'var(--success)'
  if (pm25 <= 35) return 'var(--primary)'
  if (pm25 <= 75) return 'var(--warning)'
  return 'var(--danger)'
}

function pmLabel(pm25: number, t: (key: string) => string): string {
  if (pm25 <= 15) return t('airPurifier.aqGood')
  if (pm25 <= 35) return t('airPurifier.aqModerate')
  if (pm25 <= 75) return t('airPurifier.aqUnhealthy')
  return t('airPurifier.aqBad')
}

export function AirQualityGauge({ deviceId }: { deviceId?: number }) {
  const { t } = useTranslation()
  const { state } = useDeviceState(deviceId)

  const pm25 = state?.pm25 ?? 0
  const percent = pmToPercent(pm25)
  const offset = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE
  const color = pmColor(pm25)

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
        <span className="humidity-ring__value">{pm25}</span>
        <span className="humidity-ring__label">PM2.5</span>
        <span className="humidity-ring__sublabel" style={{ color, fontSize: '11px', fontWeight: 700, marginTop: '2px' }}>
          {pmLabel(pm25, t)}
        </span>
      </div>
    </div>
  )
}
