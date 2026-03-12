import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDeviceStore } from '../stores/deviceStore'

export function useLastUpdated(deviceId?: number): string {
  const { t } = useTranslation()
  const lastUpdated = useDeviceStore((s) => {
    if (deviceId !== undefined) {
      return s.devices[deviceId]?.lastUpdated ?? null
    }
    return s.legacyLastUpdated
  })
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(timer)
  }, [])

  if (!lastUpdated) return ''
  const diff = Math.floor((now - lastUpdated) / 1000)
  if (diff < 10) return t('time.now')
  if (diff < 60) return t('time.seconds', { n: diff })
  const mins = Math.floor(diff / 60)
  return t('time.minutes', { n: mins })
}
