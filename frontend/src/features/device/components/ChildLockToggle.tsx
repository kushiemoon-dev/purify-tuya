import { useTranslation } from 'react-i18next'
import { useDeviceState } from '@/shared/hooks/useDeviceState'
import { useCommand } from '@/shared/hooks/useCommand'
import { setChildLock, sendDeviceCommand } from '@/shared/lib/api'

export function ChildLockToggle({ deviceId }: { deviceId?: number }) {
  const { t } = useTranslation()
  const { state } = useDeviceState(deviceId)
  const { send, isPending } = useCommand(deviceId)

  const isLocked = state?.child_lock ?? false

  function toggle() {
    if (!state) return
    const next = !state.child_lock
    const fn = deviceId !== undefined
      ? () => sendDeviceCommand(deviceId, 'set_child_lock', { on: next })
      : () => setChildLock(next)
    send('child_lock', fn, { child_lock: next })
  }

  return (
    <div className={`card ${isPending('child_lock') ? 'is-pending' : ''}`}>
      <div className="card-row">
        <span className="card-label">{t('childLock')}</span>
        <button
          className={`toggle-switch ${isLocked ? 'active' : ''}`}
          onClick={toggle}
          disabled={!state || isPending('child_lock')}
          aria-label={t('childLock')}
        />
      </div>
    </div>
  )
}
