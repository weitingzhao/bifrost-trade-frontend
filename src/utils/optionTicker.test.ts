import { describe, it, expect } from 'vitest'
import { buildOptionTicker, positionGreek } from './optionTicker'

describe('buildOptionTicker', () => {
  it('reproduces a ticker the warehouse actually returned', () => {
    // Verified against /market/options/snapshots on 2026-09-05.
    expect(buildOptionTicker({ underlying: 'MU', expiry: '20261120', strike: 1200, right: 'C' }))
      .toBe('O:MU261120C01200000')
    expect(buildOptionTicker({ underlying: 'MU', expiry: '20260814', strike: 100, right: 'C' }))
      .toBe('O:MU260814C00100000')
  })

  it('pads fractional strikes without losing a thousandth', () => {
    expect(buildOptionTicker({ underlying: 'AAA', expiry: '20261120', strike: 42.5, right: 'P' }))
      .toBe('O:AAA261120P00042500')
    // 1200 * 1000 in binary floating point is not always exactly 1200000.
    expect(buildOptionTicker({ underlying: 'AAA', expiry: '20261120', strike: 7.7, right: 'C' }))
      .toBe('O:AAA261120C00007700')
  })

  it('accepts a dashed expiry', () => {
    expect(buildOptionTicker({ underlying: 'MU', expiry: '2026-11-20', strike: 1200, right: 'C' }))
      .toBe('O:MU261120C01200000')
  })

  it('accepts the right spellings the payloads carry', () => {
    expect(buildOptionTicker({ underlying: 'AAA', expiry: '20261120', strike: 10, right: 'put' }))
      .toBe('O:AAA261120P00010000')
  })

  it('returns null rather than a key that will silently match nothing', () => {
    const ok = { underlying: 'MU', expiry: '20261120', strike: 1200, right: 'C' }
    expect(buildOptionTicker({ ...ok, underlying: '' })).toBeNull()
    expect(buildOptionTicker({ ...ok, expiry: '2026' })).toBeNull()
    expect(buildOptionTicker({ ...ok, strike: 0 })).toBeNull()
    expect(buildOptionTicker({ ...ok, strike: Number.NaN })).toBeNull()
    expect(buildOptionTicker({ ...ok, right: 'X' })).toBeNull()
    expect(buildOptionTicker({ ...ok, strike: 200_000 })).toBeNull()
  })
})

describe('positionGreek', () => {
  it('scales a per-share Greek to the contracts held, keeping the sign', () => {
    // Short 1 call, vendor delta +0.3547 → position delta −35.47.
    expect(positionGreek(0.3547, -1)).toBeCloseTo(-35.47, 6)
    // Short 1 call, vendor theta −0.7863 → +78.63 a day earned.
    expect(positionGreek(-0.7863, -1)).toBeCloseTo(78.63, 6)
    expect(positionGreek(0.5, 2)).toBe(100)
  })

  it('returns null for a leg the vendor could not price', () => {
    expect(positionGreek(null, -1)).toBeNull()
    expect(positionGreek(Number.NaN, -1)).toBeNull()
  })
})
