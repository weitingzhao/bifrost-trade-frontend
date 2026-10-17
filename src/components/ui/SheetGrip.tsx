/**
 * The grip on a phone's bottom sheet (DESIGN_CONTRACTS §18.5): a tap switches
 * the two detents; a drag up past 48 goes full; a drag down past 72 drops full
 * to half and half to closed. The sheet follows the finger while it drags.
 *
 * Shared by `BottomSheet`, the DS dialogs (`dialog.tsx`) and the shell's
 * panel and float when they land as sheets — the one gesture for all of them.
 */
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { sheetRelease } from './sheetGesture'
import css from './bottomSheet.module.css'

export interface SheetGripProps {
  sheet: RefObject<HTMLElement | null>
  full: boolean
  onDetent: (full: boolean) => void
  onClose: () => void
}

export function SheetGrip({ sheet, full, onDetent, onClose }: SheetGripProps) {
  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = sheet.current
    if (!el || e.button !== 0) return
    e.preventDefault()
    const grip = e.currentTarget
    try {
      grip.setPointerCapture(e.pointerId)
    } catch {
      // A synthetic pointer: the window listeners below still follow it.
    }
    const y0 = e.clientY
    let dy = 0
    const move = (ev: PointerEvent) => {
      dy = ev.clientY - y0
      el.style.translate = `0 ${Math.max(-40, dy)}px`
      el.style.transition = 'none'
    }
    const up = () => {
      grip.removeEventListener('pointermove', move)
      grip.removeEventListener('pointerup', up)
      grip.removeEventListener('pointercancel', up)
      el.style.translate = ''
      el.style.transition = ''
      const r = sheetRelease(dy, full)
      if (r === 'toggle') onDetent(!full)
      else if (r === 'full') onDetent(true)
      else if (r === 'half') onDetent(false)
      else if (r === 'close') onClose()
    }
    grip.addEventListener('pointermove', move)
    grip.addEventListener('pointerup', up)
    grip.addEventListener('pointercancel', up)
  }
  return (
    <div
      className={css.grip}
      role="button"
      tabIndex={-1}
      aria-label={full ? 'Half height' : 'Full height'}
      data-sheet-grip=""
      onPointerDown={down}
    />
  )
}
