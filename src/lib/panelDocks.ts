/**
 * When a right-hand panel docks (pushes the page) instead of overlaying it.
 *
 * One formula, one home (Design 09-14 ③, Shell Spec §6): a panel docks iff
 *
 *   viewport ≥ sidebar (240) + content floor + panel width
 *
 * The floor is absolute, not proportional — what a dense table needs to stay
 * readable is a number of columns, whatever the glass around it measures.
 *
 * Two floors since design Rev 2026-09-23.25. The Inspector keeps 760 (560 →
 * docks at 1560): it explains a row, and the table it explains needs its
 * columns. The shell's one side panel takes 560 (its 456 column → pushes from
 * 1256): the framework pass found a 13" laptop losing 440px of table under an
 * overlaid card, and a pushed page at 560 still has its columns.
 *
 * The sidebar counts at its expanded 240 even while it is collapsed to the
 * icon rail. Expanding the rail is the reader's toggle, available at any
 * moment; a dock that fit only until they pressed it would take the page out
 * from under them.
 */
import { SHELL_SIDEBAR_WIDTH } from '@/layout/shellChrome'

/** What the page must keep beside a docked inspector: a table that still has columns. */
export const CONTENT_FLOOR_PX = 760

/** What the page keeps beside the side panel (Rev .25): 240 + 560 + 456 = 1256. */
export const SIDE_PANEL_FLOOR_PX = 560

/** The nav sidebar, always at its expanded width — see the module comment. */
const SIDEBAR_PX = Number.parseInt(SHELL_SIDEBAR_WIDTH, 10)

export function panelDocks(panelWidthPx: number, viewportWidthPx: number, floorPx = CONTENT_FLOOR_PX): boolean {
  return viewportWidthPx >= SIDEBAR_PX + floorPx + panelWidthPx
}
