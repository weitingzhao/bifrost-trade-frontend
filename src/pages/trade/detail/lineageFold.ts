/**
 * The lineage block's fold on a short screen (design Rev .163 → .164,
 * DESIGN_CONTRACTS §18.11: lineage and funnel panels start folded there, so
 * the rail's first screen reaches the trade's Position and Risk). Short above
 * compact — an iPad Air, a 13″ laptop; an iPad Pro 13″ is tall either way up
 * and keeps it open.
 *
 * Only that page folds it. A tall screen is as it was — no fold, nothing kept
 * — and so is compact, and so is any surface the page is drawn in (the panel,
 * the float), whose face does not change by class.
 *
 * Remembered for the short class alone and for every trade at once: opening
 * the lineage on #78 opens it on the next trade too, the way a band's fold is
 * a reader's choice about the page and not about one record. Only the
 * departure from the default is kept, as `SectionBand` keeps its folds.
 */
import { useCallback, useMemo, useState } from 'react'
import { useLayout } from '@/lib/device'
import { useInSurface } from '@/lib/surfaceScope'
import type { TradeBlockFold } from './TradeBlock'

const KEY = 'bifrost.trade.lineage@short'

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

/** The lineage block's `fold` on a short page above compact; `undefined` everywhere else. */
export function useLineageFold(): TradeBlockFold | undefined {
  const { w, h } = useLayout()
  const inSurface = useInSurface()
  const [open, setOpen] = useState(readOpen)
  const onOpenChange = useCallback((next: boolean) => {
    setOpen(next)
    writeOpen(next)
  }, [])
  const folds = h === 'short' && w !== 'compact' && !inSurface
  return useMemo(() => (folds ? { open, onOpenChange } : undefined), [folds, open, onOpenChange])
}
