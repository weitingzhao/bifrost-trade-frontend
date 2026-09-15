import { describe, expect, it } from 'vitest'
import type { BaseLayer, BookVsBase } from '@/utils/bookVsBase'
import { HOUSE_GATE_PCT, backingPoolUsage, deriveBackingJudgment } from './backingJudgment'

function layer(overrides: Partial<BaseLayer> & Pick<BaseLayer, 'role' | 'label'>): BaseLayer {
  return { marketValue: 0, shares: 0, symbols: [], note: '', used: null, ...overrides }
}

function bookWithBase(base: BaseLayer[]): BookVsBase {
  return { base } as BookVsBase
}

describe('backingJudgment', () => {
  const full = bookWithBase([
    layer({
      role: 'stocks',
      label: 'Stocks',
      marketValue: 10_000,
      backingValue: 6_000,
      freeValue: 4_000,
    }),
    layer({ role: 'income', label: 'Income ETFs', marketValue: 5_000 }),
    layer({
      role: 'cash',
      label: 'Cash and SGOV',
      marketValue: 5_000,
      backingValue: 2_000,
      freeValue: 3_000,
    }),
  ])

  it('counts income in the pool and never in used', () => {
    expect(backingPoolUsage(full)).toEqual({ pool: 20_000, used: 8_000 })
  })

  it('is 85% of pool, spendable is gate minus used', () => {
    const j = deriveBackingJudgment(backingPoolUsage(full))
    expect(j.gatePct).toBe(HOUSE_GATE_PCT)
    expect(j.gate).toBe(17_000)
    expect(j.usedPct).toBe(0.4)
    expect(j.spendable).toBe(9_000)
    expect(j.overGate).toBe(false)
  })

  it('does not mix the house gate with the 50% pressure ceiling', () => {
    const j = deriveBackingJudgment({ pool: 100, used: 50 })
    expect(j.gate).toBe(85)
    expect(j.spendable).toBe(35)
    expect(j.gate).not.toBe(50)
  })

  it('clamps spendable at zero once used passes the gate', () => {
    const j = deriveBackingJudgment({ pool: 100, used: 90 })
    expect(j.spendable).toBe(0)
    expect(j.overGate).toBe(true)
  })

  it('leaves usedPct empty when the pool is unpriced', () => {
    const j = deriveBackingJudgment({ pool: 0, used: 0 })
    expect(j.usedPct).toBeNull()
    expect(j.gate).toBe(0)
  })
})
