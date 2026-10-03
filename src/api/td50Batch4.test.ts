/**
 * TD-50 batch 4 (Owner 10-03): of the reads that turned any failure into "nothing",
 * the symbol search and the greeks dates now say they failed; the template meta-value
 * suggestions and the market-streams symbol order keep their fallback on purpose (a refusal
 * gives no suggestions / the default order; a network error still throws, as before).
 * Also: six Research readers awaited the request before validating it (they used to hand the
 * validator a Promise, so every check reported drift). Invented values throughout.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchTickerSearch } from '@/api/marketData'
import { fetchMetaValueOptions } from '@/api/strategy'
import { fetchMarketStreamsSymbolOrder } from '@/api/portfolio'
import { fetchResearchDoc } from '@/api/research/docs'

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

describe('symbol search says it failed', () => {
  it('returns the hits on success', async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: true, results: [{ symbol: 'ZZQ', name: 'Zz Corp' }] }))
    expect((await fetchTickerSearch('zz')).map((h) => h.symbol)).toEqual(['ZZQ'])
  })
  it('throws the plugin reason, or its label and status', async () => {
    fetchMock.mockResolvedValueOnce(json({ detail: 'database unavailable' }, 503))
    await expect(fetchTickerSearch('zz')).rejects.toThrow('database unavailable')
    fetchMock.mockResolvedValueOnce(new Response('', { status: 502 }))
    await expect(fetchTickerSearch('zz')).rejects.toThrow('Symbol search: HTTP 502')
    fetchMock.mockResolvedValueOnce(json({ ok: false, error: 'search index missing' }))
    await expect(fetchTickerSearch('zz')).rejects.toThrow('search index missing')
  })
  it('an empty needle asks nothing', async () => {
    expect(await fetchTickerSearch('  ')).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('kept fallbacks', () => {
  it('meta-value suggestions: a refusal gives none, a network error throws', async () => {
    fetchMock.mockResolvedValueOnce(json({ detail: 'no such template' }, 404))
    expect(await fetchMetaValueOptions('zz_put', 'dte')).toEqual({ options: [] })
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(fetchMetaValueOptions('zz_put', 'dte')).rejects.toThrow('Failed to fetch')
  })
  it('symbol order: a refusal is the default order, a network error throws', async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: true, order: { Core: ['ZZQ'] } }))
    expect(await fetchMarketStreamsSymbolOrder()).toEqual({ ok: true, order: { Core: ['ZZQ'] } })
    fetchMock.mockResolvedValueOnce(json({ detail: 'Postgres required.' }, 503))
    expect(await fetchMarketStreamsSymbolOrder()).toEqual({ ok: false })
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(fetchMarketStreamsSymbolOrder()).rejects.toThrow('Failed to fetch')
  })
})

describe('validators get the data, not a Promise', () => {
  // A complete, invented document: before the fix the validator saw a Promise and warned
  // on every call (and reported drift in prod) whatever the server sent.
  const DOC = { slug: 'zz', title: 'Zz', version: '1', updated: null, status: null, markdown: '# Zz', path: 'docs/zz.md' }

  it('a valid document passes its schema without a drift warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce(json({ ok: true, data: DOC }))
    expect(await fetchResearchDoc('zz')).toMatchObject({ slug: 'zz' })
    expect(warn.mock.calls.filter((c) => String(c[0]).includes('research/docs'))).toEqual([])
  })

  it('a document missing a field is still reported (the check now sees the data)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce(json({ ok: true, data: { ...DOC, path: undefined } }))
    await fetchResearchDoc('zz')
    expect(warn.mock.calls.some((c) => String(c[0]).includes('research/docs'))).toBe(true)
  })
})
