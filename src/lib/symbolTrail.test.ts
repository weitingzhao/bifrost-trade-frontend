import { describe, expect, it } from 'vitest'
import { trailPositionFor, type SymbolTrail } from './symbolTrail'

const trail: SymbolTrail = {
  label: 'Underlyings',
  href: '/research/scan',
  items: [
    { symbol: 'NVDA', why: 'iv_rank hot · rank 1' },
    { symbol: 'SMCI', why: 'vrp hot' },
    { symbol: 'AAPL' },
  ],
}

describe('trailPositionFor', () => {
  it('places the symbol on the list it came from, with its neighbours', () => {
    expect(trailPositionFor(trail, 'SMCI')).toEqual({
      label: 'Underlyings',
      href: '/research/scan',
      index: 2,
      total: 3,
      prev: 'NVDA',
      next: 'AAPL',
      why: 'vrp hot',
    })
  })

  it('has no previous at the top and no next at the bottom', () => {
    expect(trailPositionFor(trail, 'NVDA')?.prev).toBeNull()
    expect(trailPositionFor(trail, 'NVDA')?.next).toBe('SMCI')
    expect(trailPositionFor(trail, 'AAPL')?.next).toBeNull()
  })

  it('says nothing when the symbol was not on that list', () => {
    // The rail must not claim a name the list never ranked. This is what makes
    // a stale trail harmless: it simply stops applying.
    expect(trailPositionFor(trail, 'TSLA')).toBeNull()
    expect(trailPositionFor(null, 'NVDA')).toBeNull()
    expect(trailPositionFor(trail, '')).toBeNull()
    expect(trailPositionFor(trail, '   ')).toBeNull()
  })

  it('matches regardless of how the symbol was typed', () => {
    expect(trailPositionFor(trail, 'nvda')?.index).toBe(1)
    expect(trailPositionFor(trail, ' smci ')?.index).toBe(2)
  })

  it('carries no reason when the list gave none, rather than inventing one', () => {
    expect(trailPositionFor(trail, 'AAPL')?.why).toBeUndefined()
  })
})
