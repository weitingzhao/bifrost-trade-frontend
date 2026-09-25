/**
 * The bottom line of the frame (design Rev .57–.60, Shell Spec §5a.11): the
 * toolbar, floating over the page rather than taking a lane from it. The
 * status pill that sat at its left retired into the top bar's menu bar in
 * Rev .60, so the lane is the content's width now.
 *
 * Two things live here:
 *
 * - **Whether the toolbar shows.** The sidebar foot's square toggles it; the
 *   choice is kept as `bifrost.toolbar` = `hidden` | `shown`, shown by default,
 *   and the design's `bifrost:toolbar` event is honoured as a toggle too.
 * - **The lane.** Left edge = the content's left (the sidebar's right) + 12;
 *   right edge = what the content leaves on the right (a pushed panel, the
 *   Symbol list's column) + 12,
 *   or the overlaying panel's width when that still leaves room beside it.
 *   Measured, not computed from sidebar constants: the sidebar animates, and a
 *   pushed panel narrows the content without telling anyone.
 */
import { useEffect, useState, useSyncExternalStore } from 'react'

const TOOLBAR_KEY = 'bifrost.toolbar'
const listeners = new Set<() => void>()

function readShown(): boolean {
  try {
    return localStorage.getItem(TOOLBAR_KEY) !== 'hidden'
  } catch {
    return true
  }
}

let shown = readShown()

function emit() {
  for (const l of listeners) l()
}

/** Show or hide the bottom toolbar, and remember it. */
export function toggleToolbar(): void {
  shown = !shown
  try {
    localStorage.setItem(TOOLBAR_KEY, shown ? 'shown' : 'hidden')
  } catch {
    // Private mode or blocked storage: the toggle still works for this visit.
  }
  emit()
}

if (typeof window !== 'undefined') {
  window.addEventListener('bifrost:toolbar', toggleToolbar)
}

export function useToolbarShown(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => shown,
    () => true,
  )
}

/** Gap between the lane's furniture and everything around it. */
export const LANE_GAP_PX = 12

export interface BottomLane {
  /** Distance from the viewport's left edge to where the lane starts. */
  left: number
  /** Distance from the viewport's right edge to where the lane ends. */
  right: number
  /** The lane's width. */
  width: number
}

function measure(overlayRight: number): BottomLane {
  const main = document.getElementById('main-content')
  const vw = window.innerWidth
  const rect = main?.getBoundingClientRect()
  const contentLeft = rect ? Math.max(0, Math.round(rect.left)) : 0
  const pushed = rect ? Math.max(0, Math.round(vw - rect.right)) : 0
  // An overlaying panel takes the lane's right end only when that still
  // leaves a lane worth centring in (the design's 300px). A pushing one has
  // already narrowed the content — `pushed` is at least its width then (the
  // Symbol list's column, at most 300, never is) — so it is not counted twice.
  const overlay =
    overlayRight > 0 && pushed < overlayRight && vw - contentLeft - pushed - overlayRight - 2 * LANE_GAP_PX >= 300
      ? overlayRight
      : 0
  const left = contentLeft + LANE_GAP_PX
  const right = pushed + overlay + LANE_GAP_PX
  return { left, right, width: Math.max(0, vw - left - right) }
}

/**
 * The lane, kept current: on resize, and when the content box changes size
 * (the sidebar folding, a panel pushing, the Symbol list's column).
 * `overlayRight` is an overlaying panel's width, 0 when none.
 */
export function useBottomLane(overlayRight = 0): BottomLane {
  const [lane, setLane] = useState<BottomLane>(() =>
    typeof window === 'undefined' ? { left: 0, right: 0, width: 0 } : measure(overlayRight),
  )
  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next = measure(overlayRight)
        setLane((prev) =>
          prev.left === next.left && prev.right === next.right && prev.width === next.width ? prev : next,
        )
      })
    }
    update()
    const ro = new ResizeObserver(update)
    const main = document.getElementById('main-content')
    if (main) ro.observe(main)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [overlayRight])
  return lane
}
