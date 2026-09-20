/**
 * How to ask the route table.
 *
 * The table itself is `routeTable.ts` — data, one row per route. This file is
 * the behaviour: the page/redirect splits, the alias map, the dynamic-segment
 * match, and which tree the sidebar shows. Re-exports `RouteEntry` and
 * `ROUTES` so no caller has to know about the split.
 */
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
])

export function isSystemRoute(pathname: string): boolean {
  if (pathname.startsWith('/system/') || pathname.startsWith('/docs/')) return true
  return SYSTEM_TREE_PAGES.has(pathname.replace(/\/+$/, ''))
}
