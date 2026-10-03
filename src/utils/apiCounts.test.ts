import { describe, expect, it } from 'vitest'
import { fillCountOf, tradeTotalOf } from '@/utils/apiCounts'

describe('TD-19 count keys', () => {
  it('reads fill_count, and 0 without it (trade_count went in core 0.42.0)', () => {
    expect(fillCountOf({ fill_count: 7 })).toBe(7)
    expect(fillCountOf({})).toBe(0)
    expect(fillCountOf(undefined)).toBe(0)
  })

  it('reads total_trades (total_instances went in core 0.42.0)', () => {
    expect(tradeTotalOf({ total_trades: 3 })).toBe(3)
    expect(tradeTotalOf({})).toBe(0)
  })
})
