import { useTranslation } from 'react-i18next'
import { useUiStore } from '@/shared/stores/uiStore'
import { cycleLocale } from '@/shared/lib/i18n'

export function PreferencesSection() {
  const { i18n } = useTranslation()
  const theme = useUiStore((s) => s.theme)
  const cycleTheme = useUiStore((s) => s.cycleTheme)

  const themeLabel = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System'

  return (
    <div className="card settings-section">
      <div className="card-header">
        <span className="card-label">Preferences</span>
      </div>
      <div className="settings-list">
        <div className="settings-list__item">
          <span className="settings-list__name">Theme</span>
          <button className="pill" onClick={cycleTheme}>{themeLabel}</button>
        </div>
        <div className="settings-list__item">
          <span className="settings-list__name">Language</span>
          <button className="pill" onClick={cycleLocale}>{i18n.language.toUpperCase()}</button>
        </div>
      </div>
    </div>
  )
}
