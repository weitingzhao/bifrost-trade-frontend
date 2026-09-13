/**
 * What the Omnibar's page search matches on.
 *
 * Pure, and in its own file: the matcher is the part worth testing, and a
 * component file that also exports a function loses fast refresh.
 */
import { aliasesFor, type RouteEntry } from './routeRegistry'

export function trail(entry: RouteEntry): string {
  return [...(entry.crumbs ?? []), entry.label].join(' / ')
}

/**
 * Hyphens read as spaces.
 *
 * The names in here are paths as often as prose, and nobody types
 * `vol-regime`. Without this, searching for a page by the name it is actually
 * called misses whenever that name lives in the path.
 */
function loose(value: string): string {
  return value.toLowerCase().replace(/[-_/]+/g, ' ')
}

function hit(entry: RouteEntry, needle: string): boolean {
  return loose(trail(entry)).includes(needle) || loose(entry.path).includes(needle)
}

/**
 * A page matches its own name, and every name it used to have.
 *
 * The retired paths still resolve, but until now nothing found them: the
 * Omnibar searched `PAGE_ROUTES`, which excludes redirects by definition. So
 * `settings`, `dossier` and `vol-regime` — names in muscle memory and in old
 * links — returned nothing at all, while typing them into the address bar
 * worked. `Docs Gaps.dc.html` F5 asks for exactly this.
 */
export function matches(entry: RouteEntry, term: string): boolean {
  if (!term) return true
  const needle = loose(term)
  return hit(entry, needle) || aliasesFor(entry.path).some((a) => hit(a, needle))
}
