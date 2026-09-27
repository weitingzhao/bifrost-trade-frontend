import { describe, expect, it } from 'vitest'
import type { ExpectedEarnings } from '@/api/research/narrative'
import { eventMove } from '@/utils/earningsEstimate'
import { faceExtras } from './faceExtras'

// Invented estimate and term.
const next: ExpectedEarnings = {
  date: '2031-11-03',
  basis: 'same quarter last year + 52 weeks',
  from: '2030-11-04',
  days_away: 38,
  track: { n: 4, median_miss_days: 0, max_miss_days: 0 },
}
const gap = eventMove(
  [
    { expiry: '2031-10-31', dte: 35, iv: 0.45 },
    { expiry: '2031-11-07', dte: 42, iv: 0.58 },
  ],
  38
)

const earningsRows = (opts: Parameters<typeof faceExtras>[1]) =>
  (faceExtras([], opts).events?.rows ?? []).filter((r) => r.id.startsWith('earnings'))

describe('the Events card’s earnings rows', () => {
  it('reads the estimate and the priced gap', () => {
    const rows = earningsRows({ held: false, watched: false, earnings: { next, filings: 20, gap } })
    expect(rows.map((r) => [r.label, r.value])).toEqual([
      ['Earnings', '~38 days · 3 Nov (est.)'],
      ['Earnings gap', '±9.9% priced'],
    ])
  })

  it('says it is reading, and says it failed when the request did', () => {
    expect(earningsRows({ held: false, watched: false })[0].means).toBe('Reading the next print…')
    expect(earningsRows({ held: false, watched: false, earningsFailed: true })[0].means).toBe(
      'Research did not answer for the next print — the estimate is unavailable, not absent.'
    )
  })

  it('shows no gap row without a priced move (a late print, or no premium)', () => {
    const rows = earningsRows({ held: false, watched: false, earnings: { next: { ...next, days_away: -3 }, filings: 20, gap: null } })
    expect(rows.map((r) => r.id)).toEqual(['earnings'])
  })
})
