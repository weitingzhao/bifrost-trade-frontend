/**
 * TD-50 batch 3a: the market-data plugin readers go through requestJson. The plugin answers
 * a failure with a real status and `detail` (HTTPException; 503 when its database is down),
 * so these keep failing the way they did — they throw — but in the plugin's own words.
 * iv-percentile's 404 (no rows for the symbol) is still "no reading"; greeks coverage still
 * returns `{ ok: false, error }`. Symbols, tickers and messages are invented.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCoverageQuality } from '@/api/marketDataCoverage'
import { fetchIvPercentile } from '@/api/research/ivRadar'
import { fetchDailyClosesMulti, fetchOptionDailyBars, fetchOptionDailyByExpiry, fetchStockDailyCloses } from '@/api/marketData/dailyBars'
import { fetchCorporateActions } from '@/api/marketData/corporateActions'
import { fetchChainExpirations, fetchOptionSnapshots } from '@/api/marketData/optionGreeks'
import { fetchGreeksCoverage } from '@/api/research/optionDiscovery'

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

const CALLS: [string, () => Promise<unknown>, string][] = [
  ['coverage quality', () => fetchCoverageQuality(), 'Market Data Plugin /market/coverage/quality-score'],
  ['iv percentile', () => fetchIvPercentile('ZZQ'), 'Market Data Plugin /market/analytics/iv-percentile'],
  ['option daily bars', () => fetchOptionDailyBars('O:ZZQ310117P00010000', '2031-01-01', '2031-01-17'), 'market-data /options/daily'],
  ['stock daily closes', () => fetchStockDailyCloses('ZZQ', '2031-01-01', '2031-01-17'), 'market-data /stocks/db/bars/daily'],
  ['daily closes multi', () => fetchDailyClosesMulti(['ZZQ'], 30), 'market-data /stocks/db/bars/daily'],
  ['option daily by expiry', () => fetchOptionDailyByExpiry('ZZQ', '2031-01-17', '2031-01-01', '2031-01-17'), 'market-data /options/daily'],
  ['corporate actions', () => fetchCorporateActions('ZZQ'), 'corporate-actions ZZQ'],
  ['option snapshots', () => fetchOptionSnapshots('ZZQ', '2031-01-17'), 'market-data /options/snapshots'],
  ['chain expirations', () => fetchChainExpirations('ZZQ', '2031-01-02'), 'market-data /options/expirations'],
]

describe('plugin readers', () => {
  it.each(CALLS)('%s throws the plugin detail', async (_n, call) => {
    fetchMock.mockResolvedValueOnce(json({ detail: 'database unavailable: invented' }, 503))
    await expect(call()).rejects.toThrow('database unavailable: invented')
  })

  it.each(CALLS)('%s names itself and the status when the plugin gives no reason', async (_n, call, label) => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 502 }))
    await expect(call()).rejects.toThrow(`${label}: HTTP 502`)
  })

  it('iv percentile: a 404 is still no reading', async () => {
    fetchMock.mockResolvedValueOnce(json({ detail: 'No iv-percentile rows for symbol' }, 404))
    expect(await fetchIvPercentile('ZZQ')).toBeNull()
  })

  it('daily closes: success maps the plugin rows', async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: true, data: { zzq: [{ bar_time: '2031-01-03T00:00:00', close: 11 }, { bar_time: '2031-01-02', close: 10 }] } }))
    expect(await fetchDailyClosesMulti(['ZZQ'], 5)).toEqual({ ZZQ: [{ date: '2031-01-02', close: 10 }, { date: '2031-01-03', close: 11 }] })
  })

  it('chain expirations: success keeps today and later, deduplicated', async () => {
    fetchMock.mockResolvedValueOnce(json({ symbol: 'ZZQ', expirations: ['2031-01-01', '2031-01-17', '2031-01-17T00:00:00', '2031-02-21'] }))
    expect(await fetchChainExpirations('ZZQ', '2031-01-02')).toEqual(['2031-01-17', '2031-02-21'])
  })

  it('greeks coverage still returns ok: false with the reason', async () => {
    fetchMock.mockResolvedValueOnce(json({ detail: 'bad symbol' }, 400))
    expect(await fetchGreeksCoverage('ZZQ')).toEqual({ ok: false, error: 'bad symbol' })
    fetchMock.mockResolvedValueOnce(json({ ok: false, error: 'invented refusal' }))
    expect(await fetchGreeksCoverage('ZZQ')).toEqual({ ok: false, error: 'invented refusal' })
  })
})
