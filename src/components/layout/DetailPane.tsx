/**
 * One detail, three places (design Rev .164 → .174, DESIGN_CONTRACTS §18.12 ·
 * HANDOFF Rev .174 B3): the page's "pick a row, read it" panel.
 *
 * - **dock** (`wide` and the content area ≥ 1200) — a column beside the main
 *   table, in the flow: `position: sticky` under the top of the lane, no
 *   shadow, 440 wide (`--detail-w`). Picking another row swaps it in place.
 * - **otherwise above compact** — an overlay on the right of the content area:
 *   opaque (`--background` + `--glass-drop`), below the top bar, pinned to
 *   the viewport so it does not scroll away with the page.
 * - **compact** — a `BottomSheet`.
 *
 * Crossing a class moves the panel, not its contents: the children render
 * once into a host node of their own, and the host is carried from place to
 * place — the selection, the open sections and the scroll position stay.
 * A fixed overlay must not sit under an ancestor with a running or filled
 * transform (Rev .166); the lane's entrance animation fills `backwards`.
 *
 * App-level until `@bifrost/ui` ships `DetailPane` (Rev .174 B3); the props
 * are the DS's: `open` · `onClose` · `width` · `material` · `children`, plus
 * the compact sheet's title.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useLayout } from '@/lib/device'
import { useDockColumn } from '@/layout/symbolDock/dockState'
import { SHELL_TOP_BAR_PX } from '@/layout/shellChrome'
import { cn } from '@/lib/utils'
import css from './detailPane.module.css'

export type DetailPlace = 'dock' | 'overlay' | 'sheet'

export interface DetailPaneProps {
  open: boolean
  onClose: () => void
  /** The column's width when docked or overlaid (default 440). */
  width?: number
  /** `edit` — the overlay and the sheet are opaque and the sheet opens full. */
  material?: 'view' | 'edit'
  /** The compact sheet's title; without it the children carry their own head. */
  sheetTitle?: ReactNode
  /** The sheet's accessible name when the title is not plain text. */
  label?: string
  className?: string
  children: ReactNode
}

/** Where the detail goes in this layout (exported for the pages that lay out around it). */
export function detailPlace(w: string, dock: boolean): DetailPlace {
  return w === 'compact' ? 'sheet' : dock ? 'dock' : 'overlay'
}

export function useDetailPlace(): DetailPlace {
  const { w, dock } = useLayout()
  return detailPlace(w, dock)
}

/** Carry the contents' node into its new place; a detached node loses its scroll offset, so it is put back. */
function moveHost(host: HTMLElement, target: HTMLElement, scrollTop: number): void {
  if (host.parentElement === target) return
  target.appendChild(host)
  host.scrollTop = scrollTop
}

export function DetailPane({ open, onClose, width = 440, material = 'view', sheetTitle, label, className, children }: DetailPaneProps) {
  const place = useDetailPlace()
  const dockCol = useDockColumn().width
  // The contents' one home: rendered into once, moved between places (as the
  // DS's DetailPane: state for the node, a layout effect for the move).
  const [host] = useState<HTMLDivElement>(() => {
    const el = document.createElement('div')
    el.className = css.host
    el.setAttribute('data-detail-host', '')
    return el
  })
  // Where it is shown now: the aside (dock / overlay) or the sheet's slot.
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const scroll = useRef(0)
  useEffect(() => {
    const keep = () => {
      scroll.current = host.scrollTop
    }
    host.addEventListener('scroll', keep, { passive: true })
    return () => host.removeEventListener('scroll', keep)
  }, [host])
  useLayoutEffect(() => {
    if (target) moveHost(host, target, scroll.current)
  }, [host, target])

  return (
    <>
      {createPortal(children, host)}
      {open && place === 'dock' ? (
        <aside
          ref={setTarget}
          className={cn(css.pane, css.dock, className)}
          data-detail-pane="dock"
          style={{ ['--detail-w' as string]: `${width}px` }}
        />
      ) : null}
      {open && place === 'overlay' ? (
        <aside
          ref={setTarget}
          className={cn(css.pane, css.overlay, className)}
          data-detail-pane="overlay"
          data-glass-surface="raised"
          style={{
            ['--detail-w' as string]: `${width}px`,
            top: `calc(${SHELL_TOP_BAR_PX + 8}px + var(--sr-safe-t, 0px))`,
            right: dockCol + 8,
          }}
        />
      ) : null}
      {place === 'sheet' ? (
        <BottomSheet
          open={open}
          onOpenChange={(next) => {
            if (!next) onClose()
          }}
          title={sheetTitle}
          head={sheetTitle == null ? false : undefined}
          label={label ?? (typeof sheetTitle === 'string' ? sheetTitle : 'Detail')}
          material={material}
          flush
        >
          <div ref={setTarget} className={css.sheetSlot} data-detail-pane="sheet" />
        </BottomSheet>
      ) : null}
    </>
  )
}
