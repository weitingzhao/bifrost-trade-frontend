import { describe, expect, it } from 'vitest'
import {
  feedMassiveStockTabHash,
  feedMassiveStockTickersSubHash,
  parseFeedMassiveStockSvcFromHash,
  parseFeedMassiveStockTabFromHash,
  parseFeedMassiveStockTickersSubTabFromHash,
} from './stockTabUtils'

describe('stockTabUtils', () => {
  it('parses REST section tab hash', () => {
    expect(parseFeedMassiveStockTabFromHash('#feed-massive-stock-tab-stock-tickers')).toBe('stock-tickers')
  })

  it('parses service anchor hash', () => {
    expect(parseFeedMassiveStockSvcFromHash('#feed-massive-stock-svc-stock-aggregates')).toBe(
      'stock-aggregates',
    )
  })

  it('parses tickers sub-tab hash', () => {
    expect(parseFeedMassiveStockTickersSubTabFromHash('#feed-massive-stock-tk-reference_db')).toBe(
      'reference_db',
    )
  })

  it('builds tab hashes', () => {
    expect(feedMassiveStockTabHash('stock-news')).toBe('#feed-massive-stock-tab-stock-news')
    expect(feedMassiveStockTickersSubHash('all_tickers')).toBe('#feed-massive-stock-tk-all_tickers')
  })
})
