import { useTranslation } from 'react-i18next'
import { useDeviceState } from '@/shared/hooks/useDeviceState'

export function AirPurifierAlerts({ deviceId }: { deviceId?: number }) {
  const { t } = useTranslation()
  const { state } = useDeviceState(deviceId)

  if (!state) return null

  return (
    <>
      {state.sensor_fault && (
        <div className="alert alert-error">{t('airPurifier.sensorFault')}</div>
      )}
      {state.filter_expired && (
        <div className="alert alert-warning">{t('airPurifier.filterExpired')}</div>
      )}
    </>
  )
}
