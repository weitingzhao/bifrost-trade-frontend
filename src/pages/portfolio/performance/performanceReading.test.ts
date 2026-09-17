import { describe, expect, it } from 'vitest'
import type { PerformanceResponse } from '@/types/trading'
import { buildReadingMetrics, fmtSignedUsd0 } from './performanceReading'

// Invented figures.
const perf = {
  summary: {
    total_pnl: 1500,
    total_realized_pnl: 1200,
    net_pnl: 1100,
    total_commission: 100,
    total_unrealized_pnl: 400,
    trade_count: 10,
    win_count: 4,
    loss_count: 6,
    win_rate: 0.4,
    profit_factor: 1.5,
    max_drawdown: 300,
    avg_win: 500,
    avg_loss: -200,
    return_pct: 1.25,
  },
  transaction: { net_cash_flow: -50, start_equity: 10000, capital_base: 9975 },
} as PerformanceResponse

describe('buildReadingMetrics', () => {
  const m = Object.fromEntries(buildReadingMetrics(perf).map(x => [x.label, x]))

  it('reads win rate over the fills that closed something, not over every fill', () => {
    // trade_count counts opening fills too: 4 wins and 6 losses of 10 fills is 40%,
    // and the same 10 closing fills among 25 fills would still be 40%.
    expect(m['Consistency · win rate · closed trades'].value).toBe('40.0%')
    const withOpens = { ...perf, summary: { ...perf.summary, trade_count: 25, win_rate: 0.16 } }
    const w = buildReadingMetrics(withOpens).find(x => x.label.startsWith('Consistency'))
    expect(w?.value).toBe('40.0%')
  })

  it('shows commissions as the cost they are', () => {
    expect(m.Commissions.value).toBe('−$100')
  })

  it('reads realized from the field the API sends, not net', () => {
    expect(m.Realized.value).toBe('+$1,200')
  })

  it('carries eleven metrics and the excluded cash flows, in three groups', () => {
    const all = buildReadingMetrics(perf)
    expect(all).toHaveLength(12)
    expect(all.filter(x => x.groupHead).map(x => x.label.split(' · ')[0])).toEqual(['Profitability', 'Consistency', 'Risk'])
    expect(m['Risk · max drawdown'].value).toBe('−$300')
    expect(m['Cash flows excluded'].value).toBe('−$50')
  })

  it('reads nothing without a summary', () => {
    expect(buildReadingMetrics(undefined)).toEqual([])
  })
})

describe('fmtSignedUsd0', () => {
  it('signs whole dollars and leaves zero unsigned', () => {
    expect(fmtSignedUsd0(1234.6)).toBe('+$1,235')
    expect(fmtSignedUsd0(-399)).toBe('−$399')
    expect(fmtSignedUsd0(0.2)).toBe('$0')
    expect(fmtSignedUsd0(null)).toBe('—')
  })
})
