import { describe, expect, it } from 'vitest'
import type { ExpectedEarnings } from '@/api/research/narrative'
import { lateNotice, payoffEarnings } from './payoffEarnings'

// Invented estimate and term.
const est = (days_away: number, max = 0): ExpectedEarnings => ({
  date: '2031-11-03',
  basis: 'same quarter last year + 52 weeks',
  from: '2030-11-04',
  days_away,
  track: { n: 4, median_miss_days: 0, max_miss_days: max },
})
const TERM = [
  { expiry: '2031-10-31', dte: 35, iv: 0.45 },
  { expiry: '2031-11-07', dte: 42, iv: 0.58 },
]

describe('payoff earnings rows', () => {
  it('sizes the gap off the term structure when the print is inside the expiry', () => {
    const out = payoffEarnings(est(38), TERM, 42, 20, 21)
    expect(out.gap).toBeCloseTo(0.099, 3)
    expect(out.note).toContain('ATM IV 45.0% on 10-31 before it against 58.0% on 11-07 after, ±9.9%, not σ.')
    expect(out.note).toContain('not in T+21')
  })

  it('says the print is past this expiry and where to see the rows', () => {
    const out = payoffEarnings(est(38), TERM, 21, 20, 10)
    expect(out.gap).toBeNull()
    expect(out.note).toMatch(/falls after this expiry, so it adds no earnings rows/)
  })

  it('says why the term structure cannot size the gap', () => {
    expect(payoffEarnings(est(38), [TERM[1]], 42, 20, 21).note).toMatch(/no priced expiry before the print/)
    expect(payoffEarnings(est(38), [TERM[0], { ...TERM[1], iv: 0.44 }], 42, 20, 21).note).toMatch(/not priced above the one before/)
  })

  it('flags an expiry within the estimate’s own miss', () => {
    const out = payoffEarnings(est(38, 7), TERM, 42, 20, 21)
    expect(out.tag?.tag).toBe('E?')
    expect(out.gap).not.toBeNull()
    expect(out.note).toContain('may fall outside it')
  })

  it('draws nothing for a late print or no estimate', () => {
    expect(payoffEarnings(est(-3), TERM, 42, 20, 21).note).toMatch(/print is late/)
    expect(payoffEarnings(null, TERM, 42, 0, 21).note).toMatch(/^No 8-K on file/)
    expect(payoffEarnings(null, TERM, 42, 30, 21).gap).toBeNull()
  })

  it('raises a late notice, and says when the lateness beats the estimate’s record', () => {
    const late = payoffEarnings(est(-4, 1), TERM, 42, 20, 21)
    expect(late.late).toBe(
      "Earnings late: expected ~3 Nov (last year's 4 Nov 30 plus 52 weeks) and no results 8-K has arrived, 4 days on. " +
        'That is later than this estimate has missed this name before (at most 1 day over 4 prints). ' +
        'The print can land inside this expiry any day — or has, and the feed has not caught up — so the scenario table, which cannot place it, carries no earnings rows.'
    )
    expect(lateNotice(est(-1, 7))).toContain('1 day on. The estimate has missed this name by up to 7 days, so this may still be the usual slack.')
    expect(payoffEarnings(est(38), TERM, 42, 20, 21).late).toBeNull()
    expect(payoffEarnings(null, TERM, 42, 20, 21).late).toBeNull()
  })
})

