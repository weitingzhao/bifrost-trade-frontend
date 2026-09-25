/**
 * The names you have loaded, newest first — the Symbol list's `Recent`
 * (design `_Part SymbolDock.dc.html`: "carry history · last loaded").
 *
 * The held symbol (`symbolContext.ts`) remembers one name; this remembers the
 * last dozen and when each was loaded, so `When` can say `4m` or `y’day`.
 * `localStorage`, not the session's store: yesterday's names are the point.
 * A name loaded again moves to the top rather than appearing twice.
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'

const STORAGE_KEY = 'bifrost.symbols.recent'
const KEEP = 12

export interface RecentSymbol {
  symbol: string
  /** Epoch ms. */
  at: number
}

function readRecent(): RecentSymbol[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (r): r is RecentSymbol =>
        r != null && typeof r === 'object' && typeof r.symbol === 'string' && typeof r.at === 'number',
    )
  } catch {
    return []
  }
}

const store = createExternalStore<{ items: RecentSymbol[] }>({ items: readRecent() })

/** Loading a name puts it at the top. A blank is a clear, not a load. */
export function recordRecentSymbol(symbol: string, atMs: number = Date.now()): void {
  const sym = symbol.trim().toUpperCase()
  if (!sym) return
  const items = [{ symbol: sym, at: atMs }, ...store.getState().items.filter((r) => r.symbol !== sym)].slice(0, KEEP)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Blocked storage: the list still holds for this visit.
  }
  store.setState({ items })
}

export function useRecentSymbols(): RecentSymbol[] {
  return store.useStore().items
}
