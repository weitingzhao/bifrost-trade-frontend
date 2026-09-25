/**
 * The Symbol list's own state (design Rev .56–.58, Shell Spec §5a.11), kept
 * under the design's storage keys so a choice survives a reload:
 *
 * - `bifrost.dock` — the mode the user picked: `strip` (56px, the default),
 *   `docked` (300px column) or `float` (over the page, top right).
 * - `bifrost.lists` — `hidden` | `shown`: the toolbar's Lists button.
 * - `bifrost.lists.sel` — which lists are on, in tag order.
 * - `bifrost.lists.sort` — the arrangement, 1–7.
 *
 * Folded groups and opened contract rows are the session's, not stored.
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'
import { panelDocks, SIDE_PANEL_FLOOR_PX } from '@/lib/panelDocks'
import { useWindowWidth } from '@/hooks/useIsNarrowViewport'
import { useSurfaces } from '@/layout/equipSurface'

export type DockMode = 'strip' | 'docked' | 'float'
export type ListKey = 'source' | 'watch' | 'port' | 'obj' | 'recent' | 'alerts'

/** The tags' order, which is also the order selected lists stack in. */
export const LIST_ORDER: readonly ListKey[] = ['source', 'watch', 'port', 'obj', 'recent', 'alerts']

export const DOCK_STRIP_PX = 56
export const DOCK_FULL_PX = 300

export interface DockState {
  mode: DockMode
  hidden: boolean
  /** Null until the user picks: the page decides the default (Source first where there is one). */
  sel: ListKey[] | null
  sort: number
  folded: Record<string, boolean>
  optOpen: Record<string, boolean>
}

function readDockPref<T>(key: string, parse: (v: string | null) => T): T {
  try {
    return parse(localStorage.getItem(key))
  } catch {
    return parse(null)
  }
}

function writeDockPref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Blocked storage: the choice holds for this visit.
  }
}

const store = createExternalStore<DockState>({
  mode: readDockPref('bifrost.dock', (v) => (v === 'docked' || v === 'float' ? v : 'strip')),
  hidden: readDockPref('bifrost.lists', (v) => v === 'hidden'),
  sel: readDockPref('bifrost.lists.sel', (v) => {
    try {
      const parsed: unknown = v ? JSON.parse(v) : null
      const keys = Array.isArray(parsed) ? parsed.filter((k): k is ListKey => LIST_ORDER.includes(k as ListKey)) : []
      return keys.length > 0 ? keys : null
    } catch {
      return null
    }
  }),
  sort: readDockPref('bifrost.lists.sort', (v) => {
    const n = Number(v)
    return Number.isInteger(n) && n >= 1 && n <= 7 ? n : 1
  }),
  folded: {},
  optOpen: {},
})

export const useDockState = store.useStore

export const dockActions = {
  setMode(mode: DockMode) {
    writeDockPref('bifrost.dock', mode)
    writeDockPref('bifrost.lists', 'shown')
    store.setState({ mode, hidden: false })
  },
  setHidden(hidden: boolean) {
    writeDockPref('bifrost.lists', hidden ? 'hidden' : 'shown')
    store.setState({ hidden })
  },
  setSel(sel: readonly ListKey[]) {
    const ordered = LIST_ORDER.filter((k) => sel.includes(k))
    if (ordered.length === 0) return
    writeDockPref('bifrost.lists.sel', JSON.stringify(ordered))
    store.setState({ sel: ordered })
  },
  setSort(sort: number) {
    writeDockPref('bifrost.lists.sort', String(sort))
    store.setState({ sort })
  },
  toggleFold(key: string) {
    const { folded } = store.getState()
    store.setState({ folded: { ...folded, [key]: !folded[key] } })
  },
  setOptOpen(key: string, open: boolean) {
    store.setState({ optOpen: { ...store.getState().optOpen, [key]: open } })
  },
}

export interface DockColumn {
  /** What draws at the right edge, or null when nothing does (hidden, or floating). */
  mode: 'strip' | 'docked' | null
  /** The column the page gives up — 0 when nothing is docked. */
  width: number
}

/**
 * The right-edge column. Docked yields by narrowing to a strip, without
 * writing that back to `bifrost.dock` — undo the cause and the full list
 * returns. Two causes:
 *
 * - **An open side panel** (the design's rule): one beside-surface at a time.
 * - **No room** (ours — the design is silent): the page keeps the panel's own
 *   floor, 560 beside the 240 sidebar, or the list does not take its 300. At
 *   1024 a docked list left the page 473 and the top bar's strip overprinted.
 */
export function dockColumnFor(
  state: Pick<DockState, 'mode' | 'hidden'>,
  panelOpen: boolean,
  viewportPx: number,
): DockColumn {
  if (state.hidden || state.mode === 'float') return { mode: null, width: 0 }
  const room = panelDocks(DOCK_FULL_PX, viewportPx, SIDE_PANEL_FLOOR_PX)
  const mode = state.mode === 'docked' && !panelOpen && room ? 'docked' : 'strip'
  return { mode, width: mode === 'docked' ? DOCK_FULL_PX : DOCK_STRIP_PX }
}

/** The column, for the panel and the inspector, which sit left of it. */
export function useDockColumn(): DockColumn {
  const state = useDockState()
  const { panel } = useSurfaces()
  return dockColumnFor(state, panel != null, useWindowWidth())
}
