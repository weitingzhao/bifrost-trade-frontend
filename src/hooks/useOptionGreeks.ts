/**
 * Position Greeks, from the warehouse, keyed back to the legs that are held.
 *
 * Fetches one chain per (underlying, expiry) the book actually holds — a handful
 * of requests, not one per contract — then joins by the vendor's own ticker.
 *
 * Everything it returns is stamped with the capture time and how many legs it
 * could not match. A theta total assembled from four of nine legs is not a
 * portfolio theta, and the difference has to survive all the way to the screen.
 */
import { useQueries } from '@tanstack/react-query'
import { fetchOptionSnapshots, type VendorGreeksRow } from '@/api/marketData/optionGreeks'
import { buildOptionTicker, positionGreek } from '@/utils/optionTicker'

export interface GreekLeg {
  underlying: string
  expiry: string
  strike: number
  right: string
  /** Signed contracts. */
  qty: number
}

export interface PositionGreeks {
  delta: number | null
  gamma: number | null
  theta: number | null
  vega: number | null
  /** Vendor implied vol for the contract, per share — not scaled by position. */
  iv: number | null
  /** When the vendor captured it. */
  asOf: string | null
}

export interface GreeksRollup {
  /** Per leg, keyed by the vendor ticker. */
  byTicker: Map<string, PositionGreeks>
  delta: number
  gamma: number
  theta: number
  vega: number
  /** Legs the vendor priced. */
  matched: number
  /** Legs with no vendor row, or a row with no Greeks — excluded from the sums. */
  unmatched: number
  /** Oldest capture time contributing to the totals. */
  oldestAsOf: string | null
  /** Newest capture time contributing to the totals. */
  newestAsOf: string | null
  /**
   * Legs captured on an earlier day than the newest.
   *
   * The totals are only as current as their weakest input, but reporting a book
   * as a month old because one far-dated leg was last refreshed then would be
   * its own distortion — so both dates are kept and the count says how much of
   * the book is behind.
   */
  staleLegs: number
  isLoading: boolean
  isError: boolean
  /** True when any leg is missing, so a total must not read as complete. */
  partial: boolean
}

function chainKey(underlying: string, expiry: string): string {
  return `${underlying}|${expiry.replace(/\D/g, '').slice(0, 8)}`
}

export function useOptionGreeks(legs: readonly GreekLeg[]): GreeksRollup {
  const chains = new Map<string, { underlying: string; expiry: string }>()
  for (const leg of legs) {
    if (!leg.underlying || !leg.expiry) continue
    chains.set(chainKey(leg.underlying, leg.expiry), {
      underlying: leg.underlying,
      expiry: leg.expiry,
    })
  }
  const wanted = [...chains.values()].sort((a, b) =>
    `${a.underlying}${a.expiry}`.localeCompare(`${b.underlying}${b.expiry}`),
  )

  const results = useQueries({
    queries: wanted.map((c) => ({
      queryKey: ['market-data', 'option-snapshots', c.underlying, c.expiry],
      queryFn: () => fetchOptionSnapshots(c.underlying, c.expiry),
      // End-of-day data; refetching it on the page's live cadence would be waste.
      staleTime: 30 * 60_000,
      retry: 1,
    })),
  })

  const rowByTicker = new Map<string, VendorGreeksRow>()
  for (const r of results) {
    for (const row of r.data?.rows ?? []) {
      if (row.option_ticker) rowByTicker.set(row.option_ticker, row)
    }
  }

  return rollupGreeks(legs, rowByTicker, {
    isLoading: results.some((r) => r.isLoading),
    isError: results.some((r) => r.isError),
  })
}

/**
 * The join and the sums, as a pure function of what came back.
 *
 * Separated from fetching because this is where a portfolio theta either is or
 * is not the truth: a leg the vendor could not price must fall out of the total
 * and be counted, never contribute zero.
 */
export function rollupGreeks(
  legs: readonly GreekLeg[],
  rowByTicker: ReadonlyMap<string, VendorGreeksRow>,
  state: { isLoading: boolean; isError: boolean },
): GreeksRollup {
  const byTicker = new Map<string, PositionGreeks>()
  let delta = 0
  let gamma = 0
  let theta = 0
  let vega = 0
  let matched = 0
  let unmatched = 0
  let oldestAsOf: string | null = null
  let newestAsOf: string | null = null
  const legDays: string[] = []

  for (const leg of legs) {
    const ticker = buildOptionTicker(leg)
    const row = ticker ? rowByTicker.get(ticker) : undefined
    if (!ticker || !row || row.delta == null) {
      unmatched += 1
      continue
    }
    const d = positionGreek(row.delta, leg.qty)
    const g = positionGreek(row.gamma, leg.qty)
    const t = positionGreek(row.theta, leg.qty)
    const v = positionGreek(row.vega, leg.qty)
    matched += 1
    delta += d ?? 0
    gamma += g ?? 0
    theta += t ?? 0
    vega += v ?? 0
    if (row.snapshot_ts) {
      if (oldestAsOf == null || row.snapshot_ts < oldestAsOf) oldestAsOf = row.snapshot_ts
      if (newestAsOf == null || row.snapshot_ts > newestAsOf) newestAsOf = row.snapshot_ts
      legDays.push(row.snapshot_ts.slice(0, 10))
    }
    byTicker.set(ticker, {
      delta: d,
      gamma: g,
      theta: t,
      vega: v,
      iv: row.iv,
      asOf: row.snapshot_ts,
    })
  }

  const newestDay = newestAsOf ? newestAsOf.slice(0, 10) : null
  const staleLegs = newestDay ? legDays.filter((d) => d < newestDay).length : 0

  return {
    byTicker,
    delta,
    gamma,
    theta,
    vega,
    matched,
    unmatched,
    oldestAsOf,
    newestAsOf,
    staleLegs,
    isLoading: state.isLoading,
    isError: state.isError,
    partial: unmatched > 0,
  }
}
