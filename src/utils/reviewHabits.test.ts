import { describe, expect, it } from 'vitest'
import { habitReadings, iqr, maeDollars, meanBand, plotRange } from './reviewHabits'
import type { MarkPath } from './reviewMarkPath'
import type { ReviewTrade } from './reviewTrades'

function trade(p: Partial<ReviewTrade> & { contractKey: string }): ReviewTrade {
  return {
    label: p.contractKey,
    symbol: `${p.underlying ?? 'ZEBR'}  261218C00090000`,
    underlying: 'ZEBR',
    accountId: 'ACCT',
    expiry: '2026-12-18',
    strike: 90,
    right: 'C',
    fills: [],
    play: null,
    openedOn: '2026-08-03',
    closedOn: '2026-08-17',
    daysHeld: 14,
    dteAtEntry: 40,
    contracts: 1,
    realised: 500,
    win: true,
    exitKind: 'closed',
    shortPremium: true,
    entryPremium: 900,
    exitPremium: 400,
    creditKept: 0.5,
    ...p,
  }
}

function path(p: Partial<MarkPath>): MarkPath {
  return {
    held: [],
    ifHeld: [],
    best: 800,
    bestDate: '2026-08-10',
    worst: -200,
    worstDate: '2026-08-05',
    realised: 500,
    captureOfBest: 0.625,
    cutLatencyDays: 12,
    everUnderwater: true,
    bars: 10,
    businessDays: 11,
    ...p,
  }
}

const TRADES = [
  trade({ contractKey: 'A', realised: 500, win: true }),
  trade({ contractKey: 'B', realised: 300, win: true, daysHeld: 20, dteAtEntry: 25, creditKept: 0.8 }),
  trade({ contractKey: 'C', realised: -400, win: false, daysHeld: 6, dteAtEntry: 60, creditKept: null }),
]

const PATHS = new Map<string, MarkPath>([
  ['A', path({ best: 800, realised: 500, captureOfBest: 0.625 })],
  ['B', path({ best: 300, realised: 300, captureOfBest: 1 })],
  ['C', path({ best: 100, realised: -400, captureOfBest: null, cutLatencyDays: 9, worst: -900 })],
])

describe('habitReadings', () => {
  it('keeps every habit the design names, measured or not', () => {
    const habits = habitReadings(TRADES, PATHS)
    expect(habits.map((h) => h.key)).toEqual([
      'hold_vs_plan',
      'disposition',
      'cut_latency',
      'ivr_entry',
      'dte_entry',
      'credit_kept',
      'capture',
      'late_exit',
    ])
    expect(habits.every((h) => h.value != null || h.unmeasured != null)).toBe(true)
  })

  it('reads the give-back on winners off the path, and its cost in dollars', () => {
    const d = habitReadings(TRADES, PATHS).find((h) => h.key === 'disposition')!
    // Winners A (landed 62.5% of 800) and B (landed all of 300) — median 81%.
    expect(d.n).toBe(2)
    expect(d.value).toBeCloseTo(0.8125, 6)
    // $300 left on A, nothing on B.
    expect(d.consequence).toBeCloseTo(-300, 6)
    expect(d.dots.map((x) => x.key)).toEqual(['A', 'B'])
  })

  it('reads cut-loss latency off losers only', () => {
    const c = habitReadings(TRADES, PATHS).find((h) => h.key === 'cut_latency')!
    expect(c.n).toBe(1)
    expect(c.value).toBe(9)
    expect(c.unmeasured).toBeNull()
  })

  it('says which readings come from the path, so a load is not read as an absence', () => {
    const needs = habitReadings(TRADES, PATHS).filter((h) => h.needsPath).map((h) => h.key)
    expect(needs).toEqual(['disposition', 'cut_latency'])
  })

  it('marks the path habits rather than zeroing them when no path loaded', () => {
    const habits = habitReadings(TRADES)
    const d = habits.find((h) => h.key === 'disposition')!
    const c = habits.find((h) => h.key === 'cut_latency')!
    expect(d.value).toBeNull()
    expect(d.consequence).toBeNull()
    expect(c.value).toBeNull()
    // The fills-only habits are unaffected.
    expect(habits.find((h) => h.key === 'dte_entry')!.value).toBeCloseTo((40 + 25 + 60) / 3, 6)
  })

  it('never puts a cost on a habit whose cost needs the plan', () => {
    for (const key of ['hold_vs_plan', 'cut_latency', 'ivr_entry', 'dte_entry', 'credit_kept', 'capture', 'late_exit']) {
      expect(habitReadings(TRADES, PATHS).find((h) => h.key === key)!.consequence).toBeNull()
    }
  })

  it('splits hold time into the half it has and the half it has not', () => {
    const h = habitReadings(TRADES, PATHS).find((h) => h.key === 'hold_vs_plan')!
    expect(h.value).toBeCloseTo((14 + 20 + 6) / 3, 6)
    expect(h.unmeasured).toMatch(/no plan is linked/)
  })

  it('excludes a trade with no credit from the credit-kept sample', () => {
    const h = habitReadings(TRADES, PATHS).find((h) => h.key === 'credit_kept')!
    expect(h.n).toBe(2)
  })
})

