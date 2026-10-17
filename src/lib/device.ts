/**
 * The device tier (design Rev .163, DESIGN_CONTRACTS §18.1, Shell Spec §6.1).
 *
 * One code base, three tiers, judged by the window and never by the user
 * agent:
 *
 * - **phone** — narrower than 600, or a coarse pointer whose short side is
 *   under 500. An iPhone on its side is still a phone; an iPad split down to
 *   under 600 lays out as one.
 * - **pad** — any other coarse pointer.
 * - **desk** — everything else.
 *
 * The verdict lands on `<html>` as `data-device` · `data-touch` ·
 * `data-orient` · `data-pwa`; `styles/device.css` and the pages read those
 * attributes and `useDevice()`, never the width themselves. A change of tier
 * re-renders every reader (the store below), so the shell can swap its
 * sidebar for a tab bar without a reload.
 *
 * Preview: `?device=phone|pad|desk` forces a tier for the tab's session (the
 * design's Device Preview does the same with a frame name), `?device=auto`
 * lets go, and `&sim=1` adds the iPhone 15 Pro / iPad Air safe areas so the
 * insets can be checked on a desktop browser.
 */
import { useSyncExternalStore } from 'react'

export type Device = 'phone' | 'pad' | 'desk'
export type Orient = 'port' | 'land'

export interface DeviceState {
  device: Device
  /** Phone, pad, or a desktop with a coarse pointer — hit areas, long-press, no tooltips. */
  touch: boolean
  orient: Orient
  /** Opened from the home screen (`display-mode: standalone`). */
  pwa: boolean
}

export const DEVICE_EVENT = 'bifrost:device'
const FORCE_KEY = 'bifrost.device'
const SIM_KEY = 'bifrost.device.sim'

/** The §18.1 rule on its own, for the test and for anything that must judge a box that is not the window. */
export function detectDevice(width: number, height: number, coarse: boolean): Device {
  if (width < 600 || (coarse && Math.min(width, height) < 500)) return 'phone'
  return coarse ? 'pad' : 'desk'
}

function media(q: string): boolean {
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

/** `?device=` wins for this tab's session; `?device=auto` clears it. */
function forced(): Device | null {
  const s = session()
  try {
    const q = new URLSearchParams(window.location.search)
    const want = q.get('device')
    if (want === 'phone' || want === 'pad' || want === 'desk') {
      s?.setItem(FORCE_KEY, want)
      if (q.get('sim') === '1') s?.setItem(SIM_KEY, '1')
      else if (q.has('sim')) s?.removeItem(SIM_KEY)
    } else if (want === 'auto') {
      s?.removeItem(FORCE_KEY)
      s?.removeItem(SIM_KEY)
    }
    const kept = s?.getItem(FORCE_KEY)
    return kept === 'phone' || kept === 'pad' || kept === 'desk' ? kept : null
  } catch {
    return null
  }
}

function readTier(): DeviceState {
  const coarse = media('(pointer: coarse)')
  const w = window.innerWidth
  const h = window.innerHeight
  const device = forced() ?? detectDevice(w, h, coarse)
  return {
    device,
    touch: device !== 'desk' || coarse,
    orient: w >= h ? 'land' : 'port',
    pwa: media('(display-mode: standalone)') || (navigator as Navigator & { standalone?: boolean }).standalone === true,
  }
}

/** The design's simulated insets (t, b, l, r), for a desktop preview of a phone or a pad. */
const SIM: Record<Exclude<Device, 'desk'>, Record<Orient, readonly [number, number, number, number]>> = {
  phone: { port: [59, 34, 0, 0], land: [0, 21, 59, 59] },
  pad: { port: [24, 20, 0, 0], land: [24, 20, 0, 0] },
}

function apply(s: DeviceState, doc: Document = document): void {
  const root = doc.documentElement
  root.dataset.device = s.device
  root.dataset.orient = s.orient
  if (s.touch) root.dataset.touch = '1'
  else delete root.dataset.touch
  if (s.pwa) root.dataset.pwa = '1'
  else delete root.dataset.pwa
  const sim = session()?.getItem(SIM_KEY) === '1' && s.device !== 'desk' ? SIM[s.device][s.orient] : null
  ;(['t', 'b', 'l', 'r'] as const).forEach((k, i) => {
    if (sim) root.style.setProperty(`--sr-safe-${k}`, `${sim[i]}px`)
    else root.style.removeProperty(`--sr-safe-${k}`)
  })
}

const SERVER: DeviceState = { device: 'desk', touch: false, orient: 'land', pwa: false }
let current: DeviceState = typeof window === 'undefined' ? SERVER : readTier()
const listeners = new Set<() => void>()

function same(a: DeviceState, b: DeviceState): boolean {
  return a.device === b.device && a.touch === b.touch && a.orient === b.orient && a.pwa === b.pwa
}

function refresh(): void {
  const next = readTier()
  const was = current
  apply(next)
  if (same(was, next)) return
  current = next
  for (const l of listeners) l()
  if (was.device !== next.device) window.dispatchEvent(new CustomEvent(DEVICE_EVENT, { detail: next }))
}

if (typeof window !== 'undefined') {
  // Before the first render: the shell's first frame is already the right tier.
  apply(current)
  let frame = 0
  const soon = () => {
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(refresh)
  }
  window.addEventListener('resize', soon)
  window.addEventListener('orientationchange', soon)
  for (const q of ['(pointer: coarse)', '(display-mode: standalone)']) {
    try {
      window.matchMedia(q).addEventListener('change', soon)
    } catch {
      // Old engines: the resize listener still catches the tiers that matter.
    }
  }
}

function subscribeTier(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** The tier now, outside React (event handlers, imperative shell code). */
export function deviceNow(): DeviceState {
  return current
}

/** The tier, kept current: a change of tier re-renders the caller. */
export function useDevice(): DeviceState {
  return useSyncExternalStore(subscribeTier, () => current, () => SERVER)
}

/** Re-read now — the tests, and a preview that changed `?device=` without a reload. */
export function refreshDevice(): void {
  refresh()
}
