/**
 * The reorder verbs of Live's right-click / long-press menu (design Rev .175,
 * DESIGN_CONTRACTS §18.3: drag and drop is never the only way to an action —
 * a finger has no grip to drag, so the same moves sit in the menu).
 *
 * Every verb is written in the grammar the page's drop handlers already speak:
 * `reorder(from, to)` takes `from` out and puts it back just before `to`
 * (`applySymbolReorderInCategory` · `applyOptRowReorder` · `handleCategoryDrop`).
 * So "move down" reads "the next one goes in front of me", and a menu item
 * calls exactly what a drop would — same order, same write, no new path.
 */

export type MoveVerb = 'up' | 'down' | 'top' | 'left' | 'right'

export interface MoveItem {
  verb: MoveVerb
  label: string
  /** The two arguments of the drop handler: `from` lands just before `to`. */
  from: string
  to: string
}

/** What a menu opens on: whose order, the verbs that apply, and the drop handler they call. */
export interface MoveSpec {
  label: string
  items: MoveItem[]
  onMove: (from: string, to: string) => void
}

/** An open menu: the spec, where the pointer was, and what to give focus back to. */
export interface MoveMenuAt extends MoveSpec {
  x: number
  y: number
  back: HTMLElement | null
}

/**
 * A row's verbs, as displayed: Move up · Move down · Move to top. The first row
 * has no Move up and no Move to top; the last has no Move down; a key that is
 * not in the order, or an order of one, has none.
 */
export function rowMoves(order: readonly string[], key: string): MoveItem[] {
  const i = order.indexOf(key)
  if (i < 0) return []
  const out: MoveItem[] = []
  if (i > 0) out.push({ verb: 'up', label: 'Move up', from: key, to: order[i - 1] })
  if (i < order.length - 1) out.push({ verb: 'down', label: 'Move down', from: order[i + 1], to: key })
  if (i > 0) out.push({ verb: 'top', label: 'Move to top', from: key, to: order[0] })
  return out
}

/** A category chip's verbs: Move left · Move right, with the same edges. */
export function pillMoves(order: readonly string[], key: string): MoveItem[] {
  const i = order.indexOf(key)
  if (i < 0) return []
  const out: MoveItem[] = []
  if (i > 0) out.push({ verb: 'left', label: 'Move left', from: key, to: order[i - 1] })
  if (i < order.length - 1) out.push({ verb: 'right', label: 'Move right', from: order[i + 1], to: key })
  return out
}
