/**
 * The surfaces the companion rail opens — and the one rule that governs them.
 *
 * **Page floats, drawer slides, conversation docks** (§5a.8, ninth round). A
 * float is a window over the page you are on; a drawer is the right-edge form
 * the frame page's own drawers already take, so a run — "a read, not an
 * object" — slides rather than being put in a window of its own. At most one
 * of each, and they can coexist: one is central, one is at the edge.
 *
 * **Dock semantics** (tenth round). The design tried a pin button and retired
 * it in one round: *open IS persistent*. A surface rides across navigation
 * until you close it, the icon that opened it stays lit, and there is no
 * second concept. Three ways out: `×`, `Esc`, or the same icon again.
 *
 * **No scrim** (eleventh round). The page behind stays completely interactive,
 * which is the whole claim of the word "float" — the Owner's test was that a
 * scrimmed 84vw panel is a modal with a different name. Closing by clicking
 * the backdrop goes with it.
 *
 * ## What this app does differently from the design, and why
 *
 * The design's float is an **iframe** loading `<file>?embed=1#<route>`, because
 * its prototypes are separate HTML documents and each needs its own shell
 * hidden. This app is one SPA: a float renders the route's own component, so
 * the entire embed mechanism — the flag, the CSS that hides the embedded
 * shell, `data-embed`, the `postMessage` remote control — has no counterpart
 * here and is not built.
 *
 * One consequence is real and is not hidden: **a link inside a float navigates
 * the frame page**, because React Router forbids a second router inside the
 * first and the float therefore shares the page's. For a spine route that is
 * exactly the design's remote-control rule — *"click a name in the notebook
 * and what changes is the board on the desk"*. For an equipment route it is
 * half of it: the float keeps showing what it was showing rather than
 * following the link. Owed, and it needs the pages to take their route as
 * input rather than reading it from the URL.
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'
import { readJson, writeJson } from '@/lib/localStore'
import { EQUIP_GROUPS, type EquipGroup, type EquipSize } from './equip'

export type SurfaceKind = 'float' | 'drawer'

export interface OpenSurface {
  to: string
  label: string
  /** The group's hue token, so the window can wear it. */
  group: EquipGroup['id']
  size: EquipSize
}

/** The design's own keys, so the two sides stay legible to each other. */
const KEY = { float: 'bifrost.float', drawer: 'bifrost.drawer', geo: 'bifrost.floatgeo' }

export interface FloatGeometry {
  /** Pixels from the top, once you have dragged it. */
  t?: number
  l?: number
  w?: number
  h?: number
}

interface SurfaceState {
  float: OpenSurface | null
  drawer: OpenSurface | null
  /** The device mode you last chose for the open float, if you chose one. */
  mode: EquipSize | null
}

const store = createExternalStore<SurfaceState>({
  float: readJson<OpenSurface>(KEY.float),
  drawer: readJson<OpenSurface>(KEY.drawer),
  mode: null,
})

/** Where a route opens from, and how — the table, not the caller. */
export function surfaceFor(to: string): { surface: OpenSurface; kind: SurfaceKind } | null {
  for (const g of EQUIP_GROUPS) {
    const page = g.hub.to === to ? g.hub : g.pages.find((p) => p.to === to)
    if (!page) continue
    return {
      surface: { to, label: page.label, group: g.id, size: page.size ?? 'pad' },
      kind: page.kind === 'drawer' ? 'drawer' : 'float',
    }
  }
  return null
}

/**
 * Open it, or close it if it is the one already open.
 *
 * The same icon is the way in and the way out — that is what retiring the pin
 * bought. Opening a second surface of the same kind replaces the first, which
 * is the multi-float ruling seen from the inside: two near-full windows
 * occlude each other, so there is only ever one.
 */
export function toggleSurface(to: string): void {
  const found = surfaceFor(to)
  if (!found) return
  const { surface, kind } = found
  const current = store.getState()[kind]
  const next = current?.to === to ? null : surface
  writeJson(KEY[kind], next)
  store.setState(kind === 'float' ? { float: next, mode: null } : { drawer: next })
}

export function closeSurface(kind: SurfaceKind): void {
  writeJson(KEY[kind], null)
  store.setState(kind === 'float' ? { float: null, mode: null } : { drawer: null })
}

/** Which device grade the float is drawn at: your choice, else the table's. */
export function setFloatMode(mode: EquipSize): void {
  // Choosing a mode clears the geometry you dragged for this route — the
  // design's precedence is manual > chosen mode > the table's default, and a
  // mode button that left a stale drag behind would appear to do nothing.
  const open = store.getState().float
  if (open) saveGeometry(open.to, null)
  store.setState({ mode })
}

export function loadGeometry(to: string): FloatGeometry | null {
  const all = readJson<Record<string, FloatGeometry>>(KEY.geo) ?? {}
  return all[to] ?? null
}

/** Drag saves the position, resize saves the size — per route, as the design does. */
export function saveGeometry(to: string, patch: FloatGeometry | null): void {
  const all = readJson<Record<string, FloatGeometry>>(KEY.geo) ?? {}
  if (patch == null) delete all[to]
  else all[to] = { ...all[to], ...patch }
  writeJson(KEY.geo, all)
}

export function useSurfaces(): SurfaceState {
  return store.useStore()
}

/** True when this route's own surface is open — what lights an icon. */
export function isSurfaceOpen(to: string): boolean {
  const s = store.getState()
  return s.float?.to === to || s.drawer?.to === to
}
