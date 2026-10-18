/**
 * The layout axes (design Rev .164 → .176, DESIGN_CONTRACTS §18.1 · §18.12 · §18.14).
 *
 * Since D2 (Rev .176) the package measures: `@bifrost/ui`'s `LayoutProvider`,
 * mounted once in `layout/LayoutHost`, keeps `{ w, h, input, keys, dock }`
 * current, writes `data-w` · `data-h` · `data-input` · `data-keys` ·
 * `data-dock` · `data-safe` on `<html>` and fires `bifrost:layout` on a
 * crossing. This module is what the app reads it through, plus the parts the
 * package leaves to the app (§18.14):
 *
 * - **Preview presets** — `?device=phone|duo-out|duo-in|ipad|desk` picks a
 *   preset for the tab's session; it becomes the provider's `override` (phone
 *   pins compact; every preset pins its input), and with `&sim=1` the
 *   preset's safe areas are simulated. `?layout=compact|…|auto` is the
 *   package's own (same session key as before).
 * - **Compatibility labels** — `data-device` (phone · pad · desk),
 *   `data-orient`, `data-pwa` and `data-touch` (= touch input), written by
 *   `LayoutHost` for the CSS and code written against Rev .163.
 *
 * `useDevice()` stays as Rev .163's alias: phone = compact; pad = touch or a
 * coarse pointer above compact; desk otherwise.
 */
import { readLayoutAttrs, useLayout as usePackageLayout, type Layout } from '@bifrost/ui'

export type WidthClass = Layout['w']
export type HeightClass = Layout['h']
export type InputKind = Layout['input']
export type Device = 'phone' | 'pad' | 'desk'
export type Orient = 'port' | 'land'

export type LayoutState = Layout

export interface DeviceState {
  device: Device
  /** Touch input — hit areas, long-press, no tooltips. */
  touch: boolean
  orient: Orient
  /** Opened from the home screen (`display-mode: standalone`). */
  pwa: boolean
}

export const LAYOUT_EVENT = 'bifrost:layout'
const FORCE_KEY = 'bifrost.device'
const SIM_KEY = 'bifrost.device.sim'

/** §18.1, on its own — for the tests, and for anything that judges a box that is not the window. */
export function widthClass(px: number): WidthClass {
  return px < 600 ? 'compact' : px < 1024 ? 'medium' : px < 1440 ? 'expanded' : 'wide'
}

export function heightClass(px: number): HeightClass {
  return px < 900 ? 'short' : 'tall'
}

/** §18.12: the detail docks when the class is wide and the content area is at least 1200 across. */
export const DOCK_MIN_PX = 1200
export function dockOf(w: WidthClass, mainPx: number): boolean {
  return w === 'wide' && mainPx >= DOCK_MIN_PX
}

/** Rev .163's rule, kept for its tests and for the compatibility label. */
export function detectDevice(width: number, height: number, coarse: boolean): Device {
  if (width < 600 || (coarse && Math.min(width, height) < 500)) return 'phone'
  return coarse ? 'pad' : 'desk'
}

export type PresetKind = 'phone' | 'duo-out' | 'duo-in' | 'ipad' | 'desk'
const KINDS: readonly PresetKind[] = ['phone', 'duo-out', 'duo-in', 'ipad', 'desk']

export function media(q: string): boolean {
  try {
    return window.matchMedia(q).matches
  } catch {
    return false
  }
}

function session(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/** `?device=<kind>` for this tab's session (`auto` lets go); null when none is kept. */
export function presetKind(): PresetKind | null {
  if (typeof window === 'undefined') return null
  const s = session()
  try {
    const d = new URLSearchParams(window.location.search).get('device')
    if (d === 'auto') {
      s?.removeItem(FORCE_KEY)
      s?.removeItem(SIM_KEY)
    } else if (d) {
      const k = d === 'pad' ? 'ipad' : d
      if ((KINDS as readonly string[]).includes(k)) {
        s?.setItem(FORCE_KEY, k)
        const sim = new URLSearchParams(window.location.search).get('sim')
        if (sim === '1') s?.setItem(SIM_KEY, '1')
        else if (sim != null) s?.removeItem(SIM_KEY)
      }
    }
    const kept = s?.getItem(FORCE_KEY)
    // Rev .163 stored `pad`; it is the iPad preset now.
    return kept === 'pad' ? 'ipad' : kept && (KINDS as readonly string[]).includes(kept) ? (kept as PresetKind) : null
  } catch {
    return null
  }
}

/** The preset as the provider's override: phone pins compact, every preset pins its input. */
export function presetOverride(kind: PresetKind | null = presetKind()): Partial<Pick<Layout, 'w' | 'input'>> | undefined {
  if (!kind) return undefined
  return kind === 'phone' ? { w: 'compact', input: 'touch' } : { input: kind === 'desk' ? 'pointer' : 'touch' }
}

/** The design's simulated insets (t, b, l, r) per preset; the Duo's are estimates. Null without `&sim=1`. */
const SIM: Record<Exclude<PresetKind, 'desk'>, Record<Orient, readonly [number, number, number, number]>> = {
  phone: { port: [59, 34, 0, 0], land: [0, 21, 59, 59] },
  'duo-out': { port: [54, 30, 0, 0], land: [0, 21, 54, 54] },
  'duo-in': { port: [24, 20, 0, 0], land: [24, 20, 0, 0] },
  ipad: { port: [24, 20, 0, 0], land: [24, 20, 0, 0] },
}

export function simulatedInsets(kind: PresetKind | null, orient: Orient): readonly [number, number, number, number] | null {
  if (!kind || kind === 'desk' || session()?.getItem(SIM_KEY) !== '1') return null
  return SIM[kind][orient]
}

function orientNow(): Orient {
  return typeof window !== 'undefined' && window.innerWidth >= window.innerHeight ? 'land' : 'port'
}

function deviceOf(l: Layout, kind: PresetKind | null): DeviceState {
  const coarse = media('(pointer: coarse)')
  return {
    device: l.w === 'compact' ? 'phone' : l.input === 'touch' || coarse || (kind != null && kind !== 'desk') ? 'pad' : 'desk',
    touch: l.input === 'touch',
    orient: orientNow(),
    pwa: media('(display-mode: standalone)') || (navigator as Navigator & { standalone?: boolean }).standalone === true,
  }
}

const NO_LAYOUT: Layout = { w: 'wide', h: 'tall', input: 'pointer', keys: false, dock: false }

/** The axes now, outside React (event handlers, imperative shell code): read back off `<html>`. */
export function layoutNow(): LayoutState {
  return readLayoutAttrs() ?? NO_LAYOUT
}

/** The axes, kept current by the package's provider: crossing a class re-renders the caller. */
export function useLayout(): LayoutState {
  return usePackageLayout()
}

/** Rev .163's tier, outside React. */
export function deviceNow(): DeviceState {
  return deviceOf(layoutNow(), presetKind())
}

/** Rev .163's tier — phone = compact. New code reads `useLayout()`. */
export function useDevice(): DeviceState {
  return deviceOf(useLayout(), presetKind())
}
