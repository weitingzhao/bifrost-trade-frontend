/**
 * Carrying a symbol from one page to the next.
 *
 * Every page that is about one ticker reads it from `?symbol=`, so a link
 * between two of them has to attach it — normalized, encoded, joined with `?`
 * or `&` depending on what the route already carries, and placed before any
 * `#anchor` rather than after it.
 *
 * That is four ways to get a link subtly wrong, and it was being hand-written
 * at a dozen call sites. The correct implementation already existed, but it
 * lived in `analyzeHubs.ts` — so it was found by the Analyze pages and by
 * nobody else, and the Accounts tables, the alert bell and the Copilot pins
 * each grew their own. Here it is under its own name, where a page that is not
 * an Analyze hub can find it.
 */

/** A route with `symbol=` attached: normalized, encoded, and ahead of any anchor. */
export function withSymbolParam(route: string, symbol?: string | null): string {
  const sym = (symbol ?? '').trim().toUpperCase()
  if (!sym) return route
  const [pathAndQuery, hash] = route.split('#', 2)
  const joiner = pathAndQuery.includes('?') ? '&' : '?'
  return `${pathAndQuery}${joiner}symbol=${encodeURIComponent(sym)}${hash ? `#${hash}` : ''}`
}

/**
 * `?signal=` — the signal the Symbol chart marks: an indicator signal id, or
 * `pine:<script>` for a Pine library script. A shared link opens on it.
 */
export const CHART_SIGNAL_PARAM = 'signal'

/** A route with `signal=` attached, ahead of any anchor; an empty signal leaves it as it was. */
export function withChartSignal(route: string, signal?: string | null): string {
  if (!signal) return route
  const [pathAndQuery, hash] = route.split('#', 2)
  const joiner = pathAndQuery.includes('?') ? '&' : '?'
  return `${pathAndQuery}${joiner}${CHART_SIGNAL_PARAM}=${encodeURIComponent(signal)}${hash ? `#${hash}` : ''}`
}

/** The chart signal value for an indicator crossing — `ind:<id>` (Shell Spec §9). */
export function indicatorChartSignal(id: string): string {
  return `ind:${id}`
}

/** The chart signal value for a Pine library script — `pine:<id>` (Shell Spec §9). */
export function pineChartSignalOf(id: string): string {
  return `pine:${id}`
}

/**
 * A Pine script's home: the Pine library page with that script selected
 * (`/research/pine?script=<id>`, Owner 2026-10-06; it was Backtest's
 * `?tab=pine`, which still works). No id opens the library on its first script.
 */
export function pineLibraryPath(id?: string | null): string {
  return `/research/pine${id ? `?script=${encodeURIComponent(id)}` : ''}`
}
