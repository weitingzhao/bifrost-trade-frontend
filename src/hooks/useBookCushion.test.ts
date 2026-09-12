import { describe, expect, it } from 'vitest'
import { countCushionBands } from './useBookCushion'
import type { ShortLeg } from '@/api/shortLegs'

function leg(over: Partial<ShortLeg>): ShortLeg {
  return { symbol: 'NVDA', strike: 180, right: 'C', qty: -1, spot: 170, ...over }
}

const TIGHT = 0.03

describe('counting the book against the warning line', () => {
  it('counts a short call tight as spot approaches the strike from below', () => {
    // (180 - 175) / 180 = 2.8% — inside a 3% line.
    expect(countCushionBands([leg({ spot: 175 })], TIGHT).tightCount).toBe(1)
    // (180 - 170) / 180 = 5.6% — outside it.
    expect(countCushionBands([leg({ spot: 170 })], TIGHT).tightCount).toBe(0)
  })

  it('reads a put from the other side', () => {
    // Short put at 180: cushion is (spot - strike) / strike.
    expect(countCushionBands([leg({ right: 'P', spot: 185 })], TIGHT).tightCount).toBe(1)
    expect(countCushionBands([leg({ right: 'P', spot: 200 })], TIGHT).tightCount).toBe(0)
  })

  it('counts a breached leg as tight as well — worse must never read as fewer', () => {
    const c = countCushionBands([leg({ spot: 190 })], TIGHT)
    expect(c).toMatchObject({ breachedCount: 1, tightCount: 1 })
  })

  it('treats a leg with no spot as unknown, never as safe', () => {
    const c = countCushionBands([leg({ spot: null }), leg({ strike: null }), leg({ right: null })], TIGHT)
    expect(c).toMatchObject({ unpricedCount: 3, tightCount: 0, shortLegCount: 3 })
  })

  it('moves with the trader’s line, because the line is the trader’s', () => {
    const legs = [leg({ spot: 170 })] // 5.6% cushion
    expect(countCushionBands(legs, 0.03).tightCount).toBe(0)
    expect(countCushionBands(legs, 0.08).tightCount).toBe(1)
  })
})
