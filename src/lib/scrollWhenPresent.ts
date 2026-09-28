/**
 * Scroll an element into view once it exists — a deep link lands before the
 * rows it points at have loaded. Gives up after `timeoutMs`; returns a cancel.
 */
export function scrollWhenPresent(selector: string, timeoutMs = 20_000, onFound?: (el: Element) => void): () => void {
  let raf = 0
  const until = Date.now() + timeoutMs
  const tick = () => {
    const el = document.querySelector(selector)
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      onFound?.(el)
      return
    }
    if (Date.now() < until) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

/** A brief tint on what a deep link landed on, so the eye finds it. */
export function flashFound(el: Element): void {
  if (!(el instanceof HTMLElement) || typeof el.animate !== 'function') return
  el.animate(
    [{ backgroundColor: 'color-mix(in srgb, var(--sk-accent) 22%, transparent)' }, { backgroundColor: 'transparent' }],
    { duration: 1800, easing: 'ease-out' },
  )
}
