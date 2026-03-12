import { useTranslation } from 'react-i18next'
import { DeviceManager } from './components/DeviceManager'
import { RoomManager } from './components/RoomManager'
import { PreferencesSection } from './components/PreferencesSection'

export function SettingsPage() {
  const { t } = useTranslation()

  return (
    <div className="controls">
      <h2 className="page-title">{t('settings.title')}</h2>
      <DeviceManager />
      <RoomManager />
      <PreferencesSection />
    </div>
  )
}
