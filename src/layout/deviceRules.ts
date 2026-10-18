/**
 * Two shell behaviours the layout axes add (design Rev .163 → .176), on the
 * package's parts since D2:
 *
 * - **Kept columns (compact, §18.6).** A table container writes
 *   `data-sr-keep="1,4,8"` (column numbers from 1); on compact every other
 *   column hides. CSS cannot read a list out of an attribute, so the rule for
 *   each value is written once, the first time it is seen — the package's
 *   `ensureKeepRule`, the same rule its `DenseDataTable compactKeep` writes.
 *   The app's pages put the attribute on their own tables, so the shell scans
 *   for it.
 * - **The dock bar steps aside (short, above compact, §18.11).** The
 *   package's `useDockStepAside` on the page lane (`#main-content`): 32px of
 *   reading hides the bottom toolbar; 24px back up, the top of the page, or a
 *   tap — or the mouse — within 56px of the bottom brings it back.
 */
import { useEffect } from 'react'
import { ensureKeepRule, useDockStepAside } from '@bifrost/ui'
import { useLayout } from '@/lib/device'

export { dockStep, keepRule } from '@bifrost/ui'

export function useCompactKeepRules(): void {
  const compact = useLayout().w === 'compact'
  useEffect(() => {
    if (!compact) return
    const scan = () => {
      document.querySelectorAll('[data-sr-keep]').forEach((n) => {
        const v = n.getAttribute('data-sr-keep')
        if (v) ensureKeepRule(v)
      })
    }
    scan()
    // The observer's callback is already one batch per task; scanning there,
    // not in a frame, keeps a tab that is not painting (a background tab, a
    // preview) from showing the full table.
    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-sr-keep'] })
    return () => mo.disconnect()
  }, [compact])
}

/** Rev .163's name. */
export const usePhoneKeepRules = useCompactKeepRules

export function useShortDockAutoHide(): void {
  useDockStepAside({ main: '#main-content' })
}

/** Rev .163's name. */
export const usePadDockAutoHide = useShortDockAutoHide
