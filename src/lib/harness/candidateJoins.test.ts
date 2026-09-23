import { describe, expect, it } from 'vitest'
import { ruleThatFits } from '@/lib/harness/candidateRuleFit'
import { candidateBacking } from '@/lib/harness/candidateBacking'

// The Rules book on DEV 2026-09-22: 25 opportunities, 7 active, 15 symbols
// covered; of 9 candidate symbols exactly INTC has an active rule.
const OPPS = [
  { strategy_opportunity_id: 1, name: 'Cash Secured Put book', is_active: true, symbols: ['INTC', 'MU'] },
  { strategy_opportunity_id: 2, name: 'Bull Call Spread book', is_active: false, symbols: ['INTC'] },
  { strategy_opportunity_id: 3, name: 'Covered Call book', is_active: true, symbols: ['GOOG'] },
]

describe('ruleThatFits', () => {
  it('names the active rule covering the symbol', () => {
    const f = ruleThatFits('INTC', OPPS)
    expect(f.fits).toBe(true)
    expect(f.label).toBe('Cash Secured Put book')
  })

  // `none active` is the common answer and the useful one: this name would be
  // an exception, not a fill.
  it('says none active when no rule names the symbol', () => {
    expect(ruleThatFits('TWLO', OPPS)).toMatchObject({ fits: false, label: 'none active' })
  })

  // Saying only "none active" would hide that the book has an opinion here and
  // somebody switched it off.
  it('counts rules that exist but are switched off', () => {
    const f = ruleThatFits('GOOG', [{ ...OPPS[2], is_active: false }])
    expect(f.fits).toBe(false)
    expect(f.label).toBe('none active (1 inactive)')
  })

  it('matches case- and space-insensitively', () => {
    expect(ruleThatFits(' intc ', OPPS).fits).toBe(true)
  })

  it('answers with none active rather than throwing when the book has not loaded', () => {
    expect(ruleThatFits('INTC', undefined).fits).toBe(false)
  })
})

const COVER = [
  { accountId: 'U1', symbol: 'INTC', moreCalls: 5 },
  { accountId: 'U2', symbol: 'INTC', moreCalls: 1 },
  { accountId: 'U1', symbol: 'GOOG', moreCalls: 0 },
]
const label = (id: string) => (id === 'U1' ? 'HOST' : 'SEC')

describe('candidateBacking', () => {
  it('reads contracts per account, the account that could take it first', () => {
    const b = candidateBacking('INTC', COVER, label)
    expect(b.any).toBe(true)
    expect(b.label).toBe('HOST 5 · SEC 1')
  })

  it('says none when no account could back a contract', () => {
    expect(candidateBacking('GOOG', COVER, label).any).toBe(false)
    expect(candidateBacking('TWLO', COVER, label).label).toBe('none')
  })

  it('answers none rather than throwing before the book loads', () => {
    expect(candidateBacking('INTC', undefined, label).label).toBe('none')
  })
})