describe('meanBand', () => {
  it('is withheld under three observations', () => {
    expect(meanBand([1])).toBeNull()
    expect(meanBand([1, 2])).toBeNull()
    expect(meanBand([1, 2, 3])).not.toBeNull()
  })

  it('brackets the mean', () => {
    const [lo, hi] = meanBand([10, 12, 14, 16]) as [number, number]
    expect(lo).toBeLessThan(13)
    expect(hi).toBeGreaterThan(13)
  })
})

describe('iqr', () => {
  it('is the middle half, and survives an outlier a mean band does not', () => {
    // One trade that closed for far more than its credit: the mean band runs
    // below −100% while the middle of the book sits near 0.7.
    const kept = [0.9, 0.8, 0.75, 0.7, 0.65, 0.6, -23]
    const band = iqr(kept) as [number, number]
    expect(band[0]).toBeGreaterThan(0)
    expect(band[1]).toBeLessThan(1)
    expect((meanBand(kept) as [number, number])[0]).toBeLessThan(-1)
  })

  it('is withheld under four observations', () => {
    expect(iqr([1, 2, 3])).toBeNull()
  })
})

describe('every band is about the statistic beside it', () => {
  it('pairs a median with an IQR and a mean with a 95% interval', () => {
    for (const h of habitReadings(TRADES, PATHS)) {
      if (h.value == null || h.ci == null) continue
      expect(h.ciLabel).toBe(h.stat === 'median' ? 'IQR' : '95%')
    }
  })
})

describe('maeDollars', () => {
  it('is the worst mark when it was against me, and zero when it never was', () => {
    expect(maeDollars(path({ worst: -900 }))).toBe(-900)
    expect(maeDollars(path({ worst: 120 }))).toBe(0)
    expect(maeDollars(undefined)).toBeNull()
  })
})

describe('plotRange', () => {
  it('follows the middle half rather than the extremes', () => {
    const kept = [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, -23]
    const [lo, hi] = plotRange(kept) as [number, number]
    expect(lo).toBeGreaterThan(-1)
    expect(hi).toBeLessThanOrEqual(0.9)
  })

  it('never widens past the data it was given', () => {
    const [lo, hi] = plotRange([1, 2, 3, 4, 5]) as [number, number]
    expect(lo).toBeGreaterThanOrEqual(1)
    expect(hi).toBeLessThanOrEqual(5)
  })

  it('falls back to the plain extent under four observations', () => {
    expect(plotRange([2, 9])).toEqual([2, 9])
    expect(plotRange([])).toBeNull()
  })
})
