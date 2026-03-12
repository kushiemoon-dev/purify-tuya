import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import * as Dialog from '@radix-ui/react-dialog'
import { useDeviceStore } from '@/shared/stores/deviceStore'
import { fetchDevices, createDevice, updateDevice, deleteDevice } from '@/shared/lib/api'
import type { DeviceInfo } from '@/shared/lib/types'

interface DeviceForm {
  name: string
  device_type: string
  device_id: string
  device_ip: string
  local_key: string
  poll_interval: number
  is_mock: boolean
  room_id: number | null
}

const emptyForm: DeviceForm = {
  name: '',
  device_type: 'dehumidifier',
  device_id: '',
  device_ip: '',
  local_key: '',
  poll_interval: 5,
  is_mock: true,
  room_id: null,
}

export function DeviceManager() {
  const { t } = useTranslation()
  const deviceList = useDeviceStore((s) => s.deviceList)
  const rooms = useDeviceStore((s) => s.rooms)
  const setDeviceList = useDeviceStore((s) => s.setDeviceList)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DeviceInfo | null>(null)
  const [form, setForm] = useState<DeviceForm>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    fetchDevices().then(setDeviceList).catch(() => {})
  }, [setDeviceList])

  useEffect(() => { refresh() }, [refresh])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
    setOpen(true)
  }

  function openEdit(device: DeviceInfo) {
    setEditing(device)
    setForm({
      name: device.name,
      device_type: device.device_type,
      device_id: device.device_id,
      device_ip: device.device_ip,
      local_key: '',
      poll_interval: device.poll_interval,
      is_mock: device.is_mock,
      room_id: device.room_id,
    })
    setError(null)
    setOpen(true)
  }

  async function handleSave() {
    setLoading(true)
    setError(null)
    try {
      if (editing) {
        const updates: Record<string, unknown> = { ...form }
        if (!form.local_key) delete updates.local_key
        await updateDevice(editing.id, updates as Partial<DeviceInfo>)
      } else {
        await createDevice(form)
      }
      setOpen(false)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const [deleteConfirm, setDeleteConfirm] = useState<DeviceInfo | null>(null)

  async function handleDelete(device: DeviceInfo) {
    try {
      await deleteDevice(device.id)
      setDeleteConfirm(null)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  function updateField<K extends keyof DeviceForm>(key: K, value: DeviceForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="card settings-section">
      <div className="card-header">
        <span className="card-label">Devices</span>
        <button className="pill active" onClick={openAdd}>+ Add</button>
      </div>

      <div className="settings-list">
        {deviceList.map((device) => (
          <div key={device.id} className="settings-list__item">
            <div className="settings-list__info">
              <span className="settings-list__name">{device.name}</span>
              <span className="settings-list__meta">
                {device.device_type} · {device.is_mock ? 'Mock' : device.device_ip || 'No IP'}
              </span>
            </div>
            <div className="settings-list__actions">
              <button className="icon-btn" onClick={() => openEdit(device)} aria-label="Edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button className="icon-btn icon-btn--danger" onClick={() => setDeleteConfirm(device)} aria-label="Delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal container={document.body}>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content className="modal-sheet" aria-describedby={undefined}>
            <div className="modal-header">
              <Dialog.Title className="modal-title">
                {editing ? 'Edit Device' : 'Add Device'}
              </Dialog.Title>
              <Dialog.Close className="modal-close">&times;</Dialog.Close>
            </div>

            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={form.name} onChange={(e) => updateField('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-input" value={form.device_type} onChange={(e) => updateField('device_type', e.target.value)}>
                <option value="dehumidifier">Dehumidifier</option>
                <option value="air_purifier">Air Purifier</option>
              </select>
            </div>
            <div className="form-row">
              <span className="form-row-label">{t('settings.mock')}</span>
              <button
                className={`toggle-switch ${form.is_mock ? 'active' : ''}`}
                onClick={() => updateField('is_mock', !form.is_mock)}
              />
            </div>
            {!form.is_mock && (
              <>
                <div className="form-group">
                  <label className="form-label">Device ID</label>
                  <input className="form-input" value={form.device_id} onChange={(e) => updateField('device_id', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Device IP</label>
                  <input className="form-input" value={form.device_ip} onChange={(e) => updateField('device_ip', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Local Key</label>
                  <input
                    className="form-input"
                    value={form.local_key}
                    onChange={(e) => updateField('local_key', e.target.value)}
                    placeholder={editing ? t('settings.keyPlaceholder') : ''}
                  />
                </div>
              </>
            )}
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
            <div className="form-group">
              <label className="form-label">Room</label>
              <select
                className="form-input"
                value={form.room_id ?? ''}
                onChange={(e) => updateField('room_id', e.target.value ? parseInt(e.target.value, 10) : null)}
              >
                <option value="">None</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>{room.name}</option>
                ))}
              </select>
            </div>

            <button className="save-btn" onClick={handleSave} disabled={loading || !form.name}>
              {loading ? t('settings.saving') : t('settings.save')}
            </button>

            {error && <div className="modal-feedback error">{error}</div>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={deleteConfirm !== null} onOpenChange={(v) => { if (!v) setDeleteConfirm(null) }}>
        <Dialog.Portal container={document.body}>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content className="modal-sheet" aria-describedby={undefined}>
            <Dialog.Title className="modal-title">
              Delete "{deleteConfirm?.name}"?
            </Dialog.Title>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button className="pill" style={{ flex: 1 }} onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                className="pill active"
                style={{ flex: 1, background: 'var(--danger, #ef4444)' }}
                onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              >
                Delete
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
