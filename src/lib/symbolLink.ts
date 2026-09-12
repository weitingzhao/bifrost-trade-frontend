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
