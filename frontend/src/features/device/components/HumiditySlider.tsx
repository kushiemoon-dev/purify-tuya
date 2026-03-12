import { useTranslation } from 'react-i18next'
import { useDeviceState } from '@/shared/hooks/useDeviceState'
import { useCommand } from '@/shared/hooks/useCommand'
import { setHumidity, sendDeviceCommand } from '@/shared/lib/api'

export function HumiditySlider({ deviceId }: { deviceId?: number }) {
  const { t } = useTranslation()
  const { state } = useDeviceState(deviceId)
  const { send, isPending } = useCommand(deviceId)

  const value = state?.humidity_set ?? 50

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseInt(e.target.value, 10)
    const snapped = Math.round(raw / 5) * 5
    const fn = deviceId !== undefined
      ? () => sendDeviceCommand(deviceId, 'set_humidity', { value: snapped })
      : () => setHumidity(snapped)
    send('humidity', fn, { humidity_set: snapped })
  }

  return (
    <div className={`card ${isPending('humidity') ? 'is-pending' : ''}`}>
      <div className="card-header">
        <span className="card-label">{t('humidity.target')}</span>
        <span className="card-value">{value}%</span>
      </div>
      <input
        type="range"
        className="slider"
        min={35}
        max={70}
        step={5}
        value={value}
        onChange={handleChange}
        disabled={!state || isPending('humidity')}
      />
      <div className="slider-labels">
        <span>35%</span>
        <span>70%</span>
      </div>
    </div>
  )
}
