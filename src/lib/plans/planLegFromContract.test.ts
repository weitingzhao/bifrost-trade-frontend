import { describe, expect, it } from 'vitest'
import { planLegsFromContract } from './planLegFromContract'

describe('planLegsFromContract', () => {
  it('reads the chain’s label into one leg', () => {
    expect(planLegsFromContract('NVDA 2026-11-20 245C')).toEqual([
      {
        side: 'sell',
        sec_type: 'OPT',
        right: 'C',
        strike: 245,
        expiry: '2026-11-20',
        ratio: 1,
        contract_key: 'NVDA|OPT|20261120|245|C',
        mid_at_plan: null,
        quote_asof: null,
      },
    ])
  })

  it('reads both legs of a vertical, in the order they were written', () => {
    const legs = planLegsFromContract('NVDA 2026-11-20 245C / NVDA 2026-11-20 250C')
    expect(legs.map((l) => l.strike)).toEqual([245, 250])
    expect(legs.every((l) => l.side === 'sell')).toBe(true)
  })

  it('keeps a fractional strike as written', () => {
    expect(planLegsFromContract('SPY 2026-10-16 612.5P')[0]?.strike).toBe(612.5)
  })

  it('returns nothing rather than a guess', () => {
    expect(planLegsFromContract(null)).toEqual([])
    expect(planLegsFromContract('')).toEqual([])
    expect(planLegsFromContract('Cash-secured put')).toEqual([])
    // No right, so nothing says whether it is a call or a put.
    expect(planLegsFromContract('NVDA 2026-11-20 245')).toEqual([])
  })
})
