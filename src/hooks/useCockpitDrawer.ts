/**
 * Cockpit drawer open/tab store (Wave RS-E1.1 · Copilot enabled RS-E2).
 * No Zustand in deps — external store + localStorage for tab preference.
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'

export type CockpitTabId =
  | 'copilot'
  | 'inbox'
  | 'pins'
  | 'context'
  | 'actions'
  | 'settings'

export type CockpitDisplayMode = 'overlay' | 'dock'

const TAB_STORAGE_KEY = 'bifrost.cockpit.tab'
const MODE_STORAGE_KEY = 'bifrost.cockpit.displayMode'
const VALID_TABS: CockpitTabId[] = [
  'copilot',
  'inbox',
  'pins',
  'context',
  'actions',
  'settings',
]

function readStoredTab(): CockpitTabId {
  try {
    const raw = localStorage.getItem(TAB_STORAGE_KEY)
    if (raw && VALID_TABS.includes(raw as CockpitTabId)) {
      return raw as CockpitTabId
    }
  } catch {
    // ignore
  }
  return 'copilot'
}

function writeStoredTab(tab: CockpitTabId) {
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tab)
  } catch {
    // ignore
  }
}

function readStoredMode(): CockpitDisplayMode {
  try {
    const raw = localStorage.getItem(MODE_STORAGE_KEY)
    if (raw === 'overlay' || raw === 'dock') return raw
  } catch {
    // ignore
  }
  return 'overlay'
}

function writeStoredMode(mode: CockpitDisplayMode) {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode)
  } catch {
    // ignore
  }
}

type DrawerState = {
  open: boolean
  tab: CockpitTabId
  mode: CockpitDisplayMode
  openWithTab: (tab: CockpitTabId) => void
  close: () => void
  toggle: () => void
  setTab: (tab: CockpitTabId) => void
  setOpen: (open: boolean) => void
  setMode: (mode: CockpitDisplayMode) => void
}

function buildActions(
  _get: () => DrawerState,
  set: (partial: Partial<DrawerState> | ((prev: DrawerState) => DrawerState)) => void,
): Pick<
  DrawerState,
  'openWithTab' | 'close' | 'toggle' | 'setTab' | 'setOpen' | 'setMode'
> {
  return {
    openWithTab(tab) {
      writeStoredTab(tab)
      set({ open: true, tab })
    },
    close() {
      set({ open: false })
    },
    toggle() {
      set((prev) => ({ ...prev, open: !prev.open }))
    },
    setTab(tab) {
      writeStoredTab(tab)
      set({ tab })
    },
    setOpen(open) {
      set({ open })
    },
    setMode(mode) {
      writeStoredMode(mode)
      set({ mode })
    },
  }
}

const base = createExternalStore<DrawerState>({
  open: false,
  tab: readStoredTab(),
  mode: readStoredMode(),
  openWithTab: () => undefined,
  close: () => undefined,
  toggle: () => undefined,
  setTab: () => undefined,
  setOpen: () => undefined,
  setMode: () => undefined,
})

const actions = buildActions(base.getState, base.setState)
base.setState({ ...base.getState(), ...actions })

export const cockpitDrawerStore = {
  getState: base.getState,
  setState: base.setState,
  subscribe: base.subscribe,
}

/** Hook: subscribe to drawer open + tab. */
export function useCockpitDrawer() {
  return base.useStore()
}
