/**
 * Display options (design Rev .72 §11), under Appearance in the user centre.
 *
 * - **Increase contrast** (`bifrost.contrast` = `more`): frames come back on
 *   cards, tags and the glass surfaces (ink 28%), table lines go to 14%, and
 *   the muted inks step toward the text.
 * - **Text size** (`bifrost.textsize` = `s` | `l`, unset = medium): scales
 *   the page lane only — 0.92 / 1 / 1.1 — never the top bar, the sidebar or
 *   the panels.
 *
 * Both land on `<html>` (`data-contrast`, `data-textsize`) before first paint
 * (index.html) and stay in step app-wide (`useDisplaySync`).
 */
import { useCallback, useEffect, useState } from 'react'

export const CONTRAST_KEY = 'bifrost.contrast'
export const TEXTSIZE_KEY = 'bifrost.textsize'
export const DISPLAY_EVENT = 'bifrost:display'

export type TextSize = 's' | 'm' | 'l'

export interface Display {
  contrast: boolean
  textSize: TextSize
}

export function readDisplay(): Display {
  try {
    const ts = localStorage.getItem(TEXTSIZE_KEY)
    return {
      contrast: localStorage.getItem(CONTRAST_KEY) === 'more',
      textSize: ts === 's' || ts === 'l' ? ts : 'm',
    }
  } catch {
    return { contrast: false, textSize: 'm' }
  }
}

export function applyDisplay(d: Display = readDisplay(), doc: Document = document): void {
  const root = doc.documentElement
  if (d.contrast) root.dataset.contrast = 'more'
  else delete root.dataset.contrast
  if (d.textSize === 'm') delete root.dataset.textsize
  else root.dataset.textsize = d.textSize
}

export function setDisplay(patch: Partial<Display>): void {
  const next = { ...readDisplay(), ...patch }
  try {
    if (next.contrast) localStorage.setItem(CONTRAST_KEY, 'more')
    else localStorage.removeItem(CONTRAST_KEY)
    if (next.textSize === 'm') localStorage.removeItem(TEXTSIZE_KEY)
    else localStorage.setItem(TEXTSIZE_KEY, next.textSize)
  } catch {
    // Storage refused: the choice still applies to this tab.
  }
  applyDisplay(next)
  window.dispatchEvent(new CustomEvent(DISPLAY_EVENT, { detail: next }))
}

/** Keep `<html>` in step app-wide — this tab's controls and another tab's. */
export function useDisplaySync(): void {
  useEffect(() => {
    const sync = () => applyDisplay()
    sync()
    window.addEventListener(DISPLAY_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(DISPLAY_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
}

/** For the controls. */
export function useDisplay() {
  const [d, setD] = useState<Display>(() => readDisplay())
  useEffect(() => {
    const sync = () => setD(readDisplay())
    window.addEventListener(DISPLAY_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(DISPLAY_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  const set = useCallback((patch: Partial<Display>) => setDisplay(patch), [])
  return { ...d, set }
}
