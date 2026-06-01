import { describe, it, expect } from 'vitest'
import {
  buildIndependentStockSections,
  computeIndependentHoldingMetrics,
  isIndependentHolding,
} from './independentHoldings'
import type { LivePositionRow } from '@/types/positions'

describe('independentHoldings', () => {
  it('isIndependentHolding when optionable is not true', () => {
    expect(isIndependentHolding({ optionable: false } as LivePositionRow)).toBe(true)
    expect(isIndependentHolding({ optionable: undefined } as LivePositionRow)).toBe(true)
    expect(isIndependentHolding({ optionable: true } as LivePositionRow)).toBe(false)
  })

  it('buildIndependentStockSections groups by bucket', () => {
    const core = [{ symbol: 'SPY', optionable: false, position: 10 }] as LivePositionRow[]
    const fi = [{ symbol: 'BALI', optionable: false, position: 5 }] as LivePositionRow[]
    const sections = buildIndependentStockSections(core, fi, [])
    expect(sections[0].rows).toHaveLength(1)
    expect(sections[1].rows).toHaveLength(1)
    expect(sections[2].rows).toHaveLength(0)
  })

  it('computeIndependentHoldingMetrics daily and total pnl', () => {
    const pos = {
      position: 100,
      price: 110,
      daily_prev_close: 100,
      avgCost: 90,
      unrealized_pnl: 2000,
    } as LivePositionRow
    const m = computeIndependentHoldingMetrics(pos)
    expect(m.dailyPnl).toBe(1000)
    expect(m.marketValue).toBe(11000)
    expect(m.totalPnl).toBe(2000)
  })
})
