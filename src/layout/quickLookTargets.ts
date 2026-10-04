/**
 * What Quick Look (Space) opens on — one place, because a page with a Space
 * of its own has to know where to give way. The Decision Inbox folds a card
 * on Space (design Rev .144) and steps aside wherever these match, so Space
 * on a candidate row still opens that name.
 */

/** A table row or list item first; a marked name stands in only where there is no row. */
export const QUICK_LOOK_ROW = 'tr, [role="row"], li'
export const QUICK_LOOK_NAME = '[data-ctx-sym], [data-dock-sym]'

/** True when Space on this element belongs to Quick Look. */
export function quickLookTarget(el: Element | null | undefined): boolean {
  return el != null && (el.closest(QUICK_LOOK_ROW) != null || el.closest(QUICK_LOOK_NAME) != null)
}
