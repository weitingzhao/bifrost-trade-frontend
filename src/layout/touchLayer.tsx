/**
 * The touch layer (design Rev .163, DESIGN_CONTRACTS §18.3 · §18.6 · §18.8):
 * document-level listeners that make a desk-dense page work under a finger
 * without changing its density.
 *
 * In the order they run on a tap:
 * 1. **A long-press swallows the click after it.** 520ms, under 8px of
 *    travel, is the right-click menu the shell already draws for symbols,
 *    contracts and panel tabs (`ShellContextMenu`).
 * 2. **Hit slop.** A control under 44 × 44 answers taps up to 44 × 44 around
 *    its centre. A direct hit always wins over a neighbour's slop; only a
 *    control *inside* what was hit (the ✕ in a chip, a button in a row) can
 *    take the tap from it.
 * 3. **Row detail (compact).** In a table kept to 2–3 columns (`data-sr-keep`),
 *    tapping a row opens every column in a sheet; its controls proxy to the
 *    originals, and a row that opens something gets `Open`. A page with its
 *    own detail writes `data-sr-detail="page"` and keeps the tap.
 * 4. **Orders confirm (touch).** Anything marked `data-sr-order="<what goes
 *    out>"` asks first in a sheet; `Send order` is rightmost, Enter runs it.
 *    The desk keeps the page's own flow. (D10: nothing in the app sends an
 *    order today — this is the gate any future one passes through.)
 *
 * The values are the design's (`shell-registry.js` `shellDevice`).
 */
import { useEffect } from 'react'
import { layoutNow } from '@/lib/device'
import { openShellSheet } from './shellSheet'
import { CTL, PASS, pass } from './touchPass'
import { TouchCell as Cell } from './TouchCell'
import css from './touchLayer.module.css'

export const HIT_PX = 44
export const LONG_PRESS_MS = 520
export const LONG_PRESS_SLOP_PX = 8

/** Where around the tap to look for a control whose slop covers it. */
const OFFS: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0, -10],
  [0, 10],
  [-10, 0],
  [10, 0],
  [0, -18],
  [0, 18],
  [-18, 0],
  [18, 0],
  [-12, -12],
  [12, -12],
  [-12, 12],
  [12, 12],
]

const ctlOf = (n: Element | null): HTMLElement | null => n?.closest<HTMLElement>(CTL) ?? null

/** What the finger landed on: the nearest control, or a clickable element (cursor: pointer) a few levels up. */
function directOf(n: Element | null): HTMLElement | null {
  for (let i = 0; n && n !== document.body && i < 6; i++, n = n.parentElement) {
    if (!(n instanceof HTMLElement)) return null
    if (n.matches(CTL)) return n
    if (getComputedStyle(n).cursor === 'pointer') return n
  }
  return null
}

/** The control a tap at (x, y) belongs to, if it is not the one under the finger. */
export function slopTarget(x: number, y: number, direct: HTMLElement | null): HTMLElement | null {
  let best: HTMLElement | null = null
  let area = Infinity
  const seen = new Set<HTMLElement>()
  for (const [dx, dy] of OFFS) {
    const c = ctlOf(document.elementFromPoint(x + dx, y + dy))
    if (!c || seen.has(c)) continue
    seen.add(c)
    if (direct && c !== direct && !direct.contains(c)) continue
    const r = c.getBoundingClientRect()
    if (!r.width || !r.height) continue
    const sx = Math.max(0, (HIT_PX - r.width) / 2)
    const sy = Math.max(0, (HIT_PX - r.height) / 2)
    if (x < r.left - sx || x > r.right + sx || y < r.top - sy || y > r.bottom + sy) continue
    const a = r.width * r.height
    if (a < area) {
      area = a
      best = c
    }
  }
  if (!best || best === direct || (direct && best.contains(direct))) return null
  if ((best as HTMLButtonElement).disabled || best.getAttribute('aria-disabled') === 'true')
    return null
  return best
}

function caption(th: Element | undefined): string {
  if (!th) return ''
  const t = (th as HTMLElement).innerText || th.textContent || ''
  return t.trim().split('\n')[0]
}

function rowSheet(tr: HTMLTableRowElement): void {
  const table = tr.closest('table')
  const heads = table ? [...table.querySelectorAll('thead tr:first-child > th')] : []
  const cells = [...tr.children]
  if (cells.length === 0) return
  // The title is the first cell; when it holds no words (a lamp, a mark), the
  // first cell with words joins it and leaves the lines (§18.6, Rev .175 —
  // Overview's Trust rows read by their Source, not by a dot).
  const hasText = (el: Element) => (el.textContent ?? '').trim() !== ''
  const named = hasText(cells[0]) ? -1 : cells.findIndex((td, i) => i > 0 && hasText(td))
  const titled = named > 0 ? [cells[0], cells[named]] : [cells[0]]
  const rows = cells.slice(1).flatMap((td, j) => {
    const i = j + 1
    if (i === named) return []
    const k = caption(heads[i])
    const txt = (td.textContent ?? '').trim()
    return !k && !txt ? [] : [{ k: k || '—', td }]
  })
  const opens =
    tr.getAttribute('data-sr-open') || (getComputedStyle(tr).cursor === 'pointer' ? 'Open' : '')
  openShellSheet({
    title:
      titled.length === 1 ? (
        <Cell td={titled[0]} />
      ) : (
        <span className={css.rowTitle}>
          {titled.map((td, i) => (
            <Cell key={i} td={td} />
          ))}
        </span>
      ),
    label: (titled[titled.length - 1].textContent ?? '').trim() || 'Row',
    body: (
      <dl className={css.kv}>
        {rows.map((r, i) => (
          <div key={i} className={css.kvRow}>
            <dt>{r.k}</dt>
            <dd>
              <Cell td={r.td} />
            </dd>
          </div>
        ))}
      </dl>
    ),
    actions: opens ? [{ label: opens, primary: true, onRun: () => pass(tr) }] : [],
  })
}

