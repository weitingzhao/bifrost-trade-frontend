/**
 * Copilot floating bubble store (Wave RS-UX1).
 *
 * Copilot 从 CockpitDrawer 内的 tab 拆出成独立右下角浮窗（chat-bubble 心智），
 * 用户可以点开、关闭、切换 compact/expanded 尺寸，Trace 面板作为浮窗内的可折叠区。
 * 与 CockpitDrawer 完全解耦 — 两者可同时开，物理位置不冲突。
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'

export type CopilotBubbleSize = 'compact' | 'expanded'

const OPEN_STORAGE_KEY = 'bifrost.copilot.bubble.open'
const SIZE_STORAGE_KEY = 'bifrost.copilot.bubble.size'

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

type BubbleState = {
  open: boolean
  size: CopilotBubbleSize
  open_: () => void
  close: () => void
  toggle: () => void
  setSize: (size: CopilotBubbleSize) => void
  toggleSize: () => void
}

function buildActions(
  _get: () => BubbleState,
  set: (partial: Partial<BubbleState> | ((prev: BubbleState) => BubbleState)) => void,
): Pick<BubbleState, 'open_' | 'close' | 'toggle' | 'setSize' | 'toggleSize'> {
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
  }
}

const base = createExternalStore<BubbleState>({
  open: readStoredOpen(),
  size: readStoredSize(),
  open_: () => undefined,
  close: () => undefined,
  toggle: () => undefined,
  setSize: () => undefined,
  toggleSize: () => undefined,
})

const actions = buildActions(base.getState, base.setState)
base.setState({ ...base.getState(), ...actions })

export const copilotBubbleStore = {
  getState: base.getState,
  setState: base.setState,
  subscribe: base.subscribe,
}

/** Hook: subscribe to bubble open + size. */
export function useCopilotBubble() {
  return base.useStore()
}
