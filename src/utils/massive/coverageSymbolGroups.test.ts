import { describe, expect, it } from 'vitest'
import {
  emptyBarCoverageItem,
  normCoverageSymbol,
  splitCoverageByReferenceIndices,
} from '@/utils/massive/coverageSymbolGroups'

describe('normCoverageSymbol', () => {
  it('uppercases and normalizes fullwidth caret', () => {
    expect(normCoverageSymbol('^gspc')).toBe('^GSPC')
    expect(normCoverageSymbol('  spy  ')).toBe('SPY')
  })
})

describe('splitCoverageByReferenceIndices', () => {
  it('groups indices before watchlist and fills missing index rows', () => {
    const cov = [
      emptyBarCoverageItem('NVDA'),
      { ...emptyBarCoverageItem('SPY'), stock_day: { count: 10, min_ts: 1, max_ts: 2 } },
    ]
    const groups = splitCoverageByReferenceIndices(cov, [
      { symbol: '^GSPC', label: 'S&P 500' },
      { symbol: 'SPY', label: 'SPY ETF' },
    ])
    expect(groups).toHaveLength(2)
    expect(groups[0].label).toBe('Indices')
    expect(groups[0].rows.map(r => r.symbol)).toEqual(['^GSPC', 'SPY'])
    expect(groups[0].rows[0].stock_day.count).toBe(0)
    expect(groups[0].rows[1].stock_day.count).toBe(10)
    expect(groups[1].label).toBe('Watchlist')
    expect(groups[1].rows.map(r => r.symbol)).toEqual(['NVDA'])
  })

  it('returns empty when no coverage and no indices', () => {
    expect(splitCoverageByReferenceIndices([], [])).toEqual([])
  })
})
