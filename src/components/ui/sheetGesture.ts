/** The grip's thresholds (DESIGN_CONTRACTS §18.5), apart from the component so a test can read them. */
export const SHEET_DRAG_UP_PX = 48
export const SHEET_DRAG_DOWN_PX = 72

/** What a release does, by how far the finger travelled (negative = up). */
export function sheetRelease(
  dy: number,
  full: boolean
): 'toggle' | 'full' | 'half' | 'close' | 'stay' {
  if (Math.abs(dy) < 4) return 'toggle'
  if (dy < -SHEET_DRAG_UP_PX) return 'full'
  if (dy > SHEET_DRAG_DOWN_PX) return full ? 'half' : 'close'
  return 'stay'
}
