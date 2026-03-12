import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotificationStore } from '@/shared/stores/notificationStore'

const navItems = [
  {
    to: '/',
    labelKey: 'nav.dashboard',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1',
  },
  {
    to: '/automations',
    labelKey: 'nav.automations',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
  },
  {
    to: '/notifications',
    labelKey: 'nav.notifications',
    icon: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0',
    badge: true,
  },
  {
    to: '/settings',
    labelKey: 'settings.title',
    icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
  },
]

export function BottomNav() {
  const { t } = useTranslation()
  const unreadCount = useNotificationStore((s) => s.unreadCount)

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `bottom-nav__item ${isActive ? 'active' : ''}`}
        >
          <div className="bottom-nav__icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
            {item.badge && unreadCount > 0 && (
              <span className="bottom-nav__badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
          <span>{t(item.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  )
}
