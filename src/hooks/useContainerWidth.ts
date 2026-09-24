/**
 * The rendered width — or height — of an element, in CSS pixels, kept current
 * by a ResizeObserver. For SVG that must lay itself out in real pixels — a
 * chart whose labels would smear if the drawing were scaled to fit.
 */
import { useEffect, useState, type RefObject } from 'react'

function useContainerExtent<T extends HTMLElement>(
  ref: RefObject<T | null>,
  fallback: number,
  axis: 'width' | 'height',
): number {
  const [extent, setExtent] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const update = () => {
      const v = Math.round(el.getBoundingClientRect()[axis])
      if (v > 0) setExtent(v)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, axis])
  return extent
}

export function useContainerWidth<T extends HTMLElement>(ref: RefObject<T | null>, fallback: number): number {
  return useContainerExtent(ref, fallback, 'width')
}

/**
 * The height, for a chart that fills whatever its row gives it (§16.5). Measure
 * a box the chart does not size — an absolutely placed chart inside it — or the
 * two will chase each other.
 */
export function useContainerHeight<T extends HTMLElement>(ref: RefObject<T | null>, fallback: number): number {
  return useContainerExtent(ref, fallback, 'height')
}
