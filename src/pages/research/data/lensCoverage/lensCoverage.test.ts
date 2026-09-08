import { describe, expect, it } from 'vitest'
import type { CoverageLens } from '@/api/research/lensCoverage'
import { coverageLamp, coveragePct } from './LensCoveragePage'

const lens = (over: Partial<CoverageLens>): CoverageLens => ({
  lens: 'iv_rank',
  label: 'IV Rank',
  face: 'volatility',
  read: 0,
  of: 575,
  ...over,
})

describe('coverage lamp and share', () => {
  it('reads green only when a lens covers nearly the whole universe', () => {
    expect(coverageLamp(lens({ read: 575 }))).toBe('green')
    expect(coverageLamp(lens({ read: 518 }))).toBe('green') // 90.1%
    // SEPA's real reach today is 515 of 575 — 89.6%, which is not "nearly whole".
    expect(coverageLamp(lens({ read: 515 }))).toBe('yellow')
    expect(coverageLamp(lens({ read: 200 }))).toBe('yellow')
    expect(coverageLamp(lens({ read: 25 }))).toBe('red') // 4% — today's option side
    expect(coverageLamp(lens({ read: 0 }))).toBe('red')
  })

  it('greys out a lens that cannot be screened, rather than calling it empty', () => {
    const skew = lens({ lens: 'skew', read: null, unscreenable: 'weeks of history, not a year' })
    expect(coverageLamp(skew)).toBe('gray')
    expect(coveragePct(skew)).toBe('—')
  })

  it('shows the share as a whole percent', () => {
    expect(coveragePct(lens({ read: 515 }))).toBe('90%') // rounded for reading; the lamp is not
    expect(coveragePct(lens({ read: 25 }))).toBe('4%')
    expect(coveragePct(lens({ read: 10, of: 0 }))).toBe('—')
  })
})
