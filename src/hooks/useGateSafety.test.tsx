// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QUERY_KEYS } from '@/constants/queryKeys'
import { gatesFixture } from '@/components/strategy/gates/gateDefaults.fixture'
import { useGateSafetyDefaults } from './useGateSafety'

function wrap(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

function answer(status: number, body: unknown) {
  return vi.fn<(url: string) => Promise<Response>>(async () => new Response(JSON.stringify(body), { status }))
}

describe('useGateSafetyDefaults', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reads GET /strategies/gate-safety/defaults on the strategy domain and caches it under its own key', async () => {
    const fetchMock = answer(200, { gates: gatesFixture() })
    vi.stubGlobal('fetch', fetchMock)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useGateSafetyDefaults(), { wrapper: wrap(qc) })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/strategy/strategies/gate-safety/defaults')
    expect(result.current.data?.gates).toEqual(gatesFixture())
    expect(qc.getQueryData(QUERY_KEYS.strategy.gateSafetyDefaults)).toEqual({ gates: gatesFixture() })
    // outside the gate list's key, so a gate write does not refetch it
    expect(QUERY_KEYS.strategy.gateSafetyDefaults.slice(0, 2)).not.toEqual(QUERY_KEYS.strategy.gateSafety)
  })

  it('is an error on a non-2xx — nothing to fall back to', async () => {
    vi.stubGlobal('fetch', answer(503, { detail: 'down' }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useGateSafetyDefaults(), { wrapper: wrap(qc) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    // The server's reason (TD-50: the shared client reads detail ?? error ?? message).
    expect(result.current.error?.message).toBe('down')
    expect(result.current.data).toBeUndefined()
  })

  it('is an error when the answer lacks a family, rather than seeding half a set', async () => {
    const partial = gatesFixture() as Record<string, unknown>
    delete partial.guard
    vi.stubGlobal('fetch', answer(200, { gates: partial }))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useGateSafetyDefaults(), { wrapper: wrap(qc) })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toMatch(/no complete gates object/)
  })

  it('does not fetch while disabled (the sheet is not creating)', async () => {
    const fetchMock = answer(200, { gates: gatesFixture() })
    vi.stubGlobal('fetch', fetchMock)
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useGateSafetyDefaults(false), { wrapper: wrap(qc) })

    await new Promise((r) => setTimeout(r, 20))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.fetchStatus).toBe('idle')
  })
})
