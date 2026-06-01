import { describe, expect, it } from 'vitest'
import { computeOpenStockPositionMetrics } from './openStockPositions'
import type { LivePositionRow } from '@/types/positions'

describe('computeOpenStockPositionMetrics', () => {
  it('matches legacy daily and since formulas', () => {
    const pos = {
      position: 100,
      avgCost: 77.62,
      price: 154.03,
      daily_prev_close: 148.59,
      unrealized_pnl: 7641,
    } as LivePositionRow
    const m = computeOpenStockPositionMetrics(pos)
    expect(m.sideLabel).toBe('Long')
    expect(m.dailyPnl).toBeCloseTo((154.03 - 148.59) * 100, 2)
    expect(m.dailyPct).toBeCloseTo(((154.03 - 148.59) / 148.59) * 100, 4)
    expect(m.sincePnl).toBe(7641)
    expect(m.sincePct).toBeCloseTo((7641 / (77.62 * 100)) * 100, 4)
    expect(m.marketValue).toBeCloseTo(15403, 2)
  })
})
