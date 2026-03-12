import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'dark' | 'light' | null

interface UiStore {
  readonly theme: Theme
  cycleTheme: () => void
}

function applyTheme(theme: Theme) {
  if (theme) {
    document.documentElement.setAttribute('data-theme', theme)
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      theme: null,

      cycleTheme: () => set((prev) => {
        const next: Theme =
          prev.theme === null ? 'dark' :
          prev.theme === 'dark' ? 'light' :
          null
        applyTheme(next)
        return { theme: next }
      }),
    }),
    {
      name: 'purify_ui',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    },
  ),
)
