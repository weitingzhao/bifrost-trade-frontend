import { describe, expect, it } from 'vitest'
import type { DailyBenchmark } from '@/types/market'
import {
  aggregateDailyChange,
  computeDailyChange,
  resolveDailyBasePrice,
} from './dailyChange'

function bench(overrides: Partial<DailyBenchmark> = {}): DailyBenchmark {
  return {
    bar_time: null,
    close: null,
    prev_close: null,
    is_today: false,
    is_stale: false,
    ...overrides,
  }
}

describe('resolveDailyBasePrice', () => {
  it('prefers daily_prev_close from position', () => {
    expect(resolveDailyBasePrice({ daily_prev_close: 27.39 }, bench({ close: 28.61, prev_close: 28.61 }))).toBe(27.39)
  })

  it('accepts a raw daily_prev_close number', () => {
    expect(resolveDailyBasePrice(27.39, bench({ close: 28.61 }))).toBe(27.39)
  })

  it('uses prev_close when the latest bar is today', () => {
    expect(resolveDailyBasePrice(undefined, bench({ is_today: true, close: 29.07, prev_close: 27.39 }))).toBe(27.39)
  })

  it('uses bar close when the latest bar is not today (HIMS 8/18 vs 8/19)', () => {
    expect(resolveDailyBasePrice(undefined, bench({ is_today: false, close: 27.39, prev_close: 28.61 }))).toBe(27.39)
  })

  it('returns null when no usable price', () => {
    expect(resolveDailyBasePrice(undefined, undefined)).toBeNull()
    expect(resolveDailyBasePrice({ daily_prev_close: 0 }, undefined)).toBeNull()
  })
})

describe('computeDailyChange', () => {
  it('HIMS: last 29.33 vs yesterday close 27.39', () => {
    const { dailyPct, dailyDollar } = computeDailyChange(29.33, 27.39, 900)
    expect(dailyPct).toBeCloseTo(((29.33 - 27.39) / 27.39) * 100, 2)
    expect(dailyDollar).toBeCloseTo((29.33 - 27.39) * 900, 2)
  })

  it('Daily % is price return even for short qty', () => {
    const { dailyPct, dailyDollar } = computeDailyChange(110, 100, -10)
    expect(dailyPct).toBeCloseTo(10)
    expect(dailyDollar).toBeCloseTo(-100)
  })
})

describe('aggregateDailyChange', () => {
  it('weights Daily % by prior-close notional, not cost', () => {
    const { totalDailyDollar, totalDailyPct } = aggregateDailyChange([
      { dailyDollar: 50, basePrice: 105, qty: 10 },
      { dailyDollar: 50, basePrice: 200, qty: 5 },
    ])
    expect(totalDailyDollar).toBeCloseTo(100)
    expect(totalDailyPct).toBeCloseTo(100 / (105 * 10 + 200 * 5) * 100)
  })
})
