import { useMemo } from 'react'
import { useDeviceState } from '@/shared/hooks/useDeviceState'

const W = 300
const H = 40
const PAD = 2

export function Sparkline({ deviceId }: { deviceId?: number }) {
  const { humidityHistory } = useDeviceState(deviceId)

  const { points, area } = useMemo(() => {
    if (humidityHistory.length < 2) return { points: '', area: '' }

    const vals = humidityHistory.map((p) => p.v)
    const min = Math.min(...vals) - 2
    const max = Math.max(...vals) + 2
    const range = max - min || 1

    const coords = humidityHistory.map((p, i) => {
      const x = (i / (humidityHistory.length - 1)) * W
      const y = H - PAD - ((p.v - min) / range) * (H - PAD * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })

    return {
      points: coords.join(' '),
      area: `0,${H} ${coords.join(' ')} ${W},${H}`,
    }
  }, [humidityHistory])

  if (!points) return null

  return (
    <div className="sparkline-container">
      <svg viewBox={`0 0 ${W} ${H}`} className="sparkline" preserveAspectRatio="none">
        <polygon points={area} fill="var(--primary)" opacity="0.1" />
        <polyline points={points} fill="none" stroke="var(--primary)" strokeWidth="1.5" />
      </svg>
    </div>
  )
}
