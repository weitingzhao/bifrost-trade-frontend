/**
 * Trading › Rules — what the page is looking at, and the way back (design Rev .101).
 *
 * A focus is a pick on the chain, a symbol, or both. The symbol is not a fifth
 * link in the chain: it cuts across it — every rule that can act on a ticker,
 * and every instance that ran on it (DECISIONS 2026-09-28). Both live in the
 * URL (`?pick=&symbol=` — the symbol is the top bar's, Rev .120; the old
 * `?sym=` is still read) and every change of focus is pushed, so the browser's
 * Back and the page's own ← Back walk the same path.
 *
 * Everything here is pure: the page derives, it does not store.
 */
import type { ChainData } from '@/hooks/useRulesChain'
import type { TradeReading } from '@/utils/tradeReadings'
import { formatPick, lineageOf, parsePick, type ChainSelection } from './rulesChain'

export interface Focus {
  pick: ChainSelection | null
  sym: string | null
}

export type Lit = ReturnType<typeof lineageOf>

export const NO_FOCUS: Focus = { pick: null, sym: null }

export function normSym(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim().toUpperCase()
  return s === '' || s === '—' ? null : s
}

export function parseFocus(params: URLSearchParams): Focus {
  return { pick: parsePick(params.get('pick')), sym: normSym(params.get('symbol') ?? params.get('sym')) }
}

