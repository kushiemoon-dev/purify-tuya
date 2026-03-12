import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createAutomation, fetchDevices } from '@/shared/lib/api'
import type { DeviceInfo, TriggerType } from '@/shared/lib/types'

interface AutomationEditorProps {
  readonly onSaved: () => void
  readonly onCancel: () => void
}

const OPERATORS = ['>', '>=', '<', '<=', '=='] as const
const COMMANDS = [
  { value: 'set_power', args: { on: true }, labelKey: 'set_power_on' },
  { value: 'set_power', args: { on: false }, labelKey: 'set_power_off' },
] as const

export function AutomationEditor({ onSaved, onCancel }: AutomationEditorProps) {
  const { t } = useTranslation()
  const [devices, setDevices] = useState<readonly DeviceInfo[]>([])
  const [saving, setSaving] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [triggerType, setTriggerType] = useState<TriggerType>('threshold')
  const [triggerDeviceId, setTriggerDeviceId] = useState<number>(0)
  const [metric, setMetric] = useState('humidity_current')
  const [operator, setOperator] = useState<'>' | '>=' | '<' | '<=' | '=='>('>')
  const [thresholdValue, setThresholdValue] = useState(65)
  const [scheduleTime, setScheduleTime] = useState('08:00')
  const [actionDeviceId, setActionDeviceId] = useState<number>(0)
  const [commandIdx, setCommandIdx] = useState(0)
  const [cooldown, setCooldown] = useState(300)

  useEffect(() => {
    fetchDevices().then((devs) => {
      setDevices(devs)
      if (devs.length > 0) {
        setTriggerDeviceId(devs[0].id)
        setActionDeviceId(devs[0].id)
      }
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!name.trim()) return
    setSaving(true)

    const cmd = COMMANDS[commandIdx]
    const triggerConfig = triggerType === 'threshold'
      ? { device_id: triggerDeviceId, metric, operator, value: thresholdValue }
      : { time: scheduleTime }

    try {
      await createAutomation({
        name: name.trim(),
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        action_type: 'device_command',
        action_config: {
          device_id: actionDeviceId,
          command: cmd.value,
          args: { ...cmd.args },
        },
        cooldown,
        enabled: true,
      })
      onSaved()
    } catch {
      setSaving(false)
    }
  }, [name, triggerType, triggerDeviceId, metric, operator, thresholdValue, scheduleTime, actionDeviceId, commandIdx, cooldown, onSaved])

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{t('automation.add')}</h3>
          <button className="modal-close" onClick={onCancel}>&times;</button>
        </div>

        <div className="form-group">
          <label className="form-label">{t('automation.name')}</label>
          <input
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('automation.namePlaceholder')}
          />
        </div>

        <div className="form-group">
          <label className="form-label">{t('automation.trigger')}</label>
          <div className="time-range-selector">
            <button
              className={`pill ${triggerType === 'threshold' ? 'active' : ''}`}
              onClick={() => setTriggerType('threshold')}
            >
              {t('automation.threshold')}
            </button>
            <button
              className={`pill ${triggerType === 'schedule' ? 'active' : ''}`}
              onClick={() => setTriggerType('schedule')}
            >
              {t('automation.schedule')}
            </button>
          </div>
        </div>

        {triggerType === 'threshold' ? (
          <>
            <div className="form-group">
              <label className="form-label">{t('automation.targetDevice')}</label>
              <select
                className="form-input"
                value={triggerDeviceId}
                onChange={(e) => setTriggerDeviceId(Number(e.target.value))}
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">{t('automation.metric')}</label>
              <select className="form-input" value={metric} onChange={(e) => setMetric(e.target.value)}>
                <option value="humidity_current">humidity_current</option>
              </select>
            </div>
            <div className="automation-threshold-row">
              <select className="form-input" value={operator} onChange={(e) => setOperator(e.target.value as typeof operator)}>
                {OPERATORS.map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
              <input
                className="form-input"
                type="number"
                value={thresholdValue}
                onChange={(e) => setThresholdValue(Number(e.target.value))}
                min={0}
                max={100}
              />
            </div>
          </>
        ) : (
          <div className="form-group">
            <label className="form-label">{t('automation.time')}</label>
            <input
              className="form-input"
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
            />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">{t('automation.action')}</label>
          <select
            className="form-input"
            value={actionDeviceId}
            onChange={(e) => setActionDeviceId(Number(e.target.value))}
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">{t('automation.command')}</label>
          <select
            className="form-input"
            value={commandIdx}
            onChange={(e) => setCommandIdx(Number(e.target.value))}
          >
            {COMMANDS.map((cmd, i) => (
              <option key={i} value={i}>{t(`automation.commands.${cmd.labelKey}`)}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">{t('automation.cooldown')}</label>
          <input
            className="form-input"
            type="number"
            value={cooldown}
            onChange={(e) => setCooldown(Number(e.target.value))}
            min={0}
            step={60}
          />
        </div>

        <button className="save-btn" onClick={handleSave} disabled={saving || !name.trim()}>
          {t('automation.save')}
        </button>
      </div>
    </div>
  )
}
