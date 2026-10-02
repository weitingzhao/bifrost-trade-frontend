// @vitest-environment jsdom
/**
 * The Watchlist page's list and optionable changes are PATCHes of the one
 * field (api 0.3.0). The None list is an explicit `category_id: null`.
 * Contract keys here are invented.
 */
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WatchlistItem } from '@/types/market'

const patchWatchlistItem = vi.fn(async (contractKey?: string) => ({ contract_key: contractKey }))
const postWatchlistItem = vi.fn(async () => ({ ok: true }))
vi.mock('@/api/market', () => ({
  patchWatchlistItem: (...a: unknown[]) => patchWatchlistItem(...(a as [string])),
  postWatchlistItem: () => postWatchlistItem(),
  deleteWatchlistItem: vi.fn(),
}))
vi.mock('@/lib/shellNotify', () => ({ notify: vi.fn() }))

import { useWatchlistMutations } from './useStockWatchlist'

const ITEM: WatchlistItem = {
  contract_key: 'ZZQ|STK|||',
  symbol: 'ZZQ',
  sec_type: 'STK',
  optionable: false,
  category: 'Watching',
  category_id: 4,
  source: 'manual',
  created_at: 0,
  display_label: 'ZZQ — kept label',
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => {
  patchWatchlistItem.mockClear()
  postWatchlistItem.mockClear()
})

describe('useWatchlistMutations · upsertFromItem', () => {
  it('moves a row to the None list with an explicit category_id: null, nothing else', async () => {
    const { result } = renderHook(() => useWatchlistMutations(), { wrapper })
    await act(() => result.current.upsertFromItem(ITEM, { category_id: null }))
    expect(patchWatchlistItem).toHaveBeenCalledWith('ZZQ|STK|||', { category_id: null })
    expect(postWatchlistItem).not.toHaveBeenCalled()
  })

  it('toggles optionable alone', async () => {
    const { result } = renderHook(() => useWatchlistMutations(), { wrapper })
    await act(() => result.current.upsertFromItem(ITEM, { optionable: true }))
    expect(patchWatchlistItem).toHaveBeenCalledWith('ZZQ|STK|||', { optionable: true })
  })
})
