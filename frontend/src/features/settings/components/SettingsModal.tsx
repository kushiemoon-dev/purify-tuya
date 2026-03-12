import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import * as Dialog from '@radix-ui/react-dialog'
import { useDeviceStore } from '@/shared/stores/deviceStore'
import { fetchSettings, postSettings } from '@/shared/lib/api'
import type { Settings } from '@/shared/lib/types'

export function SettingsModal() {
  const { t } = useTranslation()
  const connected = useDeviceStore((s) => s.connected)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleOpen = useCallback(async (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setError(null)
      setSuccess(false)
      setLoading(true)
      try {
        const settings = await fetchSettings()
        setForm({ ...settings, local_key: '' })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    } else {
      setForm(null)
      setError(null)
      setSuccess(false)
    }
  }, [])

  const updateField = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev)
  }, [])

  const handleSave = useCallback(async () => {
    if (!form) return
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      await postSettings(form)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }, [form])

  return (
    <Dialog.Root open={open} onOpenChange={handleOpen}>
      <Dialog.Trigger asChild>
        <button className="icon-btn" aria-label={t('settings.title')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-sheet" aria-describedby={undefined}>
          <div className="modal-header">
            <Dialog.Title className="modal-title">{t('settings.title')}</Dialog.Title>
            <Dialog.Close className="modal-close" aria-label="Close">&times;</Dialog.Close>
          </div>

          <div className="modal-connection">
            <span className={`connection-dot ${connected ? 'online' : 'offline'}`} />
            <span>{connected ? t('status.connected') : t('status.disconnected')}</span>
          </div>

          {loading && !form && (
            <div className="loading" style={{ minHeight: '120px' }}>
              <div className="spinner" />
            </div>
          )}

          {form && (
            <>
              <div className="form-group">
                <label className="form-label">Device ID</label>
                <input
                  className="form-input"
                  value={form.device_id}
                  onChange={(e) => updateField('device_id', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Device IP</label>
                <input
                  className="form-input"
                  value={form.device_ip}
                  onChange={(e) => updateField('device_ip', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Local Key</label>
                <input
                  className="form-input"
                  value={form.local_key}
                  onChange={(e) => updateField('local_key', e.target.value)}
                  placeholder={t('settings.keyPlaceholder')}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('settings.polling')}</label>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  max={300}
                  value={form.poll_interval}
                  onChange={(e) => updateField('poll_interval', parseInt(e.target.value, 10) || 5)}
                />
              </div>
              <div className="form-row">
                <span className="form-row-label">{t('settings.mock')}</span>
                <button
                  className={`toggle-switch ${form.mock_device ? 'active' : ''}`}
                  onClick={() => updateField('mock_device', !form.mock_device)}
                />
              </div>
              <button
                className="save-btn"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? t('settings.saving') : t('settings.save')}
              </button>
            </>
          )}

          {success && (
            <div className="modal-feedback success">{t('settings.saved')}</div>
          )}
          {error && (
            <div className="modal-feedback error">{error}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