/** The search string a focus lives at — `pick` then `sym`, nothing else kept. */
export function focusSearch(f: Focus): string {
  const p = new URLSearchParams()
  if (f.pick) p.set('pick', formatPick(f.pick))
  if (f.sym) p.set('symbol', f.sym)
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function focusKey(f: Focus): string {
  return `${f.pick ? formatPick(f.pick) : ''}|${f.sym ?? ''}`
}

export function hasFocus(f: Focus): boolean {
  return f.pick != null || f.sym != null
}

/**
 * The path, as keys of the focuses left behind.
 *
 * Arriving somewhere already on the path truncates to it — the path never
 * loops, and Back from there goes where it went before. Arriving anywhere new
 * appends the focus just left.
 */
export function stepTrail(trail: readonly string[], leaving: string, arriving: string): string[] {
  if (leaving === arriving) return [...trail]
  const at = trail.indexOf(arriving)
  if (at >= 0) return trail.slice(0, at)
  return [...trail, leaving]
}

/** A key back to its focus (the inverse of `focusKey`). */
export function focusOfKey(key: string): Focus {
  const [pick, sym] = key.split('|')
  return { pick: parsePick(pick || null), sym: normSym(sym) }
}

/** The ticker an instance ran on — the first of its fills' underlyings. */
export function tradeSym(r: TradeReading): string | null {
  return normSym(r.symbolish.split(' ')[0])
}

function emptyLit(): Lit {
  return { structure: new Set(), opportunity: new Set(), allocation: new Set(), trade: new Set() }
}

/** Opportunities that can act on a ticker: in its scope, or ran on it anyway. */
export function oppsForSym(sym: string, d: ChainData): number[] {
  const out = new Set<number>()
  for (const o of d.opportunities) {
    if ((o.symbols ?? []).some((s) => normSym(s) === sym)) out.add(o.strategy_opportunity_id)
  }
  for (const i of d.trades) if (tradeSym(i) === sym) out.add(i.opportunityId)
  return [...out]
}

/** A ticker's lineage: every rule that can act on it, and what ran on it. */
export function symLineage(sym: string, d: ChainData): Lit {
  const lit = emptyLit()
  for (const oid of oppsForSym(sym, d)) {
    lit.opportunity.add(oid)
    const o = d.opportunities.find((x) => x.strategy_opportunity_id === oid)
    if (o?.strategy_structure_id != null) lit.structure.add(o.strategy_structure_id)
    for (const a of d.allocations) {
      if ((a.strategy_opportunity_ids ?? []).includes(oid)) lit.allocation.add(a.strategy_allocation_id)
    }
  }
  for (const i of d.trades) if (tradeSym(i) === sym) lit.trade.add(i.id)
  return lit
}

function meet(a: Lit, b: Lit): Lit {
  const keep = <T>(x: Set<T>, y: Set<T>) => new Set([...x].filter((v) => y.has(v)))
  return {
    structure: keep(a.structure, b.structure),
    opportunity: keep(a.opportunity, b.opportunity),
    allocation: keep(a.allocation, b.allocation),
    trade: keep(a.trade, b.trade),
  }
}

/** What the focus lights: the pick's lineage, met with the symbol's when both are set. */
export function focusLineage(f: Focus, d: ChainData): Lit | null {
  if (!hasFocus(f)) return null
  const byPick = f.pick && f.pick.id != null ? lineageOf(f.pick, d) : null
  const bySym = f.sym ? symLineage(f.sym, d) : null
  if (byPick && bySym) return meet(byPick, bySym)
  return byPick ?? bySym
}

/** Whether a symbol can be kept when picking something (their lineages share an opportunity). */
export function touches(pick: ChainSelection, sym: string, d: ChainData): boolean {
  if (pick.kind === 'instance' || pick.id == null) return false
  const a = lineageOf(pick, d).opportunity
  return [...symLineage(sym, d).opportunity].some((o) => a.has(o))
}

export interface Tally {
  n: number
  open: number
  closed: number
  /** Sum over closed instances only — an open one has no realised figure. */
  realised: number
  won: number
}

export function tally(list: readonly TradeReading[]): Tally {
  const closed = list.filter((i) => i.closed)
  return {
    n: list.length,
    open: list.length - closed.length,
    closed: closed.length,
    realised: closed.reduce((a, i) => a + (i.realised ?? 0), 0),
    won: closed.filter((i) => (i.realised ?? 0) > 0).length,
  }
}

export type BoardSort = 'pnl' | 'count' | 'az'

export interface BoardTile {
  sym: string
  /** Ran on it, but the opportunity's scope does not name it. */
  offScope: boolean
  tally: Tally
}

/**
 * An opportunity's scope as a board: one tile per symbol it names, plus any
 * symbol it ran on without naming. A named symbol with no instance is shown
 * as never ran — the scope is a promise, and an unkept one is a reading.
 */
export function symbolBoard(
  scope: readonly string[],
  readings: readonly TradeReading[],
  sort: BoardSort,
): BoardTile[] {
  const named = [...new Set(scope.map(normSym).filter((s): s is string => s != null))]
  const ran = [...new Set(readings.map(tradeSym).filter((s): s is string => s != null))]
  const all = [...named, ...ran.filter((s) => !named.includes(s))]
  const tiles = all.map((sym) => ({
    sym,
    offScope: !named.includes(sym),
    tally: tally(readings.filter((r) => tradeSym(r) === sym)),
  }))
  const cmp: Record<BoardSort, (a: BoardTile, b: BoardTile) => number> = {
    pnl: (a, b) =>
      (b.tally.n ? 1 : 0) - (a.tally.n ? 1 : 0) ||
      b.tally.realised - a.tally.realised ||
      a.sym.localeCompare(b.sym),
    count: (a, b) => b.tally.n - a.tally.n || b.tally.realised - a.tally.realised || a.sym.localeCompare(b.sym),
    az: (a, b) => a.sym.localeCompare(b.sym),
  }
  return tiles.sort(cmp[sort])
}

/** Every ticker the page can focus: named in a scope or ran on. */
export function allSymbols(d: ChainData): string[] {
  const out = new Set<string>()
  for (const o of d.opportunities) for (const s of o.symbols ?? []) {
    const n = normSym(s)
    if (n) out.add(n)
  }
  for (const i of d.trades) {
    const n = tradeSym(i)
    if (n) out.add(n)
  }
  return [...out].sort()
}
