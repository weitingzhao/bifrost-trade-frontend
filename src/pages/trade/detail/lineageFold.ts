/**
 * The lineage block's fold on an iPad (design Rev .163, DESIGN_CONTRACTS
 * §18.11: lineage and funnel panels start folded there, so the rail's first
 * screen reaches the trade's Position and Risk).
 *
 * Only the iPad page folds it. The desk is as it was — no fold, nothing kept
 * — and so is a phone, and so is any surface the page is drawn in (the panel,
 * the float), whose face does not change by tier.
 *
 * Remembered for the iPad alone and for every trade at once: opening the
 * lineage on #78 opens it on the next trade too, the way a band's fold is a
 * reader's choice about the page and not about one record. Only the departure
 * from the default is kept, as `SectionBand` keeps its folds.
 */
import { useCallback, useMemo, useState } from 'react'
import { useDevice } from '@/lib/device'
import { useInSurface } from '@/lib/surfaceScope'
import type { TradeBlockFold } from './TradeBlock'

const KEY = 'bifrost.trade.lineage@pad'

function readOpen(): boolean {
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function writeOpen(open: boolean): void {
  try {
    if (open) window.localStorage.setItem(KEY, '1')
    else window.localStorage.removeItem(KEY)
  } catch {
    // Storage refused: the fold lasts the visit.
  }
}

/** The lineage block's `fold` on the iPad page; `undefined` everywhere else. */
export function useLineageFold(): TradeBlockFold | undefined {
  const { device } = useDevice()
  const inSurface = useInSurface()
  const [open, setOpen] = useState(readOpen)
  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next)
    writeOpen(next)
  }, [])
  const folds = device === 'pad' && !inSurface
  return useMemo(() => (folds ? { open, onOpenChange } : undefined), [folds, open, onOpenChange])
}
