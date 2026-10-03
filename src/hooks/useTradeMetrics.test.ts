/**
 * The loader restarts only when the *ids* change (PROD 2026-09-28).
 *
 * Trading › Rules rebuilt its instance array every render. Keyed on the
 * array's identity, the loader cancelled and restarted on every render —
 * and every landed chunk re-rendered the page — so it fetched the first
 * ten instances 65 times in 13 s and never reached the rest.
 *
 * And a restart that does happen costs no requests: a tab still running the
 * pre-fix bundle kept that loop on the PROD primary for over two hours.
 */
import { createElement, type ReactNode } from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Trade } from '@/types/positions'
import { QUERY_KEYS } from '@/constants/queryKeys'

vi.mock('@/api/trading', () => ({
  fetchTradePerformance: vi.fn(async () => ({ summary: {} })),
  fetchTradeExecutions: vi.fn(async () => ({ executions: [] })),
}))
vi.mock('@/utils/ledger/fetchOptionStockLinkMap', () => ({
  fetchOptionStockLinkMapForExecutions: vi.fn(async () => ({})),
}))

import { fetchTradeExecutions } from '@/api/trading'
import { useTradeMetrics } from './useTradeMetrics'

const make = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ trade_id: i + 1 }) as unknown as Trade)

const withClient = (client: QueryClient) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client }, children)
  }

const allReady = (m: Map<number, { status: string }>) => [...m.values()].every((e) => e.status === 'ready')

describe('useTradeMetrics', () => {
  beforeEach(() => vi.mocked(fetchTradeExecutions).mockClear())

  it('loads every instance once when the caller hands a new array each render', async () => {
    const { result, rerender } = renderHook(({ list }) => useTradeMetrics(list), {
      initialProps: { list: make(12) },
      wrapper: withClient(new QueryClient()),
    })
    // A caller that rebuilds its array every render, same ids each time.
    for (let k = 0; k < 6; k++) rerender({ list: make(12) })
    await waitFor(() => expect(allReady(result.current)).toBe(true))
    expect(vi.mocked(fetchTradeExecutions)).toHaveBeenCalledTimes(12)
  })

  it('a remount over the same ids reads what is held instead of the network', async () => {
    const client = new QueryClient()
    for (let mount = 0; mount < 3; mount++) {
      const { result, unmount } = renderHook(() => useTradeMetrics(make(12)), {
        wrapper: withClient(client),
      })
      await waitFor(() => expect(allReady(result.current)).toBe(true))
      unmount()
    }
    expect(vi.mocked(fetchTradeExecutions)).toHaveBeenCalledTimes(12)
  })

  it('reads again after a write invalidates the executions it was derived from', async () => {
    const client = new QueryClient()
    const first = renderHook(() => useTradeMetrics(make(3)), { wrapper: withClient(client) })
    await waitFor(() => expect(allReady(first.result.current)).toBe(true))
    first.unmount()

    await client.invalidateQueries({ queryKey: QUERY_KEYS.trading.executions })
    const second = renderHook(() => useTradeMetrics(make(3)), { wrapper: withClient(client) })
    await waitFor(() => expect(vi.mocked(fetchTradeExecutions)).toHaveBeenCalledTimes(6))
    await waitFor(() => expect(allReady(second.result.current)).toBe(true))
  })
})
