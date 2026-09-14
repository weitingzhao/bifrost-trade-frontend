/**
 * When the inspector docks instead of covering the page.
 *
 * It always floated: `fixed inset-0`, 72rem wide, over whatever you were
 * reading. Design (`design/trade/Shell Spec Draft.md` §5b) docks it as a right
 * column so the table it explains stays usable — the same move the Copilot
 * dock made, and for the same reason.
 *
 * The threshold is the one shared docking formula (`src/lib/panelDocks.ts`,
 * Design 09-14 ③): sidebar 240 + content floor 760 + panel width. At the
 * reading width that is 1560. The `panelW + 840` this file used to keep — the
 * one that reproduced the spec's old 1400px — is retired with that spec line.
 *
 * Panels wider than the reading width never dock. Wide (1040), instance
 * compare (1360) and the run inspector's M/L are the panel as the work; docked
 * beside a page they would leave it a sliver that only pretends to be usable,
 * so they float and the page is whole again the moment they close.
 */
import { panelDocks } from '@/lib/panelDocks'
import { COPILOT_DOCK_WIDTH, copilotDockPushes } from '@/hooks/useCopilotDock'

/** The reading width — the default, and what `useInspectorWide` toggles away from. */
export const INSPECTOR_WIDTH_READ_PX = 560

/** The panel as the work: a compare, a judge's paragraph (design §5b). */
export const INSPECTOR_WIDTH_WIDE_PX = 1040

export function inspectorDocksAt(panelWidthPx: number, viewportWidthPx: number): boolean {
  if (panelWidthPx > INSPECTOR_WIDTH_READ_PX) return false
  return panelDocks(panelWidthPx, viewportWidthPx)
}

/**
 * How far the floating inspector must sit in from the viewport's right edge.
 *
 * The overlay used to be `fixed inset-0` with the 560 panel flush right, so
 * at 1560 it covered the docked Copilot (x=1120–1560) entirely — the screenshot
 * that was supposed to prove both-open showed no Copilot. Design 09-14 ③:
 * the conversation keeps its seat; the inspector glances and closes, so the
 * overlay yields the Copilot column when that column is pushing. Overlay or
 * wide Copilot keep the flush-right overlay (the Copilot is already covering
 * the page itself).
 */
export function inspectorOverlayInsetRightPx(
  copilot: { open: boolean; wide: boolean },
  viewportWidthPx: number,
): number {
  return copilotDockPushes(copilot, viewportWidthPx) ? COPILOT_DOCK_WIDTH : 0
}
