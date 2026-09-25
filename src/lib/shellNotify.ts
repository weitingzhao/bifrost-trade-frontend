/**
 * The shell's two passing voices (design Rev .69 §3–§4).
 *
 * - `notify(msg, { undo })` — the glass capsule above the toolbar. With an
 *   Undo it stays 5s and the Undo runs once; without, 2.8s. One at a time:
 *   a new one replaces the last.
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

export function notify(msg: string, opts: { undo?: () => void; label?: string } = {}): void {
  toastStore.setState({ toast: { id: ++seq, msg, undo: opts.undo, label: opts.label } })
}

export function dismissToast(id: number): void {
  toastStore.setState((s) => (s.toast?.id === id ? { toast: null } : s))
}

export function banner(b: Omit<ShellBanner, 'id' | 'tone'> & { tone?: BannerTone }): void {
  const next: ShellBanner = { ...b, tone: b.tone ?? 'accent', id: ++seq }
  bannerStore.setState((s) => ({ banners: [next, ...s.banners].slice(0, 4) }))
}

export function dismissBanner(id: number): void {
  bannerStore.setState((s) => ({ banners: s.banners.filter((x) => x.id !== id) }))
}
