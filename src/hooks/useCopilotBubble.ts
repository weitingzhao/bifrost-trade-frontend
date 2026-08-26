/**
 * Copilot floating bubble store (Wave RS-UX1 → RS-UX3).
 *
 * Copilot 从 CockpitDrawer 内的 tab 拆出成独立浮窗（chat-bubble 心智）。
 * Users can toggle open/close, switch compact/expanded, drag the panel to any
 * viewport-relative position, and toggle a left-side session drawer inside
 * the panel (ChatGPT / Claude style history rail).
 *
 * All UI state persists in localStorage so the panel stays where the user
 * put it across page reloads.
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'

export type CopilotBubbleSize = 'compact' | 'expanded'
export type CopilotBubblePosition = { x: number; y: number } | null

const OPEN_STORAGE_KEY = 'bifrost.copilot.bubble.open'
const SIZE_STORAGE_KEY = 'bifrost.copilot.bubble.size'
const POS_STORAGE_KEY = 'bifrost.copilot.bubble.position'
const SESSIONS_STORAGE_KEY = 'bifrost.copilot.bubble.sessions'

function readStoredOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeStoredOpen(open: boolean) {
  try {
    localStorage.setItem(OPEN_STORAGE_KEY, open ? '1' : '0')
  } catch {
    // ignore
  }
}

function readStoredSize(): CopilotBubbleSize {
  try {
    const raw = localStorage.getItem(SIZE_STORAGE_KEY)
    if (raw === 'compact' || raw === 'expanded') return raw
  } catch {
    // ignore
  }
  return 'compact'
}

function writeStoredSize(size: CopilotBubbleSize) {
  try {
    localStorage.setItem(SIZE_STORAGE_KEY, size)
  } catch {
    // ignore
  }
}

function readStoredPosition(): CopilotBubblePosition {
  try {
    const raw = localStorage.getItem(POS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.x === 'number' &&
      typeof parsed.y === 'number'
    ) {
      return { x: parsed.x, y: parsed.y }
    }
  } catch {
    // ignore
  }
  return null
}

function writeStoredPosition(pos: CopilotBubblePosition) {
  try {
    if (pos === null) localStorage.removeItem(POS_STORAGE_KEY)
    else localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(pos))
  } catch {
    // ignore
  }
}

function readStoredSessionsOpen(): boolean {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY)
    // Default: open — sessions rail is the primary way to switch sessions.
    // Only closed if the user explicitly hid it (writes '0').
    if (raw === '0') return false
    return true
  } catch {
    return true
  }
}

function writeStoredSessionsOpen(open: boolean) {
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, open ? '1' : '0')
  } catch {
    // ignore
  }
}

type BubbleState = {
  open: boolean
  size: CopilotBubbleSize
  /** Viewport position (top-left in px). Null → anchored bottom-right default. */
  position: CopilotBubblePosition
  /** Session history rail visibility (persisted). */
  sessionsOpen: boolean
  open_: () => void
  close: () => void
  toggle: () => void
  setSize: (size: CopilotBubbleSize) => void
  toggleSize: () => void
  setPosition: (pos: CopilotBubblePosition) => void
  resetPosition: () => void
  setSessionsOpen: (open: boolean) => void
  toggleSessions: () => void
}

function buildActions(
  _get: () => BubbleState,
  set: (partial: Partial<BubbleState> | ((prev: BubbleState) => BubbleState)) => void,
): Pick<
  BubbleState,
  | 'open_'
  | 'close'
  | 'toggle'
  | 'setSize'
  | 'toggleSize'
  | 'setPosition'
  | 'resetPosition'
  | 'setSessionsOpen'
  | 'toggleSessions'
> {
  return {
    open_() {
      writeStoredOpen(true)
      set({ open: true })
    },
    close() {
      writeStoredOpen(false)
      set({ open: false })
    },
    toggle() {
      set((prev) => {
        const next = !prev.open
        writeStoredOpen(next)
        return { ...prev, open: next }
      })
    },
    setSize(size) {
      writeStoredSize(size)
      set({ size })
    },
    toggleSize() {
      set((prev) => {
        const next: CopilotBubbleSize = prev.size === 'compact' ? 'expanded' : 'compact'
        writeStoredSize(next)
        return { ...prev, size: next }
      })
    },
    setPosition(pos) {
      writeStoredPosition(pos)
      set({ position: pos })
    },
    resetPosition() {
      writeStoredPosition(null)
      set({ position: null })
    },
    setSessionsOpen(open) {
      writeStoredSessionsOpen(open)
      set({ sessionsOpen: open })
    },
    toggleSessions() {
      set((prev) => {
        const next = !prev.sessionsOpen
        writeStoredSessionsOpen(next)
        return { ...prev, sessionsOpen: next }
      })
    },
  }
}

const base = createExternalStore<BubbleState>({
  open: readStoredOpen(),
  size: readStoredSize(),
  position: readStoredPosition(),
  sessionsOpen: readStoredSessionsOpen(),
  open_: () => undefined,
  close: () => undefined,
  toggle: () => undefined,
  setSize: () => undefined,
  toggleSize: () => undefined,
  setPosition: () => undefined,
  resetPosition: () => undefined,
  setSessionsOpen: () => undefined,
  toggleSessions: () => undefined,
})

const actions = buildActions(base.getState, base.setState)
base.setState({ ...base.getState(), ...actions })

export const copilotBubbleStore = {
  getState: base.getState,
  setState: base.setState,
  subscribe: base.subscribe,
}

/** Hook: subscribe to bubble state. */
export function useCopilotBubble() {
  return base.useStore()
}
