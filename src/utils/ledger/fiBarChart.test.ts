import { describe, expect, it } from 'vitest'
import {
  fiBarBucketForTimeRange,
  fiBucketLabel,
  monthKeyToFiBucketKey,
  buildFiBarChart,
} from '@/utils/ledger/fiBarChart'
import type { ByDayRangeData } from '@/types/trading'

function emptyByDay(fi: Record<string, number>): ByDayRangeData {
  return {
    opt: {},
    stock: {},
    stocks: {},
    fixed_income: {},
    cash_like: {},
    stkBucketNotional: {
      stocks: {},
      fixed_income: fi,
      cash_like: {},
    },
  }
}

describe('fiBarBucketForTimeRange', () => {
  it('uses month / quarter / year grain by range', () => {
    expect(fiBarBucketForTimeRange('quarter')).toBe('month')
    expect(fiBarBucketForTimeRange('halfyear')).toBe('month')
    expect(fiBarBucketForTimeRange('year')).toBe('quarter')
    expect(fiBarBucketForTimeRange('3year')).toBe('year')
  })
})

describe('monthKeyToFiBucketKey', () => {
  it('maps months into quarter and year keys', () => {
    expect(monthKeyToFiBucketKey('2026-01', 'month')).toBe('2026-01')
    expect(monthKeyToFiBucketKey('2026-01', 'quarter')).toBe('2026-Q1')
    expect(monthKeyToFiBucketKey('2026-04', 'quarter')).toBe('2026-Q2')
    expect(monthKeyToFiBucketKey('2025-12', 'year')).toBe('2025')
  })
})

describe('fiBucketLabel', () => {
  it('formats quarter labels', () => {
    expect(fiBucketLabel('2025-Q4', 'quarter')).toBe("Q4 '25")
    expect(fiBucketLabel('2026', 'year')).toBe('2026')
  })
})

describe('buildFiBarChart', () => {
  it('aggregates Year range to four quarterly bars', () => {
    const fi: Record<string, number> = {}
    // Oct 2025 – Sep 2026 (year ending Sep 2026)
    for (const mk of [
      '2025-10', '2025-11', '2025-12',
      '2026-01', '2026-02', '2026-03',
      '2026-04', '2026-05', '2026-06',
      '2026-07', '2026-08', '2026-09',
    ]) {
      fi[`${mk}-15`] = 100
    }
    const chart = buildFiBarChart({
      byDayRangeData: emptyByDay(fi),
      fiPositionMarketValue: null,
      timeRange: 'year',
      calendarMonth: '2026-09',
      growthUnit: 'usd',
    })
    expect(chart).not.toBeNull()
    expect(chart!.bucket).toBe('quarter')
    expect(chart!.bars).toHaveLength(4)
    expect(chart!.bars.map((b) => b.key)).toEqual([
      '2025-Q4', '2026-Q1', '2026-Q2', '2026-Q3',
    ])
    expect(chart!.bars[0]!.monthlyNotional).toBeCloseTo(300, 6)
  })

  it('keeps monthly bars for Quarter range', () => {
    const fi: Record<string, number> = {
      '2026-07-01': 10,
      '2026-08-01': 20,
      '2026-09-01': 30,
    }
    const chart = buildFiBarChart({
      byDayRangeData: emptyByDay(fi),
      fiPositionMarketValue: null,
      timeRange: 'quarter',
      calendarMonth: '2026-09',
      growthUnit: 'usd',
    })
    expect(chart!.bucket).toBe('month')
    expect(chart!.bars).toHaveLength(3)
  })
})
