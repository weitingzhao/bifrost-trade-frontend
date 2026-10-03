/**
 * TD-50 batch 2: the Trade research app's client (api/research.ts, research/optionDiscovery.ts)
 * goes through requestJson. Each function keeps how it fails: the throwing ones throw the
 * server's detail (or label + status); the `{ ok: false, error }` ones return it; a network
 * error still throws where it threw before; available-dates still reads any failure as no
 * dates. Symbols and messages are invented.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as research from '@/api/research'
import { fetchLiquiditySummary, fetchOptionSnapshotsPg, fetchRelativeValue } from '@/api/research/optionDiscovery'
import type { ScreenerFilters } from '@/types/research'

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

const refusal = (detail: string, status = 400) => new Response(JSON.stringify({ detail }), { status })
const bodiless = (status = 503) => new Response('', { status })

const THROWING: [string, () => Promise<unknown>, string][] = [
  ['screener', () => research.fetchScreenerResults({ structure_type: 'cash_secured_put', symbols: ['ZZQ'] } as unknown as ScreenerFilters), 'POST /research/screener'],
  ['ticker overview', () => research.fetchTickerOverview('zzq'), 'GET /research/data/ticker-overview'],
  ['fundamental conditions', () => research.fetchSymbolFundamentalConditions('zzq'), 'GET /research/data/readiness/fundamental-conditions'],
  ['technical conditions', () => research.fetchSymbolTechnicalConditions('zzq'), 'GET /research/data/readiness/symbol-technical-conditions'],
  ['fundamental raw data', () => research.fetchSymbolFundRawData('zzq'), 'GET /research/data/readiness/symbol-fundamental-raw-data'],
]

describe('throwing readers', () => {
  it.each(THROWING)('%s throws the server detail', async (_n, call) => {
    fetchMock.mockResolvedValueOnce(refusal('Invented refusal.'))
    await expect(call()).rejects.toThrow('Invented refusal.')
  })
  it.each(THROWING)('%s names itself and the status with no reason', async (_n, call, label) => {
    fetchMock.mockResolvedValueOnce(bodiless())
    await expect(call()).rejects.toThrow(`${label}: HTTP 503`)
  })
})

describe('readers that return the refusal', () => {
  it('greeks returns ok: false with the detail, and the label when there is none', async () => {
    fetchMock.mockResolvedValueOnce(refusal('no db config', 503))
    expect((await research.fetchGreeks({ symbol: 'ZZQ', trade_date: '2031-01-02' })).error).toBe('no db config')
    fetchMock.mockResolvedValueOnce(bodiless())
    expect((await research.fetchGreeks({ symbol: 'ZZQ', trade_date: '2031-01-02' })).error).toBe('GET /research/greeks: HTTP 503')
  })

  it('statements and pcr return the empty sheet with the reason', async () => {
    fetchMock.mockResolvedValueOnce(refusal('symbol is required'))
    expect((await research.fetchSymbolStatements('ZZQ')).error).toBe('symbol is required')
    fetchMock.mockResolvedValueOnce(refusal('PostgreSQL not configured', 503))
    const pcr = await research.fetchSymbolOptionPcr('ZZQ')
    expect([pcr.ok, pcr.error, pcr.trend]).toEqual([false, 'PostgreSQL not configured', []])
  })

  it('snapshots, liquidity and relative value carry the reason', async () => {
    fetchMock.mockResolvedValueOnce(bodiless(404))
    expect((await fetchOptionSnapshotsPg('ZZQ', '2031-01-17')).error).toBe('GET /research/option-snapshots: HTTP 404')
    fetchMock.mockResolvedValueOnce(refusal('bad right'))
    expect(await fetchLiquiditySummary('ZZQ', '2031-01-17', 10, 'X')).toMatchObject({ ok: false, error: 'bad right' })
    fetchMock.mockResolvedValueOnce(refusal('PostgreSQL not configured', 503))
    expect(await fetchRelativeValue('ZZQ', '2031-01-17', 10, 'P')).toMatchObject({ ok: false, error: 'PostgreSQL not configured' })
  })

  it('a network error still throws from statements and snapshots, as before', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(research.fetchSymbolStatements('ZZQ')).rejects.toThrow('Failed to fetch')
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(fetchOptionSnapshotsPg('ZZQ', '2031-01-17')).rejects.toThrow('Failed to fetch')
  })

  it('pcr still turns a network error into its error field, as before', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    expect((await research.fetchSymbolOptionPcr('ZZQ')).error).toBe('Failed to fetch')
  })

  it('available dates: a list on success; a failure throws (batch 4, Owner 10-03)', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, symbol: 'ZZQ', dates: ['2031-01-02'] })))
    expect(await research.fetchGreeksAvailableDates('zzq')).toEqual(['2031-01-02'])
    fetchMock.mockResolvedValueOnce(bodiless())
    await expect(research.fetchGreeksAvailableDates('zzq')).rejects.toThrow('GET /research/greeks/available-dates: HTTP 503')
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, symbol: 'ZZQ', dates: [] })))
    expect(await research.fetchGreeksAvailableDates('zzq')).toEqual([])
  })
})
