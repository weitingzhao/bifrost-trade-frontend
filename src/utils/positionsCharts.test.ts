import { describe, it, expect } from 'vitest'
import {
  BACKING_POOL_SEGMENTS,
  baseRoleSegments,
  buildCoverageAssetPieData,
  resolveUnderlyingCategory,
} from './positionsCharts'
import type { IbAccountSnapshot } from '@/types/monitor'
import type { LivePositionRow } from '@/types/positions'
import type { BaseLayer, BookVsBase } from '@/utils/bookVsBase'

function layer(overrides: Partial<BaseLayer> & Pick<BaseLayer, 'role' | 'label'>): BaseLayer {
  return { marketValue: 0, shares: 0, symbols: [], note: '', used: null, ...overrides }
}

/** Only `base` is read by baseRoleSegments. */
function bookWithBase(base: BaseLayer[]): BookVsBase {
  return { base } as BookVsBase
}

describe('positionsCharts', () => {
  it('resolveUnderlyingCategory maps ledger categories', () => {
    expect(resolveUnderlyingCategory({ category: 'Fixed Income' } as LivePositionRow)).toBe(
      'Fixed Income'
    )
    expect(resolveUnderlyingCategory({ category: 'Money Market' } as LivePositionRow)).toBe(
      'Cash-like'
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

  describe('baseRoleSegments', () => {
    const full = bookWithBase([
      layer({
        role: 'stocks',
        label: 'Stocks',
        marketValue: 10_000,
        backingValue: 6_000,
        freeValue: 4_000,
      }),
      layer({ role: 'income', label: 'Income ETFs', marketValue: 5_000 }),
      layer({
        role: 'cash',
        label: 'Cash and SGOV',
        marketValue: 5_000,
        backingValue: 2_000,
        freeValue: 3_000,
      }),
    ])

    it('returns five slices grouped by layer then role, with the fixed labels', () => {
      const segs = baseRoleSegments(full)
      expect(segs.map((s) => s.label)).toEqual([
        'Stocks · backing calls',
        'Stocks · free',
        'Cash and SGOV · backing puts',
        'Cash and SGOV · free',
        'Income ETFs · via buying power, not as cash',
      ])
      expect(segs.map((s) => s.value)).toEqual([6_000, 4_000, 2_000, 3_000, 5_000])
      expect(segs.map((s) => s.layer)).toEqual(['stocks', 'stocks', 'cash', 'cash', 'income'])
      expect(segs.map((s) => s.target)).toEqual(['calls', 'free', 'puts', 'free', 'income'])
    })

    it('draws every slice in its own token colour, two tones per layer', () => {
      const colors = BACKING_POOL_SEGMENTS.map((s) => s.color)
      expect(new Set(colors).size).toBe(5)
      for (const c of colors) {
        expect(c).toMatch(/^(var\(--color-|color-mix\(in oklch, var\(--color-)/)
      }
      expect(colors[0]).toContain('--color-chart-stock')
      expect(colors[1]).toContain('--color-chart-stock')
      expect(colors[2]).toContain('--color-chart-cash')
      expect(colors[3]).toContain('--color-chart-cash')
    })

    it('drops slices with no priced value instead of drawing zero', () => {
      const segs = baseRoleSegments(
        bookWithBase([
          layer({ role: 'stocks', label: 'Stocks', shares: 250 }),
          layer({ role: 'income', label: 'Income ETFs' }),
          layer({
            role: 'cash',
            label: 'Cash and SGOV',
            marketValue: 5_000,
            backingValue: 5_000,
            freeValue: 0,
          }),
        ])
      )
      expect(segs.map((s) => s.label)).toEqual(['Cash and SGOV · backing puts'])
    })

    it('treats a missing layer the same as an unpriced one', () => {
      expect(baseRoleSegments(bookWithBase([]))).toEqual([])
    })
  })
})
