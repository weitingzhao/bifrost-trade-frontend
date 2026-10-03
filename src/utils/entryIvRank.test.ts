import { describe, expect, it } from 'vitest'
import type { IvPercentileRow } from '@/types/ivRadar'
import type { ReviewContract } from '@/utils/reviewContracts'
import { rankOnEntry } from './entryIvRank'
import { entryIvRankReading, habitReadings } from './reviewHabits'

// Invented fixtures — no book data.
const row = (trade_date: string, iv_rank_1y: number | null): IvPercentileRow => ({
  symbol: 'XYZ',
  trade_date,
  iv_current: null,
  iv_percentile_1y: null,
  iv_rank_1y,
  lookback_days: 252,
})
const trade = (openedOn: string, underlying = 'XYZ'): ReviewContract =>
  ({ contractKey: `${underlying}-${openedOn}`, underlying, openedOn, realised: 1 }) as unknown as ReviewContract

describe('rankOnEntry', () => {
  const rows = [row('2026-03-02', 20), row('2026-03-05', 40), row('2026-03-20', 60)]
  it('takes the entry session’s own rank', () => {
    expect(rankOnEntry(rows, '2026-03-05')).toBe(40)
  })
  it('falls back to the last session before it, within a few days', () => {
    expect(rankOnEntry(rows, '2026-03-07')).toBe(40)
  })
  it('refuses a row too far behind the entry', () => {
    expect(rankOnEntry(rows, '2026-03-15')).toBeNull()
  })
})

describe('entryIvRankReading', () => {
  it('averages over the trades that have a rank and names how many', () => {
    const rows = new Map([['XYZ', [row('2026-03-05', 40), row('2026-03-20', 60)]]])
    const h = entryIvRankReading([trade('2026-03-05'), trade('2026-03-20'), trade('2026-03-20', 'NONE')], rows, false)
    expect(h.value).toBe(50)
    expect(h.n).toBe(2)
    expect(h.read).toMatch(/2 of 3/)
    expect(h.reference).toBeNull()
  })
  it('withholds the number while names are still arriving', () => {
    const h = entryIvRankReading([trade('2026-03-05')], new Map([['XYZ', [row('2026-03-05', 40)]]]), true)
    expect(h.value).toBeNull()
    expect(h.measuring).toBe(true)
  })
})

describe('habitReadings · IV rank at entry', () => {
  it('reads the rank when the caller passes the history, so every reader agrees', () => {
    const ivRanks = { rowsByName: new Map([['XYZ', [row('2026-03-05', 40)]]]), loading: false }
    const h = habitReadings([trade('2026-03-05')], new Map(), false, ivRanks).find((x) => x.key === 'ivr_entry')!
    expect(h.value).toBe(40)
    expect(h.n).toBe(1)
  })
  it('says the history was not read rather than reporting an empty sample', () => {
    const h = habitReadings([trade('2026-03-05')]).find((x) => x.key === 'ivr_entry')!
    expect(h.value).toBeNull()
    expect(h.unmeasured).toMatch(/not read/)
  })
})
