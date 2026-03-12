import { useTranslation } from 'react-i18next'
import { useDeviceState } from '@/shared/hooks/useDeviceState'
import { useDeviceStore } from '@/shared/stores/deviceStore'

export function AlertStack({ deviceId }: { deviceId?: number }) {
  const { t } = useTranslation()
  const { state } = useDeviceState(deviceId)
  const error = useDeviceStore((s) => s.error)

  const alerts: { type: 'error' | 'warning'; message: string }[] = []

  if (error) {
    alerts.push({ type: 'error', message: error })
  }
  if (state?.tank_full) {
    alerts.push({ type: 'error', message: t('alert.tankFull') })
  }
  if (state?.defrosting) {
    alerts.push({ type: 'warning', message: t('alert.defrosting') })
  }

  if (alerts.length === 0) return null

  return (
    <div>
      {alerts.map((alert, i) => (
        <div key={i} className={`alert alert-${alert.type}`}>
          {alert.message}
        </div>
      ))}
    </div>
  )
}
