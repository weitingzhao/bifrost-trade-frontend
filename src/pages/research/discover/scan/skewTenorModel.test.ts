import { describe, expect, it } from 'vitest'
import { skewTenor } from './skewTenorModel'

/** Every date here is invented. */
const today = '2026-09-30'

describe('skew tenor cell', () => {
  it('says 30 and names both inputs of an interpolated reading, from today', () => {
    const t = skewTenor(
      { basis: 'interpolated', expiry: '2026-10-16', short_expiry: '2026-10-16', long_expiry: '2026-11-20' },
      today,
    )
    expect(t.main).toBe('30')
    expect(t.sub).toBe('16 · 51')
    expect(t.title).toContain('2026-10-16')
    expect(t.title).toContain('2026-11-20')
  })

  it('does not invent a pair when one fit sits at 30', () => {
    const t = skewTenor(
      { basis: 'interpolated', expiry: '2026-10-30', short_expiry: '2026-10-30', long_expiry: '2026-10-30' },
      today,
    )
    expect(t).toEqual({ main: '30', sub: null, title: expect.stringContaining('taken as it is') })
  })

  it('shows a window reading as the one expiry it is', () => {
    const t = skewTenor({ basis: 'window', expiry: '2026-10-21', short_expiry: null, long_expiry: null }, today)
    expect(t.main).toBe('21')
    expect(t.sub).toBe('one fit')
    expect(t.title).toContain('not interpolated')
  })

  it('reads an older research API as a plain expiry', () => {
    const t = skewTenor({ basis: null, expiry: '2026-10-16', short_expiry: null, long_expiry: null }, today)
    expect(t).toEqual({ main: '16', sub: null, title: '' })
  })

  it('degrades to a dash without an expiry', () => {
    expect(skewTenor({ basis: null, expiry: null, short_expiry: null, long_expiry: null }, today).main).toBe('—')
  })
})
