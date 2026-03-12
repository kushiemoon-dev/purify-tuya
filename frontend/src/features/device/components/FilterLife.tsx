import { useTranslation } from 'react-i18next'
import { useDeviceState } from '@/shared/hooks/useDeviceState'

export function FilterLife({ deviceId }: { deviceId?: number }) {
  const { t } = useTranslation()
  const { state } = useDeviceState(deviceId)

  const filterLife = state?.filter_life ?? 100
  const color = filterLife > 30 ? 'var(--success)' : filterLife > 10 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div className="card">
      <div className="card-row">
        <span className="card-label">{t('airPurifier.filterLife')}</span>
        <span className="card-value" style={{ color }}>{filterLife}%</span>
      </div>
      <div className="filter-bar">
        <div
          className="filter-bar__fill"
          style={{ width: `${filterLife}%`, background: color }}
        />
      </div>
    </div>
  )
}
