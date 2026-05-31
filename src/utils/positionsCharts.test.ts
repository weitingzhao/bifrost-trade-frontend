import { describe, it, expect } from 'vitest'
import {
  buildCoverageAssetPieData,
  resolveUnderlyingCategory,
} from './positionsCharts'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { LivePositionRow } from '@/types/positions'

describe('positionsCharts', () => {
  it('resolveUnderlyingCategory maps ledger categories', () => {
    expect(resolveUnderlyingCategory({ category: 'Fixed Income' } as LivePositionRow)).toBe(
      'Fixed Income',
    )
    expect(resolveUnderlyingCategory({ category: 'Money Market' } as LivePositionRow)).toBe(
      'Cash-like',
    )
    expect(resolveUnderlyingCategory({ category: 'Equity' } as LivePositionRow)).toBe('Stocks')
  })

  it('buildCoverageAssetPieData sums stock MV and respects exclude flags', () => {
    const accounts: IbAccountSnapshot[] = [
      {
        account_id: 'U001',
        summary: { TotalCashValue: '1000', BuyingPower: '5000' },
        positions: [],
      },
    ]
    const core: LivePositionRow[] = [
      {
        account_id: 'U001',
        symbol: 'NVDA',
        secType: 'STK',
        position: 10,
        price: 200,
        category: 'Equity',
      },
    ]
    const pie = buildCoverageAssetPieData(accounts, core, [], [], 'all', {
      includeFi: false,
      includeCashLike: false,
      includeBp: false,
    })
    expect(pie.coreStockMV).toBe(2000)
    expect(pie.denom).toBeGreaterThan(0)
    expect(pie.includeBpInChart).toBe(false)
    expect(pie.cash).toBe(1000)
  })
})
