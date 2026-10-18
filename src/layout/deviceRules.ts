/**
 * Two shell behaviours the layout axes add (design Rev .163 → .174):
 *
 * - **Kept columns (compact, §18.6).** A table container writes
 *   `data-sr-keep="1,4,8"` (column numbers from 1); on compact every other
 *   column hides. CSS cannot read a list out of an attribute, so the rule for
 *   each value is written once, the first time it is seen. Nested tables do
 *   not inherit: the rule is the container's direct table rows only.
 * - **The dock bar steps aside (short, above compact, §18.11).** Reading
 *   down a page hides the bottom toolbar after 32px of travel; 24px back up,
 *   the top of the page, or a tap — or the mouse — within 56px of the bottom
 *   edge brings it back. 220ms, drawn by `styles/device.css` off
 *   `<html data-sr-dockhide>`. An iPad Air and a 13″ laptop both qualify.
 */
import { useEffect } from 'react'
import { layoutNow, useLayout } from '@/lib/device'

/** The CSS for one `data-sr-keep` value: every cell not in the list hides on compact. */
export function keepRule(value: string): string {
  const keep = value
    .split(',')
    .map((s) => parseInt(s, 10))
    .filter((n) => n > 0)
  if (keep.length === 0) return ''
  const nots = keep.map((n) => `:not(:nth-child(${n}))`).join('')
  const v = value.replace(/["\\]/g, '')
  // `:not([colspan])`: a full-width group or empty row keeps spanning.
  // `tr:not(… td tr)`: a table nested in a cell keeps all its columns.
  const host = `[data-sr-keep="${v}"]`
  return `html[data-w='compact'] ${host} tr:not(${host} td tr) > :is(th, td)${nots}:not([colspan]) { display: none; }`
}

export function useCompactKeepRules(): void {
  const compact = useLayout().w === 'compact'
  useEffect(() => {
    if (!compact) return
    let style = document.getElementById('sr-keep-css') as HTMLStyleElement | null
    if (!style) {
      style = document.createElement('style')
      style.id = 'sr-keep-css'
      document.head.appendChild(style)
    }
    const seen = new Set((style.dataset.values ?? '').split('|').filter(Boolean))
    const scan = () => {
      let add = ''
      document.querySelectorAll('[data-sr-keep]').forEach((n) => {
        const v = n.getAttribute('data-sr-keep')
        if (!v || seen.has(v)) return
        seen.add(v)
        add += keepRule(v) + '\n'
      })
      if (add && style) {
        style.textContent += add
        style.dataset.values = [...seen].join('|')
      }
    }
    scan()
    // The observer's callback is already one batch per task; scanning there,
    // not in a frame, keeps a tab that is not painting (a background tab, a
    // preview) from showing the full table.
    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-sr-keep'] })
    return () => mo.disconnect()
  }, [compact])
}

/** Rev .163's name. */
export const usePhoneKeepRules = useCompactKeepRules

export const DOCK_HIDE_AFTER_PX = 32
export const DOCK_SHOW_AFTER_PX = 24
export const DOCK_EDGE_PX = 56

/** One scroller's step: whether the bar should now hide, show, or stay as it is. */
export function dockStep(y: number, acc: number): 'hide' | 'show' | 'stay' {
  if (y < DOCK_SHOW_AFTER_PX || acc < -DOCK_SHOW_AFTER_PX) return 'show'
  if (acc > DOCK_HIDE_AFTER_PX) return 'hide'
  return 'stay'
}

const steps = () => {
  const l = layoutNow()
  return l.h === 'short' && l.w !== 'compact'
}

export function useShortDockAutoHide(): void {
  const { w, h } = useLayout()
  const on = h === 'short' && w !== 'compact'
  useEffect(() => {
    const root = document.documentElement
    if (!on) {
      root.removeAttribute('data-sr-dockhide')
      return
    }
    const last = new WeakMap<Element, number>()
    let acc = 0
    const onScroll = (e: Event) => {
      if (!steps()) return
      const t = e.target instanceof Element ? e.target : document.scrollingElement
      // The page lane and what scrolls inside it; a panel or a sheet scrolling is not reading the page.
      if (!t || !(t.id === 'main-content' || t.closest('#main-content'))) return
      const y = t.scrollTop
      const p = last.get(t) ?? y
      last.set(t, y)
      const d = y - p
      acc = d > 0 === acc > 0 ? acc + d : d
      const step = dockStep(y, acc)
      if (step === 'show') root.removeAttribute('data-sr-dockhide')
      else if (step === 'hide') root.setAttribute('data-sr-dockhide', '1')
    }
    const back = () => {
      root.removeAttribute('data-sr-dockhide')
      acc = 0
    }
    const onDown = (e: PointerEvent) => {
      if (root.hasAttribute('data-sr-dockhide') && e.clientY > window.innerHeight - DOCK_EDGE_PX) back()
    }
    // A laptop's pointer reaching for the bar brings it back too.
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && root.hasAttribute('data-sr-dockhide') && e.clientY > window.innerHeight - DOCK_EDGE_PX) back()
    }
    document.addEventListener('scroll', onScroll, true)
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointermove', onMove, true)
    return () => {
      document.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointermove', onMove, true)
      root.removeAttribute('data-sr-dockhide')
    }
  }, [on])
}

/** Rev .163's name. */
export const usePadDockAutoHide = useShortDockAutoHide
