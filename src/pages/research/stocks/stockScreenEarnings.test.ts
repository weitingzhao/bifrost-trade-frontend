import { describe, expect, it } from 'vitest'
import type { EarningsReading } from '@/utils/earningsReading'
import { earnCell, earningsWindowSets } from './stockScreenEarnings'

const expected = (daysAway: number): EarningsReading => ({
  kind: 'expected',
  next: { daysAway, date: '2031-03-01', track: { n: 4, medianMissDays: 1, maxMissDays: 3 }, lastResult: null },
})
const none: EarningsReading = { kind: 'none', reason: 'x', absence: { code: 'no_filings', text: 'no 8-K on file' } }

describe('stock screen earnings', () => {
  it('puts each estimated print in its windows and no-estimate names in none', () => {
    const sets = earningsWindowSets({ ZA: expected(3), ZB: expected(10), ZC: expected(30), ZD: expected(45), ZE: expected(-2), ZF: none })
    expect([...sets.get('earn_lt_10d')!].sort()).toEqual(['ZA', 'ZE'])
    expect([...sets.get('earn_10_30d')!].sort()).toEqual(['ZB', 'ZC'])
    expect([...sets.get('earn_gt_10d')!].sort()).toEqual(['ZC', 'ZD'])
  })

  it('writes the cell as days, late, or a dash with the reason', () => {
    expect(earnCell(expected(12))).toMatchObject({ text: '12d', muted: false })
    expect(earnCell(expected(12)).title).toContain('Estimated 2031-03-01')
    expect(earnCell(expected(-3)).text).toBe('3d late')
    expect(earnCell(none)).toMatchObject({ text: '—', title: 'No estimate: no 8-K on file.' })
    expect(earnCell(undefined).text).toBe('…')
  })
})
