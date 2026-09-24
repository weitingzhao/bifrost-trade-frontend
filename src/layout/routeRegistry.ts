/**
 * How to ask the route table.
 *
 * The table itself is `routeTable.ts` — data, one row per route. This file is
 * the behaviour: the page/redirect splits, the alias map, the dynamic-segment
 * match, and which tree the sidebar shows. Re-exports `RouteEntry` and
 * `ROUTES` so no caller has to know about the split.
 */
import { shellNavMatchByPathPrefix, type ShellNavItem } from '@bifrost/ui'
import { matchPath } from 'react-router-dom'
import { ROUTES, type RouteEntry } from './routeTable'

export { ROUTES }
export type { RouteEntry }

export const PAGE_ROUTES: readonly RouteEntry[] = ROUTES.filter((r) => !r.redirect)

/** The old names, each with the path it now resolves to. `router.tsx` builds its rows from this. */
export const REDIRECT_ROUTES: readonly (RouteEntry & { redirect: string })[] = ROUTES.filter(
  (r): r is RouteEntry & { redirect: string } => typeof r.redirect === 'string'
)

/**
 * The old names a page answers to.
 *
 * `Docs Gaps.dc.html` F5 asks for `aliases` so that typing a retired name in
 * the Omnibar still finds the page. Rather than a second list to keep in step,
 * this inverts the redirect table: a redirect row already says "this old name
 * means that page", which is the same fact read the other way.
 *
 * Keyed by the destination with its query and hash stripped, because that is
 * the page — `/system/coverage?view=option` and `/system/coverage` are one
 * destination with two openings.
 */
