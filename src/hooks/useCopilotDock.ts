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

const OPEN_STORAGE_KEY = 'bifrost.copilot.dock.open'
const WIDE_STORAGE_KEY = 'bifrost.copilot.dock.wide'
const SESSIONS_STORAGE_KEY = 'bifrost.copilot.dock.sessions'

/** The two tiers. 440 is the reading width; 760 is for a thread you are working in. */
export const COPILOT_DOCK_WIDTH = 440
export const COPILOT_DOCK_WIDTH_WIDE = 760

/**
 * Below this the dock overlays rather than pushes.
 *
 * Pushing costs the page its width for as long as the dock is open. On a
 * 1440-wide screen, 440 of it is a third of the desk — the tables the Copilot
 * is answering about stop being readable, which defeats the point of docking
 * it beside them.
 */
export const COPILOT_DOCK_PUSH_MIN_VIEWPORT = 1680

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

/** Hook: subscribe to dock state. */
export function useCopilotDock() {
  return base.useStore()
}
