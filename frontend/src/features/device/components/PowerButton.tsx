import { useDeviceState } from '@/shared/hooks/useDeviceState'
import { useCommand } from '@/shared/hooks/useCommand'
import { setPower, sendDeviceCommand } from '@/shared/lib/api'

export function PowerButton({ deviceId }: { deviceId?: number }) {
  const { state } = useDeviceState(deviceId)
  const { send, isPending } = useCommand(deviceId)

  const isOn = state?.switch ?? false

  function toggle() {
    if (!state) return
    const next = !state.switch
    const fn = deviceId !== undefined
      ? () => sendDeviceCommand(deviceId, 'set_power', { on: next })
      : () => setPower(next)
    send('power', fn, { switch: next })
  }

  return (
    <button
      className={`power-btn ${isOn ? 'active' : ''} ${isPending('power') ? 'is-pending' : ''}`}
      onClick={toggle}
      disabled={!state || isPending('power')}
      aria-label="Power"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
        <line x1="12" y1="2" x2="12" y2="12" />
      </svg>
    </button>
  )
}
