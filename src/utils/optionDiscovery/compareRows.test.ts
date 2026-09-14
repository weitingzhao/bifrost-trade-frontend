import { describe, expect, it } from 'vitest'
import {
  addCompareRow,
  canAddCompareRow,
  compareRowKey,
  withCompareSymbol,
} from './compareRows'
import type { OptionSnapshotRow } from '@/types/optionDiscovery'

function row(partial: Partial<OptionSnapshotRow>): OptionSnapshotRow {
  return {
    strike: 100,
    right: 'P',
    mid: 1.2,
    ...partial,
  }
}

describe('compareRows', () => {
  it('keys by symbol|strike|right so two names at the same strike do not collide', () => {
    expect(compareRowKey(row({ underlying_ticker: 'NVDA', strike: 245, right: 'C' }))).toBe(
      'NVDA|245|C',
    )
    expect(
      canAddCompareRow(
        [row({ underlying_ticker: 'NVDA', strike: 245, right: 'C' })],
        row({ underlying_ticker: 'AAPL', strike: 245, right: 'C' }),
      ),
    ).toBe(true)
  })

  it('rejects a duplicate of the same name and contract', () => {
    const a = row({ underlying_ticker: 'NVDA', strike: 245, right: 'C' })
    expect(canAddCompareRow([a], a)).toBe(false)
  })

  it('stamps the page symbol onto a row missing underlying_ticker', () => {
    expect(withCompareSymbol(row({ strike: 200, right: 'P' }), 'aapl').underlying_ticker).toBe(
      'AAPL',
    )
  })

  it('caps at COMPARE_MAX_SLOTS', () => {
    let cur: OptionSnapshotRow[] = []
    for (let i = 0; i < 5; i++) {
      cur = addCompareRow(cur, row({ underlying_ticker: 'NVDA', strike: 100 + i, right: 'P' }))
    }
    expect(cur).toHaveLength(4)
  })
})
