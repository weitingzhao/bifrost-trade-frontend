/**
 * Book's and Pressure points' folds, per device tier (design Rev .163, §18.7
 * `data-sr-phone-fold` · §18.11 `data-sr-pad-fold`): a phone and an iPad start
 * them folded, so the first screen reaches the option lines, and each tier
 * remembers its own — folding a band on one never folds it on another.
 *
 * The page holds these folds rather than the band, because a reading points
 * into them and opens them on the way: Room opens Pressure points, and the
 * Pressure hero opens Book to show its margin rows. On the desk nothing
 * changes — Pressure points keeps its session memory under the name it always
 * had (`pressure`, open by default) and Book stays the band's own fold.
 */
import { useCallback, useMemo } from 'react'
import { useDevice } from '@/lib/device'
import { usePageViewState } from '@/lib/pageView'

type TouchTier = 'phone' | 'pad'

/** Folded until opened on a phone or an iPad, each its own; `undefined` on the desk. */
function useTouchFold(name: string): [boolean | undefined, (open: boolean) => void] {
  const { device } = useDevice()
  const [folds, setFolds] = usePageViewState<Partial<Record<TouchTier, boolean>>>(name, {})
  const open = device === 'desk' ? undefined : (folds[device] ?? false)
  const setOpen = useCallback(
    (next: boolean) => {
      if (device !== 'desk') setFolds((prev) => ({ ...prev, [device]: next }))
    },
    [device, setFolds],
  )
  return [open, setOpen]
}

export function usePressureFold(): [boolean, (open: boolean) => void] {
  const [desk, setDesk] = usePageViewState('pressure', true)
  const [touch, setTouch] = useTouchFold('pressureByTier')
  return touch === undefined ? [desk, setDesk] : [touch, setTouch]
}

/**
 * Book, as the band's `open` / `onOpenChange`: both `undefined` on the desk,
 * which leaves the band uncontrolled (open by default, remembered across
 * visits, as before). Memoised, so a caller can keep it in a dependency list.
 */
export function useBookFold(): { open?: boolean; onOpenChange?: (open: boolean) => void } {
  const [open, setOpen] = useTouchFold('bookByTier')
  return useMemo(() => (open === undefined ? {} : { open, onOpenChange: setOpen }), [open, setOpen])
}
