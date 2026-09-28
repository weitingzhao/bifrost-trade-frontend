/**
 * The page's one rule, pinned: **a signal is judged against its own 1-year
 * average, not against other signals.** Every case here is a way of getting
 * that wrong that would look right on screen.
 */
import { describe, expect, it } from 'vitest'
import type { SignalDecayResponse } from '@/api/research/signalDecay'
import { decayAlerts, decayRoster, type LensPair } from './decayRosterModel'

function resp(
  hot: { r20: number | null; n20: number },
  cold: { r20: number | null; n20: number },
  trendHot: { week: string; n: number; r: number | null }[] = [],
): SignalDecayResponse {
  const side = (s: { r20: number | null; n20: number }) => ({
    n: 100,
    hit_5d: 0,
    evaluated_5d: 0,
    hit_rate_5d: null,
    hit_20d: 0,
    evaluated_20d: s.n20,
    hit_rate_20d: s.r20,
  })
  return {
    lens: 'vrp',
    symbol: null,
    window_days: 90,
    regime: 'any',
    trigger_count: 0,
    hit_rate_5d: null,
    by_side: { hot: side(hot), cold: side(cold) },
    trend: [],
    trend_hot: trendHot.map((t) => ({ week: t.week, n: t.n, rolling_hit_rate_5d: t.r })),
    trend_cold: [],
  }
}

const pair = (now: SignalDecayResponse, year: SignalDecayResponse): LensPair[] => [
  { lens: 'vrp', label: 'VRP', now, year },
]

describe('decayRoster', () => {
  it('measures drift against the signal’s own year, not against a fixed bar', () => {
    // 40% now against its own 44% — a four-point slip on a signal that never
    // was a coin flip. A page that judged against 50% would call it broken.
    const rows = decayRoster(
      pair(resp({ r20: 0.4, n20: 152 }, { r20: 0.5, n20: 341 }), resp({ r20: 0.44, n20: 245 }, { r20: 0.53, n20: 584 })),
    )
    const hot = rows.find((r) => r.side === 'hot')
    expect(hot?.driftPts).toBe(-4)
    expect(hot?.decaying).toBe(false)
    expect(hot?.read).toBe('Holding its own average.')
  })

  it('calls a drift past five points what the design calls it', () => {
    const rows = decayRoster(
      pair(resp({ r20: 0.4, n20: 152 }, { r20: 0.5, n20: 341 }), resp({ r20: 0.52, n20: 245 }, { r20: 0.5, n20: 584 })),
    )
    const hot = rows.find((r) => r.side === 'hot')
    expect(hot?.driftPts).toBe(-12)
    expect(hot?.decaying).toBe(true)
    expect(decayAlerts(rows)[0].why).toContain('12 points under its 1-year 52%')
  })

  it('refuses to call a thin reading a decay', () => {
    // Four settled outcomes can sit twenty points under anything. The row
    // still shows, and says why it is not a verdict.
    const rows = decayRoster(
      pair(resp({ r20: 0.25, n20: 4 }, { r20: 0.5, n20: 341 }), resp({ r20: 0.5, n20: 245 }, { r20: 0.5, n20: 584 })),
    )
    const hot = rows.find((r) => r.side === 'hot')
    expect(hot?.driftPts).toBe(-25)
    expect(hot?.decaying).toBe(false)
    expect(hot?.read).toContain('too thin')
    expect(decayAlerts(rows)).toEqual([])
  })

  it('says the window has not closed rather than showing a zero', () => {
    const rows = decayRoster(
      pair(resp({ r20: null, n20: 0 }, { r20: 0.5, n20: 341 }), resp({ r20: 0.5, n20: 245 }, { r20: 0.5, n20: 584 })),
    )
    const hot = rows.find((r) => r.side === 'hot')
    expect(hot?.hit).toBeNull()
    expect(hot?.read).toContain('has not closed')
  })

  it('greys a thin week instead of drawing it as a bad one', () => {
    // The design's own rule: a grey month is n < 10, not a bad month.
    const rows = decayRoster(
      pair(
        resp({ r20: 0.5, n20: 100 }, { r20: 0.5, n20: 100 }),
        resp({ r20: 0.5, n20: 100 }, { r20: 0.5, n20: 100 }, [
          { week: 'W01', n: 4, r: 0.1 },
          { week: 'W02', n: 60, r: 0.3 },
          { week: 'W03', n: 60, r: 0.52 },
        ]),
      ),
    )
    const bars = rows.find((r) => r.side === 'hot')?.bars ?? []
    expect(bars[0]).toMatchObject({ value: null, weak: false })
    expect(bars[0].label).toContain('too thin')
    // 30% against a 50% average is more than five points under.
    expect(bars[1]).toMatchObject({ weak: true })
    expect(bars[2]).toMatchObject({ weak: false })
  })

  it('puts the worst drift first, because that is what the page is for', () => {
    const rows = decayRoster([
      { lens: 'vrp', label: 'VRP', now: resp({ r20: 0.3, n20: 50 }, { r20: 0.5, n20: 50 }), year: resp({ r20: 0.5, n20: 50 }, { r20: 0.5, n20: 50 }) },
      { lens: 'skew', label: 'Skew', now: resp({ r20: 0.6, n20: 50 }, { r20: 0.5, n20: 50 }), year: resp({ r20: 0.5, n20: 50 }, { r20: 0.5, n20: 50 }) },
    ])
    expect(rows[0].name).toBe('VRP · hot')
    expect(rows[0].driftPts).toBe(-20)
  })
})

