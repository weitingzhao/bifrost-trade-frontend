/**
 * The book as one exposure, not nineteen.
 *
 * This page answers what Backing & Model does not: how much of the book is one
 * bet. Per-underlying capital at risk, the payoff model and its stress are
 * Backing's subject and are cited, never recomputed (Owner ruling 2026-09-17,
 * option b) — what lives here is β-weighting, correlation, and the Greeks
 * rolled to the whole book.
 *
 * Two sources, each quoted rather than rebuilt: Δ$ per underlying is the model
 * service's own figure, and Γ / vega / Θ are the vendor legs the Positions page
 * already rolls up. β and the correlation matrix come from Research, which owns
 * them. A name the vendor could not price falls out of a sum and is counted —
 * never contributes zero.
 */

/** One leg's vendor Greeks, already scaled by the position (what `rollupGreeks` returns). */
export interface LegGreeks {
  underlying: string
  expiry: string
  gamma: number | null
  theta: number | null
  vega: number | null
}

export interface RiskExposureRow {
  symbol: string
  /** Null when Research could not fill the window — a count, not a zero. */
  beta: number | null
  betaN: number
  spot: number | null
  /** Share-equivalent delta from the model service. */
  deltaShares: number | null
  deltaDollars: number | null
  /** Δ$ × β. Null when either side is missing. */
  betaDeltaDollars: number | null
  /** Share of the book's β-weighted Δ$, over the names that have one. */
  share: number | null
  gamma: number | null
  theta: number | null
  vega: number | null
  legs: number
  /** The model service marked this underlying's Greeks a degraded read. */
  degraded: boolean
  /** Why there is no Δ$, in the model service's own word. */
  noReadingReason: string | null
}

export interface RiskExposureTotals {
  deltaDollars: number
  betaDeltaDollars: number
  gamma: number
  theta: number
  vega: number
  /** Names carrying a β-weighted Δ$, and names that could not be read. */
  withBetaDelta: number
  withoutBetaDelta: number
}

export interface RiskExpiryRow {
  expiry: string
  legs: number
  gamma: number | null
  theta: number | null
  vega: number | null
  unpriced: number
}

/** Above this share of the book's β-weighted Δ$, one name is the book. */
export const RISK_CONCENTRATION_FLOOR = 0.35

/** The readings this page cannot make, and what would have to exist first. */
export const RISK_UNRECORDED = {
  volShock:
    'The model service reports `iv_stress_available: false`, so every stress scenario is a spot move at today’s vol. A vol axis needs vendor IV on each leg at each shock, which nothing computes yet.',
  gateHit:
    'Where usage would cross the 85% gate is Backing & Model’s to compute — this page cites it and never interpolates between two bars.',
  cluster:
    'Naming a cluster needs a sector or theme for each symbol, which nothing on this side stores. Correlation says how much is one bet without naming it.',
} as const

function sum(values: readonly (number | null)[]): { total: number; n: number } {
  let total = 0
  let n = 0
  for (const v of values) {
    if (v == null || !Number.isFinite(v)) continue
    total += v
    n += 1
  }
  return { total, n }
}

/**
 * Per-underlying Greeks, from the legs the vendor priced. A leg with no vendor
 * row never reached `legs` here — it was already counted as unmatched upstream.
 */
export function greeksByUnderlying(legs: readonly LegGreeks[]): Map<string, { gamma: number; theta: number; vega: number; legs: number }> {
  const out = new Map<string, { gamma: number; theta: number; vega: number; legs: number }>()
  for (const l of legs) {
    const key = (l.underlying ?? '').trim().toUpperCase()
    if (!key) continue
    const row = out.get(key) ?? { gamma: 0, theta: 0, vega: 0, legs: 0 }
    row.gamma += l.gamma ?? 0
    row.theta += l.theta ?? 0
    row.vega += l.vega ?? 0
    row.legs += 1
    out.set(key, row)
  }
  return out
}

export interface UnderlyingModelRow {
  symbol: string
  spot: number | null
  deltaShares: number | null
  deltaDollars: number | null
  degraded: boolean
  reason: string | null
}

/**
 * One row per underlying the book holds, largest β-weighted exposure first.
 *
 * `share` is taken over the names that have a β-weighted Δ$, so a book where
 * seven of nineteen names cannot be priced still reports honest shares of what
 * it can see — and the count of what it cannot is carried in the totals.
 */
