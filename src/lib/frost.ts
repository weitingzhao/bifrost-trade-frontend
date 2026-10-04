/**
 * The frost shell (design Rev .151–.152, Panel Chrome 2a / 2b): the colour
 * fields on the window, the page as a detached glass sheet over them, thick
 * glass behind a page hosted in a panel or a float, the drawer kind
 * transparent on the panel's glass. Trade-only — it lives in `index.css`, not
 * in @bifrost/ui (HANDOFF Rev .151–.154, "app 侧").
 *
 * One attribute decides it: `<html data-frost="on|off">`. It is on unless
 *
 *   - the comparison switch says off — `?frost=0` on any URL (remembered as
 *     `bifrost.frost` = `0`; `?frost=1` puts it back), or `bifrost.frost` = `0`
 *     written by hand. The Owner compares the pilot with and without it; the
 *     switch goes once the frost is the only look;
 *   - the surfaces are solid — the user's Reduce transparency, else the
 *     system's (`lib/glass.ts`). Solid is the kill switch for every glass layer,
 *     the frost included, and index.css also keys on `data-glass` itself.
 *
 * index.html sets the attribute before the first paint with the same rules,
 * so a reload never flashes the old ground; `frost.test.ts` pins the copies.
 */
import { useEffect } from 'react'
import { GLASS_EVENT, glassIsSolid } from './glass'

export const FROST_KEY = 'bifrost.frost'
export const FROST_PARAM = 'frost'
export const FROST_EVENT = 'bifrost:frost'

/** The comparison switch: `?frost=0|1` wins and is remembered; else storage; else on. */
export function frostSwitch(search: string = typeof location === 'undefined' ? '' : location.search): boolean {
  const fromUrl = new URLSearchParams(search).get(FROST_PARAM)
  if (fromUrl === '0' || fromUrl === '1') {
    try {
      localStorage.setItem(FROST_KEY, fromUrl)
    } catch {
      // Storage refused (private window): the URL still decides this load.
    }
    return fromUrl === '1'
  }
  try {
    return localStorage.getItem(FROST_KEY) !== '0'
  } catch {
    return true
  }
}

/** Whether the frost paints now: the switch, and the surfaces not solid. */
export function frostIsOn(search?: string): boolean {
  return frostSwitch(search) && !glassIsSolid()
}

export function applyFrost(on: boolean = frostIsOn(), doc: Document = document): void {
  doc.documentElement.dataset.frost = on ? 'on' : 'off'
}

/** For a control or a console: set the switch and repaint. */
export function setFrost(on: boolean): void {
  try {
    localStorage.setItem(FROST_KEY, on ? '1' : '0')
  } catch {
    // Storage refused: applies to this tab only.
  }
  applyFrost()
  window.dispatchEvent(new CustomEvent(FROST_EVENT, { detail: on }))
}

/**
 * Keep `<html data-frost>` in step with the switch, the Reduce transparency
 * switch (this tab's and another tab's) and the system setting. Mounted once,
 * beside `useGlassSync`.
 */
export function useFrostSync(): void {
  useEffect(() => {
    const sync = () => applyFrost()
    sync()
    window.addEventListener(GLASS_EVENT, sync)
    window.addEventListener(FROST_EVENT, sync)
    window.addEventListener('storage', sync)
    let mq: MediaQueryList | null = null
    try {
      mq = window.matchMedia('(prefers-reduced-transparency: reduce)')
      mq.addEventListener?.('change', sync)
    } catch {
      mq = null
    }
    return () => {
      window.removeEventListener(GLASS_EVENT, sync)
      window.removeEventListener(FROST_EVENT, sync)
      window.removeEventListener('storage', sync)
      mq?.removeEventListener?.('change', sync)
    }
  }, [])
}
