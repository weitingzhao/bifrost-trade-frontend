import { describe, expect, it } from 'vitest'
import type { EarningsDates } from '@/api/research/narrative'
import { earningsAbsence, printsAhead, readEarnings, type EarningsReading } from './earningsReading'

// Invented names and dates.
function dates(p: Partial<EarningsDates>): EarningsDates {
  return { symbol: 'ABC', dates: [], filings: 0, first_filed: null, last_filed: null, expected_next: null, ...p }
}

describe('earningsAbsence — why a name has no estimate', () => {
  it('an ETF (or a foreign issuer) has no 8-K on file at all', () => {
    expect(earningsAbsence(dates({ filings: 0 })).code).toBe('no_filings')
  })
  it('8-Ks on file, none of them a results release', () => {
    expect(earningsAbsence(dates({ filings: 12, dates: [] }))).toEqual({ code: 'no_results', text: '12 8-Ks on file, none a results release' })
  })
  it('a recent listing with fewer than four results releases', () => {
    const a = earningsAbsence(dates({ filings: 3, dates: ['2026-06-23', '2026-08-12'] }))
    expect(a.code).toBe('too_few_results')
    expect(a.text).toContain('2 results releases on file')
  })
  it('enough releases, but no quarterly cadence (or a stale estimate)', () => {
    const four = ['2025-11-04', '2026-02-05', '2026-03-02', '2026-05-05']
    expect(earningsAbsence(dates({ filings: 20, dates: four })).code).toBe('no_cadence')
  })
  it('no response at all is unread, not a fact about the name', () => {
    expect(earningsAbsence(undefined).code).toBe('unread')
  })
})

describe('readEarnings', () => {
  it('carries the absence on a name without an estimate, leaving the screener’s reason as it was', () => {
    const r = readEarnings(dates({ filings: 0 }))
    expect(r).toMatchObject({ kind: 'none', reason: expect.stringContaining('no 8-K'), absence: { code: 'no_filings' } })
  })
})

describe('printsAhead', () => {
  const exp = (daysAway: number): EarningsReading => ({
    kind: 'expected',
    next: { daysAway, date: '2026-10-12', track: { n: 4, medianMissDays: 1, maxMissDays: 2 }, lastResult: null },
  })
  it('sorts the window, counts the rest, keeps unread apart from no estimate', () => {
    const out = printsAhead(['qrs', 'ABC', 'LATE', 'FAR', 'ETF', 'ERR', 'WAIT'], {
      QRS: exp(6),
      ABC: exp(2),
      LATE: exp(-1),
      FAR: exp(30),
      ETF: readEarnings(dates({ filings: 0 })),
      ERR: { kind: 'none', reason: 'earnings read failed — 503', absence: { code: 'unread', text: 'earnings read failed — 503' } },
    })
    expect(out.ahead.map((p) => [p.symbol, p.late])).toEqual([
      ['LATE', true],
      ['ABC', false],
      ['QRS', false],
    ])
    expect(out.beyond).toBe(1)
    expect(out.none.map((n) => n.symbol)).toEqual(['ETF'])
    expect(out.unread).toEqual(['ERR'])
    expect(out.pending).toEqual(['WAIT'])
  })
})
