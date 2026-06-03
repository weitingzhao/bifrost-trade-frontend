import { describe, expect, it } from 'vitest'
import {
  feedMassiveOptionTabHash,
  normalizeOptionTabId,
  parseFeedMassiveSvcFromHash,
  parseFeedMassiveTabFromHash,
  resolveOptionRowIdFromHash,
} from './optionTabUtils'

describe('optionTabUtils', () => {
  it('parses REST section tab hash', () => {
    expect(parseFeedMassiveTabFromHash('#feed-massive-tab-contracts')).toBe('contracts')
  })

  it('parses legacy snapshot alias', () => {
    expect(normalizeOptionTabId('snapshot')).toBe('feed_option_snapshots')
    expect(parseFeedMassiveTabFromHash('#feed-massive-tab-snapshot')).toBe('feed_option_snapshots')
  })

  it('parses legacy aggregates alias', () => {
    expect(normalizeOptionTabId('aggregates')).toBe('feed_options_aggregate')
    expect(parseFeedMassiveTabFromHash('#feed-massive-tab-aggregates')).toBe('feed_options_aggregate')
  })

  it('parses service anchor hash', () => {
    expect(parseFeedMassiveSvcFromHash('#feed-massive-svc-feed_option_snapshots')).toBe(
      'feed_option_snapshots',
    )
  })

  it('resolves row id from tab or svc hash', () => {
    expect(resolveOptionRowIdFromHash('#feed-massive-svc-trades-quotes')).toBe('trades-quotes')
    expect(resolveOptionRowIdFromHash('#feed-massive-tab-reference')).toBe('reference')
  })

  it('builds tab hashes', () => {
    expect(feedMassiveOptionTabHash('contracts')).toBe('#feed-massive-tab-contracts')
  })
})
