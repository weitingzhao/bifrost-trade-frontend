import { describe, expect, it } from 'vitest'
import { buildReadingMetrics } from '@/utils/performanceReading'
import type { PerformanceResponse } from '@/types/trading'
import { splitReading } from '@/utils/performanceHeroes'

// Invented figures — never copied from an account.
const perf = {
  summary: {
    total_pnl: 1200,
    net_pnl: 900,
    total_unrealized_pnl: 300,
    total_realized_pnl: 950,
    total_commission: 50,
    win_count: 6,
    loss_count: 4,
    trade_count: 18,
    profit_factor: 1.5,
    avg_win: 250,
    avg_loss: -120,
    max_drawdown: 400,
    return_pct: 1.2,
  },
  transaction: { net_cash_flow: -100 },
} as unknown as PerformanceResponse

describe('the Performance hero row (Rev .82)', () => {
  it('promotes the Profitability group and leaves Consistency and Risk in the strip', () => {
    const { heroes, strip } = splitReading(buildReadingMetrics(perf), 'this month')
    expect(heroes.map((h) => h.label)).toEqual(['Total P&L', 'Realized', 'Unrealized', 'Net of fees'])
    // Nothing printed twice: the five promoted metrics leave the strip.
    expect(strip).toHaveLength(7)
    expect(strip.some((m) => /Realized|Unrealized|Net of fees|Commissions|Profitability/.test(m.label))).toBe(false)
  })

  it('puts commissions under Net of fees and keeps Unrealized honest about its range', () => {
    const { heroes } = splitReading(buildReadingMetrics(perf), 'this month')
    expect(heroes[3].sub).toBe('commissions −$50')
    expect(heroes[2].sub).toContain('not limited to the range')
    expect(heroes[0].sub).toContain('this month')
  })

  it('draws no hero when there is no summary', () => {
    expect(splitReading(buildReadingMetrics(undefined), 'this month')).toEqual({ heroes: [], strip: [] })
  })
})
