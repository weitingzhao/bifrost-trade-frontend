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

export function layerForPath(pathname: string): LayerId {
  const p = pathname || ''
  if (p === '/home' || p.startsWith('/home/')) return 'home'
  if (p === '/review' || p.startsWith('/review/')) return 'review'
  if (p.startsWith('/risk/')) return 'risk'
  if (p.startsWith('/trade/')) return 'execution'
  if (p.startsWith('/portfolio/')) return 'result'
  if (p.startsWith('/research/')) return 'analysis'
  // Market is a fold inside Research, not a layer of its own: it states the
  // market's facts, which is what the analysis layer is about.
  if (p.startsWith('/market/')) return 'analysis'
  // Strategy has no layer of its own because the design has no Strategy group
  // — it dissolves into Trade › Rules, and inherits `execution` when it moves.
  return 'base'
}
