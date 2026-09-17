import { describe, expect, it } from 'vitest'
import type { UnderlyingEntry } from '@/types/modelAnalysis'
import { marginUsers, marginUsersTotal } from './marginModel'

function und(over: Partial<UnderlyingEntry> & Pick<UnderlyingEntry, 'symbol'>): UnderlyingEntry {
  return {
    capital_committed: 0,
    capital_at_risk: { effective: 0, has_unbounded: false, explain: 'sum_of_legs' },
    risk_type: 'defined',
    ...over,
  } as UnderlyingEntry
}

describe('marginUsers', () => {
  it('ranks by what each name ties up, and folds one symbol held in two accounts', () => {
    const rows = marginUsers([
      und({ symbol: 'ZZZ', capital_committed: 6_000, capital_at_risk: { effective: 4_000, has_unbounded: false, explain: 'sum_of_legs' } }),
      und({ symbol: 'ZZZ', capital_committed: 2_000, capital_at_risk: { effective: 1_000, has_unbounded: false, explain: 'sum_of_legs' } }),
      und({ symbol: 'YYY', capital_committed: 2_000, capital_at_risk: { effective: 500, has_unbounded: false, explain: 'sum_of_legs' } }),
    ] as UnderlyingEntry[])
    expect(rows.map((r) => r.symbol)).toEqual(['ZZZ', 'YYY'])
    expect(rows[0]).toMatchObject({ committed: 8_000, atRisk: 5_000 })
    expect(rows[0].share).toBeCloseTo(0.8)
    expect(rows[1].share).toBeCloseTo(0.2)
  })

  it('leaves an unbounded name without a number instead of standing one in for infinity', () => {
    const [row] = marginUsers([
      und({
        symbol: 'ZZZ',
        capital_committed: 5_000,
        risk_type: 'unlimited',
        capital_at_risk: { effective: 0, has_unbounded: true, explain: 'sum_of_legs' },
      }),
    ] as UnderlyingEntry[])
    expect(row.unbounded).toBe(true)
    expect(row.atRisk).toBeNull()
    expect(row.committed).toBe(5_000)
  })

  it('leaves out a name that ties up nothing and could be bounded', () => {
    expect(marginUsers([und({ symbol: 'ZZZ' })] as UnderlyingEntry[])).toEqual([])
  })
})

describe('marginUsersTotal', () => {
  it('sums what can be summed and counts what could not be bounded', () => {
    const rows = marginUsers([
      und({ symbol: 'ZZZ', capital_committed: 6_000 }),
      und({ symbol: 'YYY', capital_committed: 4_000, capital_at_risk: { effective: 0, has_unbounded: true, explain: 'sum_of_legs' } }),
    ] as UnderlyingEntry[])
    expect(marginUsersTotal(rows)).toEqual({ committed: 10_000, unbounded: 1 })
  })
})
