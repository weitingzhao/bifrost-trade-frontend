/**
 * What the touch layer counts as a control, and how it re-sends a click it
 * intercepted without catching it a second time (`touchLayer.tsx`).
 */
export const CTL =
  'button, a[href], input, select, textarea, label, [role="button"], [role="checkbox"], [role="switch"], [role="tab"], [role="menuitem"], [role="option"], summary'

export const PASS = new WeakSet<Element>()
/** Re-dispatch a click the layer intercepted, without the layer catching it again. */
export function pass(el: HTMLElement): void {
  PASS.add(el)
  try {
    el.click()
  } finally {
    PASS.delete(el)
  }
}
