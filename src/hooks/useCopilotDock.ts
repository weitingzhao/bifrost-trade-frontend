/**
 * Copilot dock state.
 *
 * It was a floating bubble: a support-widget FAB in the bottom-right corner
 * that opened a draggable card you could park anywhere, at three sizes, one of
 * them fullscreen. Design (`design/trade/Research Copilot.dc.html`) makes it a
 * fixed right dock at two widths, and the Positions prototype states the rule
 * it follows from: no floating button anywhere on a page — the corner belongs
 * to the table. Owner confirmed the dock, 2026-09-12.
 *
 * So `position`, the drag, and the fullscreen tier are gone. What a dock needs
 * is whether it is open, how wide, and whether the session rail is showing.
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'
import { panelDocks } from '@/lib/panelDocks'

const OPEN_STORAGE_KEY = 'bifrost.copilot.dock.open'
const WIDE_STORAGE_KEY = 'bifrost.copilot.dock.wide'
const SESSIONS_STORAGE_KEY = 'bifrost.copilot.dock.sessions'

/** The two tiers. 440 is the reading width; 760 is for a thread you are working in. */
export const COPILOT_DOCK_WIDTH = 440
export const COPILOT_DOCK_WIDTH_WIDE = 760

function read(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key)
    if (raw === '1') return true
    if (raw === '0') return false
  } catch {
    /* private window, blocked storage */
  }
  return fallback
}

function write(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

type DockState = {
  open: boolean
  /** 760 rather than 440. Always overlays — see the push threshold. */
  wide: boolean
  /** Session history rail inside the dock. Only fits at the wide tier. */
  sessionsOpen: boolean
  open_: () => void
  close: () => void
  toggle: () => void
  setWide: (wide: boolean) => void
  toggleWide: () => void
  setSessionsOpen: (open: boolean) => void
  toggleSessions: () => void
}

const base = createExternalStore<DockState>({
  open: read(OPEN_STORAGE_KEY, false),
  wide: read(WIDE_STORAGE_KEY, false),
  // Default open — the rail is the primary way to switch threads, and it only
  // renders where it fits.
  sessionsOpen: read(SESSIONS_STORAGE_KEY, true),
  open_: () => undefined,
  close: () => undefined,
  toggle: () => undefined,
  setWide: () => undefined,
  toggleWide: () => undefined,
  setSessionsOpen: () => undefined,
  toggleSessions: () => undefined,
})

function setFlag(key: string, field: 'open' | 'wide' | 'sessionsOpen', value: boolean) {
  write(key, value)
  base.setState({ ...base.getState(), [field]: value })
}

base.setState({
  ...base.getState(),
  open_: () => setFlag(OPEN_STORAGE_KEY, 'open', true),
  close: () => setFlag(OPEN_STORAGE_KEY, 'open', false),
  toggle: () => setFlag(OPEN_STORAGE_KEY, 'open', !base.getState().open),
  setWide: (wide) => setFlag(WIDE_STORAGE_KEY, 'wide', wide),
  toggleWide: () => setFlag(WIDE_STORAGE_KEY, 'wide', !base.getState().wide),
  setSessionsOpen: (open) => setFlag(SESSIONS_STORAGE_KEY, 'sessionsOpen', open),
  toggleSessions: () =>
    setFlag(SESSIONS_STORAGE_KEY, 'sessionsOpen', !base.getState().sessionsOpen),
})

export const copilotDockStore = {
  getState: base.getState,
  setState: base.setState,
  subscribe: base.subscribe,
}

/**
 * Whether the Copilot is pushing the page (docked) rather than overlaying it.
 *
 * Push or overlay comes from the shared formula (`panelDocks`, Design 09-14 ③):
 * at the 440 reading width the dock pushes from 1440 up. The threshold that
 * used to live here (1680) reasoned from proportion — "440 on a 1440 screen is
 * a third of the desk" — and the design overturned that: what a table needs to
 * stay readable is the absolute 760px floor, not a share of the glass, and at
 * 1440 a docked 440 panel still leaves it.
 *
 * The wide tier (760) always overlays. Wide is the thread as the work; a page
 * squeezed beside it would be pretense, and you get the page back by dropping
 * to the reading width.
 *
 * The inspector also reads this: while the Copilot is pushing, the inspector
 * always floats — the page never pays for two docked columns at once.
 */
export function copilotDockPushes(
  state: Pick<DockState, 'open' | 'wide'>,
  viewportWidthPx: number,
): boolean {
  return state.open && !state.wide && panelDocks(COPILOT_DOCK_WIDTH, viewportWidthPx)
}

/** Hook: subscribe to dock state. */
export function useCopilotDock() {
  return base.useStore()
}
