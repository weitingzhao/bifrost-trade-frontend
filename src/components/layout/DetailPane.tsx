/**
 * One detail, three places (design Rev .164 → .176, DESIGN_CONTRACTS §18.12):
 * the page's "pick a row, read it" panel — `@bifrost/ui`'s `DetailPane` since
 * D2, in a frame for this app's page lane.
 *
 * The package decides the place: a column beside the table when the layout
 * docks for its width (wide, and the content area ≥ the column + 760, 0.15.1),
 * an opaque overlay on the right otherwise, a `BottomSheet` on compact. The
 * children render once and move between the three — the selection, the open
 * sections and the scroll stay.
 *
 * The frame is the app's part. The design's pages scroll a list inside a
 * fixed-height page, and the package's pane is that list's sibling; here the
 * whole lane (`#main-content`) scrolls. So the pane sits in a sticky frame
 * under the top of the lane: docked, it stays in view while the table scrolls,
 * up to the lane's height less its bottom padding (`--lane-pb`, the floating
 * toolbar's 72); as an overlay it hangs from the same frame instead of
 * scrolling away with the page. On compact, or closed, the frame is empty and
 * costs the row nothing.
 */
import type { ReactNode } from 'react'
import { DetailPane as PackageDetailPane, useLayout } from '@bifrost/ui'
import { cn } from '@/lib/utils'
import css from './detailPane.module.css'

export type DetailPlace = 'dock' | 'overlay' | 'sheet'

export interface DetailPaneProps {
  open: boolean
  onClose: () => void
  /** The column's width when docked or overlaid (default 440); it also sets where it docks (+ 760). */
  width?: number
  /** `edit` — the compact sheet is opaque and opens full (the overlay is always opaque). */
  material?: 'view' | 'edit'
  /** The compact sheet's title; without it the children carry their own head. */
  sheetTitle?: ReactNode
  /** The sheet's accessible name when the title is not plain text. */
  label?: string
  className?: string
  /**
   * The pane sits in a column of panels (Fills' rail) rather than beside a
   * table: the frame takes the column's width, so a floating pane lines up
   * with the column's right edge instead of hanging off its left.
   */
  stretch?: boolean
  children: ReactNode
}

/** Where a 440 detail goes in this layout (for the pages that lay out around it). */
export function detailPlace(w: string, dock: boolean): DetailPlace {
  return w === 'compact' ? 'sheet' : dock ? 'dock' : 'overlay'
}

export function useDetailPlace(): DetailPlace {
  const { w, dock } = useLayout()
  return detailPlace(w, dock)
}

export function DetailPane({ open, onClose, width = 440, material = 'view', sheetTitle, label, className, stretch = false, children }: DetailPaneProps) {
  return (
    <div className={cn(css.frame, stretch && css.stretch)} data-detail-frame="">
      <PackageDetailPane
        open={open}
        onClose={onClose}
        width={width}
        material={material}
        title={sheetTitle}
        label={label}
        className={cn(className)}
      >
        {children}
      </PackageDetailPane>
    </div>
  )
}
