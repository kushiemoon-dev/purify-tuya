import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useDeviceStore } from '@/shared/stores/deviceStore'
import { useCommand } from '@/shared/hooks/useCommand'
import { sendDeviceCommand } from '@/shared/lib/api'
import type { DeviceInfo } from '@/shared/lib/types'

interface DeviceCardProps {
  readonly device: DeviceInfo
  readonly index?: number
}

export function DeviceCard({ device, index = 0 }: DeviceCardProps) {
  const { t } = useTranslation()
  const perDevice = useDeviceStore((s) => s.devices[device.id])
  const { send, isPending } = useCommand(device.id)

  const state = perDevice?.state
  const isOn = state?.switch ?? false
  const isAirPurifier = state?.device_type === 'air_purifier'
  const mainValue = isAirPurifier ? (state?.pm25 ?? 0) : (state?.humidity_current ?? 0)
  const mainUnit = isAirPurifier ? 'PM2.5' : t('gauge.label')
  const mainSuffix = isAirPurifier ? '' : '%'
  const hasFault = isAirPurifier
    ? (state?.sensor_fault || state?.filter_expired)
    : (state?.tank_full || state?.defrosting)

  function togglePower(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!state) return
    const next = !state.switch
    send('power', () => sendDeviceCommand(device.id, 'set_power', { on: next }), { switch: next })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.06 }}
    >
      <Link to={`/device/${device.id}`} className="device-card">
        <div className="device-card__header">
          <div className="device-card__info">
            <span className="device-card__name">{device.name}</span>
            <span className="device-card__status">
              {state ? (
                <>
                  <span className={isOn ? 'status-on' : 'status-off'}>
                    {isOn ? t('status.on') : t('status.off')}
                  </span>
                  {hasFault && <span className="device-card__fault">!</span>}
                </>
              ) : (
                <span className="status-off">{t('status.disconnected')}</span>
              )}
            </span>
          </div>
          <button
            className={`power-btn power-btn--small ${isOn ? 'active' : ''} ${isPending('power') ? 'is-pending' : ''}`}
            onClick={togglePower}
            disabled={!state || isPending('power')}
            aria-label="Power"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          </button>
        </div>

        {state && (
          <div className="device-card__metrics">
            <div className="device-card__humidity">
              <span className="device-card__humidity-value">{mainValue}{mainSuffix}</span>
              <span className="device-card__humidity-label">{mainUnit}</span>
            </div>
            <div className="device-card__mode">
              {t(`mode.${state.mode}`, state.mode)}
            </div>
          </div>
        )}
      </Link>
    </motion.div>
  )
}
