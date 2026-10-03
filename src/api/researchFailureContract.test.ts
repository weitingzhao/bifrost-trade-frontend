/**
 * api 0.5.0 (TD-16): the Trade research app refuses with a real status and
 * `{ detail }` instead of a 200 `{ ok: false, error }`. The readers that used to
 * print `error` print `detail` now. Every symbol and message here is invented.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchGreeks, fetchScreenerResults, fetchSymbolStatements } from '@/api/research'
import { fetchLiquiditySummary, fetchOptionSnapshotsPg, fetchRelativeValue } from '@/api/research/optionDiscovery'
import type { ScreenerFilters } from '@/types/research'

function refusal(status: number, detail: string): Response {
  return new Response(JSON.stringify({ detail }), { status })
}

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('research readers show the server detail', () => {
  it('screener throws the detail', async () => {
    fetchMock.mockResolvedValueOnce(refusal(503, 'PostgreSQL not configured'))
    const filters = { structure_type: 'cash_secured_put', symbols: ['ZZQ'] } as unknown as ScreenerFilters
    await expect(fetchScreenerResults(filters)).rejects.toThrow('PostgreSQL not configured')
  })

  it('greeks returns the detail as its error', async () => {
    fetchMock.mockResolvedValueOnce(refusal(503, 'no db config'))
    const res = await fetchGreeks({ symbol: 'ZZQ', trade_date: '2031-01-02' })
    expect(res.ok).toBe(false)
    expect(res.error).toBe('no db config')
    expect(res.rows).toEqual([])
  })

  it('option snapshots return the detail with no rows', async () => {
    fetchMock.mockResolvedValueOnce(refusal(404, 'No strikes to query; provide strikes= or ensure daily last price exists.'))
    const res = await fetchOptionSnapshotsPg('ZZQ', '2031-01-17')
    expect(res.rows).toEqual([])
    expect(res.error).toMatch(/^No strikes to query/)
  })

  it('statements return the detail, not just the status', async () => {
    fetchMock.mockResolvedValueOnce(refusal(503, 'Market Data Plugin down'))
    const res = await fetchSymbolStatements('ZZQ')
    expect(res.ok).toBe(false)
    expect(res.error).toBe('Market Data Plugin down')
  })

  it('liquidity and relative value carry the detail and read as not ok', async () => {
    fetchMock.mockResolvedValueOnce(refusal(400, 'symbol, expiration, strike, and right (C/P) are required'))
    const liq = await fetchLiquiditySummary('ZZQ', '2031-01-17', 10, 'P')
    expect(liq.ok).toBe(false)
    expect(liq.error).toMatch(/required/)
    fetchMock.mockResolvedValueOnce(refusal(503, 'PostgreSQL not configured'))
    const rv = await fetchRelativeValue('ZZQ', '2031-01-17', 10, 'P')
    expect(rv.ok).toBe(false)
    expect(rv.error).toBe('PostgreSQL not configured')
  })
})
