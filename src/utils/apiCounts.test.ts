import { describe, expect, it } from 'vitest'
import { fillCountOf, tradeTotalOf } from '@/utils/apiCounts'

describe('TD-19 count keys', () => {
  it('reads fill_count, and trade_count from an API before core 0.38.0', () => {
    expect(fillCountOf({ fill_count: 7, trade_count: 7 })).toBe(7)
    expect(fillCountOf({ trade_count: 5 })).toBe(5)
    expect(fillCountOf(undefined)).toBe(0)
  })

  it('reads total_trades, and total_instances from an API before core 0.38.0', () => {
    expect(tradeTotalOf({ total_trades: 3, total_instances: 3 })).toBe(3)
    expect(tradeTotalOf({ total_instances: 2 })).toBe(2)
  })
})
