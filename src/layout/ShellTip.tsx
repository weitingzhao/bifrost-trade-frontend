/**
 * One tooltip for the whole app (design Rev .68 §4, `shell-registry.js`
 * tipEngine).
 *
 * It takes over `data-tip` and every native `title`: a title is read on the
 * first hover and moved to `data-tip-t`, so the browser's own tooltip never
 * doubles it; an icon-only control with no readable name gets the title as
 * its `aria-label` on the way. One glass card, placed below its element
 * (flipped above near the bottom edge, to the right of a sidebar row).
 *
 * Timing is macOS's: the first tip waits 450ms; once one has shown, the next
 * appears at once for 600ms after it hides. Keyboard focus shows it
 * immediately. Pressing, scrolling or Esc puts it away, and a control whose
 * popover is open (`aria-expanded`) shows none.
 *
 * `[data-no-tip]` opts a subtree out — the dock keeps its own labels.
 */
import { useEffect, useRef } from 'react'
import css from './shellTip.module.css'

const FIRST_MS = 450
const WARM_MS = 600

function tipOf(node: EventTarget | null): HTMLElement | null {
  if (!(node instanceof Element)) return null
  const el = node.closest<HTMLElement>('[data-tip],[title],[data-tip-t]')
  if (el == null || el.closest('[data-no-tip]') != null) return null
  if (el.hasAttribute('title')) {
    const v = el.getAttribute('title')
    el.removeAttribute('title')
    if (!v) return null
    el.setAttribute('data-tip-t', v)
    if (!el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby') && !el.textContent?.trim()) {
      el.setAttribute('aria-label', v)
    }
  }
  return el.getAttribute('data-tip') || el.getAttribute('data-tip-t') ? el : null
}

export function ShellTip() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tip = ref.current
    if (tip == null) return
    let cur: HTMLElement | null = null
    let timer = 0
    let warmUntil = 0

    const show = (el: HTMLElement) => {
      if (!document.contains(el) || el.matches('[aria-expanded="true"]')) return
      tip.textContent = el.getAttribute('data-tip') || el.getAttribute('data-tip-t') || ''
      tip.dataset.on = '1'
      const r = el.getBoundingClientRect()
      const tw = tip.offsetWidth
      const th = tip.offsetHeight
      let x = r.left + r.width / 2 - tw / 2
      let y = r.bottom + 8
      if (el.closest('[data-sidebar="sidebar"]') != null) {
        x = r.right + 10
        y = r.top + r.height / 2 - th / 2
      }
      if (y + th > window.innerHeight - 8) y = r.top - th - 8
      tip.style.left = `${Math.max(8, Math.min(x, window.innerWidth - tw - 8))}px`
      tip.style.top = `${Math.max(8, y)}px`
      warmUntil = Number.POSITIVE_INFINITY
    }
    const hide = () => {
      window.clearTimeout(timer)
      if (cur != null && warmUntil === Number.POSITIVE_INFINITY) warmUntil = Date.now() + WARM_MS
      cur = null
      tip.dataset.on = '0'
    }
    const arm = (el: HTMLElement | null, now = false) => {
      hide()
      if (el == null) return
      cur = el
      timer = window.setTimeout(
        () => {
          if (cur === el) show(el)
        },
        now || Date.now() < warmUntil ? 0 : FIRST_MS,
      )
    }

    const onOver = (e: MouseEvent) => {
      const el = tipOf(e.target)
      if (el !== cur) arm(el)
    }
    const onOut = (e: MouseEvent) => {
      if (cur != null && !(e.relatedTarget instanceof Node && cur.contains(e.relatedTarget))) hide()
    }
    const onFocus = (e: FocusEvent) => {
      const visible = (() => {
        try {
          return e.target instanceof Element && e.target.matches(':focus-visible')
        } catch {
          return false
        }
      })()
      if (visible) arm(tipOf(e.target), true)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide()
    }
    const quiet = ['focusout', 'pointerdown', 'scroll', 'wheel'] as const

    document.addEventListener('mouseover', onOver, true)
    document.addEventListener('mouseout', onOut, true)
    document.addEventListener('focusin', onFocus, true)
    document.addEventListener('keydown', onKey, true)
    quiet.forEach((ev) => document.addEventListener(ev, hide, true))
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('mouseover', onOver, true)
      document.removeEventListener('mouseout', onOut, true)
      document.removeEventListener('focusin', onFocus, true)
      document.removeEventListener('keydown', onKey, true)
      quiet.forEach((ev) => document.removeEventListener(ev, hide, true))
    }
  }, [])

  return <div ref={ref} role="tooltip" className={css.tip} data-on="0" data-glass-surface="raised" />
}
