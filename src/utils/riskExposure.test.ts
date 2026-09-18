import { describe, expect, it } from 'vitest'
import {
  RISK_CONCENTRATION_FLOOR,
  buildRiskExposureRows,
  effectiveIndependentPositions,
  correlationClusters,
  greeksByUnderlying,
  riskByExpiry,
  type LegGreeks,
  type RiskExposureRow,
} from './riskExposure'

function leg(over: Partial<LegGreeks> & Pick<LegGreeks, 'underlying'>): LegGreeks {
  return { expiry: '20261016', gamma: 1, theta: -2, vega: 3, ...over }
}

const MODEL = [
  { symbol: 'ZZZ', spot: 100, deltaShares: 200, deltaDollars: 20_000, degraded: false, reason: null },
  { symbol: 'YYY', spot: 50, deltaShares: 100, deltaDollars: 5_000, degraded: true, reason: null },
  { symbol: 'XXX', spot: null, deltaShares: null, deltaDollars: null, degraded: true, reason: 'no_spot' },
]

const BETA = new Map([
  ['ZZZ', { beta: 2, n: 60 }],
  ['YYY', { beta: 1, n: 60 }],
  // XXX has a row but no reading — too few sessions to fill the window.
  ['XXX', { beta: null, n: 12 }],
])

describe('buildRiskExposureRows', () => {
  it('β-weights Δ$, sorts by exposure, and leaves an unpriced name as no reading', () => {
    const { rows, totals } = buildRiskExposureRows({
      model: MODEL,
      betaBySymbol: BETA,
      greeks: greeksByUnderlying([leg({ underlying: 'ZZZ' }), leg({ underlying: 'ZZZ' }), leg({ underlying: 'YYY' })]),
    })
    expect(rows.map((r) => r.symbol)).toEqual(['ZZZ', 'YYY', 'XXX'])
    expect(rows[0].betaDeltaDollars).toBe(40_000)
    expect(rows[1].betaDeltaDollars).toBe(5_000)
    // No Δ$ and no β: the row stays, carrying the service's own word for why.
    expect(rows[2].betaDeltaDollars).toBeNull()
    expect(rows[2].noReadingReason).toBe('no_spot')
    expect(rows[2].share).toBeNull()

    expect(rows[0].share).toBeCloseTo(40_000 / 45_000)
    expect(rows[0].share! > RISK_CONCENTRATION_FLOOR).toBe(true)
    expect(rows[0].legs).toBe(2)
    expect(rows[0].gamma).toBe(2)
    expect(rows[0].theta).toBe(-4)

    expect(totals).toMatchObject({
      deltaDollars: 25_000,
      betaDeltaDollars: 45_000,
      withBetaDelta: 2,
      withoutBetaDelta: 1,
    })
  })

  it('takes a short name as a share of risk, not a negative slice of a pie', () => {
    const { rows, totals } = buildRiskExposureRows({
      model: [
        { symbol: 'ZZZ', spot: 100, deltaShares: 200, deltaDollars: 20_000, degraded: false, reason: null },
        { symbol: 'YYY', spot: 50, deltaShares: -100, deltaDollars: -20_000, degraded: false, reason: null },
      ],
      betaBySymbol: new Map([
        ['ZZZ', { beta: 1, n: 60 }],
        ['YYY', { beta: 1, n: 60 }],
      ]),
      greeks: new Map(),
    })
    // The two net to zero, but neither is half of nothing — each is half the risk.
    expect(totals.betaDeltaDollars).toBe(0)
    expect(rows.map((r) => r.share)).toEqual([0.5, 0.5])
  })
})

describe('riskByExpiry', () => {
  it('groups Γ and Θ by the expiry carrying them, nearest first, and keeps unpriced legs visible', () => {
    const rows = riskByExpiry(
      [
        leg({ underlying: 'ZZZ', expiry: '20261218' }),
        leg({ underlying: 'ZZZ', expiry: '20261016' }),
        leg({ underlying: 'YYY', expiry: '20261016' }),
      ],
      new Map([['2026-12-18', 2]]),
    )
    expect(rows.map((r) => r.expiry)).toEqual(['20261016', '20261218'])
    expect(rows[0]).toMatchObject({ legs: 2, gamma: 2, theta: -4, unpriced: 0 })
    expect(rows[1]).toMatchObject({ legs: 1, unpriced: 2 })
  })
})

