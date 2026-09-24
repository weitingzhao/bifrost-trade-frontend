/**
 * Theme — three stored modes, two resolved themes (design Rev 2026-09-23.11).
 *
 * `bifrost.theme` holds `dark`, `light` or `auto`; `auto` resolves by the
 * local clock, light from 07:00 to 19:00. The mode is what a settings control
 * draws as selected; the resolved theme is what the page renders. They are
 * kept apart because "Auto" is a choice the reader made, and drawing the
 * control as "Light" at noon would be reporting the clock back as their
 * answer.
 *
 * The same key and the same rule as the prototypes' registry, so a reader who
 * picks a mode in either place finds it held in the other. `index.html` runs a
 * copy of `resolveTheme` before the first paint — it cannot import this file —
 * so the page never flashes the wrong ground; the test pins the two together.
 *
 * One difference from the prototypes, on purpose: they reload the page to
 * change theme, because a prototype restores its state from storage. This app
 * keeps its state in memory and switches the class in place.
 */
import { useCallback, useEffect, useState } from 'react'

export type ThemeMode = 'dark' | 'light' | 'auto'
export type Theme = 'dark' | 'light'

export const THEME_KEY = 'bifrost.theme'
export const THEME_EVENT = 'bifrost:theme'

/** Light from this hour, local time… */
export const AUTO_LIGHT_FROM = 7
/** …until this one. */
export const AUTO_DARK_FROM = 19

export function readThemeMode(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'light' || v === 'auto' ? v : 'dark'
  } catch {
    return 'dark'
  }
}

export function autoTheme(now: Date = new Date()): Theme {
  const h = now.getHours()
  return h >= AUTO_LIGHT_FROM && h < AUTO_DARK_FROM ? 'light' : 'dark'
}

export function resolveTheme(mode: ThemeMode, now: Date = new Date()): Theme {
  return mode === 'auto' ? autoTheme(now) : mode
}

/** Put a resolved theme on the document: the class the tokens hang on, and the scrollbars' colour scheme. */
export function applyTheme(theme: Theme, doc: Document = document): void {
  const root = doc.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.dataset.theme = theme
  root.style.colorScheme = theme
}

export function setThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_KEY, mode)
  } catch {
    // Storage refused (private window): the choice still applies to this tab.
  }
  applyTheme(resolveTheme(mode))
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: mode }))
}

/**
 * The mode and what it resolves to now, for a control that sets it.
 *
 * Under `auto` a minute clock re-resolves while the page is visible, so a
 * page left open across 07:00 or 19:00 turns over by itself — the prototypes'
 * watcher, without their reload.
 */
export function useThemeMode() {
  const [mode, setMode] = useState<ThemeMode>(() => readThemeMode())
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(readThemeMode()))

  useEffect(() => {
    const sync = () => {
      const m = readThemeMode()
      setMode(m)
      setTheme(resolveTheme(m))
    }
    window.addEventListener(THEME_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(THEME_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  useEffect(() => {
    if (mode !== 'auto') return
    const id = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      const next = autoTheme()
      setTheme((cur) => {
        if (cur !== next) applyTheme(next)
        return next
      })
    }, 60_000)
    return () => window.clearInterval(id)
  }, [mode])

  const choose = useCallback((m: ThemeMode) => setThemeMode(m), [])
  return { mode, theme, choose }
}
