import { describe, expect, it } from 'vitest'
import {
  DEFAULT_IV_RADAR_BENCHMARKS,
  assembleUniverse,
  bucketByIvRank,
  formatIvRadarSource,
  ivRankDistanceFrom50,
} from './universe'

describe('assembleUniverse', () => {
  it('All = Benchmarks ∪ Watchlist ∪ Holdings (deduped, sorted)', () => {
    const items = assembleUniverse({
      filter: 'all',
      watchlist: ['nvda', 'SPY'],
      holdings: ['AAPL', 'QQQ'],
    })
    expect(items.map(i => i.symbol)).toEqual(['AAPL', 'IWM', 'NVDA', 'QQQ', 'SPY'])
    const spy = items.find(i => i.symbol === 'SPY')
    expect(spy?.sources).toEqual(['benchmark', 'watchlist'])
    const qqq = items.find(i => i.symbol === 'QQQ')
    expect(qqq?.sources).toEqual(['benchmark', 'holdings'])
    const nvda = items.find(i => i.symbol === 'NVDA')
    expect(nvda?.sources).toEqual(['watchlist'])
  })

  it('Benchmarks filter uses defaults SPY QQQ IWM', () => {
    const items = assembleUniverse({
      filter: 'benchmarks',
      watchlist: ['NVDA'],
      holdings: ['AAPL'],
    })
    expect(items.map(i => i.symbol)).toEqual([...DEFAULT_IV_RADAR_BENCHMARKS].sort())
    expect(items.every(i => i.sources.includes('benchmark'))).toBe(true)
  })

  it('Watchlist / Holdings filters are exclusive', () => {
    expect(
      assembleUniverse({
        filter: 'watchlist',
        watchlist: ['TSLA'],
        holdings: ['AAPL'],
      }).map(i => i.symbol),
    ).toEqual(['TSLA'])
    expect(
      assembleUniverse({
        filter: 'holdings',
        watchlist: ['TSLA'],
        holdings: ['aapl'],
      }).map(i => i.symbol),
    ).toEqual(['AAPL'])
  })

  it('does not invent symbols beyond inputs', () => {
    expect(
      assembleUniverse({
        filter: 'watchlist',
        watchlist: [],
        holdings: ['MSFT'],
      }),
    ).toEqual([])
  })
})

describe('bucketByIvRank', () => {
  it('matches High >60 / Neutral 30–60 / Low <30', () => {
    expect(bucketByIvRank(60.1)).toBe('high')
    expect(bucketByIvRank(100)).toBe('high')
    expect(bucketByIvRank(60)).toBe('neutral')
    expect(bucketByIvRank(30)).toBe('neutral')
    expect(bucketByIvRank(45)).toBe('neutral')
    expect(bucketByIvRank(29.9)).toBe('low')
    expect(bucketByIvRank(0)).toBe('low')
  })

  it('missing rank → no_data (never fabricate)', () => {
    expect(bucketByIvRank(null)).toBe('no_data')
    expect(bucketByIvRank(undefined)).toBe('no_data')
    expect(bucketByIvRank(Number.NaN)).toBe('no_data')
  })
})

describe('formatIvRadarSource / ivRankDistanceFrom50', () => {
  it('formats sources for table', () => {
    expect(formatIvRadarSource(['benchmark', 'holdings'])).toBe('Benchmark, Holdings')
    expect(formatIvRadarSource([])).toBe('—')
  })

  it('distance from 50 for extremes sort', () => {
    expect(ivRankDistanceFrom50(80)).toBe(30)
    expect(ivRankDistanceFrom50(20)).toBe(30)
    expect(ivRankDistanceFrom50(null)).toBe(-1)
  })
})
