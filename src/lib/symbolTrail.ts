/**
 * Where a symbol came from, and what else was on that list.
 *
 * Design (`design/trade/Research Symbol.dc.html`): the Symbol page opens with
 * `From Ratings · 3/40`, a `← prev / next →` pair and `j`/`k` to walk the list.
 * You arrived from a ranked table; without this you have to go back to it to
 * read the next name, and going back costs the page you were reading.
 *
 * A ranked list publishes what it is showing. The Symbol page shows the rail
 * only when the symbol it is displaying is actually on that list, so a trail
 * left by an earlier visit cannot claim a name it never ranked — no navigation
 * interception, and it corrects itself.
 *
 * `sessionStorage` because a reload on the Symbol page should not lose the list
 * you were working through; a new tab legitimately starts with none.
 */
import { createExternalStore } from '@/lib/cockpit/externalStore'

const STORAGE_KEY = 'bifrost.symbol.trail'

export interface SymbolTrailItem {
  symbol: string
  /** Why the list put it here — the rank line, in the list's own words. */
  why?: string
}

export interface SymbolTrail {
  /** What the list is called, for "From …". */
  label: string
  /** Back to it. */
  href: string
  items: SymbolTrailItem[]
}

function read(): SymbolTrail | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed != null &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as SymbolTrail).items) &&
      typeof (parsed as SymbolTrail).label === 'string'
    ) {
      return parsed as SymbolTrail
    }
  } catch {
    /* private window, blocked storage, corrupt value */
  }
  return null
}

const store = createExternalStore<{ trail: SymbolTrail | null }>({ trail: read() })

/** A ranked list says what it is showing, in the order it is showing it. */
export function publishSymbolTrail(trail: SymbolTrail): void {
  const clean = { ...trail, items: trail.items.filter((i) => i.symbol.trim() !== '') }
  if (clean.items.length === 0) return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
  } catch {
    /* ignore */
  }
  store.setState({ trail: clean })
}

export interface SymbolTrailPosition {
  label: string
  href: string
  /** 1-based, for reading. */
  index: number
  total: number
  prev: string | null
  next: string | null
  why?: string
}

/**
 * Where this symbol sits on the list it came from, or null when it is not on
 * one. Null is the common case — most symbols are reached by typing one.
 */
export function trailPositionFor(
  trail: SymbolTrail | null,
  symbol: string,
): SymbolTrailPosition | null {
  const sym = symbol.trim().toUpperCase()
  if (!trail || sym === '') return null
  const at = trail.items.findIndex((i) => i.symbol.toUpperCase() === sym)
  if (at < 0) return null
  return {
    label: trail.label,
    href: trail.href,
    index: at + 1,
    total: trail.items.length,
    prev: at > 0 ? trail.items[at - 1].symbol : null,
    next: at < trail.items.length - 1 ? trail.items[at + 1].symbol : null,
    why: trail.items[at].why,
  }
}

export function useSymbolTrail(symbol: string): SymbolTrailPosition | null {
  const { trail } = store.useStore()
  return trailPositionFor(trail, symbol)
}
