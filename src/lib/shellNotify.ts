/**
 * The shell's two passing voices (design Rev .69 §3–§4).
 *
 * - `notify(msg, { undo })` — the glass capsule above the toolbar. With an
 *   Undo it stays 5s and the Undo runs once; without, 2.8s. One at a time:
 *   a new one replaces the last.
 * - `notifyHeld(msg, { commit, undo })` — the same toast for a change the
 *   server has no way back from (Rev .75/.79): the page shows it done at
 *   once, and the write goes out only when the toast leaves without Undo —
 *   after its 5s, when the next toast replaces it, or when the tab goes.
 * - `pushUndo` / `runUndo` — the page's undo stack, which ⌘Z and the toast
 *   share (below).
 * - `banner({ title, sub, tone, to })` — the notification banner at the top
 *   right, left of the Symbol list: 6s, paused while hovered, a click opens
 *   `to`, × or Esc dismisses. Several stack, newest on top.
 *
 * Stores, not components, so anything — a keybind, a surface close, the
 * Alerts stream — can speak without being inside the tree that renders them.
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'

export interface ShellToast {
  id: number
  msg: string
  undo?: () => void
  label?: string
}

export type BannerTone = 'red' | 'amber' | 'accent'

export interface ShellBanner {
  id: number
  title: string
  sub?: string
  tone: BannerTone
  to?: string
  when?: string
  ms?: number
}

let seq = 0

export const toastStore = createExternalStore<{ toast: ShellToast | null }>({ toast: null })
export const bannerStore = createExternalStore<{ banners: ShellBanner[] }>({ banners: [] })

/** Writes held behind a toast's Undo, by toast id. */
const held = new Map<number, () => void>()

function release(id: number): void {
  const commit = held.get(id)
  if (!commit) return
  held.delete(id)
  commit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => [...held.keys()].forEach(release))
}

export function notify(msg: string, opts: { undo?: () => void; label?: string } = {}): number {
  // The toast being replaced loses its Undo, so whatever it held goes out now.
  const prev = toastStore.getState().toast
  if (prev) release(prev.id)
  const id = ++seq
  toastStore.setState({ toast: { id, msg, undo: opts.undo, label: opts.label } })
  return id
}

export function notifyHeld(msg: string, opts: { commit: () => void; undo: () => void; label?: string }): void {
  const id = notify(msg, { undo: opts.undo, label: opts.label })
  held.set(id, opts.commit)
}

/** The toast left on its own: anything it held is written. */
export function dismissToast(id: number): void {
  release(id)
  toastStore.setState((s) => (s.toast?.id === id ? { toast: null } : s))
}

/** Undo pressed: the held write is dropped, then the page puts things back. */
export function undoToast(t: ShellToast): void {
  held.delete(t.id)
  toastStore.setState((s) => (s.toast?.id === t.id ? { toast: null } : s))
  t.undo?.()
}

/* ── The page's undo stack (design §17.5, Rev .138 / .140) ───────────────
 *
 * One stack for the page you are on: ⌘Z (outside a text field) and the
 * toast's Undo share it. A held write (`notifyHeld`) is undoable only while
 * its toast is up — once it leaves, the write has gone out. Edits made in
 * an inspector push here instead, and a run of typing in one field is one
 * step: a push with the same `key` within 1.5s of the last one is merged.
 * The stack is emptied when the page changes (`clearUndo`). */

interface UndoEntry {
  key: string | null
  t: number
  run: () => void
}

const UNDO_MERGE_MS = 1_500
const UNDO_DEPTH = 50
let undoStack: UndoEntry[] = []

/** Remember how to undo one change. Same `key` within 1.5s = the same step. */
export function pushUndo(key: string | null, run: () => void, now: number = Date.now()): void {
  const top = undoStack[undoStack.length - 1]
  if (key != null && top && top.key === key && now - top.t < UNDO_MERGE_MS) {
    top.t = now
    return
  }
  undoStack = [...undoStack, { key, t: now, run }].slice(-UNDO_DEPTH)
}

/** ⌘Z: the toast's Undo first, while it is up; otherwise the latest edit. */
export function runUndo(): boolean {
  const t = toastStore.getState().toast
  if (t?.undo) {
    undoToast(t)
    return true
  }
  const top = undoStack[undoStack.length - 1]
  if (!top) return false
  undoStack = undoStack.slice(0, -1)
  top.run()
  return true
}

/** A new page starts with nothing to undo. */
export function clearUndo(): void {
  undoStack = []
}

export function undoDepth(): number {
  return undoStack.length
}

export function banner(b: Omit<ShellBanner, 'id' | 'tone'> & { tone?: BannerTone }): void {
  const next: ShellBanner = { ...b, tone: b.tone ?? 'accent', id: ++seq }
  bannerStore.setState((s) => ({ banners: [next, ...s.banners].slice(0, 4) }))
}

export function dismissBanner(id: number): void {
  bannerStore.setState((s) => ({ banners: s.banners.filter((x) => x.id !== id) }))
}