describe('effectiveIndependentPositions', () => {
  function row(symbol: string, bd: number): RiskExposureRow {
    return {
      symbol,
      beta: 1,
      betaN: 60,
      spot: 10,
      deltaShares: 1,
      deltaDollars: bd,
      betaDeltaDollars: bd,
      share: null,
      gamma: null,
      theta: null,
      vega: null,
      legs: 0,
      degraded: false,
      noReadingReason: null,
    }
  }
  const rows = [row('A', 100), row('B', 100)]

  it('two names correlated at 1.0 are one bet; uncorrelated they are two', () => {
    const one = effectiveIndependentPositions(rows, {
      A: { A: { rho: 1 }, B: { rho: 1 } },
      B: { A: { rho: 1 }, B: { rho: 1 } },
    })
    expect(one.n).toBeCloseTo(1)
    expect(one.counted).toBe(2)

    const two = effectiveIndependentPositions(rows, {
      A: { A: { rho: 1 }, B: { rho: 0 } },
      B: { A: { rho: 0 }, B: { rho: 1 } },
    })
    expect(two.n).toBeCloseTo(2)
  })

  it('drops a pair the matrix cannot fill rather than reading it as uncorrelated', () => {
    const r = effectiveIndependentPositions(rows, {
      A: { A: { rho: 1 }, B: { rho: null } },
      B: { A: { rho: null }, B: { rho: 1 } },
    })
    // The two unfilled cross terms are reported, not silently taken as zero —
    // zero would have flattered the book into reading as two independent bets.
    expect(r.unfilled).toBe(2)
    expect(r.counted).toBe(2)
  })

  it('has no reading at all when Research gave no matrix', () => {
    expect(effectiveIndependentPositions(rows, null)).toEqual({ n: null, counted: 0, unfilled: 0 })
  })
})

describe('correlationClusters', () => {
  function row(symbol: string, bd: number): RiskExposureRow {
    return {
      symbol,
      beta: 1,
      betaN: 60,
      spot: 10,
      deltaShares: 1,
      deltaDollars: bd,
      betaDeltaDollars: bd,
      share: null,
      gamma: null,
      theta: null,
      vega: null,
      legs: 0,
      degraded: false,
      noReadingReason: null,
    }
  }

  it('refuses to chain: A moves with B and B with C does not make A and C one bet', () => {
    // Single linkage would put all three together through B. On the real book
    // that chained a cash-like ETF into the equity cluster through a bond ETF.
    const clusters = correlationClusters(
      [row('A', 300), row('B', 100), row('C', 100), row('D', 100)],
      {
        A: { A: { rho: 1 }, B: { rho: 0.8 }, C: { rho: 0.1 }, D: { rho: 0 } },
        B: { A: { rho: 0.8 }, B: { rho: 1 }, C: { rho: 0.7 }, D: { rho: 0 } },
        C: { A: { rho: 0.1 }, B: { rho: 0.7 }, C: { rho: 1 }, D: { rho: 0 } },
        D: { A: { rho: 0 }, B: { rho: 0 }, C: { rho: 0 }, D: { rho: 1 } },
      },
    )
    // A is the largest exposure, so it seeds; B clears 0.8 against it; C clears
    // B but not A, so it stands alone.
    expect(clusters.map((c) => c.members)).toEqual([['A', 'B'], ['C'], ['D']])
    expect(clusters[0].share).toBeCloseTo(400 / 600)
    expect(clusters[0].oneWay).toBe(true)
  })

  it('says when a cluster can offset itself: one side short is not one bet the same way', () => {
    const clusters = correlationClusters([row('A', 100), row('B', -100)], {
      A: { A: { rho: 1 }, B: { rho: 0.9 } },
      B: { A: { rho: 0.9 }, B: { rho: 1 } },
    })
    expect(clusters[0].members).toEqual(['A', 'B'])
    expect(clusters[0].oneWay).toBe(false)
  })

  it('leaves a pair the matrix could not fill unlinked rather than guessing it together', () => {
    const clusters = correlationClusters([row('A', 100), row('B', 100)], {
      A: { A: { rho: 1 }, B: { rho: null } },
      B: { A: { rho: null }, B: { rho: 1 } },
    })
    expect(clusters.map((c) => c.members)).toEqual([['A'], ['B']])
  })

  it('has nothing to say without a matrix', () => {
    expect(correlationClusters([row('A', 100)], null)).toEqual([])
  })
})