const ALIASES: ReadonlyMap<string, readonly RouteEntry[]> = REDIRECT_ROUTES.reduce((map, entry) => {
  const page = entry.redirect.split(/[?#]/)[0]
  map.set(page, [...(map.get(page) ?? []), entry])
  return map
}, new Map<string, RouteEntry[]>())

export function aliasesFor(pathname: string): readonly RouteEntry[] {
  return ALIASES.get(pathname) ?? []
}

/**
 * Shown when a pathname matches nothing — a 404, or a route added without an
 * entry. Not a redirect: it has nowhere to send you. `'*'` is what keeps it out
 * of the Omnibar and the recent-pages trail.
 */
export const FALLBACK_ROUTE: RouteEntry = { path: '*', label: 'Bifrost Trade' }

const STATIC_ROUTES = new Map(ROUTES.filter((r) => !r.path.includes(':')).map((r) => [r.path, r]))
const DYNAMIC_ROUTES = ROUTES.filter((r) => r.path.includes(':'))

/**
 * The entry for a pathname, or the fallback.
 *
 * Static paths are a map lookup; only the handful carrying `:params` are
 * matched, and those are matched with the router's own matcher so the registry
 * cannot drift from how `router.tsx` resolves them.
 */
export function routeFor(pathname: string): RouteEntry {
  const exact = STATIC_ROUTES.get(pathname)
  if (exact) return exact
  for (const entry of DYNAMIC_ROUTES) {
    if (matchPath(entry.path, pathname)) return entry
  }
  return FALLBACK_ROUTE
}

/**
 * Whether a pathname belongs to the System tree rather than the business tree.
 *
 * The sidebar swaps its whole tree here instead of carrying System as a ninth
 * business group. The two are read at different times and for different
 * reasons — one is the desk, the other is the machine under it — and a reader
 * inside System is not scanning for a position. What it must NOT do is what
 * the old `SettingsLayout` did: grow a second navigation shell that also
 * dropped the breadcrumb, the Omnibar, the Lens and Alerts.
 */
/**
 * Pages that live in the System tree but kept a Research path.
 *
 * The design places Signal Health and Lens Coverage under System › Data while
 * leaving their routes where they are — its shell decides which tree to show
 * from the menu group, and this one decides from the path prefix. Without this
 * set, clicking either row from the System tree would swap the sidebar back to
 * the business tree on arrival: you would land on the page you asked for with
 * the menu you just left.
 *
 * Kept as an explicit list rather than a prefix rule, because it is a list of
 * exceptions and should stay short enough to read.
 */
const SYSTEM_TREE_PAGES: ReadonlySet<string> = new Set([
  '/research/signal-health',
  '/research/lens-coverage',
  // The design's two `/research/lab/*` System Data pages (its own SYS_ROUTES,
  // Rev 2026-09-20.4): a vocabulary and a calibration, the machine room's
  // reading matter — Calibration's line landed with its page (2026-09-24).
  '/research/lab/discover-model',
  '/research/lab/calibration',
  // Personas and Orchestration joined them on 2026-09-22 (design Rev
  // 2026-09-22.2, its own `SYS_ROUTES`). Same rule, read on the reader rather
  // than on the path: the roster says whose readings to trust and the diagram
  // says who hands to whom — the operator's question and the engineer's, not
  // the trader's.
  '/research/agent-personas',
  '/research/orchestration',
  // `/settings` is the design's own address for the System collapse's second
  // half (Owner ruling 2026-09-15), and it is not under `/system/`.
  '/settings',
])

/**
 * The menu row a page belongs to when it has no row of its own.
 *
 * Prefix matching gets this right for every page the tree lists, and wrong
 * for a page reached from somewhere else: an objective's path does not begin
 * with the Autopilot Console's, so with the Objectives fold cancelled (Owner
 * 2026-09-21, design Rev 2026-09-20.1) nothing in the tree lit at all — the
 * reader stood inside Research with the whole tree dark.
 *
 * The Console is the objectives' roster, so the Console's row is the one that
 * owns them. Kept as a short explicit list rather than a rule: it is a list
 * of pages the menu deliberately does not carry, and it should stay short
 * enough to read.
 */
const OWNED_BY_ROW: ReadonlyArray<{ prefix: string; row: string }> = [
  { prefix: '/research/loop/objectives/', row: '/research/loop/harness' },
  // Contract Greeks, since design Rev 2026-09-23.3. It is the per-leg detail
  // behind Portfolio Exposure's aggregates and holds no row of its own, so
  // that row lights — the reader arrived from it and should be able to see
  // where they are standing.
  { prefix: '/research/greeks', row: '/risk/portfolio' },
]

/**
 * Which row lights, given the id the sidebar is standing on.
 *
 * `shellNavMatchByPathPrefix` reads an item's `to` first and its `id` only as
 * a fallback. That is right for every row in the tree and wrong for a pinned
 * one, which carries both: `activeId` becomes `pin:<path>` on a pinned page —
 * so the shelf row lights instead of the home row, two lit rows for one page
 * being the thing to avoid — and the matcher then compared `pin:/x` against
 * `/x` and matched nothing at all. Pinning a page made the whole tree go dark
 * on it, which is the opposite of what a shortcut is for.
 *
 * A `pin:` id is an identity, not a path, so it is matched as one.
 */
export function matchActiveRow(item: ShellNavItem, activeId: string): boolean {
  if (activeId.startsWith('pin:')) return item.id === activeId
  return shellNavMatchByPathPrefix(item, activeId)
}

export function navRowFor(pathname: string): string {
  // On a path boundary, not on characters: a bare prefix would let
  // `/research/greeks` claim a future `/research/greeks-history`, and a row
  // lighting for the wrong page is worse than no row lighting at all.
  // A prefix ending in `/` claims descendants only — the stem is its own page
  // and keeps its own row. One without claims itself and anything under it.
  const owner = OWNED_BY_ROW.find((o) =>
    o.prefix.endsWith('/')
      ? pathname.startsWith(o.prefix)
      : pathname === o.prefix || pathname.startsWith(`${o.prefix}/`),
  )
  return owner?.row ?? pathname
}

export function isSystemRoute(pathname: string): boolean {
  if (pathname.startsWith('/system/') || pathname.startsWith('/docs/')) return true
  return SYSTEM_TREE_PAGES.has(pathname.replace(/\/+$/, ''))
}
