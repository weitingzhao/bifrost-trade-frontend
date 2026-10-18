/**
 * The layout axes (design Rev .164 → .174, DESIGN_CONTRACTS §18.1 · §18.12).
 *
 * One code base, judged by three axes and never by the device:
 *
 * - **Width class** `w` — the window's usable width: `compact` < 600 ·
 *   `medium` < 1024 · `expanded` < 1440 · `wide`. An iPhone, a Duo's outer
 *   screen and a narrow window are all compact; an iPad Pro 13″ is expanded.
 * - **Height class** `h` — `short` < 900 · `tall`. An iPad Air and a 13″
 *   laptop browser are short.
 * - **Input** — `touch` or `pointer`, following the last real input: a finger
 *   is touch, a mouse or a trackpad (an iPad Pro on a Magic Keyboard) is
 *   pointer. A key pressed outside a text field means a hardware keyboard:
 *   `keys`, and keyboard hints show.
 * - **Dock** (§18.12) — `w === 'wide'` and the content area (`#main-content`,
 *   the whole block right of the sidebar — never a page's own scroller, Rev
 *   .170) at least 1200 wide: a page's detail docks as a column.
 *
 * The verdict lands on `<html>` as `data-w` · `data-h` · `data-input` ·
 * `data-keys` · `data-dock` · `data-safe` · `data-orient` · `data-pwa`, with
 * `data-touch` (= touch input) and `data-device` (phone · pad · desk) kept as
 * compatibility labels. `styles/device.css` and the pages read those and
 * `useLayout()`; nothing measures the width again. Crossing a class re-renders
 * every reader and fires `bifrost:layout`.
 *
 * Preview: `?device=phone|duo-out|duo-in|ipad|desk` picks a preset for the
 * tab's session — the input default and, with `&sim=1`, simulated safe areas;
 * the classes still come from the real size, except `phone`, which forces
 * compact for a single-window test. `?layout=compact|medium|expanded|wide`
 * forces the width class alone. `?device=auto` / `?layout=auto` let go.
 *
 * `useDevice()` stays as an alias for code written against Rev .163: phone =
 * compact; pad = touch or a coarse pointer above compact; desk otherwise.
 */
import { useSyncExternalStore } from 'react'

export type WidthClass = 'compact' | 'medium' | 'expanded' | 'wide'
export type HeightClass = 'short' | 'tall'
export type InputKind = 'touch' | 'pointer'
export type Device = 'phone' | 'pad' | 'desk'
export type Orient = 'port' | 'land'

export interface LayoutState {
  w: WidthClass
  h: HeightClass
  input: InputKind
  /** A hardware key was pressed outside a text field: keyboard hints show. */
  keys: boolean
  /** wide, and the content area has the room for a docked detail column. */
  dock: boolean
}

export interface DeviceState {
  device: Device
  /** Touch input — hit areas, long-press, no tooltips. */
  touch: boolean
  orient: Orient
  /** Opened from the home screen (`display-mode: standalone`). */
  pwa: boolean
}

export const LAYOUT_EVENT = 'bifrost:layout'
export const DEVICE_EVENT = 'bifrost:device'
const FORCE_KEY = 'bifrost.device'
const SIM_KEY = 'bifrost.device.sim'
const WIDTH_KEY = 'bifrost.layout'

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

type Kind = 'phone' | 'duo-out' | 'duo-in' | 'ipad' | 'desk'
const KINDS: readonly Kind[] = ['phone', 'duo-out', 'duo-in', 'ipad', 'desk']

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

/** `?device=<kind>` / `?layout=<class>` for this tab's session; `auto` lets go. */
function forced(): { kind: Kind | null; w: WidthClass | null } {
  const s = session()
  try {
    const q = new URLSearchParams(window.location.search)
    const d = q.get('device')
    if (d === 'auto') {
      s?.removeItem(FORCE_KEY)
      s?.removeItem(SIM_KEY)
    } else if (d) {
      const k = d === 'pad' ? 'ipad' : d
      if ((KINDS as readonly string[]).includes(k)) {
        s?.setItem(FORCE_KEY, k)
        if (q.get('sim') === '1') s?.setItem(SIM_KEY, '1')
        else if (q.has('sim')) s?.removeItem(SIM_KEY)
      }
    }
    const l = q.get('layout')
    if (l === 'auto') s?.removeItem(WIDTH_KEY)
    else if (l === 'compact' || l === 'medium' || l === 'expanded' || l === 'wide') s?.setItem(WIDTH_KEY, l)
    const kept = s?.getItem(FORCE_KEY)
    // Rev .163 stored `pad`; it is the iPad preset now.
    const kind = kept === 'pad' ? 'ipad' : kept && (KINDS as readonly string[]).includes(kept) ? (kept as Kind) : null
    const w = s?.getItem(WIDTH_KEY)
    return { kind, w: w === 'compact' || w === 'medium' || w === 'expanded' || w === 'wide' ? w : null }
  } catch {
    return { kind: null, w: null }
  }
}

