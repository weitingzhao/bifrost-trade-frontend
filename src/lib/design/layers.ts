/**
 * The five layers, and the two that belong to none.
 *
 * `design/trade` gives each top-level group its own neutral ramp: standing in
 * Research does not look like standing in Portfolio, and the difference is the
 * whole chrome — ground, surfaces, borders, text ramp and accent — not a badge.
 * The group is the key, so this is a prefix match on the path, the same shape
 * as the design's own `layerOf()` in `shell-registry.js`.
 *
 * Only the ramp moves. Direction (up/dn), severity (the lamps) and identity
 * (ticker lime, contract sky) are global semantics and are deliberately absent
 * from the layer table — a reading must not change meaning because of where
 * you are standing.
 */
export type LayerId = 'base' | 'home' | 'execution' | 'result' | 'analysis' | 'risk' | 'review'

/**
 * The three pages Home took from Market (§5a.1, Rev 2026-09-20.23).
 *
 * The routes did not move, so a prefix cannot find them: Home is organised by
 * time, and these three are the market's own clock — what is trading now,
 * what I armed and what has fired, what arrives inside thirty days. That
 * overturns §0's reading, which judged them by content (the market's facts →
 * analysis) and missed the axis.
 */
const HOME_ROUTES: ReadonlySet<string> = new Set([
  '/market/live',
  '/research/events',
  '/research/event-radar',
])

export function layerForPath(pathname: string): LayerId {
  const p = pathname || ''
  if (HOME_ROUTES.has(p)) return 'home'
  if (p === '/home' || p.startsWith('/home/')) return 'home'
  if (p === '/review' || p.startsWith('/review/')) return 'review'
  // A layer's own page wears its layer: `/risk` and `/portfolio` are pages,
  // not just prefixes, and matching only `/risk/` left the layer page in the
  // base ramp — the one place the layer should be most itself (§5a.1).
  if (p === '/risk' || p.startsWith('/risk/')) return 'risk'
  if (p.startsWith('/trade/')) return 'execution'
  if (p === '/portfolio' || p.startsWith('/portfolio/')) return 'result'
  if (p.startsWith('/research/')) return 'analysis'
  if (p.startsWith('/market/')) return 'analysis'
  // Strategy has no layer of its own because the design has no Strategy group
  // — it dissolves into Trade › Rules, and inherits `execution` when it moves.
  return 'base'
}