export function buildRiskExposureRows(input: {
  model: readonly UnderlyingModelRow[]
  betaBySymbol: ReadonlyMap<string, { beta: number | null; n: number }>
  greeks: ReadonlyMap<string, { gamma: number; theta: number; vega: number; legs: number }>
}): { rows: RiskExposureRow[]; totals: RiskExposureTotals } {
  const rows: RiskExposureRow[] = input.model.map((m) => {
    const symbol = m.symbol.trim().toUpperCase()
    const b = input.betaBySymbol.get(symbol)
    const g = input.greeks.get(symbol)
    const beta = b?.beta ?? null
    const betaDeltaDollars = m.deltaDollars != null && beta != null ? m.deltaDollars * beta : null
    return {
      symbol,
      beta,
      betaN: b?.n ?? 0,
      spot: m.spot,
      deltaShares: m.deltaShares,
      deltaDollars: m.deltaDollars,
      betaDeltaDollars,
      share: null,
      gamma: g ? g.gamma : null,
      theta: g ? g.theta : null,
      vega: g ? g.vega : null,
      legs: g?.legs ?? 0,
      degraded: m.degraded,
      noReadingReason: m.deltaDollars == null ? m.reason : null,
    }
  })

  const betaDelta = sum(rows.map((r) => r.betaDeltaDollars))
  // Shares are taken on absolute exposure: a short name is a share of the book's
  // risk, not a negative slice of a pie.
  const absTotal = rows.reduce((a, r) => a + Math.abs(r.betaDeltaDollars ?? 0), 0)
  for (const r of rows) {
    r.share = r.betaDeltaDollars != null && absTotal > 0 ? Math.abs(r.betaDeltaDollars) / absTotal : null
  }

  rows.sort((a, b) => {
    if ((a.betaDeltaDollars == null) !== (b.betaDeltaDollars == null)) return a.betaDeltaDollars == null ? 1 : -1
    return Math.abs(b.betaDeltaDollars ?? 0) - Math.abs(a.betaDeltaDollars ?? 0)
  })

  return {
    rows,
    totals: {
      deltaDollars: sum(rows.map((r) => r.deltaDollars)).total,
      betaDeltaDollars: betaDelta.total,
      gamma: sum(rows.map((r) => r.gamma)).total,
      theta: sum(rows.map((r) => r.theta)).total,
      vega: sum(rows.map((r) => r.vega)).total,
      withBetaDelta: betaDelta.n,
      withoutBetaDelta: rows.length - betaDelta.n,
    },
  }
}

/** Where Γ and Θ sit, by the expiry that carries them. Nearest first. */
export function riskByExpiry(legs: readonly LegGreeks[], unpricedByExpiry: ReadonlyMap<string, number> = new Map()): RiskExpiryRow[] {
  const out = new Map<string, RiskExpiryRow>()
  for (const l of legs) {
    const expiry = (l.expiry ?? '').replace(/\D/g, '').slice(0, 8)
    if (!expiry) continue
    const row = out.get(expiry) ?? { expiry, legs: 0, gamma: 0, theta: 0, vega: 0, unpriced: 0 }
    row.legs += 1
    row.gamma = (row.gamma ?? 0) + (l.gamma ?? 0)
    row.theta = (row.theta ?? 0) + (l.theta ?? 0)
    row.vega = (row.vega ?? 0) + (l.vega ?? 0)
    out.set(expiry, row)
  }
  for (const [expiry, n] of unpricedByExpiry) {
    const key = expiry.replace(/\D/g, '').slice(0, 8)
    if (!key) continue
    const row = out.get(key) ?? { expiry: key, legs: 0, gamma: null, theta: null, vega: null, unpriced: 0 }
    row.unpriced += n
    out.set(key, row)
  }
  return [...out.values()].sort((a, b) => a.expiry.localeCompare(b.expiry))
}

export interface EffectivePositions {
  /** 1 / Σ wᵢwⱼρᵢⱼ over β-Δ weights — how many independent bets the book really is. */
  n: number | null
  /** Names that took part: both a β-weighted Δ$ and a row in the matrix. */
  counted: number
  /** Pairs the matrix could not fill, which are left out rather than read as zero. */
  unfilled: number
}

/**
 * How many bets the book actually is.
 *
 * Nineteen names correlated at 1.0 are one bet; the same nineteen at 0 are
 * nineteen. A pair the matrix cannot fill is dropped from both the numerator and
 * the weight, so a thin matrix reports fewer names rather than a flattering
 * number.
 */
export function effectiveIndependentPositions(
  rows: readonly RiskExposureRow[],
  matrix: Readonly<Record<string, Record<string, { rho: number | null }>>> | null,
): EffectivePositions {
  if (!matrix) return { n: null, counted: 0, unfilled: 0 }
  const usable = rows.filter((r) => r.betaDeltaDollars != null && matrix[r.symbol])
  const total = usable.reduce((a, r) => a + Math.abs(r.betaDeltaDollars ?? 0), 0)
  if (usable.length === 0 || total <= 0) return { n: null, counted: 0, unfilled: 0 }

  let q = 0
  let unfilled = 0
  for (const a of usable) {
    const wa = Math.abs(a.betaDeltaDollars ?? 0) / total
    for (const b of usable) {
      const wb = Math.abs(b.betaDeltaDollars ?? 0) / total
      const rho = a.symbol === b.symbol ? 1 : matrix[a.symbol]?.[b.symbol]?.rho
      if (rho == null) {
        unfilled += 1
        continue
      }
      q += wa * wb * rho
    }
  }
  return { n: q > 0 ? 1 / q : null, counted: usable.length, unfilled }
}