describe('profit factor', () => {
  const withPf = (r: SignalDecayResponse, hot: number | null | undefined, cold: number | null | undefined) => ({
    ...r,
    by_side: {
      hot: { ...r.by_side.hot, profit_factor_20d: hot },
      cold: { ...r.by_side.cold, profit_factor_20d: cold },
    },
  })
  const year = resp({ r20: 0.45, n20: 245 }, { r20: 0.5, n20: 584 })

  it('reads the recent window, per side, and marks where it is missing', () => {
    const now = withPf(resp({ r20: 0.45, n20: 152 }, { r20: 0.5, n20: 0 }), 0.78, null)
    const rows = decayRoster([{ lens: 'vrp', label: 'VRP', magnitude: false, now, year }])
    const hot = rows.find((r) => r.side === 'hot')!
    const cold = rows.find((r) => r.side === 'cold')!
    expect(hot.pf).toBe(0.78)
    expect(hot.pfGap).toBeNull()
    // Nothing settled is not "no losses".
    expect(cold.pf).toBeNull()
    expect(cold.pfGap).toBe('unsettled')
  })

  it('tells no losses from a lens that has no direction, and does not guess before the registry', () => {
    const now = withPf(resp({ r20: 0.9, n20: 30 }, { r20: 0.5, n20: 40 }), null, 1.1)
    const known = decayRoster([{ lens: 'vrp', label: 'VRP', magnitude: false, now, year }])
    expect(known.find((r) => r.side === 'hot')!.pfGap).toBe('no_loss')
    const unknown = decayRoster([{ lens: 'vrp', label: 'VRP', now, year }])
    expect(unknown.find((r) => r.side === 'hot')!.pfGap).toBe('unread')
    const gamma = decayRoster([{ lens: 'gex_regime', label: 'Gamma', magnitude: true, now, year }])
    for (const r of gamma) {
      expect(r.pf).toBeNull()
      expect(r.pfGap).toBe('magnitude')
    }
  })

  it('says when a held hit rate still loses money', () => {
    const now = withPf(resp({ r20: 0.45, n20: 152 }, { r20: 0.5, n20: 341 }), 0.78, 1.15)
    const rows = decayRoster([{ lens: 'vrp', label: 'VRP', magnitude: false, now, year }])
    expect(rows.find((r) => r.side === 'hot')!.read).toBe(
      'Holding its own average. Its 20-day profit factor is 0.78 — it gave back more than it made.',
    )
    expect(rows.find((r) => r.side === 'cold')!.read).toBe(
      "Holding its own average. Profit factor 1.15, under the design's 1.2 floor.",
    )
  })
})