/** The design's simulated insets (t, b, l, r) per preset; the Duo's are estimates. */
const SIM: Record<Exclude<Kind, 'desk'>, Record<Orient, readonly [number, number, number, number]>> = {
  phone: { port: [59, 34, 0, 0], land: [0, 21, 59, 59] },
  'duo-out': { port: [54, 30, 0, 0], land: [0, 21, 54, 54] },
  'duo-in': { port: [24, 20, 0, 0], land: [24, 20, 0, 0] },
  ipad: { port: [24, 20, 0, 0], land: [24, 20, 0, 0] },
}

let envSafe: boolean | null = null
/** Whether this screen has a safe area at all (a notch, a home indicator). Read once. */
function hasEnvSafe(): boolean {
  if (envSafe != null) return envSafe
  try {
    const p = document.createElement('div')
    p.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)'
    document.documentElement.appendChild(p)
    const c = getComputedStyle(p)
    envSafe = [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft].some((v) => parseFloat(v) > 0)
    p.remove()
  } catch {
    envSafe = false
  }
  return envSafe
}

interface Snapshot {
  layout: LayoutState
  device: DeviceState
}

let input: InputKind = 'pointer'
let keys = false
let mainPx: number | null = null

function readSnapshot(): Snapshot {
  const f = forced()
  const iw = window.innerWidth
  const ih = window.innerHeight
  const coarse = media('(pointer: coarse)')
  const w: WidthClass = f.w ?? (f.kind === 'phone' ? 'compact' : widthClass(iw))
  const h = heightClass(ih)
  const dock = dockOf(w, mainPx ?? iw)
  const device: Device = w === 'compact' ? 'phone' : input === 'touch' || coarse || (f.kind != null && f.kind !== 'desk') ? 'pad' : 'desk'
  return {
    layout: { w, h, input, keys, dock },
    device: {
      device,
      touch: input === 'touch',
      orient: iw >= ih ? 'land' : 'port',
      pwa: media('(display-mode: standalone)') || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    },
  }
}

function setFlag(root: HTMLElement, name: string, on: boolean): void {
  if (on) root.setAttribute(name, '1')
  else root.removeAttribute(name)
}

function apply(s: Snapshot, doc: Document = document): void {
  const root = doc.documentElement
  const { layout: l, device: d } = s
  root.dataset.w = l.w
  root.dataset.h = l.h
  root.dataset.input = l.input
  root.dataset.device = d.device
  root.dataset.orient = d.orient
  setFlag(root, 'data-touch', l.input === 'touch')
  setFlag(root, 'data-keys', l.keys)
  setFlag(root, 'data-dock', l.dock)
  setFlag(root, 'data-pwa', d.pwa)
  const f = forced()
  const sim = session()?.getItem(SIM_KEY) === '1' && f.kind && f.kind !== 'desk' ? SIM[f.kind][d.orient] : null
  ;(['t', 'b', 'l', 'r'] as const).forEach((k, i) => {
    if (sim) root.style.setProperty(`--sr-safe-${k}`, `${sim[i]}px`)
    else root.style.removeProperty(`--sr-safe-${k}`)
  })
  setFlag(root, 'data-safe', sim ? sim.some((x) => x > 0) : !f.kind && hasEnvSafe())
}

const SERVER: Snapshot = {
  layout: { w: 'wide', h: 'tall', input: 'pointer', keys: false, dock: true },
  device: { device: 'desk', touch: false, orient: 'land', pwa: false },
}

let current: Snapshot = SERVER
const listeners = new Set<() => void>()

function sameLayout(a: LayoutState, b: LayoutState): boolean {
  return a.w === b.w && a.h === b.h && a.input === b.input && a.keys === b.keys && a.dock === b.dock
}

function sameDevice(a: DeviceState, b: DeviceState): boolean {
  return a.device === b.device && a.touch === b.touch && a.orient === b.orient && a.pwa === b.pwa
}

