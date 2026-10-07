import { describe, expect, it } from 'vitest'
import type { AttributionSums } from '@/lib/schemas/snapshots'
import { earnedFromByPlay } from './earnedFrom'

// Invented values.
const sums = (trade_id: number | null, over: Partial<AttributionSums> = {}) =>
  ({
    trade_id,
    held_pnl: 0,
    delta_pnl: 10,
    gamma_pnl: -2,
    vega_pnl: 4,
    theta_pnl: 20,
    unexplained: 1,
    rows: 1,
    read_rows: 1,
    unread_rows: 0,
    unread_held_pnl: 0,
    mark_anomaly_rows: 0,
    mark_anomaly_unexplained: 0,
    greeks_quality: { vendor: 1, degraded: 0, missing: 0 },
    status: { ok: 1 },
    ...over,
  }) as AttributionSums & { trade_id: number | null }

describe('earnedFromByPlay', () => {
  it('sums a play’s trades and states carry against drift', () => {
    const out = earnedFromByPlay(
      [
        { play: 'Wheel', tradeId: 1 },
        { play: 'Wheel', tradeId: 2 },
        { play: 'Drift', tradeId: 3 },
        { play: 'Wheel', tradeId: null },
      ],
      [sums(1), sums(2), sums(3, { read_rows: 0 }), sums(null)],
    )
    const wheel = out.get('Wheel')!
    expect(wheel.trades).toBe(2)
    expect(wheel.carry).toBe(48)
    expect(wheel.drift).toBe(16)
    expect(wheel.text).toBe('θ+vega 75% · Δ 25%')
    expect(out.has('Drift')).toBe(false) // no read row: no reading, not a zero
  })
})
