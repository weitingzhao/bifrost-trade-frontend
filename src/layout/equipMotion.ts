/**
 * Where a surface comes from is where it goes back to — the framework pass's
 * spatial continuity (design Rev 2026-09-23.25, `_Shell TopBar` `_animateIn` /
 * `_dismiss`).
 *
 * - A **float** springs out of the control that summoned it — the rail icon,
 *   the Ask button — in 300ms (scale .3 → 1 and the offset back to zero), and
 *   shrinks back into it in 210ms when you close it.
 * - The **panel** slides in from the right edge (260ms) and out again (190ms)
 *   when its last tab closes. Closing one tab of several is not the panel
 *   leaving, so it does not move.
 * - **Moving** a surface between places plays no exit: it is the same surface
 *   arriving somewhere else, and an exit would say it had gone. Only a close
 *   the reader asked for animates, which is why programmatic closes keep
 *   calling `closeSurface` directly.
 *
 * The animations use the independent `translate` / `scale` properties through
 * the Web Animations API, so they never fight the float's own `transform`
 * (a Pad is centred with `translateX(-50%)`). Under reduced motion there is no
 * motion at all — the surface appears and disappears.
 *
 * Focus follows the same path: when a surface closes, focus goes back to the
 * button that opened it, if that button is still on the page.
 */
import { closeSurface, isVisible, surfaceState, toggleSurface, type Surface } from './equipSurface'

type Point = { x: number; y: number }

/** Who opened each surface: the element (for focus) and where it was (for motion). */
const origins = new Map<string, { el: Element; pt: Point }>()
/** The origin of the open that is about to render; consumed by the entrance. */
let pending: { key: string; pt: Point } | null = null

const elements: { float: HTMLElement | null; panel: HTMLElement | null } = {
  float: null,
  panel: null,
}
/** Surfaces mid-exit: a second close of the same one waits for the first. */
const exiting = new Set<string>()

function reduced(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

function centre(el: Element): Point {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

/** From the element's centre to the origin; with no origin, a short rise from below. */
function vector(el: HTMLElement, pt: Point | null | undefined): [number, number] {
  if (!pt) return [0, 14]
  const c = centre(el)
  return [pt.x - c.x, pt.y - c.y]
}

/** Record the control a surface is being opened from. Call before opening. */
export function noteOrigin(key: string, el: Element | null | undefined): void {
  if (!el) return
  const pt = centre(el)
  origins.set(key, { el, pt })
  pending = { key, pt }
}

/** The float and the panel hand their card here so a close can move it. */
export function registerSurfaceElement(place: 'float' | 'panel', el: HTMLElement | null): void {
  elements[place] = el
}

/** The float has just shown `key`: spring it out of where it was summoned. */
export function animateFloatIn(el: HTMLElement, key: string): void {
  const pt = pending?.key === key ? pending.pt : null
  pending = null
  if (reduced() || typeof el.animate !== 'function') return
  const [dx, dy] = vector(el, pt)
  el.animate(
    [
      { opacity: 0, translate: `${dx}px ${dy}px`, scale: '.3' },
      { opacity: 1, translate: '0 0', scale: '1' },
    ],
    { duration: 300, easing: 'cubic-bezier(.2,.9,.24,1.06)' }
  )
}

/** The panel has just opened: slide it in from the edge. */
export function animatePanelIn(el: HTMLElement): void {
  pending = null
  if (reduced() || typeof el.animate !== 'function') return
  el.animate(
    [
      { opacity: 0, translate: '36px 0' },
      { opacity: 1, translate: '0 0' },
    ],
    { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' }
  )
}

function returnFocus(key: string): void {
  const back = origins.get(key)?.el
  if (back instanceof HTMLElement && document.contains(back)) {
    try {
      back.focus({ preventScroll: true })
    } catch {
      // A control that cannot take focus any more is not worth an error.
    }
  }
}

/**
 * A close the reader asked for: the ×, Esc, the icon again. Animates back to
 * the origin, then removes; everything else about closing is `closeSurface`.
 */
export function dismissSurface(key: string): void {
  const { float, panel } = surfaceState()
  const isFloat = float?.key === key
  const lastTab = panel?.tabs.length === 1 && panel.tabs[0].key === key
  const el = isFloat ? elements.float : lastTab ? elements.panel : null
  const done = () => {
    exiting.delete(key)
    closeSurface(key)
    returnFocus(key)
  }
  if (!el || typeof el.animate !== 'function' || reduced()) {
    closeSurface(key)
    returnFocus(key)
    return
  }
  if (exiting.has(key)) return
  exiting.add(key)
  const keyframes = isFloat
    ? (() => {
        const [dx, dy] = vector(el, origins.get(key)?.pt)
        return [
          { opacity: 1, translate: '0 0', scale: '1' },
          { opacity: 0, translate: `${dx}px ${dy}px`, scale: '.3' },
        ]
      })()
    : [
        { opacity: 1, translate: '0 0' },
        { opacity: 0, translate: '36px 0' },
      ]
  const a = el.animate(keyframes, {
    duration: isFloat ? 210 : 190,
    easing: 'cubic-bezier(.4,0,.9,.6)',
    fill: 'forwards',
  })
  a.onfinish = done
  a.oncancel = done
}

/**
 * The rail's click and the Ask button's, with the control that was pressed:
 * visible → close back into it · otherwise → open (or bring forward) out of it.
 */
export function toggleSurfaceFrom(surf: Surface, el?: Element | null): void {
  if (isVisible(surf.key)) {
    dismissSurface(surf.key)
    return
  }
  noteOrigin(surf.key, el)
  toggleSurface(surf)
}
