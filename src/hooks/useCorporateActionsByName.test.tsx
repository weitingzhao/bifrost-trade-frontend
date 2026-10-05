// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { useCorporateActionsByName } from './useCorporateActionsByName'

function wrap(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const ROW = {
  symbol: 'ZZZ',
  action_type: 'dividend',
  ex_date: '2026-10-09',
  record_date: null,
  payment_date: null,
  ratio_from: null,
  ratio_to: null,
  amount: 0.1,
  currency: 'USD',
  note: null,
}

describe('useCorporateActionsByName', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keeps the key Corporate Actions has always used, so the Calendar reads its cache', () => {
    expect(QUERY_KEYS.plugin.corporateActions('ZZZ')).toEqual(['market-data', 'corporate-actions', 'ZZZ'])
  })

  it('asks once per name not already cached', async () => {
    const fetchMock = vi.fn<(url: string) => Promise<Response>>(
      async () => new Response(JSON.stringify({ ok: true, symbol: 'YYY', rows: [], count: 0 }), { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    qc.setQueryData(['market-data', 'corporate-actions', 'ZZZ'], { ok: true, symbol: 'ZZZ', rows: [ROW], count: 1 })

    const { result } = renderHook(() => useCorporateActionsByName(['ZZZ', 'YYY']), { wrapper: wrap(qc) })
    await waitFor(() => expect(result.current.every((q) => q.isSuccess)).toBe(true))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('symbol=YYY')
    expect(result.current[0].data?.rows[0]?.ex_date).toBe('2026-10-09')
  })
})
