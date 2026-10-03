/**
 * TD-50 batch 1: the Trade API modules call the shared client (`requestJson`) instead of
 * `fetch` + a hand-written `!res.ok`. Every converted function, three ways: a refusal shows
 * the server's `detail`; a failure with no body names the call and its status; a success
 * returns what the server sent. Ids, symbols and messages are invented.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as strategy from '@/api/strategy'
import * as market from '@/api/market'
import * as monitor from '@/api/monitor'
import * as trading from '@/api/trading'
import * as portfolio from '@/api/portfolio'
import { fetchTradeReviews } from '@/api/tradeReviews'
import { fetchShortLegs } from '@/api/shortLegs'
import { fetchSystemMessages } from '@/api/messages'

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** [name, call, the label a bodiless failure carries] */
const CALLS: [string, () => Promise<unknown>, string][] = [
  ['fetchOpportunities', () => strategy.fetchOpportunities(), 'Strategy /opportunities'],
  ['fetchStructures', () => strategy.fetchStructures(), 'Strategy /structures'],
  ['fetchStructure', () => strategy.fetchStructure(3), 'Strategy /structures/3'],
  ['createStructure', () => strategy.createStructure({ name: 'x' } as never), 'POST /api/strategy/strategies/structures'],
  ['updateStructure', () => strategy.updateStructure(3, { name: 'x' } as never), 'PUT /api/strategy/strategies/structures/3'],
  ['fetchTrades', () => strategy.fetchTrades(), 'Strategy /trades'],
  ['fetchTrade', () => strategy.fetchTrade(7), 'Strategy /trades/7'],
  ['createTrade', () => strategy.createTrade({} as never), 'POST /trades'],
  ['fetchOpportunityDetail', () => strategy.fetchOpportunityDetail(4), 'Strategy /opportunities/4'],
  ['createOpportunity', () => strategy.createOpportunity({} as never), 'POST /strategies/opportunities'],
  ['fetchGateSets', () => strategy.fetchGateSets(), 'Strategy /gate-sets'],
  ['fetchGateSetDefaults', () => strategy.fetchGateSetDefaults(), 'Strategy /gate-sets/defaults'],
  ['fetchGateSetFull', () => strategy.fetchGateSetFull(2), 'Strategy /gate-sets/2'],
  ['createGateSet', () => strategy.createGateSet({} as never), 'POST /gate-sets'],
  ['updateGateSet', () => strategy.updateGateSet(2, {} as never), 'PUT /gate-sets/2'],
  ['fetchDimsGrouped', () => strategy.fetchDimsGrouped(), 'Strategy /dims'],
  ['fetchTemplates', () => strategy.fetchTemplates(), 'Strategy /templates'],
  ['fetchTemplateDetail', () => strategy.fetchTemplateDetail(9), 'Strategy /templates/9'],
  ['replaceTemplateLegs', () => strategy.replaceTemplateLegs(9, []), 'PUT /strategies/templates/9/legs'],
  ['replaceTemplateParams', () => strategy.replaceTemplateParams(9, []), 'PUT /strategies/templates/9/params'],
  ['replaceTemplateCharacteristics', () => strategy.replaceTemplateCharacteristics(9, []), 'PUT /strategies/templates/9/characteristics'],
  ['fetchWinRate', () => strategy.fetchWinRate(), 'GET /trades/win-rate'],
  ['fetchAllocations', () => strategy.fetchAllocations(), 'GET /strategies/allocations'],
  ['fetchAllocation', () => strategy.fetchAllocation(5), 'GET /strategies/allocations/5'],
  ['createAllocation', () => strategy.createAllocation({} as never), 'POST /strategies/allocations'],
  ['fetchQuotes', () => market.fetchQuotes(['ZZQ']), 'Market /quotes'],
  ['postQuotesCleanup', () => market.postQuotesCleanup(['ZZQ']), 'Market /quotes/cleanup'],
  ['postQuotesRefreshOptions', () => market.postQuotesRefreshOptions(['ZZQ|OPT|20310117|10|P']), 'Market /quotes/refresh-options'],
  ['fetchBenchmarks', () => market.fetchBenchmarks(['ZZQ']), 'Market /bars/benchmark'],
  ['fetchBarStats', () => market.fetchBarStats('zzq'), 'Market /bars/stats'],
  ['fetchBars', () => market.fetchBars('ZZQ'), 'Market /bars'],
  ['fetchOptionBars', () => market.fetchOptionBars({ symbol: 'ZZQ', expiry: '20310117', strike: 10, right: 'P' } as never), 'Market /bars (option)'],
  ['fetchMarketHolidays', () => market.fetchMarketHolidays(2031), 'Market /holidays'],
  ['fetchMonitorStatus', () => monitor.fetchMonitorStatus(), 'Monitor /status'],
  ['fetchTradePerformance', () => trading.fetchTradePerformance(7), 'Trading /performance [7]'],
  ['fetchPerformance', () => trading.fetchPerformance(), 'Trading /performance'],
  ['fetchModelAnalysis', () => portfolio.fetchModelAnalysis('U0000001'), 'Portfolio /portfolio/model-analysis'],
  ['fetchTradeReviews', () => fetchTradeReviews(), 'Strategy /trade-reviews'],
  ['fetchShortLegs', () => fetchShortLegs(), 'Portfolio /portfolio/short-legs'],
  ['fetchSystemMessages', () => fetchSystemMessages(), 'Messages'],
]

describe('TD-50 batch 1 refusals and failures', () => {
  it.each(CALLS)('%s shows the server detail on a refusal', async (_name, call) => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'Invented refusal.' }), { status: 409 }))
    await expect(call()).rejects.toThrow('Invented refusal.')
  })

  it.each(CALLS)('%s names itself and the status when the server gives no reason', async (_name, call, label) => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }))
    await expect(call()).rejects.toThrow(`${label}: HTTP 503`)
  })
})

describe('TD-50 batch 1 successes', () => {
  it('returns what the server sent', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ strategy_allocation_id: 12 }), { status: 200 }))
    expect(await strategy.createAllocation({} as never)).toEqual({ strategy_allocation_id: 12 })
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ removed: ['ZZQ'], kept: [] }), { status: 200 }))
    expect(await market.postQuotesCleanup([])).toEqual({ removed: ['ZZQ'], kept: [] })
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ trade_id: 31 }), { status: 200 }))
    expect(await strategy.createTrade({} as never)).toEqual({ trade_id: 31 })
  })

  it('sends a JSON body with its method', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    await strategy.replaceTemplateLegs(9, [])
    const [, init] = fetchMock.mock.calls[0]
    expect(init?.method).toBe('PUT')
    expect(init?.body).toBe(JSON.stringify({ legs: [] }))
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
  })

  it('a 404 on refresh-options is still a soft miss (null)', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ detail: 'Not Found' }), { status: 404 }))
    expect(await market.postQuotesRefreshOptions(['ZZQ|OPT|20310117|10|P'])).toBeNull()
  })
})
