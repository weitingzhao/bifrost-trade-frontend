/**
 * Two things the page lane (`#main-content`) keeps per route (design Rev .70
 * §5, Rev .71 §4).
 *
 * - `--sr-stick`: the height of the page's sticky toolbar (`[data-sr-toolbar]`
 *   when it is `position: sticky`), so table heads park under it rather than
 *   behind it. Measured on arrival, again once the page has settled, and on
 *   resize.
 * - Scroll restore: each route — path, query and hash — remembers the lane's
 *   scroll and its wide tables' sideways scroll for this tab's session, and
 *   gets them back when you return, once the content is tall enough to hold
 *   them. A route with nothing saved starts at the top; before this the lane
 *   kept the last page's offset.
 *
 * Folds, selection and filters are the page's own state and are not
 * restored here (the design leaves them to the pages).
 */
import { useEffect, useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'

const WIDE = '[data-sr-hscroll], .dense-scroll-x'

function lane(): HTMLElement | null {
  return document.getElementById('main-content')
}

function measureStick(): void {
  const tb = lane()?.querySelector<HTMLElement>('[data-sr-toolbar]')
  const h = tb && getComputedStyle(tb).position === 'sticky' ? Math.round(tb.getBoundingClientRect().height) : 0
  document.documentElement.style.setProperty('--sr-stick', `${h}px`)
}

interface Saved {
  y: number
  hs: number[]
}

function keyOf(loc: { pathname: string; search: string; hash: string }): string {
  return `bifrost.scroll:${loc.pathname}${loc.search}${loc.hash}`
}

function read(key: string): Saved | null {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? 'null') as Saved | null
  } catch {
    return null
  }
}

function snapshot(l: HTMLElement): Saved {
  return { y: l.scrollTop, hs: [...l.querySelectorAll<HTMLElement>(WIDE)].map((x) => x.scrollLeft) }
}

function write(key: string, v: Saved): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(v))
  } catch {
    // Storage refused: nothing to come back to, which is what there was before.
  }
}

export function usePageLane(): void {
  const loc = useLocation()
  const key = keyOf(loc)

  // Sticky toolbar height, per page.
  useEffect(() => {
    measureStick()
    const a = window.setTimeout(measureStick, 600)
    const b = window.setTimeout(measureStick, 2000)
    window.addEventListener('resize', measureStick)
    return () => {
      window.clearTimeout(a)
      window.clearTimeout(b)
      window.removeEventListener('resize', measureStick)
    }
  }, [key])

  // Save while reading this route; restore (or go to the top) on arrival.
  useLayoutEffect(() => {
    const l = lane()
    if (!l) return
    const saved = read(key)
    let timer = 0
    let tries = 0
    const restore = () => {
      tries += 1
      if (!saved) {
        l.scrollTop = 0
        return
      }
      if (l.scrollHeight - l.clientHeight >= saved.y - 4 || tries >= 30) {
        l.scrollTop = saved.y
        l.querySelectorAll<HTMLElement>(WIDE).forEach((x, i) => {
          if (saved.hs[i]) x.scrollLeft = saved.hs[i]
        })
        return
      }
      timer = window.setTimeout(restore, 100)
    }
    restore()

    // Read at the scroll itself, written a beat later: by the time a route
    // change unmounts this, the lane already holds the next page, so the
    // last reading is flushed rather than re-measured.
    let pending = 0
    let last: Saved | null = null
    const onScroll = () => {
      last = snapshot(l)
      window.clearTimeout(pending)
      pending = window.setTimeout(() => {
        if (last) write(key, last)
        last = null
      }, 200)
    }
    l.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(pending)
      l.removeEventListener('scroll', onScroll, { capture: true })
      if (last) write(key, last)
    }
  }, [key])
}
