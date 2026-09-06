/**
 * The rendered width of an element, in CSS pixels, kept current by a
 * ResizeObserver. For SVG that must lay itself out in real pixels — a chart
 * whose labels would smear if the drawing were scaled to fit.
 */
import { useEffect, useState, type RefObject } from 'react'

export function useContainerWidth<T extends HTMLElement>(ref: RefObject<T | null>, fallback: number): number {
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = () => {
      const w = Math.round(el.getBoundingClientRect().width)
      if (w > 0) setWidth(w)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return width
}
