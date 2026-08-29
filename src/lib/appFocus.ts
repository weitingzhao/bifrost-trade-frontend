import { focusManager } from '@tanstack/react-query'

/**
 * App-wide focus & idle manager.
 *
 * Why this exists:
 *   TanStack Query's default focus detection relies on `document.visibilityState`
 *   + `window.blur/focus`.  In Cursor's embedded browser the renderer is *always*
 *   visible (it's mounted inside the IDE process), so `visibilitychange` never
 *   fires — and the built-in `refetchIntervalInBackground: false` throttle is
 *   effectively disabled.  Background poll storms then compete with the IDE
 *   main thread and freeze the UI.
 *
 *   This module layers an *idle* signal on top of native visibility/focus:
 *     - focused = visible AND (hasFocus OR user active within IDLE_TIMEOUT_MS)
 *     - the moment any pointer/keyboard activity happens we mark focused=true
 *     - after IDLE_TIMEOUT_MS of no activity, we mark focused=false
 *
 *   We register this as `focusManager.setEventListener` so every TanStack
 *   Query participates without page-level changes.  SSE consumers can opt in
 *   via `subscribeAppFocus` (see `openSseWithBackoff`).
 *
 *   Contract stability: exported surface is used by queryClient.ts and sse.ts.
 *   Do not remove or rename without bumping the spine decision.
 */

const IDLE_TIMEOUT_MS = 60_000

type Listener = (focused: boolean) => void

let idleTimer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<Listener>()
let currentFocused = true
let initialized = false

function computeNativeFocused(): boolean {
  if (typeof document === 'undefined') return true
  if (document.visibilityState === 'hidden') return false
  if (typeof document.hasFocus === 'function' && !document.hasFocus()) return false
  return true
}

function setFocused(next: boolean): void {
  if (next === currentFocused) return
  currentFocused = next
  listeners.forEach((l) => {
    try {
      l(next)
    } catch {
      /* ignore listener errors */
    }
  })
}

function markActive(): void {
  if (idleTimer != null) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
  if (computeNativeFocused()) {
    setFocused(true)
  }
  idleTimer = setTimeout(() => {
    setFocused(false)
    idleTimer = null
  }, IDLE_TIMEOUT_MS)
}

function handleVisibility(): void {
  if (computeNativeFocused()) {
    markActive()
  } else {
    if (idleTimer != null) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
    setFocused(false)
  }
}

function initOnce(): void {
  if (initialized) return
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  initialized = true

  const activityEvents = [
    'pointerdown',
    'pointermove',
    'keydown',
    'wheel',
    'touchstart',
    'focus',
  ] as const
  for (const evt of activityEvents) {
    window.addEventListener(evt, markActive, { passive: true, capture: true })
  }
  window.addEventListener('blur', handleVisibility, { passive: true })
  document.addEventListener('visibilitychange', handleVisibility, {
    passive: true,
  })

  markActive()

  focusManager.setEventListener((handleFocus) => {
    const relay: Listener = (f) => handleFocus(f)
    listeners.add(relay)
    handleFocus(currentFocused)
    return () => {
      listeners.delete(relay)
    }
  })
}

initOnce()

export function isAppFocused(): boolean {
  return currentFocused
}

export function subscribeAppFocus(cb: Listener): () => void {
  listeners.add(cb)
  cb(currentFocused)
  return () => {
    listeners.delete(cb)
  }
}

/**
 * Test-only hook.  Do NOT call from application code — use activity events
 * or visibilitychange instead.
 */
export function __setAppFocusedForTest(next: boolean): void {
  setFocused(next)
}
