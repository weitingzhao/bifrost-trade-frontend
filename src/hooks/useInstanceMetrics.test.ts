/**
 * The loader restarts only when the *ids* change (PROD 2026-09-28).
 *
 * Trade › Rules rebuilt its instance array every render. Keyed on the
 * array's identity, the loader cancelled and restarted on every render —
 * and every landed chunk re-rendered the page — so it fetched the first
 * ten instances 65 times in 13 s and never reached the rest.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { StrategyInstance } from '@/types/positions'

vi.mock('@/api/trading', () => ({
  fetchInstancePerformance: vi.fn(async () => ({ summary: {} })),
  fetchInstanceExecutions: vi.fn(async () => ({ executions: [] })),
}))
vi.mock('@/utils/ledger/fetchOptionStockLinkMap', () => ({
  fetchOptionStockLinkMapForExecutions: vi.fn(async () => ({})),
}))

import { fetchInstanceExecutions } from '@/api/trading'
import { useInstanceMetrics } from './useInstanceMetrics'

const make = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ strategy_instance_id: i + 1 }) as unknown as StrategyInstance)

describe('useInstanceMetrics', () => {
  beforeEach(() => vi.mocked(fetchInstanceExecutions).mockClear())

  it('loads every instance once when the caller hands a new array each render', async () => {
    const { result, rerender } = renderHook(({ list }) => useInstanceMetrics(list), {
      initialProps: { list: make(12) },
    })
    // A caller that rebuilds its array every render, same ids each time.
    for (let k = 0; k < 6; k++) rerender({ list: make(12) })
    await waitFor(() =>
      expect([...result.current.values()].every((e) => e.status === 'ready')).toBe(true),
    )
    expect(vi.mocked(fetchInstanceExecutions)).toHaveBeenCalledTimes(12)
  })
})
