/**
 * Book's and Pressure points' folds, per layout class (design Rev .163 → .164,
 * §18.7 `data-sr-fold="compact short"` · §18.11): compact and a short screen
 * above compact (an iPad Air, a 13″ laptop) start them folded, so the first
 * screen reaches the option lines, and each class remembers its own — folding
 * a band on one never folds it on another. A tall screen above compact (an
 * iPad Pro 13″ upright, the desk) keeps them open.
 *
 * The page holds these folds rather than the band, because a reading points
 * into them and opens them on the way: Room opens Pressure points, and the
 * Pressure hero opens Book to show its margin rows. On a tall screen nothing
 * changes — Pressure points keeps its session memory under the name it always
 * had (`pressure`, open by default) and Book stays the band's own fold.
 */
import { useCallback, useMemo } from 'react'
import type { FoldClass } from '@/components/layout/DeviceSectionBand'
import { useLayout } from '@/lib/device'
import { usePageViewState } from '@/lib/pageView'

/** Folded until opened on compact or a short screen, each its own; `undefined` on a tall one. */
function useClassFold(name: string): [boolean | undefined, (open: boolean) => void] {
  const { w, h } = useLayout()
  const cls: FoldClass | null = w === 'compact' ? 'compact' : h === 'short' ? 'short' : null
  const [folds, setFolds] = usePageViewState<Partial<Record<FoldClass, boolean>>>(name, {})
  const open = cls == null ? undefined : (folds[cls] ?? false)
  const setOpen = useCallback(
    (next: boolean) => {
      if (cls != null) setFolds((prev) => ({ ...prev, [cls]: next }))
    },
    [cls, setFolds],
  )
  return [open, setOpen]
}

export function usePressureFold(): [boolean, (open: boolean) => void] {
  const [desk, setDesk] = usePageViewState('pressure', true)
  const [byClass, setByClass] = useClassFold('pressureByClass')
  return byClass === undefined ? [desk, setDesk] : [byClass, setByClass]
}

/**
 * Book, as the band's `open` / `onOpenChange`: both `undefined` on a tall
 * screen above compact, which leaves the band uncontrolled (open by default,
 * remembered across visits, as before). Memoised, so a caller can keep it in
 * a dependency list.
 */
export function useBookFold(): { open?: boolean; onOpenChange?: (open: boolean) => void } {
  const [open, setOpen] = useClassFold('bookByClass')
  return useMemo(() => (open === undefined ? {} : { open, onOpenChange: setOpen }), [open, setOpen])
}
