/**
 * Keyboard triage on the Decision Inbox (design Rev .144): J / K move between
 * pending cards and open the one they land on, Space folds or opens it, A
 * approves an open card (a call records its answer even folded; a folded card
 * only opens, because accepting anything means having looked at it), D
 * dismisses.
 *
 * Scoped to the page as the route (Owner 2026-10-04 #13). The Inbox is also a
 * surface — the side panel and the float render it into the same document —
 * and a window listener there would answer keys pressed on another page: D on
 * Positions would dismiss a draft. So a surfaced Inbox binds nothing.
 *
 * Four neighbours share these keys, and each keeps what is its own:
 * - **SymbolDock** walks its list on bare j / k, after every other listener,
 *   unless one called `preventDefault` — so J / K here always do.
 * - **Quick Look** owns Space on a row or a marked name; Space gives way
 *   there, and whenever Quick Look already took the key.
 * - **A focused button** (the card header is one) answers Space itself.
 * - **⌘Z** and the rest carry a modifier, which this ignores.
 */
import { useEffect, useRef } from 'react'
import { quickLookTarget } from '@/layout/quickLookTargets'

export type InboxKeyAction =
  | { type: 'move'; to: string }
  | { type: 'toggle'; id: string }
  | { type: 'approve'; id: string }
  | { type: 'open-to-approve'; id: string }
  | { type: 'dismiss'; id: string }

export interface InboxKeyEvent {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  target: EventTarget | null
  defaultPrevented: boolean
}

export interface InboxKeyState {
  /** Pending cards, in the order the page draws them. */
  order: readonly string[]
  /** The cursor, or '' for none yet. */
  cur: string
  /** The open card, or '' for none. */
  openId: string
  /** A call records its answer from a folded card too. */
  isCall: (id: string) => boolean
  /** The element under the pointer, for Quick Look's give-way. */
  hovered: Element | null
  /** `document.activeElement`. */
  active: Element | null
}

function asElement(t: EventTarget | null): Element | null {
  return t instanceof Element ? t : null
}

function typing(el: Element | null): boolean {
  return el != null && el.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]') != null
}

/** What a key does on the Inbox, or null when it is not the Inbox's key. */
export function inboxKeyAction(e: InboxKeyEvent, s: InboxKeyState): InboxKeyAction | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null
  const target = asElement(e.target)
  if (typing(target)) return null
  if (target?.closest('[role="dialog"], [role="menu"], [data-radix-popper-content-wrapper]')) return null
  if (s.order.length === 0) return null
  const key = e.key === ' ' ? ' ' : e.key.toLowerCase()
  const cur = s.order.includes(s.cur) ? s.cur : s.order.includes(s.openId) ? s.openId : s.order[0]

  if (key === 'j' || key === 'k') {
    // With no cursor placed yet, the open card stands in for it (prototype `cur || openId`).
    const at = s.order.indexOf(cur)
    const next = Math.min(s.order.length - 1, Math.max(0, at + (key === 'j' ? 1 : -1)))
    return { type: 'move', to: s.order[next] }
  }
  if (key === ' ') {
    if (e.defaultPrevented) return null
    if (target?.closest('button, [role="button"], a, summary')) return null
    // The element Quick Look itself reads: focus first, else the pointer.
    const from = s.active && s.active !== document.body ? s.active : s.hovered
    if (quickLookTarget(from) && !from?.closest('[data-sidebar]')) return null
    return { type: 'toggle', id: cur }
  }
  if (key === 'a') {
    return s.openId === cur || s.isCall(cur) ? { type: 'approve', id: cur } : { type: 'open-to-approve', id: cur }
  }
  if (key === 'd') return { type: 'dismiss', id: cur }
  return null
}

export interface InboxKeyHandlers extends Omit<InboxKeyState, 'hovered' | 'active'> {
  enabled: boolean
  onAction: (a: InboxKeyAction) => void
}

/** Binds the Inbox's keys on the window while `enabled`. */
export function useInboxKeys(h: InboxKeyHandlers): void {
  const latest = useRef(h)
  useEffect(() => {
    latest.current = h
  })
  const enabled = h.enabled
  useEffect(() => {
    if (!enabled) return
    let hovered: Element | null = null
    const onOver = (e: MouseEvent) => {
      hovered = e.target instanceof Element ? e.target : null
    }
    const onKey = (e: KeyboardEvent) => {
      const s = latest.current
      const action = inboxKeyAction(e, { ...s, hovered, active: document.activeElement })
      if (!action) return
      // J / K above all: SymbolDock walks its list unless this is set.
      e.preventDefault()
      s.onAction(action)
    }
    document.addEventListener('mouseover', onOver, true)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mouseover', onOver, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [enabled])
}

/** Bring a card into view after the cursor moves to it, if it is not already. */
export function revealCard(key: string): void {
  window.requestAnimationFrame(() => {
    const el = document.querySelector(`[data-card="${CSS.escape(key)}"]`)
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.top < 96 || r.top > window.innerHeight - 120) el.scrollIntoView({ block: 'start', behavior: 'smooth' })
  })
}
