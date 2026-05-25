import { describe, it, expect, vi, afterEach } from 'vitest'
import { computeUnderlyingCost, computeHoldDays, computeInstanceMetrics } from './instanceCalc'
import type { RawExecution, PerformanceSummary } from '@/types/trading'

function makeExec(overrides: Partial<RawExecution> = {}): RawExecution {
  return {
    account_executions_id: 1,
    side: 'SLD',
    quantity: -1,
    price: 3.5,
    commission: 1,
    sec_type: 'OPT',
    strike: 150,
    option_right: 'C',
    realized_pnl: null,
    net_cash: null,
    ...overrides,
  }
}

function makeSummary(overrides: Partial<PerformanceSummary> = {}): PerformanceSummary {
  return {
    net_pnl: 500,
    total_commission: 10,
    trade_count: 2,
    win_count: 1,
    loss_count: 1,
    win_rate: 50,
    total_unrealized_pnl: 0,
    ...overrides,
  }
}

// ─── computeUnderlyingCost ──────────────────────────────────────────────────

describe('computeUnderlyingCost', () => {
  it('returns null when no executions', () => {
    expect(computeUnderlyingCost([])).toBeNull()
  })

  it('returns null when no OPT sell-side executions', () => {
    const execs = [
      makeExec({ sec_type: 'STK', side: 'BUY' }),
      makeExec({ sec_type: 'OPT', side: 'BOT' }),
    ]
    expect(computeUnderlyingCost(execs)).toBeNull()
  })

  it('computes cost for a single short OPT: strike × abs(qty) × 100', () => {
    const execs = [makeExec({ side: 'SLD', strike: 150, quantity: -2 })]
    expect(computeUnderlyingCost(execs)).toBe(150 * 2 * 100)
  })

  it('aggregates across multiple sell-side OPT legs', () => {
    const execs = [
      makeExec({ side: 'SLD', strike: 150, quantity: -1 }),
      makeExec({ side: 'SELL', strike: 160, quantity: -3 }),
    ]
    expect(computeUnderlyingCost(execs)).toBe(150 * 1 * 100 + 160 * 3 * 100)
  })

  it('ignores STK rows even if side is SELL', () => {
    const execs = [
      makeExec({ sec_type: 'STK', side: 'SELL', strike: 150, quantity: -100 }),
      makeExec({ sec_type: 'OPT', side: 'SLD', strike: 200, quantity: -2 }),
    ]
    expect(computeUnderlyingCost(execs)).toBe(200 * 2 * 100)
  })

  it('ignores OPT rows with null strike', () => {
    const execs = [makeExec({ side: 'SLD', strike: null, quantity: -1 })]
    expect(computeUnderlyingCost(execs)).toBeNull()
  })
})

// ─── computeHoldDays ───────────────────────────────────────────────────────

describe('computeHoldDays', () => {
  afterEach(() => { vi.useRealTimers() })

  it('returns 1 when openedAtEpoch is null', () => {
    expect(computeHoldDays(null)).toBe(1)
  })

  it('returns 1 for same-day open (< 1 day elapsed)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'))
    const epoch = new Date('2025-06-01T08:00:00Z').getTime() / 1000
    expect(computeHoldDays(epoch)).toBe(1)
  })

  it('returns correct day count for past open', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-07-01T00:00:00Z'))
    const epoch = new Date('2025-06-01T00:00:00Z').getTime() / 1000
    expect(computeHoldDays(epoch)).toBe(30)
  })
})

// ─── computeInstanceMetrics ────────────────────────────────────────────────

describe('computeInstanceMetrics', () => {
  afterEach(() => { vi.useRealTimers() })

  it('propagates netPnl, commission, tradeCount from summary', () => {
    const result = computeInstanceMetrics(makeSummary(), [], null)
    expect(result.netPnl).toBe(500)
    expect(result.commission).toBe(10)
    expect(result.tradeCount).toBe(2)
  })

  it('annualPct and returnPct are null when no sell-side OPT (underlyingCost=null)', () => {
    const result = computeInstanceMetrics(makeSummary(), [], null)
    expect(result.underlyingCost).toBeNull()
    expect(result.annualPct).toBeNull()
    expect(result.returnPct).toBeNull()
  })

  it('annualPct and returnPct are null when underlyingCost resolves to 0', () => {
    const execs = [makeExec({ strike: 0, side: 'SLD', quantity: -1 })]
    const result = computeInstanceMetrics(makeSummary(), execs, null)
    expect(result.annualPct).toBeNull()
    expect(result.returnPct).toBeNull()
  })

  it('computes returnPct and annualPct with known inputs', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-07-31T00:00:00Z'))
    const openedAt = new Date('2025-07-01T00:00:00Z').getTime() / 1000

    const execs = [makeExec({ side: 'SLD', strike: 100, quantity: -1 })]
    const summary = makeSummary({ net_pnl: 1000 })
    const result = computeInstanceMetrics(summary, execs, openedAt)

    const underlyingCost = 100 * 1 * 100
    expect(result.underlyingCost).toBe(underlyingCost)
    expect(result.returnPct).toBeCloseTo((1000 / underlyingCost) * 100)
    expect(result.annualPct).toBeCloseTo((1000 / underlyingCost) * (365.25 / 30) * 100)
  })

  it('netPnlPerDay equals netPnl when holdDays=1 (minimum)', () => {
    const result = computeInstanceMetrics(makeSummary({ net_pnl: 300 }), [], null)
    expect(result.holdDays).toBe(1)
    expect(result.netPnlPerDay).toBeCloseTo(300)
  })
})
