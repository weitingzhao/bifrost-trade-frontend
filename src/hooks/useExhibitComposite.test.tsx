// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useExhibitComposite } from './useExhibitComposite'

const EXHIBITS = [
  {
    lens: 'vrp',
    symbol: 'MSFT',
    as_of: '2026-09-08',
    freshness: 'fresh',
    readings: {},
    history_summary: {},
    caveats: [],
    lens_id: 'vrp',
  },
  // The ribbon asks for the Wave 15 alias; the lab reads the registry id.
  {
    lens: 'terrain',
    symbol: 'MSFT',
    as_of: '2026-09-08',
    freshness: 'fresh',
    readings: {},
    history_summary: {},
    caveats: [],
    lens_id: 'terrain_regime',
  },
]

function wrap(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

describe('useExhibitComposite', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('asks once and seeds the per-lens cache the hub sections read', async () => {
    const fetchMock = vi.fn(async (url: string) => ({
      url,
      ok: true,
      json: async () => ({ ok: true, data: { exhibits: EXHIBITS } }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = renderHook(() => useExhibitComposite(['vrp', 'terrain'], ' msft '), {
      wrapper: wrap(qc),
    })

    await waitFor(() => expect(result.current.data).toHaveLength(2))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('symbol=MSFT&lenses=vrp%2Cterrain')
    // Under the name asked for…
    expect(qc.getQueryData(QUERY_KEYS.research.exhibit('vrp', 'MSFT'))).toMatchObject({
      lens: 'vrp',
    })
    expect(qc.getQueryData(QUERY_KEYS.research.exhibit('terrain', 'MSFT'))).toMatchObject({
      lens: 'terrain',
    })
    // …and under the registry id, so the lab that reads `terrain_regime` is warm too.
    expect(qc.getQueryData(QUERY_KEYS.research.exhibit('terrain_regime', 'MSFT'))).toMatchObject({
      lens: 'terrain',
    })
  })

  it('asks nothing without a symbol', () => {
    const fetchMock = vi.fn<(url: string) => Promise<unknown>>()
    vi.stubGlobal('fetch', fetchMock)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    const { result } = renderHook(() => useExhibitComposite(['vrp'], '  '), { wrapper: wrap(qc) })

    expect(result.current.fetchStatus).toBe('idle')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
