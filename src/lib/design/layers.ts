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
 * The pages Home holds without a `/home` path — the design registry's own
 * `HOME_ROUTES`, kept in step with it.
 *
 * Their routes did not move, so a prefix cannot find them: Home is organised
 * by time of day. Events is the market's own calendar; the Daily Brief is the
 * 9am read (it joined at Rev 2026-09-22.2 and this table had missed it). Live
 * and Alerts left for the rail's Market group at Rev 2026-09-23.7 — like the
 * Book's pages, an equipment page belongs to no layer and takes the analysis
 * fallback, which is the design's own `layerOf` line for `/market/`.
 */
const HOME_ROUTES: ReadonlySet<string> = new Set([
  '/research/events',
  '/research/daily-brief',
])

/**
 * Which layer a sidebar group belongs to — the design's own `LAYER_OF_GROUP`.
 *
 * Needed because the numeral is drawn per *group* and the layer is read from
 * the *route*, and the two do not always agree: Contract Greeks keeps a
 * `/research/` path and reads under Risk, so the route's layer is `risk`
 * while no Risk row holds that page.
 */
export const LAYER_OF_GROUP: Readonly<Record<string, LayerId>> = {
  Home: 'home',
  Research: 'analysis',
  Risk: 'risk',
  Trade: 'execution',
  Portfolio: 'result',
  Review: 'review',
}

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
  // Contract Greeks kept its `/research/` path and reads under Risk since
  // design Rev 2026-09-23.3 — its subject is the whole book's option legs,
  // not the market. The crumbs and the lit nav row moved with it; the layer
  // did not, and nothing showed it until the layer became a mark rather than
  // a whole skin, at which point the top bar's edge and the sidebar numeral
  // both pointed at the wrong layer. The design's own `layerOf` carries the
  // same line.
  if (p === '/research/greeks') return 'risk'
  if (p.startsWith('/research/')) return 'analysis'
  if (p.startsWith('/market/')) return 'analysis'
  // Strategy has no layer of its own because the design has no Strategy group
  // — it dissolves into Trade › Rules, and inherits `execution` when it moves.
  return 'base'
}
