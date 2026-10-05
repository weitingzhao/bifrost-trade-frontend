// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import type { PerformanceDayPnLBulkResult, PerformanceResponse } from '@/types/trading'

const bulk = vi.hoisted(() => ({ result: null as PerformanceDayPnLBulkResult | null }))

vi.mock('@/utils/ledger/performanceBulk', () => ({
  loadPerformanceDayPnLBulk: vi.fn(async () => {
    if (!bulk.result) throw new Error('bulk unavailable')
    return bulk.result
  }),
}))
vi.mock('./useMonitorStatus', () => ({ useMonitorStatus: () => ({ data: undefined }) }))

import { usePerformanceDayCells } from './usePerformanceDayCells'

function wrap(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const PARAMS = { timeRange: 'month' as const, calendarMonth: '2026-09', strategyOpportunityId: null, tradeId: null }

const FALLBACK = {
  summary: {},
  calendar_by_sec_type: [{ period_start_ts: 0, period_label: '2026-09-04', sec_type: 'OPT', pnl: 26, commission: 1, net_pnl: 25, pair_count: 1 }],
} as unknown as PerformanceResponse

describe('usePerformanceDayCells', () => {
  it('draws the bulk cells when the bulk has loaded — R and U per tab, as Performance prints them', async () => {
    bulk.result = {
      calendarDayPnLByAsset: {
        options: { '2026-09-04': { realized: 120, unrealized: -30 } },
        stocks: { '2026-09-04': { realized: 15, unrealized: 0 } },
        fixed_income: {},
        cash_like: {},
      },
      calendarStkNotionalByBucket: { stocks: { '2026-09-04': 900 }, fixed_income: {}, cash_like: {} },
    } as unknown as PerformanceDayPnLBulkResult
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => usePerformanceDayCells(PARAMS, FALLBACK), { wrapper: wrap(qc) })
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true))
    expect(result.current.dayMapByTab.options.get('2026-09-04')).toEqual({ realized: 120, unrealized: -30, fillCount: 0, notional: 0 })
    expect(result.current.dayMapByTab.stocks.get('2026-09-04')).toEqual({ realized: 15, unrealized: 0, fillCount: 0, notional: 900 })
  })

  it('falls back to the summary endpoint’s per-sec-type calendar while the bulk is absent', async () => {
    bulk.result = null
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => usePerformanceDayCells(PARAMS, FALLBACK), { wrapper: wrap(qc) })
    await waitFor(() => expect(result.current.query.isError).toBe(true))
    expect(result.current.dayMapByTab.options.get('2026-09-04')).toEqual({ realized: 25, unrealized: 0, fillCount: 1, notional: 0 })
  })

  it('reads the bulk alone when no fallback is given', async () => {
    bulk.result = null
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => usePerformanceDayCells(PARAMS), { wrapper: wrap(qc) })
    await waitFor(() => expect(result.current.query.isError).toBe(true))
    expect(result.current.dayMapByTab.options.size).toBe(0)
  })
})