function refresh(): void {
  const next = readSnapshot()
  const was = current
  apply(next)
  const layoutMoved = !sameLayout(was.layout, next.layout)
  if (!layoutMoved && sameDevice(was.device, next.device)) return
  current = next
  for (const l of listeners) l()
  if (layoutMoved) window.dispatchEvent(new CustomEvent(LAYOUT_EVENT, { detail: next.layout }))
  if (was.device.device !== next.device.device) {
    window.dispatchEvent(new CustomEvent(DEVICE_EVENT, { detail: next.device }))
  }
}

function initialInput(): InputKind {
  const kind = forced().kind
  if (kind) return kind === 'desk' ? 'pointer' : 'touch'
  return media('(pointer: coarse)') ? 'touch' : 'pointer'
}

if (typeof window !== 'undefined') {
  input = initialInput()
  current = readSnapshot()
  // Before the first render: the shell's first frame is already the right class.
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
      // Old engines: the resize listener still catches the classes that matter.
    }
  }
  // Input follows the last real input; a preview preset locks it.
  const setInput = (v: InputKind) => {
    if (forced().kind || input === v) return
    input = v
    refresh()
  }
  document.addEventListener('pointerdown', (e) => setInput(e.pointerType === 'mouse' ? 'pointer' : 'touch'), true)
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType === 'mouse' && e.buttons === 0) setInput('pointer')
    },
    true,
  )
  document.addEventListener(
    'keydown',
    (e) => {
      if (keys || e.isComposing) return
      const t = e.target instanceof Element ? e.target : null
      if (t?.closest('input, textarea, select, [contenteditable]') && !e.metaKey && !e.ctrlKey) return
      keys = true
      refresh()
    },
    true,
  )
}

/**
 * Measure the content area for the dock (§18.12). The shell calls it with
 * `#main-content`; a ResizeObserver keeps it current through sidebar folds,
 * panels pushing and window drags. Returns the cleanup.
 *
 * `beside` is the shell's inspector slot. A docked inspector is the content's
 * sibling, not its child, so its column comes out of `main`; it is added back,
 * or docking takes `main` under 1200, undocks the inspector, gives the width
 * back and docks it again — Plans flipped 61 times in three seconds at 1680
 * (Rev .170's oscillation, from the other side).
 */
export function watchMain(el: HTMLElement | null, beside?: HTMLElement | null): () => void {
  if (!el || typeof ResizeObserver === 'undefined') return () => undefined
  const docked = (): HTMLElement[] => (beside ? [...beside.children].filter((c): c is HTMLElement => c instanceof HTMLElement) : [])
  const measure = () => {
    let px = el.clientWidth
    for (const c of docked()) {
      const cs = getComputedStyle(c)
      px += c.offsetWidth + (parseFloat(cs.marginLeft) || 0) + (parseFloat(cs.marginRight) || 0)
    }
    if (px === mainPx) return
    mainPx = px
    refresh()
  }
  const ro = new ResizeObserver(measure)
  const observeAll = () => {
    ro.disconnect()
    ro.observe(el)
    for (const c of docked()) ro.observe(c)
  }
  observeAll()
  // A column docking or leaving changes the slot's children before any size.
  const mo = beside && typeof MutationObserver !== 'undefined' ? new MutationObserver(() => {
    observeAll()
    measure()
  }) : null
  mo?.observe(beside as HTMLElement, { childList: true })
  measure()
  return () => {
    ro.disconnect()
    mo?.disconnect()
    mainPx = null
  }
}

function subscribeLayout(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** The axes now, outside React (event handlers, imperative shell code). */
export function layoutNow(): LayoutState {
  return current.layout
}

/** The axes, kept current: crossing a class re-renders the caller. */
export function useLayout(): LayoutState {
  return useSyncExternalStore(subscribeLayout, () => current.layout, () => SERVER.layout)
}

/** Rev .163's tier, outside React. */
export function deviceNow(): DeviceState {
  return current.device
}

/** Rev .163's tier — phone = compact. New code reads `useLayout()`. */
export function useDevice(): DeviceState {
  return useSyncExternalStore(subscribeLayout, () => current.device, () => SERVER.device)
}

/** Re-read now — the tests, and a preview that changed `?device=` / `?layout=` without a reload. */
export function refreshDevice(): void {
  refresh()
}

/** For the tests: forget the last input and the keyboard. */
export function resetInputForTest(next: InputKind = 'pointer'): void {
  input = next
  keys = false
  refresh()
}
