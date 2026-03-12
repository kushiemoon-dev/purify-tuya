import type { DeviceInfo, RoomInfo } from '@/shared/lib/types'
import { DeviceCard } from './DeviceCard'

export function RoomSection({
  room,
  devices,
}: {
  room: RoomInfo | null
  devices: readonly DeviceInfo[]
}) {
  if (devices.length === 0) return null

  return (
    <div className="room-section">
      <h3 className="room-section__title">
        {room ? room.name : 'Unassigned'}
      </h3>
      <div className="device-grid">
        {devices.map((device, i) => (
          <DeviceCard key={device.id} device={device} index={i} />
        ))}
      </div>
    </div>
  )
}
