import { describe, expect, it } from 'vitest'
import { normalizeToContractKey } from '@/utils/watchlistHelpers'
import { stockWatchlistContractKey } from './watchlistContractKey'

describe('stockWatchlistContractKey', () => {
  it('builds the canonical stock key the store keeps — not STK:SYM', () => {
    // `STK:ZZQ` has no `|`, so the store filed it as `STK:ZZQ|STK|||`: a second row.
    expect(stockWatchlistContractKey(' zzq ')).toBe('ZZQ|STK|||')
    expect(stockWatchlistContractKey('ZZQ')).toBe(normalizeToContractKey('ZZQ').contract_key)
  })

  it('is empty for no symbol', () => {
    expect(stockWatchlistContractKey('  ')).toBe('')
  })
})