function confirmOrder(b: HTMLElement): void {
  const what = b.getAttribute('data-sr-order') || (b.textContent ?? '').trim()
  openShellSheet({
    title: 'Confirm order',
    material: 'edit',
    detent: 'half',
    body: (
      <div className={css.note}>
        <b>{what}</b>
        <p>Goes to the broker as written. Nothing leaves until you confirm.</p>
      </div>
    ),
    actions: [
      { label: 'Cancel' },
      {
        label: b.getAttribute('data-sr-order-verb') || 'Send order',
        primary: true,
        onRun: () => pass(b),
      },
    ],
  })
}

/** Mounted once, by the shell. Inert on a desk with a mouse. */
export function useTouchLayer(): void {
  useEffect(() => {
    let lp: { x: number; y: number; fired: boolean; t: number } | null = null
    const touch = () => layoutNow().input === 'touch'

    // 1 — a fired long-press eats the click that ends it.
    const eat = (e: MouseEvent) => {
      if (lp?.fired) {
        e.preventDefault()
        e.stopImmediatePropagation()
        lp = null
      }
    }
    // 2 — hit slop.
    const slop = (e: MouseEvent) => {
      if (!touch() || !e.isTrusted || (e.clientX === 0 && e.clientY === 0)) return
      if (!(e.target instanceof Element)) return
      const direct = directOf(e.target)
      if (direct?.matches('input, select, textarea')) return
      const best = slopTarget(e.clientX, e.clientY, direct)
      if (!best) return
      e.preventDefault()
      e.stopImmediatePropagation()
      try {
        best.focus({ preventScroll: true })
      } catch {
        // Not focusable: the click still lands.
      }
      best.click()
    }
    // 3 — a kept table's row opens its detail on compact.
    const row = (e: MouseEvent) => {
      if (layoutNow().w !== 'compact' || !(e.target instanceof Element)) return
      const tr = e.target.closest<HTMLTableRowElement>('[data-sr-keep] tbody tr')
      if (!tr || PASS.has(tr)) return
      const host = tr.closest('[data-sr-keep]')
      if (!host || host.getAttribute('data-sr-detail') === 'page') return
      if (tr.children.length === 1 && tr.firstElementChild?.hasAttribute('colspan')) return
      // A control inside the row keeps its tap; the row itself matching CTL
      // (useRowLink's role="button") is the row, not a control in it.
      const c = e.target.closest(CTL)
      if (c && c !== tr && tr.contains(c)) return
      e.preventDefault()
      e.stopImmediatePropagation()
      rowSheet(tr)
    }
    // 4 — orders confirm on touch.
    const order = (e: MouseEvent) => {
      if (!touch() || !(e.target instanceof Element)) return
      const b = e.target.closest<HTMLElement>('[data-sr-order]')
      if (!b || PASS.has(b)) return
      e.preventDefault()
      e.stopImmediatePropagation()
      confirmOrder(b)
    }
    // Long-press = contextmenu at the finger.
    const down = (e: PointerEvent) => {
      if (!touch() || e.button !== 0 || !e.isPrimary || !(e.target instanceof Element)) return
      if (
        e.target.closest(
          'input, textarea, select, [contenteditable], [data-sheet-grip], [data-slot="bottom-sheet"]'
        )
      )
        return
      const target = e.target
      const x = e.clientX
      const y = e.clientY
      if (lp) window.clearTimeout(lp.t)
      lp = {
        x,
        y,
        fired: false,
        t: window.setTimeout(() => {
          if (!lp) return
          lp.fired = true
          target.dispatchEvent(
            new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y,
              view: window,
            })
          )
          try {
            navigator.vibrate?.(8)
          } catch {
            // No haptics: the menu is the feedback.
          }
        }, LONG_PRESS_MS),
      }
    }
    const move = (e: PointerEvent) => {
      if (lp && !lp.fired && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > LONG_PRESS_SLOP_PX) {
        window.clearTimeout(lp.t)
        lp = null
      }
    }
    const end = () => {
      if (lp && !lp.fired) {
        window.clearTimeout(lp.t)
        lp = null
      }
    }
    // The platform's own long-press menu (iPadOS) beat ours to it: ours stands down.
    const native = (e: MouseEvent) => {
      if (e.isTrusted && lp && !lp.fired) {
        window.clearTimeout(lp.t)
        lp.fired = true
      }
    }

    document.addEventListener('click', eat, true)
    document.addEventListener('click', slop, true)
    document.addEventListener('click', row, true)
    document.addEventListener('click', order, true)
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('pointermove', move, true)
    document.addEventListener('pointerup', end, true)
    document.addEventListener('pointercancel', end, true)
    document.addEventListener('contextmenu', native, true)
    return () => {
      if (lp) window.clearTimeout(lp.t)
      document.removeEventListener('click', eat, true)
      document.removeEventListener('click', slop, true)
      document.removeEventListener('click', row, true)
      document.removeEventListener('click', order, true)
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('pointermove', move, true)
      document.removeEventListener('pointerup', end, true)
      document.removeEventListener('pointercancel', end, true)
      document.removeEventListener('contextmenu', native, true)
    }
  }, [])
}
