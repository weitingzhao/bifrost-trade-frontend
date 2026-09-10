import { describe, it, expect } from 'vitest'
import { coverageLamp, coveragePct } from './LensCoveragePage'
import type { CoverageLens } from '@/api/research/lensCoverage'

const lens = (o: Partial<CoverageLens>): CoverageLens =>
  ({ key: 'k', label: 'L', face: 'trend', read: 0, of: 575, unscreenable: null, ...o }) as CoverageLens

describe('coverageLamp', () => {
  it('agrees with coveragePct about a missing reading', () => {
    const l = lens({ read: null })
    expect(coveragePct(l)).toBe('—')
    expect(coverageLamp(l)).toBe('gray')
  })

  it('keeps a measured zero red — that is real, not missing', () => {
    // Order-flow sentiment reads 0 / 575 today with no unscreenable reason.
    expect(coverageLamp(lens({ read: 0 }))).toBe('red')
  })

  it('greys an unscreenable lens whatever it reads', () => {
    expect(coverageLamp(lens({ read: null, unscreenable: 'needs a 252-day percentile' }))).toBe('gray')
  })

  it('bands a real share', () => {
    expect(coverageLamp(lens({ read: 575, of: 575 }))).toBe('green')
    expect(coverageLamp(lens({ read: 300, of: 575 }))).toBe('yellow')
    expect(coverageLamp(lens({ read: 100, of: 575 }))).toBe('red')
  })
})
