import { useState, useEffect, useCallback } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useWebSocket } from '@/shared/hooks/useWebSocket'
import { StatusBar } from '@/shared/components/ui/StatusBar'
import { PageTransition } from '@/shared/components/ui/PageTransition'
import { BottomNav } from '@/shared/components/layout/BottomNav'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { DevicePage } from '@/features/device/DevicePage'
import { AutomationPage } from '@/features/automation/AutomationPage'
import { NotificationPage } from '@/features/notifications/NotificationPage'
import { NotificationToast } from '@/features/notifications/components/NotificationToast'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { OnboardingWizard } from '@/features/onboarding/OnboardingWizard'
import { fetchDevices } from '@/shared/lib/api'

function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><DashboardPage /></PageTransition>} />
        <Route path="/device/:id" element={<PageTransition><DevicePage /></PageTransition>} />
        <Route path="/automations" element={<PageTransition><AutomationPage /></PageTransition>} />
        <Route path="/notifications" element={<PageTransition><NotificationPage /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><SettingsPage /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  )
}

function AppContent() {
  useWebSocket()
  const alreadyOnboarded = localStorage.getItem('purify_onboarded') === '1'
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [checked, setChecked] = useState(alreadyOnboarded)

  useEffect(() => {
    if (alreadyOnboarded) return
    // Check if there are any devices — if not, show onboarding
    fetchDevices()
      .then((devices) => {
        if (devices.length === 0) {
          setShowOnboarding(true)
        }
        setChecked(true)
      })
      .catch(() => setChecked(true))
  }, [alreadyOnboarded])

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false)
  }, [])

  if (!checked) return null

  if (showOnboarding) {
    return (
      <div className="app-shell">
        <StatusBar />
        <main className="app-main">
          <OnboardingWizard onComplete={handleOnboardingComplete} />
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <StatusBar />
      <main className="app-main">
        <AnimatedRoutes />
      </main>
      <BottomNav />
      <NotificationToast />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/purify">
      <AppContent />
    </BrowserRouter>
  )
}
