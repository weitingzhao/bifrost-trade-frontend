/**
 * Reduce transparency (design Rev .70 §1, macOS Accessibility › Display).
 *
 * `bifrost.glass` = `solid` | `glass`, set from the user centre; unset, the
 * system's `prefers-reduced-transparency` decides. The choice lands on
 * `<html data-glass>`; index.css turns every `[data-glass-surface]` — panel,
 * float, toolbar, sidebar, popovers, tips, toast, banners, Quick Look, the
 * drop bar — solid when it says so.
 */
import { useCallback, useEffect, useState } from 'react'

export const GLASS_KEY = 'bifrost.glass'
export const GLASS_EVENT = 'bifrost:glass'

export type GlassChoice = 'solid' | 'glass' | null

export function readGlass(): GlassChoice {
  try {
    const v = localStorage.getItem(GLASS_KEY)
    return v === 'solid' || v === 'glass' ? v : null
  } catch {
    return null
  }
}

export function applyGlass(choice: GlassChoice = readGlass(), doc: Document = document): void {
  const root = doc.documentElement
  if (choice) root.dataset.glass = choice
  else delete root.dataset.glass
}

/** Whether the surfaces are solid now — the user's switch, else the system's. */
export function glassIsSolid(choice: GlassChoice = readGlass()): boolean {
  if (choice) return choice === 'solid'
  try {
    return window.matchMedia('(prefers-reduced-transparency: reduce)').matches
  } catch {
    return false
  }
}

export function setGlass(choice: Exclude<GlassChoice, null>): void {
  try {
    localStorage.setItem(GLASS_KEY, choice)
  } catch {
    // Storage refused (private window): the choice still applies to this tab.
  }
  applyGlass(choice)
  window.dispatchEvent(new CustomEvent(GLASS_EVENT, { detail: choice }))
}

/**
 * Keep `<html data-glass>` in step app-wide — this tab's switch, another
 * tab's (the storage event), anything that announces a change. Mounted once.
 */
export function useGlassSync(): void {
  useEffect(() => {
    const sync = () => applyGlass()
    sync()
    window.addEventListener(GLASS_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(GLASS_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
}

/** For the switch: solid now, and a toggle that writes the opposite. */
export function useGlass() {
  const [solid, setSolid] = useState(() => glassIsSolid())
  useEffect(() => {
    const sync = () => {
      applyGlass()
      setSolid(glassIsSolid())
    }
    window.addEventListener(GLASS_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(GLASS_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  const toggle = useCallback(() => setGlass(glassIsSolid() ? 'glass' : 'solid'), [])
  return { solid, toggle }
}
