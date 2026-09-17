/**
 * The full surface behind Exposure's summary — and who pays for each cell.
 *
 * The model service shocks spot and reports what the shock itself costs, both
 * for the account and for each underlying it can price. That gives the spot
 * axis and the attribution; it does not give a vol axis, because the service
 * reports `iv_stress_available: false` — so the design's SPY × vol matrix is
 * one real row here, and the rest say what they would need.
 *
 * Nothing on this page interpolates. A shock the grid does not carry has no
 * reading, and a named scenario whose move falls between two columns is not
 * bent onto the nearest one: a number between two measured points is a guess
 * wearing a measurement's clothes.
 */
import type { StressScenario, UnderlyingEntry } from '@/types/modelAnalysis'

export interface StressColumn {
  /** The spot shock as the service reports it: −0.10 is SPY −10%. */
  shock: number
  /** What the shock itself costs, summed over the accounts in scope. */
  pnlChange: number
  /** Underlyings that took part in this column, as the service counted them. */
  contributors: number
  /** The service could only price part of the book at this shock. */
  partial: boolean
}

export interface StressContributor {
  symbol: string
  pnlChange: number
  optionsPnl: number | null
  stockPnl: number | null
  /** The shocked price the service used. */
  newSpot: number | null
  /** Its share of the column's loss, over the names that could be priced. */
  share: number | null
}

/** A vol row the design draws that this side cannot fill. */
export interface StressVolRow {
  label: string
  /** Null on every row but flat, until a vol axis exists. */
  ivShock: number | null
}

/** The design's vol axis, kept so the shape reads — only `flat` carries numbers. */
export const STRESS_VOL_ROWS: readonly StressVolRow[] = [
  { label: 'vol +40%', ivShock: null },
  { label: 'vol +20%', ivShock: null },
  { label: 'vol flat', ivShock: 0 },
  { label: 'vol −20%', ivShock: null },
]

export interface NamedScenario {
  id: string
  name: string
  shock: string
  /** The spot move it implies, as a fraction. */
  spot: number
  /** Why it cannot be read here. */
  blocked: string
}

/**
 * The scenarios the design names. Every one of them moves vol as well as spot,
 * and two of them land between the grid's columns — so none can be read yet.
 * They stay on the page because the reader should see what is missing, not a
 * shorter list that hides it.
 */
export const NAMED_SCENARIOS: readonly NamedScenario[] = [
  { id: 'covid', name: 'Mar 2020 · COVID crash', shock: 'SPY −12% · vol +38 pts · corr → 1', spot: -0.12, blocked: 'vol axis and a −12% column' },
  { id: 'rates', name: 'Jan 2022 · rate grind', shock: 'SPY −6% over 5d · vol +14 pts', spot: -0.06, blocked: 'vol axis and a −6% column' },
  { id: 'volm', name: 'Aug 2024 · volmageddon', shock: 'SPY −4% · vol +22 pts overnight', spot: -0.04, blocked: 'vol axis and a −4% column' },
  { id: 'melt', name: 'Melt-up', shock: 'SPY +6% · vol −10 pts · short calls pinned', spot: 0.06, blocked: 'vol axis and a +6% column' },
]

export const STRESS_UNRECORDED = {
  volAxis:
    'The model service reports `iv_stress_available: false`, so every column is a spot move at today’s vol. A vol axis needs vendor IV on each leg at each shock, which nothing computes.',
  named:
    'A named scenario moves vol as well as spot, and its move rarely lands on a column the grid carries. Reading one would mean interpolating between two measured points, which this page does not do.',
  backing:
    'What backing usage becomes after a shock is Backing & Model’s to compute — it re-prices the pool, which this page does not. Cited when its service provides it, never interpolated between two bars.',
} as const

/** The spot axis, summed across the accounts in scope. Nearest to worst, left to right. */
export function stressColumns(perAccount: readonly (readonly StressScenario[] | undefined)[]): StressColumn[] {
  const by = new Map<number, StressColumn>()
  for (const scenarios of perAccount) {
    for (const s of scenarios ?? []) {
      if (s.iv_shock !== 0) continue
      const change = s.pnl_change
      if (change == null) continue
      const col = by.get(s.spot_shock) ?? { shock: s.spot_shock, pnlChange: 0, contributors: 0, partial: false }
      col.pnlChange += change
      col.contributors += s.contributors ?? 0
      col.partial = col.partial || Boolean(s.partial)
      by.set(s.spot_shock, col)
    }
  }
  return [...by.values()].sort((a, b) => a.shock - b.shock)
}

/**
 * Who pays for one column, worst first.
 *
 * One symbol held in two accounts arrives as two entries; they are one name to
 * a reader, so the cost is summed and the row appears once. The shocked price
 * is the same on both sides — it is the symbol's, not the account's.
 *
 * An underlying the service could not stress is absent rather than zero — its
 * absence is reported by the caller as the count of names without a reading.
 */
export function whoPays(entries: readonly UnderlyingEntry[], shock: number): StressContributor[] {
  const bySymbol = new Map<string, StressContributor>()
  for (const u of entries) {
    if (!u.stress?.available) continue
    const hit = (u.stress.scenarios ?? []).find((s) => s.spot_shock === shock && s.iv_shock === 0)
    if (!hit || hit.pnl_change == null) continue
    const symbol = (u.symbol ?? '').trim().toUpperCase()
    const prev = bySymbol.get(symbol)
    bySymbol.set(symbol, {
      symbol,
      pnlChange: (prev?.pnlChange ?? 0) + hit.pnl_change,
      optionsPnl: hit.options_pnl == null && prev?.optionsPnl == null ? null : (prev?.optionsPnl ?? 0) + (hit.options_pnl ?? 0),
      stockPnl: hit.stock_pnl == null && prev?.stockPnl == null ? null : (prev?.stockPnl ?? 0) + (hit.stock_pnl ?? 0),
      newSpot: prev?.newSpot ?? hit.new_spot ?? null,
      share: null,
    })
  }
  const rows = [...bySymbol.values()]
  // Share is taken over what the shock costs, so the names that pay add to 1.
  const loss = rows.reduce((a, r) => a + Math.min(0, r.pnlChange), 0)
  for (const r of rows) {
    r.share = loss < 0 && r.pnlChange < 0 ? r.pnlChange / loss : null
  }
  return rows.sort((a, b) => a.pnlChange - b.pnlChange)
}

/** The worst column the grid carries, which is the one a reader should start from. */
export function worstColumn(columns: readonly StressColumn[]): StressColumn | null {
  let worst: StressColumn | null = null
  for (const c of columns) {
    if (worst == null || c.pnlChange < worst.pnlChange) worst = c
  }
  return worst
}
