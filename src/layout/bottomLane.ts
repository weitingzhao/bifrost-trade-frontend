/**
 * The bottom line of the frame (design Rev .57–.58, Shell Spec §5a.11): the
 * status pill at its left, the toolbar right of it, both floating over the
 * page rather than taking a lane from it.
 *
 * Two things live here because both the pill and the toolbar read them:
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
  /** The status pill's width plus the gap after it; 0 before it has drawn. */
  pill: number
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
  const pillEl = document.querySelector<HTMLElement>('[data-sb-pill] [data-sb-capsule]')
  const pill = pillEl ? Math.round(pillEl.offsetWidth) + LANE_GAP_PX : 0
  return { left, right, width: Math.max(0, vw - left - right), pill }
}

/**
 * The lane, kept current: on resize, when the content box changes size (the
 * sidebar folding, a panel pushing), and when the pill changes width.
 * `overlayRight` is an overlaying panel's width, 0 when none.
 */
export function useBottomLane(overlayRight = 0): BottomLane {
  const [lane, setLane] = useState<BottomLane>(() =>
    typeof window === 'undefined' ? { left: 0, right: 0, width: 0, pill: 0 } : measure(overlayRight),
  )
  useEffect(() => {
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next = measure(overlayRight)
        setLane((prev) =>
          prev.left === next.left && prev.right === next.right && prev.width === next.width && prev.pill === next.pill
            ? prev
            : next,
        )
      })
    }
    update()
    const ro = new ResizeObserver(update)
    const main = document.getElementById('main-content')
    if (main) ro.observe(main)
    // The pill mounts beside the content; look again once it has drawn.
    const late = window.setTimeout(() => {
      const pillEl = document.querySelector<HTMLElement>('[data-sb-pill] [data-sb-capsule]')
      if (pillEl) ro.observe(pillEl)
      update()
    }, 400)
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(late)
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [overlayRight])
  return lane
}
