import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchAutomations } from '@/shared/lib/api'
import type { AutomationInfo } from '@/shared/lib/types'
import { AutomationCard } from './components/AutomationCard'
import { AutomationEditor } from './components/AutomationEditor'

export function AutomationPage() {
  const { t } = useTranslation()
  const [automations, setAutomations] = useState<readonly AutomationInfo[]>([])
  const [showEditor, setShowEditor] = useState(false)

  const load = useCallback(() => {
    fetchAutomations()
      .then((data) => setAutomations(data))
      .catch(() => setAutomations([]))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="controls">
      <div className="card-header">
        <h2 className="page-title">{t('automation.title')}</h2>
        <button className="pill active" onClick={() => setShowEditor(true)}>
          + {t('automation.add')}
        </button>
      </div>

      {automations.length === 0 ? (
        <div className="card">
          <p className="settings-list__empty">{t('automation.empty')}</p>
        </div>
      ) : (
        <div className="automation-list">
          {automations.map((auto) => (
            <AutomationCard key={auto.id} automation={auto} onUpdate={load} />
          ))}
        </div>
      )}

      {showEditor && (
        <AutomationEditor
          onSaved={() => { setShowEditor(false); load() }}
          onCancel={() => setShowEditor(false)}
        />
      )}
    </div>
  )
}
