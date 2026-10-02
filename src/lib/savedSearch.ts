/**
 * Saved searches (design Rev .139), the parts every page shares: the stored
 * state is a page's filter params as a query string; a saved search is "the
 * one you are on" when the page's filter params are exactly its params.
 * Params that pick an object or a mode, not a scope, never count.
 */
import type { SavedSearch } from '@/lib/schemas/savedSearch'

/** Not part of a scope: which row is open, a sheet, a preview state. */
const NOT_SCOPE = new Set(['plan', 'new', 'preview', 'tab', 'face'])

/** The scope params of a search string, sorted, as one comparable string. */
export function scopeSearch(search: string): string {
  const params = new URLSearchParams(search)
  const kept = [...params.entries()].filter(([k, v]) => !NOT_SCOPE.has(k) && v !== '')
  kept.sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)))
  return new URLSearchParams(kept).toString()
}

/** Where a saved search opens: its page with its scope. */
export function savedSearchTo(s: Pick<SavedSearch, 'route' | 'state_json'>): string {
  const q = scopeSearch(s.state_json.search ?? '')
  return q ? `${s.route}?${q}` : s.route
}

/** The saved search the page is on, if its scope is exactly one. */
export function matchSavedSearch(
  list: readonly SavedSearch[],
  pathname: string,
  search: string,
): SavedSearch | null {
  const here = scopeSearch(search)
  if (!here) return null
  return list.find((s) => s.route === pathname && scopeSearch(s.state_json.search ?? '') === here) ?? null
}
