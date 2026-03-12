import { useState, useEffect, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useDeviceStore } from '@/shared/stores/deviceStore'
import { fetchRooms, createRoom, updateRoom, deleteRoom } from '@/shared/lib/api'
import type { RoomInfo } from '@/shared/lib/types'

interface RoomForm {
  name: string
  icon: string
}

const emptyForm: RoomForm = { name: '', icon: 'home' }

export function RoomManager() {
  const rooms = useDeviceStore((s) => s.rooms)
  const setRooms = useDeviceStore((s) => s.setRooms)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RoomInfo | null>(null)
  const [form, setForm] = useState<RoomForm>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    fetchRooms().then(setRooms).catch(() => {})
  }, [setRooms])

  useEffect(() => { refresh() }, [refresh])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setError(null)
    setOpen(true)
  }

  function openEdit(room: RoomInfo) {
    setEditing(room)
    setForm({ name: room.name, icon: room.icon })
    setError(null)
    setOpen(true)
  }

  async function handleSave() {
    setLoading(true)
    setError(null)
    try {
      if (editing) {
        await updateRoom(editing.id, form)
      } else {
        await createRoom(form)
      }
      setOpen(false)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const [deleteConfirm, setDeleteConfirm] = useState<RoomInfo | null>(null)

  async function handleDelete(room: RoomInfo) {
    try {
      await deleteRoom(room.id)
      setDeleteConfirm(null)
      refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  return (
    <div className="card settings-section">
      <div className="card-header">
        <span className="card-label">Rooms</span>
        <button className="pill active" onClick={openAdd}>+ Add</button>
      </div>

      <div className="settings-list">
        {rooms.map((room) => (
          <div key={room.id} className="settings-list__item">
            <div className="settings-list__info">
              <span className="settings-list__name">{room.name}</span>
              <span className="settings-list__meta">{room.icon}</span>
            </div>
            <div className="settings-list__actions">
              <button className="icon-btn" onClick={() => openEdit(room)} aria-label="Edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button className="icon-btn icon-btn--danger" onClick={() => setDeleteConfirm(room)} aria-label="Delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
        {rooms.length === 0 && (
          <div className="settings-list__empty">No rooms yet</div>
        )}
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal container={document.body}>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content className="modal-sheet" aria-describedby={undefined}>
            <div className="modal-header">
              <Dialog.Title className="modal-title">
                {editing ? 'Edit Room' : 'Add Room'}
              </Dialog.Title>
              <Dialog.Close className="modal-close">&times;</Dialog.Close>
            </div>

            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Icon</label>
              <input
                className="form-input"
                value={form.icon}
                onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
              />
            </div>

            <button className="save-btn" onClick={handleSave} disabled={loading || !form.name}>
              {loading ? 'Saving...' : 'Save'}
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
