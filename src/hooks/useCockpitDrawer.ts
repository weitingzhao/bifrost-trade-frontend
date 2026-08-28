/**
 * Cockpit drawer open/tab store (Wave RS-E1.1 · Copilot enabled RS-E2).
 * No Zustand in deps — external store + localStorage for tab preference.
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'

/**
 * Panel view (Wave RS-UX6).
 *
 * The old five-tab bar (copilot / inbox / pins / context / actions) mixed a
 * workspace, a queue, a bookmark list, an input control and a launcher into one
 * flat row — no amount of styling could make that read as a hierarchy.  Those
 * four secondary surfaces now live where they belong:
 *   inbox   → banner above the message list (chat stays visible while approving)
 *   context → popover on the composer's context chip
 *   actions → agent menu in the composer + Lab links deleted (sidebar has them)
 *   pins    → section in the session rail (same "jump back" category)
 * Only chat and settings remain as full-panel views.
 */
export type CockpitTabId = 'copilot' | 'settings'

export type CockpitDisplayMode = 'overlay' | 'dock'

const TAB_STORAGE_KEY = 'bifrost.cockpit.tab'
const MODE_STORAGE_KEY = 'bifrost.cockpit.displayMode'
const VALID_TABS: CockpitTabId[] = ['copilot', 'settings']

function readStoredTab(): CockpitTabId {
  try {
    const raw = localStorage.getItem(TAB_STORAGE_KEY)
    if (raw && VALID_TABS.includes(raw as CockpitTabId)) {
      return raw as CockpitTabId
    }
    // Retired tab ids (inbox/pins/context/actions) fall back to the chat.
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
  /** Inbox banner expanded inline above the message list. Session-scoped. */
  inboxOpen: boolean
  openWithTab: (tab: CockpitTabId) => void
  close: () => void
  toggle: () => void
  setTab: (tab: CockpitTabId) => void
  setOpen: (open: boolean) => void
  setMode: (mode: CockpitDisplayMode) => void
  setInboxOpen: (open: boolean) => void
  /** Open the panel on the chat with the draft inbox expanded. */
  revealInbox: () => void
}

function buildActions(
  _get: () => DrawerState,
  set: (partial: Partial<DrawerState> | ((prev: DrawerState) => DrawerState)) => void,
): Pick<
  DrawerState,
  | 'openWithTab'
  | 'close'
  | 'toggle'
  | 'setTab'
  | 'setOpen'
  | 'setMode'
  | 'setInboxOpen'
  | 'revealInbox'
> {
  return {
    openWithTab(tab) {
      writeStoredTab(tab)
      set({ open: true, tab })
    },
    setInboxOpen(open) {
      set({ inboxOpen: open })
    },
    revealInbox() {
      writeStoredTab('copilot')
      set({ open: true, tab: 'copilot', inboxOpen: true })
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
  inboxOpen: false,
  openWithTab: () => undefined,
  close: () => undefined,
  toggle: () => undefined,
  setTab: () => undefined,
  setOpen: () => undefined,
  setMode: () => undefined,
  setInboxOpen: () => undefined,
  revealInbox: () => undefined,
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
