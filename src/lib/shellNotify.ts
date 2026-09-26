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

export function banner(b: Omit<ShellBanner, 'id' | 'tone'> & { tone?: BannerTone }): void {
  const next: ShellBanner = { ...b, tone: b.tone ?? 'accent', id: ++seq }
  bannerStore.setState((s) => ({ banners: [next, ...s.banners].slice(0, 4) }))
}

export function dismissBanner(id: number): void {
  bannerStore.setState((s) => ({ banners: s.banners.filter((x) => x.id !== id) }))
}
