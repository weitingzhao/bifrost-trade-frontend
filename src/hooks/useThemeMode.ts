import { useCallback, useEffect, useState } from 'react'
import { STORAGE_KEYS } from '@/constants/storage'

export type ThemeMode = 'auto' | 'light' | 'dark'

const CYCLE: Record<ThemeMode, ThemeMode> = { auto: 'light', light: 'dark', dark: 'auto' }
export const THEME_LABELS: Record<ThemeMode, string> = {
  auto: 'Auto (System)',
  light: 'Light',
  dark: 'Dark',
}

function applyTheme(mode: ThemeMode) {
  const dark =
    mode === 'dark' ||
    (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

function readTheme(): ThemeMode {
  const saved = localStorage.getItem(STORAGE_KEYS.theme)
  return saved === 'light' || saved === 'dark' || saved === 'auto' ? saved : 'auto'
}

export function useThemeMode() {
  const [mode, setModeState] = useState<ThemeMode>(readTheme)

  useEffect(() => {
    applyTheme(mode)
    localStorage.setItem(STORAGE_KEYS.theme, mode)
    if (mode !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('auto')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  const cycleMode = useCallback(() => {
    setModeState((m) => CYCLE[m])
  }, [])

  return { mode, cycleMode }
}
