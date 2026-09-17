import { describe, expect, it } from 'vitest'
import {
  buildAttributionChips,
  buildInstrumentChips,
  sharesAllCount,
} from './ledgerViewChips'

describe('ledger view chips', () => {
  it('All counts every share bucket including combos', () => {
    const c = {
      closedOpt: 18,
      openOpt: 24,
      stocks: 13,
      fixedIncome: 10,
      cashLike: 8,
      combos: 18,
    }
    expect(sharesAllCount(c)).toBe(49)
    const all = buildInstrumentChips(c).find(ch => ch.id === 'all')
    expect(all?.label).toBe('All')
    expect(all?.countLabel).toBe('49')
    expect(all?.title).toContain('combos')
  })

  it('zero-count chips are empty, not omitted', () => {
    const chips = buildInstrumentChips({
      closedOpt: 0,
      openOpt: 0,
      stocks: 0,
      fixedIncome: 0,
      cashLike: 0,
      combos: 0,
    })
    expect(chips).toHaveLength(6)
    expect(chips.every(ch => ch.empty)).toBe(true)
  })

  it('attribution titles name the unit', () => {
    const chips = buildAttributionChips({
      opportunityCount: 8,
      instanceWith: 13,
      instanceWithout: 7,
    })
    expect(chips[0].title).toBe('8 opportunities')
    expect(chips[1].title).toContain('instances with')
  })
})
