import { describe, it, expect } from 'vitest'
import { rollupGreeks, type GreekLeg } from './useOptionGreeks'
import type { VendorGreeksRow } from '@/api/marketData/optionGreeks'

const IDLE = { isLoading: false, isError: false }

// The real row the warehouse returned for the Owner's naked MU call.
const MU_CALL: VendorGreeksRow = {
  option_ticker: 'O:MU261120C01200000',
  underlying: 'MU',
  snapshot_ts: '2026-09-04T20:12:02.583000+00:00',
  iv: 0.6644887225946599,
  delta: 0.3547121538415349,
  gamma: 0.001213004339671355,
  theta: -0.7863207463181576,
  vega: 1.7435986856676717,
  open_interest: 1394,
  day_close: 63.03,
}

const muLeg: GreekLeg = { underlying: 'MU', expiry: '20261120', strike: 1200, right: 'C', qty: -1 }
const rows = (...r: VendorGreeksRow[]) => new Map(r.map((x) => [x.option_ticker, x]))

describe('rollupGreeks', () => {
  it('joins a leg to its vendor row and signs it by the position', () => {
    const g = rollupGreeks([muLeg], rows(MU_CALL), IDLE)
    expect(g.matched).toBe(1)
    expect(g.delta).toBeCloseTo(-35.47, 2)
    // Short a call: vendor theta is negative, the seller earns it.
    expect(g.theta).toBeCloseTo(78.63, 2)
    expect(g.vega).toBeCloseTo(-174.36, 2)
    expect(g.partial).toBe(false)
    expect(g.oldestAsOf).toBe(MU_CALL.snapshot_ts)
  })

  it('keeps the per-leg IV unscaled — it is a rate, not a quantity', () => {
    const g = rollupGreeks([muLeg], rows(MU_CALL), IDLE)
    expect(g.byTicker.get('O:MU261120C01200000')?.iv).toBeCloseTo(0.66449, 5)
  })

  it('drops an unpriced leg from the totals and counts it', () => {
    // Contributing zero would make a partial theta look like a complete one.
    const g = rollupGreeks(
      [muLeg, { ...muLeg, strike: 900 }],
      rows(MU_CALL),
      IDLE,
    )
    expect(g.matched).toBe(1)
    expect(g.unmatched).toBe(1)
    expect(g.partial).toBe(true)
    expect(g.theta).toBeCloseTo(78.63, 2)
  })

  it('drops a vendor row that carries no Greeks', () => {
    const empty = { ...MU_CALL, delta: null, theta: null }
    const g = rollupGreeks([muLeg], rows(empty), IDLE)
    expect(g.matched).toBe(0)
    expect(g.unmatched).toBe(1)
    expect(g.theta).toBe(0)
  })

  it('keeps both ends of the capture range and counts what lags', () => {
    // Real shape from DEV: twelve legs at 2026-09-04, one far-dated at 08-07.
    const older = {
      ...MU_CALL,
      option_ticker: 'O:MU261120C00900000',
      snapshot_ts: '2026-08-07T20:00:00+00:00',
    }
    const g = rollupGreeks([muLeg, { ...muLeg, strike: 900 }], rows(MU_CALL, older), IDLE)
    expect(g.oldestAsOf).toBe('2026-08-07T20:00:00+00:00')
    expect(g.newestAsOf).toBe(MU_CALL.snapshot_ts)
    expect(g.staleLegs).toBe(1)
  })

  it('counts nothing stale when every leg shares a capture day', () => {
    const sameDay = {
      ...MU_CALL,
      option_ticker: 'O:MU261120C00900000',
      snapshot_ts: '2026-09-04T14:00:00+00:00',
    }
    const g = rollupGreeks([muLeg, { ...muLeg, strike: 900 }], rows(MU_CALL, sameDay), IDLE)
    expect(g.staleLegs).toBe(0)
  })

  it('sums across legs with their own signs', () => {
    const put: VendorGreeksRow = {
      ...MU_CALL,
      option_ticker: 'O:MU261120P01000000',
      delta: -0.4,
      theta: -0.5,
      vega: 1.0,
      gamma: 0.002,
    }
    const g = rollupGreeks(
      [muLeg, { underlying: 'MU', expiry: '20261120', strike: 1000, right: 'P', qty: -2 }],
      rows(MU_CALL, put),
      IDLE,
    )
    expect(g.matched).toBe(2)
    // −35.47 from the short call, +80 from two short puts.
    expect(g.delta).toBeCloseTo(-35.47 + 80, 2)
    expect(g.theta).toBeCloseTo(78.63 + 100, 2)
  })

  it('reports an empty book without pretending it is complete', () => {
    const g = rollupGreeks([], new Map(), IDLE)
    expect(g.matched).toBe(0)
    expect(g.partial).toBe(false)
    expect(g.oldestAsOf).toBeNull()
  })
})
