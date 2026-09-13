/**
 * When the inspector docks instead of covering the page.
 *
 * It always floated: `fixed inset-0`, 72rem wide, over whatever you were
 * reading. Design (`design/trade/Shell Spec Draft.md` §5b) docks it as a right
 * column so the table it explains stays usable — the same move the Copilot
 * dock made, and for the same reason.
 *
 * The threshold is derived, not chosen: the page keeps a readable width or the
 * panel floats. At the default width that reproduces the spec's 1400px
 * (560 + 840) without hard-coding it, and it still holds for the wider panels
 * — instance compare mode at 1360 needs 2200 before docking is honest.
 */

/** The reading width. Wide tiers are the caller's to ask for. */
export const INSPECTOR_WIDTH_DEFAULT_PX = 560

/**
 * What the page must keep.
 *
 * The 240px nav sidebar plus a table that still has columns. Below this the
 * panel is taking the page rather than sitting beside it, so it floats and the
 * page underneath is whole again the moment it closes.
 */
export const INSPECTOR_DOCK_MIN_CONTENT_PX = 840

export function inspectorDocksAt(panelWidthPx: number, viewportWidthPx: number): boolean {
  return viewportWidthPx >= panelWidthPx + INSPECTOR_DOCK_MIN_CONTENT_PX
}
