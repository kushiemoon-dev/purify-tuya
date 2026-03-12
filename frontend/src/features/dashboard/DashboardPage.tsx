import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useDeviceStore } from '@/shared/stores/deviceStore'
import { fetchDevices, fetchRooms } from '@/shared/lib/api'
import { DashboardSkeleton } from '@/shared/components/ui/Skeleton'
import { RoomSection } from './components/RoomSection'

export function DashboardPage() {
  const { t } = useTranslation()
  const deviceList = useDeviceStore((s) => s.deviceList)
  const rooms = useDeviceStore((s) => s.rooms)
  const setDeviceList = useDeviceStore((s) => s.setDeviceList)
  const setRooms = useDeviceStore((s) => s.setRooms)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchDevices().then(setDeviceList).catch(() => {}),
      fetchRooms().then(setRooms).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [setDeviceList, setRooms])

  const grouped = useMemo(() => {
    const roomMap = new Map(rooms.map((r) => [r.id, r]))
    const groups: { room: typeof rooms[number] | null; devices: typeof deviceList }[] = []

    const byRoom = new Map<number | null, typeof deviceList[number][]>()
    for (const device of deviceList) {
      const key = device.room_id
      const existing = byRoom.get(key) ?? []
      byRoom.set(key, [...existing, device])
    }

    for (const room of rooms) {
      const devices = byRoom.get(room.id) ?? []
      if (devices.length > 0) {
        groups.push({ room, devices })
      }
    }

    const unassigned = byRoom.get(null) ?? []
    if (unassigned.length > 0) {
      groups.push({ room: null, devices: unassigned })
    }

    for (const [roomId, devices] of byRoom) {
      if (roomId !== null && !roomMap.has(roomId)) {
        groups.push({ room: null, devices })
      }
    }

    return groups
  }, [deviceList, rooms])

  if (loading) {
    return <DashboardSkeleton />
  }

  if (deviceList.length === 0) {
    return (
      <div className="dashboard">
        <div className="empty-state">
          <div className="empty-state__icon">
            <svg viewBox="0 0 48 48" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round">
              <rect x="8" y="8" width="32" height="32" rx="4" />
              <path d="M24 18v12M18 24h12" />
            </svg>
          </div>
          <h3 className="empty-state__title">{t('dashboard.empty')}</h3>
          <p className="empty-state__desc">{t('dashboard.emptyDesc')}</p>
          <Link to="/settings" className="save-btn" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
            {t('dashboard.addDevice')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {grouped.map((group, i) => (
        <RoomSection key={group.room?.id ?? `unassigned-${i}`} room={group.room} devices={group.devices} />
      ))}
    </div>
  )
}
