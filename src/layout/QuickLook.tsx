/**
 * Quick Look (design Rev .71 §2): Space on a row that names a symbol or a
 * contract — the row under the pointer, or the one holding focus — opens a
 * 420 × 540 glass card with the Symbol page's compact face locked on that
 * name (a contract opens on its own face). The card sits right of the row,
 * else left, else centred, and the row gets an accent ring.
 *
 * While it is open: Space or Esc closes it, ↑ ↓ move to the previous / next
 * row that names something and follow it, ↵ opens the name by the shell's
 * rule (useSymbolGo), a click outside closes. Space in a text field types a
 * space, as it should.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SurfaceBody } from './SurfaceBody'
import { symbolSurface } from './equipSurface'
import { parseContract, symbolIn, type SymbolHit } from './shellContextTarget'
import { contractParams, useSymbolGo } from './symbolGo'
import css from './quickLook.module.css'

/** A table row or list item first; a marked name stands in only where there is no row. */
const ROW = 'tr, [role="row"], li'
const NAME = '[data-ctx-sym], [data-dock-sym]'
const W = 420
const H = 540

interface Look {
  row: HTMLElement
  hit: SymbolHit
  x: number
  y: number
}

function place(row: HTMLElement): { x: number; y: number } {
  const r = row.getBoundingClientRect()
  const h = Math.min(H, window.innerHeight - 24)
  let x = r.right + 12
  if (x + W > window.innerWidth - 12) x = Math.max(12, r.left - W - 12)
  if (x < 12 || r.width > window.innerWidth - W - 48) {
    x = Math.max(12, Math.min(window.innerWidth - W - 12, r.left + r.width / 2 - W / 2))
  }
  const y = Math.max(12, Math.min(window.innerHeight - h - 12, r.top + r.height / 2 - h / 2))
  return { x, y }
}

function neighbour(row: HTMLElement, forward: boolean): HTMLElement | null {
  let s: Element | null = row
  for (let i = 0; i < 40; i++) {
    s = forward ? s.nextElementSibling : s.previousElementSibling
    if (!(s instanceof HTMLElement)) return null
    if (s.offsetParent != null && symbolIn(s)) return s
  }
  return null
}

function editing(el: Element | null): boolean {
  return el != null && el.closest('input, textarea, select, [contenteditable="true"]') != null
}

export function QuickLook() {
  const { go } = useSymbolGo()
  const [look, setLook] = useState<Look | null>(null)
  const [shown, setShown] = useState(false)
  const card = useRef<HTMLDivElement | null>(null)
  const hover = useRef<Element | null>(null)
  const lookRef = useRef<Look | null>(null)
  useEffect(() => {
    lookRef.current = look
  }, [look])

  useEffect(() => {
    const open = (row: HTMLElement) => {
      const hit = symbolIn(row)
      if (!hit) return false
      lookRef.current?.row.removeAttribute('data-ql-row')
      row.setAttribute('data-ql-row', '1')
      const next = { row, hit, ...place(row) }
      lookRef.current = next
      setLook(next)
      window.requestAnimationFrame(() => setShown(true))
      return true
    }
    const close = () => {
      lookRef.current?.row.removeAttribute('data-ql-row')
      lookRef.current = null
      setShown(false)
      setLook(null)
    }
    const onOver = (e: MouseEvent) => {
      hover.current = e.target instanceof Element ? e.target : null
    }
    const onKey = (e: KeyboardEvent) => {
      const a = document.activeElement
      if (editing(a)) return
      const cur = lookRef.current
      if (e.key === ' ' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (cur) {
          e.preventDefault()
          close()
          return
        }
        if (a?.closest('[role="dialog"], [role="menu"], [data-radix-popper-content-wrapper]')) return
        const from = a && a !== document.body ? a : hover.current
        const row = from?.closest<HTMLElement>(ROW) ?? from?.closest<HTMLElement>(NAME)
        if (!row || row.closest('[data-sidebar]')) return
        if (open(row)) e.preventDefault()
        return
      }
      if (!cur) return
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const next = neighbour(cur.row, e.key === 'ArrowDown')
        if (next) {
          e.preventDefault()
          next.scrollIntoView({ block: 'nearest' })
          open(next)
        }
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const pick = cur.hit.contract ? parseContract(cur.hit.contract) : null
        close()
        go(cur.hit.sym, 'swap', pick ?? undefined)
      }
    }
    const onDown = (e: PointerEvent) => {
      if (lookRef.current && card.current && !card.current.contains(e.target as Node)) close()
    }
    document.addEventListener('mouseover', onOver, true)
    document.addEventListener('keydown', onKey, true)
    document.addEventListener('pointerdown', onDown, true)
    return () => {
      document.removeEventListener('mouseover', onOver, true)
      document.removeEventListener('keydown', onKey, true)
      document.removeEventListener('pointerdown', onDown, true)
    }
  }, [go])

  const hit = look?.hit ?? null
  // One surface per name looked at: its face intent is stamped once, not on
  // every render.
  const surface = useMemo(() => {
    if (!hit) return null
    const pick = hit.contract ? parseContract(hit.contract) : null
    return symbolSurface(hit.sym, {
      lock: true,
      ...(pick ? { tab: pick.multi ? 'payoff' : 'chain', params: contractParams(pick) } : {}),
    })
  }, [hit])

  if (!look || !hit || !surface) return null
  return createPortal(
    <div
      ref={card}
      role="dialog"
      aria-label={`Quick Look · ${hit.contract ?? hit.sym}`}
      className={css.card}
      data-on={shown ? '1' : '0'}
      data-glass-surface="surface"
      style={{ left: look.x, top: look.y }}
    >
      <div className={css.head}>
        <span style={{ color: hit.contract ? 'var(--sk-contract)' : 'var(--sk-ticker)' }}>{hit.contract ?? hit.sym}</span>
        <span className={css.keys}>␣ close · ↑↓ next · ↵ open</span>
      </div>
      <div className={css.body} data-mat="">
        <SurfaceBody key={surface.key + (hit.contract ?? '')} surface={surface} />
      </div>
    </div>,
    document.body,
  )
}
