import { useTranslation } from 'react-i18next'
import { updateAutomation, deleteAutomation } from '@/shared/lib/api'
import type { AutomationInfo } from '@/shared/lib/types'

interface AutomationCardProps {
  readonly automation: AutomationInfo
  readonly onUpdate: () => void
}

export function AutomationCard({ automation, onUpdate }: AutomationCardProps) {
  const { t } = useTranslation()

  const handleToggle = async () => {
    await updateAutomation(automation.id, { enabled: !automation.enabled })
    onUpdate()
  }

  const handleDelete = async () => {
    if (!confirm(t('automation.confirmDelete'))) return
    await deleteAutomation(automation.id)
    onUpdate()
  }

  const triggerLabel = automation.trigger_type === 'threshold'
    ? `${(automation.trigger_config as { metric?: string }).metric ?? '?'} ${(automation.trigger_config as { operator?: string }).operator ?? ''} ${(automation.trigger_config as { value?: number }).value ?? ''}`
    : `${(automation.trigger_config as { time?: string }).time ?? '??:??'}`

  const actionCommand = (automation.action_config as { command?: string }).command ?? ''
  const actionLabel = actionCommand.startsWith('set_power')
    ? t(`automation.commands.${actionCommand === 'set_power' ? 'set_power_on' : actionCommand}`)
    : actionCommand

  return (
    <div className={`card automation-card ${!automation.enabled ? 'automation-card--disabled' : ''}`}>
      <div className="automation-card__header">
        <div className="automation-card__info">
          <span className="automation-card__name">{automation.name}</span>
          <span className="automation-card__trigger">
            {t(`automation.${automation.trigger_type}`)} — {triggerLabel}
          </span>
          <span className="automation-card__action">{actionLabel}</span>
        </div>
        <div className="automation-card__actions">
          <button
            className={`toggle-switch ${automation.enabled ? 'active' : ''}`}
            onClick={handleToggle}
            aria-label={t('automation.enabled')}
          />
          <button className="icon-btn icon-btn--danger" onClick={handleDelete} aria-label={t('automation.delete')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
