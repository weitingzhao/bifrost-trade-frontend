import { describe, it, expect } from 'vitest'
import { recentTerrainRegimes } from './researchEngine'
import type { TerrainData } from './researchEngine'

/** Verbatim shape from /research/forecast/terrain/history, newest first. */
const row = (trade_date: string, regime: string) =>
  ({ symbol: 'MU', trade_date, regime }) as unknown as TerrainData

const HISTORY = [
  row('2026-09-09', 'range'),
  row('2026-09-08', 'range'),
  row('2026-09-07', 'squeeze'),
  row('2026-09-04', 'range'),
  row('2026-09-03', 'bull'),
  row('2026-09-02', 'range'),
  row('2026-09-01', 'bear'),
]

describe('recentTerrainRegimes', () => {
  it('returns the most recent days, oldest first — the order a strip is drawn in', () => {
    expect(recentTerrainRegimes(HISTORY, 5)).toEqual([
      { trade_date: '2026-09-03', regime: 'bull' },
      { trade_date: '2026-09-04', regime: 'range' },
      { trade_date: '2026-09-07', regime: 'squeeze' },
      { trade_date: '2026-09-08', regime: 'range' },
      { trade_date: '2026-09-09', regime: 'range' },
    ])
  })

  it('keeps the newest reading when a day appears twice', () => {
    // The API answers newest first, so the first row for a date wins.
    const dup = [row('2026-09-09', 'squeeze'), row('2026-09-09', 'range')]
    expect(recentTerrainRegimes(dup, 5)).toEqual([{ trade_date: '2026-09-09', regime: 'squeeze' }])
  })

  it('skips rows with no date or no regime rather than inventing a day', () => {
    const messy = [
      row('2026-09-09', 'range'),
      { symbol: 'MU', trade_date: '', regime: 'range' } as unknown as TerrainData,
      { symbol: 'MU', trade_date: '2026-09-08' } as unknown as TerrainData,
    ]
    expect(recentTerrainRegimes(messy, 5)).toEqual([{ trade_date: '2026-09-09', regime: 'range' }])
  })

  it('trims a long trade_date to the day', () => {
    const ts = [row('2026-09-09T20:00:00+00:00', 'range')]
    expect(recentTerrainRegimes(ts, 5)[0].trade_date).toBe('2026-09-09')
  })

  it('honours the limit', () => {
    expect(recentTerrainRegimes(HISTORY, 2)).toEqual([
      { trade_date: '2026-09-08', regime: 'range' },
      { trade_date: '2026-09-09', regime: 'range' },
    ])
  })

  it('has nothing to say about no rows', () => {
    expect(recentTerrainRegimes([], 5)).toEqual([])
    expect(recentTerrainRegimes(null, 5)).toEqual([])
    expect(recentTerrainRegimes(undefined, 5)).toEqual([])
  })
})
