import { describe, expect, it } from 'vitest'
import {
  formatInstanceListPeriodCell,
  holdDaysForAnnualization,
  computeSymbolGroupRollup,
  computeInstanceExecDerivedNetPnl,
  underlyingCostSellOptUsd,
  type InstanceListMetricsEntry,
} from './instanceListMetrics'
import type { StrategyInstance } from '@/types/positions'
import type { PerformanceSummary } from '@/types/trading'

describe('holdDaysForAnnualization', () => {
  it('uses inclusive calendar days with 1-day floor', () => {
    expect(holdDaysForAnnualization(0)).toBe(1)
    expect(holdDaysForAnnualization(27)).toBe(28)
  })
})

describe('formatInstanceListPeriodCell', () => {
  it('formats compact period like legacy', () => {
    const cell = formatInstanceListPeriodCell('2026-04-17', '2026-05-15', 28, undefined)
    expect(cell.yearLabel).toBe('2026')
    expect(cell.rangeLabel).toBe('(04.17~5.15)')
    expect(cell.dayLabel).toBe('29d')
  })

  it('handles missing dates', () => {
    const cell = formatInstanceListPeriodCell(null, null, null, undefined)
    expect(cell.yearLabel).toBe('—')
    expect(cell.rangeLabel).toBe('(—~—)')
  })
})

describe('computeInstanceExecDerivedNetPnl', () => {
  it('returns null for empty slice', () => {
    expect(computeInstanceExecDerivedNetPnl([], 0)).toBeNull()
  })
})

describe('computeSymbolGroupRollup', () => {
  it('aggregates net and annual pct across ready rows', () => {
    const inst = {
      strategy_instance_id: 1,
      strategy_opportunity_id: 10,
      account_id: 'U1',
      opened_at: '2026-01-01',
      opened_at_epoch: 1735689600,
      executions_count: 2,
    } as StrategyInstance
    const summary = {
      net_pnl: 100,
      total_commission: 1,
      trade_count: 2,
      win_count: 1,
      loss_count: 0,
      win_rate: 1,
      total_unrealized_pnl: 0,
    } satisfies PerformanceSummary
    const metrics = new Map<number, InstanceListMetricsEntry>([
      [
        1,
        {
          status: 'ready',
          summary,
          sliced: [
            {
              account_executions_id: 1,
              account_id: 'U1',
              contract_key: 'NVDA|OPT|20260515|100|C',
              symbol: 'NVDA',
              sec_type: 'OPT',
              side: 'Sell',
              qty: 1,
              quantity: 1,
              strike: 100,
              report_date: '2026-01-01',
              price: 5,
              time: null,
              commission: 0,
            },
            {
              account_executions_id: 2,
              account_id: 'U1',
              contract_key: 'NVDA|OPT|20260515|100|C',
              symbol: 'NVDA',
              sec_type: 'OPT',
              side: 'Buy',
              qty: 1,
              quantity: 1,
              strike: 100,
              report_date: '2026-01-28',
              price: 3,
              time: null,
              commission: 0,
            },
          ],
          linkedStockSlippage: 0,
          execDerivedNetPnl: 200,
          maxRiskUsd: 10_000,
        },
      ],
    ])
    const rollup = computeSymbolGroupRollup([inst], metrics)
    expect(rollup.totalNet).toBe(200)
    expect(rollup.sumUnderlying).toBe(10_000)
    expect(rollup.groupAnnualPct).not.toBeNull()
  })
})

describe('underlyingCostSellOptUsd', () => {
  it('sums sell-side OPT notional', () => {
    const total = underlyingCostSellOptUsd([
      {
        account_executions_id: 1,
        account_id: 'U1',
        contract_key: 'X|OPT|20260101|50|C',
        symbol: 'X',
        sec_type: 'OPT',
        side: 'Sell',
        qty: 2,
        quantity: 2,
        strike: 50,
        price: 1,
        time: null,
      },
    ])
    expect(total).toBe(10_000)
  })
})
