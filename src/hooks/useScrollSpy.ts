/**
 * Which in-page section is current as the page scrolls, and a jump to one.
 *
 * The reference pages track the shell's own scroller (`#main-content`), not
 * the window, so the hook finds the nearest scrolling ancestor of its root and
 * reads the `[data-sec]` sections inside that root.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

/** The nearest ancestor that scrolls vertically, or null when none does. */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let n = el?.parentElement ?? null; n; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY
    if (oy === 'auto' || oy === 'scroll') return n
  }
  return null
}

/**
 * Which `[data-sec]` section is current, and a jump that lands one `gap`
 * below the scroller's top. A section is current once its top passes `offset`
 * below the scroller's top.
 */
export function useScrollSpy(anchors: readonly string[], { offset = 90, gap = 12 }: { offset?: number; gap?: number } = {}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<string | null>(anchors[0] ?? null)
  const key = anchors.join('|')

  useEffect(() => {
    const root = rootRef.current
    const scroller = scrollParent(root)
    if (!root || !scroller) return
    const onScroll = () => {
      const top = scroller.getBoundingClientRect().top + offset
      let cur: string | null = null
      root.querySelectorAll<HTMLElement>('[data-sec]').forEach((s) => {
        if (cur == null || s.getBoundingClientRect().top <= top) cur = s.dataset.sec ?? cur
      })
      setActive(cur)
    }
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [key, offset])

  const jump = useCallback((anchor: string) => {
    const root = rootRef.current
    const scroller = scrollParent(root)
    const target = root?.querySelector<HTMLElement>(`[data-sec="${anchor}"]`)
    if (!scroller || !target) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    scroller.scrollTo({
      top: scroller.scrollTop + target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - gap,
      behavior: reduce ? 'auto' : 'smooth',
    })
    setActive(anchor)
  }, [gap])

  return { rootRef, active, jump }
}
