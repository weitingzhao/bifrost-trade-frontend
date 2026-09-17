import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  NO_PRIOR_BASE,
  RANGE_PRESET_OPTIONS,
  getPeriodKey,
  getRangeForPreset,
  pctChangeVsPrev,
} from './transferPay'

/**
 * E2: the page divided by the current period instead of the previous one, so
 * the same absolute change read differently depending on how small the current
 * figure happened to be. Total for 2026 showed +1628.2% where the standard
 * period-over-period rate is +106.5%.
 */
describe('pctChangeVsPrev', () => {
  it('divides by the previous period, not the current one', () => {
    // A small positive year against a large negative one, figures invented.
    expect(pctChangeVsPrev(6000, -100000)).toBeCloseTo(106, 1)
  })

  it('keeps the sign of the change, not of the base', () => {
    expect(pctChangeVsPrev(-30000, -90000)).toBeCloseTo(66.67, 1)
    expect(pctChangeVsPrev(-20000, -6900)).toBeCloseTo(-189.86, 1)
  })

  it('reads a drop to nothing as -100%, not as no change', () => {
    expect(pctChangeVsPrev(0, 10000)).toBe(-100)
  })

  it('refuses to call growth from zero a percentage', () => {
    // 0 → 35,000 is not +100% growth; there is no base to grow from.
    expect(pctChangeVsPrev(35000, 0)).toBe(NO_PRIOR_BASE)
    expect(pctChangeVsPrev(0, 0)).toBe(NO_PRIOR_BASE)
    expect(pctChangeVsPrev(-3500, 0)).toBe(NO_PRIOR_BASE)
  })

  it('returns null when either side is not a number', () => {
    expect(pctChangeVsPrev(Number.NaN, 100)).toBeNull()
    expect(pctChangeVsPrev(100, Number.NaN)).toBeNull()
  })
})

describe('getPeriodKey', () => {
  it('reads epoch seconds sent as a string, which is how the API sends them', () => {
    expect(getPeriodKey('1789084800.000000', 'year')).toBe('2026')
    expect(getPeriodKey('1789084800.000000', 'quarter')).toBe('2026 Q3')
    expect(getPeriodKey('1789084800.000000', 'month')).toBe('2026-09')
  })
})

describe('getRangeForPreset', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('offers all eight windows — tax, reconciliation and month-end each need a different one', () => {
    expect(RANGE_PRESET_OPTIONS).toHaveLength(8)
    expect(RANGE_PRESET_OPTIONS.map(o => o.value)).toContain('last_business_day')
  })

  it('reaches back three days on a Monday, not one', () => {
    // Written on purpose: without it, "last business day" is empty every Monday.
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 14, 10)) // Monday 14 Sep 2026
    expect(getRangeForPreset('last_business_day').fromDate).toBe('20260911')
  })

  it('reaches back one day midweek', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 16, 10)) // Wednesday
    expect(getRangeForPreset('last_business_day').fromDate).toBe('20260915')
  })

  it('hands back both a query window and the dates the Flex fetch sends', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 16, 10))
    const r = getRangeForPreset('ytd')
    expect(r.fromDate).toBe('20260101')
    expect(r.sinceTs).toBeLessThan(r.untilTs)
  })
})
