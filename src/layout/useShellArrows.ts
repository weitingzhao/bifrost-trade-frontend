/**
 * Arrow keys through the shell (design Rev .69 §2).
 *
 * - On the top bar, ← → walk the menu-bar items — the sidebar toggle, the
 *   search field and every item of the right cluster — as a macOS menu bar.
 * - Inside an open popover, ↑ ↓ ← → walk its buttons, rows and tiles.
 *   A Radix menu, a listbox or a command list already owns its arrows and is
 *   left to them; so is a text field.
 *
 * Opening a popover from the keyboard already lands focus on its first
 * control — Radix's own auto-focus — so nothing is added for that.
 */
import { useEffect } from 'react'
import mb from './menubar/menubar.module.css'

const WALK_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])

function visible(el: HTMLElement): boolean {
  return el.offsetParent != null || el.getClientRects().length > 0
}

function step(list: HTMLElement[], cur: HTMLElement, forward: boolean): void {
  const i = list.indexOf(cur)
  if (i < 0) return
  const next = list[(i + (forward ? 1 : -1) + list.length) % list.length]
  next?.focus({ preventScroll: true })
}

export function useShellArrows(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!WALK_KEYS.has(e.key) || e.altKey || e.metaKey || e.ctrlKey) return
      const a = document.activeElement
      if (!(a instanceof HTMLElement) || a.matches('input, textarea, select, [contenteditable="true"]')) return
      const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown'

      const pop = a.closest<HTMLElement>('[data-radix-popper-content-wrapper]')
      if (pop) {
        if (a.closest('[role="menu"], [role="listbox"], [cmdk-root], [role="radiogroup"], [role="tablist"]')) return
        const items = [
          ...pop.querySelectorAll<HTMLElement>('button:not([disabled]), [role="button"], a[href]'),
        ].filter(visible)
        if (!items.includes(a)) return
        e.preventDefault()
        step(items, a, forward)
        return
      }

      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      const bar = a.closest<HTMLElement>('header[data-menubar]')
      if (!bar) return
      const items = [...bar.querySelectorAll<HTMLElement>(`.${mb.item}, .${mb.search}`)].filter(visible)
      if (!items.includes(a)) return
      e.preventDefault()
      step(items, a, forward)
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [])
}
