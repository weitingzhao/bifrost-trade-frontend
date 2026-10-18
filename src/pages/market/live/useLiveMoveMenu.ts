import { useCallback, useState, type MouseEvent } from 'react'
import { targetOf } from '@/layout/shellContextTarget'
import type { MoveMenuAt, MoveSpec } from './liveMoves'

/**
 * The state behind one `LiveMoveMenu`. `onMenu` goes on a row's or a chip's
 * `onContextMenu` — a right-click, or (on touch) the long-press the layout
 * provider turns into one.
 *
 * It stands down in two cases, and the event goes on as before:
 * - nothing to move (a group of one, or a sort that is not the user's order);
 * - the press is on a ticker or a contract: the shell's own menu answers there
 *   (`ShellContextMenu`, Rev .69 §1), and two menus must not open at once.
 */
export function useLiveMoveMenu() {
  const [at, setAt] = useState<MoveMenuAt | null>(null)
  const onMenu = useCallback((e: MouseEvent<HTMLElement>, spec: MoveSpec) => {
    if (spec.items.length === 0) return
    if (targetOf(e.nativeEvent) != null) return
    e.preventDefault()
    const back =
      e.target instanceof Element ? e.target.closest<HTMLElement>('button, a, [tabindex]') : null
    setAt({ ...spec, x: e.clientX, y: e.clientY, back })
  }, [])
  const close = useCallback(() => setAt(null), [])
  return { at, onMenu, close }
}
