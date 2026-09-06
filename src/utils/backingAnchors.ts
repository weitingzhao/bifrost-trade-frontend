/**
 * The Backing & Model page's anchor vocabulary, shared by the page that reads
 * hashes and the pages that write them. One place, so a gauge on Positions and
 * the hash effect on Backing cannot drift apart: the hash a link carries is
 * looked up here, and the DOM id it scrolls to is looked up here.
 *
 *   /portfolio/backing?acct=host&sort=cash#obligations
 *                     └── scope ──┘ └sort┘ └─ anchor ─┘
 */

export const BACKING_PATH = '/portfolio/backing'

/** The hash a link carries → the DOM id the page scrolls to. */
export type BackingAnchor = 'obligations' | 'holdings' | 'room' | 'model'

export const BACKING_ANCHOR_ID: Record<BackingAnchor, string> = {
  obligations: 'backing-obligations',
  holdings: 'backing-holdings',
  room: 'backing-room',
  model: 'backing-model',
}

/**
 * The cockpit targets that land on the Backing page, and where each lands.
 * `capital` is the model band: what the market can do to the book is the
 * hypothetical half of the same decision the collateral tables ground.
 */
export type BackingTarget = 'coverage' | 'independent' | 'room' | 'capital'

export const BACKING_TARGET_ANCHOR: Record<BackingTarget, BackingAnchor> = {
  coverage: 'obligations',
  independent: 'holdings',
  room: 'room',
  capital: 'model',
}

const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k)

export function isBackingTarget(t: string): t is BackingTarget {
  return own(BACKING_TARGET_ANCHOR, t)
}

/** `#obligations` → `backing-obligations`; an unknown or empty hash → null. */
export function backingAnchorId(hash: string): string | null {
  const key = hash.replace(/^#/, '')
  return own(BACKING_ANCHOR_ID, key) ? BACKING_ANCHOR_ID[key as BackingAnchor] : null
}

export interface BackingHrefParts {
  /** The page scope as `usePositionsScope` serialises it (`acct=…&symbol=…`). */
  scopeSearch?: string
  /** The obligations column a gauge wants sorted; read once when the page mounts. */
  sort?: string
  /** A per-underlying deep link: narrows the book and opens that symbol's model row. */
  symbol?: string
  anchor?: BackingAnchor
}

/** The one builder every inbound link uses. Omits `?` when there is nothing to carry. */
export function backingHref({ scopeSearch, sort, symbol, anchor }: BackingHrefParts = {}): string {
  const params = new URLSearchParams(scopeSearch)
  if (sort) params.set('sort', sort)
  if (symbol) params.set('symbol', symbol.trim().toUpperCase())
  const qs = params.toString()
  return `${BACKING_PATH}${qs ? `?${qs}` : ''}${anchor ? `#${anchor}` : ''}`
}
