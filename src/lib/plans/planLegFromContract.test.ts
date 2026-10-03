import { describe, expect, it } from 'vitest'
import { planLegsFromContract } from './planLegFromContract'

describe('planLegsFromContract', () => {
  it('reads the chain’s label into a draft with no side', () => {
    expect(planLegsFromContract('NVDA 2026-11-20 245C')).toEqual([
      {
        sec_type: 'OPT',
        right: 'C',
        strike: 245,
        expiry: '2026-11-20',
        ratio: 1,
        // The positions format (TD-25), as core writes it: a whole strike keeps one decimal.
        contract_key: 'NVDA|OPT|20261120|245.0|C',
      },
    ])
    expect(planLegsFromContract('NVDA 2026-11-20 245C')[0]).not.toHaveProperty('side')
  })

  it('reads both legs of a vertical, in the order they were written', () => {
    const legs = planLegsFromContract('NVDA 2026-11-20 245C / NVDA 2026-11-20 250C')
    expect(legs.map((l) => l.strike)).toEqual([245, 250])
    expect(legs.every((l) => !('side' in l))).toBe(true)
  })

  it('keeps a fractional strike as written', () => {
    expect(planLegsFromContract('SPY 2026-10-16 612.5P')[0]?.strike).toBe(612.5)
    expect(planLegsFromContract('SPY 2026-10-16 612.5P')[0]?.contract_key).toBe('SPY|OPT|20261016|612.5|P')
  })

  it('returns nothing rather than a guess', () => {
    expect(planLegsFromContract(null)).toEqual([])
    expect(planLegsFromContract('')).toEqual([])
    expect(planLegsFromContract('Cash-secured put')).toEqual([])
    // No right, so nothing says whether it is a call or a put.
    expect(planLegsFromContract('NVDA 2026-11-20 245')).toEqual([])
  })
})
