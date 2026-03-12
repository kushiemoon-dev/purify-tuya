import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { createDevice, createRoom } from '@/shared/lib/api'

interface OnboardingWizardProps {
  readonly onComplete: () => void
}

type Step = 'welcome' | 'device' | 'room' | 'done'

const slideVariants = {
  enter: { opacity: 0, x: 60 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -60 },
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('welcome')
  const [deviceName, setDeviceName] = useState('')
  const [deviceType, setDeviceType] = useState('dehumidifier')
  const [isMock, setIsMock] = useState(true)
  const [roomName, setRoomName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAddDevice = useCallback(async () => {
    if (!deviceName.trim()) return
    setSaving(true)
    try {
      await createDevice({ name: deviceName.trim(), device_type: deviceType, is_mock: isMock })
      setStep('room')
    } catch {
      // ignore
    } finally {
      setSaving(false)
    }
  }, [deviceName, deviceType, isMock])

  const handleAddRoom = useCallback(async () => {
    if (roomName.trim()) {
      setSaving(true)
      try {
        await createRoom({ name: roomName.trim() })
      } catch {
        // ignore
      } finally {
        setSaving(false)
      }
    }
    setStep('done')
  }, [roomName])

  const handleFinish = useCallback(() => {
    localStorage.setItem('purify_onboarded', '1')
    onComplete()
  }, [onComplete])

  return (
    <div className="onboarding">
      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="onboarding__step"
          >
            <div className="onboarding__icon">
              <svg viewBox="0 0 48 48" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M24 4v8M24 36v8M4 24h8M36 24h8M10 10l5.7 5.7M32.3 32.3l5.7 5.7M38 10l-5.7 5.7M15.7 32.3L10 38" />
                <circle cx="24" cy="24" r="8" />
              </svg>
            </div>
            <h1 className="onboarding__title">{t('onboarding.welcome')}</h1>
            <p className="onboarding__desc">{t('onboarding.welcomeDesc')}</p>
            <button className="save-btn" onClick={() => setStep('device')}>
              {t('onboarding.getStarted')}
            </button>
          </motion.div>
        )}

        {step === 'device' && (
          <motion.div
            key="device"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="onboarding__step"
          >
            <h2 className="onboarding__title">{t('onboarding.addDevice')}</h2>
            <p className="onboarding__desc">{t('onboarding.addDeviceDesc')}</p>
            <div className="form-group">
              <label className="form-label">{t('onboarding.deviceName')}</label>
              <input
                className="form-input"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder={t('onboarding.deviceNamePlaceholder')}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">{t('onboarding.deviceType')}</label>
              <div className="time-range-selector">
                <button
                  className={`pill ${deviceType === 'dehumidifier' ? 'active' : ''}`}
                  onClick={() => setDeviceType('dehumidifier')}
                >
                  {t('onboarding.dehumidifier')}
                </button>
                <button
                  className={`pill ${deviceType === 'air_purifier' ? 'active' : ''}`}
                  onClick={() => setDeviceType('air_purifier')}
                >
                  {t('onboarding.airPurifier')}
                </button>
              </div>
            </div>
            <div className="form-row">
              <span className="form-row-label">{t('settings.mock')}</span>
              <button
                className={`toggle-switch ${isMock ? 'active' : ''}`}
                onClick={() => setIsMock(!isMock)}
              />
            </div>
            <button
              className="save-btn"
              onClick={handleAddDevice}
              disabled={saving || !deviceName.trim()}
            >
              {t('onboarding.next')}
            </button>
          </motion.div>
        )}

        {step === 'room' && (
          <motion.div
            key="room"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="onboarding__step"
          >
            <h2 className="onboarding__title">{t('onboarding.addRoom')}</h2>
            <p className="onboarding__desc">{t('onboarding.addRoomDesc')}</p>
            <div className="form-group">
              <label className="form-label">{t('onboarding.roomName')}</label>
              <input
                className="form-input"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder={t('onboarding.roomNamePlaceholder')}
                autoFocus
              />
            </div>
            <button className="save-btn" onClick={handleAddRoom} disabled={saving}>
              {roomName.trim() ? t('onboarding.next') : t('onboarding.skip')}
            </button>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div
            key="done"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="onboarding__step"
          >
            <div className="onboarding__icon">
              <svg viewBox="0 0 48 48" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="24" cy="24" r="20" />
                <path d="M14 24l7 7 13-13" />
              </svg>
            </div>
            <h2 className="onboarding__title">{t('onboarding.ready')}</h2>
            <p className="onboarding__desc">{t('onboarding.readyDesc')}</p>
            <button className="save-btn" onClick={handleFinish}>
              {t('onboarding.goToDashboard')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
