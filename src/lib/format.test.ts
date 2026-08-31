import { describe, expect, it } from 'vitest'
import { fmtPct1, fmtPct2, fmtPctFromFraction, fmtPctSigned } from '@/lib/format'

/**
 * The two percentage families must stay distinguishable.
 *
 * `fmtPct` used to be defined in 13 files with both meanings — ten multiplied by
 * 100, the rest did not — so the same call produced 0.24% or 24% depending on
 * which file you happened to be in. On IV, VRP and rate displays that is a wrong
 * number, not a formatting nit. These tests pin the boundary the naming now
 * expresses.
 */
describe('percentage formatting families', () => {
  it('fmtPctFromFraction scales a fraction; the fmtPct* family does not', () => {
    expect(fmtPctFromFraction(0.2412)).toBe('24.1%')
    expect(fmtPct1(0.2412)).toBe('0.2%')
    // Same input, 100x apart — which is exactly why one name for both was a bug.
    expect(fmtPctFromFraction(0.2412)).not.toBe(fmtPct1(0.2412))
  })

  it('fmtPctFromFraction honours the digits argument', () => {
    expect(fmtPctFromFraction(0.12345, 0)).toBe('12%')
    expect(fmtPctFromFraction(0.12345, 2)).toBe('12.35%')
  })

  it('every helper renders an em dash for null, undefined and non-finite input', () => {
    for (const f of [fmtPct1, fmtPct2, fmtPctSigned, fmtPctFromFraction]) {
      expect(f(null)).toBe('—')
      expect(f(undefined)).toBe('—')
      expect(f(Number.NaN)).toBe('—')
      expect(f(Number.POSITIVE_INFINITY)).toBe('—')
    }
  })

  it('fmtPctSigned keeps an explicit + so a gain is never read as a loss', () => {
    expect(fmtPctSigned(1.5)).toBe('+1.50%')
    expect(fmtPctSigned(-1.5)).toBe('-1.50%')
    expect(fmtPctSigned(0)).toBe('+0.00%')
    // Inherited from the removed utils/positions fmtPct, which this replaces.
    expect(fmtPctSigned(5.123)).toBe('+5.12%')
    expect(fmtPctSigned(-3.456)).toBe('-3.46%')
  })

  it('fmtPct2 keeps two decimals where fmtPct1 keeps one', () => {
    expect(fmtPct1(56.539)).toBe('56.5%')
    expect(fmtPct2(56.539)).toBe('56.54%')
  })
})
