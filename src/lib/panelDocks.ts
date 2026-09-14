/**
 * When a right-hand panel docks (pushes the page) instead of overlaying it.
 *
 * One formula, one home (Design 09-14 ③, Shell Spec §6): a panel docks iff
 *
 *   viewport ≥ sidebar (240) + content floor (760) + panel width
 *
 * The Copilot (440 → docks at 1440) and the Inspector (560 → docks at 1560)
 * both call this; neither keeps a threshold of its own. The floor is absolute,
 * not proportional — what a dense table needs to stay readable is 760px of
 * columns, whatever the glass around it measures.
 *
 * The sidebar counts at its expanded 240 even while it is collapsed to the
 * icon rail. Expanding the rail is the reader's toggle, available at any
 * moment; a dock that fit only until they pressed it would take the page out
 * from under them.
 */
import { SHELL_SIDEBAR_WIDTH } from '@/layout/shellChrome'

/** What the page must keep beside a docked panel: a table that still has columns. */
export const CONTENT_FLOOR_PX = 760

/** The nav sidebar, always at its expanded width — see the module comment. */
const SIDEBAR_PX = Number.parseInt(SHELL_SIDEBAR_WIDTH, 10)

export function panelDocks(panelWidthPx: number, viewportWidthPx: number): boolean {
  return viewportWidthPx >= SIDEBAR_PX + CONTENT_FLOOR_PX + panelWidthPx
}
