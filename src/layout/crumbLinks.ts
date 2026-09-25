/**
 * Where each breadcrumb ancestor goes (§16.12, the design's `crumbsFor`).
 *
 * The leaf is the page itself; every level above it is a link when it can be
 * resolved, by the design's three rules in order:
 *
 * 1. a route whose label is that crumb and whose own trail is the prefix
 *    before it (Research › Analyze › Symbol: "Analyze" resolves only to a
 *    route labelled Analyze under Research);
 * 2. for the top level only, the layer's own path (`/risk`) when the app
 *    routes it, else the top nav group's heading target;
 * 3. otherwise plain text — a crumb that names a fold with no page of its own
 *    is a place, not a destination.
 */
import type { RouteEntry } from './routeTable'

export interface CrumbGroup {
  label: string
  to?: string
}

export interface Crumb {
  label: string
  to: string | null
}

export function crumbLinks(
  crumbs: readonly string[],
  routes: readonly RouteEntry[],
  groups: readonly CrumbGroup[],
): Crumb[] {
  const paths = new Set(routes.map((r) => r.path))
  const toFor = (i: number): string | null => {
    const pre = crumbs.slice(0, i).join('>')
    const hit = routes.find(
      (r) =>
        r.label === crumbs[i] &&
        !r.path.includes(':') &&
        (r.crumbs ?? []).filter((k) => k !== r.label).join('>') === pre,
    )
    if (hit) return hit.path
    if (i === 0) {
      const layer = `/${crumbs[0].toLowerCase()}`
      if (paths.has(layer)) return layer
      return groups.find((g) => g.label === crumbs[0])?.to ?? null
    }
    return null
  }
  return crumbs.map((label, i) => ({ label, to: toFor(i) }))
}
