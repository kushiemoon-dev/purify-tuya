import { useTranslation } from 'react-i18next'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useDeviceState } from '@/shared/hooks/useDeviceState'
import { useDeviceStore } from '@/shared/stores/deviceStore'
import { useLastUpdated } from '@/shared/hooks/useLastUpdated'
import { DevicePageSkeleton } from '@/shared/components/ui/Skeleton'
import { HumidityGauge } from './components/HumidityGauge'
import { AirQualityGauge } from './components/AirQualityGauge'
import { PowerButton } from './components/PowerButton'
import { Sparkline } from './components/Sparkline'
import { HumiditySlider } from './components/HumiditySlider'
import { ModeGrid } from './components/ModeGrid'
import { TimerCard } from './components/TimerCard'
import { ChildLockToggle } from './components/ChildLockToggle'
import { AlertStack } from './components/AlertStack'
import { AirPurifierAlerts } from './components/AirPurifierAlerts'
import { FanSpeedControl } from './components/FanSpeedControl'
import { FilterLife } from './components/FilterLife'
import { HistoryChart } from './components/HistoryChart'

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export function DevicePage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const deviceId = id ? parseInt(id, 10) : undefined
  const { state } = useDeviceState(deviceId)
  const connected = useDeviceStore((s) => s.connected)
  const lastUpdated = useLastUpdated(deviceId)

  if (!state) {
    return <DevicePageSkeleton />
  }

  const isAirPurifier = state.device_type === 'air_purifier'

  return (
    <>
      {!connected && (
        <div className="offline-banner">{t('offline.banner')}</div>
      )}
      {isAirPurifier ? <AirPurifierAlerts deviceId={deviceId} /> : <AlertStack deviceId={deviceId} />}
      <motion.div className="controls" variants={stagger} initial="hidden" animate="show">
        {deviceId !== undefined && (
          <motion.div className="device-page-header" variants={fadeUp}>
            <Link to="/" className="back-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
            <h2 className="device-page-title">{state.name}</h2>
          </motion.div>
        )}
        <motion.div className="hero-card" variants={fadeUp}>
          <div className="hero-top">
            {isAirPurifier
              ? <AirQualityGauge deviceId={deviceId} />
              : <HumidityGauge deviceId={deviceId} />
            }
            <PowerButton deviceId={deviceId} />
          </div>
          {!isAirPurifier && <Sparkline deviceId={deviceId} />}
          {lastUpdated && <div className="last-updated">{lastUpdated}</div>}
        </motion.div>

        {/* Dehumidifier controls */}
        {!isAirPurifier && (
          <>
            <motion.div variants={fadeUp}>
              <HumiditySlider deviceId={deviceId} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <ModeGrid deviceId={deviceId} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <TimerCard deviceId={deviceId} />
            </motion.div>
          </>
        )}

        {/* Air purifier controls */}
        {isAirPurifier && (
          <>
            <motion.div variants={fadeUp}>
              <ModeGrid deviceId={deviceId} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <FanSpeedControl deviceId={deviceId} />
            </motion.div>
            <motion.div variants={fadeUp}>
              <FilterLife deviceId={deviceId} />
            </motion.div>
          </>
        )}

        {/* Common controls */}
        {state.capabilities?.has_child_lock !== false && (
          <motion.div variants={fadeUp}>
            <ChildLockToggle deviceId={deviceId} />
          </motion.div>
        )}
        {deviceId !== undefined && (
          <motion.div variants={fadeUp}>
            <HistoryChart deviceId={deviceId} />
          </motion.div>
        )}
      </motion.div>
    </>
  )
}
