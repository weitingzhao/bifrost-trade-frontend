/**
 * The sidebar's open / folded memory, kept per width class (design Rev .164,
 * DESIGN_CONTRACTS §18.4).
 *
 * - **wide** keeps the desktop memory it always had: the DS's `sidebar_state`
 *   cookie, the viewport default for someone who never chose (`shellChrome`).
 * - **medium** and **expanded** start as the icon rail and remember their own
 *   choice (`bifrost.sidebar@medium` · `@expanded`), so a sidebar opened on the
 *   desk is not carried to an iPad or a Duo's inner screen — nor back.
 * - **compact** has no sidebar.
 *
 * The DS provider writes the cookie on every toggle, whatever the class, so a
 * toggle below wide puts the cookie back as it was. App-level until
 * `@bifrost/ui` keys the memory itself (Rev .174 B5).
 */
import { useCallback, useState } from 'react'
import type { WidthClass } from '@/lib/device'
import { initialSidebarOpen } from './shellChrome'

const COOKIE = 'sidebar_state'

export function sidebarKeyFor(w: WidthClass): string | null {
  return w === 'medium' || w === 'expanded' ? `bifrost.sidebar@${w}` : null
}

function cookieValue(cookie: string): string | null {
  const m = cookie.match(/(?:^|;\s*)sidebar_state=([^;]*)/)
  return m ? m[1] : null
}

/** Where the sidebar starts in this class. */
export function sidebarOpenFor(w: WidthClass, cookie: string, viewportWidth: number): boolean {
  if (w === 'compact') return false
  const key = sidebarKeyFor(w)
  if (key == null) return initialSidebarOpen(cookie, viewportWidth)
  try {
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

/** The controlled open state for the DS provider: per class, and the cookie stays wide's. */
export function useSidebarMemory(w: WidthClass): [boolean, (open: boolean) => void] {
  const [open, setOpenState] = useState(() => sidebarOpenFor(w, document.cookie, window.innerWidth))
  // A new class reads its own memory — on the render it is seen, not in an effect.
  const [seen, setSeen] = useState(w)
  if (w !== seen) {
    setSeen(w)
    setOpenState(sidebarOpenFor(w, document.cookie, window.innerWidth))
  }
  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next)
      const key = sidebarKeyFor(w)
      if (key == null) return
      try {
        window.localStorage.setItem(key, next ? '1' : '0')
      } catch {
        // Storage refused: the choice lasts the visit.
      }
      // The provider writes `sidebar_state` right after this call; put wide's value back.
      const kept = cookieValue(document.cookie)
      queueMicrotask(() => {
        document.cookie =
          kept == null
            ? `${COOKIE}=; path=/; max-age=0`
            : `${COOKIE}=${kept}; path=/; max-age=${60 * 60 * 24 * 7}`
      })
    },
    [w],
  )
  return [open, setOpen]
}
